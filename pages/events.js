// pages/events.js

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import Spinner from "../components/Spinner";

const EVENTS_PER_PAGE = 33;

// Dominio base de Vercel Blob
const BLOB_BASE_URL = "https://ljejfdquofuxccca.public.blob.vercel-storage.com";

const mainTabOptions = [
  { label: "Classic view", value: "classic" },
  { label: "Calendar view", value: "calendar" },
];

const eventTypeOptions = [
  { label: "All", value: "" },
  { label: "Weekly", value: "weekly" },
  { label: "PLE", value: "ple" },
  { label: "TakeOver", value: "takeover" },
  { label: "Special", value: "special" },
];

const dateOptions = [
  { label: "All", value: "" },
  { label: "Past events", value: "past" },
  { label: "Upcoming events", value: "upcoming" },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  { full: "Monday", short: "Mon" },
  { full: "Tuesday", short: "Tue" },
  { full: "Wednesday", short: "Wed" },
  { full: "Thursday", short: "Thu" },
  { full: "Friday", short: "Fri" },
  { full: "Saturday", short: "Sat" },
  { full: "Sunday", short: "Sun" },
];

// Mapea show_id a archivo de imagen en Vercel Blob
const showImageMap = {
  1: `${BLOB_BASE_URL}/raw.png`,
  2: `${BLOB_BASE_URL}/sd.png`,
  3: `${BLOB_BASE_URL}/nxt.png`,
  4: `${BLOB_BASE_URL}/speed.png`,
  5: `${BLOB_BASE_URL}/wwelive.png`,
};

// Mapea ple_id a archivo de imagen en Vercel Blob
const pleImageMap = {
  4: `${BLOB_BASE_URL}/tlc.png`,
  6: `${BLOB_BASE_URL}/noc.png`,
  7: `${BLOB_BASE_URL}/mitb.png`,
  11: `${BLOB_BASE_URL}/bb.png`,
  12: `${BLOB_BASE_URL}/snme.png`,
  13: `${BLOB_BASE_URL}/payback.png`,
  14: `${BLOB_BASE_URL}/fastlane.png`,
  17: `${BLOB_BASE_URL}/bib.png`,
  18: `${BLOB_BASE_URL}/takeover.png`,
};

const getEventLogo = (ev) => {
  if (!ev) return null;
  if (ev.image_url) return ev.image_url;
  if (ev.ple_image_url) return ev.ple_image_url;
  if (ev.ple_id && pleImageMap[ev.ple_id]) return pleImageMap[ev.ple_id];
  if (ev.show_id && showImageMap[ev.show_id]) return showImageMap[ev.show_id];
  return null;
};

