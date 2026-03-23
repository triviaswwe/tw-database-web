// components/MatchCard.js
//
// Componente compartido para renderizar un match individual.
// Props:
//   match    — objeto del match serializado
//   currentId — wrestler_id o tag_team_id a resaltar en negrita
//   idType   — "wrestler" | "stable"
//   number   — número de orden del combate (opcional, ej: 1, 2, 3...)

import Link from "next/link";
import { formatDateDDMMYYYY, getPhrase, buildTopLine, buildTeamsMap, buildScoreMap } from "../lib/matchUtils";

export default function MatchCard({ match, currentId, idType = "wrestler", number }) {
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
      const isCurrent = idType === "wrestler" ? p.wrestler_id === currentId : false;
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
      {/* Número de combate + fecha + evento */}
      <p className="font-medium flex items-baseline gap-2">
        {number != null && (
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 min-w-[1.5rem]">
            #{number}
          </span>
        )}
        <span>
          {formatDateDDMMYYYY(match.event_date)} —{" "}
          <Link
            href={`/events/${match.event_id}`}
            className="text-blue-600 dark:text-sky-300 hover:underline"
          >
            {match.event || match.event_name}
          </Link>
        </span>
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
                const winningTeams        = rivalTeams.filter((tn) => teamsMap[tn].some((p) => p.result === "WIN"));
                const winnersParticipants = winningTeams.flatMap((tn) => teamsMap[tn]);
                const otherTeams          = rivalTeams.filter((tn) => !winningTeams.includes(tn));
                return (
                  <>
                    defeated by {renderTeam(winnersParticipants)}
                    {otherTeams.length > 0 && (
                      <>
                        {" "}(Other participants:{" "}
                        {otherTeams.map((tn) => renderTeam(teamsMap[tn])).reduce((prev, curr) => [prev, ", ", curr])}
                        )
                      </>
                    )}
                  </>
                );
              })()
            ) : (
              <>
                {getPhrase(match.result)}{" "}
                {rivalTeams.map((tn) => renderTeam(teamsMap[tn])).reduce((prev, curr) => [prev, ", ", curr])}
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
              ...rivalTeams.map((teamNumber) => (
                <span key={teamNumber}>
                  {renderTeam(teamsMap[teamNumber])} {scoreMap[teamNumber] ?? 0}
                </span>
              )),
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