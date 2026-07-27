"""
Import service — employee/intern spreadsheet import pipeline.

Pure business logic: file parsing, header mapping, value cleaning/normalization,
validation, and duplicate matching. No direct Supabase access here — that
stays in app/repositories/employee_repository.py; request/response shaping
stays in app/routers/employees.py. See app/constants/import_field_synonyms.py
for the FR/EN/AR header synonym dictionary this module matches against.
"""
import io
import re
import unicodedata
from datetime import date, datetime, timedelta
from difflib import SequenceMatcher
from typing import Any, Optional

import pandas as pd

from app.constants.import_field_synonyms import FIELD_SYNONYMS, KNOWN_IMPORT_FIELDS
from app.services.ai_service import map_import_headers

REQUIRED_FIELDS = {"full_name"}
DATE_FIELDS = {"hire_date", "birth_date", "contract_start", "contract_end", "internship_start", "internship_end"}
NUMERIC_FIELDS = {"salary"}
IDENTIFIER_FIELDS = ("cin", "email", "phone")

_EXCEL_EPOCH = date(1899, 12, 30)  # Excel's serial-date epoch (accounts for its 1900 leap-year bug)
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_BOOL_TRUE = {"yes", "oui", "true", "1", "vrai", "نعم", "y", "o"}
_BOOL_FALSE = {"no", "non", "false", "0", "faux", "لا", "n"}


# ── File parsing ─────────────────────────────────────────────────────────────

def parse_spreadsheet(content: bytes, filename: str) -> tuple[list[str], list[dict]]:
    """
    Read an uploaded .xlsx/.xls/.csv file and return (headers, rows-as-dicts).
    Headers are always read from the file's own header row — column position
    is never assumed or hardcoded, so field order in the source file doesn't matter.
    """
    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()
    buf = io.BytesIO(content)

    if ext == "csv":
        df = pd.read_csv(buf)
    elif ext == "xls":
        df = pd.read_excel(buf, engine="xlrd")
    else:
        df = pd.read_excel(buf, engine="openpyxl")

    df.columns = [str(c).strip() for c in df.columns]
    headers = [h for h in df.columns if h and not str(h).lower().startswith("unnamed:")]
    df = df[headers]

    rows: list[dict] = []
    for _, series in df.iterrows():
        rows.append({h: (None if pd.isna(series[h]) else series[h]) for h in headers})

    return headers, rows


# ── Header normalization & mapping ──────────────────────────────────────────

def normalize_header(header: str) -> str:
    """Strip accents, lowercase, collapse whitespace/punctuation for matching."""
    if not header:
        return ""
    text = str(header).strip().lower()
    text = "".join(
        c for c in unicodedata.normalize("NFKD", text)
        if not unicodedata.combining(c)
    )
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# Reverse lookup: normalized synonym -> field name (built once at import time).
_NORMALIZED_SYNONYMS: dict[str, str] = {
    normalize_header(syn): field
    for field, syns in FIELD_SYNONYMS.items()
    for syn in syns
}


def _fuzzy_match(normalized_header: str, threshold: float = 0.82) -> Optional[str]:
    """Best-effort fuzzy match against every known synonym; None if nothing clears the threshold."""
    best_field, best_score = None, 0.0
    for syn_norm, field in _NORMALIZED_SYNONYMS.items():
        score = SequenceMatcher(None, normalized_header, syn_norm).ratio()
        if score > best_score:
            best_score, best_field = score, field
    return best_field if best_score >= threshold else None


