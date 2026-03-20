// hooks/useChampionshipStats.js
//
// Toda la lógica de agregación de stats de championships:
//   - currentReignText (campeón actual)
//   - currentDefenses (defensas del reinado activo)
//   - fighterStats (singles: días + reinados + defensas por wrestler)
//   - teamStats (tag: días + reinados + defensas por equipo)
//   - aggregatedStats (versión unificada singles/tag)
//   - sortedIndStats (tag individual stats ordenadas)
// También maneja el estado de sort de las tablas agregadas.

import { useState, useMemo } from "react";
import { calculateDaysHeld, getOrdinalWord, formatEnglishDate } from "./useChampionshipHelpers";

export function useChampionshipStats(reignsArr, defenseSummary, defenses, tagIndividualStats, sel) {

  // ─── Sort: tabla agregada singles ────────────────────────────────────────
  const [aggSortKey,   setAggSortKey]   = useState("Total days");
  const [aggSortOrder, setAggSortOrder] = useState("desc");

  const handleAggSort = (column) => {
    if (column === "#") { setAggSortKey("Total days"); setAggSortOrder("desc"); return; }
    if (aggSortKey === column) setAggSortOrder((p) => p === "asc" ? "desc" : "asc");
    else { setAggSortKey(column); setAggSortOrder("asc"); }
  };

  const renderAggSortIcon = (col) =>
    aggSortKey === col ? (aggSortOrder === "asc" ? " ▲" : " ▼") : null;

  // ─── Sort: tabla tag teams ────────────────────────────────────────────────
  const [teamSortKey,   setTeamSortKey]   = useState("Total days");
  const [teamSortOrder, setTeamSortOrder] = useState("desc");

  const handleTeamSort = (column) => {
    if (column === "#") { setTeamSortKey("Total days"); setTeamSortOrder("desc"); return; }
    if (teamSortKey === column) setTeamSortOrder((p) => p === "asc" ? "desc" : "asc");
    else { setTeamSortKey(column); setTeamSortOrder("asc"); }
  };

  const renderTeamSortIcon = (col) =>
    teamSortKey === col ? (teamSortOrder === "asc" ? " ▲" : " ▼") : null;

  // ─── Sort: tabla individual tag stats ────────────────────────────────────
  const [indSortKey,   setIndSortKey]   = useState("Total days");
  const [indSortOrder, setIndSortOrder] = useState("desc");

  const handleIndSort = (column) => {
    if (column === "#") { setIndSortKey("Total days"); setIndSortOrder("desc"); return; }
    if (indSortKey === column) setIndSortOrder((o) => o === "asc" ? "desc" : "asc");
    else { setIndSortKey(column); setIndSortOrder("asc"); }
  };

  const renderIndSortIcon = (col) =>
    indSortKey === col ? (indSortOrder === "asc" ? " ▲" : " ▼") : null;

  // ─── Campeón actual ───────────────────────────────────────────────────────
  const currentReignText = useMemo(() => {
    if (!Array.isArray(reignsArr) || reignsArr.length === 0) return null;
    const current = reignsArr.find((r) => !r.lost_date);
    if (!current) return null;

    let teamName = null, teamMembers = [];
    if (sel === 5 && current.team_members_raw) {
      teamName    = current.team_name;
      teamMembers = current.team_members_raw.split(",").map((raw) => {
        const [id, name, country] = raw.split("|");
        return { wrestlerId: Number(id), wrestler: name, country };
      });
    }

    let opponentTeamName = null, opponentTeamId = null, opponentTeamMembers = [];
    if (sel === 5 && current.opponent_team_members_raw) {
      opponentTeamName    = current.opponent_team_name;
      opponentTeamId      = current.opponent_tag_team_id;
      opponentTeamMembers = current.opponent_team_members_raw.split(",").map((raw) => {
        const [id, name, country] = raw.split("|");
        return { wrestlerId: Number(id), wrestler: name, country };
      });
    }

    return {
      reignId:                current.id,
      wrestlerId:             current.wrestler_id,
      wrestlerName:           current.wrestler,
      wrestlerCountry:        current.country,
      ordinalWord:            getOrdinalWord(current.reign_number),
      formattedDate:          formatEnglishDate(current.won_date),
      eventId:                current.event_id,
      eventName:              current.event_name,
      tagTeamId:              current.tag_team_id,
      teamName, teamMembers,
      opponentTeamId, opponentTeamName, opponentTeamMembers,
      defeatedOpponentId:      current.opponent_id,
      defeatedOpponent:        current.opponent,
      defeatedOpponentCountry: current.opponent_country,
    };
  }, [reignsArr, sel]);

  // ─── Defensas del reinado actual ─────────────────────────────────────────
  const currentDefenses = useMemo(() => {
    if (!defenses || !currentReignText) return [];
    return defenses.filter((d) => d.reign_id === currentReignText.reignId);
  }, [defenses, currentReignText]);

  // ─── fighterStats (singles) ───────────────────────────────────────────────
  const fighterStats = useMemo(() => {
    if (sel === 5 || !Array.isArray(reignsArr) || !defenseSummary) return [];
    const defMap = new Map(defenseSummary.map((d) => [d.reign_id, d.count]));
    const map    = new Map();

    reignsArr.forEach((r) => {
      if (!r.wrestler_id) return;
      const daysNum = parseInt(calculateDaysHeld(r.won_date, r.lost_date).replace("+",""), 10) || 0;
      const defs    = defMap.get(r.id) || 0;
      if (!map.has(r.wrestler_id)) {
        map.set(r.wrestler_id, {
          wrestlerId: r.wrestler_id, wrestlerName: r.wrestler, country: r.country,
          interpreterId: r.interpreter_id, interpreterName: r.interpreter, interpreterCountry: r.nationality,
          reignCount: 0, defenses: 0, totalDays: 0, isCurrent: false,
        });
      }
      const o = map.get(r.wrestler_id);
      o.reignCount++; o.defenses += defs; o.totalDays += daysNum;
      if (r.lost_date === null) o.isCurrent = true;
    });

    return Array.from(map.values())
      .map((o) => ({ ...o, totalDaysLabel: o.isCurrent ? `${o.totalDays}+` : `${o.totalDays}` }))
      .sort((a, b) => {
        let va, vb;
        switch (aggSortKey) {
          case "Champion":            va = a.wrestlerName.toLowerCase();   vb = b.wrestlerName.toLowerCase();   break;
          case "Interpreter":         va = a.interpreterName.toLowerCase(); vb = b.interpreterName.toLowerCase(); break;
          case "Reigns":              va = a.reignCount;  vb = b.reignCount;  break;
          case "Successful defenses": va = a.defenses;    vb = b.defenses;    break;
          case "Total days":          va = a.totalDays;   vb = b.totalDays;   break;
          default: return 0;
        }
        return aggSortOrder === "asc"
          ? (va < vb ? -1 : va > vb ? 1 : 0)
          : (va > vb ? -1 : va < vb ? 1 : 0);
      });
  }, [sel, reignsArr, defenseSummary, aggSortKey, aggSortOrder]);

  // ─── teamStats (tag) ──────────────────────────────────────────────────────
  const teamStats = useMemo(() => {
    if (sel !== 5 || !Array.isArray(reignsArr) || !defenseSummary) return [];
    const defMap = new Map(defenseSummary.map((d) => [d.reign_id, d.count]));
    const map    = new Map();

    reignsArr.forEach((r) => {
      if (!r.tag_team_id) return;
      const daysNum = parseInt(calculateDaysHeld(r.won_date, r.lost_date).replace("+",""), 10) || 0;
      const defs    = defMap.get(r.id) || 0;
      if (!map.has(r.tag_team_id)) {
        map.set(r.tag_team_id, { tagTeamId: r.tag_team_id, teamName: r.team_name, members: new Map(), reignCount: 0, defenses: 0, totalDays: 0, isCurrent: false });
      }
      const o = map.get(r.tag_team_id);
      o.reignCount++; o.defenses += defs; o.totalDays += daysNum;
      if (r.lost_date === null) o.isCurrent = true;
      (r.team_members_raw || "").split(",").forEach((raw) => {
        const [id, name, country] = raw.split("|");
        if (id) o.members.set(+id, { id: +id, name, country });
      });
    });

    return Array.from(map.values())
      .map((o) => ({ ...o, totalDaysLabel: o.isCurrent ? `${o.totalDays}+` : `${o.totalDays}` }))
      .sort((a, b) => {
        let va, vb;
        switch (teamSortKey) {
          case "Champion":            va = a.teamName.toLowerCase(); vb = b.teamName.toLowerCase(); break;
          case "Reigns":              va = a.reignCount; vb = b.reignCount; break;
          case "Successful defenses": va = a.defenses;   vb = b.defenses;   break;
          case "Total days":          va = a.totalDays;  vb = b.totalDays;  break;
          default: return 0;
        }
        if (va < vb) return teamSortOrder === "asc" ? -1 :  1;
        if (va > vb) return teamSortOrder === "asc" ?  1 : -1;
        return 0;
      });
  }, [sel, reignsArr, defenseSummary, teamSortKey, teamSortOrder]);

  // ─── aggregatedStats (unificado singles/tag) ──────────────────────────────
  const aggregatedStats = useMemo(() => {
    if (!Array.isArray(reignsArr) || !defenseSummary) return [];
    const defMap = new Map(defenseSummary.map((d) => [d.reign_id, d.count]));
    const isTag  = sel === 5;
    const map    = new Map();

    reignsArr.forEach((r) => {
      const rawDays = calculateDaysHeld(r.won_date, r.lost_date).replace("+","");
      const daysNum = Number.isFinite(Number(rawDays)) ? parseInt(rawDays, 10) : 0;
      const defs    = defMap.get(r.id) || 0;

      if (isTag && r.tag_team_id) {
        const key     = r.tag_team_id;
        const members = (r.team_members_raw || "").split(",").map((raw) => {
          if (!raw) return null;
          const parts = raw.split("|");
          const id    = Number(parts[0]);
          return Number.isFinite(id) ? { id, name: parts[1]||"", country: parts[2]||"", reignNum: Number(parts[3])||0 } : null;
        }).filter(Boolean);

        if (!map.has(key)) map.set(key, { tagTeamId: key, teamName: r.team_name, members: new Map(), reignCount: 0, defenses: 0, totalDays: 0, isCurrent: false });
        const o = map.get(key);
        o.reignCount++; o.defenses += defs; o.totalDays += daysNum;
        if (r.lost_date === null) o.isCurrent = true;
        members.forEach((m) => { if (m && Number.isFinite(m.id)) o.members.set(m.id, m); });
      } else if (!isTag && r.wrestler_id) {
        const key = r.wrestler_id;
        if (!map.has(key)) map.set(key, { wrestlerId: key, wrestlerName: r.wrestler, country: r.country, interpreterId: r.interpreter_id, interpreterName: r.interpreter, interpreterCountry: r.nationality, reignCount: 0, defenses: 0, totalDays: 0, isCurrent: false });
        const o = map.get(key);
        o.reignCount++; o.defenses += defs; o.totalDays += daysNum;
        if (r.lost_date === null) o.isCurrent = true;
      }
    });

    return Array.from(map.values())
      .map((o) => ({ ...o, totalDaysLabel: o.isCurrent ? `${o.totalDays}+` : `${o.totalDays}` }))
      .sort((a, b) => {
        let va, vb;
        switch (aggSortKey) {
          case "#":                   va = isTag ? a.tagTeamId : a.wrestlerId; vb = isTag ? b.tagTeamId : b.wrestlerId; break;
          case "Champion":            va = isTag ? a.teamName.toLowerCase() : a.wrestlerName.toLowerCase(); vb = isTag ? b.teamName.toLowerCase() : b.wrestlerName.toLowerCase(); break;
          case "Reigns":              va = a.reignCount; vb = b.reignCount; break;
          case "Successful defenses": va = a.defenses;   vb = b.defenses;   break;
          case "Total days":          va = a.totalDays;  vb = b.totalDays;  break;
          default: return 0;
        }
        return aggSortOrder === "asc"
          ? (va < vb ? -1 : va > vb ? 1 : 0)
          : (va > vb ? -1 : va < vb ? 1 : 0);
      });
  }, [reignsArr, defenseSummary, sel, aggSortKey, aggSortOrder]);

  // ─── sortedIndStats (tag individual) ─────────────────────────────────────
  const sortedIndStats = useMemo(() => {
    const arr = Array.isArray(tagIndividualStats) ? [...tagIndividualStats] : [];
    arr.sort((a, b) => {
      let va, vb;
      switch (indSortKey) {
        case "Champion":            va = a.wrestlerName.toLowerCase();   vb = b.wrestlerName.toLowerCase();   break;
        case "Interpreter":         va = a.interpreterName.toLowerCase(); vb = b.interpreterName.toLowerCase(); break;
        case "Reigns":              va = a.reignCount; vb = b.reignCount; break;
        case "Successful defenses": va = a.defenses;   vb = b.defenses;   break;
        case "Total days":          va = a.totalDays;  vb = b.totalDays;  break;
        default: return 0;
      }
      if (va < vb) return indSortOrder === "asc" ? -1 :  1;
      if (va > vb) return indSortOrder === "asc" ?  1 : -1;
      return 0;
    });
    return arr;
  }, [tagIndividualStats, indSortKey, indSortOrder]);

  return {
    // sort handlers
    handleAggSort,  renderAggSortIcon,
    handleTeamSort, renderTeamSortIcon,
    handleIndSort,  renderIndSortIcon,
    // datos calculados
    currentReignText, currentDefenses,
    fighterStats, teamStats, aggregatedStats, sortedIndStats,
  };
}