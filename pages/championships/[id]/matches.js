// pages/championships/[id]/matches.js

import useSWR from 'swr';
import { useRouter } from 'next/router';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function ChampionshipMatches() {
  const { query } = useRouter();
  const { data: matches, error } = useSWR(
    query.id ? `/api/championships/${query.id}/matches` : null,
    fetcher
  );

  if (error) return <p>Error loading matches.</p>;
  if (!matches) return <p>Loading...</p>;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Matches</h2>
      <ul className="space-y-2">
        {matches.map((m) => (
          <li key={m.id}>
            <Link
              href={`/events/${m.event_id}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {m.match_order}. {m.match_type} — {m.event_name}
            </Link>{' '}
            {m.title_changed ? '(Title Changed)' : '(Title Retained)'}
          </li>
        ))}
      </ul>
    </div>
  );
}
