// lib/validation.js

/**
 * Coerce a query/param value (which Next.js may supply as string | string[])
 * into a single bounded string.
 */
export function firstString(val, maxLen = 120) {
  const raw = Array.isArray(val) ? val[0] : val;
  return typeof raw === "string" ? raw.slice(0, maxLen) : "";
}

/**
 * Normalize a search term and strip SQL LIKE `%` wildcards to prevent
 * wildcard-backtracking and oversized query parameters.
 */
export function sanitizeSearchTerm(val, maxLen = 80) {
  return firstString(val, maxLen).trim().replace(/%/g, "");
}

/**
 * Strictly parse a positive safe integer ID from a string or string[].
 * Rejects trailing characters, negatives, zero, floats, and Infinity.
 */
export function parsePositiveInt(val) {
  const s = firstString(val, 20).trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Parse bounded pagination parameters safely.
 */
export function parsePagination(
  query = {},
  { defaultLimit = 20, maxLimit = 50, maxPage = 1000 } = {}
) {
  const rawPage = parsePositiveInt(query.page);
  const rawLimit = parsePositiveInt(query.limit);
  const page = Math.min(maxPage, rawPage ?? 1);
  const limit = Math.min(maxLimit, rawLimit ?? defaultLimit);
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

/**
 * Enforce read-only GET requests on API endpoints without caching 405 errors.
 */
export function rejectNonGet(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.setHeader("Cache-Control", "no-store");
    res.status(405).json({ error: "Method not allowed" });
    return true;
  }
  return false;
}
