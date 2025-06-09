// pages/api/wrestlers.js

import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(33, parseInt(req.query.limit)|| 33);
    const offset = (page - 1) * limit;

    const status = req.query.status || '';
    const filter = req.query.filter || '';

    // construir WHERE dinámico
    const where = [];
    const params = [];

    if (status) {
      where.push('w.status = ?');
      params.push(status.charAt(0).toUpperCase() + status.slice(1));
    }

    if (filter) {
      where.push('LOWER(w.wrestler) LIKE ?');
      params.push(`%${filter.toLowerCase()}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // total de registros
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM wrestlers w
       ${whereSql}`,
      params
    );

    // datos paginados (ahora incluyendo country e image_url)
    const [rows] = await pool.query(
      `SELECT 
         w.id, 
         w.wrestler, 
         w.status, 
         w.country, 
         w.image_url
       FROM wrestlers w
       ${whereSql}
       ORDER BY w.wrestler ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      wrestlers: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
