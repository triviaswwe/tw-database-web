// pages/api/championships/[id]/matches/participants.js

import pool from '../../../../../lib/db';
import { wrestlerNameSql } from '../../../../../lib/matchUtils';

export default async function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );

  const {
    query: { id },
  } = req;

  try {
    const [rows] = await pool.query(`
      SELECT
        mp.match_id,
        mp.wrestler_id,
        ${wrestlerNameSql("w.id", "e.event_date", "w.wrestler")} AS wrestler
      FROM match_participants mp
      JOIN matches m ON mp.match_id = m.id JOIN events e ON m.event_id = e.id JOIN wrestlers w ON mp.wrestler_id = w.id
      WHERE mp.match_id = ?
    `, [id]);

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener los participantes:', error);
    res.status(500).json({ error: 'Database error' });
  }
}
