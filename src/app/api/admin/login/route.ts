import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Admin login attempt started');
    const { username, password } = await request.json()
    console.log('📝 Admin login data received:', { username });

    if (!username || !password) {
      console.log('❌ Missing username or password');
      return NextResponse.json(
        { error: 'Benutzername und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    // Find admin
    console.log('🔍 Searching for admin:', username);
    const admin = await prisma.admin.findUnique({
      where: { username }
    })
    console.log('👤 Admin found:', admin ? 'YES' : 'NO');

    // Check if admin exists in database
    if (!admin) {
      console.log('❌ Admin not found in database - checking environment fallback');
      
      // Fallback: Check environment variables
      if (username === (process.env.ADMIN_USERNAME || 'admin') && 
          password === (process.env.ADMIN_PASSWORD || 'rootmr')) {
        console.log('✅ Environment admin login successful');
        
        // Generate token for environment admin
        const token = generateToken('admin_env')
        
        const response = NextResponse.json({
          message: 'Admin-Anmeldung erfolgreich (Environment)',
          admin: {
            id: 'env_admin',
            username: username,
            role: 'SUPER_ADMIN'
          }
        })

        response.cookies.set('admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7
        })

        return response
      }
      
      return NextResponse.json(
        { error: 'Ungültige Admin-Anmeldedaten' },
        { status: 401 }
      )
    }

    // Verify password against database
    const isValid = await verifyPassword(password, admin.password)
    
    if (!isValid) {
      console.log('❌ Database password invalid - checking environment fallback');
      
      // Fallback: Check environment password
      if (password === (process.env.ADMIN_PASSWORD || 'rootmr')) {
        console.log('✅ Environment password valid');
        
        // Generate token
        const token = generateToken(`admin_${admin.id}`)
        
        const response = NextResponse.json({
          message: 'Admin-Anmeldung erfolgreich (Environment Password)',
          admin: {
            id: admin.id,
            username: admin.username,
            role: admin.role
          }
        })

        response.cookies.set('admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7
        })

        return response
      }
      
      return NextResponse.json(
        { error: 'Ungültige Admin-Anmeldedaten' },
        { status: 401 }
      )
    }

    // Generate token with admin flag
    const token = generateToken(`admin_${admin.id}`)

    // Set cookie
    const response = NextResponse.json({
      message: 'Admin-Anmeldung erfolgreich',
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    })

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response

  } catch (error) {
    console.error('❌ Admin login error details:', error);
    console.error('❌ Admin login error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Admin login error message:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Interner Serverfehler: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
