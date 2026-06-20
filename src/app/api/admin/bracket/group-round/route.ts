import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getBracketSettings, updateBracketSettings } from '@/lib/bracketSettings'
import { buildGroupPhase, PLAYOFF_TEAM_COUNT } from '@/lib/groupPhase'
import { determineWinnerSlot, setMatchState, type MatchState } from '@/lib/matchState'
import { MAX_TEAMS } from '@/lib/teamDefaults'
import { getRandomValorantMap } from '@/lib/valorantMaps'

async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded || !decoded.userId.startsWith('admin_')) {
    return null
  }

  return prisma.admin.findUnique({
    where: { id: decoded.userId.replace('admin_', '') }
  })
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const settings = await getBracketSettings()
    if (!settings.groupPhaseEnabled) {
      return NextResponse.json({ error: 'Die Gruppenphase ist nicht aktiviert.' }, { status: 400 })
    }

    if (!settings.tournamentStarted) {
      return NextResponse.json({ error: 'Starte zuerst das Turnier.' }, { status: 400 })
    }

    const requestedSlots = Math.min(Math.max(settings.teamSlots, 2), MAX_TEAMS)
    const [teamsFromDb, groupMatches] = await Promise.all([
      prisma.team.findMany({
        orderBy: { position: 'asc' },
        take: requestedSlots,
      }),
      prisma.match.findMany({
        where: { bracket: 'group' },
        select: {
          id: true,
          isLive: true,
          team1Score: true,
          team2Score: true,
          isFinished: true,
          mapName: true,
          updatedAt: true,
        },
      }),
    ])

    const stateMap = new Map<string, MatchState>()
    groupMatches.forEach((match) => {
      stateMap.set(match.id, {
        isLive: match.isLive,
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        isFinished: match.isFinished,
        winnerId: determineWinnerSlot(match.id, match.team1Score, match.team2Score),
        mapName: match.mapName || undefined,
        lastUpdated: match.updatedAt.getTime(),
        source: 'database',
      })
    })

    const teams = teamsFromDb.map((team) => ({
      id: team.id,
      name: team.name,
      position: team.position || 0,
    }))
    const groupPhase = buildGroupPhase(
      teams,
      settings.groupCount,
      PLAYOFF_TEAM_COUNT,
      requestedSlots,
      stateMap,
      settings.activeGroupRound,
      settings.groupTeamOrder,
      settings.groupRoundCount
    )

    const currentRound = groupPhase.rounds.find((round) => round.round === settings.activeGroupRound)
    if (currentRound && !currentRound.isComplete) {
      return NextResponse.json(
        { error: `Gruppenrunde ${currentRound.round} ist noch nicht vollständig abgeschlossen.` },
        { status: 409 }
      )
    }

    const nextRoundNumber = settings.activeGroupRound + 1
    const nextRound = groupPhase.rounds.find((round) => round.round === nextRoundNumber)
    if (!nextRound) {
      return NextResponse.json(
        { error: groupPhase.isComplete ? 'Die Gruppenphase ist bereits abgeschlossen.' : 'Keine weitere Gruppenrunde vorhanden.' },
        { status: 409 }
      )
    }

    const now = new Date()
    const existingMaps = new Map(groupMatches.map((match) => [match.id, match.mapName]))
    const mapsByMatch = new Map(
      nextRound.matches.map((match) => [
        match.id,
        existingMaps.get(match.id) || getRandomValorantMap(),
      ])
    )
    await prisma.$transaction([
      prisma.match.updateMany({
        where: { bracket: 'group', isLive: true },
        data: { isLive: false, updatedAt: now },
      }),
      ...nextRound.matches.map((match, index) =>
        prisma.match.upsert({
          where: { id: match.id },
          update: {
            team1Id: match.team1?.id,
            team2Id: match.team2?.id,
            isLive: true,
            isFinished: false,
            mapName: mapsByMatch.get(match.id),
            updatedAt: now,
          },
          create: {
            id: match.id,
            bracket: 'group',
            round: nextRoundNumber,
            matchNumber: index + 1,
            team1Id: match.team1?.id,
            team2Id: match.team2?.id,
            team1Score: 0,
            team2Score: 0,
            isLive: true,
            isFinished: false,
            mapName: mapsByMatch.get(match.id),
          },
        })
      ),
    ])

    nextRound.matches.forEach((match) => {
      setMatchState(match.id, {
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        isLive: true,
        isFinished: false,
        winnerId: undefined,
        mapName: mapsByMatch.get(match.id),
      })
    })

    const updatedSettings = await updateBracketSettings({ activeGroupRound: nextRoundNumber })

    return NextResponse.json({
      success: true,
      message: `Gruppenrunde ${nextRoundNumber} wurde aktiviert und live gestellt.`,
      settings: updatedSettings,
      round: nextRoundNumber,
      matches: nextRound.matches,
    })
  } catch (error) {
    console.error('Activate group round error:', error)
    return NextResponse.json(
      { error: 'Die nächste Gruppenrunde konnte nicht aktiviert werden.' },
      { status: 500 }
    )
  }
}
