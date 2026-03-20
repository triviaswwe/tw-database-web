// components/MatchCard.js
//
// Componente compartido para renderizar un match individual.
// Reemplaza el bloque duplicado en wrestlers/[id].js, interpreters/[id].js,
// stables/[id].js y events/[id].js.
//
// Props:
//   match        — objeto del match serializado
//   currentId    — wrestler_id o tag_team_id que se debe resaltar en negrita
//   idType       — "wrestler" | "stable" (para saber qué campo comparar)

import Link from "next/link";
import { formatDateDDMMYYYY, getPhrase, buildTopLine, buildTeamsMap, buildScoreMap } from "../lib/matchUtils";

export default function MatchCard({ match, currentId, idType = "wrestler" }) {
  const { teamsMap, allTeamNumbers, mainTeam, rivalTeams } = buildTeamsMap(
    match.participants,
    match.team_number,
  );
  const scoreMap       = buildScoreMap(match.scores);
  const mainTeamNumber = match.team_number.toString();
  const topLine        = buildTopLine(match);
  const isMultiMan     = allTeamNumbers.length > 4;
  const hasScore       = Object.keys(scoreMap).length > 0;

  const renderTeam = (team, highlightFirst = false) =>
    team.map((p, i) => {
      const isCurrent =
        idType === "wrestler"
          ? p.wrestler_id === currentId
          : false; // stables no resalta individualmente

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

  return (
    <li className="border p-3 rounded shadow bg-white dark:bg-zinc-950">
      {/* Fecha y evento */}
      <p className="font-medium">
        {formatDateDDMMYYYY(match.event_date)} —{" "}
        <Link
          href={`/events/${match.event_id}`}
          className="text-blue-600 dark:text-sky-300 hover:underline"
        >
          {match.event || match.event_name}
        </Link>
      </p>

      {/* Campeonato / estipulación */}
      {topLine && (
        <strong className="mt-1 italic text-gray-700 dark:text-gray-300">
          {topLine}
        </strong>
      )}

      {/* Participantes */}
      <p className="mt-2">
        {renderTeam(mainTeam, true)}{" "}
        {isMultiMan && !hasScore ? (
          <>
            {match.result === "LOSS" ? (
              (() => {
                const winningTeams = rivalTeams.filter((tn) =>
                  teamsMap[tn].some((p) => p.result === "WIN"),
                );
                const winnersParticipants = winningTeams.flatMap((tn) => teamsMap[tn]);
                const otherTeams = rivalTeams.filter((tn) => !winningTeams.includes(tn));
                return (
                  <>
                    defeated by {renderTeam(winnersParticipants)}
                    {otherTeams.length > 0 && (
                      <>
                        {" "}(Other participants:{" "}
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
            {scoreMap[mainTeamNumber] != null && scoreMap[rivalTeams[0]] != null ? (
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
                const team  = renderTeam(teamsMap[teamNumber]);
                const score = scoreMap[teamNumber] ?? 0;
                return <span key={teamNumber}>{team} {score}</span>;
              }),
            ].reduce((prev, curr) => [prev, " - ", curr])}
          </span>
        )}
      </p>

      {/* Resultado */}
      <p className="mt-2 font-semibold text-gray-700 dark:text-white">
        Result: <strong>{match.result}</strong>
      </p>
    </li>
  );
}