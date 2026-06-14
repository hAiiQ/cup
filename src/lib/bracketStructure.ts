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
  kind: 'winner' | 'loser'
  matchId: string
}

export interface ParticipantSourceBye {
  kind: 'bye'
  label?: string
}

export type ParticipantSource = ParticipantSourceSeed | ParticipantSourceMatch | ParticipantSourceBye

export type BracketType = 'group' | 'winner' | 'loser' | 'grand'

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
  mapName?: string
  autoAdvance?: boolean
}

export interface BracketNodeLayout {
  id: string
  column: number
  row: number
}

export type BracketConnection = [string, string]

export type BracketMode = 'single' | 'double'

export interface BracketBuildResult {
  matches: BracketMatch[]
  layout: BracketNodeLayout[]
  connections: BracketConnection[]
  slotCount: number
  requestedSlotCount: number
  mode: BracketMode
}

export interface BracketBuildOptions {
  mode?: BracketMode
  slotCount?: number
  autoAdvanceByes?: boolean
}

const MIN_BRACKET_TEAMS = 2
const GRAND_FINAL_ID = 'GF'
const WINNER_FINAL_ID = 'WB-F'
const LOSER_FINAL_ID = 'LB-F'

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

const clampRequestedSlotCount = (value: number): number => {
  const numeric = Math.floor(value)
  return Math.min(Math.max(numeric, MIN_BRACKET_TEAMS), MAX_TEAMS)
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

const createWinnerRounds = (slotCount: number): MatchBlueprint[][] => {
  const rounds: MatchBlueprint[][] = []
  const totalRounds = Math.log2(slotCount)
  const seedOrder = createSeedOrder(slotCount)

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const matchesInRound = slotCount / Math.pow(2, roundIndex + 1)
    const isFinal = roundIndex === totalRounds - 1
    const roundMatches: MatchBlueprint[] = []

    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
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

      const id = isFinal ? WINNER_FINAL_ID : `WB-R${roundIndex + 1}-M${matchIndex + 1}`
      const roundLabel = isFinal ? 'Winner Final' : `Winner Round ${roundIndex + 1}`
      const label = isFinal ? 'Winner Final' : `${roundLabel} Match ${matchIndex + 1}`

      roundMatches.push({
        id,
        label,
        bracket: 'winner',
        roundLabel,
        roundOrder: roundIndex + 1,
        sources
      })
    }

    rounds.push(roundMatches)
  }

  return rounds
}

const createLoserRounds = (winnerRounds: MatchBlueprint[][]): MatchBlueprint[][] => {
  const rounds: MatchBlueprint[][] = []
  const totalWinnerRounds = winnerRounds.length

  if (totalWinnerRounds === 1) {
    rounds.push([
      {
        id: LOSER_FINAL_ID,
        label: 'Loser Final',
        bracket: 'loser',
        roundLabel: 'Loser Final',
        roundOrder: 1,
        sources: [
          { kind: 'loser', matchId: winnerRounds[0][0].id },
          { kind: 'bye', label: 'Freilos' }
        ]
      }
    ])
    return rounds
  }

  let loserRoundCounter = 0
  let previousMajor: MatchBlueprint[] | null = null

  for (let stage = 1; stage <= totalWinnerRounds - 1; stage++) {
    loserRoundCounter += 1
    const eliminationMatches: MatchBlueprint[] = []

    if (stage === 1) {
      const firstRound = winnerRounds[0]
      for (let index = 0; index < firstRound.length; index += 2) {
        const matchA = firstRound[index]
        const matchB = firstRound[index + 1]
        eliminationMatches.push({
          id: `LB-R${loserRoundCounter}-M${eliminationMatches.length + 1}`,
          label: `Loser Round ${loserRoundCounter} Match ${eliminationMatches.length + 1}`,
          bracket: 'loser',
          roundLabel: `Loser Round ${loserRoundCounter}`,
          roundOrder: loserRoundCounter,
          sources: [
            { kind: 'loser', matchId: matchA.id },
            { kind: 'loser', matchId: matchB.id }
          ]
        })
      }
    } else if (previousMajor) {
      for (let index = 0; index < previousMajor.length; index += 2) {
        const matchA = previousMajor[index]
        const matchB = previousMajor[index + 1]
        eliminationMatches.push({
          id: `LB-R${loserRoundCounter}-M${eliminationMatches.length + 1}`,
          label: `Loser Round ${loserRoundCounter} Match ${eliminationMatches.length + 1}`,
          bracket: 'loser',
          roundLabel: `Loser Round ${loserRoundCounter}`,
          roundOrder: loserRoundCounter,
          sources: [
            { kind: 'winner', matchId: matchA.id },
            { kind: 'winner', matchId: matchB.id }
          ]
        })
      }
    }

    rounds.push(eliminationMatches)

    loserRoundCounter += 1
    const droppingRound = winnerRounds[stage]
    const majorMatches: MatchBlueprint[] = []

    eliminationMatches.forEach((elimMatch, index) => {
      const droppingMatch = droppingRound[index]
      const isFinalStage = stage === totalWinnerRounds - 1
      const id = isFinalStage ? LOSER_FINAL_ID : `LB-R${loserRoundCounter}-M${index + 1}`
      majorMatches.push({
        id,
        label: isFinalStage ? 'Loser Final' : `Loser Round ${loserRoundCounter} Match ${index + 1}`,
        bracket: 'loser',
        roundLabel: isFinalStage ? 'Loser Final' : `Loser Round ${loserRoundCounter}`,
        roundOrder: loserRoundCounter,
        sources: [
          { kind: 'winner', matchId: elimMatch.id },
          { kind: 'loser', matchId: droppingMatch.id }
        ]
      })
    })

    rounds.push(majorMatches)
    previousMajor = majorMatches
  }

  return rounds
}

