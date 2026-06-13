import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureParticipationSchema } from '@/lib/participation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await ensureParticipationSchema()
    console.log('🎯 Fetching users for wheel (public test)')

    // Get confirmed participants who don't have a team.
    const users = await prisma.user.findMany({
      where: {
        isParticipating: true,
        teamId: null
      },
      select: {
        id: true,
        username: true,
        discordName: true,
        twitchName: true,
        instagramName: true,
        tier: true,
        isStreamer: true,
        teamId: true,
      },
      orderBy: {
        username: 'asc'
      }
    })

    console.log(`📊 Found ${users.length} users for wheel`)
    
    return NextResponse.json(users)
  } catch (error) {
    console.error('❌ Error fetching users:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Benutzer', details: error },
      { status: 500 }
    )
  }
}
