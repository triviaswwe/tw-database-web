// pages/api/championships/[id]/matches/index.js

import { query, setCacheHeaders, setNoStoreHeaders } from '../../../../../lib/db';
import { parsePositiveInt, rejectNonGet } from '../../../../../lib/validation';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (rejectNonGet(req, res)) return;

  const id = parsePositiveInt(req.query.id); // championship ID
  if (id === null) {
    setNoStoreHeaders(res);
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const rows = await query(
      `SELECT
         m.id,
         m.match_order,
         mt.name       AS match_type,
         e.id          AS event_id,
         e.name        AS event_name,
         m.title_changed
       FROM matches m
       JOIN match_types mt ON mt.id = m.match_type_id
       JOIN events e ON e.id = m.event_id
       WHERE m.championship_id = ?
         AND m.title_match = 1
       ORDER BY e.event_date, m.match_order`,
      [id]
    );

    setCacheHeaders(res, 60);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error in /api/championships/[id]/matches:', err);
    setNoStoreHeaders(res);
    return res.status(500).json({ error: 'Database error' });
  }
}
