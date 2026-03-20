// pages/api/championships.js

import { query } from '../../lib/db';
import { setCacheHeaders } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const rows = await query(
      `SELECT id, title_name, date_established
       FROM championships
       WHERE show_in_ui = 1
       ORDER BY id ASC`
    );
    setCacheHeaders(res, 300);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in /api/championships:', err);
    res.status(500).json({ error: 'Database error' });
  }
}