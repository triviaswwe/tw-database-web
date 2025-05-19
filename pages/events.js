import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function EventsPage() {
  const limit = 99;
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState([]);

  // Fetch la página actual
  const { data, error } = useSWR(`/api/events?page=${page}&limit=${limit}`, fetcher, {
    revalidateOnFocus: false,
  });

  // Cuando data cambia, concatenamos resultados
  if (data && data.events) {
    // Solo concatenar si no están ya agregados (evitar duplicados)
    if (events.length < page * limit) {
      setEvents((prev) => [...prev, ...data.events]);
    }
  }

  if (error) return <div>Error loading events.</div>;
  if (!data && events.length === 0) return <div>Loading events...</div>;

  const loadMore = () => {
    if (page < data.totalPages) setPage(page + 1);
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {events.map((event) => (
          <div key={event.id} className="p-4 border rounded shadow bg-white">
            <Link href={`/events/${event.id}`}>
              <h2 className="text-xl font-bold hover:underline cursor-pointer">{event.name}</h2>
            </Link>
            <p className="text-sm text-gray-600">
              {event.event_type} — {new Date(event.event_date).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {page < data?.totalPages && (
        <button
          onClick={loadMore}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Load More
        </button>
      )}
    </div>
  );
}
