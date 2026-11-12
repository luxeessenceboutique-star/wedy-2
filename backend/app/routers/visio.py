"""Wedy Visio — video meetings inside the platform, free (WebRTC, no third-party service).

The media goes straight between the browsers (peer to peer, up to MAX_PEERS people). This router only relays the
WebRTC handshake (« signaling ») over a WebSocket, keeps who is in which room, and relays the chat.

Rooms: « m-<meeting id> » (a meeting of Réunions) or « i-<interview id> » (an interview without a meeting).
Who may join:
  - signed-in staff: HR / admin in any room; an employee in the meetings they take part in;
  - a guest (e.g. the candidate) with a signed invite link made by HR (`POST /visio/{room}/guest-link`), no account needed.

ICE servers: public STUN by default. Two people on different networks (4G, a company Wi-Fi, a home router that is strict about
NAT) often cannot reach each other directly: the tiles then say « Connexion impossible ». A TURN relay fixes it. Set
VISIO_TURN_URL (comma-separated turn: / turns: URLs) with either VISIO_TURN_SECRET (coturn `use-auth-secret`: the API hands out
credentials that expire after 12 h) or VISIO_TURN_USERNAME + VISIO_TURN_CREDENTIAL. The relay credentials are only given to
signed-in staff and to guests holding a valid invite link, never to anonymous callers.
The rooms live in the memory of the API process (the API runs as a single uvicorn process).
"""
import asyncio
import base64
import hashlib
import hmac
import json
import os
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from supabase import Client

from app.config import settings
from app.database import get_db, get_supabase
from app.dependencies import get_current_user

router = APIRouter(prefix="/visio", tags=["Visio"])

MAX_PEERS = 6
HR_ROLES = {"admin", "hr", "rh"}
ROOM_RE = re.compile(r"^[mi]-[0-9a-fA-F-]{36}$")


# ── room access ───────────────────────────────────────────────────────────────

def _check_room(room: str) -> None:
    if not ROOM_RE.match(room):
        raise HTTPException(status_code=404, detail="Salle introuvable")


def _room_info(supabase: Client, room: str) -> dict:
    """Title, start, end and participants of the meeting / interview behind a room."""
    kind, rid = room[0], room[2:]
    if kind == "m":
        try:
            m = (supabase.table("meetings").select("*").eq("id", rid).limit(1).execute().data or [None])[0]
        except Exception:
            m = None
        if not m:
            raise HTTPException(status_code=404, detail="Réunion introuvable")
        start = datetime.fromisoformat(str(m["starts_at"]).replace("Z", "+00:00"))
        return {"title": m.get("title") or "Réunion", "starts_at": start.isoformat(), "ends_at": (start + timedelta(minutes=int(m.get("duration_min") or 60))).isoformat(),
                "participants": m.get("participants") or [], "kind": m.get("kind") or "meet"}
    iv = (supabase.table("interviews").select("*").eq("id", rid).limit(1).execute().data or [None])[0]
    if not iv:
        raise HTTPException(status_code=404, detail="Entretien introuvable")
    cand = (supabase.table("employees").select("full_name, position").eq("id", iv["candidate_id"]).limit(1).execute().data or [{}])[0]
    start = datetime.fromisoformat(f"{iv['date']}T{str(iv.get('start_time') or '00:00')[:5]}:00")
    end = datetime.fromisoformat(f"{iv['date']}T{str(iv.get('end_time') or iv.get('start_time') or '23:59')[:5]}:00")
    return {"title": f"Entretien · {cand.get('full_name') or ''}" + (f" · {cand['position']}" if cand.get("position") else ""),
            "starts_at": start.isoformat(), "ends_at": end.isoformat(), "participants": iv.get("interviewers") or [], "kind": "int"}


def _staff_may_join(supabase: Client, user: dict, room: str, info: dict) -> bool:
    if user.get("role_name") in HR_ROLES:
        return True
    if room[0] != "m":
        return False
    emp = (supabase.table("employees").select("id").eq("email", (user.get("email") or "").lower()).limit(1).execute().data or [None])[0]
    return bool(emp) and any(p.get("employee_id") == emp["id"] for p in info.get("participants") or [])


# ── signed guest links ─────────────────────────────────────────────────────────

def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _sign(payload: dict) -> str:
    body = _b64(json.dumps(payload, separators=(",", ":")).encode())
    mac = hmac.new(settings.SECRET_KEY.encode(), f"visio.{body}".encode(), hashlib.sha256).digest()
    return f"{body}.{_b64(mac)}"


