// lib/records/getSlammyData.js

function normalizeText(str) {
  if (!str) return "";
  return str.replace(/[\u2018\u2019\u00B4\u02BC`]/g, "'");
}

export async function getSlammyData(pool, type) {
  const awardType = type === "wrestler" ? "wrestler" : "interpreter";

  // 1. Fetch all categories
  const [categoriesRows] = await pool.query(`
    SELECT id, name, display_order 
    FROM slammy_categories 
    ORDER BY display_order ASC, id ASC
  `);

  // 2. Fetch all awards for the specified award_type (or fallback to wrestler if no interpreter row exists)
  const [awardsRows] = await pool.query(`
    SELECT 
      a.id,
      a.category_id,
      c.name AS category_name,
      c.display_order AS category_order,
      a.year,
      a.award_type,
      a.winner_name,
      a.subtext,
      a.wrestler_id,
      w.wrestler AS wrestler_name,
      w.country AS wrestler_country,
      a.interpreter_id,
      i.interpreter AS interpreter_name,
      i.nationality AS interpreter_country,
      a.stable_id,
      st.name AS stable_name,
      a.event_id,
      e.name AS event_name,
      a.extra_wrestler_ids,
      a.extra_interpreter_ids
    FROM slammy_awards a
    JOIN slammy_categories c ON a.category_id = c.id
    LEFT JOIN wrestlers w ON a.wrestler_id = w.id
    LEFT JOIN interpreters i ON a.interpreter_id = i.id
    LEFT JOIN tag_teams st ON a.stable_id = st.id
    LEFT JOIN events e ON a.event_id = e.id
    WHERE a.award_type = ? 
       OR (a.award_type = 'wrestler' AND NOT EXISTS (
         SELECT 1 FROM slammy_awards a2 
         WHERE a2.award_type = ? AND a2.category_id = a.category_id AND a2.year = a.year
       ))
    ORDER BY c.display_order ASC, a.year ASC
  `, [awardType, awardType]);

  // 3. Collect extra wrestler & interpreter IDs
  const extraWrestlerIds = new Set();
  const extraInterpreterIds = new Set();

  for (const row of awardsRows) {
    let wIds = row.extra_wrestler_ids;
    if (typeof wIds === "string") {
      try { wIds = JSON.parse(wIds); } catch (e) { wIds = []; }
    }
    if (Array.isArray(wIds)) {
      wIds.forEach(id => {
        const num = Number(id);
        if (!isNaN(num)) extraWrestlerIds.add(num);
      });
    }

    let iIds = row.extra_interpreter_ids;
    if (typeof iIds === "string") {
      try { iIds = JSON.parse(iIds); } catch (e) { iIds = []; }
    }
    if (Array.isArray(iIds)) {
      iIds.forEach(id => {
        const num = Number(id);
        if (!isNaN(num)) extraInterpreterIds.add(num);
      });
    }
  }

  let extraWrestlersMap = new Map();
  if (extraWrestlerIds.size > 0) {
    const placeholders = Array.from(extraWrestlerIds).map(() => "?").join(",");
    const [extraWrestlersRows] = await pool.query(
      `SELECT id, wrestler AS name, country FROM wrestlers WHERE id IN (${placeholders})`,
      Array.from(extraWrestlerIds)
    );
    extraWrestlersMap = new Map(extraWrestlersRows.map(w => [w.id, w]));
  }

  let extraInterpretersMap = new Map();
  if (extraInterpreterIds.size > 0) {
    const placeholders = Array.from(extraInterpreterIds).map(() => "?").join(",");
    const [extraInterpretersRows] = await pool.query(
      `SELECT id, interpreter AS name, nationality AS country FROM interpreters WHERE id IN (${placeholders})`,
      Array.from(extraInterpreterIds)
    );
    extraInterpretersMap = new Map(extraInterpretersRows.map(i => [i.id, i]));
  }

  // 4. Fetch all lookup entities (stables, wrestlers, interpreters) for rich text matching
  const [allStablesRows] = await pool.query(`
    SELECT id, name FROM tag_teams ORDER BY LENGTH(name) DESC
  `);
  const [allWrestlersRows] = await pool.query(`
    SELECT id, wrestler AS name, country FROM wrestlers ORDER BY LENGTH(wrestler) DESC
  `);
  const [allInterpretersRows] = await pool.query(`
    SELECT id, interpreter AS name, nationality AS country FROM interpreters ORDER BY LENGTH(interpreter) DESC
  `);

  // 5. Fetch Royal Rumble events to ensure exact year matching for Royal Rumble awards
  const [royalRumbleRows] = await pool.query(`
    SELECT id, name, YEAR(event_date) AS year 
    FROM events 
    WHERE name LIKE '%Royal Rumble%'
    ORDER BY event_date ASC
  `);
  const royalRumblesByYear = {};
  for (const r of royalRumbleRows) {
    if (r.year) royalRumblesByYear[r.year] = r.id;
  }

  // 6. Fetch match participants for awards with event_id (to map wrestler -> interpreter in Match of the Year)
  const eventIds = Array.from(new Set(awardsRows.map(r => r.event_id).filter(Boolean)));
  let eventParticipantsRows = [];
  if (eventIds.length > 0) {
    const placeholders = eventIds.map(() => "?").join(",");
    try {
      const [epRows] = await pool.query(`
        SELECT 
          m.event_id,
          w.id AS wrestler_id,
          w.wrestler AS wrestler_name,
          i.id AS interpreter_id,
          i.interpreter AS interpreter_name,
          i.nationality AS interpreter_country
        FROM match_participants mp
        JOIN matches m ON mp.match_id = m.id
        JOIN wrestlers w ON mp.wrestler_id = w.id
        JOIN interpreters i ON mp.interpreter_id = i.id
        WHERE m.event_id IN (${placeholders})
      `, eventIds);
      eventParticipantsRows = epRows;
    } catch (err) {
      console.error("Error querying event match participants:", err);
    }
  }

  // General wrestler -> interpreter fallback mapping
  let generalWiRows = [];
  try {
    const [wiRows] = await pool.query(`
      SELECT 
        w.id AS wrestler_id,
        w.wrestler AS wrestler_name,
        i.id AS interpreter_id,
        i.interpreter AS interpreter_name,
        i.nationality AS interpreter_country
      FROM wrestler_interpreter wi
      JOIN wrestlers w ON wi.wrestler_id = w.id
      JOIN interpreters i ON wi.interpreter_id = i.id
    `);
    generalWiRows = wiRows;
  } catch (err) {
    console.error("Error querying wrestler_interpreter:", err);
  }

  // 7. Map into processed awards
  const processedAwards = awardsRows.map(row => {
    let extraWrestlerList = [];
    let parsedWrestlerIds = row.extra_wrestler_ids;
    if (typeof parsedWrestlerIds === "string") {
      try { parsedWrestlerIds = JSON.parse(parsedWrestlerIds); } catch (e) { parsedWrestlerIds = []; }
    }
    if (Array.isArray(parsedWrestlerIds)) {
      extraWrestlerList = parsedWrestlerIds.map(id => extraWrestlersMap.get(Number(id))).filter(Boolean);
    }

    let extraInterpreterList = [];
    let parsedInterpreterIds = row.extra_interpreter_ids;
    if (typeof parsedInterpreterIds === "string") {
      try { parsedInterpreterIds = JSON.parse(parsedInterpreterIds); } catch (e) { parsedInterpreterIds = []; }
    }
    if (Array.isArray(parsedInterpreterIds)) {
      extraInterpreterList = parsedInterpreterIds.map(id => extraInterpretersMap.get(Number(id))).filter(Boolean);
    }

    // Build wrestler -> interpreter map for this specific award
    const wrestlerToInterpreter = {};
    for (const wi of generalWiRows) {
      const key = normalizeText(wi.wrestler_name).toLowerCase();
      wrestlerToInterpreter[key] = {
        id: wi.interpreter_id,
        name: wi.interpreter_name,
        country: wi.interpreter_country,
      };
    }
    if (row.event_id) {
      for (const ep of eventParticipantsRows) {
        if (ep.event_id === row.event_id) {
          const key = normalizeText(ep.wrestler_name).toLowerCase();
          wrestlerToInterpreter[key] = {
            id: ep.interpreter_id,
            name: ep.interpreter_name,
            country: ep.interpreter_country,
          };
        }
      }
    }

    return {
      id: row.id,
      category_id: row.category_id,
      category_name: row.category_name,
      category_order: row.category_order,
      year: row.year,
      award_type: row.award_type,
      winner_name: row.winner_name,
      subtext: row.subtext,
      wrestler: row.wrestler_id ? {
        id: row.wrestler_id,
        name: row.wrestler_name,
        country: row.wrestler_country,
      } : null,
      interpreter: row.interpreter_id ? {
        id: row.interpreter_id,
        name: row.interpreter_name,
        country: row.interpreter_country,
      } : null,
      stable: row.stable_id ? {
        id: row.stable_id,
        name: row.stable_name,
      } : null,
      event: row.event_id ? {
        id: row.event_id,
        name: row.event_name,
      } : null,
      extra_wrestlers: extraWrestlerList,
      extra_interpreters: extraInterpreterList,
      wrestler_to_interpreter: wrestlerToInterpreter,
    };
  });

  const distinctYears = Array.from(new Set(processedAwards.map(a => a.year))).sort((a, b) => a - b);
  const years = distinctYears.length > 0 ? distinctYears : [2023, 2024, 2025];

  const categories = categoriesRows.map(c => ({
    id: c.id,
    name: c.name,
    display_order: c.display_order,
  }));

  const awardsMatrix = {};
  for (const award of processedAwards) {
    const key = `${award.category_id}_${award.year}`;
    awardsMatrix[key] = award;
  }

  return {
    categories: JSON.parse(JSON.stringify(categories)),
    years: JSON.parse(JSON.stringify(years)),
    awardsMatrix: JSON.parse(JSON.stringify(awardsMatrix)),
    allStables: JSON.parse(JSON.stringify(allStablesRows || [])),
    allWrestlers: JSON.parse(JSON.stringify(allWrestlersRows || [])),
    allInterpreters: JSON.parse(JSON.stringify(allInterpretersRows || [])),
    royalRumblesByYear: JSON.parse(JSON.stringify(royalRumblesByYear || {})),
  };
}
