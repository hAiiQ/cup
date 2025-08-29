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
  // Determine if match is finished based on score rules
  // Grand Final: First to 3 points wins
  // All other matches: First to 2 points wins
  const isGrandFinal = matchId === 'GF'
  const winningScore = isGrandFinal ? 3 : 2
  
  const isFinished = team1Score >= winningScore || team2Score >= winningScore
  const winnerId = isFinished ? 
    (team1Score >= winningScore ? 'team1' : 'team2') : 
    undefined
  
  console.log(`🏆 Match ${matchId}: ${team1Score}-${team2Score}, Winning score: ${winningScore}, Finished: ${isFinished}, Winner: ${winnerId}`)
  
  return setMatchState(matchId, { 
    team1Score, 
    team2Score, 
    isFinished,
    winnerId,
    isLive: !isFinished // Stop live when finished
  })
}
