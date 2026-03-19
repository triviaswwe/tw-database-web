// pages/api/wrestlers/[id]/matches.js
// OPTIMIZADO: Elimina N+1 queries → una sola query consolidada con JOINs + paginación

import pool from '../../../../lib/db';

export default async function handler(req, res) {
  const { id, page: pageParam, limit: limitParam } = req.query;
  const wrestlerId = parseInt(id, 10);

  if (isNaN(wrestlerId)) {
    return res.status(400).json({ error: 'Invalid wrestler ID' });
  }

  const page   = Math.max(1, parseInt(pageParam)  || 1);
  const limit  = Math.min(50, parseInt(limitParam) || 20);
  const offset = (page - 1) * limit;

  try {
    // ─── Consultas paralelas: stats + total count ────────────────────────────
    const [
      [[statsRow]],
      [[{ total }]],
    ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)                                                   AS total,
           SUM(CASE WHEN mp.result = 'WIN'  THEN 1 ELSE 0 END)       AS wins,
           SUM(CASE WHEN mp.result = 'DRAW' THEN 1 ELSE 0 END)       AS draws,
           SUM(CASE WHEN mp.result = 'LOSS' THEN 1 ELSE 0 END)       AS losses,
           MIN(e.event_date)                                          AS firstMatch,
           MAX(e.event_date)                                          AS lastMatch
         FROM match_participants mp
         JOIN matches m ON mp.match_id = m.id
         JOIN events  e ON m.event_id  = e.id
         WHERE mp.wrestler_id = ?`,
        [wrestlerId]
      ),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM match_participants mp
         JOIN matches m ON mp.match_id = m.id
         WHERE mp.wrestler_id = ?`,
        [wrestlerId]
      ),
    ]);

    // ─── Query consolidada: reemplaza el bucle N+1 ──────────────────────────
    //   Antes: 1 query base + 2 queries por cada match (participantes + scores)
    //   Ahora: 1 sola query con JSON_ARRAYAGG + paginación con LIMIT/OFFSET
    const [rawMatches] = await pool.query(
      `SELECT
         m.id,
         m.event_id,
         e.name          AS event,
         e.event_date,
         m.match_order,
         mp.team_number,
         mp.result,
         mt.id           AS match_type_id,
         mt.name         AS match_type_name,
         c.id            AS championship_id,
         c.title_name    AS championship_name,
         (
           SELECT JSON_ARRAYAGG(JSON_OBJECT(
             'wrestler_id', mp2.wrestler_id,
             'wrestler',    w2.wrestler,
             'team_number', mp2.team_number,
             'result',      mp2.result
           ))
           FROM match_participants mp2
           JOIN wrestlers w2 ON mp2.wrestler_id = w2.id
           WHERE mp2.match_id = m.id
         ) AS participants,
         (
           SELECT JSON_ARRAYAGG(JSON_OBJECT(
             'team_number', mts.team_number,
             'score',       mts.score
           ))
           FROM match_team_scores mts
           WHERE mts.match_id = m.id
         ) AS scores
       FROM match_participants mp
       JOIN matches m ON mp.match_id  = m.id
       JOIN events  e ON m.event_id   = e.id
       LEFT JOIN match_types mt    ON m.match_type_id    = mt.id
       LEFT JOIN championships c   ON m.championship_id  = c.id
       WHERE mp.wrestler_id = ?
       GROUP BY
         m.id, mp.team_number, mp.result, m.match_order,
         m.event_id, e.name, e.event_date,
         mt.id, mt.name, c.id, c.title_name
       ORDER BY e.event_date DESC, m.match_order DESC
       LIMIT ? OFFSET ?`,
      [wrestlerId, limit, offset]
    );

    const matches = rawMatches.map((row) => ({
      id:               row.id,
      event_id:         row.event_id,
      event:            row.event,
      event_date:       row.event_date,
      match_order:      row.match_order,
      team_number:      row.team_number,
      result:           row.result,
      match_type_id:    row.match_type_id,
      match_type_name:  row.match_type_name,
      championship_id:  row.championship_id,
      championship_name:row.championship_name,
      participants:     row.participants || [],
      scores:           row.scores       || [],
    }));

    res.status(200).json({
      stats: {
        total:      statsRow?.total      || 0,
        wins:       statsRow?.wins       || 0,
        draws:      statsRow?.draws      || 0,
        losses:     statsRow?.losses     || 0,
        firstMatch: statsRow?.firstMatch || null,
        lastMatch:  statsRow?.lastMatch  || null,
      },
      pagination: {
        page,
        limit,
        total:      total,
        totalPages: Math.ceil(total / limit),
      },
      matches,
    });
  } catch (error) {
    console.error('Error loading matches:', error);
    res.status(500).json({ error: 'Error loading matches' });
  }
}
