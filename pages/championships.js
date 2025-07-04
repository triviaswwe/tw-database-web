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
  const { data: defensesData } = useSWR(
    sel ? `/api/championships/${sel}/defenses` : null,
    fetcher
  );

  console.log("reigns →", reigns);

  const defenses = defensesData?.details || [];
  const defenseSummary = defensesData?.summary || [];

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
      timeZone: "UTC",
    });
  };

  // Obtener fecha actual para "Updated as of"
  const todayString = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
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
  // Mantenemos siempre todas las columnas, pero las ocultamos vía CSS cuando sel===5
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

  // Columnas definidas para "Total days with the title"
  const aggColumns = [
    { label: "N.º", sortable: true },
    { label: "Champion", sortable: true },
    { label: "Interpreter", sortable: true },
    { label: "Reigns", sortable: true },
    { label: "Successful defenses", sortable: true },
    { label: "Total days", sortable: true },
  ];

  // 1) Incluir reignId en currentReignText
  // Dentro de ChampionshipsPage:

  const currentReignText = useMemo(() => {
    if (!Array.isArray(reigns) || reigns.length === 0) return null;
    const current = reigns.find((r) => !r.lost_date);
    if (!current) return null;

    /* ----- equipo campeón ----- */
    let teamName = null,
      teamMembers = [];
    if (sel === 5 && current.team_members_raw) {
      teamName = current.team_name;
      teamMembers = current.team_members_raw.split(",").map((raw) => {
        const [id, name, country] = raw.split("|");
        return { wrestlerId: id, wrestler: name, country };
      });
    }

    /* ----- equipo rival ----- */
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
          return { wrestlerId: id, wrestler: name, country };
        });
    }

    return {
      reignId: current.id,
      wrestlerId: current.wrestler_id,
      wrestlerName: current.wrestler,
      wrestlerCountry: current.country,
      ordinalWord: getOrdinalWord(current.reign_number),
      defeatedOpponent: current.opponent || "—",
      defeatedOpponentId: current.opponent_id || null,
      defeatedOpponentCountry: current.opponent_country || null,
      formattedDate: formatEnglishDate(current.won_date),
      eventName: current.event_name || "—",
      eventId: current.event_id || null,
      tagTeamId: current.tag_team_id,
      teamName, // nombre del equipo
      teamMembers, // miembros del equipo
      opponentTeamName,
      opponentTeamId,
      opponentTeamMembers,
      defeatedOpponentId: current.opponent_id,
      defeatedOpponent: current.opponent,
      defeatedOpponentCountry: current.opponent_country,
    };
  }, [reigns, sel]);

  // 2) Filtrar defenses por reignId
  const currentDefenses = useMemo(() => {
    if (!defenses || !currentReignText) return [];
    return defenses.filter((d) => d.reign_id === currentReignText.reignId);
  }, [defenses, currentReignText]);

  // Ordenar reinados y agregar filas de Vacant para NXT Championship (id=6)
  const sortedReigns = useMemo(() => {
    // 🚨 Cambio clave: validamos que reigns sea realmente un array
    if (!Array.isArray(reigns)) return [];

    // Ahora sí clonamos y procesamos
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

    // Orden inicial por fecha
    arr.sort((a, b) => a.__wonDateObj - b.__wonDateObj);

    // Insertar filas "Vacant" solo para NXT (sel === 6)
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

    // Aplicar orden dinámico según columna
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
              a.reign_number != null ? a.reign_number : Number.MAX_SAFE_INTEGER;
            vb =
              b.reign_number != null ? b.reign_number : Number.MAX_SAFE_INTEGER;
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
  }, [reigns, sortKey, sortOrder, sel]);

  // Helper para extraer número de días de la etiqueta
  function parseDays(daysHeld) {
    if (typeof daysHeld === "string") {
      if (daysHeld === "—") return Number.MAX_SAFE_INTEGER;
      return parseInt(daysHeld.replace("+", ""), 10);
    }
    return daysHeld;
  }

  // Agrupar reinados por luchador (o por tag‑team cuando sel === 5)
  const aggregatedStats = useMemo(() => {
    if (!reigns || !defenseSummary) return [];

    /* ---------- mapa de defensas por reinado ---------- */
    const defMap = new Map(defenseSummary.map((d) => [d.reign_id, d.count]));

    /* ---------- elegimos la clave de agrupación ---------- */
    const isTagTeamTitle = sel === 5; // sólo este título es por parejas
    const map = new Map(); // Map<key, obj>

    reigns.forEach((r) => {
      /* -------- días de ese reinado -------- */
      const daysNum = parseInt(
        calculateDaysHeld(r.won_date, r.lost_date).replace("+", ""),
        10
      );
      const defenses = defMap.get(r.id) || 0;

      if (isTagTeamTitle && r.tag_team_id) {
        /* ========== AGRUPAR POR EQUIPO ========== */
        const key = r.tag_team_id;

        /* miembros de este reinado */
        const members = (r.team_members_raw || "").split(",").map((raw) => {
          // id|name|country|reignNum
          const [id, name, country, reignNum] = raw.split("|");

          return {
            id: Number(id),
            name,
            country,
            reignNum: reignNum ? Number(reignNum) : null, // ← nuevo campo
          };
        });

        if (!map.has(key)) {
          map.set(key, {
            /* datos de equipo */
            tagTeamId: key,
            teamName: r.team_name,
            members: new Map(), // Map<wrestlerId, {name,country}>
            reignCount: 0,
            defenses: 0,
            totalDays: 0,
            isCurrent: false,
          });
        }
        const obj = map.get(key);
        obj.reignCount += 1;
        obj.defenses += defenses;
        obj.totalDays += daysNum;
        if (r.lost_date === null) obj.isCurrent = true;

        /* combinar miembros (evita duplicados) */
        members.forEach((m) => obj.members.set(m.id, m));
      } else if (!isTagTeamTitle && r.wrestler_id) {
        /* ========== AGRUPAR POR WRESTLER (caso single) ========== */
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
        const obj = map.get(key);
        obj.reignCount += 1;
        obj.defenses += defenses;
        obj.totalDays += daysNum;
        if (r.lost_date === null) obj.isCurrent = true;
      }
    });

    /* ---------- transformar en array y etiquetar días+ ---------- */
    const arr = Array.from(map.values()).map((o) => ({
      ...o,
      totalDaysLabel: o.isCurrent ? `${o.totalDays}+` : `${o.totalDays}`,
    }));

    /* ---------- ordenamiento ---------- */
    arr.sort((a, b) => {
      let va, vb;
      switch (aggSortKey) {
        case "N.º":
          va = isTagTeamTitle ? a.tagTeamId : a.wrestlerId;
          vb = isTagTeamTitle ? b.tagTeamId : b.wrestlerId;
          break;
        case "Champion":
          va = isTagTeamTitle
            ? a.teamName.toLowerCase()
            : a.wrestlerName.toLowerCase();
          vb = isTagTeamTitle
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
      if (va < vb) return aggSortOrder === "asc" ? -1 : 1;
      if (va > vb) return aggSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [reigns, defenseSummary, sel, aggSortKey, aggSortOrder]);

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
                          // Oculto toda la columna "Interpreter" cuando sel===5
                          className={`border px-2 py-1 text-center ${
                            widthClass || ""
                          } ${
                            key === "interpreter" && sel === 5 ? "hidden" : ""
                          }`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {(() => {
                      let counter = 0;
                      return sortedReigns.map((r, idx) => {
                        const displayIndex = r.isVacant ? "—" : ++counter;

                        if (r.isVacant) {
                          return (
                            <tr
                              key={r.id || `vacant-${idx}`}
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
                                —
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
                            <td className="border px-2 py-1 text-center">
                              {displayIndex}
                            </td>

                            {/* Champion */}
                            <td className="border px-1 py-1 font-semibold">
                              {r.tag_team_id ? (
                                <>
                                  {/* Nombre del equipo linkeable */}
                                  <Link
                                    href={`/stables/${r.tag_team_id}`}
                                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {r.team_name}
                                  </Link>
                                  <br />
                                  {/* Miembros entre paréntesis, coma y texto pequeño */}
                                  <span className="text-xs">
                                    (
                                    {(r.team_members_raw
                                      ? r.team_members_raw.split(",")
                                      : []
                                    ).map((item, i, arr) => {
                                      const [id, name, country, indivReign] =
                                        item.split("|");
                                      return (
                                        <span key={id} className="items-center">
                                          <Link
                                            href={`/wrestlers/${id}`}
                                            className="items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                          >
                                            <FlagWithName
                                              code={country}
                                              name={name}
                                            />
                                          </Link>
                                          {/* nº de reinado individual */}
                                          &nbsp;(
                                          {indivReign})
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

                            {/* Sólo renderiza esta columna si sel !== 5 */}
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
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* --------------------------------- */}
              {/* Bloque: Total days with the title */}
              {/* --------------------------------- */}
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
                            className={`border px-2 py-1 text-center cursor-pointer select-none ${
                              label === "Interpreter" && sel === 5
                                ? "hidden"
                                : ""
                            }`}
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
                          {/* 1) Número de posición */}
                          <td className="border px-2 py-1 text-center">
                            {idx + 1}
                          </td>

                          {/* 2) Champion / Team */}
                          <td className="border px-2 py-1">
                            {sel === 5 ? (
                              /* -------- FILA DE TAG‑TEAM -------- */
                              <>
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
                              </>
                            ) : (
                              /* -------- FILA INDIVIDUAL -------- */
                              <Link
                                href={`/wrestlers/${row.wrestlerId}`}
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                              >
                                <FlagWithName
                                  code={row.country}
                                  name={row.wrestlerName}
                                />
                              </Link>
                            )}
                          </td>

                          {/* 3) Interpreter — oculto si sel === 5 */}
                          {sel !== 5 && (
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
                          )}

                          {/* 4) Reigns */}
                          <td className="border px-2 py-1 text-center">
                            {row.reignCount}
                          </td>

                          {/* 5) Defensas exitosas */}
                          <td className="border px-2 py-1 text-center">
                            {row.defenses}
                          </td>

                          {/* 6) Días totales */}
                          <td className="border px-2 py-1 text-center">
                            {row.totalDaysLabel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
