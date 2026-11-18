// lib/records/getSpecialMatchesData.js
import { formatEventLogo } from "./getGeneralRecordsData.js";

function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(":").map(Number);
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  return 0;
}

function formatSeconds(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getWrestlerDisplayName(wrestlerId, canonicalName, dateStr) {
  if (wrestlerId === 8 && dateStr && dateStr <= "2025-10-26") {
    return "Dean Ambrose";
  }
  return canonicalName;
}

function sortAndRankCumulative(map) {
  return Array.from(map.values())
    .map((item) => ({
      id: item.id,
      name: item.name,
      country: item.country,
      appearances: item.appearances,
      wins: item.wins,
      timeSeconds: item.timeSeconds,
      timeFormatted: formatSeconds(item.timeSeconds),
      eliminations: item.eliminations,
      breakdown: Array.from(item.breakdownMap.values())
        .map((bd) => ({
          id: bd.id,
          name: bd.name,
          country: bd.country,
          count: bd.count,
          wins: bd.wins,
          timeSeconds: bd.timeSeconds,
          timeFormatted: formatSeconds(bd.timeSeconds),
          eliminations: bd.eliminations,
        }))
        .sort(
          (a, b) =>
            b.eliminations - a.eliminations ||
            b.timeSeconds - a.timeSeconds ||
            b.count - a.count ||
            a.name.localeCompare(b.name)
        ),
    }))
    .sort(
      (a, b) =>
        b.eliminations - a.eliminations ||
        b.timeSeconds - a.timeSeconds ||
        b.appearances - a.appearances ||
        a.name.localeCompare(b.name)
    )
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}

function accumulateCumulative(wrestlerMap, interpreterMap, entry) {
  const { wrestler, canonicalWrestlerName, interpreter, isWinner, timeSeconds, eliminations } = entry;

  if (wrestler?.id) {
    if (!wrestlerMap.has(wrestler.id)) {
      wrestlerMap.set(wrestler.id, {
        id: wrestler.id,
        name: canonicalWrestlerName || wrestler.name,
        country: wrestler.country || null,
        appearances: 0,
        wins: 0,
        timeSeconds: 0,
        eliminations: 0,
        breakdownMap: new Map(),
      });
    }
    const st = wrestlerMap.get(wrestler.id);
    st.appearances += 1;
    if (isWinner) st.wins += 1;
    st.timeSeconds += timeSeconds;
    st.eliminations += eliminations;

    if (interpreter?.id) {
      const bd = st.breakdownMap.get(interpreter.id) || {
        id: interpreter.id,
        name: interpreter.name,
        country: interpreter.country || null,
        count: 0,
        wins: 0,
        timeSeconds: 0,
        eliminations: 0,
      };
      bd.count += 1;
      if (isWinner) bd.wins += 1;
      bd.timeSeconds += timeSeconds;
      bd.eliminations += eliminations;
      st.breakdownMap.set(interpreter.id, bd);
    }
  }

  if (interpreter?.id) {
    if (!interpreterMap.has(interpreter.id)) {
      interpreterMap.set(interpreter.id, {
        id: interpreter.id,
        name: interpreter.name,
        country: interpreter.country || null,
        appearances: 0,
        wins: 0,
        timeSeconds: 0,
        eliminations: 0,
        breakdownMap: new Map(),
      });
    }
    const st = interpreterMap.get(interpreter.id);
    st.appearances += 1;
    if (isWinner) st.wins += 1;
    st.timeSeconds += timeSeconds;
    st.eliminations += eliminations;

    if (wrestler?.id) {
      const wName = canonicalWrestlerName || wrestler.name;
      const bd = st.breakdownMap.get(wrestler.id) || {
        id: wrestler.id,
        name: wName,
        country: wrestler.country || null,
        count: 0,
        wins: 0,
        timeSeconds: 0,
        eliminations: 0,
      };
      bd.count += 1;
      if (isWinner) bd.wins += 1;
      bd.timeSeconds += timeSeconds;
      bd.eliminations += eliminations;
      st.breakdownMap.set(wrestler.id, bd);
    }
  }
}

async function getRoyalRumbleData(pool) {
  const [entriesRows] = await pool.query(`
    SELECT
      r.match_id,
      r.wrestler_id,
      r.interpreter_id,
      r.entry_number,
      r.elimination_order,
      TIME_FORMAT(r.time_in, '%H:%i:%s') AS time_in,
      w.wrestler AS wrestler_name,
      w.country AS wrestler_country,
      i.interpreter AS interpreter_name,
      i.nationality AS interpreter_country,
      e.id AS event_id,
      e.name AS event_name,
      e.image_url AS event_image_url,
      e.ple_id,
      p.image_url AS ple_image_url,
      DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
      YEAR(e.event_date) AS year
    FROM royal_rumble_entries r
    JOIN matches m ON r.match_id = m.id
    JOIN events e ON m.event_id = e.id
    LEFT JOIN ples p ON e.ple_id = p.id
    JOIN wrestlers w ON r.wrestler_id = w.id
    LEFT JOIN interpreters i ON r.interpreter_id = i.id
    ORDER BY e.event_date DESC, m.match_order DESC, r.entry_number ASC
  `);

  const [elimRows] = await pool.query(`
    SELECT match_id, eliminated_id, eliminator_id
    FROM royal_rumble_eliminations
  `);

  const matchesById = new Map();
  for (const row of entriesRows) {
    if (!matchesById.has(row.match_id)) {
      matchesById.set(row.match_id, {
        matchId: row.match_id,
        eventId: row.event_id,
        eventName: row.event_name,
        eventLogo: formatEventLogo(row.event_image_url, row.ple_image_url, row.ple_id),
        eventDate: row.event_date,
        year: row.year,
        title: "Royal Rumble Match",
        isTagTeam: false,
        rawEntries: [],
      });
    }
    matchesById.get(row.match_id).rawEntries.push(row);
  }

  const elimsByMatch = new Map();
  for (const el of elimRows) {
    if (!elimsByMatch.has(el.match_id)) {
      elimsByMatch.set(el.match_id, []);
    }
    elimsByMatch.get(el.match_id).push(el);
  }

  const wrestlerMap = new Map();
  const interpreterMap = new Map();
  const matches = [];

  for (const match of matchesById.values()) {
    const matchElims = elimsByMatch.get(match.matchId) || [];
    const entryByWrestlerId = new Map();

    for (const r of match.rawEntries) {
      entryByWrestlerId.set(r.wrestler_id, {
        entryNumber: r.entry_number,
        wrestler: {
          id: r.wrestler_id,
          name: getWrestlerDisplayName(r.wrestler_id, r.wrestler_name, match.eventDate),
          canonicalName: r.wrestler_name,
          country: r.wrestler_country || null,
        },
        interpreter: r.interpreter_id
          ? {
              id: r.interpreter_id,
              name: r.interpreter_name,
              country: r.interpreter_country || null,
            }
          : null,
      });
    }

    const processedEntries = match.rawEntries.map((r) => {
      const self = entryByWrestlerId.get(r.wrestler_id);
      const eliminators = matchElims
        .filter((el) => el.eliminated_id === r.wrestler_id)
        .map((el) => entryByWrestlerId.get(el.eliminator_id))
        .filter(Boolean)
        .sort((a, b) => a.entryNumber - b.entryNumber);

      let eliminationNote = null;
      if (match.matchId === 679 && r.elimination_order !== null && eliminators.length === 0) {
        eliminationNote =
          r.elimination_order === 5 || r.elimination_order === 6
            ? "Self-eliminated"
            : "Golden Point";
      }

      const eliminations = matchElims.filter(
        (el) => el.eliminator_id === r.wrestler_id
      ).length;
      const timeSeconds = timeToSeconds(r.time_in);
      const isWinner = r.elimination_order === null;

      accumulateCumulative(wrestlerMap, interpreterMap, {
        wrestler: self.wrestler,
        canonicalWrestlerName: r.wrestler_name,
        interpreter: self.interpreter,
        isWinner,
        timeSeconds,
        eliminations,
      });

      return {
        entryNumber: r.entry_number,
        eliminationOrder: r.elimination_order,
        isWinner,
        wrestler: self.wrestler,
        interpreter: self.interpreter,
        eliminators,
        eliminationNote,
        timeSeconds,
        timeFormatted: formatSeconds(timeSeconds),
        eliminations,
      };
    });

    const maxTimeSeconds = Math.max(0, ...processedEntries.map((e) => e.timeSeconds));
    const maxEliminations = Math.max(0, ...processedEntries.map((e) => e.eliminations));

    matches.push({
      matchId: match.matchId,
      eventId: match.eventId,
      eventName: match.eventName,
      eventLogo: match.eventLogo,
      eventDate: match.eventDate,
      year: match.year,
      title: match.title,
      isTagTeam: false,
      entries: processedEntries.map((e) => ({
        ...e,
        isMaxTime: maxTimeSeconds > 0 && e.timeSeconds === maxTimeSeconds,
        isMaxEliminations: maxEliminations > 0 && e.eliminations === maxEliminations,
      })),
    });
  }

  const years = Array.from(new Set(matches.map((m) => m.year))).sort((a, b) => a - b);

  return {
    subType: "royal-rumble",
    years,
    matches,
    cumulative: {
      wrestler: sortAndRankCumulative(wrestlerMap),
      interpreter: sortAndRankCumulative(interpreterMap),
    },
  };
}

function getChamberMatchTitle(titleName, isTagTeam) {
  if (titleName) return `${titleName} Chamber Match`;
  if (isTagTeam) return "Tag Team Chamber Match";
  return "#1 Contender Chamber Match";
}

async function getEliminationChamberData(pool) {
  const [indivRows] = await pool.query(`
    SELECT
      ec.match_id,
      ec.entry_number,
      ec.elimination_order,
      ec.wrestler_id,
      ec.interpreter_id,
      ec.eliminated_by,
      TIME_FORMAT(ec.time_in, '%H:%i:%s') AS time_in,
      ec.eliminations,
      w.wrestler AS wrestler_name,
      w.country AS wrestler_country,
      i.interpreter AS interpreter_name,
      i.nationality AS interpreter_country,
      m.match_order,
      m.championship_id,
      c.title_name,
      e.id AS event_id,
      e.name AS event_name,
      e.image_url AS event_image_url,
      e.ple_id,
      p.image_url AS ple_image_url,
      DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
      YEAR(e.event_date) AS year
    FROM elimination_chamber_individual_entries ec
    JOIN matches m ON ec.match_id = m.id
    JOIN events e ON m.event_id = e.id
    LEFT JOIN ples p ON e.ple_id = p.id
    LEFT JOIN championships c ON m.championship_id = c.id
    JOIN wrestlers w ON ec.wrestler_id = w.id
    LEFT JOIN interpreters i ON ec.interpreter_id = i.id
    ORDER BY e.event_date DESC, m.match_order DESC, ec.entry_number ASC
  `);

  const [tagEntryRows] = await pool.query(`
    SELECT
      et.match_id,
      et.entry_number,
      et.elimination_order,
      et.tag_team_id,
      et.eliminated_by_tt,
      TIME_FORMAT(et.time_in, '%H:%i:%s') AS time_in,
      et.eliminations,
      tt.name AS tag_team_name,
      m.match_order,
      m.championship_id,
      c.title_name,
      e.id AS event_id,
      e.name AS event_name,
      e.image_url AS event_image_url,
      e.ple_id,
      p.image_url AS ple_image_url,
      DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
      YEAR(e.event_date) AS year
    FROM elimination_chamber_tag_entries et
    JOIN matches m ON et.match_id = m.id
    JOIN events e ON m.event_id = e.id
    LEFT JOIN ples p ON e.ple_id = p.id
    LEFT JOIN championships c ON m.championship_id = c.id
    JOIN tag_teams tt ON et.tag_team_id = tt.id
    ORDER BY e.event_date DESC, m.match_order DESC, et.entry_number ASC
  `);

  const [tagMemberRows] = await pool.query(`
    SELECT
      tm.match_id,
      tm.entry_number,
      tm.wrestler_id,
      tm.interpreter_id,
      w.wrestler AS wrestler_name,
      w.country AS wrestler_country,
      i.interpreter AS interpreter_name,
      i.nationality AS interpreter_country
    FROM elimination_chamber_tag_members tm
    JOIN wrestlers w ON tm.wrestler_id = w.id
    LEFT JOIN interpreters i ON tm.interpreter_id = i.id
    ORDER BY tm.match_id, tm.entry_number, tm.wrestler_id
  `);

  const indivMatchesById = new Map();
  for (const row of indivRows) {
    if (!indivMatchesById.has(row.match_id)) {
      indivMatchesById.set(row.match_id, {
        matchId: row.match_id,
        eventId: row.event_id,
        eventName: row.event_name,
        eventLogo: formatEventLogo(row.event_image_url, row.ple_image_url, row.ple_id),
        eventDate: row.event_date,
        matchOrder: row.match_order,
        year: row.year,
        title: getChamberMatchTitle(row.title_name, false),
        isTagTeam: false,
        rawEntries: [],
      });
    }
    indivMatchesById.get(row.match_id).rawEntries.push(row);
  }

  const tagMembersByKey = new Map();
  for (const m of tagMemberRows) {
    const key = `${m.match_id}_${m.entry_number}`;
    if (!tagMembersByKey.has(key)) {
      tagMembersByKey.set(key, []);
    }
    tagMembersByKey.get(key).push(m);
  }

  const tagMatchesById = new Map();
  for (const row of tagEntryRows) {
    if (!tagMatchesById.has(row.match_id)) {
      tagMatchesById.set(row.match_id, {
        matchId: row.match_id,
        eventId: row.event_id,
        eventName: row.event_name,
        eventLogo: formatEventLogo(row.event_image_url, row.ple_image_url, row.ple_id),
        eventDate: row.event_date,
        matchOrder: row.match_order,
        year: row.year,
        title: getChamberMatchTitle(row.title_name, true),
        isTagTeam: true,
        rawEntries: [],
      });
    }
    tagMatchesById.get(row.match_id).rawEntries.push(row);
  }

  const wrestlerMap = new Map();
  const interpreterMap = new Map();
  const matches = [];

  for (const match of indivMatchesById.values()) {
    const entryByWrestlerId = new Map();
    for (const r of match.rawEntries) {
      entryByWrestlerId.set(r.wrestler_id, {
        entryNumber: r.entry_number,
        wrestler: {
          id: r.wrestler_id,
          name: getWrestlerDisplayName(r.wrestler_id, r.wrestler_name, match.eventDate),
          canonicalName: r.wrestler_name,
          country: r.wrestler_country || null,
        },
        interpreter: r.interpreter_id
          ? {
              id: r.interpreter_id,
              name: r.interpreter_name,
              country: r.interpreter_country || null,
            }
          : null,
      });
    }

    const processedEntries = match.rawEntries.map((r) => {
      const self = entryByWrestlerId.get(r.wrestler_id);
      const eliminatorEntry = r.eliminated_by ? entryByWrestlerId.get(r.eliminated_by) : null;
      const timeSeconds = timeToSeconds(r.time_in);
      const eliminations = Number(r.eliminations) || 0;
      const isWinner = r.elimination_order === null;

      accumulateCumulative(wrestlerMap, interpreterMap, {
        wrestler: self.wrestler,
        canonicalWrestlerName: r.wrestler_name,
        interpreter: self.interpreter,
        isWinner,
        timeSeconds,
        eliminations,
      });

      return {
        entryNumber: r.entry_number,
        eliminationOrder: r.elimination_order,
        isWinner,
        wrestler: self.wrestler,
        interpreter: self.interpreter,
        eliminators: eliminatorEntry ? [eliminatorEntry] : [],
        eliminationNote: null,
        timeSeconds,
        timeFormatted: formatSeconds(timeSeconds),
        eliminations,
      };
    });

    const maxTimeSeconds = Math.max(0, ...processedEntries.map((e) => e.timeSeconds));
    const maxEliminations = Math.max(0, ...processedEntries.map((e) => e.eliminations));

    matches.push({
      matchId: match.matchId,
      eventId: match.eventId,
      eventName: match.eventName,
      eventLogo: match.eventLogo,
      eventDate: match.eventDate,
      matchOrder: match.matchOrder,
      year: match.year,
      title: match.title,
      isTagTeam: false,
      entries: processedEntries.map((e) => ({
        ...e,
        isMaxTime: maxTimeSeconds > 0 && e.timeSeconds === maxTimeSeconds,
        isMaxEliminations: maxEliminations > 0 && e.eliminations === maxEliminations,
      })),
    });
  }

  for (const match of tagMatchesById.values()) {
    const teamById = new Map();
    for (const r of match.rawEntries) {
      const rawMembers = tagMembersByKey.get(`${match.matchId}_${r.entry_number}`) || [];
      const members = rawMembers.map((m) => ({
        wrestler: {
          id: m.wrestler_id,
          name: getWrestlerDisplayName(m.wrestler_id, m.wrestler_name, match.eventDate),
          canonicalName: m.wrestler_name,
          country: m.wrestler_country || null,
        },
        interpreter: m.interpreter_id
          ? {
              id: m.interpreter_id,
              name: m.interpreter_name,
              country: m.interpreter_country || null,
            }
          : null,
      }));
      teamById.set(r.tag_team_id, {
        tagTeam: { id: r.tag_team_id, name: r.tag_team_name },
        members,
      });
    }

    const processedEntries = match.rawEntries.map((r) => {
      const teamData = teamById.get(r.tag_team_id);
      const elimTeamData = r.eliminated_by_tt ? teamById.get(r.eliminated_by_tt) : null;
      const timeSeconds = timeToSeconds(r.time_in);
      const eliminations = Number(r.eliminations) || 0;
      const isWinner = r.elimination_order === null;

      for (const member of teamData.members) {
        accumulateCumulative(wrestlerMap, interpreterMap, {
          wrestler: member.wrestler,
          canonicalWrestlerName: member.wrestler.canonicalName,
          interpreter: member.interpreter,
          isWinner,
          timeSeconds,
          eliminations,
        });
      }

      return {
        entryNumber: r.entry_number,
        eliminationOrder: r.elimination_order,
        isWinner,
        tagTeam: teamData.tagTeam,
        members: teamData.members,
        eliminatedByTeam: elimTeamData || null,
        timeSeconds,
        timeFormatted: formatSeconds(timeSeconds),
        eliminations,
      };
    });

    const maxTimeSeconds = Math.max(0, ...processedEntries.map((e) => e.timeSeconds));
    const maxEliminations = Math.max(0, ...processedEntries.map((e) => e.eliminations));

    matches.push({
      matchId: match.matchId,
      eventId: match.eventId,
      eventName: match.eventName,
      eventLogo: match.eventLogo,
      eventDate: match.eventDate,
      matchOrder: match.matchOrder,
      year: match.year,
      title: match.title,
      isTagTeam: true,
      entries: processedEntries.map((e) => ({
        ...e,
        isMaxTime: maxTimeSeconds > 0 && e.timeSeconds === maxTimeSeconds,
        isMaxEliminations: maxEliminations > 0 && e.eliminations === maxEliminations,
      })),
    });
  }

  matches.sort((a, b) => {
    if (a.eventDate !== b.eventDate) return b.eventDate.localeCompare(a.eventDate);
    return (b.matchOrder || 0) - (a.matchOrder || 0);
  });

  const years = Array.from(new Set(matches.map((m) => m.year))).sort((a, b) => a - b);

  return {
    subType: "elimination-chamber",
    years,
    matches,
    cumulative: {
      wrestler: sortAndRankCumulative(wrestlerMap),
      interpreter: sortAndRankCumulative(interpreterMap),
    },
  };
}

export async function getSpecialMatchesData(pool, subType) {
  if (subType === "elimination-chamber") {
    return getEliminationChamberData(pool);
  }
  return getRoyalRumbleData(pool);
}
