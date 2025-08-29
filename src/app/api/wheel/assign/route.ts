import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await request.json()

    if (!userId || !teamId) {
      return NextResponse.json(
        { error: 'userId und teamId sind erforderlich' },
        { status: 400 }
      )
    }

    console.log('🎯 Assigning user to team:', { userId, teamId })

    // Update user with team assignment
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamId: teamId }
    })

    console.log('✅ User assigned to team successfully')
    
    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('❌ Error assigning user to team:', error)
    return NextResponse.json(
      { error: 'Fehler beim Zuweisen des Benutzers zum Team', details: error },
      { status: 500 }
    )
  }
}
