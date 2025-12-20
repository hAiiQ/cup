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

export type BracketType = 'winner' | 'loser' | 'grand'

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

export interface RoundGroup {
  title: string
  description: string
  matchIds: string[]
}

const MATCH_BLUEPRINTS: MatchBlueprint[] = [
  // Winner Bracket Round 1 (all 10 teams play)
  {
    id: 'WB-R1-1',
    label: 'Round 1 Match 1',
    bracket: 'winner',
    roundLabel: 'Winner Round 1',
    roundOrder: 1,
    sources: [
      { kind: 'seed', position: 1 },
      { kind: 'seed', position: 10 }
    ]
  },
  {
    id: 'WB-R1-2',
    label: 'Round 1 Match 2',
    bracket: 'winner',
    roundLabel: 'Winner Round 1',
    roundOrder: 1,
    sources: [
      { kind: 'seed', position: 2 },
      { kind: 'seed', position: 9 }
    ]
  },
  {
    id: 'WB-R1-3',
    label: 'Round 1 Match 3',
    bracket: 'winner',
    roundLabel: 'Winner Round 1',
    roundOrder: 1,
    sources: [
      { kind: 'seed', position: 3 },
      { kind: 'seed', position: 8 }
    ]
  },
  {
    id: 'WB-R1-4',
    label: 'Round 1 Match 4',
    bracket: 'winner',
    roundLabel: 'Winner Round 1',
    roundOrder: 1,
    sources: [
      { kind: 'seed', position: 4 },
      { kind: 'seed', position: 7 }
    ]
  },
  {
    id: 'WB-R1-5',
    label: 'Round 1 Match 5',
    bracket: 'winner',
    roundLabel: 'Winner Round 1',
    roundOrder: 1,
    sources: [
      { kind: 'seed', position: 5 },
      { kind: 'seed', position: 6 }
    ]
  },
  // Winner Bracket Round 2 with one auto-advance
  {
    id: 'WB-R2-1',
    label: 'Round 2 Match 1',
    bracket: 'winner',
    roundLabel: 'Winner Round 2',
    roundOrder: 2,
    sources: [
      { kind: 'winner', matchId: 'WB-R1-1' },
      { kind: 'winner', matchId: 'WB-R1-2' }
    ]
  },
  {
    id: 'WB-R2-2',
    label: 'Round 2 Match 2',
    bracket: 'winner',
    roundLabel: 'Winner Round 2',
    roundOrder: 2,
    sources: [
      { kind: 'winner', matchId: 'WB-R1-3' },
      { kind: 'winner', matchId: 'WB-R1-4' }
    ]
  },
  {
    id: 'WB-R2-3',
    label: 'Round 2 Freilos',
    bracket: 'winner',
    roundLabel: 'Winner Round 2',
    roundOrder: 2,
    sources: [
      { kind: 'winner', matchId: 'WB-R1-5' },
      { kind: 'bye', label: 'Freilos' }
    ]
  },
  // Winner Bracket Semifinal and Final
  {
    id: 'WB-R3-1',
    label: 'Winner Semifinal',
    bracket: 'winner',
    roundLabel: 'Winner Semifinal',
    roundOrder: 3,
    sources: [
      { kind: 'winner', matchId: 'WB-R2-1' },
      { kind: 'winner', matchId: 'WB-R2-3' }
    ]
  },
  {
    id: 'WB-F',
    label: 'Winner Final',
    bracket: 'winner',
    roundLabel: 'Winner Final',
    roundOrder: 4,
    sources: [
      { kind: 'winner', matchId: 'WB-R3-1' },
      { kind: 'winner', matchId: 'WB-R2-2' }
    ]
  },
  // Loser Bracket Round 1 (includes one auto advance)
  {
    id: 'LB-R1-1',
    label: 'Loser Round 1A',
    bracket: 'loser',
    roundLabel: 'Loser Round 1',
    roundOrder: 1,
    sources: [
      { kind: 'loser', matchId: 'WB-R1-1' },
      { kind: 'loser', matchId: 'WB-R1-2' }
    ]
  },
  {
    id: 'LB-R1-2',
    label: 'Loser Round 1B',
    bracket: 'loser',
    roundLabel: 'Loser Round 1',
    roundOrder: 1,
    sources: [
      { kind: 'loser', matchId: 'WB-R1-3' },
      { kind: 'loser', matchId: 'WB-R1-4' }
    ]
  },
  {
    id: 'LB-R1-3',
    label: 'Loser Round 1 Freilos',
    bracket: 'loser',
    roundLabel: 'Loser Round 1',
    roundOrder: 1,
    sources: [
      { kind: 'loser', matchId: 'WB-R1-5' },
      { kind: 'bye', label: 'Freilos' }
    ]
  },
  // Loser Bracket Round 2
  {
    id: 'LB-R2-1',
    label: 'Loser Round 2A',
    bracket: 'loser',
    roundLabel: 'Loser Round 2',
    roundOrder: 2,
    sources: [
      { kind: 'winner', matchId: 'LB-R1-1' },
      { kind: 'loser', matchId: 'WB-R2-1' }
    ]
  },
  {
    id: 'LB-R2-2',
    label: 'Loser Round 2B',
    bracket: 'loser',
    roundLabel: 'Loser Round 2',
    roundOrder: 2,
    sources: [
      { kind: 'winner', matchId: 'LB-R1-2' },
      { kind: 'loser', matchId: 'WB-R2-2' }
    ]
  },
  {
    id: 'LB-R2-3',
    label: 'Loser Round 2C',
    bracket: 'loser',
    roundLabel: 'Loser Round 2',
    roundOrder: 2,
    sources: [
      { kind: 'winner', matchId: 'LB-R1-3' },
      { kind: 'loser', matchId: 'WB-R2-3' }
    ]
  },
  // Loser Bracket Round 3
  {
    id: 'LB-R3-1',
    label: 'Loser Round 3A',
    bracket: 'loser',
    roundLabel: 'Loser Round 3',
    roundOrder: 3,
    sources: [
      { kind: 'winner', matchId: 'LB-R2-1' },
      { kind: 'winner', matchId: 'LB-R2-2' }
    ]
  },
  {
    id: 'LB-R3-2',
    label: 'Loser Round 3B',
    bracket: 'loser',
    roundLabel: 'Loser Round 3',
    roundOrder: 3,
    sources: [
      { kind: 'winner', matchId: 'LB-R2-3' },
      { kind: 'loser', matchId: 'WB-R3-1' }
    ]
  },
  // Loser bracket closing rounds
  {
    id: 'LB-R4',
    label: 'Loser Semifinal',
    bracket: 'loser',
    roundLabel: 'Loser Semifinal',
    roundOrder: 4,
    sources: [
      { kind: 'winner', matchId: 'LB-R3-1' },
      { kind: 'winner', matchId: 'LB-R3-2' }
    ]
  },
  {
    id: 'LB-F',
    label: 'Loser Final',
    bracket: 'loser',
    roundLabel: 'Loser Final',
    roundOrder: 5,
    sources: [
      { kind: 'winner', matchId: 'LB-R4' },
      { kind: 'loser', matchId: 'WB-F' }
    ]
  },
  {
    id: 'GF',
    label: 'Grand Final',
    bracket: 'grand',
    roundLabel: 'Grand Final',
    roundOrder: 6,
    sources: [
      { kind: 'winner', matchId: 'WB-F' },
      { kind: 'winner', matchId: 'LB-F' }
    ]
  }
]

