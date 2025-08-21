import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('=== USER PROFILE API CALLED ===')
  try {
    // Try to get token from Authorization header first, then from cookies
    let token = request.headers.get('authorization')?.replace('Bearer ', '')
    console.log('Token from Authorization header:', token ? 'EXISTS' : 'NOT FOUND')
    
    if (!token) {
      token = request.cookies.get('token')?.value
      console.log('Token from cookies:', token ? 'EXISTS' : 'NOT FOUND')
    }

    if (!token) {
      console.log('No token found anywhere, returning 401')
      return NextResponse.json(
        { error: 'Nicht angemeldet', success: false },
        { status: 401 }
      )
    }

    console.log('Verifying token...')
    const decoded = verifyToken(token)
    if (!decoded) {
      console.log('Token verification failed, returning 401')
      return NextResponse.json(
        { error: 'Ungültiger Token', success: false },
        { status: 401 }
      )
    }

    console.log('Token verified, userId:', decoded.userId)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        inGameName: true,
        inGameRank: true,
        discordName: true,
        twitchName: true,
        instagramName: true,
        tier: true,
        isVerified: true,
        rulesAccepted: true,
        twitchVerified: true,
        instagramVerified: true,
        discordVerified: true,
        inGameNameVerified: true,
        inGameRankVerified: true,
      }
    })

    if (!user) {
      console.log('User not found in database for userId:', decoded.userId)
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden', success: false },
        { status: 404 }
      )
    }

    console.log('User found, returning profile data:', user)
    return NextResponse.json({ 
      success: true,
      user 
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler', success: false },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  console.log('=== USER PROFILE UPDATE API CALLED ===')
  try {
    // Try to get token from Authorization header first, then from cookies
    let token = request.headers.get('authorization')?.replace('Bearer ', '')
    console.log('Token from Authorization header:', token ? 'EXISTS' : 'NOT FOUND')
    
    if (!token) {
      token = request.cookies.get('token')?.value
      console.log('Token from cookies:', token ? 'EXISTS' : 'NOT FOUND')
    }

    if (!token) {
      console.log('No token found anywhere, returning 401')
      return NextResponse.json(
        { error: 'Nicht angemeldet', success: false },
        { status: 401 }
      )
    }

    console.log('Verifying token...')
    const decoded = verifyToken(token)
    if (!decoded) {
      console.log('Token verification failed, returning 401')
      return NextResponse.json(
        { error: 'Ungültiger Token', success: false },
        { status: 401 }
      )
    }

    console.log('Token verified, userId:', decoded.userId)
    const { inGameName, inGameRank, discordName, twitchName, instagramName } = await request.json()
    console.log('Update data:', { inGameName, inGameRank, discordName, twitchName, instagramName })

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        inGameName: inGameName || null,
        inGameRank: inGameRank || null,
        discordName: discordName || null,
        twitchName: twitchName || null,
        instagramName: instagramName || null,
      },
      select: {
        id: true,
        username: true,
        inGameName: true,
        inGameRank: true,
        discordName: true,
        twitchName: true,
        instagramName: true,
        tier: true,
        isVerified: true,
        rulesAccepted: true,
      }
    })

    console.log('User updated successfully:', user)
    return NextResponse.json({
      success: true,
      message: 'Profil aktualisiert',
      user
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler', success: false },
      { status: 500 }
    )
  }
}
