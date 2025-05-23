// pages/events/[id].js

import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function EventDetail() {
  const router = useRouter();
  const { id } = router.query;

  // 1) Datos del evento
  const { data: event, error: eventError } = useSWR(
    id ? `/api/events/${id}` : null,
    fetcher
  );

  // 2) Datos de los matches
  const { data: matchesData, error: matchesError } = useSWR(
    id ? `/api/events/${id}/matches` : null,
    fetcher
  );

  if (eventError) return <div>Error loading event</div>;
  if (!event)   return <div>Loading event...</div>;

  if (matchesError) return <div>Error loading matches</div>;
  if (!matchesData) return <div>Loading matches...</div>;

  // 3) Asegurarnos de que 'matches' sea un array
  const matches = Array.isArray(matchesData)
    ? matchesData
    : matchesData.matches || [];

  const isNumberedList = (type) =>
    type === 'Royal Rumble' || type === 'Elimination Chamber';

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
      <p className="text-gray-600 mb-1">Type: {event.event_type}</p>
      <p className="text-gray-600 mb-4">
        Date: {new Date(event.event_date).toLocaleDateString()}
      </p>

      <h2 className="text-2xl font-semibold mb-4">Matches</h2>

      {matches.length === 0 ? (
        <p>There are no matches registered for this event yet.</p>
      ) : (
        <ul className="space-y-6">
          {matches.map((match, idx) => {
            const isOpener    = idx === 0;
            const isMainEvent = idx === matches.length - 1;
            const useNumberedList = isNumberedList(match.match_type);

            return (
              <li key={match.id} className="border p-4 rounded shadow bg-white">
                <p className="font-semibold text-lg mb-2">
                  {isOpener
                    ? 'Opener:'
                    : isMainEvent
                      ? 'Main Event:'
                      : `${match.match_order}.`}{' '}
                  {match.match_type}
                </p>

                <ul className={`pl-4 ${useNumberedList ? 'list-decimal' : 'list-disc'}`}>
                  {match.participants.map((p) => (
                    <li key={p.wrestler_id} className="mb-1">
                      <Link
                        href={`/wrestlers/${p.wrestler_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {p.wrestler}
                      </Link>{' '}
                      ({p.interpreter || 'No interpreter'}) —{' '}
                      <strong>
                        {p.result}{p.score != null ? ` (${p.score})` : ''}
                      </strong>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
