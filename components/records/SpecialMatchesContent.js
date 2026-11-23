// components/records/SpecialMatchesContent.js
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import FlagWithName from "../FlagWithName";
import TableScreenshotButton from "../TableScreenshotButton";
import EntitySwitch from "./EntitySwitch";
import { getChampionshipHref } from "../../hooks/useChampionshipHelpers";

function EntityLink({ entity, isWrestler }) {
  if (!entity || !entity.id) {
    return (
      <span className="text-gray-400 dark:text-gray-600 select-none font-mono">
        —
      </span>
    );
  }
  const base = isWrestler ? "/wrestlers" : "/interpreters";
  return (
    <Link
      href={`${base}/${entity.id}`}
      onClick={(e) => e.stopPropagation()}
      className="text-blue-600 dark:text-sky-400 hover:underline font-medium inline-flex items-center gap-1"
    >
      <FlagWithName code={entity.country} name={entity.name} />
    </Link>
  );
}

function renderSortArrow(sortState, colKey, defaultDesc = true) {
  if (sortState.key !== colKey) {
    return <span className="opacity-40 text-gray-400 text-[10px]">⬍</span>;
  }
  return (
    <span className="text-[10px] text-blue-500">
      {sortState.dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

const PAGE_SIZE = 10;

export default function SpecialMatchesContent({ data, subType }) {
  const { years = [], matches = [], cumulative = {} } = data || {};

  // Default to current calendar year if it has recorded matches, otherwise the latest available year
  const initialYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    if (years.includes(currentYear)) return String(currentYear);
    return years.length > 0 ? String(Math.max(...years)) : "all";
  }, [years]);

  const [globalMode, setGlobalMode] = useState("wrestler");
  const [tableModes, setTableModes] = useState({});
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [cumSort, setCumSort] = useState({ key: "rank", dir: "asc" });
  const [cumPage, setCumPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);

  const getMode = (tableKey) => tableModes[tableKey] || globalMode;
  const setTableMode = (tableKey, mode) => {
    setTableModes((prev) => ({ ...prev, [tableKey]: mode }));
    if (tableKey === "cumulative") setCumPage(1);
  };
  const handleGlobalModeChange = (mode) => {
    setGlobalMode(mode);
    setTableModes({});
    setCumPage(1);
  };

  const cumMode = getMode("cumulative");
  const cumIsWrestler = cumMode === "wrestler";
  const cumEntityTitle = cumIsWrestler ? "Wrestler" : "Interpreter";
  const breakdownTitle = cumIsWrestler
    ? "Interpreters breakdown:"
    : "Wrestlers breakdown:";
  const breakdownUrl = cumIsWrestler ? "/interpreters" : "/wrestlers";

  useEffect(() => {
    setSelectedYear(initialYear);
  }, [initialYear, subType]);

  useEffect(() => {
    setCumSort({ key: "rank", dir: "asc" });
    setCumPage(1);
    setExpandedRow(null);
  }, [subType, cumMode]);

  const cumulativeRows = cumIsWrestler
    ? cumulative.wrestler || []
    : cumulative.interpreter || [];

  const filteredMatches = useMemo(() => {
    if (selectedYear === "all") return matches;
    const yr = Number(selectedYear);
    return matches.filter((m) => m.year === yr);
  }, [matches, selectedYear]);

  const handleCumSort = (key) => {
    setCumSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      const defaultDir = key === "rank" || key === "name" ? "asc" : "desc";
      return { key, dir: defaultDir };
    });
    setCumPage(1);
  };

  const sortedCumulative = useMemo(() => {
    return [...cumulativeRows].sort((a, b) => {
      let comparison = 0;
      if (cumSort.key === "rank") {
        comparison = a.rank - b.rank;
      } else if (cumSort.key === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (cumSort.key === "appearances") {
        comparison = b.appearances - a.appearances;
      } else if (cumSort.key === "timeSeconds") {
        comparison = b.timeSeconds - a.timeSeconds;
      } else if (cumSort.key === "eliminations") {
        comparison = b.eliminations - a.eliminations;
      }

      if (comparison === 0) {
        return a.rank - b.rank;
      }
      return cumSort.dir === "asc" ? comparison : -comparison;
    });
  }, [cumulativeRows, cumSort]);

  const cumulativeTitle =
    subType === "elimination-chamber"
      ? "All-Time Elimination Chamber Statistics"
      : "All-Time Royal Rumble Statistics";

  const totalCumPages = Math.max(1, Math.ceil(sortedCumulative.length / PAGE_SIZE));
  const safeCumPage = Math.min(cumPage, totalCumPages);
  const pagedCumulative = sortedCumulative.slice(
    (safeCumPage - 1) * PAGE_SIZE,
    safeCumPage * PAGE_SIZE
  );

  const toggleExpand = (key) =>
    setExpandedRow((prev) => (prev === key ? null : key));

  return (
    <div className="space-y-8">
      {/* Year Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            View:
          </span>
          <EntitySwitch viewMode={globalMode} onChange={handleGlobalModeChange} />
        </div>
      </div>

      {/* Per-Match Elimination Order Tables */}
      <div className="space-y-8">
        {filteredMatches.map((match) => {
          const tableKey = `match_${match.matchId}`;
          const matchMode = getMode(tableKey);
          const matchIsWrestler = matchMode === "wrestler";
          const matchEntityTitle = matchIsWrestler ? "Wrestler" : "Interpreter";
          const screenshotTitle = `${match.eventName} - ${match.title} (${matchEntityTitle})`;
          return (
            <div
              key={match.matchId}
              data-screenshot-target="true"
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden"
            >
              <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {match.eventLogo && (
                    <Link
                      href={`/events/${match.eventId}`}
                      className="shrink-0 flex items-center"
                    >
                      <Image
                        src={match.eventLogo}
                        alt={match.eventName}
                        width={56}
                        height={36}
                        className="h-9 w-auto max-w-[56px] object-contain drop-shadow-sm"
                      />
                    </Link>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider leading-tight">
                      {match.championshipName ? (
                        <>
                          <Link
                            href={getChampionshipHref(match.championshipName)}
                            className="text-blue-600 dark:text-sky-400"
                          >
                            {match.championshipName}
                          </Link>{" "}
                          Chamber Match
                        </>
                      ) : (
                        match.title
                      )}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <Link
                        href={`/events/${match.eventId}`}
                        className="text-blue-600 dark:text-sky-400 hover:underline font-medium"
                      >
                        {match.eventName}
                      </Link>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <EntitySwitch
                    viewMode={matchMode}
                    onChange={(m) => setTableMode(tableKey, m)}
                  />
                  <TableScreenshotButton title={screenshotTitle} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">
                      <th className="px-3 py-2.5 w-14 text-center border-b border-gray-200 dark:border-gray-800">
                        Entry
                      </th>
                      <th className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 min-w-[190px]">
                        {match.isTagTeam ? "Tag Team" : matchEntityTitle}
                      </th>
                      <th className="px-3 py-2.5 text-center border-b border-gray-200 dark:border-gray-800 w-20">
                        Order
                      </th>
                      <th className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 min-w-[180px]">
                        Eliminated by
                      </th>
                      <th className="px-4 py-2.5 text-right border-b border-gray-200 dark:border-gray-800 w-28">
                        Time
                      </th>
                      <th className="px-4 py-2.5 text-right border-b border-gray-200 dark:border-gray-800 w-28">
                        Eliminations
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    {match.entries.map((entry) => {
                      const rowBgClass = entry.isWinner
                        ? "bg-emerald-500/15 dark:bg-emerald-500/20 font-semibold"
                        : "hover:bg-gray-50 dark:hover:bg-zinc-800/50";

                      const timeCellClass = entry.isMaxTime
                        ? entry.isWinner
                          ? "bg-emerald-500/30 dark:bg-emerald-500/35 font-bold text-emerald-950 dark:text-emerald-100"
                          : "bg-amber-400/25 dark:bg-amber-400/20 font-bold text-amber-900 dark:text-amber-200"
                        : "";

                      const elimCellClass = entry.isMaxEliminations
                        ? entry.isWinner
                          ? "bg-emerald-500/30 dark:bg-emerald-500/35 font-bold text-emerald-950 dark:text-emerald-100"
                          : "bg-amber-400/25 dark:bg-amber-400/20 font-bold text-amber-900 dark:text-amber-200"
                        : "";

                      return (
                        <tr
                          key={entry.entryNumber}
                          className={`transition-colors ${rowBgClass}`}
                        >
                          <td className="px-3 py-2.5 text-center font-mono text-gray-500 dark:text-gray-400">
                            {entry.entryNumber}
                          </td>

                          <td className="px-4 py-2.5">
                            {match.isTagTeam ? (
                              <div className="space-y-0.5">
                                <div>
                                  <Link
                                    href={`/stables/${entry.tagTeam.id}`}
                                    className="text-blue-600 dark:text-sky-400 hover:underline font-semibold"
                                  >
                                    {entry.tagTeam.name}
                                  </Link>
                                </div>
                                {entry.members?.length > 0 && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-x-1">
                                    <span>(</span>
                                    {entry.members.map((m, idx) => (
                                      <React.Fragment key={idx}>
                                        {idx > 0 && <span>&amp;</span>}
                                        <EntityLink
                                          entity={
                                            matchIsWrestler ? m.wrestler : m.interpreter
                                          }
                                          isWrestler={matchIsWrestler}
                                        />
                                      </React.Fragment>
                                    ))}
                                    <span>)</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <EntityLink
                                entity={
                                  matchIsWrestler ? entry.wrestler : entry.interpreter
                                }
                                isWrestler={matchIsWrestler}
                              />
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center font-mono">
                            {entry.eliminationOrder !== null &&
                            entry.eliminationOrder !== undefined ? (
                              entry.eliminationOrder
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600 select-none">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-2.5">
                            {match.isTagTeam ? (
                              entry.eliminatedByTeam ? (
                                <Link
                                  href={`/stables/${entry.eliminatedByTeam.tagTeam.id}`}
                                  className="text-blue-600 dark:text-sky-400 hover:underline font-medium"
                                >
                                  {entry.eliminatedByTeam.tagTeam.name}
                                </Link>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-600 select-none font-mono">
                                  —
                                </span>
                              )
                            ) : entry.eliminators?.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                {entry.eliminators.map((elim, idx) => (
                                  <React.Fragment key={idx}>
                                    {idx > 0 && (
                                      <span className="text-gray-500 dark:text-gray-400">
                                        &amp;
                                      </span>
                                    )}
                                    <EntityLink
                                      entity={
                                        matchIsWrestler
                                          ? elim.wrestler
                                          : elim.interpreter
                                      }
                                      isWrestler={matchIsWrestler}
                                    />
                                  </React.Fragment>
                                ))}
                              </div>
                            ) : entry.eliminationNote ? (
                              <span className="italic text-gray-600 dark:text-gray-400">
                                {entry.eliminationNote}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600 select-none font-mono">
                                —
                              </span>
                            )}
                          </td>

                          <td
                            className={`px-4 py-2.5 text-right font-mono whitespace-nowrap ${timeCellClass}`}
                          >
                            {entry.timeFormatted}
                          </td>

                          <td
                            className={`px-4 py-2.5 text-right font-mono font-semibold whitespace-nowrap ${elimCellClass}`}
                          >
                            {entry.eliminations}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {filteredMatches.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded text-gray-500 dark:text-gray-400 text-sm">
            No matches found for the selected year.
          </div>
        )}
      </div>

      {/* Historical Cumulative Ranking Table */}
      <div
        data-screenshot-target="true"
        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden"
      >
        <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            {cumulativeTitle}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <EntitySwitch
              viewMode={cumMode}
              onChange={(m) => setTableMode("cumulative", m)}
            />
            <TableScreenshotButton
              title={`${cumulativeTitle} (${cumEntityTitle})`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">
                <th
                  className="px-3 py-2.5 w-16 text-center border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleCumSort("rank")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>#</span>
                    {renderSortArrow(cumSort, "rank")}
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 min-w-[200px] cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleCumSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span>{cumEntityTitle}</span>
                    {renderSortArrow(cumSort, "name")}
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 text-right border-b border-gray-200 dark:border-gray-800 w-28 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleCumSort("appearances")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Matches</span>
                    {renderSortArrow(cumSort, "appearances")}
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 text-right border-b border-gray-200 dark:border-gray-800 w-32 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleCumSort("timeSeconds")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Time</span>
                    {renderSortArrow(cumSort, "timeSeconds")}
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 text-right border-b border-gray-200 dark:border-gray-800 w-32 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleCumSort("eliminations")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Eliminations</span>
                    {renderSortArrow(cumSort, "eliminations")}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              {pagedCumulative.map((item) => {
                const uniqueId = `cum_${subType}_${cumMode}_${item.id}`;
                const isExpanded = expandedRow === uniqueId;
                const isExpandable =
                  item.breakdown && item.breakdown.length > 1;

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${
                        isExpandable ? "cursor-pointer" : ""
                      }`}
                      onClick={() => {
                        if (isExpandable) toggleExpand(uniqueId);
                      }}
                      title={isExpandable ? "Click to view breakdown" : ""}
                    >
                      <td className="px-3 py-2.5 text-center font-semibold text-gray-500 dark:text-gray-400">
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

                      <td className="px-4 py-2.5 font-semibold">
                        <EntityLink entity={item} isWrestler={cumIsWrestler} />
                      </td>

                      <td className="px-4 py-2.5 text-right font-mono font-bold">
                        {item.appearances}
                      </td>

                      <td className="px-4 py-2.5 text-right font-mono">
                        {item.timeFormatted}
                      </td>

                      <td className="px-4 py-2.5 text-right font-mono font-bold">
                        {item.eliminations}
                      </td>
                    </tr>

                    {isExpanded && isExpandable && (
                      <tr className="bg-gray-50 dark:bg-zinc-950/50">
                        <td
                          colSpan={5}
                          className="px-4 py-3 border-b border-gray-200 dark:border-gray-800"
                        >
                          <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                            <p className="font-semibold text-blue-600 dark:text-sky-400">
                              {breakdownTitle}
                            </p>
                            <ul className="space-y-1.5">
                              {item.breakdown.map((bd) => (
                                <li
                                  key={bd.id}
                                  className="pl-1 flex flex-wrap items-center gap-2 text-sm"
                                >
                                  <span className="font-mono font-bold text-gray-500 dark:text-gray-400 min-w-[20px] text-right">
                                    {bd.count}
                                  </span>
                                  <Link
                                    href={`${breakdownUrl}/${bd.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-600 dark:text-sky-400 hover:underline font-medium inline-flex items-center gap-1"
                                  >
                                    <FlagWithName
                                      code={bd.country}
                                      name={bd.name}
                                    />
                                  </Link>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                    ({bd.timeFormatted} · {bd.eliminations}{" "}
                                    {bd.eliminations === 1
                                      ? "elim"
                                      : "elims"}
                                    )
                                  </span>
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

        {totalCumPages > 1 && (
          <div className="no-screenshot px-4 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-zinc-950 flex justify-center items-center space-x-2">
            <button
              type="button"
              onClick={() => setCumPage(Math.max(1, safeCumPage - 1))}
              disabled={safeCumPage === 1}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                safeCumPage === 1
                  ? "bg-gray-300 text-gray-800 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50"
                  : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer"
              }`}
            >
              &lt;
            </button>
            {Array.from({ length: totalCumPages }, (_, idx) => idx + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCumPage(pageNum)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  safeCumPage === pageNum
                    ? "bg-blue-600 text-white shadow cursor-pointer"
                    : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer"
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCumPage(Math.min(totalCumPages, safeCumPage + 1))}
              disabled={safeCumPage === totalCumPages}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                safeCumPage === totalCumPages
                  ? "bg-gray-300 text-gray-800 dark:bg-gray-900 dark:text-white cursor-not-allowed opacity-50"
                  : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer"
              }`}
            >
              &gt;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
