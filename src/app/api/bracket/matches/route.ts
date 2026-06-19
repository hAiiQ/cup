import { NextResponse } from 'next/server'
import { getAllMatchStates, determineWinnerSlot, type MatchState } from '@/lib/matchState'
import { prisma } from '@/lib/prisma'
import { buildBracketMatches, type BracketTeam } from '@/lib/bracketStructure'
import { getBracketSettings } from '@/lib/bracketSettings'
import { MAX_TEAMS } from '@/lib/teamDefaults'
import { PLAYOFF_TEAM_COUNT, buildGroupPhase } from '@/lib/groupPhase'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const getTwitchChannel = (value: string | null): string | null => {
  if (!value) return null

  let channel = value.trim().replace(/^@/, '')

  try {
    const url = new URL(channel.startsWith('http') ? channel : `https://${channel}`)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    if (hostname === 'twitch.tv' || hostname === 'm.twitch.tv') {
      channel = url.pathname.split('/').filter(Boolean)[0] || ''
    }
  } catch {
    // A plain Twitch channel name is the expected input.
  }

  return /^[a-zA-Z0-9_]{1,25}$/.test(channel) ? channel.toLowerCase() : null
}

export async function GET() {
  try {
    console.log('🔄 Fetching matches for bracket with persistent live states...')
    
    // Try to get persistent match states from database
    let dbMatches: any[] = []
    let dbError = null
    
    try {
      dbMatches = await prisma.match.findMany({
        select: {
          id: true,
          isLive: true,
          team1Score: true,
          team2Score: true,
          isFinished: true,
          winnerId: true,
          mapName: true,
          updatedAt: true
        }
      })
      console.log(`✅ Database connected: ${dbMatches.length} persistent matches found`)
    } catch (error) {
      dbError = error
      console.log('⚠️ Database not available, falling back to in-memory states')
      console.log('Database error:', error instanceof Error ? error.message : String(error))
    }
    
    let confirmedReports: Array<{ matchId: string; winnerSlot: string | null }> = []
    try {
      confirmedReports = await prisma.matchResultReport.findMany({
        where: { status: 'confirmed' },
        select: {
          matchId: true,
          winnerSlot: true,
        },
      })
    } catch (reportError) {
      console.log('⚠️ Confirmed IGL reports not available:', reportError instanceof Error ? reportError.message : String(reportError))
    }
    const confirmedReportsByMatch = new Map(confirmedReports.map((report) => [report.matchId, report]))

    // Get in-memory states (always available as fallback)
    const memoryStates = getAllMatchStates()
    console.log(`📊 In-memory states: ${memoryStates.size} matches`)
    
    // Create combined match states map
    const combinedStates = new Map<string, MatchState>()
    
    // Add database states first (higher priority) if available
    if (dbMatches.length > 0) {
      for (const dbMatch of dbMatches) {
        const team1Score = dbMatch.team1Score || 0
        const team2Score = dbMatch.team2Score || 0
        const confirmedReport = confirmedReportsByMatch.get(dbMatch.id)
        const derivedWinner = confirmedReport?.winnerSlot || determineWinnerSlot(dbMatch.id, team1Score, team2Score)
        const storedWinner =
          dbMatch.winnerId === 'team1' || dbMatch.winnerId === 'team2'
            ? dbMatch.winnerId
            : undefined

        combinedStates.set(dbMatch.id, {
          isLive: confirmedReport ? false : dbMatch.isLive,
          team1Score,
          team2Score,
          isFinished: Boolean(confirmedReport || dbMatch.isFinished),
          winnerId: storedWinner || derivedWinner,
          mapName: dbMatch.mapName || undefined,
          lastUpdated: dbMatch.updatedAt?.getTime() || Date.now(),
          source: 'database'
        })
      }
    }
    
    // Add in-memory states for matches not in database
    Array.from(memoryStates.entries()).forEach(([matchId, memoryState]) => {
      if (!combinedStates.has(matchId)) {
        combinedStates.set(matchId, {
          ...memoryState,
          source: 'memory'
        })
      }
    })
    
    console.log(`📊 Combined states: ${combinedStates.size} total matches (${dbMatches.length} from DB, ${memoryStates.size} from memory)`)

    const settings = await getBracketSettings()
    const requestedSlots = Math.min(Math.max(settings.teamSlots, 2), MAX_TEAMS)
    
    // Load teams and build bracket
    let dbTeams: BracketTeam[] = []
    try {
      console.log('🔍 Fetching teams for bracket...')
      const teamsFromDB = await prisma.team.findMany({
        include: {
          users: {
            where: {
              isStreamer: true,
              twitchName: { not: null }
            },
            select: {
              twitchName: true
            }
          }
        },
        orderBy: { position: 'asc' },
        take: requestedSlots
      })

      dbTeams = teamsFromDB.map(team => {
        const twitchChannels = Array.from(new Set(
          team.users
            .map(user => getTwitchChannel(user.twitchName))
            .filter((channel): channel is string => Boolean(channel))
        ))

        return {
          id: team.id,
          name: team.name,
          position: team.position || 0,
          twitchChannels
        }
      })

      console.log(`📋 Loaded ${dbTeams.length} teams from database (limit: ${requestedSlots})`)
    } catch (error) {
      console.log('💡 Database fetch error, falling back to placeholder teams:', error)
    }

    const groupPhase = settings.groupPhaseEnabled
      ? buildGroupPhase(
          dbTeams,
          settings.groupCount,
          PLAYOFF_TEAM_COUNT,
          requestedSlots,
          combinedStates,
          settings.activeGroupRound,
          settings.groupTeamOrder
        )
      : null
    const bracketTeams = groupPhase?.advancingTeams || dbTeams
    const bracketSlotCount = settings.groupPhaseEnabled ? PLAYOFF_TEAM_COUNT : requestedSlots

    const bracketResult = buildBracketMatches(bracketTeams, combinedStates, {
      mode: settings.mode,
      slotCount: bracketSlotCount,
      autoAdvanceByes: settings.tournamentStarted
    })

    console.log(`✅ Generated ${bracketResult.matches.length} matches for a ${bracketResult.slotCount}-slot bracket (${settings.mode}) [requested ${bracketResult.requestedSlotCount}]`)
    
    return NextResponse.json({
      matches: bracketResult.matches,
      layout: bracketResult.layout,
      connections: bracketResult.connections,
      slotCount: bracketResult.slotCount,
      requestedSlotCount: bracketResult.requestedSlotCount,
      mode: bracketResult.mode,
      settings,
      groupPhase,
      playoffTeams: bracketTeams,
      teams: dbTeams,
      lastUpdated: new Date().toISOString(),
      adminControlled: combinedStates.size > 0,
      persistentMatches: dbMatches.length,
      memoryMatches: memoryStates.size
    })

  } catch (error) {
    console.error('❌ Bracket matches error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch bracket matches',
        matches: [],
        teams: [],
        groupPhase: null,
        playoffTeams: [],
        layout: [],
        connections: [],
        slotCount: 0,
        requestedSlotCount: 0,
        mode: 'double'
      },
      { status: 500 }
    )
  }
}
