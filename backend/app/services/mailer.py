"""Sending e-mails through an SMTP account: the one HR set in Wedy (Intégrations › E-mails, password encrypted with
SECRET_KEY), else the one of the API's environment (MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM,
MAIL_FROM_NAME, MAIL_STARTTLS / MAIL_SSL_TLS). Works with Gmail / Google Workspace (app password), Microsoft 365,
OVH, Zoho, Brevo… any SMTP account.

Tests replace `transport` so nothing ever leaves the machine."""
from __future__ import annotations

import os
import smtplib
import ssl
from contextvars import ContextVar
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from typing import Callable, Optional

from app.config import settings


class MailError(Exception):
    pass


# ── where the SMTP account comes from: set in Wedy (Intégrations › E-mails), else the API's environment ──────────

@dataclass
class Conf:
    server: str = ""
    port: int = 587
    security: str = "starttls"          # starttls | ssl | none
    username: str = ""
    password: str = ""
    sender_email: str = ""
    sender_name: str = ""
    no_auth: bool = False               # a relay that only checks the IP
    source: str = "env"                 # env | platform


def env_conf() -> Conf:
    port = int(settings.MAIL_PORT or 587)
    security = "ssl" if settings.MAIL_SSL_TLS or port == 465 else ("starttls" if settings.MAIL_STARTTLS else "none")
    return Conf(server=(settings.MAIL_SERVER or "").strip(), port=port, security=security, username=(settings.MAIL_USERNAME or "").strip(),
                password=settings.MAIL_PASSWORD or "", sender_email=(settings.MAIL_FROM or "").strip(), sender_name=settings.MAIL_FROM_NAME or "",
                no_auth=(os.getenv("MAIL_NO_AUTH") or "").strip().lower() in ("1", "true", "yes"), source="env")


def _box():
    import base64
    import hashlib
    from cryptography.fernet import Fernet
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(f"mail.{settings.SECRET_KEY}".encode()).digest()))


def seal(secret: str) -> str:
    return _box().encrypt(secret.encode()).decode() if secret else ""


def unseal(token: str) -> str:
    if not token:
        return ""
    try:
        return _box().decrypt(token.encode()).decode()
    except Exception:   # SECRET_KEY changed: the password has to be typed again
        return ""


def stored(db) -> Optional[dict]:
    """The account saved in Wedy (app_settings « mail », never sent to the browser with its password), or None."""
    if db is None:
        return None
    try:
        rows = db.table("app_settings").select("value").eq("key", "mail").limit(1).execute().data or []
    except Exception:
        return None
    v = rows[0].get("value") if rows else None
    return v if isinstance(v, dict) and v.get("server") else None


def current(db=None) -> Conf:
    """The account to send with: the one saved in Wedy when there is one, else the environment's."""
    v = stored(db)
    if v:
        return Conf(server=str(v.get("server") or "").strip(), port=int(v.get("port") or 587), security=v.get("security") or "starttls",
                    username=str(v.get("username") or "").strip(), password=unseal(v.get("password_enc") or ""),
                    sender_email=str(v.get("from") or v.get("username") or "").strip(), sender_name=str(v.get("from_name") or ""),
                    no_auth=bool(v.get("no_auth")), source="platform")
    return env_conf()


def configured(conf: Optional[Conf] = None) -> bool:
    """A server, a sender address and a login (MAIL_SERVER and MAIL_FROM have defaults in the environment, so the
    login is what says it was really set up; a relay that only checks the IP is declared with no_auth)."""
    c = conf or env_conf()
    if not (c.server and c.sender_email):
        return False
    return c.no_auth or bool(c.username and c.password)


def sender(conf: Optional[Conf] = None) -> str:
    c = conf or env_conf()
    return formataddr((c.sender_name or "", c.sender_email))


_ACTIVE: ContextVar[Optional[Conf]] = ContextVar("mail_conf", default=None)


def _smtp_send(msg: EmailMessage) -> None:
    c = _ACTIVE.get() or env_conf()
    ctx = ssl.create_default_context()
    try:
        if c.security == "ssl" or c.port == 465:
            server = smtplib.SMTP_SSL(c.server, c.port, context=ctx, timeout=20)
        else:
            server = smtplib.SMTP(c.server, c.port, timeout=20)
            server.ehlo()
            if c.security == "starttls":
                server.starttls(context=ctx)
                server.ehlo()
        with server:
            if c.username and not c.no_auth:
                server.login(c.username, c.password)
            server.send_message(msg)
    except smtplib.SMTPAuthenticationError as e:
        hint = ""
        if "gmail" in c.server or "google" in c.server:
            hint = " Avec Gmail / Google Workspace, utilisez un « mot de passe d'application » (compte Google › Sécurité › Validation en deux étapes › Mots de passe des applications), pas le mot de passe habituel."
        elif "office365" in c.server or "outlook" in c.server:
            hint = " Avec Microsoft 365, l'« envoi SMTP authentifié » doit être activé pour cette boîte (Centre d'administration › Utilisateurs › Courrier)."
        raise MailError(f"Identifiant ou mot de passe refusé par le serveur d'e-mails ({e.smtp_code}).{hint}")
    except (smtplib.SMTPException, OSError) as e:
        raise MailError(f"Envoi impossible ({type(e).__name__}) : {e}")


# replaced by the tests: (message) -> None
transport: Callable[[EmailMessage], None] = _smtp_send


def send(to: str, subject: str, html: str, text: str, attachments: Optional[list[tuple[str, bytes, str]]] = None,
         reply_to: Optional[str] = None, conf: Optional[Conf] = None) -> str:
    """Send one e-mail (HTML + plain text, optional attachments [(name, bytes, mime)]) with `conf` (the environment's
    account when none is given). Returns the Message-ID."""
    conf = conf or env_conf()
    if not configured(conf):
        raise MailError("Les e-mails ne sont pas configurés : renseignez le compte d'envoi dans Intégrations › E-mails.")
    to = (to or "").strip()
    if "@" not in to:
        raise MailError("Adresse e-mail du destinataire absente ou invalide.")
    msg = EmailMessage()
    msg["From"] = sender(conf)
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=(conf.sender_email.split("@")[-1] or "wedy.local"))
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    for name, data, mime in attachments or []:  # mime may carry parameters: « text/calendar; method=CANCEL »
        base, _, rest = mime.partition(";")
        maintype, _, subtype = base.strip().partition("/")
        params = dict(p.strip().split("=", 1) for p in rest.split(";") if "=" in p)
        msg.add_attachment(data, maintype=maintype, subtype=subtype or "octet-stream", filename=name, params=params)
    token = _ACTIVE.set(conf)
    try:
        transport(msg)
    finally:
        _ACTIVE.reset(token)
    return msg["Message-ID"]
