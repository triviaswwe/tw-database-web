import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10; // sugerencia: usar 10 para paginación más manejable
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
      events: rows,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error loading events' });
  }
}
