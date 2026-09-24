// pages/events/[id].js

import Head from "next/head";
import Link from "next/link";
import pool from "../../lib/db";
import { getPhrase, buildTopLine } from "../../lib/matchUtils";

// Dominio base de Vercel Blob y Mapas de imágenes
const BLOB_BASE_URL = 'https://ljejfdquofuxccca.public.blob.vercel-storage.com';

const showNameMap = {
  1: "RAW",
  2: "SmackDown",
  3: "NXT",
  4: "Speed",
  5: "WWE Live",
};

const showImageMap = {
  1: `${BLOB_BASE_URL}/raw.png`,
  2: `${BLOB_BASE_URL}/sd.png`,
  3: `${BLOB_BASE_URL}/nxt.png`,
  4: `${BLOB_BASE_URL}/speed.png`,
  5: `${BLOB_BASE_URL}/wwelive.png`,
};

const pleImageMap = {
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

export async function getServerSideProps({ params }) {
  try {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) return { notFound: true };

    const [
      [[eventRow]],
      [rawMatches],
    ] = await Promise.all([
      pool.query(
        `SELECT e.id, e.name, e.event_type, e.event_date, e.image_url, e.show_id, e.ple_id, p.image_url AS ple_image_url, p.name AS ple_name
         FROM events e 
         LEFT JOIN ples p ON e.ple_id = p.id
         WHERE e.id = ?`,
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

    const eventDate = eventRow.event_date;
    const showId = eventRow.show_id;
    const pleId = eventRow.ple_id;
    const eventType = eventRow.event_type ? eventRow.event_type.toLowerCase() : "";

    const event = {
      id:            eventRow.id,
      name:          eventRow.name,
      event_type:    eventRow.event_type,
      event_date:    eventDate.toISOString(),
      image_url:     eventRow.image_url || null,
      ple_image_url: eventRow.ple_image_url || null,
      show_id:       showId || null,
      ple_id:        pleId || null,
    };

    const getAdjacent = async (condition, paramsArr, isNext) => {
      const order = isNext ? "ASC" : "DESC";
      const operator = isNext ? ">" : "<";
      const query = `
        SELECT e.id, e.name, e.event_type, e.show_id, e.ple_id, e.image_url, p.image_url AS ple_image_url, p.name AS ple_name
        FROM events e LEFT JOIN ples p ON e.ple_id = p.id
        WHERE (e.event_date ${operator} ? OR (e.event_date = ? AND e.id ${operator} ?))
        ${condition ? `AND ${condition}` : ""}
        ORDER BY e.event_date ${order}, e.id ${order} LIMIT 1
      `;
      const [rows] = await pool.query(query, [eventDate, eventDate, eventId, ...paramsArr]);
      return rows.length > 0 ? rows[0] : null;
    };

    const formatNavNode = (node) => {
      if (!node) return null;
      const { event_date, ...rest } = node; 
      return rest;
    };

    // 1. ALL Events
    const [prevAll, nextAll] = await Promise.all([
      getAdjacent("", [], false),
      getAdjacent("", [], true),
    ]);

    // 2. SHOW / LIVE Chronology
    let prevShow = null, nextShow = null;
    let showNavLabel = "";
    
    if (eventType === 'special') {
      [prevShow, nextShow] = await Promise.all([
        getAdjacent("LOWER(e.event_type) = 'special'", [], false),
        getAdjacent("LOWER(e.event_type) = 'special'", [], true),
      ]);
      showNavLabel = "Live Chronology";
    } else if (showId) {
      [prevShow, nextShow] = await Promise.all([
        getAdjacent("e.show_id = ?", [showId], false),
        getAdjacent("e.show_id = ?", [showId], true),
      ]);
      showNavLabel = `${showNameMap[showId] || 'Show'} Chronology`;
    }

    // 3. FRANCHISE Chronology & GLOBAL PLE Chronology
    let prevFranchise = null, nextFranchise = null;
    let prevPLE = null, nextPLE = null;
    let franchiseNavLabel = "";
    let pleNavLabel = "";

    if (pleId) {
      // 3.A Franquicia Específica (Mismo ple_id)
      [prevFranchise, nextFranchise] = await Promise.all([
        getAdjacent("e.ple_id = ?", [pleId], false),
        getAdjacent("e.ple_id = ?", [pleId], true),
      ]);

      if (eventType === 'takeover' || pleId === 18) {
        franchiseNavLabel = "TakeOver Chronology";
      } else {
        // Obtenemos el nombre limpio del PLE, con un fallback que remueve el año si la BD no lo devuelve
        const baseName = eventRow.ple_name || eventRow.name.replace(/\s\d{4}.*$/, '').trim();
        franchiseNavLabel = `${baseName} Chronology`;
        
        // 3.B Cronología Global de PLEs (Sólo para PLEs que NO sean TakeOver)
        [prevPLE, nextPLE] = await Promise.all([
          getAdjacent("e.ple_id IS NOT NULL AND e.ple_id != 18", [], false),
          getAdjacent("e.ple_id IS NOT NULL AND e.ple_id != 18", [], true),
        ]);
        pleNavLabel = "PLE Chronology";
      }
    }

    const nav = {
      prevAll: formatNavNode(prevAll),
      nextAll: formatNavNode(nextAll),
      prevShow: formatNavNode(prevShow),
      nextShow: formatNavNode(nextShow),
      prevFranchise: formatNavNode(prevFranchise),
      nextFranchise: formatNavNode(nextFranchise),
      prevPLE: formatNavNode(prevPLE),
      nextPLE: formatNavNode(nextPLE),
      showNavLabel,
      franchiseNavLabel,
      pleNavLabel,
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

    return { props: { event, matches, nav } };
  } catch (err) {
    console.error("Error in events/[id] getServerSideProps:", err);
    return { props: { error: true } };
  }
}

export default function EventDetail({ error, event, matches, nav }) {
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

  const getEventLogo = (ev) => {
    if (!ev) return null;
    if (ev.image_url) return ev.image_url;
    if (ev.ple_image_url) return ev.ple_image_url;
    if (ev.ple_id && pleImageMap[ev.ple_id]) return pleImageMap[ev.ple_id];
    if (ev.show_id && showImageMap[ev.show_id]) return showImageMap[ev.show_id];
    return null;
  };

  const logoSrc = getEventLogo(event);

  const EventLogo = ({ ev, className }) => {
    const src = getEventLogo(ev);
    if (!src) return <div className={className} />;
    return <img src={src} alt={ev.name} className={className} />;
  };

  const renderNavRow = (prev, current, next, label) => {
    if (!prev && !next) return null;
    return (
      <div className="flex flex-col mb-10 w-full">
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 text-center font-bold">
          {label}
        </span>
        <div className="flex items-center justify-between gap-2 md:gap-4">
          
          {/* Previous */}
          <div className="flex-1 flex justify-end text-right">
            {prev ? (
              <Link href={`/events/${prev.id}`} className="group flex items-center gap-2 sm:gap-4 hover:opacity-80 transition-opacity justify-end w-full">
                <span className="text-2xl hidden sm:block text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors">&larr;</span>
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] sm:text-xs text-gray-400">Previous</span>
                  <span className="font-bold text-xs sm:text-base group-hover:text-blue-500 transition-colors">{prev.name}</span>
                </div>
                <EventLogo ev={prev} className="w-10 h-10 sm:w-14 sm:h-14 object-contain flex-shrink-0" />
              </Link>
            ) : <div className="flex-1" />}
          </div>

          {/* Current (Centro Fijo) */}
          <div className="flex-shrink-0 px-2 sm:px-4">
            <EventLogo ev={current} className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-md opacity-50" />
          </div>

          {/* Next */}
          <div className="flex-1 flex justify-start text-left">
            {next ? (
              <Link href={`/events/${next.id}`} className="group flex items-center gap-2 sm:gap-4 hover:opacity-80 transition-opacity justify-start w-full">
                <EventLogo ev={next} className="w-10 h-10 sm:w-14 sm:h-14 object-contain flex-shrink-0" />
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] sm:text-xs text-gray-400">Next</span>
                  <span className="font-bold text-xs sm:text-base group-hover:text-blue-500 transition-colors">{next.name}</span>
                </div>
                <span className="text-2xl hidden sm:block text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors">&rarr;</span>
              </Link>
            ) : <div className="flex-1" />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>{event.name} — Trivias WWE</title>
        <meta name="description" content={`Resultados y matches de ${event.name} en Trivias WWE.`} />
      </Head>

      <div className="min-h-screen bg-white text-black dark:bg-zinc-950 dark:text-white transition-colors duration-300">
        <div className="p-4 max-w-3xl mx-auto">

          {/* Header del evento */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 md:gap-4">
            {logoSrc && (
              <div className="w-48 sm:w-52 md:w-72 flex-shrink-0">
                <img
                  src={logoSrc}
                  alt={`${event.name} logo`}
                  className="w-full h-auto object-contain"
                />
              </div>
            )}
            <div className="mt-4 md:mt-0 flex flex-col items-center md:items-end text-center md:text-right">
              <h1 className="text-3xl md:text-4xl font-bold mb-1">{event.name}</h1>
              <p className="mb-1 text-gray-600 dark:text-gray-300">Type: {event.event_type}</p>
              <p className="text-gray-600 dark:text-gray-300">Date: {formatDate(event.event_date)}</p>
            </div>
          </div>

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
                    <li key={match.id} className="border border-gray-200 bg-white p-4 rounded shadow dark:border-gray-800 dark:bg-zinc-950 transition-colors duration-300">
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

                const allTeamNumbers = Object.keys(teamsMap).map((n) => parseInt(n, 10)).sort((a, b) => a - b);
                const mainTeamNumber = allTeamNumbers[0];
                const rivalTeamNumbers = allTeamNumbers.slice(1);
                const mainTeam = teamsMap[mainTeamNumber] || [];

                const scoreMap = (match.scores || []).reduce((acc, s) => {
                  acc[s.team_number] = s.score;
                  return acc;
                }, {});

                const isMultiMan = allTeamNumbers.length > 4;
                const hasScore   = Object.keys(scoreMap).length > 0;

                const renderTeam = (teamArray) =>
                  teamArray.map((p, i) => (
                    <span key={p.wrestler_id}>
                      {i > 0 && " & "}
                      <Link href={`/wrestlers/${p.wrestler_id}`} className="text-blue-600 dark:text-sky-300 ">
                        {p.result === "WIN" ? <strong>{p.wrestler}</strong> : p.wrestler}
                      </Link>
                    </span>
                  ));

                return (
                  <li key={match.id} className="border border-gray-200 bg-white p-4 rounded shadow dark:border-gray-800 dark:bg-zinc-950 transition-colors duration-300">
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
                          const losingTeamNumbers = allTeamNumbers.filter((tn) => !winningTeamNumbers.includes(tn));
                          const losersRender = losingTeamNumbers
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

          {/* Navegación de Eventos */}
          <div className="mt-16 pt-10 border-t border-gray-200 dark:border-gray-800">
             {renderNavRow(nav.prevAll, event, nav.nextAll, "General Chronology")}
             {nav.showNavLabel && renderNavRow(nav.prevShow, event, nav.nextShow, nav.showNavLabel)}
             {nav.franchiseNavLabel && renderNavRow(nav.prevFranchise, event, nav.nextFranchise, nav.franchiseNavLabel)}
             {nav.pleNavLabel && renderNavRow(nav.prevPLE, event, nav.nextPLE, nav.pleNavLabel)}
          </div>

        </div>
      </div>
    </>
  );
}