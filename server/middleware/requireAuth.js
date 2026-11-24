import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { JWT_SECRET, COOKIE_NAME } from '../config.js';

// Checks the login cookie, then loads the user from the database,
// so deleted accounts and role changes take effect immediately.
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  const { rows } = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [payload.sub]);
  if (!rows[0]) return res.status(401).json({ error: 'Account not found. Please log in again.' });

  req.user = rows[0]; // { id, email, role } (never the hash)
  next();
}

// Use after requireAuth: requireRole('admin')
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to do this.' });
  }
  next();
};
