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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { winnerId } = await request.json()
    
    if (!winnerId) {
      return NextResponse.json(
        { error: 'Gewinner-ID ist erforderlich' },
        { status: 400 }
      )
    }

    // Simple match update without complex tournament logic
    await prisma.match.update({
      where: { id },
      data: {
        winnerId,
        isFinished: true,
        playedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Match-Ergebnis erfolgreich gespeichert' 
    })

  } catch (error) {
    console.error('Set match winner error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
