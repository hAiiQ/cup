import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if admin session cookie exists
    const adminToken = request.cookies.get('admin_session')?.value
    
    if (!adminToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify the session token (simplified check)
    // In production, you'd verify this against a database or JWT
    if (adminToken === 'admin_authenticated') {
      return NextResponse.json({ authenticated: true })
    }
    
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
