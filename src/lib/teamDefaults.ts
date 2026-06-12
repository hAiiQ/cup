const TEAM_SLOTS = 32

export const DEFAULT_TEAM_NAMES = Array.from({ length: TEAM_SLOTS }, (_, index) => `Team ${index + 1}`)

const LEGACY_TEAM_NAME_MAP: Record<number, string[]> = {
  1: ['Team Alpha'],
  2: ['Team Beta'],
  3: ['Team Gamma'],
  4: ['Team Delta'],
  5: ['Team Echo', 'Team Epsilon'],
  6: ['Team Foxtrot', 'Team Zeta'],
  7: ['Team Golf', 'Team Eta'],
  8: ['Team Theta'],
  9: ['Team Hotel'],
  10: ['Team Indigo', 'Team Jade']
}

export const MAX_TEAMS = TEAM_SLOTS

export const getDefaultTeamName = (position: number): string => {
  if (position >= 1 && position <= DEFAULT_TEAM_NAMES.length) {
    return DEFAULT_TEAM_NAMES[position - 1]
  }

  return `Team ${position}`
}

export const normalizeTeamName = (position: number, currentName?: string | null): string => {
  const expectedName = getDefaultTeamName(position)

  if (!currentName || currentName === expectedName) {
    return expectedName
  }

  const legacyNames = LEGACY_TEAM_NAME_MAP[position]
  if (legacyNames?.some(name => name === currentName)) {
    return expectedName
  }

  return currentName
}
