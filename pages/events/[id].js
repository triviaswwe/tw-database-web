// pages/events/[id].js

import { useRouter } from "next/router";
import useSWR from "swr";
import Link from "next/link";

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
  if (!event) return <div>Loading event...</div>;

  if (matchesError) return <div>Error loading matches</div>;
  if (!matchesData) return <div>Loading matches...</div>;

  // 3) Asegurarnos de que 'matches' sea un array
  const matches = Array.isArray(matchesData)
    ? matchesData
    : matchesData.matches || [];

  const isNumberedList = (type) =>
    type === "Royal Rumble" || type === "Elimination Chamber";

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
        {/* Header */}
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

        {matches.length === 0 ? (
          <p>No matches registered for this event yet.</p>
        ) : (
          <ul className="space-y-6">
            {matches.map((match, idx) => {
              const isOpener = idx === 0;
              const isMainEvent = idx === matches.length - 1;
              const listStyle = isNumberedList(match.match_type)
                ? "list-decimal"
                : "list-disc";

              return (
                <li
                  key={match.id}
                  className="
                    border border-gray-200 bg-white p-4 rounded shadow
                    dark:border-gray-700 dark:bg-zinc-950
                    transition-colors duration-300
                  "
                >
                  <p className="font-semibold text-lg mb-2">
                    {isOpener
                      ? "Opener:"
                      : isMainEvent
                      ? "Main Event:"
                      : `${match.match_order}.`}{" "}
                    {match.match_type}
                  </p>

                  <ul className={`pl-4 ${listStyle} space-y-1`}>
                    {match.participants.map((p) => (
                      <li key={p.wrestler_id}>
                        <Link
                          href={`/wrestlers/${p.wrestler_id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {p.wrestler}
                        </Link>{" "}
                        ({p.interpreter || "No interpreter"}) —{" "}
                        <strong>
                          {p.result}
                          {p.score != null ? ` (${p.score})` : ""}
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
    </div>
  );
}
