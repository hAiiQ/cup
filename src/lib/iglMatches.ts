import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { applyEliminationTeamOrder, buildBracketMatches, type BracketMatch, type BracketTeam } from '@/lib/bracketStructure'
import { getBracketSettings } from '@/lib/bracketSettings'
import { MAX_TEAMS } from '@/lib/teamDefaults'
import {
  PLAYOFF_TEAM_COUNT,
  avoidSameGroupFirstRoundMatchups,
  buildGroupPhase,
  hasStartedEliminationMatches,
  type GroupPhaseResult,
  type GroupStageMatch,
} from '@/lib/groupPhase'
import { determineWinnerSlot, getAllMatchStates, type MatchState } from '@/lib/matchState'

export type IglUser = {
  id: string
  username: string
  twitchName: string | null
  isIGL: boolean
  teamId: string | null
  team: {
    id: string
    name: string
    position: number
  } | null
}

export type IglReportStatus = 'pending' | 'confirmed' | 'rejected'

export type IglMatchReport = {
  id: string
  matchId: string
  reporterTeamId: string
  reporterUserId: string
  team1Score: number
  team2Score: number
  winnerSlot: 'team1' | 'team2' | null
  status: IglReportStatus
  confirmedByTeamId: string | null
  confirmedByUserId: string | null
  rejectedByTeamId: string | null
  rejectedByUserId: string | null
  createdAt: Date
  updatedAt: Date
}

export type IglBracketData = {
  matches: BracketMatch[]
  teams: BracketTeam[]
  reports: IglMatchReport[]
  layout: ReturnType<typeof buildBracketMatches>['layout']
  connections: ReturnType<typeof buildBracketMatches>['connections']
  slotCount: number
  requestedSlotCount: number
  mode: ReturnType<typeof buildBracketMatches>['mode']
  settings: Awaited<ReturnType<typeof getBracketSettings>>
  groupPhase: GroupPhaseResult | null
  groupMatches: GroupStageMatch[]
}

export function getBearerOrCookieToken(request: NextRequest): string | undefined {
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  return authToken || request.cookies.get('token')?.value
}

export async function getAuthenticatedIglUser(request: NextRequest): Promise<IglUser | null> {
  const token = getBearerOrCookieToken(request)

  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded?.userId || decoded.userId.startsWith('admin_')) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      username: true,
      twitchName: true,
      isIGL: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          position: true,
        },
      },
    },
  })

  if (!user?.isIGL) {
    return null
  }

  return user
}

export function getBracketMeta(matchId: string) {
  if (matchId === 'GF') {
    return { bracket: 'grand', round: 6 }
  }

  const roundRegex = matchId.match(/R(\d+)/)
  const round = roundRegex ? parseInt(roundRegex[1], 10) : 1

  if (matchId.startsWith('GP-')) {
    return { bracket: 'group', round }
  }

  if (matchId.startsWith('LB')) {
    return { bracket: 'loser', round }
  }

  return { bracket: 'winner', round }
}

export function isRealBracketTeam(team?: BracketTeam): team is BracketTeam {
  return Boolean(
    team &&
      !team.id.startsWith('virtual-') &&
      !team.id.startsWith('placeholder-') &&
      team.name !== 'TBD' &&
      team.name !== 'Freilos'
  )
}

export function findMatchForTeam(matches: BracketMatch[], matchId: string, teamId: string) {
  const match = matches.find((item) => item.id === matchId)

  if (!match || !isRealBracketTeam(match.team1) || !isRealBracketTeam(match.team2)) {
    return null
  }

  const teamSlot =
    match.team1.id === teamId
      ? 'team1'
      : match.team2.id === teamId
        ? 'team2'
        : null

  if (!teamSlot) {
    return null
  }

  return { match, teamSlot }
}

export function getWinnerSlot(team1Score: number, team2Score: number): 'team1' | 'team2' | null {
  return determineWinnerSlot('round-score', team1Score, team2Score) || null
}