export const WINNER_ROUND_GROUPS: RoundGroup[] = [
  {
    title: 'Winner Round 1',
    description: 'Alle zehn Teams starten direkt in die Action',
    matchIds: ['WB-R1-1', 'WB-R1-2', 'WB-R1-3', 'WB-R1-4', 'WB-R1-5']
  },
  {
    title: 'Winner Round 2',
    description: 'Die Sieger spielen um die Halbfinal-Slots, ein Match hat Freilos',
    matchIds: ['WB-R2-1', 'WB-R2-2', 'WB-R2-3']
  },
  {
    title: 'Winner Semifinal',
    description: 'Die letzten drei Teams kämpfen um das Ticket ins Finale',
    matchIds: ['WB-R3-1']
  },
  {
    title: 'Winner Final',
    description: 'Der Winner-Bracket-Sieger wartet auf den Herausforderer',
    matchIds: ['WB-F']
  },
  {
    title: 'Grand Final',
    description: 'Winner Bracket Champion vs. Loser Bracket Survivor',
    matchIds: ['GF']
  }
]

export const LOSER_ROUND_GROUPS: RoundGroup[] = [
  {
    title: 'Loser Round 1',
    description: 'Verlierer der ersten Winner-Runde kämpfen ums Überleben',
    matchIds: ['LB-R1-1', 'LB-R1-2', 'LB-R1-3']
  },
  {
    title: 'Loser Round 2',
    description: 'Neue Gegner durch die Verlierer der Winner Round 2',
    matchIds: ['LB-R2-1', 'LB-R2-2', 'LB-R2-3']
  },
  {
    title: 'Loser Round 3',
    description: 'Kurz vor Schluss: Wer bleibt im Rennen?',
    matchIds: ['LB-R3-1', 'LB-R3-2']
  },
  {
    title: 'Loser Semifinal',
    description: 'Die zwei heißesten Teams spielen um den Finalplatz',
    matchIds: ['LB-R4']
  },
  {
    title: 'Loser Final',
    description: 'Der Herausforderer fürs Grand Final wird bestimmt',
    matchIds: ['LB-F']
  }
]

