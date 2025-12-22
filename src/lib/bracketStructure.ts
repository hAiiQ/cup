import type { MatchState } from '@/lib/matchState'
import { MAX_TEAMS, getDefaultTeamName, normalizeTeamName } from '@/lib/teamDefaults'

export interface BracketTeam {
  id: string
  name: string
  position: number
}

export interface ParticipantSourceSeed {
  kind: 'seed'
  position: number
}

export interface ParticipantSourceMatch {
  kind: 'winner'
  matchId: string
}

export interface ParticipantSourceBye {
  kind: 'bye'
  label?: string
}

export type ParticipantSource = ParticipantSourceSeed | ParticipantSourceMatch | ParticipantSourceBye

export type BracketType = 'winner' | 'grand'

export interface MatchBlueprint {
  id: string
  label: string
  bracket: BracketType
  roundLabel: string
  roundOrder: number
  sources: [ParticipantSource, ParticipantSource]
}

export interface BracketMatch {
  id: string
  label: string
  bracket: BracketType
  roundLabel: string
  roundOrder: number
  team1?: BracketTeam
  team2?: BracketTeam
  team1Score: number
  team2Score: number
  isLive: boolean
  isFinished: boolean
  winnerId?: string
  autoAdvance?: boolean
}

export interface BracketNodeLayout {
  id: string
  column: number
  row: number
}

export type BracketConnection = [string, string]

export interface BuildBracketResult {
  matches: BracketMatch[]
  layout: BracketNodeLayout[]
  connections: BracketConnection[]
  slotCount: number
}

const MIN_BRACKET_TEAMS = 2
const FINAL_MATCH_ID = 'GF'

const virtualTeam = (label: string, seedPosition?: number): BracketTeam => ({
  id: `virtual-${label.replace(/\s+/g, '-').toLowerCase()}${seedPosition ? `-${seedPosition}` : ''}`,
  name: label,
  position: seedPosition ?? 0
})

const placeholderTeam = (position: number): BracketTeam => ({
  id: `placeholder-${position}`,
  name: getDefaultTeamName(position),
  position
})

const isPlaceholderTeam = (team?: BracketTeam) => Boolean(team?.id?.startsWith('placeholder'))
const isFreilosTeam = (team?: BracketTeam) => team?.name === 'Freilos'

const clampSlotCount = (value: number): number => {
  const limited = Math.min(Math.max(value, MIN_BRACKET_TEAMS), MAX_TEAMS)
  let power = 1
  while (power < limited) {
    power *= 2
  }
  return Math.min(power, MAX_TEAMS)
}

const createSeedOrder = (slotCount: number): number[] => {
  if (slotCount === 1) {
    return [1]
  }

  const previous = createSeedOrder(slotCount / 2)
  const result: number[] = []

  previous.forEach((seed) => {
    result.push(seed)
    result.push(slotCount + 1 - seed)
  })

  return result
}

const getRoundLabel = (teamsRemaining: number): string => {
  if (teamsRemaining === 2) {
    return 'Grand Final'
  }
  if (teamsRemaining === 4) {
    return 'Semifinal'
  }
  if (teamsRemaining === 8) {
    return 'Quarterfinal'
  }
  return `Round of ${teamsRemaining}`
}

const createBlueprint = (slotCount: number) => {
  const rounds: MatchBlueprint[][] = []
  const totalRounds = Math.log2(slotCount)
  const seedOrder = createSeedOrder(slotCount)

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const matchesInRound = slotCount / Math.pow(2, roundIndex + 1)
    const teamsRemaining = matchesInRound * 2
    const roundLabel = getRoundLabel(teamsRemaining)
    const isFinal = roundIndex === totalRounds - 1
    const roundMatches: MatchBlueprint[] = []

    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
      const id = isFinal ? FINAL_MATCH_ID : `R${roundIndex + 1}-M${matchIndex + 1}`
      const label = isFinal ? 'Grand Final' : `${roundLabel} Match ${matchIndex + 1}`
      let sources: [ParticipantSource, ParticipantSource]

      if (roundIndex === 0) {
        const seedA = seedOrder[matchIndex * 2]
        const seedB = seedOrder[matchIndex * 2 + 1]
        sources = [
          { kind: 'seed', position: seedA },
          { kind: 'seed', position: seedB }
        ]
      } else {
        const previousRound = rounds[roundIndex - 1]
        const sourceA = previousRound[matchIndex * 2]
        const sourceB = previousRound[matchIndex * 2 + 1]
        sources = [
          { kind: 'winner', matchId: sourceA.id },
          { kind: 'winner', matchId: sourceB.id }
        ]
      }

      roundMatches.push({
        id,
        label,
        bracket: isFinal ? 'grand' : 'winner',
        roundLabel,
        roundOrder: roundIndex + 1,
        sources
      })
    }

    rounds.push(roundMatches)
  }

  return {
    rounds,
    matches: rounds.flat()
  }
}

const buildLayout = (rounds: MatchBlueprint[][]) => {
  const layout: BracketNodeLayout[] = []
  const connections: BracketConnection[] = []
  const rowPositions = new Map<string, number>()

  rounds.forEach((round, roundIndex) => {
    round.forEach((match, matchIndex) => {
      if (roundIndex === 0) {
        rowPositions.set(match.id, matchIndex + 1)
      } else {
        const sourceRows = match.sources
          .filter((source): source is ParticipantSourceMatch => source.kind === 'winner')
          .map((source) => rowPositions.get(source.matchId))
          .filter((value): value is number => typeof value === 'number')

        if (sourceRows.length > 0) {
          const average = sourceRows.reduce((sum, value) => sum + value, 0) / sourceRows.length
          rowPositions.set(match.id, average)
        } else {
          rowPositions.set(match.id, matchIndex + 1)
        }
      }

      layout.push({
        id: match.id,
        column: roundIndex + 1,
        row: rowPositions.get(match.id) ?? roundIndex + 1
      })

      match.sources.forEach((source) => {
        if (source.kind === 'winner') {
          connections.push([source.matchId, match.id])
        }
      })
    })
  })

  return { layout, connections }
}

