"""Smart template import: find the words of an uploaded document that change from one person to the next, and map
each of them to Wedy data.

What is detected, wherever it sits in the document (even split between two lines or two styles):
  - anything between square brackets: « [Nom et Prénom] », « [N° de CIN] », « [Salaire en lettres] », « [Hybride (…)] »
  - blanks: « CIN n° ________ », « né le ........ » (the words before the blank give its meaning)
  - « Monsieur/Madame », « M./Mme » → the civility of the person
  - {{variables}} already in the document are kept

Each one is mapped to a Wedy field (name, CIN, address, position, dates, salary in figures / in words, duration…)
by its wording. What matches nothing becomes a custom field: its label and default value are kept with the template
(in an HTML comment at the top of the body) so the generation screen can ask for it by name.
"""
from __future__ import annotations

import html as _html
import json
import re
import unicodedata
from datetime import date, datetime, timedelta
from typing import Optional

ZERO_WIDTH = dict.fromkeys(map(ord, "​‌‍⁠﻿"), None)


def clean_text(s: str) -> str:
    return (s or "").translate(ZERO_WIDTH).replace(" ", " ")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", clean_text(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


# ── Wedy fields a placeholder can be mapped to ────────────────────────────────────────────────────────────

KNOWN_FIELDS: dict[str, str] = {
    "civility": "Civilité (Monsieur / Madame)",
    "civility_short": "Civilité abrégée (M. / Mme)",
    "full_name": "Nom et prénom",
    "cin": "N° de CIN",
    "address": "Adresse",
    "city": "Ville",
    "birth_date": "Date de naissance",
    "nationality": "Nationalité",
    "email": "E-mail",
    "phone": "Téléphone",
    "matricule": "Matricule",
    "cnss_number": "N° CNSS",
    "bank_account": "RIB / compte bancaire",
    "position": "Poste / mission",
    "department": "Département / service",
    "manager": "Encadrant / responsable",
    "school": "École / établissement",
    "contract_type": "Type de contrat",
    "hire_date": "Date d'embauche",
    "contract_start": "Date de début",
    "contract_end": "Date de fin",
    "duration": "Durée (calculée avec les dates)",
    "salary": "Salaire (avec MAD)",
    "salary_figures": "Salaire en chiffres",
    "salary_words": "Salaire en lettres",
    "work_mode": "Mode de travail",
    "today": "Date du jour",
    "company": "Nom de la société",
    "company_address": "Adresse de la société",
    "company_city": "Ville de la société",
}

# (pattern on the normalized label, field). First match wins: the precise wordings come before the general ones.
_RULES: list[tuple[str, str]] = [
    (r"\b(civilite|monsieur madame|madame monsieur|m mme|mr mme|mme m)\b", "civility"),
    (r"\ben lettres?\b|\btoutes lettres\b", "salary_words"),
    (r"\ben chiffres?\b", "salary_figures"),
    (r"\b(nom (et|&) prenoms?|prenoms? (et|&) nom|nom complet|nom du (salarie|stagiaire|beneficiaire|candidat)|stagiaire|salarie|interesse|beneficiaire)\b", "full_name"),
    (r"\b(cin|cni|carte nationale|piece d identite)\b", "cin"),
    (r"\bdate de naissance\b|\bne( e)? le\b|\bnee le\b", "birth_date"),
    (r"\b(adresse|domicile|residence|demeurant)\b", "address"),
    (r"\bville\b", "city"),
    (r"\bnationalite\b", "nationality"),
    (r"\b(e mail|email|courriel)\b", "email"),
    (r"\b(telephone|tel|gsm|portable)\b", "phone"),
    (r"\bmatricule\b", "matricule"),
    (r"\bcnss\b", "cnss_number"),
    (r"\b(rib|iban|compte bancaire)\b", "bank_account"),
    (r"\b(duree|periode de stage)\b", "duration"),
    (r"\b(date de debut|date d effet|prise d effet|debut du (contrat|stage)|a compter du)\b", "contract_start"),
    (r"\b(date de fin|date d echeance|fin du (contrat|stage)|date d expiration|echeance)\b", "contract_end"),
    (r"\b(date d embauche|date d entree|entree en (fonction|service))\b", "hire_date"),
    (r"\b(date de redaction|date de signature|date du jour|date d aujourd hui|fait le)\b|^date$", "today"),
    (r"\b(intitule du poste|poste|fonction|emploi|qualite|mission|profil)\b", "position"),
    (r"\b(departement|service|direction|pole|entite)\b", "department"),
    (r"\b(encadrant|tuteur|manager|responsable|superieur)\b", "manager"),
    (r"\b(ecole|etablissement|universite|institut|faculte)\b", "school"),
    (r"\b(type de contrat|nature du contrat)\b", "contract_type"),
    (r"\b(mode de travail|hybride|presentiel|teletravail|a distance)\b", "work_mode"),
    (r"\b(salaire|remuneration|montant|gratification|indemnite|brut|net)\b", "salary"),
    (r"\b(societe|entreprise|employeur)\b", "company"),
]


