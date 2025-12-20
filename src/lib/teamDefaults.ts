export const DEFAULT_TEAM_NAMES = [
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
