"""
PDF → HTML Template Extractor  v4  (Render + Overlay)
======================================================
Strategy:
  1. Render each PDF page as a high-quality JPEG image  →  exact visual copy
  2. Extract text blocks with bounding boxes (PyMuPDF dict mode)
  3. Detect variable placeholder text (e.g. [Nom et prénom])
  4. White-out those text regions on the JPEG using Pillow
  5. Overlay absolutely-positioned  {{variable}}  divs at exact PDF coordinates
  6. Jinja2 fills the variables at generation time; the background stays unchanged

Result: the imported template looks IDENTICAL to the original PDF,
        with dynamic fields shown as highlighted blue placeholders.
"""

import re
import base64
import io
import statistics
from contextvars import ContextVar
from typing import Optional

try:
    import fitz                         # PyMuPDF ≥ 1.18
    _HAS_FITZ = True
except ImportError:
    _HAS_FITZ = False

try:
    from PIL import Image, ImageDraw    # Pillow
    _HAS_PIL = True
except ImportError:
    _HAS_PIL = False


# ── Variable substitution table ───────────────────────────────────────────────
# Maps PDF placeholder patterns  →  Jinja2 {{variable}} tokens
# All patterns are applied with re.IGNORECASE.

_VAR_SUBS = [
    # ── Full name ─────────────────────────────────────────────────────────────
    # bracket / parenthesis variants
    (r"\[Nom\s+et\s+[Pp]r[ée]noms?\s+du\s+stagiaire[^\]]*\]",  "{{full_name}}"),
    (r"\[Nom\s+et\s+[Pp]r[ée]noms?\s*\]",                      "{{full_name}}"),
    (r"\[[Pp]r[ée]noms?\s+et\s+[Nn]om[^\]]*\]",                "{{full_name}}"),
    (r"\[[Nn]om\s+[Pp]r[ée]nom[^\]]*\]",                       "{{full_name}}"),
    (r"\[[Nn]om\s+[Cc]omplet[^\]]*\]",                         "{{full_name}}"),
    (r"\[[Ii]ntitul[ée]\s+nom[^\]]*\]",                        "{{full_name}}"),
    (r"\[[Ll]e\s+nomm[ée][^\]]*\]",                            "{{full_name}}"),
    (r"\[[Ll]'int[ée]ress[ée][^\]]*\]",                        "{{full_name}}"),
    (r"\[[Bb][ée]n[ée]ficiaire[^\]]*\]",                       "{{full_name}}"),
    (r"\[[Ss]alarié[^\]]*\]",                                   "{{full_name}}"),
    (r"\[[Ss]tagiai?re[^\]]*\]",                                "{{full_name}}"),
    (r"\(Nom\s*[Ee]t?\s*Pr[ée]nom\)",                          "{{full_name}}"),
    (r"\(Nom\s+Pr[ée]nom\)",                                    "{{full_name}}"),
    (r"\[full[_\s]?name\]",                                     "{{full_name}}"),
    # Arabic
    (r"\[الاسم\s+الكامل\]",                                     "{{full_name}}"),
    (r"\[اسم\s+ولقب\]",                                        "{{full_name}}"),
    (r"\[الاسم\s+واللقب\]",                                    "{{full_name}}"),

    # ── CIN ───────────────────────────────────────────────────────────────────
    (r"\[Num[ée]ro\s+(?:de\s+la\s+)?CIN[^\]]*\]",             "{{cin}}"),
    (r"\[N°?\s*CIN[^\]]*\]",                                   "{{cin}}"),
    (r"\[CIN\s*[^\]]*\]",                                      "{{cin}}"),
    (r"\(CIN[^\)]*\)",                                          "{{cin}}"),
    (r"\[Carte\s+[Nn]ationale[^\]]*\]",                        "{{cin}}"),
    (r"\[CNI[^\]]*\]",                                          "{{cin}}"),
    (r"\[cin\b[^\]]*\]",                                        "{{cin}}"),
    (r"\[رقم\s+(?:بطاقة\s+)?(?:التعريف\s+)?(?:الوطنية?|الهوية)[^\]]*\]", "{{cin}}"),

    # ── Hire / start date ─────────────────────────────────────────────────────
    (r"\[date\s+d[''`]?embauche[^\]]*\]",                      "{{hire_date}}"),
    (r"\[date\s+d[''`]?entr[ée]e[^\]]*\]",                    "{{hire_date}}"),
    (r"\[date\s+d[''`]?entr[ée]e\s+en\s+(?:service|fonction)[^\]]*\]", "{{hire_date}}"),
    (r"\[date\s+de\s+prise\s+d[''`]?effet[^\]]*\]",            "{{hire_date}}"),
    (r"\[date\s+de\s+d[ée]but[^\]]*\]",                        "{{contract_start}}"),
    (r"\[date\s+d[''`]?effet[^\]]*\]",                         "{{contract_start}}"),
    (r"\[date\s+de\s+signature[^\]]*\]",                        "{{today}}"),
    (r"\[date\s+de\s+fin(?:\s*/?[^\]]*)\]",                    "{{contract_end}}"),
    (r"\[date\s+d[''`]?[ée]ch[ée]ance[^\]]*\]",               "{{contract_end}}"),
    (r"\[date\s+d[''`]?expiration[^\]]*\]",                    "{{contract_end}}"),
    (r"\[Date\s*\]",                                            "{{today}}"),
    (r"\[date\s*\]",                                            "{{today}}"),
    # Arabic dates
    (r"\[تاريخ\s+(?:الالتحاق|التوظيف)[^\]]*\]",               "{{hire_date}}"),
    (r"\[تاريخ\s+البداية[^\]]*\]",                             "{{contract_start}}"),
    (r"\[تاريخ\s+النهاية[^\]]*\]",                             "{{contract_end}}"),
    (r"\[تاريخ[^\]]*\]",                                        "{{today}}"),

    # ── Position / Poste ──────────────────────────────────────────────────────
    (r"\[poste\s+occup[ée][^\]]*\]",                           "{{position}}"),
    (r"\[intitul[ée]\s+du\s+poste[^\]]*\]",                   "{{position}}"),
    (r"\[intitul[ée]\s+de\s+(?:l[''`]?)?emploi[^\]]*\]",      "{{position}}"),
    (r"\[fonction[^\]]*\]",                                    "{{position}}"),
    (r"\[emploi[^\]]*\]",                                      "{{position}}"),
    (r"\[grade[^\]]*\]",                                       "{{position}}"),
    (r"\[titre[^\]]*\]",                                       "{{position}}"),
    (r"\[poste[^\]]*\]",                                       "{{position}}"),
    (r"\[المنصب[^\]]*\]",                                      "{{position}}"),
    (r"\[الوظيفة[^\]]*\]",                                     "{{position}}"),

    # ── Department ────────────────────────────────────────────────────────────
    (r"\[d[ée]partement[^\]]*\]",                              "{{department}}"),
    (r"\[service\s*/?\s*d[ée]partement[^\]]*\]",               "{{department}}"),
    (r"\[service[^\]]*\]",                                     "{{department}}"),
    (r"\[direction[^\]]*\]",                                   "{{department}}"),
    (r"\[entit[ée][^\]]*\]",                                   "{{department}}"),
    (r"\[structure[^\]]*\]",                                   "{{department}}"),
    (r"\[القسم[^\]]*\]",                                       "{{department}}"),
    (r"\[الإدارة[^\]]*\]",                                     "{{department}}"),

    # ── Salary ────────────────────────────────────────────────────────────────
    (r"\[montant\s+en\s+dirhams[^\]]*\]",                      "{{salary}}"),
    (r"\[salaire\s+(?:mensuel\s+)?(?:brut|net|de\s+base)[^\]]*\]", "{{salary}}"),
    (r"\[r[ée]mun[ée]ration[^\]]*\]",                          "{{salary}}"),
    (r"\[montant[^\]]*\]",                                     "{{salary}}"),
    (r"\[salaire[^\]]*\]",                                     "{{salary}}"),
    (r"\[الراتب[^\]]*\]",                                      "{{salary}}"),
    (r"\[الأجر[^\]]*\]",                                       "{{salary}}"),

    # ── Contact ───────────────────────────────────────────────────────────────
    (r"\[adresse\s+(?:postale|domicile|complète)?[^\]]*\]",    "{{address}}"),
    (r"\(adresse[^\)]*\)",                                      "{{address}}"),
    (r"\[domicile[^\]]*\]",                                    "{{address}}"),
    (r"\[adresse[^\]]*\]",                                     "{{address}}"),
    (r"\[ville[^\]]*\]",                                       "{{city}}"),
    (r"\[email[^\]]*\]",                                       "{{email}}"),
    (r"\[e[-\s]?mail[^\]]*\]",                                 "{{email}}"),
    (r"\[courriel[^\]]*\]",                                    "{{email}}"),
    (r"\[t[ée]l[ée]phone\s*(?:mobile|personnel|professionnel)?[^\]]*\]", "{{phone}}"),
    (r"\[t[ée]l\.?[^\]]*\]",                                   "{{phone}}"),
    (r"\[gsm[^\]]*\]",                                         "{{phone}}"),

    # ── Manager ───────────────────────────────────────────────────────────────
    (r"\[manager[^\]]*\]",                                     "{{manager}}"),
    (r"\[responsable\s+(?:hi[ée]rarchique)?[^\]]*\]",          "{{manager}}"),
    (r"\[sup[ée]rieur[^\]]*\]",                                "{{manager}}"),
    (r"\[encadrant[^\]]*\]",                                   "{{manager}}"),

    # ── Matricule ─────────────────────────────────────────────────────────────
    (r"\[matricule[^\]]*\]",                                   "{{matricule}}"),
    (r"\[num[ée]ro\s+d[''`]?employ[ée][^\]]*\]",              "{{matricule}}"),
    (r"\[id\s+employ[ée][^\]]*\]",                             "{{matricule}}"),

    # ── Contract type ─────────────────────────────────────────────────────────
    (r"\[type\s+(?:de\s+)?contrat[^\]]*\]",                   "{{contract_type}}"),
    (r"\[nature\s+(?:du\s+)?contrat[^\]]*\]",                 "{{contract_type}}"),

    # ── Nationality ───────────────────────────────────────────────────────────
    (r"\[nationalit[ée][^\]]*\]",                              "{{nationality}}"),
    (r"\[الجنسية[^\]]*\]",                                     "{{nationality}}"),
]


