-- SignalDesk initial schema
-- Run in Supabase: Dashboard → SQL Editor → paste & run (or `supabase db push`).

create extension if not exists vector with schema extensions;

-- ---------- Enums ----------
create type user_role as enum ('student', 'staff', 'admin');

create type request_status as enum (
  'new',           -- just submitted, not yet classified
  'needs_review',  -- Jev was not confident; a human must triage
  'triaged',       -- classified and routed to a team
  'in_progress',
  'resolved',
  'closed',
  'rejected'
);

-- ---------- Reference data ----------
create table teams (
  id          serial primary key,
  slug        text unique not null,
  name        text not null,
  description text
);

create table buildings (
  id    serial primary key,
  code  text unique not null,
  name  text not null
);

-- Category descriptions double as the Jev Choice criteria,
-- so categories can be edited without touching code.
create table categories (
  slug            text primary key,
  name            text not null,
  description     text not null,
  default_team_id int references teams(id)
);

-- ---------- Users ----------
-- One row per Supabase Auth user.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        user_role not null default 'student',
  building_id int references buildings(id),
  room        text,
  team_id     int references teams(id),  -- for staff
  created_at  timestamptz not null default now()
);

-- ---------- Requests ----------
create table requests (
  id             bigserial primary key,
  reporter_id    uuid references profiles(id) on delete set null,
  building_id    int references buildings(id),
  room           text,
  title          text not null,
  description    text not null,

  -- current (possibly human-corrected) triage values
  category_slug  text references categories(slug),
  priority       smallint check (priority between 0 and 3),  -- 0 low … 3 emergency
  safety_hazard  boolean not null default false,
  team_id        int references teams(id),
  status         request_status not null default 'new',

  -- similarity / duplicates (all-MiniLM-L6-v2 → 384 dims)
  embedding      vector(384),
  duplicate_of   bigint references requests(id) on delete set null,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

create index requests_status_idx   on requests(status);
create index requests_building_idx on requests(building_id, created_at desc);
create index requests_category_idx on requests(category_slug, created_at desc);
create index requests_embedding_idx on requests using hnsw (embedding vector_cosine_ops);

create table assignments (
  id           bigserial primary key,
  request_id   bigint not null references requests(id) on delete cascade,
  team_id      int references teams(id),
  assignee_id  uuid references profiles(id) on delete set null,
  assigned_by  uuid references profiles(id) on delete set null,  -- null = auto (Jev)
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index assignments_request_idx on assignments(request_id);

create table status_history (
  id          bigserial primary key,
  request_id  bigint not null references requests(id) on delete cascade,
  from_status request_status,
  to_status   request_status not null,
  changed_by  uuid references profiles(id) on delete set null,  -- null = system
  note        text,
  created_at  timestamptz not null default now()
);
create index status_history_request_idx on status_history(request_id);

-- Raw model output, kept separately so we can audit and re-tune thresholds.
create table predictions (
  id                   bigserial primary key,
  request_id           bigint not null references requests(id) on delete cascade,
  model                text not null,
  category_slug        text,
  category_confidence  real,
  category_probs       jsonb,
  priority_score       real,      -- probability-weighted 0..3
  priority_confidence  real,
  priority_probs       jsonb,
  safety_hazard_prob   real,
  cost_usd             numeric(12, 8),
  latency_ms           int,
  raw                  jsonb,
  created_at           timestamptz not null default now()
);
create index predictions_request_idx on predictions(request_id);

-- ---------- updated_at trigger ----------
create function set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger requests_updated_at before update on requests
  for each row execute function set_updated_at();

-- ---------- Auto-create profile on signup ----------
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Row Level Security ----------
-- The browser never queries these tables directly; all access goes through
-- the FastAPI backend (which connects as the postgres role and bypasses RLS).
-- Enabling RLS with no policies blocks the public anon/authenticated API.
alter table teams          enable row level security;
alter table buildings      enable row level security;
alter table categories     enable row level security;
alter table profiles       enable row level security;
alter table requests       enable row level security;
alter table assignments    enable row level security;
alter table status_history enable row level security;
alter table predictions    enable row level security;
