// pages/records/[type].js

import React, { useState, useMemo, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import pool from "../../lib/db";
import FlagWithName from "../../components/FlagWithName";
import Spinner from "../../components/Spinner";

const BLOB_BASE_URL = "https://ljejfdquofuxccca.public.blob.vercel-storage.com";

const TITLE_PLATES = {
  "Undisputed WWE Championship": `${BLOB_BASE_URL}/champions/uwctitle.png`,
  "World Heavyweight Championship": `${BLOB_BASE_URL}/champions/whctitle.png`,
  "Intercontinental Championship": `${BLOB_BASE_URL}/champions/ictitle.png`,
  "United States Championship": `${BLOB_BASE_URL}/champions/ustitle.png`,
  "World Tag Team Championship": `${BLOB_BASE_URL}/champions/wtttitle.png`,
  "NXT Championship": `${BLOB_BASE_URL}/champions/nxttitle.png`,
  "Speed Championship": `${BLOB_BASE_URL}/speed.png`,
  "Crown Jewel Championship": `${BLOB_BASE_URL}/champions/cjtitle.png`,
};

const CATEGORIES = [
  { type: "main", label: "Main championships" },
  { type: "mid", label: "Midcard championships" },
  { type: "tag", label: "Tag team championships" },
  { type: "low", label: "Lowcard championships" },
  { type: "special", label: "Special championships" },
];

export async function getServerSideProps(context) {
  const { res } = context;
  if (res) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  }
  const { type } = context.params;
  
  if (type !== "wrestler" && type !== "interpreter") {
    return { notFound: true };
  }

  const isWrestler = type === "wrestler";

  try {
    let matchesRows, winsRows, topStatsRows, longestReignsRows, mostDefensesRows, championshipsRows, totalChampionshipsRows;

    [championshipsRows] = await pool.query(`
      SELECT 
        c.id, 
        c.title_name, 
        c.type,
        COALESCE(
          (SELECT ct.image_url FROM championship_titles ct WHERE ct.championship_id = c.id AND ct.end_date IS NULL ORDER BY ct.start_date DESC LIMIT 1),
          (SELECT ct.image_url FROM championship_titles ct WHERE ct.championship_id = c.id ORDER BY ct.start_date DESC LIMIT 1)
        ) AS image_url
      FROM championships c
      WHERE c.show_in_ui = 1 AND c.type IS NOT NULL
      ORDER BY 
        CASE c.type
          WHEN 'main' THEN 1
          WHEN 'mid' THEN 2
          WHEN 'tag' THEN 3
          WHEN 'low' THEN 4
          WHEN 'special' THEN 5
          ELSE 6
        END ASC, 
        c.id ASC
    `);

    if (isWrestler) {
      [matchesRows] = await pool.query(`
        SELECT w.id, w.wrestler AS name, w.country, COUNT(NULLIF(mp.result, '')) AS total,
          (
            SELECT JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'name', IFNULL(i.interpreter, 'Unknown'), 'count', sub.cnt))
            FROM (
              SELECT interpreter_id, COUNT(NULLIF(result, '')) as cnt
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

      [winsRows] = await pool.query(`
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

      [topStatsRows] = await pool.query(`
        SELECT 
          w.id, w.wrestler AS name, w.country,
          COUNT(NULLIF(mp.result, '')) AS total_matches,
          SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
          ROUND((SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) * 100.0) / COUNT(NULLIF(mp.result, '')), 2) AS win_percentage
        FROM match_participants mp
        JOIN wrestlers w ON mp.wrestler_id = w.id
        GROUP BY w.id, w.wrestler, w.country
        ORDER BY wins DESC, win_percentage DESC
        LIMIT 10
      `);

      [longestReignsRows] = await pool.query(`
        SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
            cr.wrestler_id, w.wrestler AS entity_name, w.country, cr.tag_team_id, tt.name AS tag_team_name, c.title_name, ct.image_url,
            (SELECT COUNT(DISTINCT m.id) FROM matches m JOIN events e ON e.id = m.event_id AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)
             JOIN match_participants mp ON mp.match_id = m.id AND ((cr.wrestler_id IS NOT NULL AND mp.wrestler_id = cr.wrestler_id) OR (cr.tag_team_id IS NOT NULL AND mp.tag_team_id = cr.tag_team_id))
             WHERE m.championship_id = cr.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL) AS defenses_count
        FROM championship_reigns cr 
        LEFT JOIN wrestlers w ON cr.wrestler_id = w.id 
        LEFT JOIN tag_teams tt ON cr.tag_team_id = tt.id 
        JOIN championships c ON cr.championship_id = c.id
        LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND cr.won_date >= ct.start_date AND (cr.won_date <= ct.end_date OR ct.end_date IS NULL)
        WHERE (cr.wrestler_id IS NOT NULL OR cr.tag_team_id IS NOT NULL)
          AND c.id != 8
        ORDER BY days_held DESC LIMIT 10
      `);

      [mostDefensesRows] = await pool.query(`
        SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
            cr.wrestler_id, w.wrestler AS entity_name, w.country, cr.tag_team_id, tt.name AS tag_team_name, c.title_name, ct.image_url,
            (SELECT COUNT(DISTINCT m.id) FROM matches m JOIN events e ON e.id = m.event_id AND e.event_date >= cr.won_date AND (cr.lost_date IS NULL OR e.event_date < cr.lost_date)
             JOIN match_participants mp ON mp.match_id = m.id AND ((cr.wrestler_id IS NOT NULL AND mp.wrestler_id = cr.wrestler_id) OR (cr.tag_team_id IS NOT NULL AND mp.tag_team_id = cr.tag_team_id))
             WHERE m.championship_id = cr.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL) AS defenses_count
        FROM championship_reigns cr 
        LEFT JOIN wrestlers w ON cr.wrestler_id = w.id 
        LEFT JOIN tag_teams tt ON cr.tag_team_id = tt.id 
        JOIN championships c ON cr.championship_id = c.id
        LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND cr.won_date >= ct.start_date AND (cr.won_date <= ct.end_date OR ct.end_date IS NULL)
        WHERE (cr.wrestler_id IS NOT NULL OR cr.tag_team_id IS NOT NULL)
          AND c.id != 8
        ORDER BY defenses_count DESC, days_held DESC LIMIT 10
      `);

      [totalChampionshipsRows] = await pool.query(`
        SELECT 
          w.id,
          w.wrestler AS name,
          w.country,
          c.id AS championship_id,
          COUNT(DISTINCT r_data.reign_id) AS count
        FROM (
          SELECT cr.id AS reign_id, cr.wrestler_id, cr.championship_id
          FROM championship_reigns cr
          WHERE cr.wrestler_id IS NOT NULL
          UNION
          SELECT rm.reign_id, rm.wrestler_id, cr.championship_id
          FROM reign_members rm
          JOIN championship_reigns cr ON cr.id = rm.reign_id
          WHERE rm.wrestler_id IS NOT NULL
        ) AS r_data
        JOIN wrestlers w ON w.id = r_data.wrestler_id
        JOIN championships c ON c.id = r_data.championship_id
        WHERE c.show_in_ui = 1 AND c.type IS NOT NULL
        GROUP BY w.id, w.wrestler, w.country, c.id
      `);
    } else {
      [matchesRows] = await pool.query(`
        SELECT i.id, i.interpreter AS name, i.nationality AS country, COUNT(NULLIF(mp.result, '')) AS total,
          (
            SELECT JSON_ARRAYAGG(JSON_OBJECT('id', w.id, 'name', IFNULL(w.wrestler, 'Unknown'), 'count', sub.cnt))
            FROM (
              SELECT wrestler_id, COUNT(NULLIF(result, '')) as cnt
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

      [winsRows] = await pool.query(`
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

      [topStatsRows] = await pool.query(`
        SELECT 
          i.id, i.interpreter AS name, i.nationality AS country,
          COUNT(NULLIF(mp.result, '')) AS total_matches,
          SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
          ROUND((SUM(CASE WHEN mp.result = 'WIN' THEN 1 ELSE 0 END) * 100.0) / COUNT(NULLIF(mp.result, '')), 2) AS win_percentage
        FROM match_participants mp
        JOIN interpreters i ON mp.interpreter_id = i.id
        GROUP BY i.id, i.interpreter, i.nationality
        ORDER BY wins DESC, win_percentage DESC
        LIMIT 10
      `);

      [longestReignsRows] = await pool.query(`
        SELECT 
            base.reign_id, base.won_date, base.lost_date, MAX(base.days_held) AS days_held,
            base.interpreter_id, base.entity_name, base.country, base.title_name, base.image_url,
            (
                SELECT COUNT(DISTINCT m.id)
                FROM matches m
                JOIN events e ON e.id = m.event_id AND e.event_date >= base.won_date AND (base.lost_date IS NULL OR e.event_date <= base.lost_date)
                JOIN match_participants mp ON mp.match_id = m.id AND mp.interpreter_id = base.interpreter_id
                WHERE m.championship_id = base.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL
            ) AS defenses_count
        FROM (
            SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
                cr.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, ct.image_url, cr.championship_id
            FROM championship_reigns cr
            JOIN interpreters i ON i.id = cr.interpreter_id
            JOIN championships c ON cr.championship_id = c.id
            LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND cr.won_date >= ct.start_date AND (cr.won_date <= ct.end_date OR ct.end_date IS NULL)
            WHERE cr.interpreter_id IS NOT NULL AND c.id != 8
            UNION
            SELECT cr.id AS reign_id, rm.start_date AS won_date, rm.end_date AS lost_date, DATEDIFF(IFNULL(rm.end_date, UTC_DATE()), rm.start_date) AS days_held,
                rm.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, ct.image_url, cr.championship_id
            FROM reign_members rm
            JOIN championship_reigns cr ON cr.id = rm.reign_id
            JOIN interpreters i ON i.id = rm.interpreter_id
            JOIN championships c ON cr.championship_id = c.id
            LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND rm.start_date >= ct.start_date AND (rm.start_date <= ct.end_date OR ct.end_date IS NULL)
            WHERE rm.interpreter_id IS NOT NULL AND c.id != 8
        ) AS base
        GROUP BY base.reign_id, base.interpreter_id, base.won_date, base.lost_date, base.entity_name, base.country, base.title_name, base.image_url, base.championship_id
        ORDER BY days_held DESC LIMIT 10
      `);

      [mostDefensesRows] = await pool.query(`
        SELECT 
            base.reign_id, base.won_date, base.lost_date, MAX(base.days_held) AS days_held,
            base.interpreter_id, base.entity_name, base.country, base.title_name, base.image_url,
            (
                SELECT COUNT(DISTINCT m.id)
                FROM matches m
                JOIN events e ON e.id = m.event_id AND e.event_date >= base.won_date AND (base.lost_date IS NULL OR e.event_date <= base.lost_date)
                JOIN match_participants mp ON mp.match_id = m.id AND mp.interpreter_id = base.interpreter_id
                WHERE m.championship_id = base.championship_id AND m.title_match = 1 AND m.title_changed = 0 AND m.event_id IS NOT NULL
            ) AS defenses_count
        FROM (
            SELECT cr.id AS reign_id, cr.won_date, cr.lost_date, DATEDIFF(IFNULL(cr.lost_date, UTC_DATE()), cr.won_date) AS days_held,
                cr.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, ct.image_url, cr.championship_id
            FROM championship_reigns cr
            JOIN interpreters i ON i.id = cr.interpreter_id
            JOIN championships c ON cr.championship_id = c.id
            LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND cr.won_date >= ct.start_date AND (cr.won_date <= ct.end_date OR ct.end_date IS NULL)
            WHERE cr.interpreter_id IS NOT NULL AND c.id != 8
            UNION
            SELECT cr.id AS reign_id, rm.start_date AS won_date, rm.end_date AS lost_date, DATEDIFF(IFNULL(rm.end_date, UTC_DATE()), rm.start_date) AS days_held,
                rm.interpreter_id, i.interpreter AS entity_name, i.nationality AS country, c.title_name, ct.image_url, cr.championship_id
            FROM reign_members rm
            JOIN championship_reigns cr ON cr.id = rm.reign_id
            JOIN interpreters i ON i.id = rm.interpreter_id
            JOIN championships c ON cr.championship_id = c.id
            LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND rm.start_date >= ct.start_date AND (rm.start_date <= ct.end_date OR ct.end_date IS NULL)
            WHERE rm.interpreter_id IS NOT NULL AND c.id != 8
        ) AS base
        GROUP BY base.reign_id, base.interpreter_id, base.won_date, base.lost_date, base.entity_name, base.country, base.title_name, base.image_url, base.championship_id
        ORDER BY defenses_count DESC, days_held DESC LIMIT 10
      `);

      [totalChampionshipsRows] = await pool.query(`
        SELECT 
          i.id,
          i.interpreter AS name,
          i.nationality AS country,
          c.id AS championship_id,
          COUNT(DISTINCT r_data.reign_id) AS count
        FROM (
          SELECT cr.id AS reign_id, cr.interpreter_id, cr.championship_id
          FROM championship_reigns cr
          WHERE cr.interpreter_id IS NOT NULL
          UNION
          SELECT rm.reign_id, rm.interpreter_id, cr.championship_id
          FROM reign_members rm
          JOIN championship_reigns cr ON cr.id = rm.reign_id
          WHERE rm.interpreter_id IS NOT NULL
        ) AS r_data
        JOIN interpreters i ON i.id = r_data.interpreter_id
        JOIN championships c ON c.id = r_data.championship_id
        WHERE c.show_in_ui = 1 AND c.type IS NOT NULL
        GROUP BY i.id, i.interpreter, i.nationality, c.id
      `);
    }

    const processBreakdown = (rows) => rows.map(r => {
      let bd = r.breakdown;
      if (typeof bd === 'string') {
        try { bd = JSON.parse(bd); } catch (e) { bd = []; }
      }
      return { ...r, breakdown: bd || [] };
    });

    const matchesList = processBreakdown(matchesRows);
    const winsList = processBreakdown(winsRows);

    // ==========================================
    // HISTORIAL COMPARTIDO (Rachas)
    // ==========================================
    const [historyRows] = await pool.query(`
      SELECT m.id AS match_id, e.id AS event_id, e.name AS event_name, e.event_date,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'wrestler_id', mp.wrestler_id, 'wrestler', w.wrestler, 'country', w.country, 
            'team_number', mp.team_number, 'result', mp.result,
            'interpreter_id', mp.interpreter_id, 'interpreter', i.interpreter, 'interpreter_country', i.nationality
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
      FROM matches m JOIN events e ON m.event_id = e.id
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
              id: id, name: isInterpreter ? p.interpreter : p.wrestler,
              country: isInterpreter ? p.interpreter_country : p.country,
              team_number: p.team_number, result: p.result
            };
          }
        }

        for (const entityId in entitiesInMatch) {
          const e = entitiesInMatch[entityId];
          if (!stateMap.has(e.id)) {
            stateMap.set(e.id, {
              entityId: e.id, name: e.name, country: e.country,
              winCount: 0, winMatches: [], undefCount: 0, undefMatches: [], undefStartDate: null,
            });
          }
          const st = stateMap.get(e.id);
          const myTeam = e.team_number;
          const myTeamMembers = parts.filter(x => x.team_number === myTeam);
          let partners = [];
          
          if (isInterpreter) {
            const repWrestler = myTeamMembers.find(x => x.interpreter_id === e.id);
            if (repWrestler) partners = myTeamMembers.filter(x => x.wrestler_id !== repWrestler.wrestler_id);
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
            event_id: match.event_id, event_name: match.event_name, result: e.result, scoreStr,
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
                id: `win_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
                count: st.winCount, matches: [...st.winMatches], streakBreaker: matchDetail,
              });
              st.winCount = 0; st.winMatches = [];
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
                id: `undef_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
                count: st.undefCount, matches: [...st.undefMatches], days: days, streakBreaker: matchDetail,
              });
              st.undefCount = 0; st.undefMatches = []; st.undefStartDate = null;
            }
          }
        }
      }

      const now = new Date();
      for (const st of stateMap.values()) {
        if (st.winCount > 0) {
          allWins.push({
            id: `win_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
            count: st.winCount, matches: [...st.winMatches], streakBreaker: null,
          });
        }
        if (st.undefCount > 0) {
          const days = Math.floor((now - st.undefStartDate) / (1000 * 60 * 60 * 24));
          allUndefs.push({
            id: `undef_${++counter}`, entityId: st.entityId, name: st.name, country: st.country,
            count: st.undefCount, matches: [...st.undefMatches], days: days, streakBreaker: null,
          });
        }
      }

      return {
        wins: allWins.sort((a, b) => b.count - a.count).slice(0, 10),
        undefs: allUndefs.sort((a, b) => b.count - a.count).slice(0, 10)
      };
    };

    const streaks = buildStreaks(!isWrestler);

    // ==========================================
    // REINADOS COMPARTIDOS (Defensas)
    // ==========================================
    const reignIdsSet = new Set([
      ...longestReignsRows.map((r) => r.reign_id), ...mostDefensesRows.map((r) => r.reign_id),
    ]);
    const reignIdsArray = Array.from(reignIdsSet);

    let globalDefenses = [];
    if (reignIdsArray.length > 0) {
      const placeholders = reignIdsArray.map(() => "?").join(",");
      const [defenseMatches] = await pool.query(`
        SELECT cr.id AS reign_id, m.id AS match_id, m.title_changed, e.id AS event_id, e.name AS event_name,
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
        isTagTeamChampionship: isTagTeamChampionship, partners: [],
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

    const formatImageUrl = (url, titleName) => {
      const chosen = url || TITLE_PLATES[titleName] || null;
      if (!chosen) return null;
      if (chosen.startsWith("http://") || chosen.startsWith("https://")) return chosen;
      return `${BLOB_BASE_URL}/${chosen.replace(/^\/+/, "")}`;
    };

    const championshipsList = championshipsRows.map((c) => ({
      id: c.id,
      title_name: c.title_name,
      type: c.type,
      image_url: formatImageUrl(c.image_url, c.title_name),
    }));

    const entityChampsMap = new Map();

    for (const row of totalChampionshipsRows) {
      if (!entityChampsMap.has(row.id)) {
        entityChampsMap.set(row.id, {
          id: row.id,
          name: row.name,
          country: row.country,
          counts: {},
          total: 0,
          mainTotal: 0,
          midTotal: 0,
          tagTotal: 0,
          lowTotal: 0,
          specialTotal: 0,
        });
      }
      const item = entityChampsMap.get(row.id);
      const cnt = Number(row.count) || 0;
      item.counts[row.championship_id] = cnt;
      item.total += cnt;

      const champ = championshipsList.find((c) => c.id === row.championship_id);
      if (champ) {
        if (champ.type === "main") item.mainTotal += cnt;
        else if (champ.type === "mid") item.midTotal += cnt;
        else if (champ.type === "tag") item.tagTotal += cnt;
        else if (champ.type === "low") item.lowTotal += cnt;
        else if (champ.type === "special") item.specialTotal += cnt;
      }
    }

    const totalChampionshipsList = Array.from(entityChampsMap.values())
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.mainTotal !== a.mainTotal) return b.mainTotal - a.mainTotal;
        if (b.midTotal !== a.midTotal) return b.midTotal - a.midTotal;
        if (b.tagTotal !== a.tagTotal) return b.tagTotal - a.tagTotal;
        if (b.lowTotal !== a.lowTotal) return b.lowTotal - a.lowTotal;
        if (b.specialTotal !== a.specialTotal) return b.specialTotal - a.specialTotal;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    return {
      props: {
        type,
        data: {
          matches: JSON.parse(JSON.stringify(matchesList)),
          wins: JSON.parse(JSON.stringify(winsList)),
          topStats: JSON.parse(JSON.stringify(topStatsRows)),
          winStreaks: JSON.parse(JSON.stringify(streaks.wins)),
          undefStreaks: JSON.parse(JSON.stringify(streaks.undefs)),
          longestReigns: JSON.parse(JSON.stringify(processReigns(longestReignsRows, isWrestler ? 'wlr' : 'ilr'))),
          mostDefenses: JSON.parse(JSON.stringify(processReigns(mostDefensesRows, isWrestler ? 'wmd' : 'imd'))),
          championships: JSON.parse(JSON.stringify(championshipsList)),
          totalChampionships: JSON.parse(JSON.stringify(totalChampionshipsList)),
        }
      },
    };
  } catch (error) {
    console.error("Error loading records:", error);
    return { props: { error: true } };
  }
}

export default function RecordsDynamicPage({ error, type, data }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const [undefSort, setUndefSort] = useState({ key: "count", dir: "desc" });
  const [topSort, setTopSort] = useState({ key: "wins", dir: "desc" });
  const [lrSort, setLrSort] = useState({ key: "days_held", dir: "desc" });
  const [mdSort, setMdSort] = useState({ key: "defenses_count", dir: "desc" });
  const [tcSort, setTcSort] = useState({ key: "rank", dir: "asc" });

  useEffect(() => {
    const handleStart = (url) => { if (url !== router.asPath) setLoading(true); };
    const handleComplete = () => setLoading(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  // Resetea el expandedRow y tcSort cuando cambias de Tab
  useEffect(() => {
    setExpandedRow(null);
    setTcSort({ key: "rank", dir: "asc" });
  }, [type]);

  if (error) {
    return (
      <div className="p-8 text-center text-white">
        <h1 className="text-2xl font-bold mb-2">Error al cargar récords</h1>
        <p className="text-gray-400">Hubo un problema conectando con la base de datos.</p>
      </div>
    );
  }

  const isWrestler = type === "wrestler";
  const entityTitle = isWrestler ? "Wrestler" : "Interpreter";
  const breakdownTitle = isWrestler ? "Interpreters breakdown:" : "Wrestlers breakdown:";
  const entityUrl = isWrestler ? "/wrestlers" : "/interpreters";
  const breakdownUrl = isWrestler ? "/interpreters" : "/wrestlers";

  const sortedUndefeated = useMemo(() => {
    return [...data.undefStreaks].sort((a, b) => {
      const valA = undefSort.key === "count" ? a.count : a.days;
      const valB = undefSort.key === "count" ? b.count : b.days;
      return valB - valA;
    });
  }, [data.undefStreaks, undefSort]);

  const sortedTopStats = useMemo(() => {
    return [...data.topStats].sort((a, b) => {
      const valA = topSort.key === "wins" ? a.wins : parseFloat(a.win_percentage);
      const valB = topSort.key === "wins" ? b.wins : parseFloat(b.win_percentage);
      return valB - valA;
    });
  }, [data.topStats, topSort]);

  const sortedLongestReigns = useMemo(() => {
    return [...data.longestReigns].sort((a, b) => b.days_held - a.days_held);
  }, [data.longestReigns]);

  const sortedMostDefenses = useMemo(() => {
    return [...data.mostDefenses].sort((a, b) => b.defenses_count - a.defenses_count);
  }, [data.mostDefenses]);

  const sortedTotalChampionships = useMemo(() => {
    if (!data?.totalChampionships) return [];
    const list = [...data.totalChampionships];

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
  }, [data?.totalChampionships, tcSort]);

  const handleTcSort = (key) => {
    setTcSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "desc" ? "asc" : "desc" };
      }
      return { key, dir: key === "name" || key === "rank" ? "asc" : "desc" };
    });
  };

  const championships = data?.championships || [];

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
        label: "Otros campeonatos",
        championships: otherChamps,
      });
    }

    return grouped;
  }, [championships]);

  const toggleExpand = (key) => setExpandedRow((prev) => (prev === key ? null : key));

  const renderTable = (
    title, dataArr, columns, renderRow, expandPrefix = null, renderExpanded = null,
    expandTitle = "Match breakdown:", isRowExpandable = () => true, onRowClick = null
  ) => (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden h-fit">
      <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 text-sm">
              <th className="px-4 py-2 w-12 text-center">#</th>
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-2 ${col.onSort ? "cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none" : ""}`} onClick={col.onSort ? col.onSort : undefined}>
                  <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                    {col.label}
                    {col.sortDir && <span className="text-[10px] text-blue-500">▼</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {dataArr.map((item, idx) => {
              const uniqueId = `${expandPrefix}_${item.id || item.entityId}`;
              const isExpanded = expandPrefix && expandedRow === uniqueId;
              const isExpandable = !!expandPrefix && isRowExpandable(item);

              const handleRowClick = () => {
                if (isExpandable) toggleExpand(uniqueId);
                else if (onRowClick) onRowClick(item);
              };

              return (
                <React.Fragment key={idx}>
                  <tr className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${isExpandable || onRowClick ? "cursor-pointer" : ""}`} onClick={handleRowClick} title={isExpandable ? "Click to view breakdown" : onRowClick ? "Click to view profile" : ""}>
                    <td className="px-4 py-3 text-center font-semibold text-gray-500 dark:text-gray-400">
                      {isExpandable ? (
                        <span className="flex items-center justify-center gap-1">
                          <span className={`text-[10px] transition-transform ${isExpanded ? "rotate-90 text-blue-500" : ""}`}>▶</span>
                          {idx + 1}
                        </span>
                      ) : (idx + 1)}
                    </td>
                    {renderRow(item)}
                  </tr>
                  {isExpanded && renderExpanded && (
                    <tr className="bg-gray-50 dark:bg-zinc-950/50">
                      <td colSpan={columns.length + 1} className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                          <p className="font-semibold mb-2 text-blue-600 dark:text-sky-400">{expandTitle}</p>
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
    const resultColor = m.result === "WIN" ? "text-[#16a34a] dark:text-[#93c47d]" : m.result === "LOSS" ? "text-red-500" : m.result === "DRAW" ? "text-[#d97706] dark:text-[#ffe599]" : "text-gray-500";
    return (
      <li key={indexNumber} className="pl-1 flex items-start text-sm">
        <span className={`mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono ${isBreaker ? "line-through opacity-70" : ""}`}>{indexNumber}.</span>
        <div className="flex-1">
          <strong className={resultColor}>{m.result}</strong>{" "}
          {m.isTagTeamChampionship 
            ? m.partners.length > 0 && <span className="text-gray-600 dark:text-gray-400">{m.partners.map((pt, idx) => (<React.Fragment key={pt.id}>{idx > 0 && " & "}<Link href={`/wrestlers/${pt.id}`} className="text-blue-600 dark:text-sky-400" onClick={(e) => e.stopPropagation()}>{pt.name}</Link></React.Fragment>))} </span>
            : m.partners.length > 0 && <span className="text-gray-600 dark:text-gray-400">w/ {m.partners.map((pt, idx) => (<React.Fragment key={pt.id}>{idx > 0 && " & "}<Link href={`/wrestlers/${pt.id}`} className="text-blue-600 dark:text-sky-400" onClick={(e) => e.stopPropagation()}>{pt.name}</Link></React.Fragment>))} </span>}
          {m.scoreStr ? <span className="font-bold mx-1">{m.scoreStr}</span> : <span className="text-gray-600 dark:text-gray-400 mx-1">vs</span>}
          {m.opponents.map((opp, idx) => (<React.Fragment key={opp.id}>{idx > 0 && " & "}<Link href={`/wrestlers/${opp.id}`} className="text-blue-600 dark:text-sky-400" onClick={(e) => e.stopPropagation()}>{opp.name}</Link></React.Fragment>))}
          <span className="text-gray-500 text-[11px] ml-2 block sm:inline">(<Link href={`/events/${m.event_id}`} className="text-gray-500 dark:text-gray-400" onClick={(e) => e.stopPropagation()}>{m.event_name}</Link>)</span>
        </div>
      </li>
    );
  };

  const tabClasses = (tab) =>
    `pb-2 px-1 border-b-2 font-medium text-lg transition-colors cursor-pointer ${
      type === tab
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
            <Link href="/records/wrestler" className={tabClasses("wrestler")}>
              Per Wrestler
            </Link>
            <Link href="/records/interpreter" className={tabClasses("interpreter")}>
              Per Interpreter
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {renderTable(
                  "Most Matches", data.matches,
                  [{ label: entityTitle }, { label: "Matches", align: "right" }],
                  (item) => (
                    <>
                      <td className="px-4 py-3"><Link href={`${entityUrl}/${item.id}`} className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2" onClick={(e) => e.stopPropagation()}><FlagWithName code={item.country} name={item.name} /></Link></td>
                      <td className="px-4 py-3 text-right font-bold">{item.total}</td>
                    </>
                  ),
                  "matches",
                  (item) => (
                    <>
                      {item.breakdown?.sort((a, b) => b.count - a.count).map((bd, idx) => (
                        <li key={idx} className="pl-1 flex items-start text-sm">
                          <span className="mr-2 inline-block min-w-[20px] text-gray-500 dark:text-gray-400 font-mono text-right font-bold">{bd.count}</span>
                          {bd.id ? <Link href={`${breakdownUrl}/${bd.id}`} className="text-blue-600 dark:text-sky-400" onClick={(e) => e.stopPropagation()}>{bd.name}</Link> : <span className="text-gray-700 dark:text-gray-300">{bd.name}</span>}
                        </li>
                      ))}
                    </>
                  ),
                  breakdownTitle,
                  (item) => item.breakdown?.length > 1
                )}

                <div className="md:col-span-2 lg:col-span-2">
                  {renderTable(
                    `Top ${isWrestler ? "Wrestlers" : "Interpreters"} (Most Wins & Winrate)`, sortedTopStats,
                    [
                      { label: entityTitle }, { label: "Matches", align: "right" },
                      { label: "Wins", align: "right", onSort: () => setTopSort({ key: "wins", dir: "desc" }), sortDir: topSort.key === "wins" ? "desc" : null },
                      { label: "Win %", align: "right", onSort: () => setTopSort({ key: "win_percentage", dir: "desc" }), sortDir: topSort.key === "win_percentage" ? "desc" : null },
                    ],
                    (i) => (
                      <>
                        <td className="px-4 py-3"><Link href={`${entityUrl}/${i.id}`} className="text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-2"><FlagWithName code={i.country} name={i.name} /></Link></td>
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
                  "Longest Undefeated Streak", sortedUndefeated,
                  [
                    { label: entityTitle },
                    { label: "Matches", align: "right", onSort: () => setUndefSort({ key: "count", dir: "desc" }), sortDir: undefSort.key === "count" ? "desc" : null },
                    { label: "Days", align: "right", onSort: () => setUndefSort({ key: "days", dir: "desc" }), sortDir: undefSort.key === "days" ? "desc" : null },
                  ],
                  (s) => (
                    <>
                      <td className="px-4 py-3"><span className="font-semibold flex items-center gap-2"><FlagWithName code={s.country} name={s.name} /></span></td>
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
                  "Longest Win Streak", data.winStreaks,
                  [{ label: entityTitle }, { label: "Wins", align: "right" }],
                  (s) => (
                    <>
                      <td className="px-4 py-3"><span className="font-semibold flex items-center gap-2"><FlagWithName code={s.country} name={s.name} /></span></td>
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-8">
                {renderTable(
                  "Longest Reigns", sortedLongestReigns,
                  [{ label: "Champion" }, { label: "Title" }, { label: "Days", align: "right", onSort: () => setLrSort({ key: "days_held", dir: "desc" }), sortDir: lrSort.key === "days_held" ? "desc" : null }],
                  (r) => (
                    <>
                      <td className="px-4 py-3 font-semibold text-blue-600 dark:text-sky-400">
                        {r.tag_team_id && isWrestler ? r.tag_team_name : (
                          <div className="flex items-center gap-2"><FlagWithName code={r.country} name={r.entity_name || "Unknown"} /></div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2" title={r.title_name}>
                          {r.image_url && <Image src={r.image_url} alt={r.title_name} width={32} height={32} className="object-contain w-8 h-8" />}
                          <span className="hidden sm:inline">{(r.title_name || "").replace(" Championship", "")}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-gray-200 font-mono text-base">{r.days_held_label}</td>
                    </>
                  ),
                  null, null, "Match breakdown:", () => false,
                  (r) => {
                    if (r.tag_team_id && isWrestler) router.push(`/stables/${r.tag_team_id}`);
                    else if (r.wrestler_id) router.push(`/wrestlers/${r.wrestler_id}`);
                    else if (r.interpreter_id) router.push(`/interpreters/${r.interpreter_id}`);
                  }
                )}

                {renderTable(
                  "Most Defenses in a Reign", sortedMostDefenses,
                  [{ label: "Champion" }, { label: "Title" }, { label: "Defenses", align: "right", onSort: () => setMdSort({ key: "defenses_count", dir: "desc" }), sortDir: mdSort.key === "defenses_count" ? "desc" : null }],
                  (r) => (
                    <>
                      <td className="px-4 py-3">
                        {r.tag_team_id && isWrestler ? <span className="font-semibold text-gray-800 dark:text-white">{r.tag_team_name}</span> : (
                          <span className="font-semibold flex items-center gap-2 text-gray-800 dark:text-white"><FlagWithName code={r.country} name={r.entity_name || "Unknown"} /></span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2" title={r.title_name}>
                          {r.image_url && <Image src={r.image_url} alt={r.title_name} width={32} height={32} className="object-contain w-8 h-8" />}
                          <span className="hidden sm:inline">{(r.title_name || "").replace(" Championship", "")}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white">{r.defenses_count}</td>
                    </>
                  ),
                  "md",
                  (r) => (
                    <>
                      {r.defenses.length > 0 ? r.defenses.map((m, i) => renderMatchDetail(m, i + 1, false)) : <li className="text-gray-500 dark:text-gray-400 text-sm italic pl-1">No successful defenses.</li>}
                      {r.streakBreaker && renderMatchDetail(r.streakBreaker, r.defenses.length + 1, true)}
                    </>
                  )
                )}
              </div>

              {/* Total Championships Table (Full Width) */}
              <div className="mt-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded shadow-md overflow-hidden">
                <div className="bg-gray-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                    Total Championships
                  </h2>
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
                              {tcSort.key === "rank" ? (tcSort.dir === "asc" ? "▲" : "▼") : <span className="opacity-40 text-gray-400">⬍</span>}
                            </span>
                          </div>
                        </th>

                        <th
                          rowSpan={2}
                          className="px-4 py-2.5 text-left border border-gray-200 dark:border-gray-800 min-w-[180px] cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                          onClick={() => handleTcSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            <span>{isWrestler ? "Wrestler" : "Interpreter"}</span>
                            <span className="text-[10px] text-blue-500">
                              {tcSort.key === "name" ? (tcSort.dir === "asc" ? "▲" : "▼") : <span className="opacity-40 text-gray-400">⬍</span>}
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
                              {tcSort.key === "total" ? (tcSort.dir === "desc" ? "▼" : "▲") : <span className="opacity-40 text-gray-400">⬍</span>}
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
                                    {isSorted ? (tcSort.dir === "desc" ? "▼" : "▲") : <span className="opacity-30 text-gray-400">⬍</span>}
                                  </span>
                                </div>
                              </th>
                            );
                          })
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
                              href={`${entityUrl}/${item.id}`}
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
                            })
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
                            No hay campeonatos registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
