"""Generated documents keep the template's shape: a document imported already filled for someone (an attestation written
for « Mme CHAIMAA BYAZ ») becomes a template whose person's values are fields; generated for someone else it reads
right, with nothing added around it; a short Wedy template is set on the letterhead; the PDF / DOCX / filed copy are
the same page; edits are saved; the AI may not break the layout. Fake database, no AI, no network:
    python backend/tests/test_generate_layout.py"""
import io
import os
import re
import sys
import tempfile
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fakedb import FakeDB  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import get_db  # noqa: E402
from app.dependencies import get_current_user, require_hr_or_admin  # noqa: E402
from app.main import app  # noqa: E402
from app.services import ai_service, document_layout, template_fields as tf  # noqa: E402

settings.UPLOAD_DIR = tempfile.mkdtemp(prefix="wedy-test-uploads-")
settings.DURABLE_STORAGE = False
USER = {"id": "11111111-2222-3333-4444-555555555555", "role_name": "hr", "email": "hr@t.ma"}
TODAY = date.today().strftime("%d/%m/%Y")

GOOGLE_DOCS_ATTESTATION = """<div style="font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.55;color:#111;max-width:720px;margin:0 auto;padding:48px 56px;background:#fff;">
<p style="margin:0 0 12px;text-align:center"><b>ATTESTATION DE TRAVAIL</b></p>
<p style="margin:0 0 10px;text-align:justify;">Je soussignée, Mme ENNAJI Widad, agissant en qualité de Directrice des Ressources Humaines de la société TYTHON SARL, dont le siège social est situé au 55 BD ZERKTOUNI ESPACE ZERKTOUNI 1ER ETAGE N°3 QH 2000 CASABLANCA, immatriculée au registre de commerce sous le numéro 553131, atteste et certifie par la présente que :</p>
<p style="margin:0 0 10px;">Mme CHAIMAA BYAZ, née le 20/06/1998 à Casablanca,</p>
<p style="margin:0 0 10px;text-align:justify;">est employée au sein de notre société en qualité de Product Designer depuis le 01/08/2023 et ce jusqu'à présent, sous contrat à durée indéterminée (CDI).</p>
<p style="margin:0 0 10px;text-align:justify;">Cette attestation est délivrée à la demande de l'intéressée pour servir et valoir ce que de droit.</p>
<p style="margin:0 0 10px;">Fait à Casablanca, le 02/09/2026.</p>
<p style="margin:0 0 12px;margin-inline-start:60%;width:40%;text-align:center"><b>La Directrice des Ressources Humaines</b><br>Widad ENNAJI</p>
</div>"""

GRIDDA = {"id": "e-gridda", "full_name": "GRIDDA Mohamed", "cin": "BK123456", "position": "Développeur Full-Stack", "hire_date": "2024-02-01",
          "contract_type": "CDI", "birth_date": "1995-03-14", "status": "active", "custom_fields": {"civility": "Monsieur", "birth_place": "Rabat"},
          "manager": "Salma Idrissi"}


def client():
    db = FakeDB()
    db.tables.update({"document_templates": [], "generated_documents": [], "employee_files": [], "employees": [dict(GRIDDA)], "app_settings": []})
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[require_hr_or_admin] = lambda: USER
    return TestClient(app), db


def text_of(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html)).strip()


