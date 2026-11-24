# Resume ATS back end (Express + Supabase Postgres)

1. Copy these files into your Vite project folder. If you already have `package.json` or `vite.config.js`,
   merge them: add `"type": "module"`, the `dev:api` script, and the `/api` proxy.
2. Install packages:
   npm install express pg bcryptjs jsonwebtoken cookie-parser zod @anthropic-ai/sdk
3. Copy `.env.example` to `.env.local` and fill in DATABASE_URL, JWT_SECRET and ANTHROPIC_API_KEY.
4. Run: `npm run dev:api` (API on :3001) and `npm run dev` (React).
5. Make yourself admin (optional), in the Supabase SQL editor:
   UPDATE public.users SET role = 'admin' WHERE email = 'you@example.com';
6. Deploy: push to GitHub, import in Vercel, add the same environment variables there.

Routes:
POST /api/auth/register | login | logout   GET /api/auth/me
GET /api/admin/users (admin only)
POST/GET /api/resumes, GET/DELETE /api/resumes/:id
POST/GET /api/job-descriptions, GET/DELETE /api/job-descriptions/:id
POST/GET /api/analyses, GET /api/analyses/:id
