// lib/db.js

import mysql from "mysql2/promise";

const DEFAULT_QUERY_TIMEOUT_MS =
  parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 30000;

let pool;

if (!global.pool) {
  global.pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQL_ADDON_HOST,
    port: process.env.DB_PORT
      ? parseInt(process.env.DB_PORT)
      : process.env.MYSQL_ADDON_PORT
        ? parseInt(process.env.MYSQL_ADDON_PORT)
        : 3306,
    user: process.env.DB_USER || process.env.MYSQL_ADDON_USER,
    password: process.env.DB_PASS || process.env.MYSQL_ADDON_PASSWORD,
    database: process.env.DB_NAME || process.env.MYSQL_ADDON_DB,
    waitForConnections: true,
    connectionLimit: 30,
    queueLimit: 100,
    connectTimeout: 10000, // 10s para establecer conexión
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
      ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {}),
    },
    // ─── EVITA EL ECONNRESET EN TIDB ───
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  const origQuery = global.pool.query.bind(global.pool);
  const origExecute = global.pool.execute.bind(global.pool);
  const withTimeout = (sql) =>
    typeof sql === "string"
      ? { sql, timeout: DEFAULT_QUERY_TIMEOUT_MS }
      : { timeout: DEFAULT_QUERY_TIMEOUT_MS, ...sql };

  global.pool.query = (sql, values) =>
    values !== undefined
      ? origQuery(withTimeout(sql), values)
      : origQuery(withTimeout(sql));
  global.pool.execute = (sql, values) =>
    values !== undefined
      ? origExecute(withTimeout(sql), values)
      : origExecute(withTimeout(sql));
}

pool = global.pool;

/**
 * Ejecuta una consulta SQL y devuelve las filas resultantes.
 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Aplica headers de caché HTTP a una API response de Next.js.
 * Reduce drásticamente las consultas repetidas a la DB.
 *
 * @param {import('next').NextApiResponse} res
 * @param {number} [maxAge=60] - Segundos en CDN/proxy
 */
export function setCacheHeaders(res, maxAge = 60) {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
  );
}

/**
 * Evita que CDN o proxies compartidos cacheen respuestas de error.
 *
 * @param {import('next').NextApiResponse} res
 */
export function setNoStoreHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
}

export default pool;