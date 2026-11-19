// pages/api/championships/[id]/tag_teams/index.js

import { query, setCacheHeaders, setNoStoreHeaders } from '../../../../../lib/db';
import { parsePositiveInt, rejectNonGet } from '../../../../../lib/validation';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (rejectNonGet(req, res)) return;

  const id = parsePositiveInt(req.query.id);
  if (id === null) {
    setNoStoreHeaders(res);
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const rows = await query(
      `SELECT
         tt.id,
         tt.name         AS tag_team_name,
         tr.id           AS reign_id,
         tr.reign_number,
         tr.won_date,
         tr.lost_date,
         tr.days_held
       FROM tag_teams tt
       JOIN reign_members rm ON rm.tag_team_id = tt.id
       JOIN championship_reigns tr ON tr.id = rm.reign_id
       WHERE tr.championship_id = ?
       GROUP BY 
         tt.id, 
         tt.name, 
         tr.id, 
         tr.reign_number, 
         tr.won_date, 
         tr.lost_date, 
         tr.days_held
       ORDER BY tr.won_date`,
      [id]
    );
    setCacheHeaders(res, 60);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error in /api/championships/[id]/tag_teams:', err);
    setNoStoreHeaders(res);
    return res.status(500).json({ error: 'Database error' });
  }
}
