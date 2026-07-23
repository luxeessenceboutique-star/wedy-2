-- ============================================================
-- YODABOT RH PLATFORM — Schema v2 Extensions
-- Safe to run standalone or after supabase_schema.sql
-- ============================================================

-- ── ENSURE update_updated_at() EXISTS (idempotent) ───────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ── 6. DEPARTMENTS ───────────────────────────────────────────
create table if not exists departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  manager_id  uuid references employees(id) on delete set null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create or replace trigger trg_departments_updated_at
  before update on departments for each row execute function update_updated_at();

-- ── 7. HR_REQUESTS ───────────────────────────────────────────
create table if not exists hr_requests (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  user_id     uuid references auth.users(id),
  type        text not null,
  description text,
  status      text not null default 'pending'
                check (status in ('pending','approved','rejected','in_progress')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create or replace trigger trg_hr_requests_updated_at
  before update on hr_requests for each row execute function update_updated_at();

-- ── 8. NOTIFICATIONS ─────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text not null,
  message    text not null,
  type       text not null default 'info'
               check (type in ('info','success','warning','error')),
  is_read    boolean default false not null,
  link       text,
  created_at timestamptz default now() not null
);

-- ── 9. AUDIT LOGS ────────────────────────────────────────────
create table if not exists audit_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id),
  action        text not null,
  entity        text not null,
  entity_id     text,
  details       jsonb default '{}',
  ip_address    text,
  user_agent    text,
  created_at    timestamptz default now() not null
);

-- ── 10. LEAVE BALANCES ───────────────────────────────────────
create table if not exists leave_balances (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid references employees(id) on delete cascade not null,
  year           int not null default extract(year from now())::int,
  annual_total   int not null default 21,
  annual_used    int not null default 0,
  sick_total     int not null default 12,
  sick_used      int not null default 0,
  personal_total int not null default 5,
  personal_used  int not null default 0,
  updated_at     timestamptz default now() not null,
  unique(employee_id, year)
);

create or replace trigger trg_leave_balances_updated_at
  before update on leave_balances for each row execute function update_updated_at();

