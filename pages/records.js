// pages/records.js

import React, { useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import pool from "../lib/db";
import FlagWithName from "../components/FlagWithName";

export async function getServerSideProps() {
  try {
    // ==========================================
    // 1. WRESTLERS: Más Combates y Más Victorias
    // ==========================================
    const [wMatchesRows] = await pool.query(`
      SELECT w.id, w.wrestler AS name, w.country, COUNT(mp.match_id) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'name', IFNULL(i.interpreter, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT interpreter_id, COUNT(match_id) as cnt
            FROM match_participants
            WHERE wrestler_id = w.id AND interpreter_id IS NOT NULL
            GROUP BY interpreter_id
          ) sub
          LEFT JOIN interpreters i ON sub.interpreter_id = i.id
        ) AS breakdown
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      GROUP BY w.id, w.wrestler, w.country
      ORDER BY total DESC
      LIMIT 10
    `);

    const [wWinsRows] = await pool.query(`
      SELECT w.id, w.wrestler AS name, w.country, SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'name', IFNULL(i.interpreter, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT interpreter_id, SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as cnt
            FROM match_participants
            WHERE wrestler_id = w.id AND interpreter_id IS NOT NULL
            GROUP BY interpreter_id
            HAVING cnt > 0
          ) sub
          LEFT JOIN interpreters i ON sub.interpreter_id = i.id
        ) AS breakdown
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      GROUP BY w.id, w.wrestler, w.country
      ORDER BY total DESC
      LIMIT 10
    `);

    const [wTopStatsRows] = await pool.query(`
      SELECT 
        w.id, w.wrestler AS name, w.country,
        COUNT(mp.match_id) AS total_matches,
        SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
        ROUND((SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) * 100.0) / COUNT(mp.match_id), 2) AS win_percentage
      FROM match_participants mp
      JOIN wrestlers w ON mp.wrestler_id = w.id
      GROUP BY w.id, w.wrestler, w.country
      ORDER BY wins DESC, win_percentage DESC
      LIMIT 10
    `);

    // ==========================================
    // 2. INTERPRETERS: Más Combates y Más Victorias
    // ==========================================
    const [iMatchesRows] = await pool.query(`
      SELECT i.id, i.interpreter AS name, i.nationality AS country, COUNT(mp.match_id) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', w.id, 'name', IFNULL(w.wrestler, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT wrestler_id, COUNT(match_id) as cnt
            FROM match_participants
            WHERE interpreter_id = i.id
            GROUP BY wrestler_id
          ) sub
          LEFT JOIN wrestlers w ON sub.wrestler_id = w.id
        ) AS breakdown
      FROM match_participants mp
      JOIN interpreters i ON mp.interpreter_id = i.id
      GROUP BY i.id, i.interpreter, i.nationality
      ORDER BY total DESC
      LIMIT 10
    `);

    const [iWinsRows] = await pool.query(`
      SELECT i.id, i.interpreter AS name, i.nationality AS country, SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS total,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', w.id, 'name', IFNULL(w.wrestler, 'Unknown'), 'count', sub.cnt))
          FROM (
            SELECT wrestler_id, SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as cnt
            FROM match_participants
            WHERE interpreter_id = i.id
            GROUP BY wrestler_id
            HAVING cnt > 0
          ) sub
          LEFT JOIN wrestlers w ON sub.wrestler_id = w.id
        ) AS breakdown
      FROM match_participants mp
      JOIN interpreters i ON mp.interpreter_id = i.id
      GROUP BY i.id, i.interpreter, i.nationality
      ORDER BY total DESC
      LIMIT 10
    `);

    const [iTopStatsRows] = await pool.query(`
      SELECT 
        i.id, i.interpreter AS name, i.nationality AS country,
        COUNT(mp.match_id) AS total_matches,
        SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
        ROUND((SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) * 100.0) / COUNT(mp.match_id), 2) AS win_percentage
      FROM match_participants mp
      JOIN interpreters i ON mp.interpreter_id = i.id
      GROUP BY i.id, i.interpreter, i.nationality
      ORDER BY wins DESC, win_percentage DESC
      LIMIT 10
    `);

    const processBreakdown = (rows) => rows.map(r => {
      let bd = r.breakdown;
      if (typeof bd === 'string') {
        try { bd = JSON.parse(bd); } catch (e) { bd = []; }
      }
      return { ...r, breakdown: bd || [] };
    });

    const wMatches = processBreakdown(wMatchesRows);
    const wWins = processBreakdown(wWinsRows);
    const iMatches = processBreakdown(iMatchesRows);
    const iWins = processBreakdown(iWinsRows);

    // ==========================================
    // 3. HISTORIAL: Rachas de Victorias e Invictos
    // ==========================================
    const [historyRows] = await pool.query(`
      SELECT
        m.id AS match_id, e.id AS event_id, e.name AS event_name, e.event_date,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'wrestler_id', mp.wrestler_id, 
            'wrestler', w.wrestler, 
            'country', w.country, 
            'team_number', mp.team_number, 
            'result', mp.result,
            'interpreter_id', mp.interpreter_id,
            'interpreter', i.interpreter,
            'interpreter_country', i.nationality
          ))
          FROM match_participants mp 
          JOIN wrestlers w ON mp.wrestler_id = w.id
          LEFT JOIN interpreters i ON mp.interpreter_id = i.id
          WHERE mp.match_id = m.id
        ) AS participants,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number', mts.team_number, 'score', mts.score))
          FROM match_team_scores mts WHERE mts.match_id = m.id
        ) AS scores
      FROM matches m
      JOIN events e ON m.event_id = e.id
      ORDER BY e.event_date ASC, m.match_order ASC
    `);

    const buildStreaks = (isInterpreter = false) => {
      const allWins = [];
      const allUndefs = [];
      let counter = 0;
      const stateMap = new Map();

      for (const match of historyRows) {
        let parts = match.participants;
        let scores = match.scores;
        if (typeof parts === "string") parts = JSON.parse(parts);
        if (typeof scores === "string") scores = JSON.parse(scores);
        parts = parts || [];
        scores = scores || [];

        const scoreMap = scores.reduce((acc, s) => { acc[s.team_number] = s.score; return acc; }, {});

        const entitiesInMatch = {};
        for (const p of parts) {
          const id = isInterpreter ? p.interpreter_id : p.wrestler_id;
          if (!id) continue;
          if (!entitiesInMatch[id]) {
            entitiesInMatch[id] = {
              id: id,
              name: isInterpreter ? p.interpreter : p.wrestler,
              country: isInterpreter ? p.interpreter_country : p.country,
              team_number: p.team_number,
              result: p.result
            };
          }
        }

        for (const entityId in entitiesInMatch) {
          const e = entitiesInMatch[entityId];
          
          if (!stateMap.has(e.id)) {
            stateMap.set(e.id, {
              entityId: e.id, name: e.name, country: e.country,
              winCount: 0, winMatches: [],
              undefCount: 0, undefMatches: [], undefStartDate: null,
            });
          }
          const st = stateMap.get(e.id);

          const myTeam = e.team_number;
          const myTeamMembers = parts.filter(x => x.team_number === myTeam);
          let partners = [];
          
          if (isInterpreter) {
            // El intérprete se comporta de la misma forma que el luchador que representa,
            // buscando a sus compañeros de equipo (ignorando al propio luchador que interpreta).
            const repWrestler = myTeamMembers.find(x => x.interpreter_id === e.id);
            if (repWrestler) {
              partners = myTeamMembers.filter(x => x.wrestler_id !== repWrestler.wrestler_id);
            }
          } else {
            partners = myTeamMembers.filter(x => x.wrestler_id !== e.id);
          }
          
          const opponents = parts.filter(x => x.team_number !== myTeam);

          let scoreStr = null;
          const hasScores = Object.keys(scoreMap).length > 0;
          if (hasScores && scoreMap[myTeam] != null) {
            const oppTeamNumbers = [...new Set(opponents.map(x => x.team_number))];
            if (oppTeamNumbers.length === 1 && scoreMap[oppTeamNumbers[0]] != null) {
              scoreStr = `${scoreMap[myTeam]}-${scoreMap[oppTeamNumbers[0]]}`;
            } else if (oppTeamNumbers.length > 1) {
              scoreStr = `${scoreMap[myTeam]}-` + oppTeamNumbers.map((tn) => scoreMap[tn] ?? 0).join("-");
            }
          }

          const matchDetail = {
            event_id: match.event_id,
            event_name: match.event_name,
            result: e.result,
            scoreStr,
            isTagTeamChampionship: false,
            partners: partners.map(x => ({ id: x.wrestler_id, name: x.wrestler })),
            opponents: opponents.map(x => ({ id: x.wrestler_id, name: x.wrestler })),
          };

          const matchDate = new Date(match.event_date);

          if (e.result === "WIN") {
            st.winCount++;
            st.winMatches.push(matchDetail);
          } else {
            if (st.winCount > 0) {
              allWins.push({
                id: `win_${++counter}`,
                entityId: st.entityId, name: st.name, country: st.country,
                count: st.winCount, matches: [...st.winMatches],
                streakBreaker: matchDetail,
              });
              st.winCount = 0;
              st.winMatches = [];
            }
          }

          if (e.result === "WIN" || e.result === "DRAW") {
            if (st.undefCount === 0) st.undefStartDate = matchDate;
            st.undefCount++;
            st.undefMatches.push(matchDetail);
          } else if (e.result === "LOSS") {
            if (st.undefCount > 0) {
              const days = Math.floor((matchDate - st.undefStartDate) / (1000 * 60 * 60 * 24));
              allUndefs.push({
                id: `undef_${++counter}`,
                entityId: st.entityId, name: st.name, country: st.country,
                count: st.undefCount, matches: [...st.undefMatches],
                days: days, streakBreaker: matchDetail,
              });
              st.undefCount = 0;
              st.undefMatches = [];
              st.undefStartDate = null;
            }
          }
        }
      }

      const now = new Date();
      for (const st of stateMap.values()) {
        if (st.winCount > 0) {
          allWins.push({
            id: `win_${++counter}`,
            entityId: st.entityId, name: st.name, country: st.country,
            count: st.winCount, matches: [...st.winMatches], streakBreaker: null,
          });
        }
        if (st.undefCount > 0) {
          const days = Math.floor((now - st.undefStartDate) / (1000 * 60 * 60 * 24));
          allUndefs.push({
            id: `undef_${++counter}`,
            entityId: st.entityId, name: st.name, country: st.country,
            count: st.undefCount, matches: [...st.undefMatches], days: days, streakBreaker: null,
          });
        }
      }

      return {
        wins: allWins.sort((a, b) => b.count - a.count).slice(0, 10),
        undefs: allUndefs.sort((a, b) => b.count - a.count).slice(0, 10)
      };
    };

    const wStreaks = buildStreaks(false);
    const iStreaks = buildStreaks(true);

    // ==========================================
    // 4. REINADOS: Largos y Defensas
    // ==========================================
    const [wLongestReignsRows] = await pool.query(`
      SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
          cr.wrestler_id, w.wrestler AS entity_name, w.country, cr.tag_team_id, tt.name AS tag_team_name, c.title_name,
          (SELECT COUNT(DISTINCT m.id) FROM matches m JOIN events e ON e.id = m.event_id AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)
           JOIN match_participants mp ON mp.match_id = m.id AND ((cr.wrestler_id IS NOT NULL AND mp.wrestler_id = cr.wrestler_id) OR (cr.tag_team_id IS NOT NULL AND mp.tag_team_id = cr.tag_team_id))
           WHERE m.championship_id = cr.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL) AS defenses_count
      FROM championship_reigns cr LEFT JOIN wrestlers w ON cr.wrestler_id = w.id LEFT JOIN tag_teams tt ON cr.tag_team_id = tt.id JOIN championships c ON cr.championship_id = c.id
      WHERE cr.wrestler_id IS NOT NULL OR cr.tag_team_id IS NOT NULL
      ORDER BY days_held DESC LIMIT 10
    `);

    const [wMostDefensesRows] = await pool.query(`
      SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
          cr.wrestler_id, w.wrestler AS entity_name, w.country, cr.tag_team_id, tt.name AS tag_team_name, c.title_name,
          (SELECT COUNT(DISTINCT m.id) FROM matches m JOIN events e ON e.id = m.event_id AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)
           JOIN match_participants mp ON mp.match_id = m.id AND ((cr.wrestler_id IS NOT NULL AND mp.wrestler_id = cr.wrestler_id) OR (cr.tag_team_id IS NOT NULL AND mp.tag_team_id = cr.tag_team_id))
           WHERE m.championship_id = cr.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL) AS defenses_count
      FROM championship_reigns cr LEFT JOIN wrestlers w ON cr.wrestler_id = w.id LEFT JOIN tag_teams tt ON cr.tag_team_id = tt.id JOIN championships c ON cr.championship_id = c.id
      WHERE cr.wrestler_id IS NOT NULL OR cr.tag_team_id IS NOT NULL
      ORDER BY defenses_count DESC, days_held DESC LIMIT 10
    `);

    const [iLongestReignsRows] = await pool.query(`
      SELECT 
          base.reign_id,
          base.won_date,
          base.lost_date,
          MAX(base.days_held) AS days_held,
          base.interpreter_id,
          base.entity_name,
          base.country,
          base.title_name,
          (
              SELECT COUNT(DISTINCT m.id)
              FROM matches m
              JOIN events e ON e.id = m.event_id AND e.event_date >= base.won_date AND (base.lost_date IS NULL OR e.event_date <= base.lost_date)
              JOIN match_participants mp ON mp.match_id = m.id AND mp.interpreter_id = base.interpreter_id
              WHERE m.championship_id = base.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL
          ) AS defenses_count
      FROM (
          SELECT 
              cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
              cr.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, cr.championship_id
          FROM championship_reigns cr
          JOIN interpreters i ON i.id = cr.interpreter_id
          JOIN championships c ON cr.championship_id = c.id
          WHERE cr.interpreter_id IS NOT NULL
          UNION
          SELECT 
              cr.id AS reign_id, rm.start_date AS won_date, rm.end_date AS lost_date, DATEDIFF(IFNULL(rm.end_date, UTC_DATE()), rm.start_date) AS days_held,
              rm.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, cr.championship_id
          FROM reign_members rm
          JOIN championship_reigns cr ON cr.id = rm.reign_id
          JOIN interpreters i ON i.id = rm.interpreter_id
          JOIN championships c ON cr.championship_id = c.id
          WHERE rm.interpreter_id IS NOT NULL
      ) AS base
      GROUP BY base.reign_id, base.interpreter_id, base.won_date, base.lost_date, base.entity_name, base.country, base.title_name, base.championship_id
      ORDER BY days_held DESC 
      LIMIT 10
    `);

    const [iMostDefensesRows] = await pool.query(`
      SELECT 
          base.reign_id,
          base.won_date,
          base.lost_date,
          MAX(base.days_held) AS days_held,
          base.interpreter_id,
          base.entity_name,
          base.country,
          base.title_name,
          (
              SELECT COUNT(DISTINCT m.id)
              FROM matches m
              JOIN events e ON e.id = m.event_id AND e.event_date >= base.won_date AND (base.lost_date IS NULL OR e.event_date <= base.lost_date)
              JOIN match_participants mp ON mp.match_id = m.id AND mp.interpreter_id = base.interpreter_id
              WHERE m.championship_id = base.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL
          ) AS defenses_count
      FROM (
          SELECT 
              cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
              cr.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, cr.championship_id
          FROM championship_reigns cr
          JOIN interpreters i ON i.id = cr.interpreter_id
          JOIN championships c ON cr.championship_id = c.id
          WHERE cr.interpreter_id IS NOT NULL
          UNION
          SELECT 
              cr.id AS reign_id, rm.start_date AS won_date, rm.end_date AS lost_date, DATEDIFF(IFNULL(rm.end_date, UTC_DATE()), rm.start_date) AS days_held,
              rm.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, cr.championship_id
          FROM reign_members rm
          JOIN championship_reigns cr ON cr.id = rm.reign_id
          JOIN interpreters i ON i.id = rm.interpreter_id
          JOIN championships c ON cr.championship_id = c.id
          WHERE rm.interpreter_id IS NOT NULL
      ) AS base
      GROUP BY base.reign_id, base.interpreter_id, base.won_date, base.lost_date, base.entity_name, base.country, base.title_name, base.championship_id
      ORDER BY defenses_count DESC, days_held DESC 
      LIMIT 10
    `);

    const reignIdsSet = new Set([
      ...wLongestReignsRows.map((r) => r.reign_id), ...wMostDefensesRows.map((r) => r.reign_id),
      ...iLongestReignsRows.map((r) => r.reign_id), ...iMostDefensesRows.map((r) => r.reign_id),
    ]);
    const reignIdsArray = Array.from(reignIdsSet);

    let globalDefenses = [];
    if (reignIdsArray.length > 0) {
      const placeholders = reignIdsArray.map(() => "?").join(",");
      const [defenseMatches] = await pool.query(`
        SELECT
            cr.id AS reign_id, m.id AS match_id, m.title_changed, e.id AS event_id, e.name AS event_name,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('wrestler_id', mp.wrestler_id, 'wrestler', w2.wrestler, 'country', w2.country, 'team_number', mp.team_number, 'result', mp.result, 'tag_team_id', mp.tag_team_id, 'interpreter_id', mp.interpreter_id))
             FROM match_participants mp JOIN wrestlers w2 ON w2.id = mp.wrestler_id WHERE mp.match_id = m.id) AS participants,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number', mts.team_number, 'score', mts.score))
             FROM match_team_scores mts WHERE mts.match_id = m.id) AS scores,
            cr.wrestler_id AS champ_wrestler_id, cr.tag_team_id AS champ_tag_team_id, cr.interpreter_id AS champ_interpreter_id
        FROM matches m JOIN events e ON m.event_id = e.id
        JOIN championship_reigns cr ON m.championship_id = cr.championship_id AND m.title_match = 1 AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date <= cr.lost_date)
        JOIN match_participants mp_champ ON mp_champ.match_id = m.id AND (
            (cr.wrestler_id IS NOT NULL AND mp_champ.wrestler_id = cr.wrestler_id) OR
            (cr.tag_team_id IS NOT NULL AND mp_champ.tag_team_id = cr.tag_team_id) OR
            (cr.interpreter_id IS NOT NULL AND mp_champ.interpreter_id = cr.interpreter_id)
        )
        WHERE cr.id IN (${placeholders})
        GROUP BY cr.id, m.id, m.title_changed, e.id, e.name, cr.wrestler_id, cr.tag_team_id, cr.interpreter_id
        ORDER BY e.event_date ASC, m.match_order ASC
      `, reignIdsArray);
      globalDefenses = defenseMatches;
    }

    const defensesByReign = {};
    const breakerByReign = {};

    for (const match of globalDefenses) {
      let parts = match.participants;
      let scores = match.scores;
      if (typeof parts === "string") parts = JSON.parse(parts);
      if (typeof scores === "string") scores = JSON.parse(scores);
      parts = parts || [];
      scores = scores || [];

      let myTeam = null;
      let myResult = null;

      if (match.champ_wrestler_id) {
        const p = parts.find(x => x.wrestler_id === match.champ_wrestler_id);
        if (p) { myTeam = p.team_number; myResult = p.result; }
      } else if (match.champ_tag_team_id) {
        const p = parts.find(x => x.tag_team_id === match.champ_tag_team_id);
        if (p) { myTeam = p.team_number; myResult = p.result; }
      } else if (match.champ_interpreter_id) {
        const p = parts.find(x => x.interpreter_id === match.champ_interpreter_id);
        if (p) { myTeam = p.team_number; myResult = p.result; }
      }

      if (myTeam === null) continue;

      const scoreMap = scores.reduce((acc, s) => { acc[s.team_number] = s.score; return acc; }, {});
      let defendingWrestlers = parts.filter((x) => x.team_number === myTeam);
      let opponents = parts.filter((x) => x.team_number !== myTeam);
      const isTagTeamChampionship = match.champ_tag_team_id !== null;

      let scoreStr = null;
      const hasScores = Object.keys(scoreMap).length > 0;
      if (hasScores && scoreMap[myTeam] != null) {
        const oppTeamNumbers = [...new Set(opponents.map((x) => x.team_number))];
        if (oppTeamNumbers.length === 1 && scoreMap[oppTeamNumbers[0]] != null) {
          scoreStr = `${scoreMap[myTeam]}-${scoreMap[oppTeamNumbers[0]]}`;
        } else if (oppTeamNumbers.length > 1) {
          scoreStr = `${scoreMap[myTeam]}-` + oppTeamNumbers.map((tn) => scoreMap[tn] ?? 0).join("-");
        }
      }

      const matchDetail = {
        event_id: match.event_id, event_name: match.event_name, result: myResult, scoreStr,
        isTagTeamChampionship: isTagTeamChampionship,
        partners: [],
        opponents: opponents.map((x) => ({ id: x.wrestler_id, name: x.wrestler })),
        defending_interpreter_ids: defendingWrestlers.map(x => x.interpreter_id).filter(id => id != null)
      };

      if (isTagTeamChampionship) {
        matchDetail.partners = defendingWrestlers.map((x) => ({ id: x.wrestler_id, name: x.wrestler }));
      } else {
        if (match.champ_wrestler_id) {
          matchDetail.partners = defendingWrestlers.filter((x) => x.wrestler_id !== match.champ_wrestler_id).map((x) => ({ id: x.wrestler_id, name: x.wrestler }));
        } else if (match.champ_interpreter_id) {
          const repWrestler = defendingWrestlers.find(x => x.interpreter_id === match.champ_interpreter_id);
          if (repWrestler) {
            matchDetail.partners = defendingWrestlers.filter(x => x.wrestler_id !== repWrestler.wrestler_id).map(x => ({ id: x.wrestler_id, name: x.wrestler }));
          } else {
            matchDetail.partners = [];
          }
        } else {
          matchDetail.partners = defendingWrestlers.map((x) => ({ id: x.wrestler_id, name: x.wrestler }));
        }
      }

      if (match.title_changed === 1 && myResult !== "WIN") {
        breakerByReign[match.reign_id] = matchDetail;
      } else if (match.title_changed === 0) {
        if (!defensesByReign[match.reign_id]) defensesByReign[match.reign_id] = [];
        defensesByReign[match.reign_id].push(matchDetail);
      }
    }

    const processReigns = (rows, prefix) => rows.map((r, index) => {
      let filteredDefenses = defensesByReign[r.reign_id] || [];
      let filteredBreaker = breakerByReign[r.reign_id] || null;

      if (r.interpreter_id) {
        filteredDefenses = filteredDefenses.filter(m => m.defending_interpreter_ids.includes(r.interpreter_id));
        if (filteredBreaker && !filteredBreaker.defending_interpreter_ids.includes(r.interpreter_id)) {
          filteredBreaker = null;
        }
      }

      return {
        ...r,
        id: `${prefix}_${r.reign_id}_${r.interpreter_id || r.tag_team_id || r.wrestler_id || index}`,
        days_held_label: r.lost_date === null ? `${r.days_held}+` : r.days_held,
        defenses: filteredDefenses,
        streakBreaker: filteredBreaker,
      };
    });

    return {
      props: {
        wData: {
          matches: JSON.parse(JSON.stringify(wMatches)),
          wins: JSON.parse(JSON.stringify(wWins)),
          topStats: JSON.parse(JSON.stringify(wTopStatsRows)),
          winStreaks: JSON.parse(JSON.stringify(wStreaks.wins)),
          undefStreaks: JSON.parse(JSON.stringify(wStreaks.undefs)),
          longestReigns: JSON.parse(JSON.stringify(processReigns(wLongestReignsRows, 'wlr'))),
          mostDefenses: JSON.parse(JSON.stringify(processReigns(wMostDefensesRows, 'wmd')))
        },
        iData: {
          matches: JSON.parse(JSON.stringify(iMatches)),
          wins: JSON.parse(JSON.stringify(iWins)),
          topStats: JSON.parse(JSON.stringify(iTopStatsRows)),
          winStreaks: JSON.parse(JSON.stringify(iStreaks.wins)),
          undefStreaks: JSON.parse(JSON.stringify(iStreaks.undefs)),
          longestReigns: JSON.parse(JSON.stringify(processReigns(iLongestReignsRows, 'ilr'))),
          mostDefenses: JSON.parse(JSON.stringify(processReigns(iMostDefensesRows, 'imd')))
        }
      },
    };
  } catch (error) {
    console.error("Error loading records:", error);
    return { props: { error: true } };
  }
}

export default function RecordsPage({ error, wData, iData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("wrestler");
  const [expandedRow, setExpandedRow] = useState(null);

  const [undefSort, setUndefSort] = useState({ key: "count", dir: "desc" });
  const [topSort, setTopSort] = useState({ key: "wins", dir: "desc" });
  const [lrSort, setLrSort] = useState({ key: "days_held", dir: "desc" });
  const [mdSort, setMdSort] = useState({ key: "defenses_count", dir: "desc" });

  if (error) {
    return (
      <div className="p-8 text-center text-white">
        <h1 className="text-2xl font-bold mb-2">Error al cargar récords</h1>
        <p className="text-gray-400">Hubo un problema conectando con la base de datos.</p>
      </div>
    );
  }

  const toggleExpand = (key) => setExpandedRow((prev) => (prev === key ? null : key));
  const activeData = activeTab === "wrestler" ? wData : iData;
  const isWrestler = activeTab === "wrestler";
  const entityTitle = isWrestler ? "Wrestler" : "Interpreter";
  const breakdownTitle = isWrestler ? "Interpreters breakdown:" : "Wrestlers breakdown:";
  const entityUrl = isWrestler ? "/wrestlers" : "/interpreters";
  const breakdownUrl = isWrestler ? "/interpreters" : "/wrestlers";

  const sortedUndefeated = useMemo(() => {
    return [...activeData.undefStreaks].sort((a, b) => {
      const valA = undefSort.key === "count" ? a.count : a.days;
      const valB = undefSort.key === "count" ? b.count : b.days;
      return valB - valA;
    });
  }, [activeData.undefStreaks, undefSort]);

  const sortedTopStats = useMemo(() => {
    return [...activeData.topStats].sort((a, b) => {
      const valA = topSort.key === "wins" ? a.wins : parseFloat(a.win_percentage);
      const valB = topSort.key === "wins" ? b.wins : parseFloat(b.win_percentage);
      return valB - valA;
    });
  }, [activeData.topStats, topSort]);

  const sortedLongestReigns = useMemo(() => {
    return [...activeData.longestReigns].sort((a, b) => {
      return b.days_held - a.days_held;
    });
  }, [activeData.longestReigns]);

  const sortedMostDefenses = useMemo(() => {
    return [...activeData.mostDefenses].sort((a, b) => {
      return b.defenses_count - a.defenses_count;
    });
  }, [activeData.mostDefenses]);

  const renderTable = (
    title,
    data,
    columns,
    renderRow,
    expandPrefix = null,
    renderExpanded = null,
    expandTitle = "Match breakdown:",
    isRowExpandable = () => true,
    onRowClick = null
  ) => (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden h-fit">
      <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 text-sm">
              <th className="px-4 py-2 w-12 text-center">#</th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-4 py-2 ${col.onSort ? "cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none" : ""}`}
                  onClick={col.onSort ? col.onSort : undefined}
                >
                  <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                    {col.label}
                    {col.sortDir && <span className="text-[10px] text-blue-500">▼</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {data.map((item, idx) => {
              const uniqueId = `${expandPrefix}_${item.id || item.entityId}`;
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
                    title={isExpandable ? "Click to view breakdown" : onRowClick ? "Click to view profile" : ""}
                  >
                    <td className="px-4 py-3 text-center font-semibold text-gray-500 dark:text-gray-400">
                      {isExpandable ? (
                        <span className="flex items-center justify-center gap-1">
                          <span className={`text-[10px] transition-transform ${isExpanded ? "rotate-90 text-blue-500" : ""}`}>
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
                      <td colSpan={columns.length + 1} className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                          <p className="font-semibold mb-2 text-blue-600 dark:text-sky-400">
                            {expandTitle}
                          </p>
                          <ul className="space-y-1.5">{renderExpanded(item)}</ul>
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
      m.result === "WIN" ? "text-[#16a34a] dark:text-[#93c47d]"
        : m.result === "LOSS" ? "text-red-500"
        : m.result === "DRAW" ? "text-[#d97706] dark:text-[#ffe599]"
        : "text-gray-500";
    
    // Todos los combates utilizarán directamente el arreglo unificado partners,
    // que ahora contiene EXACTAMENTE la misma información para Interpretes y Wrestlers.
    const partnersToRender = m.partners;

    return (
      <li key={indexNumber} className="pl-1 flex items-start text-sm">
        <span className={`mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono ${isBreaker ? "line-through opacity-70" : ""}`}>
          {indexNumber}.
        </span>
        <div className="flex-1">
          <strong className={resultColor}>{m.result}</strong>{" "}
          {m.isTagTeamChampionship
            ? partnersToRender.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  {partnersToRender.map((pt, idx) => (
                    <React.Fragment key={pt.id}>
                      {idx > 0 && " & "}
                      <Link href={`/wrestlers/${pt.id}`} className="text-blue-600 dark:text-sky-400" onClick={(e) => e.stopPropagation()}>
                        {pt.name}
                      </Link>
                    </React.Fragment>
                  ))}{" "}
                </span>
              )
            : partnersToRender.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  w/{" "}
                  {partnersToRender.map((pt, idx) => (
                    <React.Fragment key={pt.id}>
                      {idx > 0 && " & "}
                      <Link href={`/wrestlers/${pt.id}`} className="text-blue-600 dark:text-sky-400" onClick={(e) => e.stopPropagation()}>
                        {pt.name}
                      </Link>
                    </React.Fragment>
                  ))}{" "}
                </span>
              )}
          {m.scoreStr ? <span className="font-bold mx-1">{m.scoreStr}</span> : <span className="text-gray-600 dark:text-gray-400 mx-1">vs</span>}
          {m.opponents.map((opp, idx) => (
            <React.Fragment key={opp.id}>
              {idx > 0 && " & "}
              <Link href={`/wrestlers/${opp.id}`} className="text-blue-600 dark:text-sky-400" onClick={(e) => e.stopPropagation()}>
                {opp.name}
              </Link>
            </React.Fragment>
          ))}
          <span className="text-gray-500 text-[11px] ml-2 block sm:inline">
            (<Link href={`/events/${m.event_id}`} className="text-gray-500 dark:text-gray-400" onClick={(e) => e.stopPropagation()}>{m.event_name}</Link>)
          </span>
        </div>
      </li>
    );
  };

  const tabClasses = (tab) =>
    `pb-2 px-1 border-b-2 font-medium text-lg transition-colors cursor-pointer ${
      activeTab === tab
        ? "border-blue-500 text-blue-600 dark:text-sky-400"
        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
    }`;

  return (
    <>
      <Head>
        <title>Records — Trivias WWE</title>
        <meta name="description" content="Historical statistics and rankings for the Trivias WWE Championship." />
      </Head>

      <div className="min-h-screen bg-white text-black dark:bg-zinc-950 dark:text-white transition-colors duration-300 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">Hall of Records</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Historical statistics and rankings for the Trivias WWE Championship.
            </p>
          </div>

          <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800 mb-6">
            <button className={tabClasses("wrestler")} onClick={() => { setActiveTab("wrestler"); setExpandedRow(null); }}>
              Per Wrestler
            </button>
            <button className={tabClasses("interpreter")} onClick={() => { setActiveTab("interpreter"); setExpandedRow(null); }}>
              Per Interpreter
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {renderTable(
              "Most Matches",
              activeData.matches,
              [{ label: entityTitle }, { label: "Matches", align: "right" }],
              (item) => (
                <>
                  <td className="px-4 py-3">
                    <Link href={`${entityUrl}/${item.id}`} className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <FlagWithName code={item.country} name={item.name} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{item.total}</td>
                </>
              ),
              "matches",
              (item) => (
                <>
                  {item.breakdown?.sort((a, b) => b.count - a.count).map((bd, idx) => (
                    <li key={idx} className="pl-1 flex items-start text-sm">
                      <span className="mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono text-right font-bold">{bd.count}</span>
                      {bd.id ? (
                        <Link href={`${breakdownUrl}/${bd.id}`} className="text-blue-600 dark:text-sky-400" onClick={(e) => e.stopPropagation()}>
                          {bd.name}
                        </Link>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">{bd.name}</span>
                      )}
                    </li>
                  ))}
                </>
              ),
              breakdownTitle,
              (item) => item.breakdown?.length > 1
            )}

            {renderTable(
              "Most Wins",
              activeData.wins,
              [{ label: entityTitle }, { label: "Wins", align: "right" }],
              (item) => (
                <>
                  <td className="px-4 py-3">
                    <Link href={`${entityUrl}/${item.id}`} className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <FlagWithName code={item.country} name={item.name} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#16a34a] dark:text-[#93c47d]">{item.total}</td>
                </>
              ),
              "wins",
              (item) => (
                <>
                  {item.breakdown?.sort((a, b) => b.count - a.count).map((bd, idx) => (
                    <li key={idx} className="pl-1 flex items-start text-sm">
                      <span className="mr-2 inline-block min-w-[20px] text-[#16a34a] dark:text-[#93c47d] font-mono text-right font-bold">{bd.count}</span>
                      {bd.id ? (
                        <Link href={`${breakdownUrl}/${bd.id}`} className="text-blue-600 dark:text-sky-400" onClick={(e) => e.stopPropagation()}>
                          {bd.name}
                        </Link>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">{bd.name}</span>
                      )}
                    </li>
                  ))}
                </>
              ),
              breakdownTitle,
              (item) => item.breakdown?.length > 1
            )}

            {renderTable(
              "Longest Undefeated Streak",
              sortedUndefeated,
              [
                { label: entityTitle },
                { label: "Matches", align: "right", onSort: () => setUndefSort({ key: "count", dir: "desc" }), sortDir: undefSort.key === "count" ? "desc" : null },
                { label: "Days", align: "right", onSort: () => setUndefSort({ key: "days", dir: "desc" }), sortDir: undefSort.key === "days" ? "desc" : null },
              ],
              (s) => (
                <>
                  <td className="px-4 py-3">
                    <span className="font-semibold flex items-center gap-2">
                      <FlagWithName code={s.country} name={s.name} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{s.count}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-mono text-sm">{s.days}{!s.streakBreaker ? "+" : ""}</td>
                </>
              ),
              "undef",
              (s) => (
                <>
                  {s.matches.map((m, i) => renderMatchDetail(m, i + 1, false))}
                  {s.streakBreaker && renderMatchDetail(s.streakBreaker, s.matches.length + 1, true)}
                </>
              )
            )}

            {renderTable(
              "Longest Win Streak",
              activeData.winStreaks,
              [{ label: entityTitle }, { label: "Wins", align: "right" }],
              (s) => (
                <>
                  <td className="px-4 py-3">
                    <span className="font-semibold flex items-center gap-2">
                      <FlagWithName code={s.country} name={s.name} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#16a34a] dark:text-[#93c47d]">{s.count}</td>
                </>
              ),
              "win",
              (s) => (
                <>
                  {s.matches.map((m, i) => renderMatchDetail(m, i + 1, false))}
                  {s.streakBreaker && renderMatchDetail(s.streakBreaker, s.matches.length + 1, true)}
                </>
              )
            )}

            <div className="md:col-span-2 lg:col-span-2">
              {renderTable(
                `Top ${isWrestler ? "Wrestlers" : "Interpreters"} (Most Wins & Winrate)`,
                sortedTopStats,
                [
                  { label: entityTitle },
                  { label: "Matches", align: "right" },
                  { label: "Wins", align: "right", onSort: () => setTopSort({ key: "wins", dir: "desc" }), sortDir: topSort.key === "wins" ? "desc" : null },
                  { label: "Win %", align: "right", onSort: () => setTopSort({ key: "win_percentage", dir: "desc" }), sortDir: topSort.key === "win_percentage" ? "desc" : null },
                ],
                (i) => (
                  <>
                    <td className="px-4 py-3">
                      <Link href={`${entityUrl}/${i.id}`} className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2">
                        <FlagWithName code={i.country} name={i.name} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{i.total_matches}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#16a34a] dark:text-[#93c47d]">{i.wins}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{i.win_percentage}%</td>
                  </>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-8">
            
            {renderTable(
              "Longest Reigns",
              sortedLongestReigns,
              [
                { label: "Champion" },
                { label: "Title" },
                { label: "Days", align: "right", onSort: () => setLrSort({ key: "days_held", dir: "desc" }), sortDir: lrSort.key === "days_held" ? "desc" : null }
              ],
              (r) => (
                <>
                  <td className="px-4 py-3 font-semibold text-blue-600 dark:text-sky-400">
                    {r.tag_team_id && isWrestler ? (
                      r.tag_team_name
                    ) : (
                      <div className="flex items-center gap-2">
                        <FlagWithName code={r.country} name={r.entity_name || "Unknown"} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300" title={r.title_name}>
                    {(r.title_name || "").replace(" Championship", "")}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-gray-200 font-mono text-base">{r.days_held_label}</td>
                </>
              ),
              null,
              null,
              "Match breakdown:",
              () => false,
              (r) => {
                if (r.tag_team_id && isWrestler) router.push(`/stables/${r.tag_team_id}`);
                else if (r.wrestler_id) router.push(`/wrestlers/${r.wrestler_id}`);
                else if (r.interpreter_id) router.push(`/interpreters/${r.interpreter_id}`);
              }
            )}

            {renderTable(
              "Most Defenses in a Reign",
              sortedMostDefenses,
              [
                { label: "Champion" },
                { label: "Title" },
                { label: "Defenses", align: "right", onSort: () => setMdSort({ key: "defenses_count", dir: "desc" }), sortDir: mdSort.key === "defenses_count" ? "desc" : null }
              ],
              (r) => (
                <>
                  <td className="px-4 py-3">
                    {r.tag_team_id && isWrestler ? (
                      <span className="font-semibold text-gray-800 dark:text-white">{r.tag_team_name}</span>
                    ) : (
                      <span className="font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
                        <FlagWithName code={r.country} name={r.entity_name || "Unknown"} />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300" title={r.title_name}>
                    {(r.title_name || "").replace(" Championship", "")}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white">{r.defenses_count}</td>
                </>
              ),
              "md",
              (r) => (
                <>
                  {r.defenses.length > 0 
                    ? r.defenses.map((m, i) => renderMatchDetail(m, i + 1, false)) 
                    : <li className="text-gray-500 dark:text-gray-400 text-sm italic pl-1">No successful defenses.</li>}
                  {r.streakBreaker && renderMatchDetail(r.streakBreaker, r.defenses.length + 1, true)}
                </>
              )
            )}

          </div>
        </div>
      </div>
    </>
  );
}