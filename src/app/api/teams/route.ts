import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔄 Fetching teams from database...')
    
    // Erst prüfen ob Teams existieren
    const teamsCount = await prisma.team.count()
    console.log(`📊 Found ${teamsCount} teams in database`)
    
    if (teamsCount === 0) {
      console.log('⚠️ No teams found, returning empty array')
      return NextResponse.json({ teams: [] })
    }
    
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
                isVerified: true,
                discordName: true,
                twitchName: true,
                inGameRank: true
              }
            }
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    })

    console.log(`✅ Successfully fetched ${teams.length} teams`)
    
    // Transform data for frontend
    const transformedTeams = teams.map((team: any) => ({
      id: team.id,
      name: team.name,
      position: team.position,
      imageUrl: team.imageUrl,
      members: team.members.map((member: any) => ({
        id: member.user.id,
        username: member.user.username,
        inGameName: member.user.inGameName,
        rank: member.user.inGameRank,
        tier: member.user.tier === 'tier1' ? 1 : member.user.tier === 'tier2' ? 2 : member.user.tier === 'tier3' ? 3 : null,
        isVerified: member.user.isVerified,
        discord: member.user.discordName,
        twitch: member.user.twitchName,
        isStreamer: member.user.isStreamer,
        role: member.role
      }))
    }))
    
    return NextResponse.json({ teams: transformedTeams })

  } catch (error) {
    console.error('❌ Teams fetch error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Interner Serverfehler beim Laden der Teams', 
        details: error instanceof Error ? error.message : 'Unknown error',
        teams: []
      },
      { status: 500 }
    )
  }
}
