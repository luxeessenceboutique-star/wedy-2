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
]


def _apply_contextual_vars(text: str) -> str:
    """Replace filled-in HR data by context. Call only when bracket patterns found nothing."""
    for item in _CONTEXTUAL_SUBS:
        pat, repl, flags = item
        try:
            text = re.sub(pat, repl, text, flags=flags)
        except re.error:
            pass
    return text


def _apply_all(text: str) -> str:
    """Apply bracket patterns first; only fall through to contextual if nothing found."""
    result = _apply_vars(text)
    if "{{" not in result:
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
