export const DEFAULT_TEAM_NAMES = [
  'Team Alpha',
  'Team Beta',
  'Team Gamma',
  'Team Delta',
  'Team Epsilon',
  'Team Zeta',
  'Team Eta',
  'Team Theta',
  'Team Hotel',
  'Team Indigo'
]

export const LEGACY_TEAM_NAMES = [
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

export const MAX_TEAMS = DEFAULT_TEAM_NAMES.length

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

  if (position >= 1 && position <= LEGACY_TEAM_NAMES.length) {
    const legacyName = LEGACY_TEAM_NAMES[position - 1]
    if (currentName === legacyName) {
      return expectedName
    }
  }

  return currentName
}
