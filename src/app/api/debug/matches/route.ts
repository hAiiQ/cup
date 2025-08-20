import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
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

    return NextResponse.json({ 
      debug: true,
      matchCount: matches.length,
      matches: matches.map(m => ({
        id: m.id,
        bracket: m.bracket,
        round: m.round,
        team1Name: m.team1?.name || 'NULL',
        team2Name: m.team2?.name || 'NULL',
        hasScore: (m as any).team1Score > 0 || (m as any).team2Score > 0
      }))
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug error' },
      { status: 500 }
    )
  }
}
