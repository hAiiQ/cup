import type { BracketMatch, BracketTeam } from '@/lib/bracketStructure'
import type { MatchState } from '@/lib/matchState'
import { MAX_TEAMS, normalizeTeamName } from '@/lib/teamDefaults'

export const PLAYOFF_TEAM_COUNT = 8
export const MIN_GROUP_COUNT = 1
export const MAX_GROUP_COUNT = 8

export interface GroupPhaseTeam extends BracketTeam {
  groupName: string
  groupIndex: number
  groupSeed: number
  playoffSeed?: number
}

export interface GroupStanding {
  team: GroupPhaseTeam
  rank: number
  played: number
  wins: number
  losses: number
  scoreFor: number
  scoreAgainst: number
  scoreDiff: number
  qualified: boolean
  playoffSeed?: number
}

export interface GroupPhaseGroup {
  index: number
  name: string
  teams: GroupPhaseTeam[]
  standings: GroupStanding[]
}

export interface GroupStageMatch extends BracketMatch {
  bracket: 'group'
  groupName: string
  groupIndex: number
  groupRound: number
}

export interface GroupStageRound {
  round: number
  label: string
  matches: GroupStageMatch[]
  isActive: boolean
  isComplete: boolean
}

export interface GroupPhaseResult {
  groups: GroupPhaseGroup[]
  rounds: GroupStageRound[]
  advancingTeams: GroupPhaseTeam[]
  playoffTeamCount: number
  activeRound: number
  totalRounds: number
  isComplete: boolean
}

const GROUP_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export const clampGroupCount = (value?: number | null, teamSlots: number = MAX_TEAMS): number => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  const fallback = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 4
  const maxBySlots = Math.max(MIN_GROUP_COUNT, Math.min(Math.floor(teamSlots) || MAX_TEAMS, MAX_GROUP_COUNT))

  return Math.min(Math.max(Math.floor(fallback), MIN_GROUP_COUNT), maxBySlots)
}

export const getMaxGroupRoundCount = (teamSlots: number, groupCount: number): number => {
  const safeTeamSlots = Math.max(1, Math.floor(Number(teamSlots) || 1))
  const safeGroupCount = clampGroupCount(groupCount, safeTeamSlots)
  const largestGroupSize = Math.ceil(safeTeamSlots / safeGroupCount)
  const rotationSize = largestGroupSize % 2 === 0 ? largestGroupSize : largestGroupSize + 1

  return Math.max(1, rotationSize - 1)
}

export const clampGroupRoundCount = (
  value: number | null | undefined,
  teamSlots: number,
  groupCount: number
): number => {
  const maxRounds = getMaxGroupRoundCount(teamSlots, groupCount)
  const numericValue = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return maxRounds
  }

  return Math.min(Math.max(Math.floor(numericValue), 1), maxRounds)
}

export const hasStartedEliminationMatches = (stateMap: Map<string, MatchState>): boolean => (
  Array.from(stateMap.entries()).some(([matchId, state]) => (
    !matchId.startsWith('GP-') && (
      state.isLive ||
      state.isFinished ||
      Boolean(state.winnerId) ||
      state.team1Score > 0 ||
      state.team2Score > 0
    )
  ))
)

export const avoidSameGroupFirstRoundMatchups = <T extends BracketTeam>(inputTeams: T[]): T[] => {
  if (inputTeams.length !== PLAYOFF_TEAM_COUNT) {
    return inputTeams
  }

  const groupIndexOf = (team: T) => (team as T & { groupIndex?: number }).groupIndex
  if (inputTeams.some((team) => groupIndexOf(team) === undefined)) {
    return inputTeams
  }

  const topSeeds = inputTeams.slice(0, PLAYOFF_TEAM_COUNT / 2)
  const lowerSeeds = inputTeams.slice(PLAYOFF_TEAM_COUNT / 2)
  let bestLowerSeedOrder: T[] | null = null
  let bestMovement = Number.POSITIVE_INFINITY

  const visitPermutations = (prefix: T[], remaining: T[]) => {
    if (remaining.length === 0) {
      const avoidsRematches = topSeeds.every((team, topIndex) => (
        groupIndexOf(team) !== groupIndexOf(prefix[prefix.length - 1 - topIndex])
      ))
      if (!avoidsRematches) {
        return
      }

      const movement = prefix.reduce((sum, team, targetIndex) => (
        sum + Math.abs(lowerSeeds.findIndex((candidate) => candidate.id === team.id) - targetIndex)
      ), 0)
      if (movement < bestMovement) {
        bestMovement = movement
        bestLowerSeedOrder = prefix
      }
      return
    }

    remaining.forEach((team, index) => {
      visitPermutations(
        [...prefix, team],
        remaining.filter((_, remainingIndex) => remainingIndex !== index)
      )
    })
  }

  visitPermutations([], lowerSeeds)
  if (!bestLowerSeedOrder) {
    return inputTeams
  }

  return [...topSeeds, ...bestLowerSeedOrder].map((team, index) => ({
    ...team,
    position: index + 1,
    ...('playoffSeed' in team ? { playoffSeed: index + 1 } : {})
  })) as T[]
}

