// pages/api/championships/[id]/tag-individual-stats.js

import pool, { setCacheHeaders, setNoStoreHeaders } from '../../../../lib/db';
import { parsePositiveInt, rejectNonGet } from '../../../../lib/validation';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (rejectNonGet(req, res)) return;

  const championshipId = parsePositiveInt(req.query.id);
  if (championshipId === null) {
    setNoStoreHeaders(res);
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    // 1) Contar defensas por miembro de reinado
    const [memberDefRows] = await pool.query(
      `
      SELECT
        rm.wrestler_id,
        rm.reign_id,
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
        AND EXISTS (SELECT 1 FROM match_team_scores mts WHERE mts.match_id = m.id)
      GROUP  BY rm.reign_id, rm.wrestler_id
      `,
      [championshipId, championshipId]
    );

    const defMap = new Map(
      memberDefRows.map((r) => [`${r.reign_id}_${r.wrestler_id}`, r.defenses])
    );

    // 2) Traer miembros individuales e intérprete calculando los días directo en SQL (DATEDIFF)
    const [memberRows] = await pool.query(
      `
      SELECT
        rm.reign_id,
        rm.wrestler_id,
        rm.interpreter_id,
        w.wrestler       AS wrestlerName,
        w.country,
        i.interpreter    AS interpreterName,
        i.nationality    AS interpreterCountry,
        rm.start_date,
        rm.end_date,
        DATEDIFF(IFNULL(rm.end_date, UTC_DATE()), rm.start_date) AS exact_days
      FROM reign_members rm
      JOIN championship_reigns cr
        ON cr.id = rm.reign_id
       AND cr.championship_id = ?
      JOIN wrestlers w   ON w.id = rm.wrestler_id
      LEFT JOIN interpreters i ON i.id = rm.interpreter_id
      ORDER BY rm.start_date ASC, rm.reign_id ASC
      `,
      [championshipId]
    );

    // 3) Acumular stats por luchador y por intérprete usando el cálculo exacto de la base de datos
    const byWrestler = new Map();
    const byInterpreter = new Map();

    for (const mr of memberRows) {
      const {
        reign_id, wrestler_id, wrestlerName, country,
        interpreter_id, interpreterName, interpreterCountry,
        end_date, exact_days
      } = mr;

      const days = exact_days || 0;
      const defs = defMap.get(`${reign_id}_${wrestler_id}`) || 0;

      if (!byWrestler.has(wrestler_id)) {
        byWrestler.set(wrestler_id, {
          wrestlerId:        wrestler_id,
          wrestlerName,
          country,
          interpreterId:     interpreter_id,
          interpreterName:   interpreterName   || null,
          interpreterCountry:interpreterCountry || null,
          reignCount:  0,
          defenses:    0,
          totalDays:   0,
          isCurrent:   false,
        });
      }

      const o = byWrestler.get(wrestler_id);
      o.reignCount += 1;
      o.defenses   += defs;
      o.totalDays  += days;
      if (!end_date) o.isCurrent = true;

      if (interpreter_id) {
        if (!byInterpreter.has(interpreter_id)) {
          byInterpreter.set(interpreter_id, {
            interpreterId:      interpreter_id,
            interpreterName:    interpreterName || null,
            interpreterCountry: interpreterCountry || null,
            champions:          [],
            reignIds:           new Set(),
            reignCount:         0,
            defenses:           0,
            totalDays:          0,
            isCurrent:          false,
          });
        }

        const io = byInterpreter.get(interpreter_id);
        if (!io.champions.some((c) => c.id === wrestler_id)) {
          io.champions.push({ id: wrestler_id, name: wrestlerName, country });
        }
        if (!io.reignIds.has(reign_id)) {
          io.reignIds.add(reign_id);
          io.reignCount += 1;
        }
        io.defenses  += defs;
        io.totalDays += days;
        if (!end_date) io.isCurrent = true;
      }
    }

    const wrestlers = Array.from(byWrestler.values()).map((o) => ({
      ...o,
      totalDaysLabel: o.isCurrent ? `${o.totalDays}+` : `${o.totalDays}`,
    }));

    const interpreters = Array.from(byInterpreter.values()).map(({ reignIds, ...o }) => ({
      ...o,
      totalDaysLabel: o.isCurrent ? `${o.totalDays}+` : `${o.totalDays}`,
    }));

    setCacheHeaders(res, 120);
    return res.status(200).json({ wrestlers, interpreters });
  } catch (err) {
    console.error('Error in tag-individual-stats:', err);
    setNoStoreHeaders(res);
    return res.status(500).json({ error: 'Database error' });
  }
}
