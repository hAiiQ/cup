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
    
    // First try to get users without relations to see if the basic query works
    try {
      const basicUsers = await prisma.user.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      })
      console.log(`📊 Found ${basicUsers.length} basic users`)
      
      // If basic query works, try with relations
      if (basicUsers.length > 0) {
        try {
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
          console.log(`📊 Found ${users.length} users with relations`)
          return NextResponse.json({ users })
        } catch (relationError) {
          console.log('⚠️ Relations failed, returning basic users:', relationError)
          return NextResponse.json({ users: basicUsers })
        }
      } else {
        return NextResponse.json({ users: basicUsers })
      }
    } catch (basicError) {
      console.error('❌ Even basic user query failed:', basicError)
      return NextResponse.json({ users: [] })
    }

  } catch (error) {
    console.error('❌ Admin users fetch error details:', error)
    console.error('❌ Admin users fetch error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('❌ Admin users fetch error message:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Interner Serverfehler: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
