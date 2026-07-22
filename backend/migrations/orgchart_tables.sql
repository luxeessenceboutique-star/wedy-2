-- ============================================================
-- Org Chart tables — run once in the Supabase SQL editor
-- ============================================================

-- 1. Projects (each project = a team)
CREATE TABLE IF NOT EXISTS public.orgchart_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#0891b2',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Team members (employee ↔ project)
CREATE TABLE IF NOT EXISTS public.orgchart_team_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.orgchart_projects(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role_in_team TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, employee_id)
);

-- 3. Node canvas positions (saved layout)
CREATE TABLE IF NOT EXISTS public.orgchart_node_positions (
  employee_id UUID PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  x           FLOAT NOT NULL DEFAULT 0,
  y           FLOAT NOT NULL DEFAULT 0
);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.orgchart_projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgchart_team_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgchart_node_positions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access (adjust if you need stricter rules)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orgchart_projects' AND policyname = 'orgchart_auth') THEN
    CREATE POLICY orgchart_auth ON public.orgchart_projects FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orgchart_team_members' AND policyname = 'orgchart_auth') THEN
    CREATE POLICY orgchart_auth ON public.orgchart_team_members FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orgchart_node_positions' AND policyname = 'orgchart_auth') THEN
    CREATE POLICY orgchart_auth ON public.orgchart_node_positions FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ── Optional: indexes for performance ───────────────────────
CREATE INDEX IF NOT EXISTS idx_orgchart_members_project  ON public.orgchart_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_orgchart_members_employee ON public.orgchart_team_members(employee_id);
