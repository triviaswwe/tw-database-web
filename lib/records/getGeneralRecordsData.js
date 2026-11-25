// lib/records/getGeneralRecordsData.js
import { wrestlerNameSql } from "../matchUtils.js";

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

export function parseYearParam(year) {
  if (year === null || year === undefined || year === "" || year === "all") return null;
  const num = Number(year);
  return Number.isInteger(num) && num >= 2000 && num <= 2100 ? num : null;
}

export function buildWrestlerReignsQuery(yearStart, yearNextStart, orderByClause, requireDefenses = false) {
  const params = [];
  let daysExpr;
  if (yearStart) {
    daysExpr = "DATEDIFF(LEAST(IFNULL(cr.lost_date, UTC_DATE()), UTC_DATE(), ?), GREATEST(cr.won_date, ?))";
    params.push(yearNextStart, yearStart);
  } else {
    daysExpr = "DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date)";
  }

  let defensesDateFilter = "";
  if (yearStart) {
    defensesDateFilter = "AND e.event_date >= ? AND e.event_date < ?";
    params.push(yearStart, yearNextStart);
  }

  let reignYearFilter = "";
  if (yearStart) {
    reignYearFilter = "AND cr.won_date < ? AND cr.won_date <= UTC_DATE() AND (cr.lost_date IS NULL OR cr.lost_date > ? OR cr.won_date >= ?)";
    params.push(yearNextStart, yearStart, yearStart);
  }

  const sql = `
      SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, ${daysExpr} AS days_held,
          cr.wrestler_id, ${wrestlerNameSql("cr.wrestler_id", "cr.won_date", "w.wrestler")} AS entity_name, w.country, cr.tag_team_id, tt.name AS tag_team_name, c.title_name, ct.image_url,
          (SELECT COUNT(DISTINCT m.id) FROM matches m JOIN events e ON e.id = m.event_id AND e.event_date >= cr.won_date AND e.event_date <= UTC_DATE() AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date) ${defensesDateFilter}
           JOIN match_participants mp ON mp.match_id = m.id AND ((cr.wrestler_id IS NOT NULL AND mp.wrestler_id = cr.wrestler_id) OR (cr.tag_team_id IS NOT NULL AND mp.tag_team_id = cr.tag_team_id))
           WHERE m.championship_id = cr.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL AND mp.result IS NOT NULL AND mp.result != '') AS defenses_count
      FROM championship_reigns cr 
      LEFT JOIN wrestlers w ON cr.wrestler_id = w.id 
      LEFT JOIN tag_teams tt ON cr.tag_team_id = tt.id 
      JOIN championships c ON cr.championship_id = c.id
      LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND cr.won_date >= ct.start_date AND (cr.won_date <= ct.end_date OR ct.end_date IS NULL)
      WHERE (cr.wrestler_id IS NOT NULL OR cr.tag_team_id IS NOT NULL)
        AND c.id != 8
        ${reignYearFilter}
      ${requireDefenses && yearStart ? "HAVING defenses_count > 0" : ""}
      ORDER BY ${orderByClause} LIMIT 20
    `;
  return { sql, params };
}

