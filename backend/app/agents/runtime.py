"""Shared runtime of the agents: request context, name resolution, the tool registry and its safety net."""
import asyncio
import contextvars
import json
import re
import unicodedata
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Callable, Optional

from fastapi import HTTPException
from langchain_core.tools import StructuredTool
from pydantic import ValidationError
from supabase import Client

MAX_TOOL_CHARS = 7000


# ── request context ───────────────────────────────────────────────────────────

@dataclass
class AgentContext:
    db: Client
    user: dict
    lang: str = "fr"
    auto_approve: bool = False
    cache: dict = field(default_factory=dict)

    def t(self, fr: str, en: Optional[str] = None, ar: Optional[str] = None) -> str:
        return {"fr": fr, "en": en or fr, "ar": ar or en or fr}.get(self.lang, fr)


CTX: contextvars.ContextVar[AgentContext] = contextvars.ContextVar("wedy_agent_ctx")


def ctx() -> AgentContext:
    return CTX.get()


def tr(fr: str, en: Optional[str] = None, ar: Optional[str] = None) -> str:
    return ctx().t(fr, en, ar)


# ── errors and results ────────────────────────────────────────────────────────

class ToolError(Exception):
    """A problem to report to the model in plain words (unknown name, missing field, ambiguous match…)."""