export const groupNameForIndex = (index: number): string => {
  return `Gruppe ${GROUP_LABELS[index] || index + 1}`
}

export const normalizeGroupPhaseTeams = (
  teams: BracketTeam[],
  limit: number = MAX_TEAMS,
  teamOrder: string[] = []
): BracketTeam[] => {
  const orderByTeamId = new Map(teamOrder.map((teamId, index) => [teamId, index]))

  return teams
    .filter(Boolean)
    .map((team, index) => {
      const position = typeof team.position === 'number' && team.position > 0 ? team.position : index + 1
      const slotPosition = typeof team.slotPosition === 'number' && team.slotPosition > 0
        ? team.slotPosition
        : position
      return {
        ...team,
        position,
        slotPosition,
        name: normalizeTeamName(position, team.name),
      }
    })
    .filter((team) => team.position >= 1 && team.position <= limit)
    .sort((a, b) => {
      const aOrder = orderByTeamId.get(a.id)
      const bOrder = orderByTeamId.get(b.id)

      if (aOrder !== undefined || bOrder !== undefined) {
        return (aOrder ?? teamOrder.length + a.position) - (bOrder ?? teamOrder.length + b.position)
      }

      return a.position - b.position
    })
}

const distributeTeams = (teams: BracketTeam[], groupCount: number): GroupPhaseGroup[] => {
  const groups: GroupPhaseGroup[] = Array.from({ length: groupCount }, (_, index) => ({
    index,
    name: groupNameForIndex(index),
    teams: [],
    standings: [],
  }))

  teams.forEach((team, index) => {
    const block = Math.floor(index / groupCount)
    const indexInBlock = index % groupCount
    const groupIndex = block % 2 === 0 ? indexInBlock : groupCount - 1 - indexInBlock
    const group = groups[groupIndex]

    group.teams.push({
      ...team,
      groupName: group.name,
      groupIndex,
      groupSeed: group.teams.length + 1,
    })
  })

  return groups
}

const createGroupMatches = (
  group: GroupPhaseGroup,
  stateMap: Map<string, MatchState>
): GroupStageMatch[][] => {
  if (group.teams.length < 2) {
    return []
  }

  const rotation: Array<GroupPhaseTeam | null> = [...group.teams]
  if (rotation.length % 2 !== 0) {
    rotation.push(null)
  }

  const roundCount = rotation.length - 1
  const matchesPerRound = rotation.length / 2
  const rounds: GroupStageMatch[][] = []

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex++) {
    const matches: GroupStageMatch[] = []

    for (let pairIndex = 0; pairIndex < matchesPerRound; pairIndex++) {
      const left = rotation[pairIndex]
      const right = rotation[rotation.length - 1 - pairIndex]

      if (!left || !right) {
        continue
      }

      const swapSides = (roundIndex + pairIndex) % 2 === 1
      const team1 = swapSides ? right : left
      const team2 = swapSides ? left : right
      const matchNumber = matches.length + 1
      const matchId = `GP-G${group.index + 1}-R${roundIndex + 1}-M${matchNumber}`
      const state = stateMap.get(matchId)

      matches.push({
        id: matchId,
        label: `${group.name} · Runde ${roundIndex + 1} · Match ${matchNumber}`,
        bracket: 'group',
        roundLabel: `${group.name} · Runde ${roundIndex + 1}`,
        roundOrder: roundIndex + 1,
        groupName: group.name,
        groupIndex: group.index,
        groupRound: roundIndex + 1,
        team1,
        team2,
        team1Score: state?.team1Score ?? 0,
        team2Score: state?.team2Score ?? 0,
        isLive: state?.isLive ?? false,
        isFinished: state?.isFinished ?? false,
        winnerId: state?.winnerId,
        mapName: state?.mapName,
      })
    }

    rounds.push(matches)
    const fixedTeam = rotation[0]
    const movingTeams = rotation.slice(1)
    movingTeams.unshift(movingTeams.pop() || null)
    rotation.splice(0, rotation.length, fixedTeam, ...movingTeams)
  }

  return rounds
}

