// pages/api/championships/[id].js

import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id: championshipId } = req.query;

  try {
    // 1) Obtener datos básicos del campeonato
    const [champRows] = await query(
      `SELECT id, title_name, date_established
       FROM championships
       WHERE id = ?`,
      [championshipId]
    );
    if (!champRows || champRows.length === 0) {
      return res.status(404).json({ error: 'Championship not found' });
    }
    const champ = champRows[0];

    // 2) Obtener el reinado actual + datos del match de coronación
    const [currentRows] = await query(
      `
      SELECT
        cr.id                      AS reign_id,
        cr.wrestler_id             AS wrestler_id,
        w.wrestler                 AS wrestler,
        w.country                  AS country,
        cr.reign_number            AS reign_number,
        cr.won_date                AS won_date,
        e.id                       AS event_id,
        e.name                     AS event_name,
        -- participante oponente
        mp_opp.wrestler_id         AS defeatedOpponentId,
        w_opp.wrestler             AS defeatedOpponent,
        w_opp.country              AS defeatedOpponentCountry
      FROM championship_reigns cr
      JOIN wrestlers w
        ON w.id = cr.wrestler_id
      -- buscamos la lucha en que ganó el título (title_match=1 y cambió de campeón)
      JOIN matches m
        ON m.championship_id = cr.championship_id
       AND m.title_match     = 1
       AND m.title_changed   = 1
       AND m.event_id IS NOT NULL
      -- vincular al evento
      JOIN events e
        ON e.id = m.event_id
      -- participante campeón en esa lucha
      JOIN match_participants mp_champ
        ON mp_champ.match_id    = m.id
       AND mp_champ.wrestler_id = cr.wrestler_id
      -- participante oponente
      JOIN match_participants mp_opp
        ON mp_opp.match_id      = m.id
       AND mp_opp.wrestler_id  <> cr.wrestler_id
      JOIN wrestlers w_opp
        ON w_opp.id = mp_opp.wrestler_id
      WHERE cr.championship_id = ?
        AND cr.lost_date IS NULL
      LIMIT 1
      `,
      [championshipId]
    );

    const currentReign = currentRows && currentRows.length > 0
      ? {
          reignId:                  currentRows[0].reign_id,
          wrestler:                currentRows[0].wrestler,
          wrestlerId:              currentRows[0].wrestler_id,
          country:                 currentRows[0].country,
          reignNumber:             currentRows[0].reign_number,
          wonDate:                 currentRows[0].won_date,
          eventId:                 currentRows[0].event_id,
          eventName:               currentRows[0].event_name,
          defeatedOpponent:        currentRows[0].defeatedOpponent,
          defeatedOpponentId:      currentRows[0].defeatedOpponentId,
          defeatedOpponentCountry: currentRows[0].defeatedOpponentCountry,
        }
      : null;

    res.status(200).json({
      champ,
      currentReign,
    });
  } catch (err) {
    console.error('Error in /api/championships/[id]:', err);
    res.status(500).json({ error: 'Database error' });
  }
}
