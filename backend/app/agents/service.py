"""Runs the Copilot graph for one request and turns its progress into events for the browser (Server-Sent Events).

Events (JSON): run · route · token · tool_call · tool_result · link · confirm · message · error · done
"""
import asyncio
import json
import time
from typing import Any, AsyncIterator, Optional

from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, ToolMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from supabase import Client

from app.agents.catalog import AGENTS, label_of
from app.agents.graph import build_graph, text_of
from app.agents.llm import provider
from app.agents.runtime import CTX, SPECS, AgentContext

THREAD_TTL = 6 * 3600
MAX_THREADS = 300

_saver = MemorySaver()
_graph = None
_threads: dict[str, dict] = {}  # thread_id → {owner, ts}


def graph():
    global _graph
    if _graph is None:
        _graph = build_graph(_saver)
    return _graph


def reset_for_tests() -> None:
    global _graph, _saver
    _saver = MemorySaver()
    _graph = None
    _threads.clear()


def _prune() -> None:
    now = time.time()
    for tid, t in list(_threads.items()):
        if now - t["ts"] > THREAD_TTL:
            _threads.pop(tid, None)
            try:
                _saver.delete_thread(tid)
            except Exception:
                pass
    while len(_threads) > MAX_THREADS:
        oldest = min(_threads, key=lambda k: _threads[k]["ts"])
        _threads.pop(oldest, None)
        try:
            _saver.delete_thread(oldest)
        except Exception:
            pass


def _claim(thread_id: str, user_id: str) -> bool:
    """A thread belongs to the user who opened it."""
    t = _threads.get(thread_id)
    if t and t["owner"] != user_id:
        return False
    _threads[thread_id] = {"owner": user_id, "ts": time.time()}
    _prune()
    return True


def _chunk_text(chunk: Any) -> str:
    c = getattr(chunk, "content", "")
    if isinstance(c, str):
        return c
    return "".join(b.get("text", "") for b in c if isinstance(b, dict) and b.get("type") == "text")


def _short(content: Any) -> tuple[bool, str, list]:
    """(ok, one-line summary, links) of a tool result."""
    try:
        data = json.loads(content) if isinstance(content, str) else content
    except ValueError:
        return True, str(content)[:120], []
    if not isinstance(data, dict):
        return True, f"{len(data)} items" if isinstance(data, list) else str(data)[:120], []
    links = data.get("links") or []
    if data.get("error"):
        return False, str(data["error"])[:200], []
    if data.get("cancelled"):
        return False, "cancelled", []
    for k in ("count", "total", "absent_count", "records"):
        if isinstance(data.get(k), int):
            return True, str(data[k]), links
    return True, "ok", links


