// pages/championships/[id]/tag_teams.js

import useSWR      from 'swr'
import { useRouter } from 'next/router'
import { ChampionshipSubpageListSkeleton } from '../../../components/Skeletons'

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function ChampionshipTagTeams() {
  const { query, isReady } = useRouter()
  const validId =
    typeof query.id === 'string' && /^\d+$/.test(query.id) ? query.id : null;
  const encodedId = validId ? encodeURIComponent(validId) : null;

  const { data: teams, error } = useSWR(
    encodedId ? `/api/championships/${encodedId}/tag_teams` : null,
    fetcher
  )

  if (isReady && !validId) {
    return <p className="p-6">Invalid championship ID.</p>;
  }
  if (error) return <p className="p-6">Error loading tag teams.</p>;
  if (!teams) return <ChampionshipSubpageListSkeleton title="Tag Teams" />
  if (!Array.isArray(teams)) {
    return <p className="p-6">Error loading tag teams.</p>;
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Tag Teams</h2>
      <ul className="space-y-2">
        {teams.map((t) => (
          <li key={t.id}>
            <p>
              <strong>{t.tag_team_name}</strong> held reign #{t.reign_id} for{' '}
              {t.days_held} days (won {new Date(t.won_date).toLocaleDateString(undefined, {
                timeZone: 'UTC',
              })})
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