export const WINNER_BRACKET_LAYOUT: BracketNodeLayout[] = [
  { id: 'WB-R1-1', column: 1, row: 1 },
  { id: 'WB-R1-2', column: 1, row: 2 },
  { id: 'WB-R1-3', column: 1, row: 3 },
  { id: 'WB-R1-4', column: 1, row: 4 },
  { id: 'WB-R1-5', column: 1, row: 5 },
  { id: 'WB-R2-1', column: 2, row: 1.5 },
  { id: 'WB-R2-2', column: 2, row: 3.5 },
  { id: 'WB-R2-3', column: 2, row: 4.5 },
  { id: 'WB-R3-1', column: 3, row: 2.5 },
  { id: 'WB-F', column: 4, row: 3.5 }
]

export const LOSER_BRACKET_LAYOUT: BracketNodeLayout[] = [
  { id: 'LB-R1-1', column: 1, row: 1 },
  { id: 'LB-R1-2', column: 1, row: 2 },
  { id: 'LB-R1-3', column: 1, row: 3 },
  { id: 'LB-R2-1', column: 2, row: 1.5 },
  { id: 'LB-R2-2', column: 2, row: 2.5 },
  { id: 'LB-R2-3', column: 2, row: 3.5 },
  { id: 'LB-R3-1', column: 3, row: 2 },
  { id: 'LB-R3-2', column: 3, row: 3.5 },
  { id: 'LB-R4', column: 4, row: 3.25 },
  { id: 'LB-F', column: 6, row: 2.5 }
]

export const GRAND_FINAL_LAYOUT: BracketNodeLayout[] = [
  { id: 'WB-F', column: 1, row: 1 },
  { id: 'LB-F', column: 2, row: 2.5 },
  { id: 'GF', column: 3, row: 2 }
]

export const WINNER_BRACKET_CONNECTIONS: BracketConnection[] = [
  ['WB-R1-1', 'WB-R2-1'],
  ['WB-R1-2', 'WB-R2-1'],
  ['WB-R1-3', 'WB-R2-2'],
  ['WB-R1-4', 'WB-R2-2'],
  ['WB-R1-5', 'WB-R2-3'],
  ['WB-R2-1', 'WB-R3-1'],
  ['WB-R2-2', 'WB-R3-1'],
  ['WB-R3-1', 'WB-F'],
  ['WB-R2-3', 'WB-F']
]

export const LOSER_BRACKET_CONNECTIONS: BracketConnection[] = [
  ['LB-R1-1', 'LB-R2-1'],
  ['LB-R1-2', 'LB-R2-2'],
  ['LB-R1-3', 'LB-R2-3'],
  ['LB-R2-1', 'LB-R3-1'],
  ['LB-R2-2', 'LB-R3-1'],
  ['LB-R2-3', 'LB-R3-2'],
  ['LB-R3-1', 'LB-R4'],
  ['LB-R3-2', 'LB-R4'],
  ['LB-R4', 'LB-F']
]

export const GRAND_FINAL_CONNECTIONS: BracketConnection[] = [
  ['WB-F', 'GF'],
  ['LB-F', 'GF']
]
const LOSER_ROW_OFFSET = 6
const LOSER_COLUMN_OFFSET = 1

const COMBINED_WINNER_LAYOUT: BracketNodeLayout[] = [
  { id: 'WB-R1-1', column: 1, row: 1 },
  { id: 'WB-R1-2', column: 1, row: 2 },
  { id: 'WB-R1-3', column: 1, row: 3 },
  { id: 'WB-R1-4', column: 1, row: 4 },
  { id: 'WB-R1-5', column: 1, row: 5 },
  { id: 'WB-R2-1', column: 2, row: 1.5 },
  { id: 'WB-R2-2', column: 2, row: 3.5 },
  { id: 'WB-R2-3', column: 2, row: 5 },
  { id: 'WB-R3-1', column: 3, row: 2.5 },
  { id: 'WB-F', column: 4, row: 3 }
]