def map_columns(headers: list[str]) -> dict:
    """
    Map raw spreadsheet headers to known employee fields.
    Tier 1: exact/normalized synonym match.
    Tier 2: fuzzy match against the synonym dictionary.
    Tier 3: a single batched AI call for whatever's still ambiguous.
    Anything left unmapped stays None — those columns become custom_fields,
    never dropped.

    Returns {"mapping": {header: field_or_None}, "method": {header: "exact"|"fuzzy"|"ai"|"unmapped"}}.
    """
    mapping: dict[str, Optional[str]] = {}
    method: dict[str, str] = {}
    used_fields: set[str] = set()
    still_ambiguous: list[str] = []

    for header in headers:
        norm = normalize_header(header)
        field = _NORMALIZED_SYNONYMS.get(norm)
        if field and field not in used_fields:
            mapping[header], method[header] = field, "exact"
            used_fields.add(field)
            continue

        fuzzy_field = _fuzzy_match(norm)
        if fuzzy_field and fuzzy_field not in used_fields:
            mapping[header], method[header] = fuzzy_field, "fuzzy"
            used_fields.add(fuzzy_field)
            continue

        mapping[header], method[header] = None, "unmapped"
        still_ambiguous.append(header)

    if still_ambiguous:
        remaining_fields = [f for f in KNOWN_IMPORT_FIELDS if f not in used_fields]
        if remaining_fields:
            ai_mapping = map_import_headers(still_ambiguous, remaining_fields)
            for header, field in ai_mapping.items():
                if field and field in remaining_fields and field not in used_fields:
                    mapping[header], method[header] = field, "ai"
                    used_fields.add(field)

    return {"mapping": mapping, "method": method}


# ── Value normalization ──────────────────────────────────────────────────────

def normalize_boolean(value: Any) -> Optional[bool]:
    if value is None:
        return None
    text = str(value).strip().lower()
    if not text:
        return None
    if text in _BOOL_TRUE:
        return True
    if text in _BOOL_FALSE:
        return False
    return None


def normalize_whitespace(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value).strip())
    return text or None


def normalize_email(value: Any) -> Optional[str]:
    text = normalize_whitespace(value)
    return text.lower() if text else None


def normalize_phone(value: Any) -> Optional[str]:
    text = normalize_whitespace(value)
    if not text:
        return None
    has_plus = text.startswith("+")
    digits = re.sub(r"\D", "", text)
    if not digits:
        return None
    if has_plus:
        return "+" + digits
    if len(digits) == 10 and digits.startswith("0"):
        return "+212" + digits[1:]  # Moroccan-aware: 0XXXXXXXXX -> +212XXXXXXXXX
    if len(digits) == 9 and digits[0] in "567":
        # Excel stores phone-shaped cells as plain numbers, silently dropping
        # the leading 0 (e.g. "0612345678" -> 612345678) — recover it for the
        # common Moroccan mobile/landline prefixes.
        return "+212" + digits
    return digits


def normalize_date(value: Any) -> Optional[str]:
    """Return an ISO 'YYYY-MM-DD' string, or None if unparseable. Handles native
    date/datetime/pandas.Timestamp objects, ISO strings, DD/MM/YYYY (incl. a
    leading 'le '), MM/DD/YYYY, and Excel serial date numbers."""
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        d = value.date() if isinstance(value, datetime) else value
        return d.strftime("%Y-%m-%d")

    text = str(value).strip()
    if not text:
        return None
    text = re.sub(r"^le\s+", "", text, flags=re.IGNORECASE)

    try:
        return datetime.fromisoformat(text[:10]).strftime("%Y-%m-%d")
    except ValueError:
        pass

    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%m/%d/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    try:
        serial = float(text)
        if 1 <= serial <= 80000:  # sane bounds: ~1900-01-01 .. ~2119
            return (_EXCEL_EPOCH + timedelta(days=serial)).strftime("%Y-%m-%d")
    except ValueError:
        pass

    return None


def normalize_salary(value: Any) -> Optional[float]:
    text = normalize_whitespace(value)
    if not text:
        return None
    cleaned = re.sub(r"[^\d.,-]", "", text).replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


# ── Row cleaning ──────────────────────────────────────────────────────────────

