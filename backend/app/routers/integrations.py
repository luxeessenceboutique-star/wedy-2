"""Intégrations — /api/integrations: the iCal feed of approved leave (Google Calendar, Outlook, Apple).

The feed URL carries a secret token (stored in rh.app_settings under "ical"); anyone holding the URL
can read the team's approved leave, so HR can regenerate or revoke it.
"""
import secrets
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from supabase import Client

from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.services import app_settings
from app.services.audit import log_action

router = APIRouter(prefix="/integrations", tags=["Integrations"])
KEY = "ical"
LABELS = {"annual": "Congé", "sick": "Maladie", "personal": "Congé exceptionnel", "maternity": "Congé maternité",
          "paternity": "Congé paternité", "unpaid": "Congé sans solde", "unjustified": "Absence", "accident": "Accident du travail"}


def _token(supabase: Client):
    try:
        rows = supabase.table("app_settings").select("value").eq("key", KEY).limit(1).execute().data or []
    except Exception as e:
        if app_settings.missing_table(e):
            return None
        raise
    return (rows[0].get("value") or {}).get("token") if rows else None


def _save(supabase: Client, value: dict, user_id: str):
    try:
        supabase.table("app_settings").upsert({"key": KEY, "value": value, "updated_by": user_id, "updated_at": datetime.utcnow().isoformat()}).execute()
    except Exception as e:
        if app_settings.missing_table(e):
            raise HTTPException(status_code=503, detail="settings_table_missing")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ical")
def ical_status(supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    return {"token": _token(supabase)}


@router.post("/ical")
def ical_enable(supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """Create (or regenerate) the secret feed token; the previous URL stops working."""
    token = secrets.token_urlsafe(24)
    _save(supabase, {"token": token}, current_user["id"])
    log_action(supabase, current_user["id"], "UPDATE", "settings", None)
    return {"token": token}


@router.delete("/ical")
def ical_disable(supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    _save(supabase, {"token": None}, current_user["id"])
    log_action(supabase, current_user["id"], "UPDATE", "settings", None)
    return {"token": None}


def _esc(text: str) -> str:
    return (text or "").replace("\\", "\\\\").replace(";", "\;").replace(",", "\\,").replace("\n", "\\n")


@router.get("/ical/{token}.ics")
def ical_feed(token: str, supabase: Client = Depends(get_db)):
    """Public, token-protected: approved leave from 3 months ago to 12 months ahead, as all-day events."""
    stored = _token(supabase)
    if not stored or not secrets.compare_digest(stored, token):
        raise HTTPException(status_code=404, detail="Not found")
    start, end = (date.today() - timedelta(days=90)).isoformat(), (date.today() + timedelta(days=365)).isoformat()
    rows = (supabase.table("leave_requests").select("id, type, start_date, end_date, days, employees(full_name)")
            .eq("status", "approved").lte("start_date", end).gte("end_date", start).limit(5000).execute().data or [])
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wedy//Leave//FR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Wedy · Absences", "X-WR-TIMEZONE:Africa/Casablanca"]
    for r in rows:
        try:
            d0 = date.fromisoformat(str(r["start_date"])[:10])
            d1 = date.fromisoformat(str(r.get("end_date") or r["start_date"])[:10]) + timedelta(days=1)  # DTEND is exclusive
        except ValueError:
            continue
        who = (r.get("employees") or {}).get("full_name") or ""
        lines += ["BEGIN:VEVENT", f"UID:{r['id']}@wedy", f"DTSTAMP:{stamp}", f"DTSTART;VALUE=DATE:{d0.strftime('%Y%m%d')}",
                  f"DTEND;VALUE=DATE:{d1.strftime('%Y%m%d')}", "SUMMARY:" + _esc(f"{who} · {LABELS.get(r.get('type'), 'Congé')}"),
                  "TRANSP:TRANSPARENT", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    return Response("\r\n".join(lines) + "\r\n", media_type="text/calendar; charset=utf-8", headers={"Cache-Control": "no-store"})
