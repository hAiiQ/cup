import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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
  return prisma.admin.findUnique({
    where: { id: adminId },
  })
}

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

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID erforderlich' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User nicht gefunden' },
        { status: 404 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isIGL: !user.isIGL,
      },
    })

    return NextResponse.json({
      success: true,
      isIGL: updatedUser.isIGL,
    })
  } catch (error) {
    console.error('Toggle IGL error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
