import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Auto-start tournament if teams exist but no matches
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Auto-starting tournament bracket...')

    // Check if matches already exist
    const existingMatches = await prisma.match.findMany()
    if (existingMatches.length > 0) {
      console.log('⚠️ Tournament already started')
      return NextResponse.json({ 
        success: true, 
        message: 'Tournament already started',
        matches: existingMatches.length
      })
    }

    // Get all teams
    const teams = await prisma.team.findMany({
      orderBy: { position: 'asc' }
    })

    if (teams.length < 8) {
      console.log(`⚠️ Need 8 teams, found ${teams.length}`)
      return NextResponse.json({ 
        success: false, 
        message: `Need 8 teams to start tournament, found ${teams.length}`
      })
    }

    // Use first 8 teams
    const tournamentTeams = teams.slice(0, 8)
    console.log('📋 Tournament teams:', tournamentTeams.map(t => t.name))

    // Create all matches for double elimination bracket
    const matches = []

    // WINNER BRACKET - Quarter Finals (Round 1)
    const quarterFinals = [
      { team1: tournamentTeams[0], team2: tournamentTeams[1] }, // 1 vs 2
      { team1: tournamentTeams[2], team2: tournamentTeams[3] }, // 3 vs 4  
      { team1: tournamentTeams[4], team2: tournamentTeams[5] }, // 5 vs 6
      { team1: tournamentTeams[6], team2: tournamentTeams[7] }, // 7 vs 8
    ]

    for (let i = 0; i < quarterFinals.length; i++) {
      matches.push({
        id: `wb-qf-${i + 1}`,
        round: 1,
        bracket: 'winner',
        team1Id: quarterFinals[i].team1.id,
        team2Id: quarterFinals[i].team2.id,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      })
    }

    // WINNER BRACKET - Semi Finals (Round 2)
    matches.push(
      {
        id: 'wb-sf-1',
        round: 2,
        bracket: 'winner',
        team1Id: null, // Winner of wb-qf-1
        team2Id: null, // Winner of wb-qf-2
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      },
      {
        id: 'wb-sf-2',
        round: 2,
        bracket: 'winner',
        team1Id: null, // Winner of wb-qf-3
        team2Id: null, // Winner of wb-qf-4
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
      team1Id: null, // Winner of wb-sf-1
      team2Id: null, // Winner of wb-sf-2
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      isLive: false
    })

    // LOSER BRACKET
    // Loser Bracket Round 1 (Losers from QF)
    matches.push(
      {
        id: 'lb-r1-1',
        round: 1,
        bracket: 'loser',
        team1Id: null, // Loser of wb-qf-1
        team2Id: null, // Loser of wb-qf-2
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      },
      {
        id: 'lb-r1-2',
        round: 1,
        bracket: 'loser',
        team1Id: null, // Loser of wb-qf-3
        team2Id: null, // Loser of wb-qf-4
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      }
    )

    // Loser Bracket Round 2
    matches.push(
      {
        id: 'lb-r2-1',
        round: 2,
        bracket: 'loser',
        team1Id: null, // Winner of lb-r1-1
        team2Id: null, // Loser of wb-sf-1
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      },
      {
        id: 'lb-r2-2',
        round: 2,
        bracket: 'loser',
        team1Id: null, // Winner of lb-r1-2
        team2Id: null, // Loser of wb-sf-2
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        isLive: false
      }
    )

    // Loser Bracket Round 3
    matches.push({
      id: 'lb-r3',
      round: 3,
      bracket: 'loser',
      team1Id: null, // Winner of lb-r2-1
      team2Id: null, // Winner of lb-r2-2
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      isLive: false
    })

    // Loser Bracket Final
    matches.push({
      id: 'lb-final',
      round: 4,
      bracket: 'loser',
      team1Id: null, // Winner of lb-r3
      team2Id: null, // Loser of wb-final
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      isLive: false
    })

    // Grand Final
    matches.push({
      id: 'grand-final',
      round: 5,
      bracket: 'grand',
      team1Id: null, // Winner of wb-final
      team2Id: null, // Winner of lb-final
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      isLive: false
    })

    // Create all matches in database
    console.log(`📝 Creating ${matches.length} matches...`)
    
    for (const match of matches) {
      await prisma.match.create({
        data: {
          id: match.id,
          round: match.round,
          bracket: match.bracket,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
          team1Score: match.team1Score,
          team2Score: match.team2Score,
          isFinished: match.isFinished,
          isLive: match.isLive
        }
      })
    }

    console.log('✅ Tournament bracket created successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Tournament bracket created successfully',
      matches: matches.length,
      teams: tournamentTeams.length
    })

  } catch (error) {
    console.error('Auto-start tournament error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
