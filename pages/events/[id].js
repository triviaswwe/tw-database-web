// pages/events/[id].js

import { useRouter } from "next/router";
import useSWR from "swr";
import Link from "next/link";
import pool from "../../lib/db";

const fetcher = (url) => fetch(url).then((res) => res.json());

export async function getServerSideProps({ params }) {
  const eventId = parseInt(params.id, 10);
  if (isNaN(eventId)) {
    return { notFound: true };
  }

  // 1) Traer detalle de matches con JOIN a match_types y championships.
  // Se agrupa únicamente por campos del match, no por mp.team_number/mp.result
  // para evitar duplicados.
  const [rawMatches] = await pool.query(
    `
    SELECT
      m.id,
      m.event_id,
      e.name               AS event,
      e.event_date,
      m.match_order,
      mt.id                AS match_type_id,
      mt.name              AS match_type_name,
      c.id                 AS championship_id,
      c.title_name         AS championship_name,

      (
        SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'wrestler_id',   mp2.wrestler_id,
          'wrestler',      w2.wrestler,
          'team_number',   mp2.team_number,
          'result',        mp2.result
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

    FROM matches m
    JOIN events e ON m.event_id = e.id
    LEFT JOIN match_types mt ON m.match_type_id = mt.id
    LEFT JOIN championships c ON m.championship_id = c.id
    WHERE m.event_id = ?
    GROUP BY
      m.id,
      m.event_id,
      e.name,
      e.event_date,
      m.match_order,
      mt.id,
      mt.name,
      c.id,
      c.title_name
    ORDER BY m.match_order ASC
    `,
    [eventId]
  );

  // 2) Convertir cada fila a objeto de match
  const matches = rawMatches.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    event: row.event,
    event_date: row.event_date.toISOString(),
    match_order: row.match_order,
    match_type_id: row.match_type_id,
    match_type_name: row.match_type_name,
    championship_id: row.championship_id,
    championship_name: row.championship_name,
    participants: Array.isArray(row.participants) ? row.participants : [],
    scores: Array.isArray(row.scores) ? row.scores : [],
  }));

  return {
    props: {
      matches,
    },
  };
}

