"""The decision e-mail to a candidate, once HR has decided: « candidature retenue » after the interviews (offer,
hiring as an employee or as an intern), or the polite refusal.

HR reads it before it goes: Wedy proposes the subject and the message (from the candidate's name, the job, the
company and whether they had interviews), HR can change the words, sees the real e-mail, then sends. The e-mail has
the same design as the interview e-mails (logo, badge, signature). What was sent is kept on the candidate's file
(custom_fields.decision_mail: kind, date, address), so the screens can say it and warn before sending it twice."""
from __future__ import annotations

import base64
import html as _html
import re
from datetime import datetime, timezone
from typing import Optional

from supabase import Client

from app.services import mail_design, mailer

KINDS = ("accept", "reject")
_DONE = {"cancelled", "canceled", "annule", "annulé"}


def _one(supabase: Client, table: str, cols: str, key: str, value) -> dict:
    if not value:
        return {}
    try:
        return (supabase.table(table).select(cols).eq(key, str(value)).limit(1).execute().data or [{}])[0] or {}
    except Exception:
        return {}


def context(supabase: Client, candidate_id: str) -> Optional[dict]:
    """The candidate, the job, the company (name, logo), the sending account, whether they had interviews."""
    cand = _one(supabase, "employees", "id, full_name, email, position, status, custom_fields", "id", candidate_id)
    if not cand:
        return None
    cf = cand.get("custom_fields") if isinstance(cand.get("custom_fields"), dict) else {}
    ad = _one(supabase, "recruitment_ads", "poste", "id", cf.get("ad_id")) if cf.get("ad_id") else {}
    try:
        from app.services import app_settings
        all_settings = app_settings.load(supabase)[0]
        company, assets = all_settings.get("company") or {}, all_settings.get("assets") or {}
    except Exception:
        company, assets = {}, {}
    try:
        ivs = supabase.table("interviews").select("id, status").eq("candidate_id", str(candidate_id)).execute().data or []
    except Exception:
        ivs = []
    return {
        "cand": cand, "custom": cf,
        "job": (ad.get("poste") or cand.get("position") or "").strip(),
        "intern": str(cand.get("status") or "").lower() == "intern",
        "interviews": sum(1 for i in ivs if str(i.get("status") or "").lower() not in _DONE),
        "company": (company.get("name") or "").strip() or "notre entreprise",
        "company_info": company,
        "reply_to": (company.get("email") or "").strip() or None,
        "logo": mail_design.logo_image(assets, company),
        "conf": mailer.current(supabase),
    }


def defaults(ctx: dict, kind: str, intern: Optional[bool] = None) -> tuple[str, str]:
    """The subject and the message Wedy proposes (plain text, paragraphs separated by a blank line)."""
    name = (ctx["cand"].get("full_name") or "").strip()
    job, company = ctx["job"], ctx["company"]
    intern = ctx["intern"] if intern is None else intern
    hello = f"Bonjour {name}," if name else "Bonjour,"
    post = (f"au stage de {job}" if job else "au stage proposé") if intern else (f"au poste de {job}" if job else "")
    after_iv = ctx["interviews"] > 0
    if kind == "accept":
        subject = (f"Votre candidature {post} – bonne nouvelle" if post else f"Votre candidature chez {company} – bonne nouvelle")
        next_steps = ("la date de début du stage, la convention et les documents à prévoir" if intern
                      else "la proposition, la date de démarrage et les documents à prévoir")
        paras = [
            hello,
            f"Nous avons le plaisir de vous annoncer que votre candidature{(' ' + post) if post else ''} a été retenue "
            f"{'à l’issue de vos entretiens' if after_iv else 'après l’étude de votre dossier'} avec {company}.",
            f"Notre équipe Ressources Humaines vous contactera très prochainement pour vous présenter la suite : {next_steps}.",
            "Toute l’équipe se réjouit de vous accueillir parmi nous.",
        ]
    else:
        subject = f"Votre candidature {post}" if post else f"Votre candidature chez {company}"
        thanks = (f"Nous vous remercions pour l’intérêt que vous portez à {company} et pour le temps que vous nous avez accordé "
                  f"lors de vos entretiens{(' pour le ' + post[3:]) if post.startswith('au ') else ''}." if after_iv else
                  f"Nous vous remercions pour l’intérêt que vous portez à {company} et pour votre candidature{(' ' + post) if post else ''}.")
        paras = [
            hello, thanks,
            "Après une étude attentive, nous sommes au regret de vous informer que nous ne donnerons pas une suite favorable "
            "à votre candidature pour ce poste.",
            "Cette décision ne remet pas en cause la qualité de votre parcours. Nous conservons votre profil et ne manquerons pas "
            "de revenir vers vous si une opportunité correspondant à vos compétences se présente.",
            "Nous vous souhaitons pleine réussite dans vos projets.",
        ]
    return subject, "\n\n".join(paras)


