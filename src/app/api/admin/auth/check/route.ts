import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token')?.value
    const decoded = adminToken ? verifyToken(adminToken) : null

    if (!decoded?.userId.startsWith('admin_')) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const adminId = decoded.userId.replace('admin_', '')
    if (adminId !== 'env_admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: { id: true },
      })

      if (!admin) {
        return NextResponse.json({ authenticated: false }, { status: 401 })
      }
    }

    return NextResponse.json({ authenticated: true })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
