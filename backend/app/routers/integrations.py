"""Intégrations — /api/integrations: the iCal feed of approved leave (Google Calendar, Outlook, Apple).

The feed URL carries a secret token (stored in rh.app_settings under "ical"); anyone holding the URL
can read the team's approved leave, so HR can regenerate or revoke it.
"""
import secrets
from datetime import date, datetime, timedelta

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
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


# ── E-mails (interview invitations and reminders) ─────────────────────────────
# The SMTP account is set here by HR (no server change needed): saved in app_settings « mail », the password
# encrypted with SECRET_KEY and never sent back. Without it, the API's environment (MAIL_*) is used.

_TEST_TEXT = "Bonjour,\n\nCet e-mail de test confirme que Wedy peut envoyer les invitations aux entretiens et les rappels avec le lien."
_TEST_SUBJECT = "Test d'envoi d'e-mail – Wedy RH"


def _test_mail(supabase: Client, conf) -> tuple[str, list]:
    """The test e-mail, in the same design as the candidates' e-mails: (html, inline pictures)."""
    from app.services import mail_design, mailer
    from app.services.interview_mail import REMINDER_MIN
    try:
        s = app_settings.load(supabase)[0]
        company, logo = s.get("company") or {}, mail_design.logo_image(s.get("assets"))
    except Exception:
        company, logo = {}, None
    html = mail_design.page(
        company=company, has_logo=bool(logo), preheader="L'envoi des e-mails aux candidats fonctionne.", badge=("Test réussi", "green"),
        title="L'envoi des e-mails fonctionne", subtitle="Ceci est un e-mail de test envoyé depuis Wedy RH.",
        paragraphs=["Bonjour,", "Si vous lisez ce message, Wedy peut envoyer les e-mails aux candidats depuis cette adresse."],
        rows=[("Expéditeur", mailer.sender(conf)), ("Invitation", "Dès qu'un entretien est planifié, avec le rendez-vous pour l'agenda"),
              ("Lien de visio", f"Envoyé {REMINDER_MIN} minutes avant le début de l'entretien"), ("Annulation", "Envoyée si l'entretien est annulé")],
        notice=("Aucune action n'est nécessaire : vous pouvez supprimer cet e-mail.", "green"), kicker="Wedy RH")
    return html, ([(mail_design.LOGO_CID, *logo)] if logo else [])


class MailAccountIn(BaseModel):
    server: str = Field(min_length=3, max_length=120)
    port: int = Field(587, ge=1, le=65535)
    security: Literal["starttls", "ssl", "none"] = "starttls"
    username: str = Field("", max_length=200)
    password: str = Field("", max_length=300)        # empty: keep the one already saved
    sender_email: str = Field(min_length=3, max_length=200)
    sender_name: str = Field("", max_length=120)
    no_auth: bool = False


