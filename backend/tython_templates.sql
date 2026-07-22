-- ============================================================
-- TYTHON SARL — 6 official HR templates
-- Run this in Supabase SQL Editor to populate templates
-- ============================================================

-- Remove old placeholder templates if any
DELETE FROM document_templates WHERE code IN (
  'attestation_poursuite_travail','attestation_travail',
  'attestation_poursuite_stage','contrat_cdi',
  'attestation_stage','charte_confidentialite'
);

INSERT INTO document_templates (code, name_fr, name_en, name_ar, category, body_template, variables, is_active) VALUES

-- ─── 1. Attestation de poursuite de travail ───────────────────────────────
('attestation_poursuite_travail',
 'Attestation de poursuite de travail',
 'Work Continuation Certificate',
 'شهادة استمرار العمل',
 'attestation',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;min-height:900px;">
  <div style="margin-bottom:50px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>

  <h1 style="text-align:center;font-size:20px;font-weight:bold;margin-bottom:50px;font-family:Arial,sans-serif;">Attestation de poursuite de travail</h1>

  <p style="font-weight:bold;margin-bottom:30px;font-size:13px;line-height:1.7;">
    La société : TYTHON ,Siège social : 55 Bd Zerktouni 1 ÉTAGE APPT N 03 Q H – Casablanca - Maroc
    RC : 553131 , ICE : 0003106377000035 , Affiliation CNSS : 4912448
  </p>

  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">
    Je soussignée, <strong>Madame ENNAJI Widad</strong>, Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, atteste que :
  </p>

  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">
    <strong>M./Mme {{full_name}}</strong>, titulaire de la CIN n° <strong>{{cin}}</strong>, est employé(e) au sein de notre entreprise depuis le <strong>{{hire_date}}</strong> en qualité de <strong>{{position}}</strong>.
  </p>

  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">
    Nous confirmons que l'intéressé(e) est toujours en activité à ce jour au sein de notre société.
  </p>

  <p style="margin-bottom:50px;font-size:13px;line-height:1.8;">
    La présente attestation est délivrée pour servir et valoir ce que de droit.
  </p>

  <p style="font-weight:bold;font-size:13px;">Fait à Casablanca, le {{today}}</p>

  <div style="text-align:right;margin-top:70px;">
    <p style="font-weight:bold;font-size:13px;">Signature et cachet</p>
  </div>
</div>$$,
ARRAY['full_name','cin','hire_date','position','today'],
true),

-- ─── 2. Attestation de travail ────────────────────────────────────────────
('attestation_travail',
 'Attestation de travail',
 'Employment Certificate',
 'شهادة عمل',
 'attestation',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;min-height:900px;">
  <div style="margin-bottom:50px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>

  <h1 style="text-align:center;font-size:20px;font-weight:bold;margin-bottom:50px;font-family:Arial,sans-serif;">ATTESTATION DE TRAVAIL</h1>

  <p style="margin-bottom:30px;font-size:13px;line-height:1.8;">
    Je soussignée, <strong>Mme ENNAJI Widad</strong>, agissant en qualité de Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, atteste que :
  </p>

  <p style="margin-bottom:18px;font-size:14px;font-weight:bold;">M./Mme {{full_name}}</p>
  <p style="margin-bottom:25px;font-size:14px;font-weight:bold;">Titulaire de la CIN N° : {{cin}}</p>

  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">
    a occupé le poste de <strong>{{position}}</strong> au sein de notre entreprise du <strong>{{contract_start}}</strong> au <strong>{{contract_end}}</strong>.
  </p>

  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">
    Dans le cadre de ses fonctions, il a contribué activement aux missions qui lui ont été confiées et a fait preuve d'engagement, de rigueur et de professionnalisme.
  </p>

  <p style="margin-bottom:50px;font-size:13px;line-height:1.8;">
    La présente attestation est établie à sa demande pour toute fin utile.
  </p>

  <p style="font-weight:bold;font-size:13px;">Fait à Casablanca, le {{today}}</p>

  <div style="text-align:right;margin-top:70px;">
    <p style="font-weight:bold;font-size:13px;">Signature et cachet</p>
  </div>
</div>$$,
ARRAY['full_name','cin','position','contract_start','contract_end','today'],
true),