def _apply_vars(text: str) -> str:
    """Apply bracket-style placeholder patterns to a plain-text string."""
    for pattern, replacement in _VAR_SUBS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


# ── Contextual patterns for filled-in documents ───────────────────────────────
# Detect REAL data (names, CIN numbers, dates, positions) by context.
# Applied ONLY when bracket-pattern substitution found nothing.

_D = r"\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}"   # date shorthand

_CONTEXTUAL_SUBS: list[tuple] = [
    # ── CIN — 1-2 uppercase letters + 5-7 digits ─────────────────────────────
    (r"(CIN\s*N?°?\s*:?\s*)([A-Z]{1,2}\d{5,7})\b",
     r"\1{{cin}}", re.IGNORECASE),

    # ── Employee name after "M. / Mme" at start of line (ALL-CAPS names) ─────
    (r"^(\s*[-–]\s*M(?:me)?\.?\s*:?\s+)([A-Z\xc0-\xd6\xd8-\xde][A-Z\xc0-\xd6\xd8-\xde\s]+)\s*$",
     r"\1{{full_name}}", re.MULTILINE),

    # ── Employee name: "M. NAME" — now accepts mixed-case (≥8 chars) ──────────
    (r"^(M(?:me)?\.?\s+)([A-Z\xc0-\xd6\xd8-\xde][\w\xc0-\xff\s]{6,})\s*$",
     r"\1{{full_name}}", re.MULTILINE),

    # ── Hire date: "à compter du DATE" or "depuis le DATE" ───────────────────
    (r"(\xe0\s+compter\s+du\s+)(" + _D + r")", r"\1{{hire_date}}", re.IGNORECASE),
    (r"(depuis\s+le\s+)(" + _D + r")",          r"\1{{hire_date}}", re.IGNORECASE),

    # ── Date range: "DATE au DATE" → hire_date … contract_end ────────────────
    (r"(" + _D + r")(\s+au\s+)(" + _D + r")",
     r"{{hire_date}}\2{{contract_end}}", re.IGNORECASE),

    # ── "Jusqu'à présent" ─────────────────────────────────────────────────────
    (r"jusqu[''`]?à\s+pr[e\xe9]sent\b", r"{{contract_end}}", re.IGNORECASE),

    # ── Birth date after "né le" / "née le" ──────────────────────────────────
    (r"(n[e\xe9]e?\s+le\s+)(" + _D + r")", r"\1{{birth_date}}", re.IGNORECASE),

    # ── Address after "Demeurant à" ───────────────────────────────────────────
    (r"(demeurant\s+\xe0\s+)(.{3,60}?)\s*$", r"\1{{address}}", re.IGNORECASE | re.MULTILINE),

    # ── Position with French guillemets «…» ──────────────────────────────────
    (r"(en\s+(?:sa\s+)?qualit[e\xe9]\s+de\s*[««]\s*)(.{2,60}?)(\s*[»»])",
     r"\1{{position}}\3", re.IGNORECASE),

    # ── Position after "en qualité de" — mixed-case (≥4 chars, stops at conjunctions) ─
    (r"(en\s+(?:sa\s+)?qualit[e\xe9]\s+de\s+)([\w\xc0-\xff][\w\xc0-\xff\s/\-]{3,50}?)(\s+(?:du|au|depuis|au\s+sein|à\s+compter)|,|\.|\s*$)",
     r"\1{{position}}\3", re.IGNORECASE),

    # ── Salary: "salaire mensuel (net|brut) (sera|est) de X (dirhams|MAD)" ───
    (r"(salaire\s+mensuel\s+(?:net|brut)?\s+(?:sera|est)\s+de\s+)([\d\s,\.]+?)\s*(dirhams?|MAD|dhs?\.?)\b",
     r"\1{{salary}} \3", re.IGNORECASE),

    # ── Today's date: "Fait à CITY, le DATE" ─────────────────────────────────
    (r"(Fait(?:\s+en\s+double\s+exemplaire)?\s+\xe0\s+[\w\s]+,?\s+le\s+)(" + _D + r")",
     r"\1{{today}}", re.IGNORECASE),

    # ── Employee name: "M. FIRSTNAME LASTNAME, titulaire/effectue/occupe" ─────
    # Handles mid-sentence names (not at end of line) — e.g. filled-in PDFs
    (r"(M(?:me)?\.?\s{0,2})"
     r"([A-Z\xc0-\xd6\xd8-\xde][\w\xc0-\xff]{1,20}"
     r"(?:\s+[A-Z\xc0-\xd6\xd8-\xde][\w\xc0-\xff]{1,20}){0,3})"
     r"(\s*,\s+(?:titulaire|effectue|occupe|n[e\xe9]e?|stagiaire))",
     r"\1{{full_name}}\3", re.MULTILINE),

    # ── Department after "au/du département …" ────────────────────────────────
    (r"((?:au|du|de\s+la?)\s+d[e\xe9]partement\s+)"
     r"([\w\xc0-\xff][\w\xc0-\xff\s/\-]{2,50}?)"
     r"(\s*[.,\n]|\s*$)",
     r"\1{{department}}\3", re.IGNORECASE | re.MULTILINE),
]


