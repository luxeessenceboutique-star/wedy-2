
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'rh');
CREATE TYPE public.contract_type AS ENUM ('CDI', 'CDD', 'Stage', 'Freelance');
CREATE TYPE public.employee_status AS ENUM ('active', 'inactive', 'terminated', 'intern');
CREATE TYPE public.doc_category AS ENUM ('attestation', 'contrat', 'avenant', 'certificat', 'lettre', 'autre');

-- =========================================
-- TIMESTAMP UPDATE FUNCTION
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- USER ROLES
-- =========================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================
-- AUTO-CREATE PROFILE + DEFAULT ROLE ON SIGNUP
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'rh');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- EMPLOYEES
-- =========================================
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  cin TEXT UNIQUE,
  matricule TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  position TEXT,
  department TEXT,
  salary NUMERIC(12,2),
  hire_date DATE,
  contract_type public.contract_type,
  contract_start DATE,
  contract_end DATE,
  internship_start DATE,
  internship_end DATE,
  manager TEXT,
  status public.employee_status NOT NULL DEFAULT 'active',
  address TEXT,
  birth_date DATE,
  nationality TEXT DEFAULT 'Marocaine',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_employees_full_name ON public.employees(full_name);
CREATE INDEX idx_employees_cin ON public.employees(cin);
CREATE INDEX idx_employees_department ON public.employees(department);

CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- DOCUMENT TEMPLATES
-- =========================================
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category public.doc_category NOT NULL DEFAULT 'autre',
  body_template TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- GENERATED DOCUMENTS
-- =========================================
CREATE TABLE public.generated_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  generated_by UUID REFERENCES auth.users(id),
  document_type TEXT NOT NULL,
  content TEXT NOT NULL,
  variables_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url TEXT,
  language TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gen_docs_employee ON public.generated_documents(employee_id);
CREATE INDEX idx_gen_docs_created ON public.generated_documents(created_at DESC);

-- =========================================
-- RLS POLICIES
-- =========================================
-- profiles
CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Roles viewable by authenticated"
ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- employees: any authenticated HR/admin can manage
CREATE POLICY "Employees viewable by authenticated"
ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert employees"
ON public.employees FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update employees"
ON public.employees FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete employees"
ON public.employees FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- document_templates
CREATE POLICY "Templates viewable by authenticated"
ON public.document_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage templates"
ON public.document_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- generated_documents
CREATE POLICY "Generated docs viewable by authenticated"
ON public.generated_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create docs"
ON public.generated_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = generated_by);
CREATE POLICY "Admins can delete docs"
ON public.generated_documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- SEED DOCUMENT TEMPLATES (11 standard HR docs)
-- =========================================
INSERT INTO public.document_templates (code, name_fr, name_en, name_ar, category, body_template, variables) VALUES
('attestation_travail', 'Attestation de travail', 'Work Certificate', 'شهادة عمل', 'attestation',
'ATTESTATION DE TRAVAIL

Nous soussignés, la société TYTHON, attestons par la présente que :

M./Mme {{full_name}}, titulaire de la CIN n° {{cin}}, est employé(e) au sein de notre société depuis le {{hire_date}}, en qualité de {{position}}, au sein du département {{department}}.

Son contrat est de type {{contract_type}}.

La présente attestation est délivrée à l''intéressé(e) pour servir et valoir ce que de droit.

Fait à Casablanca, le {{today}}',
ARRAY['full_name','cin','hire_date','position','department','contract_type','today']),

('attestation_stage', 'Attestation de stage', 'Internship Certificate', 'شهادة تدريب', 'attestation',
'ATTESTATION DE STAGE

Nous soussignés, la société TYTHON, attestons que :

M./Mme {{full_name}}, titulaire de la CIN n° {{cin}}, a effectué un stage au sein de notre société du {{internship_start}} au {{internship_end}}, au sein du département {{department}}, sous la responsabilité de {{manager}}.

Durant cette période, l''intéressé(e) a fait preuve de sérieux et de professionnalisme.

La présente attestation est délivrée pour servir et valoir ce que de droit.

Fait à Casablanca, le {{today}}',
ARRAY['full_name','cin','internship_start','internship_end','department','manager','today']),

('attestation_poursuite_stage', 'Attestation de poursuite de stage', 'Internship Continuation Certificate', 'شهادة متابعة التدريب', 'attestation',
'ATTESTATION DE POURSUITE DE STAGE

La société TYTHON atteste que M./Mme {{full_name}}, CIN n° {{cin}}, poursuit actuellement son stage au sein du département {{department}}, depuis le {{internship_start}}, sous la supervision de {{manager}}.

Cette attestation est délivrée à la demande de l''intéressé(e) pour servir et valoir ce que de droit.

Fait à Casablanca, le {{today}}',
ARRAY['full_name','cin','department','internship_start','manager','today']),

('contrat_stage', 'Contrat de stage', 'Internship Contract', 'عقد تدريب', 'contrat',
'CONTRAT DE STAGE

Entre la société TYTHON, représentée par sa Direction RH,
Et M./Mme {{full_name}}, titulaire de la CIN n° {{cin}}, demeurant à {{address}},

Il a été convenu ce qui suit :

Article 1 — Objet : Le/La stagiaire effectuera un stage au sein du département {{department}}, en qualité de {{position}}.

Article 2 — Durée : Le présent stage débute le {{internship_start}} et se termine le {{internship_end}}.

Article 3 — Encadrement : Le/La stagiaire sera encadré(e) par {{manager}}.

Article 4 — Indemnité : Une indemnité mensuelle de {{salary}} MAD sera versée au stagiaire.

Fait à Casablanca, le {{today}}, en deux exemplaires.',
ARRAY['full_name','cin','address','department','position','internship_start','internship_end','manager','salary','today']),

