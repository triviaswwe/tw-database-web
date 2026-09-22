// pages/api/championships/[id]/reigns/index.js

import pool from "../../../../../lib/db";
import { setCacheHeaders } from "../../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

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

        /* ---------- tag-team campeón ---------- */
        r.tag_team_id,
        t.name                  AS team_name,
        
        /* Subconsulta para los miembros del Tag Team al momento de ganar */
        (
          SELECT GROUP_CONCAT(
            DISTINCT CONCAT(
              wrm.id, '|', wrm.wrestler, '|', wrm.country, '|',
              (
                SELECT COUNT(*)
                FROM reign_members rm3
                JOIN championship_reigns r3 ON r3.id = rm3.reign_id
                WHERE rm3.wrestler_id = wrm.id
                  AND r3.championship_id = r.championship_id
                  AND r3.won_date <= r.won_date
              )
            )
            ORDER BY wrm.wrestler
            SEPARATOR ','
          )
          FROM reign_members rm2
          JOIN wrestlers wrm ON wrm.id = rm2.wrestler_id
          WHERE rm2.reign_id = r.id
        ) AS team_members_raw,

        /* Subconsulta para miembros individuales y sus fechas */
        (
          SELECT GROUP_CONCAT(
            DISTINCT CONCAT(
              rm_ind.wrestler_id, '|', wi.wrestler, '|', wi.country, '|',
              DATE_FORMAT(rm_ind.start_date,'%Y-%m-%d'), '|',
              IFNULL(DATE_FORMAT(rm_ind.end_date,'%Y-%m-%d'),'')
            )
            ORDER BY wi.wrestler
            SEPARATOR ','
          )
          FROM reign_members rm_ind
          JOIN wrestlers wi ON wi.id = rm_ind.wrestler_id
          WHERE rm_ind.reign_id = r.id
        ) AS individual_members_raw,

        /* ---------- Datos del Combate donde Ganaron ---------- */
        m.event_id,
        e.name                  AS event_name,
        m.notes                 AS notes,
        
        /* Subconsulta para Rival Tag-Team (Retorna el primero que encuentre para compatibilidad) */
        (
          SELECT ot.id
          FROM match_participants mp_opp
          JOIN tag_teams ot ON ot.id = mp_opp.tag_team_id
          WHERE mp_opp.match_id = m.id
            AND mp_opp.tag_team_id <> r.tag_team_id
          LIMIT 1
        ) AS opponent_tag_team_id,

        (
          SELECT ot.name
          FROM match_participants mp_opp
          JOIN tag_teams ot ON ot.id = mp_opp.tag_team_id
          WHERE mp_opp.match_id = m.id
            AND mp_opp.tag_team_id <> r.tag_team_id
          LIMIT 1
        ) AS opponent_team_name,

        (
          SELECT GROUP_CONCAT(
            DISTINCT CONCAT(opp_part.wrestler_id, '|', wot.wrestler, '|', wot.country)
            ORDER BY wot.wrestler
            SEPARATOR ','
          )
          FROM match_participants mp_opp
          JOIN match_participants opp_part ON opp_part.match_id = m.id AND opp_part.tag_team_id = mp_opp.tag_team_id
          JOIN wrestlers wot ON wot.id = opp_part.wrestler_id
          WHERE mp_opp.match_id = m.id
            AND mp_opp.tag_team_id <> r.tag_team_id
          LIMIT 1
        ) AS opponent_team_members_raw,

        /* Subconsulta para Rival Single (Retorna el primero que encuentre) */
        (
          SELECT w_opp.id
          FROM match_participants mp_opp
          JOIN wrestlers w_opp ON w_opp.id = mp_opp.wrestler_id
          WHERE r.tag_team_id IS NULL 
            AND mp_opp.match_id = m.id
            AND mp_opp.wrestler_id <> r.wrestler_id
          LIMIT 1
        ) AS opponent_id,

        (
          SELECT w_opp.wrestler
          FROM match_participants mp_opp
          JOIN wrestlers w_opp ON w_opp.id = mp_opp.wrestler_id
          WHERE r.tag_team_id IS NULL 
            AND mp_opp.match_id = m.id
            AND mp_opp.wrestler_id <> r.wrestler_id
          LIMIT 1
        ) AS opponent,

        (
          SELECT w_opp.country
          FROM match_participants mp_opp
          JOIN wrestlers w_opp ON w_opp.id = mp_opp.wrestler_id
          WHERE r.tag_team_id IS NULL 
            AND mp_opp.match_id = m.id
            AND mp_opp.wrestler_id <> r.wrestler_id
          LIMIT 1
        ) AS opponent_country,

        /* ---------- ERA ---------- */
        era.name                AS era_name

      FROM championship_reigns r

      /* Joins base (sin multiplicadores) */
      LEFT JOIN wrestlers    w  ON w.id = r.wrestler_id
      LEFT JOIN interpreters i  ON i.id = r.interpreter_id
      LEFT JOIN tag_teams    t  ON t.id = r.tag_team_id
      LEFT JOIN events       e  ON e.id = r.event_id

      LEFT JOIN eras era
        ON r.won_date >= era.start_date
       AND (era.end_date IS NULL OR r.won_date <= era.end_date)

      /* Solo extraemos la info base del combate */
      LEFT JOIN (
        SELECT m1.id, m1.championship_id, m1.event_id, m1.notes
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

      WHERE r.championship_id = ?
      
/* Agrupación simple que garantiza 1 fila por reinado */
      GROUP BY 
        r.id, 
        r.reign_number, 
        r.won_date, 
        r.lost_date, 
        r.days_held, 
        r.wrestler_id, 
        w.wrestler, 
        w.country, 
        r.interpreter_id, 
        i.interpreter, 
        i.nationality, 
        r.tag_team_id, 
        t.name, 
        r.event_id, 
        e.name, 
        m.id,
        m.notes, 
        era.name,
        era.start_date
      ORDER BY era.start_date, r.won_date
      `,
      [championshipId],
    );

    setCacheHeaders(res, 120);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("Database error in /api/championships/[id]/reigns:", err);
    return res.status(500).json({ error: "Database error" });
  }
}
