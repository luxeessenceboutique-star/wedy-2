"""Réunions — /api/meetings: meetings planned by HR, their agenda, preparation notes and minutes.

Table rh.meetings (migration database/migrations/meetings.sql). HR/admin manage every meeting;
an employee sees the meetings they take part in (read-only).
"""
import json
import re
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.repositories import portal_repository
from app.services import ai_service
from app.services.audit import create_notification, log_action

router = APIRouter(prefix="/meetings", tags=["Meetings"])
TABLE = "meetings"
KINDS = {"meet", "onb", "int", "train", "review"}
HR_ROLES = {"admin", "hr", "rh"}  # same roles as require_hr_or_admin


class Participant(BaseModel):
    employee_id: Optional[str] = None
    name: str = Field(min_length=1, max_length=200)


class AgendaItem(BaseModel):
    t: str = Field(min_length=1, max_length=300)
    done: bool = False
    ai: bool = False


class ActionItem(BaseModel):
    t: str = Field(min_length=1, max_length=300)
    owner: str = ""
    due: str = ""
    done: bool = False


class MeetingIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    kind: str = "meet"
    starts_at: datetime
    duration_min: int = Field(60, ge=5, le=24 * 60)
    place: Optional[str] = None
    visio_url: Optional[str] = None
    participants: List[Participant] = []
    agenda: List[AgendaItem] = []
    prep_notes: Optional[str] = None


class MeetingPatch(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    kind: Optional[str] = None
    starts_at: Optional[datetime] = None
    duration_min: Optional[int] = Field(None, ge=5, le=24 * 60)
    place: Optional[str] = None
    visio_url: Optional[str] = None
    participants: Optional[List[Participant]] = None
    agenda: Optional[List[AgendaItem]] = None
    prep_notes: Optional[str] = None
    summary: Optional[str] = None
    decisions: Optional[List[str]] = None
    actions: Optional[List[ActionItem]] = None


def _missing_table(e: Exception) -> bool:
    msg = str(e).lower()
    return "meetings" in msg and ("does not exist" in msg or "could not find" in msg or "schema cache" in msg or "42p01" in msg or "pgrst205" in msg)


def _guard(e: Exception):
    if _missing_table(e):
        raise HTTPException(status_code=503, detail="meetings_table_missing")
    raise HTTPException(status_code=400, detail=str(e))


def _row(payload: dict) -> dict:
    out: dict[str, Any] = {}
    for k, v in payload.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, list):
            out[k] = [x.model_dump() if hasattr(x, "model_dump") else x for x in v]
        else:
            out[k] = v
    if "kind" in out and out["kind"] not in KINDS:
        out["kind"] = "meet"
    return out


def _is_hr(user: dict) -> bool:
    return user.get("role_name", "") in HR_ROLES


def _get(supabase: Client, meeting_id: str) -> dict:
    try:
        res = supabase.table(TABLE).select("*").eq("id", meeting_id).limit(1).execute()
    except Exception as e:
        _guard(e)
    if not res.data:
        raise HTTPException(status_code=404, detail="Réunion introuvable")
    return res.data[0]


