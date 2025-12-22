'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  buildBracketMatches,
  type BracketConnection,
  type BracketMatch,
  type BracketNodeLayout,
  type BracketTeam
} from '@/lib/bracketStructure'
import type { MatchState } from '@/lib/matchState'
import BracketDiagram from '@/components/bracket/BracketDiagram'

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
  const [layout, setLayout] = useState<BracketNodeLayout[]>([])
  const [connections, setConnections] = useState<BracketConnection[]>([])
  const [slotCount, setSlotCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)
  const [scoreInputs, setScoreInputs] = useState({ team1: '0', team2: '0' })
  const [renameInputs, setRenameInputs] = useState({ team1: '', team2: '' })
  const [panelMessage, setPanelMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [liveMutationLoading, setLiveMutationLoading] = useState(false)
  const [scoreMutationLoading, setScoreMutationLoading] = useState(false)
  const [teamRenameLoading, setTeamRenameLoading] = useState<'team1' | 'team2' | null>(null)
  const selectedMatchIdRef = useRef<string | null>(null)

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

      setTeams(fetchedTeams)

      let stateMap = new Map<string, MatchState>()
      if (statesRes.ok) {
        const statePayload = await statesRes.json()
        stateMap = createStateMap(statePayload.states || [])
      }

      const bracketResult = buildBracketMatches(fetchedTeams, stateMap)
      setBracket(bracketResult.matches)
      setLayout(bracketResult.layout)
      setConnections(bracketResult.connections)
      setSlotCount(bracketResult.slotCount)

      if (selectedMatchIdRef.current) {
        const refreshed = bracketResult.matches.find(match => match.id === selectedMatchIdRef.current)
        if (refreshed) {
          setSelectedMatch(refreshed)
          setScoreInputs({
            team1: String(refreshed.team1Score ?? 0),
            team2: String(refreshed.team2Score ?? 0)
          })
          setRenameInputs({
            team1: refreshed.team1?.name || '',
            team2: refreshed.team2?.name || ''
          })
        }
      }
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
        await fetchData()
      } else {
        alert('Fehler beim Zurücksetzen des Tournaments')
      }
    } catch (error) {
      console.error('Error resetting tournament:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const handleMatchSelect = (match?: BracketMatch) => {
    if (!match) {
      return
    }

    selectedMatchIdRef.current = match.id
    setSelectedMatch(match)
    setScoreInputs({
      team1: String(match.team1Score ?? 0),
      team2: String(match.team2Score ?? 0)
    })
    setRenameInputs({
      team1: match.team1?.name || '',
      team2: match.team2?.name || ''
    })
    setPanelMessage(null)
  }

  const clearMatchSelection = () => {
    selectedMatchIdRef.current = null
    setSelectedMatch(null)
    setRenameInputs({ team1: '', team2: '' })
    setPanelMessage(null)
  }

  const handleScoreInputChange = (team: 'team1' | 'team2', event: ChangeEvent<HTMLInputElement>) => {
    const sanitized = event.target.value.replace(/[^0-9]/g, '')
    setScoreInputs(prev => ({
      ...prev,
      [team]: sanitized
    }))
  }

  const handleRenameInputChange = (team: 'team1' | 'team2', event: ChangeEvent<HTMLInputElement>) => {
    setRenameInputs(prev => ({
      ...prev,
      [team]: event.target.value
    }))
  }

  const saveTeamRename = async (teamKey: 'team1' | 'team2') => {
    if (!selectedMatch) {
      return
    }

    const targetTeam = teamKey === 'team1' ? selectedMatch.team1 : selectedMatch.team2
    if (!targetTeam?.id) {
      setPanelMessage({ type: 'error', text: 'Kein echtes Team für diesen Slot vorhanden.' })
      return
    }

    if (targetTeam.id.startsWith('placeholder') || targetTeam.id.startsWith('virtual-')) {
      setPanelMessage({ type: 'error', text: 'Dieser Slot muss zunächst mit einem Team besetzt werden.' })
      return
    }

    const desiredName = (renameInputs[teamKey] || '').trim()
    if (!desiredName) {
      setPanelMessage({ type: 'error', text: 'Teamname darf nicht leer sein.' })
      return
    }

    setTeamRenameLoading(teamKey)
    setPanelMessage(null)

    try {
      const response = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId: targetTeam.id, name: desiredName })
      })

      if (!response.ok) {
        throw new Error('Teamname konnte nicht gespeichert werden')
      }

      setPanelMessage({ type: 'success', text: 'Teamname aktualisiert.' })
      await fetchData(false)
    } catch (error) {
      console.error('Error renaming team:', error)
      setPanelMessage({ type: 'error', text: 'Teamname konnte nicht gespeichert werden.' })
    } finally {
      setTeamRenameLoading(null)
    }
  }

  const toggleMatchLive = async () => {
    if (!selectedMatch) {
      return
    }

    setLiveMutationLoading(true)
    setPanelMessage(null)

    try {
      const response = await fetch('/api/admin/bracket/matches/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          matchId: selectedMatch.id,
          isLive: !selectedMatch.isLive
        })
      })

      if (!response.ok) {
        throw new Error('Live-Status konnte nicht gespeichert werden')
      }

      setPanelMessage({
        type: 'success',
        text: !selectedMatch.isLive ? 'Match wurde als LIVE markiert.' : 'Match wurde gestoppt.'
      })
      await fetchData(false)
    } catch (error) {
      console.error('Error toggling live status:', error)
      setPanelMessage({ type: 'error', text: 'Live-Status konnte nicht aktualisiert werden.' })
    } finally {
      setLiveMutationLoading(false)
    }
  }

  const saveMatchScore = async () => {
    if (!selectedMatch) {
      return
    }

    const team1Score = parseInt(scoreInputs.team1 || '0', 10)
    const team2Score = parseInt(scoreInputs.team2 || '0', 10)

    setScoreMutationLoading(true)
    setPanelMessage(null)

    try {
      const response = await fetch('/api/admin/bracket/matches/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          matchId: selectedMatch.id,
          team1Score,
          team2Score
        })
      })

      if (!response.ok) {
        throw new Error('Match-Ergebnis konnte nicht gespeichert werden')
      }

      setPanelMessage({ type: 'success', text: 'Match-Ergebnis gespeichert.' })
      await fetchData(false)
    } catch (error) {
      console.error('Error saving match score:', error)
      setPanelMessage({ type: 'error', text: 'Match-Ergebnis konnte nicht gespeichert werden.' })
    } finally {
      setScoreMutationLoading(false)
    }
  }

  const MatchBox = ({
    match,
    className = '',
    onSelect,
    isSelected
  }: {
    match?: BracketMatch,
    className?: string,
    onSelect?: (match: BracketMatch) => void,
    isSelected?: boolean
  }) => {
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

    return (
      <button
        type="button"
        onClick={() => onSelect?.(match)}
        className={`bg-gray-900/75 border ${isSelected ? 'border-purple-400 ring-2 ring-purple-500/60' : 'border-white/10 hover:border-purple-400/70'} rounded-lg px-3 py-4 w-full h-full flex flex-col justify-center shadow-lg transition-all duration-200 text-left ${className}`}
        aria-pressed={isSelected}
      >
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-purple-200/80 mb-2">
          {match.isLive ? (
            <span className="text-red-300 font-bold animate-pulse">LIVE</span>
          ) : match.isFinished ? (
            <span className="text-green-300 font-semibold">Ergebnis gespeichert</span>
          ) : (
            <span className="text-white/50">Bereit</span>
          )}
          {isSelected && <span className="text-cyan-300 font-semibold">Ausgewählt</span>}
        </div>

        <div className="flex items-center justify-center gap-3 text-white text-sm font-bold w-full">
          <span className={`flex-1 min-w-0 truncate text-right ${team1Wins ? 'text-green-400' : ''}`}>{team1Name}</span>
          <span className={`flex-none w-16 text-center whitespace-nowrap text-purple-200 ${match.isLive ? 'text-yellow-300' : ''}`}>
            {(match.team1Score ?? 0)} - {(match.team2Score ?? 0)}
          </span>
          <span className={`flex-1 min-w-0 truncate text-left ${team2Wins ? 'text-green-400' : ''}`}>{team2Name}</span>
        </div>

        {match.autoAdvance && (
          <p className="text-xs text-center text-cyan-200 mt-2">Freilos – Team rückt automatisch weiter</p>
        )}
      </button>
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
                {teams.length} Teams aktiv · {slotCount > 0 ? `${slotCount}-Slot Bracket` : 'Bracket wird vorbereitet'}
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
          <div className="mb-6" />
          <div className="overflow-x-auto pb-2">
            <BracketDiagram
              matches={bracket}
              layout={layout}
              connections={connections}
              renderMatch={(match) => (
                <MatchBox
                  match={match}
                  className="h-full"
                  onSelect={handleMatchSelect}
                  isSelected={Boolean(match && selectedMatch?.id === match.id)}
                />
              )}
              className="mx-auto"
            />
          </div>
        </section>

        <section className="bg-black/25 backdrop-blur-sm rounded-xl p-5 border border-purple-500/40">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Match-Control Panel</h2>
              <p className="text-purple-200 text-sm">Klicke ein Match im Bracket an, um Live-Status und Score zu steuern.</p>
            </div>
            {selectedMatch && (
              <button
                onClick={clearMatchSelection}
                className="self-start md:self-auto px-4 py-2 rounded bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors"
              >
                Auswahl zurücksetzen
              </button>
            )}
          </div>

          {!selectedMatch && (
            <div className="mt-6 text-center text-purple-200 text-sm">
              Kein Match ausgewählt. Bitte wähle eine Begegnung im Bracket aus, um sie zu steuern.
            </div>
          )}

          {selectedMatch && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="bg-gray-900/60 border border-white/10 rounded-lg p-4">
                  <p className="text-xs uppercase text-white/50 mb-1">Team 1</p>
                  <p className="text-lg font-semibold text-white mb-3">{selectedMatch.team1?.name || 'TBD'}</p>
                  <input
                    type="number"
                    min="0"
                    value={scoreInputs.team1}
                    onChange={(event) => handleScoreInputChange('team1', event)}
                    className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="bg-gray-900/60 border border-white/10 rounded-lg p-4">
                  <p className="text-xs uppercase text-white/50 mb-1">Team 2</p>
                  <p className="text-lg font-semibold text-white mb-3">{selectedMatch.team2?.name || 'TBD'}</p>
                  <input
                    type="number"
                    min="0"
                    value={scoreInputs.team2}
                    onChange={(event) => handleScoreInputChange('team2', event)}
                    className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {panelMessage && (
                  <div
                    className={`rounded-lg px-4 py-3 text-sm ${panelMessage.type === 'success' ? 'bg-green-600/20 text-green-200 border border-green-500/40' : 'bg-red-600/20 text-red-200 border border-red-500/40'}`}
                  >
                    {panelMessage.text}
                  </div>
                )}

                <div className="bg-gray-900/60 border border-white/10 rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="px-2 py-1 rounded bg-black/40 text-white/70 uppercase tracking-wide text-xs">
                      {selectedMatch.isLive ? 'Live' : selectedMatch.isFinished ? 'Beendet' : 'Bereit'}
                    </span>
                    {selectedMatch.winnerId && (
                      <span className="px-2 py-1 rounded bg-green-500/20 text-green-200 text-xs font-semibold">
                        Gewinner: {selectedMatch.winnerId === 'team1' ? (selectedMatch.team1?.name || 'Team 1') : (selectedMatch.team2?.name || 'Team 2')}
                      </span>
                    )}
                    {selectedMatch.autoAdvance && (
                      <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-200 text-xs font-semibold">
                        Freilos
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <button
                      onClick={toggleMatchLive}
                      disabled={liveMutationLoading}
                      className={`w-full px-4 py-2 rounded text-white font-semibold transition-colors ${selectedMatch.isLive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} ${liveMutationLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {liveMutationLoading ? 'Speichere...' : selectedMatch.isLive ? 'Match stoppen' : 'Match starten'}
                    </button>
                    <button
                      onClick={saveMatchScore}
                      disabled={scoreMutationLoading}
                      className={`w-full px-4 py-2 rounded bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors ${scoreMutationLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {scoreMutationLoading ? 'Speichere...' : 'Ergebnis speichern'}
                    </button>
                  </div>

                  <p className="text-xs text-white/60">
                    Hinweis: Matches enden automatisch, sobald ein Team das benötigte Punktelimit erreicht (Best-of-3, Grand Final Best-of-5). Gewinner werden automatisch im Bracket weitergetragen.
                  </p>
                </div>

                <div className="bg-gray-900/60 border border-white/10 rounded-lg p-4 space-y-4">
                  <h3 className="text-white font-semibold text-lg">Teamnamen bearbeiten</h3>
                  {[{ key: 'team1' as const, label: 'Team 1', team: selectedMatch.team1 }, { key: 'team2' as const, label: 'Team 2', team: selectedMatch.team2 }].map(({ key, label, team }) => {
                    const isLoading = teamRenameLoading === key
                    const teamId = team?.id || ''
                    const disabled = !teamId || teamId.startsWith('placeholder') || teamId.startsWith('virtual-')

                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <p className="text-white/80">{label}</p>
                          {team?.name && (
                            <span className="text-xs text-white/50">Aktuell: {team.name}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={renameInputs[key]}
                            onChange={(event) => handleRenameInputChange(key, event)}
                            maxLength={40}
                            disabled={disabled}
                            placeholder={team?.name || 'Noch kein Team'}
                            className="flex-1 rounded bg-black/40 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-purple-400 disabled:opacity-40"
                          />
                          <button
                            onClick={() => saveTeamRename(key)}
                            disabled={disabled || isLoading || !(renameInputs[key] || '').trim()}
                            className={`px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isLoading ? 'opacity-60' : ''}`}
                          >
                            {isLoading ? 'Speichere...' : 'Speichern'}
                          </button>
                        </div>
                        {disabled && (
                          <p className="text-xs text-white/40">Dieser Slot ist noch nicht mit einem Team belegt.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
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
    </div>
  )
}