export function buildCalendarCells(year, month) {
  const firstDayUtc = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const startOffset = (firstDayUtc + 6) % 7; // Lunes = 0 ... Domingo = 6
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, idx) => {
    const day = idx - startOffset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
}

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState("classic");

  // Estado Classic view
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eventType, setEventType] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState(filter);
  const [loading, setLoading] = useState(false);

  // Estado Calendar view
  const [calEvents, setCalEvents] = useState([]);
  const [calYear, setCalYear] = useState(null);
  const [calMonth, setCalMonth] = useState(null);
  const [yearBounds, setYearBounds] = useState({
    min: 2020,
    max: new Date().getUTCFullYear(),
  });
  const [calLoading, setCalLoading] = useState(false);
  const [calInitialized, setCalInitialized] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce del nombre
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedFilter(filter.trim());
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [filter]);

  // Fetch de eventos con tipo + nombre + date (Classic view)
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", EVENTS_PER_PAGE);
        if (eventType) params.append("event_type", eventType);
        if (debouncedFilter) params.append("filter", debouncedFilter);
        if (dateFilter) params.append("date", dateFilter);

        const res = await fetch(`/api/events?${params.toString()}`);
        const data = await res.json();
        setEvents(data.events || []);
        setTotalPages(data.totalPages || 1);
      } catch (e) {
        console.error(e);
        setEvents([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [page, eventType, debouncedFilter, dateFilter]);

  async function fetchCalendarEvents(targetYear, targetMonth) {
    setCalLoading(true);
    try {
      const params = new URLSearchParams({ calendar: "1" });
      if (targetYear && targetMonth) {
        params.append("year", targetYear);
        params.append("month", targetMonth);
      }
      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      setCalEvents(data.events || []);
      if (data.year) setCalYear(data.year);
      if (data.month) setCalMonth(data.month);
      if (data.minYear && data.maxYear) {
        setYearBounds({ min: data.minYear, max: data.maxYear });
      }
    } catch (e) {
      console.error(e);
      setCalEvents([]);
    } finally {
      setCalLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "calendar" && !calInitialized) {
      setCalInitialized(true);
      fetchCalendarEvents();
    }
  }, [activeTab, calInitialized]);

  const handleMonthChange = (newYear, newMonth) => {
    setCalYear(newYear);
    setCalMonth(newMonth);
    setOpenDropdown(null);
    fetchCalendarEvents(newYear, newMonth);
  };

  const stepMonth = (delta) => {
    if (!calYear || !calMonth) return;
    let nextMonth = calMonth + delta;
    let nextYear = calYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    handleMonthChange(nextYear, nextMonth);
  };

  const yearsList = useMemo(() => {
    const min = Math.min(yearBounds.min, calYear || yearBounds.min);
    const max = Math.max(yearBounds.max, calYear || yearBounds.max);
    const list = [];
    for (let y = max; y >= min; y--) list.push(y);
    return list;
  }, [yearBounds, calYear]);

  const eventsByDay = useMemo(() => {
    const map = {};
    for (const ev of calEvents) {
      if (!ev.event_date) continue;
      const day = new Date(ev.event_date).getUTCDate();
      if (!map[day]) map[day] = [];
      map[day].push(ev);
    }
    return map;
  }, [calEvents]);

  const calendarCells = useMemo(() => {
    if (!calYear || !calMonth) return [];
    return buildCalendarCells(calYear, calMonth);
  }, [calYear, calMonth]);

  const todayInfo = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    });
  };

  const renderPageButtons = () => {
    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    const buttons = [];
    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          className={`px-3 py-1 rounded ${
            page === i
              ? "bg-blue-600 text-white shadow"
              : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"
          }`}
        >
          {i}
        </button>,
      );
    }
    return buttons;
  };

  const getDropdownButtonClass = (isOpen) =>
    `px-3.5 py-2 rounded font-semibold text-sm transition-colors flex items-center justify-between gap-2 select-none bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-800 ${
      isOpen ? "ring-2 ring-blue-500/50" : ""
    }`;

  return (
    <>
      <Head>
        <title>Events — Trivias WWE</title>
        <meta
          name="description"
          content="Historial de eventos del Campeonato de Trivias WWE. Filtrá por tipo, fecha y nombre."
        />
      </Head>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Events</h1>

        {/* Pestañas principales */}
        <div className="mb-6 flex gap-2 border-b border-gray-300 dark:border-gray-700">
          {mainTabOptions.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`px-4 py-2 font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === value
                  ? "border-blue-600 text-blue-600 dark:text-sky-300 dark:border-sky-300"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "classic" ? (
          <>
            {/* Fila filtros */}
            <div className="mb-4 flex flex-wrap gap-2">
              <p className="font-semibold py-2">Type:</p>
              {eventTypeOptions.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => {
                    setEventType(value);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded font-semibold ${
                    eventType === value
                      ? "bg-blue-600 text-white shadow"
                      : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <p className="font-semibold py-2">Date:</p>
              {dateOptions.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => {
                    setDateFilter(value);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded font-semibold ${
                    dateFilter === value
                      ? "bg-blue-600 text-white shadow"
                      : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Filtro por nombre */}
            <input
              type="text"
              placeholder="Filter by event name"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mb-6 w-full md:w-1/2 border dark:bg-zinc-950 border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />

            {/* Lista de eventos */}
            {loading ? (
              <Spinner />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {events.length === 0 ? (
                  <p>No events found.</p>
                ) : (
                  events.map((ev) => {
                    const logo = getEventLogo(ev);
                    return (
                      <Link
                        key={ev.id}
                        href={`/events/${ev.id}`}
                        className="flex items-center p-4 border rounded bg-white dark:bg-zinc-950 hover:shadow-lg transform transition-transform duration-200 ease-in-out hover:scale-105 cursor-pointer"
                      >
                        {logo && (
                          <div className="relative w-16 h-16 flex-shrink-0 mr-4">
                            <Image
                              src={logo}
                              alt="Event logo"
                              fill
                              sizes="64px"
                              className="object-contain"
                            />
                          </div>
                        )}

                        <div>
                          <h2 className="font-semibold text-lg mb-1">
                            {ev.name}
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-white mb-0.5">
                            {ev.event_type} — {formatDate(ev.event_date)}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}

            {/* Paginación */}
            <div className="mt-8 flex justify-center space-x-2 items-center">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className={`px-3 py-1 rounded transition-colors ${page === 1 ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}
              >
                &#171;
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1 rounded transition-colors ${page === 1 ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}
              >
                &lt;
              </button>
              {renderPageButtons()}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-3 py-1 rounded transition-colors ${page === totalPages ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}
              >
                &gt;
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className={`px-3 py-1 rounded transition-colors ${page === totalPages ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}
              >
                &#187;
              </button>
            </div>
          </>
        ) : (
          <div>
            {/* Cabecera de navegación Mes / Año con desplegables estilo MatchFilters */}
            <div
              ref={dropdownRef}
              className="mb-6 flex items-center justify-center gap-2"
            >
              <button
                type="button"
                onClick={() => stepMonth(-1)}
                aria-label="Previous month"
                className="px-3 py-2 rounded font-semibold text-sm bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors select-none"
              >
                &lt;
              </button>

              {calYear && calMonth && (
                <div className="flex items-center gap-2">
                  {/* Dropdown Mes */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === "month" ? null : "month",
                        )
                      }
                      className={`${getDropdownButtonClass(openDropdown === "month")} min-w-[135px]`}
                    >
                      <span className="truncate">
                        {MONTH_NAMES[calMonth - 1]}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 transition-transform duration-200 ${
                          openDropdown === "month" ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {openDropdown === "month" && (
                      <div className="absolute left-0 top-full mt-1.5 w-full min-w-[150px] max-h-64 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 p-1.5 text-xs space-y-0.5">
                        {MONTH_NAMES.map((name, idx) => {
                          const mVal = idx + 1;
                          const isSelected = calMonth === mVal;
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleMonthChange(calYear, mVal)}
                              className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                                isSelected
                                  ? "bg-blue-600 text-white font-semibold"
                                  : "text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Dropdown Año */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDropdown(openDropdown === "year" ? null : "year")
                      }
                      className={`${getDropdownButtonClass(openDropdown === "year")} min-w-[85px]`}
                    >
                      <span className="truncate">{calYear}</span>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 transition-transform duration-200 ${
                          openDropdown === "year" ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {openDropdown === "year" && (
                      <div className="absolute left-0 top-full mt-1.5 w-full min-w-[100px] max-h-64 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 p-1.5 text-xs space-y-0.5">
                        {yearsList.map((y) => {
                          const isSelected = calYear === y;
                          return (
                            <button
                              key={y}
                              type="button"
                              onClick={() => handleMonthChange(y, calMonth)}
                              className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                                isSelected
                                  ? "bg-blue-600 text-white font-semibold"
                                  : "text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              {y}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => stepMonth(1)}
                aria-label="Next month"
                className="px-3 py-2 rounded font-semibold text-sm bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors select-none"
              >
                &gt;
              </button>
            </div>

            {calLoading || !calYear || !calMonth ? (
              <Spinner />
            ) : (
              <div className="border border-gray-300 dark:border-gray-800 rounded overflow-hidden shadow-sm">
                {/* Encabezado de días de la semana (Lunes a Domingo) */}
                <div className="grid grid-cols-7 bg-gray-200 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800">
                  {WEEKDAYS.map((d) => (
                    <div
                      key={d.full}
                      className="py-2 px-1 text-center font-bold text-xs sm:text-sm text-gray-800 dark:text-white border-r last:border-r-0 border-gray-300 dark:border-gray-800"
                    >
                      <span className="hidden sm:inline">{d.full}</span>
                      <span className="sm:hidden">{d.short}</span>
                    </div>
                  ))}
                </div>

                {/* Grilla de celdas del mes */}
                <div className="grid grid-cols-7">
                  {calendarCells.map((day, idx) => {
                    const dayEvents = day ? eventsByDay[day] || [] : [];
                    const isToday =
                      day !== null &&
                      calYear === todayInfo.year &&
                      calMonth === todayInfo.month &&
                      day === todayInfo.day;

                    return (
                      <div
                        key={idx}
                        className={`min-h-[80px] sm:min-h-[110px] md:min-h-[125px] p-1 sm:p-2 border-b border-r border-gray-300 dark:border-gray-800 flex flex-col ${
                          (idx + 1) % 7 === 0 ? "border-r-0" : ""
                        } ${
                          day
                            ? isToday
                              ? "bg-yellow-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800"
                            : "bg-gray-100 dark:bg-zinc-900/60"
                        }`}
                      >
                        {day && (
                          <>
                            <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 leading-none mb-1">
                              {day}
                            </span>
                            <div className="flex-1 flex flex-col items-center justify-center gap-1">
                              {dayEvents.map((ev) => {
                                const logo = getEventLogo(ev);
                                return (
                                  <Link
                                    key={ev.id}
                                    href={`/events/${ev.id}`}
                                    title={ev.name}
                                    className="w-full flex items-center justify-center transform transition-transform duration-200 hover:scale-105"
                                  >
                                    {logo ? (
                                      <div className="relative w-full h-10 sm:h-14 md:h-16">
                                        <Image
                                          src={logo}
                                          alt={ev.name}
                                          fill
                                          sizes="(max-width: 640px) 14vw, 120px"
                                          className="object-contain"
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-[10px] sm:text-xs font-semibold text-center text-blue-600 dark:text-sky-300 leading-tight line-clamp-2">
                                        {ev.name}
                                      </span>
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
