// pages/championships/[id]/reigns.js

import useSWR from "swr";
import { useRouter } from "next/router";
import Link from "next/link";
import { ChampionshipSubpageListSkeleton } from "../../../components/Skeletons";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function ChampionshipReigns() {
  const { query, isReady } = useRouter();
  const validId =
    typeof query.id === "string" && /^\d+$/.test(query.id) ? query.id : null;
  const encodedId = validId ? encodeURIComponent(validId) : null;

  const { data: reigns, error } = useSWR(
    encodedId ? `/api/championships/${encodedId}/reigns` : null,
    fetcher
  );

  if (isReady && !validId) {
    return <p className="p-6">Invalid championship ID.</p>;
  }
  if (error) return <p className="p-6">Error loading reigns.</p>;
  if (!reigns) return <ChampionshipSubpageListSkeleton title="Reigns" />;
  if (!Array.isArray(reigns)) {
    return <p className="p-6">Error loading reigns.</p>;
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Reigns</h2>
      <ul className="space-y-2">
        {reigns.map((r) => (
          <li key={r.id}>
            <Link
              href={`/championships/${encodedId}/reigns/${encodeURIComponent(String(r.id))}`}
              className="text-blue-600 dark:text-blue-400 "
            >
              {Number(validId) === 8
                ? `Reign #${r.reign_number}`
                : `Reign #${r.reign_number} — ${r.days_held} days`}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
