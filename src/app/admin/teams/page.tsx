'use client'

import { useEffect, useState } from 'react'
import AdminTopbar from '@/components/AdminTopbar'

interface AdminTeam {
  id: string
  name: string
  position: number
}

export default function TeamManagementPage() {
  const [teams, setTeams] = useState<AdminTeam[]>([])
  const [draftNames, setDraftNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    void fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const response = await fetch('/api/admin/teams', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.status === 401) {
        window.location.href = '/admin?redirect=' + encodeURIComponent('/admin/teams')
        return
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Teams konnten nicht geladen werden.')
      }

      const nextTeams = Array.isArray(data.teams)
        ? [...data.teams].sort((a: AdminTeam, b: AdminTeam) => a.position - b.position)
        : []

      setTeams(nextTeams)
      setDraftNames(
        Object.fromEntries(nextTeams.map((team: AdminTeam) => [team.id, team.name]))
      )
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Teams konnten nicht geladen werden.',
      })
    } finally {
      setLoading(false)
    }
  }

  const saveTeamName = async (team: AdminTeam) => {
    const name = (draftNames[team.id] || '').replace(/\s+/g, ' ').trim()

    if (!name || name === team.name || savingTeamId) {
      return
    }

    try {
      setSavingTeamId(team.id)
      setMessage(null)

      const response = await fetch('/api/admin/teams', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team.id, name }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Teamname konnte nicht gespeichert werden.')
      }

      setTeams((currentTeams) =>
        currentTeams.map((currentTeam) =>
          currentTeam.id === team.id ? { ...currentTeam, name: data.team.name } : currentTeam
        )
      )
      setDraftNames((currentNames) => ({ ...currentNames, [team.id]: data.team.name }))
      setMessage({ type: 'success', text: `${data.team.name} wurde gespeichert.` })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Teamname konnte nicht gespeichert werden.',
      })
    } finally {
      setSavingTeamId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AdminTopbar active="teams" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Admin</p>
          <h1 className="mt-1 text-3xl font-bold">Team Management</h1>
          <p className="mt-2 text-sm text-gray-400">
            Hier aenderst du nur die Teamnamen. Die neuen Namen werden in Teams, Wheel und Bracket uebernommen.
          </p>
        </div>

        {message && (
          <div
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                : 'border-red-400/40 bg-red-500/15 text-red-100'
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-gray-900 p-10 text-center text-gray-400">
            Teams werden geladen...
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-white/10 bg-gray-900/80">
            <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 border-b border-white/10 bg-black/20 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400 sm:grid-cols-[120px_minmax(0,1fr)_120px]">
              <span>Slot</span>
              <span>Teamname</span>
              <span className="hidden text-right sm:block">Aktion</span>
            </div>

            <div className="divide-y divide-white/10">
              {teams.map((team) => {
                const draftName = draftNames[team.id] ?? team.name
                const normalizedDraftName = draftName.replace(/\s+/g, ' ').trim()
                const isSaving = savingTeamId === team.id
                const canSave = Boolean(normalizedDraftName) && normalizedDraftName !== team.name

                return (
                  <form
                    key={team.id}
                    onSubmit={(event) => {
                      event.preventDefault()
                      void saveTeamName(team)
                    }}
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[120px_minmax(0,1fr)_120px] sm:items-center"
                  >
                    <div className="font-bold text-emerald-300">Team {team.position}</div>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(event) =>
                        setDraftNames((currentNames) => ({
                          ...currentNames,
                          [team.id]: event.target.value,
                        }))
                      }
                      maxLength={40}
                      disabled={isSaving}
                      aria-label={`Name fuer Team ${team.position}`}
                      className="min-w-0 rounded-md border border-white/15 bg-gray-950 px-3 py-2 text-white outline-none transition-colors focus:border-emerald-400 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={!canSave || Boolean(savingTeamId)}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                    >
                      {isSaving ? 'Speichert...' : 'Speichern'}
                    </button>
                  </form>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