def test_a_filled_document_becomes_a_template_and_is_generated_for_someone_else():
    c, db = client()
    db.tables["document_templates"].append({"id": "t-gd", "name_fr": "ATTESTATION DE TRAVAIL Google Docs", "category": "attestation",
                                             "body_template": GOOGLE_DOCS_ATTESTATION, "variables": []})
    # look again at the saved template: the person's values are found, the signatory is not
    an = c.post("/api/templates/t-gd/analyse", json={}).json()
    keys = {f["placeholder"]: f["key"] for f in an["fields"]}
    assert keys == {"Mme (civilité)": "civility_short", "CHAIMAA BYAZ (nom)": "full_name", "20/06/1998 (né(e) le)": "birth_date",
                    "Casablanca (né(e) à)": "birth_place", "Product Designer (poste)": "position", "01/08/2023 (depuis le)": "hire_date",
                    "à durée indéterminée (CDI) (contrat)": "contract_phrase", "Casablanca (fait à)": "company_city",
                    "02/09/2026 (date du document)": "today"}, keys
    assert db.tables["document_templates"][0]["body_template"] == GOOGLE_DOCS_ATTESTATION   # nothing saved yet
    saved = c.post("/api/templates/t-gd/fields", json={"mapping": {}}).json()["template"]
    assert "CHAIMAA" not in saved["body_template"] and "{{full_name}}" in saved["body_template"] and "ENNAJI Widad" in saved["body_template"]
    assert "employé(e)" in saved["body_template"] and "né(e) le" in saved["body_template"] and "l'intéressé(e)" in saved["body_template"]

    r = c.post("/api/documents/generate", json={"employee_id": "e-gridda", "template_id": "t-gd", "language": "fr"}).json()
    txt = text_of(r["content"])
    for part in ("M. GRIDDA Mohamed, né le 14/03/1995 à Rabat", "est employé au sein de notre société en qualité de Développeur Full-Stack depuis le 01/02/2024",
                 "sous contrat à durée indéterminée (CDI)", "à la demande de l'intéressé pour", f"Fait à Casablanca, le {TODAY}",
                 "Je soussignée, Mme ENNAJI Widad, agissant en qualité de Directrice des Ressources Humaines"):
        assert part in txt, (part, txt)
    assert "CHAIMAA" not in txt and "(e)" not in txt
    # the document as it is: no letterhead, no second title, no second date or signature
    assert r["content"].startswith('<div class="wedy-doc own boxed">') and "lh-name" not in r["content"]
    assert txt.count("Fait à") == 1 and "La Direction des Ressources Humaines" not in txt and txt.count("ATTESTATION DE TRAVAIL") == 1
    assert r["html"].startswith("<!DOCTYPE html>") and document_layout.DOC_CSS.strip()[:30] in r["html"]


def test_a_short_wedy_template_is_set_on_the_letterhead():
    c, db = client()
    db.tables["document_templates"].append({"id": "t-s", "name_fr": "Attestation de salaire", "category": "attestation",
                                             "body_template": "<p>Nous attestons que {{civility}} {{full_name}} perçoit un salaire de {{salary}}.</p>"})
    r = c.post("/api/documents/generate", json={"employee_id": "e-gridda", "template_id": "t-s", "language": "fr"}).json()
    html, txt = r["content"], text_of(r["content"])
    assert 'class="wedy-doc letter"' in html and "Tython SARL" in txt and "ATTESTATION DE SALAIRE" in txt
    assert f"Fait à Casablanca, le {TODAY}" in txt and "La Direction des Ressources Humaines" in txt
    assert f"Wedy · {r['document']['id'][:8].upper()}" in txt and "Nous attestons que Monsieur GRIDDA Mohamed" in txt


