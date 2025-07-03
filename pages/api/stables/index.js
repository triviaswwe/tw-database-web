// pages/api/stables/index.js

import pool from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Incluimos image_url en el SELECT
    const [rows] = await pool.query(
      `SELECT id, name, status, image_url FROM tag_teams ORDER BY name`
    );

    const stables = rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      // Aseguramos que si no hay imagen devuelva null
      image_url: r.image_url || null,
    }));

    return res.status(200).json(stables);
  } catch (err) {
    console.error('Error in /api/stables:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
