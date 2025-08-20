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

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    // Delete all matches from database
    await prisma.match.deleteMany()

    // Get all teams
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' }
    })

    // Create the correct double elimination bracket structure for 8 teams
    const matchesToCreate = [
      // Winner Bracket Quarter Finals (4 matches)
      { id: 'wb-qf-1', team1Id: teams[0]?.id, team2Id: teams[1]?.id },
      { id: 'wb-qf-2', team1Id: teams[2]?.id, team2Id: teams[3]?.id },
      { id: 'wb-qf-3', team1Id: teams[4]?.id, team2Id: teams[5]?.id },
      { id: 'wb-qf-4', team1Id: teams[6]?.id, team2Id: teams[7]?.id },
      
      // Winner Bracket Semi Finals (2 matches)
      { id: 'wb-sf-1' },
      { id: 'wb-sf-2' },
      
      // Winner Bracket Final
      { id: 'wb-final' },
      
      // Loser Bracket Round 1 (2 matches)
      { id: 'lb-r1-1' },
      { id: 'lb-r1-2' },
      
      // Loser Bracket Round 2 (2 matches)
      { id: 'lb-r2-1' },
      { id: 'lb-r2-2' },
      
      // Loser Bracket Round 3 (1 match)
      { id: 'lb-r3' },
      
      // Loser Bracket Final
      { id: 'lb-final' },
      
      // Grand Final
      { id: 'grand-final' }
    ]

    // Create all matches
    for (const match of matchesToCreate) {
      await prisma.match.create({
        data: {
          id: match.id,
          team1Id: match.team1Id || null,
          team2Id: match.team2Id || null,
          team1Score: 0,
          team2Score: 0,
          isFinished: false,
          round: match.id.includes('qf') ? 1 : 
                 match.id.includes('sf') ? 2 :
                 match.id === 'wb-final' ? 3 :
                 match.id === 'lb-final' ? 5 :
                 match.id === 'grand-final' ? 6 :
                 match.id.includes('lb-r1') ? 1 :
                 match.id.includes('lb-r2') ? 2 :
                 match.id.includes('lb-r3') ? 3 : 0,
          bracket: match.id.includes('wb') ? 'winner' : 
                   match.id.includes('lb') ? 'loser' : 
                   match.id === 'grand-final' ? 'grand' : 'unknown'
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tournament reset successfully'
    })

  } catch (error) {
    console.error('Error resetting tournament:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
