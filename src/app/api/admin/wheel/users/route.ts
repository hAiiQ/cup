import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ensureParticipationSchema } from '@/lib/participation'

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

    console.log('🎯 Fetching confirmed participants for wheel assignment')

    await ensureParticipationSchema()

    // Keep assigned players out of subsequent wheel spins.
    const users = await prisma.user.findMany({
      where: {
        isParticipating: true,
        teamId: null
        // teamMemberships: { none: {} } // Disabled due to Render deployment
      },
      select: {
        id: true,
        username: true,
        inGameName: true,
        tier: true,
        isStreamer: true
      }
    })

    console.log(`✅ Found ${users.length} verified users for wheel`)

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Wheel users fetch error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
