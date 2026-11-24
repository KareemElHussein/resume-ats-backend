import pg from 'pg';
import { DATABASE_URL } from './config.js';

// max: 3 because each serverless function instance should hold few connections.
export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 3,
  ssl: { rejectUnauthorized: false }, // Supabase pooler requires SSL
});
