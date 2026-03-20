// pages/api/stables/index.js

import pool from '../../../lib/db';
import { setCacheHeaders } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 33);
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const filter = req.query.filter || '';

    const where  = [];
    const params = [];

    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (filter) {
      where.push('LOWER(name) LIKE ?');
      params.push(`%${filter.toLowerCase()}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [
      [[{ total }]],
      [rows],
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM tag_teams ${whereSql}`, params),
      pool.query(
        `SELECT id, name, status, image_url FROM tag_teams ${whereSql} ORDER BY name LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
    ]);

    const stables = rows.map((r) => ({
      id:        r.id,
      name:      r.name,
      status:    r.status,
      image_url: r.image_url || null,
    }));

    setCacheHeaders(res, 60);
    return res.status(200).json({ stables, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error in /api/stables:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}