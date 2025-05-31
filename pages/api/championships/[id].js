// pages/api/championships/[id].js

import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { id } = req.query;
  const [row] = await query(
    `SELECT id, title_name, date_established
     FROM championships
     WHERE id = ?`,
    [id]
  );
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.status(200).json(row);
}
