// Simple in-memory state for live match status and scores
// This will persist during server runtime

interface MatchState {
  isLive: boolean
  team1Score: number
  team2Score: number
  isFinished: boolean
  winnerId?: string
  lastUpdated: number
}

// In-memory storage for match states
const matchStates: Map<string, MatchState> = new Map()

export function getMatchState(matchId: string): MatchState {
  return matchStates.get(matchId) || {
    isLive: false,
    team1Score: 0,
    team2Score: 0,
    isFinished: false,
    lastUpdated: Date.now()
  }
}

export function setMatchState(matchId: string, state: Partial<MatchState>) {
  const currentState = getMatchState(matchId)
  const newState = {
    ...currentState,
    ...state,
    lastUpdated: Date.now()
  }
  matchStates.set(matchId, newState)
  console.log(`📝 Match ${matchId} state updated:`, newState)
  return newState
}

export function getAllMatchStates(): Map<string, MatchState> {
  return matchStates
}

export function setMatchLive(matchId: string, isLive: boolean) {
  return setMatchState(matchId, { isLive })
}

export function setMatchScore(matchId: string, team1Score: number, team2Score: number) {
  const isFinished = team1Score > 0 || team2Score > 0
  return setMatchState(matchId, { 
    team1Score, 
    team2Score, 
    isFinished,
    isLive: !isFinished // Stop live when finished
  })
}
