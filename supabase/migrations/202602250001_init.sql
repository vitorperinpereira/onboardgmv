create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  clinic_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token uuid not null unique,
  status text not null check (status in ('in_progress', 'completed')) default 'in_progress',
  maturity_score numeric(3,1),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.onboarding_sessions(id) on delete cascade,
  step text not null check (step in ('essencia', 'posicionamento', 'publico', 'prova', 'personalidade', 'futuro')),
  answers jsonb not null,
  specificity_score numeric(3,1) not null,
  is_partial boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.onboarding_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.onboarding_sessions(id) on delete cascade,
  step text not null check (step in ('essencia', 'posicionamento', 'publico', 'prova', 'personalidade', 'futuro')),
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.strategic_documents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.onboarding_sessions(id) on delete cascade unique,
  manifesto text not null,
  manifesto_short text not null,
  editorial_guide jsonb not null,
  frameworks jsonb not null,
  internal_diagnosis jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.onboarding_sessions(id) on delete cascade,
  content_submitted text not null,
  alignment_score numeric(3,1) not null,
  strengths text[] not null default '{}',
  misalignments text[] not null default '{}',
  justification text not null,
  suggestions text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.copy_generations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.onboarding_sessions(id) on delete cascade,
  objective text not null,
  format text not null,
  constraints text[] not null default '{}',
  copy_variants text[] not null,
  rationale text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_onboarding_sessions_client_id on public.onboarding_sessions(client_id);
create index if not exists idx_onboarding_sessions_status on public.onboarding_sessions(status);
create index if not exists idx_onboarding_responses_session_step on public.onboarding_responses(session_id, step);
create index if not exists idx_onboarding_messages_session_created on public.onboarding_messages(session_id, created_at);
create index if not exists idx_content_reviews_session_created on public.content_reviews(session_id, created_at);
create index if not exists idx_copy_generations_session_created on public.copy_generations(session_id, created_at);

alter table public.clients enable row level security;
alter table public.onboarding_sessions enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.onboarding_messages enable row level security;
alter table public.strategic_documents enable row level security;
alter table public.content_reviews enable row level security;
alter table public.copy_generations enable row level security;

create policy "service_role_clients" on public.clients
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service_role_sessions" on public.onboarding_sessions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service_role_responses" on public.onboarding_responses
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service_role_messages" on public.onboarding_messages
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service_role_documents" on public.strategic_documents
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service_role_reviews" on public.content_reviews
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service_role_copies" on public.copy_generations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
