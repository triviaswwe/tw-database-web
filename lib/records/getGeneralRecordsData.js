// lib/records/getGeneralRecordsData.js

export const BLOB_BASE_URL = "https://ljejfdquofuxccca.public.blob.vercel-storage.com";

export const TITLE_PLATES = {
  "Undisputed WWE Championship": `${BLOB_BASE_URL}/champions/uwctitle.png`,
  "World Heavyweight Championship": `${BLOB_BASE_URL}/champions/whctitle.png`,
  "Intercontinental Championship": `${BLOB_BASE_URL}/champions/ictitle.png`,
  "United States Championship": `${BLOB_BASE_URL}/champions/ustitle.png`,
  "World Tag Team Championship": `${BLOB_BASE_URL}/champions/wtttitle.png`,
  "NXT Championship": `${BLOB_BASE_URL}/champions/nxttitle.png`,
  "Speed Championship": `${BLOB_BASE_URL}/speed.png`,
  "Crown Jewel Championship": `${BLOB_BASE_URL}/champions/cjtitle.png`,
};

export const PLE_IMAGE_MAP = {
  4: `${BLOB_BASE_URL}/tlc.png`,
  6: `${BLOB_BASE_URL}/noc.png`,
  7: `${BLOB_BASE_URL}/mitb.png`,
  11: `${BLOB_BASE_URL}/bb.png`,
  12: `${BLOB_BASE_URL}/snme.png`,
  13: `${BLOB_BASE_URL}/payback.png`,
  14: `${BLOB_BASE_URL}/fastlane.png`,
  17: `${BLOB_BASE_URL}/bib.png`,
  18: `${BLOB_BASE_URL}/takeover.png`,
};

export const formatEventLogo = (imageUrl, pleImageUrl, pleId) => {
  const chosen = imageUrl || pleImageUrl || (pleId && PLE_IMAGE_MAP[pleId] ? PLE_IMAGE_MAP[pleId] : null) || null;
  if (!chosen) return null;
  if (chosen.startsWith("http://") || chosen.startsWith("https://")) return chosen;
  return `${BLOB_BASE_URL}/${chosen.replace(/^\/+/, "")}`;
};

export const CATEGORIES = [
  { type: "main", label: "Maincard championships" },
  { type: "mid", label: "Midcard championships" },
  { type: "tag", label: "Tag team championships" },
  { type: "low", label: "Lowcard championships" },
  { type: "special", label: "Special championships" },
];

