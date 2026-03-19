// pages/interpreters/[id].js
// OPTIMIZADO: Promise.all + paginación + filtros por evento, wrestler, championship, stipulation

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import pool from "../../lib/db";
import FlagWithName from "../../components/FlagWithName";

function formatDateDDMMYYYY(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function getServerSideProps({ params, query }) {
  const interpreterId = parseInt(params.id, 10);
  if (isNaN(interpreterId)) return { notFound: true };

  // ─── 1) Datos básicos del intérprete ───────────────────────────────────────
  const [[interpreterRow]] = await pool.query(
    `SELECT id, interpreter, nationality, status
     FROM interpreters
     WHERE id = ?`,
    [interpreterId],
  );
  if (!interpreterRow) return { notFound: true };

  const interpreter = {
    id: interpreterRow.id,
    interpreter: interpreterRow.interpreter,
    nationality: interpreterRow.nationality,
    status: interpreterRow.status,
  };

  // ─── 2) Paginación + filtros ────────────────────────────────────────────────
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, parseInt(query.limit) || 20);
  const offset = (page - 1) * limit;
  const filterEvent = query.filter ? query.filter.trim() : "";
  const filterWrestler = query.wrestler ? query.wrestler.trim() : "";
  const filterTitle = query.title === "1";
  const filterStip = query.stip === "1";
  const filterChamp = query.champ ? query.champ.trim() : "";
  const filterMatchType = query.matchtype ? query.matchtype.trim() : "";

  // Cláusulas WHERE adicionales
  const extraClauses = [];
  const extraParams = [];

  if (filterEvent) {
    extraClauses.push(`AND LOWER(e.name) LIKE ?`);
    extraParams.push(`%${filterEvent.toLowerCase()}%`);
  }

  if (filterWrestler) {
    // Filtra matches donde algún wrestler (el interpretado u otro) tenga ese nombre
    extraClauses.push(`
      AND EXISTS (
        SELECT 1
        FROM match_participants mp3
        JOIN wrestlers w3 ON mp3.wrestler_id = w3.id
        WHERE mp3.match_id = m.id
          AND LOWER(w3.wrestler) LIKE ?
      )`);
    extraParams.push(`%${filterWrestler.toLowerCase()}%`);
  }

  if (filterTitle) {
    extraClauses.push(`AND m.title_match = 1`);
  }

  if (filterStip) {
    extraClauses.push(`AND m.match_type_id NOT IN (1, 2)`);
  }

  if (filterChamp) {
    extraClauses.push(`AND LOWER(c.title_name) LIKE ?`);
    extraParams.push(`%${filterChamp.toLowerCase()}%`);
  }

  if (filterMatchType) {
    extraClauses.push(`AND LOWER(mt.name) LIKE ?`);
    extraParams.push(`%${filterMatchType.toLowerCase()}%`);
  }

  const extraSql = extraClauses.join("\n");

  // ─── 3) Queries paralelas ───────────────────────────────────────────────────
  const [
    [assocWrestlers],
    [[statsRow]],
    [rawMatches],
    [[lastWrestlerRow]],
    [[{ total: matchesTotal }]],
  ] = await Promise.all([
    // Wrestlers asociados al intérprete
    pool.query(
      `SELECT
         wi.wrestler_id,
         w.wrestler AS wrestler_name,
         w.country  AS wrestler_country
       FROM wrestler_interpreter wi
       JOIN wrestlers w ON wi.wrestler_id = w.id
       WHERE wi.interpreter_id = ?`,
      [interpreterId],
    ),

    // Stats globales (sin filtros, siempre totales reales)
    pool.query(
      `SELECT
         COUNT(*)                                              AS total,
         SUM(CASE WHEN mp.result = 'WIN'  THEN 1 ELSE 0 END) AS wins,
         SUM(CASE WHEN mp.result = 'DRAW' THEN 1 ELSE 0 END) AS draws,
         SUM(CASE WHEN mp.result = 'LOSS' THEN 1 ELSE 0 END) AS losses,
         MIN(e.event_date)                                    AS firstMatch,
         MAX(e.event_date)                                    AS lastMatch
       FROM match_participants mp
       JOIN matches m ON mp.match_id = m.id
       JOIN events  e ON m.event_id  = e.id
       WHERE mp.interpreter_id = ?`,
      [interpreterId],
    ),

    // Matches paginados con filtros opcionales
    pool.query(
      `SELECT
         m.id,
         m.event_id,
         m.title_match,
         e.name          AS event,
         e.event_date,
         m.match_order,
         mp.team_number,
         mp.result,
         mt.id           AS match_type_id,
         mt.name         AS match_type_name,
         c.id            AS championship_id,
         c.title_name    AS championship_name,
         (
           SELECT JSON_ARRAYAGG(JSON_OBJECT(
             'wrestler_id',    mp2.wrestler_id,
             'wrestler',       w2.wrestler,
             'interpreter_id', mp2.interpreter_id,
             'team_number',    mp2.team_number,
             'result',         mp2.result
           ))
           FROM match_participants mp2
           JOIN wrestlers w2 ON mp2.wrestler_id = w2.id
           WHERE mp2.match_id = m.id
         ) AS participants,
         (
           SELECT JSON_ARRAYAGG(JSON_OBJECT(
             'team_number', mts.team_number,
             'score',       mts.score
           ))
           FROM match_team_scores mts
           WHERE mts.match_id = m.id
         ) AS scores
       FROM match_participants mp
       JOIN matches m ON mp.match_id = m.id
       JOIN events  e ON m.event_id  = e.id
       LEFT JOIN match_types mt  ON m.match_type_id   = mt.id
       LEFT JOIN championships c ON m.championship_id = c.id
       WHERE mp.interpreter_id = ?
         ${extraSql}
       GROUP BY
         m.id, mp.team_number, mp.result, m.match_order,
         m.event_id, e.name, e.event_date,
         mt.id, mt.name, c.id, c.title_name
       ORDER BY e.event_date DESC, m.match_order DESC
       LIMIT ? OFFSET ?`,
      [interpreterId, ...extraParams, limit, offset],
    ),

    // Último wrestler interpretado (para determinar current)
    pool.query(
      `SELECT
         mp.wrestler_id,
         w.wrestler AS wrestler_name,
         w.country  AS wrestler_country
       FROM match_participants mp
       JOIN matches m ON mp.match_id  = m.id
       JOIN events  e ON m.event_id   = e.id
       JOIN wrestlers w ON mp.wrestler_id = w.id
       WHERE mp.interpreter_id = ?
       ORDER BY e.event_date DESC
       LIMIT 1`,
      [interpreterId],
    ),

    // Total filtrado (para paginación correcta)
    pool.query(
      `SELECT COUNT(*) AS total
       FROM match_participants mp
       JOIN matches m ON mp.match_id = m.id
       JOIN events  e ON m.event_id  = e.id
       LEFT JOIN match_types mt  ON m.match_type_id   = mt.id
       LEFT JOIN championships c ON m.championship_id = c.id
       WHERE mp.interpreter_id = ?
         ${extraSql}`,
      [interpreterId, ...extraParams],
    ),
  ]);

  // ─── 4) Current / former wrestlers ────────────────────────────────────────
  let currentWrestler = null;
  let formerWrestlers = [];

  if (interpreter.status === "Inactive") {
    formerWrestlers = assocWrestlers.map((r) => ({
      id: r.wrestler_id,
      name: r.wrestler_name,
      country: r.wrestler_country,
    }));
  } else if (lastWrestlerRow?.wrestler_id) {
    currentWrestler = {
      id: lastWrestlerRow.wrestler_id,
      name: lastWrestlerRow.wrestler_name,
      country: lastWrestlerRow.wrestler_country,
    };
    formerWrestlers = assocWrestlers
      .filter((r) => r.wrestler_id !== lastWrestlerRow.wrestler_id)
      .map((r) => ({
        id: r.wrestler_id,
        name: r.wrestler_name,
        country: r.wrestler_country,
      }));
  } else {
    formerWrestlers = assocWrestlers.map((r) => ({
      id: r.wrestler_id,
      name: r.wrestler_name,
      country: r.wrestler_country,
    }));
  }

  // ─── 5) Serializar ────────────────────────────────────────────────────────
  const matchesList = rawMatches.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    event: row.event,
    event_date: row.event_date ? row.event_date.toISOString() : null,
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
    firstMatch: statsRow?.firstMatch ? statsRow.firstMatch.toISOString() : null,
    lastMatch: statsRow?.lastMatch ? statsRow.lastMatch.toISOString() : null,
  };

  return {
    props: {
      interpreter,
      currentWrestler,
      formerWrestlers,
      filterEvent,
      filterWrestler,
      filterTitle,
      filterStip,
      filterChamp,
      filterMatchType,
      matches: {
        stats,
        matches: matchesList,
        pagination: {
          page,
          limit,
          total: matchesTotal,
          totalPages: Math.ceil(matchesTotal / limit),
        },
      },
    },
  };
}