export function buildInterpreterReignsQuery(yearStart, yearNextStart, orderByClause, requireDefenses = false) {
  const params = [];
  let defensesDateFilter = "";
  if (yearStart) {
    defensesDateFilter = "AND e.event_date >= ? AND e.event_date < ?";
    params.push(yearStart, yearNextStart);
  }

  let crDaysExpr;
  if (yearStart) {
    crDaysExpr = "DATEDIFF(LEAST(IFNULL(cr.lost_date, UTC_DATE()), UTC_DATE(), ?), GREATEST(cr.won_date, ?))";
    params.push(yearNextStart, yearStart);
  } else {
    crDaysExpr = "DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date)";
  }

  let crYearFilter = "";
  if (yearStart) {
    crYearFilter = "AND cr.won_date < ? AND cr.won_date <= UTC_DATE() AND (cr.lost_date IS NULL OR cr.lost_date > ? OR cr.won_date >= ?)";
    params.push(yearNextStart, yearStart, yearStart);
  }

  let rmDaysExpr;
  if (yearStart) {
    rmDaysExpr = "DATEDIFF(LEAST(IFNULL(rm.end_date, UTC_DATE()), UTC_DATE(), ?), GREATEST(rm.start_date, ?))";
    params.push(yearNextStart, yearStart);
  } else {
    rmDaysExpr = "DATEDIFF(IFNULL(rm.end_date, UTC_DATE()), rm.start_date)";
  }

  let rmYearFilter = "";
  if (yearStart) {
    rmYearFilter = "AND rm.start_date < ? AND rm.start_date <= UTC_DATE() AND (rm.end_date IS NULL OR rm.end_date > ? OR rm.start_date >= ?)";
    params.push(yearNextStart, yearStart, yearStart);
  }

  const sql = `
      SELECT 
          base.reign_id, base.won_date, base.lost_date, MAX(base.days_held) AS days_held,
          base.interpreter_id, base.entity_name, base.country, base.title_name, base.image_url,
          (
              SELECT COUNT(DISTINCT m.id)
              FROM matches m
              JOIN events e ON e.id = m.event_id AND e.event_date >= base.won_date AND e.event_date <= UTC_DATE() AND (base.lost_date IS NULL OR e.event_date < base.lost_date) ${defensesDateFilter}
              JOIN match_participants mp ON mp.match_id = m.id AND mp.interpreter_id = base.interpreter_id
              WHERE m.championship_id = base.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL AND mp.result IS NOT NULL AND mp.result != ''
          ) AS defenses_count
      FROM (
          SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, ${crDaysExpr} AS days_held,
              cr.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, ct.image_url, cr.championship_id
          FROM championship_reigns cr
          JOIN interpreters i ON i.id = cr.interpreter_id
          JOIN championships c ON cr.championship_id = c.id
          LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND cr.won_date >= ct.start_date AND (cr.won_date <= ct.end_date OR ct.end_date IS NULL)
          WHERE cr.interpreter_id IS NOT NULL AND c.id != 8 ${crYearFilter}
          UNION
          SELECT cr.id AS reign_id, rm.start_date AS won_date, rm.end_date AS lost_date, ${rmDaysExpr} AS days_held,
              rm.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, ct.image_url, cr.championship_id
          FROM reign_members rm
          JOIN championship_reigns cr ON cr.id = rm.reign_id
          JOIN interpreters i ON i.id = rm.interpreter_id
          JOIN championships c ON cr.championship_id = c.id
          LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND rm.start_date >= ct.start_date AND (rm.start_date <= ct.end_date OR ct.end_date IS NULL)
          WHERE rm.interpreter_id IS NOT NULL AND c.id != 8 ${rmYearFilter}
      ) AS base
      GROUP BY base.reign_id, base.interpreter_id, base.won_date, base.lost_date, base.entity_name, base.country, base.title_name, base.image_url, base.championship_id
      ${requireDefenses && yearStart ? "HAVING defenses_count > 0" : ""}
      ORDER BY ${orderByClause} LIMIT 20
    `;
  return { sql, params };
}

