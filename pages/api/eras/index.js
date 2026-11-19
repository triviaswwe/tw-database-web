// pages/api/eras/index.js

import pool, { setCacheHeaders, setNoStoreHeaders } from '../../../lib/db';
import { rejectNonGet } from '../../../lib/validation';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (rejectNonGet(req, res)) return;

  try {
    const [rows] = await pool.query(`
      SELECT id, name, start_date, end_date
      FROM eras
      ORDER BY start_date
    `);
    setCacheHeaders(res, 300);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error in /api/eras:', err);
    setNoStoreHeaders(res);
    return res.status(500).json({ error: 'Database error' });
  }
}
