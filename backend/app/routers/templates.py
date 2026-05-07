"""Templates router — /api/templates"""
import re
import time
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form, Body
from supabase import Client
from app.database import get_db
from app.dependencies import get_current_user, require_admin, require_hr_or_admin
from app.services.ai_service import clean_template_html

router = APIRouter(prefix="/templates", tags=["templates"])


# ── Document → styled HTML converters ────────────────────────────────────────

def _pdf_to_styled_html(content: bytes) -> str:
    """Extract PDF as clean flow HTML (no position:absolute) so it's editable in a WYSIWYG editor."""
    import fitz

    doc = fitz.open(stream=content, filetype="pdf")
    parts: list[str] = []

    for page_num, page in enumerate(doc):
        if page_num > 0:
            parts.append('<hr style="border:none;border-top:2px dashed #ccc;margin:40px 0;" />')

        # get_text("dict") gives us blocks with font metadata but NO absolute positioning
        data = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)

        # Collect all font sizes to detect headings (anything > median is a heading candidate)
        all_sizes: list[float] = []
        for blk in data.get("blocks", []):
            if blk.get("type") == 0:
                for ln in blk.get("lines", []):
                    for sp in ln.get("spans", []):
                        if sp.get("text", "").strip():
                            all_sizes.append(sp.get("size", 12))
        median_size = sorted(all_sizes)[len(all_sizes) // 2] if all_sizes else 12

        for blk in data.get("blocks", []):
            if blk.get("type") != 0:
                continue  # skip image blocks

            block_paras: list[str] = []
            for ln in blk.get("lines", []):
                inline = ""
                for sp in ln.get("spans", []):
                    txt = sp.get("text", "")
                    if not txt:
                        continue
                    flags = sp.get("flags", 0)
                    size  = sp.get("size", 12)
                    color = sp.get("color", 0)

                    bold   = bool(flags & 16)
                    italic = bool(flags & 2)

                    r = (color >> 16) & 0xFF
                    g_c = (color >> 8) & 0xFF
                    b_c = color & 0xFF
                    hex_col = f"#{r:02x}{g_c:02x}{b_c:02x}"

                    st: list[str] = [f"font-size:{size:.1f}pt"]
                    if bold:
                        st.append("font-weight:bold")
                    if italic:
                        st.append("font-style:italic")
                    if hex_col != "#000000":
                        st.append(f"color:{hex_col}")

                    esc = txt.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    inline += f'<span style="{";".join(st)}">{esc}</span>' if st else esc

                if inline.strip():
                    block_paras.append(inline)

            if not block_paras:
                continue

            joined = " ".join(block_paras)

            # Heading detection: large font or bold + short text
            try:
                first_sp = blk["lines"][0]["spans"][0]
                is_big   = first_sp["size"] > median_size * 1.15
                is_bold  = bool(first_sp["flags"] & 16)
                short    = sum(len(p) for p in block_paras) < 120
                is_head  = (is_big or (is_bold and short))
            except Exception:
                is_head = False

            if is_head:
                parts.append(
                    f'<h2 style="text-align:center;font-weight:bold;margin:20px 0 10px;">{joined}</h2>'
                )
            else:
                for para in block_paras:
                    parts.append(f'<p style="margin:4px 0;line-height:1.8;">{para}</p>')

    inner = "\n".join(parts) if parts else "<p>Document vide</p>"
    return (
        '<div style="font-family:\'Times New Roman\',serif;font-size:12pt;'
        'color:#1a1a1a;line-height:1.8;">'
        f'{inner}</div>'
    )


def _docx_to_styled_html(content: bytes) -> str:
    """Convert DOCX to HTML preserving paragraph styles, bold, italic, font sizes."""
    from docx import Document as DocxDoc
    from docx.oxml.ns import qn
    from io import BytesIO
    import base64

    doc = DocxDoc(BytesIO(content))
    parts: list[str] = []

    # Extract embedded images (logos, etc.) from relationships
    img_map: dict[str, str] = {}
    try:
        for rel in doc.part.rels.values():
            if "image" in rel.reltype:
                try:
                    img_bytes = rel.target_part.blob
                    img_b64 = base64.b64encode(img_bytes).decode()
                    ct = rel.target_part.content_type or "image/png"
                    img_map[rel.rId] = f"data:{ct};base64,{img_b64}"
                except Exception:
                    pass
    except Exception:
        pass

    # Inline images
    try:
        for block in doc.element.body:
            tag = block.tag.split("}")[-1] if "}" in block.tag else block.tag
            if tag == "p":
                for drawing in block.findall(".//" + qn("a:blip")):
                    embed = drawing.get(qn("r:embed"))
                    if embed and embed in img_map:
                        parts.append(
                            f'<div style="text-align:center;margin:12px 0;">'
                            f'<img src="{img_map[embed]}" style="max-width:200px;height:auto;" /></div>'
                        )
    except Exception:
        pass

    def _align(para) -> str:
        try:
            if para.alignment is None:
                return "left"
            val = para.alignment
            # Use integer value: 0=left,1=center,2=right,3=justify
            return {0: "left", 1: "center", 2: "right", 3: "justify"}.get(int(val), "left")
        except Exception:
            return "left"

    for para in doc.paragraphs:
        text = para.text
        if not text.strip():
            parts.append('<p style="margin:4px 0;">&nbsp;</p>')
            continue

        align = _align(para)
        style_name = ""
        try:
            style_name = para.style.name if para.style else ""
        except Exception:
            pass

        # Headings
        heading_done = False
        for lvl in (1, 2, 3):
            if f"Heading {lvl}" in style_name or f"Titre {lvl}" in style_name:
                sz = [22, 17, 14][lvl - 1]
                escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                parts.append(
                    f'<h{lvl} style="text-align:{align};font-size:{sz}px;font-weight:700;'
                    f'margin:16px 0 8px;">{escaped}</h{lvl}>'
                )
                heading_done = True
                break

        if heading_done:
            continue

        # Build inline HTML per run
        inline = ""
        for run in para.runs:
            rt = run.text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            if not rt:
                continue
            rs: list[str] = []
            try:
                if run.font.size:
                    rs.append(f"font-size:{run.font.size.pt:.0f}pt")
            except Exception:
                pass
            try:
                if run.font.color and run.font.color.type:
                    rs.append(f"color:#{run.font.color.rgb}")
            except Exception:
                pass
            try:
                if run.bold:
                    rs.append("font-weight:bold")
                if run.italic:
                    rs.append("font-style:italic")
                if run.underline:
                    rs.append("text-decoration:underline")
            except Exception:
                pass
            span_style = ";".join(rs)
            inline += f'<span style="{span_style}">{rt}</span>' if span_style else rt

        if not inline:
            inline = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        p_bold = "Bold" in style_name or "Gras" in style_name
        if p_bold:
            inline = f"<strong>{inline}</strong>"

        parts.append(f'<p style="margin:5px 0;text-align:{align};">{inline}</p>')

    # Tables
    try:
        for tbl in doc.tables:
            rows_html = ""
            for row in tbl.rows:
                cells_html = "".join(
                    f'<td style="border:1px solid #ccc;padding:6px 10px;font-size:12px;">'
                    f'{cell.text.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")}</td>'
                    for cell in row.cells
                )
                rows_html += f"<tr>{cells_html}</tr>"
            parts.append(
                f'<table style="border-collapse:collapse;width:100%;margin:12px 0;">'
                f'{rows_html}</table>'
            )
    except Exception:
        pass

    inner = "\n".join(parts)
    return (
        '<div style="font-family:\'Times New Roman\',serif;max-width:720px;margin:0 auto;'
        'padding:48px 56px;background:#fff;color:#111;line-height:1.7;">'
        f'{inner}</div>'
    )


def _text_to_basic_html(raw_text: str) -> str:
    """Plain text → minimal HTML (last resort fallback)."""
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    parts = []
    for line in lines:
        escaped = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        if len(line) < 70 and line.isupper():
            parts.append(
                f'<h2 style="text-align:center;font-weight:bold;margin:24px 0 12px;">{escaped}</h2>'
            )
        else:
            parts.append(f'<p style="margin:5px 0;">{escaped}</p>')
    return (
        '<div style="font-family:serif;max-width:720px;margin:0 auto;padding:48px;">'
        + "".join(parts) + "</div>"
    )


# Variable patterns to substitute — matches common HR document field patterns
_VAR_SUBS = [
    # Brackets style: [Nom et prénom], [CIN], etc.
    (r"\[Nom\s+et\s+pr[ée]nom[^\]]*\]",            "{{full_name}}"),
    (r"\[Pr[ée]nom\s+et\s+[Nn]om[^\]]*\]",         "{{full_name}}"),
    (r"\[Nom\s+complet[^\]]*\]",                    "{{full_name}}"),
    (r"\(Nom\s+Pr[ée]nom\)",                        "{{full_name}}"),
    (r"\[CIN[^\]]*\]",                              "{{cin}}"),
    (r"\(CIN[^\)]*\)",                              "{{cin}}"),
    (r"\[Num[ée]ro\s+CIN[^\]]*\]",                 "{{cin}}"),
    (r"\[date\s+d.embauche[^\]]*\]",                "{{hire_date}}"),
    (r"\[date\s+de\s+d[ée]but[^\]]*\]",            "{{contract_start}}"),
    (r"\[date\s+de\s+fin[^\]]*\]",                  "{{contract_end}}"),
    (r"\[poste\s+occup[ée][^\]]*\]",               "{{position}}"),
    (r"\[poste[^\]]*\]",                            "{{position}}"),
    (r"\[d[ée]partement[^\]]*\]",                  "{{department}}"),
    (r"\[salaire[^\]]*\]",                          "{{salary}}"),
    (r"\[montant[^\]]*\]",                          "{{salary}}"),
    (r"\[adresse[^\]]*\]",                          "{{address}}"),
    (r"\(adresse[^\)]*\)",                          "{{address}}"),
    (r"\[ville[^\]]*\]",                            "{{city}}"),
    (r"\[email[^\]]*\]",                            "{{email}}"),
    (r"\[t[ée]l[ée]phone[^\]]*\]",                 "{{phone}}"),
    (r"\[matricule[^\]]*\]",                        "{{matricule}}"),
    (r"\[type\s+de\s+contrat[^\]]*\]",             "{{contract_type}}"),
    (r"\[nationalit[ée][^\]]*\]",                  "{{nationality}}"),
    (r"\[manager[^\]]*\]",                          "{{manager}}"),
    (r"\[responsable[^\]]*\]",                      "{{manager}}"),
    (r"\[Date\s+du\s+jour[^\]]*\]",                "{{today}}"),
    (r"\[date[^\]]*\]",                             "{{today}}"),
    (r"\[Date\]",                                   "{{today}}"),
    # Underscore blanks: ____________ (6+ underscores in context)
    # Left as-is — user fills manually or via extra_variables
]


def _apply_variable_substitution(html: str) -> str:
    """Replace known HR field patterns with {{variable}} placeholders in-place."""
    for pattern, replacement in _VAR_SUBS:
        html = re.sub(pattern, replacement, html, flags=re.IGNORECASE)
    return html


@router.get("")
async def list_templates(
    category: str = Query(None),
    active_only: bool = Query(True),
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.table("document_templates").select("*").order("name_fr")
    if active_only:
        query = query.eq("is_active", True)
    if category:
        query = query.eq("category", category)
    result = query.execute()
    return {"data": result.data, "count": len(result.data)}


@router.post("", status_code=201)
async def create_template(
    payload: dict = Body(...),
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    allowed = {"code", "name_fr", "name_en", "name_ar", "category", "target_type", "body_template", "variables", "is_active"}
    data = {k: v for k, v in payload.items() if k in allowed}
    if "code" not in data:
        base = re.sub(r"[^\w]", "_", data.get("name_fr", "template").lower())[:40]
        data["code"] = f"{base}_{int(time.time()) % 100000}"
    name_fr = data.get("name_fr", "")
    data.setdefault("name_en", name_fr)
    data.setdefault("name_ar", name_fr)
    data.setdefault("is_active", True)
    data.setdefault("category", "autre")
    data.setdefault("target_type", "employee")
    data.setdefault("variables", [])
    try:
        result = db.table("document_templates").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur base de données : {e}")
    if not result.data:
        raise HTTPException(status_code=400, detail="Could not create template")
    return result.data[0]


@router.post("/import", status_code=201)
async def import_template_from_file(
    file: UploadFile = File(...),
    name_fr: str = Form(...),
    name_en: str = Form(""),
    name_ar: str = Form(""),
    category: str = Form("autre"),
    target_type: str = Form("employee"),
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    filename = file.filename or ""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext not in ("pdf", "docx", "doc", "txt"):
        raise HTTPException(status_code=400, detail="Formats supportés : PDF, DOCX, TXT")

    content = await file.read()

    try:
        from app.services.pdf_template_extractor import extract_pdf_template
        body_template = extract_pdf_template(content, filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Impossible de traiter le fichier : {e}")

    if not body_template.strip():
        raise HTTPException(status_code=422, detail="Impossible d'extraire le contenu du document")

    variables = sorted(set(re.findall(r"\{\{(\w+)\}\}", body_template)))

    base_code = re.sub(r"[^\w]", "_", name_fr.lower())[:40]
    code = f"{base_code}_{int(time.time()) % 100000}"

    data = {
        "code":          code,
        "name_fr":       name_fr,
        "name_en":       name_en or name_fr,
        "name_ar":       name_ar or name_fr,
        "category":      category,
        "target_type":   target_type if target_type in ("employee", "intern", "both") else "employee",
        "body_template": body_template,
        "variables":     variables,
        "is_active":     True,
    }

    try:
        result = db.table("document_templates").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur base de données : {e}")
    if not result.data:
        raise HTTPException(status_code=500, detail="Impossible de sauvegarder le modèle")

    return {"template": result.data[0], "variables": variables, "body_template": body_template}


@router.post("/preview-import", status_code=200)
async def preview_import(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_hr_or_admin),
):
    filename = file.filename or ""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext not in ("pdf", "docx", "doc", "txt"):
        raise HTTPException(status_code=400, detail="Formats supportés : PDF, DOCX, TXT")

    content = await file.read()

    try:
        from app.services.pdf_template_extractor import extract_pdf_template
        body_template = extract_pdf_template(content, filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Lecture impossible : {e}")

    if not body_template.strip():
        raise HTTPException(status_code=422, detail="Contenu non extrait")

    variables = sorted(set(re.findall(r"\{\{(\w+)\}\}", body_template)))
    return {"body_template": body_template, "variables": variables, "raw_text": body_template}


# ── Default professional templates ────────────────────────────────────────────

_HEADER = (
    '<div style="font-family:\'Times New Roman\',serif;max-width:720px;margin:0 auto;'
    'padding:60px 72px;color:#1a1a1a;line-height:1.8;">'
    '<div style="text-align:center;margin-bottom:40px;padding-bottom:16px;border-bottom:2px solid #5b21b6;">'
    '<p style="font-size:26px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>'
    '<p style="font-size:10px;color:#9ca3af;margin:4px 0 0;letter-spacing:3px;">&#8212; INNOVATE NOW &#8212;</p>'
    '</div>'
)
_FOOTER = '</div>'

def _sig_block(left_label: str = "L'intéressé(e)", right_label: str = "La Direction des Ressources Humaines") -> str:
    return (
        '<div style="display:flex;justify-content:space-between;margin-top:70px;">'
        f'<div style="width:44%;text-align:center;">'
        f'<p style="font-size:12px;font-weight:bold;margin-bottom:70px;">{left_label}</p>'
        '<p style="font-size:12px;border-top:1px solid #aaa;padding-top:8px;">Signature</p>'
        '</div>'
        f'<div style="width:44%;text-align:center;">'
        f'<p style="font-size:12px;font-weight:bold;margin-bottom:70px;">{right_label}</p>'
        '<p style="font-size:12px;border-top:1px solid #aaa;padding-top:8px;">Signature et Cachet</p>'
        '</div>'
        '</div>'
    )

def _title(text: str) -> str:
    return (
        f'<h2 style="text-align:center;font-size:15px;font-weight:bold;'
        f'text-decoration:underline;letter-spacing:2px;margin:40px 0 50px;">{text}</h2>'
    )

def _date_line() -> str:
    return '<p style="text-align:right;font-size:12px;margin-bottom:40px;">Casablanca, le <strong>{{today}}</strong></p>'

def _p(text: str, extra_style: str = "") -> str:
    return f'<p style="margin-bottom:18px;font-size:13px;{extra_style}">{text}</p>'

def _box(text: str) -> str:
    return (
        f'<p style="margin:28px 0;font-size:13px;padding:16px 22px;'
        f'border-left:4px solid #5b21b6;background:#faf5ff;">{text}</p>'
    )


_DEFAULT_TEMPLATES = [
    {
        "code":     "attestation_travail",
        "name_fr":  "Attestation de travail",
        "name_en":  "Work Certificate",
        "name_ar":  "شهادة عمل",
        "category": "attestation",
        "variables": ["full_name","cin","position","department","contract_start","contract_end","today"],
        "body_template": (
            _HEADER +
            _title("ATTESTATION DE TRAVAIL") +
            _date_line() +
            _p("Je soussignée, <strong>Mme ENNAJI Widad</strong>, agissant en qualité de Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, atteste que :") +
            _box(
                "<strong>M./Mme {{full_name}}</strong>, titulaire de la Carte Nationale d'Identité N° <strong>{{cin}}</strong>, "
                "occupe le poste de <strong>{{position}}</strong> au sein du département <strong>{{department}}</strong> "
                "de notre société depuis le <strong>{{contract_start}}</strong> jusqu'au <strong>{{contract_end}}</strong>."
            ) +
            _p("Cette attestation est délivrée à l'intéressé(e) à sa demande expresse, pour servir et valoir ce que de droit, "
               "notamment pour toutes démarches administratives nécessaires.") +
            _p("En foi de quoi, nous lui délivrons la présente attestation et la signons.") +
            _sig_block() +
            _FOOTER
        ),
    },
    {
        "code":     "attestation_salaire",
        "name_fr":  "Attestation de salaire",
        "name_en":  "Salary Certificate",
        "name_ar":  "شهادة الراتب",
        "category": "attestation",
        "variables": ["full_name","cin","position","department","hire_date","salary","today"],
        "body_template": (
            _HEADER +
            _title("ATTESTATION DE SALAIRE") +
            _date_line() +
            _p("Je soussignée, <strong>Mme ENNAJI Widad</strong>, agissant en qualité de Directrice des Ressources Humaines "
               "de la société <strong>TYTHON SARL</strong>, atteste que :") +
            _p("<strong>M./Mme {{full_name}}</strong>, titulaire de la CIN N° <strong>{{cin}}</strong>, "
               "exerce la fonction de <strong>{{position}}</strong> au sein du département <strong>{{department}}</strong> "
               "de notre société depuis le <strong>{{hire_date}}</strong>.") +
            _box("Sa rémunération mensuelle brute est de : <strong>{{salary}}</strong>.") +
            _p("Cette attestation est délivrée à l'intéressé(e) à sa demande, pour servir et valoir ce que de droit, "
               "notamment pour toute démarche bancaire, administrative ou autre.") +
            '<div style="text-align:right;margin-top:70px;">'
            '<p style="font-size:12px;font-weight:bold;margin-bottom:70px;">La Direction des Ressources Humaines</p>'
            '<p style="font-size:12px;border-top:1px solid #aaa;padding-top:8px;display:inline-block;min-width:220px;">Signature et Cachet</p>'
            '</div>' +
            _FOOTER
        ),
    },
    {
        "code":     "lettre_mission",
        "name_fr":  "Lettre de mission",
        "name_en":  "Mission Letter",
        "name_ar":  "رسالة مهمة",
        "category": "lettre",
        "variables": ["full_name","position","department","today"],
        "body_template": (
            _HEADER +
            _title("LETTRE DE MISSION") +
            _date_line() +
            _p("Objet : <strong>Mission professionnelle</strong>", "font-weight:bold;") +
            _p("La société <strong>TYTHON SARL</strong> certifie que :") +
            _box(
                "<strong>M./Mme {{full_name}}</strong>, <strong>{{position}}</strong> au sein du département "
                "<strong>{{department}}</strong>, est mandaté(e) pour effectuer une mission professionnelle "
                "pour le compte de la société."
            ) +
            _p("Prière à toutes autorités civiles et militaires de lui accorder aide et assistance si nécessaire, "
               "et de lui faciliter l'accomplissement de sa mission.") +
            _p("La présente lettre de mission est délivrée pour faire foi et valoir ce que de droit.") +
            '<div style="text-align:right;margin-top:70px;">'
            '<p style="font-size:12px;font-weight:bold;margin-bottom:70px;">La Direction Générale</p>'
            '<p style="font-size:12px;border-top:1px solid #aaa;padding-top:8px;display:inline-block;min-width:220px;">Signature et Cachet</p>'
            '</div>' +
            _FOOTER
        ),
    },
    {
        "code":     "contrat_cdi",
        "name_fr":  "Contrat CDI",
        "name_en":  "Permanent Employment Contract",
        "name_ar":  "عقد عمل غير محدد المدة",
        "category": "contrat",
        "variables": ["full_name","cin","position","department","salary","hire_date","today"],
        "body_template": (
            _HEADER +
            _title("CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE") +
            _date_line() +
            _p("<strong>ENTRE LES SOUSSIGNÉS :</strong>") +
            _p("La société <strong>TYTHON SARL</strong>, au capital de 100 000 MAD, dont le siège social est à Casablanca, "
               "représentée par sa Directrice des Ressources Humaines, <strong>Mme ENNAJI Widad</strong>, "
               "ci-après dénommée <strong>« l'Employeur »</strong>,") +
            _p("<strong>ET :</strong>") +
            _p("<strong>M./Mme {{full_name}}</strong>, titulaire de la CIN N° <strong>{{cin}}</strong>, "
               "ci-après dénommé(e) <strong>« le Salarié »</strong>,") +
            _p("Il est convenu ce qui suit :") +
            _p("<strong>Article 1 — Engagement</strong><br/>"
               "L'Employeur engage le Salarié à compter du <strong>{{hire_date}}</strong>, pour occuper le poste de "
               "<strong>{{position}}</strong> au sein du département <strong>{{department}}</strong>, "
               "dans le cadre d'un contrat à durée indéterminée (CDI), conformément aux dispositions du "
               "Code du Travail marocain.") +
            _p("<strong>Article 2 — Rémunération</strong><br/>"
               "Le Salarié percevra une rémunération mensuelle brute de <strong>{{salary}}</strong>, "
               "payable à terme échu, déduction faite des cotisations sociales et fiscales légales.") +
            _p("<strong>Article 3 — Durée du travail</strong><br/>"
               "La durée légale du travail est fixée à 44 heures par semaine, conformément à la législation marocaine en vigueur.") +
            _p("<strong>Article 4 — Période d'essai</strong><br/>"
               "Le présent contrat est soumis à une période d'essai de trois (3) mois renouvelable une fois, "
               "conformément aux dispositions légales applicables.") +
            _p("<strong>Article 5 — Confidentialité</strong><br/>"
               "Le Salarié s'engage à respecter la confidentialité des informations, données et procédés "
               "auxquels il aura accès dans le cadre de ses fonctions.") +
            _p("Fait en double exemplaire à Casablanca, le <strong>{{today}}</strong>.") +
            _sig_block("Le Salarié<br/>(Lu et approuvé)", "L'Employeur<br/>TYTHON SARL") +
            _FOOTER
        ),
    },
    {
        "code":     "attestation_stage",
        "name_fr":  "Attestation de stage",
        "name_en":  "Internship Certificate",
        "name_ar":  "شهادة تدريب",
        "category": "attestation",
        "variables": ["full_name","cin","position","department","contract_start","contract_end","today"],
        "body_template": (
            _HEADER +
            _title("ATTESTATION DE STAGE") +
            _date_line() +
            _p("Je soussignée, <strong>Mme ENNAJI Widad</strong>, agissant en qualité de Directrice des Ressources Humaines "
               "au sein de la société <strong>TYTHON SARL</strong>, atteste que :") +
            _box(
                "<strong>M./Mme {{full_name}}</strong>, titulaire de la CIN N° <strong>{{cin}}</strong>, "
                "a effectué un stage au sein du département <strong>{{department}}</strong> "
                "en qualité de <strong>{{position}}</strong>, "
                "du <strong>{{contract_start}}</strong> au <strong>{{contract_end}}</strong>."
            ) +
            _p("Durant cette période, l'intéressé(e) a fait preuve de sérieux, de rigueur et d'engagement. "
               "Il/elle a activement contribué aux missions qui lui ont été confiées et a su s'intégrer "
               "pleinement au sein de notre équipe.") +
            _p("Cette attestation est délivrée à l'intéressé(e) à sa demande, pour servir et valoir ce que de droit.") +
            _sig_block("L'intéressé(e)", "La Direction des Ressources Humaines") +
            _FOOTER
        ),
    },
]


@router.post("/seed-defaults", status_code=201)
async def seed_default_templates(
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Insert the built-in professional HR templates (skips any whose code already exists)."""
    existing_res = db.table("document_templates").select("code").execute()
    existing_codes = {r["code"] for r in (existing_res.data or [])}

    created = []
    skipped = []
    for tpl in _DEFAULT_TEMPLATES:
        if tpl["code"] in existing_codes:
            skipped.append(tpl["code"])
            continue
        data = {
            "code":          tpl["code"],
            "name_fr":       tpl["name_fr"],
            "name_en":       tpl["name_en"],
            "name_ar":       tpl["name_ar"],
            "category":      tpl["category"],
            "body_template": tpl["body_template"],
            "variables":     tpl["variables"],
            "is_active":     True,
        }
        try:
            res = db.table("document_templates").insert(data).execute()
            if res.data:
                created.append(tpl["code"])
        except Exception:
            skipped.append(tpl["code"])

    return {"created": created, "skipped": skipped}


# ── Parameterized routes AFTER static routes ──────────────────────────────────

@router.get("/{template_id}")
async def get_template(
    template_id: str,
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = db.table("document_templates").select("*").eq("id", template_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return result.data


@router.patch("/{template_id}")
async def update_template(
    template_id: str,
    payload: dict = Body(...),
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    allowed = {"name_fr", "name_en", "name_ar", "category", "target_type", "body_template", "variables", "is_active"}
    data = {k: v for k, v in payload.items() if k in allowed}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = db.table("document_templates").update(data).eq("id", template_id).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur base de données : {e}")
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return result.data[0]


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    db.table("document_templates").delete().eq("id", template_id).execute()
