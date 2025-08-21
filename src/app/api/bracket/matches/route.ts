import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

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

    return NextResponse.json({ matches })

  } catch (error) {
    console.error('Matches fetch error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
