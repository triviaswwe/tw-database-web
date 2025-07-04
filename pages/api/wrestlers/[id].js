// pages/api/wrestlers/[id].js

import pool from '../../../lib/db';

export default async function handler(req, res) {
  const { method, query: { id } } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${method} not allowed` });
  }

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ message: 'Invalid wrestler id' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, wrestler, debut_date, country FROM wrestlers WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Wrestler not found' });
    }

    const wrestler = rows[0];

    // Opcional: traer interpreters asociados
    const [interpreters] = await pool.query(
      `SELECT i.id, i.interpreter, i.nationality
       FROM interpreters i
       JOIN wrestler_interpreter wi ON i.id = wi.interpreter_id
       WHERE wi.wrestler_id = ?`,
      [id]
    );

    res.status(200).json({ ...wrestler, interpreters });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
