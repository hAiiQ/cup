import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultTeamName } from '@/lib/teamDefaults'
import { getBracketSettings } from '@/lib/bracketSettings'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🔄 Fetching teams from database...')
    console.log('Database URL configured:', !!process.env.DATABASE_URL)
    
    // Test database connection first
    await prisma.$connect()
    console.log('✅ Database connection successful')
    const settings = await getBracketSettings()
    const slotLimit = settings.teamSlots
    
    // Erst prüfen ob Teams existieren
    const teamsCount = await prisma.team.count()
    console.log(`📊 Found ${teamsCount} teams in database`)
    
    if (teamsCount === 0) {
      console.log('⚠️ No teams found, creating default teams...')
    }

    for (let position = 1; position <= slotLimit; position++) {
      await prisma.team.upsert({
        where: { position },
        update: {},
        create: {
          name: getDefaultTeamName(position),
          position
        }
      })
    }

    // Fetch teams with their members using the new teamId structure
    const teams = await prisma.team.findMany({
      include: {
        users: {
          select: {
            id: true,
            username: true,
            inGameName: true,
            valorantCurrentRank: true,
            tier: true,
            isVerified: true,
            discordName: true,
            twitchName: true,
            isStreamer: true,
            isIGL: true
          }
        }
      },
      orderBy: {
        position: 'asc'
      },
      take: slotLimit
    })

    console.log(`✅ Successfully fetched ${teams.length} teams with members`)
    
    // Transform data to match frontend interface
    const transformedTeams = teams.map((team: any) => ({
      id: team.id,
      name: team.name,
      position: team.position,
      imageUrl: team.imageUrl,
      members: team.users.map((user: any) => ({
        id: user.id,
        username: user.username,
        inGameName: user.inGameName,
        rank: user.valorantCurrentRank,
        tier: user.tier,
        isVerified: user.isVerified,
        discord: user.discordName,
        twitch: user.twitchName,
        isStreamer: user.isStreamer,
        isIGL: user.isIGL,
        role: 'member' // Default role
      }))
    }))
    
    return NextResponse.json({ teams: transformedTeams, teamSlots: slotLimit })
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