-- ─── 3. Attestation de poursuite de stage ────────────────────────────────
('attestation_poursuite_stage',
 'Attestation de poursuite de stage',
 'Internship Continuation Certificate',
 'شهادة استمرار التدريب',
 'attestation',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;min-height:900px;">
  <div style="margin-bottom:50px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>

  <h1 style="text-align:center;font-size:20px;font-weight:bold;margin-bottom:30px;font-family:Arial,sans-serif;">ATTESTATION DE POURSUITE DE STAGE</h1>

  <p style="font-weight:bold;margin-bottom:30px;font-size:13px;line-height:1.7;">
    La société : TYTHON Siège social : 55 Bd Zerktouni 1 ÉTAGE APPT N 03 Q H – Casablanca - Maroc
    RC : 553131 ICE : 0003106377000035 Affiliation CNSS : 4912448
  </p>

  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">
    Je soussignée, <strong>Madame ENNAJI Widad</strong>, Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, atteste que :
  </p>

  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">
    <strong>M./Mme {{full_name}}</strong>, titulaire de la CIN n° <strong>{{cin}}</strong>, effectue actuellement un stage au sein de notre entreprise depuis le <strong>{{internship_start}}</strong>.
  </p>

  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">
    Nous confirmons par la présente que son stage se poursuit normalement jusqu'à la date prévue du <strong>{{internship_end}}</strong>, sauf modification ultérieure.
  </p>

  <p style="margin-bottom:50px;font-size:13px;line-height:1.8;">
    La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
  </p>

  <p style="font-weight:bold;font-size:13px;">Fait à Casablanca, le {{today}}</p>

  <div style="text-align:right;margin-top:70px;">
    <p style="font-weight:bold;font-size:13px;">Signature et cachet</p>
  </div>
</div>$$,
ARRAY['full_name','cin','internship_start','internship_end','today'],
true),

-- ─── 4. Attestation de stage ─────────────────────────────────────────────
('attestation_stage',
 'Attestation de stage',
 'Internship Certificate',
 'شهادة التدريب',
 'attestation',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;min-height:900px;">
  <div style="margin-bottom:50px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>

  <h1 style="text-align:center;font-size:20px;font-weight:bold;margin-bottom:50px;font-family:Arial,sans-serif;">ATTESTATION DE STAGE</h1>

  <p style="margin-bottom:30px;font-size:13px;line-height:1.8;">
    Je soussignée, <strong>Madame ENNAJI Widad</strong>, Directrice des Ressources Humaines au sein de la société <strong>TYTHON SARL</strong>, certifie que :
  </p>

  <p style="margin-bottom:25px;font-size:13px;line-height:1.8;">
    <strong>M./Mme {{full_name}}</strong>, a effectué un stage au sein de notre entreprise <strong>TYTHON SARL</strong>, du <strong>{{internship_start}}</strong> au <strong>{{internship_end}}</strong>.
  </p>

  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">
    Durant cette période, il a été intégré à nos équipes dans le cadre de sa formation et a participé aux missions qui lui ont été confiées.
  </p>

  <p style="margin-bottom:50px;font-size:13px;line-height:1.8;">
    La présente attestation est délivrée à sa demande pour servir et valoir ce que de droit.
  </p>

  <p style="font-weight:bold;font-size:13px;">Fait à Casablanca, le {{today}}</p>

  <p style="margin-top:30px;font-weight:bold;font-size:13px;">TYTHON SARL<br/>Mme ENNAJI Widad<br/>Directrice des Ressources Humaines</p>

  <div style="text-align:right;margin-top:40px;">
    <p style="font-weight:bold;font-size:13px;">Signature et cachet</p>
  </div>
</div>$$,
ARRAY['full_name','internship_start','internship_end','today'],
true),

