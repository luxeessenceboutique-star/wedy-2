"""Marchés Publics — Tenders agent integration router."""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import importlib
import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

from app.dependencies import get_current_user

router = APIRouter(prefix="/tenders", tags=["Tenders"])

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

AGENT_BASE = Path(__file__).resolve().parent.parent.parent.parent / "marchespublics_agent_export"
AGENT_DIR = AGENT_BASE / "marchespublics_agent"
OUTPUT_FILE = AGENT_DIR / "output" / "tenders_results.json"
DOWNLOADS_DIR = AGENT_DIR / "downloads"

# ---------------------------------------------------------------------------
# In-memory run state (single-process guard)
# ---------------------------------------------------------------------------

_run_state: Dict[str, Any] = {
    "state": "idle",   # idle | running | done | error
    "message": "",
    "started_at": None,
    "finished_at": None,
    "progress": [],
    "error": None,
}

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class RunRequest(BaseModel):
    keywords: str
    nom: str
    prenom: str
    email: str
    company: str
    litellm_api_key: Optional[str] = None
    litellm_model: Optional[str] = None


# ---------------------------------------------------------------------------
# Background pipeline
# ---------------------------------------------------------------------------


async def _run_pipeline(config: RunRequest) -> None:
    """Run the marchés publics agent pipeline in the background."""
    global _run_state

    # Ensure AGENT_BASE is on sys.path so the package is importable.
    agent_base_str = str(AGENT_BASE)
    if agent_base_str not in sys.path:
        sys.path.insert(0, agent_base_str)

    def _append_progress(msg: str) -> None:
        _run_state["progress"].append(
            {"time": datetime.utcnow().isoformat(), "message": msg}
        )

    try:
        _append_progress("Importing orchestrator…")

        # Force a fresh import each run so env vars are re-read by config.py.
        # Remove stale cached modules from the marchespublics_agent package.
        _prefixes_to_remove = [
            k for k in list(sys.modules.keys())
            if k.startswith("marchespublics_agent")
        ]
        for _mod in _prefixes_to_remove:
            del sys.modules[_mod]

        from marchespublics_agent.orchestrator import Orchestrator  # noqa: E402

        _append_progress(f"Starting agent with keywords: {config.keywords!r}")

        orchestrator = Orchestrator(keywords=config.keywords)
        await orchestrator.run()

        _run_state.update(
            {
                "state": "done",
                "message": "Pipeline completed successfully.",
                "finished_at": datetime.utcnow().isoformat(),
                "error": None,
            }
        )
        _append_progress("Agent pipeline finished successfully.")

    except Exception as exc:  # noqa: BLE001
        _run_state.update(
            {
                "state": "error",
                "message": str(exc),
                "finished_at": datetime.utcnow().isoformat(),
                "error": str(exc),
            }
        )
        _run_state["progress"].append(
            {
                "time": datetime.utcnow().isoformat(),
                "message": f"ERROR: {exc}",
            }
        )


# ---------------------------------------------------------------------------
# POST /tenders/run
# ---------------------------------------------------------------------------


