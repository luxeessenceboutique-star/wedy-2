import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.database import get_supabase

supabase = get_supabase()

COMMON_STYLE = """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    
    body {
        font-family: 'Inter', 'DejaVu Sans', Arial, sans-serif;
        color: #1e293b;
        line-height: 1.6;
        padding: 0;
        margin: 0;
        background: white;
    }
    
    .container {
        padding: 40px 60px;
        max-width: 800px;
        margin: auto;
    }
    
    .header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 60px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 20px;
    }
    
    .company-info {
        font-size: 10px;
        color: #64748b;
    }
    
    .logo-text {
        font-size: 24px;
        font-weight: 800;
        color: #0ea5e9;
        letter-spacing: -0.025em;
    }
    
    h1 {
        text-align: center;
        text-transform: uppercase;
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 60px;
        color: #0f172a;
        letter-spacing: 0.05em;
        text-decoration: underline;
        text-underline-offset: 8px;
    }
    
    .content {
        font-size: 14px;
        text-align: justify;
    }
    
    .content p {
        margin-bottom: 20px;
    }
    
    .vars {
        font-weight: 600;
        color: #000;
    }
    
    .footer {
        margin-top: 80px;
        display: flex;
        justify-content: space-between;
    }
    
    .signature-box {
        text-align: center;
        min-width: 200px;
    }
    
    .signature-title {
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 60px;
        text-decoration: underline;
    }
    
    .stamp-placeholder {
        color: #94a3b8;
        font-size: 10px;
        font-style: italic;
    }
</style>
"""

HEADER_HTML = """
<div class="header">
    <div>
        <div class="logo-text">TYTHON</div>
        <div class="company-info">
            TYTHON SARL<br>
            ICE: 003106377000035<br>
            RC: 553131 | CNSS: 4912448
        </div>
    </div>
    <div style="text-align: right;" class="company-info">
        55 Bd Zerktouni, Espace Zerktouni<br>
        1er Etage, Appt N°3, Casablanca<br>
        Tél: 06 08 04 33 66 | Hello@tython.org
    </div>
</div>
"""

