import pool from '../../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ message: 'Missing or invalid wrestler id' });
  }

  try {
    // Consulta optimizada: agregamos participantes y scores por partido sin duplicar filas
    const [rows] = await pool.query(
      `
      SELECT
        m.id,
        m.event_id,
        e.name AS event,
        e.event_date,
        m.match_order,
        mp.result,
        mp.team_number,
        -- Agrego participantes del match como JSON array
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'wrestler_id', mp2.wrestler_id,
              'wrestler', w.wrestler,
              'team_number', mp2.team_number
            )
          )
          FROM match_participants mp2
          JOIN wrestlers w ON mp2.wrestler_id = w.id
          WHERE mp2.match_id = m.id
        ) AS participants,
        -- Agrego scores del match como JSON array
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'team_number', mts.team_number,
              'score', mts.score
            )
          )
          FROM match_team_scores mts
          WHERE mts.match_id = m.id
        ) AS scores
      FROM matches m
      JOIN events e ON m.event_id = e.id
      JOIN match_participants mp ON m.id = mp.match_id
      WHERE mp.wrestler_id = ?
      ORDER BY e.event_date DESC, m.match_order ASC
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'No matches found for wrestler' });
    }

    // Convertir los JSON strings a objetos JS
    const matches = rows.map(row => ({
      id: row.id,
      event_id: row.event_id,
      event: row.event,
      event_date: row.event_date,
      match_order: row.match_order,
      result: row.result,
      team_number: row.team_number,
      participants: row.participants ? JSON.parse(row.participants) : [],
      scores: row.scores ? JSON.parse(row.scores) : [],
    }));

    const stats = {
      total: matches.length,
      wins: matches.filter(m => m.result === 'win').length,
      draws: matches.filter(m => m.result === 'draw').length,
      losses: matches.filter(m => m.result === 'loss').length,
      firstMatch: matches.length > 0 ? matches[matches.length - 1].event_date : null,
      lastMatch: matches.length > 0 ? matches[0].event_date : null,
    };

    res.status(200).json({ matches, stats });
  } catch (error) {
    console.error('Error en API matches por luchador:', error);
    res.status(500).json({ message: 'Error cargando los combates', error: error.message });
  }
}
