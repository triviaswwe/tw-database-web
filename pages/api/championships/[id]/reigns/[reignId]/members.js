// pages/api/championships/[id]/reigns/[reignId]/members.js

export default function handler(req, res) {
  const { id, reignId } = req.query;
  res.status(200).json({ message: `Miembros del reinado ${reignId} del campeonato ${id}` });
}
