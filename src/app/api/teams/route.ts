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

    // Fetch teams WITHOUT relations first - to avoid TeamMember table errors
    const teams = await prisma.team.findMany({
      orderBy: {
        position: 'asc'
      }
    })

    console.log(`✅ Successfully fetched ${teams.length} teams`)
    
    // Transform data for frontend - with empty members for now
    const transformedTeams = teams.map((team: any) => ({
      id: team.id,
      name: team.name,
      position: team.position,
      imageUrl: team.imageUrl,
      members: [] // Empty members array until TeamMember table is fixed
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