def _paragraphs(message: str) -> list[str]:
    blocks = [b.strip() for b in re.split(r"\n\s*\n", (message or "").replace("\r", "")) if b.strip()]
    return [_html.escape(b).replace("\n", "<br>") for b in blocks]


def render(ctx: dict, kind: str, subject: str, message: str) -> tuple[str, str]:
    """The e-mail (HTML, text) around HR's message."""
    sign = ["Cordialement,", f"<strong>L'équipe Ressources Humaines</strong> – {_html.escape(ctx['company'])}"]
    accept = kind == "accept"
    logo = ctx.get("logo")
    paras = _paragraphs(message)
    html = mail_design.page(
        company=ctx.get("company_info") or {"name": ctx["company"]}, has_logo=bool(logo),
        logo_light=mail_design.logo_is_light(logo[0] if logo else None),
        preheader=(re.sub(r"<[^>]+>", "", paras[1]) if len(paras) > 1 else subject)[:140],
        badge=("Candidature retenue", "green") if accept else ("Suite de votre candidature", "teal"),
        title="Félicitations !" if accept else "Merci pour votre candidature",
        subtitle=" · ".join(x for x in [ctx["job"], ctx["company"]] if x),
        paragraphs=paras, closing=sign)
    text = "\n\n".join([b.strip() for b in re.split(r"\n\s*\n", message or "") if b.strip()]
                       + [f"Cordialement,\nL'équipe Ressources Humaines – {ctx['company']}"])
    return html, text


def preview_html(ctx: dict, html: str) -> str:
    """The e-mail as the browser shows it: the cid: logo replaced by the picture itself."""
    logo = ctx.get("logo")
    if not logo:
        return html
    return html.replace(f"cid:{mail_design.LOGO_CID}", f"data:{logo[1]};base64,{base64.b64encode(logo[0]).decode()}")


def send(supabase: Client, ctx: dict, kind: str, subject: str, message: str, by: Optional[str] = None) -> dict:
    """Sends it and keeps it on the candidate's file. Returns {sent, to, error, record}."""
    to = (ctx["cand"].get("email") or "").strip()
    if not to:
        return {"sent": False, "to": None, "error": "Le candidat n'a pas d'adresse e-mail dans sa fiche.", "record": None}
    if not mailer.configured(ctx["conf"]):
        return {"sent": False, "to": to, "error": "Les e-mails ne sont pas encore configurés : Intégrations › E-mails aux candidats.", "record": None}
    html, text = render(ctx, kind, subject, message)
    inline = [(mail_design.LOGO_CID, *ctx["logo"])] if ctx.get("logo") else []
    try:
        mailer.send(to, subject, html, text, reply_to=ctx["reply_to"], conf=ctx["conf"], inline=inline)
    except mailer.MailError as e:
        return {"sent": False, "to": to, "error": str(e), "record": None}
    record = {"kind": kind, "sent_at": datetime.now(timezone.utc).isoformat(), "to": to, "subject": subject[:300], "by": by}
    custom = dict(ctx["custom"])
    custom["decision_mail"] = record
    try:
        supabase.table("employees").update({"custom_fields": custom}).eq("id", ctx["cand"]["id"]).execute()
    except Exception:
        pass  # sent all the same
    return {"sent": True, "to": to, "error": None, "record": record}