def map_label(label: str, after: str = "") -> Optional[str]:
    """The Wedy field a placeholder's wording designates, or None. `after` is the text right after it (« MAD »…)."""
    n = norm(label)
    if not n:
        return None
    for pat, key in _RULES:
        if re.search(pat, n):
            if key == "salary" and re.match(r"\s*(mad|dh|dhs|dirhams?)\b", norm(after)):
                return "salary_figures"  # « [Salaire] MAD »: the currency is already written
            return key
    return None


def slug_key(label: str) -> str:
    s = norm(label).replace(" ", "_")[:40].strip("_")
    return f"f_{s or 'champ'}"


# ── finding the placeholders in a text ────────────────────────────────────────────────────────────────────

_BRACKET = re.compile(r"\[([^\[\]\n]{1,90})\]")
_CURLY = re.compile(r"\{\{\s*([A-Za-z_]\w*)\s*\}\}")
_BLANK = re.compile(r"_{4,}|\.{6,}|…{3,}")
_CIVILITY = re.compile(r"\b(?:Monsieur\s*/\s*Madame|Madame\s*/\s*Monsieur|M\.?\s*/\s*Mme\.?|Mr\.?\s*/\s*Mme\.?)(?![\w/])", re.IGNORECASE)


KEEP = "__keep__"  # mapping value: leave the placeholder's text unchanged


def find_placeholders(text: str) -> list[dict]:
    """Every placeholder of a plain text, in order: {start, end, raw, label, kind}. Overlaps keep the first found."""
    found: list[dict] = []
    for m in _CURLY.finditer(text):
        found.append({"start": m.start(), "end": m.end(), "raw": m.group(0), "label": m.group(1), "kind": "variable"})
    for m in _BRACKET.finditer(text):
        label = clean_text(m.group(1)).strip()
        if label and not re.fullmatch(r"[\d\s.,/-]*", label):  # « [1] », « [12/2026] » are references, not fields
            found.append({"start": m.start(), "end": m.end(), "raw": m.group(0), "label": re.sub(r"\s+", " ", label), "kind": "bracket"})
    for m in _CIVILITY.finditer(text):
        found.append({"start": m.start(), "end": m.end(), "raw": m.group(0), "label": "Monsieur/Madame", "kind": "civility"})
    for m in _BLANK.finditer(text):
        before = text[max(0, m.start() - 40):m.start()]
        words = re.findall(r"[\wÀ-ÿ'°]+", before.split("\n")[-1])[-4:]
        label = " ".join(words).strip(" :") or "Champ à remplir"
        found.append({"start": m.start(), "end": m.end(), "raw": m.group(0), "label": label, "kind": "blank"})
    found.sort(key=lambda d: (d["start"], -(d["end"] - d["start"])))
    out, last_end = [], -1
    for d in found:
        if d["start"] >= last_end:
            out.append(d)
            last_end = d["end"]
    return out


