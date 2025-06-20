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
  // <-- NEW: SWR for defenses endpoint
  const { data: defenses } = useSWR(
    sel ? `/api/championships/${sel}/defenses` : null,
    fetcher
  );

  // Estado para ordenamiento de reinados
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" o "desc"

  // Estados para ordenamiento de "Total days with the title"
  const [aggSortKey, setAggSortKey] = useState("Total days");
  const [aggSortOrder, setAggSortOrder] = useState("desc");

  // Cálculo de días sostenidos para un reinado
  const calculateDaysHeld = (wonDateStr, lostDateStr) => {
    if (!wonDateStr) return "—";
    const start = new Date(wonDateStr);
    const end = lostDateStr ? new Date(lostDateStr) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return lostDateStr ? `${diffDays}` : `${diffDays}+`;
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

  // Obtener fecha actual para "Updated as of"
  const todayString = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);

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

  // Columnas definidas para reinados
  const columns = [
    { label: "#", sortable: true },
    { label: "Champion", sortable: true },
    { label: "Interpreter", sortable: true },
    { label: "Won Date", sortable: true },
    { label: "Event", sortable: true },
    { label: "Reign #", sortable: true },
    { label: "Days Held", sortable: true },
    { label: "Notes", sortable: false, widthClass: "w-[25%]" },
  ];

  // Columnas definidas para "Total days with the title"
  const aggColumns = [
    { label: "N.º", sortable: true },
    { label: "Champion", sortable: true },
    { label: "Interpreter", sortable: true },
    { label: "Reigns", sortable: true },
    { label: "Successful defenses", sortable: true },
    { label: "Total days", sortable: true },
  ];

  // Encontrar el reinado activo (sin lost_date) y generar texto de "Current champion"
  const currentReignText = useMemo(() => {
    if (!reigns || reigns.length === 0) return null;
    const current = reigns.find((r) => !r.lost_date);
    if (!current) return null;

    const wrestlerName = current.wrestler;
    const wrestlerId = current.wrestler_id;
    const ordinalWord = getOrdinalWord(current.reign_number);
    const defeatedOpponent = current.opponent || "—";
    const defeatedOpponentId = current.opponent_id || null;
    const formattedDate = formatEnglishDate(current.won_date);
    const eventName = current.event_name || "—";
    const eventId = current.event_id || null;

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

  // Ordenar reinados y agregar filas de Vacant para NXT Championship (id=6)
  const sortedReigns = useMemo(() => {
    if (!reigns) return [];
    let arr = [...reigns].map((r, idx) => ({
      ...r,
      __index: idx,
      __daysHeld: calculateDaysHeld(r.won_date, r.lost_date),
      __wonDateObj: new Date(r.won_date),
      __eventName: r.event_name || "",
      __wrestlerName: r.wrestler || "",
      __interpreterName: r.interpreter || "",
      __notesText: r.notes || "",
      isVacant: false,
    }));

    arr.sort((a, b) => a.__wonDateObj - b.__wonDateObj);

    if (sel === 6) {
      const withVacancies = [];
      for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        withVacancies.push(current);
        const next = arr[i + 1];
        if (
          next &&
          current.lost_date &&
          next.won_date &&
          current.lost_date !== next.won_date
        ) {
          withVacancies.push({
            id: `vacant-${i}`,
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
      arr = withVacancies;
    }

    if (sortKey) {
      arr.sort((a, b) => {
        let va, vb;
        switch (sortKey) {
          case "#":
            va = a.__index !== null ? a.__index : Number.MAX_SAFE_INTEGER;
            vb = b.__index !== null ? b.__index : Number.MAX_SAFE_INTEGER;
            break;
          case "Champion":
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
            va =
              a.reign_number !== null
                ? a.reign_number
                : Number.MAX_SAFE_INTEGER;
            vb =
              b.reign_number !== null
                ? b.reign_number
                : Number.MAX_SAFE_INTEGER;
            break;
          case "Days Held":
            va =
              typeof a.__daysHeld === "string"
                ? a.__daysHeld === "—"
                  ? Number.MAX_SAFE_INTEGER
                  : parseInt(a.__daysHeld.replace("+", ""), 10)
                : parseInt(a.__daysHeld, 10);
            vb =
              typeof b.__daysHeld === "string"
                ? b.__daysHeld === "—"
                  ? Number.MAX_SAFE_INTEGER
                  : parseInt(b.__daysHeld.replace("+", ""), 10)
                : parseInt(b.__daysHeld, 10);
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

  // Agrupar reinados por luchador y sumar días totales + defensas exitosas
  const aggregatedStats = useMemo(() => {
    if (!reigns) return [];
    // También necesitamos defenses, si aún no llegó, devolvemos vacío
    if (!defenses) return [];

    // Construimos un Map<reign_id, count> a partir de defenses[]
    const defensesMap = new Map();
    defenses.forEach((d) => {
      defensesMap.set(d.reign_id, d.count);
    });

    const map = new Map();

    reigns.forEach((r) => {
      const wid = r.wrestler_id;
      if (!wid) return;
      // Calcular días de ese reinado
      const daysHeldRaw = calculateDaysHeld(r.won_date, r.lost_date);
      const daysHeld =
        typeof daysHeldRaw === "string"
          ? parseInt(daysHeldRaw.replace("+", ""), 10)
          : daysHeldRaw;
      // Obtener defensas de este reinado (por defecto 0)
      const defensesForReign = defensesMap.get(r.id) || 0;

      if (!map.has(wid)) {
        map.set(wid, {
          wrestlerId: wid,
          wrestlerName: r.wrestler,
          country: r.country,
          interpreterId: r.interpreter_id,
          interpreterName: r.interpreter,
          interpreterCountry: r.nationality,
          reignCount: 1,
          defenses: defensesForReign,
          totalDays: daysHeld,
          isCurrent: r.lost_date === null,
        });
      } else {
        const entry = map.get(wid);
        entry.reignCount += 1;
        entry.defenses += defensesForReign;
        entry.totalDays += daysHeld;
        if (r.lost_date === null) {
          entry.isCurrent = true;
        }
      }
    });

    const arr = Array.from(map.values()).map((e) => ({
      ...e,
      totalDaysLabel: e.isCurrent ? `${e.totalDays}+` : `${e.totalDays}`,
    }));

    arr.sort((a, b) => {
      let va, vb;
      switch (aggSortKey) {
        case "N.º":
          va = a.wrestlerId;
          vb = b.wrestlerId;
          break;
        case "Champion":
          va = a.wrestlerName.toLowerCase();
          vb = b.wrestlerName.toLowerCase();
          break;
        case "Interpreter":
          va = a.interpreterName ? a.interpreterName.toLowerCase() : "";
          vb = b.interpreterName ? b.interpreterName.toLowerCase() : "";
          break;
        case "Reigns":
          va = a.reignCount;
          vb = b.reignCount;
          break;
        case "Successful defenses":
          va = a.defenses;
          vb = b.defenses;
          break;
        case "Total days":
          va = a.totalDays;
          vb = b.totalDays;
          break;
        default:
          return 0;
      }
      if (va < vb) return aggSortOrder === "asc" ? -1 : 1;
      if (va > vb) return aggSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [reigns, defenses, aggSortKey, aggSortOrder]);

  // Manejar clic en encabezado para cambiar orden (reinados)
  const handleSort = (column) => {
    if (column === "Notes") return;
    if (sortKey === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column);
      setSortOrder("asc");
    }
  };

  // Manejar clic en encabezado para cambiar orden (totales)
  const handleAggSort = (column) => {
    if (aggSortKey === column) {
      setAggSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setAggSortKey(column);
      setAggSortOrder("asc");
    }
  };

  // Render de icono de flecha (para ambas tablas)
  const renderSortIcon = (column, isAgg = false) => {
    const activeKey = isAgg ? aggSortKey : sortKey;
    const activeOrder = isAgg ? aggSortOrder : sortOrder;
    if (activeKey !== column) return null;
    return activeOrder === "asc" ? " ▲" : " ▼";
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
              {/* -------------------------- */}
              {/* Sección: Current champion */}
              {/* -------------------------- */}
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
                    , who is in his {currentReignText.ordinalWord} reign.{" "}
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

              {/* -------------------------- */}
              {/* Sección: Championship reigns table */}
              {/* -------------------------- */}
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
                            key={r.id || `vacant-${idx}`}
                            className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <td className="border px-2 py-1 text-center">
                              {idx + 1}
                            </td>
                            <td className="border px-2 py-1 font-semibold">
                              Vacant
                            </td>
                            <td className="border px-2 py-1 text-center">—</td>
                            <td className="border px-2 py-1 text-center">
                              {formatEnglishDate(r.won_date)}
                            </td>
                            <td className="border px-2 py-1 text-center">—</td>
                            <td className="border px-2 py-1 text-center">—</td>
                            <td className="border px-2 py-1 text-center">—</td>
                            <td className="border px-2 py-1 text-[12px] break-words">
                              —
                            </td>
                          </tr>
                        );
                      }

                      // Fila normal
                      const daysHeldRaw = calculateDaysHeld(
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
                            {r.lost_date === null
                              ? daysHeldRaw
                              : daysHeldRaw.replace("+", "")}
                          </td>

                          <td className="border px-2 py-1 text-[12px] break-words">
                            {translateNotesToEnglish(r.notes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* ------------------------------- */}
                {/* Bloque: Total days with the title */}
                {/* ------------------------------- */}
                <div className="mt-8 mb-6">
                  <h3 className="text-xl font-semibold mb-2">
                    Total days with the title
                  </h3>
                  <p className="mb-4 text-sm">Updated as of {todayString}.</p>

                  <div className="overflow-x-auto no-scrollbar">
                    <table className="table-auto w-full border-collapse text-sm min-w-[800px]">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          {aggColumns.map(({ label }) => (
                            <th
                              key={label}
                              onClick={() => handleAggSort(label)}
                              className="border px-2 py-1 text-center cursor-pointer select-none"
                            >
                              {label}
                              {renderSortIcon(label, true)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {aggregatedStats.map((row, idx) => (
                          <tr
                            key={row.wrestlerId}
                            className={`${
                              row.isCurrent
                                ? "bg-yellow-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                : "hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                          >
                            <td className="border px-2 py-1 text-center">
                              {idx + 1}
                            </td>
                            <td className="border px-2 py-1">
                              <Link
                                href={`/wrestlers/${row.wrestlerId}`}
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <FlagWithName
                                  code={row.country}
                                  name={row.wrestlerName}
                                />
                              </Link>
                            </td>
                            <td className="border px-2 py-1">
                              {row.interpreterId ? (
                                <Link
                                  href={`/interpreters/${row.interpreterId}`}
                                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  <FlagWithName
                                    code={row.interpreterCountry}
                                    name={row.interpreterName}
                                  />
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="border px-2 py-1 text-center">
                              {row.reignCount}
                            </td>
                            <td className="border px-2 py-1 text-center">
                              {row.defenses}
                            </td>
                            <td className="border px-2 py-1 text-center">
                              {row.totalDaysLabel}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
