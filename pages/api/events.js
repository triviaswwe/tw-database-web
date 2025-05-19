import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(99, parseInt(req.query.limit) || 99); // máximo 99
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM events');

    const [rows] = await pool.query(
      `SELECT id, name, event_type, DATE(event_date) as event_date
       FROM events
       ORDER BY event_date DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      events: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error loading events' });
  }
}