-- ─── 5. Contrat de travail CDI ───────────────────────────────────────────
('contrat_cdi',
 'Contrat de travail (CDI)',
 'Permanent Employment Contract',
 'عقد عمل (عقد غير محدد المدة)',
 'contrat',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;">
  <div style="margin-bottom:50px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>

  <h1 style="text-align:center;font-size:20px;font-weight:bold;text-decoration:underline;margin-bottom:40px;font-family:Arial,sans-serif;">Contrat de travail (CDI)</h1>

  <p style="margin-bottom:20px;font-size:13px;">Entre les soussignés :</p>

  <p style="margin-bottom:6px;font-size:13px;line-height:1.8;">
    - La société : <strong>TYTHON</strong><br/>
    Siège social : 55 Bd Zerktouni 1 ÉTAGE APPT N 03 Q H – Casablanca - Maroc<br/>
    RC : 553131 &nbsp; ICE : 0003106377000035 &nbsp; Affiliation CNSS : 4912448<br/>
    Représentée par M. AZIZ Benslimane LAQSABI, agissant en qualité de PDG
  </p>

  <p style="margin:20px 0;font-size:13px;">D'une part,</p>

  <p style="margin-bottom:6px;font-size:13px;line-height:1.8;font-weight:bold;">
    Et : M./Mme {{full_name}}<br/>
    <span style="font-weight:normal;">Demeurant à : {{address}}</span><br/>
    CIN N° : {{cin}}<br/>
    Libre de tout engagement,
  </p>

  <p style="margin:20px 0;font-size:13px;">D'autre part.</p>
  <p style="text-align:center;font-weight:bold;margin:25px 0;font-size:13px;">Il a été convenu ce qui suit :</p>

  <p style="font-weight:bold;text-align:center;margin:20px 0 8px;font-size:13px;">Article 1 – Engagement</p>
  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">
    Ce contrat prend effet à compter du <strong>{{hire_date}}</strong>.<br/>
    La déclaration préalable à l'embauche de <strong>M./Mme {{full_name}}</strong> a été remise à la CNSS de Casablanca.
  </p>

  <p style="font-weight:bold;text-align:center;margin:20px 0 8px;font-size:13px;">Article 2 – Période d'essai</p>
  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">
    Conformément aux dispositions du Code du travail en vigueur, le présent contrat est assorti d'une période d'essai.
    La durée de la période d'essai est fixée selon la catégorie professionnelle du salarié et peut être renouvelée une seule fois par accord écrit.
  </p>

  <p style="font-weight:bold;text-align:center;margin:20px 0 8px;font-size:13px;">Article 4 – Fonctions</p>
  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">
    En sa qualité de <strong>{{position}}</strong>.
  </p>

  <p style="font-weight:bold;text-align:center;margin:20px 0 8px;font-size:13px;">Article 6 – Horaire de travail</p>
  <p style="margin-bottom:20px;font-size:13px;line-height:1.8;">
    <strong>M./Mme {{full_name}}</strong> est assujetti(e) à l'horaire de travail de l'établissement, une durée hebdomadaire de 44 heures, du lundi au vendredi.
  </p>

  <p style="font-weight:bold;text-align:center;margin:20px 0 8px;font-size:13px;">Article 7 – Rémunération</p>
  <p style="margin-bottom:30px;font-size:13px;line-height:1.8;">
    Le salaire mensuel net sera de <strong>{{salary}}</strong> et sera payé par virement bancaire.
  </p>

  <p style="font-weight:bold;font-size:13px;">Fait en double exemplaire à Casablanca, le {{today}}</p>

  <div style="display:flex;justify-content:space-between;margin-top:60px;">
    <div>
      <p style="font-weight:bold;font-size:13px;">Signature du salarié</p>
      <p style="font-size:13px;">M./Mme {{full_name}}</p>
    </div>
    <div style="text-align:right;">
      <p style="font-weight:bold;font-size:13px;">Signature de l'employeur</p>
    </div>
  </div>
</div>$$,
ARRAY['full_name','address','cin','hire_date','position','salary','today'],
true),

