// components/records/GeneralRecordsContent.js
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import FlagWithName from "../FlagWithName";
import TableScreenshotButton from "../TableScreenshotButton";
import EntitySwitch from "./EntitySwitch";

const BLOB_BASE_URL = "https://ljejfdquofuxccca.public.blob.vercel-storage.com";

const SHOW_LOGOS = {
  raw: `${BLOB_BASE_URL}/raw.png`,
  smackdown: `${BLOB_BASE_URL}/sd.png`,
  nxt: `${BLOB_BASE_URL}/nxt.png`,
};

const CATEGORIES = [
  { type: "main", label: "Maincard championships" },
  { type: "mid", label: "Midcard championships" },
  { type: "tag", label: "Tag team championships" },
  { type: "low", label: "Lowcard championships" },
  { type: "special", label: "Special championships" },
];

export default function GeneralRecordsContent({ data }) {
  const router = useRouter();
  const wrestlerData = data?.wrestler || data || {};
  const interpreterData = data?.interpreter || data || {};

  const [globalMode, setGlobalMode] = useState("wrestler");
  const [tableModes, setTableModes] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);

  const getMode = (tableKey) => tableModes[tableKey] || globalMode;
  const setTableMode = (tableKey, mode) =>
    setTableModes((prev) => ({ ...prev, [tableKey]: mode }));
  const handleGlobalModeChange = (mode) => {
    setGlobalMode(mode);
    setTableModes({});
  };

  const getTableCtx = (tableKey) => {
    const mode = getMode(tableKey);
    const isW = mode === "wrestler";
    return {
      mode,
      isWrestler: isW,
      modeData: isW ? wrestlerData : interpreterData,
      entityTitle: isW ? "Wrestler" : "Interpreter",
      entityUrl: isW ? "/wrestlers" : "/interpreters",
      breakdownTitle: isW ? "Interpreters breakdown:" : "Wrestlers breakdown:",
      breakdownUrl: isW ? "/interpreters" : "/wrestlers",
    };
  };

  const [undefSort, setUndefSort] = useState({ key: "count", dir: "desc" });
  const [topSort, setTopSort] = useState({ key: "wins", dir: "desc" });
  const [showSorts, setShowSorts] = useState({
    raw: "wins",
    sd: "wins",
    nxt: "wins",
  });
  const [lrSort, setLrSort] = useState({ key: "days_held", dir: "desc" });
  const [mdSort, setMdSort] = useState({ key: "defenses_count", dir: "desc" });
  const [tcSort, setTcSort] = useState({ key: "rank", dir: "asc" });
  const [pleSort, setPleSort] = useState({ key: "rank", dir: "asc" });

  const matchesCtx = getTableCtx("matches");
  const topCtx = getTableCtx("topStats");
  const undefCtx = getTableCtx("undef");
  const winCtx = getTableCtx("win");
  const lrCtx = getTableCtx("longestReigns");
  const mdCtx = getTableCtx("mostDefenses");
  const tcCtx = getTableCtx("totalChampionships");
  const pleCtx = getTableCtx("pleAppearances");

  useEffect(() => {
    setTcSort({ key: "rank", dir: "asc" });
  }, [tcCtx.mode]);

  useEffect(() => {
    setPleSort({ key: "rank", dir: "asc" });
  }, [pleCtx.mode]);

  const sortedUndefeated = useMemo(() => {
    return [...(undefCtx.modeData?.undefStreaks || [])].sort((a, b) => {
      const valA = undefSort.key === "count" ? a.count : a.days;
      const valB = undefSort.key === "count" ? b.count : b.days;
      return valB - valA;
    });
  }, [undefCtx.modeData?.undefStreaks, undefSort]);

  const sortedTopStats = useMemo(() => {
    return [...(topCtx.modeData?.topStats || [])].sort((a, b) => {
      const valA =
        topSort.key === "wins" ? a.wins : parseFloat(a.win_percentage);
      const valB =
        topSort.key === "wins" ? b.wins : parseFloat(b.win_percentage);
      return valB - valA;
    });
  }, [topCtx.modeData?.topStats, topSort]);

  const sortedLongestReigns = useMemo(() => {
    return [...(lrCtx.modeData?.longestReigns || [])].sort(
      (a, b) => b.days_held - a.days_held,
    );
  }, [lrCtx.modeData?.longestReigns]);

  const sortedMostDefenses = useMemo(() => {
    return [...(mdCtx.modeData?.mostDefenses || [])].sort(
      (a, b) => b.defenses_count - a.defenses_count,
    );
  }, [mdCtx.modeData?.mostDefenses]);

  const sortedTotalChampionships = useMemo(() => {
    if (!tcCtx.modeData?.totalChampionships) return [];
    const list = [...tcCtx.modeData.totalChampionships];

    list.sort((a, b) => {
      let comparison = 0;
      if (tcSort.key === "rank") {
        comparison = a.rank - b.rank;
        return tcSort.dir === "asc" ? comparison : -comparison;
      }

      if (tcSort.key === "name") {
        comparison = a.name.localeCompare(b.name);
        return tcSort.dir === "asc" ? comparison : -comparison;
      }

      if (tcSort.key === "total") {
        comparison = b.total - a.total;
        if (comparison === 0) comparison = a.rank - b.rank;
        return tcSort.dir === "asc" ? -comparison : comparison;
      }

      if (tcSort.key.startsWith("champ_")) {
        const champId = parseInt(tcSort.key.replace("champ_", ""), 10);
        const countA = a.counts[champId] || 0;
        const countB = b.counts[champId] || 0;
        comparison = countB - countA;
        if (comparison === 0) {
          comparison = a.rank - b.rank;
        }
        return tcSort.dir === "asc" ? -comparison : comparison;
      }

      return 0;
    });

    return list;
  }, [tcCtx.modeData?.totalChampionships, tcSort]);

  const handleTcSort = (key) => {
    setTcSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "desc" ? "asc" : "desc" };
      }
      return { key, dir: key === "name" || key === "rank" ? "asc" : "desc" };
    });
  };

  const sortedPleAppearances = useMemo(() => {
    if (!pleCtx.modeData?.pleAppearances) return [];
    const list = [...pleCtx.modeData.pleAppearances];

    list.sort((a, b) => {
      let comparison = 0;
      if (pleSort.key === "rank") {
        comparison = a.rank - b.rank;
        return pleSort.dir === "asc" ? comparison : -comparison;
      }

      if (pleSort.key === "name") {
        comparison = a.name.localeCompare(b.name);
        return pleSort.dir === "asc" ? comparison : -comparison;
      }

      if (pleSort.key === "count") {
        comparison = b.count - a.count;
        if (comparison === 0) comparison = a.rank - b.rank;
        return pleSort.dir === "asc" ? -comparison : comparison;
      }

      if (pleSort.key === "firstYear") {
        const dateA = new Date(a.firstEvent?.date || 0).getTime();
        const dateB = new Date(b.firstEvent?.date || 0).getTime();
        comparison = dateA - dateB;
        if (comparison === 0) comparison = a.rank - b.rank;
        return pleSort.dir === "asc" ? comparison : -comparison;
      }

      if (pleSort.key === "firstEvent") {
        const nameA = a.firstEvent?.name || "";
        const nameB = b.firstEvent?.name || "";
        comparison = nameA.localeCompare(nameB);
        if (comparison === 0) comparison = a.rank - b.rank;
        return pleSort.dir === "asc" ? comparison : -comparison;
      }

      if (pleSort.key === "lastYear") {
        const dateA = new Date(a.lastEvent?.date || 0).getTime();
        const dateB = new Date(b.lastEvent?.date || 0).getTime();
        comparison = dateB - dateA;
        if (comparison === 0) comparison = a.rank - b.rank;
        return pleSort.dir === "asc" ? -comparison : comparison;
      }

      if (pleSort.key === "lastEvent") {
        const nameA = a.lastEvent?.name || "";
        const nameB = b.lastEvent?.name || "";
        comparison = nameA.localeCompare(nameB);
        if (comparison === 0) comparison = a.rank - b.rank;
        return pleSort.dir === "asc" ? comparison : -comparison;
      }

      return 0;
    });

    return list;
  }, [pleCtx.modeData?.pleAppearances, pleSort]);

  const handlePleSort = (key) => {
    setPleSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "desc" ? "asc" : "desc" };
      }
      return {
        key,
        dir:
          key === "name" ||
          key === "rank" ||
          key === "firstYear" ||
          key === "firstEvent" ||
          key === "lastEvent"
            ? "asc"
            : "desc",
      };
    });
  };

  const championships = tcCtx.modeData?.championships || wrestlerData?.championships || [];

  const presentCategories = useMemo(() => {
    const knownTypes = new Set(CATEGORIES.map((c) => c.type));
    const grouped = CATEGORIES.map((cat) => ({
      ...cat,
      championships: championships.filter((c) => c.type === cat.type),
    })).filter((cat) => cat.championships.length > 0);

    const otherChamps = championships.filter((c) => !knownTypes.has(c.type));
    if (otherChamps.length > 0) {
      grouped.push({
        type: "other",
        label: "Other championships",
        championships: otherChamps,
      });
    }

    return grouped;
  }, [championships]);

  const toggleExpand = (key) =>
    setExpandedRow((prev) => (prev === key ? null : key));

  const renderTable = (
    title,
    dataArr,
    columns,
    renderRow,
    expandPrefix = null,
    renderExpanded = null,
    expandTitle = "Match breakdown:",
    isRowExpandable = () => true,
    onRowClick = null,
    screenshotTitle = null,
    tableKey = null,
  ) => (
    <div data-screenshot-target="true" className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden h-fit min-w-0">
      <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          {title}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {tableKey && (
            <EntitySwitch
              viewMode={getMode(tableKey)}
              onChange={(m) => setTableMode(tableKey, m)}
            />
          )}
          <TableScreenshotButton title={screenshotTitle || (typeof title === "string" ? title : "table")} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 text-sm">
              <th className="px-4 py-2 w-12 text-center">#</th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-4 py-2 whitespace-nowrap ${col.onSort ? "cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none" : ""}`}
                  onClick={col.onSort ? col.onSort : undefined}
                >
                  <div
                    className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}
                  >
                    {col.label}
                    {col.sortDir && (
                      <span className="text-[10px] text-blue-500">▼</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {dataArr.map((item, idx) => {
              const uniqueId = `${expandPrefix}_${tableKey ? getMode(tableKey) : ""}_${item.id || item.entityId}`;
              const isExpanded = expandPrefix && expandedRow === uniqueId;
              const isExpandable = !!expandPrefix && isRowExpandable(item);

              const handleRowClick = () => {
                if (isExpandable) toggleExpand(uniqueId);
                else if (onRowClick) onRowClick(item);
              };

              return (
                <React.Fragment key={idx}>
                  <tr
                    className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${isExpandable || onRowClick ? "cursor-pointer" : ""}`}
                    onClick={handleRowClick}
                    title={
                      isExpandable
                        ? "Click to view breakdown"
                        : onRowClick
                          ? "Click to view profile"
                          : ""
                    }
                  >
                    <td className="px-4 py-3 text-center font-semibold text-gray-500 dark:text-gray-400">
                      {isExpandable ? (
                        <span className="flex items-center justify-center gap-1">
                          <span
                            className={`text-[10px] transition-transform ${isExpanded ? "rotate-90 text-blue-500" : ""}`}
                          >
                            ▶
                          </span>
                          {idx + 1}
                        </span>
                      ) : (
                        idx + 1
                      )}
                    </td>
                    {renderRow(item)}
                  </tr>
                  {isExpanded && renderExpanded && (
                    <tr className="bg-gray-50 dark:bg-zinc-950/50">
                      <td
                        colSpan={columns.length + 1}
                        className="px-4 py-4 border-b border-gray-200 dark:border-gray-800"
                      >
                        <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                          <p className="font-semibold mb-2 text-blue-600 dark:text-sky-400">
                            {expandTitle}
                          </p>
                          <ul className="space-y-1.5">
                            {renderExpanded(item)}
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
  );

  const renderMatchDetail = (m, indexNumber, isBreaker = false) => {
    const resultColor =
      m.result === "WIN"
        ? "text-[#16a34a] dark:text-[#93c47d]"
        : m.result === "LOSS"
          ? "text-red-500"
          : m.result === "DRAW"
            ? "text-[#d97706] dark:text-[#ffe599]"
            : "text-gray-500";
    return (
      <li key={indexNumber} className="pl-1 flex items-start text-sm">
        <span
          className={`mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono ${isBreaker ? "line-through opacity-70" : ""}`}
        >
          {indexNumber}.
        </span>
        <div className="flex-1">
          <strong className={resultColor}>{m.result}</strong>{" "}
          {m.isTagTeamChampionship
            ? m.partners.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  {m.partners.map((pt, idx) => (
                    <React.Fragment key={pt.id}>
                      {idx > 0 && " & "}
                      <Link
                        href={`/wrestlers/${pt.id}`}
                        className="text-blue-600 dark:text-sky-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {pt.name}
                      </Link>
                    </React.Fragment>
                  ))}{" "}
                </span>
              )
            : m.partners.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  w/{" "}
                  {m.partners.map((pt, idx) => (
                    <React.Fragment key={pt.id}>
                      {idx > 0 && " & "}
                      <Link
                        href={`/wrestlers/${pt.id}`}
                        className="text-blue-600 dark:text-sky-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {pt.name}
                      </Link>
                    </React.Fragment>
                  ))}{" "}
                </span>
              )}
          {m.scoreStr ? (
            <span className="font-bold mx-1">{m.scoreStr}</span>
          ) : (
            <span className="text-gray-600 dark:text-gray-400 mx-1">vs</span>
          )}
          {m.opponents.map((opp, idx) => (
            <React.Fragment key={opp.id}>
              {idx > 0 && " & "}
              <Link
                href={`/wrestlers/${opp.id}`}
                className="text-blue-600 dark:text-sky-400"
                onClick={(e) => e.stopPropagation()}
              >
                {opp.name}
              </Link>
            </React.Fragment>
          ))}
          <span className="text-gray-500 text-[11px] ml-2 block sm:inline">
            (
            <Link
              href={`/events/${m.event_id}`}
              className="text-gray-500 dark:text-gray-400"
              onClick={(e) => e.stopPropagation()}
            >
              {m.event_name}
            </Link>
            )
          </span>
        </div>
      </li>
    );
  };

  const renderShowTitle = (logoSrc, alt) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Image
        src={logoSrc}
        alt={alt}
        width={64}
        height={24}
        className="h-5 w-auto object-contain inline-block"
      />
      <span>Records</span>
    </span>
  );

  const renderShowMatchesTable = (showKey, logoSrc, showLabel, dataField) => {
    const tableKey = `show_${showKey}`;
    const ctx = getTableCtx(tableKey);
    const showData = ctx.modeData?.[dataField];
    const sortKey = showSorts[showKey];
    const baseRows = Array.isArray(showData)
      ? showData
      : sortKey === "total_matches"
        ? showData?.byMatches || []
        : showData?.byWins || [];

    const sorted =
      sortKey === "win_percentage"
        ? [...baseRows].sort(
            (a, b) =>
              parseFloat(b.win_percentage) - parseFloat(a.win_percentage) ||
              b.wins - a.wins ||
              b.total_matches - a.total_matches ||
              (a.name || "").localeCompare(b.name || "")
          )
        : baseRows;

    return renderTable(
      renderShowTitle(logoSrc, showLabel),
      sorted,
      [
        { label: ctx.entityTitle },
        {
          label: "Matches",
          align: "right",
          onSort: () =>
            setShowSorts((prev) => ({ ...prev, [showKey]: "total_matches" })),
          sortDir: sortKey === "total_matches" ? "desc" : null,
        },
        {
          label: "Wins",
          align: "right",
          onSort: () =>
            setShowSorts((prev) => ({ ...prev, [showKey]: "wins" })),
          sortDir: sortKey === "wins" ? "desc" : null,
        },
        {
          label: "Win %",
          align: "right",
          onSort: () =>
            setShowSorts((prev) => ({ ...prev, [showKey]: "win_percentage" })),
          sortDir: sortKey === "win_percentage" ? "desc" : null,
        },
      ],
      (item) => (
        <>
          <td className="px-4 py-3 whitespace-nowrap">
            <Link
              href={`${ctx.entityUrl}/${item.id}`}
              className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <FlagWithName code={item.country} name={item.name} />
            </Link>
          </td>
          <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
            {item.total_matches}
          </td>
          <td className="px-4 py-3 text-right font-bold text-[#16a34a] dark:text-[#93c47d] whitespace-nowrap">
            {item.wins}
          </td>
          <td className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap">
            {item.win_percentage}%
          </td>
        </>
      ),
      `show_${showKey}`,
      (item) => (
        <>
          {[...(item.breakdown || [])]
            .sort((a, b) => b.count - a.count)
            .map((bd, idx) => (
              <li key={idx} className="pl-1 flex items-start text-sm">
                <span className="mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono text-right font-bold">
                  {bd.count}
                </span>
                {bd.id ? (
                  <Link
                    href={`${ctx.breakdownUrl}/${bd.id}`}
                    className="text-blue-600 dark:text-sky-400"
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
        </>
      ),
      ctx.breakdownTitle,
      (item) => item.breakdown?.length > 1,
      null,
      `${showLabel} Records`,
      tableKey,
    );
  };

  return (
    <>
      {/* Global View Switch Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded p-4 shadow-sm flex flex-wrap items-center justify-end gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            View:
          </span>
          <EntitySwitch
            viewMode={globalMode}
            onChange={handleGlobalModeChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {renderTable(
          "Most Matches",
          matchesCtx.modeData?.matches || [],
          [{ label: matchesCtx.entityTitle }, { label: "Matches", align: "right" }],
          (item) => (
            <>
              <td className="px-4 py-3">
                <Link
                  href={`${matchesCtx.entityUrl}/${item.id}`}
                  className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FlagWithName code={item.country} name={item.name} />
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-bold">{item.total}</td>
            </>
          ),
          "matches",
          (item) => (
            <>
              {item.breakdown
                ?.sort((a, b) => b.count - a.count)
                .map((bd, idx) => (
                  <li key={idx} className="pl-1 flex items-start text-sm">
                    <span className="mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono text-right font-bold">
                      {bd.count}
                    </span>
                    {bd.id ? (
                      <Link
                        href={`${matchesCtx.breakdownUrl}/${bd.id}`}
                        className="text-blue-600 dark:text-sky-400"
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
            </>
          ),
          matchesCtx.breakdownTitle,
          (item) => item.breakdown?.length > 1,
          null,
          null,
          "matches",
        )}

        <div className="md:col-span-2 lg:col-span-2">
          {renderTable(
            `Top ${topCtx.isWrestler ? "Wrestlers" : "Interpreters"} (Most Wins & Winrate)`,
            sortedTopStats,
            [
              { label: topCtx.entityTitle },
              { label: "Matches", align: "right" },
              {
                label: "Wins",
                align: "right",
                onSort: () => setTopSort({ key: "wins", dir: "desc" }),
                sortDir: topSort.key === "wins" ? "desc" : null,
              },
              {
                label: "Win %",
                align: "right",
                onSort: () =>
                  setTopSort({ key: "win_percentage", dir: "desc" }),
                sortDir: topSort.key === "win_percentage" ? "desc" : null,
              },
            ],
            (i) => (
              <>
                <td className="px-4 py-3">
                  <Link
                    href={`${topCtx.entityUrl}/${i.id}`}
                    className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2"
                  >
                    <FlagWithName code={i.country} name={i.name} />
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                  {i.total_matches}
                </td>
                <td className="px-4 py-3 text-right font-bold text-[#16a34a] dark:text-[#93c47d]">
                  {i.wins}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">
                  {i.win_percentage}%
                </td>
              </>
            ),
            null,
            null,
            "Match breakdown:",
            () => true,
            null,
            null,
            "topStats",
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-8">
        {renderShowMatchesTable("raw", SHOW_LOGOS.raw, "RAW", "rawMatches")}
        {renderShowMatchesTable("sd", SHOW_LOGOS.smackdown, "SmackDown", "smackdownMatches")}
        {renderShowMatchesTable("nxt", SHOW_LOGOS.nxt, "NXT", "nxtMatches")}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-8">
        {renderTable(
          "Longest Undefeated Streak",
          sortedUndefeated,
          [
            { label: undefCtx.entityTitle },
            {
              label: "Matches",
              align: "right",
              onSort: () => setUndefSort({ key: "count", dir: "desc" }),
              sortDir: undefSort.key === "count" ? "desc" : null,
            },
            {
              label: "Days",
              align: "right",
              onSort: () => setUndefSort({ key: "days", dir: "desc" }),
              sortDir: undefSort.key === "days" ? "desc" : null,
            },
          ],
          (s) => (
            <>
              <td className="px-4 py-3">
                <span className="font-semibold flex items-center gap-2">
                  <FlagWithName code={s.country} name={s.name} />
                </span>
              </td>
              <td className="px-4 py-3 text-right font-bold">{s.count}</td>
              <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-mono text-sm">
                {s.days}
                {!s.streakBreaker ? "+" : ""}
              </td>
            </>
          ),
          "undef",
          (s) => (
            <>
              {s.matches.map((m, i) => renderMatchDetail(m, i + 1, false))}
              {s.streakBreaker &&
                renderMatchDetail(s.streakBreaker, s.matches.length + 1, true)}
            </>
          ),
          "Match breakdown:",
          () => true,
          null,
          null,
          "undef",
        )}

        {renderTable(
          "Longest Win Streak",
          winCtx.modeData?.winStreaks || [],
          [{ label: winCtx.entityTitle }, { label: "Wins", align: "right" }],
          (s) => (
            <>
              <td className="px-4 py-3">
                <span className="font-semibold flex items-center gap-2">
                  <FlagWithName code={s.country} name={s.name} />
                </span>
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#16a34a] dark:text-[#93c47d]">
                {s.count}
              </td>
            </>
          ),
          "win",
          (s) => (
            <>
              {s.matches.map((m, i) => renderMatchDetail(m, i + 1, false))}
              {s.streakBreaker &&
                renderMatchDetail(s.streakBreaker, s.matches.length + 1, true)}
            </>
          ),
          "Match breakdown:",
          () => true,
          null,
          null,
          "win",
        )}
      </div>

      {/* 
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-8">
        {renderTable(
          "Longest Winless Streak",
          data?.winlessStreaks || [],
          [{ label: entityTitle }, { label: "Matches", align: "right" }],
          (s) => (
            <>
              <td className="px-4 py-3">
                <span className="font-semibold flex items-center gap-2">
                  <FlagWithName code={s.country} name={s.name} />
                </span>
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400">
                {s.count}
              </td>
            </>
          ),
          "winless",
          (s) => (
            <>
              {s.matches.map((m, i) => renderMatchDetail(m, i + 1, false))}
              {s.streakBreaker &&
                renderMatchDetail(s.streakBreaker, s.matches.length + 1, true)}
            </>
          ),
        )}

        {renderTable(
          "Longest Losing Streak",
          data?.losingStreaks || [],
          [{ label: entityTitle }, { label: "Losses", align: "right" }],
          (s) => (
            <>
              <td className="px-4 py-3">
                <span className="font-semibold flex items-center gap-2">
                  <FlagWithName code={s.country} name={s.name} />
                </span>
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#dc2626] dark:text-[#e06666]">
                {s.count}
              </td>
            </>
          ),
          "losing",
          (s) => (
            <>
              {s.matches.map((m, i) => renderMatchDetail(m, i + 1, false))}
              {s.streakBreaker &&
                renderMatchDetail(s.streakBreaker, s.matches.length + 1, true)}
            </>
          ),
        )}
      </div>
      */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-8">
        {renderTable(
          "Longest Reigns",
          sortedLongestReigns,
          [
            { label: "Champion" },
            { label: "Title" },
            {
              label: "Days",
              align: "right",
              onSort: () => setLrSort({ key: "days_held", dir: "desc" }),
              sortDir: lrSort.key === "days_held" ? "desc" : null,
            },
          ],
          (r) => (
            <>
              <td className="px-4 py-3 font-semibold text-blue-600 dark:text-sky-400">
                {r.tag_team_id && lrCtx.isWrestler ? (
                  r.tag_team_name
                ) : (
                  <div className="flex items-center gap-2">
                    <FlagWithName
                      code={r.country}
                      name={r.entity_name || "Unknown"}
                    />
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2" title={r.title_name}>
                  {r.image_url && (
                    <Image
                      src={r.image_url}
                      alt={r.title_name}
                      width={32}
                      height={32}
                      className="object-contain w-8 h-8"
                    />
                  )}
                  <span className="hidden sm:inline">
                    {(r.title_name || "").replace(" Championship", "")}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-gray-200 font-mono text-base">
                {r.days_held_label}
              </td>
            </>
          ),
          null,
          null,
          "Match breakdown:",
          () => false,
          (r) => {
            if (r.tag_team_id && lrCtx.isWrestler)
              router.push(`/stables/${r.tag_team_id}`);
            else if (r.wrestler_id) router.push(`/wrestlers/${r.wrestler_id}`);
            else if (r.interpreter_id)
              router.push(`/interpreters/${r.interpreter_id}`);
          },
          null,
          "longestReigns",
        )}

        {renderTable(
          "Most Defenses in a Reign",
          sortedMostDefenses,
          [
            { label: "Champion" },
            { label: "Title" },
            {
              label: "Defenses",
              align: "right",
              onSort: () => setMdSort({ key: "defenses_count", dir: "desc" }),
              sortDir: mdSort.key === "defenses_count" ? "desc" : null,
            },
          ],
          (r) => (
            <>
              <td className="px-4 py-3">
                {r.tag_team_id && mdCtx.isWrestler ? (
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {r.tag_team_name}
                  </span>
                ) : (
                  <span className="font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
                    <FlagWithName
                      code={r.country}
                      name={r.entity_name || "Unknown"}
                    />
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2" title={r.title_name}>
                  {r.image_url && (
                    <Image
                      src={r.image_url}
                      alt={r.title_name}
                      width={32}
                      height={32}
                      className="object-contain w-8 h-8"
                    />
                  )}
                  <span className="hidden sm:inline">
                    {(r.title_name || "").replace(" Championship", "")}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white">
                {r.defenses_count}
              </td>
            </>
          ),
          "md",
          (r) => (
            <>
              {r.defenses.length > 0 ? (
                r.defenses.map((m, i) => renderMatchDetail(m, i + 1, false))
              ) : (
                <li className="text-gray-500 dark:text-gray-400 text-sm italic pl-1">
                  No successful defenses.
                </li>
              )}
              {r.streakBreaker &&
                renderMatchDetail(r.streakBreaker, r.defenses.length + 1, true)}
            </>
          ),
          "Match breakdown:",
          () => true,
          null,
          null,
          "mostDefenses",
        )}
      </div>

      {/* Total Championships Table (Full Width) */}
      <div data-screenshot-target="true" className="mt-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden">
        <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            Total Championships
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <EntitySwitch
              viewMode={tcCtx.mode}
              onChange={(m) => setTableMode("totalChampionships", m)}
            />
            <TableScreenshotButton title="Total Championships" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-950 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider font-bold">
                <th
                  rowSpan={2}
                  className="px-3 py-2.5 text-center border border-gray-200 dark:border-gray-800 w-12 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleTcSort("rank")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>N.°</span>
                    <span className="text-[10px] text-blue-500">
                      {tcSort.key === "rank" ? (
                        tcSort.dir === "asc" ? (
                          "▲"
                        ) : (
                          "▼"
                        )
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                <th
                  rowSpan={2}
                  className="px-4 py-2.5 text-left border border-gray-200 dark:border-gray-800 min-w-[180px] cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleTcSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span>{tcCtx.entityTitle}</span>
                    <span className="text-[10px] text-blue-500">
                      {tcSort.key === "name" ? (
                        tcSort.dir === "asc" ? (
                          "▲"
                        ) : (
                          "▼"
                        )
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                {presentCategories.map((cat) => (
                  <th
                    key={cat.type}
                    colSpan={cat.championships.length}
                    className="px-3 py-2 text-center border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900/80 font-bold"
                  >
                    {cat.label}
                  </th>
                ))}

                <th
                  rowSpan={2}
                  className="px-3 py-2.5 text-center border border-gray-200 dark:border-gray-800 w-16 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleTcSort("total")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Total</span>
                    <span className="text-[10px] text-blue-500">
                      {tcSort.key === "total" ? (
                        tcSort.dir === "desc" ? (
                          "▼"
                        ) : (
                          "▲"
                        )
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>
              </tr>

              <tr className="bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 text-xs">
                {presentCategories.flatMap((cat) =>
                  cat.championships.map((champ) => {
                    const isSorted = tcSort.key === `champ_${champ.id}`;
                    return (
                      <th
                        key={champ.id}
                        className="px-2 py-2 text-center border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none min-w-[58px]"
                        onClick={() => handleTcSort(`champ_${champ.id}`)}
                        title={champ.title_name}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          {champ.image_url ? (
                            <div className="relative w-10 h-7 flex items-center justify-center">
                              <Image
                                src={champ.image_url}
                                alt={champ.title_name}
                                title={champ.title_name}
                                width={40}
                                height={28}
                                className="object-contain max-h-7 w-auto hover:scale-110 transition-transform drop-shadow-sm"
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold truncate max-w-[50px]">
                              {champ.title_name.replace(" Championship", "")}
                            </span>
                          )}
                          <span className="text-[10px] text-blue-500 leading-none">
                            {isSorted ? (
                              tcSort.dir === "desc" ? (
                                "▼"
                              ) : (
                                "▲"
                              )
                            ) : (
                              <span className="opacity-30 text-gray-400">
                                ⬍
                              </span>
                            )}
                          </span>
                        </div>
                      </th>
                    );
                  }),
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sortedTotalChampionships.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <td className="px-3 py-2.5 text-center font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 text-sm">
                    {item.rank}
                  </td>

                  <td className="px-4 py-2.5 font-semibold text-blue-600 dark:text-sky-400 border border-gray-200 dark:border-gray-800 text-sm">
                    <Link
                      href={`${tcCtx.entityUrl}/${item.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <FlagWithName code={item.country} name={item.name} />
                    </Link>
                  </td>

                  {presentCategories.flatMap((cat) =>
                    cat.championships.map((champ) => {
                      const count = item.counts[champ.id] || 0;
                      return (
                        <td
                          key={champ.id}
                          className="px-2 py-2.5 text-center font-mono text-sm border border-gray-200 dark:border-gray-800"
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
                    }),
                  )}

                  <td className="px-3 py-2.5 text-center font-bold font-mono text-sm border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-zinc-900/70 text-gray-900 dark:text-white">
                    {item.total}
                  </td>
                </tr>
              ))}

              {sortedTotalChampionships.length === 0 && (
                <tr>
                  <td
                    colSpan={championships.length + 3}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No championships recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Most Appearances at PLEs Table (Full Width) */}
      <div data-screenshot-target="true" className="mt-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden">
        <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            Most Appearances at PLEs
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <EntitySwitch
              viewMode={pleCtx.mode}
              onChange={(m) => setTableMode("pleAppearances", m)}
            />
            <TableScreenshotButton title="Most Appearances at PLEs" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-950 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider font-bold">
                <th
                  className="px-4 py-2.5 text-center border border-gray-200 dark:border-gray-800 w-12 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handlePleSort("rank")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>#</span>
                    <span className="text-[10px] text-blue-500">
                      {pleSort.key === "rank" ? (
                        pleSort.dir === "asc" ? (
                          "▲"
                        ) : (
                          "▼"
                        )
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                <th
                  className="px-4 py-2.5 text-left border border-gray-200 dark:border-gray-800 min-w-[180px] cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handlePleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span>{pleCtx.entityTitle}</span>
                    <span className="text-[10px] text-blue-500">
                      {pleSort.key === "name" ? (
                        pleSort.dir === "asc" ? (
                          "▲"
                        ) : (
                          "▼"
                        )
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                <th
                  className="px-4 py-2.5 text-center border border-gray-200 dark:border-gray-800 w-20 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handlePleSort("count")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>N°</span>
                    <span className="text-[10px] text-blue-500">
                      {pleSort.key === "count" ? (
                        pleSort.dir === "desc" ? (
                          "▼"
                        ) : (
                          "▲"
                        )
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                <th
                  className="px-4 py-2.5 text-center border border-gray-200 dark:border-gray-800 w-24 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handlePleSort("firstYear")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>First</span>
                    <span className="text-[10px] text-blue-500">
                      {pleSort.key === "firstYear" ? (
                        pleSort.dir === "asc" ? (
                          "▲"
                        ) : (
                          "▼"
                        )
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                <th
                  className="px-4 py-2.5 text-left border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handlePleSort("firstEvent")}
                >
                  <div className="flex items-center gap-1">
                    <span>First Event</span>
                    <span className="text-[10px] text-blue-500">
                      {pleSort.key === "firstEvent" ? (
                        pleSort.dir === "asc" ? (
                          "▲"
                        ) : (
                          "▼"
                        )
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                <th
                  className="px-4 py-2.5 text-center border border-gray-200 dark:border-gray-800 w-24 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handlePleSort("lastYear")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Last</span>
                    <span className="text-[10px] text-blue-500">
                      {pleSort.key === "lastYear" ? (
                        pleSort.dir === "desc" ? (
                          "▼"
                        ) : (
                          "▲"
                        )
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                <th
                  className="px-4 py-2.5 text-left border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handlePleSort("lastEvent")}
                >
                  <div className="flex items-center gap-1">
                    <span>Last Event</span>
                    <span className="text-[10px] text-blue-500">
                      {pleSort.key === "lastEvent" ? (
                        pleSort.dir === "asc" ? (
                          "▲"
                        ) : (
                          "▼"
                        )
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sortedPleAppearances.map((item) => {
                const uniqueId = `ple_${pleCtx.mode}_${item.id}`;
                const isExpanded = expandedRow === uniqueId;
                const isExpandable =
                  item.breakdown && item.breakdown.length > 1;

                const handleRowClick = () => {
                  if (isExpandable) toggleExpand(uniqueId);
                };

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors ${
                        isExpandable ? "cursor-pointer" : ""
                      }`}
                      onClick={handleRowClick}
                      title={isExpandable ? "Click to view breakdown" : ""}
                    >
                      <td className="px-4 py-2.5 text-center font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 text-sm">
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

                      <td className="px-4 py-2.5 font-semibold text-blue-600 dark:text-sky-400 border border-gray-200 dark:border-gray-800 text-sm">
                        <Link
                          href={`${pleCtx.entityUrl}/${item.id}`}
                          className="flex items-center gap-2 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FlagWithName code={item.country} name={item.name} />
                        </Link>
                      </td>

                      <td className="px-4 py-2.5 text-center font-bold font-mono text-sm border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
                        {item.count}
                      </td>

                      <td className="px-4 py-2.5 text-center font-mono text-sm border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300">
                        {item.firstEvent?.year || "—"}
                      </td>

                      <td className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200">
                        {item.firstEvent ? (
                          <div className="flex items-center gap-2">
                            {item.firstEvent.image_url && (
                              <div className="relative w-6 h-5 flex-shrink-0 flex items-center justify-center">
                                <Image
                                  src={item.firstEvent.image_url}
                                  alt={item.firstEvent.name}
                                  width={24}
                                  height={20}
                                  className="object-contain max-h-5 max-w-6 w-auto h-auto drop-shadow-sm"
                                />
                              </div>
                            )}
                            <Link
                              href={`/events/${item.firstEvent.id}`}
                              className="text-blue-600 dark:text-sky-400 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.firstEvent.name}
                            </Link>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-2.5 text-center font-mono text-sm border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300">
                        {item.lastEvent?.year || "—"}
                      </td>

                      <td className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200">
                        {item.lastEvent ? (
                          <div className="flex items-center gap-2">
                            {item.lastEvent.image_url && (
                              <div className="relative w-6 h-5 flex-shrink-0 flex items-center justify-center">
                                <Image
                                  src={item.lastEvent.image_url}
                                  alt={item.lastEvent.name}
                                  width={24}
                                  height={20}
                                  className="object-contain max-h-5 max-w-6 w-auto h-auto drop-shadow-sm"
                                />
                              </div>
                            )}
                            <Link
                              href={`/events/${item.lastEvent.id}`}
                              className="text-blue-600 dark:text-sky-400 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.lastEvent.name}
                            </Link>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-gray-50 dark:bg-zinc-950/50">
                        <td
                          colSpan={7}
                          className="px-4 py-4 border-b border-gray-200 dark:border-gray-800"
                        >
                          <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                            <p className="font-semibold mb-2 text-blue-600 dark:text-sky-400">
                              {pleCtx.breakdownTitle}
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
                                      href={`${pleCtx.breakdownUrl}/${bd.id}`}
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

              {sortedPleAppearances.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No PLE appearances recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
