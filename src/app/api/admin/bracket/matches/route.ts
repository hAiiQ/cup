import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Helper function to verify admin
async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  
  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded || !decoded.userId.startsWith('admin_')) {
    return null
  }

  const adminId = decoded.userId.replace('admin_', '')
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  })

  return admin
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const matches = await prisma.match.findMany({
      include: {
        team1: true,
        team2: true,
        winner: true
      },
      orderBy: [
        { bracket: 'asc' },
        { round: 'asc' }
      ]
    })

    return NextResponse.json({ matches })

  } catch (error) {
    console.error('Admin bracket matches fetch error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
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
  }

  // Loser bracket advancement (losers from winner bracket)
  if (loserId) {
    if (matchId === 'wb-qf-1' || matchId === 'wb-qf-2') {
      await updateNextMatch('lb-r1-1', loserId, matchId === 'wb-qf-1' ? 'team1' : 'team2')
    } else if (matchId === 'wb-qf-3' || matchId === 'wb-qf-4') {
      await updateNextMatch('lb-r1-2', loserId, matchId === 'wb-qf-3' ? 'team1' : 'team2')
    } else if (matchId === 'wb-sf-1') {
      await updateNextMatch('lb-r3-1', loserId, 'team2')
    } else if (matchId === 'wb-sf-2') {
      await updateNextMatch('lb-r3-2', loserId, 'team2')
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
    await updateNextMatch('lb-r3-1', winnerId, 'team1')
  } else if (matchId === 'lb-r2-2') {
    await updateNextMatch('lb-r3-2', winnerId, 'team1')
  } else if (matchId === 'lb-r3-1') {
    await updateNextMatch('lb-r4', winnerId, 'team1')
  } else if (matchId === 'lb-r3-2') {
    await updateNextMatch('lb-r4', winnerId, 'team2')
  } else if (matchId === 'lb-r4') {
    await updateNextMatch('lb-final', winnerId, 'team1')
  } else if (matchId === 'lb-final') {
    await updateNextMatch('grand-final', winnerId, 'team2')
  }
}

async function updateNextMatch(nextMatchId: string, teamId: string, position: 'team1' | 'team2') {
  const nextMatch = await prisma.match.findFirst({
    where: { id: nextMatchId }
  })

  if (nextMatch) {
    // Update existing match
    await prisma.match.update({
      where: { id: nextMatchId },
      data: {
        [position === 'team1' ? 'team1Id' : 'team2Id']: teamId
      }
    })
  } else {
    // Create new match with the team
    const bracket = nextMatchId.includes('lb-') ? 'loser' : 
                   nextMatchId.includes('grand-') ? 'grand' : 'winner'
    
    let round = 1
    if (nextMatchId.includes('-sf-') || nextMatchId.includes('lb-r2')) round = 2
    else if (nextMatchId.includes('-final') || nextMatchId.includes('lb-r3')) round = 3
    else if (nextMatchId.includes('lb-r4')) round = 4
    else if (nextMatchId.includes('lb-final')) round = 5

    await prisma.match.create({
      data: {
        id: nextMatchId,
        bracket,
        round,
        [position === 'team1' ? 'team1Id' : 'team2Id']: teamId,
        team1Score: 0,
        team2Score: 0,
        isFinished: false
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { matchId, team1Score, team2Score } = await request.json()

    // Find existing match or create new one
    let match = await prisma.match.findFirst({
      where: { id: matchId }
    })

    if (match) {
      // Determine winner and loser
      let winnerId = null
      let loserId = null
      if (team1Score > team2Score && match.team1Id) {
        winnerId = match.team1Id
        loserId = match.team2Id
      } else if (team2Score > team1Score && match.team2Id) {
        winnerId = match.team2Id
        loserId = match.team1Id
      }

      // Update existing match
      await prisma.match.update({
        where: { id: matchId },
        data: {
          team1Score: team1Score || 0,
          team2Score: team2Score || 0,
          winnerId: winnerId,
          isFinished: (team1Score > 0 || team2Score > 0)
        }
      })

      // Advance teams to next rounds if match is finished
      if (winnerId) {
        await advanceWinners(matchId, winnerId, loserId)
      }

    } else {
      // Create new match - extract info from matchId
      let bracket = 'winner'
      let round = 1

      if (matchId.includes('lb-')) {
        bracket = 'loser'
      } else if (matchId.includes('grand-')) {
        bracket = 'grand'
      }

      if (matchId.includes('-sf-')) {
        round = 2
      } else if (matchId.includes('-final') || matchId.includes('-r3')) {
        round = 3
      } else if (matchId.includes('lb-final')) {
        round = 4
      }

      // Get the actual teams for initial bracket matches
      let team1Id = null
      let team2Id = null
      let winnerId = null

      if (bracket === 'winner' && round === 1) {
        const teams = await prisma.team.findMany({
          orderBy: { position: 'asc' }
        })
        
        if (teams.length >= 8) {
          const teamPairs = [
            [teams[0], teams[1]], // Alpha vs Beta
            [teams[2], teams[3]], // Gamma vs Delta  
            [teams[4], teams[5]], // Echo vs Foxtrot
            [teams[6], teams[7]]  // Golf vs Hotel
          ]
          
          let matchNumber = 1
          if (matchId.includes('-1')) matchNumber = 1
          else if (matchId.includes('-2')) matchNumber = 2
          else if (matchId.includes('-3')) matchNumber = 3
          else if (matchId.includes('-4')) matchNumber = 4
          
          if (teamPairs[matchNumber - 1]) {
            team1Id = teamPairs[matchNumber - 1][0].id
            team2Id = teamPairs[matchNumber - 1][1].id
          }
        }
      }

      if (team1Score > team2Score && team1Id) {
        winnerId = team1Id
      } else if (team2Score > team1Score && team2Id) {
        winnerId = team2Id
      }

      await prisma.match.create({
        data: {
          id: matchId,
          bracket,
          round,
          team1Id,
          team2Id,
          team1Score: team1Score || 0,
          team2Score: team2Score || 0,
          isFinished: (team1Score > 0 || team2Score > 0),
          winnerId
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Match updated successfully'
    })

  } catch (error) {
    console.error('Error updating/creating match:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