@router.get("")
def list_meetings(
    scope: str = Query("all", pattern="^(all|upcoming|past)$"),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """HR: every meeting. Employee: the meetings they take part in."""
    q = supabase.table(TABLE).select("*")
    now = datetime.utcnow().isoformat()
    if scope == "upcoming":
        q = q.gte("starts_at", now)
    elif scope == "past":
        q = q.lt("starts_at", now)
    if not _is_hr(current_user):
        emp = (portal_repository.find_employee_by_email(supabase, current_user.get("email", "")).data or [None])[0]
        if not emp:
            return {"data": []}
        q = q.contains("participants", json.dumps([{"employee_id": emp["id"]}]))
    try:
        res = q.order("starts_at").limit(500).execute()
    except Exception as e:
        _guard(e)
    return {"data": res.data or []}


@router.post("", status_code=201)
def create_meeting(payload: MeetingIn, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    row = _row(payload.model_dump())
    row["created_by"] = current_user["id"]
    try:
        res = supabase.table(TABLE).insert(row).execute()
    except Exception as e:
        _guard(e)
    if not res.data:
        raise HTTPException(status_code=400, detail="Impossible d'enregistrer la réunion")
    log_action(supabase, current_user["id"], "CREATE", "meeting", res.data[0]["id"])
    return res.data[0]


@router.patch("/{meeting_id}")
def update_meeting(meeting_id: str, payload: MeetingPatch, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    row = _row(payload.model_dump(exclude_unset=True))
    if not row:
        raise HTTPException(status_code=400, detail="Rien à modifier")
    row["updated_at"] = datetime.utcnow().isoformat()
    try:
        res = supabase.table(TABLE).update(row).eq("id", meeting_id).execute()
    except Exception as e:
        _guard(e)
    if not res.data:
        raise HTTPException(status_code=404, detail="Réunion introuvable")
    return res.data[0]


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: str, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    try:
        supabase.table(TABLE).delete().eq("id", meeting_id).execute()
    except Exception as e:
        _guard(e)
    log_action(supabase, current_user["id"], "DELETE", "meeting", meeting_id)


# ── Wedy: agenda suggestions and minutes ───────────────────────────────────────

def _lines(text: str, n: int) -> List[str]:
    out = []
    for line in (text or "").splitlines():
        line = re.sub(r"^[\s\-–•*\d.)]+", "", line).replace("**", "").strip()
        if line and len(line) < 120:
            out.append(line)
    return out[:n]


@router.post("/{meeting_id}/suggest-agenda")
def suggest_agenda(meeting_id: str, lang: str = Query("fr"), supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """Three more agenda items written by Wedy (not saved: the page adds them)."""
    m = _get(supabase, meeting_id)
    people = ", ".join(p.get("name", "") for p in m.get("participants") or [])
    items = " ; ".join(a.get("t", "") for a in m.get("agenda") or []) or "aucun"
    language = {"en": "English", "ar": "Arabic"}.get(lang, "French")
    system = "You are Wedy, the HR assistant of a Moroccan company. You prepare meeting agendas."
    user = (f"Propose exactly 3 new agenda items for the meeting \"{m.get('title')}\" ({m.get('duration_min')} min, participants: {people or 'n/a'}).\n"
            f"Items already planned: {items}.\nPreparation notes: {m.get('prep_notes') or 'none'}.\n"
            f"Answer in {language}, with only 3 lines of at most 8 words each, no numbering, no bullets, no other text.")
    try:
        lines = _lines(ai_service.complete(system, user, 300), 3)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ai_unavailable: {e}")
    if not lines:
        raise HTTPException(status_code=502, detail="ai_empty")
    return {"items": lines}


@router.post("/{meeting_id}/minutes")
def draft_minutes(meeting_id: str, lang: str = Query("fr"), supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """Wedy drafts the minutes (summary, decisions, actions) from the agenda and the notes, and saves them."""
    m = _get(supabase, meeting_id)
    agenda = "\n".join(f"- {a.get('t')} ({'traité' if a.get('done') else 'non traité'})" for a in m.get("agenda") or [])
    people = ", ".join(p.get("name", "") for p in m.get("participants") or [])
    if not agenda and not (m.get("prep_notes") or "").strip():
        raise HTTPException(status_code=422, detail="nothing_to_summarize")
    language = {"en": "English", "ar": "Arabic"}.get(lang, "French")
    system = ("You are Wedy, the HR assistant of a Moroccan company. You write meeting minutes from the agenda and the notes only. "
              "Never invent figures, names or decisions that are not in the notes.")
    user = (f"Meeting: {m.get('title')} — participants: {people or 'n/a'}.\nAgenda:\n{agenda or '(none)'}\nNotes:\n{m.get('prep_notes') or '(none)'}\n\n"
            f"Write in {language}. Reply with JSON only: {{\"summary\": \"2-3 sentences\", \"decisions\": [\"...\"], "
            f"\"actions\": [{{\"t\": \"...\", \"owner\": \"participant name or empty\", \"due\": \"dd/mm or empty\"}}]}}")
    try:
        raw = ai_service.complete(system, user, 900)
        data = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ai_unavailable: {e}")
    row = {
        "summary": str(data.get("summary") or "").strip(),
        "decisions": [str(d).strip() for d in (data.get("decisions") or []) if str(d).strip()][:10],
        "actions": [{"t": str(a.get("t", "")).strip(), "owner": str(a.get("owner", "")).strip(), "due": str(a.get("due", "")).strip(), "done": False}
                    for a in (data.get("actions") or []) if isinstance(a, dict) and str(a.get("t", "")).strip()][:12],
        "updated_at": datetime.utcnow().isoformat(),
    }
    res = supabase.table(TABLE).update(row).eq("id", meeting_id).execute()
    return (res.data or [m])[0]


@router.post("/{meeting_id}/send-report")
def send_report(meeting_id: str, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """In-app notification of the minutes to every participant who has a Wedy account."""
    m = _get(supabase, meeting_id)
    ids = [p.get("employee_id") for p in m.get("participants") or [] if p.get("employee_id")]
    emails = {}
    if ids:
        for e in supabase.table("employees").select("id, email").in_("id", ids).execute().data or []:
            if e.get("email"):
                emails[e["email"].lower()] = e["id"]
    sent = 0
    if emails:
        try:
            users = supabase.auth.admin.list_users()
        except Exception:
            users = []
        for u in users or []:
            if (getattr(u, "email", None) or "").lower() in emails:
                create_notification(supabase, user_id=u.id, title=f"Compte rendu · {m.get('title')}",
                                    message=(m.get("summary") or "Le compte rendu de la réunion est disponible.")[:400],
                                    notif_type="info", link="/employee/meetings")
                sent += 1
    log_action(supabase, current_user["id"], "SEND", "meeting_report", meeting_id)
    return {"sent": sent, "participants": len(m.get("participants") or [])}
