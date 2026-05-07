"""SmartDB proxy — forwards requests to TyBotFlow/NocoDB API server-side."""
import os
import time
import httpx
from threading import Lock
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

BASE_ID = "prd6w1jt4faaysm"

# ── Cache ─────────────────────────────────────────────────────────────────────

_cache: dict[str, tuple[float, object]] = {}   # key → (expires_at, data)
_working: dict[str, tuple[str, str, dict]] = {} # key → (base_url, path, headers)
_lock = Lock()

TTL_TABLES  = 600   # 10 min — schema rarely changes
TTL_COLUMNS = 600   # 10 min
TTL_RECORDS = 60    # 1 min  — data changes more often


def _cache_get(key: str):
    with _lock:
        entry = _cache.get(key)
        if entry and time.time() < entry[0]:
            return entry[1]
        _cache.pop(key, None)
    return None


def _cache_set(key: str, data: object, ttl: int) -> None:
    with _lock:
        _cache[key] = (time.time() + ttl, data)


def _working_set(key: str, base: str, path: str, hdrs: dict) -> None:
    with _lock:
        _working[key] = (base, path, hdrs)


def _working_clear(key: str) -> None:
    with _lock:
        _working.pop(key, None)


# ── Auth & helpers ────────────────────────────────────────────────────────────

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


def _exhaustive(
    paths: list[str],
    params: dict | None = None,
    cache_key: str | None = None,
    ttl: int = TTL_TABLES,
):
    """
    1. Return from cache if still fresh.
    2. Retry the last-known working (base, path, auth) combination first.
    3. Fall back to exhaustive search; persist the winner for next time.
    """
    # ── 1. Cache hit ──────────────────────────────────────────────────────────
    if cache_key:
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

    k = _key()
    best_http: tuple[int, str] | None = None

    # ── 2. Fast path: try known-good combo ───────────────────────────────────
    if cache_key:
        with _lock:
            known = _working.get(cache_key)
        if known:
            b, p, hdrs = known
            try:
                r = httpx.get(f"{b}{p}", headers=hdrs, params=params, timeout=12)
                if r.status_code < 400:
                    data = r.json()
                    _cache_set(cache_key, data, ttl)
                    return data
            except Exception:
                pass
            _working_clear(cache_key)  # stale — fall through to exhaustive

    # ── 3. Exhaustive search ──────────────────────────────────────────────────
    for path in paths:
        for base in _BASES:
            url = f"{base}{path}"
            for hdrs in _auth_variants(k):
                try:
                    r = httpx.get(url, headers=hdrs, params=params, timeout=12)
                    if r.status_code < 400:
                        data = r.json()
                        if cache_key:
                            _working_set(cache_key, base, path, hdrs)
                            _cache_set(cache_key, data, ttl)
                        return data
                    if best_http is None or r.status_code in (401, 403):
                        best_http = (r.status_code, r.text[:300])
                except Exception:
                    pass

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


# ── Cache management ──────────────────────────────────────────────────────────

@router.post("/cache/clear")
def clear_cache(_user: dict = Depends(get_current_user)):
    """Flush the in-memory cache and working-combo store."""
    with _lock:
        count = len(_cache)
        _cache.clear()
        _working.clear()
    return {"cleared": count, "status": "ok"}


@router.get("/cache/status")
def cache_status(_user: dict = Depends(get_current_user)):
    """Show what is currently cached and how long until expiry."""
    now = time.time()
    with _lock:
        entries = [
            {"key": k, "ttl_remaining_s": round(exp - now)}
            for k, (exp, _) in _cache.items()
            if exp > now
        ]
        combos = list(_working.keys())
    return {"cached_entries": len(entries), "entries": entries, "known_combos": combos}


# ── Tables ────────────────────────────────────────────────────────────────────

@router.get("/bases/{base_id}/tables")
def get_tables(base_id: str, _user: dict = Depends(get_current_user)):
    return _exhaustive(
        [
            f"/bases/{base_id}/tables",
            f"/meta/bases/{base_id}/tables",
            f"/meta/projects/{base_id}/tables",
            f"/db/meta/projects/{base_id}/tables",
        ],
        cache_key=f"tables:{base_id}",
        ttl=TTL_TABLES,
    )


# ── Columns ───────────────────────────────────────────────────────────────────

@router.get("/tables/{table_id}/columns")
def get_columns(table_id: str, _user: dict = Depends(get_current_user)):
    return _exhaustive(
        [
            f"/tables/{table_id}/columns",
            f"/meta/tables/{table_id}/columns",
            f"/db/meta/tables/{table_id}/columns",
            f"/bases/{BASE_ID}/tables/{table_id}/columns",
            f"/meta/bases/{BASE_ID}/tables/{table_id}/columns",
        ],
        cache_key=f"columns:{table_id}",
        ttl=TTL_COLUMNS,
    )


# ── Records ───────────────────────────────────────────────────────────────────

@router.get("/tables/{table_id}/records")
def get_records(
    table_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _user: dict = Depends(get_current_user),
):
    params = {"limit": limit, "offset": offset}
    return _exhaustive(
        [
            f"/tables/{table_id}/records",
            f"/tables/{table_id}/rows",
            f"/db/data/noco/{BASE_ID}/{table_id}",
            f"/db/data/{table_id}",
            f"/bases/{BASE_ID}/tables/{table_id}/records",
        ],
        params=params,
        cache_key=f"records:{table_id}:{offset}:{limit}",
        ttl=TTL_RECORDS,
    )
