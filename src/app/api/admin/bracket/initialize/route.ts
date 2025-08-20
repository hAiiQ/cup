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

// Helper function to create double elimination bracket
async function createDoubleEliminationBracket() {
  // Get all teams
  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' }
  })

  if (teams.length !== 8) {
    throw new Error('Es müssen genau 8 Teams vorhanden sein')
  }

  // Clear existing matches
  await prisma.match.deleteMany()

  // Winner Bracket - Round 1 (Quarterfinals)
  const winnerRound1Matches = []
  for (let i = 0; i < 4; i++) {
    const team1 = teams[i * 2]
    const team2 = teams[i * 2 + 1]
    
    const match = await prisma.match.create({
      data: {
        bracket: 'winner',
        round: 1,
        position: i + 1,
        team1Id: team1.id,
        team2Id: team2.id
      }
    })
    winnerRound1Matches.push(match)
  }

  // Winner Bracket - Round 2 (Semifinals)
  const winnerRound2Matches = []
  for (let i = 0; i < 2; i++) {
    const match = await prisma.match.create({
      data: {
        bracket: 'winner',
        round: 2,
        position: i + 1
      }
    })
    winnerRound2Matches.push(match)
  }

  // Winner Bracket - Round 3 (Final)
  await prisma.match.create({
    data: {
      bracket: 'winner',
      round: 3,
      position: 1
    }
  })

  // Loser Bracket - Round 1
  const loserRound1Matches = []
  for (let i = 0; i < 2; i++) {
    const match = await prisma.match.create({
      data: {
        bracket: 'loser',
        round: 1,
        position: i + 1
      }
    })
    loserRound1Matches.push(match)
  }

  // Loser Bracket - Round 2
  const loserRound2Matches = []
  for (let i = 0; i < 2; i++) {
    const match = await prisma.match.create({
      data: {
        bracket: 'loser',
        round: 2,
        position: i + 1
      }
    })
    loserRound2Matches.push(match)
  }

  // Loser Bracket - Round 3
  await prisma.match.create({
    data: {
      bracket: 'loser',
      round: 3,
      position: 1
    }
  })

  // Loser Bracket - Round 4 (Loser Final)
  await prisma.match.create({
    data: {
      bracket: 'loser',
      round: 4,
      position: 1
    }
  })

  // Grand Final
  await prisma.match.create({
    data: {
      bracket: 'grand',
      round: 1,
      position: 1
    }
  })

  return { success: true, message: 'Turnier-Bracket erfolgreich initialisiert' }
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

    const result = await createDoubleEliminationBracket()
    return NextResponse.json(result)

  } catch (error) {
    console.error('Tournament initialization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
