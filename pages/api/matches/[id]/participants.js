// pages/api/matches/[id]/participants.js

import pool from '../../../../lib/db';

export default async function handler(req, res) {
  const {
    query: { id },
  } = req;

  try {
    const [rows] = await pool.query(`
      SELECT
        mp.match_id,
        mp.wrestler_id,
        w.wrestler
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      WHERE mp.match_id = ?
    `, [id]);

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener los participantes:', error);
    res.status(500).json({ error: 'Database error' });
  }
}
