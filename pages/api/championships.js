// pages/api/championships.js

import { query } from '../../lib/db';
import { setCacheHeaders } from '../../lib/db';

export default async function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );

  if (req.method !== 'GET') return res.status(405).end();

  try {
    const [championships, images] = await Promise.all([
      query(
        `SELECT id, title_name, date_established
         FROM championships
         WHERE show_in_ui = 1
         ORDER BY id ASC`
      ),
      // Por cada campeonato: imagen activa (sin end_date) o la más reciente
      query(
        `SELECT championship_id, image_url
         FROM championship_titles
         WHERE (championship_id, start_date) IN (
           SELECT championship_id, MAX(start_date)
           FROM championship_titles
           GROUP BY championship_id
         )`
      ),
    ]);

    // Preferir fila activa (end_date IS NULL) si hay varias por campeonato
    const imageMap = {};
    for (const row of images) {
      imageMap[row.championship_id] = row.image_url;
    }

    const rows = championships.map((c) => ({
      ...c,
      image_url: imageMap[c.id] ?? null,
    }));

    setCacheHeaders(res, 300);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in /api/championships:', err);
    res.status(500).json({ error: 'Database error' });
  }
}
