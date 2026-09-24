// pages/records.js

import React, { useState } from "react";
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

    // 4. Historial cronológico con equipos y puntajes para desglose de rachas preciso
    const [historyRows] = await pool.query(`
      SELECT
        m.id AS match_id, e.id AS event_id, e.name AS event_name,
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

    // Lógica para calcular Rachas y armar el detalle separado de Compañeros vs Rivales
    const statsMap = new Map();
    
    for (const match of historyRows) {
      let parts = match.participants;
      let scores = match.scores;
      if (typeof parts === 'string') parts = JSON.parse(parts);
      if (typeof scores === 'string') scores = JSON.parse(scores);
      parts = parts || [];
      scores = scores || [];

      // Mapeamos los scores a los números de equipo
      const scoreMap = scores.reduce((acc, s) => { 
        acc[s.team_number] = s.score; 
        return acc; 
      }, {});

      for (const p of parts) {
        if (!statsMap.has(p.wrestler_id)) {
          statsMap.set(p.wrestler_id, {
            id: p.wrestler_id, name: p.wrestler, country: p.country,
            currWinStreak: 0, maxWinStreak: 0,
            currWinMatches: [], maxWinMatches: [],
            currUndefeated: 0, maxUndefeated: 0,
            currUndefMatches: [], maxUndefMatches: []
          });
        }
        const st = statsMap.get(p.wrestler_id);
        
        const myTeam = p.team_number;
        const partners = parts.filter(x => x.team_number === myTeam && x.wrestler_id !== p.wrestler_id);
        const opponents = parts.filter(x => x.team_number !== myTeam);
        
        let scoreStr = null;
        const hasScores = Object.keys(scoreMap).length > 0;
        
        if (hasScores && scoreMap[myTeam] != null) {
           const oppTeamNumbers = [...new Set(opponents.map(x => x.team_number))];
           if (oppTeamNumbers.length === 1 && scoreMap[oppTeamNumbers[0]] != null) {
               scoreStr = `${scoreMap[myTeam]}-${scoreMap[oppTeamNumbers[0]]}`;
           } else if (oppTeamNumbers.length > 1) {
               scoreStr = `${scoreMap[myTeam]}-` + oppTeamNumbers.map(tn => scoreMap[tn] ?? 0).join('-');
           }
        }

        const matchDetail = {
          event_id: match.event_id,
          event_name: match.event_name,
          result: p.result,
          scoreStr,
          partners: partners.map(x => ({ id: x.wrestler_id, name: x.wrestler })),
          opponents: opponents.map(x => ({ id: x.wrestler_id, name: x.wrestler }))
        };

        if (p.result === 'WIN') {
          st.currWinStreak++;
          st.currWinMatches.push(matchDetail);
          st.currUndefeated++;
          st.currUndefMatches.push(matchDetail);
        } else if (p.result === 'DRAW') {
          st.currWinStreak = 0;
          st.currWinMatches = [];
          st.currUndefeated++;
          st.currUndefMatches.push(matchDetail);
        } else { // LOSS
          st.currWinStreak = 0;
          st.currWinMatches = [];
          st.currUndefeated = 0;
          st.currUndefMatches = [];
        }
        
        if (st.currWinStreak > st.maxWinStreak) {
          st.maxWinStreak = st.currWinStreak;
          st.maxWinMatches = [...st.currWinMatches];
        }
        if (st.currUndefeated > st.maxUndefeated) {
          st.maxUndefeated = st.currUndefeated;
          st.maxUndefMatches = [...st.currUndefMatches];
        }
      }
    }

    const allStats = Array.from(statsMap.values());
    const topWinStreaks = [...allStats].sort((a, b) => b.maxWinStreak - a.maxWinStreak).slice(0, 10);
    const topUndefeated = [...allStats].sort((a, b) => b.maxUndefeated - a.maxUndefeated).slice(0, 10);

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

export default function RecordsPage({ error, mostMatches, mostWins, bestInterpreters, topWinStreaks, topUndefeated }) {
  const [expandedRow, setExpandedRow] = useState(null);

  if (error) {
    return (
      <div className="p-8 text-center text-white">
        <h1 className="text-2xl font-bold mb-2">Error al cargar récords</h1>
        <p className="text-gray-400">Hubo un problema conectando con la base de datos.</p>
      </div>
    );
  }

  const toggleExpand = (key) => setExpandedRow(prev => prev === key ? null : key);

  const renderTable = (title, data, columns, renderRow, expandPrefix = null, renderExpanded = null) => (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden h-fit">
      <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 text-sm">
              <th className="px-4 py-2 w-12 text-center">#</th>
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-2 ${col.align === 'right' ? 'text-right' : ''}`}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {data.map((item, idx) => {
              const isExpanded = expandPrefix && expandedRow === `${expandPrefix}-${item.id}`;
              const isClickable = !!expandPrefix;
              return (
                <React.Fragment key={item.id}>
                  <tr 
                    className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${isClickable ? 'cursor-pointer' : ''}`}
                    onClick={() => isClickable && toggleExpand(`${expandPrefix}-${item.id}`)}
                    title={isClickable ? "Click to view matches" : ""}
                  >
                    <td className="px-4 py-3 text-center font-semibold text-gray-500 dark:text-gray-400">
                      {isClickable ? (
                        <span className="flex items-center justify-center gap-1">
                          <span className={`text-[10px] transition-transform ${isExpanded ? 'rotate-90 text-blue-500' : ''}`}>▶</span>
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
                      <td colSpan={columns.length + 1} className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                          <p className="font-semibold mb-2 text-blue-600 dark:text-sky-400">Match breakdown:</p>
                          <ul className="list-decimal list-inside space-y-1.5">
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

  const renderMatchDetail = (m, i) => {
    // Aplicando los colores solicitados (#93c47d para WIN y #ffe599 para DRAW)
    const resultColor = m.result === 'WIN' ? 'text-[#93c47d]' : m.result === 'LOSS' ? 'text-red-500' : m.result === 'DRAW' ? 'text-[#ffe599]' : 'text-gray-500';
    return (
      <li key={i} className="pl-1">
        <strong className={resultColor}>{m.result}</strong>{' '}
        
        {m.partners.length > 0 && (
          <span className="text-gray-600 dark:text-gray-400">
            w/ {m.partners.map((pt, idx) => (
              <React.Fragment key={pt.id}>
                {idx > 0 && " & "}
                <Link href={`/wrestlers/${pt.id}`} className="text-blue-600 dark:text-sky-400">
                  {pt.name}
                </Link>
              </React.Fragment>
            ))}{' '}
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
            <Link href={`/wrestlers/${opp.id}`} className="text-blue-600 dark:text-sky-400">
              {opp.name}
            </Link>
          </React.Fragment>
        ))}

        <span className="text-gray-500 text-[11px] ml-2 block sm:inline">
          (<Link href={`/events/${m.event_id}`} className="">{m.event_name}</Link>)
        </span>
      </li>
    );
  };

  return (
    <>
      <Head>
        <title>Records — Trivias WWE</title>
        <meta name="description" content="Historical statistics and rankings for the Trivias WWE Championship." />
      </Head>

      <div className="min-h-screen bg-white text-black dark:bg-zinc-950 dark:text-white transition-colors duration-300 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">Hall of Records</h1>
            <p className="text-gray-600 dark:text-gray-400">Historical statistics and rankings for the Trivias WWE Championship.</p>
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
                    <Link href={`/wrestlers/${w.id}`} className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2">
                      <FlagWithName code={w.country} name={w.name} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{w.total}</td>
                </>
              )
            )}

            {/* Luchadores con más Victorias */}
            {renderTable(
              "Most Wins", 
              mostWins, 
              [{ label: "Wrestler" }, { label: "Wins", align: "right" }],
              (w) => (
                <>
                  <td className="px-4 py-3">
                    <Link href={`/wrestlers/${w.id}`} className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2">
                      <FlagWithName code={w.country} name={w.name} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#93c47d]">{w.total}</td>
                </>
              )
            )}

            {/* Mayores Rachas Invictas (Expandible) */}
            {renderTable(
              "Longest Undefeated Streak", 
              topUndefeated, 
              [{ label: "Wrestler" }, { label: "Matches", align: "right" }],
              (w) => (
                <>
                  <td className="px-4 py-3">
                    <span className="font-semibold flex items-center gap-2">
                      <FlagWithName code={w.country} name={w.name} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{w.maxUndefeated}</td>
                </>
              ),
              "undef",
              (w) => w.maxUndefMatches.map(renderMatchDetail)
            )}

            {/* Mayores Rachas de Victorias (Expandible) */}
            {renderTable(
              "Longest Win Streak", 
              topWinStreaks, 
              [{ label: "Wrestler" }, { label: "Wins", align: "right" }],
              (w) => (
                <>
                  <td className="px-4 py-3">
                    <span className="font-semibold flex items-center gap-2">
                      <FlagWithName code={w.country} name={w.name} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-yellow-600 dark:text-yellow-500">{w.maxWinStreak}</td>
                </>
              ),
              "win",
              (w) => w.maxWinMatches.map(renderMatchDetail)
            )}

            {/* Mejores Intérpretes */}
            <div className="md:col-span-2 lg:col-span-2">
              {renderTable(
                "Top Interpreters (Most Wins)", 
                bestInterpreters, 
                [{ label: "Interpreter" }, { label: "Matches", align: "right" }, { label: "Wins", align: "right" }, { label: "Win %", align: "right" }],
                (i) => (
                  <>
                    <td className="px-4 py-3">
                      <Link href={`/interpreters/${i.id}`} className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2">
                        <FlagWithName code={i.country} name={i.name} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{i.total_matches}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#93c47d]">{i.wins}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{i.win_percentage}%</td>
                  </>
                )
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}