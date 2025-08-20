import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { userId, teamId } = await request.json()

    if (!userId || !teamId) {
      return NextResponse.json(
        { error: 'User ID und Team ID sind erforderlich' },
        { status: 400 }
      )
    }

    // Check if user exists and is verified
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMemberships: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User nicht gefunden' },
        { status: 404 }
      )
    }

    if (!user.isVerified) {
      return NextResponse.json(
        { error: 'User ist nicht verifiziert' },
        { status: 400 }
      )
    }

    if (user.teamMemberships.length > 0) {
      return NextResponse.json(
        { error: 'User ist bereits in einem Team' },
        { status: 400 }
      )
    }

    // Check if team exists and has space
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team nicht gefunden' },
        { status: 404 }
      )
    }

    if (team.members.length >= 6) {
      return NextResponse.json(
        { error: 'Team ist bereits voll (6/6 Mitglieder)' },
        { status: 400 }
      )
    }

    // Add user to team
    const teamMember = await prisma.teamMember.create({
      data: {
        userId,
        teamId,
        role: team.members.length === 0 ? 'captain' : 'member'
      }
    })

    return NextResponse.json({
      message: 'User erfolgreich zum Team hinzugefügt',
      teamMember
    })

  } catch (error) {
    console.error('Team assignment error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
