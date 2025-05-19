import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_ADDON_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : (process.env.MYSQL_ADDON_PORT ? parseInt(process.env.MYSQL_ADDON_PORT) : 3306),
  user: process.env.DB_USER || process.env.MYSQL_ADDON_USER,
  password: process.env.DB_PASS || process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.DB_NAME || process.env.MYSQL_ADDON_DB,
});

export default pool;