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

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const [totalUsers, verifiedUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: true } })
    ])

    const stats = {
      totalUsers,
      verifiedUsers,
      unverifiedUsers: totalUsers - verifiedUsers
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Admin stats fetch error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
