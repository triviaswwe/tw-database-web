// pages/api/championships/[id]/reigns/index.js
import pool from '../../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  const { id: championshipId } = req.query;

  try {
    const [rows] = await pool.query(
      `
      SELECT
        r.id,
        r.reign_number,
        r.won_date,
        r.lost_date,
        r.days_held,

        /* ---------- datos singles ---------- */
        r.wrestler_id,
        w.wrestler              AS wrestler,
        w.country               AS country,

        /* ---------- intérprete ---------- */
        r.interpreter_id,
        i.interpreter           AS interpreter,
        i.nationality           AS nationality,

        /* ---------- tag‑team campeón ---------- */
        r.tag_team_id,
        t.name                  AS team_name,
        /* añadimos el nº de reinado individual al final (campo 4) */
        GROUP_CONCAT(
          DISTINCT CONCAT(
            wrm.id, '|', wrm.wrestler, '|', wrm.country, '|',
            (
              /* cuántos reinados tenía ESTE luchador hasta este reinado (incluido) */
              SELECT COUNT(*)
              FROM reign_members rm3
              JOIN championship_reigns r3 ON r3.id = rm3.reign_id
              WHERE rm3.wrestler_id      = wrm.id
                AND r3.championship_id   = r.championship_id
                AND r3.won_date         <= r.won_date
            )
          )
          ORDER BY wrm.wrestler
          SEPARATOR ','
        )                       AS team_members_raw,

        /* ---------- miembros individuales (id|name|country|start|end) ---------- */
        GROUP_CONCAT(
               DISTINCT CONCAT(
                rm_ind.wrestler_id,'|', wi.wrestler,'|', wi.country,'|',
                DATE_FORMAT(rm_ind.start_date,'%Y-%m-%d'),'|',
                IFNULL(DATE_FORMAT(rm_ind.end_date,'%Y-%m-%d'),'')
                )
              ORDER BY wi.wrestler
              SEPARATOR ','
                )     AS individual_members_raw,

        /* ---------- rival tag‑team (NULL para singles) ---------- */
        mp_opp.tag_team_id      AS opponent_tag_team_id,
        ot.name                 AS opponent_team_name,
        GROUP_CONCAT(
          DISTINCT CONCAT(
            opp_part.wrestler_id, '|', wot.wrestler, '|', wot.country
          )
          ORDER BY wot.wrestler
          SEPARATOR ','
        )                       AS opponent_team_members_raw,

        /* ---------- rival single (NULL para tag‑team) ---------- */
        CASE WHEN r.tag_team_id IS NULL THEN MIN(mp_opp.wrestler_id) END AS opponent_id,
        CASE WHEN r.tag_team_id IS NULL THEN MIN(w_opp.wrestler)     END AS opponent,
        CASE WHEN r.tag_team_id IS NULL THEN MIN(w_opp.country)      END AS opponent_country,

        /* ---------- evento / notas ---------- */
        r.event_id,
        e.name                  AS event_name,
        m.notes                 AS notes

      FROM championship_reigns r

      /* tablas básicas */
      LEFT JOIN wrestlers    w  ON w.id = r.wrestler_id
      LEFT JOIN interpreters i  ON i.id = r.interpreter_id
      LEFT JOIN events       e  ON e.id = r.event_id

      /* tag‑team campeón */
      LEFT JOIN tag_teams         t   ON t.id = r.tag_team_id
      LEFT JOIN reign_members     rm  ON rm.reign_id = r.id
      LEFT JOIN wrestlers         wrm ON wrm.id = rm.wrestler_id

      /* miembros individuales de este reinado */
      LEFT JOIN reign_members        rm_ind ON rm_ind.reign_id = r.id
      LEFT JOIN wrestlers            wi     ON wi.id          = rm_ind.wrestler_id

      /* match que cambió el título */
      LEFT JOIN (
        SELECT m1.*
        FROM matches m1
        JOIN (
          SELECT championship_id, event_id, MIN(id) AS min_id
          FROM matches
          WHERE title_changed = 1
          GROUP BY championship_id, event_id
        ) fm ON m1.id = fm.min_id
      ) AS m
        ON m.championship_id = r.championship_id
       AND m.event_id        = r.event_id

      /* participante rival (single o tag‑team) */
      LEFT JOIN match_participants mp_opp
        ON mp_opp.match_id = m.id
       AND (
            (r.wrestler_id IS NOT NULL AND mp_opp.wrestler_id <> r.wrestler_id)
         OR (r.tag_team_id IS NOT NULL AND mp_opp.tag_team_id <> r.tag_team_id)
          )

      /* datos rival single */
      LEFT JOIN wrestlers w_opp ON w_opp.id = mp_opp.wrestler_id

      /* datos rival tag‑team (solo miembros que pelearon) */
      LEFT JOIN tag_teams ot ON ot.id = mp_opp.tag_team_id
      LEFT JOIN match_participants opp_part
        ON opp_part.match_id   = m.id
       AND opp_part.tag_team_id = mp_opp.tag_team_id
      LEFT JOIN wrestlers wot ON wot.id = opp_part.wrestler_id

      WHERE r.championship_id = ?
      GROUP BY r.id
      ORDER BY r.won_date ASC
      `,
      [championshipId]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error('Database error in /api/championships/[id]/reigns:', err);
    res.status(500).json({ error: 'Database error' });
  }
}
