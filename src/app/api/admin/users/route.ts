import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Helper function to verify admin
async function verifyAdmin(request: NextRequest) {
  console.log('🔍 Verifying admin access...')
  const token = request.cookies.get('admin_token')?.value
  console.log('Admin token found:', token ? 'YES' : 'NO')
  
  if (!token) {
    console.log('❌ No admin token found')
    return null
  }

  const decoded = verifyToken(token)
  console.log('Token decoded:', decoded ? 'YES' : 'NO')
  console.log('Decoded userId:', decoded?.userId)
  
  if (!decoded || !decoded.userId.startsWith('admin_')) {
    console.log('❌ Invalid token or not admin token')
    return null
  }

  const adminId = decoded.userId.replace('admin_', '')
  console.log('Looking for admin with ID:', adminId)
  
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  })
  
  console.log('Admin found:', admin ? 'YES' : 'NO')
  return admin
}


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      console.log('❌ Admin verification failed - sending 401')
      return NextResponse.json(
        { error: 'Nicht autorisiert', needsReauth: true },
        { status: 401 }
      )
    }

    console.log('✅ Admin verified, fetching users...')
    const users = await prisma.user.findMany({
      include: {
        teamMemberships: {
          include: {
            team: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 Found ${users.length} users`)
    return NextResponse.json({ users })

  } catch (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
