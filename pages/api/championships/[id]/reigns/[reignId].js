// pages/api/championships/[id]/reigns/[reignId].js

import { query } from '../../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { id, reignId } = req.query;
  const [row] = await query(
    `SELECT
       r.id,
       r.reign_number,
       r.won_date,
       r.lost_date,
       r.days_held,
       r.wrestler_id,
       w.wrestler    AS wrestler,
       w.country,
       r.interpreter_id,
       i.interpreter AS interpreter,
       i.nationality,
       r.tag_team_id,
       r.event_id,
       m.notes,
     FROM championship_reigns r
     LEFT JOIN wrestlers w ON w.id = r.wrestler_id
     LEFT JOIN interpreters i ON i.id = r.interpreter_id
     LEFT JOIN matches m    
     WHERE r.championship_id = ? AND r.id = ?
    `,
    [id, reignId]
  );
  if (!row) return res.status(404).end();
  res.status(200).json(row);
}
