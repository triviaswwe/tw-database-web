// pages/records.js

import React, { useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import pool from "../lib/db";
import FlagWithName from "../components/FlagWithName";

export async function getServerSideProps() {
  try {
    // 1. Luchadores con más matches (Con desglose de intérpretes)
    const [matchesRows] = await pool.query(`
      SELECT w.id, w.wrestler AS name, w.country, COUNT(mp.match_id) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'name', IFNULL(i.interpreter, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT interpreter_id, COUNT(match_id) as cnt
            FROM match_participants
            WHERE wrestler_id = w.id
            GROUP BY interpreter_id
          ) sub
          LEFT JOIN interpreters i ON sub.interpreter_id = i.id
        ) AS interpreters_breakdown
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      GROUP BY w.id, w.wrestler, w.country
      ORDER BY total DESC
      LIMIT 10
    `);

    // 2. Luchadores con más victorias (Con desglose de intérpretes)
    const [winsRows] = await pool.query(`
      SELECT w.id, w.wrestler AS name, w.country, SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'name', IFNULL(i.interpreter, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT interpreter_id, SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as cnt
            FROM match_participants
            WHERE wrestler_id = w.id
            GROUP BY interpreter_id
            HAVING cnt > 0
          ) sub
          LEFT JOIN interpreters i ON sub.interpreter_id = i.id
        ) AS interpreters_breakdown
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      GROUP BY w.id, w.wrestler, w.country
      ORDER BY total DESC
      LIMIT 10
    `);

    const processInterpreters = (rows) => rows.map(r => {
      let breakdown = r.interpreters_breakdown;
      if (typeof breakdown === 'string') {
        try { breakdown = JSON.parse(breakdown); } 
        catch (e) { breakdown = []; }
      }
      return { ...r, interpreters_breakdown: breakdown || [] };
    });

    const processedMatches = processInterpreters(matchesRows);
    const processedWins = processInterpreters(winsRows);

    // 3. Intérpretes
    const [interpreterRows] = await pool.query(`
      SELECT 
        i.id, 
        i.interpreter AS name, 
        i.nationality AS country,
        COUNT(mp.match_id) AS total_matches,
        SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
        ROUND((SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) * 100.0) / COUNT(mp.match_id), 2) AS win_percentage
      FROM match_participants mp
      JOIN interpreters i ON mp.interpreter_id = i.id
      GROUP BY i.id, i.interpreter, i.nationality
      ORDER BY wins DESC, win_percentage DESC
      LIMIT 10
    `);

    // 4. Historial cronológico con equipos, puntajes y FECHA para desgloses
    const [historyRows] = await pool.query(`
      SELECT
        m.id AS match_id, e.id AS event_id, e.name AS event_name, e.event_date,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'wrestler_id', mp.wrestler_id, 
            'wrestler', w.wrestler, 
            'country', w.country, 
            'team_number', mp.team_number, 
            'result', mp.result
          ))
          FROM match_participants mp JOIN wrestlers w ON mp.wrestler_id = w.id
          WHERE mp.match_id = m.id
        ) AS participants,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number', mts.team_number, 'score', mts.score))
          FROM match_team_scores mts WHERE mts.match_id = m.id
        ) AS scores
      FROM matches m
      JOIN events e ON m.event_id = e.id
      ORDER BY e.event_date ASC, m.match_order ASC
    `);

    const allWinStreaks = [];
    const allUndefeatedStreaks = [];
    let streakCounter = 0;
    const stateMap = new Map();

    for (const match of historyRows) {
      let parts = match.participants;
      let scores = match.scores;
      if (typeof parts === "string") parts = JSON.parse(parts);
      if (typeof scores === "string") scores = JSON.parse(scores);
      parts = parts || [];
      scores = scores || [];

      const scoreMap = scores.reduce((acc, s) => {
        acc[s.team_number] = s.score;
        return acc;
      }, {});

      for (const p of parts) {
        if (!stateMap.has(p.wrestler_id)) {
          stateMap.set(p.wrestler_id, {
            wrestlerId: p.wrestler_id,
            name: p.wrestler,
            country: p.country,
            winCount: 0,
            winMatches: [],
            undefCount: 0,
            undefMatches: [],
            undefStartDate: null,
          });
        }
        const st = stateMap.get(p.wrestler_id);

        const myTeam = p.team_number;
        const partners = parts.filter(
          (x) => x.team_number === myTeam && x.wrestler_id !== p.wrestler_id,
        );
        const opponents = parts.filter((x) => x.team_number !== myTeam);

        let scoreStr = null;
        const hasScores = Object.keys(scoreMap).length > 0;
        if (hasScores && scoreMap[myTeam] != null) {
          const oppTeamNumbers = [
            ...new Set(opponents.map((x) => x.team_number)),
          ];
          if (
            oppTeamNumbers.length === 1 &&
            scoreMap[oppTeamNumbers[0]] != null
          ) {
            scoreStr = `${scoreMap[myTeam]}-${scoreMap[oppTeamNumbers[0]]}`;
          } else if (oppTeamNumbers.length > 1) {
            scoreStr =
              `${scoreMap[myTeam]}-` +
              oppTeamNumbers.map((tn) => scoreMap[tn] ?? 0).join("-");
          }
        }

        const matchDetail = {
          event_id: match.event_id,
          event_name: match.event_name,
          result: p.result,
          scoreStr,
          partners: partners.map((x) => ({
            id: x.wrestler_id,
            name: x.wrestler,
          })),
          opponents: opponents.map((x) => ({
            id: x.wrestler_id,
            name: x.wrestler,
          })),
        };

        const matchDate = new Date(match.event_date);

        if (p.result === "WIN") {
          st.winCount++;
          st.winMatches.push(matchDetail);
        } else {
          if (st.winCount > 0) {
            allWinStreaks.push({
              id: `win_${++streakCounter}`,
              wrestlerId: st.wrestlerId,
              name: st.name,
              country: st.country,
              count: st.winCount,
              matches: [...st.winMatches],
              streakBreaker: matchDetail,
            });
            st.winCount = 0;
            st.winMatches = [];
          }
        }

        if (p.result === "WIN" || p.result === "DRAW") {
          if (st.undefCount === 0) st.undefStartDate = matchDate;
          st.undefCount++;
          st.undefMatches.push(matchDetail);
        } else if (p.result === "LOSS") {
          if (st.undefCount > 0) {
            const days = Math.floor(
              (matchDate - st.undefStartDate) / (1000 * 60 * 60 * 24),
            );
            allUndefeatedStreaks.push({
              id: `undef_${++streakCounter}`,
              wrestlerId: st.wrestlerId,
              name: st.name,
              country: st.country,
              count: st.undefCount,
              matches: [...st.undefMatches],
              days: days,
              streakBreaker: matchDetail,
            });
            st.undefCount = 0;
            st.undefMatches = [];
            st.undefStartDate = null;
          }
        }
      }
    }

    const now = new Date();
    for (const st of stateMap.values()) {
      if (st.winCount > 0) {
        allWinStreaks.push({
          id: `win_${++streakCounter}`,
          wrestlerId: st.wrestlerId,
          name: st.name,
          country: st.country,
          count: st.winCount,
          matches: [...st.winMatches],
          streakBreaker: null,
        });
      }
      if (st.undefCount > 0) {
        const days = Math.floor(
          (now - st.undefStartDate) / (1000 * 60 * 60 * 24),
        );
        allUndefeatedStreaks.push({
          id: `undef_${++streakCounter}`,
          wrestlerId: st.wrestlerId,
          name: st.name,
          country: st.country,
          count: st.undefCount,
          matches: [...st.undefMatches],
          days: days,
          streakBreaker: null,
        });
      }
    }

    const topWinStreaks = allWinStreaks
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topUndefeated = allUndefeatedStreaks
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. Reinados más largos y con más defensas
    const [longestReignsRows] = await pool.query(`
      SELECT
          cr.id AS reign_id,
          cr.won_date,
          cr.lost_date,
          DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
          cr.wrestler_id,
          w.wrestler AS wrestler_name,
          w.country,
          cr.tag_team_id,
          tt.name AS tag_team_name,
          c.title_name,
          (
              SELECT COUNT(DISTINCT m.id)
              FROM matches m
              JOIN events e ON e.id = m.event_id AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)
              JOIN match_participants mp ON mp.match_id = m.id AND (
                  (cr.wrestler_id IS NOT NULL AND mp.wrestler_id = cr.wrestler_id) OR
                  (cr.tag_team_id IS NOT NULL AND mp.tag_team_id = cr.tag_team_id)
              )
              WHERE m.championship_id = cr.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL
          ) AS defenses_count
      FROM championship_reigns cr
      LEFT JOIN wrestlers w ON cr.wrestler_id = w.id
      LEFT JOIN tag_teams tt ON cr.tag_team_id = tt.id
      JOIN championships c ON cr.championship_id = c.id
      ORDER BY days_held DESC
      LIMIT 10
    `);

    const [mostDefensesRows] = await pool.query(`
      SELECT
          cr.id AS reign_id,
          cr.won_date,
          cr.lost_date,
          DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
          cr.wrestler_id,
          w.wrestler AS wrestler_name,
          w.country,
          cr.tag_team_id,
          tt.name AS tag_team_name,
          c.title_name,
          (
              SELECT COUNT(DISTINCT m.id)
              FROM matches m
              JOIN events e ON e.id = m.event_id AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)
              JOIN match_participants mp ON mp.match_id = m.id AND (
                  (cr.wrestler_id IS NOT NULL AND mp.wrestler_id = cr.wrestler_id) OR
                  (cr.tag_team_id IS NOT NULL AND mp.tag_team_id = cr.tag_team_id)
              )
              WHERE m.championship_id = cr.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL
          ) AS defenses_count
      FROM championship_reigns cr
      LEFT JOIN wrestlers w ON cr.wrestler_id = w.id
      LEFT JOIN tag_teams tt ON cr.tag_team_id = tt.id
      JOIN championships c ON cr.championship_id = c.id
      ORDER BY defenses_count DESC, days_held DESC
      LIMIT 10
    `);

    // 6. Obtener el historial de defensas y derrotas para los reinados
    const reignIdsSet = new Set([
      ...longestReignsRows.map((r) => r.reign_id),
      ...mostDefensesRows.map((r) => r.reign_id),
    ]);
    const reignIdsArray = Array.from(reignIdsSet);

    let globalDefenses = [];
    if (reignIdsArray.length > 0) {
      const placeholders = reignIdsArray.map(() => "?").join(",");
      const [defenseMatches] = await pool.query(
        `
        SELECT
            cr.id AS reign_id,
            m.id AS match_id,
            m.title_changed,
            e.id AS event_id,
            e.name AS event_name,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT(
                    'wrestler_id', mp.wrestler_id,
                    'wrestler', w2.wrestler,
                    'country', w2.country,
                    'team_number', mp.team_number,
                    'result', mp.result,
                    'tag_team_id', mp.tag_team_id
                ))
                FROM match_participants mp
                JOIN wrestlers w2 ON w2.id = mp.wrestler_id
                WHERE mp.match_id = m.id
            ) AS participants,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number', mts.team_number, 'score', mts.score))
                FROM match_team_scores mts WHERE mts.match_id = m.id
            ) AS scores,
            cr.wrestler_id AS champ_wrestler_id,
            cr.tag_team_id AS champ_tag_team_id
        FROM matches m
        JOIN events e ON m.event_id = e.id
        JOIN championship_reigns cr ON m.championship_id = cr.championship_id AND m.title_match = 1
            AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date <= cr.lost_date)
        JOIN match_participants mp_champ ON mp_champ.match_id = m.id AND (
            (cr.wrestler_id IS NOT NULL AND mp_champ.wrestler_id = cr.wrestler_id) OR
            (cr.tag_team_id IS NOT NULL AND mp_champ.tag_team_id = cr.tag_team_id)
        )
        WHERE cr.id IN (${placeholders})
        GROUP BY cr.id, m.id, m.title_changed, e.id, e.name, cr.wrestler_id, cr.tag_team_id
        ORDER BY e.event_date ASC, m.match_order ASC
      `,
        reignIdsArray,
      );

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
        const champPart = parts.find(
          (p) => p.wrestler_id === match.champ_wrestler_id,
        );
        if (champPart) {
          myTeam = champPart.team_number;
          myResult = champPart.result;
        }
      } else if (match.champ_tag_team_id) {
        const champPart = parts.find(
          (p) => p.tag_team_id === match.champ_tag_team_id,
        );
        if (champPart) {
          myTeam = champPart.team_number;
          myResult = champPart.result;
        }
      }

      // Si no compitieron (ej. porque el título se dejó vacante y este match corona a otro), ignoramos la lucha
      if (myTeam === null) continue;

      const scoreMap = scores.reduce((acc, s) => {
        acc[s.team_number] = s.score;
        return acc;
      }, {});

      let defendingWrestlers = parts.filter((x) => x.team_number === myTeam);
      let opponents = parts.filter((x) => x.team_number !== myTeam);

      let scoreStr = null;
      const hasScores = Object.keys(scoreMap).length > 0;
      if (hasScores && scoreMap[myTeam] != null) {
        const oppTeamNumbers = [
          ...new Set(opponents.map((x) => x.team_number)),
        ];
        if (
          oppTeamNumbers.length === 1 &&
          scoreMap[oppTeamNumbers[0]] != null
        ) {
          scoreStr = `${scoreMap[myTeam]}-${scoreMap[oppTeamNumbers[0]]}`;
        } else if (oppTeamNumbers.length > 1) {
          scoreStr =
            `${scoreMap[myTeam]}-` +
            oppTeamNumbers.map((tn) => scoreMap[tn] ?? 0).join("-");
        }
      }

      const matchDetail = {
        event_id: match.event_id,
        event_name: match.event_name,
        result: myResult,
        scoreStr,
        isTagTeam: match.champ_tag_team_id !== null,
        partners: [],
        opponents: opponents.map((x) => ({
          id: x.wrestler_id,
          name: x.wrestler,
        })),
      };

      if (match.champ_wrestler_id) {
        matchDetail.partners = defendingWrestlers
          .filter((x) => x.wrestler_id !== match.champ_wrestler_id)
          .map((x) => ({ id: x.wrestler_id, name: x.wrestler }));
      } else {
        matchDetail.partners = defendingWrestlers.map((x) => ({
          id: x.wrestler_id,
          name: x.wrestler,
        }));
      }

      // El título cambió de manos Y ellos no ganaron (blindaje para reinados vacantes)
      if (match.title_changed === 1 && myResult !== "WIN") {
        breakerByReign[match.reign_id] = matchDetail;
      } else if (match.title_changed === 0) {
        if (!defensesByReign[match.reign_id])
          defensesByReign[match.reign_id] = [];
        defensesByReign[match.reign_id].push(matchDetail);
      }
    }

    const processedLongestReigns = longestReignsRows.map((r) => ({
      ...r,
      id: `lr_${r.reign_id}`,
      days_held_label: r.lost_date === null ? `${r.days_held}+` : r.days_held,
      defenses: defensesByReign[r.reign_id] || [],
      streakBreaker: breakerByReign[r.reign_id] || null,
    }));

    const processedMostDefenses = mostDefensesRows.map((r) => ({
      ...r,
      id: `md_${r.reign_id}`,
      days_held_label: r.lost_date === null ? `${r.days_held}+` : r.days_held,
      defenses: defensesByReign[r.reign_id] || [],
      streakBreaker: breakerByReign[r.reign_id] || null,
    }));

    return {
      props: {
        mostMatches: JSON.parse(JSON.stringify(processedMatches)),
        mostWins: JSON.parse(JSON.stringify(processedWins)),
        bestInterpreters: JSON.parse(JSON.stringify(interpreterRows)),
        topWinStreaks: JSON.parse(JSON.stringify(topWinStreaks)),
        topUndefeated: JSON.parse(JSON.stringify(topUndefeated)),
        longestReigns: JSON.parse(JSON.stringify(processedLongestReigns)),
        mostDefenses: JSON.parse(JSON.stringify(processedMostDefenses)),
      },
    };
  } catch (error) {
    console.error("Error loading records:", error);
    return { props: { error: true } };
  }
}

