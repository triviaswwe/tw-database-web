// hooks/useChampionshipHelpers.js
//
// Utilidades puras (sin estado) para championships.
// Exportadas como funciones para usar en otros hooks y en el componente.

/**
 * Calcula días entre won_date y lost_date (o hoy si sigue activo).
 * @returns {string} "123" o "123+"
 */
export function calculateDaysHeld(wonDateStr, lostDateStr) {
  if (!wonDateStr) return "—";
  const start    = new Date(wonDateStr);
  const end      = lostDateStr ? new Date(lostDateStr) : new Date();
  const diffDays = Math.floor((end - start) / 86400000);
  return lostDateStr ? `${diffDays}` : `${diffDays}+`;
}

/**
 * Parsea el string de días a número para comparaciones de sort.
 */
export function parseDays(daysHeld) {
  if (typeof daysHeld === "string") {
    if (daysHeld === "—") return -Infinity;
    return parseInt(daysHeld.replace("+", ""), 10);
  }
  return daysHeld;
}

/**
 * Formatea una fecha ISO a "Month DD, YYYY" en inglés.
 */
export function formatEnglishDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

/**
 * Convierte un número de reinado a su ordinal en inglés.
 */
export function getOrdinalWord(num) {
  const ord = {
    1:"first", 2:"second", 3:"third", 4:"fourth", 5:"fifth",
    6:"sixth", 7:"seventh", 8:"eighth", 9:"ninth", 10:"tenth",
  };
  return ord[num] || `${num}th`;
}