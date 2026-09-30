// pages/api/eras/index.js

import pool from '../../../lib/db';

export default async function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );

  if (req.method !== 'GET') {
    return res.status(405).end();
  }
  const [rows] = await pool.query(`
    SELECT id, name, start_date, end_date
    FROM eras
    ORDER BY start_date
  `);
  res.status(200).json(rows);
}
