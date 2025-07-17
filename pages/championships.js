// pages/championships.js

import React from "react";
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

  // 0) SWR: championship, reigns y defenses
  const { data: champ } = useSWR(
    sel ? `/api/championships/${sel}` : null,
    fetcher
  );
  const { data: reigns } = useSWR(
    sel ? `/api/championships/${sel}/reigns` : null,
    fetcher
  );
  const { data: defensesData } = useSWR(
    sel ? `/api/championships/${sel}/defenses` : null,
    fetcher
  );
  // 0.1) SWR para stats individuales de tag‑team (sólo WWE World Tag Team)
  const { data: tagIndStats } = useSWR(
    sel === 5 ? `/api/championships/${sel}/tag-individual-stats` : null,
    fetcher
  );
  const defenses = defensesData?.details || [];
  const defenseSummary = defensesData?.summary || [];
  const tagIndividualStats = tagIndStats || [];

  // 1) Estados de ordenamiento tablas
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const [aggSortKey, setAggSortKey] = useState("Total days");
  const [aggSortOrder, setAggSortOrder] = useState("desc");

  // 1.1) Orden para Tag Team
  const [teamSortKey, setTeamSortKey] = useState("Total days");
  const [teamSortOrder, setTeamSortOrder] = useState("desc");

  // 1.2) Orden para Individual Wrestler (tag‑team)
  const [indSortKey, setIndSortKey] = useState("Total days");
  const [indSortOrder, setIndSortOrder] = useState("desc");

  // 2) Estados de ordenamiento tabla reigns
  const handleSort = (column, isAgg = false) => {
    if (column === "#") {
      if (isAgg) {
        setAggSortKey("Total days");
        setAggSortOrder("desc");
      } else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      if (isAgg) {
        if (aggSortKey === column) {
          setAggSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
          setAggSortKey(column);
          setAggSortOrder("asc");
        }
      } else {
        if (sortKey === column) {
          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
          setSortKey(column);
          setSortOrder("asc");
        }
      }
    }
  };

  function handleTeamSort(column) {
    if (column === "#") {
      setTeamSortKey("Total days");
      setTeamSortOrder("desc");
    } else if (teamSortKey === column) {
      setTeamSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setTeamSortKey(column);
      setTeamSortOrder("asc");
    }
  }

  function handleIndSort(column) {
    if (column === "#") {
      setIndSortKey("Total days");
      setIndSortOrder("desc");
    } else if (indSortKey === column) {
      setIndSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setIndSortKey(column);
      setIndSortOrder("asc");
    }
  }

  // 3) Utilitarios hoisted
  function calculateDaysHeld(wonDateStr, lostDateStr) {
    if (!wonDateStr) return "—";
    const start = new Date(wonDateStr);
    const end = lostDateStr ? new Date(lostDateStr) : new Date();
    const diffMs = end - start;
    const diffDays = Math.floor(diffMs / 86400000);
    return lostDateStr ? `${diffDays}` : `${diffDays}+`;
  }

  function parseDays(daysHeld) {
    if (typeof daysHeld === "string") {
      if (daysHeld === "—") return -Infinity;
      return parseInt(daysHeld.replace("+", ""), 10);
    }
    return daysHeld;
  }

  const formatEnglishDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const getOrdinalWord = (num) => {
    const ord = {
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
    return ord[num] || `${num}th`;
  };

  const translateNotesToEnglish = (note) => note || "—";

  // Columnas de la tabla de reinados
  const columns = [
    { label: "#", key: "index" },
    { label: "Champion", key: "champion" },
    { label: "Interpreter", key: "interpreter" },
    { label: "Won Date", key: "won_date" },
    { label: "Event", key: "event" },
    { label: "Reign #", key: "reign_number" },
    { label: "Days Held", key: "days_held" },
    { label: "Notes", key: "notes", widthClass: "w-[25%]" },
  ];

  // Columnas de la tabla agregada “Total days with the title”
  const aggColumns = [
    { label: "#", sortable: true },
    { label: "Champion", sortable: true },
    { label: "Interpreter", sortable: true },
    { label: "Reigns", sortable: true },
    { label: "Successful defenses", sortable: true },
    { label: "Total days", sortable: true },
  ];

  // Función para mostrar la flechita ▲▼ en cualquier tabla
  const renderSortIcon = (column, isAgg = false) => {
    const activeKey = isAgg ? aggSortKey : sortKey;
    const activeOrder = isAgg ? aggSortOrder : sortOrder;
    if (activeKey !== column) return null;
    return activeOrder === "asc" ? " ▲" : " ▼";
  };

  const renderTeamSortIcon = (column) =>
    teamSortKey === column ? (teamSortOrder === "asc" ? " ▲" : " ▼") : null;

  const renderIndSortIcon = (column) =>
    indSortKey === column ? (indSortOrder === "asc" ? " ▲" : " ▼") : null;

  const todayString = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
    []
  );

  // 4) Texto del reinado actual
  const currentReignText = useMemo(() => {
    if (!Array.isArray(reigns) || reigns.length === 0) return null;
    const current = reigns.find((r) => !r.lost_date);
    if (!current) return null;

    // Para tag‑team (id=5)
    let teamName = null,
      teamMembers = [];
    if (sel === 5 && current.team_members_raw) {
      teamName = current.team_name;
      teamMembers = current.team_members_raw.split(",").map((raw) => {
        const [id, name, country] = raw.split("|");
        return { wrestlerId: Number(id), wrestler: name, country };
      });
    }

    // Oponente tag‑team
    let opponentTeamName = null,
      opponentTeamId = null,
      opponentTeamMembers = [];
    if (sel === 5 && current.opponent_team_members_raw) {
      opponentTeamName = current.opponent_team_name;
      opponentTeamId = current.opponent_tag_team_id;
      opponentTeamMembers = current.opponent_team_members_raw
        .split(",")
        .map((raw) => {
          const [id, name, country] = raw.split("|");
          return { wrestlerId: Number(id), wrestler: name, country };
        });
    }

    return {
      reignId: current.id,
      wrestlerId: current.wrestler_id,
      wrestlerName: current.wrestler,
      wrestlerCountry: current.country,
      ordinalWord: getOrdinalWord(current.reign_number),
      formattedDate: formatEnglishDate(current.won_date),
      eventId: current.event_id,
      eventName: current.event_name,
      // para tag‑team
      tagTeamId: current.tag_team_id,
      teamName,
      teamMembers,
      opponentTeamId,
      opponentTeamName,
      opponentTeamMembers,
      // para singles
      defeatedOpponentId: current.opponent_id,
      defeatedOpponent: current.opponent,
      defeatedOpponentCountry: current.opponent_country,
    };
  }, [reigns, sel]);

  // 5) Defensas del reinado actual
  const currentDefenses = useMemo(() => {
    if (!defenses || !currentReignText) return [];
    return defenses.filter((d) => d.reign_id === currentReignText.reignId);
  }, [defenses, currentReignText]);

  // 6) Estadísticas “por luchador” (solo para singles)
  const fighterStats = useMemo(() => {
    if (sel === 5 || !Array.isArray(reigns) || !defenseSummary) return [];
    const defMap = new Map(defenseSummary.map((d) => [d.reign_id, d.count]));
    const map = new Map();

    reigns.forEach((r) => {
      if (!r.wrestler_id) return;
      const daysNum =
        parseInt(
          calculateDaysHeld(r.won_date, r.lost_date).replace("+", ""),
          10
        ) || 0;
      const defs = defMap.get(r.id) || 0;
      if (!map.has(r.wrestler_id)) {
        map.set(r.wrestler_id, {
          wrestlerId: r.wrestler_id,
          wrestlerName: r.wrestler,
          country: r.country,
          interpreterId: r.interpreter_id,
          interpreterName: r.interpreter,
          interpreterCountry: r.nationality,
          reignCount: 0,
          defenses: 0,
          totalDays: 0,
          isCurrent: false,
        });
      }
      const o = map.get(r.wrestler_id);
      o.reignCount++;
      o.defenses += defs;
      o.totalDays += daysNum;
      if (r.lost_date === null) o.isCurrent = true;
    });

    return Array.from(map.values())
      .map((o) => ({
        ...o,
        totalDaysLabel: o.isCurrent ? `${o.totalDays}+` : `${o.totalDays}`,
      }))
      .sort((a, b) => {
        let va, vb;
        switch (aggSortKey) {
          case "Champion":
            va = a.wrestlerName.toLowerCase();
            vb = b.wrestlerName.toLowerCase();
            break;
          case "Interpreter":
            va = a.interpreterName.toLowerCase();
            vb = b.interpreterName.toLowerCase();
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
        return aggSortOrder === "asc"
          ? va < vb
            ? -1
            : va > vb
            ? 1
            : 0
          : va > vb
          ? -1
          : va < vb
          ? 1
          : 0;
      });
  }, [sel, reigns, defenseSummary, aggSortKey, aggSortOrder]);

  // 7) Estadísticas “por equipos” (solo para tag‑team id = 5)
  const teamStats = useMemo(() => {
    if (sel !== 5 || !Array.isArray(reigns) || !defenseSummary) return [];

    const defMap = new Map(defenseSummary.map((d) => [d.reign_id, d.count]));
    const map = new Map();

    reigns.forEach((r) => {
      if (!r.tag_team_id) return;
      const daysNum =
        parseInt(
          calculateDaysHeld(r.won_date, r.lost_date).replace("+", ""),
          10
        ) || 0;
      const defs = defMap.get(r.id) || 0;

      if (!map.has(r.tag_team_id)) {
        map.set(r.tag_team_id, {
          tagTeamId: r.tag_team_id,
          teamName: r.team_name,
          members: new Map(),
          reignCount: 0,
          defenses: 0,
          totalDays: 0,
          isCurrent: false,
        });
      }
      const o = map.get(r.tag_team_id);
      o.reignCount++;
      o.defenses += defs;
      o.totalDays += daysNum;
      if (r.lost_date === null) o.isCurrent = true;

      (r.team_members_raw || "").split(",").forEach((raw) => {
        const [id, name, country] = raw.split("|");
        if (id) o.members.set(+id, { id: +id, name, country });
      });
    });

    const arr = Array.from(map.values()).map((o) => ({
      ...o,
      totalDaysLabel: o.isCurrent ? `${o.totalDays}+` : `${o.totalDays}`,
    }));

    // **Orden usando teamSortKey / teamSortOrder**
    arr.sort((a, b) => {
      let va, vb;
      switch (teamSortKey) {
        case "Champion":
          va = a.teamName.toLowerCase();
          vb = b.teamName.toLowerCase();
          break;
        case "Interpreter":
          va = a.interpreterName.toLowerCase();
          vb = b.interpreterName.toLowerCase();
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
      if (va < vb) return teamSortOrder === "asc" ? -1 : 1;
      if (va > vb) return teamSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [sel, reigns, defenseSummary, teamSortKey, teamSortOrder]);

  // 8) Reinados ordenados + Vacant para NXT
  const sortedReigns = useMemo(() => {
    if (!Array.isArray(reigns)) return [];
    let arr = reigns.map((r, idx) => ({
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
      const withVac = [];
      for (let i = 0; i < arr.length; i++) {
        withVac.push(arr[i]);
        const next = arr[i + 1];
        if (
          next &&
          arr[i].lost_date &&
          next.won_date &&
          arr[i].lost_date !== next.won_date
        ) {
          withVac.push({
            id: `vacant-${i}`,
            wrestler_id: null,
            wrestler: "Vacant",
            won_date: arr[i].lost_date,
            __index: null,
            __daysHeld: "—",
            __wonDateObj: new Date(arr[i].lost_date),
            __eventName: "",
            __wrestlerName: "Vacant",
            __interpreterName: "",
            __notesText: "",
            isVacant: true,
          });
        }
      }
      arr = withVac;
    }

    if (sortKey) {
      arr.sort((a, b) => {
        let va, vb;
        switch (sortKey) {
          case "#":
            va = a.__index ?? -Infinity;
            vb = b.__index ?? -Infinity;
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
            va = a.reign_number ?? -Infinity;
            vb = b.reign_number ?? -Infinity;
            break;
          case "Days Held":
            va = parseDays(a.__daysHeld);
            vb = parseDays(b.__daysHeld);
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
  }, [reigns, sel, sortKey, sortOrder]);

  // Identificar el reinado más largo de todo el listado
  const longestReignId = useMemo(() => {
    if (!Array.isArray(sortedReigns) || sortedReigns.length === 0) return null;
    let maxDays = -Infinity;
    let winner = null;
    sortedReigns.forEach((r) => {
      if (r.isVacant) return; // ignoramos los vacant
      const d = parseDays(r.__daysHeld); // usa tu helper
      if (d > maxDays) {
        maxDays = d;
        winner = r.id;
      }
    });
    return winner;
  }, [sortedReigns]);

  // 9) Tabla agregada “Total days with the title”
  const aggregatedStats = useMemo(() => {
    if (!reigns || !defenseSummary) return [];
    const defMap = new Map(defenseSummary.map((d) => [d.reign_id, d.count]));
    const isTag = sel === 5;
    const map = new Map();

    reigns.forEach((r) => {
      const daysNum = parseInt(
        calculateDaysHeld(r.won_date, r.lost_date).replace("+", ""),
        10
      );
      const defs = defMap.get(r.id) || 0;

      if (isTag && r.tag_team_id) {
        const key = r.tag_team_id;
        const members = (r.team_members_raw || "").split(",").map((raw) => {
          const [id, name, country, reignNum] = raw.split("|");
          return { id: Number(id), name, country, reignNum: Number(reignNum) };
        });
        if (!map.has(key)) {
          map.set(key, {
            tagTeamId: key,
            teamName: r.team_name,
            members: new Map(),
            reignCount: 0,
            defenses: 0,
            totalDays: 0,
            isCurrent: false,
          });
        }
        const o = map.get(key);
        o.reignCount++;
        o.defenses += defs;
        o.totalDays += daysNum;
        if (r.lost_date === null) o.isCurrent = true;
        members.forEach((m) => o.members.set(m.id, m));
      } else if (!isTag && r.wrestler_id) {
        const key = r.wrestler_id;
        if (!map.has(key)) {
          map.set(key, {
            wrestlerId: key,
            wrestlerName: r.wrestler,
            country: r.country,
            interpreterId: r.interpreter_id,
            interpreterName: r.interpreter,
            interpreterCountry: r.nationality,
            reignCount: 0,
            defenses: 0,
            totalDays: 0,
            isCurrent: false,
          });
        }
        const o = map.get(key);
        o.reignCount++;
        o.defenses += defs;
        o.totalDays += daysNum;
        if (r.lost_date === null) o.isCurrent = true;
      }
    });

    return Array.from(map.values())
      .map((o) => ({
        ...o,
        totalDaysLabel: o.isCurrent ? `${o.totalDays}+` : `${o.totalDays}`,
      }))
      .sort((a, b) => {
        let va, vb;
        switch (aggSortKey) {
          case "#":
            va = isTag ? a.tagTeamId : a.wrestlerId;
            vb = isTag ? b.tagTeamId : b.wrestlerId;
            break;
          case "Champion":
            va = isTag
              ? a.teamName.toLowerCase()
              : a.wrestlerName.toLowerCase();
            vb = isTag
              ? b.teamName.toLowerCase()
              : b.wrestlerName.toLowerCase();
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
        return aggSortOrder === "asc"
          ? va < vb
            ? -1
            : va > vb
            ? 1
            : 0
          : va > vb
          ? -1
          : va < vb
          ? 1
          : 0;
      });
  }, [reigns, defenseSummary, sel, aggSortKey, aggSortOrder]);

  const sortedIndStats = useMemo(() => {
    const arr = Array.isArray(tagIndividualStats)
      ? [...tagIndividualStats]
      : [];

    arr.sort((a, b) => {
      let va, vb;
      switch (indSortKey) {
        case "Champion":
          va = a.wrestlerName.toLowerCase();
          vb = b.wrestlerName.toLowerCase();
          break;
        case "Interpreter":
          va = a.interpreterName.toLowerCase();
          vb = b.interpreterName.toLowerCase();
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
      if (va < vb) return indSortOrder === "asc" ? -1 : 1;
      if (va > vb) return indSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [tagIndividualStats, indSortKey, indSortOrder]);

  // 10) Eras
  const eras = [
    {
      id: 1,
      name: "The OGs Era",
      start_date: "2023-02-27",
      end_date: "2023-04-11",
    },
    {
      id: 2,
      name: "The WM Era",
      start_date: "2023-04-12",
      end_date: "2024-12-31",
    },
    {
      id: 3,
      name: "The Kliq Era",
      start_date: "2025-01-01",
      end_date: null,
    },
  ];

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
              {/* ------------------------- */}
              {/* Sección: Current champion */}
              {/* ------------------------- */}
              {currentReignText && (
                <div className="mb-4 p-4 rounded">
                  <h3 className="text-xl font-semibold mb-2">
                    Current champion
                  </h3>
                  <p className="text-sm">
                    {sel === 5 ? (
                      <>
                        The current champions are{" "}
                        {/* Usamos teamName del currentReignText */}
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
                            {/* Si es el primer miembro, ponemos el separador fuera del link */}
                            {i === 0 && <span className="mx-1">&amp;</span>}
                          </span>
                        ))}
                        ), who are in their {currentReignText.ordinalWord} reign
                        as a team.
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
                          /* --- para tag‑team rival, parseamos los miembros --- */
                          let opponentBlock;
                          if (sel === 5 && d.opponent_tag_team_id) {
                            const members =
                              d.opponent_team_members_raw
                                ?.split(",")
                                .map((raw) => {
                                  const [id, name, country] = raw.split("|");
                                  return { id, name, country };
                                }) || [];

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
                            /* rival individual */
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
                                }
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

              {/* ---------------------------------- */}
              {/* Sección: Championship reigns table */}
              {/* ---------------------------------- */}
              <h2 className="text-2xl font-semibold">{champ.title_name}</h2>

              <div className="overflow-x-auto no-scrollbar">
                <table className="table-auto w-full border-collapse text-sm min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      {columns.map(({ label, key, widthClass }) => (
                        <th
                          key={key}
                          onClick={() => handleSort(label)}
                          className={`cursor-pointer border px-2 py-1 text-center ${
                            widthClass || ""
                          } ${
                            key === "interpreter" && sel === 5 ? "hidden" : ""
                          }`}
                        >
                          {label}
                          {renderSortIcon(label)}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {(() => {
                      // 1) aplica orden global a sortedReigns (ya lo hace tu hook)
                      // 2) inicializa contador global
                      let globalCounter = 0;

                      // 3) filtra sólo las eras que tienen al menos un reinado
                      const erasWithReigns = eras
                        .map((era) => {
                          const rows = sortedReigns.filter((r) => {
                            const won = new Date(r.won_date);
                            const from = new Date(era.start_date);
                            const to = era.end_date
                              ? new Date(era.end_date)
                              : null;
                            return won >= from && (to === null || won <= to);
                          });
                          return { ...era, rows };
                        })
                        .filter((era) => era.rows.length > 0);

                      // 4) renderiza
                      return erasWithReigns.map(
                        ({ id: eraId, name: eraName, rows }) => (
                          <React.Fragment key={eraId}>
                            {/* fila de título de era */}
                            <tr className="bg-gray-200 dark:bg-gray-800">
                              <td
                                className="border px-2 py-1 font-semibold text-center"
                                colSpan={columns.length}
                              >
                                {eraName}
                              </td>
                            </tr>

                            {/* filas de reinados dentro de esta era */}
                            {rows.map((r) => {
                              const displayIndex = r.isVacant
                                ? "—"
                                : ++globalCounter;
                              if (r.isVacant) {
                                return (
                                  <tr
                                    key={
                                      r.id || `vacant-${eraId}-${displayIndex}`
                                    }
                                    className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                  >
                                    <td className="border px-2 py-1 text-center">
                                      {displayIndex}
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
                                    <td className="border px-2 py-1 text-center">
                                      —
                                    </td>
                                    <td className="border px-2 py-1 text-[12px] break-words">
                                      —{" "}
                                    </td>
                                  </tr>
                                );
                              }
                              const daysHeldRaw = calculateDaysHeld(
                                r.won_date,
                                r.lost_date
                              );

                              return (
                                <tr
                                  key={r.id}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  {/* # */}
                                  <td className="border px-2 py-1 text-center">
                                    {displayIndex}
                                  </td>

                                  {/* Champion */}
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
                                          {(r.team_members_raw
                                            ? r.team_members_raw.split(",")
                                            : []
                                          ).map((item, i, arr) => {
                                            const [
                                              id,
                                              name,
                                              country,
                                              indivReign,
                                            ] = item.split("|");
                                            return (
                                              <span
                                                key={id}
                                                className="items-center"
                                              >
                                                <Link
                                                  href={`/wrestlers/${id}`}
                                                  className="items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                  <FlagWithName
                                                    code={country}
                                                    name={name}
                                                  />
                                                </Link>
                                                &nbsp;({indivReign})
                                                {i < arr.length - 1 ? ", " : ""}
                                              </span>
                                            );
                                          })}
                                          )
                                        </span>
                                      </>
                                    ) : r.wrestler_id ? (
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

                                  {/* Interpreter (solo si sel !== 5) */}
                                  {sel !== 5 && (
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
                                  )}

                                  {/* Won Date */}
                                  <td className="border px-2 py-1 text-center">
                                    {formatEnglishDate(r.won_date)}
                                  </td>

                                  {/* Event */}
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

                                  {/* Reign # */}
                                  <td className="border px-2 py-1 text-center">
                                    {r.reign_number}
                                  </td>

                                  {/* Days Held */}
                                  <td className="border px-2 py-1 text-center">
                                    {r.lost_date === null
                                      ? daysHeldRaw
                                      : daysHeldRaw.replace("+", "")}
                                  </td>

                                  {/* Notes */}
                                  <td className="border px-2 py-1 text-[12px] break-words">
                                    {translateNotesToEnglish(r.notes)}
                                    {sel !== 2 && r.id === longestReignId && (
                                      <span className="ml-1">
                                        This is the longest reign in the history
                                        of the championship.
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        )
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* ---------------------------------- */}
              {/* Bloque: Total days with the title */}
              {/* ---------------------------------- */}
              <div className="mt-8 mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  Total days with the title
                </h3>
                <p className="mb-4 text-sm">Updated as of {todayString}.</p>

                {/* === Tabla por equipos (solo para tag‑team) === */}
                {sel === 5 && teamStats.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold mb-2">By Tag Team</h4>
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
                                    )
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

                {/* === Tabla por luchador individual (tag‑team) === */}
                {sel === 5 && tagIndividualStats.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold mb-2">
                      By Individual Wrestler
                    </h4>
                    <div className="overflow-x-auto no-scrollbar">
                      <table className="table-auto w-full border-collapse text-sm min-w-[600px]">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700">
                            <th
                              onClick={() => handleIndSort("#")}
                              className="border px-2 py-1 text-center cursor-pointer select-none"
                            >
                              #{renderIndSortIcon("#")}
                            </th>
                            <th
                              onClick={() => handleIndSort("Champion")}
                              className="border px-2 py-1 text-center cursor-pointer select-none font-semibold"
                            >
                              Champion
                              {renderIndSortIcon("Champion")}
                            </th>
                            <th
                              onClick={() => handleIndSort("Interpreter")}
                              className="border px-2 py-1 text-center cursor-pointer select-none"
                            >
                              Interpreter
                              {renderIndSortIcon("Interpreter")}
                            </th>
                            <th
                              onClick={() => handleIndSort("Reigns")}
                              className="border px-2 py-1 text-center cursor-pointer select-none"
                            >
                              Reigns
                              {renderIndSortIcon("Reigns")}
                            </th>
                            <th
                              onClick={() =>
                                handleIndSort("Successful defenses")
                              }
                              className="border px-2 py-1 text-center cursor-pointer select-none"
                            >
                              Successful defenses
                              {renderIndSortIcon("Successful defenses")}
                            </th>
                            <th
                              onClick={() => handleIndSort("Total days")}
                              className="border px-2 py-1 text-center cursor-pointer select-none"
                            >
                              Total days
                              {renderIndSortIcon("Total days")}
                            </th>
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

                              {/* Champion con bandera, alineado a la izquierda */}
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

                              {/* Interpreter con bandera, alineado a la izquierda */}
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

                {/* === Tabla por luchador individual (otros campeonatos) === */}
                {sel !== 5 && fighterStats.length > 0 && (
                  <div className="mb-8 overflow-x-auto no-scrollbar">
                    <table className="table-auto w-full border-collapse text-sm min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          {aggColumns.map(({ label }) => (
                            <th
                              key={label}
                              onClick={() => handleSort(label, true)}
                              className="border px-2 py-1 text-center cursor-pointer select-none"
                            >
                              {label}
                              {renderSortIcon(label, true)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {fighterStats.map((row, idx) => (
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
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