def test_the_pdf_docx_and_filed_copy_are_the_same_page_and_edits_are_kept():
    c, db = client()
    db.tables["document_templates"].append({"id": "t-gd", "name_fr": "Attestation", "category": "attestation",
                                             "body_template": tf.build_template(GOOGLE_DOCS_ATTESTATION)[0]})
    r = c.post("/api/documents/generate", json={"employee_id": "e-gridda", "template_id": "t-gd", "language": "fr"}).json()
    doc_id = r["document"]["id"]
    filed = db.tables["employee_files"]
    assert len(filed) == 1 and filed[0]["file_path"] == f"employees/e-gridda/generated-{doc_id}.pdf"
    pdf = c.get(f"/api/documents/generate/{doc_id}/pdf")
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"
    import fitz
    page_text = "".join(p.get_text() for p in fitz.open(stream=pdf.content, filetype="pdf"))
    assert "GRIDDA Mohamed" in page_text and "CHAIMAA" not in page_text
    from docx import Document
    d = Document(io.BytesIO(c.get(f"/api/documents/generate/{doc_id}/docx").content))
    paras = [p for p in d.paragraphs if p.text.strip()]
    assert paras[0].text == "ATTESTATION DE TRAVAIL" and paras[0].alignment == 1 and paras[0].runs[0].bold
    assert any("GRIDDA Mohamed" in p.text for p in paras) and d.styles["Normal"].font.name == "Times New Roman"
    # an edit by hand: saved, and the downloads and the filed copy follow
    edited = r["content"].replace("pour servir et valoir ce que de droit", "pour faire valoir ses droits auprès de sa banque")
    e = c.patch(f"/api/documents/generate/{doc_id}", json={"content": edited + '<img src=x onerror="alert(1)">'})
    assert e.status_code == 200 and "onerror" not in db.tables["generated_documents"][0]["content"]
    page_text = "".join(p.get_text() for p in fitz.open(stream=c.get(f"/api/documents/generate/{doc_id}/pdf").content, filetype="pdf"))
    assert "auprès de sa banque" in page_text.replace("\n", " ")
    assert len(db.tables["employee_files"]) == 1
    html = c.get(f"/api/documents/generate/{doc_id}/html")
    assert html.status_code == 200 and "auprès de sa banque" in html.text and "<style>" in html.text


def test_the_ai_may_not_break_the_layout():
    c, db = client()
    db.tables["document_templates"].append({"id": "t-gd", "name_fr": "Attestation", "category": "attestation",
                                             "body_template": tf.build_template(GOOGLE_DOCS_ATTESTATION)[0]})
    real = ai_service.enhance_document
    try:
        ai_service.enhance_document = lambda content, *a, **k: text_of(content)   # the shape is lost
        r = c.post("/api/documents/generate", json={"employee_id": "e-gridda", "template_id": "t-gd", "language": "en", "use_ai_enhancement": True}).json()
        assert r["ai_enhanced"] is False and "mise en page" in r["ai_error"] and "<b>ATTESTATION DE TRAVAIL</b>" in r["content"]
        ai_service.enhance_document = lambda content, *a, **k: content.replace("ATTESTATION DE TRAVAIL", "WORK CERTIFICATE")
        r = c.post("/api/documents/generate", json={"employee_id": "e-gridda", "template_id": "t-gd", "language": "en", "use_ai_enhancement": True}).json()
        assert r["ai_enhanced"] is True and "<b>WORK CERTIFICATE</b>" in r["content"] and 'dir="rtl"' not in r["content"]
    finally:
        ai_service.enhance_document = real


def test_the_ai_is_asked_to_keep_the_html():
    _, user = ai_service._enhance_prompt("<p><b>Titre</b></p><p>Texte</p>", "Attestation", "en", "")
    assert "keep every tag" in user and "Never change names" in user
    assert ai_service._strip_fences("```html\n<p>x</p>\n```") == "<p>x</p>"


def test_an_old_document_without_layout_still_downloads():
    c, db = client()
    db.tables["generated_documents"].append({"id": "old1", "employee_id": "e-gridda", "document_type": "Ancien", "content": "Texte simple\n\nSecond paragraphe"})
    pdf = c.get("/api/documents/generate/old1/pdf")
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"
    assert c.get("/api/documents/generate/old1/docx").status_code == 200


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn(); print("PASS", name)
            except Exception as e:  # noqa: BLE001
                import traceback; traceback.print_exc(); fails += 1; print("FAIL", name, type(e).__name__, e)
    print(f"{fails} failed" if fails else "all passed")
    sys.exit(1 if fails else 0)
