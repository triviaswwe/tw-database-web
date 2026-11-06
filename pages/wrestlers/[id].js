// pages/wrestlers/[id].js

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import pool from "../../lib/db";
import FlagWithName from "../../components/FlagWithName";
import MatchCard from "../../components/MatchCard";
import MatchFilters from "../../components/MatchFilters";
import { formatDateDDMMYYYY, buildH2hMatches, computeH2hRecords } from "../../lib/matchUtils";
import React, { useState, useMemo } from "react";
import {
  useQueryToggle,
  useQueryMultiSelect,
  useQueryListToggle,
  usePagination,
  DEFAULT_RESULTS,
  DEFAULT_FORMATS,
  parseResultFilter,
  parseFormatFilter,
  parseMultiValueFilter,
} from "../../hooks/useQueryFilter";

export async function getServerSideProps({ params, query, res }) {
  if (res) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  }
  try {
    const wrestlerId = parseInt(params.id, 10);
    if (isNaN(wrestlerId)) return { notFound: true };

    const [[wrestlerRow]] = await pool.query(
      `SELECT w.*, w.image_url FROM wrestlers w WHERE w.id = ?`,
      [wrestlerId],
    );
    if (!wrestlerRow) return { notFound: true };

    const wrestler = {
      id: wrestlerRow.id,
      wrestler: wrestlerRow.wrestler,
      country: wrestlerRow.country,
      brand: wrestlerRow.brand,
      debut_date: wrestlerRow.debut_date
        ? wrestlerRow.debut_date.toISOString()
        : null,
      image_url: wrestlerRow.image_url || null,
    };

    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(50, parseInt(query.limit) || 20);
    const offset = (page - 1) * limit;

    const selectedWrestlers = parseMultiValueFilter(query.wrestler);
    const selectedShows = parseMultiValueFilter(query.filter);
    const selectedChamps = parseMultiValueFilter(query.champ);
    const selectedStips = parseMultiValueFilter(query.matchtype);

    const filterTitle = query.title === "1";
    const filterStip = query.stip === "1";
    const filterResults = parseResultFilter(query.result);
    const filterFormats = parseFormatFilter(query.format, query.one);

    const extraClauses = [];
    const extraParams = [];

    if (filterResults.length === 0) {
      extraClauses.push("AND 1 = 0");
    } else if (filterResults.length < DEFAULT_RESULTS.length) {
      const placeholders = filterResults.map(() => "?").join(",");
      extraClauses.push(`AND mp.result IN (${placeholders})`);
      extraParams.push(...filterResults);
    }

    if (filterFormats.length === 0) {
      extraClauses.push("AND 1 = 0");
    } else if (filterFormats.length < DEFAULT_FORMATS.length) {
      const formatConditions = [];
      for (const fmt of filterFormats) {
        if (fmt === "1v1") {
          formatConditions.push(`((SELECT COUNT(DISTINCT mp_c.team_number) FROM match_participants mp_c WHERE mp_c.match_id = m.id) = 2 AND (SELECT MAX(t.cnt) FROM (SELECT COUNT(*) AS cnt FROM match_participants mp_i WHERE mp_i.match_id = m.id GROUP BY mp_i.team_number) t) = 1)`);
        } else if (fmt === "2v2") {
          formatConditions.push(`((SELECT COUNT(DISTINCT mp_c.team_number) FROM match_participants mp_c WHERE mp_c.match_id = m.id) = 2 AND (SELECT MAX(t.cnt) FROM (SELECT COUNT(*) AS cnt FROM match_participants mp_i WHERE mp_i.match_id = m.id GROUP BY mp_i.team_number) t) = 2)`);
        } else if (fmt === "3v3") {
          formatConditions.push(`((SELECT COUNT(DISTINCT mp_c.team_number) FROM match_participants mp_c WHERE mp_c.match_id = m.id) = 2 AND (SELECT MAX(t.cnt) FROM (SELECT COUNT(*) AS cnt FROM match_participants mp_i WHERE mp_i.match_id = m.id GROUP BY mp_i.team_number) t) = 3)`);
        } else if (fmt === "multiman") {
          formatConditions.push(`((SELECT COUNT(DISTINCT mp_c.team_number) FROM match_participants mp_c WHERE mp_c.match_id = m.id) > 2 OR (SELECT MAX(t.cnt) FROM (SELECT COUNT(*) AS cnt FROM match_participants mp_i WHERE mp_i.match_id = m.id GROUP BY mp_i.team_number) t) > 3)`);
        }
      }
      extraClauses.push(`AND (${formatConditions.join(" OR ")})`);
    }

    if (selectedWrestlers.length > 0) {
      const conditions = selectedWrestlers.map(() => `
        EXISTS (
          SELECT 1 FROM match_participants mp3
          JOIN wrestlers w3 ON mp3.wrestler_id = w3.id
          WHERE mp3.match_id = m.id
            AND mp3.wrestler_id != ?
            AND LOWER(w3.wrestler) LIKE ?
        )
      `).join(" AND ");
      extraClauses.push(`AND (${conditions})`);
      selectedWrestlers.forEach((w) => {
        extraParams.push(wrestlerId, `%${w.toLowerCase()}%`);
      });
    }

    if (selectedShows.length > 0) {
      const conditions = selectedShows
        .map(() => `(LOWER(COALESCE(s.name, p.name, e.name)) = ? OR LOWER(e.name) LIKE ?)`)
        .join(" OR ");
      extraClauses.push(`AND (${conditions})`);
      selectedShows.forEach((sh) => {
        extraParams.push(sh.toLowerCase(), `%${sh.toLowerCase()}%`);
      });
    }

    if (filterTitle) {
      extraClauses.push(`AND m.title_match = 1`);
    }

    const stipClauses = [];
    if (filterStip) {
      stipClauses.push("(m.match_type_id NOT IN (1, 2, 23, 32) AND LOWER(COALESCE(mt.name, '')) != 'singles')");
    }
    if (selectedStips.length > 0) {
      const specificStipConditions = selectedStips.map((stip) => {
        if (stip.toLowerCase() === "singles") {
          return "(m.match_type_id = 1 OR LOWER(mt.name) = 'singles')";
        }
        return "LOWER(mt.name) LIKE ?";
      });
      selectedStips.forEach((stip) => {
        if (stip.toLowerCase() !== "singles") {
          extraParams.push(`%${stip.toLowerCase()}%`);
        }
      });
      stipClauses.push(...specificStipConditions);
    }
    if (stipClauses.length > 0) {
      extraClauses.push(`AND (${stipClauses.join(" OR ")})`);
    }

    if (selectedChamps.length > 0) {
      const conditions = selectedChamps.map(() => "LOWER(c.title_name) LIKE ?").join(" OR ");
      extraClauses.push(`AND (${conditions})`);
      selectedChamps.forEach((champ) => {
        extraParams.push(`%${champ.toLowerCase()}%`);
      });
    }

    const extraSql = extraClauses.join("\n");

    // ─── Grupo 1: datos del header + opciones de filtros (7 conexiones simultáneas) ─────────────
    const [
      [assocInterpreters],
      [[statsRow]],
      [[lastInterpRow]],
      [champRows],
      [stipRows],
      [wrestlerListRows],
      [showListRows],
    ] = await Promise.all([
      pool.query(
        `SELECT wi.interpreter_id, i.interpreter AS interpreter_name, i.nationality AS interpreter_country
         FROM wrestler_interpreter wi
         JOIN interpreters i ON wi.interpreter_id = i.id
         WHERE wi.wrestler_id = ?`,
        [wrestlerId],
      ),
      pool.query(
        `SELECT COUNT(NULLIF(mp.result, '')) AS total,
           SUM(CASE WHEN mp.result='WIN'  THEN 1 ELSE 0 END) AS wins,
           SUM(CASE WHEN mp.result='DRAW' THEN 1 ELSE 0 END) AS draws,
           SUM(CASE WHEN mp.result='LOSS' THEN 1 ELSE 0 END) AS losses,
           MIN(CASE WHEN NULLIF(mp.result, '') IS NOT NULL THEN e.event_date END) AS firstMatch, 
           MAX(CASE WHEN NULLIF(mp.result, '') IS NOT NULL THEN e.event_date END) AS lastMatch
         FROM match_participants mp
         JOIN matches m ON mp.match_id = m.id
         JOIN events  e ON m.event_id  = e.id
         WHERE mp.wrestler_id = ?`,
        [wrestlerId],
      ),
      pool.query(
        `SELECT mp.interpreter_id, i.interpreter AS interpreter_name, i.nationality AS interpreter_country
         FROM match_participants mp JOIN matches m ON mp.match_id=m.id
         JOIN events e ON m.event_id=e.id JOIN interpreters i ON mp.interpreter_id=i.id
         WHERE mp.wrestler_id=? AND mp.interpreter_id IS NOT NULL
         ORDER BY e.event_date DESC LIMIT 1`,
        [wrestlerId],
      ),
      pool.query(
        `SELECT id, title_name AS name FROM championships WHERE show_in_ui = 1 ORDER BY id ASC`,
      ),
      pool.query(
        `SELECT id, name FROM match_types ORDER BY order_in_page ASC`,
      ),
      pool.query(
        `SELECT DISTINCT w2.id, w2.wrestler AS name
         FROM match_participants mp1
         JOIN match_participants mp2 ON mp1.match_id = mp2.match_id AND mp2.wrestler_id != mp1.wrestler_id
         JOIN wrestlers w2 ON mp2.wrestler_id = w2.id
         WHERE mp1.wrestler_id = ?
         ORDER BY w2.wrestler ASC`,
        [wrestlerId],
      ),
      pool.query(
        `SELECT DISTINCT COALESCE(s.name, p.name, e.name) AS name
         FROM match_participants mp
         JOIN matches m ON mp.match_id = m.id
         JOIN events e ON m.event_id = e.id
         LEFT JOIN shows s ON e.show_id = s.id
         LEFT JOIN ples p ON e.ple_id = p.id
         WHERE mp.wrestler_id = ?
           AND COALESCE(s.name, p.name, e.name) IS NOT NULL
         ORDER BY name ASC`,
        [wrestlerId],
      ),
    ]);

    // ─── Grupo 2: matches paginados + count (2 conexiones simultáneas) ────
    const [[rawMatches], [[{ total: matchesTotal }]]] = await Promise.all([
      pool.query(
        `SELECT m.id, m.event_id, m.title_match, e.name AS event, e.event_date, m.match_order,
           mp.team_number, mp.result, mt.id AS match_type_id, mt.name AS match_type_name,
           c.id AS championship_id, c.title_name AS championship_name,
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('wrestler_id',mp2.wrestler_id,'wrestler',w2.wrestler,'team_number',mp2.team_number,'result',mp2.result))
            FROM match_participants mp2 JOIN wrestlers w2 ON mp2.wrestler_id=w2.id WHERE mp2.match_id=m.id) AS participants,
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number',mts.team_number,'score',mts.score))
            FROM match_team_scores mts WHERE mts.match_id=m.id) AS scores
         FROM match_participants mp
         JOIN matches m ON mp.match_id=m.id JOIN events e ON m.event_id=e.id
         LEFT JOIN shows s ON e.show_id = s.id
         LEFT JOIN ples p ON e.ple_id = p.id
         LEFT JOIN match_types mt ON m.match_type_id=mt.id
         LEFT JOIN championships c ON m.championship_id=c.id
         WHERE mp.wrestler_id=? ${extraSql}
         GROUP BY m.id,mp.team_number,mp.result,m.match_order,m.event_id,e.name,e.event_date,mt.id,mt.name,c.id,c.title_name,m.title_match,s.name,p.name
         ORDER BY e.event_date DESC, m.match_order DESC LIMIT ? OFFSET ?`,
        [wrestlerId, ...extraParams, limit, offset],
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM match_participants mp
         JOIN matches m ON mp.match_id=m.id JOIN events e ON m.event_id=e.id
         LEFT JOIN shows s ON e.show_id = s.id
         LEFT JOIN ples p ON e.ple_id = p.id
         LEFT JOIN match_types mt ON m.match_type_id=mt.id
         LEFT JOIN championships c ON m.championship_id=c.id
         WHERE mp.wrestler_id=? ${extraSql}`,
        [wrestlerId, ...extraParams],
      ),
    ]);

    let currentInterpreter = null;
    let formerInterpreters = [];

    if (wrestler.brand === "Alumni") {
      formerInterpreters = assocInterpreters.map((r) => ({
        id: r.interpreter_id,
        name: r.interpreter_name,
        country: r.interpreter_country,
      }));
    } else if (lastInterpRow?.interpreter_id) {
      currentInterpreter = {
        id: lastInterpRow.interpreter_id,
        name: lastInterpRow.interpreter_name,
        country: lastInterpRow.interpreter_country,
      };
      formerInterpreters = assocInterpreters
        .filter((r) => r.interpreter_id !== lastInterpRow.interpreter_id)
        .map((r) => ({
          id: r.interpreter_id,
          name: r.interpreter_name,
          country: r.interpreter_country,
        }));
    } else {
      formerInterpreters = assocInterpreters.map((r) => ({
        id: r.interpreter_id,
        name: r.interpreter_name,
        country: r.interpreter_country,
      }));
    }

    const matchesDetail = rawMatches.map((row) => ({
      id: row.id,
      event_id: row.event_id,
      event: row.event,
      event_date: row.event_date.toISOString(),
      match_order: row.match_order,
      team_number: row.team_number,
      result: row.result,
      title_match: row.title_match === 1,
      match_type_id: row.match_type_id,
      match_type_name: row.match_type_name,
      championship_id: row.championship_id,
      championship_name: row.championship_name,
      participants: row.participants || [],
      scores: row.scores || [],
    }));

    const stats = {
      total: statsRow?.total || 0,
      wins: statsRow?.wins || 0,
      draws: statsRow?.draws || 0,
      losses: statsRow?.losses || 0,
      firstMatch: statsRow?.firstMatch
        ? statsRow.firstMatch.toISOString()
        : null,
      lastMatch: statsRow?.lastMatch ? statsRow.lastMatch.toISOString() : null,
    };

    // ==========================================
    // CHAMPIONSHIPS & H2H TAB DATA
    // ==========================================
    const [[reignsRows], [h2hRawMatches]] = await Promise.all([
      pool.query(`
      SELECT 
          cr.id AS reign_id, 
          COALESCE(rm.start_date, cr.won_date) AS won_date, 
          COALESCE(rm.end_date, cr.lost_date) AS lost_date, 
          DATEDIFF(IFNULL(COALESCE(rm.end_date, cr.lost_date), UTC_DATE()), COALESCE(rm.start_date, cr.won_date)) AS days_held,
          c.title_name, c.id AS championship_id,
          COALESCE(
            (SELECT e.name 
             FROM events e 
             JOIN matches m ON m.event_id = e.id 
             WHERE m.championship_id = c.id AND m.title_match = 1 AND m.title_changed = 1 AND e.event_date = COALESCE(rm.start_date, cr.won_date) 
             LIMIT 1),
            (SELECT e.name FROM events e WHERE e.id = cr.event_id)
          ) AS won_event_name,
          COALESCE(
            (SELECT e.id 
             FROM events e 
             JOIN matches m ON m.event_id = e.id 
             WHERE m.championship_id = c.id AND m.title_match = 1 AND m.title_changed = 1 AND e.event_date = COALESCE(rm.start_date, cr.won_date) 
             LIMIT 1),
            cr.event_id
          ) AS won_event_id,
          (
            SELECT COUNT(DISTINCT m.id)
            FROM matches m
            JOIN events e ON e.id = m.event_id AND e.event_date >= COALESCE(rm.start_date, cr.won_date) AND (COALESCE(rm.end_date, cr.lost_date) IS NULL OR e.event_date <= COALESCE(rm.end_date, cr.lost_date))
            JOIN match_participants mp ON mp.match_id = m.id AND (mp.wrestler_id = ? OR mp.tag_team_id = cr.tag_team_id)
            WHERE m.championship_id = c.id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL AND mp.result IS NOT NULL AND mp.result != ''
          ) AS defenses_count,
          cr.wrestler_id, cr.tag_team_id,
          ct.image_url AS title_image
      FROM championship_reigns cr
      JOIN championships c ON cr.championship_id = c.id
      LEFT JOIN reign_members rm ON cr.id = rm.reign_id AND rm.wrestler_id = ?
      LEFT JOIN championship_titles ct ON c.id = ct.championship_id 
          AND COALESCE(rm.start_date, cr.won_date) >= ct.start_date 
          AND (COALESCE(rm.start_date, cr.won_date) <= ct.end_date OR ct.end_date IS NULL)
      WHERE cr.wrestler_id = ? OR rm.wrestler_id = ?
      ORDER BY won_date ASC
    `, [wrestlerId, wrestlerId, wrestlerId, wrestlerId]),
      pool.query(`
        SELECT m.id AS match_id, m.title_match, e.id AS event_id, e.name AS event_name,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('wrestler_id', mp2.wrestler_id, 'wrestler', w2.wrestler, 'country', w2.country, 'team_number', mp2.team_number, 'result', mp2.result))
           FROM match_participants mp2 JOIN wrestlers w2 ON w2.id = mp2.wrestler_id WHERE mp2.match_id = m.id) AS participants,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number', mts.team_number, 'score', mts.score))
           FROM match_team_scores mts WHERE mts.match_id = m.id) AS scores
        FROM match_participants mp
        JOIN matches m ON mp.match_id = m.id
        JOIN events e ON m.event_id = e.id
        WHERE mp.wrestler_id = ? AND mp.result IS NOT NULL AND mp.result != ''
        GROUP BY m.id, m.title_match, e.id, e.name, e.event_date, m.match_order
        ORDER BY e.event_date ASC, m.match_order ASC
      `, [wrestlerId]),
    ]);

    let globalDefenses = [];
    if (reignsRows.length > 0) {
      const reignIds = reignsRows.map(r => r.reign_id);
      const placeholders = reignIds.map(() => "?").join(",");
      const [defenseMatches] = await pool.query(`
        SELECT cr.id AS reign_id, m.id AS match_id, m.title_changed, e.id AS event_id, e.name AS event_name,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('wrestler_id', mp.wrestler_id, 'wrestler', w2.wrestler, 'team_number', mp.team_number, 'result', mp.result, 'tag_team_id', mp.tag_team_id))
             FROM match_participants mp JOIN wrestlers w2 ON w2.id = mp.wrestler_id WHERE mp.match_id = m.id) AS participants,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number', mts.team_number, 'score', mts.score))
             FROM match_team_scores mts WHERE mts.match_id = m.id) AS scores,
            cr.wrestler_id AS champ_wrestler_id, cr.tag_team_id AS champ_tag_team_id
        FROM matches m JOIN events e ON m.event_id = e.id
        JOIN championship_reigns cr ON m.championship_id = cr.championship_id AND m.title_match = 1 AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date <= cr.lost_date)
        JOIN match_participants mp_champ ON mp_champ.match_id = m.id AND (
            (cr.wrestler_id IS NOT NULL AND mp_champ.wrestler_id = cr.wrestler_id) OR
            (cr.tag_team_id IS NOT NULL AND mp_champ.tag_team_id = cr.tag_team_id) OR
            (mp_champ.wrestler_id = ?)
        )
        WHERE cr.id IN (${placeholders}) AND mp_champ.result IS NOT NULL AND mp_champ.result != ''
        GROUP BY cr.id, m.id, m.title_changed, e.id, e.name, cr.wrestler_id, cr.tag_team_id
        ORDER BY e.event_date ASC, m.match_order ASC
      `, [wrestlerId, ...reignIds]);
      globalDefenses = defenseMatches;
    }

    const defensesByReign = {};
    const breakerByReign = {};

    for (const match of globalDefenses) {
      let parts = typeof match.participants === "string" ? JSON.parse(match.participants) : (match.participants || []);
      let scores = typeof match.scores === "string" ? JSON.parse(match.scores) : (match.scores || []);

      const myP = parts.find(x => x.wrestler_id === wrestlerId);
      if (!myP) continue;
      const myTeam = myP.team_number;
      const myResult = myP.result;

      const scoreMap = scores.reduce((acc, s) => { acc[s.team_number] = s.score; return acc; }, {});
      let defendingWrestlers = parts.filter((x) => x.team_number === myTeam);
      let opponents = parts.filter((x) => x.team_number !== myTeam);
      const isTagTeamChampionship = match.champ_tag_team_id !== null;

      let scoreStr = null;
      if (Object.keys(scoreMap).length > 0 && scoreMap[myTeam] != null) {
        const oppTeamNumbers = [...new Set(opponents.map((x) => x.team_number))];
        if (oppTeamNumbers.length === 1 && scoreMap[oppTeamNumbers[0]] != null) {
          scoreStr = `${scoreMap[myTeam]}-${scoreMap[oppTeamNumbers[0]]}`;
        } else if (oppTeamNumbers.length > 1) {
          scoreStr = `${scoreMap[myTeam]}-` + oppTeamNumbers.map((tn) => scoreMap[tn] ?? 0).join("-");
        }
      }

      const matchDetail = {
        event_id: match.event_id, event_name: match.event_name, result: myResult, scoreStr,
        isTagTeamChampionship: isTagTeamChampionship,
        partners: isTagTeamChampionship ? defendingWrestlers.map((x) => ({ id: x.wrestler_id, name: x.wrestler })) : defendingWrestlers.filter((x) => x.wrestler_id !== match.champ_wrestler_id).map((x) => ({ id: x.wrestler_id, name: x.wrestler })),
        opponents: opponents.map((x) => ({ id: x.wrestler_id, name: x.wrestler }))
      };

      if (match.title_changed === 1 && myResult !== "WIN") {
        breakerByReign[match.reign_id] = matchDetail;
      } else if (match.title_changed === 0) {
        if (!defensesByReign[match.reign_id]) defensesByReign[match.reign_id] = [];
        defensesByReign[match.reign_id].push(matchDetail);
      }
    }

    const timesMap = {};
    const processedReigns = reignsRows.map((r, index) => {
      if (!timesMap[r.championship_id]) timesMap[r.championship_id] = 0;
      timesMap[r.championship_id]++;
      const isCrownJewel = r.championship_id === 8 || (r.title_name && r.title_name.toLowerCase().includes("crown jewel"));
      return {
        ...r,
        isCrownJewel,
        times: timesMap[r.championship_id],
        chronologicalIndex: index + 1,
        days_held: isCrownJewel ? null : r.days_held,
        days_held_label: isCrownJewel ? "—" : (r.lost_date === null ? `${r.days_held}+` : r.days_held),
        defenses_count: isCrownJewel ? "—" : r.defenses_count,
        defenses: isCrownJewel ? [] : (defensesByReign[r.reign_id] || []),
        streakBreaker: isCrownJewel ? null : (breakerByReign[r.reign_id] || null),
        won_date: r.won_date ? r.won_date.toISOString().split('T')[0] : null,
        lost_date: r.lost_date ? r.lost_date.toISOString().split('T')[0] : null,
      };
    });

    const h2hMatches = buildH2hMatches(h2hRawMatches, wrestlerId, false);

    return {
      props: {
        wrestler,
        currentInterpreter,
        formerInterpreters,
        selectedWrestlers,
        selectedShows,
        selectedChamps,
        selectedStips,
        filterTitle,
        filterStip,
        filterResults,
        filterFormats,
        championshipsList: champRows.map((r) => ({ id: r.id, name: r.name })),
        stipulationsList: stipRows.map((r) => ({ id: r.id, name: r.name })),
        wrestlersList: wrestlerListRows.map((r) => ({ id: r.id, name: r.name })),
        showsList: showListRows.map((r) => ({ id: r.name, name: r.name })),
        championships: JSON.parse(JSON.stringify(processedReigns)),
        h2hMatches,
        matches: {
          stats,
          matches: matchesDetail,
          pagination: {
            page,
            limit,
            total: matchesTotal,
            totalPages: Math.ceil(matchesTotal / limit),
          },
        },
      },
    };
  } catch (err) {
    console.error("Error in wrestlers/[id] getServerSideProps:", err);
    return { props: { error: true } };
  }
}

export default function WrestlerDetail({
  error,
  wrestler,
  currentInterpreter,
  formerInterpreters = [],
  selectedWrestlers = [],
  selectedShows = [],
  selectedChamps = [],
  selectedStips = [],
  filterTitle = false,
  filterStip = false,
  filterResults = DEFAULT_RESULTS,
  filterFormats = DEFAULT_FORMATS,
  championshipsList = [],
  stipulationsList = [],
  wrestlersList = [],
  showsList = [],
  matches,
  championships = [],
  h2hMatches = [],
}) {
  const router = useRouter();

  if (error) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Error al cargar</h1>
        <p className="text-gray-500">
          No se pudo conectar a la base de datos. Intentá de nuevo en unos
          segundos.
        </p>
      </div>
    );
  }

  const { pagination } = matches;
  const toggleTitle = useQueryToggle("title", filterTitle, router);
  const toggleStip = useQueryToggle("stip", filterStip, router);
  const toggleResult = useQueryMultiSelect(
    "result",
    DEFAULT_RESULTS,
    filterResults,
    router,
  );
  const toggleFormat = useQueryMultiSelect(
    "format",
    DEFAULT_FORMATS,
    filterFormats,
    router,
  );
  const toggleWrestler = useQueryListToggle(
    "wrestler",
    selectedWrestlers,
    router,
  );
  const toggleShow = useQueryListToggle("filter", selectedShows, router);
  const toggleChamp = useQueryListToggle("champ", selectedChamps, router);
  const toggleStipItem = useQueryListToggle(
    "matchtype",
    selectedStips,
    router,
  );
  const { goToPage, renderPageButtons } = usePagination(pagination, router);
  const [activeTab, setActiveTab] = useState("matches");
  const [expandedRow, setExpandedRow] = useState(null);
  const [champSort, setChampSort] = useState({ key: 'won_date', dir: 'asc' });
  const [h2hOnly1v1, setH2hOnly1v1] = useState(false);
  const [h2hOnlyTitle, setH2hOnlyTitle] = useState(false);
  const [h2hSort, setH2hSort] = useState({ key: "total", dir: "desc" });
  const [expandedH2hRow, setExpandedH2hRow] = useState(null);

  const sortedH2H = useMemo(
    () => computeH2hRecords(h2hMatches, h2hOnly1v1, h2hOnlyTitle, h2hSort),
    [h2hMatches, h2hOnly1v1, h2hOnlyTitle, h2hSort],
  );

  const handleH2hSort = (key) => {
    setH2hSort((prev) => ({
      key,
      dir: prev.key === key ? (prev.dir === "desc" ? "asc" : "desc") : (key === "name" ? "asc" : "desc"),
    }));
  };

  const sortedChampionships = useMemo(() => {
    if (!championships) return [];
    return [...championships].sort((a, b) => {
      let valA = a[champSort.key];
      let valB = b[champSort.key];

      if (champSort.key === 'days_held_label') {
        valA = a.isCrownJewel ? -1 : (a.days_held ?? -1);
        valB = b.isCrownJewel ? -1 : (b.days_held ?? -1);
      } else if (champSort.key === 'defenses_count') {
        valA = a.isCrownJewel ? -1 : (a.defenses_count === '—' ? -1 : a.defenses_count);
        valB = b.isCrownJewel ? -1 : (b.defenses_count === '—' ? -1 : b.defenses_count);
      } else if (champSort.key === 'won_date') {
        valA = new Date(a.won_date).getTime();
        valB = new Date(b.won_date).getTime();
      }
      
      if (valA < valB) return champSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return champSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [championships, champSort]);

  const handleSort = (key) => {
    setChampSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleResetFilters = () => {
    router.push({ pathname: router.pathname, query: { id: wrestler.id } }, undefined, {
      scroll: false,
    });
  };

  const renderMatchDetail = (m, indexNumber, isBreaker = false) => {
    const resultColor = m.result === "WIN" ? "text-[#16a34a] dark:text-[#93c47d]" : m.result === "LOSS" ? "text-red-500" : m.result === "DRAW" ? "text-[#d97706] dark:text-[#ffe599]" : "text-gray-500";
    return (
      <li key={indexNumber} className="pl-1 flex items-start text-sm">
        <span className={`mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono ${isBreaker ? "line-through opacity-70" : ""}`}>{indexNumber}.</span>
        <div className="flex-1">
          <strong className={resultColor}>{m.result}</strong>{" "}
          {m.isTagTeamChampionship 
            ? m.partners.length > 0 && <span className="text-gray-600 dark:text-gray-400">{m.partners.map((pt, idx) => (<span key={pt.id}>{idx > 0 && " & "}<Link href={`/wrestlers/${pt.id}`} className="text-blue-600 dark:text-sky-400 hover:underline" onClick={(e) => e.stopPropagation()}>{pt.name}</Link></span>))} </span>
            : m.partners.length > 0 && <span className="text-gray-600 dark:text-gray-400">w/ {m.partners.map((pt, idx) => (<span key={pt.id}>{idx > 0 && " & "}<Link href={`/wrestlers/${pt.id}`} className="text-blue-600 dark:text-sky-400 hover:underline" onClick={(e) => e.stopPropagation()}>{pt.name}</Link></span>))} </span>}
          {m.scoreStr ? <span className="font-bold mx-1">{m.scoreStr}</span> : <span className="text-gray-600 dark:text-gray-400 mx-1">vs</span>}
          {m.opponents.map((opp, idx) => (<span key={opp.id}>{idx > 0 && " & "}<Link href={`/wrestlers/${opp.id}`} className="text-blue-600 dark:text-sky-400 hover:underline" onClick={(e) => e.stopPropagation()}>{opp.name}</Link></span>))}
          <span className="text-gray-500 text-[11px] ml-2 block sm:inline">(<Link href={`/events/${m.event_id}`} className="text-gray-500 dark:text-gray-400 hover:underline" onClick={(e) => e.stopPropagation()}>{m.event_name}</Link>)</span>
        </div>
      </li>
    );
  };

  return (
    <>
      <Head>
        <title>{`${wrestler.wrestler} — Trivias WWE`}</title>
        <meta
          name="description"
          content={`Historial de matches, stats y trayectoria de ${wrestler.wrestler} en Trivias WWE.`}
        />
      </Head>

      <div className="p-4 max-w-3xl mx-auto">
        {/* Pestañas de navegación */}
        <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-800 mb-6 mt-4">
          <button
            onClick={() => setActiveTab("matches")}
            className={`pb-2 px-1 border-b-2 font-medium text-lg transition-colors cursor-pointer ${
              activeTab === "matches"
                ? "border-blue-600 text-blue-600 dark:text-sky-400 dark:border-sky-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Matches
          </button>
          {championships && championships.length > 0 && (
            <button
              onClick={() => setActiveTab("championships")}
              className={`pb-2 px-1 border-b-2 font-medium text-lg transition-colors cursor-pointer ${
                activeTab === "championships"
                  ? "border-blue-600 text-blue-600 dark:text-sky-400 dark:border-sky-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Championships
            </button>
          )}
          <button
            onClick={() => setActiveTab("h2h")}
            className={`pb-2 px-1 border-b-2 font-medium text-lg transition-colors cursor-pointer ${
              activeTab === "h2h"
                ? "border-blue-600 text-blue-600 dark:text-sky-400 dark:border-sky-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Head-to-Head Records
          </button>
        </div>
        <div className="md:flex md:items-stretch md:space-x-6">
          <div className="md:flex-1">
            <h1 className="text-3xl font-bold mb-2">{wrestler.wrestler}</h1>

            <p className="text-gray-600 mb-1 dark:text-white">
              Country:{" "}
              {wrestler.country ? (
                <FlagWithName code={wrestler.country} />
              ) : (
                "Unknown"
              )}
            </p>
            <p className="text-gray-600 mb-1 dark:text-white">
              Debut:{" "}
              {matches.stats.firstMatch
                ? formatDateDDMMYYYY(matches.stats.firstMatch)
                : "—"}
            </p>

            {currentInterpreter ? (
              <p className="text-gray-600 mb-1 dark:text-white">
                Interpreter:{" "}
                <Link
                  href={`/interpreters/${currentInterpreter.id}`}
                  className="text-blue-600 dark:text-sky-300 "
                >
                  <FlagWithName
                    code={currentInterpreter.country}
                    name={currentInterpreter.name}
                  />
                </Link>
              </p>
            ) : wrestler.brand !== "Alumni" ? (
              <p className="text-gray-600 mb-1 dark:text-white">
                Interpreter: <strong>None</strong>
              </p>
            ) : null}

            {formerInterpreters.length > 0 && (
              <p className="text-gray-600 mb-4 dark:text-white">
                Former interpreters:{" "}
                {formerInterpreters.map((intp, idx) => (
                  <span key={intp.id}>
                    <Link
                      href={`/interpreters/${intp.id}`}
                      className="text-blue-600 dark:text-sky-300 "
                    >
                      <FlagWithName code={intp.country} name={intp.name} />
                    </Link>
                    {idx < formerInterpreters.length - 1 && ", "}
                  </span>
                ))}
              </p>
            )}

            <h2 className="text-2xl font-semibold mt-6 mb-2">Stats</h2>
            <ul className="mb-4 text-gray-700 space-y-1 dark:text-white">
              <li>Total matches: {matches.stats.total}</li>
              <li>Wins: {matches.stats.wins}</li>
              <li>Draws: {matches.stats.draws}</li>
              <li>Losses: {matches.stats.losses}</li>
              <li>
                First match:{" "}
                {matches.stats.firstMatch
                  ? formatDateDDMMYYYY(matches.stats.firstMatch)
                  : "—"}
              </li>
              <li>
                Last match:{" "}
                {matches.stats.lastMatch
                  ? formatDateDDMMYYYY(matches.stats.lastMatch)
                  : "—"}
              </li>
            </ul>
          </div>

          {wrestler.image_url && (
            <div className="md:w-1/2 md:flex-shrink-0 md:self-stretch">
              <div className="relative w-full h-full">
                <Image
                  src={wrestler.image_url}
                  alt={wrestler.wrestler}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover rounded"
                />
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent dark:from-zinc-950 rounded-b" />
              </div>
            </div>
          )}
        </div>

        {activeTab === "matches" && (
          <>
            <MatchFilters
              filterResults={filterResults}
              toggleResult={toggleResult}
              filterFormats={filterFormats}
              toggleFormat={toggleFormat}
              hasFormatFilter={true}
              filterTitle={filterTitle}
              toggleTitle={toggleTitle}
              filterStip={filterStip}
              toggleStip={toggleStip}
              selectedChamps={selectedChamps}
              toggleChamp={toggleChamp}
              selectedStips={selectedStips}
              toggleStipItem={toggleStipItem}
              selectedWrestlers={selectedWrestlers}
              toggleWrestler={toggleWrestler}
              selectedShows={selectedShows}
              toggleShow={toggleShow}
              championshipsList={championshipsList}
              stipulationsList={stipulationsList}
              wrestlersList={wrestlersList}
              showsList={showsList}
              onReset={handleResetFilters}
            />

            <ul className="space-y-3">
              {matches.matches.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No matches found.
                </p>
              ) : (
                matches.matches.map((match, idx) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    currentId={wrestler.id}
                    idType="wrestler"
                    number={(pagination.page - 1) * pagination.limit + idx + 1}
                  />
                ))
              )}
            </ul>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center space-x-2 items-center">
                {renderPageButtons()}
              </div>
            )}
          </>
        )}

        {activeTab === "championships" && (
          <div className="mt-2">
            {championships.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No championships recorded.</p>
            ) : (
              <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 select-none">
                    <tr>
                      <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 text-center" onClick={() => handleSort('chronologicalIndex')}>
                        # {champSort.key === 'chronologicalIndex' && (champSort.dir === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleSort('title_name')}>
                        Championship {champSort.key === 'title_name' && (champSort.dir === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleSort('won_date')}>
                        Won {champSort.key === 'won_date' && (champSort.dir === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleSort('days_held_label')}>
                        Days Held {champSort.key === 'days_held_label' && (champSort.dir === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 font-semibold text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleSort('defenses_count')}>
                        Defenses {champSort.key === 'defenses_count' && (champSort.dir === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-zinc-950">
                    {sortedChampionships.map((r) => (
                      <React.Fragment key={r.reign_id}>
                        <tr 
                          className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                          onClick={() => setExpandedRow(expandedRow === r.reign_id ? null : r.reign_id)}
                        >
                          <td className="px-4 py-3 text-center text-gray-500 font-mono">
                            {r.chronologicalIndex}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-3">
                              {r.title_image && (
                                <Image src={r.title_image} alt={r.title_name} width={48} height={48} className="w-12 h-12 object-contain shrink-0" />
                              )}
                              <div>
                                {r.title_name}{r.times > 1 && <>&nbsp;<span className="text-xs text-gray-500 font-normal whitespace-nowrap">({r.times}x)</span></>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            <div className="flex flex-col">
                              <span>{formatDateDDMMYYYY(r.won_date)}</span>
                              {r.won_event_name && (
                                <span className="text-[11px] text-gray-400">
                                  <Link href={`/events/${r.won_event_id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{r.won_event_name}</Link>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {r.days_held_label}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white">
                            {r.defenses_count}
                          </td>
                        </tr>
                        {expandedRow === r.reign_id && (
                          <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                            <td colSpan={5} className="px-4 py-3 border-l-4 border-blue-500 dark:border-sky-500">
                              <ul className="space-y-2 py-1 max-w-full overflow-hidden whitespace-normal">
                                {r.isCrownJewel ? (
                                  <>
                                    <li className="text-gray-500 dark:text-gray-400 text-sm italic pl-1">Not defended championship.</li>
                                    {!r.streakBreaker && r.lost_date === null && <li className="text-blue-600 dark:text-sky-400 text-sm italic pl-1 mt-2 font-medium">Current Champion</li>}
                                  </>
                                ) : (
                                  <>
                                    {r.defenses.length > 0 ? r.defenses.map((m, i) => renderMatchDetail(m, i + 1, false)) : <li className="text-gray-500 dark:text-gray-400 text-sm italic pl-1">No successful defenses.</li>}
                                    {r.streakBreaker && renderMatchDetail(r.streakBreaker, r.defenses.length + 1, true)}
                                    {!r.streakBreaker && r.lost_date === null && <li className="text-blue-600 dark:text-sky-400 text-sm italic pl-1 mt-2 font-medium">Current Champion</li>}
                                  </>
                                )}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "h2h" && (
          <div className="mt-2">
            <div className="grid grid-cols-2 gap-2 w-full mb-4">
              <button
                type="button"
                onClick={() => setH2hOnly1v1((v) => !v)}
                className={`w-full px-3 py-2 rounded font-semibold text-xs transition-colors flex items-center justify-center select-none cursor-pointer ${
                  h2hOnly1v1
                    ? "bg-blue-600 text-white shadow"
                    : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                1-on-1
              </button>
              <button
                type="button"
                onClick={() => setH2hOnlyTitle((v) => !v)}
                className={`w-full px-3 py-2 rounded font-semibold text-xs transition-colors flex items-center justify-center select-none cursor-pointer ${
                  h2hOnlyTitle
                    ? "bg-blue-600 text-white shadow"
                    : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                Championship Matches
              </button>
            </div>

            {sortedH2H.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No head-to-head records found.</p>
            ) : (
              <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 select-none">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-center">#</th>
                      <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleH2hSort("name")}>
                        Rival {h2hSort.key === "name" && (h2hSort.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-3 font-semibold text-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleH2hSort("total")}>
                        Matches {h2hSort.key === "total" && (h2hSort.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-3 font-semibold text-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleH2hSort("wins")}>
                        Wins {h2hSort.key === "wins" && (h2hSort.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-3 font-semibold text-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleH2hSort("draws")}>
                        Draws {h2hSort.key === "draws" && (h2hSort.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-3 font-semibold text-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleH2hSort("losses")}>
                        Losses {h2hSort.key === "losses" && (h2hSort.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-3 font-semibold text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleH2hSort("diff")}>
                        +/- {h2hSort.key === "diff" && (h2hSort.dir === "asc" ? "↑" : "↓")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-zinc-950">
                    {sortedH2H.map((r, idx) => (
                      <React.Fragment key={r.id}>
                        <tr
                          className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                          onClick={() => setExpandedH2hRow(expandedH2hRow === r.id ? null : r.id)}
                        >
                          <td className="px-4 py-3 text-center text-gray-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                            <Link
                              href={`/wrestlers/${r.id}`}
                              className="text-blue-600 dark:text-sky-400 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FlagWithName code={r.country} name={r.name} />
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-white">
                            {r.total}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                            {r.wins}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                            {r.draws}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                            {r.losses}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold ${
                              r.diff > 0
                                ? "text-[#16a34a] dark:text-[#93c47d]"
                                : r.diff < 0
                                  ? "text-red-500"
                                  : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {r.diff > 0 ? `+${r.diff}` : r.diff}
                          </td>
                        </tr>
                        {expandedH2hRow === r.id && (
                          <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                            <td colSpan={7} className="px-4 py-3 border-l-4 border-blue-500 dark:border-sky-500">
                              <ul className="space-y-2 py-1 max-w-full overflow-hidden whitespace-normal">
                                {r.matches.map((m, i) => renderMatchDetail(m, i + 1, false))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
