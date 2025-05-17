import pool from '../../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    // 1) Traemos la lista base de combates del luchador
    const [baseMatches] = await pool.query(
      `SELECT 
         m.id,
         m.event_id,
         e.name AS event,
         e.event_date,
         mp.result,
         mp.team_number
       FROM match_participants mp
       JOIN matches m        ON mp.match_id    = m.id
       JOIN events e         ON m.event_id     = e.id
       WHERE mp.wrestler_id = ?
       ORDER BY e.event_date DESC, m.match_order ASC`,
      [id]
    );

    // 2) Calculamos stats rápidamente
    const total  = baseMatches.length;
    const wins   = baseMatches.filter((m) => m.result === 'WIN').length;
    const losses = baseMatches.filter((m) => m.result === 'LOSS').length;
    const draws  = baseMatches.filter((m) => m.result === 'DRAW').length;
    const firstMatch = baseMatches[total - 1]?.event_date || null;
    const lastMatch  = baseMatches[0]?.event_date       || null;

    // 3) Para cada combate, obtenemos participantes y scores
    const matches = [];
    for (const base of baseMatches) {
      // 3a) Participantes
      const [participants] = await pool.query(
        `SELECT
           w.id         AS wrestler_id,
           w.wrestler,
           mp.team_number
         FROM match_participants mp
         JOIN wrestlers w ON mp.wrestler_id = w.id
         WHERE mp.match_id = ?`,
        [base.id]
      );

      // 3b) Scores
      const [scores] = await pool.query(
        `SELECT team_number, score
         FROM match_team_scores
         WHERE match_id = ?`,
        [base.id]
      );

      matches.push({
        ...base,
        participants,
        scores
      });
    }

    // 4) Enviamos stats y matches
    res.status(200).json({
      stats: { total, wins, losses, draws, firstMatch, lastMatch },
      matches
    });
  } catch (error) {
    console.error('Error cargando combates detallados:', error);
    res.status(500).json({ error: 'Error cargando combates del luchador' });
  }
}
