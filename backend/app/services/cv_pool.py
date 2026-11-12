"""Scanned-CV pool (« Événements »): from one uploaded CV file to a prospect row.

Reuses the extraction of the careers page (text, OCR, vision model, rule-based fallback). What this module adds: the file
types accepted at an event, the mapping to a flat prospect (name, e-mail, phone, city, headline, skills, years of
experience) next to the full profile, and the detection of people scanned twice."""
import os
import re
import unicodedata
from datetime import date
from pathlib import Path
from typing import Optional

ALLOWED_EXT = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".webp"}
MAX_FILE_BYTES = 15 * 1024 * 1024
PRESENT = re.compile(r"présent|present|aujourd|actuel|en cours|à ce jour|now|current|ongoing|حاليا|الآن", re.I)
YEAR = re.compile(r"\b(19[789]\d|20[0-4]\d)\b")


def clean_text(v) -> Optional[str]:
    s = " ".join(str(v or "").split()).strip()
    return s or None


def norm_phone(p: Optional[str]) -> str:
    """Digits only, Moroccan prefixes unified (+212 / 00212 / 0 → 212), so « 06 12 34 56 78 » equals « +212612345678 »."""
    d = re.sub(r"\D", "", p or "")
    if d.startswith("00212"):
        d = d[2:]
    if d.startswith("0") and len(d) == 10:
        d = "212" + d[1:]
    return d


def norm_email(e: Optional[str]) -> str:
    return (e or "").strip().lower()


def estimate_years(experience: list, today: Optional[date] = None) -> Optional[float]:
    """Years of experience from the dates of the jobs (« 2019 – 2023 », « depuis 2021 », « 2020 – présent »): the union of
    the periods, so jobs held at the same time are not counted twice. None when no period can be read."""
    now = (today or date.today()).year
    spans = []
    for e in experience or []:
        text = str((e or {}).get("dates") or "")
        years = [int(y) for y in YEAR.findall(text)]
        if len(years) >= 2:
            a, b = min(years[0], years[1]), max(years[0], years[1])
        elif len(years) == 1 and PRESENT.search(text):
            a, b = years[0], now
        else:
            continue
        b = min(b, now)
        if b >= a:                       # a period that starts in the future is not experience
            spans.append((a, b))
    if not spans:
        return None
    spans.sort()
    total, (cur_a, cur_b) = 0, spans[0]
    for a, b in spans[1:]:
        if a <= cur_b:
            cur_b = max(cur_b, b)
        else:
            total += cur_b - cur_a
            cur_a, cur_b = a, b
    total += cur_b - cur_a
    return float(total) if total else None


def name_from_filename(filename: str) -> Optional[str]:
    """« CV_Ahmed-Alaoui (2).pdf » → « Ahmed Alaoui »: only used when the CV itself gave no name."""
    stem = Path(filename or "").stem
    stem = re.sub(r"\(\d+\)|\b(cv|curriculum|resume|resumé|scan|img|doc|document|copie|copy)\b|[_\-.]+|\d{4,}", " ", stem, flags=re.I)
    stem = " ".join(stem.split())
    return stem.title() if 3 <= len(stem) <= 60 and any(c.isalpha() for c in stem) else None


def prospect_fields(extraction: dict, filename: str) -> dict:
    """The flat columns of a prospect from the (cleaned) extraction of its CV."""
    exp = extraction.get("experience") or []
    headline = clean_text(extraction.get("job_title")) or (clean_text((exp[0] or {}).get("title")) if exp else None)
    address = clean_text(extraction.get("address"))
    city = None
    if address:  # « 12 rue X, Casablanca 20000, Maroc » → the part that looks like a city
        parts = [p.strip() for p in re.split(r"[,;\n]", address) if p.strip()]
        for p in reversed(parts):
            q = re.sub(r"\d+", "", p).strip(" -–")
            if q and q.lower() not in {"maroc", "morocco", "المغرب", "france"} and len(q) <= 40:
                city = q
                break
    skills: list = []
    for s in extraction.get("skills") or []:
        if isinstance(s, str) and s.strip() and s.strip().lower() not in {k.lower() for k in skills}:
            skills.append(s.strip())
    skills = skills[:40]
    return {
        "full_name": clean_text(extraction.get("full_name")) or name_from_filename(filename),
        "email": norm_email(extraction.get("email")) or None,
        "phone": clean_text(extraction.get("phone")),
        "city": city,
        "headline": headline,
        "years_experience": estimate_years(exp),
        "skills": skills,
        "profile": {k: v for k, v in extraction.items() if k not in ("ai_used",)},
    }


def find_duplicate(rows: list, email: Optional[str], phone: Optional[str]) -> Optional[dict]:
    """The earlier prospect with the same e-mail or the same phone number, if any."""
    e, p = norm_email(email), norm_phone(phone)
    for r in rows:
        if e and norm_email(r.get("email")) == e:
            return r
        if p and len(p) >= 9 and norm_phone(r.get("phone")) == p:
            return r
    return None


def plain(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", (s or "").lower()) if unicodedata.category(c) != "Mn")


def extract_cv_file(content: bytes, filename: str) -> dict:
    """Full extraction of one CV file (blocking: run it in a thread). Returns the cleaned extraction with `ai_used`."""
    from app.services.cv_parser import extract_pages_as_images, extract_raw_text, smart_extract_cv
    raw = extract_raw_text(content, filename)
    pages = extract_pages_as_images(content, filename, dpi=130)
    return smart_extract_cv(raw, pages)


def safe_ext(filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    return ext if ext in ALLOWED_EXT else ""
