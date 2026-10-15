-- KAOMA staff management foundation.
-- Apply this migration to the KAOMA Supabase project before enabling staff features.
-- The main admin is identified by the existing public.admins table.

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role_key text not null default 'custom',
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  work_area text not null default 'general',
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'blocked', 'completed', 'cancelled')),
  assigned_to uuid references public.staff_members(user_id) on delete set null,
  due_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists staff_tasks_assigned_status_idx
  on public.staff_tasks (assigned_to, status, due_at);
create index if not exists staff_audit_log_created_at_idx
  on public.staff_audit_log (created_at desc);

alter table public.staff_members enable row level security;
alter table public.staff_tasks enable row level security;
alter table public.staff_audit_log enable row level security;

-- Main admins retain full control. Staff can only read their own staff record.
drop policy if exists "Admins manage staff members" on public.staff_members;
create policy "Admins manage staff members"
  on public.staff_members for all to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Staff read own staff record" on public.staff_members;
create policy "Staff read own staff record"
  on public.staff_members for select to authenticated
  using (user_id = auth.uid() and status = 'active');

-- Admins can manage every task; active staff can read and update only tasks assigned to them.
drop policy if exists "Admins manage staff tasks" on public.staff_tasks;
create policy "Admins manage staff tasks"
  on public.staff_tasks for all to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Active staff read assigned tasks" on public.staff_tasks;
create policy "Active staff read assigned tasks"
  on public.staff_tasks for select to authenticated
  using (
    assigned_to = auth.uid()
    and exists (
      select 1 from public.staff_members s
      where s.user_id = auth.uid() and s.status = 'active'
    )
  );

drop policy if exists "Active staff update assigned task progress" on public.staff_tasks;
create policy "Active staff update assigned task progress"
  on public.staff_tasks for update to authenticated
  using (
    assigned_to = auth.uid()
    and exists (
      select 1 from public.staff_members s
      where s.user_id = auth.uid() and s.status = 'active'
    )
  )
  with check (
    assigned_to = auth.uid()
    and exists (
      select 1 from public.staff_members s
      where s.user_id = auth.uid() and s.status = 'active'
    )
  );

-- Audit entries are written by trusted server code using the service role.
-- No direct client insert/update/delete policies are intentionally provided.
drop policy if exists "Admins read staff audit log" on public.staff_audit_log;
create policy "Admins read staff audit log"
  on public.staff_audit_log for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

revoke insert, update, delete on public.staff_members from authenticated;
grant select on public.staff_members to authenticated;
revoke insert, update, delete on public.staff_tasks from authenticated;
grant select on public.staff_tasks to authenticated;
revoke update on public.staff_tasks from authenticated;
grant select on public.staff_audit_log to authenticated;
grant usage, select on sequence public.staff_audit_log_id_seq to service_role;
grant all on public.staff_members, public.staff_tasks, public.staff_audit_log to service_role;
