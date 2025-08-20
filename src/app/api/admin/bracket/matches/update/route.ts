import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // Check admin authentication
    const cookieStore = await cookies()
    const adminToken = cookieStore.get('admin_token')
    
    if (!adminToken) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    const { matchId, team1Score, team2Score } = await request.json()

    if (!matchId || team1Score === undefined || team2Score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find the match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team1: true,
        team2: true
      }
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Determine if match is finished and who won
    let winnerId = null
    let isFinished = false
    
    // Check if it's the Grand Final (BO5 - first to 3)
    const isGrandFinal = matchId === 'grand-final'
    
    if (isGrandFinal) {
      // BO5: First to 3 wins
      if (team1Score >= 3) {
        winnerId = match.team1Id
        isFinished = true
      } else if (team2Score >= 3) {
        winnerId = match.team2Id
        isFinished = true
      }
    } else {
      // BO3: First to 2 wins (all other matches including wb-final and lb-final)
      if (team1Score >= 2) {
        winnerId = match.team1Id
        isFinished = true
      } else if (team2Score >= 2) {
        winnerId = match.team2Id
        isFinished = true
      }
    }

    // Update match (without score fields for now until Prisma is updated)
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        team1Score: parseInt(team1Score.toString()),
        team2Score: parseInt(team2Score.toString()),
        winnerId,
        isFinished,
        playedAt: new Date()
      },
      include: {
        team1: true,
        team2: true,
        winner: true
      }
    })

    // Auto-advance winners to next rounds (only if match is finished)
    if (winnerId && isFinished) {
      console.log(`🎯 AUTO-ADVANCING: ${matchId} - Winner: ${winnerId}, Loser: ${winnerId === match.team1Id ? match.team2Id : match.team1Id}`)
      await advanceWinners(matchId, winnerId, winnerId === match.team1Id ? match.team2Id : match.team1Id)
    }

    return NextResponse.json({ 
      success: true, 
      match: { 
        ...updatedMatch, 
        team1Score, 
        team2Score 
      } 
    })

  } catch (error) {
    console.error('Error updating match:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to update next match
async function updateNextMatch(nextMatchId: string, teamId: string, position: 'team1' | 'team2') {
  try {
    console.log(`  📍 Moving team ${teamId} to ${nextMatchId} as ${position}`)
    const updateData: any = {}
    updateData[`${position}Id`] = teamId
    
    await prisma.match.update({
      where: { id: nextMatchId },
      data: updateData
    })
    console.log(`  ✅ Successfully moved team to ${nextMatchId}`)
  } catch (error) {
    console.error(`  ❌ Error updating next match ${nextMatchId}:`, error)
  }
}

// Helper function to advance winners to next rounds
async function advanceWinners(matchId: string, winnerId: string | null, loserId: string | null) {
  if (!winnerId) return

  // Winner bracket advancement
  if (matchId === 'wb-qf-1') {
    await updateNextMatch('wb-sf-1', winnerId, 'team1')
  } else if (matchId === 'wb-qf-2') {
    await updateNextMatch('wb-sf-1', winnerId, 'team2')
  } else if (matchId === 'wb-qf-3') {
    await updateNextMatch('wb-sf-2', winnerId, 'team1')
  } else if (matchId === 'wb-qf-4') {
    await updateNextMatch('wb-sf-2', winnerId, 'team2')
  } else if (matchId === 'wb-sf-1') {
    await updateNextMatch('wb-final', winnerId, 'team1')
  } else if (matchId === 'wb-sf-2') {
    await updateNextMatch('wb-final', winnerId, 'team2')
  } else if (matchId === 'wb-final') {
    await updateNextMatch('grand-final', winnerId, 'team1')
  } else if (matchId === 'lb-final') {
    await updateNextMatch('grand-final', winnerId, 'team2')
  }

  // Loser bracket advancement (losers from winner bracket)
  if (loserId) {
    if (matchId === 'wb-qf-1' || matchId === 'wb-qf-2') {
      // Losers from QF1/QF2 go to lb-r1-1
      if (matchId === 'wb-qf-1') {
        await updateNextMatch('lb-r1-1', loserId, 'team1')
      } else {
        await updateNextMatch('lb-r1-1', loserId, 'team2')
      }
    } else if (matchId === 'wb-qf-3' || matchId === 'wb-qf-4') {
      // Losers from QF3/QF4 go to lb-r1-2
      if (matchId === 'wb-qf-3') {
        await updateNextMatch('lb-r1-2', loserId, 'team1')
      } else {
        await updateNextMatch('lb-r1-2', loserId, 'team2')
      }
    } else if (matchId === 'wb-sf-1') {
      await updateNextMatch('lb-r2-2', loserId, 'team2')
    } else if (matchId === 'wb-sf-2') {
      await updateNextMatch('lb-r2-1', loserId, 'team2')
    } else if (matchId === 'wb-final') {
      await updateNextMatch('lb-final', loserId, 'team2')
    }
  }

  // Loser bracket internal advancement
  if (matchId === 'lb-r1-1') {
    await updateNextMatch('lb-r2-1', winnerId, 'team1')
  } else if (matchId === 'lb-r1-2') {
    await updateNextMatch('lb-r2-2', winnerId, 'team1')
  } else if (matchId === 'lb-r2-1') {
    await updateNextMatch('lb-r3', winnerId, 'team1')
  } else if (matchId === 'lb-r2-2') {
    await updateNextMatch('lb-r3', winnerId, 'team2')
  } else if (matchId === 'lb-r3') {
    await updateNextMatch('lb-final', winnerId, 'team1')
  }
}
