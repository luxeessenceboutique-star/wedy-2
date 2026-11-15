"""Réseaux sociaux — /api/social: the company's LinkedIn / Facebook / Instagram accounts (connected once by an admin)
and the direct publishing of job posts. See app/services/social.py for what the server needs."""
from typing import Dict, List, Literal, Optional
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from supabase import Client

from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.repositories import annonce_repository
from app.services import social
from app.services.audit import log_action

router = APIRouter(prefix="/social", tags=["Social"])

Network = Literal["linkedin", "facebook", "instagram"]


def _provider(p: str) -> str:
    if p not in social.PROVIDERS:
        raise HTTPException(status_code=404, detail="Réseau inconnu")
    return p


@router.get("/status")
def social_status(supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    return social.status(supabase)


@router.post("/{provider}/connect")
def social_connect(provider: str, request: Request, user: dict = Depends(require_hr_or_admin)):
    """The address of the network's sign-in page (opened once, by an admin of the company page)."""
    from app.routers.annonces import _public_base
    try:
        return {"url": social.authorize_url(_provider(provider), user, _public_base(request))}
    except social.SocialError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/callback/{provider}")
def social_callback(provider: str, code: str = Query(""), state: str = Query(""), error: str = Query(""),
                    error_description: str = Query(""), supabase: Client = Depends(get_db)):
    """Public: where LinkedIn / Facebook send the admin back. Keeps the token, then returns to Wedy › Intégrations."""
    _provider(provider)
    try:
        st = social.read_state(state, provider)
    except social.SocialError as e:
        raise HTTPException(status_code=400, detail=str(e))
    back = f"{st['b']}/app/integrations?social={provider}"
    if error or not code:
        return RedirectResponse(f"{back}&status=error&msg={quote(error_description or error or 'Connexion annulée')}", status_code=302)
    try:
        social.handle_callback(supabase, provider, code, state)
    except social.SocialError as e:
        return RedirectResponse(f"{back}&status=error&msg={quote(str(e)[:300])}", status_code=302)
    if st.get("u"):
        log_action(supabase, st["u"], "CONNECT", "social_account", provider)
    return RedirectResponse(f"{back}&status=ok", status_code=302)


class AccountIn(BaseModel):
    account_id: str = Field(min_length=1, max_length=64)


@router.post("/{provider}/account")
def social_account(provider: str, body: AccountIn, supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    """Choose which company page publishes (when the admin manages several)."""
    try:
        social.select_account(supabase, _provider(provider), body.account_id)
    except social.SocialError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return social.status(supabase)[provider]


@router.delete("/{provider}", status_code=204)
def social_disconnect(provider: str, supabase: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    social.disconnect(supabase, _provider(provider))
    log_action(supabase, user["id"], "DISCONNECT", "social_account", provider)


class PublishIn(BaseModel):
    ad_id: UUID
    networks: List[Network] = Field(min_length=1)
    texts: Dict[str, str] = {}
    share_url: str = Field("", max_length=600)


@router.post("/publish")
def social_publish(body: PublishIn, request: Request, supabase: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    """Publish the ad on each network chosen, with its text and visual. One result per network (a failure never stops the others)."""
    from app.routers.annonces import _public_base, ad_visual
    res = annonce_repository.get_annonce(supabase, str(body.ad_id))
    ad = (res.data if res else None) or {}
    if isinstance(ad, list):
        ad = ad[0] if ad else {}
    if not ad:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    base = _public_base(request)
    title = f"{ad.get('poste') or 'Offre'}" + (f" · {ad['description']}" if ad.get("description") else "")
    link = body.share_url or f"{base}/postuler/{body.ad_id}"
    out: dict = {}
    for net in dict.fromkeys(body.networks):
        text = (body.texts.get(net) or "").strip() or f"{title}\n\n{link}"
        try:
            if net == "linkedin":
                img, _ = ad_visual(str(body.ad_id), "linkedin")
                r = social.post_linkedin(supabase, text, img, link, title)
            elif net == "facebook":
                img, _ = ad_visual(str(body.ad_id), "linkedin")
                r = social.post_facebook(supabase, text, img, link)
            else:
                _, fmt = ad_visual(str(body.ad_id), "square")
                r = social.post_instagram(supabase, text, f"{base}/api/annonces/{body.ad_id}/visual/{fmt}.jpg" if fmt else None)
            out[net] = {"ok": True, **r, "error": None}
        except social.SocialError as e:
            out[net] = {"ok": False, "post_id": None, "url": None, "error": str(e)}
        except Exception as e:  # network down, unexpected answer…
            out[net] = {"ok": False, "post_id": None, "url": None, "error": f"Erreur inattendue : {type(e).__name__}"}
        social.record(supabase, str(body.ad_id), net, out[net], user.get("id"))
    if any(r["ok"] for r in out.values()):
        log_action(supabase, user["id"], "PUBLISH", "recruitment_ad", str(body.ad_id))
    return {"results": out}


@router.get("/history/{ad_id}")
def social_history(ad_id: UUID, supabase: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    return social.history(supabase, str(ad_id))
