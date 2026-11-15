"""Sending e-mails through the SMTP server set in the environment (MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD,
MAIL_FROM, MAIL_FROM_NAME, MAIL_STARTTLS / MAIL_SSL_TLS). Works with Gmail / Google Workspace (app password),
Microsoft 365, Brevo, Mailgun, OVH… any SMTP account.

Tests replace `transport` so nothing ever leaves the machine."""
from __future__ import annotations

import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from typing import Callable, Optional

from app.config import settings


class MailError(Exception):
    pass


def configured() -> bool:
    """An SMTP server, a sender address and a login are set. MAIL_SERVER and MAIL_FROM have defaults, so the login is
    what says the server was really set up; a relay that only checks the IP is declared with MAIL_NO_AUTH=true."""
    if not ((settings.MAIL_SERVER or "").strip() and (settings.MAIL_FROM or "").strip()):
        return False
    if (os.getenv("MAIL_NO_AUTH") or "").strip().lower() in ("1", "true", "yes"):
        return True
    return bool((settings.MAIL_USERNAME or "").strip() and (settings.MAIL_PASSWORD or "").strip())


def sender() -> str:
    return formataddr((settings.MAIL_FROM_NAME or "", settings.MAIL_FROM))


def _smtp_send(msg: EmailMessage) -> None:
    host, port = settings.MAIL_SERVER, int(settings.MAIL_PORT or 587)
    ctx = ssl.create_default_context()
    try:
        if settings.MAIL_SSL_TLS or port == 465:
            server = smtplib.SMTP_SSL(host, port, context=ctx, timeout=20)
        else:
            server = smtplib.SMTP(host, port, timeout=20)
            server.ehlo()
            if settings.MAIL_STARTTLS:
                server.starttls(context=ctx)
                server.ehlo()
        with server:
            if settings.MAIL_USERNAME:
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        raise MailError("Connexion au serveur d'e-mails refusée : vérifiez MAIL_USERNAME / MAIL_PASSWORD (mot de passe d'application pour Gmail).")
    except (smtplib.SMTPException, OSError) as e:
        raise MailError(f"Envoi impossible ({type(e).__name__}) : {e}")


# replaced by the tests: (message) -> None
transport: Callable[[EmailMessage], None] = _smtp_send


def send(to: str, subject: str, html: str, text: str, attachments: Optional[list[tuple[str, bytes, str]]] = None,
         reply_to: Optional[str] = None) -> str:
    """Send one e-mail (HTML + plain text, optional attachments [(name, bytes, mime)]). Returns the Message-ID."""
    if not configured():
        raise MailError("Les e-mails ne sont pas configurés (MAIL_SERVER, MAIL_FROM… dans l'environnement de l'API).")
    to = (to or "").strip()
    if "@" not in to:
        raise MailError("Adresse e-mail du destinataire absente ou invalide.")
    msg = EmailMessage()
    msg["From"] = sender()
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=(settings.MAIL_FROM.split("@")[-1] or "wedy.local"))
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    for name, data, mime in attachments or []:  # mime may carry parameters: « text/calendar; method=CANCEL »
        base, _, rest = mime.partition(";")
        maintype, _, subtype = base.strip().partition("/")
        params = dict(p.strip().split("=", 1) for p in rest.split(";") if "=" in p)
        msg.add_attachment(data, maintype=maintype, subtype=subtype or "octet-stream", filename=name, params=params)
    transport(msg)
    return msg["Message-ID"]
