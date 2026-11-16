"""Sending e-mails through an SMTP account: the one HR set in Wedy (Intégrations › E-mails, password encrypted with
SECRET_KEY), else the one of the API's environment (MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM,
MAIL_FROM_NAME, MAIL_STARTTLS / MAIL_SSL_TLS). Works with Gmail / Google Workspace (app password), Microsoft 365,
OVH, Zoho, Brevo… any SMTP account.

Tests replace `transport` so nothing ever leaves the machine."""
from __future__ import annotations

import os
import smtplib
import socket
import ssl
from contextvars import ContextVar
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from typing import Callable, Optional

from app.config import settings


class MailError(Exception):
    """kind: « connection » (the server could not be reached / closed the connection), « auth », or « other »."""
    def __init__(self, message: str = "", kind: str = "other"):
        super().__init__(message)
        self.kind = kind


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
_MODE = {"starttls": "STARTTLS", "ssl": "SSL", "none": "sans chiffrement"}


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
        raise MailError(f"Identifiant ou mot de passe refusé par le serveur d'e-mails ({e.smtp_code}).{hint}", kind="auth")
    except smtplib.SMTPServerDisconnected:
        raise MailError(f"Le serveur {c.server}:{c.port} ({_MODE[c.security]}) a fermé la connexion sans répondre. "
                        "Le port ou la sécurité ne correspondent pas, ou l'hébergeur de Wedy filtre l'envoi d'e-mails : "
                        "lancez « Diagnostiquer » dans Intégrations › E-mails.", kind="connection")
    except (TimeoutError, socket.timeout):
        raise MailError(f"Pas de réponse de {c.server}:{c.port} : le port est sans doute bloqué en sortie par l'hébergeur de Wedy. "
                        "Lancez « Diagnostiquer » dans Intégrations › E-mails.", kind="connection")
    except ssl.SSLError as e:
        raise MailError(f"Échec du chiffrement avec {c.server}:{c.port} ({_MODE[c.security]}) : {e.reason or e}. "
                        "Lancez « Diagnostiquer » dans Intégrations › E-mails.", kind="connection")
    except (smtplib.SMTPConnectError, ConnectionError, socket.gaierror) as e:
        raise MailError(f"Connexion impossible à {c.server}:{c.port} — {type(e).__name__} : {e}", kind="connection")
    except (smtplib.SMTPException, OSError) as e:
        raise MailError(f"Envoi impossible via {c.server}:{c.port} ({_MODE[c.security]}) — {type(e).__name__} : {e}")


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


# ── diagnostic: where the connection to the mail server stops, and which port / security works ──────────────

_ALTERNATIVES = [(587, "starttls"), (465, "ssl"), (25, "starttls"), (2525, "starttls")]


def _probe(c: Conf, timeout: float = 8.0, login: bool = True) -> list[dict]:
    """Steps of one connection attempt: [{key, ok, detail}]. Stops at the first failure. Sends no e-mail."""
    steps: list[dict] = []

    def step(key, ok, detail=""):
        steps.append({"key": key, "ok": ok, "detail": detail})
        return ok

    try:
        ips = sorted({a[4][0] for a in socket.getaddrinfo(c.server, c.port, proto=socket.IPPROTO_TCP)})
        step("dns", True, ", ".join(ips[:3]))
    except OSError as e:
        step("dns", False, f"{c.server} introuvable ({e})")
        return steps
    try:
        sock = socket.create_connection((c.server, c.port), timeout=timeout)
        sock.close()
        step("tcp", True, f"port {c.port} ouvert")
    except (TimeoutError, socket.timeout):
        step("tcp", False, f"pas de réponse sur le port {c.port} : bloqué en sortie (pare-feu de l'hébergeur de Wedy) ou fermé chez le fournisseur")
        return steps
    except OSError as e:
        step("tcp", False, f"connexion refusée sur le port {c.port} ({e})")
        return steps
    ctx = ssl.create_default_context()
    server = None
    try:
        try:
            server = (smtplib.SMTP_SSL(c.server, c.port, context=ctx, timeout=timeout) if c.security == "ssl"
                      else smtplib.SMTP(c.server, c.port, timeout=timeout))
        except smtplib.SMTPServerDisconnected:
            step("greeting", False, "le serveur a fermé la connexion sans se présenter"
                 + (" (ce port attend sans doute une connexion SSL directe)" if c.security != "ssl" else ""))
            return steps
        except ssl.SSLError as e:
            step("greeting", False, f"échec de la connexion SSL ({e.reason or e}) : ce port n'est sans doute pas en SSL direct")
            return steps
        except (TimeoutError, socket.timeout):
            step("greeting", False, "le serveur ne se présente pas (le port attend sans doute une connexion SSL directe)")
            return steps
        code, msg = server.ehlo()
        step("greeting", 200 <= code < 300, (msg or b"").decode(errors="replace").split("\n")[0][:120])
        if c.security == "starttls":
            if not server.has_extn("starttls"):
                step("tls", False, "le serveur ne propose pas STARTTLS sur ce port")
                return steps
            try:
                server.starttls(context=ctx)
                server.ehlo()
                step("tls", True, "STARTTLS")
            except (ssl.SSLError, smtplib.SMTPException, OSError) as e:
                step("tls", False, f"échec de STARTTLS ({type(e).__name__} : {e})")
                return steps
        elif c.security == "ssl":
            step("tls", True, "SSL")
        if login and c.username and not c.no_auth:
            try:
                server.login(c.username, c.password)
                step("login", True, c.username)
            except smtplib.SMTPAuthenticationError as e:
                step("login", False, f"identifiant ou mot de passe refusé ({e.smtp_code})")
            except (smtplib.SMTPException, OSError) as e:
                step("login", False, f"{type(e).__name__} : {e}")
    except (smtplib.SMTPException, OSError) as e:
        step("greeting", False, f"{type(e).__name__} : {e}")
    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                pass
    return steps


def diagnose(conf: Conf, try_others: bool = True) -> dict:
    """Test the account step by step; when the connection itself fails, try the usual other ports (in parallel)
    and say which one works. Nothing is sent."""
    steps = _probe(conf)
    failed = next((st for st in steps if not st["ok"]), None)
    needs_login = bool(conf.username) and not conf.no_auth
    ok = failed is None and any(st["key"] == ("login" if needs_login else "greeting") for st in steps)
    alternative = None
    tried: list[dict] = []
    if try_others and failed and failed["key"] in ("tcp", "greeting", "tls"):
        from concurrent.futures import ThreadPoolExecutor
        others = [(p, sec) for p, sec in _ALTERNATIVES if (p, sec) != (conf.port, conf.security)]
        with ThreadPoolExecutor(max_workers=len(others)) as pool:
            results = list(pool.map(lambda ps: (ps, _probe(Conf(**{**conf.__dict__, "port": ps[0], "security": ps[1]}), timeout=6.0)), others))
        for (p, sec), st in results:
            good = all(x["ok"] for x in st)
            reached = next((x["key"] for x in reversed(st) if x["ok"]), None)
            tried.append({"port": p, "security": sec, "ok": good, "reached": reached,
                          "detail": next((x["detail"] for x in st if not x["ok"]), "")})
            if good and alternative is None and any(x["key"] in ("login", "tls") for x in st):
                alternative = {"port": p, "security": sec}
    return {"server": conf.server, "port": conf.port, "security": conf.security, "source": conf.source,
            "ok": bool(ok), "steps": steps, "failed": failed["key"] if failed else None, "tried": tried, "alternative": alternative}
