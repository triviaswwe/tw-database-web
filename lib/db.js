// lib/db.js

import mysql from "mysql2/promise";

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
    // En 0 (sin límite) para que encole todo el prerenderizado sin rechazar peticiones
    queueLimit: 0,
    connectTimeout: 10000, // 10s para establecer conexión
    ssl: {
      rejectUnauthorized: false,
    },
  });
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

export default pool;