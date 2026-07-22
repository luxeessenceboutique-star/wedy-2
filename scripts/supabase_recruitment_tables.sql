-- Run this in your Supabase SQL Editor
-- Creates tables for annonces, creneaux, and entretiens

-- Job postings
CREATE TABLE IF NOT EXISTS public.annonces (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poste        TEXT NOT NULL,
    description  TEXT,
    competences  TEXT,
    experience   TEXT,
    contenu      TEXT NOT NULL,
    image_url    TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Interview time slots
CREATE TABLE IF NOT EXISTS public.creneaux (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date         DATE NOT NULL,
    start_time   TEXT NOT NULL,
    end_time     TEXT NOT NULL,
    ad_id        UUID REFERENCES public.annonces(id) ON DELETE SET NULL,
    status       TEXT DEFAULT 'free' CHECK (status IN ('free', 'reserved', 'cancelled')),
    interview_id UUID,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled interviews
CREATE TABLE IF NOT EXISTS public.entretiens (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id   UUID NOT NULL,
    recruiter_id   UUID,
    date           DATE NOT NULL,
    start_time     TEXT NOT NULL,
    end_time       TEXT NOT NULL,
    type           TEXT NOT NULL,
    status         TEXT DEFAULT 'confirmed',
    meet_link      TEXT,
    notes          TEXT,
    candidate_name TEXT,
    job_title      TEXT,
    recruiter_name TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read of annonces and creneaux (candidates can view without login)
ALTER TABLE public.annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creneaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entretiens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "annonces_public_read"  ON public.annonces  FOR SELECT USING (true);
CREATE POLICY "creneaux_public_read"  ON public.creneaux  FOR SELECT USING (true);
CREATE POLICY "entretiens_public_read" ON public.entretiens FOR SELECT USING (true);

-- Service role bypasses RLS so the backend can write freely (no extra policy needed)
