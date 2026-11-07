// pages/stables/[id].js

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import pool from "../../lib/db";
import FlagWithName from "../../components/FlagWithName";
import MatchCard from "../../components/MatchCard";
import MatchFilters from "../../components/MatchFilters";
import { formatDateDDMMYYYY, wrestlerNameSql, wrestlerSearchSql } from "../../lib/matchUtils";
import {
  useQueryToggle,
  useQueryMultiSelect,
  useQueryListToggle,
  usePagination,
  DEFAULT_RESULTS,
  DEFAULT_FORMATS,
  parseResultFilter,
  parseFormatFilter,
  parseMultiValueFilter,
} from "../../hooks/useQueryFilter";

export async function getServerSideProps({ params, query, res }) {
  if (res) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  }
  try {
    const stableId = parseInt(params.id, 10);
    if (isNaN(stableId)) return { notFound: true };

    const [[stableRow]] = await pool.query(
      `SELECT t.*, t.image_url FROM tag_teams t WHERE t.id = ?`,
      [stableId],
    );
    if (!stableRow) return { notFound: true };

    const stable = {
      id: stableRow.id,
      name: stableRow.name,
      founded: stableRow.founded_date
        ? stableRow.founded_date.toISOString()
        : null,
      image_url: stableRow.image_url || null,
    };

    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(50, parseInt(query.limit) || 20);
    const offset = (page - 1) * limit;

    const selectedWrestlers = parseMultiValueFilter(query.wrestler);
    const selectedShows = parseMultiValueFilter(query.filter);
    const selectedChamps = parseMultiValueFilter(query.champ);
    const selectedStips = parseMultiValueFilter(query.matchtype);

    const filterTitle = query.title === "1";
    const filterStip = query.stip === "1";
    const filterResults = parseResultFilter(query.result);
    const filterFormats = parseFormatFilter(query.format, query.one);

    const extraClauses = [];
    const extraParams = [];

    if (filterResults.length === 0) {
      extraClauses.push("AND 1 = 0");
    } else if (filterResults.length < DEFAULT_RESULTS.length) {
      const placeholders = filterResults.map(() => "?").join(",");
      extraClauses.push(`AND mp.result IN (${placeholders})`);
      extraParams.push(...filterResults);
    }

    if (filterFormats.length === 0) {
      extraClauses.push("AND 1 = 0");
    } else if (filterFormats.length < DEFAULT_FORMATS.length) {
      const formatConditions = [];
      for (const fmt of filterFormats) {
        if (fmt === "1v1") {
          formatConditions.push(`((SELECT COUNT(DISTINCT mp_c.team_number) FROM match_participants mp_c WHERE mp_c.match_id = m.id) = 2 AND (SELECT MAX(t.cnt) FROM (SELECT COUNT(*) AS cnt FROM match_participants mp_i WHERE mp_i.match_id = m.id GROUP BY mp_i.team_number) t) = 1)`);
        } else if (fmt === "2v2") {
          formatConditions.push(`((SELECT COUNT(DISTINCT mp_c.team_number) FROM match_participants mp_c WHERE mp_c.match_id = m.id) = 2 AND (SELECT MAX(t.cnt) FROM (SELECT COUNT(*) AS cnt FROM match_participants mp_i WHERE mp_i.match_id = m.id GROUP BY mp_i.team_number) t) = 2)`);
        } else if (fmt === "3v3") {
          formatConditions.push(`((SELECT COUNT(DISTINCT mp_c.team_number) FROM match_participants mp_c WHERE mp_c.match_id = m.id) = 2 AND (SELECT MAX(t.cnt) FROM (SELECT COUNT(*) AS cnt FROM match_participants mp_i WHERE mp_i.match_id = m.id GROUP BY mp_i.team_number) t) = 3)`);
        } else if (fmt === "multiman") {
          formatConditions.push(`((SELECT COUNT(DISTINCT mp_c.team_number) FROM match_participants mp_c WHERE mp_c.match_id = m.id) > 2 OR (SELECT MAX(t.cnt) FROM (SELECT COUNT(*) AS cnt FROM match_participants mp_i WHERE mp_i.match_id = m.id GROUP BY mp_i.team_number) t) > 3)`);
        }
      }
      extraClauses.push(`AND (${formatConditions.join(" OR ")})`);
    }

    if (selectedWrestlers.length > 0) {
      const conditions = selectedWrestlers.map(() => `
        EXISTS (
          SELECT 1 FROM match_participants mp3
          JOIN wrestlers w3 ON mp3.wrestler_id = w3.id
          WHERE mp3.match_id = m.id
            AND ${wrestlerSearchSql("w3.id", "w3.wrestler")}
        )
      `).join(" AND ");
      extraClauses.push(`AND (${conditions})`);
      selectedWrestlers.forEach((w) => {
        const p = `%${w.toLowerCase()}%`;
        extraParams.push(p, p, p, p, p);
      });
    }

    if (selectedShows.length > 0) {
      const conditions = selectedShows
        .map(() => `(LOWER(COALESCE(s.name, p.name, e.name)) = ? OR LOWER(e.name) LIKE ?)`)
        .join(" OR ");
      extraClauses.push(`AND (${conditions})`);
      selectedShows.forEach((sh) => {
        extraParams.push(sh.toLowerCase(), `%${sh.toLowerCase()}%`);
      });
    }

    if (filterTitle) extraClauses.push(`AND m.title_match = 1`);

    const stipClauses = [];
    if (filterStip) {
      stipClauses.push("(m.match_type_id NOT IN (1, 2, 23, 32) AND LOWER(COALESCE(mt.name, '')) != 'singles')");
    }
    if (selectedStips.length > 0) {
      const specificStipConditions = selectedStips.map((stip) => {
        if (stip.toLowerCase() === "singles") {
          return "(m.match_type_id = 1 OR LOWER(mt.name) = 'singles')";
        }
        return "LOWER(mt.name) LIKE ?";
      });
      selectedStips.forEach((stip) => {
        if (stip.toLowerCase() !== "singles") {
          extraParams.push(`%${stip.toLowerCase()}%`);
        }
      });
      stipClauses.push(...specificStipConditions);
    }
    if (stipClauses.length > 0) {
      extraClauses.push(`AND (${stipClauses.join(" OR ")})`);
    }

    if (selectedChamps.length > 0) {
      const conditions = selectedChamps.map(() => `LOWER(c.title_name) LIKE ?`).join(" OR ");
      extraClauses.push(`AND (${conditions})`);
      selectedChamps.forEach((c) => {
        extraParams.push(`%${c.toLowerCase()}%`);
      });
    }

    const extraSql = extraClauses.join("\n");

    // ─── Grupo 1: miembros + stats + opciones de filtros (6 conexiones simultáneas) ─────────────
    const [
      [memberRows],
      [[statsRow]],
      [champRows],
      [stipRows],
      [wrestlerListRows],
      [showListRows],
    ] = await Promise.all([
      pool.query(
        `SELECT tm.wrestler_id, tm.status, w.wrestler AS name, w.country
         FROM tag_team_members tm JOIN wrestlers w ON w.id = tm.wrestler_id
         WHERE tm.tag_team_id = ?`,
        [stableId],
      ),
      pool.query(
        `SELECT
           COUNT(DISTINCT CASE WHEN NULLIF(mp.result, '') IS NOT NULL THEN m.id END) AS total,
           COUNT(DISTINCT CASE WHEN mp.result='WIN'  THEN m.id END) AS wins,
           COUNT(DISTINCT CASE WHEN mp.result='DRAW' THEN m.id END) AS draws,
           COUNT(DISTINCT CASE WHEN mp.result='LOSS' THEN m.id END) AS losses,
           MIN(CASE WHEN NULLIF(mp.result, '') IS NOT NULL THEN e.event_date END) AS firstMatch, 
           MAX(CASE WHEN NULLIF(mp.result, '') IS NOT NULL THEN e.event_date END) AS lastMatch
         FROM match_participants mp
         JOIN matches m ON mp.match_id=m.id JOIN events e ON m.event_id=e.id
         WHERE mp.tag_team_id = ?`,
        [stableId],
      ),
      pool.query(
        `SELECT id, title_name AS name FROM championships WHERE show_in_ui = 1 ORDER BY id ASC`,
      ),
      pool.query(
        `SELECT id, name FROM match_types ORDER BY order_in_page ASC`,
      ),
      pool.query(
        `SELECT DISTINCT w2.id, w2.wrestler AS name
         FROM match_participants mp1
         JOIN match_participants mp2 ON mp1.match_id = mp2.match_id
         JOIN wrestlers w2 ON mp2.wrestler_id = w2.id
         WHERE mp1.tag_team_id = ?
         ORDER BY w2.wrestler ASC`,
        [stableId],
      ),
      pool.query(
        `SELECT DISTINCT COALESCE(s.name, p.name, e.name) AS name
         FROM match_participants mp
         JOIN matches m ON mp.match_id = m.id
         JOIN events e ON m.event_id = e.id
         LEFT JOIN shows s ON e.show_id = s.id
         LEFT JOIN ples p ON e.ple_id = p.id
         WHERE mp.tag_team_id = ?
           AND COALESCE(s.name, p.name, e.name) IS NOT NULL
         ORDER BY name ASC`,
        [stableId],
      ),
    ]);

    // ─── Grupo 2: matches paginados + count (2 conexiones simultáneas) ────
    const [[rawMatches], [[{ total: matchesTotal }]]] = await Promise.all([
      pool.query(
        `SELECT m.id, m.title_match, e.id AS event_id, e.name AS event_name, e.event_date,
           mp.team_number, mp.result, mt.id AS match_type_id, mt.name AS match_type_name,
           c.id AS championship_id, c.title_name AS championship_name,
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('wrestler_id',mp2.wrestler_id,'wrestler',${wrestlerNameSql("mp2.wrestler_id", "e.event_date", "w2.wrestler")},'team_number',mp2.team_number,'result',mp2.result))
            FROM match_participants mp2 JOIN wrestlers w2 ON mp2.wrestler_id=w2.id WHERE mp2.match_id=m.id) AS participants,
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number',mts.team_number,'score',mts.score))
            FROM match_team_scores mts WHERE mts.match_id=m.id) AS scores
         FROM match_participants mp
         JOIN matches m ON mp.match_id=m.id JOIN events e ON m.event_id=e.id
         LEFT JOIN shows s ON e.show_id = s.id
         LEFT JOIN ples p ON e.ple_id = p.id
         LEFT JOIN match_types mt ON m.match_type_id=mt.id
         LEFT JOIN championships c ON m.championship_id=c.id
         WHERE mp.tag_team_id=? ${extraSql}
         GROUP BY m.id, m.title_match, e.id, e.name, e.event_date, mp.team_number, mp.result, mt.id, mt.name, c.id, c.title_name, s.name, p.name
         ORDER BY e.event_date DESC, m.match_order DESC LIMIT ? OFFSET ?`,
        [stableId, ...extraParams, limit, offset],
      ),
      pool.query(
        `SELECT COUNT(DISTINCT m.id) AS total
         FROM match_participants mp JOIN matches m ON mp.match_id=m.id
         JOIN events e ON m.event_id=e.id
         LEFT JOIN shows s ON e.show_id = s.id
         LEFT JOIN ples p ON e.ple_id = p.id
         LEFT JOIN match_types mt ON m.match_type_id=mt.id
         LEFT JOIN championships c ON m.championship_id=c.id
         WHERE mp.tag_team_id=? ${extraSql}`,
        [stableId, ...extraParams],
      ),
    ]);

    const activeMembers = memberRows
      .filter((r) => r.status === "Active")
      .map((r) => ({ id: r.wrestler_id, name: r.name, country: r.country }));

    const formerMembers = memberRows
      .filter((r) => r.status !== "Active")
      .map((r) => ({ id: r.wrestler_id, name: r.name, country: r.country }));

    const stats = {
      total: statsRow?.total || 0,
      wins: statsRow?.wins || 0,
      draws: statsRow?.draws || 0,
      losses: statsRow?.losses || 0,
      firstMatch: statsRow?.firstMatch
        ? statsRow.firstMatch.toISOString()
        : null,
      lastMatch: statsRow?.lastMatch ? statsRow.lastMatch.toISOString() : null,
    };

    const matches = rawMatches.map((row) => ({
      id: row.id,
      event_id: row.event_id,
      event: row.event_name,
      event_name: row.event_name,
      event_date: row.event_date.toISOString(),
      team_number: row.team_number,
      result: row.result,
      title_match: row.title_match === 1,
      match_type_id: row.match_type_id,
      match_type_name: row.match_type_name,
      championship_id: row.championship_id,
      championship_name: row.championship_name,
      participants: row.participants || [],
      scores: row.scores || [],
    }));

    return {
      props: {
        stable,
        activeMembers,
        formerMembers,
        stats,
        selectedWrestlers,
        selectedShows,
        selectedChamps,
        selectedStips,
        filterTitle,
        filterStip,
        filterResults,
        filterFormats,
        championshipsList: champRows.map((r) => ({ id: r.id, name: r.name })),
        stipulationsList: stipRows.map((r) => ({ id: r.id, name: r.name })),
        wrestlersList: wrestlerListRows.map((r) => ({ id: r.id, name: r.name })),
        showsList: showListRows.map((r) => ({ id: r.name, name: r.name })),
        matches,
        pagination: {
          page,
          limit,
          total: matchesTotal,
          totalPages: Math.ceil(matchesTotal / limit),
        },
      },
    };
  } catch (err) {
    console.error("Error in stables/[id] getServerSideProps:", err);
    return { props: { error: true } };
  }
}

