// pages/events/[id].js

import Head from "next/head";
import Link from "next/link";
import pool from "../../lib/db";
import { getPhrase, buildTopLine } from "../../lib/matchUtils";

export async function getServerSideProps({ params }) {
  try {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) return { notFound: true };

    // ─── Evento + matches en paralelo ──────────────────────────────────────
    const [
      [[eventRow]],
      [rawMatches],
    ] = await Promise.all([
      pool.query(
        `SELECT e.id, e.name, e.event_type, e.event_date
         FROM events e WHERE e.id = ?`,
        [eventId]
      ),
      pool.query(
        `SELECT
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
         FROM matches m
         JOIN events e ON m.event_id = e.id
         LEFT JOIN match_types mt ON m.match_type_id = mt.id
         LEFT JOIN championships c ON m.championship_id = c.id
         WHERE m.event_id = ?
         GROUP BY m.id, m.event_id, e.name, e.event_date, m.match_order,
                  mt.id, mt.name, c.id, c.title_name
         ORDER BY m.match_order ASC`,
        [eventId]
      ),
    ]);

    if (!eventRow) return { notFound: true };

    const event = {
      id:         eventRow.id,
      name:       eventRow.name,
      event_type: eventRow.event_type,
      event_date: eventRow.event_date.toISOString(),
    };

    const matches = rawMatches.map((row) => ({
      id:               row.id,
      event_id:         row.event_id,
      event:            row.event,
      event_date:       row.event_date.toISOString(),
      match_order:      row.match_order,
      match_type_id:    row.match_type_id,
      match_type_name:  row.match_type_name,
      championship_id:  row.championship_id,
      championship_name:row.championship_name,
      participants: Array.isArray(row.participants) ? row.participants : [],
      scores:       Array.isArray(row.scores)       ? row.scores       : [],
    }));

    return { props: { event, matches } };
  } catch (err) {
    console.error("Error in events/[id] getServerSideProps:", err);
    return { props: { error: true } };
  }
}

export default function EventDetail({ error, event, matches }) {
  if (error) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Error al cargar</h1>
        <p className="text-gray-500">No se pudo conectar a la base de datos. Intentá de nuevo en unos segundos.</p>
      </div>
    );
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC",
    });

  return (
    <>
      <Head>
        <title>{event.name} — Trivias WWE</title>
        <meta name="description" content={`Resultados y matches de ${event.name} en Trivias WWE.`} />
      </Head>

      <div className="min-h-screen bg-white text-black dark:bg-zinc-950 dark:text-white transition-colors duration-300">
        <div className="p-4 max-w-3xl mx-auto">

          {/* Header del evento */}
          <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
          <p className="mb-1 text-gray-600 dark:text-gray-300">Type: {event.event_type}</p>
          <p className="mb-4 text-gray-600 dark:text-gray-300">Date: {formatDate(event.event_date)}</p>

          <h2 className="text-2xl font-semibold mb-4">Matches</h2>

          {!matches || matches.length === 0 ? (
            <p>No matches registered for this event yet.</p>
          ) : (
            <ul className="space-y-6">
              {matches.map((match, idx) => {
                const isOpener    = idx === 0;
                const isMainEvent = idx === matches.length - 1;
                const topLine     = buildTopLine(match);

                const participants = match.participants;
                if (participants.length === 0) {
                  return (
                    <li key={match.id} className="border border-gray-200 bg-white p-4 rounded shadow dark:border-gray-700 dark:bg-zinc-950 transition-colors duration-300">
                      {(isOpener || isMainEvent) && (
                        <p className="font-semibold text-lg mb-1">{isOpener ? "Opener:" : "Main Event:"}</p>
                      )}
                      <p>No hay información de participantes.</p>
                    </li>
                  );
                }

                const teamsMap = participants.reduce((acc, p) => {
                  const tn = p.team_number != null ? p.team_number : 0;
                  if (!acc[tn]) acc[tn] = [];
                  acc[tn].push(p);
                  return acc;
                }, {});

                const allTeamNumbers = Object.keys(teamsMap)
                  .map((n) => parseInt(n, 10))
                  .sort((a, b) => a - b);

                const mainTeamNumber    = allTeamNumbers[0];
                const rivalTeamNumbers  = allTeamNumbers.slice(1);
                const mainTeam          = teamsMap[mainTeamNumber] || [];

                const scoreMap = (match.scores || []).reduce((acc, s) => {
                  acc[s.team_number] = s.score;
                  return acc;
                }, {});

                const isMultiMan = allTeamNumbers.length > 4;
                const hasScore   = Object.keys(scoreMap).length > 0;

                // En events: bold al ganador (result === "WIN"), no al "current"
                const renderTeam = (teamArray) =>
                  teamArray.map((p, i) => (
                    <span key={p.wrestler_id}>
                      {i > 0 && " & "}
                      <Link href={`/wrestlers/${p.wrestler_id}`} className="text-blue-600 dark:text-sky-300 hover:underline">
                        {p.result === "WIN" ? <strong>{p.wrestler}</strong> : p.wrestler}
                      </Link>
                    </span>
                  ));

                return (
                  <li key={match.id} className="border border-gray-200 bg-white p-4 rounded shadow dark:border-gray-700 dark:bg-zinc-950 transition-colors duration-300">
                    {(isOpener || isMainEvent) && (
                      <p className="font-semibold text-lg mb-1">{isOpener ? "Opener:" : "Main Event:"}</p>
                    )}

                    {topLine && (
                      <strong className="mt-1 italic text-gray-700 dark:text-gray-300 block mb-2">{topLine}</strong>
                    )}

                    <p>
                      {isMultiMan && !hasScore ? (
                        (() => {
                          const winningTeamNumbers = allTeamNumbers.filter((tn) =>
                            teamsMap[tn].some((p) => p.result === "WIN")
                          );
                          const winnersParticipants = winningTeamNumbers.flatMap((tn) => teamsMap[tn]);
                          const losingTeamNumbers   = allTeamNumbers.filter((tn) => !winningTeamNumbers.includes(tn));
                          const losersRender        = losingTeamNumbers
                            .map((tn) => renderTeam(teamsMap[tn]))
                            .reduce((acc, curr, i) => i === 0 ? [curr] : [...acc, ", ", curr], []);
                          return <>{renderTeam(winnersParticipants)} defeats {losersRender}</>;
                        })()
                      ) : (
                        <>
                          {renderTeam(mainTeam)}{" "}
                          {rivalTeamNumbers.length === 1 ? (
                            <>
                              {hasScore && scoreMap[mainTeamNumber] != null && scoreMap[rivalTeamNumbers[0]] != null ? (
                                <>
                                  {scoreMap[mainTeamNumber]}-{scoreMap[rivalTeamNumbers[0]]}{" "}
                                  {renderTeam(teamsMap[rivalTeamNumbers[0]])}
                                </>
                              ) : (
                                <>
                                  {getPhrase(mainTeam[0]?.result)}{" "}
                                  {renderTeam(teamsMap[rivalTeamNumbers[0]])}
                                </>
                              )}
                            </>
                          ) : (
                            <span>
                              {[
                                <span key="main-score">{scoreMap[mainTeamNumber] ?? 0}</span>,
                                ...rivalTeamNumbers.map((tn) => (
                                  <span key={`team-${tn}`}>{renderTeam(teamsMap[tn])} {scoreMap[tn] ?? 0}</span>
                                )),
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
    </>
  );
}