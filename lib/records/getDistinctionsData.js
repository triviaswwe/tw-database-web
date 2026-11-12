// lib/records/getDistinctionsData.js

export const DISTINCTION_CATEGORIES = [
  { id: "Royal Rumble", label: "Royal Rumble" },
  { id: "Money in the Bank", label: "Money in the Bank" },
  { id: "Elimination Chamber", label: "Elimination Chamber" },
  { id: "WarGames", label: "WarGames" },
  { id: "Kings of the Ring", label: "Kings of the Ring" },
  { id: "Battle Royal", label: "Battle Royal" },
  { id: "Tournament", label: "Tournaments" },
];

function getWrestlerDisplayName(wrestlerId, canonicalName, dateStr) {
  if (wrestlerId === 8 && dateStr <= "2025-10-26") {
    return "Dean Ambrose";
  }
  return canonicalName;
}

// Format show or PLE name
function formatShowLabel(pleName, showName, eventName) {
  if (eventName === "WWE Live: Mexico") return "WWE Live México";
  if (eventName === "WWE Live: Kings of the Ring 2024") return "Kings of the Ring";
  return pleName || showName || eventName;
}

async function fetchDbDistinctions(pool) {
  const [distinctionRows] = await pool.query(`
    SELECT 
      d.id,
      d.category,
      d.title,
      d.match_id,
      d.tag_team_id,
      tt.name AS tag_team_name,
      YEAR(e.event_date) AS year,
      DATE_FORMAT(e.event_date, '%Y-%m-%d') AS date,
      e.id AS event_id,
      e.name AS event_name,
      p.name AS ple_name,
      s.name AS show_name
    FROM distinctions d
    JOIN matches m ON d.match_id = m.id
    JOIN events e ON m.event_id = e.id
    LEFT JOIN ples p ON e.ple_id = p.id
    LEFT JOIN shows s ON e.show_id = s.id
    LEFT JOIN tag_teams tt ON d.tag_team_id = tt.id
    ORDER BY d.display_order ASC, d.id ASC
  `);

  if (!distinctionRows || distinctionRows.length === 0) {
    return [];
  }

  const matchIds = Array.from(new Set(distinctionRows.map((d) => d.match_id)));

  const [mpRows] = await pool.query(
    `SELECT 
       mp.match_id,
       mp.wrestler_id,
       w.wrestler AS wrestler_name,
       w.country AS wrestler_country,
       mp.tag_team_id,
       tt.name AS tag_team_name,
       mp.interpreter_id,
       i.interpreter AS interpreter_name,
       i.nationality AS interpreter_country
     FROM match_participants mp
     JOIN wrestlers w ON mp.wrestler_id = w.id
     LEFT JOIN tag_teams tt ON mp.tag_team_id = tt.id
     LEFT JOIN interpreters i ON mp.interpreter_id = i.id
     WHERE mp.match_id IN (${matchIds.map(() => "?").join(",")}) AND mp.result = 'WIN'
     ORDER BY mp.match_id, mp.team_number, mp.wrestler_id`,
    matchIds
  );

  const winnersByMatch = new Map();
  for (const row of mpRows) {
    if (!winnersByMatch.has(row.match_id)) {
      winnersByMatch.set(row.match_id, []);
    }
    winnersByMatch.get(row.match_id).push(row);
  }

  return distinctionRows.map((row) => {
    const rawWinners = winnersByMatch.get(row.match_id) || [];
    const dateStr = row.date;

    const allParticipants = rawWinners.map((w) => {
      const canonicalName = w.wrestler_name || `Wrestler #${w.wrestler_id}`;
      return {
        wrestler: {
          id: w.wrestler_id,
          name: getWrestlerDisplayName(w.wrestler_id, canonicalName, dateStr),
          canonicalName,
          country: w.wrestler_country || null,
        },
        interpreter: w.interpreter_id
          ? {
              id: w.interpreter_id,
              name: w.interpreter_name,
              country: w.interpreter_country || null,
            }
          : null,
        tagTeamId: w.tag_team_id,
        tagTeamName: w.tag_team_name,
      };
    });

    const stablesMap = new Map();
    if (row.tag_team_id && row.tag_team_name) {
      stablesMap.set(row.tag_team_id, { id: row.tag_team_id, name: row.tag_team_name });
    }
    for (const w of rawWinners) {
      if (w.tag_team_id && w.tag_team_name && !stablesMap.has(w.tag_team_id)) {
        stablesMap.set(w.tag_team_id, { id: w.tag_team_id, name: w.tag_team_name });
      }
    }
    const stables = Array.from(stablesMap.values());

    const isWarGames = row.category === "WarGames";
    const displayWrestlers = isWarGames ? [] : allParticipants.map((p) => p.wrestler);
    const displayInterpreters = isWarGames
      ? []
      : allParticipants.map((p) => p.interpreter).filter(Boolean);

    return {
      id: row.id,
      year: row.year,
      category: row.category,
      title: row.title,
      matchId: row.match_id,
      eventId: row.event_id,
      date: dateStr,
      showLabel: formatShowLabel(row.ple_name, row.show_name, row.event_name),
      winner: {
        stables,
        inlineWrestlers: [],
        inlineInterpreters: [],
        displayWrestlers,
        displayInterpreters,
        allParticipants,
      },
    };
  });
}

