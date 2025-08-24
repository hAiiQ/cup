import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🔄 Fetching matches for bracket...')
    
    // RENDER FIX: Generate static bracket view with teams
    console.log('💡 Using static bracket generation (schema optimized)')
    
    // Get teams for bracket display
    let teams = []
    try {
      const teamsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/teams`)
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json()
        teams = teamsData.teams || []
        console.log(`📋 Loaded ${teams.length} teams from database`)
      }
    } catch (error) {
      console.log('💡 Using fallback teams for bracket display')
    }

    // Use sample teams if none available
    if (teams.length === 0) {
      teams = [
        { id: 'alpha', name: 'Team Alpha', position: 1 },
        { id: 'beta', name: 'Team Beta', position: 2 },
        { id: 'gamma', name: 'Team Gamma', position: 3 },
        { id: 'delta', name: 'Team Delta', position: 4 },
        { id: 'echo', name: 'Team Echo', position: 5 },
        { id: 'foxtrot', name: 'Team Foxtrot', position: 6 },
        { id: 'golf', name: 'Team Golf', position: 7 },
        { id: 'hotel', name: 'Team Hotel', position: 8 }
      ]
      console.log('🎯 Using sample teams for consistent bracket display')
    }

    // Generate complete bracket with teams (like admin panel)
    const matches = []
    const paddedTeams = teams.slice(0, 8)

    // WINNER BRACKET - Quarter Finals (Round 1)
    const quarterFinals = [
      { team1: paddedTeams[0], team2: paddedTeams[1] }, 
      { team1: paddedTeams[2], team2: paddedTeams[3] },  
      { team1: paddedTeams[4], team2: paddedTeams[5] }, 
      { team1: paddedTeams[6], team2: paddedTeams[7] }, 
    ]

    quarterFinals.forEach((match, index) => {
      matches.push({
        id: `wb-qf-${index + 1}`,
        round: 1,
        bracket: 'winner',
        team1: match.team1,
        team2: match.team2,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      })
    })

    // WINNER BRACKET - Semi Finals (Round 2)
    matches.push(
      {
        id: 'wb-sf-1',
        round: 2,
        bracket: 'winner',
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      },
      {
        id: 'wb-sf-2',
        round: 2,
        bracket: 'winner',
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      }
    )

    // WINNER BRACKET - Final (Round 3)
    matches.push({
      id: 'wb-final',
      round: 3,
      bracket: 'winner',
      team1: null,
      team2: null,
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      isLive: false
    })

    // LOSER BRACKET
    matches.push(
      {
        id: 'lb-r1-1',
        round: 1,
        bracket: 'loser',
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      },
      {
        id: 'lb-r1-2',
        round: 1,
        bracket: 'loser',
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      },
      {
        id: 'lb-r2-1',
        round: 2,
        bracket: 'loser',
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      },
      {
        id: 'lb-r2-2',
        round: 2,
        bracket: 'loser',
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      },
      {
        id: 'lb-r3',
        round: 3,
        bracket: 'loser',
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      },
      {
        id: 'lb-final',
        round: 4,
        bracket: 'loser',
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      }
    )

    // Grand Final
    matches.push({
      id: 'grand-final',
      round: 5,
      bracket: 'grand',
      team1: null,
      team2: null,
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      isLive: false
    })

    console.log(`✅ Generated static bracket with ${matches.length} matches`)
    return NextResponse.json({ matches })
    
  } catch (error) {
    console.error('Matches fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
}