-- ─── 6. Charte de confidentialité ────────────────────────────────────────
('charte_confidentialite',
 'Charte de confidentialité',
 'Confidentiality Charter',
 'ميثاق السرية',
 'autre',
$$<div style="font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;">
  <div style="margin-bottom:40px;padding-bottom:14px;border-bottom:2px solid #5b21b6;">
    <p style="font-size:28px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;">TYTHON</p>
    <p style="font-size:10px;color:#9ca3af;margin:3px 0;letter-spacing:2px;">&#8212; INNOVATE NOW</p>
  </div>

  <p style="font-weight:bold;font-size:13px;line-height:1.7;margin-bottom:6px;">TYTHON SARL &nbsp;|&nbsp; ICE : 003106377000035</p>
  <p style="font-size:12px;color:#6b7280;margin-bottom:30px;">55 BD ZERKTOUNI, ESPACE ZERKTOUNI, 1er Étage, Appt N°3, Quartier Hôpitaux, 20000 Casablanca</p>

  <h1 style="text-align:center;font-size:18px;font-weight:bold;text-decoration:underline;margin-bottom:30px;font-family:Arial,sans-serif;">CHARTE DE CONFIDENTIALITÉ</h1>

  <p style="margin-bottom:20px;font-size:13px;">Entre : <strong>TYTHON SARL</strong></p>
  <p style="margin-bottom:30px;font-size:13px;">Et : <strong>{{full_name}}</strong></p>

  <p style="font-weight:bold;margin:16px 0 6px;font-size:13px;">Article 1 - Objet</p>
  <p style="margin-bottom:16px;font-size:13px;line-height:1.7;">La présente charte a pour objet de définir les obligations de confidentialité applicables à <strong>{{full_name}}</strong> dans le cadre de son stage au sein de la Société.</p>

  <p style="font-weight:bold;margin:16px 0 6px;font-size:13px;">Article 2 - Informations confidentielles</p>
  <p style="margin-bottom:16px;font-size:13px;line-height:1.7;">Sont considérées comme informations confidentielles toutes données internes, techniques, commerciales, financières, RH, clients, codes sources et accès systèmes auxquels <strong>{{full_name}}</strong> pourrait avoir accès.</p>

  <p style="font-weight:bold;margin:16px 0 6px;font-size:13px;">Article 3 - Engagement de confidentialité</p>
  <p style="margin-bottom:16px;font-size:13px;line-height:1.7;"><strong>{{full_name}}</strong> s'engage à ne divulguer, transmettre ou communiquer aucune information confidentielle à des tiers et à respecter les règles de sécurité mises en place par la Société.</p>

  <p style="font-weight:bold;margin:16px 0 6px;font-size:13px;">Article 5 - Durée de l'engagement</p>
  <p style="margin-bottom:16px;font-size:13px;line-height:1.7;">Les obligations s'appliquent pendant toute la durée du stage (du <strong>{{internship_start}}</strong> au <strong>{{internship_end}}</strong>) et demeurent en vigueur après sa fin.</p>

  <p style="font-weight:bold;margin:16px 0 6px;font-size:13px;">Informations du stagiaire</p>
  <p style="font-size:13px;line-height:1.8;">
    Téléphone : {{phone}}<br/>
    Poste / Formation : {{position}}<br/>
    Début du stage : {{internship_start}}<br/>
    Fin du stage : {{internship_end}}
  </p>

  <p style="font-weight:bold;margin-top:30px;font-size:13px;">Fait à Casablanca, le {{today}}</p>

  <div style="display:flex;justify-content:space-between;margin-top:50px;">
    <div>
      <p style="font-weight:bold;font-size:13px;">Signature de {{full_name}}</p>
    </div>
    <div style="text-align:right;">
      <p style="font-weight:bold;font-size:13px;">Signature et cachet de la Société</p>
    </div>
  </div>
</div>$$,
ARRAY['full_name','phone','position','internship_start','internship_end','today'],
true);