@router.get("/mail")
def mail_status(supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    from app.services.interview_mail import mail_status as status
    return status(supabase)


def _form_conf(body: MailAccountIn, supabase: Client):
    from app.services import mailer
    saved = mailer.stored(supabase) or {}
    password = body.password or (mailer.unseal(saved.get("password_enc") or "") if saved else "")
    if "@" not in body.sender_email:
        raise HTTPException(status_code=422, detail="Adresse d'envoi invalide.")
    return mailer.Conf(server=body.server.strip(), port=body.port, security=body.security, username=body.username.strip(),
                       password=password, sender_email=body.sender_email.strip(), sender_name=body.sender_name.strip(),
                       no_auth=body.no_auth, source="platform")


@router.put("/mail")
def mail_save(body: MailAccountIn, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """Save the account after a test e-mail to the signed-in user went out with it: a wrong password never replaces
    a working account. When the connection itself fails, the usual other ports are tried and the one that works is kept."""
    from app.services import mailer
    from app.services.interview_mail import mail_status as status
    conf = _form_conf(body, supabase)
    if not mailer.configured(conf):
        raise HTTPException(status_code=422, detail="Renseignez l'identifiant et le mot de passe du compte d'envoi.")
    to = (current_user.get("email") or "").strip()
    if not to:
        raise HTTPException(status_code=422, detail="Votre compte n'a pas d'adresse e-mail pour recevoir le test.")
    adjusted = None
    try:
        html, inline = _test_mail(supabase, conf)
        mailer.send(to, _TEST_SUBJECT, html, _TEST_TEXT, conf=conf, inline=inline)
    except mailer.MailError as e:
        if e.kind != "connection":   # a refused password: say it, nothing else to try
            raise HTTPException(status_code=422, detail=str(e))
        diag = mailer.diagnose(conf)
        alt = diag.get("alternative")
        if not alt:
            raise HTTPException(status_code=422, detail={"message": str(e), "diagnostic": diag})
        conf = mailer.Conf(**{**conf.__dict__, "port": alt["port"], "security": alt["security"]})
        try:
            html, inline = _test_mail(supabase, conf)
            mailer.send(to, _TEST_SUBJECT, html, _TEST_TEXT, conf=conf, inline=inline)
        except mailer.MailError as e2:
            raise HTTPException(status_code=422, detail={"message": str(e2), "diagnostic": diag})
        adjusted = alt
    value = {"server": conf.server, "port": conf.port, "security": conf.security, "username": conf.username,
             "password_enc": mailer.seal(conf.password), "from": conf.sender_email, "from_name": conf.sender_name,
             "no_auth": conf.no_auth, "updated_at": datetime.utcnow().isoformat(),
             "updated_by_name": current_user.get("full_name") or current_user.get("email") or ""}
    try:
        supabase.table("app_settings").upsert({"key": "mail", "value": value, "updated_by": current_user.get("id"),
                                               "updated_at": datetime.utcnow().isoformat()}).execute()
    except Exception as e:
        if app_settings.missing_table(e):
            raise HTTPException(status_code=503, detail="Table des réglages absente : lancez la migration app_settings.sql.")
        raise HTTPException(status_code=400, detail=str(e)[:200])
    log_action(supabase, current_user["id"], "UPDATE", "mail_account", conf.sender_email)
    return {**status(supabase), "test_sent_to": to, "adjusted": adjusted}


class MailDiagnoseIn(BaseModel):
    account: Optional[MailAccountIn] = None   # the form being filled in; else the account in use


@router.post("/mail/diagnose")
def mail_diagnose(body: MailDiagnoseIn = MailDiagnoseIn(), supabase: Client = Depends(get_db),
                  current_user: dict = Depends(require_hr_or_admin)):
    """Where the connection to the mail server stops (address, port, answer, encryption, login) and which other
    port / security works. No e-mail is sent. For an account of the server's environment, the lines to change."""
    from app.services import mailer
    conf = _form_conf(body.account, supabase) if body.account else mailer.current(supabase)
    if not conf.server:
        raise HTTPException(status_code=422, detail="Aucun serveur d'e-mails n'est renseigné.")
    diag = mailer.diagnose(conf)
    alt = diag.get("alternative")
    if alt and conf.source == "env":
        diag["env_lines"] = [f"MAIL_PORT={alt['port']}", f"MAIL_SSL_TLS={'true' if alt['security'] == 'ssl' else 'false'}",
                             f"MAIL_STARTTLS={'true' if alt['security'] == 'starttls' else 'false'}"]
    return diag


@router.delete("/mail", status_code=204)
def mail_remove(supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """Forget the account set in Wedy (the environment's one, if any, is used again)."""
    supabase.table("app_settings").delete().eq("key", "mail").execute()
    log_action(supabase, current_user["id"], "DELETE", "mail_account", "mail")


@router.post("/mail/test")
def mail_test(supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """Send a test e-mail to the signed-in user with the account in use."""
    from app.services import mailer
    to = (current_user.get("email") or "").strip()
    if not to:
        raise HTTPException(status_code=422, detail="Votre compte n'a pas d'adresse e-mail.")
    try:
        conf = mailer.current(supabase)
        html, inline = _test_mail(supabase, conf)
        mailer.send(to, _TEST_SUBJECT, html, _TEST_TEXT, conf=conf, inline=inline)
    except mailer.MailError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"sent": True, "to": to}
