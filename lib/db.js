// lib/db.js

import mysql from 'mysql2/promise';

let pool;

if (!global.pool) {
  global.pool = mysql.createPool({
    host:     process.env.DB_HOST     || process.env.MYSQL_ADDON_HOST,
    port:     process.env.DB_PORT
      ? parseInt(process.env.DB_PORT)
      : process.env.MYSQL_ADDON_PORT
        ? parseInt(process.env.MYSQL_ADDON_PORT)
        : 3306,
    user:     process.env.DB_USER     || process.env.MYSQL_ADDON_USER,
    password: process.env.DB_PASS     || process.env.MYSQL_ADDON_PASSWORD,
    database: process.env.DB_NAME     || process.env.MYSQL_ADDON_DB,
    waitForConnections: true,
    connectionLimit: 15, // subido de 5 → 15 para soportar Promise.all concurrente
    queueLimit: 0,
  });
}

pool = global.pool;

/**
 * Ejecuta una consulta SQL y devuelve las filas resultantes.
 * @param {string} sql - La sentencia SQL a ejecutar.
 * @param {Array<any>} [params] - Parámetros para la consulta.
 * @returns {Promise<Array<any>>}
 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Aplica headers de caché HTTP a una API response de Next.js.
 *
 * Uso en cualquier API handler:
 *   import { setCacheHeaders } from '../../lib/db';
 *   setCacheHeaders(res, 60);   // cachea 60 segundos en CDN, 30 en browser
 *
 * @param {import('next').NextApiResponse} res - Response object de Next.js
 * @param {number} [maxAge=60] - Segundos que el CDN/proxy puede cachear la respuesta
 */
export function setCacheHeaders(res, maxAge = 60) {
  // s-maxage: tiempo en CDN/Vercel Edge
  // stale-while-revalidate: sirve el cache viejo mientras regenera en background
  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`
  );
}

// Exporta también el pool por si lo necesitas directamente
export default pool;