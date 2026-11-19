// pages/championships/[id]/matches.js

import useSWR from 'swr';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ChampionshipSubpageListSkeleton } from '../../../components/Skeletons';

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function ChampionshipMatches() {
  const { query, isReady } = useRouter();
  const validId =
    typeof query.id === 'string' && /^\d+$/.test(query.id) ? query.id : null;
  const encodedId = validId ? encodeURIComponent(validId) : null;

  const { data: matches, error } = useSWR(
    encodedId ? `/api/championships/${encodedId}/matches` : null,
    fetcher
  );

  if (isReady && !validId) {
    return <p className="p-6">Invalid championship ID.</p>;
  }
  if (error) return <p className="p-6">Error loading matches.</p>;
  if (!matches) return <ChampionshipSubpageListSkeleton title="Matches" />;
  if (!Array.isArray(matches)) {
    return <p className="p-6">Error loading matches.</p>;
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Matches</h2>
      <ul className="space-y-2">
        {matches.map((m) => (
          <li key={m.id}>
            <Link
              href={`/events/${m.event_id}`}
              className="text-blue-600 dark:text-blue-400 "
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
