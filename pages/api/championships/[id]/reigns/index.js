// pages/api/championships/[id]/reigns/index.js

import { query } from "../../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { id } = req.query;

  const rows = await query(
    `
    SELECT
      r.id,
      r.reign_number,
      r.won_date,
      r.lost_date,
      r.days_held,
      r.wrestler_id,
      w.wrestler    AS wrestler,
      w.country     AS country,
      r.interpreter_id,
      i.interpreter AS interpreter,
      i.nationality AS nationality,
      r.tag_team_id,
      r.event_id,
      e.name        AS event_name,
      -- Aquí traemos notes desde el match que inició el reinado:
      m.notes       AS notes
    FROM championship_reigns r
    LEFT JOIN wrestlers    w ON w.id = r.wrestler_id
    LEFT JOIN interpreters i ON i.id = r.interpreter_id
    LEFT JOIN events       e ON e.id = r.event_id

    -- Hacemos LEFT JOIN con matches para capturar la nota del combate
    LEFT JOIN matches      m
      ON m.championship_id = r.championship_id
     AND m.event_id       = r.event_id
     AND m.title_changed  = 1

    WHERE r.championship_id = ?
    ORDER BY r.won_date
    `,
    [id]
  );

  res.status(200).json(rows);
}
