import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate, idParam } from '../validate.js';
import { analyzeMatch } from '../services/ai.js';

const router = Router();
router.use(requireAuth);

const DAILY_LIMIT = 20; // protects your AI bill

const createSchema = z.object({
  resume_id: z.string().uuid('resume_id is not valid.'),
  job_description_id: z.string().uuid('job_description_id is not valid.'),
});
const listQuery = z.object({ resume_id: z.string().uuid('resume_id is not valid.').optional() });

// One analysis with score, keyword gaps and rewrite suggestions. Returns null unless it belongs to userId.
async function loadAnalysis(id, userId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.status, a.match_score::float8 AS match_score, a.created_at,
            a.resume_id, r.title AS resume_title,
            a.job_description_id, j.job_title, j.company
     FROM analyses a
     JOIN resumes r ON r.id = a.resume_id
     JOIN job_descriptions j ON j.id = a.job_description_id
     WHERE a.id = $1 AND a.user_id = $2`,
    [id, userId]
  );
  if (!rows[0]) return null;

  const [gaps, suggestions] = await Promise.all([
    pool.query(
      `SELECT id, keyword, category, importance FROM keyword_gaps
       WHERE analysis_id = $1 ORDER BY importance DESC, keyword`,
      [id]
    ),
    pool.query(
      `SELECT id, section, original_text, suggested_text FROM rewrite_suggestions
       WHERE analysis_id = $1 ORDER BY created_at, id`,
      [id]
    ),
  ]);
  return { ...rows[0], keyword_gaps: gaps.rows, rewrite_suggestions: suggestions.rows };
}

// POST /api/analyses  { resume_id, job_description_id }
router.post('/', validate(createSchema), async (req, res) => {
  const { resume_id, job_description_id } = req.valid.body;
  const userId = req.user.id;

  // Both must belong to the logged-in user.
  const [resume, job] = await Promise.all([
    pool.query('SELECT title, content_text FROM resumes WHERE id = $1 AND user_id = $2', [resume_id, userId]),
    pool.query(
      'SELECT job_title, company, description_text FROM job_descriptions WHERE id = $1 AND user_id = $2',
      [job_description_id, userId]
    ),
  ]);
  if (!resume.rows[0]) return res.status(404).json({ error: 'Resume not found.' });
  if (!job.rows[0]) return res.status(404).json({ error: 'Job description not found.' });

  const { rows: [{ count }] } = await pool.query(
    `SELECT count(*)::int AS count FROM analyses
     WHERE user_id = $1 AND created_at > now() - interval '24 hours'`,
    [userId]
  );
  if (count >= DAILY_LIMIT) {
    return res.status(429).json({ error: `Daily limit of ${DAILY_LIMIT} analyses reached. Try again tomorrow.` });
  }

  // Status starts as 'pending'.
  const { rows: [analysis] } = await pool.query(
    `INSERT INTO analyses (user_id, resume_id, job_description_id) VALUES ($1, $2, $3) RETURNING id`,
    [userId, resume_id, job_description_id]
  );

  let result;
  try {
    result = await analyzeMatch({
      resumeText: resume.rows[0].content_text,
      jobTitle: job.rows[0].job_title,
      company: job.rows[0].company,
      jobText: job.rows[0].description_text,
    });
  } catch (err) {
    console.error('AI analysis failed:', err.message);
    await pool.query(`UPDATE analyses SET status = 'failed' WHERE id = $1`, [analysis.id]);
    return res.status(502).json({
      error: 'The AI service could not analyze this resume. Please try again.',
      analysis_id: analysis.id,
    });
  }

  // Save everything or nothing.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO keyword_gaps (analysis_id, keyword, category, importance)
       SELECT $1, * FROM unnest($2::text[], $3::text[], $4::int[])`,
      [
        analysis.id,
        result.keyword_gaps.map((g) => g.keyword),
        result.keyword_gaps.map((g) => g.category),
        result.keyword_gaps.map((g) => g.importance),
      ]
    );
    await client.query(
      `INSERT INTO rewrite_suggestions (analysis_id, section, original_text, suggested_text)
       SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[])`,
      [
        analysis.id,
        result.rewrite_suggestions.map((s) => s.section),
        result.rewrite_suggestions.map((s) => s.original_text),
        result.rewrite_suggestions.map((s) => s.suggested_text),
      ]
    );
    await client.query(`UPDATE analyses SET status = 'completed', match_score = $1 WHERE id = $2`, [
      result.match_score,
      analysis.id,
    ]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await pool.query(`UPDATE analyses SET status = 'failed' WHERE id = $1`, [analysis.id]);
    throw err;
  } finally {
    client.release();
  }

  res.status(201).json({ analysis: await loadAnalysis(analysis.id, userId) });
});

// GET /api/analyses?resume_id=...  (history list, newest first)
router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.status, a.match_score::float8 AS match_score, a.created_at,
            r.title AS resume_title, j.job_title, j.company
     FROM analyses a
     JOIN resumes r ON r.id = a.resume_id
     JOIN job_descriptions j ON j.id = a.job_description_id
     WHERE a.user_id = $1 AND ($2::uuid IS NULL OR a.resume_id = $2)
     ORDER BY a.created_at DESC LIMIT 50`,
    [req.user.id, req.valid.query.resume_id ?? null]
  );
  res.json({ analyses: rows });
});

// GET /api/analyses/:id  -> Match results page
router.get('/:id', validate(idParam, 'params'), async (req, res) => {
  const analysis = await loadAnalysis(req.valid.params.id, req.user.id);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found.' });
  res.json({ analysis });
});

export default router;
