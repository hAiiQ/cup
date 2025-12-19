'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  buildBracketMatches,
  ensureTenTeams,
  WINNER_ROUND_GROUPS,
  LOSER_ROUND_GROUPS,
  type BracketMatch,
  type BracketTeam
} from '@/lib/bracketStructure'
import type { MatchState } from '@/lib/matchState'

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

      const [teamsRes, statesRes] = await Promise.all([
        fetch('/api/admin/teams'),
        fetch('/api/admin/bracket/matches/live-states')
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
    setSelectedMatch(match)
    setScoreInput({
      team1: match.team1Score,
      team2: match.team2Score
    })
  }

  const toggleLiveStatus = async (match: BracketMatch) => {
    try {
      const response = await fetch('/api/admin/bracket/matches/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    }
  }

  const updateMatchScore = async (matchId: string, team1Score: number, team2Score: number) => {
    try {
      const response = await fetch('/api/admin/bracket/matches/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    }
  }

  const resetTournament = async () => {
    if (!confirm('Möchtest du das Tournament wirklich komplett zurücksetzen?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/bracket/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        alert('Tournament erfolgreich zurückgesetzt!')
        await fetchData()
      } else {
        alert('Fehler beim Zurücksetzen des Tournaments')
      }
    } catch (error) {
      console.error('Error resetting tournament:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const getMatchById = (id: string) => bracket.find(match => match.id === id)

  const MatchBox = ({ match }: { match?: BracketMatch }) => {
    if (!match) {
      return (
        <div className="bg-gray-800/50 border border-dashed border-gray-600 rounded-xl p-4 text-center text-gray-400 text-sm">
          Match noch nicht bereit
        </div>
      )
    }

    const winningScore = match.id === 'GF' ? 3 : 2
    const team1Name = match.team1?.name || 'TBD'
    const team2Name = match.team2?.name || 'TBD'
    const team1Wins = match.isFinished && match.team1Score >= winningScore
    const team2Wins = match.isFinished && match.team2Score >= winningScore

    return (
      <div className={`bg-gray-800/80 border rounded-xl p-4 flex flex-col gap-3 ${
        match.isFinished ? 'border-green-500/70' : match.isLive ? 'border-yellow-500/70' : 'border-gray-700'
      }`}>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide">
          <span className="text-purple-200">{match.roundLabel}</span>
          <button
            className={`px-2 py-1 rounded text-xs font-semibold ${
              match.isLive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            onClick={() => toggleLiveStatus(match)}
          >
            {match.isLive ? 'STOP' : 'START'}
          </button>
        </div>
        <div className="text-center text-sm font-semibold text-white">{match.label}</div>
        <div
          className="bg-gray-900/60 rounded-lg p-3 cursor-pointer hover:bg-gray-900"
          onClick={() => openScoreModal(match)}
        >
          <div className="grid grid-cols-5 gap-1 items-center text-sm font-medium text-white">
            <div className={`${team1Wins ? 'text-green-400 font-bold' : ''} text-right`}>{team1Name}</div>
            <div className={`${team1Wins ? 'text-green-400 font-bold' : ''} text-center`}>{match.team1Score}</div>
            <div className="text-center text-xs text-gray-300">vs</div>
            <div className={`${team2Wins ? 'text-green-400 font-bold' : ''} text-center`}>{match.team2Score}</div>
            <div className={`${team2Wins ? 'text-green-400 font-bold' : ''} text-left`}>{team2Name}</div>
          </div>
        </div>
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

      <div className="w-full px-4 py-8 space-y-10">
        <section className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50">
          <h2 className="text-2xl font-bold text-white mb-6">Winner Bracket</h2>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {WINNER_ROUND_GROUPS.map(group => (
              <div key={group.title} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">{group.title}</h3>
                  <p className="text-purple-200 text-sm">{group.description}</p>
                </div>
                <div className="flex flex-col gap-3">
                  {group.matchIds.map(matchId => (
                    <MatchBox key={matchId} match={getMatchById(matchId)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Loser Bracket</h2>
            <span className="text-sm text-purple-200">Jede Niederlage zählt – Double Elimination</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {LOSER_ROUND_GROUPS.map(group => (
              <div key={group.title} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">{group.title}</h3>
                  <p className="text-purple-200 text-sm">{group.description}</p>
                </div>
                <div className="flex flex-col gap-3">
                  {group.matchIds.map(matchId => (
                    <MatchBox key={matchId} match={getMatchById(matchId)} />
                  ))}
                </div>
              </div>
            ))}
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
            {selectedMatch.team1 && selectedMatch.team2 ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      {selectedMatch.team1.name}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selectedMatch.id === 'GF' ? 3 : 2}
                      value={scoreInput.team1}
                      onChange={(e) => setScoreInput(prev => ({ ...prev, team1: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      {selectedMatch.team2.name}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selectedMatch.id === 'GF' ? 3 : 2}
                      value={scoreInput.team2}
                      onChange={(e) => setScoreInput(prev => ({ ...prev, team2: Number(e.target.value) || 0 }))}
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
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                  >
                    💾 Speichern
                  </button>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700"
                  >
                    Abbrechen
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 space-y-3">
                <p>Teams stehen noch nicht fest.</p>
                <p className="text-sm">Schließe vorherige Matches ab, um das Ergebnis setzen zu können.</p>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Schließen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
