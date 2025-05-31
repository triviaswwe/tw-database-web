// pages/championships/[id]/tag_teams.js

import useSWR      from 'swr'
import { useRouter } from 'next/router'

const fetcher = (url) => fetch(url).then((r) => r.json())

export default function ChampionshipTagTeams() {
  const { query } = useRouter()
  const { data: teams } = useSWR(
    query.id ? `/api/championships/${query.id}/tag_teams` : null,
    fetcher
  )

  if (!teams) return <p>Loading...</p>
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
