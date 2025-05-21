// pages/api/events/[id]/matches.js

import pool from '../../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const [matches] = await pool.query(
      `SELECT 
         m.id,
         m.match_order,
         mt.name AS match_type
       FROM matches m
       LEFT JOIN match_types mt ON m.match_type_id = mt.id
       WHERE m.event_id = ?
       ORDER BY m.match_order DESC`,
      [id]
    );

    for (const match of matches) {
      const [scores] = await pool.query(
        `SELECT team_number, score
         FROM match_team_scores
         WHERE match_id = ?
         ORDER BY team_number ASC`,
        [match.id]
      );

      const scoresMap = {};
      for (const score of scores) {
        scoresMap[score.team_number] = score.score;
      }

      const [participants] = await pool.query(
        `SELECT
           w.id AS wrestler_id,  
           w.wrestler,
           i.interpreter,
           mp.result,
           mp.team_number
         FROM match_participants mp
         JOIN wrestlers w ON mp.wrestler_id = w.id
         LEFT JOIN interpreters i ON mp.interpreter_id = i.id
         WHERE mp.match_id = ?
         ORDER BY mp.team_number ASC`,
        [match.id]
      );

      match.participants = participants.map((p) => ({
        ...p,
        score: scoresMap[p.team_number] ?? null
      }));

      match.scores = scores;
    }

    res.status(200).json(matches);
  } catch (error) {
    console.error('Error in API matches:', error);
    res.status(500).json({ error: 'Error loading matches' });
  }
}