export const ensureTeamSlots = (teams: BracketTeam[] = [], slotCount: number = MAX_TEAMS): BracketTeam[] => {
  const limit = Math.min(Math.max(slotCount, 1), MAX_TEAMS)

  const normalized = teams
    .filter(Boolean)
    .map((team, index) => {
      const position = typeof team.position === 'number' && team.position > 0 ? team.position : index + 1
      const safePosition = Math.min(Math.max(position, 1), limit)

      return {
        ...team,
        position: safePosition,
        name: normalizeTeamName(safePosition, team.name)
      }
    })
    .filter((team) => team.position >= 1 && team.position <= limit)

  const byPosition = new Map<number, BracketTeam>()
  normalized.forEach((team) => {
    if (!byPosition.has(team.position)) {
      byPosition.set(team.position, team)
    }
  })

  for (let position = 1; position <= limit; position++) {
    if (!byPosition.has(position)) {
      byPosition.set(position, placeholderTeam(position))
    }
  }

  return Array.from(byPosition.values()).sort((a, b) => a.position - b.position)
}

export const buildBracketMatches = (
  inputTeams: BracketTeam[] = [],
  stateMap: Map<string, MatchState> = new Map()
): BuildBracketResult => {
  const sanitizedTeams = inputTeams
    .filter(Boolean)
    .map((team, index) => {
      const position = typeof team.position === 'number' && team.position > 0 ? team.position : index + 1
      return {
        ...team,
        position,
        name: normalizeTeamName(position, team.name)
      }
    })
    .sort((a, b) => a.position - b.position)

  const realTeams = sanitizedTeams.filter((team) => !isPlaceholderTeam(team))
  const slotCount = clampSlotCount(realTeams.length || MIN_BRACKET_TEAMS)

  if (realTeams.length > MAX_TEAMS) {
    console.warn(`Warning: only the first ${MAX_TEAMS} teams are used for the bracket.`)
  }

  const teams = ensureTeamSlots(sanitizedTeams, slotCount)
  const positionMap = new Map<number, BracketTeam>()
  teams.forEach((team) => positionMap.set(team.position, team))

  const { rounds, matches: blueprints } = createBlueprint(slotCount)
  const { layout, connections } = buildLayout(rounds)

  const builtMatches: BracketMatch[] = []
  const matchLookup = new Map<string, BracketMatch>()

  const resolveSource = (source: ParticipantSource): BracketTeam => {
    if (source.kind === 'seed') {
      const team = positionMap.get(source.position)
      if (!team || isPlaceholderTeam(team)) {
        return virtualTeam('Freilos', source.position)
      }
      return team
    }

    if (source.kind === 'bye') {
      return virtualTeam(source.label || 'Freilos')
    }

    const referencedMatch = matchLookup.get(source.matchId)
    if (!referencedMatch) {
      return virtualTeam('TBD')
    }

    const referencedState = stateMap.get(source.matchId)
    const resolvedWinnerId = referencedState?.winnerId || referencedMatch.winnerId

    if (resolvedWinnerId === 'team1') {
      return referencedMatch.team1 || virtualTeam('TBD')
    }

    if (resolvedWinnerId === 'team2') {
      return referencedMatch.team2 || virtualTeam('TBD')
    }

    return virtualTeam('TBD')
  }

  blueprints.forEach((blueprint) => {
    const team1 = resolveSource(blueprint.sources[0])
    const team2 = resolveSource(blueprint.sources[1])
    const state = stateMap.get(blueprint.id)

    const match: BracketMatch = {
      id: blueprint.id,
      label: blueprint.label,
      bracket: blueprint.bracket,
      roundLabel: blueprint.roundLabel,
      roundOrder: blueprint.roundOrder,
      team1,
      team2,
      team1Score: state?.team1Score ?? 0,
      team2Score: state?.team2Score ?? 0,
      isLive: state?.isLive ?? false,
      isFinished: state?.isFinished ?? false,
      winnerId: state?.winnerId
    }

    let autoAdvanceWinner: 'team1' | 'team2' | undefined
    if (!state?.winnerId) {
      if (isFreilosTeam(team1) && !isFreilosTeam(team2)) {
        autoAdvanceWinner = 'team2'
      } else if (isFreilosTeam(team2) && !isFreilosTeam(team1)) {
        autoAdvanceWinner = 'team1'
      }
    }

    if (autoAdvanceWinner) {
      const winningScore = blueprint.id === FINAL_MATCH_ID ? 3 : 2
      match.autoAdvance = true
      match.isFinished = true
      match.winnerId = autoAdvanceWinner
      match.team1Score = autoAdvanceWinner === 'team1' ? winningScore : 0
      match.team2Score = autoAdvanceWinner === 'team2' ? winningScore : 0
    }

    matchLookup.set(blueprint.id, match)
    builtMatches.push(match)
  })

  return {
    matches: builtMatches,
    layout,
    connections,
    slotCount
  }
}
