// pages/api/championships/[id]/defenses.js

import pool from "../../../../lib/db"; // Ajusta la ruta si es necesario

export default async function handler(req, res) {
  const {
    query: { id: championshipId },
    method,
  } = req;

  if (method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1) Obtenemos todos los reinados de este campeonato:
    const [reignsRows] = await pool.query(
      `
      SELECT
        cr.id AS reign_id,
        cr.wrestler_id,
        cr.won_date,
        cr.lost_date
      FROM championship_reigns cr
      WHERE cr.championship_id = ?
      `,
      [championshipId]
    );

    if (reignsRows.length === 0) {
      return res.status(200).json([]); // Si no hay reinados, devolvemos arreglo vacío
    }

    // 2) Para todos los reinados, contamos defensas exitosas:
    //
    // Ahora la fecha del match se obtiene desde events.event_date,
    // porque matches no tiene su propia columna de fecha.
    //
    // - m.title_match = 1           → Lucha por el título
    // - m.title_changed = 0         → En esa lucha NO hubo cambio de campeón (defensa)
    // - m.championship_id = cr.championship_id
    //   → Asegura que el match sea de este mismo campeonato
    // - e.event_date >= cr.won_date
    //   y ( cr.lost_date IS NULL OR e.event_date < cr.lost_date )
    //   → El evento está dentro del rango del reinado
    // - mp.wrestler_id = cr.wrestler_id
    //   → El mismo luchador que era campeón participa en ese match
    //
    // Agrupamos por cr.id para obtener COUNT(*) AS count.

    const [countsRows] = await pool.query(
      `
      SELECT
        cr.id AS reign_id,
        COUNT(*) AS count
      FROM championship_reigns cr

      JOIN matches m
        ON m.title_match       = 1
       AND m.title_changed     = 0
       AND m.championship_id   = cr.championship_id
       AND m.event_id IS NOT NULL

      JOIN events e
        ON m.event_id   = e.id
       AND e.event_date >= cr.won_date
       AND (
             cr.lost_date IS NULL
             OR e.event_date < cr.lost_date
           )

      JOIN match_participants mp
        ON mp.match_id     = m.id
       AND mp.wrestler_id  = cr.wrestler_id

      WHERE cr.championship_id = ?
      GROUP BY cr.id
      `,
      [championshipId]
    );

    // 3) Construimos un Map (reign_id → count) para lookup rápido
    const defensesMap = new Map();
    countsRows.forEach((r) => {
      defensesMap.set(r.reign_id, r.count);
    });

    // 4) Preparamos el resultado final, incluyendo reinados con 0 defensas
    const result = reignsRows.map((r) => ({
      reign_id: r.reign_id,
      count: defensesMap.get(r.reign_id) || 0,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("Database error in /api/championships/[id]/defenses:", err);
    return res.status(500).json({ error: "Database error" });
  }
}
