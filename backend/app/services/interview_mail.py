"""E-mails to the candidate of an interview.

1. Invitation, as soon as HR plans the interview: date, time, duration, kind of interview, who meets them, where /
   how (Wedy video call, external link or address), and — for a video call — that the link to join will come by
   e-mail 15 minutes before the start. A calendar file (.ics) is attached so it lands in their agenda.
2. Reminder with the link, 15 minutes before the start (video calls only): sent by a loop of the API every minute.
   Each interview is claimed in the database before sending (reminder_sent_at), so it goes out once.
3. Cancellation when HR cancels an interview whose invitation was sent.

Times: the interview's meeting carries the exact start (with its time zone); without it, the date and hour typed by
HR are read in APP_TIMEZONE (Africa/Casablanca by default)."""
from __future__ import annotations

import html as _html
import logging
import os
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from supabase import Client

from app.config import settings
from app.services import mailer

log = logging.getLogger(__name__)

REMINDER_MIN = 15
DONE = {"cancelled", "canceled", "annule", "annulé", "completed", "done", "no_show", "rejected"}
TYPE_LABEL = {"rh": "Entretien RH", "technical": "Entretien technique", "final": "Entretien final"}
DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


def tz():
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(os.getenv("APP_TIMEZONE") or "Africa/Casablanca")
    except Exception:  # no tz database in the image: Morocco is UTC+1 most of the year
        return timezone(timedelta(hours=1))


def _parse_dt(v) -> Optional[datetime]:
    if not v:
        return None
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=tz())


def _one(supabase: Client, table: str, cols: str, key: str, value) -> dict:
    if not value:
        return {}
    try:
        return (supabase.table(table).select(cols).eq(key, str(value)).limit(1).execute().data or [{}])[0] or {}
    except Exception:
        return {}


def load(supabase: Client, iv: dict) -> dict:
    """Everything the e-mails say about an interview."""
    cand = _one(supabase, "employees", "id, full_name, email, position, custom_fields", "id", iv.get("candidate_id"))
    meeting = _one(supabase, "meetings", "*", "id", iv.get("meeting_id"))
    ad = {}
    ad_id = (cand.get("custom_fields") or {}).get("ad_id") if isinstance(cand.get("custom_fields"), dict) else None
    if ad_id:
        ad = _one(supabase, "recruitment_ads", "poste, description", "id", ad_id)
    try:
        from app.services import app_settings
        company = app_settings.load(supabase)[0].get("company") or {}
    except Exception:
        company = {}
    start = _parse_dt(meeting.get("starts_at"))
    if not start:
        start = datetime.fromisoformat(f"{iv['date']}T{str(iv.get('start_time') or '09:00')[:5]}:00").replace(tzinfo=tz())
    end = None
    if meeting.get("duration_min"):
        end = start + timedelta(minutes=int(meeting["duration_min"]))
    elif iv.get("end_time"):
        end = datetime.fromisoformat(f"{iv['date']}T{str(iv['end_time'])[:5]}:00").replace(tzinfo=start.tzinfo)
    if not end or end <= start:
        end = start + timedelta(minutes=60)
    place = (meeting.get("place") or "").strip()
    link = (meeting.get("visio_url") or iv.get("meet_link") or "").strip()
    mode = "external" if link else ("place" if place else "wedy")
    people = [p.get("name") for p in (iv.get("interviewers") or []) if isinstance(p, dict) and p.get("name")]
    # shown as HR typed them (no time zone conversion that an old tz database could get wrong); `start` / `end` are
    # the exact moments, for the reminder and the calendar file
    shown = None
    try:
        d = date.fromisoformat(str(iv.get("date"))[:10])
        h0 = str(iv.get("start_time") or "")[:5] or start.astimezone(tz()).strftime("%H:%M")
        h1 = str(iv.get("end_time") or "")[:5] or end.astimezone(tz()).strftime("%H:%M")
        shown = (f"{DAYS[d.weekday()]} {d.day} {MONTHS[d.month - 1]} {d.year}", h0, h1)
    except (TypeError, ValueError):
        pass
    if not shown:
        shown = (*when(start), when(end)[1])
    return {
        "iv": iv, "cand": cand, "meeting": meeting, "start": start, "end": end, "mode": mode, "place": place, "link": link,
        "day": shown[0], "hour": shown[1], "end_hour": shown[2],
        "job": (ad.get("poste") or iv.get("job_title") or cand.get("position") or "").strip(),
        "type": TYPE_LABEL.get(iv.get("type") or "", "Entretien"), "people": people,
        "company": (company.get("name") or "").strip() or "notre entreprise",
        "company_address": ", ".join(x for x in [(company.get("address") or "").strip(), (company.get("city") or "").strip()] if x),
        "reply_to": (company.get("email") or "").strip() or None,
        "conf": mailer.current(supabase),   # the SMTP account: the one set in Wedy, else the environment's
    }


