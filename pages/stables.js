// pages/stables.js

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Spinner from '../components/Spinner';

const STABLES_PER_PAGE = 33;
const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
];

export default function StablesPage() {
  const [allStables, setAllStables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    async function fetchStables() {
      setLoading(true);
      try {
        const res = await fetch('/api/stables');
        const data = await res.json();
        setAllStables(data);
      } catch (err) {
        console.error(err);
        setAllStables([]);
      } finally {
        setLoading(false);
      }
    }
    fetchStables();
  }, []);

  // filtered list
  const filtered = useMemo(() => {
    return allStables.filter((s) => {
      const matchesStatus = statusFilter ? s.status === statusFilter : true;
      const matchesName = s.name.toLowerCase().includes(nameFilter.toLowerCase());
      return matchesStatus && matchesName;
    });
  }, [allStables, statusFilter, nameFilter]);

  const totalPages = Math.ceil(filtered.length / STABLES_PER_PAGE) || 1;

  // paginated
  const displayed = useMemo(() => {
    const start = (page - 1) * STABLES_PER_PAGE;
    return filtered.slice(start, start + STABLES_PER_PAGE);
  }, [filtered, page]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, nameFilter]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Stables & Tag Teams</h1>

      {/* status buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusOptions.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-4 py-2 rounded font-semibold ${
              statusFilter === value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* name filter */}
      <input
        type="text"
        placeholder="Filter by stable name"
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
        className="mb-6 w-full md:w-1/2 dark:bg-zinc-950 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-600"
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {displayed.length === 0 ? (
            <p>No stables found.</p>
          ) : (
            displayed.map((s) => (
              <Link key={s.id} href={`/stables/${s.id}`}>                  
                <div className="flex items-center p-4 dark:bg-zinc-950 border rounded shadow hover:shadow-lg transform transition-transform duration-200 ease-in-out hover:scale-105 cursor-pointer">
                  {s.image_url && (
                    <div className="w-16 h-16 overflow-hidden relative flex-shrink-0">
                      <img
                        src={s.image_url}
                        alt={s.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'top' }}
                      />
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent dark:from-zinc-950" />
                    </div>
                  )}
                  <div className="ml-4 flex-1">
                    <h2 className="text-xl font-bold">{s.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-white">Status: {s.status}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* pagination */}
      <div className="flex justify-center mt-8 space-x-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => setPage(num)}
            className={`px-3 py-1 rounded ${
              page === num
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
