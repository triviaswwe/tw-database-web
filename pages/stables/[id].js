// pages/stables/[id].js

import Link from 'next/link';
import pool from '../../lib/db';
import FlagWithName from '../../components/FlagWithName';

export async function getServerSideProps({ params }) {
  const stableId = parseInt(params.id, 10);
  if (isNaN(stableId)) {
    return { notFound: true };
  }

  try {
    // 1) Fetch stable detail
    const [[stableRow]] = await pool.query(
      `SELECT id, name, status FROM tag_teams WHERE id = ?`,
      [stableId]
    );
    if (!stableRow) {
      return { notFound: true };
    }

    // 2) Fetch members
    const [memberRows] = await pool.query(
      `
      SELECT
        tm.status        AS member_status,
        w.id             AS id,
        w.wrestler       AS wrestler,
        w.country        AS country
      FROM tag_team_members tm
      JOIN wrestlers w ON w.id = tm.wrestler_id
      WHERE tm.tag_team_id = ?
      ORDER BY tm.status DESC, w.wrestler
      `,
      [stableId]
    );

    const stable = {
      id: stableRow.id,
      name: stableRow.name,
      status: stableRow.status,
    };

    const members = memberRows.map((m) => ({
      id: m.id,
      wrestler: m.wrestler,
      country: m.country,
      member_status: m.member_status,
    }));

    return {
      props: { stable, members },
    };
  } catch (error) {
    console.error('Error loading stable detail:', error);
    return { notFound: true };
  }
}

export default function StableDetail({ stable, members }) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{stable.name}</h1>
      <p className="text-sm mb-4">
        Status: <strong>{stable.status}</strong>
      </p>

      <h2 className="text-2xl font-semibold mb-3">Members</h2>
      {members.length === 0 ? (
        <p>No members found.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {members.map((m) => (
            <li
              key={m.id}
              className="p-4 border rounded dark:bg-zinc-950"
            >
              <Link
                href={`/wrestlers/${m.id}`}
                className="text-blue-600 hover:underline"
              >
                <FlagWithName code={m.country} /> {m.wrestler}
              </Link>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {m.member_status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
