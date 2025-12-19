'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  buildBracketMatches,
  ensureTenTeams,
  COMBINED_BRACKET_LAYOUT,
  COMBINED_BRACKET_CONNECTIONS,
  type BracketMatch,
  type BracketTeam
} from '@/lib/bracketStructure'
import type { MatchState } from '@/lib/matchState'
import BracketDiagram from '@/components/bracket/BracketDiagram'

interface ScoreInput {
  team1: number
  team2: number
}

const createStateMap = (states: any[]): Map<string, MatchState> => {
  const map = new Map<string, MatchState>()

  states?.forEach((state) => {
    map.set(state.matchId, {
      isLive: Boolean(state.isLive),
      team1Score: Number(state.team1Score) || 0,
      team2Score: Number(state.team2Score) || 0,
      isFinished: Boolean(state.isFinished),
      winnerId: state.winnerId || undefined,
      lastUpdated: state.lastUpdated || Date.now(),
      source: state.source === 'database' ? 'database' : 'memory'
    })
  })

  return map
}

export default function AdminBracketPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<BracketTeam[]>([])
  const [bracket, setBracket] = useState<BracketMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)
  const [scoreInput, setScoreInput] = useState<ScoreInput>({ team1: 0, team2: 0 })
  const [savingScores, setSavingScores] = useState(false)
  const [liveToggleMatchId, setLiveToggleMatchId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    checkAdminAuth()
  }, [])

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/check', {
        credentials: 'include'
      })

      if (response.ok) {
        setIsAuthenticated(true)
        await fetchData()
      } else {
        setIsAuthenticated(false)
        window.location.href = '/admin?redirect=' + encodeURIComponent('/admin/bracket')
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error)
      setIsAuthenticated(false)
      window.location.href = '/admin?redirect=' + encodeURIComponent('/admin/bracket')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const fetchData = async (showMainSpinner = true) => {
    try {
      if (showMainSpinner) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const requestInit: RequestInit = { credentials: 'include' }

      const [teamsRes, statesRes] = await Promise.all([
        fetch('/api/admin/teams', requestInit),
        fetch('/api/admin/bracket/matches/live-states', requestInit)
      ])

      let fetchedTeams: BracketTeam[] = []
      if (teamsRes.ok) {
        const payload = await teamsRes.json()
        fetchedTeams = (payload.teams || []).map((team: any) => ({
          id: team.id,
          name: team.name,
          position: team.position || 0
        }))
      }

      const normalizedTeams = ensureTenTeams(fetchedTeams)
      setTeams(normalizedTeams)

      let stateMap = new Map<string, MatchState>()
      if (statesRes.ok) {
        const statePayload = await statesRes.json()
        stateMap = createStateMap(statePayload.states || [])
      }

      const matches = buildBracketMatches(normalizedTeams, stateMap)
      setBracket(matches)
    } catch (error) {
      console.error('Error fetching bracket data:', error)
    } finally {
      if (showMainSpinner) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  const openScoreModal = (match: BracketMatch) => {
    if (!match.team1 || !match.team2 || match.autoAdvance) {
      alert('Teams stehen noch nicht fest. Scores können noch nicht gesetzt werden.')
      return
    }

    setSelectedMatch(match)
    setScoreInput({
      team1: match.team1Score ?? 0,
      team2: match.team2Score ?? 0
    })
  }

  const closeScoreModal = () => setSelectedMatch(null)

  const toggleLiveStatus = async (match: BracketMatch) => {
    if (match.autoAdvance) {
      return
    }

    try {
      setLiveToggleMatchId(match.id)
      const response = await fetch('/api/admin/bracket/matches/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          matchId: match.id,
          isLive: !match.isLive
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`✅ ${result.message || (match.isLive ? 'Match gestoppt' : 'Match gestartet')}`)
        await fetchData(false)
      } else {
        alert('Fehler beim Aktualisieren des Live-Status')
      }
    } catch (error) {
      console.error('Error toggling live status:', error)
      alert('Fehler beim Aktualisieren des Live-Status')
    } finally {
      setLiveToggleMatchId(null)
    }
  }

  const updateMatchScore = async (matchId: string, team1Score: number, team2Score: number) => {
    try {
      setSavingScores(true)
      const response = await fetch('/api/admin/bracket/matches/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ matchId, team1Score, team2Score })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`✅ ${result.message || 'Match-Score gespeichert!'}`)
        setSelectedMatch(null)
        await fetchData(false)
      } else {
        alert('Fehler beim Speichern des Ergebnisses')
      }
    } catch (error) {
      console.error('Error updating match:', error)
      alert('Ein Fehler ist aufgetreten')
    } finally {
      setSavingScores(false)
    }
  }

  const resetTournament = async () => {
    if (!confirm('Möchtest du das Tournament wirklich komplett zurücksetzen?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/bracket/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      if (response.ok) {
        alert('Tournament erfolgreich zurückgesetzt!')
        setSelectedMatch(null)
        await fetchData()
      } else {
        alert('Fehler beim Zurücksetzen des Tournaments')
      }
    } catch (error) {
      console.error('Error resetting tournament:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const MatchBox = ({ match, className = '' }: { match?: BracketMatch, className?: string }) => {
    if (!match) {
      return (
        <div className={`bg-gray-900/60 border border-dashed border-white/15 rounded-lg p-4 text-center text-gray-400 text-sm ${className}`}>
          Match folgt
        </div>
      )
    }

    const team1Name = match.team1?.name || 'TBD'
    const team2Name = match.team2?.name || 'TBD'
    const team1Wins = match.isFinished && match.winnerId === 'team1'
    const team2Wins = match.isFinished && match.winnerId === 'team2'
    const isTogglingLive = liveToggleMatchId === match.id

    return (
      <div className={`bg-gray-900/75 border border-white/10 rounded-lg px-3 py-4 w-full h-full flex flex-col gap-3 shadow-lg ${className}`}>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-purple-200">
          <span className="truncate pr-2">{match.roundLabel}</span>
          <div className="flex items-center gap-2">
            {match.autoAdvance && <span className="text-cyan-300 font-semibold">Freilos</span>}
            {match.isLive && !match.autoAdvance && <span className="text-red-400 font-semibold">Live</span>}
            {match.isFinished && !match.autoAdvance && <span className="text-green-400 font-semibold">Finished</span>}
            {!match.autoAdvance && (
              <button
                className={`px-2 py-1 rounded text-[10px] font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  match.isLive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
                onClick={() => toggleLiveStatus(match)}
                disabled={isTogglingLive}
              >
                {isTogglingLive ? '...' : match.isLive ? 'Stop' : 'Start'}
              </button>
            )}
          </div>
        </div>

        <div className="text-sm font-semibold text-white/80">{match.label}</div>

        <div className="bg-gray-950/70 border border-white/5 rounded-lg px-3 py-3">
          <div className="flex items-center justify-center gap-3 text-white text-sm font-bold w-full">
            <span className={`truncate text-right max-w-[120px] ${team1Wins ? 'text-green-400' : ''}`}>{team1Name}</span>
            <span className={`whitespace-nowrap text-purple-200 ${match.isLive ? 'text-yellow-300' : ''}`}>
              {(match.team1Score ?? 0)} - {(match.team2Score ?? 0)}
            </span>
            <span className={`truncate text-left max-w-[120px] ${team2Wins ? 'text-green-400' : ''}`}>{team2Name}</span>
          </div>
        </div>

        {match.autoAdvance ? (
          <p className="text-xs text-center text-cyan-200">Freilos – Team rückt automatisch weiter</p>
        ) : (
          <div className="flex items-center justify-end">
            <button
              onClick={() => openScoreModal(match)}
              className="text-xs text-white/80 hover:text-white underline underline-offset-2"
            >
              Scores bearbeiten
            </button>
          </div>
        )}
      </div>
    )
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Überprüfe Admin-Berechtigung...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Weiterleitung zum Admin-Login...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Tournament Bracket...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-image">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-2xl font-bold text-purple-400">
              🏆 MARVEL RIVALS TOURNAMENT BRACKET (ADMIN)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-gray-300 text-sm">
                {teams.length} Teams registriert
              </div>
              <button
                onClick={() => fetchData(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                disabled={refreshing}
              >
                {refreshing ? 'Aktualisiere...' : 'Manuell aktualisieren'}
              </button>
              <button
                onClick={resetTournament}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                🔄 Tournament zurücksetzen
              </button>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Zurück zum Dashboard
              </button>
            </div>
          </nav>
        </div>
      </header>

      <div className="w-full px-4 py-6 space-y-8 max-w-[1800px] mx-auto">
        <section className="bg-black/20 backdrop-blur-sm rounded-xl p-5 border border-purple-500/50">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end mb-6">
            <span className="text-sm text-purple-200">Betätige ein Match direkt in der Grafik um Scores/Livestatus zu setzen.</span>
          </div>
          <div className="overflow-x-auto pb-2">
            <BracketDiagram
              matches={bracket}
              layout={COMBINED_BRACKET_LAYOUT}
              connections={COMBINED_BRACKET_CONNECTIONS}
              renderMatch={(match) => <MatchBox match={match} className="h-full" />}
              className="mx-auto"
            />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white text-center mb-4">TEILNEHMENDE TEAMS</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {teams.map(team => (
              <div key={team.id} className="bg-purple-600/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
                <h3 className="text-white font-semibold text-center text-base">{team.name}</h3>
                <p className="text-purple-200 text-center text-xs">Position {team.position}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <h3 className="text-xl font-bold text-white text-center">
              {selectedMatch.label} – {selectedMatch.roundLabel}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  {selectedMatch.team1?.name || 'TBD'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={selectedMatch.id === 'GF' ? 3 : 2}
                  value={scoreInput.team1}
                  onChange={(e) => {
                    const maxScore = selectedMatch.id === 'GF' ? 3 : 2
                    const nextValue = Math.max(0, Math.min(maxScore, Number(e.target.value) || 0))
                    setScoreInput(prev => ({ ...prev, team1: nextValue }))
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  {selectedMatch.team2?.name || 'TBD'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={selectedMatch.id === 'GF' ? 3 : 2}
                  value={scoreInput.team2}
                  onChange={(e) => {
                    const maxScore = selectedMatch.id === 'GF' ? 3 : 2
                    const nextValue = Math.max(0, Math.min(maxScore, Number(e.target.value) || 0))
                    setScoreInput(prev => ({ ...prev, team2: nextValue }))
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
                />
              </div>
            </div>
            <p className="text-gray-400 text-sm text-center">
              {selectedMatch.id === 'GF' ? 'Best of 5 – erstes Team auf 3 Punkte gewinnt' : 'Best of 3 – erstes Team auf 2 Punkte gewinnt'}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => updateMatchScore(selectedMatch.id, scoreInput.team1, scoreInput.team2)}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                disabled={savingScores}
              >
                {savingScores ? 'Speichere...' : '💾 Speichern'}
              </button>
              <button
                onClick={closeScoreModal}
                className="flex-1 bg-gray-700 text-white py-2 rounded hover:bg-gray-600 disabled:opacity-50"
                disabled={savingScores}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
