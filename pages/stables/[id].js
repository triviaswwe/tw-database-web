// pages/stables/[id].js

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import pool from "../../lib/db";
import FlagWithName from "../../components/FlagWithName";
import MatchCard from "../../components/MatchCard";
import { formatDateDDMMYYYY } from "../../lib/matchUtils";
import {
  useQueryFilter,
  useQueryToggle,
  usePagination,
} from "../../hooks/useQueryFilter";

export async function getServerSideProps({ params, query }) {
  try {
    const stableId = parseInt(params.id, 10);
    if (isNaN(stableId)) return { notFound: true };

    const [[stableRow]] = await pool.query(
      `SELECT t.*, t.image_url FROM tag_teams t WHERE t.id = ?`,
      [stableId],
    );
    if (!stableRow) return { notFound: true };

    const stable = {
      id:        stableRow.id,
      name:      stableRow.name,
      founded:   stableRow.founded_date ? stableRow.founded_date.toISOString() : null,
      image_url: stableRow.image_url || null,
    };

    const page            = Math.max(1, parseInt(query.page)  || 1);
    const limit           = Math.min(50, parseInt(query.limit) || 20);
    const offset          = (page - 1) * limit;
    const filterWrestler  = query.wrestler  ? query.wrestler.trim()  : "";
    const filterEvent     = query.filter    ? query.filter.trim()    : "";
    const filterTitle     = query.title     === "1";
    const filterStip      = query.stip      === "1";
    const filterChamp     = query.champ     ? query.champ.trim()     : "";
    const filterMatchType = query.matchtype ? query.matchtype.trim() : "";

    const extraClauses = [];
    const extraParams  = [];

    if (filterWrestler) {
      extraClauses.push(`
        AND EXISTS (
          SELECT 1 FROM match_participants mp3
          JOIN wrestlers w3 ON mp3.wrestler_id = w3.id
          WHERE mp3.match_id = m.id
            AND LOWER(w3.wrestler) LIKE ?
        )`);
      extraParams.push(`%${filterWrestler.toLowerCase()}%`);
    }
    if (filterEvent) {
      extraClauses.push(`AND LOWER(e.name) LIKE ?`);
      extraParams.push(`%${filterEvent.toLowerCase()}%`);
    }
    if (filterTitle) extraClauses.push(`AND m.title_match = 1`);
    if (filterStip)  extraClauses.push(`AND m.match_type_id NOT IN (1, 2, 23, 32)`);
    if (filterChamp) {
      extraClauses.push(`AND LOWER(c.title_name) LIKE ?`);
      extraParams.push(`%${filterChamp.toLowerCase()}%`);
    }
    if (filterMatchType) {
      extraClauses.push(`AND LOWER(mt.name) LIKE ?`);
      extraParams.push(`%${filterMatchType.toLowerCase()}%`);
    }

    const extraSql = extraClauses.join("\n");

    // ─── Grupo 1: miembros + stats (2 conexiones simultáneas) ─────────────
    const [
      [memberRows],
      [[statsRow]],
    ] = await Promise.all([
      pool.query(
        `SELECT tm.wrestler_id, w.wrestler AS name, w.country
         FROM tag_team_members tm JOIN wrestlers w ON w.id = tm.wrestler_id
         WHERE tm.tag_team_id = ?`,
        [stableId],
      ),
      pool.query(
        `SELECT
           COUNT(DISTINCT m.id) AS total,
           COUNT(DISTINCT CASE WHEN mp.result='WIN'  THEN m.id END) AS wins,
           COUNT(DISTINCT CASE WHEN mp.result='DRAW' THEN m.id END) AS draws,
           COUNT(DISTINCT CASE WHEN mp.result='LOSS' THEN m.id END) AS losses,
           MIN(e.event_date) AS firstMatch, MAX(e.event_date) AS lastMatch
         FROM match_participants mp
         JOIN matches m ON mp.match_id=m.id JOIN events e ON m.event_id=e.id
         WHERE mp.tag_team_id = ?`,
        [stableId],
      ),
    ]);

    // ─── Grupo 2: matches paginados + count (2 conexiones simultáneas) ────
    const [
      [rawMatches],
      [[{ total: matchesTotal }]],
    ] = await Promise.all([
      pool.query(
        `SELECT m.id, m.title_match, e.id AS event_id, e.name AS event_name, e.event_date,
           mp.team_number, mp.result, mt.id AS match_type_id, mt.name AS match_type_name,
           c.id AS championship_id, c.title_name AS championship_name,
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('wrestler_id',mp2.wrestler_id,'wrestler',w2.wrestler,'team_number',mp2.team_number,'result',mp2.result))
            FROM match_participants mp2 JOIN wrestlers w2 ON mp2.wrestler_id=w2.id WHERE mp2.match_id=m.id) AS participants,
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('team_number',mts.team_number,'score',mts.score))
            FROM match_team_scores mts WHERE mts.match_id=m.id) AS scores
         FROM match_participants mp
         JOIN matches m ON mp.match_id=m.id JOIN events e ON m.event_id=e.id
         LEFT JOIN match_types mt ON m.match_type_id=mt.id
         LEFT JOIN championships c ON m.championship_id=c.id
         WHERE mp.tag_team_id=? ${extraSql}
         GROUP BY m.id,mp.team_number,mp.result,m.event_id,e.name,e.event_date,mt.id,mt.name,c.id,c.title_name
         ORDER BY e.event_date DESC, m.match_order DESC LIMIT ? OFFSET ?`,
        [stableId, ...extraParams, limit, offset],
      ),
      pool.query(
        `SELECT COUNT(DISTINCT m.id) AS total
         FROM match_participants mp JOIN matches m ON mp.match_id=m.id
         JOIN events e ON m.event_id=e.id
         LEFT JOIN match_types mt ON m.match_type_id=mt.id
         LEFT JOIN championships c ON m.championship_id=c.id
         WHERE mp.tag_team_id=? ${extraSql}`,
        [stableId, ...extraParams],
      ),
    ]);

    const members = memberRows.map((r) => ({ id: r.wrestler_id, name: r.name, country: r.country }));

    const stats = {
      total: statsRow?.total || 0, wins: statsRow?.wins || 0,
      draws: statsRow?.draws || 0, losses: statsRow?.losses || 0,
      firstMatch: statsRow?.firstMatch ? statsRow.firstMatch.toISOString() : null,
      lastMatch:  statsRow?.lastMatch  ? statsRow.lastMatch.toISOString()  : null,
    };

    const matches = rawMatches.map((row) => ({
      id: row.id, event_id: row.event_id,
      event: row.event_name, event_name: row.event_name,
      event_date: row.event_date.toISOString(),
      team_number: row.team_number, result: row.result, title_match: row.title_match === 1,
      match_type_id: row.match_type_id, match_type_name: row.match_type_name,
      championship_id: row.championship_id, championship_name: row.championship_name,
      participants: row.participants || [], scores: row.scores || [],
    }));

    return {
      props: {
        stable, members, stats,
        filterWrestler, filterEvent, filterTitle, filterStip,
        filterChamp, filterMatchType,
        matches,
        pagination: { page, limit, total: matchesTotal, totalPages: Math.ceil(matchesTotal / limit) },
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
  members,
  stats,
  filterWrestler, filterEvent, filterTitle, filterStip,
  filterChamp, filterMatchType,
  matches,
  pagination,
}) {
  const router = useRouter();

  if (error) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Error al cargar</h1>
        <p className="text-gray-500">No se pudo conectar a la base de datos. Intentá de nuevo en unos segundos.</p>
      </div>
    );
  }

  const { input: wrestlerInput,  setInput: setWrestlerInput }  = useQueryFilter("wrestler",  filterWrestler,  router);
  const { input: eventInput,     setInput: setEventInput }     = useQueryFilter("filter",    filterEvent,     router);
  const { input: champInput,     setInput: setChampInput }     = useQueryFilter("champ",     filterChamp,     router);
  const { input: matchTypeInput, setInput: setMatchTypeInput } = useQueryFilter("matchtype", filterMatchType, router);
  const toggleTitle = useQueryToggle("title", filterTitle, router);
  const toggleStip  = useQueryToggle("stip",  filterStip,  router);
  const { goToPage, renderPageButtons } = usePagination(pagination, router);

  const inputClass = "w-full border dark:bg-zinc-950 border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600";

  return (
    <>
      <Head>
        <title>{stable.name} — Trivias WWE</title>
        <meta name="description" content={`Historial de matches y stats de ${stable.name} en Trivias WWE.`} />
      </Head>

      <div className="p-4 max-w-3xl mx-auto">
        <div className="md:flex md:items-stretch md:space-x-6">
          <div className="md:flex-1">
            <h1 className="text-3xl font-bold mb-2">{stable.name}</h1>

            <h2 className="text-2xl font-semibold mb-2">Members</h2>
            <ul className="flex flex-wrap mb-4">
              {members.map((m, idx) => (
                <li key={m.id}>
                  <Link href={`/wrestlers/${m.id}`} className="text-blue-600 dark:text-sky-300 hover:underline">
                    <FlagWithName code={m.country} name={m.name} />
                  </Link>
                  {idx < members.length - 1 && <span>, </span>}
                </li>
              ))}
            </ul>

            <h2 className="text-2xl font-semibold mb-2">Stats</h2>
            <ul className="mb-6 space-y-1">
              <li>Total matches: {stats.total}</li>
              <li>Wins: {stats.wins}</li>
              <li>Draws: {stats.draws}</li>
              <li>Losses: {stats.losses}</li>
              <li>First match: {stats.firstMatch ? formatDateDDMMYYYY(stats.firstMatch) : "—"}</li>
              <li>Last match:  {stats.lastMatch  ? formatDateDDMMYYYY(stats.lastMatch)  : "—"}</li>
            </ul>
          </div>

          {stable.image_url && (
            <div className="md:w-1/2 md:flex-shrink-0 md:self-stretch">
              <div className="relative w-full h-full">
                <img src={stable.image_url} alt={stable.name} className="w-full h-full object-cover rounded" />
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent dark:from-zinc-950 rounded-b" />
              </div>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-semibold mb-3">Matches</h2>

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" placeholder="Filter by wrestler name" value={wrestlerInput}  onChange={(e) => setWrestlerInput(e.target.value)}  className={inputClass} />
            <input type="text" placeholder="Filter by event name"    value={eventInput}     onChange={(e) => setEventInput(e.target.value)}     className={inputClass} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" placeholder="Filter by championship"  value={champInput}     onChange={(e) => setChampInput(e.target.value)}     className={inputClass} />
            <input type="text" placeholder="Filter by stipulation"   value={matchTypeInput} onChange={(e) => setMatchTypeInput(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={toggleTitle} className={`px-4 py-2 rounded font-semibold ${filterTitle ? "bg-blue-600 text-white shadow" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"}`}>Championship matches</button>
            <button onClick={toggleStip}  className={`px-4 py-2 rounded font-semibold ${filterStip  ? "bg-blue-600 text-white shadow" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"}`}>Stipulation matches</button>
          </div>
        </div>

        <ul className="space-y-3">
          {matches.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No matches found.</p>
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
            <button onClick={() => goToPage(Math.max(1, pagination.page - 1))} disabled={pagination.page === 1}
              className={`px-3 py-1 rounded transition-colors ${pagination.page === 1 ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}>
              &lt;
            </button>
            {renderPageButtons()}
            <button onClick={() => goToPage(Math.min(pagination.totalPages, pagination.page + 1))} disabled={pagination.page === pagination.totalPages}
              className={`px-3 py-1 rounded transition-colors ${pagination.page === pagination.totalPages ? "bg-gray-300 dark:bg-gray-900 dark:text-white cursor-not-allowed" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700"}`}>
              &gt;
            </button>
          </div>
        )}
      </div>
    </>
  );
}