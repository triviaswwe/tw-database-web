// lib/db.js

import mysql from 'mysql2/promise';

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
    connectionLimit: 5,
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

// Exporta también el pool por si lo necesitas directamente
export default pool;
