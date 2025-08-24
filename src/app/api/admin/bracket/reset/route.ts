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

    console.log('🔄 Tournament reset requested by admin:', admin.username)

    // RENDER FIX: Simplified tournament reset
    // Delete all matches to reset tournament
    const deleteResult = await prisma.match.deleteMany({})
    
    console.log(`✅ Tournament reset: ${deleteResult.count} matches deleted`)

    return NextResponse.json({ 
      success: true, 
      message: 'Tournament erfolgreich zurückgesetzt',
      deletedMatches: deleteResult.count
    })

  } catch (error) {
    console.error('Tournament reset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
