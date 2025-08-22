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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin first
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      console.log('❌ Admin verification failed - sending 401')
      return NextResponse.json(
        { error: 'Nicht autorisiert', needsReauth: true },
        { status: 401 }
      )
    }

    console.log('✅ Admin verified for user deletion')

    const { id } = params
    const userId = id

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMemberships: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is in any team
    if (user.teamMemberships.length > 0) {
      return NextResponse.json({ 
        error: 'User ist in einem Team und kann nicht gelöscht werden. Entferne den User zuerst aus dem Team.' 
      }, { status: 400 })
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ 
      success: true, 
      message: `User ${user.username} wurde erfolgreich gelöscht.` 
    })

  } catch (error: any) {
    console.error('Error deleting user:', error)
    
    // Specific error handling for common issues
    if (error?.code === 'P2025') {
      return NextResponse.json({ 
        error: 'User nicht gefunden oder bereits gelöscht' 
      }, { status: 404 })
    }
    
    if (error?.code === 'P2003') {
      return NextResponse.json({ 
        error: 'User kann nicht gelöscht werden - Foreign Key Constraint. Entferne User zuerst aus allen Teams.' 
      }, { status: 400 })
    }
    
    if (error?.code === 'P1001') {
      return NextResponse.json({ 
        error: 'Datenbankverbindung fehlgeschlagen. Bitte versuche es später erneut.' 
      }, { status: 503 })
    }
    
    // Log detailed error for debugging
    console.error('Detailed error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name
    })
    
    return NextResponse.json({ 
      error: 'Internal server error beim Löschen des Users: ' + (error?.message || 'Unbekannter Fehler')
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin first
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      console.log('❌ Admin verification failed - sending 401')
      return NextResponse.json(
        { error: 'Nicht autorisiert', needsReauth: true },
        { status: 401 }
      )
    }

    console.log('✅ Admin verified for user update')

    const { id } = params
    const userId = id
    const { isVerified } = await request.json()

    // Update user verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isVerified }
    })

    return NextResponse.json({ 
      success: true, 
      user: updatedUser 
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ 
      error: 'Internal server error beim Aktualisieren des Users' 
    }, { status: 500 })
  }
}
