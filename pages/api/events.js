import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 33);
    const offset = (page - 1) * limit;

    const eventType = req.query.event_type || '';
    const filter = req.query.filter || '';

    const whereClauses = [];
    const params = [];

    // Filtro por event_type
    if (eventType) {
      switch (eventType) {
        case 'weekly':
          whereClauses.push(`events.event_type = 'WEEKLY'`);
          break;
        case 'ple':
          whereClauses.push('(events.ple_id != 0 AND events.ple_id != 18)');
          break;
        case 'takeover':
          whereClauses.push('events.ple_id = 18');
          break;
        case 'special':
          whereClauses.push(`events.event_type = 'SPECIAL'`);
          break;
        default:
          whereClauses.push('events.event_type = ?');
          params.push(eventType.toUpperCase());
      }
    }

    // Filtro por nombre (case-insensitive)
    if (filter) {
      whereClauses.push(`LOWER(events.name) LIKE ?`);
      params.push(`%${filter.toLowerCase()}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total de eventos
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) as count FROM events LEFT JOIN shows ON events.show_id = shows.id ${whereSql}`,
      params
    );
    const totalCount = totalRows[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    // Eventos paginados
    const [rows] = await pool.query(
      `SELECT events.*, shows.name AS show_name
       FROM events
       LEFT JOIN shows ON events.show_id = shows.id
       ${whereSql}
       ORDER BY events.event_date DESC, events.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({
      events: rows,
      totalPages,
      totalCount,
    });
  } catch (error) {
    console.error('Error en /api/events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
