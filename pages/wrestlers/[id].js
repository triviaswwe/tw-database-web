import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function WrestlerDetail() {
  const router = useRouter();
  const { id } = router.query;

  const { data: wrestler, error: wrestlerError } = useSWR(
    id ? `/api/wrestlers/${id}` : null,
    fetcher
  );

  const { data: matches, error: matchesError } = useSWR(
    id ? `/api/wrestlers/${id}/matches` : null,
    fetcher
  );

  if (wrestlerError) return <div>Error loading wrestler</div>;
  if (!wrestler) return <div>Loading wrestler...</div>;

  if (matchesError) return <div>Error loading matches</div>;
  if (!matches) return <div>Loading matches...</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{wrestler.wrestler}</h1>
      <p className="text-gray-600 mb-1">Country: {wrestler.country || 'Desconocido'}</p>
      <p className="text-gray-600 mb-1">
        Debut: {wrestler.debut_date ? new Date(wrestler.debut_date).toLocaleDateString() : 'N/A'}
      </p>
      <p className="text-gray-600 mb-4">
        Interpreters: {wrestler.interpreters?.join(', ') || 'Ninguno'}
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">Stats</h2>
      <ul className="mb-4 text-gray-700 space-y-1">
        <li>Total matches: {matches.stats.total}</li>
        <li>Wins: {matches.stats.wins}</li>
        <li>Draws: {matches.stats.draws}</li>
        <li>Losses: {matches.stats.losses}</li>
        <li>
          First match:{' '}
          {matches.stats.firstMatch
            ? new Date(matches.stats.firstMatch).toLocaleDateString()
            : '—'}
        </li>
        <li>
          Last match:{' '}
          {matches.stats.lastMatch
            ? new Date(matches.stats.lastMatch).toLocaleDateString()
            : '—'}
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-2">Matches</h2>
      <ul className="space-y-3">
        {matches.matches.map((match) => {
          // separar participantes por equipo
          const teamSelf = match.participants.filter(
            (p) => p.team_number === match.team_number
          );
          const teamOpp = match.participants.filter(
            (p) => p.team_number !== match.team_number
          );

          // renderizar un equipo
          const renderTeam = (team, isSelf) =>
            team.map((p, i) => {
              const isCurrent = p.wrestler_id === parseInt(id, 10);
              const nameNode = isCurrent || isSelf ? (
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

          // obtener scores
          const scoreSelf =
            match.scores.find((s) => s.team_number === match.team_number)
              ?.score ?? 0;
          const otherTeamNumber = match.scores.find(
            (s) => s.team_number !== match.team_number
          )?.team_number;
          const scoreOpp =
            match.scores.find((s) => s.team_number === otherTeamNumber)
              ?.score ?? 0;

          return (
            <li key={match.id} className="border p-3 rounded shadow bg-white">
              <p className="font-medium">
                {new Date(match.event_date).toLocaleDateString()} —{' '}
                <Link
                  href={`/events/${match.event_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {match.event}
                </Link>
              </p>

              <p className="mt-1">
                {renderTeam(teamSelf, true)} {scoreSelf}–{scoreOpp}{' '}
                {renderTeam(teamOpp, false)}
              </p>

              <p className="mt-1 text-gray-700">
                Result: <strong>{match.result}</strong>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
