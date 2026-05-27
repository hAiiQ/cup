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

export default function BracketPage() {
  const [bracket, setBracket] = useState<BracketMatch[]>([])
  const [teams, setTeams] = useState<BracketTeam[]>([])
  const [layout, setLayout] = useState<BracketNodeLayout[]>([])
  const [connections, setConnections] = useState<BracketConnection[]>([])
  const [slotCount, setSlotCount] = useState(0)
  const [requestedSlotCount, setRequestedSlotCount] = useState(0)
  const [bracketMode, setBracketMode] = useState<'single' | 'double'>('double')
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
      const matchesRes = await fetch('/api/bracket/matches')
      
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
        setSlotCount(0)
        setRequestedSlotCount(0)
      }
      
    } catch (error) {
      console.error('❌ Error fetching bracket data:', error)
      setBracket([])
      setTeams([])
      setLayout([])
      setConnections([])
      setSlotCount(0)
    } finally {
      setLoading(false)
      setRequestedSlotCount(0)
    }
  }

  // Helper function to get team name or fallback
  const getTeamName = (team?: BracketTeam, fallback: string = 'TBD') => {
    return team?.name || fallback
  }

  // Read-only MatchBox component (simplified display)
  const MatchBox = ({ 
    match, 
    className = ""
  }: {
    match?: BracketMatch
    className?: string
  }) => {
    if (!match) {
      return (
        <div className={`bg-gray-800/80 border border-white/10 rounded-lg p-3 w-full h-full flex items-center justify-center text-gray-400 text-sm ${className}`}>
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
      <div className={`bg-gray-900/70 border border-white/10 rounded-lg px-2 py-2 w-full h-full flex flex-col justify-center ${className}`}>
        {match.isLive && (
          <div className="text-[10px] uppercase text-center text-red-300 font-bold mb-1 animate-pulse">
            Live Match
          </div>
        )}
        <div className="flex items-center gap-1 text-white text-[13px] font-semibold w-full justify-center">
          <span className={`flex-1 min-w-0 truncate text-right ${team1Wins ? 'text-green-400' : ''}`}>{team1Name}</span>
          <span className={`flex-none w-14 text-center whitespace-nowrap ${match.isLive ? 'text-yellow-300' : 'text-purple-200'}`}>{team1Score} - {team2Score}</span>
          <span className={`flex-1 min-w-0 truncate text-left ${team2Wins ? 'text-green-400' : ''}`}>{team2Name}</span>
        </div>
      </div>
    )
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
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-5 border border-purple-500/50 mb-5">
          <h1 className="text-4xl font-bold text-white text-center mb-4">🏆 TOURNAMENT BRACKET</h1>
          
          <div className="text-center">
            <p className="text-purple-200 mb-2">
              {teams.length > 0
                ? `${teams.length} Teams • ${bracketMode === 'single' ? 'Single' : 'Double'} Elimination (Konfiguriert: ${requestedSlotCount || '...'} Slots · Seeds: ${slotCount || '...'})`
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

        {/* Combined Tournament Bracket */}
        <section className="bg-black/20 backdrop-blur-sm rounded-xl p-5 border border-purple-500/50">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end mb-6">
            <span className="text-sm text-purple-200">Alle Matches Best-of-3 • Grand Final Best-of-5</span>
          </div>
          <div className="overflow-auto pb-2">
            {layout.length > 0 ? (
              <BracketDiagram
                matches={bracket}
                layout={layout}
                connections={connections}
                renderMatch={(match) => <MatchBox match={match} className="h-full" />}
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
              <div key={team.id} className="bg-purple-600/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
                <h3 className="text-white font-semibold text-center text-base">{team.name}</h3>
                <p className="text-purple-200 text-center text-xs">Position {team.position}</p>
              </div>
            )) : (
              // Fallback teams if no teams are loaded
              DEFAULT_TEAM_NAMES.slice(0, requestedSlotCount || slotCount || DEFAULT_TEAM_NAMES.length).map((teamName, index) => (
                <div key={index} className="bg-purple-600/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
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
