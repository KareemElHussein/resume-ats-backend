import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate, safeText, idParam } from '../validate.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  job_title: safeText('Job title', 1, 200),
  company: safeText('Company', 0, 200).transform((s) => s || null).nullish(),
  description_text: safeText('Job description', 50, 20000),
});

// POST /api/job-descriptions
router.post('/', validate(createSchema), async (req, res) => {
  const { job_title, company, description_text } = req.valid.body;
  const { rows } = await pool.query(
    `INSERT INTO job_descriptions (user_id, job_title, company, description_text)
     VALUES ($1, $2, $3, $4)
     RETURNING id, job_title, company, created_at`,
    [req.user.id, job_title, company ?? null, description_text]
  );
  res.status(201).json({ job_description: rows[0] });
});

// GET /api/job-descriptions
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, job_title, company, created_at
     FROM job_descriptions WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  );
  res.json({ job_descriptions: rows });
});

// GET /api/job-descriptions/:id
router.get('/:id', validate(idParam, 'params'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, job_title, company, description_text, created_at
     FROM job_descriptions WHERE id = $1 AND user_id = $2`,
    [req.valid.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Job description not found.' });
  res.json({ job_description: rows[0] });
});

// DELETE /api/job-descriptions/:id
router.delete('/:id', validate(idParam, 'params'), async (req, res) => {
  const result = await pool.query('DELETE FROM job_descriptions WHERE id = $1 AND user_id = $2', [
    req.valid.params.id,
    req.user.id,
  ]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Job description not found.' });
  res.status(204).end();
});

export default router;
