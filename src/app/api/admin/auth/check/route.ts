import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Force dynamic rendering for cookie access
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check if admin token cookie exists (NOT admin_session!)
    const adminToken = request.cookies.get('admin_token')?.value
    
    if (!adminToken) {
      console.log('❌ No admin_token cookie found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify the JWT token
    try {
      const decoded = verifyToken(adminToken)
      console.log('✅ Admin token verified:', decoded)
      return NextResponse.json({ authenticated: true, admin: decoded })
    } catch (tokenError) {
      console.log('❌ Invalid admin token:', tokenError)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
