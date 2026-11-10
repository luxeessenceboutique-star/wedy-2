"""A chat model that plays a script: used to test the Copilot graph without a real LLM."""
from typing import Any, Callable, List, Optional

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_core.runnables import RunnableLambda

ROUTES: list = []   # supervisor decisions: dicts {"next":..., "instruction":...}
AGENT: list = []    # agent replies: AIMessage or callable(messages) -> AIMessage
LOG: list = []      # what the model was asked (for assertions)


def reset():
    ROUTES.clear(); AGENT.clear(); LOG.clear()


def call(name: str, args: dict, id: str = None) -> AIMessage:
    return AIMessage(content="", tool_calls=[{"name": name, "args": args, "id": id or f"call_{name}_{len(LOG)}"}])


class ScriptedModel(BaseChatModel):
    @property
    def _llm_type(self) -> str: return "scripted"

    def bind_tools(self, tools, **kw): return self

    def with_structured_output(self, schema, **kw):
        from app.agents.graph import Route
        def pick(_msgs):
            LOG.append(("route", _msgs))
            d = ROUTES.pop(0) if ROUTES else {"next": "FINISH"}
            if isinstance(d, Exception):
                raise d
            return Route(**d)
        return RunnableLambda(pick)

    def _next(self, messages: List[BaseMessage]) -> AIMessage:
        LOG.append(("agent", messages))
        item = AGENT.pop(0) if AGENT else AIMessage(content="(no script)")
        return item(messages) if callable(item) else item

    def _generate(self, messages, stop=None, run_manager=None, **kw) -> ChatResult:
        return ChatResult(generations=[ChatGeneration(message=self._next(messages))])

    def _stream(self, messages, stop=None, run_manager=None, **kw):
        m = self._next(messages)
        if m.tool_calls:
            yield ChatGenerationChunk(message=AIMessageChunk(content="", tool_call_chunks=[
                {"name": c["name"], "args": __import__("json").dumps(c["args"]), "id": c["id"], "index": i} for i, c in enumerate(m.tool_calls)],
                additional_kwargs=m.additional_kwargs, id=m.id))
            return
        words = (m.content or "").split(" ")
        for i, w in enumerate(words):
            yield ChatGenerationChunk(message=AIMessageChunk(content=w + (" " if i < len(words) - 1 else ""), id=m.id))