def public_base(iv: dict, fallback: str = "") -> str:
    """https://… of Wedy for the links (APP_PUBLIC_URL, else the address HR used when planning)."""
    return ((os.getenv("APP_PUBLIC_URL") or "").strip() or (iv.get("public_base_url") or "").strip() or fallback or "").rstrip("/")


def join_link(ctx: dict, base: str) -> Optional[str]:
    """The link the candidate clicks: the external link given by HR, else a Wedy video call invite (no account)."""
    if ctx["mode"] == "external":
        return ctx["link"]
    if ctx["mode"] == "place" or not base:
        return None
    from app.routers.visio import _sign
    iv, meeting = ctx["iv"], ctx["meeting"]
    room = f"m-{meeting['id']}" if meeting.get("id") else f"i-{iv['id']}"
    exp = max(ctx["end"] + timedelta(hours=24), datetime.now(timezone.utc) + timedelta(hours=24))
    name = (ctx["cand"].get("full_name") or "Candidat").strip()[:120]
    token = _sign({"r": room, "n": name, "e": int(exp.timestamp()), "j": uuid.uuid4().hex[:8]})
    return f"{base}/visio/{room}?k={token}"


# ── wording ──────────────────────────────────────────────────────────────────────────────────────────────

def when(d: datetime) -> tuple[str, str]:
    loc = d.astimezone(tz())
    return f"{DAYS[loc.weekday()]} {loc.day} {MONTHS[loc.month - 1]} {loc.year}", loc.strftime("%H:%M")


def _first(ctx: dict) -> str:
    return (ctx["cand"].get("full_name") or "").strip() or "Madame, Monsieur"


