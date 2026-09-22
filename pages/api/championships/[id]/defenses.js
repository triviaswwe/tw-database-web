// pages/api/championships/[id]/defenses.js

import pool from '../../../../lib/db';
import { setCacheHeaders } from '../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: championshipId } = req.query;

  try {
    /* ------------------------------------------------------------------ */
    /* 1. Lista de reinados                                               */
    /* ------------------------------------------------------------------ */
    const [reignsRows] = await pool.query(
      `SELECT id AS reign_id, wrestler_id, tag_team_id, won_date, lost_date
       FROM championship_reigns
       WHERE championship_id = ?`,
      [championshipId]
    );

    if (reignsRows.length === 0) {
      setCacheHeaders(res, 120);
      return res.status(200).json({ summary: [], details: [] });
    }

    /* ------------------------------------------------------------------ */
    /* 2. Conteo de defensas exitosas por reinado (summary)               */
    /* ------------------------------------------------------------------ */
    const [countsRows] = await pool.query(
      `
      SELECT cr.id AS reign_id,
             COUNT(DISTINCT m.id) AS count
      FROM   championship_reigns cr
      JOIN   matches m
             ON m.title_match     = 1
            AND m.title_changed   = 0
            AND m.championship_id = cr.championship_id
            AND m.event_id IS NOT NULL
      JOIN   events e
             ON e.id          = m.event_id
            AND e.event_date >= cr.won_date
            AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)
      JOIN   match_participants mp
             ON mp.match_id = m.id
            AND (
                 (cr.wrestler_id  IS NOT NULL AND mp.wrestler_id = cr.wrestler_id)
              OR (cr.tag_team_id IS NOT NULL AND mp.tag_team_id  = cr.tag_team_id)
                )
      WHERE  cr.championship_id = ?
      GROUP  BY cr.id
      `,
      [championshipId]
    );

    /* ------------------------------------------------------------------ */
    /* 3. Detalle de cada defensa                                         */
    /* ------------------------------------------------------------------ */
    const [detailRows] = await pool.query(
      `
      SELECT
        cr.id                    AS reign_id,
        mts_champ.score          AS champion_score,
        mts_opp.score            AS opponent_score,
        e.event_date,
        e.id                     AS event_id,
        e.name                   AS event_name,

        /* Subconsultas para evitar duplicados en los cruces de JOINs */
        (
          SELECT w_opp.id
          FROM match_participants mp_opp
          JOIN wrestlers w_opp ON w_opp.id = mp_opp.wrestler_id
          WHERE cr.tag_team_id IS NULL 
            AND mp_opp.match_id = m.id
            AND mp_opp.wrestler_id <> cr.wrestler_id
          LIMIT 1
        ) AS opponent_id,

        (
          SELECT w_opp.wrestler
          FROM match_participants mp_opp
          JOIN wrestlers w_opp ON w_opp.id = mp_opp.wrestler_id
          WHERE cr.tag_team_id IS NULL 
            AND mp_opp.match_id = m.id
            AND mp_opp.wrestler_id <> cr.wrestler_id
          LIMIT 1
        ) AS opponent,

        (
          SELECT w_opp.country
          FROM match_participants mp_opp
          JOIN wrestlers w_opp ON w_opp.id = mp_opp.wrestler_id
          WHERE cr.tag_team_id IS NULL 
            AND mp_opp.match_id = m.id
            AND mp_opp.wrestler_id <> cr.wrestler_id
          LIMIT 1
        ) AS opponent_country,

        (
          SELECT ot.id
          FROM match_participants mp_opp
          JOIN tag_teams ot ON ot.id = mp_opp.tag_team_id
          WHERE cr.tag_team_id IS NOT NULL 
            AND mp_opp.match_id = m.id
            AND mp_opp.tag_team_id <> cr.tag_team_id
          LIMIT 1
        ) AS opponent_tag_team_id,

        (
          SELECT GROUP_CONCAT(DISTINCT ot.name SEPARATOR ' & ')
          FROM match_participants mp_opp
          JOIN tag_teams ot ON ot.id = mp_opp.tag_team_id
          WHERE cr.tag_team_id IS NOT NULL 
            AND mp_opp.match_id = m.id
            AND mp_opp.tag_team_id <> cr.tag_team_id
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
          WHERE cr.tag_team_id IS NOT NULL 
            AND mp_opp.match_id = m.id
            AND mp_opp.tag_team_id <> cr.tag_team_id
        ) AS opponent_team_members_raw

      FROM   championship_reigns cr

      JOIN   matches m
             ON m.title_match     = 1
            AND m.title_changed   = 0
            AND m.championship_id = cr.championship_id
      JOIN   events e
             ON e.id          = m.event_id
            AND e.event_date >= cr.won_date
            AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)

      JOIN   match_participants mp_champ
             ON mp_champ.match_id = m.id
            AND (
                 (cr.wrestler_id  IS NOT NULL AND mp_champ.wrestler_id = cr.wrestler_id)
              OR (cr.tag_team_id IS NOT NULL AND mp_champ.tag_team_id  = cr.tag_team_id)
                )

      /* Usamos LIMIT 1 en el JOIN oponente para anclar el team_number de la puntuación rival, 
         sin multiplicar la fila base */
      JOIN   match_participants mp_opp
             ON mp_opp.match_id = m.id
            AND (
                 (cr.wrestler_id  IS NOT NULL AND mp_opp.wrestler_id <> cr.wrestler_id)
              OR (cr.tag_team_id IS NOT NULL AND mp_opp.tag_team_id  <> cr.tag_team_id)
                )

      LEFT JOIN match_team_scores mts_champ
             ON mts_champ.match_id   = m.id
            AND mts_champ.team_number = mp_champ.team_number
      LEFT JOIN match_team_scores mts_opp
             ON mts_opp.match_id   = m.id
            AND mts_opp.team_number = mp_opp.team_number

      WHERE  cr.championship_id = ?
      
      /* Agrupación ultra-limpia asegurando unicidad por match */
      GROUP  BY 
        cr.id, 
        m.id,
        e.id, 
        mts_champ.score, 
        mts_opp.score, 
        e.event_date, 
        e.name, 
        cr.tag_team_id,
        cr.wrestler_id
      ORDER  BY e.event_date
      `,
      [championshipId]
    );

    /* ------------------------------------------------------------------ */
    /* 4. Armar summary y details                                         */
    /* ------------------------------------------------------------------ */
    const summary = reignsRows.map((r) => {
      const found = countsRows.find((c) => c.reign_id === r.reign_id);
      return { reign_id: r.reign_id, count: found ? found.count : 0 };
    });

    const details = detailRows.map((r, idx) => ({
      order:                    idx + 1,
      reign_id:                 r.reign_id,
      score:                    `${r.champion_score || 0}-${r.opponent_score || 0}`,
      opponent_id:              r.opponent_id,
      opponent:                 r.opponent,
      opponent_country:         r.opponent_country,
      opponent_tag_team_id:     r.opponent_tag_team_id,
      opponent_team_name:       r.opponent_team_name,
      opponent_team_members_raw:r.opponent_team_members_raw,
      event_date:               r.event_date,
      event_id:                 r.event_id,
      event_name:               r.event_name,
    }));

    setCacheHeaders(res, 120);
    return res.status(200).json({ summary, details });
  } catch (err) {
    console.error('Database error in /api/championships/[id]/defenses:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}