const createSingleEliminationRounds = (slotCount: number): MatchBlueprint[][] => {
  const rounds: MatchBlueprint[][] = []
  const totalRounds = Math.log2(slotCount)
  const seedOrder = createSeedOrder(slotCount)

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const matchesInRound = slotCount / Math.pow(2, roundIndex + 1)
    const isFinal = roundIndex === totalRounds - 1
    const roundMatches: MatchBlueprint[] = []

    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
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

      const id = isFinal ? GRAND_FINAL_ID : `SE-R${roundIndex + 1}-M${matchIndex + 1}`
      const roundLabel = isFinal ? 'Grand Final' : `Winner Round ${roundIndex + 1}`
      const label = isFinal ? 'Grand Final' : `${roundLabel} Match ${matchIndex + 1}`

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

  return rounds
}

const buildConnections = (
  winnerRounds: MatchBlueprint[][],
  loserRounds: MatchBlueprint[][],
  grandFinal: MatchBlueprint
): BracketConnection[] => {
  const connections: BracketConnection[] = []

  const addConnections = (match: MatchBlueprint) => {
    match.sources.forEach((source) => {
      if (source.kind === 'winner' || source.kind === 'loser') {
        connections.push([source.matchId, match.id])
      }
    })
  }

  winnerRounds.forEach((round) => round.forEach(addConnections))
  loserRounds.forEach((round) => round.forEach(addConnections))
  addConnections(grandFinal)

  return connections
}

const buildSingleConnections = (rounds: MatchBlueprint[][]): BracketConnection[] => {
  const connections: BracketConnection[] = []

  rounds.forEach((round) => {
    round.forEach((match) => {
      match.sources.forEach((source) => {
        if (source.kind === 'winner') {
          connections.push([source.matchId, match.id])
        }
      })
    })
  })

  return connections
}