export default function StableDetail({
  error,
  stable,
  activeMembers = [],
  formerMembers = [],
  stats,
  selectedWrestlers = [],
  selectedShows = [],
  selectedChamps = [],
  selectedStips = [],
  filterTitle = false,
  filterStip = false,
  filterResults = DEFAULT_RESULTS,
  filterFormats = DEFAULT_FORMATS,
  championshipsList = [],
  stipulationsList = [],
  wrestlersList = [],
  showsList = [],
  matches,
  pagination,
}) {
  const router = useRouter();

  if (error) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Error al cargar</h1>
        <p className="text-gray-500">
          No se pudo conectar a la base de datos. Intentá de nuevo en unos
          segundos.
        </p>
      </div>
    );
  }

  const toggleTitle = useQueryToggle("title", filterTitle, router);
  const toggleStip = useQueryToggle("stip", filterStip, router);
  const toggleResult = useQueryMultiSelect(
    "result",
    DEFAULT_RESULTS,
    filterResults,
    router,
  );
  const toggleFormat = useQueryMultiSelect(
    "format",
    DEFAULT_FORMATS,
    filterFormats,
    router,
  );
  const toggleWrestler = useQueryListToggle(
    "wrestler",
    selectedWrestlers,
    router,
  );
  const toggleShow = useQueryListToggle("filter", selectedShows, router);
  const toggleChamp = useQueryListToggle("champ", selectedChamps, router);
  const toggleStipItem = useQueryListToggle(
    "matchtype",
    selectedStips,
    router,
  );
  const { goToPage, renderPageButtons } = usePagination(pagination, router);

  const handleResetFilters = () => {
    router.push({ pathname: router.pathname, query: { id: stable.id } }, undefined, {
      scroll: false,
    });
  };

  return (
    <>
      <Head>
        <title>{stable.name} — Trivias WWE</title>
        <meta
          name="description"
          content={`Historial de matches y stats de ${stable.name} en Trivias WWE.`}
        />
      </Head>

      <div className="p-4 max-w-3xl mx-auto">
        <div className="md:flex md:items-stretch md:space-x-6">
          <div className="md:flex-1">
            <h1 className="text-3xl font-bold mb-2">{stable.name}</h1>

            {activeMembers.length > 0 ? (
              <p className="text-gray-600 mb-1 dark:text-white">
                Members:{" "}
                {activeMembers.map((m, idx) => (
                  <span key={m.id}>
                    <Link
                      href={`/wrestlers/${m.id}`}
                      className="text-blue-600 dark:text-sky-300 "
                    >
                      <FlagWithName code={m.country} name={m.name} />
                    </Link>
                    {idx < activeMembers.length - 1 && ", "}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-gray-600 mb-1 dark:text-white">
                Members: <strong>None</strong>
              </p>
            )}

            {formerMembers.length > 0 && (
              <p className="text-gray-600 mb-4 dark:text-white">
                Former members:{" "}
                {formerMembers.map((m, idx) => (
                  <span key={m.id}>
                    <Link
                      href={`/wrestlers/${m.id}`}
                      className="text-blue-600 dark:text-sky-300 "
                    >
                      <FlagWithName code={m.country} name={m.name} />
                    </Link>
                    {idx < formerMembers.length - 1 && ", "}
                  </span>
                ))}
              </p>
            )}

            <h2 className="text-2xl font-semibold mb-2">Stats</h2>
            <ul className="mb-6 space-y-1">
              <li>Total matches: {stats.total}</li>
              <li>Wins: {stats.wins}</li>
              <li>Draws: {stats.draws}</li>
              <li>Losses: {stats.losses}</li>
              <li>
                First match:{" "}
                {stats.firstMatch ? formatDateDDMMYYYY(stats.firstMatch) : "—"}
              </li>
              <li>
                Last match:{" "}
                {stats.lastMatch ? formatDateDDMMYYYY(stats.lastMatch) : "—"}
              </li>
            </ul>
          </div>

          {stable.image_url && (
            <div className="md:w-1/2 md:flex-shrink-0 md:self-stretch">
              <div className="relative w-full h-full min-h-[300px]">
                <Image
                  src={stable.image_url}
                  alt={stable.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain rounded"
                />
              </div>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-semibold mb-3">Matches</h2>

        <MatchFilters
          filterResults={filterResults}
          toggleResult={toggleResult}
          filterFormats={filterFormats}
          toggleFormat={toggleFormat}
          hasFormatFilter={true}
          filterTitle={filterTitle}
          toggleTitle={toggleTitle}
          filterStip={filterStip}
          toggleStip={toggleStip}
          selectedChamps={selectedChamps}
          toggleChamp={toggleChamp}
          selectedStips={selectedStips}
          toggleStipItem={toggleStipItem}
          selectedWrestlers={selectedWrestlers}
          toggleWrestler={toggleWrestler}
          selectedShows={selectedShows}
          toggleShow={toggleShow}
          championshipsList={championshipsList}
          stipulationsList={stipulationsList}
          wrestlersList={wrestlersList}
          showsList={showsList}
          onReset={handleResetFilters}
        />

        <ul className="space-y-3">
          {matches.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              No matches found.
            </p>
          ) : (
            matches.map((match, idx) => (
              <MatchCard
                key={match.id}
                match={match}
                currentId={stable.id}
                idType="stable"
                number={(pagination.page - 1) * pagination.limit + idx + 1}
              />
            ))
          )}
        </ul>

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center space-x-2 items-center">
            {renderPageButtons()}
          </div>
        )}
      </div>
    </>
  );
}
