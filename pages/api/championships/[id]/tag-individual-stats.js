// pages/api/championships/[id]/tag-individual-stats.js

import pool from '../../../../lib/db';

export default async function handler(req, res) {
  const { id: championshipId } = req.query;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1) Contar defensas por miembro de reinado
    const [memberDefRows] = await pool.query(
      `
      SELECT
        rm.wrestler_id      AS wrestler_id,
        rm.reign_id         AS reign_id,
        COUNT(DISTINCT m.id) AS defenses
      FROM   reign_members rm
      JOIN   championship_reigns cr
        ON cr.id              = rm.reign_id
       AND cr.championship_id = ?
      JOIN   matches m
        ON m.championship_id = cr.championship_id
       AND m.title_match     = 1
       AND m.title_changed   = 0
      JOIN   events e
        ON e.id = m.event_id
       AND e.event_date >= cr.won_date
       AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)
      JOIN   match_participants mp
        ON mp.match_id    = m.id
       AND mp.wrestler_id = rm.wrestler_id
      WHERE  cr.championship_id = ?
      GROUP  BY rm.reign_id, rm.wrestler_id
      `,
      [championshipId, championshipId]
    );

    const defMap = new Map(
      memberDefRows.map(r => [`${r.reign_id}_${r.wrestler_id}`, r.defenses])
    );

    // 2) Traer miembros individuales e intérprete
    const [memberRows] = await pool.query(
      `
      SELECT
        rm.reign_id,
        rm.wrestler_id,
        rm.interpreter_id,
        w.wrestler       AS wrestlerName,
        w.country        AS country,
        i.interpreter    AS interpreterName,
        i.nationality    AS interpreterCountry,
        rm.start_date,
        rm.end_date
      FROM reign_members rm
      JOIN championship_reigns cr
        ON cr.id = rm.reign_id
       AND cr.championship_id = ?
      JOIN wrestlers w
        ON w.id = rm.wrestler_id
      LEFT JOIN interpreters i
        ON i.id = rm.interpreter_id
      `,
      [championshipId]
    );

    // 3) Acumular stats por luchador
    const now = new Date();
    const byWrestler = new Map();

    for (const mr of memberRows) {
      const {
        reign_id,
        wrestler_id,
        wrestlerName,
        country,
        interpreter_id,
        interpreterName,
        interpreterCountry,
        start_date,
        end_date,
      } = mr;

      const start = new Date(start_date);
      const end = end_date ? new Date(end_date) : now;
      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      const defKey = `${reign_id}_${wrestler_id}`;
      const defs = defMap.get(defKey) || 0;

      if (!byWrestler.has(wrestler_id)) {
        byWrestler.set(wrestler_id, {
          wrestlerId: wrestler_id,
          wrestlerName,
          country,
          interpreterId: interpreter_id,
          interpreterName: interpreterName || null,
          interpreterCountry: interpreterCountry || null,
          reignCount: 0,
          defenses: 0,
          totalDays: 0,
          isCurrent: false,
        });
      }

      const o = byWrestler.get(wrestler_id);
      o.reignCount += 1;
      o.defenses += defs;
      o.totalDays += days;
      if (!end_date) {
        o.isCurrent = true;
      }
    }

    // 4) Transformar a array y etiquetar días
    const result = Array.from(byWrestler.values()).map(o => ({
      ...o,
      totalDaysLabel: o.isCurrent ? `${o.totalDays}+` : `${o.totalDays}`
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in tag-individual-stats:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