export default function EventDetail({ matches }) {
  const router = useRouter();
  const { id } = router.query;

  // 1) Datos del evento vía SWR
  const { data: event, error: eventError } = useSWR(
    id ? `/api/events/${id}` : null,
    fetcher
  );

  if (eventError) return <div>Error loading event</div>;
  if (!event) return <div>Loading event...</div>;

  // Helper para formatear fechas como "DD/MM/AAAA"
  const formatDateDDMMYYYY = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Frases para win/loss/draw
  const getPhrase = (result) => {
    if (result === "WIN") return "defeats";
    if (result === "LOSS") return "defeated by";
    if (result === "DRAW") return "draw with";
    return "";
  };

  return (
    <div
      className="
        min-h-screen
        bg-white text-black
        dark:bg-zinc-950 dark:text-white
        transition-colors duration-300
      "
    >
      <div className="p-4 max-w-3xl mx-auto">
        {/* Header del evento */}
        <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
        <p className="mb-1 text-gray-600 dark:text-gray-300">
          Type: {event.event_type}
        </p>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          Date:{" "}
          {new Date(event.event_date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: "UTC",
          })}
        </p>

        {/* Matches */}
        <h2 className="text-2xl font-semibold mb-4">Matches</h2>

        {!matches || matches.length === 0 ? (
          <p>No matches registered for this event yet.</p>
        ) : (
          <ul className="space-y-6">
            {matches.map((match, idx) => {
              const isOpener = idx === 0;
              const isMainEvent = idx === matches.length - 1;

              //
              // —— BLOQUE: mostrar “Campeonato + Estipulación” antes de los participantes ——
              //
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
              // Si match_type_id === 1 y no hay championship_name, topLine queda vacío

              //
              // —— PARTICIPANTES Y SCORES ——
              //
              const participants = Array.isArray(match.participants)
                ? match.participants
                : [];

              if (participants.length === 0) {
                // Sin participantes, fallback
                return (
                  <li
                    key={match.id}
                    className="
                      border border-gray-200 bg-white p-4 rounded shadow
                      dark:border-gray-700 dark:bg-zinc-950
                      transition-colors duration-300
                    "
                  >
                    {(isOpener || isMainEvent) && (
                      <p className="font-semibold text-lg mb-1">
                        {isOpener ? "Opener:" : "Main Event:"}
                      </p>
                    )}
                    <p>No hay información de participantes.</p>
                  </li>
                );
              }

              // Agrupamos por team_number
              const teamsMap = participants.reduce((acc, p) => {
                const tn = p.team_number != null ? p.team_number : 0;
                if (!acc[tn]) acc[tn] = [];
                acc[tn].push(p);
                return acc;
              }, {});

              const allTeamNumbers = Object.keys(teamsMap)
                .map((n) => parseInt(n, 10))
                .sort((a, b) => a - b);

              const mainTeamNumber = allTeamNumbers[0];
              const rivalTeamNumbers = allTeamNumbers.slice(1);

              const mainTeam = teamsMap[mainTeamNumber] || [];
              const rivalTeams = rivalTeamNumbers.map(
                (tn) => teamsMap[tn] || []
              );

              // Construir scoreMap: { team_number: score }
              const scoreMap = (match.scores || []).reduce((acc, s) => {
                acc[s.team_number] = s.score;
                return acc;
              }, {});

              const isMultiMan = allTeamNumbers.length > 4;
              const hasScore = Object.keys(scoreMap).length > 0;

              // renderTeam: " & " entre luchadores, negrita solo en p.result === "WIN"
              const renderTeam = (teamArray) =>
                teamArray.map((p, i) => {
                  const isWinner = p.result === "WIN";
                  return (
                    <span key={p.wrestler_id}>
                      {i > 0 && " & "}
                      <Link
                        href={`/wrestlers/${p.wrestler_id}`}
                        className="text-blue-600 hover:underline dark:text-sky-300"
                      >
                        {isWinner ? <strong>{p.wrestler}</strong> : p.wrestler}
                      </Link>
                    </span>
                  );
                });

              return (
                <li
                  key={match.id}
                  className="
                    border border-gray-200 bg-white p-4 rounded shadow
                    dark:border-gray-700 dark:bg-zinc-950
                    transition-colors duration-300
                  "
                >
                  {/* Etiqueta Opener / Main Event */}
                  {(isOpener || isMainEvent) && (
                    <p className="font-semibold text-lg mb-1">
                      {isOpener ? "Opener:" : "Main Event:"}
                    </p>
                  )}

                  {/* Mostrar línea de Campeonato / Estipulación */}
                  {topLine && (
                    <strong className="mt-1 italic text-gray-700 dark:text-gray-300 block mb-2">
                      {topLine}
                    </strong>
                  )}

                  {/* Formato: “Wrestler score-score Wrestler” */}
                  <p>
                    {isMultiMan && !hasScore ? (
                      (() => {
                        // 1. Equipos ganadores: todos los team_numbers de allTeamNumbers que tengan result === "WIN"
                        const winningTeamNumbers = allTeamNumbers.filter((tn) =>
                          teamsMap[tn].some((p) => p.result === "WIN")
                        );

                        // 2. Participantes ganadores:
                        const winnersParticipants = winningTeamNumbers.flatMap(
                          (tn) => teamsMap[tn]
                        );

                        // 3. Equipos perdedores: todos los team_numbers de allTeamNumbers que no estén en winningTeamNumbers
                        const losingTeamNumbers = allTeamNumbers.filter(
                          (tn) => !winningTeamNumbers.includes(tn)
                        );

                        // 4. Render de participantes ganadores (en strong)
                        const winnersRender = renderTeam(winnersParticipants);

                        // 5. Render de participantes perdedores (por equipos):
                        //    cada equipo se junta con " & ", luego equipos separados por comas
                        const losersRender = losingTeamNumbers
                          .map((tn) => renderTeam(teamsMap[tn]))
                          .reduce((acc, curr, i) => {
                            if (i === 0) return [curr];
                            return [...acc, ", ", curr];
                          }, []);

                        return (
                          <>
                            {winnersRender} defeats {losersRender}
                          </>
                        );
                      })()
                    ) : (
                      <>
                        {/* Para el resto de los combates, incluimos mainTeam */}
                        {renderTeam(mainTeam)}{" "}
                        {rivalTeams.length === 1 ? (
                          <>
                            {hasScore &&
                            scoreMap[mainTeamNumber] != null &&
                            scoreMap[rivalTeamNumbers[0]] != null ? (
                              (() => {
                                const leftScore = scoreMap[mainTeamNumber];
                                const rightScore =
                                  scoreMap[rivalTeamNumbers[0]];
                                // Empate
                                if (leftScore === rightScore) {
                                  return (
                                    <>
                                      <strong>
                                        {leftScore}-{rightScore}
                                      </strong>{" "}
                                      {renderTeam(
                                        teamsMap[rivalTeamNumbers[0]]
                                      )}
                                    </>
                                  );
                                }
                                // No es empate: el bold en nombres lo maneja renderTeam()
                                return (
                                  <>
                                    {leftScore}-{rightScore}{" "}
                                    {renderTeam(
                                      teamsMap[rivalTeamNumbers[0]]
                                    )}
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                {getPhrase(match.result)}{" "}
                                {renderTeam(
                                  teamsMap[rivalTeamNumbers[0]]
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <span>
                            {[
                              <span key="main-score">
                                {scoreMap[mainTeamNumber] ?? 0}
                              </span>,
                              ...rivalTeamNumbers.map((tn) => {
                                const teamNodes = renderTeam(teamsMap[tn]);
                                const sc = scoreMap[tn] ?? 0;
                                return (
                                  <span key={`team-${tn}`}>
                                    {teamNodes} {sc}
                                  </span>
                                );
                              }),
                            ].reduce((prev, curr) => [prev, " - ", curr])}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
