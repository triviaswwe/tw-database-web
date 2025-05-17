import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function WrestlersPage() {
  const router = useRouter();
  const currentPage = parseInt(router.query.page) || 1;

  const { data, error } = useSWR(`/api/wrestlers?page=${currentPage}`, fetcher);

  if (error) return <div>Error loading wrestlers</div>;
  if (!data) return <div>Charging...</div>;

  const { wrestlers, totalPages } = data;

  const goToPage = (pageNum) => {
    router.push(`/wrestlers?page=${pageNum}`);
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {wrestlers.map((w) => (
          <Link key={w.id} href={`/wrestlers/${w.id}`}>
            <div className="p-4 border rounded bg-white shadow hover:bg-gray-100 transition cursor-pointer">
              <h2 className="text-xl font-bold">{w.wrestler}</h2>
              <p className="text-sm text-gray-500">{w.country}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Paginación */}
      <nav className="mt-6 flex justify-center space-x-2">
        <button
          disabled={currentPage === 1}
          onClick={() => goToPage(currentPage - 1)}
          className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
        >
          ← Previous
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
          Next →
        </button>
      </nav>
    </div>
  );
}
