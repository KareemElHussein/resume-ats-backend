// Reads secrets from environment variables only. Fails fast with a clear message if one is missing.
export const DATABASE_URL = process.env.DATABASE_URL;
export const JWT_SECRET = process.env.JWT_SECRET;

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET is missing or shorter than 32 characters');
}

export const COOKIE_NAME = 'token';
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const cookieOptions = {
  httpOnly: true,                                   // JavaScript in the browser cannot read it
  secure: process.env.NODE_ENV === 'production',    // HTTPS only on Vercel
  sameSite: 'lax',                                  // blocks cross-site POSTs from carrying the cookie
  path: '/',
};
