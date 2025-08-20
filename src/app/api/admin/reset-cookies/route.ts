import { NextResponse } from 'next/server'

export async function POST() {
  console.log('🔄 Forcing admin cookie reset...')
  
  const response = NextResponse.json({ 
    message: 'Admin Cookie zurückgesetzt. Bitte erneut anmelden.',
    redirectTo: '/admin'
  })
  
  // Clear admin cookie completely
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })

  return response
}
