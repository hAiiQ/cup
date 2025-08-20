import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const cookieStore = await cookies()
    const token = cookieStore.get('admin-token')
    
    if (!token || token.value !== 'admin-authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { matchId, winnerId } = await request.json()

    // Progress winner to next round based on current match
    const currentMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: { winner: true }
    })

    if (!currentMatch || !winnerId) {
      return NextResponse.json({ error: 'Match or winner not found' }, { status: 400 })
    }

    let nextMatchUpdated = false

    if (currentMatch.bracket === 'winner') {
      if (currentMatch.round === 1) {
        // Quarter Final to Semi Final
        const qfNumber = currentMatch.matchNumber
        const sfIndex = Math.ceil(qfNumber / 2)
        const nextMatchId = `wb-sf-${sfIndex}`
        
        const isFirstInSF = qfNumber % 2 === 1
        
        await prisma.match.upsert({
          where: { id: nextMatchId },
          update: isFirstInSF ? 
            { team1Id: winnerId } : 
            { team2Id: winnerId },
          create: {
            id: nextMatchId,
            bracket: 'winner',
            round: 2,
            matchNumber: sfIndex,
            ...(isFirstInSF ? 
              { team1Id: winnerId } : 
              { team2Id: winnerId })
          }
        })
        nextMatchUpdated = true

      } else if (currentMatch.round === 2) {
        // Semi Final to Winner Bracket Final
        await prisma.match.upsert({
          where: { id: 'wb-final' },
          update: currentMatch.matchNumber === 1 ? 
            { team1Id: winnerId } : 
            { team2Id: winnerId },
          create: {
            id: 'wb-final',
            bracket: 'winner',
            round: 3,
            matchNumber: 1,
            ...(currentMatch.matchNumber === 1 ? 
              { team1Id: winnerId } : 
              { team2Id: winnerId })
          }
        })
        nextMatchUpdated = true

      } else if (currentMatch.round === 3) {
        // Winner Bracket Final to Grand Final
        await prisma.match.upsert({
          where: { id: 'grand-final' },
          update: { team1Id: winnerId },
          create: {
            id: 'grand-final',
            bracket: 'grand',
            round: 4,
            matchNumber: 1,
            team1Id: winnerId
          }
        })
        nextMatchUpdated = true
      }
    }

    return NextResponse.json({ 
      success: true, 
      nextMatchUpdated,
      message: nextMatchUpdated ? 'Winner progressed to next round' : 'No progression needed'
    })

  } catch (error) {
    console.error('Error progressing winner:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