export async function fetchSharedGeneralRecordsData(pool, year = null) {
  const parsedYear = parseYearParam(year);
  const yearStart = parsedYear !== null ? `${parsedYear}-01-01` : null;
  const yearNextStart = parsedYear !== null ? `${parsedYear + 1}-01-01` : null;
  const yearParams = yearStart ? [yearStart, yearNextStart] : [];

  const [
    [championshipsRows],
    [baseMatches],
    [allParticipants],
    [allScores],
    [yearsRows],
  ] = await Promise.all([
    pool.query(`
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
    `),
    pool.query(`
      SELECT m.id AS match_id, e.id AS event_id, e.name AS event_name, e.event_date
      FROM matches m
      JOIN events e ON m.event_id = e.id
      ${yearStart ? "WHERE e.event_date >= ? AND e.event_date < ?" : ""}
      ORDER BY e.event_date ASC, m.match_order ASC
    `, yearParams),
    pool.query(`
      SELECT
        mp.match_id,
        mp.wrestler_id,
        ${wrestlerNameSql("mp.wrestler_id", "e.event_date", "w.wrestler")} AS wrestler,
        w.country,
        mp.team_number,
        mp.result,
        mp.interpreter_id,
        i.interpreter,
        i.nationality AS interpreter_country
      FROM match_participants mp
      JOIN matches m ON mp.match_id = m.id
      JOIN events e ON m.event_id = e.id
      JOIN wrestlers w ON mp.wrestler_id = w.id
      LEFT JOIN interpreters i ON mp.interpreter_id = i.id
      ${yearStart ? "WHERE e.event_date >= ? AND e.event_date < ?" : ""}
    `, yearParams),
    pool.query(`
      SELECT mts.match_id, mts.team_number, mts.score
      FROM match_team_scores mts
      ${yearStart ? "JOIN matches m ON mts.match_id = m.id JOIN events e ON m.event_id = e.id WHERE e.event_date >= ? AND e.event_date < ?" : ""}
    `, yearParams),
    pool.query(`
      SELECT DISTINCT YEAR(e.event_date) AS year
      FROM events e
      JOIN matches m ON m.event_id = e.id
      JOIN match_participants mp ON mp.match_id = m.id
      WHERE e.event_date IS NOT NULL
        AND mp.result IS NOT NULL
        AND mp.result != ''
      ORDER BY year ASC
    `),
  ]);

  const availableYears = yearsRows
    .map((r) => Number(r.year))
    .filter((y) => Number.isInteger(y) && y > 0);

  const participantsByMatch = new Map();
  for (const p of allParticipants) {
    let arr = participantsByMatch.get(p.match_id);
    if (!arr) {
      arr = [];
      participantsByMatch.set(p.match_id, arr);
    }
    arr.push({
      wrestler_id: p.wrestler_id,
      wrestler: p.wrestler,
      country: p.country,
      team_number: p.team_number,
      result: p.result,
      interpreter_id: p.interpreter_id,
      interpreter: p.interpreter,
      interpreter_country: p.interpreter_country,
    });
  }

  const scoresByMatch = new Map();
  for (const s of allScores) {
    let arr = scoresByMatch.get(s.match_id);
    if (!arr) {
      arr = [];
      scoresByMatch.set(s.match_id, arr);
    }
    arr.push({ team_number: s.team_number, score: s.score });
  }

  const historyRows = baseMatches.map((m) => ({
    match_id: m.match_id,
    event_id: m.event_id,
    event_name: m.event_name,
    event_date: m.event_date,
    participants: participantsByMatch.get(m.match_id) || [],
    scores: scoresByMatch.get(m.match_id) || [],
  }));

  return { championshipsRows, historyRows, availableYears };
}

