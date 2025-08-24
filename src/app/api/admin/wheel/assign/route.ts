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


// Force dynamic rendering
export const dynamic = 'force-dynamic'

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

    console.log(`🎯 Assigning user ${userId} to team ${teamId}`)

    // Check if user exists without relations first
    const user = await prisma.user.findUnique({
      where: { id: userId }
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

    // RENDER FIX: Check if user already has a team via teamId
    if (user.teamId) {
      return NextResponse.json(
        { error: 'User ist bereits in einem Team' },
        { status: 400 }
      )
    }

    // Check if team exists (without relations)
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team nicht gefunden' },
        { status: 404 }
      )
    }

    // Check team capacity (count users with this teamId)
    const teamMemberCount = await prisma.user.count({
      where: { teamId: teamId }
    })

    if (teamMemberCount >= 6) {
      return NextResponse.json(
        { error: 'Team ist bereits voll (6/6 Mitglieder)' },
        { status: 400 }
      )
    }

    // Assign user to team using direct teamId
    await prisma.user.update({
      where: { id: userId },
      data: { teamId: teamId }
    })

    console.log(`✅ User ${userId} assigned to team ${teamId} (${team.name})`)
    
    return NextResponse.json({
      message: 'User erfolgreich zum Team hinzugefügt',
      assignment: {
        userId,
        teamId,
        teamName: team.name
      }
    })

  } catch (error) {
    console.error('Team assignment error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