-- ── 11. LEAVE REQUESTS ───────────────────────────────────────
create table if not exists leave_requests (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade not null,
  type        text not null
                check (type in ('annual','sick','personal','maternity','paternity','unpaid')),
  start_date  date not null,
  end_date    date not null,
  days        int not null,
  reason      text,
  status      text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create or replace trigger trg_leave_requests_updated_at
  before update on leave_requests for each row execute function update_updated_at();

-- Auto-update leave_balances.used when a leave request is approved
create or replace function handle_leave_approval()
returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and old.status != 'approved' then
    -- Upsert balance for current year
    insert into leave_balances (employee_id, year)
    values (new.employee_id, extract(year from new.start_date)::int)
    on conflict (employee_id, year) do nothing;

    if new.type = 'annual' then
      update leave_balances
        set annual_used = annual_used + new.days
      where employee_id = new.employee_id
        and year = extract(year from new.start_date)::int;
    elsif new.type = 'sick' then
      update leave_balances
        set sick_used = sick_used + new.days
      where employee_id = new.employee_id
        and year = extract(year from new.start_date)::int;
    elsif new.type = 'personal' then
      update leave_balances
        set personal_used = personal_used + new.days
      where employee_id = new.employee_id
        and year = extract(year from new.start_date)::int;
    end if;

    -- Update employee status to on-leave
    update employees set status = 'on-leave' where id = new.employee_id;
  end if;
  return new;
end;
$$;

create or replace trigger trg_leave_approval
  after update on leave_requests
  for each row execute function handle_leave_approval();

-- ── 12. PAYROLL RECORDS ──────────────────────────────────────
create table if not exists payroll_records (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid references employees(id) on delete cascade not null,
  month        int not null check (month between 1 and 12),
  year         int not null,
  base_salary  numeric(10,2) not null,
  bonuses      numeric(10,2) default 0,
  deductions   numeric(10,2) default 0,
  cnss         numeric(10,2) default 0,
  ir           numeric(10,2) default 0,
  net_salary   numeric(10,2) not null,
  status       text not null default 'draft'
                 check (status in ('draft','validated','paid')),
  paid_at      timestamptz,
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  unique(employee_id, month, year)
);

create or replace trigger trg_payroll_updated_at
  before update on payroll_records for each row execute function update_updated_at();

-- ── 13. PERFORMANCE REVIEWS ──────────────────────────────────
create table if not exists performance_reviews (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid references employees(id) on delete cascade not null,
  reviewer_id   uuid references auth.users(id),
  period        text not null,
  score         int check (score between 1 and 5),
  objectives    text,
  achievements  text,
  improvements  text,
  status        text not null default 'draft'
                  check (status in ('draft','submitted','completed')),
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

create or replace trigger trg_performance_updated_at
  before update on performance_reviews for each row execute function update_updated_at();

-- ── ROW LEVEL SECURITY (new tables) ──────────────────────────
alter table departments         enable row level security;
alter table hr_requests         enable row level security;
alter table notifications       enable row level security;
alter table audit_logs          enable row level security;
alter table leave_balances      enable row level security;
alter table leave_requests      enable row level security;
alter table payroll_records     enable row level security;
alter table performance_reviews enable row level security;

-- Drop existing policies before recreating (idempotent)
drop policy if exists "dept_select"    on departments;
drop policy if exists "dept_write"     on departments;
drop policy if exists "hr_req_select"  on hr_requests;
drop policy if exists "hr_req_insert"  on hr_requests;
drop policy if exists "hr_req_update"  on hr_requests;
drop policy if exists "notif_select"   on notifications;
drop policy if exists "notif_insert"   on notifications;
drop policy if exists "notif_update"   on notifications;
drop policy if exists "audit_select"   on audit_logs;
drop policy if exists "audit_insert"   on audit_logs;
drop policy if exists "lb_select"      on leave_balances;
drop policy if exists "lb_all"         on leave_balances;
drop policy if exists "lr_select"      on leave_requests;
drop policy if exists "lr_insert"      on leave_requests;
drop policy if exists "lr_update"      on leave_requests;
drop policy if exists "lr_delete"      on leave_requests;
drop policy if exists "pay_select"     on payroll_records;
drop policy if exists "pay_all"        on payroll_records;
drop policy if exists "perf_select"    on performance_reviews;
drop policy if exists "perf_insert"    on performance_reviews;
drop policy if exists "perf_update"    on performance_reviews;

-- departments
create policy "dept_select" on departments for select using (auth.role() = 'authenticated');
create policy "dept_write"  on departments for all   using (auth.role() = 'service_role');

-- hr_requests
create policy "hr_req_select" on hr_requests for select using (auth.role() = 'authenticated');
create policy "hr_req_insert" on hr_requests for insert with check (auth.role() = 'authenticated');
create policy "hr_req_update" on hr_requests for update using (auth.role() = 'authenticated');

-- notifications
create policy "notif_select" on notifications for select using (auth.uid() = user_id);
create policy "notif_insert" on notifications for insert with check (auth.role() = 'service_role');
create policy "notif_update" on notifications for update using (auth.uid() = user_id);

-- audit_logs
create policy "audit_select" on audit_logs for select using (auth.role() = 'authenticated');
create policy "audit_insert" on audit_logs for insert with check (auth.role() = 'service_role');

-- leave_balances
create policy "lb_select" on leave_balances for select using (auth.role() = 'authenticated');
create policy "lb_all"    on leave_balances for all   using (auth.role() = 'service_role');

-- leave_requests
create policy "lr_select" on leave_requests for select using (auth.role() = 'authenticated');
create policy "lr_insert" on leave_requests for insert with check (auth.role() = 'authenticated');
create policy "lr_update" on leave_requests for update using (auth.role() = 'authenticated');
create policy "lr_delete" on leave_requests for delete using (auth.role() = 'authenticated');

-- payroll_records
create policy "pay_select" on payroll_records for select using (auth.role() = 'authenticated');
create policy "pay_all"    on payroll_records for all   using (auth.role() = 'service_role');

-- performance_reviews
create policy "perf_select" on performance_reviews for select using (auth.role() = 'authenticated');
create policy "perf_insert" on performance_reviews for insert with check (auth.role() = 'authenticated');
create policy "perf_update" on performance_reviews for update using (auth.role() = 'authenticated');

-- ── INDEXES ───────────────────────────────────────────────────
create index if not exists idx_employees_status     on employees(status);
create index if not exists idx_employees_department on employees(department);
create index if not exists idx_employees_contract_end on employees(contract_end);
create index if not exists idx_leave_requests_employee on leave_requests(employee_id);
create index if not exists idx_leave_requests_status   on leave_requests(status);
create index if not exists idx_payroll_employee_month  on payroll_records(employee_id, month, year);
create index if not exists idx_audit_logs_user         on audit_logs(user_id);
create index if not exists idx_audit_logs_created_at   on audit_logs(created_at desc);
create index if not exists idx_notifications_user      on notifications(user_id, is_read);

-- ── DONE ──────────────────────────────────────────────────────
-- New tables: departments, hr_requests, notifications, audit_logs,
--             leave_balances, leave_requests, payroll_records, performance_reviews
-- Run this once in Supabase SQL Editor AFTER supabase_schema.sql