TEMPLATES = [
    {
        "code": "attestation_travail",
        "name_fr": "Attestation de Travail",
        "name_en": "Work Certificate",
        "name_ar": "شهادة عمل",
        "category": "attestation",
        "variables": ["full_name", "cin", "job_title", "hire_date", "end_date", "today"],
        "body_template": COMMON_STYLE + '<div class="container">' + HEADER_HTML + """
            <h1>Attestation de Travail</h1>
            <div class="content">
                <p>Je soussignée, <strong>Mme ENNAJI Widad</strong>, agissant en qualité de Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, atteste par la présente que :</p>
                
                <p style="text-align: center; font-size: 16px; margin: 30px 0;">
                    M./Mme <span class="vars">{{full_name}}</span><br>
                    Titulaire de la CIN N°: <span class="vars">{{cin}}</span>
                </p>
                
                <p>A été employé(e) au sein de notre entreprise en qualité de <span class="vars">{{job_title}}</span> du <span class="vars">{{hire_date}}</span> au <span class="vars">{{end_date}}</span>.</p>
                
                <p>Durant cette période, il/elle a exercé ses fonctions avec sérieux, rigueur et professionnalisme, contribuant activement aux missions qui lui ont été confiées.</p>
                
                <p>La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</p>
            </div>
            
            <div class="footer">
                <div class="signature-box">
                    <p>Fait à Casablanca, le <span class="vars">{{today}}</span></p>
                </div>
                <div class="signature-box">
                    <div class="signature-title">Signature et cachet de l'entreprise</div>
                    <div class="stamp-placeholder">(Cachet TYTHON SARL)</div>
                </div>
            </div>
        </div>"""
    },
    {
        "code": "attestation_poursuite_stage",
        "name_fr": "Attestation de Poursuite de Stage",
        "name_en": "Internship Continuation Certificate",
        "name_ar": "شهادة متابعة تدريب",
        "category": "attestation",
        "variables": ["full_name", "cin", "start_date", "end_date", "today"],
        "body_template": COMMON_STYLE + '<div class="container">' + HEADER_HTML + """
            <h1>Attestation de Poursuite de Stage</h1>
            <div class="content">
                <p>Je soussignée, <strong>Madame ENNAJI Widad</strong>, Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, atteste par la présente que :</p>
                
                <p style="text-align: center; font-size: 16px; margin: 30px 0;">
                    M./Mme <span class="vars">{{full_name}}</span><br>
                    Titulaire de la CIN n° <span class="vars">{{cin}}</span>
                </p>
                
                <p>Effectue actuellement un stage au sein de notre entreprise depuis le <span class="vars">{{start_date}}</span>.</p>
                
                <p>Nous confirmons par la présente que son stage se poursuit normalement jusqu'à la date prévue du <span class="vars">{{end_date}}</span>, sauf modification ultérieure.</p>
                
                <p>La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</p>
            </div>
            
            <div class="footer">
                <div class="signature-box">
                    <p>Fait à Casablanca, le <span class="vars">{{today}}</span></p>
                </div>
                <div class="signature-box">
                    <div class="signature-title">Signature et cachet</div>
                    <div class="stamp-placeholder">(Direction RH)</div>
                </div>
            </div>
        </div>"""
    },
    {
        "code": "attestation_stage",
        "name_fr": "Attestation de Stage",
        "name_en": "Internship Certificate",
        "name_ar": "شهادة تدريب",
        "category": "attestation",
        "variables": ["full_name", "start_date", "end_date", "today"],
        "body_template": COMMON_STYLE + '<div class="container">' + HEADER_HTML + """
            <h1>Attestation de Stage</h1>
            <div class="content">
                <p>Je soussignée, <strong>Madame ENNAJI Widad</strong>, Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, certifie par la présente que :</p>
                
                <p style="text-align: center; font-size: 16px; margin: 30px 0;">
                    M./Mme <span class="vars">{{full_name}}</span>
                </p>
                
                <p>A effectué un stage au sein de notre entreprise <strong>TYTHON SARL</strong>, du <span class="vars">{{start_date}}</span> au <span class="vars">{{end_date}}</span>.</p>
                
                <p>Durant cette période, il/elle a été intégré(e) à nos équipes dans le cadre de sa formation et a participé activement aux missions qui lui ont été confiées avec sérieux et professionnalisme.</p>
                
                <p>La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</p>
            </div>
            
            <div class="footer">
                <div class="signature-box">
                    <p>Fait à Casablanca, le <span class="vars">{{today}}</span></p>
                    <p style="font-size: 11px; margin-top: 20px;">TYTHON SARL<br>Mme ENNAJI Widad<br>Directrice RH</p>
                </div>
                <div class="signature-box">
                    <div class="signature-title">Signature et cachet</div>
                </div>
            </div>
        </div>"""
    },
    {
        "code": "attestation_poursuite_travail",
        "name_fr": "Attestation de Poursuite de Travail",
        "name_en": "Work Continuation Certificate",
        "name_ar": "شهادة متابعة عمل",
        "category": "attestation",
        "variables": ["full_name", "cin", "hire_date", "job_title", "today"],
        "body_template": COMMON_STYLE + '<div class="container">' + HEADER_HTML + """
            <h1>Attestation de Poursuite de Travail</h1>
            <div class="content">
                <p>Je soussignée, <strong>Madame ENNAJI Widad</strong>, Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, atteste par la présente que :</p>
                
                <p style="text-align: center; font-size: 16px; margin: 30px 0;">
                    M./Mme <span class="vars">{{full_name}}</span><br>
                    Titulaire de la CIN n° <span class="vars">{{cin}}</span>
                </p>
                
                <p>Est employé(e) au sein de notre entreprise depuis le <span class="vars">{{hire_date}}</span> en qualité de <span class="vars">{{job_title}}</span>.</p>
                
                <p>Nous confirmons que l'intéressé(e) est toujours en activité à ce jour au sein de notre société.</p>
                
                <p>La présente attestation est délivrée pour servir et valoir ce que de droit.</p>
            </div>
            
            <div class="footer">
                <div class="signature-box">
                    <p>Fait à Casablanca, le <span class="vars">{{today}}</span></p>
                </div>
                <div class="signature-box">
                    <div class="signature-title">Signature et cachet</div>
                    <div class="stamp-placeholder">(Direction RH)</div>
                </div>
            </div>
        </div>"""
    },
    {
        "code": "charte_confidentialite",

        "name_fr": "Charte de Confidentialité",
        "name_en": "Confidentiality Charter",
        "name_ar": "ميثاق السرية",
        "category": "autre",
        "variables": ["full_name", "specialty", "start_date", "end_date", "today"],
        "body_template": COMMON_STYLE + '<div class="container">' + HEADER_HTML + """
            <h1>Charte de Confidentialité</h1>
            <div class="content">
                <p>Entre la société <strong>TYTHON SARL</strong> et le stagiaire : <strong><span class="vars">{{full_name}}</span></strong>.</p>
                
                <h3>Article 1 - Objet</h3>
                <p>La présente charte a pour objet de définir les obligations de confidentialité applicables à <span class="vars">{{full_name}}</span> dans le cadre de son stage au sein de la Société.</p>
                
                <h3>Article 2 - Informations confidentielles</h3>
                <p>Sont considérées comme informations confidentielles toutes données internes, techniques, commerciales, financières, RH, clients, codes sources, auxquels <span class="vars">{{full_name}}</span> pourrait avoir accès.</p>
                
                <h3>Article 3 - Engagement de confidentialité</h3>
                <p>Le/La stagiaire s'engage à ne divulguer aucune information confidentielle à des tiers et à utiliser ces informations exclusivement dans le cadre de ses missions.</p>
                
                <h3>Article 4 - Durée</h3>
                <p>Les obligations de confidentialité s'appliquent pendant toute la durée du stage (du <span class="vars">{{start_date}}</span> au <span class="vars">{{end_date}}</span>) et demeurent en vigueur après sa fin.</p>
                
                <div style="margin-top: 30px; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
                    <strong>Informations du stagiaire :</strong><br>
                    Spécialité : <span class="vars">{{specialty}}</span><br>
                    Période : Du <span class="vars">{{start_date}}</span> au <span class="vars">{{end_date}}</span>
                </div>
            </div>
            
            <div class="footer">
                <div class="signature-box">
                    <div class="signature-title">Signature du stagiaire</div>
                    <p style="font-size: 10px;">(Lu et approuvé)</p>
                </div>
                <div class="signature-box">
                    <div class="signature-title">Pour la Société</div>
                    <div class="stamp-placeholder">Signature et cachet</div>
                </div>
            </div>
        </div>"""
    },
    {
        "code": "contrat_cdi",
        "name_fr": "Contrat de Travail (CDI)",
        "name_en": "Work Contract (CDI)",
        "name_ar": "عقد عمل (CDI)",
        "category": "contrat",
        "variables": ["full_name", "address", "cin", "start_date", "job_title", "salary", "today"],
        "body_template": COMMON_STYLE + '<div class="container">' + HEADER_HTML + """
            <h1>Contrat de Travail (CDI)</h1>
            <div class="content">
                <p><strong>Entre les soussignés :</strong></p>
                <p>La société <strong>TYTHON</strong>, représentée par M. AZIZ Benslimane LAQSABI en qualité de PDG, d'une part.</p>
                <p>Et <strong>M./Mme <span class="vars">{{full_name}}</span></strong>, demeurant à : <span class="vars">{{address}}</span>, titulaire de la CIN N°: <span class="vars">{{cin}}</span>, d'autre part.</p>
                
                <h3>Article 1 – Engagement</h3>
                <p>Ce contrat prend effet à compter du <span class="vars">{{start_date}}</span> en qualité de <strong><span class="vars">{{job_title}}</span></strong>.</p>
                
                <h3>Article 2 - Période d’essai</h3>
                <p>Le présent contrat est assorti d’une période d’essai conformément au Code du Travail marocain.</p>
                
                <h3>Article 7 - Rémunération</h3>
                <p>Le salaire mensuel net sera de <strong><span class="vars">{{salary}} Dirhams</span></strong> et sera payé par virement bancaire.</p>
                
                <h3>Article 13 – Confidentialité</h3>
                <p>Le collaborateur s’oblige à garder confidentielle toutes les informations qu’il pourrait recevoir de TYTHON.</p>
            </div>
            
            <div class="footer">
                <div class="signature-box">
                    <div class="signature-title">Signature du salarié</div>
                    <p style="font-size: 11px;">M./Mme {{full_name}}</p>
                </div>
                <div class="signature-box">
                    <div class="signature-title">Signature de l'employeur</div>
                </div>
            </div>
        </div>"""
    }
]

def reseed():
    print("Deleting old templates...")
    # Delete templates with the same codes
    codes = [t["code"] for t in TEMPLATES]
    supabase.table("document_templates").delete().in_("code", codes).execute()
    
    print("Inserting improved templates...")
    for t in TEMPLATES:
        result = supabase.table("document_templates").insert(t).execute()
        if result.data:
            print(f"Success: {t['name_fr']}")
        else:
            print(f"Error inserting {t['name_fr']}")


if __name__ == "__main__":
    reseed()