const buildLayouts = (
  winnerRounds: MatchBlueprint[][],
  loserRounds: MatchBlueprint[][],
  grandFinal: MatchBlueprint
): BracketNodeLayout[] => {
  const layout: BracketNodeLayout[] = []
  const relativeRowMap = new Map<string, number>()
  const actualRowMap = new Map<string, number>()

  const assignRounds = (
    rounds: MatchBlueprint[][],
    columnStart: number,
    rowOffset: number
  ) => {
    rounds.forEach((round, roundIndex) => {
      round.forEach((match, matchIndex) => {
        const sourceRows = match.sources
          .map((source) => relativeRowMap.get(source.matchId))
          .filter((value): value is number => typeof value === 'number')

        let relativeRow: number
        if (sourceRows.length > 0) {
          relativeRow = sourceRows.reduce((sum, value) => sum + value, 0) / sourceRows.length
        } else {
          relativeRow = matchIndex + 1
        }

        const actualRow = relativeRow + rowOffset
        const column = columnStart + roundIndex

        layout.push({ id: match.id, column, row: actualRow })
        relativeRowMap.set(match.id, relativeRow)
        actualRowMap.set(match.id, actualRow)
      })
    })
  }

  assignRounds(winnerRounds, 1, 0)
  const winnerRows = winnerRounds.flat().map((match) => actualRowMap.get(match.id) || 0)
  const winnerMaxRow = winnerRows.length > 0 ? Math.max(...winnerRows) : 0

  const loserRowOffset = winnerMaxRow + 1
  const loserColumnStart = 2
  assignRounds(loserRounds, loserColumnStart, loserRowOffset)

  const grandFinalColumn = loserColumnStart + loserRounds.length + 1
  const grandFinalSourceRows = grandFinal.sources
    .map((source) => actualRowMap.get(source.matchId))
    .filter((value): value is number => typeof value === 'number')

  const grandFinalRow = grandFinalSourceRows.length > 0
    ? grandFinalSourceRows.reduce((sum, value) => sum + value, 0) / grandFinalSourceRows.length
    : Math.max(1, winnerMaxRow / 2)

  layout.push({ id: grandFinal.id, column: grandFinalColumn, row: grandFinalRow })

  return layout
}

const buildSingleLayout = (rounds: MatchBlueprint[][]): BracketNodeLayout[] => {
  const layout: BracketNodeLayout[] = []
  const rowPositions = new Map<string, number>()

  rounds.forEach((round, roundIndex) => {
    round.forEach((match, matchIndex) => {
      const sourceRows = match.sources
        .filter((source): source is ParticipantSourceMatch => source.kind === 'winner')
        .map((source) => rowPositions.get(source.matchId))
        .filter((value): value is number => typeof value === 'number')

      const row = sourceRows.length > 0
        ? sourceRows.reduce((sum, value) => sum + value, 0) / sourceRows.length
        : matchIndex + 1

      layout.push({
        id: match.id,
        column: roundIndex + 1,
        row
      })

      rowPositions.set(match.id, row)
    })
  })

  return layout
}

const prepareTeams = (inputTeams: BracketTeam[], desiredSlotCount?: number) => {
  const sanitized = inputTeams
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

  const realTeams = sanitized.filter((team) => !isPlaceholderTeam(team))
    const requestedSlotCount = typeof desiredSlotCount === 'number' && desiredSlotCount >= MIN_BRACKET_TEAMS
      ? clampRequestedSlotCount(desiredSlotCount)
      : clampRequestedSlotCount(realTeams.length || MIN_BRACKET_TEAMS)
    const slotCount = clampSlotCount(requestedSlotCount)
  const teamsWithPlaceholders = ensureTeamSlots(sanitized, slotCount)

  const teams = teamsWithPlaceholders.map((team) => {
    if (team.id.startsWith('placeholder')) {
      return virtualTeam('Freilos', team.position)
    }
    return team
  })

    return { teams, slotCount, requestedSlotCount }
}

