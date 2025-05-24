// pages/api/interpreters/[id].js
import pool from '../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid interpreter id' });
  }

  try {
    // 1) Obtener datos del intérprete (sin filtrar status)
    const [ints] = await pool.query(
      `SELECT id, interpreter, nationality, instagram, status
       FROM interpreters
       WHERE id = ?`,
      [id]
    );

    if (ints.length === 0) {
      return res.status(404).json({ error: 'Interpreter not found' });
    }
    const interpreter = ints[0];

    // 2) Si está activo, buscar el último luchador usado en su último combate
    let mainWrestler = null;
    if (interpreter.status === 'Active') {
      const [lastMatch] = await pool.query(
        `SELECT m.wrestler_id, w.wrestler
         FROM matches m
         JOIN wrestlers w ON m.wrestler_id = w.id
         WHERE m.interpreter_id = ?
         ORDER BY m.match_date DESC
         LIMIT 1`,
        [id]
      );
      if (lastMatch.length > 0) {
        mainWrestler = lastMatch[0];
      }
    }

    // 3) Obtener todos los luchadores asociados a ese intérprete
    const [wrestlers] = await pool.query(
      `SELECT w.id, w.wrestler
       FROM wrestler_interpreter wi
       JOIN wrestlers w ON wi.wrestler_id = w.id
       WHERE wi.interpreter_id = ?`,
      [id]
    );

    // 4) Responder con datos, lista completa y luchador principal (si existe)
    res.status(200).json({
      ...interpreter,
      wrestlers,
      mainWrestler, // puede ser null si no hay último luchador o si está inactivo
    });
  } catch (err) {
    console.error('API /api/interpreters/[id] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
