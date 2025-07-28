// pages/stables/[id].js

import Link from "next/link";
import pool from "../../lib/db";
import FlagWithName from "../../components/FlagWithName";

// Helper para formatear fechas como "DD/MM/AAAA"
function formatDateDDMMYYYY(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function getServerSideProps({ params }) {
  const stableId = parseInt(params.id, 10);
  if (isNaN(stableId)) return { notFound: true };

  // 1) Datos básicos del stable
  const [[stableRow]] = await pool.query(
    `SELECT t.*, t.image_url
     FROM tag_teams t
     WHERE t.id = ?`,
    [stableId]
  );
  if (!stableRow) return { notFound: true };

  const stable = {
    id: stableRow.id,
    name: stableRow.name,
    founded: stableRow.founded_date
      ? stableRow.founded_date.toISOString()
      : null,
    image_url: stableRow.image_url || null,
  };

  // 2) Miembros actuales del stable
  const [memberRows] = await pool.query(
    `SELECT tm.wrestler_id,
            w.wrestler AS name,
            w.country
     FROM tag_team_members tm
     JOIN wrestlers w ON w.id = tm.wrestler_id
     WHERE tm.tag_team_id = ?`,
    [stableId]
  );
  const members = memberRows.map((r) => ({
    id: r.wrestler_id,
    name: r.name,
    country: r.country,
  }));

  // 3) Stats de matches del stable (sin duplicar por miembro)
  const [[statsRow]] = await pool.query(
    `SELECT
       COUNT(DISTINCT m.id) AS total,
       COUNT(DISTINCT CASE WHEN mp.result = 'WIN'  THEN m.id END) AS wins,
       COUNT(DISTINCT CASE WHEN mp.result = 'DRAW' THEN m.id END) AS draws,
       COUNT(DISTINCT CASE WHEN mp.result = 'LOSS' THEN m.id END) AS losses,
       MIN(e.event_date) AS firstMatch,
       MAX(e.event_date) AS lastMatch
     FROM match_participants mp
     JOIN matches  m ON mp.match_id = m.id
     JOIN events   e ON m.event_id    = e.id
     WHERE mp.tag_team_id = ?`,
    [stableId]
  );
  const stats = {
    total: statsRow?.total || 0,
    wins: statsRow?.wins || 0,
    draws: statsRow?.draws || 0,
    losses: statsRow?.losses || 0,
    firstMatch: statsRow?.firstMatch?.toISOString() || null,
    lastMatch: statsRow?.lastMatch?.toISOString() || null,
  };

  // 4) Detalle de matches del stable
  const [rawMatches] = await pool.query(
    `SELECT
       m.id,
       e.id              AS event_id,
       e.name            AS event_name,
       e.event_date,
       mp.team_number,
       mp.result,
       mt.id              AS match_type_id,
       mt.name            AS match_type_name,
       c.id               AS championship_id,
       c.title_name       AS championship_name,
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
     JOIN matches m         ON mp.match_id = m.id
     JOIN events e          ON m.event_id = e.id
     LEFT JOIN match_types mt ON m.match_type_id = mt.id
     LEFT JOIN championships c ON m.championship_id = c.id
     WHERE mp.tag_team_id = ?
     GROUP BY m.id, mp.team_number, mp.result, m.event_id, e.name, e.event_date,
              mt.id, mt.name, c.id, c.title_name
     ORDER BY e.event_date DESC, m.match_order DESC`,
    [stableId]
  );

  const matches = rawMatches.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    event_name: row.event_name,
    event_date: row.event_date.toISOString(),
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
    props: { stable, members, stats, matches },
  };
}

