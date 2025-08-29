import { NextResponse } from 'next/server'
import { getAllMatchStates } from '@/lib/matchState'

export async function GET() {
  try {
    console.log('🔄 Fetching live states for admin bracket...')
    
    // Get current match states from admin controls
    const matchStates = getAllMatchStates()
    console.log(`📊 Found ${matchStates.size} admin-controlled match states`)
    
    // Convert Map to array for JSON response
    const states = Array.from(matchStates.entries()).map(([matchId, state]) => ({
      matchId,
      ...state
    }))
    
    return NextResponse.json({
      states,
      count: states.length
    })
    
  } catch (error) {
    console.error('Error fetching live states:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live states' },
      { status: 500 }
    )
  }
}
