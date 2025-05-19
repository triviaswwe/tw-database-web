import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(33, parseInt(req.query.limit) || 33);
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM wrestlers');

    const [rows] = await pool.query(
      `SELECT id, wrestler
       FROM wrestlers
       ORDER BY wrestler ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      wrestlers: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error loading wrestlers' });
  }
}
