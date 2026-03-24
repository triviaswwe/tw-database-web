// pages/interpreters/[id].js

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
    const interpreterId = parseInt(params.id, 10);
    if (isNaN(interpreterId)) return { notFound: true };

    const [[interpreterRow]] = await pool.query(
      `SELECT id, interpreter, nationality, status FROM interpreters WHERE id = ?`,
      [interpreterId],
    );
    if (!interpreterRow) return { notFound: true };

    const interpreter = {
      id:          interpreterRow.id,
      interpreter: interpreterRow.interpreter,
      nationality: interpreterRow.nationality,
      status:      interpreterRow.status,
    };

    const page            = Math.max(1, parseInt(query.page)  || 1);
    const limit           = Math.min(50, parseInt(query.limit) || 20);
    const offset          = (page - 1) * limit;
    const filterWrestler  = query.wrestler  ? query.wrestler.trim()  : "";
    const filterEvent     = query.filter    ? query.filter.trim()    : "";
    const filterTitle     = query.title     === "1";
    const filterStip      = query.stip      === "1";
    const filterOne       = query.one       === "1";
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
    if (filterOne) {
      extraClauses.push(`
        AND (
          SELECT COUNT(DISTINCT mp_c.team_number)
          FROM match_participants mp_c
          WHERE mp_c.match_id = m.id
        ) = 2
        AND (
          SELECT MAX(t.cnt)
          FROM (
            SELECT COUNT(*) AS cnt
            FROM match_participants mp_i
            WHERE mp_i.match_id = m.id
            GROUP BY mp_i.team_number
          ) t
        ) = 1
      `);
    }
    if (filterChamp) {
      extraClauses.push(`AND LOWER(c.title_name) LIKE ?`);
      extraParams.push(`%${filterChamp.toLowerCase()}%`);
    }
    if (filterMatchType) {
      extraClauses.push(`AND LOWER(mt.name) LIKE ?`);
      extraParams.push(`%${filterMatchType.toLowerCase()}%`);
    }

    const extraSql = extraClauses.join("\n");

    // ─── Grupo 1: datos del header (3 conexiones simultáneas) ─────────────
    const [
      [assocWrestlers],
      [[statsRow]],
      [[lastWrestlerRow]],
    ] = await Promise.all([
      pool.query(
        `SELECT wi.wrestler_id, w.wrestler AS wrestler_name, w.country AS wrestler_country
         FROM wrestler_interpreter wi
         JOIN wrestlers w ON wi.wrestler_id = w.id
         WHERE wi.interpreter_id = ?`,
        [interpreterId],
      ),
      pool.query(
        `SELECT COUNT(*) AS total,
           SUM(CASE WHEN mp.result='WIN'  THEN 1 ELSE 0 END) AS wins,
           SUM(CASE WHEN mp.result='DRAW' THEN 1 ELSE 0 END) AS draws,
           SUM(CASE WHEN mp.result='LOSS' THEN 1 ELSE 0 END) AS losses,
           MIN(e.event_date) AS firstMatch, MAX(e.event_date) AS lastMatch
         FROM match_participants mp
         JOIN matches m ON mp.match_id = m.id
         JOIN events  e ON m.event_id  = e.id
         WHERE mp.interpreter_id = ?`,
        [interpreterId],
      ),
      pool.query(
        `SELECT mp.wrestler_id, w.wrestler AS wrestler_name, w.country AS wrestler_country
         FROM match_participants mp JOIN matches m ON mp.match_id=m.id
         JOIN events e ON m.event_id=e.id JOIN wrestlers w ON mp.wrestler_id=w.id
         WHERE mp.interpreter_id=?
         ORDER BY e.event_date DESC LIMIT 1`,
        [interpreterId],
      ),
    ]);

    // ─── Grupo 2: matches paginados + count (2 conexiones simultáneas) ────
    const [
      [rawMatches],
      [[{ total: matchesTotal }]],
    ] = await Promise.all([
      pool.query(
        `SELECT m.id, m.event_id, m.title_match, e.name AS event, e.event_date, m.match_order,
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
         WHERE mp.interpreter_id=? ${extraSql}
         GROUP BY m.id,mp.team_number,mp.result,m.match_order,m.event_id,e.name,e.event_date,mt.id,mt.name,c.id,c.title_name
         ORDER BY e.event_date DESC, m.match_order DESC LIMIT ? OFFSET ?`,
        [interpreterId, ...extraParams, limit, offset],
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM match_participants mp
         JOIN matches m ON mp.match_id=m.id JOIN events e ON m.event_id=e.id
         LEFT JOIN match_types mt ON m.match_type_id=mt.id
         LEFT JOIN championships c ON m.championship_id=c.id
         WHERE mp.interpreter_id=? ${extraSql}`,
        [interpreterId, ...extraParams],
      ),
    ]);

    let currentWrestler = null;
    let formerWrestlers = [];

    if (interpreter.status === "Inactive") {
      formerWrestlers = assocWrestlers.map((r) => ({ id: r.wrestler_id, name: r.wrestler_name, country: r.wrestler_country }));
    } else if (lastWrestlerRow?.wrestler_id) {
      currentWrestler = { id: lastWrestlerRow.wrestler_id, name: lastWrestlerRow.wrestler_name, country: lastWrestlerRow.wrestler_country };
      formerWrestlers = assocWrestlers
        .filter((r) => r.wrestler_id !== lastWrestlerRow.wrestler_id)
        .map((r) => ({ id: r.wrestler_id, name: r.wrestler_name, country: r.wrestler_country }));
    } else {
      formerWrestlers = assocWrestlers.map((r) => ({ id: r.wrestler_id, name: r.wrestler_name, country: r.wrestler_country }));
    }

    const matchesList = rawMatches.map((row) => ({
      id: row.id, event_id: row.event_id, event: row.event,
      event_date: row.event_date.toISOString(), match_order: row.match_order,
      team_number: row.team_number, result: row.result, title_match: row.title_match === 1,
      match_type_id: row.match_type_id, match_type_name: row.match_type_name,
      championship_id: row.championship_id, championship_name: row.championship_name,
      participants: row.participants || [], scores: row.scores || [],
    }));

    const stats = {
      total: statsRow?.total || 0, wins: statsRow?.wins || 0,
      draws: statsRow?.draws || 0, losses: statsRow?.losses || 0,
      firstMatch: statsRow?.firstMatch ? statsRow.firstMatch.toISOString() : null,
      lastMatch:  statsRow?.lastMatch  ? statsRow.lastMatch.toISOString()  : null,
    };

    return {
      props: {
        interpreter, currentWrestler, formerWrestlers,
        filterWrestler, filterEvent, filterTitle, filterStip, filterOne,
        filterChamp, filterMatchType,
        matches: {
          stats, matches: matchesList,
          pagination: { page, limit, total: matchesTotal, totalPages: Math.ceil(matchesTotal / limit) },
        },
      },
    };
  } catch (err) {
    console.error("Error in interpreters/[id] getServerSideProps:", err);
    return { props: { error: true } };
  }
}

export default function InterpreterDetail({
  error,
  interpreter,
  currentWrestler,
  formerWrestlers = [],
  filterWrestler, filterEvent, filterTitle, filterStip, filterOne,
  filterChamp, filterMatchType,
  matches,
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

  const { pagination } = matches;
  const { input: wrestlerInput,  setInput: setWrestlerInput }  = useQueryFilter("wrestler",  filterWrestler,  router);
  const { input: eventInput,     setInput: setEventInput }     = useQueryFilter("filter",    filterEvent,     router);
  const { input: champInput,     setInput: setChampInput }     = useQueryFilter("champ",     filterChamp,     router);
  const { input: matchTypeInput, setInput: setMatchTypeInput } = useQueryFilter("matchtype", filterMatchType, router);
  const toggleTitle = useQueryToggle("title", filterTitle, router);
  const toggleStip  = useQueryToggle("stip",  filterStip,  router);
  const toggleOne   = useQueryToggle("one",   filterOne,   router);
  const { goToPage, renderPageButtons } = usePagination(pagination, router);

  const inputClass = "w-full border dark:bg-zinc-950 border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600";

  return (
    <>
      <Head>
        <title>{interpreter.interpreter} — Trivias WWE</title>
        <meta name="description" content={`Historial de matches y stats de ${interpreter.interpreter} como intérprete en Trivias WWE.`} />
      </Head>

      <div className="p-4 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{interpreter.interpreter}</h1>

        <p className="text-gray-600 mb-1 dark:text-white">
          Nationality: {interpreter.nationality ? <FlagWithName code={interpreter.nationality} /> : "Unknown"}
        </p>
        <p className="text-gray-600 mb-1 dark:text-white">
          Debut: {matches.stats.firstMatch ? formatDateDDMMYYYY(matches.stats.firstMatch) : "—"}
        </p>

        {interpreter.status === "Active" && (
          currentWrestler ? (
            <p className="text-gray-600 mb-1 dark:text-white">
              Wrestler:{" "}
              <Link href={`/wrestlers/${currentWrestler.id}`} className="text-blue-600 dark:text-sky-300 hover:underline">
                <FlagWithName code={currentWrestler.country} name={currentWrestler.name} />
              </Link>
            </p>
          ) : (
            <p className="text-gray-600 mb-1 dark:text-white">Wrestler: <strong>None</strong></p>
          )
        )}

        {formerWrestlers.length > 0 && (
          <p className="text-gray-600 mb-4 dark:text-white">
            Former wrestlers:{" "}
            {formerWrestlers.map((w, idx) => (
              <span key={w.id}>
                <Link href={`/wrestlers/${w.id}`} className="text-blue-600 dark:text-sky-300 hover:underline">
                  <FlagWithName code={w.country} name={w.name} />
                </Link>
                {idx < formerWrestlers.length - 1 && ", "}
              </span>
            ))}
          </p>
        )}

        <h2 className="text-2xl font-semibold mt-6 mb-2">Stats</h2>
        <ul className="mb-4 text-gray-700 space-y-1 dark:text-white">
          <li>Total matches: {matches.stats.total}</li>
          <li>Wins: {matches.stats.wins}</li>
          <li>Draws: {matches.stats.draws}</li>
          <li>Losses: {matches.stats.losses}</li>
          <li>First match: {matches.stats.firstMatch ? formatDateDDMMYYYY(matches.stats.firstMatch) : "—"}</li>
          <li>Last match:  {matches.stats.lastMatch  ? formatDateDDMMYYYY(matches.stats.lastMatch)  : "—"}</li>
        </ul>

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
            <button onClick={toggleOne}   className={`px-4 py-2 rounded font-semibold ${filterOne   ? "bg-blue-600 text-white shadow" : "bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white hover:bg-gray-300"}`}>1-on-1</button>
          </div>
        </div>

        <ul className="space-y-3">
          {matches.matches.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No matches found.</p>
          ) : (
            matches.matches.map((match, idx) => (
              <MatchCard
                key={`${match.id}-${match.team_number}`}
                match={match}
                currentId={currentWrestler?.id}
                idType="wrestler"
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