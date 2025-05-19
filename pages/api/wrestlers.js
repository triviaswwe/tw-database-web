import pool from '../../lib/db';

export default async function handler(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 33;
  const offset = (page - 1) * limit;

  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM wrestlers');

    const [wrestlers] = await pool.query(
      'SELECT id, wrestler, country FROM wrestlers ORDER BY wrestler LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({ wrestlers, totalPages, total });
  } catch (error) {
    console.error('Error loading wrestlers:', error);
    res.status(500).json({ error: 'Error loading wrestlers' });
  }
}
