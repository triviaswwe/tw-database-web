// pages/api/championships/[id]/defenses.js

import pool from "../../../../lib/db";

export default async function handler(req, res) {
  const {
    query: { id: championshipId },
    method,
  } = req;

  if (method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1) Obtenemos todos los reinados de este campeonato
    const [reignsRows] = await pool.query(
      `
      SELECT
        cr.id AS reign_id,
        cr.wrestler_id,
        cr.won_date,
        cr.lost_date
      FROM championship_reigns cr
      WHERE cr.championship_id = ?
      `,
      [championshipId]
    );

    if (reignsRows.length === 0) {
      // Sin reinados, devolvemos arrays vacíos
      return res.status(200).json({ summary: [], details: [] });
    }

    // 2) Contamos defensas exitosas por reinado (para el summary)
    const [countsRows] = await pool.query(
      `
      SELECT
        cr.id AS reign_id,
        COUNT(*) AS count
      FROM championship_reigns cr
      JOIN matches m
        ON m.title_match     = 1
       AND m.title_changed   = 0
       AND m.championship_id = cr.championship_id
       AND m.event_id IS NOT NULL
      JOIN events e
        ON m.event_id   = e.id
       AND e.event_date >= cr.won_date
       AND (
             cr.lost_date IS NULL
          OR e.event_date < cr.lost_date
           )
      JOIN match_participants mp
        ON mp.match_id     = m.id
       AND mp.wrestler_id  = cr.wrestler_id
      WHERE cr.championship_id = ?
      GROUP BY cr.id
      `,
      [championshipId]
    );

    // 3) Detalles de cada defensa (para el details)
    const [detailRows] = await pool.query(
      `
      SELECT
        cr.id                   AS reign_id,
        mp_opp.wrestler_id      AS opponent_id,
        w_opp.wrestler          AS opponent,
        w_opp.country           AS opponent_country,
        e.event_date,
        e.id                    AS event_id,
        e.name                  AS event_name,
        mts_champ.score         AS champion_score,
        mts_opp.score           AS opponent_score
      FROM championship_reigns cr
      JOIN matches m
        ON m.title_match       = 1
       AND m.title_changed     = 0
       AND m.championship_id   = cr.championship_id
      JOIN events e
        ON m.event_id   = e.id
       AND e.event_date >= cr.won_date
       AND (
             cr.lost_date IS NULL
          OR e.event_date < cr.lost_date
           )
      JOIN match_participants mp_champ
        ON mp_champ.match_id    = m.id
       AND mp_champ.wrestler_id = cr.wrestler_id
      JOIN match_participants mp_opp
        ON mp_opp.match_id      = m.id
       AND mp_opp.wrestler_id  <> cr.wrestler_id
      JOIN wrestlers w_opp
        ON w_opp.id = mp_opp.wrestler_id
      JOIN match_team_scores mts_champ
        ON mts_champ.match_id   = m.id
       AND mts_champ.team_number = mp_champ.team_number
      JOIN match_team_scores mts_opp
        ON mts_opp.match_id     = m.id
       AND mts_opp.team_number   = mp_opp.team_number
      WHERE cr.championship_id = ?
      ORDER BY e.event_date
      `,
      [championshipId]
    );

    // 4) Construimos el summary: un array { reign_id, count }
    const summary = reignsRows.map((r) => {
      const found = countsRows.find((c) => c.reign_id === r.reign_id);
      return {
        reign_id: r.reign_id,
        count: found ? found.count : 0,
      };
    });

    // 5) Construimos el details: array con orden y score
    const details = detailRows.map((r, idx) => ({
      order: idx + 1,
      reign_id: r.reign_id,
      score: `${r.champion_score}-${r.opponent_score}`,
      opponent_id: r.opponent_id,
      opponent: r.opponent,
      opponent_country: r.opponent_country,
      event_date: r.event_date,
      event_id: r.event_id,
      event_name: r.event_name,
    }));

    // 6) Devolvemos ambos en un solo payload
    return res.status(200).json({ summary, details });
  } catch (err) {
    console.error("Database error in /api/championships/[id]/defenses:", err);
    return res.status(500).json({ error: "Database error" });
  }
}
