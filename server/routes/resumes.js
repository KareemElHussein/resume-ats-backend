import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate, safeText, idParam } from '../validate.js';

const router = Router();
router.use(requireAuth); // every resume route needs login

const pathOf = (u) => { try { return new URL(u).pathname; } catch { return ''; } };

// Optional link to an uploaded file; only PDF, DOCX and TXT are accepted.
const fileUrl = z.string()
  .max(500, 'file_url is too long.')
  .url('file_url must be a valid link.')
  .refine((u) => u.startsWith('https://'), 'file_url must start with https://')
  .refine((u) => /\.(pdf|docx|txt)$/i.test(pathOf(u)), 'Only PDF, DOCX or TXT files are allowed.');

const createSchema = z.object({
  title: safeText('Title', 1, 200),
  content_text: safeText('Resume text', 100, 20000), // size limit
  file_url: fileUrl.nullish(),
});

// POST /api/resumes
router.post('/', validate(createSchema), async (req, res) => {
  const { title, content_text, file_url } = req.valid.body;
  const { rows } = await pool.query(
    `INSERT INTO resumes (user_id, title, content_text, file_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, file_url, created_at`,
    [req.user.id, title, content_text, file_url ?? null]
  );
  res.status(201).json({ resume: rows[0] });
});

// GET /api/resumes  -> "My saved resumes" page: title, created date, latest completed score
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.title, r.file_url, r.created_at,
            la.match_score::float8 AS latest_match_score
     FROM resumes r
     LEFT JOIN LATERAL (
       SELECT a.match_score
       FROM analyses a
       WHERE a.resume_id = r.id AND a.status = 'completed'
       ORDER BY a.created_at DESC
       LIMIT 1
     ) la ON true
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC
     LIMIT 100`,
    [req.user.id]
  );
  res.json({ resumes: rows });
});

// GET /api/resumes/:id  (full text; only the owner can read it)
router.get('/:id', validate(idParam, 'params'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, file_url, content_text, created_at
     FROM resumes WHERE id = $1 AND user_id = $2`,
    [req.valid.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Resume not found.' });
  res.json({ resume: rows[0] });
});

// DELETE /api/resumes/:id  (its analyses, keyword gaps and suggestions are removed by ON DELETE CASCADE)
router.delete('/:id', validate(idParam, 'params'), async (req, res) => {
  const result = await pool.query('DELETE FROM resumes WHERE id = $1 AND user_id = $2', [
    req.valid.params.id,
    req.user.id,
  ]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Resume not found.' });
  res.status(204).end();
});

export default router;
