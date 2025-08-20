import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                inGameName: true,
                tier: true,
                isStreamer: true,
                isVerified: true
              }
            }
          }
        }
      },
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
