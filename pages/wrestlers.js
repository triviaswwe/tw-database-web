import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function WrestlersPage() {
  const limit = 33;
  const [page, setPage] = useState(1);

  const { data, error, isLoading } = useSWR(`/api/wrestlers?page=${page}&limit=${limit}`, fetcher);

  if (error) return <div>Error loading wrestlers.</div>;
  if (isLoading) return <div>Loading wrestlers...</div>;

  const totalPages = data?.totalPages || 1;
  const wrestlers = data?.wrestlers || [];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Wrestlers</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
