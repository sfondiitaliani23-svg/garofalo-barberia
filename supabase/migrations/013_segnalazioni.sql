-- 013 · Segnalazioni salvate davvero + proposte degli assistenti IA.
-- Si esegue UNA volta nel progetto "Garofalo Barberia": SQL Editor -> New query -> Run. Si può rieseguire senza danni.
create table if not exists public.site_issues (
  id text primary key,
  area_id text not null,
  area_name text not null,
  title text not null,
  description text not null,
  priority text not null default 'media',
  status text not null default 'in_analisi',
  technical_details text,
  reported_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ai_logs jsonb not null default '[]'::jsonb,
  ai_resolution_summary text,
  developer_notes text,
  assigned_agents jsonb
);
alter table public.site_issues add column if not exists ai_proposal jsonb;
alter table public.site_issues add column if not exists audit jsonb not null default '[]'::jsonb;

alter table public.site_issues enable row level security;
drop policy if exists site_issues_admin_all on public.site_issues;
create policy site_issues_admin_all on public.site_issues for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
drop policy if exists site_issues_tester_read on public.site_issues;
create policy site_issues_tester_read on public.site_issues for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role::text = 'tester'));
