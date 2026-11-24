# ResumeMatch

Checks a resume against a job description: match score, missing keywords and rewrite suggestions.

- `public/`: the website (plain HTML, CSS and JavaScript, no framework)
- `server/`: the API (Express + Supabase Postgres)
- `api/index.js`: runs the API on Vercel

## Fixed results (no AI)

The app does not call any AI service. Results come from [server/data/fixedResults.js](server/data/fixedResults.js),
looked up by the resume's name, which the upload page fills in from the file name. The supported names are
Nour Hassan, Mostafa Ahmed and Youssef Khaled. Matching ignores upper/lower case, the `.pdf`/`.docx`/`.txt` extension,
and whether words are split by spaces, underscores or hyphens, so `Nour_Hassan.pdf` and `nour-hassan.docx` both match.
Any other resume is rejected with a message listing the supported names.

To change a result or add a resume, edit that file. The server checks it at startup and names any invalid entry.
[samples/](samples/) has a PDF for each supported resume, ready to upload, and
[samples/jobs/](samples/jobs/) has a job description to paste in with each one. The PDFs are built by
[scripts/make-sample-pdfs.js](scripts/make-sample-pdfs.js): edit the text there and run `npm run samples`.
Each sample must keep the exact `original_text` of its rewrite suggestions, so the "updated resume" can replace it.

PDF and DOCX resumes are read in the browser (pdf.js and mammoth); only the text is sent to the server.
`npm run build` copies those two libraries into `public/vendor`.

## Database

Run these in Supabase > SQL Editor:

- **Existing database:** run each file in [db/migrations/](db/migrations/) in order, once. They are safe to run again.
- **New, empty database:** run [db/schema.sql](db/schema.sql) once. It already includes every migration.

[db/supabase-export-before-001.sql](db/supabase-export-before-001.sql) is Supabase's export of the tables before
migration 001, kept for reference. Don't run it.

When you change the database, add the change as the next numbered file in `db/migrations/` and also update
`db/schema.sql`, so both kinds of database stay the same.

## Run it locally

Needs Node.js 20.6 or newer.

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` and `JWT_SECRET`.
3. `npm run dev`, then open http://localhost:3001

Make yourself admin (optional), in the Supabase SQL editor:
`UPDATE public.users SET role = 'admin' WHERE email = 'you@example.com';`

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel (Framework preset: Other). `vercel.json` sets the build command and output folder.
2. In Project Settings > Environment Variables, add `DATABASE_URL` and `JWT_SECRET`.
3. Deploy.

## API routes

POST /api/auth/register | login | logout   GET /api/auth/me
GET /api/admin/users (admin only)
POST/GET /api/resumes, GET/DELETE /api/resumes/:id
POST/GET /api/job-descriptions, GET/DELETE /api/job-descriptions/:id
POST/GET /api/analyses, GET /api/analyses/:id
