// pages/championships.js
// Refactorizado: lógica extraída a hooks/useChampionshipSort y hooks/useChampionshipStats

import React, { useMemo, useState } from "react";
import Head from "next/head";
import useSWR from "swr";
import Link from "next/link";
import FlagWithName from "../components/FlagWithName";
import { useChampionshipSort } from "../hooks/useChampionshipSort";
import { useChampionshipStats } from "../hooks/useChampionshipStats";
import { formatEnglishDate } from "../hooks/useChampionshipHelpers";

const fetcher = (url) => fetch(url).then((r) => r.json());

const aggColumns = [
  { label: "#" },
  { label: "Champion" },
  { label: "Interpreter" },
  { label: "Reigns" },
  { label: "Successful defenses" },
  { label: "Total days" },
];

const tableColumns = [
  { label: "#", key: "index" },
  { label: "Champion", key: "champion" },
  { label: "Interpreter", key: "interpreter" },
  { label: "Won Date", key: "won_date" },
  { label: "Event", key: "event" },
  { label: "Reign #", key: "reign_number" },
  { label: "Days Held", key: "days_held" },
  { label: "Notes", key: "notes", widthClass: "w-[25%]" },
];

export default function ChampionshipsPage() {
  const [sel, setSel] = useState(null);
  const [interpreterSort, setInterpreterSort] = useState({ key: "Total days", dir: "desc" });

  // ─── Datos desde API ──────────────────────────────────────────────────────
  const { data: championsList } = useSWR("/api/championships", fetcher);
  const { data: champ } = useSWR(
    sel ? `/api/championships/${sel}` : null,
    fetcher,
  );
  const { data: reigns } = useSWR(
    sel ? `/api/championships/${sel}/reigns` : null,
    fetcher,
  );
  const { data: defensesData } = useSWR(
    sel ? `/api/championships/${sel}/defenses` : null,
    fetcher,
  );
  const { data: tagIndStats } = useSWR(
    sel === 5 ? `/api/championships/${sel}/tag-individual-stats` : null,
    fetcher,
  );

  const reignsArr = useMemo(() => {
    if (Array.isArray(reigns)) return reigns;
    if (reigns && typeof reigns === "object") {
      if (Array.isArray(reigns.data)) return reigns.data;
      if (Array.isArray(reigns.results)) return reigns.results;
      if (Array.isArray(reigns.reigns)) return reigns.reigns;
    }
    return [];
  }, [reigns]);

  const defenses = defensesData?.details || [];
  const defenseSummary = defensesData?.summary || [];
  const tagIndividualStats = tagIndStats || [];

  // ─── Hooks de lógica ─────────────────────────────────────────────────────
  const {
    sortKey,
    handleSort,
    renderSortIcon,
    sortedReigns,
    longestReignId,
    orderedEraNames,
  } = useChampionshipSort(reignsArr, sel);

  const {
    handleAggSort,
    renderAggSortIcon,
    handleTeamSort,
    renderTeamSortIcon,
    handleIndSort,
    renderIndSortIcon,
    currentReignText,
    currentDefenses,
    fighterStats,
    teamStats,
    sortedIndStats,
  } = useChampionshipStats(
    reignsArr,
    defenseSummary,
    defenses,
    tagIndividualStats,
    sel,
  );

  const visibleColumnsCount = tableColumns.filter(
    (c) => !(c.key === "interpreter" && sel === 5),
  ).length;

  const todayString = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
    [],
  );

  // ─── Lógica para agrupar por Interpreter ─────────────────────────────────
  const interpreterStats = useMemo(() => {
    if (!fighterStats || fighterStats.length === 0) return [];

    const map = new Map();

    fighterStats.forEach((fighter) => {
      if (!fighter.interpreterId) return;

      if (!map.has(fighter.interpreterId)) {
        map.set(fighter.interpreterId, {
          interpreterId: fighter.interpreterId,
          interpreterName: fighter.interpreterName,
          interpreterCountry: fighter.interpreterCountry,
          champions: [],
          reigns: 0,
          defenses: 0,
          totalDaysNumber: 0,
          isCurrent: false,
        });
      }

      const stats = map.get(fighter.interpreterId);

      // Agregar campeón si no está en la lista del intérprete
      if (!stats.champions.find((c) => c.id === fighter.wrestlerId)) {
        stats.champions.push({
          id: fighter.wrestlerId,
          name: fighter.wrestlerName,
          country: fighter.country,
        });
      }

      stats.reigns += fighter.reignCount;
      stats.defenses += fighter.defenses;

      const daysLabel = fighter.totalDaysLabel ? fighter.totalDaysLabel.toString() : "0";
      const isPlus = daysLabel.includes("+");
      const daysNum = parseInt(daysLabel.replace("+", ""), 10) || 0;

      stats.totalDaysNumber += daysNum;
      if (isPlus || fighter.isCurrent) {
        stats.isCurrent = true;
      }
    });

    let arr = Array.from(map.values()).map((stat) => ({
      ...stat,
      totalDaysLabel: stat.isCurrent ? `${stat.totalDaysNumber}+` : stat.totalDaysNumber.toString(),
    }));

    // Ordenamiento local para la tabla de intérpretes
    arr.sort((a, b) => {
      let valA, valB;
      if (interpreterSort.key === "Interpreter") {
        valA = a.interpreterName.toLowerCase();
        valB = b.interpreterName.toLowerCase();
      } else if (interpreterSort.key === "Reigns") {
        valA = a.reigns;
        valB = b.reigns;
      } else if (interpreterSort.key === "Successful defenses") {
        valA = a.defenses;
        valB = b.defenses;
      } else {
        valA = a.totalDaysNumber;
        valB = b.totalDaysNumber;
      }

      if (valA < valB) return interpreterSort.dir === "asc" ? -1 : 1;
      if (valA > valB) return interpreterSort.dir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [fighterStats, interpreterSort]);

  // Booleano dinámico: revisa si AL MENOS UN intérprete usó más de un luchador distinto
  const hasMultipleWrestlersPerInterpreter = useMemo(() => {
    return interpreterStats.some((stat) => stat.champions.length > 1);
  }, [interpreterStats]);

  const handleInterpreterSort = (key) => {
    setInterpreterSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc",
    }));
  };

  const renderInterpreterSortIcon = (key) => {
    if (interpreterSort.key !== key) return null;
    return interpreterSort.dir === "asc" ? " ▲" : " ▼";
  };

  // ─── Render de una fila de la tabla de reinados (vacante o normal) ───────
  function renderReignRow(r, displayIndex) {
    if (r.isVacant) {
      return (
        <tr
          key={r.id || `vacant-${displayIndex}`}
          className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <td className="border px-2 py-1 text-center">{displayIndex}</td>
          <td className="border px-2 py-1 font-semibold">Vacant</td>
          {sel !== 5 && <td className="border px-2 py-1 text-center">—</td>}
          <td className="border px-2 py-1 text-center">
            {formatEnglishDate(r.won_date)}
          </td>
          <td className="border px-2 py-1 text-center">—</td>
          <td className="border px-2 py-1 text-center">—</td>
          <td className="border px-2 py-1 text-center">—</td>
          <td className="border px-2 py-1 text-[12px] break-words">—</td>
        </tr>
      );
    }

    const daysHeldRaw = r.__daysHeld;
    return (
      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
        <td className="border px-2 py-1 text-center">{displayIndex}</td>
        <td className="border px-1 py-1 font-semibold">
          {r.tag_team_id ? (
            <>
              <Link
                href={`/stables/${r.tag_team_id}`}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {r.team_name}
              </Link>
              <br />
              <span className="text-xs">
                (
                {(r.team_members_raw ? r.team_members_raw.split(",") : []).map(
                  (item, i, arr) => {
                    const [id, name, country, indivReign] = item.split("|");
                    return (
                      <span key={id} className="items-center">
                        <Link
                          href={`/wrestlers/${id}`}
                          className="items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <FlagWithName code={country} name={name} />
                        </Link>
                        &nbsp;({indivReign})
                        {i < arr.length - 1 ? ", " : ""}
                      </span>
                    );
                  },
                )}
                )
              </span>
            </>
          ) : r.wrestler_id ? (
            <Link
              href={`/wrestlers/${r.wrestler_id}`}
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <FlagWithName code={r.country} name={r.wrestler} />
            </Link>
          ) : (
            "—"
          )}
        </td>
        {sel !== 5 && (
          <td className="border px-2 py-1">
            {r.interpreter_id ? (
              <Link
                href={`/interpreters/${r.interpreter_id}`}
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <FlagWithName code={r.nationality} name={r.interpreter} />
              </Link>
            ) : (
              "—"
            )}
          </td>
        )}
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
        <td className="border px-2 py-1 text-center">{r.reign_number}</td>
        <td className="border px-2 py-1 text-center">
          {r.lost_date === null ? daysHeldRaw : daysHeldRaw.replace("+", "")}
        </td>
        <td className="border px-2 py-1 text-[12px] break-words">
          {r.notes || "—"}
          {sel !== 2 && r.id === longestReignId && (
            <span className="ml-1">
              This is the longest reign in the history of the championship.
            </span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <>
      <Head>
        <title>Championships — Trivias WWE</title>
        <meta
          name="description"
          content="Historial de campeonatos, reinados y estadísticas del Campeonato de Trivias WWE."
        />
      </Head>
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

        {/* Botones de campeonatos desde API */}
        <div className="flex flex-wrap gap-3 mb-6">
          {!championsList ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            championsList.map((c) => (
              <button
                key={c.id}
                onClick={() => setSel(c.id)}
                className={`px-4 py-2 rounded shadow ${
                  sel === c.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"
                }`}
              >
                {c.title_name}
              </button>
            ))
          )}
        </div>

        {sel && (
          <div className="space-y-4">
            {!champ || !reignsArr.length ? (
              <p>Loading...</p>
            ) : (
              <>
                {/* ─── Campeón actual ─────────────────────────────────────── */}
                {currentReignText && (
                  <div className="mb-4 p-4 rounded">
                    <h3 className="text-xl font-semibold mb-2">
                      Current champion
                    </h3>
                    <p className="text-sm">
                      {sel === 5 ? (
                        <>
                          The current champions are{" "}
                          <Link
                            href={`/stables/${currentReignText.tagTeamId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            {currentReignText.teamName}
                          </Link>{" "}
                          (
                          {currentReignText.teamMembers.map((m, i) => (
                            <span
                              key={m.wrestlerId}
                              className="items-center gap-1"
                            >
                              <Link
                                href={`/wrestlers/${m.wrestlerId}`}
                                className="items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                              >
                                <FlagWithName
                                  code={m.country}
                                  name={m.wrestler}
                                />
                              </Link>
                              {i === 0 && <span className="mx-1">&amp;</span>}
                            </span>
                          ))}
                          ), who are in their {currentReignText.ordinalWord}{" "}
                          reign as a team.
                        </>
                      ) : (
                        <>
                          The current champion is{" "}
                          <Link
                            href={`/wrestlers/${currentReignText.wrestlerId}`}
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            <FlagWithName
                              code={currentReignText.wrestlerCountry}
                              name={currentReignText.wrestlerName}
                            />
                          </Link>
                          , who is in his {currentReignText.ordinalWord} reign.
                        </>
                      )}{" "}
                      He won the title after defeating{" "}
                      {sel === 5 && currentReignText.opponentTeamId ? (
                        <>
                          <Link
                            href={`/stables/${currentReignText.opponentTeamId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            {currentReignText.opponentTeamName}
                          </Link>{" "}
                          (
                          {currentReignText.opponentTeamMembers.map((m, i) => (
                            <span
                              key={m.wrestlerId}
                              className="items-center gap-1"
                            >
                              <Link
                                href={`/wrestlers/${m.wrestlerId}`}
                                className="items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <FlagWithName
                                  code={m.country}
                                  name={m.wrestler}
                                />
                              </Link>
                              {i === 0 && <span className="mx-1">&amp;</span>}
                            </span>
                          ))}
                          )
                        </>
                      ) : currentReignText.defeatedOpponentId ? (
                        <Link
                          href={`/wrestlers/${currentReignText.defeatedOpponentId}`}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                        >
                          <FlagWithName
                            code={currentReignText.defeatedOpponentCountry}
                            name={currentReignText.defeatedOpponent}
                          />
                        </Link>
                      ) : (
                        <strong>—</strong>
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

                    {currentDefenses.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm mb-2">
                          {sel === 5
                            ? currentReignText.teamMembers
                                .map((m) => m.wrestler)
                                .join(" & ")
                            : currentReignText.wrestlerName}{" "}
                          records the following televised defenses as of{" "}
                          {todayString}:
                        </p>
                        <ol className="list-decimal list-inside ml-4 space-y-1 text-sm">
                          {currentDefenses.map((d, i) => {
                            let opponentBlock;
                            if (sel === 5 && d.opponent_tag_team_id) {
                              const members = (
                                d.opponent_team_members_raw || ""
                              )
                                .split(",")
                                .map((raw) => {
                                  const [id, name, country] = raw.split("|");
                                  return { id, name, country };
                                })
                                .filter(Boolean);
                              opponentBlock = (
                                <>
                                  <Link
                                    href={`/stables/${d.opponent_tag_team_id}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {d.opponent_team_name}
                                  </Link>{" "}
                                  (
                                  {members.map((m, idx) => (
                                    <span
                                      key={m.id}
                                      className="items-center gap-1"
                                    >
                                      <Link
                                        href={`/wrestlers/${m.id}`}
                                        className="items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                      >
                                        <FlagWithName
                                          code={m.country}
                                          name={m.name}
                                        />
                                      </Link>
                                      {idx === 0 && members.length > 1 && (
                                        <span className="mx-1">&amp;</span>
                                      )}
                                    </span>
                                  ))}
                                  )
                                </>
                              );
                            } else {
                              opponentBlock = (
                                <Link
                                  href={`/wrestlers/${d.opponent_id}`}
                                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  <FlagWithName
                                    code={d.opponent_country}
                                    name={d.opponent}
                                  />
                                </Link>
                              );
                            }
                            return (
                              <li key={i}>
                                ({d.score}) vs {opponentBlock} on{" "}
                                {new Date(d.event_date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "long",
                                    day: "numeric",
                                    timeZone: "UTC",
                                  },
                                )}
                                ,{" "}
                                <Link
                                  href={`/events/${d.event_id}`}
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {d.event_name}
                                </Link>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                <h2 className="text-2xl font-semibold">{champ?.title_name}</h2>

                {/* ─── Tabla de reinados ──────────────────────────────────── */}
                <div className="overflow-x-auto no-scrollbar">
                  <table className="table-auto w-full border-collapse text-sm min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        {tableColumns.map(({ label, key, widthClass }) => (
                          <th
                            key={key}
                            onClick={() => handleSort(label)}
                            className={`cursor-pointer border px-2 py-1 text-center ${widthClass || ""} ${key === "interpreter" && sel === 5 ? "hidden" : ""}`}
                          >
                            {label}
                            {renderSortIcon(label)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortKey === null ? (
                        // ─── Orden predeterminado ("#"): agrupado por Era ──
                        (() => {
                          let globalCounter = 0;
                          const erasWithReigns = orderedEraNames
                            .map((eraName) => ({
                              name: eraName,
                              rows: sortedReigns.filter(
                                (r) => r.era_name === eraName,
                              ),
                            }))
                            .filter((era) => era.rows.length > 0);

                          return erasWithReigns.map(({ name: eraName, rows }) => (
                            <React.Fragment key={eraName}>
                              <tr className="bg-gray-200 dark:bg-gray-800">
                                <td
                                  className="border px-2 py-1 font-semibold text-center"
                                  colSpan={visibleColumnsCount}
                                >
                                  {eraName}
                                </td>
                              </tr>
                              {rows.map((r) => {
                                const displayIndex = r.isVacant
                                  ? "—"
                                  : ++globalCounter;
                                return renderReignRow(r, displayIndex);
                              })}
                            </React.Fragment>
                          ));
                        })()
                      ) : (
                        // ─── Cualquier otra columna: lista plana, sin Eras ─
                        (() => {
                          let globalCounter = 0;
                          return sortedReigns.map((r) => {
                            const displayIndex = r.isVacant
                              ? "—"
                              : ++globalCounter;
                            return renderReignRow(r, displayIndex);
                          });
                        })()
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ─── Total days with the title ──────────────────────────── */}
                <div className="mt-8 mb-6">
                  <h3 className="text-xl font-semibold mb-2">
                    Total days with the title
                  </h3>
                  <p className="mb-4 text-sm">Updated as of {todayString}.</p>

                  {/* Tag team stats */}
                  {sel === 5 && teamStats.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold mb-2">
                        By Tag Team
                      </h4>
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="table-auto w-full border-collapse text-sm min-w-[600px]">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                              {aggColumns
                                .filter((c) => c.label !== "Interpreter")
                                .map(({ label }) => (
                                  <th
                                    key={label}
                                    onClick={() => handleTeamSort(label)}
                                    className="border px-2 py-1 text-center cursor-pointer select-none"
                                  >
                                    {label}
                                    {renderTeamSortIcon(label)}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {teamStats.map((row, idx) => (
                              <tr
                                key={row.tagTeamId}
                                className={
                                  row.isCurrent
                                    ? "bg-yellow-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                }
                              >
                                <td className="border px-2 py-1 text-center">
                                  {idx + 1}
                                </td>
                                <td className="border px-2 py-1">
                                  <Link
                                    href={`/stables/${row.tagTeamId}`}
                                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {row.teamName}
                                  </Link>
                                  <br />
                                  <span className="text-xs">
                                    (
                                    {Array.from(row.members.values()).map(
                                      (m, i, arr) => (
                                        <span key={m.id}>
                                          <Link
                                            href={`/wrestlers/${m.id}`}
                                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                          >
                                            <FlagWithName
                                              code={m.country}
                                              name={m.name}
                                            />
                                          </Link>
                                          {i < arr.length - 1 && ", "}
                                        </span>
                                      ),
                                    )}
                                    )
                                  </span>
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
                  )}

                  {/* Tag individual stats */}
                  {sel === 5 && tagIndividualStats.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold mb-2">
                        By Individual Wrestler
                      </h4>
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="table-auto w-full border-collapse text-sm min-w-[600px]">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                              {[
                                "#",
                                "Champion",
                                "Interpreter",
                                "Reigns",
                                "Successful defenses",
                                "Total days",
                              ].map((label) => (
                                <th
                                  key={label}
                                  onClick={() => handleIndSort(label)}
                                  className="border px-2 py-1 text-center cursor-pointer select-none"
                                >
                                  {label}
                                  {renderIndSortIcon(label)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {sortedIndStats.map((row, idx) => (
                              <tr
                                key={row.wrestlerId}
                                className={
                                  row.isCurrent
                                    ? "bg-yellow-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                }
                              >
                                <td className="border px-2 py-1 text-center">
                                  {idx + 1}
                                </td>
                                <td className="border px-2 py-1 text-left font-semibold">
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
                                <td className="border px-2 py-1 text-left">
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
                  )}

                  {/* Singles fighter stats */}
                  {sel !== 5 && fighterStats.length > 0 && (
                    <>
                      {hasMultipleWrestlersPerInterpreter ? (
                        <>
                          {/* Per Wrestler Table */}
                          <div className="mb-8">
                            <h4 className="text-lg font-semibold mb-2">Per wrestler</h4>
                            <div className="overflow-x-auto no-scrollbar">
                              <table className="table-auto w-full border-collapse text-sm min-w-[600px]">
                                <thead>
                                  <tr className="bg-gray-100 dark:bg-gray-700">
                                    {aggColumns.map(({ label }) => (
                                      <th
                                        key={label}
                                        onClick={() => handleAggSort(label)}
                                        className="border px-2 py-1 text-center cursor-pointer select-none"
                                      >
                                        {label}
                                        {renderAggSortIcon(label)}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {fighterStats.map((row, idx) => (
                                    <tr
                                      key={row.wrestlerId}
                                      className={
                                        row.isCurrent
                                          ? "bg-yellow-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                      }
                                    >
                                      <td className="border px-2 py-1 text-center">
                                        {idx + 1}
                                      </td>
                                      <td className="border px-2 py-1">
                                        <Link
                                          href={`/wrestlers/${row.wrestlerId}`}
                                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                        >
                                          <FlagWithName
                                            code={row.country}
                                            name={row.wrestlerName}
                                          />
                                        </Link>
                                      </td>
                                      <td className="border px-2 py-1">
                                        <Link
                                          href={`/interpreters/${row.interpreterId}`}
                                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          <FlagWithName
                                            code={row.interpreterCountry}
                                            name={row.interpreterName}
                                          />
                                        </Link>
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

                          {/* Per Interpreter Table */}
                          <div className="mb-8">
                            <h4 className="text-lg font-semibold mb-2">Per interpreter</h4>
                            <div className="overflow-x-auto no-scrollbar">
                              <table className="table-auto w-full border-collapse text-sm min-w-[600px]">
                                <thead>
                                  <tr className="bg-gray-100 dark:bg-gray-700">
                                    {[
                                      "#,none",
                                      "Interpreter,Interpreter",
                                      "Champion(s),none",
                                      "Reigns,Reigns",
                                      "Successful defenses,Successful defenses",
                                      "Total days,Total days",
                                    ].map((headerInfo) => {
                                      const [label, sortKey] = headerInfo.split(",");
                                      return (
                                        <th
                                          key={label}
                                          onClick={() => sortKey !== "none" && handleInterpreterSort(sortKey)}
                                          className={`border px-2 py-1 text-center select-none ${sortKey !== "none" ? "cursor-pointer" : ""}`}
                                        >
                                          {label}
                                          {sortKey !== "none" && renderInterpreterSortIcon(sortKey)}
                                        </th>
                                      );
                                    })}
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {interpreterStats.map((row, idx) => (
                                    <tr
                                      key={row.interpreterId}
                                      className={
                                        row.isCurrent
                                          ? "bg-yellow-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                      }
                                    >
                                      <td className="border px-2 py-1 text-center">{idx + 1}</td>
                                      <td className="border px-2 py-1 font-semibold">
                                        <Link
                                          href={`/interpreters/${row.interpreterId}`}
                                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          <FlagWithName
                                            code={row.interpreterCountry}
                                            name={row.interpreterName}
                                          />
                                        </Link>
                                      </td>
                                      <td className="border px-2 py-1">
                                        {row.champions.map((champ, cIdx) => (
                                          <React.Fragment key={champ.id}>
                                            <Link
                                              href={`/wrestlers/${champ.id}`}
                                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                            >
                                              <FlagWithName code={champ.country} name={champ.name} />
                                            </Link>
                                            {cIdx < row.champions.length - 1 && <br />}
                                          </React.Fragment>
                                        ))}
                                      </td>
                                      <td className="border px-2 py-1 text-center">{row.reigns}</td>
                                      <td className="border px-2 py-1 text-center">{row.defenses}</td>
                                      <td className="border px-2 py-1 text-center">{row.totalDaysLabel}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Original view without subheadings */
                        <div className="mb-8 overflow-x-auto no-scrollbar">
                          <table className="table-auto w-full border-collapse text-sm min-w-[600px]">
                            <thead>
                              <tr className="bg-gray-100 dark:bg-gray-700">
                                {aggColumns.map(({ label }) => (
                                  <th
                                    key={label}
                                    onClick={() => handleAggSort(label)}
                                    className="border px-2 py-1 text-center cursor-pointer select-none"
                                  >
                                    {label}
                                    {renderAggSortIcon(label)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {fighterStats.map((row, idx) => (
                                <tr
                                  key={row.wrestlerId}
                                  className={
                                    row.isCurrent
                                      ? "bg-yellow-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                  }
                                >
                                  <td className="border px-2 py-1 text-center">
                                    {idx + 1}
                                  </td>
                                  <td className="border px-2 py-1">
                                    <Link
                                      href={`/wrestlers/${row.wrestlerId}`}
                                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                    >
                                      <FlagWithName
                                        code={row.country}
                                        name={row.wrestlerName}
                                      />
                                    </Link>
                                  </td>
                                  <td className="border px-2 py-1">
                                    <Link
                                      href={`/interpreters/${row.interpreterId}`}
                                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      <FlagWithName
                                        code={row.interpreterCountry}
                                        name={row.interpreterName}
                                      />
                                    </Link>
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
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}