const buildStandings = (group: GroupPhaseGroup, matches: GroupStageMatch[]): GroupStanding[] => {
  const stats = new Map<string, Omit<GroupStanding, 'rank' | 'qualified' | 'playoffSeed'>>()

  group.teams.forEach((team) => {
    stats.set(team.id, {
      team,
      played: 0,
      wins: 0,
      losses: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      scoreDiff: 0,
    })
  })

  matches.forEach((match) => {
    if (!match.isFinished || !match.winnerId || !match.team1 || !match.team2) {
      return
    }

    const team1Stats = stats.get(match.team1.id)
    const team2Stats = stats.get(match.team2.id)
    if (!team1Stats || !team2Stats) {
      return
    }

    team1Stats.played += 1
    team2Stats.played += 1
    team1Stats.scoreFor += match.team1Score
    team1Stats.scoreAgainst += match.team2Score
    team2Stats.scoreFor += match.team2Score
    team2Stats.scoreAgainst += match.team1Score
    team1Stats.scoreDiff = team1Stats.scoreFor - team1Stats.scoreAgainst
    team2Stats.scoreDiff = team2Stats.scoreFor - team2Stats.scoreAgainst

    if (match.winnerId === 'team1') {
      team1Stats.wins += 1
      team2Stats.losses += 1
    } else {
      team2Stats.wins += 1
      team1Stats.losses += 1
    }
  })

  return Array.from(stats.values())
    .sort((a, b) =>
      b.wins - a.wins ||
      a.losses - b.losses ||
      a.scoreAgainst - b.scoreAgainst ||
      b.scoreDiff - a.scoreDiff ||
      b.scoreFor - a.scoreFor ||
      a.team.position - b.team.position
    )
    .map((standing, index) => ({
      ...standing,
      rank: index + 1,
      qualified: false,
    }))
}

const selectFeaturedGroupMatches = (rounds: GroupStageRound[]): Set<string> => {
  const selectedMatchIds = new Set<string>()
  const usedTeamIds = new Set<string>()
  const groupCount = Math.max(
    1,
    ...rounds.flatMap((round) => round.matches.map((match) => match.groupIndex + 1))
  )
  const selectByGroup = groupCount === 5 && rounds.length !== 5
  const selectionBuckets = selectByGroup
    ? Array.from({ length: groupCount }, (_, groupIndex) =>
        rounds.flatMap((round) => round.matches).filter((match) => match.groupIndex === groupIndex)
      )
    : rounds.map((round) => round.matches)

  const selectBucket = (bucketIndex: number): boolean => {
    if (bucketIndex >= selectionBuckets.length) {
      return true
    }

    const candidates = [...selectionBuckets[bucketIndex]].sort((a, b) => {
      const aPriority = selectByGroup
        ? (a.groupRound - bucketIndex + rounds.length) % rounds.length
        : (a.groupIndex - bucketIndex + groupCount) % groupCount
      const bPriority = selectByGroup
        ? (b.groupRound - bucketIndex + rounds.length) % rounds.length
        : (b.groupIndex - bucketIndex + groupCount) % groupCount
      return aPriority - bPriority || a.id.localeCompare(b.id)
    })

    for (const match of candidates) {
      const team1Id = match.team1?.id
      const team2Id = match.team2?.id
      if (!team1Id || !team2Id || usedTeamIds.has(team1Id) || usedTeamIds.has(team2Id)) {
        continue
      }

      selectedMatchIds.add(match.id)
      usedTeamIds.add(team1Id)
      usedTeamIds.add(team2Id)

      if (selectBucket(bucketIndex + 1)) {
        return true
      }

      selectedMatchIds.delete(match.id)
      usedTeamIds.delete(team1Id)
      usedTeamIds.delete(team2Id)
    }

    return false
  }

  if (!selectBucket(0)) {
    selectedMatchIds.clear()
  }

  return selectedMatchIds
}

const compareCrossGroupStanding = (a: GroupStanding, b: GroupStanding) => {
  const aRate = a.played > 0 ? a.wins / a.played : 0
  const bRate = b.played > 0 ? b.wins / b.played : 0

  return (
    bRate - aRate ||
    b.wins - a.wins ||
    a.losses - b.losses ||
    a.scoreAgainst - b.scoreAgainst ||
    b.scoreDiff - a.scoreDiff ||
    b.scoreFor - a.scoreFor ||
    a.team.position - b.team.position
  )
}

