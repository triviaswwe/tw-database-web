// pages/records.js

import React, { useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import pool from "../lib/db";
import FlagWithName from "../components/FlagWithName";

export async function getServerSideProps() {
  try {
    // 1. Luchadores con más matches
    const [matchesRows] = await pool.query(`
      SELECT w.id, w.wrestler AS name, w.country, COUNT(mp.match_id) AS total
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      GROUP BY w.id, w.wrestler, w.country
      ORDER BY total DESC
      LIMIT 10
    `);

    // 2. Luchadores con más victorias
    const [winsRows] = await pool.query(`
      SELECT w.id, w.wrestler AS name, w.country, SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS total
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      GROUP BY w.id, w.wrestler, w.country
      ORDER BY total DESC
      LIMIT 10
    `);

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

    // Listas globales para guardar TODAS las rachas (permite múltiples del mismo luchador en el top 10)
    const allWinStreaks = [];
    const allUndefeatedStreaks = [];
    let streakCounter = 0; // ID único para el frontend

    // Map para seguir el estado actual de cada luchador durante el loop
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

        // --- LÓGICA DE RACHA DE VICTORIAS ---
        if (p.result === "WIN") {
          st.winCount++;
          st.winMatches.push(matchDetail);
        } else {
          // Se corta la racha (Empate o Derrota)
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

        // --- LÓGICA DE RACHA INVICTA (Sin Derrotas) ---
        if (p.result === "WIN" || p.result === "DRAW") {
          if (st.undefCount === 0) st.undefStartDate = matchDate;
          st.undefCount++;
          st.undefMatches.push(matchDetail);
        } else if (p.result === "LOSS") {
          // Se corta el invicto
          if (st.undefCount > 0) {
            // Días de diferencia exacta entre la derrota y el inicio del invicto
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

    // --- CERRAR RACHAS ACTIVAS (Vigentes al día de hoy) ---
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
          streakBreaker: null, // Sigue activa
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
          streakBreaker: null, // Sigue activa
        });
      }
    }

    const topWinStreaks = allWinStreaks
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topUndefeated = allUndefeatedStreaks
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      props: {
        mostMatches: JSON.parse(JSON.stringify(matchesRows)),
        mostWins: JSON.parse(JSON.stringify(winsRows)),
        bestInterpreters: JSON.parse(JSON.stringify(interpreterRows)),
        topWinStreaks,
        topUndefeated,
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
}) {
  const [expandedRow, setExpandedRow] = useState(null);

  // Estados de ordenamiento
  const [undefSort, setUndefSort] = useState({ key: "count", dir: "desc" });
  const [interpSort, setInterpSort] = useState({ key: "wins", dir: "desc" });

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

  // Funciones simplificadas: ¡solo aplican DESC, nunca ASC!
  const handleUndefSort = (key) => {
    setUndefSort({ key, dir: "desc" });
  };

  const handleInterpSort = (key) => {
    setInterpSort({ key, dir: "desc" });
  };

  // Ordenamiento local reactivo (exclusivamente DESC)
  const sortedUndefeated = useMemo(() => {
    return [...topUndefeated].sort((a, b) => {
      const valA = undefSort.key === "count" ? a.count : a.days;
      const valB = undefSort.key === "count" ? b.count : b.days;
      return valB - valA; // Siempre B - A (Descendente)
    });
  }, [topUndefeated, undefSort]);

  const sortedInterpreters = useMemo(() => {
    return [...bestInterpreters].sort((a, b) => {
      const valA =
        interpSort.key === "wins" ? a.wins : parseFloat(a.win_percentage);
      const valB =
        interpSort.key === "wins" ? b.wins : parseFloat(b.win_percentage);
      return valB - valA; // Siempre B - A (Descendente)
    });
  }, [bestInterpreters, interpSort]);

  const renderTable = (
    title,
    data,
    columns,
    renderRow,
    expandPrefix = null,
    renderExpanded = null,
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
              const isExpanded = expandPrefix && expandedRow === item.id;
              const isClickable = !!expandPrefix;
              return (
                <React.Fragment key={item.id}>
                  <tr
                    className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${isClickable ? "cursor-pointer" : ""}`}
                    onClick={() => isClickable && toggleExpand(item.id)}
                    title={isClickable ? "Click to view matches" : ""}
                  >
                    <td className="px-4 py-3 text-center font-semibold text-gray-500 dark:text-gray-400">
                      {isClickable ? (
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
                            Match breakdown:
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

  // Renderizador individual de la línea del combate (con lógica para tachar el número si es el que rompió la racha)
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
          {m.partners.length > 0 && (
            <span className="text-gray-600 dark:text-gray-400">
              w/{" "}
              {m.partners.map((pt, idx) => (
                <React.Fragment key={pt.id}>
                  {idx > 0 && " & "}
                  <Link
                    href={`/wrestlers/${pt.id}`}
                    className="text-blue-600 dark:text-sky-400"
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
                className="text-blue-600 dark:text-sky-400"
              >
                {opp.name}
              </Link>
            </React.Fragment>
          ))}
          <span className="text-gray-500 text-[11px] ml-2 block sm:inline">
            (
            <Link
              href={`/events/${m.event_id}`}
              className="text-gray-500 dark:text-gray-400"
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
                      className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2"
                    >
                      <FlagWithName code={w.country} name={w.name} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{w.total}</td>
                </>
              ),
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
                      className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2"
                    >
                      <FlagWithName code={w.country} name={w.name} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#16a34a] dark:text-[#93c47d]">
                    {w.total}
                  </td>
                </>
              ),
            )}

            {/* Mayores Rachas Invictas (Ordenable Exclusivamente DESC) */}
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
                  {/* Matches primero, alineado con su título */}
                  <td className="px-4 py-3 text-right font-bold">{s.count}</td>
                  {/* Days segundo, alineado con su título */}
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-mono text-sm">
                    {s.days}
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
              ),
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
              ),
            )}

            {/* Mejores Intérpretes (Ordenable Exclusivamente DESC) */}
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
                        className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2"
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
        </div>
      </div>
    </>
  );
}