def _verify(token: str, room: str) -> dict:
    try:
        body, mac = token.split(".", 1)
        good = hmac.new(settings.SECRET_KEY.encode(), f"visio.{body}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_unb64(mac), good):
            raise ValueError("bad signature")
        data = json.loads(_unb64(body))
    except Exception:
        raise HTTPException(status_code=403, detail="invalid_link")
    if data.get("r") != room:
        raise HTTPException(status_code=403, detail="invalid_link")
    if int(data.get("e") or 0) < time.time():
        raise HTTPException(status_code=403, detail="expired_link")
    return data


class GuestLinkIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)


@router.post("/{room}/guest-link")
def make_guest_link(room: str, body: GuestLinkIn, supabase: Client = Depends(get_db), user: dict = Depends(get_current_user)):
    """Invite link for someone without an account (a candidate, an external guest). Valid until 24 h after the end."""
    _check_room(room)
    info = _room_info(supabase, room)
    if not _staff_may_join(supabase, user, room, info) or user.get("role_name") not in HR_ROLES:
        raise HTTPException(status_code=403, detail="Seuls les RH peuvent inviter")
    end = datetime.fromisoformat(info["ends_at"])
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    exp = max(end + timedelta(hours=24), datetime.now(timezone.utc) + timedelta(hours=24))
    token = _sign({"r": room, "n": body.name.strip()[:120], "e": int(exp.timestamp()), "j": uuid.uuid4().hex[:8]})
    return {"path": f"/visio/{room}?k={token}", "expires_at": exp.isoformat()}


def _public_info(room: str, info: dict) -> dict:
    return {"room": room, "title": info["title"], "starts_at": info["starts_at"], "ends_at": info["ends_at"], "kind": info["kind"],
            "hosts": [p.get("name") for p in info.get("participants") or [] if p.get("name")][:8], "live": len(HUB.rooms.get(room, {}))}


@router.get("/{room}/guest-info")
def guest_info(room: str, k: str = Query(...), supabase: Client = Depends(get_db)):
    """Public, with a valid invite link only: what the guest's waiting screen shows."""
    _check_room(room)
    data = _verify(k, room)
    return {**_public_info(room, _room_info(supabase, room)), "guest_name": data.get("n")}


@router.get("/{room}/info")
def room_info(room: str, supabase: Client = Depends(get_db), user: dict = Depends(get_current_user)):
    """Signed-in staff: the room, if they may join it."""
    _check_room(room)
    info = _room_info(supabase, room)
    if not _staff_may_join(supabase, user, room, info):
        raise HTTPException(status_code=403, detail="not_invited")
    return {**_public_info(room, info), "can_invite": user.get("role_name") in HR_ROLES, "me": user.get("full_name") or user.get("email")}


TURN_TTL = 12 * 3600


def turn_servers(now: Optional[float] = None) -> tuple[list[dict[str, Any]], str]:
    """The configured TURN relay as an ICE server, and how its credentials are made: 'ephemeral', 'static' or 'none'."""
    urls = [u.strip() for u in (os.getenv("VISIO_TURN_URL") or "").split(",") if u.strip()]
    if not urls:
        return [], "none"
    secret = os.getenv("VISIO_TURN_SECRET")
    if secret:  # coturn's REST scheme: username = expiry:label, credential = base64(HMAC-SHA1(secret, username))
        username = f"{int((now if now is not None else time.time()) + TURN_TTL)}:wedy"
        credential = base64.b64encode(hmac.new(secret.encode(), username.encode(), hashlib.sha1).digest()).decode()
        return [{"urls": urls, "username": username, "credential": credential}], "ephemeral"
    return [{"urls": urls, "username": os.getenv("VISIO_TURN_USERNAME", ""), "credential": os.getenv("VISIO_TURN_CREDENTIAL", "")}], "static"


def _may_use_relay(request: Request, room: Optional[str], k: Optional[str], supabase: Client) -> bool:
    """Relay credentials cost bandwidth: only signed-in staff and guests with a valid invite link get them."""
    if room and k:
        try:
            _check_room(room)
            _verify(k, room)
            return True
        except HTTPException:
            pass
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        try:
            get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=auth[7:].strip()), supabase)
            return True
        except Exception:
            return False
    return False