export async function getGeneralRecordsData(pool, type) {
  const isWrestler = type === "wrestler";

  let matchesRows, winsRows, topStatsRows, longestReignsRows, mostDefensesRows, championshipsRows, totalChampionshipsRows, pleAppearancesRows;

  [championshipsRows] = await pool.query(`
    SELECT 
      c.id, 
      c.title_name, 
      c.type,
      COALESCE(
        (SELECT ct.image_url FROM championship_titles ct WHERE ct.championship_id = c.id AND ct.end_date IS NULL ORDER BY ct.start_date DESC LIMIT 1),
        (SELECT ct.image_url FROM championship_titles ct WHERE ct.championship_id = c.id ORDER BY ct.start_date DESC LIMIT 1)
      ) AS image_url
    FROM championships c
    WHERE c.show_in_ui = 1 AND c.type IS NOT NULL
    ORDER BY 
      CASE c.type
        WHEN 'main' THEN 1
        WHEN 'mid' THEN 2
        WHEN 'tag' THEN 3
        WHEN 'low' THEN 4
        WHEN 'special' THEN 5
        ELSE 6
      END ASC, 
      c.id ASC
  `);

  if (isWrestler) {
    [matchesRows] = await pool.query(`
      SELECT w.id, w.wrestler AS name, w.country, COUNT(NULLIF(mp.result, '')) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'name', IFNULL(i.interpreter, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT interpreter_id, COUNT(NULLIF(result, '')) as cnt
            FROM match_participants
            WHERE wrestler_id = w.id AND interpreter_id IS NOT NULL
            GROUP BY interpreter_id
          ) sub
          LEFT JOIN interpreters i ON sub.interpreter_id = i.id
        ) AS breakdown
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      GROUP BY w.id, w.wrestler, w.country
      ORDER BY total DESC
      LIMIT 10
    `);

    [winsRows] = await pool.query(`
      SELECT w.id, w.wrestler AS name, w.country, SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'name', IFNULL(i.interpreter, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT interpreter_id, SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as cnt
            FROM match_participants
            WHERE wrestler_id = w.id AND interpreter_id IS NOT NULL
            GROUP BY interpreter_id
            HAVING cnt > 0
          ) sub
          LEFT JOIN interpreters i ON sub.interpreter_id = i.id
        ) AS breakdown
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      GROUP BY w.id, w.wrestler, w.country
      ORDER BY total DESC
      LIMIT 10
    `);

    [topStatsRows] = await pool.query(`
      SELECT 
        w.id, w.wrestler AS name, w.country,
        COUNT(NULLIF(mp.result, '')) AS total_matches,
        SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
        ROUND((SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) * 100.0) / COUNT(NULLIF(mp.result, '')), 2) AS win_percentage
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      GROUP BY w.id, w.wrestler, w.country
      ORDER BY wins DESC, win_percentage DESC
      LIMIT 10
    `);

    [longestReignsRows] = await pool.query(`
      SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
          cr.wrestler_id, w.wrestler AS entity_name, w.country, cr.tag_team_id, tt.name AS tag_team_name, c.title_name, ct.image_url,
          (SELECT COUNT(DISTINCT m.id) FROM matches m JOIN events e ON e.id = m.event_id AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)
           JOIN match_participants mp ON mp.match_id = m.id AND ((cr.wrestler_id IS NOT NULL AND mp.wrestler_id = cr.wrestler_id) OR (cr.tag_team_id IS NOT NULL AND mp.tag_team_id = cr.tag_team_id))
           WHERE m.championship_id = cr.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL) AS defenses_count
      FROM championship_reigns cr 
      LEFT JOIN wrestlers w ON cr.wrestler_id = w.id 
      LEFT JOIN tag_teams tt ON cr.tag_team_id = tt.id 
      JOIN championships c ON cr.championship_id = c.id
      LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND cr.won_date >= ct.start_date AND (cr.won_date <= ct.end_date OR ct.end_date IS NULL)
      WHERE (cr.wrestler_id IS NOT NULL OR cr.tag_team_id IS NOT NULL)
        AND c.id != 8
      ORDER BY defenses_count DESC, days_held DESC LIMIT 10
    `);

    [mostDefensesRows] = await pool.query(`
      SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
          cr.wrestler_id, w.wrestler AS entity_name, w.country, cr.tag_team_id, tt.name AS tag_team_name, c.title_name, ct.image_url,
          (SELECT COUNT(DISTINCT m.id) FROM matches m JOIN events e ON e.id = m.event_id AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)
           JOIN match_participants mp ON mp.match_id = m.id AND ((cr.wrestler_id IS NOT NULL AND mp.wrestler_id = cr.wrestler_id) OR (cr.tag_team_id IS NOT NULL AND mp.tag_team_id = cr.tag_team_id))
           WHERE m.championship_id = cr.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL) AS defenses_count
      FROM championship_reigns cr 
      LEFT JOIN wrestlers w ON cr.wrestler_id = w.id 
      LEFT JOIN tag_teams tt ON cr.tag_team_id = tt.id 
      JOIN championships c ON cr.championship_id = c.id
      LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND cr.won_date >= ct.start_date AND (cr.won_date <= ct.end_date OR ct.end_date IS NULL)
      WHERE (cr.wrestler_id IS NOT NULL OR cr.tag_team_id IS NOT NULL)
        AND c.id != 8
      ORDER BY defenses_count DESC, days_held DESC LIMIT 10
    `);

    [totalChampionshipsRows] = await pool.query(`
      SELECT 
        w.id,
        w.wrestler AS name,
        w.country,
        c.id AS championship_id,
        COUNT(DISTINCT r_data.reign_id) AS count
      FROM (
        SELECT cr.id AS reign_id, cr.wrestler_id, cr.championship_id
        FROM championship_reigns cr
        WHERE cr.wrestler_id IS NOT NULL
        UNION
        SELECT rm.reign_id, rm.wrestler_id, cr.championship_id
        FROM reign_members rm
        JOIN championship_reigns cr ON cr.id = rm.reign_id
        WHERE rm.wrestler_id IS NOT NULL
      ) AS r_data
      JOIN wrestlers w ON w.id = r_data.wrestler_id
      JOIN championships c ON c.id = r_data.championship_id
      WHERE c.show_in_ui = 1 AND c.type IS NOT NULL
      GROUP BY w.id, w.wrestler, w.country, c.id
    `);

    [pleAppearancesRows] = await pool.query(`
      SELECT 
        w.id,
        w.wrestler AS name,
        w.country,
        e.id AS event_id,
        e.name AS event_name,
        e.event_date,
        e.image_url AS event_image_url,
        e.ple_id,
        p.image_url AS ple_image_url,
        mp.interpreter_id AS other_id,
        i.interpreter AS other_name
      FROM match_participants mp
      JOIN matches m ON mp.match_id = m.id
      JOIN events e ON m.event_id = e.id
      JOIN wrestlers w ON mp.wrestler_id = w.id
      LEFT JOIN ples p ON e.ple_id = p.id
      LEFT JOIN interpreters i ON mp.interpreter_id = i.id
      WHERE e.ple_id IS NOT NULL 
        AND e.ple_id != 0 
        AND e.ple_id != 18
        AND mp.result IS NOT NULL 
        AND mp.result != ''
      GROUP BY w.id, w.wrestler, w.country, e.id, e.name, e.event_date, e.image_url, e.ple_id, p.image_url, mp.interpreter_id, i.interpreter
      ORDER BY e.event_date ASC, e.id ASC
    `);
  } else {
    [matchesRows] = await pool.query(`
      SELECT i.id, i.interpreter AS name, i.nationality AS country, COUNT(NULLIF(mp.result, '')) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', w.id, 'name', IFNULL(w.wrestler, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT wrestler_id, COUNT(NULLIF(result, '')) as cnt
            FROM match_participants
            WHERE interpreter_id = i.id
            GROUP BY wrestler_id
          ) sub
          LEFT JOIN wrestlers w ON sub.wrestler_id = w.id
        ) AS breakdown
      FROM match_participants mp
      JOIN interpreters i ON mp.interpreter_id = i.id
      GROUP BY i.id, i.interpreter, i.nationality
      ORDER BY total DESC
      LIMIT 10
    `);

    [winsRows] = await pool.query(`
      SELECT i.id, i.interpreter AS name, i.nationality AS country, SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', w.id, 'name', IFNULL(w.wrestler, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT wrestler_id, SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as cnt
            FROM match_participants
            WHERE interpreter_id = i.id
            GROUP BY wrestler_id
            HAVING cnt > 0
          ) sub
          LEFT JOIN wrestlers w ON sub.wrestler_id = w.id
        ) AS breakdown
      FROM match_participants mp
      JOIN interpreters i ON mp.interpreter_id = i.id
      GROUP BY i.id, i.interpreter, i.nationality
      ORDER BY total DESC
      LIMIT 10
    `);

    [topStatsRows] = await pool.query(`
      SELECT 
        i.id, i.interpreter AS name, i.nationality AS country,
        COUNT(NULLIF(mp.result, '')) AS total_matches,
        SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
        ROUND((SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) * 100.0) / COUNT(NULLIF(mp.result, '')), 2) AS win_percentage
      FROM match_participants mp
      JOIN interpreters i ON mp.interpreter_id = i.id
      GROUP BY i.id, i.interpreter, i.nationality
      ORDER BY wins DESC, win_percentage DESC
      LIMIT 10
    `);

    [longestReignsRows] = await pool.query(`
      SELECT 
          base.reign_id, base.won_date, base.lost_date, MAX(base.days_held) AS days_held,
          base.interpreter_id, base.entity_name, base.country, base.title_name, base.image_url,
          (
              SELECT COUNT(DISTINCT m.id)
              FROM matches m
              JOIN events e ON e.id = m.event_id AND e.event_date >= base.won_date AND (base.lost_date IS NULL OR e.event_date <= base.lost_date)
              JOIN match_participants mp ON mp.match_id = m.id AND mp.interpreter_id = base.interpreter_id
              WHERE m.championship_id = base.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL
          ) AS defenses_count
      FROM (
          SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
              cr.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, ct.image_url, cr.championship_id
          FROM championship_reigns cr
          JOIN interpreters i ON i.id = cr.interpreter_id
          JOIN championships c ON cr.championship_id = c.id
          LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND cr.won_date >= ct.start_date AND (cr.won_date <= ct.end_date OR ct.end_date IS NULL)
          WHERE cr.interpreter_id IS NOT NULL AND c.id != 8
          UNION
          SELECT cr.id AS reign_id, rm.start_date AS won_date, rm.end_date AS lost_date, DATEDIFF(IFNULL(rm.end_date, UTC_DATE()), rm.start_date) AS days_held,
              rm.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, ct.image_url, cr.championship_id
          FROM reign_members rm
          JOIN championship_reigns cr ON cr.id = rm.reign_id
          JOIN interpreters i ON i.id = rm.interpreter_id
          JOIN championships c ON cr.championship_id = c.id
          LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND rm.start_date >= ct.start_date AND (rm.start_date <= ct.end_date OR ct.end_date IS NULL)
          WHERE rm.interpreter_id IS NOT NULL AND c.id != 8
      ) AS base
      GROUP BY base.reign_id, base.interpreter_id, base.won_date, base.lost_date, base.entity_name, base.country, base.title_name, base.image_url, base.championship_id
      ORDER BY defenses_count DESC, days_held DESC LIMIT 10
    `);

    [mostDefensesRows] = await pool.query(`
      SELECT 
          base.reign_id, base.won_date, base.lost_date, MAX(base.days_held) AS days_held,
          base.interpreter_id, base.entity_name, base.country, base.title_name, base.image_url,
          (
              SELECT COUNT(DISTINCT m.id)
              FROM matches m
              JOIN events e ON e.id = m.event_id AND e.event_date >= base.won_date AND (base.lost_date IS NULL OR e.event_date <= base.lost_date)
              JOIN match_participants mp ON mp.match_id = m.id AND mp.interpreter_id = base.interpreter_id
              WHERE m.championship_id = base.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL
          ) AS defenses_count
      FROM (
          SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
              cr.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, ct.image_url, cr.championship_id
          FROM championship_reigns cr
          JOIN interpreters i ON i.id = cr.interpreter_id
          JOIN championships c ON cr.championship_id = c.id
          LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND cr.won_date >= ct.start_date AND (cr.won_date <= ct.end_date OR ct.end_date IS NULL)
          WHERE cr.interpreter_id IS NOT NULL AND c.id != 8
          UNION
          SELECT cr.id AS reign_id, rm.start_date AS won_date, rm.end_date AS lost_date, DATEDIFF(IFNULL(rm.end_date, UTC_DATE()), rm.start_date) AS days_held,
              rm.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, ct.image_url, cr.championship_id
          FROM reign_members rm
          JOIN championship_reigns cr ON cr.id = rm.reign_id
          JOIN interpreters i ON i.id = rm.interpreter_id
          JOIN championships c ON cr.championship_id = c.id
          LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND rm.start_date >= ct.start_date AND (rm.start_date <= ct.end_date OR ct.end_date IS NULL)
          WHERE rm.interpreter_id IS NOT NULL AND c.id != 8
      ) AS base
      GROUP BY base.reign_id, base.interpreter_id, base.won_date, base.lost_date, base.entity_name, base.country, base.title_name, base.image_url, base.championship_id
      ORDER BY defenses_count DESC, days_held DESC LIMIT 10
    `);

    [totalChampionshipsRows] = await pool.query(`
      SELECT 
        i.id,
        i.interpreter AS name,
        i.nationality AS country,
        c.id AS championship_id,
        COUNT(DISTINCT r_data.reign_id) AS count
      FROM (
        SELECT cr.id AS reign_id, cr.interpreter_id, cr.championship_id
        FROM championship_reigns cr
        WHERE cr.interpreter_id IS NOT NULL
        UNION
        SELECT rm.reign_id, rm.interpreter_id, cr.championship_id
        FROM reign_members rm
        JOIN championship_reigns cr ON cr.id = rm.reign_id
        WHERE rm.interpreter_id IS NOT NULL
      ) AS r_data
      JOIN interpreters i ON i.id = r_data.interpreter_id
      JOIN championships c ON c.id = r_data.championship_id
      WHERE c.show_in_ui = 1 AND c.type IS NOT NULL
      GROUP BY i.id, i.interpreter, i.nationality, c.id
    `);

    [pleAppearancesRows] = await pool.query(`
      SELECT 
        i.id,
        i.interpreter AS name,
        i.nationality AS country,
        e.id AS event_id,
        e.name AS event_name,
        e.event_date,
        e.image_url AS event_image_url,
        e.ple_id,
        p.image_url AS ple_image_url,
        mp.wrestler_id AS other_id,
        w.wrestler AS other_name
      FROM match_participants mp
      JOIN matches m ON mp.match_id = m.id
      JOIN events e ON m.event_id = e.id
      JOIN interpreters i ON mp.interpreter_id = i.id
      LEFT JOIN ples p ON e.ple_id = p.id
      LEFT JOIN wrestlers w ON mp.wrestler_id = w.id
      WHERE e.ple_id IS NOT NULL 
        AND e.ple_id != 0 
        AND e.ple_id != 18
        AND mp.result IS NOT NULL 
        AND mp.result != ''
      GROUP BY i.id, i.interpreter, i.nationality, e.id, e.name, e.event_date, e.image_url, e.ple_id, p.image_url, mp.wrestler_id, w.wrestler
      ORDER BY e.event_date ASC, e.id ASC
    `);
  }

  const processBreakdown = (rows) => rows.map(r => {
    let bd = r.breakdown;
    if (typeof bd === 'string') {
      try { bd = JSON.parse(bd); } catch (e) { bd = []; }
    }
    return { ...r, breakdown: bd || [] };
  });

  const matchesList = processBreakdown(matchesRows);
  const winsList = processBreakdown(winsRows);

  const [historyRows] = await pool.query(`
    SELECT m.id AS match_id, e.id AS event_id, e.name AS event_name, e.event_date,
      (
        SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'wrestler_id', mp.wrestler_id, 'wrestler', w.wrestler, 'country', w.country, 
          'team_number', mp.team_number, 'result', mp.result,
          'interpreter_id', mp.interpreter_id, 'interpreter', i.interpreter, 'interpreter_country', i.nationality
        ))
        FROM match_participants mp 
        JOIN wrestlers w ON mp.wrestler_id = w.id
        LEFT JOIN interpreters i ON mp.interpreter_id = i.id
        WHERE mp.match_id = m.id
      ) AS participants,
      (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number', mts.team_number, 'score', mts.score))
        FROM match_team_scores mts WHERE mts.match_id = m.id
      ) AS scores
    FROM matches m JOIN events e ON m.event_id = e.id
    ORDER BY e.event_date ASC, m.match_order ASC
  `);

  const buildStreaks = (isInterpreter = false) => {
    const allWins = [];
    const allUndefs = [];
    let counter = 0;
    const stateMap = new Map();

    for (const match of historyRows) {
      let parts = match.participants;
      let scores = match.scores;
      if (typeof parts === "string") parts = JSON.parse(parts);
      if (typeof scores === "string") scores = JSON.parse(scores);
      parts = parts || [];
      scores = scores || [];

      const scoreMap = scores.reduce((acc, s) => { acc[s.team_number] = s.score; return acc; }, {});
      const entitiesInMatch = {};

      for (const p of parts) {
        const id = isInterpreter ? p.interpreter_id : p.wrestler_id;
        if (!id) continue;
        if (!entitiesInMatch[id]) {
          entitiesInMatch[id] = {
            id: id, name: isInterpreter ? p.interpreter : p.wrestler,
            country: isInterpreter ? p.interpreter_country : p.country,
            team_number: p.team_number, result: p.result
          };
        }
      }

      for (const entityId in entitiesInMatch) {
        const e = entitiesInMatch[entityId];
        if (!stateMap.has(e.id)) {
          stateMap.set(e.id, {
            entityId: e.id, name: e.name, country: e.country,
            winCount: 0, winMatches: [], undefCount: 0, undefMatches: [], undefStartDate: null,
          });
        }
        const st = stateMap.get(e.id);
        const myTeam = e.team_number;
        const myTeamMembers = parts.filter(x => x.team_number === myTeam);
        let partners = [];
        
        if (isInterpreter) {
          const repWrestler = myTeamMembers.find(x => x.interpreter_id === e.id);
          if (repWrestler) partners = myTeamMembers.filter(x => x.wrestler_id !== repWrestler.wrestler_id);
        } else {
          partners = myTeamMembers.filter(x => x.wrestler_id !== e.id);
        }
        
        const opponents = parts.filter(x => x.team_number !== myTeam);
        let scoreStr = null;
        const hasScores = Object.keys(scoreMap).length > 0;
        if (hasScores && scoreMap[myTeam] != null) {
          const oppTeamNumbers = [...new Set(opponents.map(x => x.team_number))];
          if (oppTeamNumbers.length === 1 && scoreMap[oppTeamNumbers[0]] != null) {
            scoreStr = `${scoreMap[myTeam]}-${scoreMap[oppTeamNumbers[0]]}`;
          } else if (oppTeamNumbers.length > 1) {
            scoreStr = `${scoreMap[myTeam]}-` + oppTeamNumbers.map((tn) => scoreMap[tn] ?? 0).join("-");
          }
        }

        const matchDetail = {
          event_id: match.event_id, event_name: match.event_name, result: e.result, scoreStr,
          isTagTeamChampionship: false,
          partners: partners.map(x => ({ id: x.wrestler_id, name: x.wrestler })),
          opponents: opponents.map(x => ({ id: x.wrestler_id, name: x.wrestler })),
        };
        const matchDate = new Date(match.event_date);

        if (e.result === "WIN") {
          st.winCount++;
          st.winMatches.push(matchDetail);
        } else {
          if (st.winCount > 0) {
            allWins.push({
              id: `win_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
              count: st.winCount, matches: [...st.winMatches], streakBreaker: matchDetail,
            });
            st.winCount = 0; st.winMatches = [];
          }
        }

        if (e.result === "WIN" || e.result === "DRAW") {
          if (st.undefCount === 0) st.undefStartDate = matchDate;
          st.undefCount++;
          st.undefMatches.push(matchDetail);
        } else if (e.result === "LOSS") {
          if (st.undefCount > 0) {
            const days = Math.floor((matchDate - st.undefStartDate) / (1000 * 60 * 60 * 24));
            allUndefs.push({
              id: `undef_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
              count: st.undefCount, matches: [...st.undefMatches], days: days, streakBreaker: matchDetail,
            });
            st.undefCount = 0; st.undefMatches = []; st.undefStartDate = null;
          }
        }
      }
    }

    const now = new Date();
    for (const st of stateMap.values()) {
      if (st.winCount > 0) {
        allWins.push({
          id: `win_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
          count: st.winCount, matches: [...st.winMatches], streakBreaker: null,
        });
      }
      if (st.undefCount > 0) {
        const days = Math.floor((now - st.undefStartDate) / (1000 * 60 * 60 * 24));
        allUndefs.push({
          id: `undef_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
          count: st.undefCount, matches: [...st.undefMatches], days: days, streakBreaker: null,
        });
      }
    }

    return {
      wins: allWins.sort((a, b) => b.count - a.count).slice(0, 10),
      undefs: allUndefs.sort((a, b) => b.count - a.count).slice(0, 10)
    };
  };

  const streaks = buildStreaks(!isWrestler);

  const reignIdsSet = new Set([
    ...longestReignsRows.map((r) => r.reign_id), ...mostDefensesRows.map((r) => r.reign_id),
  ]);
  const reignIdsArray = Array.from(reignIdsSet);

  let globalDefenses = [];
  if (reignIdsArray.length > 0) {
    const placeholders = reignIdsArray.map(() => "?").join(",");
    const [defenseMatches] = await pool.query(`
      SELECT cr.id AS reign_id, m.id AS match_id, m.title_changed, e.id AS event_id, e.name AS event_name,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('wrestler_id', mp.wrestler_id, 'wrestler', w2.wrestler, 'country', w2.country, 'team_number', mp.team_number, 'result', mp.result, 'tag_team_id', mp.tag_team_id, 'interpreter_id', mp.interpreter_id))
           FROM match_participants mp JOIN wrestlers w2 ON w2.id = mp.wrestler_id WHERE mp.match_id = m.id) AS participants,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number', mts.team_number, 'score', mts.score))
           FROM match_team_scores mts WHERE mts.match_id = m.id) AS scores,
          cr.wrestler_id AS champ_wrestler_id, cr.tag_team_id AS champ_tag_team_id, cr.interpreter_id AS champ_interpreter_id
      FROM matches m JOIN events e ON m.event_id = e.id
      JOIN championship_reigns cr ON m.championship_id = cr.championship_id AND m.title_match = 1 AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date <= cr.lost_date)
      JOIN match_participants mp_champ ON mp_champ.match_id = m.id AND (
          (cr.wrestler_id IS NOT NULL AND mp_champ.wrestler_id = cr.wrestler_id) OR
          (cr.tag_team_id IS NOT NULL AND mp_champ.tag_team_id = cr.tag_team_id) OR
          (cr.interpreter_id IS NOT NULL AND mp_champ.interpreter_id = cr.interpreter_id)
      )
      WHERE cr.id IN (${placeholders})
      GROUP BY cr.id, m.id, m.title_changed, e.id, e.name, cr.wrestler_id, cr.tag_team_id, cr.interpreter_id
      ORDER BY e.event_date ASC, m.match_order ASC
    `, reignIdsArray);
    globalDefenses = defenseMatches;
  }

  const defensesByReign = {};
  const breakerByReign = {};

  for (const match of globalDefenses) {
    let parts = match.participants;
    let scores = match.scores;
    if (typeof parts === "string") parts = JSON.parse(parts);
    if (typeof scores === "string") scores = JSON.parse(scores);
    parts = parts || [];
    scores = scores || [];

    let myTeam = null;
    let myResult = null;

    if (match.champ_wrestler_id) {
      const p = parts.find(x => x.wrestler_id === match.champ_wrestler_id);
      if (p) { myTeam = p.team_number; myResult = p.result; }
    } else if (match.champ_tag_team_id) {
      const p = parts.find(x => x.tag_team_id === match.champ_tag_team_id);
      if (p) { myTeam = p.team_number; myResult = p.result; }
    } else if (match.champ_interpreter_id) {
      const p = parts.find(x => x.interpreter_id === match.champ_interpreter_id);
      if (p) { myTeam = p.team_number; myResult = p.result; }
    }

    if (myTeam === null) continue;

    const scoreMap = scores.reduce((acc, s) => { acc[s.team_number] = s.score; return acc; }, {});
    let defendingWrestlers = parts.filter((x) => x.team_number === myTeam);
    let opponents = parts.filter((x) => x.team_number !== myTeam);
    const isTagTeamChampionship = match.champ_tag_team_id !== null;

    let scoreStr = null;
    const hasScores = Object.keys(scoreMap).length > 0;
    if (hasScores && scoreMap[myTeam] != null) {
      const oppTeamNumbers = [...new Set(opponents.map((x) => x.team_number))];
      if (oppTeamNumbers.length === 1 && scoreMap[oppTeamNumbers[0]] != null) {
        scoreStr = `${scoreMap[myTeam]}-${scoreMap[oppTeamNumbers[0]]}`;
      } else if (oppTeamNumbers.length > 1) {
        scoreStr = `${scoreMap[myTeam]}-` + oppTeamNumbers.map((tn) => scoreMap[tn] ?? 0).join("-");
      }
    }

    const matchDetail = {
      event_id: match.event_id, event_name: match.event_name, result: myResult, scoreStr,
      isTagTeamChampionship: isTagTeamChampionship, partners: [],
      opponents: opponents.map((x) => ({ id: x.wrestler_id, name: x.wrestler })),
      defending_interpreter_ids: defendingWrestlers.map(x => x.interpreter_id).filter(id => id != null)
    };

    if (isTagTeamChampionship) {
      matchDetail.partners = defendingWrestlers.map((x) => ({ id: x.wrestler_id, name: x.wrestler }));
    } else {
      if (match.champ_wrestler_id) {
        matchDetail.partners = defendingWrestlers.filter((x) => x.wrestler_id !== match.champ_wrestler_id).map((x) => ({ id: x.wrestler_id, name: x.wrestler }));
      } else if (match.champ_interpreter_id) {
        const repWrestler = defendingWrestlers.find(x => x.interpreter_id === match.champ_interpreter_id);
        if (repWrestler) {
          matchDetail.partners = defendingWrestlers.filter(x => x.wrestler_id !== repWrestler.wrestler_id).map(x => ({ id: x.wrestler_id, name: x.wrestler }));
        }
      } else {
        matchDetail.partners = defendingWrestlers.map((x) => ({ id: x.wrestler_id, name: x.wrestler }));
      }
    }

    if (match.title_changed === 1 && myResult !== "WIN") {
      breakerByReign[match.reign_id] = matchDetail;
    } else if (match.title_changed === 0) {
      if (!defensesByReign[match.reign_id]) defensesByReign[match.reign_id] = [];
      defensesByReign[match.reign_id].push(matchDetail);
    }
  }

  const processReigns = (rows, prefix) => rows.map((r, index) => {
    let filteredDefenses = defensesByReign[r.reign_id] || [];
    let filteredBreaker = breakerByReign[r.reign_id] || null;
    if (r.interpreter_id) {
      filteredDefenses = filteredDefenses.filter(m => m.defending_interpreter_ids.includes(r.interpreter_id));
      if (filteredBreaker && !filteredBreaker.defending_interpreter_ids.includes(r.interpreter_id)) {
        filteredBreaker = null;
      }
    }
    return {
      ...r,
      id: `${prefix}_${r.reign_id}_${r.interpreter_id || r.tag_team_id || r.wrestler_id || index}`,
      days_held_label: r.lost_date === null ? `${r.days_held}+` : r.days_held,
      defenses: filteredDefenses,
      streakBreaker: filteredBreaker,
    };
  });

  const formatImageUrl = (url, titleName) => {
    const chosen = url || TITLE_PLATES[titleName] || null;
    if (!chosen) return null;
    if (chosen.startsWith("http://") || chosen.startsWith("https://")) return chosen;
    return `${BLOB_BASE_URL}/${chosen.replace(/^\/+/, "")}`;
  };

  const championshipsList = championshipsRows.map((c) => ({
    id: c.id,
    title_name: c.title_name,
    type: c.type,
    image_url: formatImageUrl(c.image_url, c.title_name),
  }));

  const entityChampsMap = new Map();

  for (const row of totalChampionshipsRows) {
    if (!entityChampsMap.has(row.id)) {
      entityChampsMap.set(row.id, {
        id: row.id,
        name: row.name,
        country: row.country,
        counts: {},
        total: 0,
        mainTotal: 0,
        midTotal: 0,
        tagTotal: 0,
        lowTotal: 0,
        specialTotal: 0,
      });
    }
    const item = entityChampsMap.get(row.id);
    const cnt = Number(row.count) || 0;
    item.counts[row.championship_id] = cnt;
    item.total += cnt;

    const champ = championshipsList.find((c) => c.id === row.championship_id);
    if (champ) {
      if (champ.type === "main") item.mainTotal += cnt;
      else if (champ.type === "mid") item.midTotal += cnt;
      else if (champ.type === "tag") item.tagTotal += cnt;
      else if (champ.type === "low") item.lowTotal += cnt;
      else if (champ.type === "special") item.specialTotal += cnt;
    }
  }

  const totalChampionshipsList = Array.from(entityChampsMap.values())
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.mainTotal !== a.mainTotal) return b.mainTotal - a.mainTotal;
      if (b.midTotal !== a.midTotal) return b.midTotal - a.midTotal;
      if (b.tagTotal !== a.tagTotal) return b.tagTotal - a.tagTotal;
      if (b.lowTotal !== a.lowTotal) return b.lowTotal - a.lowTotal;
      if (b.specialTotal !== a.specialTotal) return b.specialTotal - a.specialTotal;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const pleAppearancesMap = new Map();

  for (const row of pleAppearancesRows) {
    if (!pleAppearancesMap.has(row.id)) {
      pleAppearancesMap.set(row.id, {
        id: row.id,
        name: row.name,
        country: row.country,
        seenEvents: new Set(),
        firstEvent: null,
        lastEvent: null,
        otherEventsMap: new Map(),
      });
    }
    const item = pleAppearancesMap.get(row.id);

    const eventDateVal = row.event_date ? new Date(row.event_date) : null;
    const eventYear = eventDateVal && !isNaN(eventDateVal.getTime())
      ? eventDateVal.getUTCFullYear()
      : (typeof row.event_date === "string" ? row.event_date.slice(0, 4) : "—");

    const eventLogo = formatEventLogo(row.event_image_url, row.ple_image_url, row.ple_id);

    const eventObj = {
      id: row.event_id,
      name: row.event_name,
      year: eventYear,
      date: row.event_date ? (row.event_date instanceof Date ? row.event_date.toISOString() : String(row.event_date)) : null,
      image_url: eventLogo,
    };

    if (!item.seenEvents.has(row.event_id)) {
      item.seenEvents.add(row.event_id);
      if (!item.firstEvent) {
        item.firstEvent = eventObj;
      }
      item.lastEvent = eventObj;
    }

    if (row.other_id) {
      if (!item.otherEventsMap.has(row.other_id)) {
        item.otherEventsMap.set(row.other_id, {
          id: row.other_id,
          name: row.other_name || "Unknown",
          events: new Set(),
        });
      }
      item.otherEventsMap.get(row.other_id).events.add(row.event_id);
    }
  }

  const pleAppearancesList = Array.from(pleAppearancesMap.values())
    .map((item) => {
      const breakdown = Array.from(item.otherEventsMap.values())
        .map((bd) => ({
          id: bd.id,
          name: bd.name,
          count: bd.events.size,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        id: item.id,
        name: item.name,
        country: item.country,
        count: item.seenEvents.size,
        firstEvent: item.firstEvent,
        lastEvent: item.lastEvent,
        breakdown,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (a.name || "").localeCompare(b.name || "");
    })
    .slice(0, 10)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return {
    matches: JSON.parse(JSON.stringify(matchesList)),
    wins: JSON.parse(JSON.stringify(winsList)),
    topStats: JSON.parse(JSON.stringify(topStatsRows)),
    winStreaks: JSON.parse(JSON.stringify(streaks.wins)),
    undefStreaks: JSON.parse(JSON.stringify(streaks.undefs)),
    longestReigns: JSON.parse(JSON.stringify(processReigns(longestReignsRows, isWrestler ? 'wlr' : 'ilr'))),
    mostDefenses: JSON.parse(JSON.stringify(processReigns(mostDefensesRows, isWrestler ? 'wmd' : 'imd'))),
    championships: JSON.parse(JSON.stringify(championshipsList)),
    totalChampionships: JSON.parse(JSON.stringify(totalChampionshipsList)),
    pleAppearances: JSON.parse(JSON.stringify(pleAppearancesList)),
  };
}

