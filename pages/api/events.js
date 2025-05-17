import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    // Obtenemos la página desde query (página 1 por defecto)
    const page = parseInt(req.query.page) || 1;
    const limit = 99;
    const offset = (page - 1) * limit;

    // Consulta para obtener total de eventos
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM events');

    // Consulta para obtener los eventos paginados
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
    res.status(500).json({ error: 'Error cargando eventos' });
  }
}
