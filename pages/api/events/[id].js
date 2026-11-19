// pages/api/events/[id].js

import pool, { setCacheHeaders, setNoStoreHeaders } from '../../../lib/db';
import { parsePositiveInt, rejectNonGet } from '../../../lib/validation';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (rejectNonGet(req, res)) return;

  const id = parsePositiveInt(req.query.id);
  if (id === null) {
    setNoStoreHeaders(res);
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, event_type, event_date FROM events WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      setNoStoreHeaders(res);
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    setCacheHeaders(res, 60);
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error en API evento:', error);
    setNoStoreHeaders(res);
    return res.status(500).json({ error: 'Error cargando evento' });
  }
}