def _rows(ctx: dict) -> list[tuple[str, str]]:
    day, hour, end = ctx["day"], ctx["hour"], ctx["end_hour"]
    minutes = int((ctx["end"] - ctx["start"]).total_seconds() // 60)
    rows = [("Date", day), ("Heure", f"{hour} – {end} (heure du Maroc)"), ("Durée", f"{minutes} minutes"), ("Type", ctx["type"])]
    if ctx["job"]:
        rows.insert(0, ("Poste", ctx["job"]))
    if ctx["people"]:
        rows.append(("Avec", ", ".join(ctx["people"])))
    if ctx["mode"] == "place":
        rows.append(("Lieu", ctx["place"]))
    elif ctx["place"]:
        rows.append(("Lieu", ctx["place"]))
    rows.append(("Format", "En présentiel" if ctx["mode"] == "place" else "En visioconférence"))
    return rows


def _page(title: str, intro: list[str], rows: list[tuple[str, str]], after: list[str], button: Optional[tuple[str, str]], company: str) -> str:
    e = _html.escape
    table = "".join(
        f'<tr><td style="padding:7px 14px 7px 0;color:#5f7079;font-size:13px;white-space:nowrap;vertical-align:top">{e(k)}</td>'
        f'<td style="padding:7px 0;color:#0a1c24;font-size:14px;font-weight:600">{e(v)}</td></tr>' for k, v in rows)
    btn = ""
    if button:
        btn = (f'<p style="margin:22px 0"><a href="{e(button[1])}" style="display:inline-block;padding:13px 22px;border-radius:12px;'
               f'background:#0e6f84;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none">{e(button[0])}</a></p>'
               f'<p style="margin:0 0 14px;font-size:12px;color:#7d8f97;word-break:break-all">{e(button[1])}</p>')
    paras = lambda xs: "".join(f'<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#33474f">{x}</p>' for x in xs)
    return (
        '<!doctype html><html><body style="margin:0;background:#f3f6f7;font-family:Arial,Helvetica,sans-serif">'
        '<div style="max-width:560px;margin:0 auto;padding:28px 16px">'
        f'<div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0e6f84;margin-bottom:12px">{e(company)}</div>'
        '<div style="background:#ffffff;border:1px solid #e2e8eb;border-radius:18px;padding:26px 24px">'
        f'<h1 style="margin:0 0 16px;font-size:20px;color:#0a1c24">{e(title)}</h1>'
        f'{paras(intro)}'
        f'<table style="border-collapse:collapse;margin:8px 0 16px">{table}</table>'
        f'{btn}{paras(after)}'
        '</div>'
        f'<p style="font-size:11.5px;color:#7d8f97;margin:14px 4px 0">E-mail envoyé par {e(company)} via Wedy RH.</p>'
        '</div></body></html>'
    )


def _text(title: str, intro: list[str], rows: list[tuple[str, str]], after: list[str], link: Optional[str]) -> str:
    strip = lambda s: _html.unescape(__import__("re").sub(r"<[^>]+>", "", s))
    lines = [title, ""] + [strip(x) for x in intro] + [""] + [f"{k} : {v}" for k, v in rows] + [""]
    if link:
        lines += [f"Lien : {link}", ""]
    return "\n".join(lines + [strip(x) for x in after])


def render_invite(ctx: dict, update: bool = False) -> tuple[str, str, str]:
    e = _html.escape
    day, hour = ctx["day"], ctx["hour"]
    subject = f"{'Entretien modifié' if update else 'Invitation à un entretien'} – {ctx['job'] or ctx['company']} – {day} à {hour}"
    intro = [f"Bonjour {e(_first(ctx))},",
             (f"Votre entretien a été modifié. Voici les nouvelles informations :" if update else
              f"Suite à votre candidature{(' au poste de <strong>' + e(ctx['job']) + '</strong>') if ctx['job'] else ''}, "
              f"nous avons le plaisir de vous inviter à un entretien avec <strong>{e(ctx['company'])}</strong>.")]
    after = []
    if ctx["mode"] == "place":
        after.append(f"L'entretien se déroulera en présentiel{(' : <strong>' + e(ctx['place']) + '</strong>') if ctx['place'] else ''}. "
                     "Merci de vous présenter quelques minutes en avance.")
    else:
        after.append(f"<strong>Le lien pour rejoindre l'entretien vous sera envoyé par e-mail {REMINDER_MIN} minutes avant le début.</strong> "
                     "Aucun compte n'est nécessaire : il suffit de cliquer sur le lien depuis un ordinateur ou un téléphone, "
                     "d'autoriser la caméra et le micro, puis d'attendre que le recruteur vous fasse entrer.")
        after.append("Prévoyez un endroit calme et une bonne connexion internet.")
    after.append("Un fichier calendrier est joint pour ajouter le rendez-vous à votre agenda. "
                 "Si vous ne pouvez pas être présent(e), merci de répondre à cet e-mail pour convenir d'un autre créneau.")
    after.append(f"Cordialement,<br>L'équipe Ressources Humaines – {e(ctx['company'])}")
    rows = _rows(ctx)
    title = "Entretien modifié" if update else "Invitation à un entretien"
    return subject, _page(title, intro, rows, after, None, ctx["company"]), _text(title, intro, rows, after, None)


def render_cancel(ctx: dict) -> tuple[str, str, str]:
    e = _html.escape
    day, hour = ctx["day"], ctx["hour"]
    subject = f"Entretien annulé – {ctx['job'] or ctx['company']} – {day} à {hour}"
    intro = [f"Bonjour {e(_first(ctx))},", f"Nous vous informons que l'entretien prévu le <strong>{e(day)} à {e(hour)}</strong> est annulé."]
    after = ["Nous reviendrons vers vous si un nouveau créneau est proposé.",
             f"Cordialement,<br>L'équipe Ressources Humaines – {e(ctx['company'])}"]
    return subject, _page("Entretien annulé", intro, [], after, None, ctx["company"]), _text("Entretien annulé", intro, [], after, None)


def render_reminder(ctx: dict, link: str) -> tuple[str, str, str]:
    e = _html.escape
    day, hour = ctx["day"], ctx["hour"]
    subject = f"Votre entretien commence à {hour} – lien pour vous connecter"
    intro = [f"Bonjour {e(_first(ctx))},",
             f"Votre entretien{(' pour le poste de <strong>' + e(ctx['job']) + '</strong>') if ctx['job'] else ''} commence à "
             f"<strong>{e(hour)}</strong> (dans {REMINDER_MIN} minutes). Voici le lien pour le rejoindre :"]
    after = ["Cliquez sur le bouton depuis un ordinateur ou un téléphone, autorisez la caméra et le micro, "
             "puis patientez : le recruteur vous fera entrer.",
             f"Cordialement,<br>L'équipe Ressources Humaines – {e(ctx['company'])}"]
    rows = [("Date", day), ("Heure", f"{hour} (heure du Maroc)")]
    return subject, _page("Votre entretien va commencer", intro, rows, after, ("Rejoindre l'entretien", link), ctx["company"]), \
        _text("Votre entretien va commencer", intro, rows, after, link)


def ics(ctx: dict, cancel: bool = False) -> bytes:
    """Calendar invitation (or its cancellation): the event lands in the candidate's agenda."""
    utc = lambda d: d.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    esc = lambda s: (s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")
    where = ctx["place"] if ctx["mode"] == "place" else (f"Visioconférence – lien envoyé {REMINDER_MIN} min avant" if ctx["mode"] == "wedy" else ctx["link"])
    lines = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wedy RH//Entretiens//FR", f"METHOD:{'CANCEL' if cancel else 'REQUEST'}",
        "BEGIN:VEVENT", f"UID:interview-{ctx['iv']['id']}@wedy", f"DTSTAMP:{utc(datetime.now(timezone.utc))}",
        f"SEQUENCE:{int(time.time()) // 60 % 100000}", f"DTSTART:{utc(ctx['start'])}", f"DTEND:{utc(ctx['end'])}",
        f"SUMMARY:{esc(ctx['type'] + (' – ' + ctx['job'] if ctx['job'] else '') + ' – ' + ctx['company'])}",
        f"LOCATION:{esc(where)}", f"DESCRIPTION:{esc('Entretien avec ' + ctx['company'])}",
        f"ORGANIZER;CN={esc(ctx['conf'].sender_name or ctx['company'])}:mailto:{ctx['conf'].sender_email}",
        f"ATTENDEE;CN={esc(ctx['cand'].get('full_name') or '')};RSVP=TRUE:mailto:{ctx['cand'].get('email') or ''}",
        f"STATUS:{'CANCELLED' if cancel else 'CONFIRMED'}",
    ]
    if not cancel:
        lines += ["BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:Entretien dans 30 minutes", "END:VALARM"]
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return ("\r\n".join(lines) + "\r\n").encode()


# ── sending ──────────────────────────────────────────────────────────────────────────────────────────────

def _save(supabase: Client, iv_id: str, row: dict) -> None:
    try:
        supabase.table("interviews").update(row).eq("id", iv_id).execute()
    except Exception as e:  # columns not migrated yet: the e-mail was sent all the same
        log.info(f"[interview-mail] could not record {list(row)} on {iv_id}: {e}")


def send_invite(supabase: Client, iv: dict, base: str = "", kind: str = "invite") -> dict:
    """invite | update | cancel. Returns {sent, to, error} and records it on the interview."""
    ctx = load(supabase, iv)
    to = (ctx["cand"].get("email") or "").strip()
    if not to:
        return {"sent": False, "to": None, "error": "Le candidat n'a pas d'adresse e-mail dans sa fiche."}
    if not mailer.configured(ctx["conf"]):
        return {"sent": False, "to": to, "error": "Les e-mails ne sont pas encore configurés : Intégrations › E-mails aux candidats."}
    if kind == "cancel":
        subject, html, text = render_cancel(ctx)
        att = [("annulation.ics", ics(ctx, cancel=True), "text/calendar; method=CANCEL")]
    else:
        subject, html, text = render_invite(ctx, update=kind == "update")
        att = [("entretien.ics", ics(ctx), "text/calendar; method=REQUEST")]
    try:
        mailer.send(to, subject, html, text, attachments=att, reply_to=ctx["reply_to"], conf=ctx["conf"])
    except mailer.MailError as e:
        _save(supabase, iv["id"], {"email_error": str(e)[:500]})
        return {"sent": False, "to": to, "error": str(e)}
    row = {"email_error": None}
    if kind != "cancel":
        row["invite_sent_at"] = datetime.now(timezone.utc).isoformat()
        row["reminder_sent_at"] = None  # a new / moved invitation gets its reminder again
    if base and not iv.get("public_base_url"):
        row["public_base_url"] = base
    _save(supabase, iv["id"], row)
    return {"sent": True, "to": to, "error": None}


def send_due_reminders(supabase: Client, now: Optional[datetime] = None) -> int:
    """E-mail the link of the video interviews starting in the next 15 minutes (each one once). Returns how many."""
    conf = mailer.current(supabase)
    if not mailer.configured(conf):
        return 0
    now = now or datetime.now(timezone.utc)
    today = now.astimezone(tz()).date()
    days = [str(today + timedelta(days=d)) for d in (-1, 0, 1)]
    try:
        rows = supabase.table("interviews").select("*").in_("date", days).is_("reminder_sent_at", "null").execute().data or []
    except Exception:
        return 0  # columns not migrated yet
    sent = 0
    for iv in rows:
        if str(iv.get("status") or "").lower() in DONE:
            continue
        ctx = load(supabase, iv)
        if ctx["mode"] == "place" or not (ctx["cand"].get("email") or "").strip():
            continue
        if not (ctx["start"] - timedelta(minutes=REMINDER_MIN) <= now < ctx["start"] + timedelta(minutes=10)):
            continue
        base = public_base(iv)
        link = join_link(ctx, base)
        if not link:
            _save(supabase, iv["id"], {"email_error": "Lien non envoyé : adresse de Wedy inconnue (APP_PUBLIC_URL)."})
            continue
        # claim it: only the one that sets reminder_sent_at sends (no double e-mail)
        try:
            claim = supabase.table("interviews").update({"reminder_sent_at": now.isoformat()}).eq("id", iv["id"]).is_("reminder_sent_at", "null").execute()
        except Exception:
            continue
        if not claim.data:
            continue
        subject, html, text = render_reminder(ctx, link)
        try:
            mailer.send(ctx["cand"]["email"], subject, html, text, reply_to=ctx["reply_to"], conf=ctx["conf"])
            _save(supabase, iv["id"], {"email_error": None})
            sent += 1
        except mailer.MailError as e:
            _save(supabase, iv["id"], {"reminder_sent_at": None, "email_error": str(e)[:500]})  # tried again next minute
    return sent


async def reminder_loop(get_client, every: int = 60) -> None:
    """Runs in the API: every minute, the reminders that are due."""
    import asyncio
    from starlette.concurrency import run_in_threadpool
    while True:
        try:
            n = await run_in_threadpool(send_due_reminders, get_client())
            if n:
                log.info(f"[interview-mail] {n} reminder(s) sent")
        except Exception as e:  # never stop the loop
            log.warning(f"[interview-mail] reminder loop: {e}")
        await asyncio.sleep(every)


def mail_status(supabase: Optional[Client] = None) -> dict:
    """Whether e-mails can go out, from which address, and the account's settings (never its password)."""
    conf = mailer.current(supabase)
    ok = mailer.configured(conf)
    saved = mailer.stored(supabase) or {}
    return {"configured": ok, "from": mailer.sender(conf) if ok else None, "source": conf.source if ok else None,
            "reminder_minutes": REMINDER_MIN, "public_url": (os.getenv("APP_PUBLIC_URL") or "").strip() or None,
            "account": {"server": conf.server, "port": conf.port, "security": conf.security, "username": conf.username,
                        "from": conf.sender_email, "from_name": conf.sender_name, "has_password": bool(conf.password),
                        "updated_at": saved.get("updated_at"), "updated_by_name": saved.get("updated_by_name")} if conf.source == "platform" else None,
            "env_configured": mailer.configured(mailer.env_conf())}


def today() -> date:
    return datetime.now(tz()).date()