export async function getDistinctionsData(pool, type) {
  const isWrestler = type === "wrestler";
  const items = await fetchDbDistinctions(pool);

  // Build Ranking List (Per Wrestler or Per Interpreter)
  const statsMap = new Map();

  for (const item of items) {
    const participants = item.winner?.allParticipants || [];
    for (const p of participants) {
      const mainEntity = isWrestler ? p.wrestler : p.interpreter;
      const otherEntity = isWrestler ? p.interpreter : p.wrestler;
      if (!mainEntity || !mainEntity.id) continue;

      const key = mainEntity.id;
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          id: mainEntity.id,
          name: isWrestler ? mainEntity.canonicalName || mainEntity.name : mainEntity.name,
          country: mainEntity.country,
          wins: 0,
          categoryCounts: {},
          yearCounts: {},
          breakdownMap: new Map(),
        });
      }

      const st = statsMap.get(key);
      st.wins += 1;
      st.categoryCounts[item.category] = (st.categoryCounts[item.category] || 0) + 1;
      st.yearCounts[item.year] = (st.yearCounts[item.year] || 0) + 1;

      if (otherEntity && otherEntity.id) {
        const otherName = !isWrestler
          ? otherEntity.canonicalName || otherEntity.name
          : otherEntity.name;
        const bd = st.breakdownMap.get(otherEntity.id) || {
          id: otherEntity.id,
          name: otherName,
          count: 0,
        };
        bd.count += 1;
        st.breakdownMap.set(otherEntity.id, bd);
      }
    }
  }

  const years = Array.from(new Set(items.map((d) => d.year))).sort((a, b) => a - b);

  const rankingList = Array.from(statsMap.values())
    .filter((item) => item.wins > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      country: item.country,
      wins: item.wins,
      categoryCounts: item.categoryCounts,
      yearCounts: item.yearCounts,
      breakdown: Array.from(item.breakdownMap.values()).sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name)
      ),
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      for (const cat of DISTINCTION_CATEGORIES) {
        const cA = a.categoryCounts[cat.id] || 0;
        const cB = b.categoryCounts[cat.id] || 0;
        if (cB !== cA) return cB - cA;
      }
      return a.name.localeCompare(b.name);
    })
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return {
    items,
    years,
    categories: DISTINCTION_CATEGORIES,
    rankingList,
  };
}

export async function getEntityDistinctions(pool, entityId, isInterpreter = false) {
  const targetId = Number(entityId);
  if (isNaN(targetId)) return [];

  const items = await fetchDbDistinctions(pool);
  const results = [];

  for (const item of items) {
    const winnerSide = item.winner;
    const wonEntry = winnerSide?.allParticipants.find((p) =>
      isInterpreter ? p.interpreter?.id === targetId : p.wrestler?.id === targetId
    );

    if (wonEntry) {
      const teammates = winnerSide.allParticipants
        .filter((p) =>
          isInterpreter ? p.interpreter?.id !== targetId : p.wrestler?.id !== targetId
        )
        .map((p) => (isInterpreter ? p.interpreter : p.wrestler))
        .filter(Boolean);

      results.push({
        id: item.id,
        year: item.year,
        category: item.category,
        title: item.title,
        date: item.date,
        eventId: item.eventId,
        showLabel: item.showLabel,
        stables: winnerSide.stables || [],
        teammates,
        asWrestler: isInterpreter ? wonEntry.wrestler : null,
        asInterpreter: !isInterpreter ? wonEntry.interpreter : null,
      });
    }
  }

  return results;
}
