"""SmartDB proxy — forwards requests to TyBotFlow/NocoDB API server-side."""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/smartdb", tags=["SmartDB"])

_BASES = [
    "https://api.tybotflow.com/api/v1/smart-db",
    "https://api.tybotflow.com/api/v2",
    "https://api.tybotflow.com/api/v1/db",
    "https://api.tybotflow.com/api/v1",
]

BASE_ID = "prd6w1jt4faaysm"  # NocoDB project / base id


def _key() -> str:
    return (
        os.getenv("TYBOTFLOW_API_KEY")
        or getattr(settings, "TYBOTFLOW_API_KEY", "")
        or "twx_4csaOnT9aItwn08I_107"
    )


def _auth_variants(k: str) -> list[dict]:
    return [
        {"Authorization": f"Bearer {k}", "Accept": "application/json"},
        {"xc-token": k, "Accept": "application/json"},
        {"xc-auth":  k, "Accept": "application/json"},
        {"Authorization": k, "Accept": "application/json"},
    ]


def _exhaustive(paths: list[str], params: dict | None = None):
    """
    Try every combination of base × path × auth until one returns HTTP < 400.
    Prefers HTTP errors over network errors when reporting failure.
    """
    k = _key()
    best_http: tuple[int, str] | None = None  # (status, body) from best HTTP attempt

    for path in paths:
        for base in _BASES:
            url = f"{base}{path}"
            for hdrs in _auth_variants(k):
                try:
                    r = httpx.get(url, headers=hdrs, params=params, timeout=12)
                    if r.status_code < 400:
                        return r.json()
                    # Keep the "best" HTTP error (prefer 401/403 over 404)
                    if best_http is None or r.status_code in (401, 403):
                        best_http = (r.status_code, r.text[:300])
                except Exception:
                    pass  # network error — keep best_http if we have one

    if best_http:
        raise HTTPException(status_code=best_http[0], detail=f"SmartDB {best_http[0]}: {best_http[1]}")
    raise HTTPException(status_code=502, detail="SmartDB: could not reach any endpoint")


# ── Debug ─────────────────────────────────────────────────────────────────────

@router.get("/debug/{base_id}")
def debug_tables(base_id: str, _user: dict = Depends(get_current_user)):
    k = _key()
    results: dict = {}
    paths = [
        f"/bases/{base_id}/tables",
        f"/meta/bases/{base_id}/tables",
        f"/meta/projects/{base_id}/tables",
        f"/db/meta/projects/{base_id}/tables",
    ]
    for path in paths:
        for base in _BASES:
            url = f"{base}{path}"
            for hdrs in _auth_variants(k):
                auth_label = list(hdrs.keys())[0]
                key_ = f"{url}  [{auth_label}]"
                try:
                    r = httpx.get(url, headers=hdrs, timeout=8)
                    entry = {"status": r.status_code, "body": r.text[:300]}
                    if r.status_code < 400:
                        entry["WORKING"] = True
                    results[key_] = entry
                except Exception as e:
                    results[key_] = {"error": str(e)}
    return {"key_preview": k[:12] + "...", "results": results}


# ── Tables ────────────────────────────────────────────────────────────────────

@router.get("/bases/{base_id}/tables")
def get_tables(base_id: str, _user: dict = Depends(get_current_user)):
    return _exhaustive([
        f"/bases/{base_id}/tables",
        f"/meta/bases/{base_id}/tables",
        f"/meta/projects/{base_id}/tables",
        f"/db/meta/projects/{base_id}/tables",
    ])


# ── Columns ───────────────────────────────────────────────────────────────────

@router.get("/tables/{table_id}/columns")
def get_columns(table_id: str, _user: dict = Depends(get_current_user)):
    return _exhaustive([
        f"/tables/{table_id}/columns",
        f"/meta/tables/{table_id}/columns",
        f"/db/meta/tables/{table_id}/columns",
        f"/bases/{BASE_ID}/tables/{table_id}/columns",
        f"/meta/bases/{BASE_ID}/tables/{table_id}/columns",
    ])


# ── Records ───────────────────────────────────────────────────────────────────

@router.get("/tables/{table_id}/records")
def get_records(
    table_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _user: dict = Depends(get_current_user),
):
    params = {"limit": limit, "offset": offset}
    return _exhaustive([
        f"/tables/{table_id}/records",
        f"/tables/{table_id}/rows",
        f"/db/data/noco/{BASE_ID}/{table_id}",
        f"/db/data/{table_id}",
        f"/bases/{BASE_ID}/tables/{table_id}/records",
    ], params)
