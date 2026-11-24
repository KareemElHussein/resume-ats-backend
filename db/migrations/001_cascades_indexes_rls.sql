BEGIN;

-- Change 1: add ON DELETE CASCADE to all 7 foreign keys (the old ones have no ON DELETE rule)
ALTER TABLE public.resumes DROP CONSTRAINT IF EXISTS resumes_user_id_fkey;
ALTER TABLE public.resumes ADD CONSTRAINT resumes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.job_descriptions DROP CONSTRAINT IF EXISTS job_descriptions_user_id_fkey;
ALTER TABLE public.job_descriptions ADD CONSTRAINT job_descriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS analyses_user_id_fkey;
ALTER TABLE public.analyses ADD CONSTRAINT analyses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS analyses_resume_id_fkey;
ALTER TABLE public.analyses ADD CONSTRAINT analyses_resume_id_fkey
  FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE;

ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS analyses_job_description_id_fkey;
ALTER TABLE public.analyses ADD CONSTRAINT analyses_job_description_id_fkey
  FOREIGN KEY (job_description_id) REFERENCES public.job_descriptions(id) ON DELETE CASCADE;

ALTER TABLE public.keyword_gaps DROP CONSTRAINT IF EXISTS keyword_gaps_analysis_id_fkey;
ALTER TABLE public.keyword_gaps ADD CONSTRAINT keyword_gaps_analysis_id_fkey
  FOREIGN KEY (analysis_id) REFERENCES public.analyses(id) ON DELETE CASCADE;

ALTER TABLE public.rewrite_suggestions DROP CONSTRAINT IF EXISTS rewrite_suggestions_analysis_id_fkey;
ALTER TABLE public.rewrite_suggestions ADD CONSTRAINT rewrite_suggestions_analysis_id_fkey
  FOREIGN KEY (analysis_id) REFERENCES public.analyses(id) ON DELETE CASCADE;

-- Change 2: add 7 indexes so the pages load fast (Postgres does not index foreign keys automatically)
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON public.job_descriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_resume_latest ON public.analyses (resume_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_job_description_id ON public.analyses (job_description_id);
CREATE INDEX IF NOT EXISTS idx_keyword_gaps_analysis_id ON public.keyword_gaps (analysis_id);
CREATE INDEX IF NOT EXISTS idx_rewrite_suggestions_analysis_id ON public.rewrite_suggestions (analysis_id);

-- Change 3: make email unique ignoring upper/lower case, so login cannot be duplicated
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON public.users (lower(email));

-- Change 4: reject password values too short to be a real hash (bcrypt is 60 characters)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_password_hash_not_plain;
ALTER TABLE public.users ADD CONSTRAINT users_password_hash_not_plain
  CHECK (char_length(password_hash) >= 50) NOT VALID;

-- Change 5: a completed analysis must have a match score
ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS analyses_completed_has_score;
ALTER TABLE public.analyses ADD CONSTRAINT analyses_completed_has_score
  CHECK (status <> 'completed' OR match_score IS NOT NULL) NOT VALID;

-- Change 6: turn on Row Level Security so Supabase's public API cannot read the 6 tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewrite_suggestions ENABLE ROW LEVEL SECURITY;

COMMIT;