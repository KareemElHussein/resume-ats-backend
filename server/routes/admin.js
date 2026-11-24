import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';

const router = Router();

// GET /api/admin/users  (admin only; no passwords, no resume content)
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 200'
  );
  res.json({ users: rows });
});

export default router;
