'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  type BracketConnection,
  type BracketMatch,
  type BracketMode,
  type BracketNodeLayout,
  type BracketTeam
} from '@/lib/bracketStructure'
import BracketDiagram from '@/components/bracket/BracketDiagram'
import { DEFAULT_TEAM_NAMES } from '@/lib/teamDefaults'
import { PLAYOFF_TEAM_COUNT, type GroupPhaseResult } from '@/lib/groupPhase'

const getTeamName = (team?: BracketTeam, fallback: string = 'TBD') => {
  return team?.name || fallback
}

const TwitchLogo = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
    <path d="M4.3 2 2.8 5.8v13.7h5.1V22h2.8l2.5-2.5H17l4.2-4.2V2H4.3Zm15 12.4-2.4 2.4h-4.2l-2.5 2.5v-2.5H6.8V4.5h12.5v9.9Zm-3.4-6.5v5h-2.1v-5h2.1Zm-4.6 0v5H9.2v-5h2.1Z" />
  </svg>
)

const TeamTwitchLinks = ({ team }: { team?: BracketTeam }) => {
  if (!team?.twitchChannels?.length) return null

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {team.twitchChannels.map(channel => (
        <a
          key={channel.toLowerCase()}
          href={`https://www.twitch.tv/${encodeURIComponent(channel)}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`${channel} auf Twitch ansehen`}
          aria-label={`${channel} auf Twitch ansehen`}
          className="rounded bg-[#9146ff] p-1 text-white transition-colors hover:bg-[#772ce8] focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <TwitchLogo />
        </a>
      ))}
    </span>
  )
}

const BracketMatchBox = ({
  match,
  className = ''
}: {
  match?: BracketMatch
  className?: string
}) => {
  if (!match) {
    return (
      <div className={`bg-black/75 border border-white/10 rounded-lg p-3 w-full h-full flex items-center justify-center text-gray-400 text-sm ${className}`}>
        Match folgt
      </div>
    )
  }

  const team1Name = getTeamName(match.team1, 'TBD')
  const team2Name = getTeamName(match.team2, 'TBD')
  const team1Score = match.team1Score ?? 0
  const team2Score = match.team2Score ?? 0
  const team1Wins = match.isFinished && match.winnerId === 'team1'
  const team2Wins = match.isFinished && match.winnerId === 'team2'

  return (
    <div className={`${match.isFeatured ? 'border-[#9146ff] bg-[#2b1648]/95 ring-2 ring-[#9146ff]/40 shadow-[0_0_22px_rgba(145,70,255,0.35)]' : 'border-white/10 bg-black/80'} border rounded-lg px-2 py-2 w-full h-full flex flex-col justify-center ${className}`}>
      {(match.isFeatured || match.isLive) && (
        <div className="mb-1 flex items-center justify-center gap-2 text-[10px] font-bold uppercase">
          {match.isFeatured && (
            <span className="rounded bg-[#9146ff] px-2 py-0.5 text-white">Twitch Cast</span>
          )}
          {match.isLive && (
            <span className="live-match-pulse text-red-300">Live Match</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-1 text-white text-[13px] font-semibold w-full justify-center">
        <span className="flex min-w-0 flex-1 items-center justify-end gap-1">
          <span className={`min-w-0 truncate text-right ${team1Wins ? 'text-green-400' : ''}`}>{team1Name}</span>
          {match.isLive && <TeamTwitchLinks team={match.team1} />}
        </span>
        <span className={`flex-none w-14 text-center whitespace-nowrap ${match.isLive ? 'text-yellow-300' : 'text-purple-200'}`}>{team1Score} - {team2Score}</span>
        <span className="flex min-w-0 flex-1 items-center gap-1">
          {match.isLive && <TeamTwitchLinks team={match.team2} />}
          <span className={`min-w-0 truncate text-left ${team2Wins ? 'text-green-400' : ''}`}>{team2Name}</span>
        </span>
      </div>
      {match.mapName && (
        <div className="mt-1 text-center text-[11px] font-semibold text-cyan-200">
          Map: {match.mapName}
        </div>
      )}
    </div>
  )
}

export default function BracketPage() {
  const [bracket, setBracket] = useState<BracketMatch[]>([])
  const [teams, setTeams] = useState<BracketTeam[]>([])
  const [layout, setLayout] = useState<BracketNodeLayout[]>([])
  const [connections, setConnections] = useState<BracketConnection[]>([])
  const [slotCount, setSlotCount] = useState(0)
  const [requestedSlotCount, setRequestedSlotCount] = useState(0)
  const [bracketMode, setBracketMode] = useState<'single' | 'double'>('double')
  const [groupPhase, setGroupPhase] = useState<GroupPhaseResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    
    // Auto-refresh alle 3 Sekunden für Live-Updates
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching bracket data...')
      
      // Only fetch matches API - it contains both teams and matches
      const matchesRes = await fetch('/api/bracket/matches', { cache: 'no-store' })
      
      if (matchesRes.ok) {
        const data = await matchesRes.json()
        console.log('✅ Bracket data loaded:', data)
        console.log(`🎮 Admin controlled matches: ${data.adminControlled ? 'YES' : 'NO'}`)
        
        // Set teams from the matches API response
        if (Array.isArray(data.teams) && data.teams.length > 0) {
          setTeams(data.teams)
          console.log(`📋 Teams loaded: ${data.teams.map((t: BracketTeam) => t.name).join(', ')}`)
        } else {
          setTeams([])
        }
        
        // Set matches
        if (data.matches && data.matches.length > 0) {
          setBracket(data.matches)
          console.log(`🏆 Matches loaded: ${data.matches.length} matches`)
          
          // Debug: Show live matches
          const liveMatches = data.matches.filter((m: any) => m.isLive)
          if (liveMatches.length > 0) {
            console.log(`🔴 LIVE MATCHES FOUND:`, liveMatches.map((m: any) => `${m.id} (${m.team1?.name} vs ${m.team2?.name})`))
          } else {
            console.log('⚪ No live matches currently')
          }
        } else {
          console.log('⚠️ No matches in response')
          setBracket([])
        }

        setLayout(Array.isArray(data.layout) ? data.layout : [])
        setConnections(Array.isArray(data.connections) ? data.connections : [])
        setGroupPhase(data.groupPhase || null)
        setSlotCount(typeof data.slotCount === 'number' ? data.slotCount : 0)
          setRequestedSlotCount(typeof data.requestedSlotCount === 'number'
            ? data.requestedSlotCount
            : (typeof data.settings?.teamSlots === 'number' ? data.settings.teamSlots : 0))
          setBracketMode(data.mode === 'single' ? 'single' : 'double')
      } else {
        console.error('❌ Failed to fetch bracket data:', matchesRes.status)
        setBracket([])
        setTeams([])
        setLayout([])
        setConnections([])
        setGroupPhase(null)
        setSlotCount(0)
        setRequestedSlotCount(0)
      }
      
    } catch (error) {
      console.error('❌ Error fetching bracket data:', error)
      setBracket([])
      setTeams([])
      setLayout([])
      setConnections([])
      setGroupPhase(null)
      setSlotCount(0)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-image flex items-center justify-center">
        <div className="text-white text-xl">Lade Tournament Bracket...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-image">
      <div className="w-full px-4 py-6 max-w-[1800px] mx-auto">
        
        {/* Header */}
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-5 border border-purple-500/50 mb-5">
          <h1 className="text-4xl font-bold text-white text-center mb-4">🏆 TOURNAMENT BRACKET</h1>
          
          <div className="text-center">
            <p className="text-purple-200 mb-2">
              {teams.length > 0
                ? groupPhase
                  ? `${groupPhase.groups.flatMap((group) => group.teams).length} Teams • ${groupPhase.groups.length} Gruppen • Top ${PLAYOFF_TEAM_COUNT} ${bracketMode === 'single' ? 'Single' : 'Double'} Elimination`
                  : `${teams.length} Teams • ${bracketMode === 'single' ? 'Single' : 'Double'} Elimination (Konfiguriert: ${requestedSlotCount || '...'} Slots · Seeds: ${slotCount || '...'})`
                : 'Teams werden geladen...'}
            </p>
            <div className="text-sm text-purple-300 flex items-center justify-center gap-4">
              🔄 Live Updates alle 3 Sekunden
              <button 
                onClick={fetchData}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white text-xs font-medium transition-colors"
              >
                🔄 Jetzt Aktualisieren
              </button>
            </div>
          </div>
        </div>

        {groupPhase && (
          <section className="bg-black/70 backdrop-blur-sm rounded-xl p-5 border border-cyan-500/45 mb-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">GRUPPENPHASE</h2>
                <p className="text-cyan-100 text-sm">
                  Jeder spielt einmal gegen jedes andere Team der Gruppe. Grün markiert ist die aktuelle Top-{PLAYOFF_TEAM_COUNT}-Prognose.
                </p>
              </div>
              <div className="rounded-md border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100">
                Runde {groupPhase.activeRound}/{groupPhase.totalRounds}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {groupPhase.groups.map((group) => (
                <article key={group.name} className="rounded-lg border border-white/15 bg-black/65 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{group.name}</h3>
                    <span className="text-xs text-white/50">{group.teams.length} Teams</span>
                  </div>
                  <div className="space-y-2">
                    {group.standings.map((standing) => (
                      <div
                        key={standing.team.id}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border px-3 py-2 text-sm ${standing.qualified ? 'border-emerald-300/40 bg-emerald-950/70 text-emerald-50' : 'border-white/10 bg-black/45 text-white/75'}`}
                      >
                        <span className="min-w-0 truncate font-semibold">
                          {standing.rank}. {standing.team.name}
                        </span>
                        <span className="shrink-0 text-xs text-white/70" title="RA = abgegebene Runden">
                          {standing.wins}S · {standing.losses}N · RA {standing.scoreAgainst}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {groupPhase && (
          <section className="bg-black/70 backdrop-blur-sm rounded-xl p-5 border border-blue-500/45 mb-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">GRUPPENRUNDEN</h2>
                <p className="text-blue-100 text-sm">
                  Paarungen und Ergebnisse aller Gruppen werden rundenweise angezeigt.
                </p>
              </div>
              <div className="text-sm text-white/60">
                {groupPhase.rounds.filter((round) => round.isComplete).length}/{groupPhase.totalRounds} abgeschlossen
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {groupPhase.rounds.map((round) => (
                <article
                  key={round.round}
                  className={`rounded-lg border p-4 ${
                    round.isActive
                      ? 'border-cyan-300/60 bg-cyan-950/75'
                      : round.isComplete
                        ? 'border-green-400/30 bg-green-950/70'
                        : 'border-white/10 bg-black/60'
                  }`}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-white">{round.label}</h3>
                    <span className={`rounded px-2 py-1 text-xs font-bold ${
                      round.isComplete
                        ? 'bg-green-500/20 text-green-100'
                        : round.isActive
                          ? 'bg-cyan-500/20 text-cyan-100'
                          : 'bg-white/10 text-white/60'
                    }`}>
                      {round.isComplete ? 'Abgeschlossen' : round.isActive ? 'Live' : 'Geplant'}
                    </span>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {round.matches.map((match) => (
                      <div key={match.id} className="min-h-20">
                        <BracketMatchBox match={match} />
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Combined Tournament Bracket */}
        <section className="bg-black/70 backdrop-blur-sm rounded-xl p-5 border border-purple-500/50">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end mb-6">
            <span className="text-sm text-purple-200">Angezeigt werden die gewonnenen Runden pro Team</span>
          </div>
          <div className="overflow-auto pb-2">
            {layout.length > 0 ? (
              <BracketDiagram
                matches={bracket}
                layout={layout}
                connections={connections}
                renderMatch={(match) => <BracketMatchBox match={match} className="h-full" />}
                className="mx-auto"
              />
            ) : (
              <div className="text-center text-purple-200 py-10">Bracket wird vorbereitet...</div>
            )}
          </div>
        </section>

        {/* Teams Overview */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white text-center mb-4">TEILNEHMENDE TEAMS</h2>
          <div className="grid md:grid-cols-4 gap-3">
            {teams.length > 0 ? teams.map((team, index) => (
              <div key={team.id} className="bg-black/65 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
                <h3 className="text-white font-semibold text-center text-base">{team.name}</h3>
                <p className="text-purple-200 text-center text-xs">Position {team.position}</p>
              </div>
            )) : (
              // Fallback teams if no teams are loaded
              DEFAULT_TEAM_NAMES.slice(0, requestedSlotCount || slotCount || DEFAULT_TEAM_NAMES.length).map((teamName, index) => (
                <div key={index} className="bg-black/65 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
                  <h3 className="text-white font-semibold text-center text-base">{teamName}</h3>
                  <p className="text-purple-200 text-center text-xs">Position {index + 1}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <div className="flex justify-center space-x-8">
            <Link href="/" className="text-white/80 hover:text-white transition-colors font-medium">
              Home
            </Link>
            <Link href="/teams" className="text-white/80 hover:text-white transition-colors font-medium">
              Teams
            </Link>
            <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors font-medium">
              Dashboard
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
