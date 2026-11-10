"""Artwork for the job-post visuals: a short visual concept written for the role, then drawn by an image model
(OpenAI-compatible `/images/generations`: gpt-image-1 by default, `OPENAI_IMAGE_MODEL` to change it).

The model only paints the *background*. The logo, the title, the key points and the QR code are added by the browser on top
of it, because image models cannot be trusted with exact text or an exact logo."""
import asyncio
import base64
import os
import re
import time
from collections import defaultdict, deque
from typing import Optional

import httpx
from loguru import logger

from app.config import settings

SIZES_GPT = {"square": "1024x1024", "linkedin": "1536x1024", "story": "1024x1536"}
SIZES_DALLE = {"square": "1024x1024", "linkedin": "1792x1024", "story": "1024x1792"}
ORIENTATION = {"square": "square", "linkedin": "landscape", "story": "tall vertical (9:16)"}
CALM_SIDE = {"square": "upper-left and central area", "linkedin": "left 60%", "story": "upper two thirds"}

RATE_LIMIT = 12          # image generations per user and hour (each one costs money)
_recent: dict = defaultdict(deque)


class ImageUnavailable(Exception):
    """No key / model configured for image generation."""


class ImageFailed(Exception):
    """The image service answered with an error."""


class TooMany(Exception):
    pass


def check_quota(user_id: str) -> None:
    now = time.time()
    q = _recent[user_id]
    while q and now - q[0] > 3600:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise TooMany(f"Limite atteinte : {RATE_LIMIT} images IA par heure. Réessayez plus tard.")
    q.append(now)


def config() -> dict:
    key = os.getenv("OPENAI_IMAGE_API_KEY") or settings.OPENAI_IMAGE_API_KEY or os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY
    base = os.getenv("OPENAI_IMAGE_BASE_URL") or settings.OPENAI_IMAGE_BASE_URL or os.getenv("OPENAI_BASE_URL") or settings.OPENAI_BASE_URL or "https://api.openai.com/v1"
    base = base.rstrip("/")
    if not base.endswith("/v1"):
        base += "/v1"
    return {"key": key, "base": base, "model": os.getenv("OPENAI_IMAGE_MODEL") or settings.OPENAI_IMAGE_MODEL or "gpt-image-1",
            "quality": os.getenv("OPENAI_IMAGE_QUALITY") or settings.OPENAI_IMAGE_QUALITY}


def request_body(model: str, prompt: str, fmt: str, quality: str, minimal: bool = False) -> dict:
    dalle = model.lower().startswith("dall-e")
    body = {"model": model, "prompt": prompt, "size": (SIZES_DALLE if dalle else SIZES_GPT)[fmt], "n": 1}
    if not minimal:  # optional parameters some routers refuse: asked once, then dropped
        if dalle:
            body["response_format"] = "b64_json"
        elif quality:
            body["quality"] = quality
    return body


def sniff(data: bytes) -> str:
    if data[:4] == b"\x89PNG":
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return ""


def _error_text(r: httpx.Response) -> str:
    try:
        j = r.json()
        e = j.get("error") if isinstance(j, dict) else None
        return str((e.get("message") if isinstance(e, dict) else e) or j.get("detail") or r.text)[:300]
    except Exception:
        return r.text[:300]


async def generate(prompt: str, fmt: str, client: Optional[httpx.AsyncClient] = None) -> bytes:
    """One image (PNG / JPEG / WebP bytes) for the prompt, sized for the visual format."""
    cfg = config()
    if not cfg["key"]:
        raise ImageUnavailable("Génération d'image non configurée : ajoutez OPENAI_API_KEY (et OPENAI_IMAGE_MODEL si besoin) sur le serveur.")
    own = client is None
    http = client or httpx.AsyncClient(timeout=httpx.Timeout(180, connect=20))
    headers = {"Authorization": f"Bearer {cfg['key']}", "Content-Type": "application/json"}
    url = f"{cfg['base']}/images/generations"
    try:
        r = await http.post(url, json=request_body(cfg["model"], prompt, fmt, cfg["quality"]), headers=headers)
        if r.status_code == 400 and re.search(r"quality|response_format|unknown|unrecognized|unsupported|invalid.*param", _error_text(r), re.I):
            r = await http.post(url, json=request_body(cfg["model"], prompt, fmt, cfg["quality"], minimal=True), headers=headers)
        if r.status_code >= 400:
            raise ImageFailed(f"{r.status_code} · {_error_text(r)}")
        items = (r.json() or {}).get("data") or []
        if not items:
            raise ImageFailed("réponse vide du service d'image")
        item = items[0]
        if item.get("b64_json"):
            out = base64.b64decode(item["b64_json"])
        elif item.get("url"):
            img = await http.get(item["url"])
            if img.status_code >= 400:
                raise ImageFailed(f"téléchargement de l'image impossible ({img.status_code})")
            out = img.content
        else:
            raise ImageFailed("l'image n'est ni en base64 ni en URL")
        if not sniff(out):
            raise ImageFailed("le service n'a pas renvoyé une image")
        return out
    except httpx.TimeoutException:
        raise ImageFailed("délai dépassé : le service d'image n'a pas répondu à temps")
    except httpx.HTTPError as e:
        raise ImageFailed(f"service d'image injoignable ({type(e).__name__})")
    finally:
        if own:
            await http.aclose()


