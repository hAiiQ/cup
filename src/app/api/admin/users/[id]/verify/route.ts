import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { resolveTierKey } from '@/lib/tierConfig'

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { id } = params
    const { tier } = await request.json()
    const tierKey = resolveTierKey(tier)

    if (!tierKey) {
      return NextResponse.json(
        { error: 'Ungültiges Tier' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        tier: tierKey,
        isVerified: true
      }
    })

    return NextResponse.json({
      message: 'User erfolgreich verifiziert',
      user: {
        id: user.id,
        username: user.username,
        tier: user.tier,
        isVerified: user.isVerified
      }
    })

  } catch (error) {
    console.error('User verification error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
