-- ── RECRUITMENT MODULE SCHEMA ───────────────────────────────────

-- 1. Job Advertisements
create table if not exists recruitment_ads (
  id          uuid primary key default gen_random_uuid(),
  poste       text not null,
  description text,
  competences text,
  experience  text,
  contenu     text not null,
  image_url   text,
  is_active   boolean default true,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create trigger trg_recruitment_ads_updated_at
  before update on recruitment_ads for each row execute function update_updated_at();

-- 2. Interviews
create table if not exists interviews (
  id          uuid primary key default gen_random_uuid(),
  candidate_id uuid references profiles(id) on delete cascade not null,
  recruiter_id uuid references auth.users(id),
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  type        text not null check (type in ('rh', 'technical', 'final')),
  status      text not null default 'pending'
                check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  meet_link   text,
  notes       text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create trigger trg_interviews_updated_at
  before update on interviews for each row execute function update_updated_at();

-- 3. HR Slots (Interviewer Availabilities)
create table if not exists hr_slots (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  status      text not null default 'free'
                check (status in ('free', 'reserved')),
  ad_id       uuid references recruitment_ads(id) on delete set null,
  interview_id uuid references interviews(id) on delete set null,
  created_at  timestamptz default now() not null
);

-- 4. Candidate Applications (Links profiles to ads)
create table if not exists candidate_applications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references profiles(id) on delete cascade not null,
  ad_id       uuid references recruitment_ads(id) on delete cascade not null,
  status      text not null default 'pending'
                check (status in ('pending', 'screening', 'interview', 'accepted', 'rejected')),
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  unique(profile_id, ad_id)
);

create trigger trg_candidate_applications_updated_at
  before update on candidate_applications for each row execute function update_updated_at();

-- RLS Policies
alter table recruitment_ads      enable row level security;
alter table interviews           enable row level security;
alter table hr_slots             enable row level security;
alter table candidate_applications enable row level security;

-- Simple Authenticated Access for now
create policy "ads_select"  on recruitment_ads  for select using (true); -- Public/Authenticated
create policy "ads_write"   on recruitment_ads  for all    using (auth.role() = 'service_role' or exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin', 'hr', 'rh')));

create policy "int_select"  on interviews       for select using (auth.role() = 'authenticated');
create policy "int_write"   on interviews       for all    using (auth.role() = 'service_role' or exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin', 'hr', 'rh')));

create policy "slot_select" on hr_slots         for select using (true);
create policy "slot_write"  on hr_slots         for all    using (auth.role() = 'service_role' or exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin', 'hr', 'rh')));

create policy "app_select"  on candidate_applications for select using (auth.role() = 'authenticated');
create policy "app_insert"  on candidate_applications for insert with check (true); -- Allow public applications
create policy "app_write"   on candidate_applications for all    using (auth.role() = 'service_role' or exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin', 'hr', 'rh')));
