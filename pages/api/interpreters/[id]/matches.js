// pages/api/interpreters/[id]/matches.js

import pool from '../../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid interpreter id' });
  }

  try {
    // 1) Obtenemos la lista de combates donde este interpreter participó
    const [baseMatches] = await pool.query(
      `SELECT
         m.id,
         m.event_id,
         e.name    AS event,
         e.event_date,
         m.match_order,
         mt.name   AS match_type
       FROM match_participants mp
       JOIN matches m            ON mp.match_id      = m.id
       JOIN events e             ON m.event_id       = e.id
       LEFT JOIN match_types mt  ON m.match_type_id  = mt.id
       WHERE mp.interpreter_id = ?
       GROUP BY m.id, e.name, e.event_date, m.match_order, mt.name
       ORDER BY e.event_date DESC, m.match_order ASC`,
      [id]
    );

    // 2) Para cada combate, traemos puntuaciones y participantes
    for (const match of baseMatches) {
      // 2a) Scores
      const [scores] = await pool.query(
        `SELECT team_number, score
         FROM match_team_scores
         WHERE match_id = ?
         ORDER BY team_number ASC`,
        [match.id]
      );
      const scoresMap = {};
      scores.forEach((s) => {
        scoresMap[s.team_number] = s.score;
      });

      // 2b) Participantes
      const [participants] = await pool.query(
        `SELECT
           w.id         AS wrestler_id,
           w.wrestler,
           mp.team_number,
           mp.result,
           i.interpreter,
           i.id         AS interpreter_id
         FROM match_participants mp
         JOIN wrestlers w      ON mp.wrestler_id    = w.id
         LEFT JOIN interpreters i ON mp.interpreter_id = i.id
         WHERE mp.match_id = ?
         ORDER BY mp.team_number ASC, w.wrestler ASC`,
        [match.id]
      );

      // incorporamos score a cada participante
      match.scores = scores;
      match.wrestlers = participants.map((p) => ({
        ...p,
        score: scoresMap[p.team_number] ?? null,
      }));

      // ya no usamos match.participants
      delete match.participants;
    }

    // 3) devolvemos array de combates
    res.status(200).json(baseMatches);
  } catch (error) {
    console.error('Error in API interpreters matches:', error);
    res.status(500).json({ error: 'Error loading interpreter matches' });
  }
}
