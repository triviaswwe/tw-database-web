// hooks/useChampionshipSort.js
//
// Maneja el estado de sorting de la tabla de reinados
// y produce sortedReigns (con vacantes insertados automáticamente).

import { useState, useMemo } from "react";
import { calculateDaysHeld, parseDays } from "./useChampionshipHelpers";

export function useChampionshipSort(reignsArr, sel) {
  const [sortKey,   setSortKey]   = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const handleSort = (column) => {
    if (column === "#") {
      setSortKey(null);
      setSortOrder("asc");
    } else if (sortKey === column) {
      setSortOrder((p) => p === "asc" ? "desc" : "asc");
    } else {
      setSortKey(column);
      setSortOrder("asc");
    }
  };

  const renderSortIcon = (column) => {
    if (sortKey !== column) return null;
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  // Reinados ordenados cronológicamente + vacantes automáticos
  const sortedReigns = useMemo(() => {
    if (!Array.isArray(reignsArr)) return [];

    let arr = reignsArr.map((r, idx) => ({
      ...r,
      __index:           idx,
      __daysHeld:        calculateDaysHeld(r.won_date, r.lost_date),
      __wonDateObj:      r.won_date ? new Date(r.won_date) : new Date(0),
      __eventName:       r.event_name    || "",
      __wrestlerName:    r.wrestler      || "",
      __interpreterName: r.interpreter   || "",
      __notesText:       r.notes         || "",
      isVacant:          false,
    }));

    arr.sort((a, b) => a.__wonDateObj - b.__wonDateObj);

    if (arr.length > 0) {
      const withVac = [];
      const isTag   = sel === 5;
      for (let i = 0; i < arr.length; i++) {
        withVac.push(arr[i]);
        const next = arr[i + 1];
        if (next && arr[i].lost_date && next.won_date && arr[i].lost_date !== next.won_date) {
          const vacantBase = {
            id: `vacant-${i}`, wrestler_id: null, wrestler: "Vacant",
            won_date: arr[i].lost_date,
            era_name: arr[i].era_name, // hereda la era del reinado anterior
            __index: null, __daysHeld: "—",
            __wonDateObj: new Date(arr[i].lost_date),
            __eventName: "", __wrestlerName: "Vacant",
            __interpreterName: "", __notesText: "", isVacant: true,
          };
          withVac.push(isTag ? { ...vacantBase, tag_team_id: null, team_name: "Vacant" } : vacantBase);
        }
      }
      arr = withVac;
    }

    if (sortKey) {
      arr.sort((a, b) => {
        let va, vb;
        switch (sortKey) {
          case "#":          va = a.__index          ?? -Infinity; vb = b.__index          ?? -Infinity; break;
          case "Champion":   va = (a.__wrestlerName   || "").toLowerCase(); vb = (b.__wrestlerName   || "").toLowerCase(); break;
          case "Interpreter":va = (a.__interpreterName|| "").toLowerCase(); vb = (b.__interpreterName|| "").toLowerCase(); break;
          case "Won Date":   va = a.__wonDateObj;     vb = b.__wonDateObj;     break;
          case "Event":      va = (a.__eventName      || "").toLowerCase(); vb = (b.__eventName      || "").toLowerCase(); break;
          case "Reign #":    va = a.reign_number      ?? -Infinity; vb = b.reign_number      ?? -Infinity; break;
          case "Days Held":  va = parseDays(a.__daysHeld); vb = parseDays(b.__daysHeld); break;
          default: return 0;
        }
        if (va < vb) return sortOrder === "asc" ? -1 : 1;
        if (va > vb) return sortOrder === "asc" ?  1 : -1;
        return 0;
      });
    }

    return arr;
  }, [reignsArr, sel, sortKey, sortOrder]);

  // ID del reinado más largo (para mostrar nota en la tabla)
  const longestReignId = useMemo(() => {
    if (!Array.isArray(sortedReigns) || sortedReigns.length === 0) return null;
    let maxDays = -Infinity, winner = null;
    sortedReigns.forEach((r) => {
      if (r.isVacant) return;
      const d = parseDays(r.__daysHeld);
      if (d > maxDays) { maxDays = d; winner = r.id; }
    });
    return winner;
  }, [sortedReigns]);

  // Eras únicas en orden cronológico (derivadas de los reinados)
  const orderedEraNames = useMemo(() => {
    if (!Array.isArray(reignsArr) || reignsArr.length === 0) return [];
    const seen   = new Set();
    const result = [];
    [...reignsArr]
      .sort((a, b) => new Date(a.won_date || 0) - new Date(b.won_date || 0))
      .forEach((r) => {
        if (r.era_name && !seen.has(r.era_name)) {
          seen.add(r.era_name);
          result.push(r.era_name);
        }
      });
    return result;
  }, [reignsArr]);

  return {
    sortKey, sortOrder, handleSort, renderSortIcon,
    sortedReigns, longestReignId, orderedEraNames,
  };
}