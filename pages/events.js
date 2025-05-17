import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function EventsPage() {
  const router = useRouter();
  const currentPage = parseInt(router.query.page) || 1;

  const { data, error } = useSWR(`/api/events?page=${currentPage}`, fetcher);

  if (error) return <div>Error cargando eventos</div>;
  if (!data) return <div>Cargando eventos...</div>;

  const { events, totalPages } = data;

  const goToPage = (pageNum) => {
    router.push(`/events?page=${pageNum}`);
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {events.map((event) => (
          <div key={event.id} className="p-4 border rounded shadow bg-white">
            <Link href={`/events/${event.id}`}>
              <h2 className="text-xl font-bold hover:underline cursor-pointer">
                {event.name}
              </h2>
            </Link>
            <p className="text-sm text-gray-600">
              {event.event_type} — {new Date(event.event_date).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {/* Paginación */}
      <nav className="mt-6 flex justify-center space-x-2">
        <button
          disabled={currentPage === 1}
          onClick={() => goToPage(currentPage - 1)}
          className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
        >
          ← Anterior
        </button>

        {[...Array(totalPages).keys()].map((num) => {
          const pageNum = num + 1;
          return (
            <button
              key={pageNum}
              onClick={() => goToPage(pageNum)}
              className={`px-3 py-1 rounded ${
                pageNum === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          disabled={currentPage === totalPages}
          onClick={() => goToPage(currentPage + 1)}
          className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
        >
          Siguiente →
        </button>
      </nav>
    </div>
  );
}
