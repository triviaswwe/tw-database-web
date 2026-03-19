// pages/api/championships/[id].js

import pool from '../../../lib/db';
import { setCacheHeaders } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id: championshipId } = req.query;

  try {
    // 1) Datos básicos del campeonato
    const [[champRow]] = await pool.query(
      `SELECT id, title_name, date_established
       FROM championships
       WHERE id = ?`,
      [championshipId]
    );
    if (!champRow) {
      return res.status(404).json({ error: 'Championship not found' });
    }

    // 2) Reinado actual + match de coronación
    const [[currentRow]] = await pool.query(
      `
      SELECT
        cr.id                  AS reign_id,
        cr.wrestler_id,
        w.wrestler,
        w.country,
        cr.reign_number,
        cr.won_date,
        e.id                   AS event_id,
        e.name                 AS event_name,
        mp_opp.wrestler_id     AS defeatedOpponentId,
        w_opp.wrestler         AS defeatedOpponent,
        w_opp.country          AS defeatedOpponentCountry
      FROM championship_reigns cr
      JOIN wrestlers w          ON w.id = cr.wrestler_id
      JOIN matches m
        ON m.championship_id = cr.championship_id
       AND m.title_match     = 1
       AND m.title_changed   = 1
       AND m.event_id IS NOT NULL
      JOIN events e             ON e.id = m.event_id
      JOIN match_participants mp_champ
        ON mp_champ.match_id    = m.id
       AND mp_champ.wrestler_id = cr.wrestler_id
      JOIN match_participants mp_opp
        ON mp_opp.match_id     = m.id
       AND mp_opp.wrestler_id <> cr.wrestler_id
      JOIN wrestlers w_opp      ON w_opp.id = mp_opp.wrestler_id
      WHERE cr.championship_id = ?
        AND cr.lost_date IS NULL
      LIMIT 1
      `,
      [championshipId]
    );

    const currentReign = currentRow
      ? {
          reignId:                 currentRow.reign_id,
          wrestler:                currentRow.wrestler,
          wrestlerId:              currentRow.wrestler_id,
          country:                 currentRow.country,
          reignNumber:             currentRow.reign_number,
          wonDate:                 currentRow.won_date,
          eventId:                 currentRow.event_id,
          eventName:               currentRow.event_name,
          defeatedOpponent:        currentRow.defeatedOpponent,
          defeatedOpponentId:      currentRow.defeatedOpponentId,
          defeatedOpponentCountry: currentRow.defeatedOpponentCountry,
        }
      : null;

    // Datos de championships cambian muy poco — cachear 2 minutos en CDN
    setCacheHeaders(res, 120);
    return res.status(200).json({ champ: champRow, currentReign });
  } catch (err) {
    console.error('Error in /api/championships/[id]:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}