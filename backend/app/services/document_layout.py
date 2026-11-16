"""The generated document as one page of HTML — the same for the preview, the PDF, the DOCX and the copy filed in the
person's folder.

A template that is a complete document (imported from a PDF / Word file, or that already has its own « Fait à …, le … »,
signature or stamp lines) is kept exactly as it is: nothing is added around it. A short template written in Wedy
(just the paragraphs) is set on the company's letterhead: logo and name, title, the paragraphs, place and date, the HR
signature and the stamp from Settings.
"""
from __future__ import annotations

import html as _html
import re
import unicodedata
from datetime import date
from typing import Optional

_TEXT = {
    "fr": {"place_date": "Fait à {city}, le {date}", "dept": "La Direction des Ressources Humaines"},
    "en": {"place_date": "Done in {city}, on {date}", "dept": "Human Resources Department"},
    "ar": {"place_date": "حرر في {city} بتاريخ {date}", "dept": "مديرية الموارد البشرية"},
}

# the page: A4, the margins of a letter; a document that brings its own page box (imported) gets smaller margins
DOC_CSS = """
@page { size: A4; margin: 18mm 20mm; }
@page boxed { size: A4; margin: 8mm 6mm; }
html, body { margin: 0; padding: 0; background: #ffffff; }
body { font-family: Georgia, 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.6; color: #1d2a30; }
.wedy-doc { box-sizing: border-box; }
.wedy-doc img { max-width: 100%; }
.wedy-doc table { border-collapse: collapse; }
.wedy-doc.boxed { page: boxed; }
.wedy-doc.own:not(.boxed) p { margin: 0 0 10pt; }
@media screen {
  body { width: 210mm; min-height: 297mm; margin: 0 auto; }
  .wedy-doc { padding: 18mm 20mm; }
  .wedy-doc.boxed { padding: 8mm 6mm; }
}
.wedy-doc.letter p { margin: 0 0 10pt; text-align: justify; }
.wedy-doc.letter .lh { width: 100%; }
.wedy-doc.letter .lh td { vertical-align: middle; padding: 0; }
.wedy-doc.letter .lh-logo { width: 56px; padding-right: 12px !important; }
.wedy-doc.letter .lh-logo img { max-width: 52px; max-height: 52px; }
.wedy-doc.letter .lh-initials { display: inline-block; width: 46px; height: 46px; line-height: 46px; border-radius: 12px; text-align: center;
  background: #0e6f84; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: bold; font-size: 15pt; }
.wedy-doc.letter .lh-name { font-family: Arial, Helvetica, sans-serif; font-weight: bold; font-size: 13pt; color: #0a1c24; }
.wedy-doc.letter .lh-line { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #5f7079; }
.wedy-doc.letter .lh-ids { font-family: 'Courier New', monospace; font-size: 7.5pt; color: #7d8f97; margin-top: 6pt; }
.wedy-doc.letter .lh-rule { height: 2px; background: #0e6f84; margin: 10pt 0 0; }
.wedy-doc.letter .doc-title { margin: 26pt 0 20pt; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 15pt;
  letter-spacing: .12em; color: #0a1c24; }
.wedy-doc.letter .place-date { margin-top: 22pt; text-align: right; }
.wedy-doc.letter .sign { width: 100%; margin-top: 14pt; }
.wedy-doc.letter .sign td { vertical-align: top; padding: 0; }
.wedy-doc.letter .sign-cell { width: 240px; text-align: center; position: relative; }
.wedy-doc.letter .sign-dept { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; font-weight: bold; color: #33474f; margin-bottom: 6pt; }
.wedy-doc.letter .sign-img { max-width: 170px; max-height: 70px; }
.wedy-doc.letter .stamp-img { width: 92px; height: 92px; opacity: .85; margin-left: 6pt; }
.wedy-doc.letter .sign-name { font-family: 'Brush Script MT', 'Segoe Script', cursive; font-size: 20pt; color: #0b3f52; }
.wedy-doc.letter .stamp { display: inline-block; width: 82px; height: 82px; border-radius: 50%; border: 2px solid #6fa9b6; color: #4f8f9d;
  font-family: 'Courier New', monospace; font-size: 6.5pt; font-weight: bold; text-transform: uppercase; text-align: center; line-height: 1.3;
  padding-top: 26px; box-sizing: border-box; margin-left: 6pt; }
.wedy-doc.letter .doc-foot { margin-top: 30pt; padding-top: 8pt; border-top: 1px solid #e7ecee; font-family: 'Courier New', monospace;
  font-size: 7.5pt; color: #8a9ba3; }
.wedy-doc.letter .doc-foot td { padding: 0; }
.wedy-doc[dir=rtl] .place-date { text-align: left; }
"""


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def _text(html_body: str) -> str:
    return _html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<!--.*?-->", "", html_body or "", flags=re.S)))


def has_own_layout(html_body: str) -> bool:
    """The template is a whole document already (imported, or with its own closing lines): nothing is added to it."""
    b = re.sub(r"^\s*<!--.*?-->", "", html_body or "", flags=re.S)
    if re.search(r"<img\b|position:\s*absolute", b, re.I):
        return True
    if re.match(r"\s*<div[^>]*style=\"[^\"]*padding:\s*\d", b, re.I):  # the page box of an imported PDF
        return True
    return bool(re.search(r"\b(fait a|fait le|signature|cachet|lu et approuve|le directeur|la directrice|la direction)\b", _norm(_text(b))))