def _apply_contextual_vars(text: str) -> str:
    """Detect and replace real HR data (names, dates, depts) by surrounding context."""
    for item in _CONTEXTUAL_SUBS:
        pat, repl, flags = item
        try:
            text = re.sub(pat, repl, text, flags=flags)
        except re.error:
            pass
    return text


# The smart import (template_fields) finds the fields itself on the extracted HTML: the legacy substitutions are then
# turned off so they do not map « [Salaire en lettres] » to the salary in figures before it gets the chance.
_LEGACY_SUBST: ContextVar[bool] = ContextVar("legacy_subst", default=True)


def _apply_all(text: str) -> str:
    """Apply bracket patterns then contextual patterns (always both)."""
    if not _LEGACY_SUBST.get():
        return text
    result = _apply_vars(text)
    result = _apply_contextual_vars(result)
    return result


def _extract_vars_from(token: str) -> list[str]:
    return re.findall(r"\{\{(\w+)\}\}", token)


# ── Public API ────────────────────────────────────────────────────────────────

def extract_pdf_template(file_bytes: bytes, filename: str = "template.pdf") -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        return _extract_from_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        return _extract_from_docx(file_bytes)
    else:
        return _plain_fallback(file_bytes.decode("utf-8", errors="replace"))


def extract_template_smart(file_bytes: bytes, filename: str = "template.pdf") -> str:
    """The document as editable HTML with its original wording (fields are found afterwards by template_fields).

    A PDF with a text layer is rebuilt as flowing text (titles, bold, lists, the two signature columns), so a long
    name or address simply wraps; a scanned PDF (no text) keeps the page image with the legacy overlays."""
    ext = filename.rsplit(".", 1)[-1].lower()
    token = _LEGACY_SUBST.set(False)
    try:
        if ext == "pdf":
            flow = _pdf_to_flow_html(file_bytes)
            if flow:
                return flow
            _LEGACY_SUBST.reset(token)
            token = _LEGACY_SUBST.set(True)
            return _extract_from_pdf(file_bytes)
        if ext in ("docx", "doc"):
            return _extract_from_docx(file_bytes)
        return _plain_fallback(file_bytes.decode("utf-8", errors="replace"))
    finally:
        _LEGACY_SUBST.reset(token)


