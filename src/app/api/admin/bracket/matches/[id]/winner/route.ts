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

// Helper function to advance tournament
async function advanceTournament(matchId: string, winnerId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      team1: true,
      team2: true
    }
  })

  if (!match) {
    throw new Error('Match nicht gefunden')
  }

  // Update match with winner
  await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId: winnerId,
      isComplete: true
    }
  })

  // Determine loser for loser bracket
  const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id

  if (match.bracket === 'winner') {
    // Advance winner to next winner bracket round
    if (match.round === 1) {
      // Quarterfinal to Semifinal
      const nextPosition = Math.ceil(match.position / 2)
      const nextMatch = await prisma.match.findFirst({
        where: {
          bracket: 'winner',
          round: 2,
          position: nextPosition
        }
      })

      if (nextMatch) {
        const updateData = match.position % 2 === 1 ? 
          { team1Id: winnerId } : 
          { team2Id: winnerId }
        
        await prisma.match.update({
          where: { id: nextMatch.id },
          data: updateData
        })
      }

      // Send loser to loser bracket
      const loserBracketPosition = Math.ceil(match.position / 2)
      const loserMatch = await prisma.match.findFirst({
        where: {
          bracket: 'loser',
          round: 1,
          position: loserBracketPosition
        }
      })

      if (loserMatch) {
        const loserUpdateData = match.position % 2 === 1 ?
          { team2Id: loserId } :
          { team1Id: loserId }

        await prisma.match.update({
          where: { id: loserMatch.id },
          data: loserUpdateData
        })
      }

    } else if (match.round === 2) {
      // Semifinal to Final
      const nextMatch = await prisma.match.findFirst({
        where: {
          bracket: 'winner',
          round: 3,
          position: 1
        }
      })

      if (nextMatch) {
        const updateData = match.position === 1 ? 
          { team1Id: winnerId } : 
          { team2Id: winnerId }
        
        await prisma.match.update({
          where: { id: nextMatch.id },
          data: updateData
        })
      }

      // Send loser to loser bracket round 3
      const loserMatch = await prisma.match.findFirst({
        where: {
          bracket: 'loser',
          round: 3,
          position: 1
        }
      })

      if (loserMatch && !loserMatch.team1Id) {
        await prisma.match.update({
          where: { id: loserMatch.id },
          data: { team1Id: loserId }
        })
      } else if (loserMatch && !loserMatch.team2Id) {
        await prisma.match.update({
          where: { id: loserMatch.id },
          data: { team2Id: loserId }
        })
      }

    } else if (match.round === 3) {
      // Winner Bracket Final to Grand Final
      const grandFinal = await prisma.match.findFirst({
        where: {
          bracket: 'grand',
          round: 1,
          position: 1
        }
      })

      if (grandFinal) {
        await prisma.match.update({
          where: { id: grandFinal.id },
          data: { team1Id: winnerId }
        })
      }

      // Send loser to loser bracket final
      const loserFinal = await prisma.match.findFirst({
        where: {
          bracket: 'loser',
          round: 4,
          position: 1
        }
      })

      if (loserFinal && !loserFinal.team1Id) {
        await prisma.match.update({
          where: { id: loserFinal.id },
          data: { team1Id: loserId }
        })
      } else if (loserFinal && !loserFinal.team2Id) {
        await prisma.match.update({
          where: { id: loserFinal.id },
          data: { team2Id: loserId }
        })
      }
    }

  } else if (match.bracket === 'loser') {
    // Advance in loser bracket
    if (match.round === 1) {
      // Loser Round 1 to Round 2
      const nextPosition = Math.ceil(match.position / 2)
      const nextMatch = await prisma.match.findFirst({
        where: {
          bracket: 'loser',
          round: 2,
          position: nextPosition
        }
      })

      if (nextMatch && !nextMatch.team2Id) {
        await prisma.match.update({
          where: { id: nextMatch.id },
          data: { team2Id: winnerId }
        })
      }

    } else if (match.round === 2) {
      // Loser Round 2 to Round 3
      const nextMatch = await prisma.match.findFirst({
        where: {
          bracket: 'loser',
          round: 3,
          position: 1
        }
      })

      if (nextMatch && !nextMatch.team2Id) {
        await prisma.match.update({
          where: { id: nextMatch.id },
          data: { team2Id: winnerId }
        })
      }

    } else if (match.round === 3) {
      // Loser Round 3 to Loser Final
      const loserFinal = await prisma.match.findFirst({
        where: {
          bracket: 'loser',
          round: 4,
          position: 1
        }
      })

      if (loserFinal && !loserFinal.team2Id) {
        await prisma.match.update({
          where: { id: loserFinal.id },
          data: { team2Id: winnerId }
        })
      }

    } else if (match.round === 4) {
      // Loser Final to Grand Final
      const grandFinal = await prisma.match.findFirst({
        where: {
          bracket: 'grand',
          round: 1,
          position: 1
        }
      })

      if (grandFinal && !grandFinal.team2Id) {
        await prisma.match.update({
          where: { id: grandFinal.id },
          data: { team2Id: winnerId }
        })
      }
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { winnerId } = await request.json()
    
    if (!winnerId) {
      return NextResponse.json(
        { error: 'Gewinner-ID ist erforderlich' },
        { status: 400 }
      )
    }

    await advanceTournament(id, winnerId)

    return NextResponse.json({ 
      success: true, 
      message: 'Match-Ergebnis erfolgreich gespeichert' 
    })

  } catch (error) {
    console.error('Set match winner error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