def _json(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def compact(obj: Any, limit: int = MAX_TOOL_CHARS) -> str:
    """JSON of a tool result, cut to `limit` characters (lists are shortened first)."""
    s = _json(obj)
    if len(s) <= limit:
        return s
    if isinstance(obj, dict):
        shrunk = {k: (v[: max(3, len(v) // 3)] if isinstance(v, list) else v) for k, v in obj.items()}
        shrunk["truncated"] = True
        s = _json(shrunk)
    return s if len(s) <= limit else s[: limit - 20] + '…","truncated":true}'


def http_detail(e: HTTPException) -> str:
    d = e.detail
    if isinstance(d, (list, dict)):
        return _json(d)[:400]
    return str(d)


def run_handler(fn: Callable, *args, **kwargs):
    """Call a FastAPI route handler directly (sync or async) and turn its HTTP errors into ToolError."""
    try:
        out = fn(*args, **kwargs)
        if asyncio.iscoroutine(out):
            out = asyncio.run(out)
        return out
    except HTTPException as e:
        raise ToolError(http_detail(e))
    except ValidationError as e:
        raise ToolError("; ".join(f"{'.'.join(str(x) for x in err['loc'])}: {err['msg']}" for err in e.errors()[:4]))


# ── names ─────────────────────────────────────────────────────────────────────

def norm(s: Any) -> str:
    s = unicodedata.normalize("NFKD", str(s or "")).lower()
    return re.sub(r"[^a-z0-9؀-ۿ@. ]+", " ", "".join(c for c in s if not unicodedata.combining(c))).strip()


_UUID = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
ROSTER_COLS = "id, full_name, email, phone, position, department, status, contract_type, contract_start, contract_end, hire_date, manager, custom_fields, internship_status, school"


def roster(statuses: Optional[set] = None) -> list[dict]:
    """Everyone in the employees table (staff, interns, candidates), cached for the request."""
    c = ctx()
    if "roster" not in c.cache:
        rows = c.db.table("employees").select(ROSTER_COLS).limit(3000).execute().data or []
        c.cache["roster"] = rows
    rows = c.cache["roster"]
    return [r for r in rows if not statuses or r.get("status") in statuses]


STAFF = {"active", "on-leave", "inactive", "terminated"}
PEOPLE = STAFF | {"intern"}


def _score(ref: str, row: dict) -> int:
    name = norm(row.get("full_name"))
    email = norm(row.get("email"))
    if ref == name:
        return 100
    toks = ref.split()
    if toks and all(t in name for t in toks):
        return 80 + (10 if name.startswith(ref) else 0)
    if ref and ref in email:
        return 60
    if toks and any(len(t) > 2 and t in name for t in toks):
        return 30
    return 0


def find_people(ref: str, statuses: Optional[set] = None, limit: int = 8) -> list[dict]:
    ref_n = norm(ref)
    if _UUID.match((ref or "").strip()):
        return [r for r in roster(statuses) if r["id"] == ref.strip()]
    scored = sorted(((_score(ref_n, r), r) for r in roster(statuses)), key=lambda x: -x[0])
    return [r for s, r in scored if s > 0][:limit]


def brief(r: dict) -> dict:
    return {"id": r.get("id"), "name": r.get("full_name"), "position": r.get("position"), "department": r.get("department"), "status": r.get("status")}


def one_person(ref: str, statuses: Optional[set] = None, what: str = "person") -> dict:
    """Exactly one person from a name, an e-mail or an id; raises ToolError with the candidates when unclear."""
    if not (ref or "").strip():
        raise ToolError(tr("Précisez le nom de la personne.", "Please give the person's name.", "حدّد اسم الشخص."))
    found = find_people(ref, statuses)
    if not found:
        raise ToolError(tr(f"Aucune personne trouvée pour « {ref} ».", f"Nobody found for “{ref}”.", f"لم يتم العثور على أحد باسم «{ref}»."))
    if len(found) == 1 or _score(norm(ref), found[0]) > _score(norm(ref), found[1]):
        return found[0]
    raise ToolError(tr(f"Plusieurs personnes correspondent à « {ref} » : ", f"Several people match “{ref}”: ", f"عدة أشخاص يطابقون «{ref}»: ")
                    + "; ".join(f"{p['full_name']} ({p.get('position') or p.get('department') or p.get('status')}, id {p['id']})" for p in found[:5])
                    + tr(". Demandez à l'utilisateur lequel.", ". Ask the user which one.", ". اسأل المستخدم أيهما."))


def name_of(person_id: Optional[str]) -> str:
    if not person_id:
        return "—"
    for r in roster():
        if r["id"] == person_id:
            return r.get("full_name") or person_id
    return str(person_id)


def parse_date(s: Any, what: str = "date") -> date:
    if isinstance(s, date):
        return s
    txt = str(s or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(txt, fmt).date()
        except ValueError:
            continue
    raise ToolError(tr(f"Date invalide pour {what} : « {txt} » (format AAAA-MM-JJ).", f"Invalid date for {what}: “{txt}” (use YYYY-MM-DD).", f"تاريخ غير صالح: «{txt}» (YYYY-MM-DD)."))


# ── tool registry ─────────────────────────────────────────────────────────────

@dataclass
class ToolSpec:
    name: str
    agent: str
    label: tuple
    write: bool = False
    danger: bool = False
    preview: Optional[Callable[[dict], dict]] = None


TOOLS: dict[str, StructuredTool] = {}
SPECS: dict[str, ToolSpec] = {}
AGENT_TOOLS: dict[str, list[StructuredTool]] = {}


def hr_tool(agent: str, label: tuple, *, write: bool = False, danger: bool = False, preview: Optional[Callable[[dict], dict]] = None):
    """Register a tool of an agent. `write` tools are shown to the user for confirmation before they run;
    `preview(args)` builds that confirmation ({summary, details}) and may raise ToolError (nothing is asked then)."""
    def deco(fn: Callable):
        def safe(**kwargs):
            try:
                out = fn(**kwargs)
                return compact(out) if not isinstance(out, str) else out[:MAX_TOOL_CHARS]
            except ToolError as e:
                return _json({"error": str(e)})
            except HTTPException as e:
                return _json({"error": http_detail(e)})
            except Exception as e:  # never leak a stack trace to the model or the user
                print(f"[copilot] tool {fn.__name__} failed: {type(e).__name__}: {e}")
                return _json({"error": tr("Erreur technique : l'action n'a pas pu être exécutée.", "Technical error: the action could not be completed.", "خطأ تقني: تعذر تنفيذ الإجراء.")})
        safe.__name__ = fn.__name__
        safe.__doc__ = fn.__doc__
        t = StructuredTool.from_function(func=safe, name=fn.__name__, description=(fn.__doc__ or "").strip().split("\n\nArgs:")[0].strip(),
                                         args_schema=_schema_of(fn), infer_schema=False)
        TOOLS[fn.__name__] = t
        SPECS[fn.__name__] = ToolSpec(fn.__name__, agent, label, write, danger, preview)
        AGENT_TOOLS.setdefault(agent, []).append(t)
        return fn
    return deco


def _schema_of(fn: Callable):
    """Pydantic args model inferred from the signature and the Google-style `Args:` section of the docstring."""
    import inspect
    from pydantic import Field, create_model
    doc = fn.__doc__ or ""
    descs: dict[str, str] = {}
    if "Args:" in doc:
        for line in doc.split("Args:", 1)[1].splitlines():
            m = re.match(r"\s{2,}(\w+)\s*:\s*(.+)", line)
            if m:
                descs[m.group(1)] = m.group(2).strip()
    fields: dict[str, Any] = {}
    for name, p in inspect.signature(fn).parameters.items():
        ann = p.annotation if p.annotation is not inspect._empty else str
        default = ... if p.default is inspect._empty else p.default
        fields[name] = (ann, Field(default, description=descs.get(name, "")))
    return create_model(f"{fn.__name__}_args", **fields)


def new_id() -> str:
    return uuid.uuid4().hex[:10]


def link(path: str, label: str) -> dict:
    return {"path": path, "label": label}
