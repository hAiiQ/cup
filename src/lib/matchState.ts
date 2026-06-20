// Simple in-memory state for live match status and scores
// This will persist during server runtime

export interface MatchState {
  isLive: boolean
  team1Score: number
  team2Score: number
  isFinished: boolean
  winnerId?: string
  mapName?: string
  lastUpdated: number
  source?: 'database' | 'memory'
}

// In-memory storage for match states
const matchStates: Map<string, MatchState> = new Map()

export function determineWinnerSlot(_matchId: string, team1Score: number, team2Score: number): 'team1' | 'team2' | undefined {
  if (team1Score > team2Score) {
    return 'team1'
  }

  if (team2Score > team1Score) {
    return 'team2'
  }

  return undefined
}

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

export function setMatchLive(matchId: string, isLive: boolean, mapName?: string) {
  return setMatchState(matchId, {
    isLive,
    ...(isLive ? { isFinished: false } : {}),
    ...(mapName ? { mapName } : {}),
  })
}

export function setMatchScore(matchId: string, team1Score: number, team2Score: number) {
  const winnerId = determineWinnerSlot(matchId, team1Score, team2Score)
  const isFinished = Boolean(winnerId)
  
  console.log(`🏆 Match ${matchId}: ${team1Score}-${team2Score}, Finished: ${isFinished}, Winner: ${winnerId}`)
  
  return setMatchState(matchId, { 
    team1Score, 
    team2Score, 
    isFinished,
    winnerId,
    isLive: !isFinished // Stop live when finished
  })
}

export function clearMatchStates() {
  matchStates.clear()
  console.log('🧹 Cleared all in-memory match states')
}

export function clearMatchState(matchId: string) {
  matchStates.delete(matchId)
  console.log(`🧹 Cleared in-memory state for match ${matchId}`)
}
