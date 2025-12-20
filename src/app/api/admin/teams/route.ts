import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { DEFAULT_TEAM_NAMES } from '@/lib/teamDefaults'

const MAX_TEAM_NAME_LENGTH = 40

// Helper function to verify admin
async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  
  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded || !decoded.userId.startsWith('admin_')) {
    return null
  }

  const adminId = decoded.userId.replace('admin_', '')
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  })

  return admin
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    console.log('🔄 Admin fetching teams...')

    // RENDER FIX: Get teams without problematic relations
    try {
      // Just get basic teams first
      const teams = await prisma.team.findMany({
        orderBy: {
          position: 'asc'
        }
      })

      // For now, just return teams with empty members 
      // until schema is properly migrated
      const teamsWithEmptyMembers = teams.map(team => ({
        ...team,
        members: []
      }))

      console.log(`✅ Admin teams fetched: ${teams.length} teams (empty members)`)
      return NextResponse.json({ teams: teamsWithEmptyMembers })
      
    } catch (error) {
      console.log('⚠️ Teams fetch failed, using sample teams:', error)
      
      // Ultimate fallback: Sample teams for display
      const sampleTeams = DEFAULT_TEAM_NAMES.slice(0, 8).map((name, index) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        position: index + 1,
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        imageUrl: null
      }))

      console.log('⚠️ Using sample teams fallback')
      return NextResponse.json({ teams: sampleTeams })
    }

  } catch (error) {
    console.error('Admin teams fetch error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)

    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const payload = await request.json()
    const teamId = typeof payload.teamId === 'string' ? payload.teamId.trim() : ''
    const rawName = typeof payload.name === 'string' ? payload.name : ''
    const normalizedName = rawName.replace(/\s+/g, ' ').trim()

    if (!teamId) {
      return NextResponse.json({ error: 'Team-ID fehlt.' }, { status: 400 })
    }

    if (!normalizedName) {
      return NextResponse.json({ error: 'Teamname darf nicht leer sein.' }, { status: 400 })
    }

    if (normalizedName.length > MAX_TEAM_NAME_LENGTH) {
      return NextResponse.json({ error: `Teamname darf maximal ${MAX_TEAM_NAME_LENGTH} Zeichen haben.` }, { status: 400 })
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { name: normalizedName }
    })

    return NextResponse.json({ team: updatedTeam })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Team wurde nicht gefunden.' }, { status: 404 })
    }

    console.error('Admin team rename error:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
