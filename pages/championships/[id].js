// pages/championships/[id].js

import useSWR from "swr";
import { useRouter } from "next/router";
import Link from "next/link";

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function ChampionshipPage() {
  const { query } = useRouter();
  const { data: champ } = useSWR(
    query.id ? `/api/championships/${query.id}` : null,
    fetcher
  );

  if (!champ) return <p>Loading...</p>;

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
          href={`/championships/${query.id}/matches`}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 inline-block"
        >
          Matches
        </Link>
        <Link
          href={`/championships/${query.id}/reigns`}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 inline-block"
        >
          Reigns
        </Link>
        <Link
          href={`/championships/${query.id}/tag_teams`}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 inline-block"
        >
          Tag Teams
        </Link>
      </div>
    </div>
  );
}
