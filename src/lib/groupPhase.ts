import type { BracketTeam } from '@/lib/bracketStructure'
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

export interface GroupPhaseGroup {
  index: number
  name: string
  teams: GroupPhaseTeam[]
}

export interface GroupPhaseResult {
  groups: GroupPhaseGroup[]
  advancingTeams: GroupPhaseTeam[]
  playoffTeamCount: number
}

const GROUP_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export const clampGroupCount = (value?: number | null, teamSlots: number = MAX_TEAMS): number => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  const fallback = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 4
  const maxBySlots = Math.max(MIN_GROUP_COUNT, Math.min(Math.floor(teamSlots) || MAX_TEAMS, MAX_GROUP_COUNT))

  return Math.min(Math.max(Math.floor(fallback), MIN_GROUP_COUNT), maxBySlots)
}

export const groupNameForIndex = (index: number): string => {
  return `Gruppe ${GROUP_LABELS[index] || index + 1}`
}

export const normalizeGroupPhaseTeams = (teams: BracketTeam[], limit: number = MAX_TEAMS): BracketTeam[] => {
  return teams
    .filter(Boolean)
    .map((team, index) => {
      const position = typeof team.position === 'number' && team.position > 0 ? team.position : index + 1
      return {
        ...team,
        position,
        name: normalizeTeamName(position, team.name),
      }
    })
    .filter((team) => team.position >= 1 && team.position <= limit)
    .sort((a, b) => a.position - b.position)
}

export const buildGroupPhase = (
  inputTeams: BracketTeam[] = [],
  groupCount: number = 4,
  playoffTeamCount: number = PLAYOFF_TEAM_COUNT,
  teamLimit: number = MAX_TEAMS
): GroupPhaseResult => {
  const teams = normalizeGroupPhaseTeams(inputTeams, teamLimit)
  const safeGroupCount = clampGroupCount(groupCount, Math.max(teams.length, 1))
  const groups: GroupPhaseGroup[] = Array.from({ length: safeGroupCount }, (_, index) => ({
    index,
    name: groupNameForIndex(index),
    teams: [],
  }))

  teams.forEach((team, index) => {
    const block = Math.floor(index / safeGroupCount)
    const indexInBlock = index % safeGroupCount
    const groupIndex = block % 2 === 0 ? indexInBlock : safeGroupCount - 1 - indexInBlock
    const group = groups[groupIndex]

    group.teams.push({
      ...team,
      groupName: group.name,
      groupIndex,
      groupSeed: group.teams.length + 1,
    })
  })

  const safePlayoffCount = Math.min(Math.max(Math.floor(playoffTeamCount), 2), PLAYOFF_TEAM_COUNT, teams.length || PLAYOFF_TEAM_COUNT)
  const advancingTeams: GroupPhaseTeam[] = []
  let depth = 0

  while (advancingTeams.length < safePlayoffCount) {
    let addedInDepth = false

    for (const group of groups) {
      const team = group.teams[depth]
      if (team) {
        advancingTeams.push({
          ...team,
          playoffSeed: advancingTeams.length + 1,
          position: advancingTeams.length + 1,
        })
        addedInDepth = true
      }

      if (advancingTeams.length >= safePlayoffCount) {
        break
      }
    }

    if (!addedInDepth) {
      break
    }

    depth += 1
  }

  const playoffSeedByTeamId = new Map(advancingTeams.map((team) => [team.id, team.playoffSeed]))
  const groupsWithPlayoffSeeds = groups.map((group) => ({
    ...group,
    teams: group.teams.map((team) => ({
      ...team,
      playoffSeed: playoffSeedByTeamId.get(team.id),
    })),
  }))

  return {
    groups: groupsWithPlayoffSeeds,
    advancingTeams,
    playoffTeamCount: PLAYOFF_TEAM_COUNT,
  }
}
