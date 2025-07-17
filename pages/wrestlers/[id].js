// pages/wrestlers/[id].js

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
  const wrestlerId = parseInt(params.id, 10);
  if (isNaN(wrestlerId)) return { notFound: true };

  // 1) Traer datos básicos del luchador, incluido su status ("Active" o "Inactive")
  //    y la URL de la imagen (image_url)
  const [[wrestlerRow]] = await pool.query(
    `SELECT w.*, w.image_url FROM wrestlers w WHERE w.id = ?`,
    [wrestlerId]
  );
  if (!wrestlerRow) return { notFound: true };

  const wrestler = {
    id: wrestlerRow.id,
    wrestler: wrestlerRow.wrestler,
    country: wrestlerRow.country, // código ISO de país, ej. "US"
    status: wrestlerRow.status, // "Active" o "Inactive"
    debut_date: wrestlerRow.debut_date
      ? wrestlerRow.debut_date.toISOString()
      : null,
    image_url: wrestlerRow.image_url || null, // Ruta o URL de la imagen
  };

  // 2) Obtener TODOS los intérpretes que en su momento estuvieron asociados
  //    (tabla wrestler_interpreter)
  const [assocInterpreters] = await pool.query(
    `
    SELECT
      wi.interpreter_id,
      i.interpreter      AS interpreter_name,
      i.nationality      AS interpreter_country
    FROM wrestler_interpreter wi
    JOIN interpreters i ON wi.interpreter_id = i.id
    WHERE wi.wrestler_id = ?
    `,
    [wrestlerId]
  );

  let currentInterpreter = null;
  let formerInterpreters = [];

  if (wrestler.status === "Inactive") {
    // Si está Inactive, no hay current, TODOS pasan a former:
    formerInterpreters = assocInterpreters.map((r) => ({
      id: r.interpreter_id,
      name: r.interpreter_name,
      country: r.interpreter_country,
    }));
  } else {
    // Status = "Active": Buscamos el ÚLTIMO interpreter_id que apareció en match_participants
    // para este luchador, ordenando por event_date DESC
    const [[lastInterpRow]] = await pool.query(
      `
      SELECT
        mp.interpreter_id       AS interpreter_id,
        i.interpreter           AS interpreter_name,
        i.nationality           AS interpreter_country
      FROM match_participants mp
      JOIN matches m      ON mp.match_id = m.id
      JOIN events  e      ON m.event_id = e.id
      JOIN interpreters i ON mp.interpreter_id = i.id
      WHERE mp.wrestler_id = ?
        AND mp.interpreter_id IS NOT NULL
      ORDER BY e.event_date DESC
      LIMIT 1
      `,
      [wrestlerId]
    );

    if (lastInterpRow && lastInterpRow.interpreter_id) {
      // Ese intérprete es el “current”
      currentInterpreter = {
        id: lastInterpRow.interpreter_id,
        name: lastInterpRow.interpreter_name,
        country: lastInterpRow.interpreter_country,
      };
      // El resto de los asociados en wrestler_interpreter (menos el actual) van a former
      formerInterpreters = assocInterpreters
        .filter((r) => r.interpreter_id !== lastInterpRow.interpreter_id)
        .map((r) => ({
          id: r.interpreter_id,
          name: r.interpreter_name,
          country: r.interpreter_country,
        }));
    } else {
      // No encontró nunca intérprete en match_participants:
      // Todos pasan a former y current se queda en null
      formerInterpreters = assocInterpreters.map((r) => ({
        id: r.interpreter_id,
        name: r.interpreter_name,
        country: r.interpreter_country,
      }));
    }
  }

  // 3) Estadísticas de matches
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
     WHERE mp.wrestler_id = ?`,
    [wrestlerId]
  );

  const stats = {
    total: statsRow?.total || 0,
    wins: statsRow?.wins || 0,
    draws: statsRow?.draws || 0,
    losses: statsRow?.losses || 0,
    firstMatch: statsRow?.firstMatch ? statsRow.firstMatch.toISOString() : null,
    lastMatch: statsRow?.lastMatch ? statsRow.lastMatch.toISOString() : null,
  };

  // 4) Detalle de matches (ahora con JOIN a match_types y championships)
  const [rawMatches] = await pool.query(
    `SELECT
       m.id,
       m.event_id,
       e.name       AS event,
       e.event_date,
       m.match_order,
       mp.team_number,
       mp.result    AS result,

       -- AÑADIMOS ESTOS DOS CAMPOS:
       mt.id        AS match_type_id,
       mt.name      AS match_type_name,
       c.id         AS championship_id,
       c.title_name AS championship_name,

       (
         SELECT JSON_ARRAYAGG(JSON_OBJECT(
           'wrestler_id', mp2.wrestler_id,
           'wrestler',    w2.wrestler,
           'team_number', mp2.team_number,
           'result',      mp2.result
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
     JOIN events  e ON m.event_id = e.id

     -- LEFT JOIN para sacar match_type y championship (puede ser NULL)
     LEFT JOIN match_types mt ON m.match_type_id = mt.id
     LEFT JOIN championships c ON m.championship_id = c.id

     WHERE mp.wrestler_id = ?
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
    [wrestlerId]
  );

  const matchesDetail = rawMatches.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    event: row.event,
    event_date: row.event_date.toISOString(),
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
      wrestler,
      currentInterpreter,
      formerInterpreters,
      matches: {
        stats,
        matches: matchesDetail,
      },
    },
  };
}

