import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
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
        valorantLevel: true,
        valorantCurrentRank: true,
        discordName: true,
        twitchName: true,
        instagramName: true,
        tiktokName: true,
        tier: true,
        isStreamer: true,
        isIGL: true,
        isVerified: true,
        rulesAccepted: true,
        twitchVerified: true,
        instagramVerified: true,
        discordVerified: true,
        tiktokVerified: true,
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
    const { instagramName, tiktokName } = await request.json()
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        instagramName: true,
        tiktokName: true,
      },
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden', success: false },
        { status: 404 }
      )
    }

    const updateData: Prisma.UserUpdateInput = {}

    if (typeof instagramName === 'string') {
      const cleanedInstagramName = instagramName.trim().replace(/^@/, '')
      updateData.instagramName = cleanedInstagramName || null

      if ((currentUser.instagramName || '') !== cleanedInstagramName) {
        updateData.instagramVerified = false
        updateData.isVerified = false
      }
    }

    if (typeof tiktokName === 'string') {
      const cleanedTikTokName = tiktokName.trim().replace(/^@/, '')
      updateData.tiktokName = cleanedTikTokName || null

      if ((currentUser.tiktokName || '') !== cleanedTikTokName) {
        updateData.tiktokVerified = false
        updateData.isVerified = false
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Keine bearbeitbaren Profildaten angegeben', success: false },
        { status: 400 }
      )
    }

    console.log('Update data:', updateData)

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        inGameName: true,
        inGameRank: true,
        valorantLevel: true,
        valorantCurrentRank: true,
        discordName: true,
        twitchName: true,
        instagramName: true,
        tiktokName: true,
        tier: true,
        isStreamer: true,
        isIGL: true,
        isVerified: true,
        rulesAccepted: true,
        twitchVerified: true,
        instagramVerified: true,
        discordVerified: true,
        tiktokVerified: true,
        inGameNameVerified: true,
        inGameRankVerified: true,
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
