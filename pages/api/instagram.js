// pages/api/instagram.js

import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const userId = process.env.INSTAGRAM_USER_ID;
    const fields = 'id,media_type,permalink,thumbnail_url';
    const limit = 9;

    const response = await axios.get(
      `https://graph.instagram.com/${userId}/media`, {
        params: { fields, access_token: accessToken, limit }
      }
    );

    console.log('IG API response data:', response.data.data);

    const posts = response.data.data
      .filter(item => item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM')
      .slice(0, limit)
      .map(({ id, permalink, thumbnail_url }) => ({ id, permalink, thumbnail_url }));

    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching Instagram posts:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error fetching Instagram posts' });
  }
}

/**
 * Configurar variables de entorno en .env.local:
 * INSTAGRAM_ACCESS_TOKEN=TU_TOKEN_DE_ACCESO
 * INSTAGRAM_USER_ID=TU_ID_DE_USUARIO
 */