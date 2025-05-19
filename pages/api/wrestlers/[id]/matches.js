import pool from '../../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Missing wrestler id' });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        m.id,
        m.event_id,
        e.name AS event,
        e.event_date,
        m.match_order,
        mp.team_number,
        mp.result,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'wrestler_id', mp2.wrestler_id,
            'wrestler', w.wrestler,
            'team_number', mp2.team_number
          )
        ) AS participants,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'team_number', mts.team_number,
            'score', mts.score
          )
        ) AS scores
      FROM matches m
      JOIN events e ON m.event_id = e.id
      JOIN match_participants mp ON m.id = mp.match_id
      JOIN match_participants mp2 ON m.id = mp2.match_id
      JOIN wrestlers w ON mp2.wrestler_id = w.id
      LEFT JOIN match_team_scores mts ON m.id = mts.match_id
      WHERE mp.wrestler_id = ?
      GROUP BY m.id, mp.team_number, mp.result, m.match_order, m.event_id, e.name, e.event_date
      ORDER BY e.event_date DESC, m.match_order ASC
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'No matches found for wrestler' });
    }

    const matchesMap = new Map();

    for (const row of rows) {
      if (!matchesMap.has(row.id)) {
        matchesMap.set(row.id, {
          id: row.id,
          event_id: row.event_id,
          event: row.event,
          event_date: row.event_date,
          match_order: row.match_order,
          result: row.result, // resultado para el luchador consultado
          participants: row.participants,
          scores: row.scores,
          team_number: row.team_number,
        });
      } else {
        const match = matchesMap.get(row.id);
        match.participants = match.participants.concat(row.participants);
        match.scores = match.scores.concat(row.scores);
      }
    }

    const matches = Array.from(matchesMap.values());

    const stats = {
      total: matches.length,
      wins: matches.filter((m) => m.result === 'win').length,
      draws: matches.filter((m) => m.result === 'draw').length,
      losses: matches.filter((m) => m.result === 'loss').length,
      firstMatch: matches.length > 0 ? matches[matches.length - 1].event_date : null,
      lastMatch: matches.length > 0 ? matches[0].event_date : null,
    };

    res.status(200).json({ matches, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
}
