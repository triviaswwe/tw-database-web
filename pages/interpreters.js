// pages/interpreters.js

import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Spinner from '../components/Spinner';
import FlagWithName from '../components/FlagWithName';

const INTERPRETERS_PER_PAGE = 33;

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
  const [statusFilter, setStatusFilter] = useState('');
  const [nameFilter, setNameFilter]     = useState('');

  useEffect(() => {
    async function fetchInterpreters() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', INTERPRETERS_PER_PAGE);
        if (statusFilter)      params.append('status', statusFilter);
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

  const renderPageButtons = () => {
    let start = Math.max(1, page - 1);
    let end   = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    const buttons = [];
    for (let i = start; i <= end; i++) {
      buttons.push(
        <button key={i} onClick={() => setPage(i)}
          className={`px-3 py-1 rounded ${page === i ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300'}`}>
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <>
      <Head>
        <title>Interpreters — Trivias WWE</title>
        <meta name="description" content="Listado de intérpretes del Campeonato de Trivias WWE. Filtrá por status y nombre." />
      </Head>

      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Interpreters</h1>

        <div className="mb-4 flex flex-wrap gap-2">
          {statusOptions.map(({ label, value }) => (
            <button key={value} onClick={() => { setStatusFilter(value); setPage(1); }}
              className={`px-4 py-2 rounded font-semibold ${statusFilter === value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>

        <input type="text" placeholder="Filter by interpreter name" value={nameFilter}
          onChange={(e) => { setNameFilter(e.target.value); setPage(1); }}
          className="mb-6 w-full md:w-1/2 dark:bg-zinc-950 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-600" />

        {loading ? <Spinner /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {interpreters.length === 0 ? <p>No interpreters found.</p> : interpreters.map((i) => (
              <Link key={i.id} href={`/interpreters/${i.id}`}>
                <div className="p-4 dark:bg-zinc-950 border rounded shadow hover:shadow-lg transform transition-transform duration-200 ease-in-out hover:scale-105 cursor-pointer">
                  <div className="flex items-center">
                    <FlagWithName code={i.nationality} />
                    <h2 className="text-xl font-bold">{i.interpreter}</h2>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-white">Status: {i.status || 'Unknown'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center space-x-2 items-center">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className={`px-3 py-1 rounded transition-colors ${page === 1 ? 'bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed' : 'bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700'}`}>
            &lt;
          </button>
          {renderPageButtons()}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className={`px-3 py-1 rounded transition-colors ${page === totalPages ? 'bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed' : 'bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700'}`}>
            &gt;
          </button>
        </div>
      </div>
    </>
  );
}