_ZW = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff"), None)
_BULLETS = ("●", "•", "▪", "◦", "–", "-", "*", "➢", "✓")


def _pdf_to_flow_html(file_bytes: bytes) -> Optional[str]:
    """Rebuild a text PDF as flowing HTML, or None when it has (almost) no text (a scan).

    Kept from the original: titles and sizes, bold / italic, centred lines, blocks set to the right (signatures),
    short lines kept as lines (addresses, signature blocks), bullet lists, two-column lines, the images (logo)
    at their place, the main font (serif or sans)."""
    if not _HAS_FITZ:
        return None
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception:
        return None
    pages = []
    sizes: list[float] = []
    fonts: dict[str, int] = {}
    for page in doc:
        spans, images = [], []
        pw, ph = page.rect.width, page.rect.height
        for blk in page.get_text("dict").get("blocks", []):
            if blk.get("type") == 1:  # an image: kept as a picture of its area (exact look, rotation included)
                x0, y0, x1, y1 = blk["bbox"]
                w, h = x1 - x0, y1 - y0
                if w < 8 or h < 8 or w * h > pw * ph * 0.6:
                    continue
                try:
                    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=fitz.Rect(blk["bbox"]), alpha=False)
                    data = base64.b64encode(pix.tobytes("png")).decode()
                except Exception:
                    continue
                images.append({"x0": x0, "x1": x1, "top": y0, "bottom": y1, "w": w, "data": data})
                continue
            if blk.get("type") != 0:
                continue
            for ln in blk.get("lines", []):
                for sp in ln.get("spans", []):
                    raw = (sp.get("text") or "").replace(" ", " ")
                    # Google Docs writes some spaces as pairs of zero-width spaces: two or more of them are a space
                    lead = len(raw) - len(raw.lstrip("​"))
                    trail = len(raw) - len(raw.rstrip("​"))
                    text = re.sub("​{2,}", " ", raw.strip("​")).translate(_ZW)
                    if not text.strip():
                        continue
                    x0, y0, x1, y1 = sp["bbox"]
                    size = sp.get("size", 11)
                    font = (sp.get("font") or "").lower()
                    spans.append({"x0": x0, "x1": x1, "y0": y0, "y1": y1, "yc": (y0 + y1) / 2, "size": size, "text": text,
                                  "zw": (lead, trail),
                                  "bold": bool(sp.get("flags", 0) & 16) or "bold" in font,
                                  "italic": bool(sp.get("flags", 0) & 2) or "italic" in font or "oblique" in font})
                    n = len(text.strip())
                    sizes.extend([size] * n)
                    fam = "serif" if re.search(r"times|serif|georgia|garamond|cambria|book|roman", font) else "sans"
                    fonts[fam] = fonts.get(fam, 0) + n
        pages.append((pw, spans, images))
    if len(sizes) < 120:
        return None
    body = statistics.median(sizes)
    serif = fonts.get("serif", 0) > fonts.get("sans", 0)

    def plain(segs):
        return "".join(t for t, _, _ in segs).strip()

    def to_html(segs):
        merged = []
        for t, b, i in segs:
            if merged and t != "\n" and merged[-1][0] != "\n" and merged[-1][1] == b and merged[-1][2] == i:
                merged[-1] = (merged[-1][0] + t, b, i)
            else:
                merged.append((t, b, i))
        out = []
        for t, b, i in merged:
            if t == "\n":
                out.append("<br>")
                continue
            h = _esc(re.sub(r"[ \t]+", " ", t))
            if b and h.strip():
                h = f"<strong>{h}</strong>"
            if i and h.strip():
                h = f"<em>{h}</em>"
            out.append(h)
        return re.sub(r"\s*<br>\s*", "<br>", "".join(out)).strip()

    html: list[str] = []
    for width, spans, images in pages:
        # 1. lines: spans whose vertical centres are close, left to right
        lines = []
        cur = []
        for sp in sorted(spans, key=lambda s: s["yc"]):
            if cur and abs(sp["yc"] - sum(s["yc"] for s in cur) / len(cur)) > 0.45 * max(sp["size"], body):
                lines.append(sorted(cur, key=lambda s: s["x0"]))
                cur = []
            cur.append(sp)
        if cur:
            lines.append(sorted(cur, key=lambda s: s["x0"]))
        if not lines and not images:
            continue
        left = min([ln[0]["x0"] for ln in lines] + [im["x0"] for im in images])
        right = max([max(s["x1"] for s in ln) for ln in lines] + [im["x1"] for im in images])
        cw = max(right - left, 1)

        # 2. each line: styled segments, a wide gap splits it in columns; its alignment
        items = []
        for ln in lines:
            cols = [[]]
            prev = None
            for sp in ln:
                if prev is not None:
                    gap = sp["x0"] - prev["x1"]
                    if gap > max(60, width * 0.12):
                        cols.append([])
                    elif (gap > 0.2 * sp["size"] or prev["zw"][1] + sp["zw"][0] >= 2) and cols[-1] and not cols[-1][-1][0].endswith(" ") \
                            and not sp["text"].startswith((" ", ",", ".", ")")):
                        cols[-1].append((" ", prev["bold"] and sp["bold"], False))
                cols[-1].append((sp["text"], sp["bold"], sp["italic"]))
                prev = sp
            x0, x1 = ln[0]["x0"], max(s["x1"] for s in ln)
            centred = abs((x0 + x1) / 2 - (left + right) / 2) < max(6, cw * 0.03) and (x1 - x0) < cw * 0.8 and x0 > left + 20
            items.append({"type": "line", "cols": cols, "top": min(s["y0"] for s in ln), "bottom": max(s["y1"] for s in ln),
                          "size": max(s["size"] for s in ln), "x0": x0, "x1": x1, "centred": centred,
                          "side": (not centred) and x0 > left + cw * 0.4})
        items += [{"type": "image", **im} for im in images]
        items.sort(key=lambda it: it["top"])

        # 3. paragraphs: consecutive lines of the same kind, close to each other
        paras = []
        for it in items:
            if it["type"] == "image":
                paras.append({"kind": "image", **it})
                continue
            first = plain(it["cols"][0])
            kind = "cols" if len(it["cols"]) > 1 else ("bullet" if first[:1] in _BULLETS and len(first) > 2 else "text")
            heading = it["size"] >= body * 1.3
            p = paras[-1] if paras else None
            joinable = (
                p is not None and kind == "text" and p["kind"] == "text" and p["heading"] == heading
                and p["centred"] == it["centred"] and p["side"] == it["side"] and abs(p["size"] - it["size"]) < 1.5
                and it["top"] - p["bottom"] < 0.55 * it["size"] and it["top"] >= p["top"]
            )
            if joinable:
                segs = p["segs"]
                # a line that stopped short of the margin was a real line break (address, signature block…)
                hard = p["centred"] or p["side"] or p["last_x1"] < right - cw * 0.15
                if hard:
                    segs.append(("\n", False, False))
                elif segs and not segs[-1][0].endswith((" ", "-")):
                    segs.append((" ", False, False))
                segs.extend(it["cols"][0])
                p["bottom"], p["last_x1"] = it["bottom"], it["x1"]
                p["x0"], p["x1"] = min(p["x0"], it["x0"]), max(p["x1"], it["x1"])
                p["centres"].append((it["x0"] + it["x1"]) / 2)
                p["starts"].append(it["x0"])
            else:
                paras.append({"kind": kind, "heading": heading, "centred": it["centred"], "side": it["side"], "size": it["size"],
                              "top": it["top"], "bottom": it["bottom"], "segs": list(it["cols"][0]), "cols": it["cols"],
                              "x0": it["x0"], "x1": it["x1"], "last_x1": it["x1"],
                              "centres": [(it["x0"] + it["x1"]) / 2], "starts": [it["x0"]]})

        def pct(v):
            return f"{max(0.0, min(100.0, v)):.1f}%"

        # the blank space of the original above each block (under the logo, around the title, before the signature)
        prev_bottom = None
        for q in paras:
            gap = 0 if prev_bottom is None else q["top"] - prev_bottom
            q["space"] = f"margin-top:{min(gap - 9, 90):.0f}pt;" if gap > 18 else ""
            prev_bottom = q["bottom"]

        i = 0
        while i < len(paras):
            p = paras[i]
            if p["kind"] == "image":
                align = "center" if abs((p["x0"] + p["x1"]) / 2 - (left + right) / 2) < cw * 0.05 else ("right" if p["x0"] > left + cw * 0.4 else "left")
                margin = "" if align != "left" or p["x0"] - left < 4 else f"margin-inline-start:{pct((p['x0'] - left) / cw * 100)};"
                html.append(f'<p style="margin:0 0 14px;{p["space"]}text-align:{align};{margin}"><img src="data:image/png;base64,{p["data"]}" '
                            f'style="width:{p["w"]:.0f}pt;max-width:100%;height:auto;" alt=""></p>')
                i += 1
                continue
            if p["kind"] == "bullet":
                lis = []
                while i < len(paras) and paras[i]["kind"] == "bullet":
                    segs = paras[i]["segs"]
                    first = segs[0][0].lstrip()
                    segs = [(first[1:].lstrip(), segs[0][1], segs[0][2])] + segs[1:]
                    lis.append(f'<li style="margin:3px 0;">{to_html(segs)}</li>')
                    i += 1
                html.append(f'<ul style="margin:6px 0 10px;padding-inline-start:26px;">{"".join(lis)}</ul>')
                continue
            if p["kind"] == "cols":
                rows = []
                while i < len(paras) and (paras[i]["kind"] == "cols" or (rows and paras[i]["side"] and not paras[i]["heading"])):
                    q = paras[i]
                    cols = q["cols"] if q["kind"] == "cols" else [[], q["segs"]]
                    lc, rc = to_html(cols[0]), to_html([s for c in cols[1:] for s in c])
                    rows.append(f'<tr><td style="width:50%;vertical-align:top;padding:2px 0;">{lc}</td>'
                                f'<td style="width:50%;vertical-align:top;padding:2px 0;text-align:right;">{rc}</td></tr>')
                    i += 1
                html.append(f'<table style="width:100%;border-collapse:collapse;margin:28px 0 8px;">{"".join(rows)}</table>')
                continue
            content = to_html(p["segs"])
            size = "" if abs(p["size"] - body) < 1 else f"font-size:{min(p['size'], 26):.0f}pt;"
            if p["heading"]:
                tag = "h1" if p["size"] >= body * 1.8 else "h2"
                align = "text-align:center;" if p["centred"] else ""
                html.append(f'<{tag} style="font-family:inherit;letter-spacing:normal;color:inherit;font-size:{min(p["size"], 26):.0f}pt;font-weight:bold;margin:18px 0 14px;{p["space"]}'
                            f'line-height:1.3;{align}">{content}</{tag}>')
            elif p["centred"]:
                html.append(f'<p style="margin:0 0 12px;{p["space"]}text-align:center;{size}">{content}</p>')
            elif p["side"]:
                # a block on the right (signature): its own column, lines centred in it when they were
                same_centre = max(p["centres"]) - min(p["centres"]) < 6 and max(p["starts"]) - min(p["starts"]) > 3
                start = pct((p["x0"] - left) / cw * 100)
                wid = pct((p["x1"] - p["x0"]) / cw * 100 + 2)
                align = "center" if same_centre else "left"
                html.append(f'<p style="margin:0 0 12px;{p["space"]}margin-inline-start:{start};width:{wid};text-align:{align};{size}">{content}</p>')
            else:
                align = "text-align:justify;" if "<br>" not in content else ""
                html.append(f'<p style="margin:0 0 10px;{p["space"]}{align}{size}">{content}</p>')
            i += 1

    family = "'Times New Roman',Times,serif" if serif else "Arial,Helvetica,sans-serif"
    return (
        f'<div style="font-family:{family};font-size:{body:.0f}pt;line-height:1.55;color:#111;'
        'max-width:720px;margin:0 auto;padding:48px 56px;background:#fff;">\n'
        + "\n".join(html)
        + "\n</div>"
    )


