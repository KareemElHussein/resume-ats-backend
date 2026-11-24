import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db.js';
import { validate } from '../validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { JWT_SECRET, COOKIE_NAME, COOKIE_MAX_AGE_MS, cookieOptions } from '../config.js';

const router = Router();

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
// bcrypt only uses the first 72 bytes, so limit to 72.
const byteLimit = (p) => Buffer.byteLength(p) <= 72;

const registerSchema = z.object({
  email,
  password: z.string()
    .min(8, 'Password must be at least 8 characters.')
    .refine(byteLimit, 'Password must be at most 72 characters.'),
});
const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').refine(byteLimit, 'Incorrect email or password.'),
});

// Hash compared when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

function setLoginCookie(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: COOKIE_MAX_AGE_MS });
}

// POST /api/auth/register  (role is always 'job_seeker'; it is never read from the request)
router.post('/register', validate(registerSchema), async (req, res) => {
  const { email, password } = req.valid.body;
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       RETURNING id, email, role, created_at`,
      [email, hash]
    );
    setLoginCookie(res, rows[0]);
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.valid.body;
  const { rows } = await pool.query(
    'SELECT id, email, role, created_at, password_hash FROM users WHERE lower(email) = $1',
    [email]
  );
  const found = rows[0];
  const ok = await bcrypt.compare(password, found ? found.password_hash : DUMMY_HASH);
  if (!found || !ok) return res.status(401).json({ error: 'Incorrect email or password.' });

  const { password_hash, ...user } = found; // remove the hash before responding
  setLoginCookie(res, user);
  res.json({ user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.json({ ok: true });
});

// GET /api/auth/me  (front end calls this on page load to know who is logged in)
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
