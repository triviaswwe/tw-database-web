// pages/api/stables/[id].js

import pool, { setCacheHeaders, setNoStoreHeaders } from '../../../lib/db';
import { parsePositiveInt, rejectNonGet } from '../../../lib/validation';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (rejectNonGet(req, res)) return;

  const stableId = parsePositiveInt(req.query.id);
  if (stableId === null) {
    setNoStoreHeaders(res);
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    // 1) Fetch stable info
    const [[stableRow]] = await pool.query(
      `SELECT id, name, status FROM tag_teams WHERE id = ?`,
      [stableId]
    );
    if (!stableRow) {
      setNoStoreHeaders(res);
      return res.status(404).json({ error: 'Not found' });
    }

    // 2) Fetch members with their status
    const [memberRows] = await pool.query(
      `
      SELECT
        tm.status        AS member_status,
        w.id             AS id,
        w.wrestler       AS wrestler,
        w.country        AS country
      FROM tag_team_members tm
      JOIN wrestlers w ON w.id = tm.wrestler_id
      WHERE tm.tag_team_id = ?
      ORDER BY tm.status DESC, w.wrestler
      `,
      [stableId]
    );

    setCacheHeaders(res, 60);
    return res.status(200).json({
      stable: {
        id: stableRow.id,
        name: stableRow.name,
        status: stableRow.status,
      },
      members: memberRows.map((m) => ({
        id: m.id,
        wrestler: m.wrestler,
        country: m.country,
        member_status: m.member_status,
      })),
    });
  } catch (err) {
    console.error('Error in /api/stables/[id]:', err);
    setNoStoreHeaders(res);
    return res.status(500).json({ error: 'Database error' });
  }
}
