// pages/wrestlers.js

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Spinner from '../components/Spinner';

const WRESTLERS_PER_PAGE = 33;

const wrestlerTypeOptions = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export default function WrestlersPage() {
  const [wrestlers, setWrestlers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // filtros
  const [statusFilter, setStatusFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    async function fetchWrestlers() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', WRESTLERS_PER_PAGE);
        if (statusFilter) params.append('status', statusFilter);
        if (nameFilter) params.append('filter', nameFilter);

        const res = await fetch(`/api/wrestlers?${params.toString()}`);
        const data = await res.json();

        setWrestlers(data.wrestlers || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error(err);
        setWrestlers([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }

    fetchWrestlers();
  }, [page, statusFilter, nameFilter]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Wrestlers</h1>

      {/* filtro por status */}
      <div className="mb-4 flex flex-wrap gap-2">
        {wrestlerTypeOptions.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`px-4 py-2 rounded font-semibold ${statusFilter === value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800  dark:bg-gray-900 dark:text-white hover:bg-gray-300'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* filtro por nombre */}
      <input
        type="text"
        placeholder="Filter by wrestler name"
        value={nameFilter}
        onChange={(e) => { setNameFilter(e.target.value); setPage(1); }}
        className="mb-6 w-full md:w-1/2  dark:bg-zinc-950 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-600"
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {wrestlers.length === 0 ? (
            <p>No wrestlers found.</p>
          ) : (
            wrestlers.map((w) => (
              <Link key={w.id} href={`/wrestlers/${w.id}`}>
                <div className="p-4 dark:bg-zinc-950 border rounded shadow hover:shadow-lg transition cursor-pointer">
                  <h2 className="text-xl font-bold">{w.wrestler}</h2>
                  <p className="text-sm text-gray-600 dark:text-white">Status: {w.status}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Paginación */}
      <div className="flex justify-center mt-8 space-x-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => setPage(num)}
            className={`px-3 py-1 rounded ${page === num
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-900 dark:text-white hover:bg-gray-300'
              }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}