def resolve(ph: dict, text: str, mapping: Optional[dict] = None) -> str:
    """The variable a placeholder becomes: the user's choice, else the mapping by wording, else a custom field."""
    if mapping and ph["raw"] in mapping and mapping[ph["raw"]]:
        return re.sub(r"\W", "_", str(mapping[ph["raw"]]))[:48]
    if ph["kind"] == "variable":
        return ph["label"]
    if ph["kind"] == "civility":  # « M./Mme » keeps the short form of the document
        return "civility" if re.match(r"(monsieur|madame)", ph["raw"], re.IGNORECASE) else "civility_short"
    return map_label(ph["label"], text[ph["end"]:ph["end"] + 12]) or slug_key(ph["label"])


# ── replacing them inside HTML (text split between tags is handled) ─────────────────────────────────────

_TAG = re.compile(r"(<[^>]+>)")
_BLOCK = re.compile(r"^</?(p|div|h[1-6]|li|ul|ol|tr|td|th|table|br|hr|section|article)\b", re.IGNORECASE)


def _text_runs(body: str):
    """(parts, runs, plain): parts = HTML split into tags / texts; runs = [(part index, start in plain, text)]."""
    parts = _TAG.split(body)
    runs, plain, skip = [], [], False
    pos = 0
    for i, part in enumerate(parts):
        if i % 2:  # a tag
            low = part.lower()
            if low.startswith("<style") or low.startswith("<script"):
                skip = True
            elif low.startswith("</style") or low.startswith("</script"):
                skip = False
            if _BLOCK.match(part):
                plain.append("\n")
                pos += 1
            continue
        if skip or not part:
            continue
        text = clean_text(_html.unescape(part))
        runs.append((i, pos, text))
        plain.append(text)
        pos += len(text)
    return parts, runs, "".join(plain)


def analyse_html(body: str, mapping: Optional[dict] = None) -> list[dict]:
    """The fields of an HTML body: [{placeholder, label, key, known, count, kind, default}] in order of appearance."""
    _, _, plain = _text_runs(body)
    fields: dict[str, dict] = {}
    for ph in find_placeholders(plain):
        if mapping and mapping.get(ph["raw"]) == KEEP:
            continue
        key = resolve(ph, plain, mapping)
        f = fields.setdefault(ph["raw"], {
            "placeholder": ph["raw"], "label": ph["label"], "key": key, "known": key in KNOWN_FIELDS,
            "count": 0, "kind": ph["kind"], "default": default_for(key, ph["label"]),
        })
        f["count"] += 1
    return list(fields.values())


def default_for(key: str, label: str) -> str:
    """A value to propose for a custom field: « [Hybride (présentiel et télétravail)] » proposes itself."""
    if key == "work_mode":
        return label
    return ""


def apply_fields(body: str, mapping: Optional[dict] = None) -> str:
    """Replace every placeholder of an HTML body by its {{variable}} (and drop the zero-width characters)."""
    parts, runs, plain = _text_runs(body)
    texts = {i: t for i, _, t in runs}
    starts = [(i, s, len(t)) for i, s, t in runs]

    def locate(off: int, end_side: bool):
        for i, s, n in starts:
            if s <= off < s + n or (end_side and off == s + n and n):
                return i, off - s
        return None

    for ph in reversed(find_placeholders(plain)):
        if mapping and mapping.get(ph["raw"]) == KEEP:
            continue  # the user wants this text left as it is
        a, b = locate(ph["start"], False), locate(ph["end"], True)
        if not a or not b:
            continue  # crosses a paragraph: left as text
        token = "{{" + resolve(ph, plain, mapping) + "}}"
        (ia, oa), (ib, ob) = a, b
        if ia == ib:
            texts[ia] = texts[ia][:oa] + token + texts[ia][ob:]
        else:
            texts[ia] = texts[ia][:oa] + token
            for i, _, _ in runs:
                if ia < i < ib:
                    texts[i] = ""
            texts[ib] = texts[ib][ob:]
    for i, t in texts.items():
        parts[i] = _html.escape(t, quote=False)
    return "".join(parts)


