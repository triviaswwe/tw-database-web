// pages/api/wrestlers/[id].js

import pool, { setCacheHeaders, setNoStoreHeaders } from '../../../lib/db';
import { parsePositiveInt, rejectNonGet } from '../../../lib/validation';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (rejectNonGet(req, res)) return;

  const id = parsePositiveInt(req.query.id);
  if (id === null) {
    setNoStoreHeaders(res);
    return res.status(400).json({ message: 'Invalid wrestler id' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, wrestler, debut_date, country FROM wrestlers WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      setNoStoreHeaders(res);
      return res.status(404).json({ message: 'Wrestler not found' });
    }

    const wrestler = rows[0];

    const [interpreters] = await pool.query(
      `SELECT i.id, i.interpreter, i.nationality
       FROM interpreters i
       JOIN wrestler_interpreter wi ON i.id = wi.interpreter_id
       WHERE wi.wrestler_id = ?`,
      [id]
    );

    setCacheHeaders(res, 60);
    return res.status(200).json({ ...wrestler, interpreters });
  } catch (error) {
    console.error(error);
    setNoStoreHeaders(res);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
