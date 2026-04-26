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

# Variable → display label (for the blue pill in template preview)
_VAR_LABELS = {
    "full_name":       "Nom complet",
    "cin":             "CIN",
    "hire_date":       "Date d'embauche",
    "contract_start":  "Début contrat",
    "contract_end":    "Fin contrat",
    "today":           "Date du jour",
    "position":        "Poste",
    "salary":          "Salaire",
    "address":         "Adresse",
    "email":           "Email",
    "phone":           "Téléphone",
    "department":      "Département",
    "manager":         "Manager",
    "matricule":       "Matricule",
    "nationality":     "Nationalité",
}

# Pill colors for each variable type
_VAR_COLORS = {
    "full_name":      ("#1e40af", "#dbeafe"),
    "cin":            ("#5b21b6", "#ede9fe"),
    "hire_date":      ("#92400e", "#fef3c7"),
    "contract_start": ("#92400e", "#fef3c7"),
    "contract_end":   ("#92400e", "#fef3c7"),
    "today":          ("#92400e", "#fef3c7"),
    "position":       ("#065f46", "#d1fae5"),
    "salary":         ("#065f46", "#d1fae5"),
    "address":        ("#7c2d12", "#ffedd5"),
    "email":          ("#7c2d12", "#ffedd5"),
    "phone":          ("#7c2d12", "#ffedd5"),
    "department":     ("#1e3a5f", "#e0f2fe"),
    "manager":        ("#1e3a5f", "#e0f2fe"),
    "matricule":      ("#4a1d96", "#f5f3ff"),
    "nationality":    ("#4a1d96", "#f5f3ff"),
}


def _apply_vars(text: str) -> str:
    """Apply all variable substitution patterns to a plain-text string."""
    for pattern, replacement in _VAR_SUBS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
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
                substituted = _apply_vars(full_text)

                if "{{" not in substituted:
                    continue  # no placeholder in this line

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

            # Build pill badges for each variable in the line
            pills_html = ""
            for var_name in vr["vars"]:
                label  = _VAR_LABELS.get(var_name, var_name)
                fc, bg = _VAR_COLORS.get(var_name, ("#1e40af", "#dbeafe"))
                pills_html += (
                    f'<span style="display:inline-flex;align-items:center;gap:3px;'
                    f'font-size:10px;font-weight:700;padding:2px 7px;'
                    f'background:{bg};color:{fc};border:1px solid {fc}44;'
                    f'border-radius:999px;font-family:Inter,Arial,sans-serif;'
                    f'white-space:nowrap;margin-right:3px;">'
                    f'<svg width="8" height="8" viewBox="0 0 8 8" style="flex-shrink:0;">'
                    f'<circle cx="4" cy="4" r="3" fill="{fc}" opacity="0.7"/></svg>'
                    f'{label}: {{{{{var_name}}}}}</span>'
                )

            overlays += (
                f'<div style="position:absolute;'
                f'left:{left:.1f}px;top:{top:.1f}px;'
                f'min-width:{width:.1f}px;height:{height + 6:.1f}px;'
                f'display:flex;align-items:center;flex-wrap:wrap;gap:2px;'
                f'z-index:3;padding:1px 0;">'
                f'{pills_html}'
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
            f'src="data:image/{img_mime};base64,{img_b64}" '
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

def _extract_from_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n".join(paragraphs)
        return _plain_fallback(text)
    except Exception as exc:
        return f"<p style='color:red;'>Erreur DOCX: {exc}</p>"


# ── Plain-text fallback ───────────────────────────────────────────────────────

def _plain_fallback(raw_text: str) -> str:
    """Minimal fallback used when fitz is unavailable or for text files."""
    text  = _apply_vars(raw_text)
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
