// lib/matchUtils.js
//
// Utilidades compartidas para renderizado de matches.
// Usadas en: wrestlers/[id].js, interpreters/[id].js, stables/[id].js, events/[id].js

/**
 * Formatea una fecha ISO a "DD/MM/AAAA".
 * @param {string|null} dateString
 * @returns {string}
 */
export function formatDateDDMMYYYY(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Devuelve la frase del resultado en inglés.
 * @param {"WIN"|"LOSS"|"DRAW"|string} result
 * @returns {string}
 */
export function getPhrase(result) {
  if (result === "WIN")  return "defeats";
  if (result === "LOSS") return "defeated by";
  if (result === "DRAW") return "draw with";
  return "vs";
}

/**
 * Construye la línea de campeonato/estipulación que aparece encima de los participantes.
 * Retorna cadena vacía si es un match normal sin título ni estipulación especial.
 *
 * @param {{ championship_name: string|null, match_type_id: number|null, match_type_name: string|null }} match
 * @returns {string}
 */
export function buildTopLine({ championship_name, match_type_id, match_type_name }) {
  const isSpecialStip = match_type_id && match_type_id !== 1;

  if (championship_name && isSpecialStip) {
    return `${championship_name} ${match_type_name} Match`;
  }
  if (championship_name) {
    return championship_name;
  }
  if (!championship_name && isSpecialStip) {
    return `${match_type_name} Match`;
  }
  return "";
}

/**
 * Agrupa participantes por team_number y devuelve el mapa,
 * el equipo principal y los equipos rivales.
 *
 * @param {Array}  participants  - Array de { wrestler_id, wrestler, team_number, result }
 * @param {number} mainTeamNumber
 */
export function buildTeamsMap(participants, mainTeamNumber) {
  const teamsMap = participants.reduce((acc, p) => {
    const key = p.team_number.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const allTeamNumbers = Object.keys(teamsMap);
  const mainKey    = mainTeamNumber.toString();
  const mainTeam   = teamsMap[mainKey] || [];
  const rivalTeams = allTeamNumbers.filter((tn) => tn !== mainKey);

  return { teamsMap, allTeamNumbers, mainTeam, rivalTeams };
}

/**
 * Construye el mapa de scores por team_number.
 * @param {Array} scores - Array de { team_number, score }
 * @returns {Object}
 */
export function buildScoreMap(scores = []) {
  return scores.reduce((acc, s) => {
    acc[s.team_number.toString()] = s.score;
    return acc;
  }, {});
}

export function buildH2hMatches(rawMatches, selfId, isInterpreter = false) {
  const idKey = isInterpreter ? "interpreter_id" : "wrestler_id";
  const nameKey = isInterpreter ? "interpreter" : "wrestler";
  const countryKey = isInterpreter ? "interpreter_country" : "country";
  const out = [];

  for (const match of rawMatches) {
    const parts = typeof match.participants === "string" ? JSON.parse(match.participants) : (match.participants || []);
    const scores = typeof match.scores === "string" ? JSON.parse(match.scores) : (match.scores || []);
    const myP = parts.find((x) => x[idKey] === selfId);
    if (!myP || !myP.result) continue;

    const myTeam = myP.team_number;
    const partners = parts.filter((x) => x.team_number === myTeam && x.wrestler_id !== myP.wrestler_id);
    const opponents = parts.filter((x) => x.team_number !== myTeam);
    if (opponents.length === 0) continue;

    const scoreMap = buildScoreMap(scores);
    let scoreStr = null;
    if (Object.keys(scoreMap).length > 0 && scoreMap[myTeam] != null) {
      const oppTeamNumbers = [...new Set(opponents.map((x) => x.team_number))];
      if (oppTeamNumbers.length === 1 && scoreMap[oppTeamNumbers[0]] != null) {
        scoreStr = `${scoreMap[myTeam]}-${scoreMap[oppTeamNumbers[0]]}`;
      } else if (oppTeamNumbers.length > 1) {
        scoreStr = `${scoreMap[myTeam]}-` + oppTeamNumbers.map((tn) => scoreMap[tn] ?? 0).join("-");
      }
    }

    const uniqueRivals = new Map();
    for (const opp of opponents) {
      const rId = opp[idKey];
      if (!rId || rId === selfId || uniqueRivals.has(rId)) continue;
      uniqueRivals.set(rId, { id: rId, name: opp[nameKey], country: opp[countryKey] || null });
    }
    if (uniqueRivals.size === 0) continue;

    const isOneOnOne = parts.length === 2 && new Set(parts.map((p) => p.team_number)).size === 2;
    out.push({
      match_id: match.match_id,
      event_id: match.event_id,
      event_name: match.event_name,
      result: myP.result,
      scoreStr,
      title_match: match.title_match === 1,
      isOneOnOne,
      isTagTeamChampionship: false,
      partners: partners.map((x) => ({ id: x.wrestler_id, name: x.wrestler })),
      opponents: opponents.map((x) => ({ id: x.wrestler_id, name: x.wrestler })),
      rivals: [...uniqueRivals.values()],
    });
  }
  return out;
}

export function computeH2hRecords(h2hMatches, only1v1, onlyTitle, sort) {
  const map = new Map();
  for (const m of h2hMatches) {
    if (only1v1 && !m.isOneOnOne) continue;
    if (onlyTitle && !m.title_match) continue;
    for (const r of m.rivals) {
      let rec = map.get(r.id);
      if (!rec) {
        rec = { id: r.id, name: r.name, country: r.country, total: 0, wins: 0, draws: 0, losses: 0, diff: 0, matches: [] };
        map.set(r.id, rec);
      }
      rec.total++;
      if (m.result === "WIN") rec.wins++;
      else if (m.result === "DRAW") rec.draws++;
      else if (m.result === "LOSS") rec.losses++;
      rec.diff = rec.wins - rec.losses;
      rec.matches.push(m);
    }
  }
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...map.values()].sort((a, b) => {
    if (sort.key === "name") return dir * a.name.localeCompare(b.name);
    const diffVal = (a[sort.key] - b[sort.key]) * dir;
    if (diffVal !== 0) return diffVal;
    if (b.wins !== a.wins) return (a.wins - b.wins) * dir;
    if (b.total !== a.total) return (a.total - b.total) * dir;
    if (b.diff !== a.diff) return (a.diff - b.diff) * dir;
    return a.name.localeCompare(b.name);
  });
}