# ── the visual concept, written for the role ─────────────────────────────────────────

MOTIFS = [
    (("develop", "dévelop", "ingénieur", "engineer", "data", "devops", "informatique", "software", "full stack", "fullstack", "web", "it ", "cyber", "cloud", "ia ", "ai "),
     "layered translucent glass panels with flowing lines of light and abstract code-like patterns, a sense of building technology"),
    (("compta", "financ", "audit", "trésor", "tresor", "account", "paie", "gestion"),
     "elegant abstract rising bars and smooth curves of light, a sense of precision and growth"),
    (("market", "communic", "digital", "contenu", "content", "community", "brand", "social"),
     "dynamic overlapping shapes and sound-wave-like ribbons of colour, a sense of reach and creativity"),
    (("ressources humaines", " rh", "rh ", "recrut", "talent", "people", "hr "),
     "a constellation of softly glowing connected nodes forming a team, a sense of people and connection"),
    (("commercial", "vente", "sales", "business dev", "account manager", "négoci"),
     "ascending luminous paths and abstract bridges meeting at a point, a sense of momentum and partnership"),
    (("design", "ux", "ui", "graph", "créatif", "creatif", "artiste"),
     "bold geometric colour shapes and soft gradients composed like a modern poster, a sense of craft and imagination"),
    (("juridique", "legal", "droit", "conformité", "compliance"),
     "calm architectural lines and balanced abstract forms, a sense of rigour and trust"),
    (("logisti", "supply", "transport", "achat", "procure"),
     "flowing abstract routes and interlocking modules of light, a sense of movement and order"),
]


def fallback_concept(ad: dict, idea: str = "") -> str:
    hay = f" {ad.get('poste', '')} {ad.get('description', '')} {ad.get('competences', '')} ".lower()
    motif = next((m for keys, m in MOTIFS if any(k in hay for k in keys)), "abstract glowing shapes suggesting a modern, ambitious workplace")
    return f"A premium editorial illustration: {motif}." + (f" Creative direction: {idea.strip()}." if idea.strip() else "")


async def concept(ad: dict, company: str, idea: str, fmt: str) -> str:
    """One image prompt tailored to the job (written by the chat model; a role-based template when it is not available)."""
    base = fallback_concept(ad, idea)
    system = ("You are an art director for employer-branding visuals. You write ONE image-generation prompt in English "
              "(90 words maximum) for the BACKGROUND artwork of a recruitment post on social networks. Output the prompt only.")
    brief = (f"Job: {ad.get('poste')}\nContract / place: {ad.get('description') or '-'}\nSkills: {ad.get('competences') or '-'}\n"
             f"Company: {company or '-'}\nAd text (extract): {(ad.get('contenu') or '')[:900]}\n"
             f"Team's creative direction: {idea.strip() or 'none'}\n\n"
             "Use concrete visual metaphors for this role and sector (objects, light, shapes, atmosphere), not a literal office stock photo. "
             "Premium, modern, aspirational; palette of deep navy and teal with cyan and violet glows. "
             "Absolutely NO text, letters, numbers, logos, watermarks, QR codes or readable screens. "
             f"The {CALM_SIDE.get(fmt, 'left 60%')} must stay calmer, with little detail, because text is overlaid there; put the main visual interest toward the opposite side. Format: {ORIENTATION.get(fmt, 'square')}.")
    try:
        from app.routers.copilot import _call_ai
        text = await asyncio.to_thread(_call_ai, system, [{"role": "user", "content": brief}])
        text = " ".join(str(text).split()).strip().strip('"')
        if len(text) < 30:
            raise ValueError("too short")
        base = text[:900]
    except Exception as e:
        logger.info(f"image concept: using the template ({type(e).__name__})")
    return (f"{base} Composition: {ORIENTATION.get(fmt, 'square')}; keep the {CALM_SIDE.get(fmt, 'left 60%')} calm and darker for overlaid text. "
            "Deep navy and teal palette with cyan and violet glows. No text, no letters, no numbers, no logos, no watermark.")
