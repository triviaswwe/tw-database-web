import { useState, useEffect } from 'react';
import Link from 'next/link';

const EVENTS_PER_PAGE = 33;

const eventTypeOptions = [
  { label: 'All', value: '' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'PLE', value: 'ple' },
  { label: 'TakeOver', value: 'takeover' },
  { label: 'Special', value: 'special' },
];

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eventType, setEventType] = useState('');
  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState(filter);

  // Debounce del filtro (500ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilter(filter);
      setPage(1); // Reinicia paginación al escribir
    }, 500);
    return () => clearTimeout(timeout);
  }, [filter]);

  // Fetch de eventos
  useEffect(() => {
    async function fetchEvents() {
      try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', EVENTS_PER_PAGE);
        if (eventType) params.append('event_type', eventType);
        if (debouncedFilter.trim()) params.append('filter', debouncedFilter.trim());

        const res = await fetch(`/api/events?${params.toString()}`);
        const data = await res.json();
        setEvents(data.events || []);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
        setTotalPages(1);
      }
    }

    fetchEvents();
  }, [page, eventType, debouncedFilter]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Función para renderizar botones de página, máximo 3 visibles
  const renderPageButtons = () => {
    const buttons = [];
    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + 2);

    // Ajustar start si quedan menos de 3 páginas al final
    if (end - start < 2) {
      start = Math.max(1, end - 2);
    }

    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          className={`px-3 py-1 rounded ${
            page === i
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          {i}
        </button>
      );
    }

    return buttons;
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Botones filtro por tipo */}
      <div className="mb-4 flex flex-wrap gap-2">
        {eventTypeOptions.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              setEventType(value);
              setPage(1);
            }}
            className={`px-4 py-2 rounded font-semibold ${
              eventType === value
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input filtro por nombre */}
      <input
        type="text"
        placeholder="Filter by event name"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-6 w-full md:w-1/2 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      {/* Lista eventos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {events.length === 0 && <p>No events found.</p>}
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="block p-4 border rounded shadow bg-white hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h2 className="font-semibold text-lg mb-1">{event.name}</h2>
            <p className="text-sm text-gray-600 mb-0.5">
              {event.event_type} — {formatDate(event.event_date)}
            </p>
          </Link>
        ))}
      </div>

      {/* Paginación */}
      <div className="mt-8 flex justify-center space-x-2 items-center">
        {/* Botón Anterior */}
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className={`px-3 py-1 rounded ${
            page === 1
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          &lt;
        </button>

        {/* Botones numéricos (máximo 3) */}
        {renderPageButtons()}

        {/* Botón Siguiente */}
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className={`px-3 py-1 rounded ${
            page === totalPages
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
