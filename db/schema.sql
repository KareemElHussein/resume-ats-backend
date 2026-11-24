-- ResumeMatch: the full database schema, for setting up a NEW, empty database.
-- Run it once in Supabase > SQL Editor.
--
-- It is the live schema (supabase-export-before-001.sql) with migrations/001 applied, and it uses
-- the same constraint and index names, so later migrations work on both kinds of database.
-- For the existing database, run the files in migrations/ instead, in order.

BEGIN;

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'job_seeker'::text CHECK (role = ANY (ARRAY['job_seeker'::text, 'admin'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  -- bcrypt hashes are 60 characters; rejects passwords stored as plain text
  CONSTRAINT users_password_hash_not_plain CHECK (char_length(password_hash) >= 50)
);
-- Email is unique ignoring upper/lower case.
CREATE UNIQUE INDEX users_email_lower_key ON public.users (lower(email));

CREATE TABLE public.resumes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  file_url text,
  content_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resumes_pkey PRIMARY KEY (id),
  CONSTRAINT resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.job_descriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_title text NOT NULL,
  company text,
  description_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT job_descriptions_pkey PRIMARY KEY (id),
  CONSTRAINT job_descriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Deleting a user, resume or job description also deletes its analyses.
CREATE TABLE public.analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resume_id uuid NOT NULL,
  job_description_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
  match_score numeric CHECK (match_score IS NULL OR match_score >= 0::numeric AND match_score <= 100::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT analyses_pkey PRIMARY KEY (id),
  CONSTRAINT analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT analyses_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE,
  CONSTRAINT analyses_job_description_id_fkey FOREIGN KEY (job_description_id) REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
  CONSTRAINT analyses_completed_has_score CHECK (status <> 'completed' OR match_score IS NOT NULL)
);

CREATE TABLE public.keyword_gaps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  keyword text NOT NULL,
  category text NOT NULL DEFAULT 'other'::text CHECK (category = ANY (ARRAY['skill'::text, 'tool'::text, 'qualification'::text, 'other'::text])),
  importance integer NOT NULL DEFAULT 3 CHECK (importance >= 1 AND importance <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT keyword_gaps_pkey PRIMARY KEY (id),
  CONSTRAINT keyword_gaps_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.analyses(id) ON DELETE CASCADE
);

CREATE TABLE public.rewrite_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  section text NOT NULL CHECK (section = ANY (ARRAY['summary'::text, 'experience'::text, 'skills'::text, 'education'::text])),
  original_text text NOT NULL,
  suggested_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rewrite_suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT rewrite_suggestions_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.analyses(id) ON DELETE CASCADE
);

-- Postgres does not index foreign keys on its own; these keep the pages fast.
CREATE INDEX idx_resumes_user_id ON public.resumes (user_id);
CREATE INDEX idx_job_descriptions_user_id ON public.job_descriptions (user_id);
CREATE INDEX idx_analyses_user_id ON public.analyses (user_id);
CREATE INDEX idx_analyses_resume_latest ON public.analyses (resume_id, created_at DESC);
CREATE INDEX idx_analyses_job_description_id ON public.analyses (job_description_id);
CREATE INDEX idx_keyword_gaps_analysis_id ON public.keyword_gaps (analysis_id);
CREATE INDEX idx_rewrite_suggestions_analysis_id ON public.rewrite_suggestions (analysis_id);

-- Row level security with no policies: Supabase's public REST API cannot read these tables.
-- The app is unaffected: it connects through DATABASE_URL as the table owner, which bypasses it.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewrite_suggestions ENABLE ROW LEVEL SECURITY;

COMMIT;
