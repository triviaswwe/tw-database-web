import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function EventDetail() {
  const router = useRouter();
  const { id } = router.query;

  const { data: event, error: eventError } = useSWR(
    id ? `/api/events/${id}` : null,
    fetcher
  );

  const { data: matches, error: matchesError } = useSWR(
    id ? `/api/events/${id}/matches` : null,
    fetcher
  );

  if (eventError) return <div>Error loading event</div>;
  if (!event) return <div>Loading event...</div>;

  if (matchesError) return <div>Error loading matches</div>;
  if (!matches) return <div>Loading matches...</div>;

  const isNumberedList = (type) =>
    ['Royal Rumble', 'Elimination Chamber'].includes(type);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
      <p className="text-gray-600 mb-1">Type: {event.event_type}</p>
      <p className="text-gray-600 mb-4">
        Date: {new Date(event.event_date).toLocaleDateString()}
      </p>

      <h2 className="text-2xl font-semibold mb-4">Matches</h2>

      {(!matches || matches.length === 0) ? (
        <p>There are no matches registered for this event yet.</p>
      ) : (
        <ul className="space-y-6">
          {matches.map((match, idx) => {
            const isOpener = idx === 0;
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

                <ul
                  className={`pl-4 ${useNumberedList ? 'list-decimal' : 'list-disc'}`}
                >
                  {match.participants.map((p) => (
                    <li key={p.wrestler_id} className="mb-1">
                      <Link
                        href={`/wrestlers/${p.wrestler_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {p.wrestler}
                      </Link>{' '}
                      {/* Aquí interpreter solo si lo traes en la API */}
                      ({p.interpreter || 'Sin intérprete'}) —{' '}
                      {/* p.result y p.score no están en participantes, corregir si querés */}
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
