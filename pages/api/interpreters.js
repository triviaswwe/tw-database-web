// pages/api/interpreters.js

import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const page       = Math.max(1, parseInt(req.query.page)  || 1);
    const limit      = Math.min(33, parseInt(req.query.limit)|| 33);
    const offset     = (page - 1) * limit;
    const filter     = (req.query.filter || '').trim().toLowerCase();
    const statusFilt = (req.query.status || '').toLowerCase();

    const where  = [];
    const params = [];

    // filtro por status, asume columna `status` en tabla `interpreters`
    if (statusFilt) {
      where.push(`status = ?`);
      params.push(statusFilt.toUpperCase());
    }

    // filtro por nombre
    if (filter) {
      where.push('LOWER(interpreter) LIKE ?');
      params.push(`%${filter}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // total
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM interpreters
       ${whereSql}`,
      params
    );

    // página de datos
    const [rows] = await pool.query(
      `SELECT id, interpreter, nationality, instagram, status
       FROM interpreters
       ${whereSql}
       ORDER BY interpreter ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      interpreters: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
