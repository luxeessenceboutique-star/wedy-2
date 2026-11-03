"""Outgoing webhooks: deliver an event to every active hook subscribed to it.

kind "json"  → POST {"event", "sent_at", "data"} (signed with X-Wedy-Signature when a secret is set)
kind "slack" / "teams" → POST {"text": "..."} to an incoming-webhook URL
Deliveries run in a background thread so the request that triggered them is not slowed down.
"""
import hashlib
import hmac
import json
import threading
from datetime import datetime
from typing import Any, Optional

import httpx
from supabase import Client

EVENTS = ("leave.approved", "employee.created", "document.generated", "candidate.hired")

_TEXT = {
    "leave.approved": "✅ Congé approuvé · {employee} · {start} → {end}",
    "employee.created": "👋 Nouveau collaborateur · {employee}{position}",
    "document.generated": "📄 Document généré · {document} · {employee}",
    "candidate.hired": "🎉 Candidat recruté · {employee}{position}",
    "test": "🔔 Test Wedy · la connexion fonctionne.",
}


def _text(event: str, data: dict) -> str:
    fmt = _TEXT.get(event, "Wedy · " + event)
    pos = data.get("position")
    return fmt.format(employee=data.get("employee") or "", start=data.get("start") or "", end=data.get("end") or "",
                      document=data.get("document") or "", position=f" · {pos}" if pos else "")


def deliver(hook: dict, event: str, data: dict) -> int:
    """Send one event to one hook; returns the HTTP status (0 when unreachable)."""
    kind = hook.get("kind") or "json"
    if kind in ("slack", "teams"):
        raw = json.dumps({"text": _text(event, data)}).encode()
        headers = {"Content-Type": "application/json"}
    else:
        raw = json.dumps({"event": event, "sent_at": datetime.utcnow().isoformat() + "Z", "data": data}, default=str).encode()
        headers = {"Content-Type": "application/json", "X-Wedy-Event": event}
        if hook.get("secret"):
            headers["X-Wedy-Signature"] = "sha256=" + hmac.new(hook["secret"].encode(), raw, hashlib.sha256).hexdigest()
    try:
        return httpx.post(hook["url"], content=raw, headers=headers, timeout=8).status_code
    except Exception:
        return 0


def _record(supabase: Client, hook_id: str, status: int):
    try:
        supabase.table("webhooks").update({"last_status": status, "last_sent_at": datetime.utcnow().isoformat()}).eq("id", hook_id).execute()
    except Exception:
        pass


def emit(supabase: Client, event: str, data: Optional[dict[str, Any]] = None) -> None:
    """Fire-and-forget delivery of an event to the subscribed active hooks. Never raises."""
    try:
        hooks = supabase.table("webhooks").select("*").eq("active", True).execute().data or []
    except Exception:
        return  # table not created yet
    targets = [h for h in hooks if event in (h.get("events") or [])]
    if not targets:
        return
    payload = dict(data or {})

    def run():
        for h in targets:
            _record(supabase, h["id"], deliver(h, event, payload))

    threading.Thread(target=run, daemon=True).start()
