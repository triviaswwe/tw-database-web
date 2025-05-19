import pool from '../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  // Validar que id sea un número válido para evitar SQL Injection o errores
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, event_type, event_date FROM events WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error en API evento:', error);
    res.status(500).json({ error: 'Error cargando evento' });
  }
}
