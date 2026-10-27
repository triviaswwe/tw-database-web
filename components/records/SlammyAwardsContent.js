// components/records/SlammyAwardsContent.js
import React from "react";
import Link from "next/link";
import FlagWithName from "../FlagWithName";

function normalizeText(str) {
  if (!str) return "";
  return str.replace(/[\u2018\u2019\u00B4\u02BC`]/g, "'");
}

function renderEntityNode(entity, label, isWrestler, wrestlerToInterpreter) {
  if (entity.type === "stable") {
    return (
      <Link
        key={`${entity.type}_${entity.id}_${label}`}
        href={`/stables/${entity.id}`}
        className="text-blue-600 dark:text-sky-400 hover:underline font-semibold"
      >
        {label}
      </Link>
    );
  }

  // If viewing Per Interpreter and this is a wrestler that has an interpreter in that match/general:
  if (!isWrestler && entity.type === "wrestler" && wrestlerToInterpreter) {
    const normKey = normalizeText(entity.name).toLowerCase();
    const interp = wrestlerToInterpreter[normKey];
    if (interp) {
      return (
        <Link
          key={`interp_${interp.id}_${interp.name}`}
          href={`/interpreters/${interp.id}`}
          className="text-blue-600 dark:text-sky-400 hover:underline font-medium inline-flex items-center gap-1 mx-0.5"
        >
          <FlagWithName code={interp.country} name={interp.name} />
        </Link>
      );
    }
  }

  const url = isWrestler ? `/wrestlers/${entity.id}` : `/interpreters/${entity.id}`;
  return (
    <Link
      key={`${entity.type}_${entity.id}_${label}`}
      href={url}
      className="text-blue-600 dark:text-sky-400 hover:underline font-medium inline-flex items-center gap-1 mx-0.5"
    >
      <FlagWithName code={entity.country} name={label} />
    </Link>
  );
}

function isWordBoundary(char) {
  if (!char) return true;
  return !/[a-zA-Z0-9]/.test(char);
}

function renderRichText(text, entities, isWrestler, wrestlerToInterpreter = null, depth = 0) {
  if (!text || depth > 20) return text;

  const normText = normalizeText(text).toLowerCase();
  let bestMatch = null;
  let bestIndex = Infinity;

  for (const ent of entities) {
    const entName = normalizeText(ent.name).toLowerCase();
    if (!entName || entName.length < 2) continue;

    let searchStart = 0;
    while (searchStart < normText.length) {
      const idx = normText.indexOf(entName, searchStart);
      if (idx === -1) break;

      const charBefore = idx > 0 ? normText[idx - 1] : null;
      const charAfter = idx + entName.length < normText.length ? normText[idx + entName.length] : null;

      if (isWordBoundary(charBefore) && isWordBoundary(charAfter)) {
        if (
          idx < bestIndex ||
          (idx === bestIndex && entName.length > (bestMatch?.length || 0))
        ) {
          bestIndex = idx;
          bestMatch = { entity: ent, index: idx, length: entName.length };
        }
        break;
      }

      searchStart = idx + 1;
    }
  }

  if (!bestMatch) return text;

  const before = text.slice(0, bestMatch.index);
  const matchedText = text.slice(bestMatch.index, bestMatch.index + bestMatch.length);
  const after = text.slice(bestMatch.index + bestMatch.length);

  return (
    <React.Fragment key={depth}>
      {before}
      {renderEntityNode(bestMatch.entity, matchedText, isWrestler, wrestlerToInterpreter)}
      {renderRichText(after, entities, isWrestler, wrestlerToInterpreter, depth + 1)}
    </React.Fragment>
  );
}

function SlammyAwardCell({ award, isWrestler, lookupEntities = [], royalRumblesByYear = {} }) {
  if (!award) {
    return (
      <span className="text-gray-400 dark:text-gray-600 select-none font-mono">
        —
      </span>
    );
  }

  const entityUrl = isWrestler ? "/wrestlers" : "/interpreters";
  const mainEntity = isWrestler ? award.wrestler : award.interpreter;
  const extraEntities = isWrestler ? award.extra_wrestlers : award.extra_interpreters;
  const categoryName = (award.category_name || "").toLowerCase();
  const wrestlerToInterpreter = award.wrestler_to_interpreter || null;

  // Pattern 1: Single individual entity award (Superstar of the Year, Rookie of the Year, NXT Superstar, Most Matches)
  const isIndividualCategory =
    categoryName.includes("superstar") ||
    categoryName.includes("rookie") ||
    categoryName.includes("matches");

  const nameMatches =
    mainEntity &&
    award.winner_name &&
    normalizeText(award.winner_name).trim().toLowerCase() ===
      normalizeText(mainEntity.name).trim().toLowerCase();

  if (
    mainEntity &&
    (!extraEntities || extraEntities.length === 0) &&
    (isIndividualCategory || !award.winner_name || nameMatches)
  ) {
    return (
      <div className="flex items-center justify-center">
        <Link
          href={`${entityUrl}/${mainEntity.id}`}
          className="text-blue-600 dark:text-sky-400 hover:underline font-medium inline-flex items-center gap-1.5"
        >
          <FlagWithName code={mainEntity.country} name={mainEntity.name} />
        </Link>
      </div>
    );
  }

  // Pattern 2: OMG! Moment of the Year (Sentence with protagonist wrestler/interpreter and event)
  if (mainEntity && (categoryName.includes("omg") || categoryName.includes("moment"))) {
    let restText = award.winner_name || "";
    const normWinner = normalizeText(award.winner_name || "").toLowerCase();
    const normMain = normalizeText(mainEntity.name).toLowerCase();

    if (normWinner.startsWith(normMain)) {
      restText = (award.winner_name || "").slice(mainEntity.name.length);
    }

    // Determine target event ID and search term
    const mentionsRoyalRumble = /royal\s+rumble/i.test(restText);
    const royalRumbleEventId =
      royalRumblesByYear[award.year] ||
      (award.year === 2024 ? 153 : award.year === 2025 ? 333 : null);

    let targetEventId = null;
    let eventSearchTerm = null;

    if (mentionsRoyalRumble) {
      targetEventId = royalRumbleEventId || award.event?.id;
      eventSearchTerm = "Royal Rumble";
    } else if (award.event && award.event.name) {
      targetEventId = award.event.id;
      eventSearchTerm = award.event.name;
    }

    let beforeEvent = restText;
    let eventNode = null;
    let afterEvent = "";

    if (targetEventId && eventSearchTerm) {
      const normRest = normalizeText(restText).toLowerCase();
      const normEv = normalizeText(eventSearchTerm).toLowerCase();
      const evIdx = normRest.indexOf(normEv);

      if (evIdx !== -1) {
        beforeEvent = restText.slice(0, evIdx);
        const matchedEvName = restText.slice(evIdx, evIdx + eventSearchTerm.length);
        afterEvent = restText.slice(evIdx + eventSearchTerm.length);
        eventNode = (
          <Link
            href={`/events/${targetEventId}`}
            className="text-blue-600 dark:text-sky-400 hover:underline font-semibold"
          >
            {matchedEvName}
          </Link>
        );
      }
    }

    return (
      <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
        <Link
          href={`${entityUrl}/${mainEntity.id}`}
          className="text-blue-600 dark:text-sky-400 hover:underline font-medium inline-flex items-center gap-1 mr-1"
        >
          <FlagWithName code={mainEntity.country} name={mainEntity.name} />
        </Link>
        <span>{beforeEvent}</span>
        {eventNode}
        <span>{afterEvent}</span>
        {award.subtext && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ({award.subtext})
          </div>
        )}
      </div>
    );
  }

  // Pattern 3: Rivalry of the Year
  if (categoryName.includes("rivalry")) {
    return (
      <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 font-medium">
        {renderRichText(award.winner_name, lookupEntities, isWrestler, wrestlerToInterpreter)}
      </div>
    );
  }

  // Pattern 4: Match of the Year
  if (categoryName.includes("match")) {
    const primaryContent = (
      <div className="font-medium text-gray-900 dark:text-white">
        {renderRichText(award.winner_name, lookupEntities, isWrestler, wrestlerToInterpreter)}
      </div>
    );

    return (
      <div className="text-sm leading-relaxed space-y-1">
        {primaryContent}
        {(award.event || award.subtext) && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            (
            {award.event ? (
              <Link
                href={`/events/${award.event.id}`}
                className="text-blue-600 dark:text-sky-400 hover:underline"
              >
                {award.subtext || award.event.name}
              </Link>
            ) : (
              <span>{award.subtext}</span>
            )}
            )
          </div>
        )}
      </div>
    );
  }

  // Pattern 5: Tag Team & Faction of the Year (Stable + members in parens)
  if (award.stable || categoryName.includes("tag team") || categoryName.includes("faction")) {
    return (
      <div className="text-sm leading-relaxed space-y-1">
        <div>
          {award.stable ? (
            <Link
              href={`/stables/${award.stable.id}`}
              className="text-blue-600 dark:text-sky-400 hover:underline font-semibold"
            >
              {award.winner_name || award.stable.name}
            </Link>
          ) : (
            <span className="font-semibold text-gray-900 dark:text-white">
              {renderRichText(award.winner_name, lookupEntities, isWrestler, wrestlerToInterpreter)}
            </span>
          )}
        </div>

        {(extraEntities?.length > 0 || award.event || award.subtext) && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            (
            {extraEntities?.length > 0 ? (
              extraEntities.map((ent, idx) => (
                <React.Fragment key={ent.id || idx}>
                  {idx > 0 && (idx === extraEntities.length - 1 ? " & " : ", ")}
                  <Link
                    href={`${entityUrl}/${ent.id}`}
                    className="text-blue-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 mx-0.5"
                  >
                    <FlagWithName code={ent.country} name={ent.name} />
                  </Link>
                </React.Fragment>
              ))
            ) : award.event ? (
              <Link
                href={`/events/${award.event.id}`}
                className="text-blue-600 dark:text-sky-400 hover:underline"
              >
                {award.subtext || award.event.name}
              </Link>
            ) : (
              <span>{award.subtext}</span>
            )}
            )
          </div>
        )}
      </div>
    );
  }

  // Default fallback: parse any recognized entities in winner_name
  return (
    <div className="text-sm leading-relaxed space-y-1">
      <div>{renderRichText(award.winner_name, lookupEntities, isWrestler, wrestlerToInterpreter)}</div>
      {(award.event || award.subtext) && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          ({award.subtext || award.event?.name})
        </div>
      )}
    </div>
  );
}

export default function SlammyAwardsContent({ data, type }) {
  const isWrestler = type === "wrestler";
  const entityUrl = isWrestler ? "/wrestlers" : "/interpreters";
  const breakdownTitle = isWrestler ? "Interpreters breakdown:" : "Wrestlers breakdown:";
  const breakdownUrl = isWrestler ? "/interpreters" : "/wrestlers";

  const {
    categories = [],
    years = [],
    awardsMatrix = {},
    rankingList = [],
    allStables = [],
    allWrestlers = [],
    allInterpreters = [],
    royalRumblesByYear = {},
  } = data || {};

  const [expandedRow, setExpandedRow] = React.useState(null);
  const toggleExpand = (key) => setExpandedRow((prev) => (prev === key ? null : key));

  const [sortConfig, setSortConfig] = React.useState({ key: "rank", dir: "asc" });
  const [catSortConfig, setCatSortConfig] = React.useState({ key: "rank", dir: "asc" });

  React.useEffect(() => {
    setSortConfig({ key: "rank", dir: "asc" });
    setCatSortConfig({ key: "rank", dir: "asc" });
    setExpandedRow(null);
  }, [type]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      const defaultDir = key === "rank" || key === "name" ? "asc" : "desc";
      return { key, dir: defaultDir };
    });
  };

  const handleCatSort = (key) => {
    setCatSortConfig((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      const defaultDir = key === "rank" || key === "name" ? "asc" : "desc";
      return { key, dir: defaultDir };
    });
  };

  const sortedRanking = React.useMemo(() => {
    return [...rankingList].sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === "rank") {
        comparison = a.rank - b.rank;
      } else if (sortConfig.key === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortConfig.key === "total") {
        comparison = b.total - a.total;
      } else if (sortConfig.key.startsWith("year_")) {
        const yr = sortConfig.key.replace("year_", "");
        const valA = a.yearCounts?.[yr] ?? a.counts?.[yr] ?? 0;
        const valB = b.yearCounts?.[yr] ?? b.counts?.[yr] ?? 0;
        comparison = valB - valA;
      }

      if (comparison === 0) {
        if (b.total !== a.total) return b.total - a.total;
        for (const yr of years) {
          const cA = a.yearCounts?.[yr] ?? a.counts?.[yr] ?? 0;
          const cB = b.yearCounts?.[yr] ?? b.counts?.[yr] ?? 0;
          if (cB !== cA) return cB - cA;
        }
        return a.name.localeCompare(b.name);
      }

      return sortConfig.dir === "asc" ? comparison : -comparison;
    });
  }, [rankingList, sortConfig, years]);

  const sortedRankingCategory = React.useMemo(() => {
    return [...rankingList].sort((a, b) => {
      let comparison = 0;
      if (catSortConfig.key === "rank") {
        comparison = a.rank - b.rank;
      } else if (catSortConfig.key === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (catSortConfig.key === "total") {
        comparison = b.total - a.total;
      } else if (catSortConfig.key.startsWith("cat_")) {
        const catId = catSortConfig.key.replace("cat_", "");
        const valA = a.categoryCounts?.[catId] || 0;
        const valB = b.categoryCounts?.[catId] || 0;
        comparison = valB - valA;
      }

      if (comparison === 0) {
        if (b.total !== a.total) return b.total - a.total;
        return a.name.localeCompare(b.name);
      }

      return catSortConfig.dir === "asc" ? comparison : -comparison;
    });
  }, [rankingList, catSortConfig]);

  // Build entity lookup list sorted by length descending
  const lookupEntities = React.useMemo(() => {
    const stableItems = [];
    for (const s of allStables || []) {
      stableItems.push({ type: "stable", id: s.id, name: s.name });
      const lower = s.name.toLowerCase();
      if (!lower.startsWith("the ")) {
        stableItems.push({ type: "stable", id: s.id, name: `The ${s.name}` });
      } else {
        stableItems.push({ type: "stable", id: s.id, name: s.name.replace(/^the\s+/i, "") });
      }
    }

    const wrestlers = (allWrestlers || []).map((w) => ({
      type: "wrestler",
      id: w.id,
      name: w.name,
      country: w.country,
    }));

    const interpreters = (allInterpreters || []).map((i) => ({
      type: "interpreter",
      id: i.id,
      name: i.name,
      country: i.country,
    }));

    return [...stableItems, ...wrestlers, ...interpreters].sort(
      (a, b) => b.name.length - a.name.length
    );
  }, [allStables, allWrestlers, allInterpreters]);

  return (
    <div className="space-y-8">
      {/* Matrix Table: Trivias WWE Slammy Awards */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden">
        <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            Trivias WWE Slammy Awards
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-950 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider font-bold">
                <th className="px-4 py-3 text-left md:text-center border border-gray-200 dark:border-gray-800 w-48 md:w-60 min-w-[180px]">
                  Category
                </th>
                {years.map((year) => (
                  <th
                    key={year}
                    className="px-4 py-3 text-center border border-gray-200 dark:border-gray-800 min-w-[220px]"
                  >
                    {year}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="px-4 py-3.5 font-bold border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white bg-gray-50/50 dark:bg-zinc-900/40 text-sm text-left md:text-center leading-snug">
                    {cat.name}
                  </td>

                  {years.map((year) => {
                    const award = awardsMatrix[`${cat.id}_${year}`];
                    return (
                      <td
                        key={year}
                        className="px-4 py-3.5 text-center border border-gray-200 dark:border-gray-800 text-sm align-middle"
                      >
                        <SlammyAwardCell
                          award={award}
                          isWrestler={isWrestler}
                          lookupEntities={lookupEntities}
                          royalRumblesByYear={royalRumblesByYear}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}

              {categories.length === 0 && (
                <tr>
                  <td
                    colSpan={years.length + 1}
                    className="px-4 py-12 text-center text-gray-500 dark:text-gray-400 text-sm"
                  >
                    No Slammy Awards recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ranking Table: Total Slammy Awards per Year */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden">
        <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            Total Slammy Awards per Year
          </h2>
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

                {years.map((year) => (
                  <th
                    key={year}
                    className="px-4 py-3 text-center border border-gray-200 dark:border-gray-800 w-24 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                    onClick={() => handleSort(`year_${year}`)}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{year}</span>
                      <span className="text-[10px] text-blue-500">
                        {sortConfig.key === `year_${year}` ? (
                          sortConfig.dir === "desc" ? "▼" : "▲"
                        ) : (
                          <span className="opacity-40 text-gray-400">⬍</span>
                        )}
                      </span>
                    </div>
                  </th>
                ))}

                <th
                  className="px-4 py-3 text-center border border-gray-200 dark:border-gray-800 w-24 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleSort("total")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Total</span>
                    <span className="text-[10px] text-blue-500">
                      {sortConfig.key === "total" ? (
                        sortConfig.dir === "desc" ? "▼" : "▲"
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sortedRanking.map((item) => {
                const uniqueId = `year_${item.id}`;
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

                      {years.map((year) => {
                        const count = item.yearCounts?.[year] ?? item.counts?.[year];
                        return (
                          <td
                            key={year}
                            className="px-4 py-3 text-center border border-gray-200 dark:border-gray-800 text-sm font-mono"
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

                      <td className="px-4 py-3 text-center border border-gray-200 dark:border-gray-800 text-sm font-mono font-bold text-gray-900 dark:text-white">
                        {item.total}
                      </td>
                    </tr>

                    {isExpanded && isExpandable && (
                      <tr className="bg-gray-50 dark:bg-zinc-950/50">
                        <td
                          colSpan={years.length + 3}
                          className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 text-left"
                        >
                          <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                            <p className="font-semibold mb-2 text-blue-600 dark:text-sky-400">
                              {breakdownTitle}
                            </p>
                            <ul className="space-y-1.5">
                              {item.breakdown?.map((bd, idx) => (
                                <li key={idx} className="pl-1 flex items-start text-sm">
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

              {sortedRanking.length === 0 && (
                <tr>
                  <td
                    colSpan={years.length + 3}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm"
                  >
                    No Slammy Awards recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ranking Table: Total Slammy Awards per Category */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden">
        <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            Total Slammy Awards per Category
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-950 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider font-bold">
                <th
                  className="px-3 py-3 w-14 text-center border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleCatSort("rank")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>#</span>
                    <span className="text-[10px] text-blue-500">
                      {catSortConfig.key === "rank" ? (
                        catSortConfig.dir === "asc" ? "▲" : "▼"
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                <th
                  className="px-4 py-3 text-left border border-gray-200 dark:border-gray-800 min-w-[200px] cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleCatSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span>{isWrestler ? "Wrestler" : "Interpreter"}</span>
                    <span className="text-[10px] text-blue-500">
                      {catSortConfig.key === "name" ? (
                        catSortConfig.dir === "asc" ? "▲" : "▼"
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>

                {categories.map((cat) => (
                  <th
                    key={cat.id}
                    className="px-3 py-3 text-center border border-gray-200 dark:border-gray-800 min-w-[130px] max-w-[180px] cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none text-xs leading-tight"
                    onClick={() => handleCatSort(`cat_${cat.id}`)}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-blue-500 shrink-0">
                        {catSortConfig.key === `cat_${cat.id}` ? (
                          catSortConfig.dir === "desc" ? "▼" : "▲"
                        ) : (
                          <span className="opacity-40 text-gray-400">⬍</span>
                        )}
                      </span>
                    </div>
                  </th>
                ))}

                <th
                  className="px-4 py-3 text-center border border-gray-200 dark:border-gray-800 w-24 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                  onClick={() => handleCatSort("total")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Total</span>
                    <span className="text-[10px] text-blue-500">
                      {catSortConfig.key === "total" ? (
                        catSortConfig.dir === "desc" ? "▼" : "▲"
                      ) : (
                        <span className="opacity-40 text-gray-400">⬍</span>
                      )}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sortedRankingCategory.map((item) => {
                const uniqueId = `cat_${item.id}`;
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

                      <td className="px-4 py-3 text-center border border-gray-200 dark:border-gray-800 text-sm font-mono font-bold text-gray-900 dark:text-white">
                        {item.total}
                      </td>
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
                                <li key={idx} className="pl-1 flex items-start text-sm">
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

              {sortedRankingCategory.length === 0 && (
                <tr>
                  <td
                    colSpan={categories.length + 3}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm"
                  >
                    No Slammy Awards recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