export async function getGeneralRecordsData(pool, type, sharedDataOrPromise = null, year = null) {
  const isWrestler = type === "wrestler";
  const parsedYear = parseYearParam(year);
  const yearStart = parsedYear !== null ? `${parsedYear}-01-01` : null;
  const yearNextStart = parsedYear !== null ? `${parsedYear + 1}-01-01` : null;
  const yearParams = yearStart ? [yearStart, yearNextStart] : [];

  const sharedPromise = sharedDataOrPromise
    ? Promise.resolve(sharedDataOrPromise)
    : fetchSharedGeneralRecordsData(pool, parsedYear);

  let matchesRows, winsRows, topStatsRows, longestReignsRows, mostDefensesRows, totalChampionshipsRows, pleAppearancesRows, showStatsRows;
  let sharedData;

  const bdYearJoin = yearStart
    ? "JOIN matches m2 ON mp2.match_id = m2.id JOIN events e2 ON m2.event_id = e2.id"
    : "";
  const bdYearCond = yearStart ? "AND e2.event_date >= ? AND e2.event_date < ?" : "";
  const outerYearJoin = yearStart
    ? "JOIN matches m ON mp.match_id = m.id JOIN events e ON m.event_id = e.id WHERE e.event_date >= ? AND e.event_date < ?"
    : "";
  const bdAndOuterYearParams = yearStart ? [yearStart, yearNextStart, yearStart, yearNextStart] : [];
  const totalChampsParams = yearStart ? [yearStart, yearNextStart, yearStart, yearNextStart] : [];

  if (isWrestler) {
    const lrQuery = buildWrestlerReignsQuery(yearStart, yearNextStart, "days_held DESC, defenses_count DESC", false);
    const mdQuery = buildWrestlerReignsQuery(yearStart, yearNextStart, "defenses_count DESC, days_held DESC", true);

    [
      [matchesRows],
      [winsRows],
      [topStatsRows],
      [longestReignsRows],
      [mostDefensesRows],
      [totalChampionshipsRows],
      [pleAppearancesRows],
      [showStatsRows],
      sharedData,
    ] = await Promise.all([
      pool.query(`
      SELECT w.id, w.wrestler AS name, w.country, COUNT(NULLIF(mp.result, '')) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'name', IFNULL(i.interpreter, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT mp2.interpreter_id, COUNT(NULLIF(mp2.result, '')) as cnt
            FROM match_participants mp2
            ${bdYearJoin}
            WHERE mp2.wrestler_id = w.id AND mp2.interpreter_id IS NOT NULL ${bdYearCond}
            GROUP BY mp2.interpreter_id
            ${yearStart ? "HAVING cnt > 0" : ""}
          ) sub
          LEFT JOIN interpreters i ON sub.interpreter_id = i.id
        ) AS breakdown
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      ${outerYearJoin}
      GROUP BY w.id, w.wrestler, w.country
      ${yearStart ? "HAVING total > 0" : ""}
      ORDER BY total DESC
      LIMIT 20
    `, bdAndOuterYearParams),
      pool.query(`
      SELECT w.id, w.wrestler AS name, w.country, SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'name', IFNULL(i.interpreter, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT mp2.interpreter_id, SUM(CASE WHEN mp2.result = 'WIN' THEN 1 ELSE 0 END) as cnt
            FROM match_participants mp2
            ${bdYearJoin}
            WHERE mp2.wrestler_id = w.id AND mp2.interpreter_id IS NOT NULL ${bdYearCond}
            GROUP BY mp2.interpreter_id
            HAVING cnt > 0
          ) sub
          LEFT JOIN interpreters i ON sub.interpreter_id = i.id
        ) AS breakdown
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      ${outerYearJoin}
      GROUP BY w.id, w.wrestler, w.country
      ${yearStart ? "HAVING total > 0" : ""}
      ORDER BY total DESC
      LIMIT 20
    `, bdAndOuterYearParams),
      pool.query(`
      SELECT 
        w.id, w.wrestler AS name, w.country,
        COUNT(NULLIF(mp.result, '')) AS total_matches,
        SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
        ROUND((SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(NULLIF(mp.result, '')), 0), 2) AS win_percentage
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      ${outerYearJoin}
      GROUP BY w.id, w.wrestler, w.country
      HAVING total_matches > 0
      ORDER BY wins DESC, win_percentage DESC
    `, yearParams),
      pool.query(lrQuery.sql, lrQuery.params),
      pool.query(mdQuery.sql, mdQuery.params),
      pool.query(`
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
        ${yearStart ? "AND cr.won_date >= ? AND cr.won_date < ?" : ""}
        UNION
        SELECT rm.reign_id, rm.wrestler_id, cr.championship_id
        FROM reign_members rm
        JOIN championship_reigns cr ON cr.id = rm.reign_id
        WHERE rm.wrestler_id IS NOT NULL
        ${yearStart ? "AND COALESCE(rm.start_date, cr.won_date) >= ? AND COALESCE(rm.start_date, cr.won_date) < ?" : ""}
      ) AS r_data
      JOIN wrestlers w ON w.id = r_data.wrestler_id
      JOIN championships c ON c.id = r_data.championship_id
      WHERE c.show_in_ui = 1 AND c.type IS NOT NULL
      GROUP BY w.id, w.wrestler, w.country, c.id
    `, totalChampsParams),
      pool.query(`
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
        ${yearStart ? "AND e.event_date >= ? AND e.event_date < ?" : ""}
      GROUP BY w.id, w.wrestler, w.country, e.id, e.name, e.event_date, e.image_url, e.ple_id, p.image_url, mp.interpreter_id, i.interpreter
      ORDER BY e.event_date ASC, e.id ASC
    `, yearParams),
      pool.query(`
      SELECT 
        e.show_id,
        w.id,
        w.wrestler AS name,
        w.country,
        mp.interpreter_id AS other_id,
        i.interpreter AS other_name,
        COUNT(NULLIF(mp.result, '')) AS matches_cnt,
        SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins_cnt
      FROM match_participants mp
      JOIN matches m ON mp.match_id = m.id
      JOIN events e ON m.event_id = e.id
      JOIN wrestlers w ON mp.wrestler_id = w.id
      LEFT JOIN interpreters i ON mp.interpreter_id = i.id
      WHERE e.show_id IN (1, 2, 3)
        AND (e.ple_id IS NULL OR e.ple_id != 18)
        AND LOWER(IFNULL(e.event_type, '')) != 'takeover'
        AND mp.result IS NOT NULL
        AND mp.result != ''
        ${yearStart ? "AND e.event_date >= ? AND e.event_date < ?" : ""}
      GROUP BY e.show_id, w.id, w.wrestler, w.country, mp.interpreter_id, i.interpreter
    `, yearParams),
      sharedPromise,
    ]);
  } else {
    const lrQuery = buildInterpreterReignsQuery(yearStart, yearNextStart, "days_held DESC, defenses_count DESC", false);
    const mdQuery = buildInterpreterReignsQuery(yearStart, yearNextStart, "defenses_count DESC, days_held DESC", true);

    [
      [matchesRows],
      [winsRows],
      [topStatsRows],
      [longestReignsRows],
      [mostDefensesRows],
      [totalChampionshipsRows],
      [pleAppearancesRows],
      [showStatsRows],
      sharedData,
    ] = await Promise.all([
      pool.query(`
      SELECT i.id, i.interpreter AS name, i.nationality AS country, COUNT(NULLIF(mp.result, '')) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', w.id, 'name', IFNULL(w.wrestler, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT mp2.wrestler_id, COUNT(NULLIF(mp2.result, '')) as cnt
            FROM match_participants mp2
            ${bdYearJoin}
            WHERE mp2.interpreter_id = i.id ${bdYearCond}
            GROUP BY mp2.wrestler_id
            ${yearStart ? "HAVING cnt > 0" : ""}
          ) sub
          LEFT JOIN wrestlers w ON sub.wrestler_id = w.id
        ) AS breakdown
      FROM match_participants mp
      JOIN interpreters i ON mp.interpreter_id = i.id
      ${outerYearJoin}
      GROUP BY i.id, i.interpreter, i.nationality
      ${yearStart ? "HAVING total > 0" : ""}
      ORDER BY total DESC
      LIMIT 20
    `, bdAndOuterYearParams),
      pool.query(`
      SELECT i.id, i.interpreter AS name, i.nationality AS country, SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', w.id, 'name', IFNULL(w.wrestler, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT mp2.wrestler_id, SUM(CASE WHEN mp2.result = 'WIN' THEN 1 ELSE 0 END) as cnt
            FROM match_participants mp2
            ${bdYearJoin}
            WHERE mp2.interpreter_id = i.id ${bdYearCond}
            GROUP BY mp2.wrestler_id
            HAVING cnt > 0
          ) sub
          LEFT JOIN wrestlers w ON sub.wrestler_id = w.id
        ) AS breakdown
      FROM match_participants mp
      JOIN interpreters i ON mp.interpreter_id = i.id
      ${outerYearJoin}
      GROUP BY i.id, i.interpreter, i.nationality
      ${yearStart ? "HAVING total > 0" : ""}
      ORDER BY total DESC
      LIMIT 20
    `, bdAndOuterYearParams),
      pool.query(`
      SELECT 
        i.id, i.interpreter AS name, i.nationality AS country,
        COUNT(NULLIF(mp.result, '')) AS total_matches,
        SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
        ROUND((SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(NULLIF(mp.result, '')), 0), 2) AS win_percentage
      FROM match_participants mp
      JOIN interpreters i ON mp.interpreter_id = i.id
      ${outerYearJoin}
      GROUP BY i.id, i.interpreter, i.nationality
      HAVING total_matches > 0
      ORDER BY wins DESC, win_percentage DESC
    `, yearParams),
      pool.query(lrQuery.sql, lrQuery.params),
      pool.query(mdQuery.sql, mdQuery.params),
      pool.query(`
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
        ${yearStart ? "AND cr.won_date >= ? AND cr.won_date < ?" : ""}
        UNION
        SELECT rm.reign_id, rm.interpreter_id, cr.championship_id
        FROM reign_members rm
        JOIN championship_reigns cr ON cr.id = rm.reign_id
        WHERE rm.interpreter_id IS NOT NULL
        ${yearStart ? "AND COALESCE(rm.start_date, cr.won_date) >= ? AND COALESCE(rm.start_date, cr.won_date) < ?" : ""}
      ) AS r_data
      JOIN interpreters i ON i.id = r_data.interpreter_id
      JOIN championships c ON c.id = r_data.championship_id
      WHERE c.show_in_ui = 1 AND c.type IS NOT NULL
      GROUP BY i.id, i.interpreter, i.nationality, c.id
    `, totalChampsParams),
      pool.query(`
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
        ${yearStart ? "AND e.event_date >= ? AND e.event_date < ?" : ""}
      GROUP BY i.id, i.interpreter, i.nationality, e.id, e.name, e.event_date, e.image_url, e.ple_id, p.image_url, mp.wrestler_id, w.wrestler
      ORDER BY e.event_date ASC, e.id ASC
    `, yearParams),
      pool.query(`
      SELECT 
        e.show_id,
        i.id,
        i.interpreter AS name,
        i.nationality AS country,
        mp.wrestler_id AS other_id,
        w.wrestler AS other_name,
        COUNT(NULLIF(mp.result, '')) AS matches_cnt,
        SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins_cnt
      FROM match_participants mp
      JOIN matches m ON mp.match_id = m.id
      JOIN events e ON m.event_id = e.id
      JOIN interpreters i ON mp.interpreter_id = i.id
      LEFT JOIN wrestlers w ON mp.wrestler_id = w.id
      WHERE e.show_id IN (1, 2, 3)
        AND (e.ple_id IS NULL OR e.ple_id != 18)
        AND LOWER(IFNULL(e.event_type, '')) != 'takeover'
        AND mp.result IS NOT NULL
        AND mp.result != ''
        ${yearStart ? "AND e.event_date >= ? AND e.event_date < ?" : ""}
      GROUP BY e.show_id, i.id, i.interpreter, i.nationality, mp.wrestler_id, w.wrestler
    `, yearParams),
      sharedPromise,
    ]);
  }

  const { championshipsRows, historyRows } = sharedData;

  const processBreakdown = (rows) => rows.map(r => {
    let bd = r.breakdown;
    if (typeof bd === 'string') {
      try { bd = JSON.parse(bd); } catch (e) { bd = []; }
    }
    return { ...r, breakdown: bd || [] };
  });

  const matchesList = processBreakdown(matchesRows);
  const winsList = processBreakdown(winsRows);

  const buildStreaks = (isInterpreter = false) => {
    const allWins = [];
    const allUndefs = [];
    const allWinless = [];
    const allLosing = [];
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
        if (!id || !p.result) continue;
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
            winlessCount: 0, winlessMatches: [], losingCount: 0, losingMatches: [],
          });
        }
        const st = stateMap.get(e.id);
        st.name = e.name;
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
            const days = Math.max(0, Math.floor((matchDate - st.undefStartDate) / (1000 * 60 * 60 * 24)));
            allUndefs.push({
              id: `undef_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
              count: st.undefCount, matches: [...st.undefMatches], days: days, streakBreaker: matchDetail, isOngoing: false,
            });
            st.undefCount = 0; st.undefMatches = []; st.undefStartDate = null;
          }
        }

        if (e.result === "LOSS" || e.result === "DRAW") {
          st.winlessCount++;
          st.winlessMatches.push(matchDetail);
        } else if (st.winlessCount > 0) {
          allWinless.push({
            id: `winless_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
            count: st.winlessCount, matches: [...st.winlessMatches], streakBreaker: matchDetail,
          });
          st.winlessCount = 0; st.winlessMatches = [];
        }

        if (e.result === "LOSS") {
          st.losingCount++;
          st.losingMatches.push(matchDetail);
        } else if (st.losingCount > 0) {
          allLosing.push({
            id: `losing_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
            count: st.losingCount, matches: [...st.losingMatches], streakBreaker: matchDetail,
          });
          st.losingCount = 0; st.losingMatches = [];
        }
      }
    }

    const now = new Date();
    const currentUtcYear = now.getUTCFullYear();
    const undefEndCap =
      parsedYear && parsedYear < currentUtcYear
        ? new Date(Date.UTC(parsedYear, 11, 31))
        : now;
    const isOngoingUndef = !parsedYear || parsedYear >= currentUtcYear;

    for (const st of stateMap.values()) {
      if (st.winCount > 0) {
        allWins.push({
          id: `win_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
          count: st.winCount, matches: [...st.winMatches], streakBreaker: null,
        });
      }
      if (st.undefCount > 0) {
        const days = Math.max(0, Math.floor((undefEndCap - st.undefStartDate) / (1000 * 60 * 60 * 24)));
        allUndefs.push({
          id: `undef_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
          count: st.undefCount, matches: [...st.undefMatches], days: days, streakBreaker: null, isOngoing: isOngoingUndef,
        });
      }
      if (st.winlessCount > 0) {
        allWinless.push({
          id: `winless_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
          count: st.winlessCount, matches: [...st.winlessMatches], streakBreaker: null,
        });
      }
      if (st.losingCount > 0) {
        allLosing.push({
          id: `losing_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
          count: st.losingCount, matches: [...st.losingMatches], streakBreaker: null,
        });
      }
    }

    return {
      wins: allWins.sort((a, b) => b.count - a.count).slice(0, 20),
      undefs: allUndefs.sort((a, b) => b.count - a.count).slice(0, 20),
      winless: allWinless.sort((a, b) => b.count - a.count).slice(0, 20),
      losing: allLosing.sort((a, b) => b.count - a.count).slice(0, 20),
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
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('wrestler_id', mp.wrestler_id, 'wrestler', ${wrestlerNameSql("mp.wrestler_id", "e.event_date", "w2.wrestler")}, 'country', w2.country, 'team_number', mp.team_number, 'result', mp.result, 'tag_team_id', mp.tag_team_id, 'interpreter_id', mp.interpreter_id))
           FROM match_participants mp JOIN wrestlers w2 ON w2.id = mp.wrestler_id WHERE mp.match_id = m.id) AS participants,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number', mts.team_number, 'score', mts.score))
           FROM match_team_scores mts WHERE mts.match_id = m.id) AS scores,
          cr.wrestler_id AS champ_wrestler_id, cr.tag_team_id AS champ_tag_team_id, cr.interpreter_id AS champ_interpreter_id
      FROM matches m JOIN events e ON m.event_id = e.id
      JOIN championship_reigns cr ON m.championship_id = cr.championship_id AND m.title_match = 1 AND e.event_date >= cr.won_date AND e.event_date <= UTC_DATE() AND (cr.lost_date IS NULL OR e.event_date <= cr.lost_date)
      JOIN match_participants mp_champ ON mp_champ.match_id = m.id AND (
          (cr.wrestler_id IS NOT NULL AND mp_champ.wrestler_id = cr.wrestler_id) OR
          (cr.tag_team_id IS NOT NULL AND mp_champ.tag_team_id = cr.tag_team_id) OR
          (cr.interpreter_id IS NOT NULL AND mp_champ.interpreter_id = cr.interpreter_id)
      )
      WHERE cr.id IN (${placeholders})
        AND mp_champ.result IS NOT NULL
        AND mp_champ.result != ''
        ${yearStart ? "AND e.event_date >= ? AND e.event_date < ?" : ""}
      GROUP BY cr.id, m.id, m.title_changed, e.id, e.name, cr.wrestler_id, cr.tag_team_id, cr.interpreter_id
      ORDER BY e.event_date ASC, m.match_order ASC
    `, yearStart ? [...reignIdsArray, yearStart, yearNextStart] : reignIdsArray);
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

  const currentUtcYear = new Date().getUTCFullYear();
  const processReigns = (rows, prefix) => rows.map((r, index) => {
    let filteredDefenses = defensesByReign[r.reign_id] || [];
    let filteredBreaker = breakerByReign[r.reign_id] || null;
    if (r.interpreter_id) {
      filteredDefenses = filteredDefenses.filter(m => m.defending_interpreter_ids.includes(r.interpreter_id));
      if (filteredBreaker && !filteredBreaker.defending_interpreter_ids.includes(r.interpreter_id)) {
        filteredBreaker = null;
      }
    }
    const isOngoing = r.lost_date === null && (!parsedYear || parsedYear >= currentUtcYear);
    return {
      ...r,
      id: `${prefix}_${r.reign_id}_${r.interpreter_id || r.tag_team_id || r.wrestler_id || index}`,
      days_held_label: isOngoing ? `${r.days_held}+` : r.days_held,
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
    .slice(0, 20)
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
    .slice(0, 20)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const buildTopStats = (rows) => {
    const normalized = (rows || [])
      .map((r) => ({
        ...r,
        total_matches: Number(r.total_matches) || 0,
        wins: Number(r.wins) || 0,
      }))
      .filter((item) => item.total_matches > 0);

    const compareWinPct = (a, b) =>
      (parseFloat(b.win_percentage) || 0) - (parseFloat(a.win_percentage) || 0);

    const byWins = [...normalized]
      .sort(
        (a, b) =>
          b.wins - a.wins ||
          compareWinPct(a, b) ||
          b.total_matches - a.total_matches ||
          (a.name || "").localeCompare(b.name || "")
      )
      .slice(0, 20);

    const minMatches = parsedYear ? 5 : 15;
    let winPctEligible = normalized.filter((item) => item.total_matches >= minMatches);
    if (parsedYear && winPctEligible.length === 0) {
      winPctEligible = normalized.filter((item) => item.total_matches >= 1);
    }

    const byWinPercentage = winPctEligible
      .sort(
        (a, b) =>
          compareWinPct(a, b) ||
          b.wins - a.wins ||
          b.total_matches - a.total_matches ||
          (a.name || "").localeCompare(b.name || "")
      )
      .slice(0, 20);

    return { byWins, byWinPercentage };
  };

  const buildShowTop20 = (rows, targetShowId) => {
    const map = new Map();
    for (const row of rows || []) {
      if (Number(row.show_id) !== targetShowId) continue;
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          name: row.name,
          country: row.country,
          total_matches: 0,
          wins: 0,
          breakdownMap: new Map(),
        });
      }
      const item = map.get(row.id);
      const mCnt = Number(row.matches_cnt) || 0;
      const wCnt = Number(row.wins_cnt) || 0;
      item.total_matches += mCnt;
      item.wins += wCnt;

      if (row.other_id) {
        const existing = item.breakdownMap.get(row.other_id) || {
          id: row.other_id,
          name: row.other_name || "Unknown",
          count: 0,
        };
        existing.count += mCnt;
        item.breakdownMap.set(row.other_id, existing);
      }
    }

    const allItems = Array.from(map.values()).map((item) => ({
      id: item.id,
      name: item.name,
      country: item.country,
      total_matches: item.total_matches,
      wins: item.wins,
      win_percentage:
        item.total_matches > 0
          ? Number(((item.wins * 100) / item.total_matches).toFixed(2))
          : 0,
      breakdown: Array.from(item.breakdownMap.values()).sort(
        (a, b) => b.count - a.count
      ),
    }));

    const byMatches = [...allItems]
      .sort(
        (a, b) =>
          b.total_matches - a.total_matches ||
          b.wins - a.wins ||
          b.win_percentage - a.win_percentage ||
          (a.name || "").localeCompare(b.name || "")
      )
      .slice(0, 20);

    const byWins = [...allItems]
      .sort(
        (a, b) =>
          b.wins - a.wins ||
          b.win_percentage - a.win_percentage ||
          b.total_matches - a.total_matches ||
          (a.name || "").localeCompare(b.name || "")
      )
      .slice(0, 20);

    const minShowMatches = parsedYear ? 3 : 7;
    let showWinPctEligible = allItems.filter((item) => item.total_matches >= minShowMatches);
    if (parsedYear && showWinPctEligible.length === 0) {
      showWinPctEligible = allItems.filter((item) => item.total_matches >= 1);
    }

    const byWinPercentage = showWinPctEligible
      .sort(
        (a, b) =>
          b.win_percentage - a.win_percentage ||
          b.wins - a.wins ||
          b.total_matches - a.total_matches ||
          (a.name || "").localeCompare(b.name || "")
      )
      .slice(0, 20);

    return { byMatches, byWins, byWinPercentage };
  };

  return {
    matches: matchesList,
    wins: winsList,
    topStats: buildTopStats(topStatsRows),
    rawMatches: buildShowTop20(showStatsRows, 1),
    smackdownMatches: buildShowTop20(showStatsRows, 2),
    nxtMatches: buildShowTop20(showStatsRows, 3),
    winStreaks: streaks.wins,
    undefStreaks: streaks.undefs,
    winlessStreaks: streaks.winless,
    losingStreaks: streaks.losing,
    longestReigns: processReigns(longestReignsRows, isWrestler ? 'wlr' : 'ilr'),
    mostDefenses: processReigns(mostDefensesRows, isWrestler ? 'wmd' : 'imd'),
    championships: championshipsList,
    totalChampionships: totalChampionshipsList,
    pleAppearances: pleAppearancesList,
  };
}