@router.post("/run", status_code=202)
async def run_agent(
    body: RunRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Launch the marchés publics scraping / analysis agent.

    Returns 409 if a run is already in progress.
    """
    global _run_state

    if _run_state["state"] == "running":
        raise HTTPException(
            status_code=409,
            detail="Une exécution est déjà en cours. Attendez qu'elle se termine.",
        )

    # ── Set env vars for the agent ──────────────────────────────────────────
    os.environ["DOWNLOAD_NOM"] = body.nom
    os.environ["DOWNLOAD_PRENOM"] = body.prenom
    os.environ["DOWNLOAD_EMAIL"] = body.email
    os.environ["DOWNLOAD_COMPANY"] = body.company
    os.environ["IT_KEYWORDS"] = body.keywords

    # Optional LiteLLM settings — fall back to whatever was already in env.
    if body.litellm_api_key:
        os.environ["LITELLM_API_KEY"] = body.litellm_api_key
    if body.litellm_model:
        os.environ["LITELLM_MODEL"] = body.litellm_model

    # ── Reset run state ─────────────────────────────────────────────────────
    _run_state.update(
        {
            "state": "running",
            "message": "Agent démarré.",
            "started_at": datetime.utcnow().isoformat(),
            "finished_at": None,
            "progress": [
                {
                    "time": datetime.utcnow().isoformat(),
                    "message": "Run initiated by user.",
                }
            ],
            "error": None,
        }
    )

    background_tasks.add_task(_run_pipeline, body)

    return {
        "status": "accepted",
        "message": "L'agent a été lancé en arrière-plan.",
        "started_at": _run_state["started_at"],
    }


# ---------------------------------------------------------------------------
# GET /tenders/status
# ---------------------------------------------------------------------------


@router.get("/status")
async def get_status():
    """Return the current run state (no body auth required)."""
    return dict(_run_state)


# ---------------------------------------------------------------------------
# GET /tenders/results
# ---------------------------------------------------------------------------


def _safe_str(value: Any) -> Any:
    """Convert non-JSON-safe types to strings."""
    if isinstance(value, (datetime,)):
        return value.isoformat()
    return value


@router.get("/results")
async def get_results(current_user: dict = Depends(get_current_user)):
    """
    Return the tenders from the agent output file, enriched with
    ``is_analyzed`` and ``file_count`` fields.
    """
    if not OUTPUT_FILE.exists():
        return {"tenders": [], "count": 0, "last_run": None}

    try:
        raw = OUTPUT_FILE.read_text(encoding="utf-8")
        data = json.loads(raw)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Impossible de lire le fichier de résultats: {exc}",
        )

    tenders: List[Dict[str, Any]] = data.get("tenders", [])

    # Enrich each tender
    enriched: List[Dict[str, Any]] = []
    for tender in tenders:
        t = dict(tender)

        # is_analyzed: True when analysis_result is a non-empty dict
        analysis = t.get("analysis_result")
        t["is_analyzed"] = isinstance(analysis, dict) and bool(analysis)

        # file_count: count downloaded + extracted files
        downloaded = t.get("downloaded_files") or []
        extracted = t.get("extracted_files") or []
        t["file_count"] = len(downloaded) + len(extracted)

        # Ensure no datetime objects leak through
        for key, val in t.items():
            if isinstance(val, datetime):
                t[key] = val.isoformat()

        enriched.append(t)

    # last_run: file modification time as ISO string
    mtime = OUTPUT_FILE.stat().st_mtime
    last_run = datetime.utcfromtimestamp(mtime).isoformat()

    return {
        "tenders": enriched,
        "count": len(enriched),
        "last_run": last_run,
    }


# ---------------------------------------------------------------------------
# DELETE /tenders/results
# ---------------------------------------------------------------------------


@router.delete("/results")
async def delete_results(current_user: dict = Depends(get_current_user)):
    """Delete the agent output file."""
    if OUTPUT_FILE.exists():
        try:
            OUTPUT_FILE.unlink()
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Impossible de supprimer le fichier: {exc}",
            )
        return {"status": "ok", "message": "Fichier de résultats supprimé."}

    return {"status": "ok", "message": "Aucun fichier à supprimer."}


# ---------------------------------------------------------------------------
# GET /tenders/{tender_id}/files
# ---------------------------------------------------------------------------


@router.get("/{tender_id}/files")
async def list_tender_files(
    tender_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    List all files in the downloads folder for a specific tender.

    Returns a list of ``{name, size, url}`` objects.
    """
    # Security: reject path traversal attempts in tender_id.
    if ".." in tender_id or "/" in tender_id or "\\" in tender_id:
        raise HTTPException(status_code=400, detail="Identifiant d'appel d'offres invalide.")

    tender_dir = DOWNLOADS_DIR / tender_id
    if not tender_dir.exists() or not tender_dir.is_dir():
        return []

    files: List[Dict[str, Any]] = []
    for entry in tender_dir.iterdir():
        if entry.is_file():
            files.append(
                {
                    "name": entry.name,
                    "size": entry.stat().st_size,
                    "url": f"/api/tenders/{tender_id}/files/{entry.name}",
                }
            )

    return files


# ---------------------------------------------------------------------------
# GET /tenders/{tender_id}/files/{filename}
# ---------------------------------------------------------------------------


@router.get("/{tender_id}/files/{filename}")
async def serve_tender_file(
    tender_id: str,
    filename: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Serve a specific file for a tender.

    Path-traversal validation is applied to both ``tender_id`` and ``filename``.
    """
    # Security: reject path traversal in tender_id.
    if ".." in tender_id or "/" in tender_id or "\\" in tender_id:
        raise HTTPException(status_code=400, detail="Identifiant d'appel d'offres invalide.")

    # Security: reject path traversal in filename.
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide.")

    file_path = DOWNLOADS_DIR / tender_id / filename

    # Resolve to an absolute path and confirm it stays inside DOWNLOADS_DIR.
    try:
        resolved = file_path.resolve()
        downloads_resolved = DOWNLOADS_DIR.resolve()
        resolved.relative_to(downloads_resolved)  # raises ValueError if outside
    except ValueError:
        raise HTTPException(status_code=400, detail="Chemin de fichier non autorisé.")

    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="Fichier non trouvé.")

    return FileResponse(str(resolved), filename=filename)
