// pages/wrestlers/[id].js

import Link from 'next/link';
import pool from '../../lib/db';

export async function getServerSideProps({ params }) {
  const wrestlerId = parseInt(params.id, 10);
  if (isNaN(wrestlerId)) return { notFound: true };

  const [[wrestlerRow]] = await pool.query(
    `SELECT w.*, GROUP_CONCAT(i.interpreter SEPARATOR ', ') AS interpreters
     FROM wrestlers w
     LEFT JOIN wrestler_interpreter wi ON w.id = wi.wrestler_id
     LEFT JOIN interpreters i ON wi.interpreter_id = i.id
     WHERE w.id = ? GROUP BY w.id`,
    [wrestlerId]
  );
  if (!wrestlerRow) return { notFound: true };

  const wrestler = {
    ...wrestlerRow,
    debut_date: wrestlerRow.debut_date ? wrestlerRow.debut_date.toISOString() : null,
    interpreters: wrestlerRow.interpreters ? wrestlerRow.interpreters.split(', ') : [],
  };

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
     JOIN events e ON m.event_id = e.id
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

  const [rawMatches] = await pool.query(
    `SELECT
       m.id, m.event_id, e.name AS event,
       e.event_date, m.match_order,
       mp.team_number, mp.result AS result,
       (
         SELECT JSON_ARRAYAGG(JSON_OBJECT(
           'wrestler_id', mp2.wrestler_id,
           'wrestler', w2.wrestler,
           'team_number', mp2.team_number,
           'result', mp2.result
         ))
         FROM match_participants mp2
         JOIN wrestlers w2 ON mp2.wrestler_id = w2.id
         WHERE mp2.match_id = m.id
       ) AS participants,
       (
         SELECT JSON_ARRAYAGG(JSON_OBJECT(
           'team_number', mts.team_number,
           'score', mts.score
         ))
         FROM match_team_scores mts
         WHERE mts.match_id = m.id
       ) AS scores
     FROM match_participants mp
     JOIN matches m ON mp.match_id = m.id
     JOIN events e ON m.event_id = e.id
     WHERE mp.wrestler_id = ?
     GROUP BY m.id, mp.team_number, mp.result, m.match_order, m.event_id, e.name, e.event_date
     ORDER BY e.event_date DESC, m.match_order DESC`,
    [wrestlerId]
  );

  const matches = rawMatches.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    event: row.event,
    event_date: row.event_date.toISOString(),
    match_order: row.match_order,
    team_number: row.team_number,
    result: row.result,
    participants: row.participants || [],
    scores: row.scores || [],
  }));

  return {
    props: {
      wrestler,
      matches: {
        stats,
        matches,
      },
    },
  };
}

export default function WrestlerDetail({ wrestler, matches }) {
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{wrestler.wrestler}</h1>
      <p className="text-gray-600 mb-1">Country: {wrestler.country || 'Unknown'}</p>
      <p className="text-gray-600 mb-1">
        Debut: {wrestler.debut_date ? new Date(wrestler.debut_date).toLocaleDateString() : 'N/A'}
      </p>
      <p className="text-gray-600 mb-4">
        Interpreters:{' '}
        {wrestler.interpreters.length > 0 ? wrestler.interpreters.join(', ') : 'No one'}
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">Stats</h2>
      <ul className="mb-4 text-gray-700 space-y-1">
        <li>Total matches: {matches.stats.total}</li>
        <li>Wins: {matches.stats.wins}</li>
        <li>Draws: {matches.stats.draws}</li>
        <li>Losses: {matches.stats.losses}</li>
        <li>
          First match:{' '}
          {matches.stats.firstMatch ? new Date(matches.stats.firstMatch).toLocaleDateString() : '—'}
        </li>
        <li>
          Last match:{' '}
          {matches.stats.lastMatch ? new Date(matches.stats.lastMatch).toLocaleDateString() : '—'}
        </li>
      </ul>

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
          const rivalTeams = allTeamNumbers.filter((tn) => tn !== mainTeamNumber);
          const allRivals = rivalTeams.flatMap((tn) => teamsMap[tn]);

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
                    className="text-blue-600 hover:underline"
                  >
                    {p.wrestler}
                  </Link>
                );
              return (
                <span key={p.wrestler_id}>
                  {i > 0 && ' & '}
                  {nameNode}
                </span>
              );
            });

          const getPhrase = (result) => {
            if (result === 'WIN') return 'defeats';
            if (result === 'LOSS') return 'defeated by';
            if (result === 'DRAW') return 'draw with';
            return '';
          };

          const isMultiMan = allTeamNumbers.length > 4;
          const hasScore = Object.keys(scoreMap).length > 0;

          return (
            <li key={match.id} className="border p-3 rounded shadow bg-white">
              <p className="font-medium">
                {new Date(match.event_date).toLocaleDateString()} —{' '}
                <Link href={`/events/${match.event_id}`} className="text-blue-600 hover:underline">
                  {match.event}
                </Link>
              </p>

              <p className="mt-1">
                {renderTeam(mainTeam, true)}{' '}
                {isMultiMan && !hasScore ? (
                  <>
                    {match.result === 'LOSS' ? (() => {
                      // 1. Encontrar los equipos ganadores (puede ser más de uno en multi-tag)
                      const winningTeams = rivalTeams.filter((tn) => {
                        // Al menos un integrante con resultado 'WIN' en ese equipo
                        return teamsMap[tn].some((p) => p.result === 'WIN');
                      });

                      // 2. Obtener todos los participantes de los equipos ganadores concatenados
                      const winnersParticipants = winningTeams.flatMap((tn) => teamsMap[tn]);

                      // 3. Otros equipos rivales que no ganaron
                      const otherTeams = rivalTeams.filter((tn) => !winningTeams.includes(tn));

                      return (
                        <>
                          defeated by {renderTeam(winnersParticipants)}

                          {otherTeams.length > 0 && (
                            <>
                              {' '}
                              (Other participants:{' '}
                              {otherTeams
                                .map((tn) => renderTeam(teamsMap[tn]))
                                .reduce((prev, curr) => [prev, ', ', curr])}
                              )
                            </>
                          )}
                        </>
                      );
                    })() : (
                      <>
                        {getPhrase(match.result)}{' '}
                        {rivalTeams
                          .map((tn) => renderTeam(teamsMap[tn]))
                          .reduce((prev, curr) => [prev, ', ', curr])}

                      </>
                    )}
                  </>
                ) : rivalTeams.length === 1 ? (
                  <>
                    {scoreMap[mainTeamNumber] != null && scoreMap[rivalTeams[0]] != null ? (
                      <>
                        {scoreMap[mainTeamNumber]}–{scoreMap[rivalTeams[0]]}{' '}
                        {renderTeam(teamsMap[rivalTeams[0]])}
                      </>
                    ) : (
                      <>
                        {getPhrase(match.result)} {renderTeam(teamsMap[rivalTeams[0]])}
                      </>
                    )}
                  </>
                ) : (
                  <span>
                    {[<span key="main">{scoreMap[mainTeamNumber] ?? 0}</span>,
                    ...rivalTeams.map((teamNumber) => {
                      const team = renderTeam(teamsMap[teamNumber]);
                      const score = scoreMap[teamNumber] ?? 0;
                      return <span key={teamNumber}>{team} {score}</span>;
                    })
                    ].reduce((prev, curr) => [prev, ' - ', curr])}
                  </span>
                )}
              </p>
              <p className="mt-2 font-semibold text-gray-700">
                Result: <strong>{match.result}</strong>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
