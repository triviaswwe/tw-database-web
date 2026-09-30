// pages/api/championships/[id]/reigns/[reignId]/members.js

export default function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );

  const { id, reignId } = req.query;
  res.status(200).json({ message: `Miembros del reinado ${reignId} del campeonato ${id}` });
}