# ── PDF extraction ────────────────────────────────────────────────────────────

def _extract_from_pdf(file_bytes: bytes) -> str:
    if not _HAS_FITZ:
        return _plain_fallback("")

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        return f"<p style='color:red;font-family:sans-serif;'>Erreur ouverture PDF: {exc}</p>"

    DISPLAY_W = 760
    RENDER_SCALE = 2.5

    pages_html: list[str] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_w = page.rect.width
        page_h = page.rect.height
        disp_scale = DISPLAY_W / page_w
        display_h  = int(page_h * disp_scale)

        var_regions: list[dict] = []
        text_dict = page.get_text(
            "dict",
            flags=fitz.TEXT_PRESERVE_WHITESPACE | fitz.TEXT_PRESERVE_LIGATURES,
        )

        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue

                full_text = "".join(s.get("text", "") for s in spans)
                substituted = _apply_all(full_text)

                if "{{" not in substituted:
                    continue

                bbox = line.get("bbox", [0, 0, 0, 0])
                sp0 = spans[0]
                font_size = sp0.get("size", 11)
                font_name = sp0.get("font", "")
                is_bold   = (
                    "bold" in font_name.lower()
                    or "medium" in font_name.lower()
                    or bool(sp0.get("flags", 0) & 16)
                )
                color_int = sp0.get("color", 0)
                r_c = (color_int >> 16) & 0xFF
                g_c = (color_int >> 8)  & 0xFF
                b_c =  color_int        & 0xFF

                var_regions.append({
                    "bbox":      bbox,
                    "text":      substituted,
                    "font_size": font_size * disp_scale,
                    "bold":      is_bold,
                    "color":     f"rgb({r_c},{g_c},{b_c})",
                    "vars":      _extract_vars_from(substituted),
                })

        mat = fitz.Matrix(RENDER_SCALE, RENDER_SCALE)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")

        if _HAS_PIL and var_regions:
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            draw = ImageDraw.Draw(img)
            for vr in var_regions:
                x0, y0, x1, y1 = vr["bbox"]
                rx0 = max(0, int(x0 * RENDER_SCALE) - 4)
                ry0 = max(0, int(y0 * RENDER_SCALE) - 2)
                rx1 = min(img.width,  int(x1 * RENDER_SCALE) + 4)
                ry1 = min(img.height, int(y1 * RENDER_SCALE) + 4)
                draw.rectangle([(rx0, ry0), (rx1, ry1)], fill="white")
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=88, optimize=True)
            img_bytes = buf.getvalue()
            img_mime = "image/jpeg"
        else:
            if _HAS_PIL:
                pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                buf = io.BytesIO()
                pil_img.save(buf, "JPEG", quality=88, optimize=True)
                img_bytes = buf.getvalue()
            img_mime = "image/jpeg"

        img_b64 = base64.b64encode(img_bytes).decode()

        overlays = ""
        for vr in var_regions:
            x0, y0, x1, y1 = vr["bbox"]
            left   = x0 * disp_scale
            top    = y0 * disp_scale
            width  = max((x1 - x0) * disp_scale, 80)
            height = (y1 - y0) * disp_scale

            fw = "700" if vr["bold"] else "400"
            fs = max(11, vr["font_size"])

            text_html = (
                f'<span style="'
                f'font-size:{fs:.1f}px;'
                f'font-weight:{fw};'
                f'color:{vr["color"]};'
                f'font-family:Arial, Helvetica, sans-serif;'
                f'white-space:nowrap;'
                f'">'
                f'{vr["text"]}'
                f'</span>'
            )

            overlays += (
                f'<div style="position:absolute;'
                f'left:{left:.1f}px;top:{top:.1f}px;'
                f'min-width:{width:.1f}px;height:{height + 6:.1f}px;'
                f'display:flex;align-items:center;flex-wrap:wrap;gap:2px;'
                f'z-index:3;padding:1px 0;">'
                f'{text_html}'
                f'</div>\n'
            )

        page_block = (
            f'<div style="'
            f'position:relative;'
            f'width:{DISPLAY_W}px;'
            f'height:{display_h}px;'
            f'margin:0 auto 24px;'
            f'background:#fff;'
            f'overflow:hidden;'
            f'box-shadow:0 4px 28px rgba(0,0,0,0.18);'
            f'border-radius:3px;'
            f'">\n'
            f'  <img '
            f'src="data:{img_mime};base64,{img_b64}" '
            f'style="position:absolute;top:0;left:0;width:{DISPLAY_W}px;height:{display_h}px;'
            f'display:block;z-index:1;" '
            f'alt="Page {page_num + 1}" />\n'
            f'{overlays}'
            f'</div>\n'
        )
        pages_html.append(page_block)

    doc.close()

    return (
        '<div style="'
        'font-family:serif;'
        'background:#e5e7eb;'
        'padding:28px 16px;'
        'min-height:200px;'
        '">\n'
        + "\n".join(pages_html)
        + "\n</div>"
    )


