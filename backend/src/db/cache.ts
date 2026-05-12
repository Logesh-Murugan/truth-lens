import { Pool } from 'pg';
import crypto from 'crypto';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

export async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.warn('[DB] DATABASE_URL is not set. Caching will be disabled.');
    return false;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS claim_cache (
        id SERIAL PRIMARY KEY,
        sentence_hash TEXT UNIQUE NOT NULL,
        sentence_preview TEXT,
        result TEXT NOT NULL,
        reason TEXT NOT NULL,
        sources JSONB DEFAULT '[]',
        claim_type TEXT,
        checked_at TIMESTAMP DEFAULT NOW(),
        check_count INTEGER DEFAULT 1
      )
    `);
    console.log('[DB] Database initialized successfully.');
    return true;
  } catch (error) {
    console.warn('[DB] Failed to initialize database:', error);
    return false;
  }
}

export async function getCached(sentence: string) {
  if (!process.env.DATABASE_URL) return null;

  try {
    const hash = crypto.createHash('md5').update(sentence.trim().toLowerCase()).digest('hex');
    const result = await pool.query(
      'SELECT result, reason, sources, claim_type FROM claim_cache WHERE sentence_hash = $1',
      [hash]
    );

    if (result.rows.length > 0) {
      // Background async update for analytic count
      pool.query(
        'UPDATE claim_cache SET check_count = check_count + 1 WHERE sentence_hash = $1',
        [hash]
      ).catch(e => console.error('[DB] Failed to update check_count:', e));

      const row = result.rows[0];
      return {
        result: row.result,
        reason: row.reason,
        sources: row.sources || [],
        claimType: row.claim_type
      };
    }
  } catch (error) {
    console.error('[DB] getCached error:', error);
  }
  return null;
}

export async function setCached(
  sentence: string,
  result: string,
  reason: string,
  sources: any[],
  claimType: string
) {
  if (!process.env.DATABASE_URL) return;

  try {
    const trimmed = sentence.trim();
    const hash = crypto.createHash('md5').update(trimmed.toLowerCase()).digest('hex');
    const preview = trimmed.length > 100 ? trimmed.substring(0, 100) + '...' : trimmed;

    await pool.query(
      `INSERT INTO claim_cache 
       (sentence_hash, sentence_preview, result, reason, sources, claim_type) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (sentence_hash) DO NOTHING`,
      [hash, preview, result, reason, JSON.stringify(sources), claimType]
    );
  } catch (error) {
    console.error('[DB] setCached error:', error);
  }
}
