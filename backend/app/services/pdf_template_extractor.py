"""
PDF → HTML Template Extractor  v3  (Render + Overlay)
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

_VAR_SUBS = [
    # Full name
    (r"\[Nom et pr[ée]nom du stagiaire\s*\]",   "{{full_name}}"),
    (r"\[Nom et pr[ée]nom\s*du stagiaire\s*\]", "{{full_name}}"),
    (r"\[Nom et pr[ée]nom\s*\]",                "{{full_name}}"),
    (r"\[Nom et pr[ée]nom\]",                   "{{full_name}}"),
    (r"\(Nom\s*Pr[ée]nom\)",                    "{{full_name}}"),
    (r"\[nom complet\]",                        "{{full_name}}"),
    (r"\[pr[ée]nom\s+nom\]",                    "{{full_name}}"),
    # CIN
    (r"\[Num[ée]ro\s+CIN\]",                    "{{cin}}"),
    (r"\[CIN\s*\]",                             "{{cin}}"),
    (r"\(CIN\s*\)",                             "{{cin}}"),
    (r"\[num[ée]ro\s+de\s+cin\]",               "{{cin}}"),
    # Dates
    (r"\[date\s+d.embauche\]",                  "{{hire_date}}"),
    (r"\[date de d[ée]but\]",                   "{{contract_start}}"),
    (r"\[date de fin\s*/\s*.+?\]",              "{{contract_end}}"),
    (r"\[date de fin / [\w\s]+\]",              "{{contract_end}}"),
    (r"\[date de fin\]",                        "{{contract_end}}"),
    (r"\[Date\]",                               "{{today}}"),
    (r"\[date\]",                               "{{today}}"),
    # Position / poste
    (r"\[poste occup[ée]\s*\]",                 "{{position}}"),
    (r"\[\s*poste occup[ée]\s*\]",              "{{position}}"),
    (r"\[poste\]",                              "{{position}}"),
    (r"\[fonction\]",                           "{{position}}"),
    # Salary
    (r"\[montant en dirhams\s*\]",              "{{salary}}"),
    (r"\[salaire\]",                            "{{salary}}"),
    (r"\[r[ée]mun[ée]ration\]",                "{{salary}}"),
    # Contact
    (r"\(adresse\s*\)",                         "{{address}}"),
    (r"\[adresse\]",                            "{{address}}"),
    (r"\[email\]",                              "{{email}}"),
    (r"\[e-mail\]",                             "{{email}}"),
    (r"\[t[ée]l[ée]phone\]",                   "{{phone}}"),
    (r"\[t[ée]l\.?\]",                          "{{phone}}"),
    # Other
    (r"\[d[ée]partement\]",                     "{{department}}"),
    (r"\[service\]",                            "{{department}}"),
    (r"\[manager\]",                            "{{manager}}"),
    (r"\[responsable\]",                        "{{manager}}"),
    (r"\[matricule\]",                          "{{matricule}}"),
    (r"\[nationalit[ée]\]",                     "{{nationality}}"),
]


def _apply_vars(text: str) -> str:
    """Apply all variable substitution patterns to a plain-text string."""
    for pattern, replacement in _VAR_SUBS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


# ── Contextual patterns for filled-in documents ───────────────────────────────
# These detect REAL data (names, CIN numbers, dates, positions) by their
# surrounding context, for PDFs that were already filled in rather than using
# [bracket] placeholder markers.
#
# Each entry is (pattern, replacement, flags).
# Use flags=0 for case-SENSITIVE matching (e.g. ALL-CAPS position detection).

_D = r"\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}"   # date pattern shorthand

_CONTEXTUAL_SUBS: list[tuple] = [
    # ── CIN — 1-2 uppercase letters + 5-7 digits ─────────────────────────────
    (r"(CIN\s*N?°?\s*:?\s*)([A-Z]{1,2}\d{5,7})\b",
     r"\1{{cin}}", re.IGNORECASE),

    # ── Employee name: contract header "- M.: NAME" or "- Mme: NAME" ─────────
    (r"^(\s*[-–]\s*M(?:me)?\.?\s*:?\s+)([A-Z\xc0-\xd6\xd8-\xde][A-Z\xc0-\xd6\xd8-\xde\s]+)\s*$",
     r"\1{{full_name}}", re.MULTILINE),

    # ── Employee name: attestation standalone line "M. NAME" or "Mme. NAME" ──
    # Only matches ALL-CAPS names (>=5 chars) to avoid signer names (mixed case)
    (r"^(M(?:me)?\.?\s+)([A-Z\xc0-\xd6\xd8-\xde][A-Z\xc0-\xd6\xd8-\xde\s]{4,})\s*$",
     r"\1{{full_name}}", re.MULTILINE),

    # ── Birth date after "né le" / "née le" ──────────────────────────────────
    (r"(n[e\xe9]e?\s+le\s+)(" + _D + r")", r"\1{{birth_date}}", re.IGNORECASE),

    # ── Hire date: "à compter du DATE" or "depuis le DATE" ───────────────────
    (r"(\xe0\s+compter\s+du\s+)(" + _D + r")", r"\1{{hire_date}}", re.IGNORECASE),
    (r"(depuis\s+le\s+)(" + _D + r")",          r"\1{{hire_date}}", re.IGNORECASE),

    # ── Date range on same line: "DATE au DATE" → hire_date … contract_end ───
    # Applied BEFORE standalone patterns so both dates are captured together.
    (r"(" + _D + r")(\s+au\s+)(" + _D + r")",
     r"{{hire_date}}\2{{contract_end}}", re.IGNORECASE),

    # ── "Jusqu'à présent" ─────────────────────────────────────────────────────
    (r"jusqu['’`]?à\s+pr[e\xe9]sent\b", r"{{contract_end}}", re.IGNORECASE),

    # ── Address after "Demeurant à" ───────────────────────────────────────────
    (r"(demeurant\s+\xe0\s+)(.{3,60}?)\s*$", r"\1{{address}}", re.IGNORECASE | re.MULTILINE),

    # ── Position with French guillemets «…» (mixed-case ok, contract style) ──
    (r"(en\s+(?:sa\s+)?qualit[e\xe9]\s+de\s*«\s*)(.{2,60}?)(\s*»)",
     r"\1{{position}}\3", re.IGNORECASE),

    # ── Position ALL-CAPS multi-word (attestation style: "UI/UX DESIGNER") ───
    # Case-SENSITIVE (flags=0) so mixed-case signer titles like "Gérant" don't match.
    # Requires at least 5 chars total and ends with uppercase letter.
    (r"(en\s+(?:sa\s+)?qualit[e\xe9]\s+de\s+)([A-Z\xc0-\xd6\xd8-\xde][A-Z\xc0-\xd6\xd8-\xde\s/\-]{4,}[A-Z\xc0-\xd6\xd8-\xde])(\s+(?:du|au|depuis)|,|\s*$)",
     r"\1{{position}}\3", 0),

    # ── Salary: "salaire mensuel net sera de X dirhams" ───────────────────────
    (r"(salaire\s+mensuel\s+net\s+sera\s+de\s+)([\d\s ,\.]+?)\s*(dirhams|MAD|dhs?\.?)\b",
     r"\1{{salary}} \3", re.IGNORECASE),

    # ── Today's date: "Fait (en double exemplaire)? à CITY, le DATE" ─────────
    (r"(Fait(?:\s+en\s+double\s+exemplaire)?\s+\xe0\s+\w+,?\s+le\s+)(" + _D + r")",
     r"\1{{today}}", re.IGNORECASE),
]


def _apply_contextual_vars(text: str) -> str:
    """Detect filled-in HR data by context and replace with {{variable}} tokens.

    Works on documents that contain real employee data (names, CIN numbers, dates,
    positions) rather than [bracket] placeholder markers.
    """
    for item in _CONTEXTUAL_SUBS:
        pat, repl, flags = item
        try:
            text = re.sub(pat, repl, text, flags=flags)
        except re.error:
            pass
    return text


def _extract_vars_from(token: str) -> list[str]:
    """Return list of  var_name  strings found inside {{...}} tokens."""
    return re.findall(r"\{\{(\w+)\}\}", token)


# ── Public API ────────────────────────────────────────────────────────────────

def extract_pdf_template(file_bytes: bytes, filename: str = "template.pdf") -> str:
    """
    Convert a PDF / DOCX file into a faithful HTML Jinja2 template.
    Returns an HTML string ready to be stored in document_templates.body_template.
    """
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

    DISPLAY_W = 760          # pixels — target display width
    RENDER_SCALE = 2.5       # render at 2.5× for sharp output

    pages_html: list[str] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_w = page.rect.width    # pt  (A4 ≈ 595 pt)
        page_h = page.rect.height   # pt  (A4 ≈ 842 pt)
        disp_scale = DISPLAY_W / page_w          # pt → display-px
        display_h  = int(page_h * disp_scale)

        # ── 1. Detect variable placeholder regions ────────────────────────────
        var_regions: list[dict] = []
        text_dict = page.get_text(
            "dict",
            flags=fitz.TEXT_PRESERVE_WHITESPACE | fitz.TEXT_PRESERVE_LIGATURES,
        )

        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:      # 0 = text, 1 = image
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue

                # Reconstruct the full line text
                full_text = "".join(s.get("text", "") for s in spans)
                # First try bracket-style [placeholder] substitution, then fall
                # back to contextual detection for real filled-in data.
                substituted = _apply_contextual_vars(_apply_vars(full_text))

                if "{{" not in substituted:
                    continue  # no variable detected in this line

                # Get the bounding box of the whole line
                bbox = line.get("bbox", [0, 0, 0, 0])   # [x0,y0,x1,y1] in pt

                # Style from the first span
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

        # ── 2. Render the page as a high-quality JPEG ─────────────────────────
        mat = fitz.Matrix(RENDER_SCALE, RENDER_SCALE)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")           # first get raw PNG

        # ── 3. White-out variable regions using Pillow ────────────────────────
        if _HAS_PIL and var_regions:
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            draw = ImageDraw.Draw(img)
            for vr in var_regions:
                x0, y0, x1, y1 = vr["bbox"]
                # Scale PDF pt → render pixels (× RENDER_SCALE)
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
            # No Pillow or no vars — convert PNG to JPEG to save space
            if _HAS_PIL:
                pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                buf = io.BytesIO()
                pil_img.save(buf, "JPEG", quality=88, optimize=True)
                img_bytes = buf.getvalue()
            img_mime = "image/jpeg"

        img_b64 = base64.b64encode(img_bytes).decode()

        # ── 4. Build overlay HTML for each variable region ────────────────────
        overlays = ""
        for vr in var_regions:
            x0, y0, x1, y1 = vr["bbox"]
            left   = x0 * disp_scale
            top    = y0 * disp_scale
            width  = max((x1 - x0) * disp_scale, 80)   # minimum 80 px
            height = (y1 - y0) * disp_scale

            fw = "700" if vr["bold"] else "400"
            fs = max(11, vr["font_size"])

            # Render the entire substituted line text (including static text around variables)
            # using the exact extracted styles so it matches the original document perfectly.
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

        # ── 5. Assemble page block ─────────────────────────────────────────────
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
    """Convert a python-docx Run to inline HTML. Does NOT apply _apply_vars here
    (variable substitution happens at paragraph level to catch cross-run markers)."""
    text = run.text
    if not text:
        return ""
    text = _esc(text)
    # Bold / italic / underline
    if getattr(run, "bold", False):
        text = f"<strong>{text}</strong>"
    if getattr(run, "italic", False):
        text = f"<em>{text}</em>"
    if getattr(run, "underline", False):
        text = f"<u>{text}</u>"
    # Font size / color
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
    """Convert a python-docx Paragraph to an HTML block element.

    Variable placeholders like [Nom et prénom] can span several runs in DOCX
    (Word's spell-checker / autocorrect splits text into multiple runs).  To
    catch them reliably we first apply _apply_vars() to the *full* paragraph
    text.  If it produced any {{var}} tokens we render the paragraph as plain
    HTML text (losing per-run formatting for that paragraph).  Otherwise we
    use per-run rendering to preserve bold/italic/color.
    """
    full_raw = para.text          # concatenates all runs — never misses cross-run vars
    full_sub = _apply_contextual_vars(_apply_vars(full_raw))

    if not full_raw.strip():
        return "<p>&nbsp;</p>"

    # ── Alignment ────────────────────────────────────────────────────────────
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

    # ── Heading styles ───────────────────────────────────────────────────────
    style_name = (para.style.name or "").lower()
    content: str
    if full_sub != full_raw:
        # Variable substitution happened — use plain text to preserve tokens
        content = _esc(full_sub)
    else:
        # No variables — use per-run HTML for rich formatting
        content = "".join(_run_to_html(r) for r in para.runs) or _esc(full_raw)

    if "heading 1" in style_name:
        return (f'<h1 style="font-size:18pt;font-weight:bold;text-align:center;'
                f'text-decoration:underline;margin:24px 0 16px;">{content}</h1>')
    if "heading 2" in style_name:
        return (f'<h2 style="font-size:15pt;font-weight:bold;{align_css}'
                f'margin:20px 0 12px;">{content}</h2>')
    if "heading 3" in style_name:
        return (f'<h3 style="font-size:13pt;font-weight:bold;{align_css}'
                f'margin:16px 0 10px;">{content}</h3>')

    # ── Body paragraph ───────────────────────────────────────────────────────
    para_fs = "12pt"
    try:
        if para.style.font.size:
            para_fs = f"{para.style.font.size.pt:.0f}pt"
    except Exception:
        pass

    return (f'<p style="font-size:{para_fs};line-height:1.8;'
            f'margin:4px 0;{align_css}">{content}</p>')


def _table_to_html(table) -> str:
    """Convert a python-docx Table to an HTML table."""
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


def _extract_from_docx(file_bytes: bytes) -> str:
    """
    Convert DOCX to faithful HTML, preserving:
    - Paragraph formatting (bold, italic, underline, alignment, font size/color)
    - Tables (rendered as <table> elements)
    - Document element order
    - Variable placeholder substitution
    """
    try:
        from docx import Document
        from lxml import etree

        doc = Document(io.BytesIO(file_bytes))
        parts: list[str] = []

        # Walk body children in document order — paragraphs AND tables
        for child in doc.element.body:
            tag = etree.QName(child.tag).localname
            if tag == "p":
                from docx.text.paragraph import Paragraph as DocxPara
                para = DocxPara(child, doc)
                html = _para_to_html(para)
                parts.append(html)
            elif tag == "tbl":
                from docx.table import Table as DocxTable
                table = DocxTable(child, doc)
                parts.append(_table_to_html(table))
            # sdt (content controls), sectPr, etc. are silently skipped

        return (
            '<div style="font-family:\'Times New Roman\',serif;'
            'max-width:720px;margin:0 auto;padding:50px 48px;background:#fff;">\n'
            + "\n".join(parts)
            + "\n</div>"
        )
    except Exception as exc:
        # Fallback to plain-text extraction on any error
        try:
            from docx import Document
            doc = Document(io.BytesIO(file_bytes))
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            return _plain_fallback(text)
        except Exception:
            return f"<p style='color:red;'>Erreur DOCX: {exc}</p>"


# ── Plain-text fallback ───────────────────────────────────────────────────────

def _plain_fallback(raw_text: str) -> str:
    """Minimal fallback used when fitz is unavailable or for text files."""
    text  = _apply_contextual_vars(_apply_vars(raw_text))
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