('contrat_cdi', 'Contrat de travail (CDI)', 'Employment Contract (Permanent)', 'عقد عمل دائم', 'contrat',
'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE

Entre la société TYTHON, ci-après dénommée "l''Employeur",
Et M./Mme {{full_name}}, CIN n° {{cin}}, demeurant à {{address}}, ci-après dénommé(e) "le Salarié",

Il a été convenu ce qui suit :

Article 1 — Engagement : Le Salarié est engagé à compter du {{hire_date}} en qualité de {{position}}, au sein du département {{department}}.

Article 2 — Période d''essai : Trois (3) mois renouvelable une fois.

Article 3 — Rémunération : Le salaire mensuel brut est fixé à {{salary}} MAD.

Article 4 — Durée du travail : 44 heures par semaine.

Article 5 — Lieu de travail : Casablanca, Maroc.

Le présent contrat est régi par le Code du Travail marocain.

Fait à Casablanca, le {{today}}, en deux exemplaires originaux.',
ARRAY['full_name','cin','address','hire_date','position','department','salary','today']),

('contrat_cdd', 'Contrat de travail (CDD)', 'Fixed-Term Contract', 'عقد عمل محدد المدة', 'contrat',
'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE

Entre la société TYTHON et M./Mme {{full_name}}, CIN n° {{cin}}, demeurant à {{address}},

Article 1 — Le Salarié est engagé en qualité de {{position}}, département {{department}}.

Article 2 — Le présent contrat prend effet le {{contract_start}} et se termine le {{contract_end}}.

Article 3 — La rémunération mensuelle brute est fixée à {{salary}} MAD.

Article 4 — Le présent contrat est conclu pour le motif suivant : remplacement / surcroît temporaire d''activité.

Fait à Casablanca, le {{today}}, en deux exemplaires.',
ARRAY['full_name','cin','address','position','department','contract_start','contract_end','salary','today']),

('avenant_contrat', 'Avenant au contrat', 'Contract Amendment', 'ملحق العقد', 'avenant',
'AVENANT AU CONTRAT DE TRAVAIL

Entre la société TYTHON et M./Mme {{full_name}}, CIN n° {{cin}}, salarié(e) depuis le {{hire_date}}, en qualité de {{position}},

Il a été convenu de modifier les clauses suivantes du contrat de travail initial :

— Nouveau poste : {{position}}
— Nouveau salaire : {{salary}} MAD
— Nouveau département : {{department}}

Ces modifications prennent effet à compter du {{today}}. Toutes les autres clauses du contrat initial restent inchangées.

Fait à Casablanca, le {{today}}, en deux exemplaires.',
ARRAY['full_name','cin','hire_date','position','salary','department','today']),

('demande_mise_disposition', 'Demande de mise à disposition', 'Secondment Request', 'طلب وضع رهن الإشارة', 'lettre',
'DEMANDE DE MISE À DISPOSITION

La société TYTHON demande la mise à disposition de M./Mme {{full_name}}, CIN n° {{cin}}, occupant le poste de {{position}} au sein du département {{department}}.

Cette mise à disposition est sollicitée à compter du {{today}}, pour une durée à déterminer selon les besoins du service demandeur.

Fait à Casablanca, le {{today}}',
ARRAY['full_name','cin','position','department','today']),

('solde_tout_compte', 'Solde de tout compte', 'Final Settlement', 'مخالصة نهائية', 'attestation',
'REÇU POUR SOLDE DE TOUT COMPTE

Je soussigné(e) M./Mme {{full_name}}, CIN n° {{cin}}, ayant occupé le poste de {{position}} au sein de la société TYTHON depuis le {{hire_date}}, reconnais avoir reçu de mon employeur la somme de {{salary}} MAD, représentant le solde de tout compte à la date du {{today}}.

Cette somme couvre l''ensemble des salaires, indemnités, congés payés et tous autres droits dus au titre de l''exécution et de la rupture du contrat de travail.

Fait à Casablanca, le {{today}}',
ARRAY['full_name','cin','position','hire_date','salary','today']),

('certificat_travail', 'Certificat de travail', 'Service Certificate', 'شهادة عمل (انتهاء)', 'certificat',
'CERTIFICAT DE TRAVAIL

Nous soussignés, la société TYTHON, certifions avoir employé M./Mme {{full_name}}, titulaire de la CIN n° {{cin}}, du {{hire_date}} au {{today}}, en qualité de {{position}}, au sein du département {{department}}.

Durant cette période, l''intéressé(e) a fait preuve de compétence et de sérieux dans l''exercice de ses fonctions.

Le présent certificat lui est délivré, libre de tout engagement, pour servir et valoir ce que de droit.

Fait à Casablanca, le {{today}}',
ARRAY['full_name','cin','hire_date','position','department','today']),

('lettre_avertissement', 'Lettre d''avertissement', 'Warning Letter', 'رسالة إنذار', 'lettre',
'LETTRE D''AVERTISSEMENT

À l''attention de M./Mme {{full_name}}
CIN : {{cin}}
Poste : {{position}} — Département : {{department}}

Objet : Avertissement

Madame, Monsieur,

Nous vous notifions par la présente un avertissement officiel suite aux faits constatés.

Nous vous demandons de prendre les mesures nécessaires pour que de tels faits ne se reproduisent pas. À défaut, nous nous verrons dans l''obligation d''envisager des sanctions plus sévères, conformément au règlement intérieur et au Code du Travail.

Fait à Casablanca, le {{today}}

La Direction RH — TYTHON',
ARRAY['full_name','cin','position','department','today']);
