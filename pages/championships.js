// pages/championships.js

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import FlagWithName from "../components/FlagWithName";

const fetcher = (url) => fetch(url).then((r) => r.json());

const CHAMPIONS = [
  { id: 1, title: "Undisputed WWE Championship" },
  { id: 2, title: "World Heavyweight Championship" },
  { id: 3, title: "Intercontinental Championship" },
  { id: 4, title: "United States Championship" },
  { id: 5, title: "WWE World Tag Team Championship" },
  { id: 6, title: "NXT Championship" },
  { id: 7, title: "Speed Championship" },
];

export default function ChampionshipsPage() {
  const [sel, setSel] = useState(null);

  const { data: champ } = useSWR(
    sel ? `/api/championships/${sel}` : null,
    fetcher
  );
  const { data: reigns } = useSWR(
    sel ? `/api/championships/${sel}/reigns` : null,
    fetcher
  );

  // Estado para ordenamiento
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" o "desc"

  // Cálculo de días sostenidos
  const calculateDaysHeld = (wonDateStr, lostDateStr) => {
    if (!wonDateStr) return "—";
    const start = new Date(wonDateStr);
    const end = lostDateStr ? new Date(lostDateStr) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return lostDateStr ? diffDays : `${diffDays}+`;
  };

  // Formato de fechas en inglés
  const formatEnglishDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Función para convertir número de reinado a palabra ordinal en inglés
  const getOrdinalWord = (num) => {
    const ordinals = {
      1: "first",
      2: "second",
      3: "third",
      4: "fourth",
      5: "fifth",
      6: "sixth",
      7: "seventh",
      8: "eighth",
      9: "ninth",
      10: "tenth",
    };
    return ordinals[num] || `${num}th`;
  };

  // Ordenamiento de notas (sin traducción para simplificar)
  const translateNotesToEnglish = (note) => {
    if (!note) return "—";
    return note;
  };

  // Columnas definidas: label, si es ordenable y ancho para Notes
  const columns = [
    { label: "#", sortable: true },
    { label: "Wrestler", sortable: true },
    { label: "Interpreter", sortable: true },
    { label: "Won Date", sortable: true },
    { label: "Event", sortable: true },
    { label: "Reign #", sortable: true },
    { label: "Days Held", sortable: true },
    { label: "Notes", sortable: false, widthClass: "w-[25%]" },
  ];

  // Encontrar el reinado actual (sin lost_date) y generar texto de "Current champion"
  const currentReignText = useMemo(() => {
    if (!reigns || reigns.length === 0) return null;
    const current = reigns.find((r) => !r.lost_date);
    if (!current) return null;

    const wrestlerName      = current.wrestler;
    const wrestlerId        = current.wrestler_id;
    const ordinalWord       = getOrdinalWord(current.reign_number);
    const defeatedOpponent  = current.opponent || "—";     // Nombre del rival vencido
    const defeatedOpponentId = current.opponent_id || null; // ID del rival vencido
    const formattedDate     = formatEnglishDate(current.won_date);
    const eventName         = current.event_name || "—";
    const eventId           = current.event_id || null;

    return {
      wrestlerName,
      wrestlerId,
      ordinalWord,
      defeatedOpponent,
      defeatedOpponentId,
      formattedDate,
      eventName,
      eventId,
    };
  }, [reigns]);

  // Función para ordenar según sortKey y sortOrder, e insertar fila de "Vacant" para NXT Championship
  const sortedReigns = useMemo(() => {
    if (!reigns) return [];
    let arr = [...reigns].map((r, idx) => ({
      ...r,
      __index: idx, // para columna "#"
      __daysHeld: calculateDaysHeld(r.won_date, r.lost_date),
      __wonDateObj: new Date(r.won_date),
      __eventName: r.event_name || "",
      __wrestlerName: r.wrestler || "",
      __interpreterName: r.interpreter || "",
      __notesText: r.notes || "",
      isVacant: false, // indicador para filtrar en render
    }));

    // Ordenamos por fecha de won_date ascendente (para la lógica de inserción)
    arr.sort((a, b) => a.__wonDateObj - b.__wonDateObj);

    // Si es NXT Championship (id 6), insertamos filas de "Vacant" cuando haya huecos
    if (sel === 6) {
      const withVacancies = [];
      for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        withVacancies.push(current);

        const next = arr[i + 1];
        if (next) {
          if (
            current.lost_date &&
            next.won_date &&
            current.lost_date !== next.won_date
          ) {
            withVacancies.push({
              id: `vacant-${i}`, // clave única de React
              championship_id: sel,
              wrestler_id: null,
              wrestler: "Vacant",
              interpreter_id: null,
              interpreter: null,
              won_date: current.lost_date,
              event_id: null,
              event_name: null,
              reign_number: null,
              notes: null,
              __index: null,
              __daysHeld: "—",
              __wonDateObj: new Date(current.lost_date),
              __eventName: "",
              __wrestlerName: "Vacant",
              __interpreterName: "",
              __notesText: "",
              isVacant: true,
            });
          }
        }
      }
      arr = withVacancies;
    }

    // Si se ha seleccionado una columna de ordenamiento, aplicamos sort según sortKey y sortOrder
    if (sortKey) {
      arr.sort((a, b) => {
        let va, vb;
        switch (sortKey) {
          case "#":
            va = a.__index !== null ? a.__index : Number.MAX_SAFE_INTEGER;
            vb = b.__index !== null ? b.__index : Number.MAX_SAFE_INTEGER;
            break;
          case "Wrestler":
            va = a.__wrestlerName.toLowerCase();
            vb = b.__wrestlerName.toLowerCase();
            break;
          case "Interpreter":
            va = a.__interpreterName.toLowerCase();
            vb = b.__interpreterName.toLowerCase();
            break;
          case "Won Date":
            va = a.__wonDateObj;
            vb = b.__wonDateObj;
            break;
          case "Event":
            va = a.__eventName.toLowerCase();
            vb = b.__eventName.toLowerCase();
            break;
          case "Reign #":
            va = a.reign_number !== null ? a.reign_number : Number.MAX_SAFE_INTEGER;
            vb = b.reign_number !== null ? b.reign_number : Number.MAX_SAFE_INTEGER;
            break;
          case "Days Held":
            va =
              typeof a.__daysHeld === "string"
                ? a.__daysHeld === "—"
                  ? Number.MAX_SAFE_INTEGER
                  : parseInt(a.__daysHeld.replace("+", ""), 10)
                : a.__daysHeld;
            vb =
              typeof b.__daysHeld === "string"
                ? b.__daysHeld === "—"
                  ? Number.MAX_SAFE_INTEGER
                  : parseInt(b.__daysHeld.replace("+", ""), 10)
                : b.__daysHeld;
            break;
          default:
            return 0;
        }
        if (va < vb) return sortOrder === "asc" ? -1 : 1;
        if (va > vb) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return arr;
  }, [reigns, sortKey, sortOrder, sel]);

  // Manejar clic en encabezado para cambiar orden, excepto "Notes"
  const handleSort = (column) => {
    if (column === "Notes") return;
    if (sortKey === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column);
      setSortOrder("asc");
    }
  };

  // Render de icono de flecha
  const renderSortIcon = (column) => {
    if (sortKey !== column) return null;
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <style jsx global>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <h1 className="text-3xl font-bold mb-6">Championships</h1>
      <p className="mb-4 text-lg font-medium">
        Select a championship to view its stats:
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        {CHAMPIONS.map((c) => (
          <button
            key={c.id}
            onClick={() => setSel(c.id)}
            className={`px-4 py-2 rounded shadow ${
              sel === c.id
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {sel && (
        <div className="space-y-4">
          {!champ || !reigns ? (
            <p>Loading...</p>
          ) : (
            <>
              {/* Sección de "Current champion" */}
              {currentReignText && (
                <div className="mb-4 p-4 rounded">
                  <h3 className="text-xl font-semibold mb-2">
                    Current champion
                  </h3>
                  <p className="text-sm">
                    The current champion is{" "}
                    {currentReignText.wrestlerId ? (
                      <Link
                        href={`/wrestlers/${currentReignText.wrestlerId}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        {currentReignText.wrestlerName}
                      </Link>
                    ) : (
                      <strong>{currentReignText.wrestlerName}</strong>
                    )}
                    , who is in his{" "}
                    {currentReignText.ordinalWord} reign.{" "}
                    {currentReignText.wrestlerName} won the title after defeating{" "}
                    {currentReignText.defeatedOpponentId ? (
                      <Link
                        href={`/wrestlers/${currentReignText.defeatedOpponentId}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        {currentReignText.defeatedOpponent}
                      </Link>
                    ) : (
                      <strong>{currentReignText.defeatedOpponent}</strong>
                    )}{" "}
                    on {currentReignText.formattedDate} at{" "}
                    {currentReignText.eventId ? (
                      <Link
                        href={`/events/${currentReignText.eventId}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        {currentReignText.eventName}
                      </Link>
                    ) : (
                      <strong>{currentReignText.eventName}</strong>
                    )}
                    .
                  </p>
                </div>
              )}

              <h2 className="text-2xl font-semibold">{champ.title_name}</h2>

              <div className="overflow-x-auto no-scrollbar">
                <table className="table-auto w-full border-collapse text-sm min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      {columns.map(({ label, sortable, widthClass }) => (
                        <th
                          key={label}
                          className={`border px-2 py-1 text-center ${
                            widthClass || ""
                          } ${sortable ? "cursor-pointer select-none" : ""}`}
                          onClick={() => sortable && handleSort(label)}
                        >
                          {label}
                          {sortable && renderSortIcon(label)}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {sortedReigns.map((r, idx) => {
                      // Si es fila de Vacant, mostramos columnas específicas
                      if (r.isVacant) {
                        return (
                          <tr
                            key={r.id}
                            className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <td className="border px-2 py-1 text-center">
                              {idx + 1}
                            </td>
                            <td className="border px-2 py-1 font-semibold">
                              Vacant
                            </td>
                            <td className="border px-2 py-1 text-center">
                              —
                            </td>
                            <td className="border px-2 py-1 text-center">
                              {formatEnglishDate(r.won_date)}
                            </td>
                            <td className="border px-2 py-1 text-center">
                              —
                            </td>
                            <td className="border px-2 py-1 text-center">
                              —
                            </td>
                            <td className="border px-2 py-1 text-center">—
                            </td>
                            <td className="border px-2 py-1 text-[12px] break-words">
                              —
                            </td>
                          </tr>
                        );
                      }

                      // Fila normal
                      const daysHeld = calculateDaysHeld(
                        r.won_date,
                        r.lost_date
                      );
                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="border px-2 py-1 text-center">
                            {idx + 1}
                          </td>

                          <td className="border px-2 py-1">
                            {r.wrestler_id ? (
                              <Link
                                href={`/wrestlers/${r.wrestler_id}`}
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <FlagWithName
                                  code={r.country}
                                  name={r.wrestler}
                                />
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="border px-2 py-1">
                            {r.interpreter_id ? (
                              <Link
                                href={`/interpreters/${r.interpreter_id}`}
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <FlagWithName
                                  code={r.nationality}
                                  name={r.interpreter}
                                />
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="border px-2 py-1 text-center">
                            {formatEnglishDate(r.won_date)}
                          </td>

                          <td className="border px-2 py-1 text-center">
                            {r.event_id ? (
                              <Link
                                href={`/events/${r.event_id}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {r.event_name}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="border px-2 py-1 text-center">
                            {r.reign_number}
                          </td>

                          <td className="border px-2 py-1 text-center">
                            {daysHeld}
                          </td>

                          <td className="border px-2 py-1 text-[12px] break-words">
                            {translateNotesToEnglish(r.notes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
