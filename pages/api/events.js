import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const page      = Math.max(1, parseInt(req.query.page)   || 1);
    const limit     = Math.min(100, parseInt(req.query.limit) || 33);
    const offset    = (page - 1) * limit;
    const eventType = req.query.event_type || '';
    const filter    = req.query.filter     || '';
    const dateFilt  = req.query.date       || '';

    const where  = [];
    const params = [];

    // 1) Filtro por tipo de evento
    if (eventType) {
      switch (eventType) {
        case 'weekly':
          where.push(`events.event_type = 'WEEKLY'`);
          break;
        case 'ple':
          where.push(`events.ple_id != 0 AND events.ple_id != 18`);
          break;
        case 'takeover':
          where.push(`events.ple_id = 18`);
          break;
        case 'special':
          where.push(`events.event_type = 'SPECIAL'`);
          break;
        default:
          where.push(`events.event_type = ?`);
          params.push(eventType.toUpperCase());
      }
    }

    // 2) Filtro por nombre (case-insensitive)
    if (filter) {
      where.push(`LOWER(events.name) LIKE ?`);
      params.push(`%${filter.toLowerCase()}%`);
    }

    // 3) Filtro por fecha: pasado vs futuro
    if (dateFilt === 'past') {
      where.push(`events.event_date <= CURDATE()`);
    } else if (dateFilt === 'upcoming') {
      where.push(`events.event_date > CURDATE()`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 4) Contar total
    const [cnt] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM events
       LEFT JOIN shows ON events.show_id = shows.id
       ${whereSql}`,
      params
    );
    const totalCount = cnt[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    // 5) Elegir ORDER BY dinámico
    //    - upcoming  : ascendente (próximo primero)
    //    - past/all  : descendente (más reciente primero)
    let orderClause;
    if (dateFilt === 'upcoming') {
      orderClause = `ORDER BY events.event_date ASC, events.id ASC`;
    } else {
      orderClause = `ORDER BY events.event_date DESC, events.id DESC`;
    }

    // 6) Obtener página de resultados
    const [rows] = await pool.query(
      `SELECT events.*, shows.name AS show_name
       FROM events
       LEFT JOIN shows ON events.show_id = shows.id
       ${whereSql}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({ events: rows, totalPages, totalCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
