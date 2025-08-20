import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Try to get token from Authorization header first, then from cookies
    let token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      token = request.cookies.get('token')?.value
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Nicht angemeldet' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Ungültiger Token' },
        { status: 401 }
      )
    }

    // Update user's rules acceptance
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { rulesAccepted: true }
    })

    return NextResponse.json({
      message: 'Regeln erfolgreich akzeptiert'
    })

  } catch (error) {
    console.error('Accept rules error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
