"""The generated document (its HTML page) as a Word file that keeps its shape: titles, bold / italic / underline,
alignment (centred, right, justified), blocks set to the right (signatures), line breaks, lists, the two-column
signature lines, the images (logo, signature, stamp), the font and the sizes."""
from __future__ import annotations

import base64
import io
import re
from html.parser import HTMLParser

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor

_ALIGN = {"left": WD_ALIGN_PARAGRAPH.LEFT, "center": WD_ALIGN_PARAGRAPH.CENTER, "right": WD_ALIGN_PARAGRAPH.RIGHT,
          "justify": WD_ALIGN_PARAGRAPH.JUSTIFY}
_BLOCKS = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "section", "article"}
_IMG_WIDTH = {"lh-logo": 1.4, "sign-img": 4.2, "stamp-img": 2.4}   # cm, by class (the letterhead's pictures)
_PAGE_TEXT_CM = 17.0


def _style(attrs: dict) -> dict:
    out = {}
    for part in (attrs.get("style") or "").split(";"):
        if ":" in part:
            k, v = part.split(":", 1)
            out[k.strip().lower()] = v.strip()
    return out


def _pt(v: str):
    m = re.match(r"([\d.]+)\s*(pt|px)?", v or "")
    if not m:
        return None
    n = float(m.group(1))
    return n * 0.75 if m.group(2) == "px" else n


class _Builder(HTMLParser):
    def __init__(self, doc):
        super().__init__(convert_charrefs=True)
        self.doc = doc
        self.para = None
        self.stack: list[dict] = []     # one frame per open tag: its formatting
        self.skip = 0
        self.list_kind: list[str] = []

    # formatting in force = the frames merged
    def _fmt(self) -> dict:
        f = {"bold": False, "italic": False, "under": False, "size": None, "color": None, "align": None, "indent": None,
             "cls": ""}
        for fr in self.stack:
            for k, v in fr.items():
                if v not in (None, False, ""):
                    f[k] = v if k != "cls" else f"{f['cls']} {v}"
        return f

    def _new_para(self):
        f = self._fmt()
        self.para = self.doc.add_paragraph()
        pf = self.para.paragraph_format
        pf.space_after = Pt(6)
        if f["align"] in _ALIGN:
            self.para.alignment = _ALIGN[f["align"]]
        if f["indent"]:
            pf.left_indent = Cm(f["indent"])
        if self.list_kind and self.stack and self.stack[-1].get("tag") == "li":
            self.para.style = self.doc.styles["List Bullet" if self.list_kind[-1] == "ul" else "List Number"]
        return self.para

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        a = dict(attrs)
        if tag in ("style", "script", "head", "title"):
            self.skip += 1
            return
        if self.skip:
            return
        st = _style(a)
        cls = a.get("class") or ""
        fr: dict = {"tag": tag, "cls": cls}
        if tag in ("b", "strong") or "bold" in st.get("font-weight", "") or re.search(r"font-weight:\s*[6-9]00", a.get("style") or ""):
            fr["bold"] = True
        if tag in ("i", "em") or "italic" in st.get("font-style", ""):
            fr["italic"] = True
        if tag == "u" or "underline" in st.get("text-decoration", ""):
            fr["under"] = True
        if st.get("font-size"):
            fr["size"] = _pt(st["font-size"])
        if re.match(r"#[0-9a-f]{6}$", st.get("color", ""), re.I):
            fr["color"] = st["color"]
        align = st.get("text-align")
        if "doc-title" in cls or "sign-cell" in cls:
            align = "center" if "doc-title" in cls else "right"
        if "place-date" in cls:
            align = "right"
        if align:
            fr["align"] = align
        start = st.get("margin-inline-start") or st.get("margin-left") or ""
        m = re.match(r"([\d.]+)%", start)
        if m and float(m.group(1)) >= 5:
            fr["indent"] = round(_PAGE_TEXT_CM * float(m.group(1)) / 100, 2)
        if tag in ("h1", "h2", "h3", "h4"):
            fr["bold"] = True
            fr.setdefault("size", {"h1": 16, "h2": 14, "h3": 13, "h4": 12}[tag])
            fr.setdefault("align", "center" if tag == "h1" else None)
        if tag in ("ul", "ol"):
            self.list_kind.append(tag)
        self.stack.append(fr)
        if tag in _BLOCKS:
            self.para = None   # a new paragraph opens at the first text
        elif tag == "br":
            self.stack.pop()
            if self.para is not None:
                self.para.add_run().add_break()
        elif tag == "img":
            self.stack.pop()
            self._image(a, cls)
        elif tag == "hr":
            self.stack.pop()
            self.doc.add_paragraph("─" * 50)
            self.para = None

    def _image(self, a: dict, cls: str):
        src = a.get("src") or ""
        m = re.match(r"data:image/(png|jpe?g|gif|bmp);base64,(.+)", src, re.S)
        if not m:
            return
        try:
            data = base64.b64decode(m.group(2))
        except Exception:
            return
        width = next((w for k, w in _IMG_WIDTH.items() if k in cls or k in " ".join(f.get("cls", "") for f in self.stack)), None)
        st = _style(a)
        if width is None and st.get("width"):
            px = _pt(st["width"])
            width = min(_PAGE_TEXT_CM, (px or 0) / 72 * 2.54) if px else None
        para = self.para or self._new_para()
        try:
            para.add_run().add_picture(io.BytesIO(data), width=Cm(width or 4))
        except Exception:
            pass

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ("style", "script", "head", "title"):
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]["tag"] == tag:
                del self.stack[i:]
                break
        if tag in ("ul", "ol") and self.list_kind:
            self.list_kind.pop()
        if tag in _BLOCKS or tag in ("tr", "table"):
            self.para = None

    def handle_data(self, data):
        if self.skip:
            return
        text = re.sub(r"\s+", " ", data)
        if not text.strip():
            if self.para is not None and text:
                self.para.add_run(" ")
            return
        if self.para is None:
            text = text.lstrip()
            self._new_para()
        f = self._fmt()
        run = self.para.add_run(text)
        run.bold, run.italic, run.underline = f["bold"] or None, f["italic"] or None, f["under"] or None
        if f["size"]:
            run.font.size = Pt(min(f["size"], 28))
        if f["color"]:
            try:
                run.font.color.rgb = RGBColor.from_string(f["color"][1:].upper())
            except Exception:
                pass


def html_to_docx(html: str) -> bytes:
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21), Cm(29.7)
    boxed = 'class="wedy-doc own boxed' in (html or "")[:300]
    sec.top_margin = sec.bottom_margin = Cm(1.8 if not boxed else 1.2)
    sec.left_margin = sec.right_margin = Cm(2.0 if not boxed else 1.6)
    family = "Times New Roman"
    m = re.search(r"font-family:\s*([^;\"]+)", html or "")
    if m and re.search(r"arial|helvetica|sans-serif", m.group(1), re.I) and not re.search(r"\bserif\b(?<!sans-serif)", m.group(1)):
        family = "Arial"
    size = 11.5
    m = re.search(r"font-family:[^;\"]+;\s*font-size:\s*([\d.]+)pt", html or "")
    if m:
        size = float(m.group(1))
    normal = doc.styles["Normal"]
    normal.font.name = family
    normal.font.size = Pt(size)
    _Builder(doc).feed(html or "")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
