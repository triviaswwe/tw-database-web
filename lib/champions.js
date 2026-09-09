// lib/champions.js
import { query } from "./db";

function toDateString(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().split("T")[0];
}

export async function getCurrentChampions() {
  const rows = await query(`
    SELECT
      c.id                                    AS championship_id,
      c.title_name,
      cr.id                                   AS reign_id,
      cr.won_date,
      cr.tag_team_id,
      tt.name                                 AS tag_team_name,
      GROUP_CONCAT(DISTINCT w.id)             AS wrestler_ids,
      GROUP_CONCAT(DISTINCT w.wrestler SEPARATOR ' & ') AS wrestler_names,
      GROUP_CONCAT(DISTINCT w.image_url)      AS image_urls
    FROM championships c
    JOIN championship_reigns cr
      ON cr.championship_id = c.id AND cr.lost_date IS NULL
    LEFT JOIN reign_members rm
      ON rm.reign_id = cr.id AND rm.end_date IS NULL
    LEFT JOIN tag_teams tt
      ON tt.id = cr.tag_team_id
    JOIN wrestlers w
      ON w.id = COALESCE(rm.wrestler_id, cr.wrestler_id)
    WHERE c.show_in_ui = 1
    GROUP BY c.id, c.title_name, cr.id, cr.won_date, cr.tag_team_id, tt.name
    ORDER BY c.id ASC
  `);

  return rows.map((r) => {
    const ids = r.wrestler_ids.split(",");
    const names = r.wrestler_names.split(" & ");

    return {
      championshipId: r.championship_id,
      championship: r.title_name,
      wonDate: toDateString(r.won_date),
      isTagTeam: r.tag_team_id !== null,
      tagTeamId: r.tag_team_id,
      tagTeamName: r.tag_team_name ?? null,
      // ahora un array de { id, name } en vez de solo nombres
      wrestlers: ids.map((id, i) => ({ id, name: names[i] })),
      images: r.image_urls
        .split(",")
        .map((img) => (img.startsWith("http") ? img : `/${img.replace(/^\/+/, "")}`)),
    };
  });
}