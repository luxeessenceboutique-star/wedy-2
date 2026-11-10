"""Chat model of the agents: Anthropic when ANTHROPIC_API_KEY is set, else the OpenAI-compatible router
(OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL), the same keys as the rest of the app."""
import os
from typing import Any

from app.config import settings


def _key(name: str) -> str:
    return os.getenv(name) or getattr(settings, name, "") or ""


def provider() -> str:
    forced = (os.getenv("COPILOT_PROVIDER") or "").lower()
    if forced in ("anthropic", "openai"):
        return forced
    if _key("ANTHROPIC_API_KEY"):
        return "anthropic"
    if _key("OPENAI_API_KEY"):
        return "openai"
    return ""


# tests replace this with a scripted model
_OVERRIDE: dict[str, Any] = {}


def set_model_override(factory) -> None:
    _OVERRIDE["factory"] = factory


def get_chat_model(temperature: float = 0.2, max_tokens: int = 2048):
    if _OVERRIDE.get("factory"):
        return _OVERRIDE["factory"]()
    p = provider()
    if p == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=os.getenv("COPILOT_MODEL") or "claude-sonnet-4-6", api_key=_key("ANTHROPIC_API_KEY"),
                             temperature=temperature, max_tokens=max_tokens, timeout=90, max_retries=2)
    if p == "openai":
        from langchain_openai import ChatOpenAI
        base = _key("OPENAI_BASE_URL") or None
        if base and not base.rstrip("/").endswith("/v1"):
            base = base.rstrip("/") + "/v1"
        return ChatOpenAI(model=os.getenv("COPILOT_MODEL") or _key("OPENAI_MODEL") or "gpt-4o-mini", api_key=_key("OPENAI_API_KEY"),
                          base_url=base, temperature=temperature, max_tokens=max_tokens, timeout=90, max_retries=2, streaming=True)
    raise RuntimeError("no_ai_key")
