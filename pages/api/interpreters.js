// pages/api/interpreters.js

import pool, { setCacheHeaders, setNoStoreHeaders } from '../../lib/db';
import {
  firstString,
  parsePagination,
  rejectNonGet,
  sanitizeSearchTerm,
} from '../../lib/validation';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (rejectNonGet(req, res)) return;

  try {
    const { page, limit, offset } = parsePagination(req.query, {
      defaultLimit: 33,
      maxLimit: 33,
    });
    const filter     = sanitizeSearchTerm(req.query.filter, 80).toLowerCase();
    const statusFilt = firstString(req.query.status, 32).trim().toLowerCase();

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
      `SELECT id, interpreter, nationality, status
       FROM interpreters
       ${whereSql}
       ORDER BY interpreter ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    setCacheHeaders(res, 60);
    return res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      interpreters: rows,
    });
  } catch (err) {
    console.error(err);
    setNoStoreHeaders(res);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