export default function InterpreterDetail({
  interpreter,
  currentWrestler,
  formerWrestlers = [],
  filterEvent,
  filterWrestler,
  filterTitle,
  filterStip,
  filterChamp,
  filterMatchType,
  matches,
}) {
  const router = useRouter();
  const { pagination } = matches;

  const [eventInput, setEventInput] = useState(filterEvent || "");
  const [wrestlerInput, setWrestlerInput] = useState(filterWrestler || "");
  const [champInput, setChampInput] = useState(filterChamp || "");
  const [matchTypeInput, setMatchTypeInput] = useState(filterMatchType || "");

  // Debounce: evento
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = eventInput.trim();
      if (trimmed === (filterEvent || "")) return;
      const q = { ...router.query, page: 1 };
      if (trimmed) q.filter = trimmed;
      else delete q.filter;
      router.push({ pathname: router.pathname, query: q }, undefined, {
        scroll: false,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [eventInput]);

  // Debounce: wrestler
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = wrestlerInput.trim();
      if (trimmed === (filterWrestler || "")) return;
      const q = { ...router.query, page: 1 };
      if (trimmed) q.wrestler = trimmed;
      else delete q.wrestler;
      router.push({ pathname: router.pathname, query: q }, undefined, {
        scroll: false,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [wrestlerInput]);

  // Debounce: championship
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = champInput.trim();
      if (trimmed === (filterChamp || "")) return;
      const q = { ...router.query, page: 1 };
      if (trimmed) q.champ = trimmed;
      else delete q.champ;
      router.push({ pathname: router.pathname, query: q }, undefined, {
        scroll: false,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [champInput]);

  // Debounce: match type
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = matchTypeInput.trim();
      if (trimmed === (filterMatchType || "")) return;
      const q = { ...router.query, page: 1 };
      if (trimmed) q.matchtype = trimmed;
      else delete q.matchtype;
      router.push({ pathname: router.pathname, query: q }, undefined, {
        scroll: false,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [matchTypeInput]);

  // Sincronizar con back/forward
  useEffect(() => {
    setEventInput(filterEvent || "");
  }, [filterEvent]);
  useEffect(() => {
    setWrestlerInput(filterWrestler || "");
  }, [filterWrestler]);
  useEffect(() => {
    setChampInput(filterChamp || "");
  }, [filterChamp]);
  useEffect(() => {
    setMatchTypeInput(filterMatchType || "");
  }, [filterMatchType]);

  const toggleTitleFilter = () => {
    const q = { ...router.query, page: 1 };
    if (filterTitle) delete q.title;
    else q.title = "1";
    router.push({ pathname: router.pathname, query: q }, undefined, {
      scroll: false,
    });
  };

  const toggleStipFilter = () => {
    const q = { ...router.query, page: 1 };
    if (filterStip) delete q.stip;
    else q.stip = "1";
    router.push({ pathname: router.pathname, query: q }, undefined, {
      scroll: false,
    });
  };

  // ─── Paginación estilo Events ─────────────────────────────────────────────
  const goToPage = (p) => {
    router.push(
      { pathname: router.pathname, query: { ...router.query, page: p } },
      undefined,
      { scroll: false },
    );
  };

  const renderPageButtons = () => {
    const { page, totalPages } = pagination;
    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    const buttons = [];
    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`px-3 py-1 rounded ${
            page === i
              ? "bg-blue-600 text-white shadow"
              : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"
          }`}
        >
          {i}
        </button>,
      );
    }
    return buttons;
  };

  const inputClass =
    "w-full border dark:bg-zinc-950 border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600";

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Nombre */}
      <h1 className="text-3xl font-bold mb-2">{interpreter.interpreter}</h1>

      {/* Nationality */}
      <p className="text-gray-600 mb-1 dark:text-white">
        Nationality:{" "}
        {interpreter.nationality ? (
          <FlagWithName code={interpreter.nationality} />
        ) : (
          "Unknown"
        )}
      </p>

      {/* Debut */}
      <p className="text-gray-600 mb-1 dark:text-white">
        Debut:{" "}
        {matches.stats.firstMatch
          ? formatDateDDMMYYYY(matches.stats.firstMatch)
          : "—"}
      </p>

      {/* Wrestler actual */}
      {interpreter.status === "Active" &&
        (currentWrestler ? (
          <p className="text-gray-600 mb-1 dark:text-white">
            Wrestler:{" "}
            <Link
              href={`/wrestlers/${currentWrestler.id}`}
              className="text-blue-600 dark:text-sky-300 hover:underline"
            >
              <FlagWithName
                code={currentWrestler.country}
                name={currentWrestler.name}
              />
            </Link>
          </p>
        ) : (
          <p className="text-gray-600 mb-1 dark:text-white">
            Wrestler: <strong>None</strong>
          </p>
        ))}

      {/* Former wrestlers */}
      {formerWrestlers.length > 0 && (
        <p className="text-gray-600 mb-4 dark:text-white">
          Former wrestlers:{" "}
          {formerWrestlers.map((w, idx) => (
            <span key={w.id}>
              <Link
                href={`/wrestlers/${w.id}`}
                className="text-blue-600 dark:text-sky-300 hover:underline"
              >
                <FlagWithName code={w.country} name={w.name} />
              </Link>
              {idx < formerWrestlers.length - 1 && ", "}
            </span>
          ))}
        </p>
      )}

      {/* Stats */}
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

      {/* ─── Sección Matches ─────────────────────────────────────────────────── */}
      <h2 className="text-2xl font-semibold mb-3">Matches</h2>

      <div className="flex flex-col gap-3 mb-4">
        {/* Fila 1: evento + wrestler */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Filter by wrestler name"
            value={wrestlerInput}
            onChange={(e) => setWrestlerInput(e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Filter by event name"
            value={eventInput}
            onChange={(e) => setEventInput(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Fila 2: championship + stipulation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Filter by championship"
            value={champInput}
            onChange={(e) => setChampInput(e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Filter by stipulation"
            value={matchTypeInput}
            onChange={(e) => setMatchTypeInput(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Fila 3: toggles */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleTitleFilter}
            className={`px-4 py-2 rounded font-semibold ${
              filterTitle
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"
            }`}
          >
            Championship matches
          </button>
          <button
            onClick={toggleStipFilter}
            className={`px-4 py-2 rounded font-semibold ${
              filterStip
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"
            }`}
          >
            Stipulation matches
          </button>
        </div>
      </div>

      {/* Lista de matches */}
      <ul className="space-y-3">
        {matches.matches.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No matches found.</p>
        ) : (
          matches.matches.map((match) => {
            const teamsMap = match.participants.reduce((acc, p) => {
              if (!acc[p.team_number]) acc[p.team_number] = [];
              acc[p.team_number].push(p);
              return acc;
            }, {});

            const allTeamNumbers = Object.keys(teamsMap);
            const mainTeamNumber = String(match.team_number);
            const mainTeam = teamsMap[mainTeamNumber] || [];
            const rivalTeams = allTeamNumbers.filter(
              (tn) => tn !== mainTeamNumber,
            );

            const scoreMap = (match.scores || []).reduce((acc, s) => {
              acc[String(s.team_number)] = s.score;
              return acc;
            }, {});

            const renderTeam = (team, highlightFirst = false) =>
              team.map((p, i) => {
                const isCurrent = currentWrestler
                  ? p.wrestler_id === currentWrestler.id
                  : false;
                const nameNode =
                  isCurrent || highlightFirst ? (
                    <strong key={p.wrestler_id}>{p.wrestler}</strong>
                  ) : (
                    <Link
                      key={p.wrestler_id}
                      href={`/wrestlers/${p.wrestler_id}`}
                      className="text-blue-600 dark:text-sky-300 hover:underline"
                    >
                      {p.wrestler}
                    </Link>
                  );
                return (
                  <span key={p.wrestler_id}>
                    {i > 0 && " & "}
                    {nameNode}
                  </span>
                );
              });

            const getPhrase = (result) => {
              if (result === "WIN") return "defeats";
              if (result === "LOSS") return "defeated by";
              if (result === "DRAW") return "draw with";
              return "";
            };

            const isMultiMan = allTeamNumbers.length > 4;
            const hasScore = Object.keys(scoreMap).length > 0;

            let topLine = "";
            if (
              match.championship_name &&
              match.match_type_id &&
              match.match_type_id !== 1
            ) {
              topLine = `${match.championship_name} ${match.match_type_name} Match`;
            } else if (match.championship_name) {
              topLine = match.championship_name;
            } else if (
              !match.championship_name &&
              match.match_type_id &&
              match.match_type_id !== 1
            ) {
              topLine = `${match.match_type_name} Match`;
            }

            return (
              <li
                key={`${match.id}-${mainTeamNumber}`}
                className="border p-3 rounded shadow bg-white dark:bg-zinc-950"
              >
                <p className="font-medium">
                  {match.event_date
                    ? formatDateDDMMYYYY(match.event_date)
                    : "Unknown date"}{" "}
                  —{" "}
                  <Link
                    href={`/events/${match.event_id}`}
                    className="text-blue-600 dark:text-sky-300 hover:underline"
                  >
                    {match.event}
                  </Link>
                </p>

                {topLine && (
                  <strong className="mt-1 italic text-gray-700 dark:text-gray-300">
                    {topLine}
                  </strong>
                )}

                <p className="mt-2">
                  {renderTeam(mainTeam, true)}{" "}
                  {isMultiMan && !hasScore ? (
                    <>
                      {match.result === "LOSS" ? (
                        (() => {
                          const winningTeams = rivalTeams.filter((tn) =>
                            teamsMap[tn].some((p) => p.result === "WIN"),
                          );
                          const winnersParticipants = winningTeams.flatMap(
                            (tn) => teamsMap[tn],
                          );
                          const otherTeams = rivalTeams.filter(
                            (tn) => !winningTeams.includes(tn),
                          );
                          return (
                            <>
                              defeated by {renderTeam(winnersParticipants)}
                              {otherTeams.length > 0 && (
                                <>
                                  {" "}
                                  (Other participants:{" "}
                                  {otherTeams
                                    .map((tn) => renderTeam(teamsMap[tn]))
                                    .reduce((prev, curr) => [prev, ", ", curr])}
                                  )
                                </>
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <>
                          {getPhrase(match.result)}{" "}
                          {rivalTeams
                            .map((tn) => renderTeam(teamsMap[tn]))
                            .reduce((prev, curr) => [prev, ", ", curr])}
                        </>
                      )}
                    </>
                  ) : rivalTeams.length === 1 ? (
                    <>
                      {scoreMap[mainTeamNumber] != null &&
                      scoreMap[rivalTeams[0]] != null ? (
                        <>
                          {scoreMap[mainTeamNumber]}–{scoreMap[rivalTeams[0]]}{" "}
                          {renderTeam(teamsMap[rivalTeams[0]])}
                        </>
                      ) : (
                        <>
                          {getPhrase(match.result)}{" "}
                          {renderTeam(teamsMap[rivalTeams[0]])}
                        </>
                      )}
                    </>
                  ) : (
                    <span>
                      {[
                        <span key="main">{scoreMap[mainTeamNumber] ?? 0}</span>,
                        ...rivalTeams.map((teamNumber) => {
                          const team = renderTeam(teamsMap[teamNumber]);
                          const score = scoreMap[teamNumber] ?? 0;
                          return (
                            <span key={teamNumber}>
                              {team} {score}
                            </span>
                          );
                        }),
                      ].reduce((prev, curr) => [prev, " - ", curr])}
                    </span>
                  )}
                </p>

                <p className="mt-2 font-semibold text-gray-700 dark:text-white">
                  Result: <strong>{match.result}</strong>
                </p>
              </li>
            );
          })
        )}
      </ul>

      {/* ─── Paginación estilo Events ────────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center space-x-2 items-center">
          <button
            onClick={() => goToPage(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
            className={`px-3 py-1 rounded transition-colors ${
              pagination.page === 1
                ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed"
                : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            &lt;
          </button>

          {renderPageButtons()}

          <button
            onClick={() =>
              goToPage(Math.min(pagination.totalPages, pagination.page + 1))
            }
            disabled={pagination.page === pagination.totalPages}
            className={`px-3 py-1 rounded transition-colors ${
              pagination.page === pagination.totalPages
                ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed"
                : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
