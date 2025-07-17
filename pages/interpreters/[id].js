// pages/interpreters/[id].js

import Link from "next/link";
import pool from "../../lib/db";
import FlagWithName from "../../components/FlagWithName";

// Helper para formatear fechas como "DD/MM/AAAA"
function formatDateDDMMYYYY(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function getServerSideProps({ params }) {
  const interpreterId = parseInt(params.id, 10);
  if (isNaN(interpreterId)) return { notFound: true };

  // 1) Traer datos básicos del intérprete (sin debut_date)
  const [[interpreterRow]] = await pool.query(
    `SELECT id, interpreter, nationality, status
     FROM interpreters
     WHERE id = ?`,
    [interpreterId]
  );
  if (!interpreterRow) return { notFound: true };

  const interpreter = {
    id: interpreterRow.id,
    interpreter: interpreterRow.interpreter,
    nationality: interpreterRow.nationality, // código ISO
    status: interpreterRow.status,           // "Active" o "Inactive"
  };

  // 2) Obtener TODOS los luchadores asociados en wrestler_interpreter
  const [assocWrestlers] = await pool.query(
    `
    SELECT
      wi.wrestler_id,
      w.wrestler       AS wrestler_name,
      w.country        AS wrestler_country
    FROM wrestler_interpreter wi
    JOIN wrestlers w ON wi.wrestler_id = w.id
    WHERE wi.interpreter_id = ?
    `,
    [interpreterId]
  );

  let currentWrestler = null;
  let formerWrestlers = [];

  if (interpreter.status === "Inactive") {
    // Si está inactivo → todos los asociados pasan a "Former wrestlers"
    formerWrestlers = assocWrestlers.map((r) => ({
      id: r.wrestler_id,
      name: r.wrestler_name,
      country: r.wrestler_country,
    }));
  } else {
    // Si está activo → buscamos la última aparición en match_participants
    const [[lastWrestlerRow]] = await pool.query(
      `
      SELECT
        mp.wrestler_id        AS wrestler_id,
        w.wrestler            AS wrestler_name,
        w.country             AS wrestler_country
      FROM match_participants mp
      JOIN matches m ON mp.match_id = m.id
      JOIN events e  ON m.event_id = e.id
      JOIN wrestlers w ON mp.wrestler_id = w.id
      WHERE mp.interpreter_id = ?
      ORDER BY e.event_date DESC
      LIMIT 1
      `,
      [interpreterId]
    );

    if (lastWrestlerRow && lastWrestlerRow.wrestler_id) {
      currentWrestler = {
        id: lastWrestlerRow.wrestler_id,
        name: lastWrestlerRow.wrestler_name,
        country: lastWrestlerRow.wrestler_country,
      };
      // El resto de asociados (menos el actual) van a “Former wrestlers”
      formerWrestlers = assocWrestlers
        .filter((r) => r.wrestler_id !== lastWrestlerRow.wrestler_id)
        .map((r) => ({
          id: r.wrestler_id,
          name: r.wrestler_name,
          country: r.wrestler_country,
        }));
    } else {
      // Nunca apareció en match_participants: todos pasan a former
      formerWrestlers = assocWrestlers.map((r) => ({
        id: r.wrestler_id,
        name: r.wrestler_name,
        country: r.wrestler_country,
      }));
    }
  }

  // 3) Estadísticas de matches como intérprete
  const [[statsRow]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
       SUM(CASE WHEN mp.result = 'DRAW' THEN 1 ELSE 0 END) AS draws,
       SUM(CASE WHEN mp.result = 'LOSS' THEN 1 ELSE 0 END) AS losses,
       MIN(e.event_date) AS firstMatch,
       MAX(e.event_date) AS lastMatch
     FROM match_participants mp
     JOIN matches m ON mp.match_id = m.id
     JOIN events  e ON m.event_id = e.id
     WHERE mp.interpreter_id = ?`,
    [interpreterId]
  );

  const stats = {
    total: statsRow?.total || 0,
    wins: statsRow?.wins || 0,
    draws: statsRow?.draws || 0,
    losses: statsRow?.losses || 0,
    firstMatch: statsRow?.firstMatch
      ? statsRow.firstMatch.toISOString()
      : null,
    lastMatch: statsRow?.lastMatch
      ? statsRow.lastMatch.toISOString()
      : null,
  };

  // 4) Detalle de matches como intérprete (con match_type y championship)
  const [rawMatches] = await pool.query(
    `SELECT
       m.id,
       m.event_id,
       e.name         AS event,
       e.event_date,
       m.match_order,
       mp.team_number,
       mp.result      AS result,

       -- Agregamos match_type y championship
       mt.id          AS match_type_id,
       mt.name        AS match_type_name,
       c.id           AS championship_id,
       c.title_name   AS championship_name,

       (
         SELECT JSON_ARRAYAGG(JSON_OBJECT(
           'wrestler_id', mp2.wrestler_id,
           'wrestler',    w2.wrestler,
           'interpreter_id', mp2.interpreter_id,
           'interpreter',     i2.interpreter,
           'team_number', mp2.team_number,
           'result',      mp2.result
         ))
         FROM match_participants mp2
         JOIN wrestlers w2 ON mp2.wrestler_id = w2.id
         JOIN interpreters i2 ON mp2.interpreter_id = i2.id
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
     JOIN events  e ON m.event_id = e.id

     LEFT JOIN match_types mt ON m.match_type_id = mt.id
     LEFT JOIN championships c ON m.championship_id = c.id

     WHERE mp.interpreter_id = ?
     GROUP BY
       m.id,
       mp.team_number,
       mp.result,
       m.match_order,
       m.event_id,
       e.name,
       e.event_date,
       mt.id,
       mt.name,
       c.id,
       c.title_name
     ORDER BY e.event_date DESC, m.match_order DESC`,
    [interpreterId]
  );

  const matchesList = rawMatches.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    event: row.event,
    event_date: row.event_date ? row.event_date.toISOString() : null,
    match_order: row.match_order,
    team_number: row.team_number,
    result: row.result,
    match_type_id: row.match_type_id,
    match_type_name: row.match_type_name,
    championship_id: row.championship_id,
    championship_name: row.championship_name,
    participants: row.participants || [],
    scores: row.scores || [],
  }));

  return {
    props: {
      interpreter,
      currentWrestler,
      formerWrestlers,
      matches: {
        stats,
        matches: matchesList,
      },
    },
  };
}

export default function InterpreterDetail({
  interpreter,
  currentWrestler,
  formerWrestlers = [],
  matches,
}) {
  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Nombre del intérprete */}
      <h1 className="text-3xl font-bold mb-2">
        {interpreter.interpreter}
      </h1>

      {/* Nationality: bandera + nombre completo */}
      <p className="text-gray-600 mb-1 dark:text-white">
        Nationality:{" "}
        {interpreter.nationality ? (
          <FlagWithName code={interpreter.nationality} />
        ) : (
          "Unknown"
        )}
      </p>

      {/* Debut (la tomo de stats.firstMatch) */}
      <p className="text-gray-600 mb-1 dark:text-white">
        Debut:{" "}
        {matches.stats.firstMatch
          ? formatDateDDMMYYYY(matches.stats.firstMatch)
          : "—"}
      </p>

      {/* Wrestler actual (solo si está activo) */}
      {interpreter.status === "Active" && (
        <>
          {currentWrestler ? (
            <p className="text-gray-600 mb-1 dark:text-white">
              Wrestler:{" "}
              <Link
                href={`/wrestlers/${currentWrestler.id}`}
                className="text-blue-600  dark:text-sky-300"
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
          )}
        </>
      )}

      {/* Former wrestlers */}
      {formerWrestlers.length > 0 && (
        <p className="text-gray-600 mb-4 dark:text-white">
          Former wrestlers:{" "}
          {formerWrestlers.map((w, idx) => (
            <span key={w.id}>
              <Link
                href={`/wrestlers/${w.id}`}
                className="text-blue-600  dark:text-sky-300"
              >
                <FlagWithName code={w.country} name={w.name} />
              </Link>
              {idx < formerWrestlers.length - 1 && ", "}
            </span>
          ))}
        </p>
      )}

      {/* Estadísticas */}
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

      {/* Lista de Matches como intérprete */}
      <h2 className="text-2xl font-semibold mb-2">Matches</h2>
      <ul className="space-y-3">
        {matches.matches.map((match) => {
          const teamsMap = match.participants.reduce((acc, p) => {
            if (!acc[p.team_number]) acc[p.team_number] = [];
            acc[p.team_number].push(p);
            return acc;
          }, {});

          const allTeamNumbers = Object.keys(teamsMap);
          const mainTeamNumber = String(match.team_number);
          const mainTeam = teamsMap[mainTeamNumber] || [];
          const rivalTeams = allTeamNumbers.filter(
            (tn) => tn !== mainTeamNumber
          );

          const scoreMap = (match.scores || []).reduce((acc, s) => {
            acc[String(s.team_number)] = s.score;
            return acc;
          }, {});

          const renderTeam = (team, highlightFirst = false) =>
            team.map((p, i) => {
              const isCurrentWrestler = currentWrestler
                ? p.wrestler_id === currentWrestler.id
                : false;
              const nameNode =
                isCurrentWrestler || highlightFirst ? (
                  <strong key={p.wrestler_id}>{p.wrestler}</strong>
                ) : (
                  <Link
                    key={p.wrestler_id}
                    href={`/wrestlers/${p.wrestler_id}`}
                    className="text-blue-600  dark:text-sky-300"
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

          // —— BLOQUE AGREGADO: mostrar “Campeonato / Estipulación” ——
          let topLine = "";
          // 1) Caso: campeonato + estipulación distinta de “Singles” (ID=1)
          if (
            match.championship_name &&
            match.match_type_id &&
            match.match_type_id !== 1
          ) {
            topLine = `${match.championship_name} ${match.match_type_name} Match`;
          }
          // 2) Solo campeonato (estipulación = Singles o falta)
          else if (match.championship_name) {
            topLine = match.championship_name;
          }
          // 3) Solo estipulación no‐Singles, sin campeonato
          else if (
            !match.championship_name &&
            match.match_type_id &&
            match.match_type_id !== 1
          ) {
            topLine = `${match.match_type_name} Match`;
          }
          // 4) Si es match_type = 1 y no tiene campeonato, topLine queda vacío

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
                  className="text-blue-600  dark:text-sky-300"
                >
                  {match.event}
                </Link>
              </p>

              {/* Mostrar línea de Campeonato / Estipulación */}
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
                        // 1. Equipos ganadores (uno o más)
                        const winningTeams = rivalTeams.filter((tn) =>
                          teamsMap[tn].some((p) => p.result === "WIN")
                        );

                        // 2. Participantes de los equipos ganadores
                        const winnersParticipants = winningTeams.flatMap(
                          (tn) => teamsMap[tn]
                        );

                        // 3. Otros equipos que no ganaron
                        const otherTeams = rivalTeams.filter(
                          (tn) => !winningTeams.includes(tn)
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
                                  .reduce((prev, curr) => [
                                    prev,
                                    ", ",
                                    curr,
                                  ])}
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
                        {scoreMap[mainTeamNumber]}–
                        {scoreMap[rivalTeams[0]]}{" "}
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
                      <span key="main">
                        {scoreMap[mainTeamNumber] ?? 0}
                      </span>,
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
        })}
      </ul>
    </div>
  );
}