# ── field labels / defaults kept with the template ────────────────────────────────────────────────────────

_META = re.compile(r"^\s*<!--wedy-fields:(.*?)-->", re.DOTALL)


def with_meta(body: str, fields: list[dict]) -> str:
    """Put the labels / defaults of the custom fields at the top of the body (an HTML comment, invisible)."""
    meta = {f["key"]: {"label": f["label"], "default": f.get("default", "")} for f in fields
            if f["key"] not in KNOWN_FIELDS or f.get("default")}
    body = strip_meta(body)
    if not meta:
        return body
    return f"<!--wedy-fields:{json.dumps(meta, ensure_ascii=False)}-->" + body


def read_meta(body: str) -> dict:
    m = _META.match(body or "")
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except ValueError:
        return {}


def strip_meta(body: str) -> str:
    return _META.sub("", body or "", count=1)


# ── values computed at generation ─────────────────────────────────────────────────────────────────────────

_UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
          "treize", "quatorze", "quinze", "seize"]
_TENS = {2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante"}


def _below_100(n: int) -> str:
    if n <= 16:
        return _UNITS[n]
    if n < 20:
        return "dix-" + _UNITS[n - 10]
    t, u = divmod(n, 10)
    if t in (7, 9):  # soixante-dix…, quatre-vingt-dix…
        base = "soixante" if t == 7 else "quatre-vingt"
        rest = 10 + u
        if t == 7 and u == 1:
            return "soixante et onze"
        return f"{base}-{_below_100(rest)}"
    if t == 8:
        return "quatre-vingts" if u == 0 else f"quatre-vingt-{_UNITS[u]}"
    word = _TENS[t]
    if u == 0:
        return word
    if u == 1:
        return f"{word} et un"
    return f"{word}-{_UNITS[u]}"


def _below_1000(n: int, plural_ok: bool = True) -> str:
    h, r = divmod(n, 100)
    parts = []
    if h:
        parts.append("cent" if h == 1 else f"{_UNITS[h]} cent{'s' if (r == 0 and plural_ok) else ''}")
    if r:
        w = _below_100(r)
        if not plural_ok and w.endswith("quatre-vingts"):
            w = w[:-1]
        parts.append(w)
    return " ".join(parts) if parts else "zéro"


def number_to_french(n: int) -> str:
    """3500 → « trois mille cinq cents »; 80 000 → « quatre-vingt mille »; 1 200 000 → « un million deux cent mille »."""
    if n < 0:
        return "moins " + number_to_french(-n)
    if n < 1000:
        return _below_1000(n)
    words = []
    millions, rest = divmod(n, 1_000_000)
    if millions:
        words.append(f"{number_to_french(millions)} million{'s' if millions > 1 else ''}")
    thousands, rest = divmod(rest, 1000)
    if thousands:
        words.append("mille" if thousands == 1 else f"{_below_1000(thousands, plural_ok=False)} mille")
    if rest:
        words.append(_below_1000(rest))
    return " ".join(words)


def salary_figures(amount) -> str:
    """3500 → « 3 500 »; 3500.5 → « 3 500,50 » (French grouping, no currency)."""
    try:
        v = float(amount)
    except (TypeError, ValueError):
        return ""
    whole, cents = int(v), round((v - int(v)) * 100)
    s = f"{whole:,}".replace(",", " ")
    return f"{s},{cents:02d}" if cents else s


def salary_words(amount) -> str:
    try:
        v = float(amount)
    except (TypeError, ValueError):
        return ""
    whole, cents = int(v), round((v - int(v)) * 100)
    return number_to_french(whole) + (f" virgule {number_to_french(cents)}" if cents else "")


def _as_date(v) -> Optional[date]:
    if not v:
        return None
    if isinstance(v, date):
        return v
    s = str(v)[:10]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def duration_text(start, end) -> str:
    """01/09/2026 → 31/12/2026 = « 4 mois »; 01/01 → 31/12 = « 1 an »; with the remaining days when it is not round."""
    a, b = _as_date(start), _as_date(end)
    if not a or not b or b < a:
        return ""
    b = b + timedelta(days=1)  # the end day is worked
    months = (b.year - a.year) * 12 + (b.month - a.month)
    if b.day < a.day:
        months -= 1
    y, m = a.year + (a.month - 1 + months) // 12, (a.month - 1 + months) % 12 + 1
    try:
        anchor = a.replace(year=y, month=m)
    except ValueError:  # 31 → a shorter month
        anchor = (date(y, m % 12 + 1, 1) if m < 12 else date(y + 1, 1, 1)) - timedelta(days=1)
    days = (b - anchor).days
    if days == 1:  # « du 19/08 au 19/11 » is 3 months too (end day not counted): one day off is a round duration
        days = 0
    parts = []
    if months >= 12 and months % 12 == 0:
        yrs = months // 12
        parts.append(f"{yrs} an{'s' if yrs > 1 else ''}")
    elif months:
        parts.append(f"{months} mois")
    if days > 0:
        parts.append(f"{days} jour{'s' if days > 1 else ''}")
    if not parts:
        return ""
    return " et ".join(parts)


# ── agreement with the civility (« intégré(e) », « il/elle ») ─────────────────────────────────────────────

_SHORT = {"monsieur": "M.", "madame": "Mme"}
_LONG = {"m.": "Monsieur", "m": "Monsieur", "mr": "Monsieur", "mr.": "Monsieur", "mme": "Madame", "mme.": "Madame"}


def civility_pair(civility: str = "", short: str = "") -> tuple[str, str]:
    """(Monsieur|Madame|"", M.|Mme|"") from whichever of the two was given."""
    c, s = (civility or "").strip(), (short or "").strip()
    if not c and s.lower() in _LONG:
        c = _LONG[s.lower()]
    if not s and c.lower() in _SHORT:
        s = _SHORT[c.lower()]
    return (c if c.lower() in _SHORT else "", s if s.lower().rstrip(".") in ("m", "mme", "mr") else "")


_PAIRS = [("il/elle", "il", "elle"), ("elle/il", "il", "elle"), ("le/la", "le", "la"), ("la/le", "le", "la"),
          ("lui/elle", "lui", "elle"), ("celui/celle", "celui", "celle"), ("du/de la", "du", "de la")]


def agree(html: str, civility: str) -> str:
    """Write the text for a man or a woman: « intégré(e) » → intégré / intégrée, « il/elle » → il / elle.
    Only the written text is changed (not the tags), and only when the civility is known."""
    fem = {"monsieur": False, "madame": True}.get((civility or "").strip().lower())
    if fem is None:
        return html

    def fix(text: str) -> str:
        text = re.sub(r"(\w)\((e)\)(s?)(?!\w)", lambda m: m.group(1) + ("e" if fem else "") + m.group(3), text)
        for pair, masc, femi in _PAIRS:
            def repl(m, masc=masc, femi=femi):
                word = femi if fem else masc
                return word[0].upper() + word[1:] if m.group(0)[0].isupper() else word
            text = re.sub(r"\b" + re.escape(pair).replace("/", r"\s*/\s*") + r"\b", repl, text, flags=re.IGNORECASE)
        return text

    parts = _TAG.split(html)
    for i in range(0, len(parts), 2):
        parts[i] = fix(parts[i])
    return "".join(parts)
