import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function EventsPage() {
  const router = useRouter();
  const currentPage = parseInt(router.query.page) || 1;

  const { data, error } = useSWR(`/api/events?page=${currentPage}`, fetcher);

  if (error) return <div>Error loading events</div>;
  if (!data) return <div>Loading events...</div>;

  const { events, totalPages } = data;
  const totalPagesSafe = totalPages && totalPages > 0 ? totalPages : 1;

  const goToPage = (pageNum) => {
    router.push({
      pathname: '/events',
      query: { ...router.query, page: pageNum },
    });
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

      <p className="text-center my-2 text-gray-700">
        Page {currentPage} of {totalPagesSafe}
      </p>

      {/* Pagination */}
      <nav className="mt-6 flex justify-center space-x-2" aria-label="Pagination">
        <button
          aria-label="Previous page"
          disabled={currentPage === 1}
          onClick={() => goToPage(currentPage - 1)}
          className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
        >
          ← Previous
        </button>

        {[...Array(totalPagesSafe).keys()].map((num) => {
          const pageNum = num + 1;
          return (
            <button
              key={pageNum}
              aria-label={`Go to page ${pageNum}`}
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
          aria-label="Next page"
          disabled={currentPage === totalPagesSafe}
          onClick={() => goToPage(currentPage + 1)}
          className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
        >
          Next →
        </button>
      </nav>
    </div>
  );
}
