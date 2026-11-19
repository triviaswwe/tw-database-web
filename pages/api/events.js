// pages/api/events.js

import pool, { setCacheHeaders, setNoStoreHeaders } from '../../lib/db';
import {
  firstString,
  parsePagination,
  parsePositiveInt,
  rejectNonGet,
  sanitizeSearchTerm,
} from '../../lib/validation';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (rejectNonGet(req, res)) return;

  try {
    if (firstString(req.query.calendar, 10) === '1') {
      const [[bounds]] = await pool.query(
        `SELECT
           MIN(YEAR(event_date))  AS minYear,
           MAX(YEAR(event_date))  AS maxYear,
           YEAR(CURDATE())        AS curYear,
           MONTH(CURDATE())       AS curMonth,
           YEAR(MAX(event_date))  AS latestYear,
           MONTH(MAX(event_date)) AS latestMonth
         FROM events`
      );

      const minYear = bounds?.minYear || new Date().getUTCFullYear();
      const maxYear = bounds?.maxYear || new Date().getUTCFullYear();

      let year = parsePositiveInt(req.query.year);
      let month = parsePositiveInt(req.query.month);

      if (
        year === null ||
        month === null ||
        month < 1 ||
        month > 12 ||
        year < minYear ||
        year > maxYear
      ) {
        const curY = bounds?.curYear || new Date().getUTCFullYear();
        const curM = bounds?.curMonth || new Date().getUTCMonth() + 1;
        if (
          bounds?.latestYear &&
          (curY > bounds.latestYear ||
            (curY === bounds.latestYear && curM > bounds.latestMonth))
        ) {
          year = bounds.latestYear;
          month = bounds.latestMonth;
        } else {
          year = curY;
          month = curM;
        }
      }

      const [rows] = await pool.query(
        `SELECT
           events.*,
           events.image_url AS event_image_url,
           shows.name       AS show_name,
           ples.image_url   AS ple_image_url
         FROM events
         LEFT JOIN shows ON events.show_id = shows.id
         LEFT JOIN ples  ON events.ple_id  = ples.id
         WHERE YEAR(events.event_date) = ? AND MONTH(events.event_date) = ?
         ORDER BY events.event_date ASC, events.id ASC`,
        [year, month]
      );

      setCacheHeaders(res, 60);
      return res.status(200).json({ events: rows, year, month, minYear, maxYear });
    }

    const { page, limit, offset } = parsePagination(req.query, {
      defaultLimit: 33,
      maxLimit: 100,
    });
    const eventType = firstString(req.query.event_type, 32);
    const filter    = sanitizeSearchTerm(req.query.filter, 80);
    const dateFilt  = firstString(req.query.date, 16);

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
       LEFT JOIN ples  ON events.ple_id   = ples.id
       ${whereSql}`,
      params
    );
    const totalCount = cnt[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    // 5) Elegir ORDER BY dinámico
    let orderClause;
    if (dateFilt === 'upcoming') {
      orderClause = `ORDER BY events.event_date ASC,  events.id ASC`;
    } else {
      orderClause = `ORDER BY events.event_date DESC, events.id DESC`;
    }

    // 6) Obtener página de resultados, incluyendo ple.image_url y event.image_url
    const [rows] = await pool.query(
      `SELECT
         events.*,
         events.image_url     AS event_image_url,
         shows.name           AS show_name,
         ples.image_url       AS ple_image_url
       FROM events
       LEFT JOIN shows ON events.show_id = shows.id
       LEFT JOIN ples  ON events.ple_id   = ples.id
       ${whereSql}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    setCacheHeaders(res, 60);
    return res.status(200).json({ events: rows, totalPages, totalCount });
  } catch (err) {
    console.error(err);
    setNoStoreHeaders(res);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
