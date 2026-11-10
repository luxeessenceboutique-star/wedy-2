"""Meetings and notifications agent."""
from datetime import date, datetime, timedelta, timezone

from app.agents.runtime import PEOPLE, ToolError, ctx, hr_tool, link, one_person, parse_date, run_handler, tr
from app.routers import meetings as meetings_router
from app.agents.tools_recruitment import _clock, _to_utc
from app.services.audit import create_notification

A = "comms"
KINDS = {"meet": ("réunion", "meeting", "اجتماع"), "onb": ("onboarding", "onboarding", "إدماج"), "int": ("entretien", "interview", "مقابلة"), "train": ("formation", "training", "تكوين"), "review": ("revue", "review", "مراجعة")}


@hr_tool(A, ("Réunions", "Meetings", "الاجتماعات"))
def list_meetings(scope: str = "upcoming", limit: int = 20) -> dict:
    """Meetings planned in Wedy with participants and agenda.

    Args:
      scope: upcoming, past or all.
      limit: Maximum rows.
    """
    res = run_handler(meetings_router.list_meetings, scope if scope in ("upcoming", "past", "all") else "upcoming", ctx().db, ctx().user)
    rows = res.get("data") or []
    return {"count": len(rows), "meetings": [{"id": m["id"], "title": m.get("title"), "kind": m.get("kind"), "starts_at": m.get("starts_at"), "duration_min": m.get("duration_min"), "place": m.get("place"),
                                               "participants": [p.get("name") for p in (m.get("participants") or [])], "agenda": [a.get("t") for a in (m.get("agenda") or [])]} for m in rows[:limit]],
            "links": [link("/app/meetings", tr("Ouvrir Réunions", "Open Meetings", "فتح الاجتماعات"))]}


def _meeting_preview(a: dict) -> dict:
    d = parse_date(a["date"], "date")
    s = _clock(a["start_time"])
    names = [x.strip() for x in (a.get("participants") or "").split(",") if x.strip()]
    return {"summary": tr(f"Planifier la réunion « {a['title']} »", f"Schedule the meeting “{a['title']}”", f"برمجة الاجتماع «{a['title']}»"),
            "details": [[tr("Date", "Date", "التاريخ"), f"{d.isoformat()} {s}"], [tr("Durée", "Duration", "المدة"), f"{a.get('duration_min') or 60} min"], [tr("Participants", "Participants", "المشاركون"), ", ".join(names) or "—"],
                        [tr("Ordre du jour", "Agenda", "جدول الأعمال"), a.get("agenda") or "—"], [tr("Visio", "Video", "الفيديو"), tr("salle Visio Wedy gratuite", "free Wedy video room", "قاعة فيديو Wedy مجانية")]]}


@hr_tool(A, ("Planifier une réunion", "Schedule a meeting", "برمجة اجتماع"), write=True, preview=_meeting_preview)
def create_meeting(title: str, date: str, start_time: str, duration_min: int = 60, participants: str = "", agenda: str = "", place: str = "", kind: str = "meet") -> dict:
    """Schedule a meeting in Réunions (it has its own free Wedy video room). Participants who are employees can join it.

    Args:
      title: Meeting title.
      date: Day, YYYY-MM-DD.
      start_time: Start, HH:MM (Morocco time).
      duration_min: Duration in minutes (default 60).
      participants: Names, comma separated (employees or external guests).
      agenda: Agenda items separated by « ; ».
      place: Room or address (optional).
      kind: meet, onb, int, train or review.
    """
    d, s = parse_date(date, "date"), _clock(start_time)
    people = []
    for n in [x.strip() for x in (participants or "").split(",") if x.strip()]:
        try:
            p = one_person(n, PEOPLE)
            people.append({"employee_id": p["id"], "name": p["full_name"]})
        except ToolError:
            people.append({"employee_id": None, "name": n})
    body = meetings_router.MeetingIn(title=title.strip(), kind=kind if kind in KINDS else "meet", starts_at=_to_utc(d, s), duration_min=int(duration_min or 60), place=place or None,
                                     participants=[meetings_router.Participant(**p) for p in people],
                                     agenda=[meetings_router.AgendaItem(t=x.strip()) for x in (agenda or "").split(";") if x.strip()])
    m = run_handler(meetings_router.create_meeting, body, ctx().db, ctx().user)
    return {"scheduled": True, "meeting_id": m.get("id"), "title": title, "when": f"{d.isoformat()} {s}", "participants": [p["name"] for p in people],
            "links": [link(f"/visio/m-{m.get('id')}", tr("Salle de visio", "Video room", "قاعة الفيديو")), link("/app/meetings", tr("Ouvrir Réunions", "Open Meetings", "فتح الاجتماعات"))]}


def _user_id_for(person: dict):
    email = (person.get("email") or "").lower()
    if not email:
        return None
    try:
        for u in ctx().db.auth.admin.list_users() or []:
            if (getattr(u, "email", None) or "").lower() == email:
                return u.id
    except Exception:
        return None
    return None


def _notify_preview(a: dict) -> dict:
    p = one_person(a["employee"], PEOPLE)
    if not p.get("email"):
        raise ToolError(tr(f"{p['full_name']} n'a pas d'e-mail dans son dossier.", f"{p['full_name']} has no e-mail in their file.", f"لا يوجد بريد إلكتروني في ملف {p['full_name']}."))
    return {"summary": tr(f"Envoyer une notification à {p['full_name']}", f"Send a notification to {p['full_name']}", f"إرسال إشعار إلى {p['full_name']}"), "details": [[tr("Titre", "Title", "العنوان"), a["title"]], [tr("Message", "Message", "الرسالة"), a["message"]]]}


@hr_tool(A, ("Notifier un employé", "Notify an employee", "إشعار موظف"), write=True, preview=_notify_preview)
def notify_employee(employee: str, title: str, message: str) -> dict:
    """Send an in-app notification to an employee who has a Wedy account.

    Args:
      employee: Name or id.
      title: Short title.
      message: Message body.
    """
    p = one_person(employee, PEOPLE)
    uid = _user_id_for(p)
    if not uid:
        raise ToolError(tr(f"{p['full_name']} n'a pas encore de compte Wedy : aucune notification possible.", f"{p['full_name']} has no Wedy account yet: cannot notify.", f"{p['full_name']} ليس لديه حساب Wedy بعد."))
    create_notification(ctx().db, user_id=uid, title=title.strip(), message=message.strip(), notif_type="info")
    return {"sent": True, "to": p["full_name"]}