export const buildGroupPhase = (
  inputTeams: BracketTeam[] = [],
  groupCount: number = 4,
  playoffTeamCount: number = PLAYOFF_TEAM_COUNT,
  teamLimit: number = MAX_TEAMS,
  stateMap: Map<string, MatchState> = new Map(),
  activeRound: number = 0,
  teamOrder: string[] = [],
  groupRoundCount?: number
): GroupPhaseResult => {
  const teams = normalizeGroupPhaseTeams(inputTeams, teamLimit, teamOrder)
  const safeGroupCount = clampGroupCount(groupCount, Math.max(teams.length, 1))
  const groups = distributeTeams(teams, safeGroupCount)
  const generatedGroupRounds = groups.map((group) => createGroupMatches(group, stateMap))
  const generatedRoundCount = Math.max(0, ...generatedGroupRounds.map((rounds) => rounds.length))
  const totalRounds = groupRoundCount === undefined || groupRoundCount <= 0
    ? generatedRoundCount
    : Math.min(Math.max(Math.floor(groupRoundCount), 1), generatedRoundCount)
  const groupRounds = generatedGroupRounds.map((rounds) => rounds.slice(0, totalRounds))
  const rounds: GroupStageRound[] = Array.from({ length: totalRounds }, (_, roundIndex) => {
    const matches = groupRounds.flatMap((groupRound) => groupRound[roundIndex] || [])

    return {
      round: roundIndex + 1,
      label: `Gruppenrunde ${roundIndex + 1}`,
      matches,
      isActive: activeRound === roundIndex + 1 && matches.some((match) => match.isLive),
      isComplete: matches.length > 0 && matches.every((match) => match.isFinished),
    }
  })
  const featuredMatchIds = selectFeaturedGroupMatches(rounds)
  rounds.forEach((round) => {
    round.matches = round.matches.map((match) => ({
      ...match,
      isFeatured: featuredMatchIds.has(match.id),
    }))
  })

  groups.forEach((group, groupIndex) => {
    group.standings = buildStandings(group, groupRounds[groupIndex].flat())
  })

  const safePlayoffCount = Math.min(
    Math.max(Math.floor(playoffTeamCount), 2),
    PLAYOFF_TEAM_COUNT,
    teams.length || PLAYOFF_TEAM_COUNT
  )
  const selectedStandings: GroupStanding[] = []
  const maxGroupDepth = Math.max(0, ...groups.map((group) => group.standings.length))

  for (let depth = 0; depth < maxGroupDepth && selectedStandings.length < safePlayoffCount; depth++) {
    const candidates = groups
      .map((group) => group.standings[depth])
      .filter((standing): standing is GroupStanding => Boolean(standing))
      .sort(compareCrossGroupStanding)

    for (const standing of candidates) {
      selectedStandings.push(standing)
      if (selectedStandings.length >= safePlayoffCount) {
        break
      }
    }
  }

  const selectedTeams = selectedStandings.map((standing, index) => ({
    ...standing.team,
    playoffSeed: index + 1,
    position: index + 1,
  }))
  const advancingTeams = hasStartedEliminationMatches(stateMap)
    ? selectedTeams
    : avoidSameGroupFirstRoundMatchups(selectedTeams)
  const playoffSeedByTeamId = new Map<string, number>()
  advancingTeams.forEach((team, index) => playoffSeedByTeamId.set(team.id, index + 1))

  groups.forEach((group) => {
    group.teams = group.teams.map((team) => ({
      ...team,
      playoffSeed: playoffSeedByTeamId.get(team.id),
    }))
    group.standings = group.standings.map((standing) => {
      const playoffSeed = playoffSeedByTeamId.get(standing.team.id)
      return {
        ...standing,
        team: {
          ...standing.team,
          playoffSeed,
        },
        qualified: Boolean(playoffSeed),
        playoffSeed,
      }
    })
  })

  const allMatches = rounds.flatMap((round) => round.matches)

  return {
    groups,
    rounds,
    advancingTeams,
    playoffTeamCount: PLAYOFF_TEAM_COUNT,
    activeRound,
    totalRounds,
    isComplete: allMatches.length > 0 && allMatches.every((match) => match.isFinished),
  }
}