export default function WrestlerDetail({
  wrestler,
  currentInterpreter,
  formerInterpreters = [],
  matches,
}) {
  // Formatea "YYYY-MM-DD" a "DD/MM/AAAA"
  const formatDebut = (isoDate) => {
    if (!isoDate) return "N/A";
    return formatDateDDMMYYYY(isoDate);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="md:flex md:items-stretch md:space-x-6">
        {/* === COLUMNA IZQUIERDA: Nombre + Datos + Stats === */}
        <div className="md:flex-1">
          {/* Nombre */}
          <h1 className="text-3xl font-bold mb-2">{wrestler.wrestler}</h1>

          {/* Country: bandera + nombre */}
          <p className="text-gray-600 mb-1 dark:text-white">
            Country:{" "}
            {wrestler.country ? (
              <FlagWithName code={wrestler.country} />
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

          {/* Interpreter actual (solo si existe) */}
          {currentInterpreter ? (
            <p className="text-gray-600 mb-1 dark:text-white">
              Interpreter:{" "}
              <Link
                href={`/interpreters/${currentInterpreter.id}`}
                className="text-blue-600  dark:text-sky-300"
              >
                <FlagWithName
                  code={currentInterpreter.country}
                  name={currentInterpreter.name}
                />
              </Link>
            </p>
          ) : wrestler.status === "Active" ? (
            <p className="text-gray-600 mb-1 dark:text-white">
              Interpreter: <strong>None</strong>
            </p>
          ) : null}

          {/* Former interpreters (solo si el array no está vacío) */}
          {formerInterpreters.length > 0 && (
            <p className="text-gray-600 mb-4 dark:text-white">
              Former interpreters:{" "}
              {formerInterpreters.map((intp, idx) => (
                <span key={intp.id}>
                  <Link
                    href={`/interpreters/${intp.id}`}
                    className="text-blue-600  dark:text-sky-300"
                  >
                    <FlagWithName code={intp.country} name={intp.name} />
                  </Link>
                  {idx < formerInterpreters.length - 1 && ", "}
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
        </div>

        {/* === COLUMNA DERECHA: Imagen del luchador con degradado === */}
        {wrestler.image_url && (
          <div className="md:w-1/2 md:flex-shrink-0 md:self-stretch">
            <div className="relative w-full h-full">
              <img
                src={wrestler.image_url}
                alt={wrestler.wrestler}
                className="w-full h-full object-cover rounded"
              />
              <div
                className="
          absolute bottom-0 left-0 w-full h-32
          bg-gradient-to-t
          from-white to-transparent
          dark:from-zinc-950
          rounded-b
        "
              />
            </div>
          </div>
        )}
      </div>

      {/* Detalle de matches */}
      <h2 className="text-2xl font-semibold mb-2">Matches</h2>
      <ul className="space-y-3">
        {matches.matches.map((match) => {
          const teamsMap = match.participants.reduce((acc, p) => {
            if (!acc[p.team_number]) acc[p.team_number] = [];
            acc[p.team_number].push(p);
            return acc;
          }, {});

          const allTeamNumbers = Object.keys(teamsMap);
          const mainTeamNumber = match.team_number.toString();
          const mainTeam = teamsMap[mainTeamNumber] || [];
          const rivalTeams = allTeamNumbers.filter(
            (tn) => tn !== mainTeamNumber
          );

          const scoreMap = (match.scores || []).reduce((acc, s) => {
            acc[s.team_number.toString()] = s.score;
            return acc;
          }, {});

          const renderTeam = (team, highlightFirst = false) =>
            team.map((p, i) => {
              const isCurrent = p.wrestler_id === wrestler.id;
              const nameNode =
                isCurrent || highlightFirst ? (
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

          //
          // —— BLOQUE AGREGADO: mostrar “Campeonato + Estipulación” antes de los participantes ——
          //
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
              key={match.id}
              className="border p-3 rounded shadow bg-white dark:bg-zinc-950"
            >
              <p className="font-medium">
                {formatDateDDMMYYYY(match.event_date)} —{" "}
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
        })}
      </ul>
    </div>
  );
}
