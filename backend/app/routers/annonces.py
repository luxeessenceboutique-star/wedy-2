from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.dependencies import get_current_user
from app.repositories import annonce_repository
from supabase import Client

router = APIRouter(prefix="/annonces", tags=["Recruitment - Annonces"])


class JobAdBase(BaseModel):
    poste: str
    description: Optional[str] = None
    competences: Optional[str] = None
    experience: Optional[str] = None
    contenu: str
    image_url: Optional[str] = None
    is_active: bool = True


class JobAdCreate(JobAdBase):
    pass


class JobAdOut(JobAdBase):
    id: UUID
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[JobAdOut])
def list_annonces(supabase: Client = Depends(get_db)):
    res = annonce_repository.list_annonces(supabase)
    return res.data or []


@router.get("/{id}", response_model=JobAdOut)
def get_annonce(id: UUID, supabase: Client = Depends(get_db)):
    res = annonce_repository.get_annonce(supabase, str(id))
    if not res.data:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    return res.data


@router.post("", response_model=JobAdOut)
def create_annonce(
    payload: JobAdCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = annonce_repository.create_annonce(supabase, payload.dict())
    if not res.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la création de l'annonce")
    return res.data[0]


@router.patch("/{id}", response_model=JobAdOut)
def update_annonce(
    id: UUID,
    payload: JobAdBase,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = annonce_repository.update_annonce(
        supabase, str(id), {**payload.dict(), "updated_at": datetime.now().isoformat()}
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    return res.data[0]


@router.delete("/{id}")
def delete_annonce(
    id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    annonce_repository.delete_annonce(supabase, str(id))
    return {"message": "Annonce supprimée"}


# ── AI-assisted job-ad generation ────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatGenerateRequest(BaseModel):
    messages: List[ChatMessage]
    # "direct": write the ad at once from the form (Job posts studio), in `language` (fr / ar / en)
    mode: Optional[str] = None
    language: Optional[str] = None
    company: Optional[str] = None


_LANG_NAMES = {"fr": "français", "ar": "arabe", "en": "anglais"}


@router.post("/chat-generate")
async def chat_generate(
    body: ChatGenerateRequest,
    current_user: dict = Depends(get_current_user),
):
    from app.routers.copilot import _call_ai

    system = """Vous êtes un expert en recrutement RH.
    Votre but est d'aider l'utilisateur à rédiger une annonce de poste perfectionnée.

    Processus :
    1. Si l'utilisateur donne peu d'infos, demandez des précisions (missions, compétences, avantages).
    2. Si les infos sont suffisantes, générez une annonce structurée avec :
       - Titre du poste
       - Présentation de l'entreprise (imaginaire : TYTHON)
       - Vos missions
       - Profil recherché
       - Ce que nous offrons
       - Un bouton d'appel à l'action.

    Répondez toujours en français.
    Si vous générez l'annonce finale, insérez-la dans un bloc de code ou marquez-la clairement.
    """

    if body.mode == "direct":
        lang = _LANG_NAMES.get((body.language or "fr").lower(), "français")
        company = (body.company or "").strip() or "l'entreprise"
        system = f"""Vous êtes un expert en recrutement RH au Maroc.
    Rédigez directement une annonce d'emploi attractive et professionnelle en {lang} pour {company},
    à partir des informations données par l'utilisateur (poste, contrat, lieu, points clés). Ne posez pas de question.
    Structure : une accroche de 2 phrases, « Vos missions » (4 puces), « Votre profil » (4 puces),
    « Ce que nous offrons » (3 puces), puis une phrase d'appel à candidater (titres traduits dans la langue demandée).
    Texte brut uniquement, sans Markdown : titres de section sur leur propre ligne, puces commençant par « • ».
    180 mots maximum. N'inventez ni salaire chiffré ni avantage précis qui ne serait pas dans les points clés."""

    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    try:
        reply = _call_ai(system, messages)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Recruitment visuals and social publishing ────────────────────────────────
# The visuals are drawn in the browser (canvas) and uploaded here, so they can be downloaded again and used as the
# link-preview image: `/api/annonces/{id}/share` is a tiny public page with Open Graph tags (LinkedIn, Facebook,
# WhatsApp read them) that sends people on to the careers page /postuler/{id}.

import html as _html
import json as _json
import os as _os
import re as _re
import time as _time

from fastapi import File, Query, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse

from app.config import settings
from app.dependencies import require_hr_or_admin

_VISUAL_FORMATS = {"square", "linkedin", "story"}
_VISUAL_DIR = _os.path.join(settings.UPLOAD_DIR, "annonces")


def _visual_path(ad_id: str, fmt: str) -> str:
    return _os.path.join(_VISUAL_DIR, f"{ad_id}-{fmt}.png")


def _public_base(request: Request) -> str:
    """https://host of the site as people see it (APP_PUBLIC_URL wins, else the proxy headers)."""
    env = (_os.getenv("APP_PUBLIC_URL") or "").rstrip("/")
    if env:
        return env
    proto = request.headers.get("x-forwarded-proto", request.url.scheme).split(",")[0].strip()
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    return f"{proto}://{host.split(',')[0].strip()}"


@router.post("/{id}/visual")
async def upload_visual(
    id: UUID,
    fmt: str = Query(..., pattern="^(square|linkedin|story)$"),
    file: UploadFile = File(...),
    supabase: Client = Depends(get_db),
    _user: dict = Depends(require_hr_or_admin),
):
    """Store a visual drawn by the browser. The LinkedIn one becomes the ad's image_url (link preview)."""
    res = annonce_repository.get_annonce(supabase, str(id))
    if not res or not res.data:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    data = await file.read()
    if len(data) > 6 * 1024 * 1024 or not data.startswith(b"\x89PNG"):
        raise HTTPException(status_code=400, detail="Image PNG de 6 Mo maximum attendue")
    _os.makedirs(_VISUAL_DIR, exist_ok=True)
    with open(_visual_path(str(id), fmt), "wb") as fh:
        fh.write(data)
    url = f"/api/annonces/{id}/visual/{fmt}.png?v={int(_time.time())}"
    if fmt == "linkedin":
        try:
            supabase.table("recruitment_ads").update({"image_url": url}).eq("id", str(id)).execute()
        except Exception:
            pass
    return {"url": url}


@router.get("/{id}/visual/{fmt}.png")
def get_visual(id: UUID, fmt: str):
    """Public: the visual of an ad (used by the networks' link previews)."""
    if fmt not in _VISUAL_FORMATS:
        raise HTTPException(status_code=404, detail="Format inconnu")
    path = _visual_path(str(id), fmt)
    if not _os.path.exists(path):
        raise HTTPException(status_code=404, detail="Visuel non généré")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "public, max-age=300"})


@router.get("/{id}/share", response_class=HTMLResponse)
def share_page(id: UUID, request: Request, supabase: Client = Depends(get_db)):
    """Public link to post on the networks: Open Graph preview (title, text, visual), then the careers page."""
    res = annonce_repository.get_annonce(supabase, str(id))
    ad = (res.data if res else None) or {}
    if isinstance(ad, list):
        ad = ad[0] if ad else {}
    if not ad:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    base = _public_base(request)
    target = f"{base}/postuler/{id}"
    text = _re.sub(r"\s+", " ", _re.sub(r"[•*#]", " ", ad.get("contenu") or "")).strip()
    desc = (text[:220] + "…") if len(text) > 220 else text
    title = f"{ad.get('poste') or 'Offre'}" + (f" · {ad['description']}" if ad.get("description") else "")
    has_img = _os.path.exists(_visual_path(str(id), "linkedin"))
    img = f"{base}/api/annonces/{id}/visual/linkedin.png" if has_img else ""
    e = _html.escape
    meta = [
        f'<meta property="og:type" content="website">', f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(desc)}">', f'<meta property="og:url" content="{e(target)}">',
        f'<meta name="twitter:card" content="{"summary_large_image" if img else "summary"}">', f'<meta name="twitter:title" content="{e(title)}">',
        f'<meta name="twitter:description" content="{e(desc)}">', f'<meta name="description" content="{e(desc)}">',
    ]
    if img:
        meta += [f'<meta property="og:image" content="{e(img)}">', '<meta property="og:image:width" content="1200">',
                 '<meta property="og:image:height" content="627">', f'<meta name="twitter:image" content="{e(img)}">']
    return HTMLResponse(
        "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
        f"<title>{e(title)}</title>{''.join(meta)}<link rel=\"canonical\" href=\"{e(target)}\">"
        f"<meta http-equiv=\"refresh\" content=\"0;url={e(target)}\"></head>"
        f"<body style=\"font-family:system-ui;padding:40px\"><p><a href=\"{e(target)}\">{e(title)}</a></p>"
        f"<script>location.replace({_json.dumps(target)})</script></body></html>"
    )


class SocialRequest(BaseModel):
    lang: str = "fr"
    company: Optional[str] = None
    share_url: str


_SOCIAL_TPL = {
    "fr": {"hiring": "Nous recrutons", "apply": "Postulez ici", "linkedin_intro": "🚀 {company} recrute : {poste}",
           "points": "Ce que vous ferez", "hashtags": "#recrutement #emploi #maroc #hiring"},
    "en": {"hiring": "We're hiring", "apply": "Apply here", "linkedin_intro": "🚀 {company} is hiring: {poste}",
           "points": "What you'll do", "hashtags": "#hiring #jobs #morocco #careers"},
    "ar": {"hiring": "نوظف", "apply": "قدّم ترشيحك هنا", "linkedin_intro": "🚀 {company} توظف: {poste}",
           "points": "مهامك", "hashtags": "#توظيف #عمل #المغرب #hiring"},
}


def _bullets(contenu: str, n: int = 4) -> list[str]:
    out = [(_re.sub(r"^[•\-*–]\s*", "", l.strip())).rstrip(".;") for l in (contenu or "").splitlines() if _re.match(r"^\s*[•\-*–]", l)]
    return [b for b in out if len(b) <= 110][:n]


def _template_social(ad: dict, lang: str, company: str, url: str) -> dict:
    T = _SOCIAL_TPL.get(lang, _SOCIAL_TPL["fr"])
    poste, meta = ad.get("poste") or "", ad.get("description") or ""
    pts = "\n".join(f"✅ {b}" for b in _bullets(ad.get("contenu") or ""))
    intro = T["linkedin_intro"].format(company=company or "", poste=poste).replace("  ", " ")
    return {
        "linkedin": f"{intro}\n{meta}\n\n{T['points']} :\n{pts}\n\n👉 {T['apply']} : {url}\n\n{T['hashtags']}".strip(),
        "facebook": f"📢 {T['hiring']} ! {poste} {('· ' + meta) if meta else ''}\n\n{pts}\n\n👉 {T['apply']} : {url}".strip(),
        "instagram": f"📢 {T['hiring']} : {poste}\n{meta}\n\n{pts}\n\n🔗 {T['apply']} : {url}\n\n{T['hashtags']}".strip(),
        "indeed": (ad.get("contenu") or "").strip() + f"\n\n{T['apply']} : {url}",
        "source": "template",
    }


@router.post("/{id}/social")
def social_posts(id: UUID, body: SocialRequest, supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    """Post text for each network, written by Wedy from the ad (standard texts when the AI is not available)."""
    res = annonce_repository.get_annonce(supabase, str(id))
    ad = (res.data if res else None) or {}
    if isinstance(ad, list):
        ad = ad[0] if ad else {}
    if not ad:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    lang = body.lang if body.lang in _SOCIAL_TPL else "fr"
    company = (body.company or "").strip()
    fallback = _template_social(ad, lang, company, body.share_url)
    from app.routers.copilot import _call_ai
    system = ("Tu es le community manager RH d'une entreprise marocaine. Tu écris des publications de recrutement à partir de "
              "l'annonce fournie uniquement : n'invente ni salaire, ni avantage, ni chiffre qui n'y figure pas.")
    prompt = (
        f"Annonce ({ad.get('poste')} — {ad.get('description') or ''}) de {company or 'l’entreprise'} :\n{(ad.get('contenu') or '')[:3000]}\n\n"
        f"Lien pour postuler : {body.share_url}\nLangue : {_LANG_NAMES.get(lang, 'français')}.\n"
        "Réponds en JSON uniquement : {\"linkedin\": \"…\", \"facebook\": \"…\", \"instagram\": \"…\", \"indeed\": \"…\"}.\n"
        "- linkedin : ton professionnel, accroche, 3-4 puces, appel à postuler avec le lien, 3-5 hashtags, 900 caractères max.\n"
        "- facebook : ton chaleureux, court (500 caractères max), quelques emojis, le lien.\n"
        "- instagram : légende courte, emojis, « lien en bio ou ci-dessous » puis le lien, 8-12 hashtags pertinents (dont #maroc).\n"
        "- indeed : description complète et structurée de l'offre (missions, profil, avantages cités), texte brut sans emoji ni hashtag, puis le lien."
    )
    try:
        raw = _call_ai(system, [{"role": "user", "content": prompt}])
        data = _json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
        out = {k: str(data.get(k) or "").strip() or fallback[k] for k in ("linkedin", "facebook", "instagram", "indeed")}
        for k in ("linkedin", "facebook", "instagram", "indeed"):
            if body.share_url not in out[k]:
                out[k] += f"\n\n{body.share_url}"
        return {**out, "source": "ai"}
    except Exception:
        return fallback