export async function loadIglBracketData(): Promise<IglBracketData> {
  const settings = await getBracketSettings()
  const requestedSlots = Math.min(Math.max(settings.teamSlots, 2), MAX_TEAMS)

  const [teamsFromDB, dbMatches, reports] = await Promise.all([
    prisma.team.findMany({
      orderBy: { position: 'asc' },
      take: requestedSlots,
    }),
    prisma.match.findMany({
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
    prisma.matchResultReport.findMany({
      where: {
        status: {
          in: ['pending', 'confirmed'],
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const teams: BracketTeam[] = teamsFromDB.map((team) => ({
    id: team.id,
    name: team.name,
    position: team.position || 0,
  }))

  const confirmedReportsByMatch = new Map(
    reports
      .filter((report) => report.status === 'confirmed')
      .map((report) => [report.matchId, report])
  )

  const stateMap = new Map<string, MatchState>()
  for (const dbMatch of dbMatches) {
    const confirmedReport = confirmedReportsByMatch.get(dbMatch.id)
    const derivedWinner = determineWinnerSlot(dbMatch.id, dbMatch.team1Score || 0, dbMatch.team2Score || 0)
    const winnerId = (confirmedReport?.winnerSlot || derivedWinner) ?? undefined

    stateMap.set(dbMatch.id, {
      isLive: confirmedReport ? false : dbMatch.isLive,
      team1Score: dbMatch.team1Score || 0,
      team2Score: dbMatch.team2Score || 0,
      isFinished: Boolean(confirmedReport || dbMatch.isFinished || winnerId),
      winnerId,
      mapName: dbMatch.mapName || undefined,
      lastUpdated: dbMatch.updatedAt?.getTime() || Date.now(),
      source: 'database',
    })
  }

  Array.from(getAllMatchStates().entries()).forEach(([matchId, memoryState]) => {
    if (!stateMap.has(matchId)) {
      stateMap.set(matchId, {
        ...memoryState,
        source: 'memory',
      })
    }
  })

  const groupPhase = settings.groupPhaseEnabled
    ? buildGroupPhase(
        teams,
        settings.groupCount,
        PLAYOFF_TEAM_COUNT,
        requestedSlots,
        stateMap,
        settings.activeGroupRound,
        settings.groupTeamOrder,
        settings.groupRoundCount
      )
    : null
  const orderedBracketTeams = applyEliminationTeamOrder(
    groupPhase?.advancingTeams || teams,
    settings.eliminationTeamOrder
  )
  const bracketTeams = groupPhase && !hasStartedEliminationMatches(stateMap)
    ? avoidSameGroupFirstRoundMatchups(orderedBracketTeams)
    : orderedBracketTeams
  const bracketSlotCount = settings.groupPhaseEnabled ? PLAYOFF_TEAM_COUNT : requestedSlots

  const bracketResult = buildBracketMatches(bracketTeams, stateMap, {
    mode: settings.mode,
    slotCount: bracketSlotCount,
    autoAdvanceByes: settings.tournamentStarted,
  })

  return {
    ...bracketResult,
    teams: bracketTeams,
    reports: reports.map((report) => ({
      id: report.id,
      matchId: report.matchId,
      reporterTeamId: report.reporterTeamId,
      reporterUserId: report.reporterUserId,
      team1Score: report.team1Score,
      team2Score: report.team2Score,
      winnerSlot: report.winnerSlot as 'team1' | 'team2' | null,
      status: report.status as IglReportStatus,
      confirmedByTeamId: report.confirmedByTeamId,
      confirmedByUserId: report.confirmedByUserId,
      rejectedByTeamId: report.rejectedByTeamId,
      rejectedByUserId: report.rejectedByUserId,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
    settings,
    groupPhase,
    groupMatches: groupPhase?.rounds.flatMap((round) => round.matches) || [],
  }
}
