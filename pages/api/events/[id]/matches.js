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
       ORDER BY m.match_order ASC`,
      [id]
    );

    if (matches.length === 0) {
      return res.status(200).json([]);
    }

    const matchIds = matches.map(m => m.id);

    const placeholders = matchIds.map(() => '?').join(',');

    const [scores] = await pool.query(
      `SELECT match_id, team_number, score
       FROM match_team_scores
       WHERE match_id IN (${placeholders})
       ORDER BY match_id, team_number ASC`,
      matchIds
    );

    const [participants] = await pool.query(
      `SELECT
         mp.match_id,
         w.id AS wrestler_id,  
         w.wrestler,
         i.interpreter,
         mp.result,
         mp.team_number
       FROM match_participants mp
       JOIN wrestlers w ON mp.wrestler_id = w.id
       LEFT JOIN interpreters i ON mp.interpreter_id = i.id
       WHERE mp.match_id IN (${placeholders})
       ORDER BY mp.match_id, mp.team_number ASC`,
      matchIds
    );

    const scoresByMatch = {};
    for (const score of scores) {
      if (!scoresByMatch[score.match_id]) scoresByMatch[score.match_id] = {};
      scoresByMatch[score.match_id][score.team_number] = score.score;
    }

    const participantsByMatch = {};
    for (const p of participants) {
      if (!participantsByMatch[p.match_id]) participantsByMatch[p.match_id] = [];
      participantsByMatch[p.match_id].push({
        wrestler_id: p.wrestler_id,
        wrestler: p.wrestler,
        interpreter: p.interpreter,
        result: p.result,
        team_number: p.team_number,
        score: scoresByMatch[p.match_id]?.[p.team_number] ?? null,
      });
    }

    for (const match of matches) {
      match.participants = participantsByMatch[match.id] || [];
      match.scores = scoresByMatch[match.id]
        ? Object.entries(scoresByMatch[match.id]).map(([team_number, score]) => ({
            team_number: parseInt(team_number),
            score,
          }))
        : [];
    }

    res.status(200).json(matches);

  } catch (error) {
    console.error('Error en API matches:', error);
    res.status(500).json({ error: 'Error cargando combates' });
  }
}
