// pages/api/championships/[id]/matches/index.js

import { query } from '../../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const { id } = req.query; // championship ID

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

  res.status(200).json(rows);
}
