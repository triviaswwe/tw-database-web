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
  return "";
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