async def run(*, thread_id: str, user: dict, db: Client, lang: str = "fr", message: Optional[str] = None, resume: Optional[dict] = None,
              auto_approve: bool = False, history: Optional[list] = None) -> AsyncIterator[dict]:
    """Yield the events of one turn (a new message) or of its continuation (the user's answer to a confirmation)."""
    token = CTX.set(AgentContext(db=db, user=user, lang=lang if lang in ("fr", "en", "ar") else "fr", auto_approve=auto_approve))
    try:
        if not provider() and not _override_active():
            yield {"t": "error", "code": "no_ai_key", "message": "AI not configured"}
            yield {"t": "done", "status": "error"}
            return
        if not _claim(thread_id, str(user.get("id"))):
            yield {"t": "error", "code": "forbidden", "message": "Unknown conversation"}
            yield {"t": "done", "status": "error"}
            return
        g = graph()
        config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 90}
        yield {"t": "run", "thread_id": thread_id}

        if resume is not None:
            inputs: Any = Command(resume={"approve": bool(resume.get("approve"))})
        else:
            msgs: list = []
            known = await g.aget_state(config)
            if history and not (known and known.values.get("messages")):
                for h in history[-12:]:  # the server lost this conversation (restart): rebuild it from what the browser shows
                    msgs.append(HumanMessage(content=h["content"]) if h.get("role") == "user" else AIMessage(content=h["content"], additional_kwargs={"agent": "general"}))
            msgs.append(HumanMessage(content=(message or "").strip()))
            inputs = {"messages": msgs, "hops": 0, "route": "", "instruction": ""}

        awaiting = False
        async for mode, payload in g.astream(inputs, config, stream_mode=["updates", "messages"]):
            if mode == "messages":
                chunk, meta = payload
                if meta.get("langgraph_node") == "agent" and isinstance(chunk, AIMessageChunk) and not chunk.tool_call_chunks:
                    txt = _chunk_text(chunk)
                    if txt:
                        yield {"t": "token", "id": chunk.id, "agent": None, "text": txt}
                continue
            for node, upd in payload.items():
                if node == "__interrupt__":
                    for it in (upd if isinstance(upd, (list, tuple)) else [upd]):
                        v = getattr(it, "value", it)
                        awaiting = True
                        yield {"t": "confirm", **v}
                    continue
                if not upd:
                    continue
                if node == "supervisor" and upd.get("route") not in (None, "", "FINISH"):
                    yield {"t": "route", "agent": upd["route"], "label": label_of(upd["route"], lang), "instruction": upd.get("instruction", "")}
                elif node == "agent":
                    for m in upd.get("messages", []):
                        agent = m.additional_kwargs.get("agent")
                        if m.tool_calls:
                            for c in m.tool_calls:
                                spec = SPECS.get(c["name"])
                                yield {"t": "tool_call", "id": c["id"], "message_id": m.id, "agent": agent, "tool": c["name"], "write": bool(spec and spec.write),
                                       "label": (CTX.get().t(*spec.label) if spec else c["name"]), "args": c.get("args")}
                        else:
                            yield {"t": "message", "id": m.id, "agent": agent, "agent_label": label_of(agent, lang) if agent in AGENTS else "", "text": text_of(m)}
                elif node == "tools":
                    for m in upd.get("messages", []):
                        ok, summary, links = _short(m.content)
                        yield {"t": "tool_result", "id": m.tool_call_id, "tool": m.name, "ok": ok, "summary": summary}
                        for l in links:
                            yield {"t": "link", **l}
        yield {"t": "done", "status": "awaiting_confirmation" if awaiting else "complete"}
    except Exception as e:  # never break the stream without telling the browser
        print(f"[copilot] run failed: {type(e).__name__}: {e}")
        msg = str(e)
        code = "no_ai_key" if "no_ai_key" in msg else "ai_unavailable" if any(k in msg.lower() for k in ("connection", "timeout", "api key", "401", "403", "429", "overloaded")) else "failed"
        yield {"t": "error", "code": code, "message": msg[:300]}
        yield {"t": "done", "status": "error"}
    finally:
        try:
            CTX.reset(token)
        except ValueError:
            pass


def _override_active() -> bool:
    from app.agents import llm
    return bool(llm._OVERRIDE.get("factory"))


async def stream(**kw) -> AsyncIterator[str]:
    """Server-Sent Events text of `run(**kw)`, with a heartbeat while the model is thinking.

    `run` executes in ONE background task so that its context (the request context read by the tools) is the same
    for every step; if the browser disconnects the task is cancelled (the conversation stays saved at its last step).
    """
    q: asyncio.Queue = asyncio.Queue()

    async def produce():
        try:
            async for ev in run(**kw):
                await q.put(ev)
        except asyncio.CancelledError:
            raise
        finally:
            await q.put(None)

    task = asyncio.create_task(produce())
    try:
        while True:
            try:
                ev = await asyncio.wait_for(q.get(), timeout=12)
            except asyncio.TimeoutError:
                yield ": ping\n\n"
                continue
            if ev is None:
                break
            yield f"data: {json.dumps(ev, ensure_ascii=False, default=str)}\n\n"
    finally:
        if not task.done():
            task.cancel()