# ── DOCX extraction ───────────────────────────────────────────────────────────

def _esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _run_to_html(run) -> str:
    text = run.text
    if not text:
        return ""
    text = _esc(text)
    if getattr(run, "bold", False):
        text = f"<strong>{text}</strong>"
    if getattr(run, "italic", False):
        text = f"<em>{text}</em>"
    if getattr(run, "underline", False):
        text = f"<u>{text}</u>"
    styles = []
    try:
        if run.font.size:
            styles.append(f"font-size:{run.font.size.pt:.0f}pt")
    except Exception:
        pass
    try:
        from docx.enum.dml import MSO_THEME_COLOR  # noqa
        if run.font.color and run.font.color.type is not None:
            rgb = run.font.color.rgb
            styles.append(f"color:#{rgb}")
    except Exception:
        pass
    if styles:
        text = f'<span style="{";".join(styles)}">{text}</span>'
    return text


def _para_to_html(para) -> str:
    """Convert a python-docx Paragraph to HTML.

    Variable placeholders can span several runs in DOCX (Word splits text).
    We apply substitution on the full concatenated text first.
    """
    full_raw = para.text
    full_sub = _apply_all(full_raw)

    if not full_raw.strip():
        return "<p>&nbsp;</p>"

    align_css = ""
    try:
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        a = para.alignment
        if a == WD_ALIGN_PARAGRAPH.CENTER:
            align_css = "text-align:center;"
        elif a == WD_ALIGN_PARAGRAPH.RIGHT:
            align_css = "text-align:right;"
        elif a == WD_ALIGN_PARAGRAPH.JUSTIFY:
            align_css = "text-align:justify;"
    except Exception:
        pass

    style_name = ""
    try:
        style_name = (para.style.name or "").lower()
    except Exception:
        pass

    content: str
    if full_sub != full_raw:
        # Substitution happened — use plain text to preserve the {{tokens}}
        content = _esc(full_sub)
    else:
        content = "".join(_run_to_html(r) for r in para.runs) or _esc(full_raw)

    if "heading 1" in style_name or "titre 1" in style_name:
        return (f'<h1 style="font-size:18pt;font-weight:bold;text-align:center;'
                f'text-decoration:underline;margin:24px 0 16px;">{content}</h1>')
    if "heading 2" in style_name or "titre 2" in style_name:
        return (f'<h2 style="font-size:15pt;font-weight:bold;{align_css}'
                f'margin:20px 0 12px;">{content}</h2>')
    if "heading 3" in style_name or "titre 3" in style_name:
        return (f'<h3 style="font-size:13pt;font-weight:bold;{align_css}'
                f'margin:16px 0 10px;">{content}</h3>')

    para_fs = "12pt"
    try:
        if para.style.font.size:
            para_fs = f"{para.style.font.size.pt:.0f}pt"
    except Exception:
        pass

    return (f'<p style="font-size:{para_fs};line-height:1.8;'
            f'margin:4px 0;{align_css}">{content}</p>')


