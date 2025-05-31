// pages/api/championships.js

import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();  
  const rows = await query(`
    SELECT id, title_name, date_established
    FROM championships
    ORDER BY date_established
  `);
  res.status(200).json(rows);
}
