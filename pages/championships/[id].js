// pages/championships/[id].js

import useSWR from "swr";
import { useRouter } from "next/router";
import Link from "next/link";
import { ChampionshipDetailSkeleton } from "../../components/Skeletons";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function ChampionshipPage() {
  const { query, isReady } = useRouter();
  const validId =
    typeof query.id === "string" && /^\d+$/.test(query.id) ? query.id : null;
  const encodedId = validId ? encodeURIComponent(validId) : null;

  const { data, error } = useSWR(
    encodedId ? `/api/championships/${encodedId}` : null,
    fetcher
  );

  if (isReady && !validId) {
    return <p className="p-6">Invalid championship ID.</p>;
  }
  if (error) return <p className="p-6">Error loading championship.</p>;

  const champ = data?.champ || data;
  if (!champ?.title_name) return <ChampionshipDetailSkeleton />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{champ.title_name}</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Established:{" "}
        {new Date(champ.date_established).toLocaleDateString(undefined, {
          timeZone: "UTC",
        })}
      </p>

      <div className="mt-4 space-x-4">
        <Link
          href={`/championships/${encodedId}/matches`}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 inline-block"
        >
          Matches
        </Link>
        <Link
          href={`/championships/${encodedId}/reigns`}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 inline-block"
        >
          Reigns
        </Link>
        <Link
          href={`/championships/${encodedId}/tag_teams`}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 inline-block"
        >
          Tag Teams
        </Link>
      </div>
    </div>
  );
}