@router.get("/ice")
def ice_servers(request: Request, room: Optional[str] = None, k: Optional[str] = None, supabase: Client = Depends(get_db)):
    servers: list[dict[str, Any]] = [{"urls": ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:global.stun.twilio.com:3478"]}]
    relay, mode = turn_servers()
    allowed = bool(relay) and _may_use_relay(request, room, k, supabase)
    if allowed:
        servers.extend(relay)
    # `turn_configured`: the server has a relay (even if this caller may not use it); `turn`: the browser received it
    return {"iceServers": servers, "max_peers": MAX_PEERS, "turn": allowed, "turn_configured": bool(relay), "turn_mode": mode if allowed else "none"}


@router.get("/live")
def live_rooms(user: dict = Depends(get_current_user)):
    """Rooms with people inside right now (Réunions shows « en cours »)."""
    return {"rooms": {r: len(p) for r, p in HUB.rooms.items() if p}}


# ── signaling hub ─────────────────────────────────────────────────────────────

class Hub:
    def __init__(self) -> None:
        self.rooms: dict[str, dict[str, dict[str, Any]]] = {}
        self.lock = asyncio.Lock()

    async def send(self, ws: WebSocket, msg: dict) -> None:
        try:
            await ws.send_text(json.dumps(msg))
        except Exception:
            pass

    async def broadcast(self, room: str, msg: dict, skip: Optional[str] = None) -> None:
        for pid, p in list(self.rooms.get(room, {}).items()):
            if pid != skip:
                await self.send(p["ws"], msg)


HUB = Hub()


def _public(pid: str, p: dict) -> dict:
    return {"id": pid, "name": p["name"], "role": p["role"], "mic": p["mic"], "cam": p["cam"], "screen": p["screen"]}


@router.websocket("/ws/{room}")
async def visio_ws(websocket: WebSocket, room: str, token: Optional[str] = None, guest: Optional[str] = None, name: Optional[str] = None):
    await websocket.accept()
    supabase = get_supabase()
    try:
        _check_room(room)
        info = await asyncio.to_thread(_room_info, supabase, room)
        if guest:
            data = _verify(guest, room)
            who, role = (name or data.get("n") or "Invité").strip()[:80], "guest"
        elif token:
            user = await asyncio.to_thread(get_current_user, HTTPAuthorizationCredentials(scheme="Bearer", credentials=token), supabase)
            if not await asyncio.to_thread(_staff_may_join, supabase, user, room, info):
                raise HTTPException(status_code=403, detail="not_invited")
            who, role = (user.get("full_name") or user.get("email") or "Wedy")[:80], "host"
        else:
            raise HTTPException(status_code=401, detail="auth_required")
    except HTTPException as e:
        await websocket.send_text(json.dumps({"t": "error", "code": str(e.detail)}))
        await websocket.close(code=4403)
        return
    except Exception as e:
        await websocket.send_text(json.dumps({"t": "error", "code": "unavailable", "detail": str(e)[:200]}))
        await websocket.close(code=1011)
        return

    pid = uuid.uuid4().hex[:10]
    async with HUB.lock:
        peers = HUB.rooms.setdefault(room, {})
        if len(peers) >= MAX_PEERS:
            await HUB.send(websocket, {"t": "error", "code": "room_full"})
            await websocket.close(code=4409)
            return
        others = [_public(k, v) for k, v in peers.items()]
        peers[pid] = {"ws": websocket, "name": who, "role": role, "mic": True, "cam": True, "screen": False, "since": time.time()}
    await HUB.send(websocket, {"t": "welcome", "id": pid, "name": who, "role": role, "peers": others, "title": info["title"]})
    await HUB.broadcast(room, {"t": "joined", "peer": _public(pid, HUB.rooms[room][pid])}, skip=pid)

    try:
        while True:
            raw = await websocket.receive_text()
            if len(raw) > 200_000:
                continue
            try:
                msg = json.loads(raw)
            except ValueError:
                continue
            t = msg.get("t")
            if t == "signal":
                target = HUB.rooms.get(room, {}).get(str(msg.get("to")))
                if target:
                    await HUB.send(target["ws"], {"t": "signal", "from": pid, "data": msg.get("data")})
            elif t == "state":
                me = HUB.rooms.get(room, {}).get(pid)
                if me:
                    for k in ("mic", "cam", "screen"):
                        if k in msg:
                            me[k] = bool(msg[k])
                    await HUB.broadcast(room, {"t": "state", "id": pid, "mic": me["mic"], "cam": me["cam"], "screen": me["screen"]}, skip=pid)
            elif t == "chat":
                text = str(msg.get("text") or "").strip()[:1000]
                if text:
                    await HUB.broadcast(room, {"t": "chat", "from": pid, "name": who, "text": text, "at": datetime.now(timezone.utc).isoformat()})
            elif t == "leave":
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        async with HUB.lock:
            peers = HUB.rooms.get(room, {})
            peers.pop(pid, None)
            if not peers:
                HUB.rooms.pop(room, None)
        await HUB.broadcast(room, {"t": "left", "id": pid})
