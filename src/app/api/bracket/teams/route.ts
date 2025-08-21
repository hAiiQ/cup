import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: {
        position: 'asc'
      }
    })

    return NextResponse.json({ teams })

  } catch (error) {
    console.error('Teams fetch error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
