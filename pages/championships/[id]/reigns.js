// pages/championships/[id]/reigns.js

import useSWR from "swr";
import { useRouter } from "next/router";
import Link from "next/link";

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function ChampionshipReigns() {
  const { query } = useRouter();
  const { data: reigns } = useSWR(
    query.id ? `/api/championships/${query.id}/reigns` : null,
    fetcher
  );

  if (!reigns) return <p>Loading...</p>;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Reigns</h2>
      <ul className="space-y-2">
        {reigns.map((r) => (
          <li key={r.id}>
            <Link
              href={`/championships/${query.id}/reigns/${r.id}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reign #{r.reign_number} — {r.days_held} days
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
