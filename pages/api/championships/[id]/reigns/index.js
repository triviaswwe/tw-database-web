// pages/api/championships/[id]/reigns/index.js

import { query } from "../../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { id } = req.query;

  try {
    const rows = await query(
      `
      SELECT
        r.id,
        r.reign_number,
        r.won_date,
        r.lost_date,
        r.days_held,

        -- Datos de single
        r.wrestler_id,
        w.wrestler    AS wrestler,
        w.country     AS country,

        -- Datos de intérprete
        r.interpreter_id,
        i.interpreter AS interpreter,
        i.nationality AS nationality,

        -- Datos de pareja
        r.tag_team_id,
        t.name        AS team_name,

        -- Concatenamos los miembros del reinado de pareja
        GROUP_CONCAT(
          DISTINCT CONCAT(wrm.id, '|', wrm.wrestler, '|', wrm.country)
          ORDER BY wrm.wrestler
          SEPARATOR ','
        ) AS team_members_raw,

        -- Datos del evento
        r.event_id,
        e.name        AS event_name,

        -- Notas del match que inició el reinado
        m.notes       AS notes,

        -- Oponente inicial del reinado
        mp_opp.wrestler_id   AS opponent_id,
        w_opp.wrestler       AS opponent,
        w_opp.country        AS opponent_country

      FROM championship_reigns r

      -- Single joins
      LEFT JOIN wrestlers    w   ON w.id = r.wrestler_id
      LEFT JOIN interpreters i   ON i.id = r.interpreter_id
      LEFT JOIN events       e   ON e.id = r.event_id

      -- Primer match que cambió el título en ese evento
      LEFT JOIN (
        SELECT m1.*
        FROM matches m1
        JOIN (
          SELECT event_id, championship_id, MIN(id) AS min_id
          FROM matches
          WHERE title_changed = 1
          GROUP BY event_id, championship_id
        ) AS first_matches
          ON m1.id = first_matches.min_id
      ) AS m
        ON m.championship_id = r.championship_id
       AND m.event_id        = r.event_id

      -- Participación campeón y oponente
      LEFT JOIN match_participants mp_champ
        ON mp_champ.match_id    = m.id
       AND mp_champ.wrestler_id = r.wrestler_id

      LEFT JOIN match_participants mp_opp
        ON mp_opp.match_id      = m.id
       AND mp_opp.wrestler_id  <> r.wrestler_id

      LEFT JOIN wrestlers w_opp
        ON w_opp.id = mp_opp.wrestler_id

      -- Parejas
      LEFT JOIN tag_teams t
        ON t.id = r.tag_team_id

      -- Miembros de reinados de pareja
      LEFT JOIN reign_members rm
        ON rm.reign_id = r.id
      LEFT JOIN wrestlers wrm
        ON wrm.id = rm.wrestler_id

      WHERE r.championship_id = ?

      GROUP BY r.id
      ORDER BY r.won_date
      `,
      [id]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("Database error in /api/championships/[id]/reigns:", err);
    res.status(500).json({ error: "Database error" });
  }
}