export default function RecordsPage({
  error,
  mostMatches,
  mostWins,
  bestInterpreters,
  topWinStreaks,
  topUndefeated,
  longestReigns,
  mostDefenses,
}) {
  const [expandedRow, setExpandedRow] = useState(null);

  const [undefSort, setUndefSort] = useState({ key: "count", dir: "desc" });
  const [interpSort, setInterpSort] = useState({ key: "wins", dir: "desc" });
  const [lrSort, setLrSort] = useState({ key: "days_held", dir: "desc" });
  const [mdSort, setMdSort] = useState({ key: "defenses_count", dir: "desc" });

  if (error) {
    return (
      <div className="p-8 text-center text-white">
        <h1 className="text-2xl font-bold mb-2">Error al cargar récords</h1>
        <p className="text-gray-400">
          Hubo un problema conectando con la base de datos.
        </p>
      </div>
    );
  }

  const toggleExpand = (key) =>
    setExpandedRow((prev) => (prev === key ? null : key));

  const handleUndefSort = (key) => setUndefSort({ key, dir: "desc" });
  const handleInterpSort = (key) => setInterpSort({ key, dir: "desc" });
  const handleLrSort = (key) => setLrSort({ key, dir: "desc" });
  const handleMdSort = (key) => setMdSort({ key, dir: "desc" });

  const sortedUndefeated = useMemo(() => {
    return [...topUndefeated].sort((a, b) => {
      const valA = undefSort.key === "count" ? a.count : a.days;
      const valB = undefSort.key === "count" ? b.count : b.days;
      return valB - valA;
    });
  }, [topUndefeated, undefSort]);

  const sortedInterpreters = useMemo(() => {
    return [...bestInterpreters].sort((a, b) => {
      const valA =
        interpSort.key === "wins" ? a.wins : parseFloat(a.win_percentage);
      const valB =
        interpSort.key === "wins" ? b.wins : parseFloat(b.win_percentage);
      return valB - valA;
    });
  }, [bestInterpreters, interpSort]);

  const sortedLongestReigns = useMemo(() => {
    return [...longestReigns].sort((a, b) => {
      const valA = a.days_held;
      const valB = b.days_held;
      return valB - valA;
    });
  }, [longestReigns]);

  const sortedMostDefenses = useMemo(() => {
    return [...mostDefenses].sort((a, b) => {
      const valA = a.defenses_count;
      const valB = b.defenses_count;
      return valB - valA;
    });
  }, [mostDefenses]);

  // Se añade el parámetro opcional isRowExpandable
  const renderTable = (
    title,
    data,
    columns,
    renderRow,
    expandPrefix = null,
    renderExpanded = null,
    expandTitle = "Match breakdown:",
    isRowExpandable = () => true
  ) => (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden h-fit">
      <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 text-sm">
              <th className="px-4 py-2 w-12 text-center">#</th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-4 py-2 ${col.onSort ? "cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none" : ""}`}
                  onClick={col.onSort ? col.onSort : undefined}
                >
                  <div
                    className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}
                  >
                    {col.label}
                    {col.sortDir && (
                      <span className="text-[10px] text-blue-500">▼</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {data.map((item, idx) => {
              const isExpanded = expandPrefix && expandedRow === `${expandPrefix}_${item.id}`;
              const isExpandable = !!expandPrefix && isRowExpandable(item);

              return (
                <React.Fragment key={item.id}>
                  <tr
                    className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${isExpandable ? "cursor-pointer" : ""}`}
                    onClick={() => isExpandable && toggleExpand(`${expandPrefix}_${item.id}`)}
                    title={isExpandable ? "Click to view breakdown" : ""}
                  >
                    <td className="px-4 py-3 text-center font-semibold text-gray-500 dark:text-gray-400">
                      {isExpandable ? (
                        <span className="flex items-center justify-center gap-1">
                          <span
                            className={`text-[10px] transition-transform ${isExpanded ? "rotate-90 text-blue-500" : ""}`}
                          >
                            ▶
                          </span>
                          {idx + 1}
                        </span>
                      ) : (
                        idx + 1
                      )}
                    </td>
                    {renderRow(item)}
                  </tr>

                  {isExpanded && renderExpanded && (
                    <tr className="bg-gray-50 dark:bg-zinc-950/50">
                      <td
                        colSpan={columns.length + 1}
                        className="px-4 py-4 border-b border-gray-200 dark:border-gray-800"
                      >
                        <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                          <p className="font-semibold mb-2 text-blue-600 dark:text-sky-400">
                            {expandTitle}
                          </p>
                          <ul className="space-y-1.5">
                            {renderExpanded(item)}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMatchDetail = (m, indexNumber, isBreaker = false) => {
    const resultColor =
      m.result === "WIN"
        ? "text-[#16a34a] dark:text-[#93c47d]"
        : m.result === "LOSS"
          ? "text-red-500"
          : m.result === "DRAW"
            ? "text-[#d97706] dark:text-[#ffe599]"
            : "text-gray-500";
    return (
      <li key={indexNumber} className="pl-1 flex items-start text-sm">
        <span
          className={`mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono ${isBreaker ? "line-through opacity-70" : ""}`}
        >
          {indexNumber}.
        </span>
        <div className="flex-1">
          <strong className={resultColor}>{m.result}</strong>{" "}
          {m.isTagTeam
            ? m.partners.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  {m.partners.map((pt, idx) => (
                    <React.Fragment key={pt.id}>
                      {idx > 0 && " & "}
                      <Link
                        href={`/wrestlers/${pt.id}`}
                        className="text-blue-600 dark:text-sky-400 "
                        onClick={(e) => e.stopPropagation()}
                      >
                        {pt.name}
                      </Link>
                    </React.Fragment>
                  ))}{" "}
                </span>
              )
            : m.partners.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  w/{" "}
                  {m.partners.map((pt, idx) => (
                    <React.Fragment key={pt.id}>
                      {idx > 0 && " & "}
                      <Link
                        href={`/wrestlers/${pt.id}`}
                        className="text-blue-600 dark:text-sky-400 "
                        onClick={(e) => e.stopPropagation()}
                      >
                        {pt.name}
                      </Link>
                    </React.Fragment>
                  ))}{" "}
                </span>
              )}
          {m.scoreStr ? (
            <span className="font-bold mx-1">{m.scoreStr}</span>
          ) : (
            <span className="text-gray-600 dark:text-gray-400 mx-1">vs</span>
          )}
          {m.opponents.map((opp, idx) => (
            <React.Fragment key={opp.id}>
              {idx > 0 && " & "}
              <Link
                href={`/wrestlers/${opp.id}`}
                className="text-blue-600 dark:text-sky-400 "
                onClick={(e) => e.stopPropagation()}
              >
                {opp.name}
              </Link>
            </React.Fragment>
          ))}
          <span className="text-gray-500 text-[11px] ml-2 block sm:inline">
            (
            <Link
              href={`/events/${m.event_id}`}
              className="text-gray-500 dark:text-gray-400 "
              onClick={(e) => e.stopPropagation()}
            >
              {m.event_name}
            </Link>
            )
          </span>
        </div>
      </li>
    );
  };

  return (
    <>
      <Head>
        <title>Records — Trivias WWE</title>
        <meta
          name="description"
          content="Historical statistics and rankings for the Trivias WWE Championship."
        />
      </Head>

      <div className="min-h-screen bg-white text-black dark:bg-zinc-950 dark:text-white transition-colors duration-300 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
              Hall of Records
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Historical statistics and rankings for the Trivias WWE
              Championship.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {/* Luchadores con más Combates */}
            {renderTable(
              "Most Matches",
              mostMatches,
              [{ label: "Wrestler" }, { label: "Matches", align: "right" }],
              (w) => (
                <>
                  <td className="px-4 py-3">
                    <Link
                      href={`/wrestlers/${w.id}`}
                      className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2 "
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FlagWithName code={w.country} name={w.name} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{w.total}</td>
                </>
              ),
              "matches",
              (w) => (
                <>
                  {w.interpreters_breakdown
                    ?.sort((a, b) => b.count - a.count)
                    .map((interp, idx) => (
                      <li key={idx} className="pl-1 flex items-start text-sm">
                        <span className="mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono text-right font-bold">
                          {interp.count}
                        </span>
                        {interp.id ? (
                          <Link 
                            href={`/interpreters/${interp.id}`} 
                            className="text-blue-600 dark:text-sky-400 "
                            onClick={(e) => e.stopPropagation()}
                          >
                            {interp.name}
                          </Link>
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">
                            {interp.name}
                          </span>
                        )}
                      </li>
                    ))}
                </>
              ),
              "Interpreters breakdown:",
              (w) => w.interpreters_breakdown?.length > 1
            )}

            {/* Luchadores con más Victorias */}
            {renderTable(
              "Most Wins",
              mostWins,
              [{ label: "Wrestler" }, { label: "Wins", align: "right" }],
              (w) => (
                <>
                  <td className="px-4 py-3">
                    <Link
                      href={`/wrestlers/${w.id}`}
                      className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2 "
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FlagWithName code={w.country} name={w.name} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#16a34a] dark:text-[#93c47d]">
                    {w.total}
                  </td>
                </>
              ),
              "wins",
              (w) => (
                <>
                  {w.interpreters_breakdown
                    ?.sort((a, b) => b.count - a.count)
                    .map((interp, idx) => (
                      <li key={idx} className="pl-1 flex items-start text-sm">
                        <span className="mr-2 inline-block min-w-[20px] text-[#16a34a] dark:text-[#93c47d] font-mono text-right font-bold">
                          {interp.count}
                        </span>
                        {interp.id ? (
                          <Link 
                            href={`/interpreters/${interp.id}`} 
                            className="text-blue-600 dark:text-sky-400 "
                            onClick={(e) => e.stopPropagation()}
                          >
                            {interp.name}
                          </Link>
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">
                            {interp.name}
                          </span>
                        )}
                      </li>
                    ))}
                </>
              ),
              "Interpreters breakdown:",
              (w) => w.interpreters_breakdown?.length > 1
            )}

            {/* Mayores Rachas Invictas */}
            {renderTable(
              "Longest Undefeated Streak",
              sortedUndefeated,
              [
                { label: "Wrestler" },
                {
                  label: "Matches",
                  align: "right",
                  onSort: () => handleUndefSort("count"),
                  sortDir: undefSort.key === "count" ? undefSort.dir : null,
                },
                {
                  label: "Days",
                  align: "right",
                  onSort: () => handleUndefSort("days"),
                  sortDir: undefSort.key === "days" ? undefSort.dir : null,
                },
              ],
              (s) => (
                <>
                  <td className="px-4 py-3">
                    <span className="font-semibold flex items-center gap-2">
                      <FlagWithName code={s.country} name={s.name} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{s.count}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-mono text-sm">
                    {s.days}
                    {!s.streakBreaker ? "+" : ""}
                  </td>
                </>
              ),
              "undef",
              (s) => (
                <>
                  {s.matches.map((m, i) => renderMatchDetail(m, i + 1, false))}
                  {s.streakBreaker &&
                    renderMatchDetail(
                      s.streakBreaker,
                      s.matches.length + 1,
                      true,
                    )}
                </>
              )
            )}

            {/* Mayores Rachas de Victorias */}
            {renderTable(
              "Longest Win Streak",
              topWinStreaks,
              [{ label: "Wrestler" }, { label: "Wins", align: "right" }],
              (s) => (
                <>
                  <td className="px-4 py-3">
                    <span className="font-semibold flex items-center gap-2">
                      <FlagWithName code={s.country} name={s.name} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#16a34a] dark:text-[#93c47d]">
                    {s.count}
                  </td>
                </>
              ),
              "win",
              (s) => (
                <>
                  {s.matches.map((m, i) => renderMatchDetail(m, i + 1, false))}
                  {s.streakBreaker &&
                    renderMatchDetail(
                      s.streakBreaker,
                      s.matches.length + 1,
                      true,
                    )}
                </>
              )
            )}

            {/* Mejores Intérpretes */}
            <div className="md:col-span-2 lg:col-span-2">
              {renderTable(
                "Top Interpreters (Most Wins & Winrate)",
                sortedInterpreters,
                [
                  { label: "Interpreter" },
                  { label: "Matches", align: "right" },
                  {
                    label: "Wins",
                    align: "right",
                    onSort: () => handleInterpSort("wins"),
                    sortDir: interpSort.key === "wins" ? interpSort.dir : null,
                  },
                  {
                    label: "Win %",
                    align: "right",
                    onSort: () => handleInterpSort("win_percentage"),
                    sortDir:
                      interpSort.key === "win_percentage"
                        ? interpSort.dir
                        : null,
                  },
                ],
                (i) => (
                  <>
                    <td className="px-4 py-3">
                      <Link
                        href={`/interpreters/${i.id}`}
                        className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2 "
                      >
                        <FlagWithName code={i.country} name={i.name} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {i.total_matches}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#16a34a] dark:text-[#93c47d]">
                      {i.wins}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {i.win_percentage}%
                    </td>
                  </>
                ),
              )}
            </div>
          </div>

          {/* Grilla Inferior con las Tablas de Reinados y Defensas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-8">
            {/* Reinados más Largos */}
            {renderTable(
              "Longest Reigns",
              sortedLongestReigns,
              [
                { label: "Champion" },
                { label: "Title" },
                { label: "Days", align: "right" },
              ],
              (r) => (
                <>
                  <td className="px-4 py-3">
                    {r.tag_team_id ? (
                      <Link
                        href={`/stables/${r.tag_team_id}`}
                        className="text-blue-600 dark:text-sky-400 font-semibold  block w-full h-full"
                      >
                        {r.tag_team_name}
                      </Link>
                    ) : (
                      <Link
                        href={`/wrestlers/${r.wrestler_id}`}
                        className="text-blue-600 dark:text-sky-400 font-semibold  block w-full h-full"
                      >
                        <FlagWithName
                          code={r.country}
                          name={r.wrestler_name || "Unknown"}
                        />
                      </Link>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300"
                    title={r.title_name}
                  >
                    {(r.title_name || "").replace(" Championship", "")}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-gray-200 font-mono text-base">
                    {r.days_held_label}
                  </td>
                </>
              ),
              null,
              null,
            )}

            {/* Reinados con más Defensas */}
            {renderTable(
              "Most Defenses in a Reign",
              sortedMostDefenses,
              [
                { label: "Champion" },
                { label: "Title" },
                { label: "Defenses", align: "right" },
              ],
              (r) => (
                <>
                  <td className="px-4 py-3">
                    {r.tag_team_id ? (
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {r.tag_team_name}
                      </span>
                    ) : (
                      <span className="font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
                        <FlagWithName
                          code={r.country}
                          name={r.wrestler_name || "Unknown"}
                        />
                      </span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300"
                    title={r.title_name}
                  >
                    {(r.title_name || "").replace(" Championship", "")}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white">
                    {r.defenses_count}
                  </td>
                </>
              ),
              "md",
              (r) => (
                <>
                  {r.defenses.length > 0 ? (
                    r.defenses.map((m, i) => renderMatchDetail(m, i + 1, false))
                  ) : (
                    <li className="text-gray-500 dark:text-gray-400 text-sm italic pl-1">
                      No successful defenses.
                    </li>
                  )}
                  {r.streakBreaker &&
                    renderMatchDetail(
                      r.streakBreaker,
                      r.defenses.length + 1,
                      true,
                    )}
                </>
              ),
            )}
          </div>
        </div>
      </div>
    </>
  );
}