def clean_row(raw_row: dict, mapping: dict[str, Optional[str]]) -> tuple[dict, dict, list[str]]:
    """
    Apply the column mapping + value normalization to one spreadsheet row.
    Returns (cleaned_fields, custom_fields, warnings):
    - cleaned_fields only contains keys that are real employee columns.
    - custom_fields holds every unmapped column's value (boolean-detected where
      applicable), so nothing from the source file is ever dropped.
    - warnings flags cells that had a value but failed to parse (e.g. a date
      column with unparseable text) — surfaced as row-level validation errors.
    """
    cleaned: dict[str, Any] = {}
    custom: dict[str, Any] = {}
    warnings: list[str] = []

    for header, value in raw_row.items():
        field = mapping.get(header)

        if field is None:
            bool_val = normalize_boolean(value)
            if bool_val is not None:
                custom[header] = bool_val
            else:
                text = normalize_whitespace(value)
                if text is not None:
                    custom[header] = text
            continue

        had_value = value is not None and str(value).strip() != ""

        if field in DATE_FIELDS:
            parsed = normalize_date(value)
            cleaned[field] = parsed
            if had_value and parsed is None:
                warnings.append(f"Date invalide pour « {header} » : {value!r}")
        elif field in NUMERIC_FIELDS:
            parsed = normalize_salary(value)
            cleaned[field] = parsed
            if had_value and parsed is None:
                warnings.append(f"Valeur numérique invalide pour « {header} » : {value!r}")
        elif field == "email":
            cleaned[field] = normalize_email(value)
        elif field == "phone":
            cleaned[field] = normalize_phone(value)
        else:
            cleaned[field] = normalize_whitespace(value)

    return cleaned, custom, warnings


# ── Validation ────────────────────────────────────────────────────────────────

def validate_row(cleaned: dict) -> list[str]:
    errors = []
    for field in REQUIRED_FIELDS:
        if not cleaned.get(field):
            errors.append(f"Champ requis manquant : {field}")
    if cleaned.get("email") and not _EMAIL_RE.match(cleaned["email"]):
        errors.append(f"Email invalide : {cleaned['email']}")
    return errors


# ── Duplicate detection ─────────────────────────────────────────────────────

def match_duplicates(rows: list[dict], existing_records: list[dict]) -> dict[int, dict]:
    """
    For each uploaded row (by index), check whether it matches an existing
    employee/intern record by CIN, email, or phone, and flag duplicates
    within the uploaded file itself too.

    existing_records: rows from employee_repository.find_by_identifiers —
    each must include id, status, cin, email, phone.
    """
    by_field = {
        f: {r[f]: r for r in existing_records if r.get(f)}
        for f in IDENTIFIER_FIELDS
    }

    seen_in_file: dict[str, int] = {}
    result: dict[int, dict] = {}

    for idx, row in enumerate(rows):
        matched_record, matched_on = None, None
        for field in IDENTIFIER_FIELDS:
            val = row.get(field)
            if val and val in by_field[field]:
                matched_record, matched_on = by_field[field][val], field
                break

        if matched_record:
            result[idx] = {
                "duplicate": True,
                "source": "database",
                "matched_id": matched_record["id"],
                "matched_status": matched_record.get("status"),
                "matched_on": matched_on,
            }
            continue

        for field in IDENTIFIER_FIELDS:
            val = row.get(field)
            if not val:
                continue
            key = f"{field}:{val}"
            if key in seen_in_file:
                result[idx] = {
                    "duplicate": True,
                    "source": "file",
                    "matched_row_index": seen_in_file[key],
                    "matched_on": field,
                }
                break
            seen_in_file[key] = idx

    return result


# ── Summary ──────────────────────────────────────────────────────────────────

def build_summary(row_results: list[dict]) -> dict:
    """row_results: one dict per row, each with 'errors': list[str] and an
    optional 'duplicate' dict, as assembled by the import router."""
    total = len(row_results)
    invalid = sum(1 for r in row_results if r.get("errors"))
    missing_required = sum(
        1 for r in row_results
        if any("requis" in e.lower() for e in r.get("errors", []))
    )
    # Only "database" duplicates represent a match against an existing employee/intern
    # record — in-file duplicates (two rows in the same upload conflicting with each
    # other) are a distinct category and must not be miscounted into either bucket.
    db_dups = [r for r in row_results if (r.get("duplicate") or {}).get("source") == "database"]
    dup_employee = sum(1 for r in db_dups if r["duplicate"].get("matched_status") != "intern")
    dup_intern = sum(1 for r in db_dups if r["duplicate"].get("matched_status") == "intern")
    dup_in_file = sum(1 for r in row_results if (r.get("duplicate") or {}).get("source") == "file")

    return {
        "total_rows": total,
        "valid_rows": total - invalid,
        "invalid_rows": invalid,
        "missing_required_fields": missing_required,
        "duplicate_employees": dup_employee,
        "duplicate_interns": dup_intern,
        "duplicate_in_file": dup_in_file,
    }
