import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma')
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        inGameName: true,
        inGameRank: true,
        valorantCurrentRank: true,
        valorantLevel: true,
        tier: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'asc' },
        { username: 'asc' },
      ],
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Public user list fetch error:', error)
    return NextResponse.json(
      { error: 'Userliste konnte nicht geladen werden', users: [] },
      { status: 500 }
    )
  }
}
