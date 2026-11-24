-- ResumeMatch database tables. Run once in Supabase > SQL Editor.
-- Safe to run again: tables and indexes that already exist are left unchanged.

create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  password_hash text not null,
  role          text not null default 'job_seeker' check (role in ('job_seeker', 'admin')),
  created_at    timestamptz not null default now()
);
-- Emails are stored lowercase; login looks them up with lower(email).
create unique index if not exists users_email_key on public.users (lower(email));

create table if not exists public.resumes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  title        text not null,
  content_text text not null,
  file_url     text,
  created_at   timestamptz not null default now()
);
create index if not exists resumes_user_created_idx on public.resumes (user_id, created_at desc);

create table if not exists public.job_descriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  job_title        text not null,
  company          text,
  description_text text not null,
  created_at       timestamptz not null default now()
);
create index if not exists job_descriptions_user_created_idx on public.job_descriptions (user_id, created_at desc);

-- Deleting a resume or a job description also deletes its analyses.
create table if not exists public.analyses (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users (id) on delete cascade,
  resume_id          uuid not null references public.resumes (id) on delete cascade,
  job_description_id uuid not null references public.job_descriptions (id) on delete cascade,
  status             text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  match_score        numeric(5, 2) check (match_score between 0 and 100),
  created_at         timestamptz not null default now()
);
create index if not exists analyses_user_created_idx on public.analyses (user_id, created_at desc);
create index if not exists analyses_resume_created_idx on public.analyses (resume_id, created_at desc);

create table if not exists public.keyword_gaps (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  keyword     text not null,
  category    text not null check (category in ('skill', 'tool', 'qualification', 'other')),
  importance  int  not null check (importance between 1 and 5)
);
create index if not exists keyword_gaps_analysis_idx on public.keyword_gaps (analysis_id);

create table if not exists public.rewrite_suggestions (
  id             uuid primary key default gen_random_uuid(),
  analysis_id    uuid not null references public.analyses (id) on delete cascade,
  section        text not null check (section in ('summary', 'experience', 'skills', 'education')),
  original_text  text not null,
  suggested_text text not null,
  created_at     timestamptz not null default now()
);
create index if not exists rewrite_suggestions_analysis_idx on public.rewrite_suggestions (analysis_id);

-- Supabase also exposes the public schema through its REST API. With row level security on and
-- no policies, that API can't read these tables. The app is unaffected: it connects as the
-- database owner through DATABASE_URL, which bypasses row level security.
alter table public.users               enable row level security;
alter table public.resumes             enable row level security;
alter table public.job_descriptions    enable row level security;
alter table public.analyses            enable row level security;
alter table public.keyword_gaps        enable row level security;
alter table public.rewrite_suggestions enable row level security;