const COMBINED_LOSER_LAYOUT: BracketNodeLayout[] = [
  { id: 'LB-R1-1', column: 1 + LOSER_COLUMN_OFFSET, row: LOSER_ROW_OFFSET + 1 },
  { id: 'LB-R1-2', column: 1 + LOSER_COLUMN_OFFSET, row: LOSER_ROW_OFFSET + 2 },
  { id: 'LB-R1-3', column: 1 + LOSER_COLUMN_OFFSET, row: LOSER_ROW_OFFSET + 3 },
  { id: 'LB-R2-1', column: 2 + LOSER_COLUMN_OFFSET, row: LOSER_ROW_OFFSET + 1.5 },
  { id: 'LB-R2-2', column: 2 + LOSER_COLUMN_OFFSET, row: LOSER_ROW_OFFSET + 2.5 },
  { id: 'LB-R2-3', column: 2 + LOSER_COLUMN_OFFSET, row: LOSER_ROW_OFFSET + 3.5 },
  { id: 'LB-R3-1', column: 3 + LOSER_COLUMN_OFFSET, row: LOSER_ROW_OFFSET + 2 },
  { id: 'LB-R3-2', column: 3 + LOSER_COLUMN_OFFSET, row: LOSER_ROW_OFFSET + 3.5 },
  { id: 'LB-R4', column: 4 + LOSER_COLUMN_OFFSET, row: LOSER_ROW_OFFSET + 3.25 },
  { id: 'LB-F', column: 5 + LOSER_COLUMN_OFFSET, row: LOSER_ROW_OFFSET + 2.5 }
]

export const COMBINED_BRACKET_LAYOUT: BracketNodeLayout[] = [
  ...COMBINED_WINNER_LAYOUT,
  ...COMBINED_LOSER_LAYOUT,
  { id: 'GF', column: 7, row: LOSER_ROW_OFFSET + 1.75 }
]

const WINNER_TO_LOSER_CONNECTIONS: BracketConnection[] = [
  ['WB-R1-1', 'LB-R1-1'],
  ['WB-R1-2', 'LB-R1-1'],
  ['WB-R1-3', 'LB-R1-2'],
  ['WB-R1-4', 'LB-R1-2'],
  ['WB-R1-5', 'LB-R1-3'],
  ['WB-R2-1', 'LB-R2-1'],
  ['WB-R2-2', 'LB-R2-2'],
  ['WB-R2-3', 'LB-R2-3'],
  ['WB-R3-1', 'LB-R3-2'],
  ['WB-F', 'LB-F']
]

export const COMBINED_BRACKET_CONNECTIONS: BracketConnection[] = [
  ...WINNER_BRACKET_CONNECTIONS,
  ...LOSER_BRACKET_CONNECTIONS,
  ...GRAND_FINAL_CONNECTIONS,
  ...WINNER_TO_LOSER_CONNECTIONS
]

const virtualTeam = (label: string): BracketTeam => ({
  id: `virtual-${label.replace(/\s+/g, '-').toLowerCase()}`,
  name: label === 'Freilos' ? 'Freilos' : 'TBD',
  position: 0
})

const placeholderTeam = (position: number): BracketTeam => ({
  id: `placeholder-${position}`,
  name: getDefaultTeamName(position),
  position
})

export const ensureTenTeams = (teams: BracketTeam[] = []): BracketTeam[] => {
  const normalized = [...teams]
    .filter(Boolean)
    .map((team, index) => {
      const position = typeof team.position === 'number' && team.position > 0
        ? team.position
        : index + 1

      return {
        ...team,
        position,
        name: normalizeTeamName(position, team.name)
      }
    })

  const seenPositions = new Set(normalized.map(team => team.position))

  for (let position = 1; position <= MAX_TEAMS; position++) {
    if (!seenPositions.has(position)) {
      normalized.push(placeholderTeam(position))
    }
  }

  return normalized
    .sort((a, b) => a.position - b.position)
    .slice(0, MAX_TEAMS)
}

export const buildBracketMatches = (
  inputTeams: BracketTeam[] = [],
  stateMap: Map<string, MatchState> = new Map()
): BracketMatch[] => {
  const teams = ensureTenTeams(inputTeams)
  const positionMap = new Map<number, BracketTeam>()
  teams.forEach(team => positionMap.set(team.position, team))

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
    } else {
      if (resolvedWinnerId === 'team1') {
        return referencedMatch.team2 || virtualTeam('TBD')
      }
      if (resolvedWinnerId === 'team2') {
        return referencedMatch.team1 || virtualTeam('TBD')
      }
    }

    return virtualTeam('TBD')
  }

  MATCH_BLUEPRINTS.forEach(blueprint => {
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
      const [sourceA, sourceB] = blueprint.sources
      if (sourceA.kind === 'bye' && sourceB.kind !== 'bye') {
        autoAdvanceWinner = 'team2'
      } else if (sourceB.kind === 'bye' && sourceA.kind !== 'bye') {
        autoAdvanceWinner = 'team1'
      }
    }

    if (autoAdvanceWinner) {
      match.autoAdvance = true
      match.isFinished = true
      match.winnerId = autoAdvanceWinner
      match.team1Score = autoAdvanceWinner === 'team1' ? 2 : 0
      match.team2Score = autoAdvanceWinner === 'team2' ? 2 : 0
    }

    matchLookup.set(blueprint.id, match)
    builtMatches.push(match)
  })

  return builtMatches
}