export default function StableDetail({ stable, members, stats, matches }) {
  const formatDate = (iso) => (iso ? formatDateDDMMYYYY(iso) : "—");

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Info y miembros */}
      <div className="md:flex md:items-stretch md:space-x-6">
        <div className="md:flex-1">
          <h1 className="text-3xl font-bold mb-2">{stable.name}</h1>
          <h2 className="text-2xl font-semibold mb-2">Members</h2>
          <ul className="flex flex-wrap mb-4">
            {members.map((m, idx) => (
              <li key={m.id}>
                <Link
                  href={`/wrestlers/${m.id}`}
                  className="text-blue-600 dark:text-sky-300 hover:underline"
                >
                  <FlagWithName code={m.country} name={m.name} />
                </Link>
                {idx < members.length - 1 && <span>, </span>}
              </li>
            ))}
          </ul>
          <h2 className="text-2xl font-semibold mb-2">Stats</h2>
          <ul className="mb-6 space-y-1">
            <li>Total matches: {stats.total}</li>
            <li>Wins: {stats.wins}</li>
            <li>Draws: {stats.draws}</li>
            <li>Losses: {stats.losses}</li>
            <li>First match: {formatDate(stats.firstMatch)}</li>
            <li>Last match: {formatDate(stats.lastMatch)}</li>
          </ul>
        </div>
        {stable.image_url && (
          <div className="md:w-1/2 md:flex-shrink-0 md:self-stretch">
            <div className="relative w-full h-full">
              <img
                src={stable.image_url}
                alt={stable.name}
                className="w-full h-full object-cover rounded"
              />
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent dark:from-zinc-950 rounded-b" />
            </div>
          </div>
        )}
      </div>

      {/* Detalle de matches */}
      <h2 className="text-2xl font-semibold mb-2">Matches</h2>
      <ul className="space-y-3">
        {matches.map((match) => {
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
              const nameNode = highlightFirst ? (
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
                  {i > 0 && " & "}
                  {nameNode}
                </span>
              );
            });

          // Equipos multi sin score: lógica defeated by + Other participants
          const isMultiManNoScore =
            rivalTeams.length + 1 > 2 && Object.keys(scoreMap).length === 0;

          return (
            <li
              key={match.id}
              className="border p-3 rounded shadow bg-white dark:bg-zinc-950"
            >
              <p className="font-medium">
                {formatDateDDMMYYYY(match.event_date)} —{" "}
                <Link
                  href={`/events/${match.event_id}`}
                  className="text-blue-600 dark:text-sky-300 hover:underline"
                >
                  {match.event_name}
                </Link>
              </p>

              {/* Campeonato / estipulación */}
              {(() => {
                let topLine = "";
                if (match.championship_name && match.match_type_id !== 1) {
                  topLine = `${match.championship_name} ${match.match_type_name} Match`;
                } else if (match.championship_name) {
                  topLine = match.championship_name;
                } else if (
                  !match.championship_name &&
                  match.match_type_id !== 1
                ) {
                  topLine = `${match.match_type_name} Match`;
                }
                return topLine ? (
                  <strong className="mt-1 italic text-gray-700 dark:text-gray-300">
                    {topLine}
                  </strong>
                ) : null;
              })()}

              <p className="mt-2">
                {renderTeam(mainTeam, true)}{" "}
                {isMultiManNoScore ? (
                  (() => {
                    const winningTeams = rivalTeams.filter((tn) =>
                      teamsMap[tn].some((p) => p.result === "WIN")
                    );
                    const winners = winningTeams.flatMap((tn) => teamsMap[tn]);
                    const otherTeams = rivalTeams.filter(
                      (tn) => !winningTeams.includes(tn)
                    );
                    return (
                      <>
                        defeated by {renderTeam(winners)}
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
                ) : rivalTeams.length === 1 ? (
                  scoreMap[mainTeamNumber] != null &&
                  scoreMap[rivalTeams[0]] != null ? (
                    <>
                      {scoreMap[mainTeamNumber]}–{scoreMap[rivalTeams[0]]}{" "}
                      {renderTeam(teamsMap[rivalTeams[0]])}
                    </>
                  ) : (
                    <>
                      {renderTeam(mainTeam)}{" "}
                      {renderTeam(teamsMap[rivalTeams[0]])}
                    </>
                  )
                ) : (
                  <span>
                    {[
                      <span key="mainScore">
                        {scoreMap[mainTeamNumber] ?? 0}
                      </span>,
                      ...rivalTeams.map((tn) => (
                        <span key={tn}>
                          {renderTeam(teamsMap[tn])} {scoreMap[tn] ?? 0}
                        </span>
                      )),
                    ].reduce((prev, curr) => [prev, " - ", curr])}
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
