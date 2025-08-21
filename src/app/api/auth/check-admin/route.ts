import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check for admin token first
    const adminToken = request.cookies.get('admin_token')?.value
    if (adminToken) {
      const decoded = verifyToken(adminToken)
      if (decoded && decoded.userId.startsWith('admin_')) {
        return NextResponse.json({ isAdmin: true })
      }
    }

    // Check if regular user has admin privileges
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ isAdmin: false })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ isAdmin: false })
    }

    // Get user by ID and check if username matches admin usernames
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return NextResponse.json({ isAdmin: false })
    }

    // Check if user exists in admin table by username
    const admin = await prisma.admin.findUnique({
      where: { username: user.username }
    })

    return NextResponse.json({ isAdmin: !!admin })

  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json({ isAdmin: false })
  }
}