def _table_to_html(table) -> str:
    rows_html = []
    for row in table.rows:
        cells_html = []
        for cell in row.cells:
            cell_content = "".join(_para_to_html(p) for p in cell.paragraphs)
            cells_html.append(
                f'<td style="border:1px solid #bbb;padding:6px 10px;'
                f'vertical-align:top;font-size:11pt;line-height:1.7;">'
                f'{cell_content}</td>'
            )
        rows_html.append(f'<tr>{"".join(cells_html)}</tr>')
    return (
        '<table style="width:100%;border-collapse:collapse;'
        'margin:12px 0;font-family:inherit;">'
        + "".join(rows_html)
        + "</table>"
    )


def _sdt_text(sdt_el) -> str:
    """Extract plain text from a <w:sdt> content-control element."""
    try:
        from lxml import etree
        ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        content_el = sdt_el.find(f"{{{ns}}}sdtContent")
        if content_el is None:
            return ""
        # Gather all text runs inside the content control
        texts = [t.text or "" for t in content_el.iter(f"{{{ns}}}t")]
        return "".join(texts)
    except Exception:
        return ""


def _extract_from_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document
        from lxml import etree

        doc = Document(io.BytesIO(file_bytes))
        parts: list[str] = []

        for child in doc.element.body:
            try:
                tag = etree.QName(child.tag).localname
            except Exception:
                continue

            if tag == "p":
                from docx.text.paragraph import Paragraph as DocxPara
                para = DocxPara(child, doc)
                parts.append(_para_to_html(para))

            elif tag == "tbl":
                from docx.table import Table as DocxTable
                table = DocxTable(child, doc)
                parts.append(_table_to_html(table))

            elif tag == "sdt":
                # Structured content control (form field) — extract its text
                raw = _sdt_text(child)
                if raw.strip():
                    sub = _apply_all(raw)
                    content = _esc(sub)
                    parts.append(f'<p style="font-size:12pt;line-height:1.8;margin:4px 0;">{content}</p>')

            # sectPr, bookmarkStart, etc. — silently skip

        return (
            '<div style="font-family:\'Times New Roman\',serif;'
            'max-width:720px;margin:0 auto;padding:50px 48px;background:#fff;">\n'
            + "\n".join(parts)
            + "\n</div>"
        )
    except Exception as exc:
        try:
            from docx import Document
            doc = Document(io.BytesIO(file_bytes))
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            return _plain_fallback(text)
        except Exception:
            return f"<p style='color:red;'>Erreur DOCX: {exc}</p>"


# ── Plain-text fallback ───────────────────────────────────────────────────────

def _plain_fallback(raw_text: str) -> str:
    text  = _apply_all(raw_text)
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    parts: list[str] = []
    for line in lines:
        low = line.lower()
        if (
            len(line) < 65
            and (
                line.isupper()
                or low.startswith("attestation")
                or low.startswith("contrat")
                or low.startswith("charte")
            )
        ):
            parts.append(
                f'<h2 style="text-align:center;font-size:18px;font-weight:bold;'
                f'text-decoration:underline;margin:30px 0 24px;">{line}</h2>'
            )
        elif low.startswith(("la soci", "je soussign")):
            parts.append(
                f'<p style="font-weight:bold;font-size:13px;line-height:1.75;margin-bottom:14px;">{line}</p>'
            )
        else:
            parts.append(
                f'<p style="font-size:13px;line-height:1.75;margin-bottom:12px;">{line}</p>'
            )
    return (
        '<div style="font-family:\'Times New Roman\',serif;'
        'max-width:720px;margin:0 auto;padding:50px 48px;background:#fff;">\n'
        + "\n".join(parts)
        + "\n</div>"
    )
