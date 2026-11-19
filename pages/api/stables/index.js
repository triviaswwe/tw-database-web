// pages/api/stables/index.js

import pool, { setCacheHeaders, setNoStoreHeaders } from '../../../lib/db';
import {
  firstString,
  parsePagination,
  rejectNonGet,
  sanitizeSearchTerm,
} from '../../../lib/validation';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (rejectNonGet(req, res)) return;

  try {
    const { page, limit, offset } = parsePagination(req.query, {
      defaultLimit: 33,
      maxLimit: 100,
    });
    const status = firstString(req.query.status, 32).trim();
    const filter = sanitizeSearchTerm(req.query.filter, 80);

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
    setNoStoreHeaders(res);
    return res.status(500).json({ error: 'Database error' });
  }
}
