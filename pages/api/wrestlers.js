// pages/api/wrestlers.js

import pool, { setCacheHeaders, setNoStoreHeaders } from '../../lib/db';
import { wrestlerSearchSql } from '../../lib/matchUtils';
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

    const brand = firstString(req.query.brand, 32); // valor exacto: 'RAW' | 'SmackDown' | 'NXT' | 'Alumni'
    const group = firstString(req.query.group, 16); // 'active' | 'inactive'
    const filter = sanitizeSearchTerm(req.query.filter, 80);

    const where = [];
    const params = [];

    if (group === 'active') {
      where.push("w.brand IN ('RAW', 'SmackDown', 'NXT')");
    } else if (group === 'inactive') {
      where.push("w.brand = 'Alumni'");
    } else if (brand) {
      where.push('w.brand = ?');
      params.push(brand);
    }

    if (filter) {
      where.push(wrestlerSearchSql("w.id", "w.wrestler"));
      params.push(`%${filter.toLowerCase()}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM wrestlers w
       ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT 
         w.id, 
         w.wrestler, 
         w.brand, 
         w.country, 
         w.image_url
       FROM wrestlers w
       ${whereSql}
       ORDER BY w.wrestler ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    setCacheHeaders(res, 60);
    return res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      wrestlers: rows,
    });
  } catch (err) {
    console.error(err);
    setNoStoreHeaders(res);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
