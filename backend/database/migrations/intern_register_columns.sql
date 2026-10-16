-- ════════════════════════════════════════════════════════════
-- INTERN REGISTER — columns needed by "ETAT DES STAGIAIRES"
-- Additive and nullable: safe to run several times.
--
--   Nom et prénom      -> employees.full_name          (existing)
--   Étude              -> employees.education_summary  (existing)
--   École              -> employees.school             (existing)
--   Email / Téléphone  -> employees.email / phone      (existing)
--   Mission            -> employees.position           (existing)
--   Date début / fin   -> employees.internship_start / internship_end (existing)
--   Observation        -> employees.notes              (existing)
--   Période de stage   -> employees.internship_period  (NEW)
--   Statut stage       -> employees.internship_status  (NEW)
--   Contact responsable-> employees.school_contact     (NEW)
--   Type de stage      -> employees.internship_type    (NEW: Stage fonctionnel, d'apprentissage, pré-embauche, PFE, PFA...)
--   Sheet "ETAT TESTS" (developer recruitment tests): Code Source / Demo Link / CV / NOTE RH / NOTE TEST
--                      -> employees.test_code_source / test_demo_link / test_cv / test_note_rh / test_note_test (NEW)
-- ════════════════════════════════════════════════════════════
ALTER TABLE rh.employees
  ADD COLUMN IF NOT EXISTS internship_period text,
  ADD COLUMN IF NOT EXISTS internship_status text,
  ADD COLUMN IF NOT EXISTS school_contact    text,
  ADD COLUMN IF NOT EXISTS internship_type   text,
  ADD COLUMN IF NOT EXISTS test_code_source  text,
  ADD COLUMN IF NOT EXISTS test_demo_link    text,
  ADD COLUMN IF NOT EXISTS test_cv           text,
  ADD COLUMN IF NOT EXISTS test_note_rh      text,
  ADD COLUMN IF NOT EXISTS test_note_test    text;

CREATE INDEX IF NOT EXISTS idx_employees_internship_status ON rh.employees (internship_status);

NOTIFY pgrst, 'reload schema';
