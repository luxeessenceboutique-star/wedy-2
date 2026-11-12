"""Spelling clean-up of the job-post form (title, city, key points) before the ad is written.

Recruiters type quickly ("devloper ai", "casa", "directure commercial"); those words end up in the ad and on the published post.
The chat model corrects them, but its answer is only accepted field by field when it stays close to what was typed (a correction
is never a rewrite, never changes a number, never invents a value for an empty field); otherwise a deterministic clean-up is used."""
import asyncio
import json
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Optional

from loguru import logger

CITIES = {
    "casa": "Casablanca", "casablanca": "Casablanca", "casablanka": "Casablanca", "dar el beida": "Casablanca",
    "rbat": "Rabat", "rabat": "Rabat", "fes": "Fès", "fez": "Fès", "fès": "Fès", "marakech": "Marrakech", "marrakech": "Marrakech", "marrakesh": "Marrakech",
    "tanger": "Tanger", "tangier": "Tanger", "tanja": "Tanger", "agadir": "Agadir", "oujda": "Oujda", "kenitra": "Kénitra", "kénitra": "Kénitra",
    "sale": "Salé", "salé": "Salé", "tetouan": "Tétouan", "tétouan": "Tétouan", "meknes": "Meknès", "meknès": "Meknès", "mohammedia": "Mohammedia",
    "settat": "Settat", "el jadida": "El Jadida", "eljadida": "El Jadida", "beni mellal": "Béni Mellal", "béni mellal": "Béni Mellal", "nador": "Nador",
    "laayoune": "Laâyoune", "laâyoune": "Laâyoune", "dakhla": "Dakhla", "essaouira": "Essaouira", "safi": "Safi", "khouribga": "Khouribga", "taza": "Taza",
    "ifrane": "Ifrane", "errachidia": "Errachidia", "ouarzazate": "Ouarzazate", "tanger-med": "Tanger-Med", "technopolis": "Technopolis",
}

_JSON = re.compile(r"\{.*\}", re.S)


def _squash(text: str) -> str:
    return re.sub(r"[ \t]+", " ", (text or "").replace("\r", "")).strip()


def _plain(text: str) -> str:
    """Lower-case, accent-free form used to compare what was typed with what comes back."""
    return "".join(c for c in unicodedata.normalize("NFD", text.lower()) if unicodedata.category(c) != "Mn")


def _numbers(text: str) -> list:
    return sorted(re.findall(r"\d+(?:[.,]\d+)?", text))


def local_polish(title: str, city: str, points: str) -> dict:
    """Deterministic clean-up (no AI): spaces, first capital letter, usual spellings of Moroccan cities."""
    t = _squash(title)
    if t and t[0].islower():
        t = t[0].upper() + t[1:]
    c = _squash(city)
    if c:
        known = CITIES.get(_plain(c))
        c = known or (c[0].upper() + c[1:] if c[0].islower() else c)
    lines = [_squash(line) for line in (points or "").split("\n")]
    p = "\n".join(line[0].upper() + line[1:] if line and line[0].islower() and not line.startswith(("•", "-", "*")) else line for line in lines).strip()
    return {"title": t, "city": c, "points": p}


def _accept(original: str, proposed: Optional[str], floor: float) -> str:
    """The model's version of one field, or the original when it looks like more than a correction.

    `floor` is the minimum similarity with what was typed: real corrections ("devloper ai" -> "Developer AI") score 0.88 and more,
    rewrites ("directure commercial" -> "Directeur général du groupe international") 0.5 and less."""
    if not original.strip():
        return original                       # nothing typed: nothing is invented
    new = _squash(proposed or "")
    if not new or _numbers(new) != _numbers(original):
        return original
    if len(new) > max(3 * len(original), len(original) + 40):
        return original
    if SequenceMatcher(None, _plain(original), _plain(new)).ratio() < floor:
        return original
    return new


PROMPT = """You proofread the fields of a job-post form that a recruiter typed quickly. The text may be French, English, Arabic or a mix.

Correct ONLY: spelling, accents, capitalisation, spacing, and obvious abbreviations of Moroccan city names (casa -> Casablanca, rbat -> Rabat, fes -> Fès).
Rules:
- Never translate: every field stays in the language it was typed in.
- Never add, remove or reorder ideas, never change a number, a unit or a name that is correct. If a value is already correct, return it unchanged.
- An empty field stays empty.
- Technology and product names use their usual spelling (React, Node.js, Python, Next.js, AI / IA in capitals, SQL, DevOps).
- A job title gets the capitalisation normal for its language ("Directeur commercial", "Développeur full stack", "Senior Data Analyst").
- Key points: keep the same separators and the same number of lines or items.
Examples: "devloper ai" -> "Developer AI"; "directure commercial" -> "Directeur commercial"; "casa" -> "Casablanca"; "3 ans d experiance, anglais courent" -> "3 ans d'expérience, anglais courant".

Answer with JSON only: {"title": "...", "city": "...", "points": "..."}

Fields:
"""


async def polish(title: str, city: str, points: str, language: str = "fr") -> dict:
    """{title, city, points, changes: [{field, from, to}], source: 'ai' | 'local'}."""
    orig = {"title": _squash(title), "city": _squash(city), "points": (points or "").replace("\r", "").strip()}
    base = local_polish(**orig)
    result, source = base, "local"
    if any(orig.values()):
        try:
            from app.routers.copilot import _call_ai
            payload = json.dumps(orig, ensure_ascii=False)
            raw = await asyncio.to_thread(_call_ai, "You are a meticulous proofreader.", [{"role": "user", "content": f"{PROMPT}{payload}"}])
            m = _JSON.search(str(raw))
            data = json.loads(m.group(0)) if m else None
            if not isinstance(data, dict) or not any(isinstance(data.get(k), str) for k in ("title", "city", "points")):
                raise ValueError("no usable JSON answer")
            result = {
                "title": _accept(orig["title"], data.get("title"), 0.75) if isinstance(data.get("title"), str) else base["title"],
                "city": _accept(orig["city"], data.get("city"), 0.5) if isinstance(data.get("city"), str) else base["city"],
                "points": _accept(orig["points"], data.get("points"), 0.7) if isinstance(data.get("points"), str) else base["points"],
            }
            # a field the model left untouched or the guard refused still gets the deterministic clean-up
            for k in result:
                if result[k] == orig[k]:
                    result[k] = base[k]
            source = "ai"
        except Exception as e:
            logger.info(f"ad polish: deterministic clean-up only ({type(e).__name__})")
    changes = [{"field": k, "from": orig[k], "to": result[k]} for k in ("title", "city", "points") if orig[k] and result[k] != orig[k]]
    return {**result, "changes": changes, "changed": bool(changes), "source": source}
