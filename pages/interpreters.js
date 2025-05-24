// pages/interpreters.js

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Spinner from '../components/Spinner';

const INTERPRETERS_PER_PAGE = 33;

// Opciones de filtro de status
const statusOptions = [
  { label: 'All',      value: '' },
  { label: 'Active',   value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export default function InterpretersPage() {
  const [interpreters, setInterpreters] = useState([]);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(false);

  // nuevo estado para status
  const [statusFilter, setStatusFilter] = useState('');
  const [nameFilter, setNameFilter]     = useState('');

  useEffect(() => {
    async function fetchInterpreters() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', INTERPRETERS_PER_PAGE);
        if (statusFilter) params.append('status', statusFilter);
        if (nameFilter.trim()) params.append('filter', nameFilter.trim());

        const res  = await fetch(`/api/interpreters?${params.toString()}`);
        const data = await res.json();

        setInterpreters(data.interpreters || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error(err);
        setInterpreters([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }

    fetchInterpreters();
  }, [page, statusFilter, nameFilter]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Interpreters</h1>

      {/* filtro por status */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusOptions.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`px-4 py-2 rounded font-semibold ${
              statusFilter === value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* filtro por nombre */}
      <input
        type="text"
        placeholder="Filter by interpreter name"
        value={nameFilter}
        onChange={(e) => { setNameFilter(e.target.value); setPage(1); }}
        className="mb-6 w-full md:w-1/2 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-600"
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {interpreters.length === 0 ? (
            <p>No interpreters found.</p>
          ) : (
            interpreters.map((i) => (
              <Link key={i.id} href={`/interpreters/${i.id}`}>
                <div className="p-4 border rounded shadow hover:shadow-lg transition cursor-pointer">
                  <h2 className="text-xl font-bold">{i.interpreter}</h2>
                  <p className="text-sm text-gray-600">
                    Nationality: {i.nationality || '—'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Status: {i.status || 'Unknown'}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* paginación */}
      <div className="flex justify-center mt-8 space-x-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => setPage(num)}
            className={`px-3 py-1 rounded ${
              page === num
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}
