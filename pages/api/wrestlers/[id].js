// pages/api/wrestlers/[id].js
import pool from '../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const [[wrestler]] = await pool.query(
      'SELECT id, wrestler, debut_date, country FROM wrestlers WHERE id = ?',
      [id]
    );

    if (!wrestler) return res.status(404).json({ error: 'Luchador no encontrado' });

    const [interpreters] = await pool.query(
      `SELECT i.interpreter 
       FROM wrestler_interpreter wi
       JOIN interpreters i ON wi.interpreter_id = i.id
       WHERE wi.wrestler_id = ?`,
      [id]
    );

    wrestler.interpreters = interpreters.map((i) => i.interpreter);
    res.status(200).json(wrestler);
  } catch (error) {
    console.error('Error en API wrestler:', error);
    res.status(500).json({ error: 'Error cargando luchador' });
  }
}
