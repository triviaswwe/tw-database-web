import { useState, useEffect } from 'react';
import Link from 'next/link';

const WRESTLERS_PER_PAGE = 33;

export default function WrestlersPage() {
  const [wrestlers, setWrestlers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchWrestlers() {
      try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', WRESTLERS_PER_PAGE);

        const res = await fetch(`/api/wrestlers?${params.toString()}`);
        const data = await res.json();

        setWrestlers(data.wrestlers || []);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error('Error fetching wrestlers:', error);
        setWrestlers([]);
        setTotalPages(1);
      }
    }
    fetchWrestlers();
  }, [page]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Wrestlers</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {wrestlers.length === 0 && <p>No wrestlers found.</p>}
        {wrestlers.map((wrestler) => (
          <Link key={wrestler.id} href={`/wrestlers/${wrestler.id}`}>
            <div className="p-4 border rounded shadow bg-white hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <h2 className="text-xl font-bold">{wrestler.wrestler}</h2>
            </div>
          </Link>
        ))}
      </div>

      {/* Paginación */}
      <div className="flex justify-center mt-8 space-x-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => setPage(pageNum)}
            className={`px-3 py-1 rounded ${
              page === pageNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {pageNum}
          </button>
        ))}
      </div>
    </div>
  );
}
