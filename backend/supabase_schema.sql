-- ============================================================
-- WEDY HR PLATFORM — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  full_name    text,
  avatar_url   text,
  company      text,
  phone        text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

-- ── 2. USER ROLES ────────────────────────────────────────────
create table if not exists user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  role       text not null check (role in ('admin','hr','viewer')),
  created_at timestamptz default now() not null,
  unique(user_id, role)
);

-- ── 3. EMPLOYEES ─────────────────────────────────────────────
create table if not exists employees (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  cin               text,
  matricule         text,
  email             text,
  phone             text,
  position          text,
  department        text,
  salary            numeric(10,2),
  hire_date         date,
  contract_type     text check (contract_type in ('CDI','CDD','Stage','Freelance','ANAPEC','Consultant')),
  contract_start    date,
  contract_end      date,
  internship_start  date,
  internship_end    date,
  manager           text,
  status            text not null default 'active' check (status in ('active','inactive','terminated','intern','on-leave')),
  address           text,
  city              text,
  birth_date        date,
  nationality       text default 'Marocaine',
  notes             text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null
);

-- ── 4. DOCUMENT TEMPLATES ────────────────────────────────────
create table if not exists document_templates (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  name_fr       text not null,
  name_en       text not null default '',
  name_ar       text not null default '',
  category      text not null default 'autre' check (category in ('attestation','contrat','avenant','certificat','lettre','autre')),
  body_template text not null default '',
  variables     text[] default '{}',
  is_active     boolean default true not null,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- ── 5. GENERATED DOCUMENTS ──────────────────────────────────
create table if not exists generated_documents (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid references employees(id) on delete cascade not null,
  template_id    uuid references document_templates(id) on delete set null,
  document_type  text not null,
  content        text not null,
  variables_used jsonb default '{}',
  file_url       text,
  language       text not null default 'fr',
  generated_by   uuid references auth.users(id),
  created_at     timestamptz default now() not null
);

-- ── AUTO-UPDATE updated_at ────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace trigger trg_profiles_updated_at
  before update on profiles for each row execute function update_updated_at();
create or replace trigger trg_employees_updated_at
  before update on employees for each row execute function update_updated_at();
create or replace trigger trg_templates_updated_at
  before update on document_templates for each row execute function update_updated_at();

-- ── AUTO-CREATE PROFILE on signup ────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table profiles           enable row level security;
alter table user_roles         enable row level security;
alter table employees          enable row level security;
alter table document_templates enable row level security;
alter table generated_documents enable row level security;

-- profiles: users see/edit only their own
create policy "profiles_select" on profiles for select using (auth.uid() = user_id);
create policy "profiles_update" on profiles for update using (auth.uid() = user_id);

-- user_roles: authenticated users can read (needed for admin checks)
create policy "user_roles_select" on user_roles for select using (auth.role() = 'authenticated');

-- employees: any authenticated user can CRUD
create policy "employees_select" on employees for select using (auth.role() = 'authenticated');
create policy "employees_insert" on employees for insert with check (auth.role() = 'authenticated');
create policy "employees_update" on employees for update using (auth.role() = 'authenticated');
create policy "employees_delete" on employees for delete using (auth.role() = 'authenticated');

-- templates: read for all authenticated, write for service_role only
create policy "templates_select" on document_templates for select using (auth.role() = 'authenticated');
create policy "templates_all"    on document_templates for all   using (auth.role() = 'service_role');

-- generated_documents: authenticated users
create policy "gendocs_select" on generated_documents for select using (auth.role() = 'authenticated');
create policy "gendocs_insert" on generated_documents for insert with check (auth.role() = 'authenticated');
create policy "gendocs_delete" on generated_documents for delete using (auth.role() = 'authenticated');

-- ── SEED: DOCUMENT TEMPLATES ────────────────────────────────
insert into document_templates (code, name_fr, name_en, name_ar, category, body_template, variables) values

('ATT_TRAVAIL', 'Attestation de travail', 'Employment Certificate', 'شهادة عمل', 'attestation',
'ATTESTATION DE TRAVAIL

Je soussigné(e), [manager], agissant en qualité de Responsable RH de la société [company],

ATTESTE QUE :

M./Mme [full_name], titulaire de la CIN N° [cin], est employé(e) au sein de notre société depuis le [hire_date] en qualité de [position] au sein du département [department].

Ce contrat est de type [contract_type].

Cette attestation est délivrée à l''intéressé(e) sur sa demande pour faire valoir ce que de droit.

Fait à [city], le [date_today].

Signature et cachet',
array['full_name','cin','hire_date','position','department','contract_type','manager','company','city','date_today']),

('ATT_SALAIRE', 'Attestation de salaire', 'Salary Certificate', 'شهادة الراتب', 'attestation',
'ATTESTATION DE SALAIRE

Je soussigné(e), [manager], Responsable RH de la société [company],

ATTESTE QUE :

M./Mme [full_name], CIN N° [cin], occupant le poste de [position], perçoit un salaire mensuel net de [salary] MAD.

Cette attestation est établie pour servir et valoir ce que de droit.

Fait à [city], le [date_today].

Signature et cachet',
array['full_name','cin','position','salary','manager','company','city','date_today']),

('CDI', 'Contrat à Durée Indéterminée', 'Permanent Employment Contract', 'عقد عمل غير محدد المدة', 'contrat',
'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE

Entre les soussignés :

La société [company], représentée par [manager] (ci-après "l''Employeur")

ET

M./Mme [full_name], né(e) le [birth_date], CIN N° [cin], demeurant à [address], [city] (ci-après "le Salarié")

IL A ÉTÉ CONVENU CE QUI SUIT :

Article 1 – Engagement
Le Salarié est engagé à compter du [contract_start] pour occuper le poste de [position] au sein du département [department].

Article 2 – Rémunération
Le Salarié percevra un salaire mensuel brut de [salary] MAD.

Article 3 – Durée du travail
La durée du travail est fixée à 44 heures par semaine conformément à la législation marocaine en vigueur.

Article 4 – Période d''essai
Le présent contrat est soumis à une période d''essai conformément au Code du Travail marocain.

Fait à [city], le [date_today], en deux exemplaires originaux.

L''Employeur                                    Le Salarié',
array['full_name','cin','birth_date','address','city','contract_start','position','department','salary','manager','company','date_today']),

('CDD', 'Contrat à Durée Déterminée', 'Fixed-Term Employment Contract', 'عقد عمل محدد المدة', 'contrat',
'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE

Entre la société [company] représentée par [manager]
ET M./Mme [full_name], CIN N° [cin]

Article 1 – Objet
Engagement en qualité de [position] – département [department] du [contract_start] au [contract_end].

Article 2 – Rémunération
Salaire mensuel brut : [salary] MAD.

Article 3 – Motif
Le présent CDD est conclu pour [motif].

Fait à [city], le [date_today].

L''Employeur                                    Le Salarié',
array['full_name','cin','position','department','contract_start','contract_end','salary','manager','company','city','date_today','motif']),

('STAGE', 'Convention de stage', 'Internship Agreement', 'اتفاقية التدريب', 'contrat',
'CONVENTION DE STAGE

Entre la société [company] (ci-après "l''Entreprise") ET M./Mme [full_name], étudiant(e) en [formation] à [etablissement] (ci-après "le Stagiaire").

Article 1 – Objet du stage
Stage de [duree] au sein du département [department], sous la supervision de [manager].

Article 2 – Durée
Du [internship_start] au [internship_end].

Article 3 – Gratification
Gratification mensuelle : [salary] MAD.

Fait à [city], le [date_today].',
array['full_name','department','manager','internship_start','internship_end','salary','company','city','date_today','formation','etablissement','duree']),

('CONGE', 'Décision de congé annuel', 'Annual Leave Decision', 'قرار الإجازة السنوية', 'lettre',
'DÉCISION DE CONGÉ ANNUEL

La direction de la société [company] autorise M./Mme [full_name], [position], à prendre ses congés annuels du [date_debut] au [date_fin], soit [nombre_jours] jours ouvrables.

Reprise du travail prévue le [date_reprise].

Fait à [city], le [date_today].

Le Responsable RH',
array['full_name','position','date_debut','date_fin','nombre_jours','date_reprise','company','city','date_today']),

('AVERTISSEMENT', 'Lettre d''avertissement', 'Warning Letter', 'رسالة تحذير', 'lettre',
'LETTRE D''AVERTISSEMENT

Objet : Avertissement

M./Mme [full_name],

Nous vous informons par la présente que votre comportement concernant [motif] est contraire au règlement intérieur de la société [company].

Nous vous demandons de bien vouloir vous conformer aux obligations de votre contrat de travail. Tout manquement ultérieur entraînera des mesures disciplinaires plus sévères.

Fait à [city], le [date_today].

La Direction',
array['full_name','motif','company','city','date_today']),

('FIN_CDI', 'Lettre de licenciement', 'Termination Letter', 'رسالة إنهاء العقد', 'lettre',
'LETTRE DE LICENCIEMENT

Objet : Notification de licenciement

M./Mme [full_name],

Par la présente, nous vous notifions la décision de mettre fin à votre contrat de travail à compter du [date_fin] pour le motif suivant : [motif].

Vous bénéficierez d''un préavis de [preavis] conformément à votre contrat et aux dispositions du Code du Travail marocain.

Fait à [city], le [date_today].

La Direction',
array['full_name','date_fin','motif','preavis','company','city','date_today']),

('ATT_PRESENCE', 'Attestation de présence', 'Presence Certificate', 'شهادة حضور', 'attestation',
'ATTESTATION DE PRÉSENCE

Je soussigné(e), [manager], Responsable RH de [company], atteste que M./Mme [full_name], [position], est bien présent(e) et en activité au sein de notre entreprise à la date du [date_today].

Délivré à [city], le [date_today].',
array['full_name','position','manager','company','city','date_today']),

('MISSION', 'Ordre de mission', 'Mission Order', 'أمر مهمة', 'lettre',
'ORDRE DE MISSION

M./Mme [full_name], [position] au sein de [company], est mandaté(e) pour effectuer une mission à [destination] du [date_debut] au [date_fin].

Objet de la mission : [objet]

Les frais de déplacement et de séjour seront pris en charge par la société.

Fait à [city], le [date_today].

La Direction',
array['full_name','position','company','destination','date_debut','date_fin','objet','city','date_today']),

('AVENANT', 'Avenant au contrat de travail', 'Employment Contract Amendment', 'ملحق عقد العمل', 'avenant',
'AVENANT AU CONTRAT DE TRAVAIL

Entre la société [company] ET M./Mme [full_name], CIN N° [cin].

Il est convenu de modifier le contrat de travail initial comme suit à compter du [date_effet] :

[modifications]

Toutes les autres clauses du contrat initial demeurent inchangées.

Fait à [city], le [date_today], en deux exemplaires.

L''Employeur                                    Le Salarié',
array['full_name','cin','company','date_effet','modifications','city','date_today'])

on conflict (code) do nothing;

-- ── DONE ──────────────────────────────────────────────────────
-- Tables created:
--   profiles, user_roles, employees, document_templates, generated_documents
-- 11 HR document templates seeded
-- Run this once in Supabase SQL Editor
