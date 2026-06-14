'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatTierShortLabel } from '@/lib/tierConfig'

interface ListedUser {
  id: string
  username: string
  inGameName?: string | null
  inGameRank?: string | null
  valorantCurrentRank?: string | null
  valorantLevel?: number | null
  tier?: string | null
  isParticipating: boolean
  createdAt: string
  team?: {
    id: string
    name: string
    position: number
  } | null
}

const emptyValue = 'Offen'

export default function UserListPage() {
  const [users, setUsers] = useState<ListedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/users/list', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Userliste konnte nicht geladen werden')
      }

      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Userliste konnte nicht geladen werden')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const teamA = a.team?.position ?? 999
        const teamB = b.team?.position ?? 999

        if (teamA !== teamB) {
          return teamA - teamB
        }

        return a.username.localeCompare(b.username, 'de')
      }),
    [users]
  )

  const teamCount = new Set(users.filter((user) => user.team).map((user) => user.team?.id)).size
  const rankedCount = users.filter((user) => user.valorantCurrentRank || user.inGameRank).length
  const participatingCount = users.filter((user) => user.isParticipating).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-lg border border-white/20 bg-black/30 px-8 py-6 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-white" />
          <div className="text-xl font-semibold text-white">Userliste wird geladen...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-red-400/40 bg-red-950/40 p-8 text-center backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white">Userliste nicht erreichbar</h1>
          <p className="mt-3 text-red-100">{error}</p>
          <button
            type="button"
            onClick={fetchUsers}
            className="mt-6 rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-white/20 bg-black/25 p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-purple-200">Summer Cup</p>
              <h1 className="mt-1 text-4xl font-bold text-white">Userliste</h1>
              <p className="mt-2 text-white/70">
                Übersicht aller registrierten Spieler mit Rank-, Tier- und Team-Zuordnung.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div className="rounded-md border border-white/15 bg-white/10 px-4 py-3">
                <div className="text-2xl font-bold text-white">{users.length}</div>
                <div className="text-xs uppercase text-white/60">User</div>
              </div>
              <div className="rounded-md border border-white/15 bg-white/10 px-4 py-3">
                <div className="text-2xl font-bold text-sky-200">{rankedCount}</div>
                <div className="text-xs uppercase text-white/60">Ranks</div>
              </div>
              <div className="rounded-md border border-white/15 bg-white/10 px-4 py-3">
                <div className="text-2xl font-bold text-emerald-200">{teamCount}</div>
                <div className="text-xs uppercase text-white/60">Teams</div>
              </div>
              <div className="rounded-md border border-white/15 bg-white/10 px-4 py-3">
                <div className="text-2xl font-bold text-yellow-200">{participatingCount}</div>
                <div className="text-xs uppercase text-white/60">Dabei</div>
              </div>
            </div>
          </div>
        </section>

        {sortedUsers.length === 0 ? (
          <section className="mt-6 rounded-lg border border-white/20 bg-black/25 p-10 text-center backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">Noch keine registrierten User</h2>
            <p className="mt-2 text-white/60">Sobald Registrierungen vorhanden sind, erscheinen sie hier.</p>
          </section>
        ) : (
          <>
            <section className="mt-6 hidden overflow-hidden rounded-lg border border-white/20 bg-black/30 backdrop-blur-sm lg:block">
              <table className="w-full table-fixed text-left">
                <thead className="border-b border-white/15 bg-white/10 text-xs uppercase text-white/60">
                  <tr>
                    <th className="w-[15%] px-4 py-3">Username</th>
                    <th className="w-[17%] px-4 py-3">Ingame Name</th>
                    <th className="w-[13%] px-4 py-3">Ingame Rank</th>
                    <th className="w-[13%] px-4 py-3">Peak Rank</th>
                    <th className="w-[7%] px-4 py-3">Lvl</th>
                    <th className="w-[9%] px-4 py-3">Tier</th>
                    <th className="w-[13%] px-4 py-3">Team</th>
                    <th className="w-[13%] px-4 py-3">Teilnahme</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/10 last:border-b-0">
                      <td className="px-4 py-4 font-semibold text-white">{user.username || emptyValue}</td>
                      <td className="px-4 py-4 text-white/80">{user.inGameName || emptyValue}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-100">
                          {user.valorantCurrentRank || emptyValue}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-100">
                          {user.inGameRank || emptyValue}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-white/80">
                        {typeof user.valorantLevel === 'number' ? user.valorantLevel : emptyValue}
                      </td>
                      <td className="px-4 py-4 text-white/80">
                        {formatTierShortLabel(user.tier, emptyValue)}
                      </td>
                      <td className="px-4 py-4 text-white/80">{user.team?.name || emptyValue}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            user.isParticipating
                              ? 'border-green-400/40 bg-green-500/15 text-green-100'
                              : 'border-white/15 bg-white/5 text-white/50'
                          }`}
                        >
                          {user.isParticipating ? 'Dabei' : 'Nicht dabei'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mt-6 grid gap-4 lg:hidden">
              {sortedUsers.map((user) => (
                <article key={user.id} className="rounded-lg border border-white/20 bg-black/30 p-4 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-bold text-white">{user.username || emptyValue}</h2>
                      <p className="mt-1 truncate text-sm text-white/60">{user.inGameName || emptyValue}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                        {user.team?.name || emptyValue}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          user.isParticipating
                            ? 'border-green-400/40 bg-green-500/15 text-green-100'
                            : 'border-white/15 bg-white/5 text-white/50'
                        }`}
                      >
                        {user.isParticipating ? 'Dabei' : 'Nicht dabei'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-white/10 p-3">
                      <div className="text-xs uppercase text-white/50">Ingame Rank</div>
                      <div className="mt-1 font-semibold text-sky-100">{user.valorantCurrentRank || emptyValue}</div>
                    </div>
                    <div className="rounded-md bg-white/10 p-3">
                      <div className="text-xs uppercase text-white/50">Peak Rank</div>
                      <div className="mt-1 font-semibold text-indigo-100">{user.inGameRank || emptyValue}</div>
                    </div>
                    <div className="rounded-md bg-white/10 p-3">
                      <div className="text-xs uppercase text-white/50">Lvl</div>
                      <div className="mt-1 font-semibold text-white">
                        {typeof user.valorantLevel === 'number' ? user.valorantLevel : emptyValue}
                      </div>
                    </div>
                    <div className="rounded-md bg-white/10 p-3">
                      <div className="text-xs uppercase text-white/50">Tier</div>
                      <div className="mt-1 font-semibold text-white">{formatTierShortLabel(user.tier, emptyValue)}</div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
