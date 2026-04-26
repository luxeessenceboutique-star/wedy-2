"""SmartDB proxy — forwards requests to TyBotFlow API server-side.
   The API key never leaves the backend.
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies import get_current_user

router = APIRouter(prefix="/smartdb", tags=["SmartDB"])

_KEY    = os.getenv("TYBOTFLOW_API_KEY", "twx_4csaOnT9aItwn08I_107")
_BASE   = "https://api.tybotflow.com/api/v1/smart-db"
_HEADERS = {"Authorization": _KEY, "Accept": "application/json"}


def _get(path: str, params: dict | None = None) -> dict:
    try:
        r = httpx.get(f"{_BASE}{path}", headers=_HEADERS, params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"SmartDB unreachable: {e}")


@router.get("/bases/{base_id}/tables")
def get_tables(base_id: str, _user: dict = Depends(get_current_user)):
    return _get(f"/bases/{base_id}/tables")


@router.get("/tables/{table_id}/columns")
def get_columns(table_id: str, _user: dict = Depends(get_current_user)):
    return _get(f"/tables/{table_id}/columns")


@router.get("/tables/{table_id}/records")
def get_records(
    table_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _user: dict = Depends(get_current_user),
):
    return _get(f"/tables/{table_id}/records", {"limit": limit, "offset": offset})
