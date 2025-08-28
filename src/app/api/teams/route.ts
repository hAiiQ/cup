import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🔄 Fetching teams from database...')
    console.log('Database URL configured:', !!process.env.DATABASE_URL)
    
    // Test database connection first
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Erst prüfen ob Teams existieren
    const teamsCount = await prisma.team.count()
    console.log(`📊 Found ${teamsCount} teams in database`)
    
    if (teamsCount === 0) {
      console.log('⚠️ No teams found, creating default teams...')
      
      // Create default teams if none exist
      const defaultTeams = [
        'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta',
        'Team Epsilon', 'Team Zeta', 'Team Eta', 'Team Theta'
      ]
      
      for (let i = 0; i < defaultTeams.length; i++) {
        await prisma.team.create({
          data: {
            name: defaultTeams[i],
            position: i
          }
        })
      }
      
      console.log('✅ Default teams created')
    }

    // Fetch teams with their members using the new teamId structure
    const teams = await prisma.team.findMany({
      include: {
        users: {
          select: {
            id: true,
            username: true,
            inGameName: true,
            inGameRank: true,
            tier: true,
            isVerified: true,
            discordName: true,
            twitchName: true,
            isStreamer: true
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
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
        rank: user.inGameRank,
        tier: user.tier,
        isVerified: user.isVerified,
        discord: user.discordName,
        twitch: user.twitchName,
        isStreamer: user.isStreamer,
        role: 'member' // Default role
      }))
    }))
    
    return NextResponse.json({ teams: transformedTeams })  } catch (error) {
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
