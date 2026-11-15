"""Direct publishing of job posts on the company's LinkedIn page, Facebook page and Instagram business account.

An admin connects each network once (Wedy › Intégrations): the usual « Se connecter avec LinkedIn / Facebook » page of
the network opens one time, the company page is chosen, and the access token is kept on the server, encrypted with the
API's SECRET_KEY (never sent to the browser). Then « Publier » posts the text and the visual of the ad directly.

What the server needs (set by the person who deploys Wedy):
  LinkedIn  LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET — an app on developer.linkedin.com with the « Community Management
            API » product (scopes w_organization_social, r_organization_social, rw_organization_admin) and the redirect
            URL https://<wedy>/api/social/callback/linkedin
  Meta      META_APP_ID, META_APP_SECRET — an app on developers.facebook.com (Facebook Login for Business), permissions
            pages_show_list, pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish,
            business_management, and the redirect URL https://<wedy>/api/social/callback/meta
  optional  LINKEDIN_API_VERSION (YYYYMM), META_GRAPH_VERSION (vNN.0), APP_PUBLIC_URL

Tests replace `http` with a fake transport: nothing ever reaches LinkedIn or Meta from them."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Callable, Optional
from urllib.parse import urlencode

import httpx
from supabase import Client

from app.config import settings

log = logging.getLogger(__name__)

PROVIDERS = ("linkedin", "meta")
NETWORKS = ("linkedin", "facebook", "instagram")
LINKEDIN_SCOPES = "w_organization_social r_organization_social rw_organization_admin"
META_SCOPES = ("pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,"
               "instagram_content_publish,business_management")


class SocialError(Exception):
    pass


# replaced by the tests: () -> httpx.Client
http: Callable[[], httpx.Client] = lambda: httpx.Client(timeout=40)


def graph() -> str:
    return f"https://graph.facebook.com/{os.getenv('META_GRAPH_VERSION') or 'v23.0'}"


def li_version() -> str:
    """LinkedIn wants a dated API version (YYYYMM); a recent one stays valid about a year."""
    if os.getenv("LINKEDIN_API_VERSION"):
        return os.getenv("LINKEDIN_API_VERSION")
    d = date.today().replace(day=1) - timedelta(days=45)
    return d.strftime("%Y%m")


def configured(provider: str) -> bool:
    if provider == "linkedin":
        return bool(os.getenv("LINKEDIN_CLIENT_ID") and os.getenv("LINKEDIN_CLIENT_SECRET"))
    if provider == "meta":
        return bool(os.getenv("META_APP_ID") and os.getenv("META_APP_SECRET"))
    return False


# ── secrets at rest ───────────────────────────────────────────────────────────────────────────────────────

def _fernet():
    from cryptography.fernet import Fernet
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(f"social.{settings.SECRET_KEY}".encode()).digest()))


def enc(s: Optional[str]) -> Optional[str]:
    return _fernet().encrypt(s.encode()).decode() if s else None


def dec(s: Optional[str]) -> Optional[str]:
    if not s:
        return None
    try:
        return _fernet().decrypt(s.encode()).decode()
    except Exception:
        return None  # SECRET_KEY changed: the network has to be connected again


# ── state of the OAuth round trip (signed, short-lived) ──────────────────────────────────────────────────

def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_state(provider: str, user: dict, base: str) -> str:
    body = _b64(json.dumps({"p": provider, "u": user.get("id"), "n": (user.get("full_name") or user.get("email") or "")[:80],
                            "b": base, "e": int(time.time()) + 900, "j": uuid.uuid4().hex[:8]}).encode())
    mac = hmac.new(settings.SECRET_KEY.encode(), f"social.{body}".encode(), hashlib.sha256).digest()
    return f"{body}.{_b64(mac)}"


def read_state(state: str, provider: str) -> dict:
    try:
        body, mac = state.split(".", 1)
        good = hmac.new(settings.SECRET_KEY.encode(), f"social.{body}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_unb64(mac), good):
            raise ValueError
        data = json.loads(_unb64(body))
    except Exception:
        raise SocialError("Lien de connexion invalide.")
    if data.get("p") != provider:
        raise SocialError("Lien de connexion invalide.")
    if int(data.get("e") or 0) < time.time():
        raise SocialError("Le lien de connexion a expiré : recommencez depuis Wedy.")
    return data


def redirect_uri(provider: str, base: str) -> str:
    return f"{base}/api/social/callback/{provider}"


def authorize_url(provider: str, user: dict, base: str) -> str:
    if not configured(provider):
        raise SocialError("Cette connexion n'est pas activée sur le serveur (identifiants de l'application manquants).")
    state = make_state(provider, user, base)
    if provider == "linkedin":
        q = {"response_type": "code", "client_id": os.getenv("LINKEDIN_CLIENT_ID"), "redirect_uri": redirect_uri(provider, base),
             "state": state, "scope": LINKEDIN_SCOPES}
        return "https://www.linkedin.com/oauth/v2/authorization?" + urlencode(q)
    q = {"client_id": os.getenv("META_APP_ID"), "redirect_uri": redirect_uri(provider, base), "state": state,
         "scope": META_SCOPES, "response_type": "code"}
    return f"https://www.facebook.com/{os.getenv('META_GRAPH_VERSION') or 'v23.0'}/dialog/oauth?" + urlencode(q)


# ── storage ──────────────────────────────────────────────────────────────────────────────────────────────

def _row(supabase: Client, provider: str) -> dict:
    try:
        return (supabase.table("social_accounts").select("*").eq("provider", provider).limit(1).execute().data or [{}])[0] or {}
    except Exception:
        return {}


def _save(supabase: Client, provider: str, row: dict) -> None:
    row = {**row, "provider": provider, "updated_at": datetime.now(timezone.utc).isoformat()}
    try:
        if _row(supabase, provider):
            supabase.table("social_accounts").update(row).eq("provider", provider).execute()
        else:
            supabase.table("social_accounts").insert(row).execute()
    except Exception as e:
        raise SocialError(f"Enregistrement impossible (la migration interview_emails_social.sql a-t-elle été exécutée ?) : {e}")


def _check(r: httpx.Response, what: str) -> dict:
    try:
        data = r.json()
    except ValueError:
        data = {}
    if r.status_code >= 400:
        msg = (data.get("error", {}) or {}).get("message") if isinstance(data.get("error"), dict) else None
        msg = msg or data.get("message") or data.get("error_description") or data.get("error") or r.text[:200]
        raise SocialError(f"{what} : {msg} (HTTP {r.status_code})")
    return data


def _iso_in(seconds) -> Optional[str]:
    return (datetime.now(timezone.utc) + timedelta(seconds=int(seconds))).isoformat() if seconds else None


# ── connecting ───────────────────────────────────────────────────────────────────────────────────────────

def _li_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "LinkedIn-Version": li_version(), "X-Restli-Protocol-Version": "2.0.0"}


def _li_orgs(c: httpx.Client, token: str) -> list[dict]:
    """The company pages the person administers on LinkedIn."""
    acl = _check(c.get("https://api.linkedin.com/rest/organizationAcls", params={"q": "roleAssignee", "role": "ADMINISTRATOR", "state": "APPROVED"},
                       headers=_li_headers(token)), "Pages LinkedIn")
    out = []
    for el in acl.get("elements", []):
        urn = el.get("organization") or el.get("organizationTarget") or ""
        oid = urn.rsplit(":", 1)[-1]
        if not oid:
            continue
        name = oid
        try:
            org = _check(c.get(f"https://api.linkedin.com/rest/organizations/{oid}", headers=_li_headers(token)), "Page LinkedIn")
            name = org.get("localizedName") or name
        except SocialError:
            pass
        out.append({"id": oid, "name": name})
    return out


def handle_callback(supabase: Client, provider: str, code: str, state: str) -> dict:
    """Finish the connection: exchange the code, list the pages, keep the token. Returns the state (for the redirect)."""
    st = read_state(state, provider)
    base = st["b"]
    with http() as c:
        if provider == "linkedin":
            tok = _check(c.post("https://www.linkedin.com/oauth/v2/accessToken", data={
                "grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri(provider, base),
                "client_id": os.getenv("LINKEDIN_CLIENT_ID"), "client_secret": os.getenv("LINKEDIN_CLIENT_SECRET")}), "Connexion LinkedIn")
            orgs = _li_orgs(c, tok["access_token"])
            if not orgs:
                raise SocialError("Ce compte LinkedIn n'administre aucune page entreprise : connectez-vous avec un administrateur de la page.")
            _save(supabase, provider, {
                "account_id": orgs[0]["id"], "account_name": orgs[0]["name"], "choices": orgs,
                "access_token_enc": enc(tok["access_token"]), "refresh_token_enc": enc(tok.get("refresh_token")),
                "expires_at": _iso_in(tok.get("expires_in")), "refresh_expires_at": _iso_in(tok.get("refresh_token_expires_in")),
                "connected_by": st.get("u"), "connected_by_name": st.get("n"), "connected_at": datetime.now(timezone.utc).isoformat()})
        else:
            short = _check(c.get(f"{graph()}/oauth/access_token", params={
                "client_id": os.getenv("META_APP_ID"), "client_secret": os.getenv("META_APP_SECRET"),
                "redirect_uri": redirect_uri(provider, base), "code": code}), "Connexion Facebook")
            long = _check(c.get(f"{graph()}/oauth/access_token", params={
                "grant_type": "fb_exchange_token", "client_id": os.getenv("META_APP_ID"), "client_secret": os.getenv("META_APP_SECRET"),
                "fb_exchange_token": short["access_token"]}), "Connexion Facebook")
            pages = _check(c.get(f"{graph()}/me/accounts", params={
                "fields": "id,name,access_token,instagram_business_account{id,username}", "access_token": long["access_token"]}),
                "Pages Facebook").get("data", [])
            if not pages:
                raise SocialError("Aucune page Facebook trouvée pour ce compte : il faut être administrateur de la page de l'entreprise.")
            choices = [{"id": p["id"], "name": p.get("name") or p["id"], "token_enc": enc(p.get("access_token")),
                        "ig_id": (p.get("instagram_business_account") or {}).get("id"),
                        "ig_username": (p.get("instagram_business_account") or {}).get("username")} for p in pages]
            first = choices[0]
            _save(supabase, provider, {
                "account_id": first["id"], "account_name": first["name"], "ig_user_id": first["ig_id"], "ig_username": first["ig_username"],
                "choices": choices, "access_token_enc": enc(long["access_token"]), "refresh_token_enc": None,
                "expires_at": _iso_in(long.get("expires_in")), "refresh_expires_at": None,
                "connected_by": st.get("u"), "connected_by_name": st.get("n"), "connected_at": datetime.now(timezone.utc).isoformat()})
    return st


def select_account(supabase: Client, provider: str, account_id: str) -> None:
    row = _row(supabase, provider)
    choice = next((x for x in row.get("choices") or [] if str(x.get("id")) == str(account_id)), None)
    if not choice:
        raise SocialError("Page inconnue : reconnectez le compte.")
    upd = {"account_id": choice["id"], "account_name": choice.get("name")}
    if provider == "meta":
        upd.update({"ig_user_id": choice.get("ig_id"), "ig_username": choice.get("ig_username")})
    _save(supabase, provider, upd)


def disconnect(supabase: Client, provider: str) -> None:
    try:
        supabase.table("social_accounts").delete().eq("provider", provider).execute()
    except Exception:
        pass


def status(supabase: Client) -> dict:
    """What the Integrations page shows (no token ever leaves the server)."""
    now = datetime.now(timezone.utc)
    out = {}
    for p in PROVIDERS:
        row = _row(supabase, p)
        exp = row.get("expires_at")
        expired = False
        if exp:
            try:
                expired = datetime.fromisoformat(str(exp).replace("Z", "+00:00")) < now and not row.get("refresh_token_enc")
            except ValueError:
                pass
        out[p] = {
            "configured": configured(p), "connected": bool(row.get("access_token_enc")) and not expired, "expired": expired,
            "account_id": row.get("account_id"), "account_name": row.get("account_name"),
            "ig_username": row.get("ig_username") if p == "meta" else None,
            "choices": [{"id": x.get("id"), "name": x.get("name"), "ig_username": x.get("ig_username")} for x in row.get("choices") or []],
            "expires_at": exp, "connected_by": row.get("connected_by_name"), "connected_at": row.get("connected_at"),
        }
    return out


# ── publishing ───────────────────────────────────────────────────────────────────────────────────────────

_LI_RESERVED = set("\\|{}@[]()<>#*_~")


def li_text(s: str) -> str:
    """LinkedIn « little text »: its reserved characters must be escaped or the post is cut / refused."""
    return "".join("\\" + ch if ch in _LI_RESERVED else ch for ch in s or "")


def _li_token(supabase: Client, c: httpx.Client, row: dict) -> str:
    token = dec(row.get("access_token_enc"))
    exp = row.get("expires_at")
    soon = False
    if exp:
        try:
            soon = datetime.fromisoformat(str(exp).replace("Z", "+00:00")) < datetime.now(timezone.utc) + timedelta(days=2)
        except ValueError:
            pass
    refresh = dec(row.get("refresh_token_enc"))
    if (soon or not token) and refresh:
        tok = _check(c.post("https://www.linkedin.com/oauth/v2/accessToken", data={
            "grant_type": "refresh_token", "refresh_token": refresh,
            "client_id": os.getenv("LINKEDIN_CLIENT_ID"), "client_secret": os.getenv("LINKEDIN_CLIENT_SECRET")}), "Renouvellement LinkedIn")
        token = tok["access_token"]
        _save(supabase, "linkedin", {"access_token_enc": enc(token), "expires_at": _iso_in(tok.get("expires_in")),
                                     **({"refresh_token_enc": enc(tok["refresh_token"])} if tok.get("refresh_token") else {})})
    if not token:
        raise SocialError("LinkedIn n'est plus connecté : reconnectez-le dans Intégrations.")
    return token


def post_linkedin(supabase: Client, text: str, image: Optional[tuple[bytes, str]], link: str, title: str) -> dict:
    row = _row(supabase, "linkedin")
    if not row.get("access_token_enc") or not row.get("account_id"):
        raise SocialError("LinkedIn n'est pas connecté.")
    org = f"urn:li:organization:{row['account_id']}"
    with http() as c:
        token = _li_token(supabase, c, row)
        h = {**_li_headers(token), "Content-Type": "application/json"}
        body = {"author": org, "commentary": li_text(text), "visibility": "PUBLIC", "lifecycleState": "PUBLISHED",
                "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []},
                "isReshareDisabledByAuthor": False}
        if image:
            init = _check(c.post("https://api.linkedin.com/rest/images?action=initializeUpload", headers=h,
                                 json={"initializeUploadRequest": {"owner": org}}), "Envoi de l'image à LinkedIn")["value"]
            up = c.put(init["uploadUrl"], content=image[0], headers={"Authorization": f"Bearer {token}", "Content-Type": image[1]})
            if up.status_code >= 400:
                raise SocialError(f"Envoi de l'image à LinkedIn refusé (HTTP {up.status_code})")
            body["content"] = {"media": {"id": init["image"], "altText": title[:120]}}
        elif link:
            body["content"] = {"article": {"source": link, "title": title[:200]}}
        r = c.post("https://api.linkedin.com/rest/posts", headers=h, json=body)
        _check(r, "Publication LinkedIn")
        urn = r.headers.get("x-restli-id") or r.headers.get("x-linkedin-id") or ""
    return {"post_id": urn, "url": f"https://www.linkedin.com/feed/update/{urn}/" if urn else None}


def _meta_page(supabase: Client) -> tuple[dict, dict]:
    row = _row(supabase, "meta")
    page = next((x for x in row.get("choices") or [] if str(x.get("id")) == str(row.get("account_id"))), None)
    if not row.get("access_token_enc") or not page or not dec(page.get("token_enc")):
        raise SocialError("Facebook n'est pas connecté (ou la page a changé) : reconnectez-le dans Intégrations.")
    return row, page


def post_facebook(supabase: Client, text: str, image: Optional[tuple[bytes, str]], link: str) -> dict:
    _, page = _meta_page(supabase)
    token = dec(page["token_enc"])
    with http() as c:
        if image:
            data = _check(c.post(f"{graph()}/{page['id']}/photos", data={"caption": text, "access_token": token, "published": "true"},
                                 files={"source": ("annonce.png", image[0], image[1])}), "Publication Facebook")
            pid = data.get("post_id") or data.get("id")
        else:
            data = _check(c.post(f"{graph()}/{page['id']}/feed", data={"message": text, "link": link, "access_token": token}), "Publication Facebook")
            pid = data.get("id")
    return {"post_id": pid, "url": f"https://www.facebook.com/{pid}" if pid else None}


def post_instagram(supabase: Client, text: str, image_url: Optional[str], wait: float = 20.0) -> dict:
    row, page = _meta_page(supabase)
    ig = page.get("ig_id") or row.get("ig_user_id")
    if not ig:
        raise SocialError("Aucun compte Instagram professionnel n'est relié à la page Facebook choisie.")
    if not image_url:
        raise SocialError("Instagram demande une image : générez d'abord le visuel de l'annonce.")
    token = dec(page["token_enc"])
    with http() as c:
        created = _check(c.post(f"{graph()}/{ig}/media", data={"image_url": image_url, "caption": text[:2200], "access_token": token}),
                         "Préparation Instagram")
        cid = created["id"]
        deadline = time.time() + wait
        while True:  # Instagram downloads the image first: publish once it is ready
            st = _check(c.get(f"{graph()}/{cid}", params={"fields": "status_code", "access_token": token}), "Préparation Instagram")
            code = st.get("status_code")
            if code in (None, "FINISHED"):
                break
            if code == "ERROR" or time.time() > deadline:
                raise SocialError("Instagram n'a pas pu lire l'image (elle doit être accessible publiquement en JPEG).")
            time.sleep(1.5)
        pub = _check(c.post(f"{graph()}/{ig}/media_publish", data={"creation_id": cid, "access_token": token}), "Publication Instagram")
        mid = pub.get("id")
        url = None
        try:
            url = _check(c.get(f"{graph()}/{mid}", params={"fields": "permalink", "access_token": token}), "Lien Instagram").get("permalink")
        except SocialError:
            pass
    return {"post_id": mid, "url": url}


def record(supabase: Client, ad_id: str, network: str, result: dict, user_id: Optional[str]) -> None:
    try:
        supabase.table("social_posts").insert({"ad_id": ad_id, "network": network, "ok": bool(result.get("ok")),
                                               "post_id": result.get("post_id"), "post_url": result.get("url"),
                                               "error": (result.get("error") or "")[:500] or None, "posted_by": user_id}).execute()
    except Exception:
        pass  # not migrated: the post itself is done


def history(supabase: Client, ad_id: str) -> list[dict]:
    try:
        return supabase.table("social_posts").select("network, ok, post_url, error, created_at").eq("ad_id", ad_id).order("created_at", desc=True).limit(20).execute().data or []
    except Exception:
        return []
