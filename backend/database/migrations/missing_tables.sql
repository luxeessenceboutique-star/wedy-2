-- 1. HR Requests (Demandes de congés, documents, etc.)
CREATE TABLE IF NOT EXISTS public.hr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'conge', 'attestation', 'avance', etc.
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    description TEXT,
    comment TEXT, -- Commentaire du RH
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Lier a auth.users.id
    title TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    type TEXT, -- 'info', 'warning', 'success'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. CV Extractions (Resultats de l'IA pour le parsing)
CREATE TABLE IF NOT EXISTS public.cv_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE, -- Optionnel: lier a un employe/stagiaire
    full_name TEXT,
    email TEXT,
    phone TEXT,
    skills TEXT[],
    education TEXT,
    experience TEXT,
    languages TEXT[],
    raw_json JSONB,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_hr_requests_employee ON public.hr_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_extractions_email ON public.cv_extractions(email);
