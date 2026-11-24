-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'job_seeker'::text CHECK (role = ANY (ARRAY['job_seeker'::text, 'admin'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.resumes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  file_url text,
  content_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resumes_pkey PRIMARY KEY (id),
  CONSTRAINT resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.job_descriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_title text NOT NULL,
  company text,
  description_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT job_descriptions_pkey PRIMARY KEY (id),
  CONSTRAINT job_descriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resume_id uuid NOT NULL,
  job_description_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
  match_score numeric CHECK (match_score IS NULL OR match_score >= 0::numeric AND match_score <= 100::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT analyses_pkey PRIMARY KEY (id),
  CONSTRAINT analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT analyses_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id),
  CONSTRAINT analyses_job_description_id_fkey FOREIGN KEY (job_description_id) REFERENCES public.job_descriptions(id)
);
CREATE TABLE public.keyword_gaps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  keyword text NOT NULL,
  category text NOT NULL DEFAULT 'other'::text CHECK (category = ANY (ARRAY['skill'::text, 'tool'::text, 'qualification'::text, 'other'::text])),
  importance integer NOT NULL DEFAULT 3 CHECK (importance >= 1 AND importance <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT keyword_gaps_pkey PRIMARY KEY (id),
  CONSTRAINT keyword_gaps_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.analyses(id)
);
CREATE TABLE public.rewrite_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  section text NOT NULL CHECK (section = ANY (ARRAY['summary'::text, 'experience'::text, 'skills'::text, 'education'::text])),
  original_text text NOT NULL,
  suggested_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rewrite_suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT rewrite_suggestions_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.analyses(id)
);