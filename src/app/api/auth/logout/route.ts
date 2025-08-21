import { NextResponse } from 'next/server'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({ message: 'Erfolgreich abgemeldet' })
  
  // Remove the token cookie
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0
  })

  return response
}
