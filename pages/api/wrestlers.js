// pages/api/wrestlers.js

import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(33, parseInt(req.query.limit)|| 33);
    const offset = (page - 1) * limit;

    const brand = req.query.brand || ''; // valor exacto: 'RAW' | 'SmackDown' | 'NXT' | 'Alumni'
    const group = req.query.group || ''; // 'active' | 'inactive'
    const filter = req.query.filter || '';

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
      where.push('LOWER(w.wrestler) LIKE ?');
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