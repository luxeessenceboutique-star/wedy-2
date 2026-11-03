"""Company settings stored in rh.app_settings (one JSON value per section), with defaults.

Read by the /settings router and by the features that depend on them (leave entitlement).
"""
from typing import Any

from supabase import Client

SECTIONS = ("company", "prefs", "leave", "docs", "assets", "security")

DEFAULTS: dict[str, dict[str, Any]] = {
    "company": {"name": "Tython SARL", "sector": "", "ice": "", "rc": "", "if": "", "cnss": "", "address": "", "city": "Casablanca", "phone": "", "email": ""},
    "prefs": {"lang": "fr", "tz": "Africa/Casablanca", "date": "dmy", "cur": "MAD", "days": [1, 1, 1, 1, 1, 0, 0]},
    # Code du travail: 1.5 working days per month of service, +1.5 per 5 years of seniority, 30 days max.
    "leave": {"monthly": 1.5, "bonus": 1.5, "cap": 30, "flow": "mgr-rh", "off_holidays": []},
    "docs": {"prefix": "ATT-", "lang": "fr", "qr": True},
    "assets": {"logo": None, "signature": None, "stamp": None},
    # session_timeout: minutes of inactivity before the app signs out (0 = never);
    # ip_allow + ips: HR / admin API calls only from these addresses or CIDR ranges.
    "security": {"session_timeout": 0, "ip_allow": False, "ips": []},
}


def missing_table(e: Exception) -> bool:
    msg = str(e).lower()
    return "app_settings" in msg and ("does not exist" in msg or "could not find" in msg or "schema cache" in msg or "42p01" in msg or "pgrst205" in msg)


def load(supabase: Client) -> tuple[dict[str, dict[str, Any]], bool]:
    """All sections merged over the defaults, and whether the table exists."""
    out = {k: dict(v) for k, v in DEFAULTS.items()}
    try:
        rows = supabase.table("app_settings").select("key, value").execute().data or []
    except Exception as e:
        if missing_table(e):
            return out, False
        raise
    for r in rows:
        if r.get("key") in out and isinstance(r.get("value"), dict):
            out[r["key"]].update(r["value"])
    return out, True


def leave_rules(supabase: Client) -> dict[str, Any]:
    try:
        return load(supabase)[0]["leave"]
    except Exception:
        return dict(DEFAULTS["leave"])


# ── IP allow-list (cached, read on every HR / admin request) ───────────────────
import ipaddress
import time

_ip_cache: dict[str, Any] = {"at": 0.0, "value": None}


def ip_rules(supabase: Client) -> dict[str, Any]:
    """The security section, cached for 30 s so the check costs nothing per request."""
    if time.time() - _ip_cache["at"] < 30 and _ip_cache["value"] is not None:
        return _ip_cache["value"]
    try:
        value = load(supabase)[0]["security"]
    except Exception:
        value = dict(DEFAULTS["security"])
    _ip_cache.update(at=time.time(), value=value)
    return value


def forget_ip_rules() -> None:
    _ip_cache.update(at=0.0, value=None)


def ip_allowed(ip: str, ranges: list[dict[str, str]]) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for r in ranges:
        try:
            if addr in ipaddress.ip_network(str(r.get("ip", "")).strip(), strict=False):
                return True
        except ValueError:
            continue
    return False


def client_ip(request) -> str:
    """The caller's address, behind a reverse proxy when X-Forwarded-For is set."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else ""
