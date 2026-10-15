"""Tybot authentication — Tybot proves WHO the user is, Wedy decides WHAT they can do.

- login: POST {TYBOT_API_URL}/auth/login (email + password) -> access_token
- every request: the token is validated against Tybot (GET /auth/me), result cached briefly
- the Wedy role comes from the local user_roles table (managed in Wedy's Users page),
  looked up through the user's e-mail. Unknown users default to "employee".
"""
import base64
import hashlib
import json
import secrets
import time
from typing import Optional

import httpx
from fastapi import HTTPException, status
from loguru import logger
from supabase import Client

from app.config import settings

_TTL = 300  # seconds a validated token stays cached
_token_cache: dict[str, tuple[float, dict]] = {}
_user_id_cache: dict[str, str] = {}


def _url(path: str) -> str:
    return settings.TYBOT_API_URL.rstrip("/") + path


def _key(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _jwt_claims(token: str) -> dict:
    try:
        part = token.split(".")[1]
        return json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))
    except Exception:
        return {}


def login(email: str, password: str) -> dict:
    """Authenticate against Tybot. Returns {access_token, email, id, full_name}."""
    try:
        r = httpx.post(_url("/auth/login"), json={"email": email, "password": password}, timeout=20)
    except httpx.HTTPError as e:
        logger.error(f"[TYBOT] login unreachable: {e}")
        raise HTTPException(status_code=503, detail="Service d'authentification Tybot indisponible")
    if r.status_code in (400, 401):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if r.status_code == 403:
        raise HTTPException(status_code=403, detail="Accès refusé par Tybot")
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Réponse inattendue de Tybot ({r.status_code})")

    data = r.json()
    token = data.get("access_token")
    u = data.get("userdata") or {}
    if not token:
        raise HTTPException(status_code=502, detail="Tybot n'a pas renvoyé de jeton")
    if u.get("disabled"):
        raise HTTPException(status_code=403, detail="Compte Tybot désactivé")

    identity = {
        "tybot_id": u.get("id") or _jwt_claims(token).get("sub"),
        "email": (u.get("email") or email).lower(),
        "full_name": u.get("first_name") or "",
    }
    _token_cache[_key(token)] = (time.time() + _TTL, identity)
    return {"access_token": token, **identity}


def verify_token(token: str) -> dict:
    """Validate a Tybot token (cached) and return {tybot_id, email, full_name}."""
    k = _key(token)
    hit = _token_cache.get(k)
    if hit and hit[0] > time.time():
        return hit[1]

    try:
        r = httpx.get(_url("/auth/me"), headers={"Authorization": f"Bearer {token}"}, timeout=15)
    except httpx.HTTPError as e:
        logger.error(f"[TYBOT] verify unreachable: {e}")
        raise HTTPException(status_code=503, detail="Service d'authentification Tybot indisponible")
    if r.status_code in (401, 403):
        _token_cache.pop(k, None)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session Tybot invalide ou expirée")
    if r.status_code >= 500:
        raise HTTPException(status_code=502, detail="Tybot a renvoyé une erreur")

    claims = _jwt_claims(token)
    email = (claims.get("email") or "").lower()
    full_name = ""
    tybot_id = claims.get("sub")
    if not email:  # token without e-mail claim -> ask Tybot who this is
        try:
            me = httpx.get(_url("/users/me"), headers={"Authorization": f"Bearer {token}"}, timeout=15).json()
            email = (me.get("email") or "").lower()
            full_name = me.get("first_name") or ""
            tybot_id = tybot_id or me.get("id")
        except Exception as e:
            logger.error(f"[TYBOT] /users/me failed: {e}")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Impossible d'identifier l'utilisateur Tybot")

    identity = {"tybot_id": tybot_id, "email": email, "full_name": full_name}
    _token_cache[k] = (time.time() + _TTL, identity)
    if len(_token_cache) > 500:
        now = time.time()
        for old in [x for x, (exp, _) in _token_cache.items() if exp < now]:
            _token_cache.pop(old, None)
    return identity


def resolve_wedy_user_id(supabase: Client, email: str, full_name: str = "") -> str:
    """Wedy user id for an e-mail: existing profile first, else create the account (role defaults to employee)."""
    email = email.lower()
    if email in _user_id_cache:
        return _user_id_cache[email]

    res = supabase.table("profiles").select("user_id").ilike("email", email).limit(1).execute()
    if res.data:
        _user_id_cache[email] = res.data[0]["user_id"]
        return _user_id_cache[email]

    user_id: Optional[str] = None
    try:
        created = supabase.auth.admin.create_user({
            "email": email,
            "password": secrets.token_urlsafe(32),  # never used: login goes through Tybot
            "email_confirm": True,
            "user_metadata": {"full_name": full_name or email.split("@")[0], "source": "tybot"},
        })
        user_id = created.user.id
    except Exception:
        # already exists in Supabase auth (but without profile) -> find it
        for u in supabase.auth.admin.list_users():
            if (u.email or "").lower() == email:
                user_id = u.id
                break
    if not user_id:
        raise HTTPException(status_code=500, detail="Impossible de créer le compte Wedy lié à Tybot")

    supabase.table("profiles").upsert(
        {"user_id": user_id, "full_name": full_name or email.split("@")[0], "email": email},
        on_conflict="user_id",
    ).execute()
    _user_id_cache[email] = user_id
    return user_id


_users_cache: tuple[float, list] = (0.0, [])


def list_tybot_users(force: bool = False) -> list[dict]:
    """All accounts of the Tybot domain (API key), normalized. Cached 60 s."""
    global _users_cache
    if not force and _users_cache[0] > time.time():
        return _users_cache[1]
    if not settings.TYBOTFLOW_API_KEY:
        raise HTTPException(status_code=503, detail="TYBOTFLOW_API_KEY non configurée")
    try:
        r = httpx.get(_url("/users"), headers={"Authorization": settings.TYBOTFLOW_API_KEY}, timeout=30)
        r.raise_for_status()
        raw = r.json().get("data", [])
    except Exception as e:
        logger.error(f"[TYBOT] list users failed: {e}")
        raise HTTPException(status_code=502, detail="Impossible de lire les comptes Tybot")
    users = []
    for u in raw:
        email = (u.get("email") or "").strip().lower()
        if not email:
            continue
        name = " ".join(x for x in (u.get("first_name"), u.get("last_name")) if x).strip()
        users.append({
            "tybot_id": u.get("id"),
            "email": email,
            "full_name": name or email.split("@")[0],
            "is_active": bool(u.get("is_active", True)) and u.get("status", "active") == "active",
            "tybot_roles": [r.get("name") for r in (u.get("roles") or []) if r.get("name")],
        })
    _users_cache = (time.time() + 60, users)
    return users
