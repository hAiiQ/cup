import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🎯 Fetching teams for wheel (public test)')

    // Get all teams with member count
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        users: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format teams with member count
    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      memberCount: team.users.length
    }))

    console.log(`📊 Found ${formattedTeams.length} teams`)
    
    return NextResponse.json(formattedTeams)
  } catch (error) {
    console.error('❌ Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Teams', details: error },
      { status: 500 }
    )
  }
}
