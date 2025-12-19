import type { MatchState } from '@/lib/matchState'

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

export type ParticipantSource = ParticipantSourceSeed | ParticipantSourceMatch

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
}

export interface RoundGroup {
  title: string
  description: string
  matchIds: string[]
}

const DEFAULT_TEAM_NAMES = [
  'Team Alpha',
  'Team Beta',
  'Team Gamma',
  'Team Delta',
  'Team Echo',
  'Team Foxtrot',
  'Team Golf',
  'Team Hotel',
  'Team Indigo',
  'Team Jade'
]

const MATCH_BLUEPRINTS: MatchBlueprint[] = [
  {
    id: 'WB-P1',
    label: 'Play-In A',
    bracket: 'winner',
    roundLabel: 'Play-In',
    roundOrder: 0,
    sources: [
      { kind: 'seed', position: 7 },
      { kind: 'seed', position: 10 }
    ]
  },
  {
    id: 'WB-P2',
    label: 'Play-In B',
    bracket: 'winner',
    roundLabel: 'Play-In',
    roundOrder: 0,
    sources: [
      { kind: 'seed', position: 8 },
      { kind: 'seed', position: 9 }
    ]
  },
  {
    id: 'WB-Q1',
    label: 'Quarterfinal 1',
    bracket: 'winner',
    roundLabel: 'Quarterfinals',
    roundOrder: 1,
    sources: [
      { kind: 'seed', position: 1 },
      { kind: 'winner', matchId: 'WB-P2' }
    ]
  },
  {
    id: 'WB-Q2',
    label: 'Quarterfinal 2',
    bracket: 'winner',
    roundLabel: 'Quarterfinals',
    roundOrder: 1,
    sources: [
      { kind: 'seed', position: 4 },
      { kind: 'seed', position: 5 }
    ]
  },
  {
    id: 'WB-Q3',
    label: 'Quarterfinal 3',
    bracket: 'winner',
    roundLabel: 'Quarterfinals',
    roundOrder: 1,
    sources: [
      { kind: 'seed', position: 3 },
      { kind: 'seed', position: 6 }
    ]
  },
  {
    id: 'WB-Q4',
    label: 'Quarterfinal 4',
    bracket: 'winner',
    roundLabel: 'Quarterfinals',
    roundOrder: 1,
    sources: [
      { kind: 'seed', position: 2 },
      { kind: 'winner', matchId: 'WB-P1' }
    ]
  },
  {
    id: 'WB-S1',
    label: 'Semifinal 1',
    bracket: 'winner',
    roundLabel: 'Semifinals',
    roundOrder: 2,
    sources: [
      { kind: 'winner', matchId: 'WB-Q1' },
      { kind: 'winner', matchId: 'WB-Q2' }
    ]
  },
  {
    id: 'WB-S2',
    label: 'Semifinal 2',
    bracket: 'winner',
    roundLabel: 'Semifinals',
    roundOrder: 2,
    sources: [
      { kind: 'winner', matchId: 'WB-Q3' },
      { kind: 'winner', matchId: 'WB-Q4' }
    ]
  },
  {
    id: 'WB-F',
    label: 'Winner Final',
    bracket: 'winner',
    roundLabel: 'Winner Final',
    roundOrder: 3,
    sources: [
      { kind: 'winner', matchId: 'WB-S1' },
      { kind: 'winner', matchId: 'WB-S2' }
    ]
  },
  {
    id: 'LB-1-1',
    label: 'Loser R1 Match 1',
    bracket: 'loser',
    roundLabel: 'Loser Round 1',
    roundOrder: 1,
    sources: [
      { kind: 'loser', matchId: 'WB-P1' },
      { kind: 'loser', matchId: 'WB-Q1' }
    ]
  },
  {
    id: 'LB-1-2',
    label: 'Loser R1 Match 2',
    bracket: 'loser',
    roundLabel: 'Loser Round 1',
    roundOrder: 1,
    sources: [
      { kind: 'loser', matchId: 'WB-P2' },
      { kind: 'loser', matchId: 'WB-Q2' }
    ]
  },
  {
    id: 'LB-2-1',
    label: 'Loser R2 Match 1',
    bracket: 'loser',
    roundLabel: 'Loser Round 2',
    roundOrder: 2,
    sources: [
      { kind: 'winner', matchId: 'LB-1-1' },
      { kind: 'loser', matchId: 'WB-Q3' }
    ]
  },
  {
    id: 'LB-2-2',
    label: 'Loser R2 Match 2',
    bracket: 'loser',
    roundLabel: 'Loser Round 2',
    roundOrder: 2,
    sources: [
      { kind: 'winner', matchId: 'LB-1-2' },
      { kind: 'loser', matchId: 'WB-Q4' }
    ]
  },
  {
    id: 'LB-3-1',
    label: 'Loser R3 Match 1',
    bracket: 'loser',
    roundLabel: 'Loser Round 3',
    roundOrder: 3,
    sources: [
      { kind: 'winner', matchId: 'LB-2-1' },
      { kind: 'loser', matchId: 'WB-S1' }
    ]
  },
  {
    id: 'LB-3-2',
    label: 'Loser R3 Match 2',
    bracket: 'loser',
    roundLabel: 'Loser Round 3',
    roundOrder: 3,
    sources: [
      { kind: 'winner', matchId: 'LB-2-2' },
      { kind: 'loser', matchId: 'WB-S2' }
    ]
  },
  {
    id: 'LB-4',
    label: 'Loser Semifinal',
    bracket: 'loser',
    roundLabel: 'Loser Semifinal',
    roundOrder: 4,
    sources: [
      { kind: 'winner', matchId: 'LB-3-1' },
      { kind: 'winner', matchId: 'LB-3-2' }
    ]
  },
  {
    id: 'LB-F',
    label: 'Loser Final',
    bracket: 'loser',
    roundLabel: 'Loser Final',
    roundOrder: 5,
    sources: [
      { kind: 'winner', matchId: 'LB-4' },
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
    title: 'Play-In',
    description: 'Seeds 7-10 fight for the last bracket spots',
    matchIds: ['WB-P1', 'WB-P2']
  },
  {
    title: 'Quarterfinals',
    description: 'Top 6 seeds join the winners from the play-ins',
    matchIds: ['WB-Q1', 'WB-Q2', 'WB-Q3', 'WB-Q4']
  },
  {
    title: 'Semifinals',
    description: 'Four teams remain in the winner bracket',
    matchIds: ['WB-S1', 'WB-S2']
  },
  {
    title: 'Winner Final',
    description: 'Winner bracket champion heads to the Grand Final',
    matchIds: ['WB-F']
  },
  {
    title: 'Grand Final',
    description: 'Winner bracket champ vs. loser bracket survivor',
    matchIds: ['GF']
  }
]

export const LOSER_ROUND_GROUPS: RoundGroup[] = [
  {
    title: 'Loser Round 1',
    description: 'Play-in losers and early drops get a second chance',
    matchIds: ['LB-1-1', 'LB-1-2']
  },
  {
    title: 'Loser Round 2',
    description: 'Quarterfinal losers join the lower bracket',
    matchIds: ['LB-2-1', 'LB-2-2']
  },
  {
    title: 'Loser Round 3',
    description: 'Winners face off against semifinal drops',
    matchIds: ['LB-3-1', 'LB-3-2']
  },
  {
    title: 'Loser Semifinal',
    description: 'Only one team survives to reach the final',
    matchIds: ['LB-4']
  },
  {
    title: 'Loser Final',
    description: 'Winner meets the loser of the Winner Final',
    matchIds: ['LB-F']
  }
]

const virtualTeam = (label: string): BracketTeam => ({
  id: `virtual-${label.replace(/\s+/g, '-').toLowerCase()}`,
  name: label,
  position: 0
})

const placeholderTeam = (position: number): BracketTeam => ({
  id: `placeholder-${position}`,
  name: DEFAULT_TEAM_NAMES[position - 1] || `Team ${position}`,
  position
})

export const ensureTenTeams = (teams: BracketTeam[] = []): BracketTeam[] => {
  const normalized = [...teams]
    .filter(Boolean)
    .map(team => ({ ...team }))

  const seenPositions = new Set(normalized.map(team => team.position))

  for (let position = 1; position <= 10; position++) {
    if (!seenPositions.has(position)) {
      normalized.push(placeholderTeam(position))
    }
  }

  return normalized
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
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

    const referencedMatch = matchLookup.get(source.matchId)
    if (!referencedMatch) {
      return virtualTeam(`${source.kind === 'winner' ? 'Winner' : 'Loser'} ${source.matchId}`)
    }

    const referencedState = stateMap.get(source.matchId)
    if (!referencedState || !referencedState.winnerId) {
      return virtualTeam(`${source.kind === 'winner' ? 'Winner' : 'Loser'} ${referencedMatch.label}`)
    }

    if (source.kind === 'winner') {
      if (referencedState.winnerId === 'team1') {
        return referencedMatch.team1 || virtualTeam('TBD')
      }
      if (referencedState.winnerId === 'team2') {
        return referencedMatch.team2 || virtualTeam('TBD')
      }
    } else {
      if (referencedState.winnerId === 'team1') {
        return referencedMatch.team2 || virtualTeam('TBD')
      }
      if (referencedState.winnerId === 'team2') {
        return referencedMatch.team1 || virtualTeam('TBD')
      }
    }

    return virtualTeam(`${source.kind === 'winner' ? 'Winner' : 'Loser'} ${referencedMatch.label}`)
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

    matchLookup.set(blueprint.id, match)
    builtMatches.push(match)
  })

  return builtMatches
}
