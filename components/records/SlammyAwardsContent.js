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
    if (extraEntities && extraEntities.length > 0) {
      return (
        <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {extraEntities.map((ent, idx) => (
            <React.Fragment key={ent.id || idx}>
              {idx > 0 && <span className="mx-1 text-gray-500 font-medium">vs.</span>}
              <Link
                href={`${entityUrl}/${ent.id}`}
                className="text-blue-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <FlagWithName code={ent.country} name={ent.name} />
              </Link>
            </React.Fragment>
          ))}
        </div>
      );
    }

    // Fallback: parse rich text for stables/wrestlers in winner_name (e.g. Hart Re-Foundation vs. The Vision)
    return (
      <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 font-medium">
        {renderRichText(award.winner_name, lookupEntities, isWrestler, wrestlerToInterpreter)}
      </div>
    );
  }

  // Pattern 4: Match of the Year
  if (categoryName.includes("match")) {
    let primaryContent;

    if (extraEntities && extraEntities.length > 0) {
      let matchPrefix = "";
      if (award.winner_name && award.winner_name.includes(":")) {
        matchPrefix = award.winner_name.split(":")[0] + ": ";
      }

      primaryContent = (
        <div>
          {matchPrefix && (
            <span className="font-semibold text-gray-900 dark:text-white mr-1">
              {matchPrefix}
            </span>
          )}
          {extraEntities.map((ent, idx) => (
            <React.Fragment key={ent.id || idx}>
              {idx > 0 && <span className="mx-1 text-gray-500 font-medium">vs.</span>}
              <Link
                href={`${entityUrl}/${ent.id}`}
                className="text-blue-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <FlagWithName code={ent.country} name={ent.name} />
              </Link>
            </React.Fragment>
          ))}
        </div>
      );
    } else {
      primaryContent = (
        <div className="font-medium text-gray-900 dark:text-white">
          {renderRichText(award.winner_name, lookupEntities, isWrestler, wrestlerToInterpreter)}
        </div>
      );
    }

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
  const {
    categories = [],
    years = [],
    awardsMatrix = {},
    allStables = [],
    allWrestlers = [],
    allInterpreters = [],
    royalRumblesByYear = {},
  } = data || {};

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
  );
}
