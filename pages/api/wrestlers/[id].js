import pool from '../../../lib/db';

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${method} not allowed` });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, wrestler, debut_date, country FROM wrestlers WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Wrestler not found' });
    }

    // Podés agregar aquí consultas para traer interpreters si querés
    const wrestler = rows[0];
    res.status(200).json(wrestler);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
