// pages/api/championships/[id]/tag_teams/index.js

import { query } from '../../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { id } = req.query;
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
     GROUP BY tt.id, tr.id
     ORDER BY tr.won_date`,
    [id]
  );
  res.status(200).json(rows);
}
