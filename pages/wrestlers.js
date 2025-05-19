import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function WrestlersPage() {
  const limit = 33;
  const [page, setPage] = useState(1);
  const [wrestlers, setWrestlers] = useState([]);

  const { data, error } = useSWR(`/api/wrestlers?page=${page}&limit=${limit}`, fetcher, {
    revalidateOnFocus: false,
  });

  if (data && data.wrestlers) {
    if (wrestlers.length < page * limit) {
      setWrestlers((prev) => [...prev, ...data.wrestlers]);
    }
  }

  if (error) return <div>Error loading wrestlers.</div>;
  if (!data && wrestlers.length === 0) return <div>Loading wrestlers...</div>;

  const loadMore = () => {
    if (page < data.totalPages) setPage(page + 1);
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {wrestlers.map((wrestler) => (
          <div key={wrestler.id} className="p-4 border rounded shadow bg-white">
            <Link href={`/wrestlers/${wrestler.id}`}>
              <h2 className="text-xl font-bold hover:underline cursor-pointer">{wrestler.wrestler}</h2>
            </Link>
            {/* Otros datos si quieres */}
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
