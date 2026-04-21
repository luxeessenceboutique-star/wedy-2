import re
from datetime import date, datetime
from io import BytesIO
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH


def _format_date(value) -> str:
    if not value:
        return ""
    if isinstance(value, (date, datetime)):
        return value.strftime("%d/%m/%Y")
    try:
        return datetime.fromisoformat(str(value)).strftime("%d/%m/%Y")
    except Exception:
        return str(value)


def fill_template(body_template: str, variables: dict) -> str:
    """Replace {{variable}} placeholders with actual values."""
    today = date.today().strftime("%d/%m/%Y")
    ctx = {"today": today, **variables}

    date_fields = {
        "hire_date", "contract_start", "contract_end",
        "internship_start", "internship_end", "birth_date",
    }
    for key in date_fields:
        if key in ctx:
            ctx[key] = _format_date(ctx[key])

    if "salary" in ctx and ctx["salary"] is not None:
        try:
            ctx["salary"] = f"{float(ctx['salary']):,.2f}"
        except (TypeError, ValueError):
            pass

    def replacer(match: re.Match) -> str:
        key = match.group(1).strip()
        return str(ctx.get(key, match.group(0)))

    return re.sub(r"\{\{(\w+)\}\}", replacer, body_template)


def generate_pdf_bytes(content: str, title: str = "Document RH") -> bytes:
    """Generate a PDF from plain text content using WeasyPrint."""
    from weasyprint import HTML

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body {{
    font-family: 'DejaVu Sans', Arial, sans-serif;
    font-size: 12pt;
    line-height: 1.8;
    margin: 0;
    padding: 0;
    color: #1a1a1a;
  }}
  .page {{
    padding: 2.5cm 3cm;
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0ea5e9;
    padding-bottom: 12px;
    margin-bottom: 24px;
  }}
  .company-name {{
    font-size: 18pt;
    font-weight: bold;
    color: #0ea5e9;
  }}
  .company-sub {{
    font-size: 9pt;
    color: #666;
  }}
  .doc-date {{
    font-size: 10pt;
    color: #444;
    text-align: right;
  }}
  .content {{
    white-space: pre-wrap;
    font-size: 11pt;
    margin-top: 20px;
  }}
  .footer {{
    border-top: 1px solid #ddd;
    margin-top: 40px;
    padding-top: 12px;
    font-size: 9pt;
    color: #888;
    text-align: center;
  }}
  .signature-area {{
    margin-top: 60px;
    display: flex;
    justify-content: space-between;
  }}
  .sig-box {{
    text-align: center;
    width: 200px;
  }}
  .sig-line {{
    border-top: 1px solid #333;
    margin-top: 40px;
    font-size: 10pt;
  }}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="company-name">TYTHON</div>
      <div class="company-sub">Département Ressources Humaines</div>
    </div>
    <div class="doc-date">YODABOT RH</div>
  </div>
  <div class="content">{content}</div>
  <div class="signature-area">
    <div class="sig-box">
      <div class="sig-line">Le/La Salarié(e)</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Direction RH — TYTHON</div>
    </div>
  </div>
  <div class="footer">Document généré par YODABOT · TYTHON · Confidentiel</div>
</div>
</body>
</html>"""

    pdf_bytes = HTML(string=html).write_pdf()
    return pdf_bytes


def generate_docx_bytes(content: str, title: str = "Document RH") -> bytes:
    """Generate a .docx from plain text content."""
    doc = Document()

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    header_para = doc.add_paragraph()
    header_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = header_para.add_run("TYTHON — Département Ressources Humaines")
    run.bold = True
    run.font.size = Pt(14)
    run.font.color.rgb = None

    doc.add_paragraph()

    for line in content.split("\n"):
        p = doc.add_paragraph(line)
        p.paragraph_format.space_after = Pt(2)

    doc.add_paragraph()
    sig_para = doc.add_paragraph("Le/La Salarié(e)" + " " * 60 + "Direction RH — TYTHON")
    sig_para.paragraph_format.space_before = Pt(40)

    footer_para = doc.add_paragraph("Document généré par YODABOT · TYTHON · Confidentiel")
    footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_run = footer_para.runs[0]
    footer_run.font.size = Pt(8)

    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()
