// components/records/DistinctionsContent.js
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import FlagWithName from "../FlagWithName";
import TableScreenshotButton from "../TableScreenshotButton";
import { formatEnglishDate } from "../../hooks/useChampionshipHelpers";

function DistinctionSideCell({ side, isWrestler }) {
  if (!side) {
    return (
      <span className="text-gray-400 dark:text-gray-600 select-none font-mono">
        —
      </span>
    );
  }

  const entityUrl = isWrestler ? "/wrestlers" : "/interpreters";
  const stables = side.stables || [];
  const inlineEntities = isWrestler ? side.inlineWrestlers : side.inlineInterpreters;
  const displayEntities = isWrestler ? side.displayWrestlers : side.displayInterpreters;

  // For WarGames in "Per Interpreter" mode, show the participating interpreters in parentheses
  const warGamesInterpreterSublist =
    !isWrestler && stables.length > 0 && (!displayEntities || displayEntities.length === 0)
      ? (side.allParticipants || []).map((p) => p.interpreter).filter(Boolean)
      : [];

  const subEntities =
    displayEntities && displayEntities.length > 0
      ? displayEntities
      : warGamesInterpreterSublist;

  if (stables.length > 0) {
    const topNodes = [
      ...stables.map((st) => ({
        key: `stable_${st.id}`,
        href: `/stables/${st.id}`,
        label: st.name,
      })),
      ...(inlineEntities || []).map((ent) => ({
        key: `inline_${ent.id}`,
        href: `${entityUrl}/${ent.id}`,
        label: ent.name,
      })),
    ];

    return (
      <div className="text-sm leading-relaxed space-y-0.5">
        <div>
          {topNodes.map((node, idx) => (
            <React.Fragment key={node.key}>
              {idx > 0 && (idx === topNodes.length - 1 ? " & " : ", ")}
              <Link
                href={node.href}
                className="text-blue-600 dark:text-sky-400 hover:underline font-medium"
              >
                {node.label}
              </Link>
            </React.Fragment>
          ))}
        </div>

        {subEntities.length > 0 && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            (
            {subEntities.map((ent, idx) => (
              <React.Fragment key={`${ent.id}_${idx}`}>
                {idx > 0 && (idx === subEntities.length - 1 ? " & " : ", ")}
                <Link
                  href={`${entityUrl}/${ent.id}`}
                  className="text-blue-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 mx-0.5"
                >
                  <FlagWithName code={ent.country} name={ent.name} />
                </Link>
              </React.Fragment>
            ))}
            )
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-y-1 text-sm">
      {(displayEntities || []).map((ent, idx) => (
        <React.Fragment key={`${ent.id}_${idx}`}>
          {idx > 0 && (
            <span className="text-gray-600 dark:text-gray-400 mx-1">
              {idx === displayEntities.length - 1 ? "&" : ","}
            </span>
          )}
          <Link
            href={`${entityUrl}/${ent.id}`}
            className="text-blue-600 dark:text-sky-400 hover:underline font-medium inline-flex items-center gap-1"
          >
            <FlagWithName code={ent.country} name={ent.name} />
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function DistinctionsContent({ data, type }) {
  const isWrestler = type === "wrestler";
  const entityUrl = isWrestler ? "/wrestlers" : "/interpreters";
  const breakdownTitle = isWrestler
    ? "Interpreters breakdown:"
    : "Wrestlers breakdown:";
  const breakdownUrl = isWrestler ? "/interpreters" : "/wrestlers";

  const {
    items = [],
    years = [],
    categories = [],
    rankingList = [],
  } = data || {};

  // Default to current calendar year if it has recorded distinctions, otherwise the latest available year
  const initialYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    if (years.includes(currentYear)) return String(currentYear);
    return years.length > 0 ? String(Math.max(...years)) : "all";
  }, [years]);

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "rank", dir: "asc" });

  useEffect(() => {
    setSelectedYear(initialYear);
  }, [initialYear]);

  useEffect(() => {
    setSortConfig({ key: "rank", dir: "asc" });
    setExpandedRow(null);
  }, [type]);

  const toggleExpand = (key) =>
    setExpandedRow((prev) => (prev === key ? null : key));

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedYear !== "all" && item.year !== Number(selectedYear)) {
        return false;
      }
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [items, selectedYear, selectedCategory]);

  // Compute dynamic rowSpans for Year and Date/Show columns on the filtered rows
  const rowsWithSpans = useMemo(() => {
    return filteredItems.map((item, idx) => {
      let yearSpan = 0;
      if (idx === 0 || filteredItems[idx - 1].year !== item.year) {
        yearSpan = 1;
        for (let j = idx + 1; j < filteredItems.length; j++) {
          if (filteredItems[j].year === item.year) yearSpan++;
          else break;
        }
      }

      const isSameEventAsPrev =
        idx > 0 &&
        filteredItems[idx - 1].year === item.year &&
        filteredItems[idx - 1].date === item.date &&
        filteredItems[idx - 1].eventId === item.eventId;

      let eventSpan = 0;
      if (!isSameEventAsPrev) {
        eventSpan = 1;
        for (let j = idx + 1; j < filteredItems.length; j++) {
          if (
            filteredItems[j].year === item.year &&
            filteredItems[j].date === item.date &&
            filteredItems[j].eventId === item.eventId
          ) {
            eventSpan++;
          } else {
            break;
          }
        }
      }

      return {
        ...item,
        yearSpan,
        eventSpan,
      };
    });
  }, [filteredItems]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      const defaultDir = key === "rank" || key === "name" ? "asc" : "desc";
      return { key, dir: defaultDir };
    });
  };

  const sortedRanking = useMemo(() => {
    return [...rankingList]
      .sort((a, b) => {
        let comparison = 0;
        if (sortConfig.key === "rank") {
          comparison = a.rank - b.rank;
        } else if (sortConfig.key === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortConfig.key === "wins") {
          comparison = b.wins - a.wins;
        } else if (sortConfig.key.startsWith("cat_")) {
          const catId = sortConfig.key.replace("cat_", "");
          const valA = a.categoryCounts?.[catId] || 0;
          const valB = b.categoryCounts?.[catId] || 0;
          comparison = valB - valA;
        }

        if (comparison === 0) {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return a.name.localeCompare(b.name);
        }

        return sortConfig.dir === "asc" ? comparison : -comparison;
      })
      .slice(0, 10);
  }, [rankingList, sortConfig]);

  return (
    <div className="space-y-8">
      {/* Filters Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mr-1">
            Year:
          </span>
          <button
            type="button"
            onClick={() => setSelectedYear("all")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              selectedYear === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
            }`}
          >
            All
          </button>
          {years.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedYear(String(yr))}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                selectedYear === String(yr)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
              }`}
            >
              {yr}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mr-1">
            Category:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chronological Distinctions Table */}
      <div data-screenshot-target="true" className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden">
        <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            Other Distinctions & Tournaments
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {rowsWithSpans.length} {rowsWithSpans.length === 1 ? "entry" : "entries"}
            </span>
            <TableScreenshotButton title="Other Distinctions & Tournaments" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-950 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider font-bold">
                <th className="px-3 py-3 border border-gray-200 dark:border-gray-800 w-16">
                  Year
                </th>
                <th className="px-4 py-3 border border-gray-200 dark:border-gray-800 min-w-[240px]">
                  Match, Distinction or Tournament
                </th>
                <th className="px-4 py-3 border border-gray-200 dark:border-gray-800 min-w-[220px]">
                  Winner
                </th>
                <th className="px-4 py-3 border border-gray-200 dark:border-gray-800 min-w-[140px]">
                  Date
                </th>
                <th className="px-4 py-3 border border-gray-200 dark:border-gray-800 min-w-[160px]">
                  Show or PLE
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {rowsWithSpans.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  {row.yearSpan > 0 && (
                    <td
                      rowSpan={row.yearSpan}
                      className="px-3 py-3 font-bold border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white bg-gray-50/50 dark:bg-zinc-900/40 text-sm align-middle"
                    >
                      {row.year}
                    </td>
                  )}

                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-800 text-sm font-medium text-blue-600 dark:text-sky-400 align-middle">
                    <Link
                      href={`/events/${row.eventId}`}
                      className="hover:underline"
                    >
                      {row.title}
                    </Link>
                  </td>

                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-800 align-middle">
                    <DistinctionSideCell
                      side={row.winner}
                      isWrestler={isWrestler}
                    />
                  </td>

                  {row.eventSpan > 0 && (
                    <td
                      rowSpan={row.eventSpan}
                      className="px-4 py-3 border border-gray-200 dark:border-gray-800 text-sm text-gray-800 dark:text-gray-200 align-middle whitespace-nowrap"
                    >
                      {formatEnglishDate(row.date)}
                    </td>
                  )}

                  {row.eventSpan > 0 && (
                    <td
                      rowSpan={row.eventSpan}
                      className="px-4 py-3 border border-gray-200 dark:border-gray-800 text-sm align-middle whitespace-nowrap"
                    >
                      <Link
                        href={`/events/${row.eventId}`}
                        className="text-blue-600 dark:text-sky-400 hover:underline font-medium"
                      >
                        {row.showLabel}
                      </Link>
                    </td>
                  )}
                </tr>
              ))}

              {rowsWithSpans.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-gray-500 dark:text-gray-400 text-sm"
                  >
                    No distinctions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ranking Table: Total Distinctions Won per Category */}
      <div data-screenshot-target="true" className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden">
        <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            Total Distinctions Won per Category
          </h2>
          <TableScreenshotButton title="Total Distinctions Won per Category" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-950 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider font-bold">
                <th
                  className="px-3 py-3 w-14 text-center border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleSort("rank")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>#</span>
                    <span className="text-[10px] text-blue-500">
                      {sortConfig.key === "rank" ? (
                        sortConfig.dir === "asc" ? "▲" : "▼"
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                <th
                  className="px-4 py-3 text-left border border-gray-200 dark:border-gray-800 min-w-[200px] cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span>{isWrestler ? "Wrestler" : "Interpreter"}</span>
                    <span className="text-[10px] text-blue-500">
                      {sortConfig.key === "name" ? (
                        sortConfig.dir === "asc" ? "▲" : "▼"
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                <th
                  className="px-4 py-3 text-center border border-gray-200 dark:border-gray-800 w-28 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleSort("wins")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Total Wins</span>
                    <span className="text-[10px] text-blue-500">
                      {sortConfig.key === "wins" ? (
                        sortConfig.dir === "desc" ? "▼" : "▲"
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                {categories.map((cat) => (
                  <th
                    key={cat.id}
                    className="px-3 py-3 text-center border border-gray-200 dark:border-gray-800 min-w-[120px] cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none text-xs leading-tight"
                    onClick={() => handleSort(`cat_${cat.id}`)}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{cat.label}</span>
                      <span className="text-[10px] text-blue-500 shrink-0">
                        {sortConfig.key === `cat_${cat.id}` ? (
                          sortConfig.dir === "desc" ? "▼" : "▲"
                        ) : (
                          <span className="opacity-40 text-gray-400">⬍</span>
                        )}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sortedRanking.map((item) => {
                const uniqueId = `dist_${item.id}`;
                const isExpanded = expandedRow === uniqueId;
                const isExpandable = item.breakdown && item.breakdown.length > 1;
                const handleRowClick = () => {
                  if (isExpandable) toggleExpand(uniqueId);
                };

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                        isExpandable ? "cursor-pointer" : ""
                      }`}
                      onClick={handleRowClick}
                      title={isExpandable ? "Click to view breakdown" : ""}
                    >
                      <td className="px-3 py-3 text-center font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 text-sm">
                        {isExpandable ? (
                          <span className="flex items-center justify-center gap-1">
                            <span
                              className={`text-[10px] transition-transform ${
                                isExpanded ? "rotate-90 text-blue-500" : ""
                              }`}
                            >
                              ▶
                            </span>
                            {item.rank}
                          </span>
                        ) : (
                          item.rank
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold text-blue-600 dark:text-sky-400 border border-gray-200 dark:border-gray-800 text-sm text-left">
                        <Link
                          href={`${entityUrl}/${item.id}`}
                          className="inline-flex items-center gap-2 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FlagWithName code={item.country} name={item.name} />
                        </Link>
                      </td>

                      <td className="px-4 py-3 text-center border border-gray-200 dark:border-gray-800 text-sm font-mono font-bold text-gray-900 dark:text-white">
                        {item.wins}
                      </td>

                      {categories.map((cat) => {
                        const count = item.categoryCounts?.[cat.id];
                        return (
                          <td
                            key={cat.id}
                            className="px-3 py-3 text-center border border-gray-200 dark:border-gray-800 text-sm font-mono"
                          >
                            {count > 0 ? (
                              <span className="font-semibold text-gray-800 dark:text-gray-100">
                                {count}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600 select-none">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {isExpanded && isExpandable && (
                      <tr className="bg-gray-50 dark:bg-zinc-950/50">
                        <td
                          colSpan={categories.length + 3}
                          className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 text-left"
                        >
                          <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                            <p className="font-semibold mb-2 text-blue-600 dark:text-sky-400">
                              {breakdownTitle}
                            </p>
                            <ul className="space-y-1.5">
                              {item.breakdown?.map((bd, idx) => (
                                <li
                                  key={idx}
                                  className="pl-1 flex items-start text-sm"
                                >
                                  <span className="mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono text-right font-bold">
                                    {bd.count}
                                  </span>
                                  {bd.id ? (
                                    <Link
                                      href={`${breakdownUrl}/${bd.id}`}
                                      className="text-blue-600 dark:text-sky-400 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {bd.name}
                                    </Link>
                                  ) : (
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {bd.name}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