def is_boxed(html_body: str) -> bool:
    """The template brings its own page box (an imported PDF: padded page, or text placed over the page image)."""
    b = re.sub(r"^\s*<!--.*?-->", "", html_body or "", flags=re.S)
    return bool(re.search(r"position:\s*absolute", b, re.I) or re.match(r"\s*<div[^>]*style=\"[^\"]*padding:\s*\d", b, re.I))


def _paragraphs(body: str) -> str:
    """Plain text (no tags at all) → paragraphs; HTML is kept as it is."""
    if re.search(r"<(p|div|br|h[1-6]|ul|ol|table)\b", body or "", re.I):
        return body
    blocks = [b.strip() for b in re.split(r"\n\s*\n", body or "") if b.strip()]
    return "".join(f"<p>{_html.escape(b).replace(chr(10), '<br>')}</p>" for b in blocks)


def _initials(name: str) -> str:
    words = [w for w in (name or "Wedy").split() if w.upper() not in ("SARL", "SA", "SAS", "SARLAU")]
    s = "".join(w[0] for w in words) if len(words) > 1 else (words[0] if words else "W")
    return s[:2].upper()


def _safe_img(src: Optional[str]) -> Optional[str]:
    return src if isinstance(src, str) and src.startswith("data:image/") else None


def compose(content: str, *, title: str, company: dict, assets: dict, lang: str = "fr", code: str = "",
            signer: str = "", today: Optional[date] = None) -> str:
    """The document's HTML (one block, no <html>): the template as it is, or set on the letterhead."""
    rtl = lang == "ar"
    dir_attr = ' dir="rtl"' if rtl else ""
    if has_own_layout(content):
        return f'<div class="wedy-doc own{" boxed" if is_boxed(content) else ""}"{dir_attr}>{_paragraphs(content)}</div>'

    esc = _html.escape
    tx = _TEXT.get(lang, _TEXT["fr"])
    name = company.get("name") or ""
    line = " · ".join(x for x in [", ".join(x for x in [company.get("address"), company.get("city")] if x), company.get("phone")] if x)
    ids = " · ".join(x for x in [company.get("rc") and f"RC {company['rc']}", company.get("ice") and f"ICE {company['ice']}",
                                 company.get("cnss") and f"CNSS {company['cnss']}"] if x)
    logo = _safe_img(assets.get("logo"))
    logo_html = f'<img src="{logo}" alt="">' if logo else f'<span class="lh-initials">{esc(_initials(name))}</span>'
    body = _paragraphs(content)
    # the title, unless the template already starts with it
    head_text = _norm(_text(body))[:160]
    show_title = title and _norm(title) not in head_text and not re.search(r"<h[1-3]\b", body, re.I)
    d = today or date.today()
    place_date = tx["place_date"].format(city=esc(company.get("city") or "Casablanca"), date=d.strftime("%d/%m/%Y"))
    sign = _safe_img(assets.get("signature"))
    stamp = _safe_img(assets.get("stamp"))
    who = signer or "Wedy RH"
    sign_html = (f'<img class="sign-img" src="{sign}" alt="">' if sign
                 else f'<span class="sign-name">{esc(who[:1])}. {esc(who.split()[-1])}</span>')
    stamp_html = (f'<img class="stamp-img" src="{stamp}" alt="">' if stamp
                  else f'<span class="stamp">{esc(name)}<br>{esc(company.get("city") or "")}</span>')
    foot_right = esc(company.get("email") or "")
    return (
        f'<div class="wedy-doc letter"{dir_attr}>'
        f'<table class="lh"><tr><td class="lh-logo">{logo_html}</td><td><div class="lh-name">{esc(name)}</div>'
        + (f'<div class="lh-line">{esc(line)}</div>' if line else "") + "</td></tr></table>"
        + (f'<div class="lh-ids">{esc(ids)}</div>' if ids else "")
        + '<div class="lh-rule"></div>'
        + (f'<h1 class="doc-title">{esc(title.upper())}</h1>' if show_title else '<div style="height:22pt"></div>')
        + f'<div class="doc-body">{body}</div>'
        + f'<p class="place-date">{place_date}</p>'
        + '<table class="sign"><tr><td></td>'
        + f'<td class="sign-cell"><div class="sign-dept">{esc(tx["dept"])}</div>{sign_html}{stamp_html}</td></tr></table>'
        + f'<table class="doc-foot" style="width:100%"><tr><td>Wedy · {esc(code)}</td><td style="text-align:right">{foot_right}</td></tr></table>'
        + "</div>"
    )


def full_html(fragment: str, title: str = "Document") -> str:
    """A complete HTML page around the document (for the PDF, the print view and the preview frame)."""
    return ("<!DOCTYPE html><html><head><meta charset='utf-8'>"
            f"<title>{_html.escape(title)}</title><style>{DOC_CSS}</style></head>"
            f"<body>{fragment}</body></html>")


def is_composed(content: str) -> bool:
    return 'class="wedy-doc' in (content or "")[:400]


def html_to_pdf(fragment: str, title: str = "Document") -> bytes:
    from weasyprint import HTML
    page = fragment if is_composed(fragment) else f'<div class="wedy-doc own{" boxed" if is_boxed(fragment) else ""}">{_paragraphs(fragment)}</div>'
    return HTML(string=full_html(page, title)).write_pdf()