const buildMatchesFromBlueprints = (
  blueprints: MatchBlueprint[],
  teams: BracketTeam[],
  stateMap: Map<string, MatchState>,
  autoAdvanceByes: boolean = true
): BracketMatch[] => {
  const positionMap = new Map<number, BracketTeam>()
  teams.forEach((team) => positionMap.set(team.position, team))

  const builtMatches: BracketMatch[] = []
  const matchLookup = new Map<string, BracketMatch>()

  const resolveSource = (source: ParticipantSource): BracketTeam => {
    if (source.kind === 'seed') {
      return positionMap.get(source.position) || placeholderTeam(source.position)
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

    if (!resolvedWinnerId) {
      return virtualTeam('TBD')
    }

    if (source.kind === 'winner') {
      if (resolvedWinnerId === 'team1') {
        return referencedMatch.team1 || virtualTeam('TBD')
      }
      if (resolvedWinnerId === 'team2') {
        return referencedMatch.team2 || virtualTeam('TBD')
      }
      return virtualTeam('TBD')
    }

    if (resolvedWinnerId === 'team1') {
      return referencedMatch.team2 || virtualTeam('TBD')
    }
    if (resolvedWinnerId === 'team2') {
      return referencedMatch.team1 || virtualTeam('TBD')
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
      winnerId: state?.winnerId,
      mapName: state?.mapName,
    }

    let autoAdvanceWinner: 'team1' | 'team2' | undefined
    if (!state?.winnerId) {
      if (isFreilosTeam(team1) && !isFreilosTeam(team2)) {
        autoAdvanceWinner = 'team2'
      } else if (isFreilosTeam(team2) && !isFreilosTeam(team1)) {
        autoAdvanceWinner = 'team1'
      }
    }

    if (autoAdvanceByes && autoAdvanceWinner) {
      const winningScore = blueprint.id === GRAND_FINAL_ID ? 3 : 2
      match.autoAdvance = true
      match.isFinished = true
      match.winnerId = autoAdvanceWinner
      match.team1Score = autoAdvanceWinner === 'team1' ? winningScore : 0
      match.team2Score = autoAdvanceWinner === 'team2' ? winningScore : 0
    }

    matchLookup.set(blueprint.id, match)
    builtMatches.push(match)
  })

  return builtMatches
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

const buildDoubleEliminationBracket = (
  teams: BracketTeam[],
  stateMap: Map<string, MatchState>,
  slotCount: number,
  requestedSlotCount: number,
  autoAdvanceByes: boolean
): BracketBuildResult => {
  const winnerRounds = createWinnerRounds(slotCount)
  const loserRounds = createLoserRounds(winnerRounds)
  const winnerFinalRound = winnerRounds[winnerRounds.length - 1]
  const loserFinalRound = loserRounds[loserRounds.length - 1]
  const grandFinal: MatchBlueprint = {
    id: GRAND_FINAL_ID,
    label: 'Grand Final',
    bracket: 'grand',
    roundLabel: 'Grand Final',
    roundOrder: winnerRounds.length + loserRounds.length + 1,
    sources: [
      { kind: 'winner', matchId: winnerFinalRound[0].id },
      { kind: 'winner', matchId: loserFinalRound[0].id }
    ]
  }

  const blueprints = [
    ...winnerRounds.flat(),
    ...loserRounds.flat(),
    grandFinal
  ]

  const matches = buildMatchesFromBlueprints(blueprints, teams, stateMap, autoAdvanceByes)
  const layout = buildLayouts(winnerRounds, loserRounds, grandFinal)
  const connections = buildConnections(winnerRounds, loserRounds, grandFinal)

  return {
    matches,
    layout,
    connections,
    slotCount,
    requestedSlotCount,
    mode: 'double'
  }
}

const buildSingleEliminationBracket = (
  teams: BracketTeam[],
  stateMap: Map<string, MatchState>,
  slotCount: number,
  requestedSlotCount: number,
  autoAdvanceByes: boolean
): BracketBuildResult => {
  const rounds = createSingleEliminationRounds(slotCount)
  const blueprints = rounds.flat()
  const matches = buildMatchesFromBlueprints(blueprints, teams, stateMap, autoAdvanceByes)
  const layout = buildSingleLayout(rounds)
  const connections = buildSingleConnections(rounds)

  return {
    matches,
    layout,
    connections,
    slotCount,
    requestedSlotCount,
    mode: 'single'
  }
}

export const buildBracketMatches = (
  inputTeams: BracketTeam[] = [],
  stateMap: Map<string, MatchState> = new Map(),
  options: BracketBuildOptions = {}
): BracketBuildResult => {
  const desiredMode: BracketMode = options.mode === 'single' ? 'single' : 'double'
  const autoAdvanceByes = options.autoAdvanceByes ?? true
  const { teams, slotCount, requestedSlotCount } = prepareTeams(inputTeams, options.slotCount)

  if (desiredMode === 'single') {
    return buildSingleEliminationBracket(teams, stateMap, slotCount, requestedSlotCount, autoAdvanceByes)
  }

  return buildDoubleEliminationBracket(teams, stateMap, slotCount, requestedSlotCount, autoAdvanceByes)
}
