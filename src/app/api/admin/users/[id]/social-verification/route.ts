import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = id
    const { platform, verified } = await request.json()

    if (!['twitch', 'instagram', 'discord', 'inGameName', 'inGameRank'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Update specific platform verification
    const updateData: any = {}
    updateData[`${platform}Verified`] = verified

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    // Check if all platforms are verified to update overall status
    const allPlatformsVerified = updatedUser.twitchVerified && 
                                updatedUser.instagramVerified && 
                                updatedUser.discordVerified

    // Update overall verification status if all platforms are verified
    if (allPlatformsVerified && !updatedUser.isVerified) {
      await prisma.user.update({
        where: { id: userId },
        data: { isVerified: true }
      })
    } else if (!allPlatformsVerified && updatedUser.isVerified) {
      // Remove overall verification if any platform is unverified
      await prisma.user.update({
        where: { id: userId },
        data: { isVerified: false }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${platform} verification updated successfully`,
      [platform + 'Verified']: verified
    })

  } catch (error) {
    console.error('Error updating social verification:', error)
    return NextResponse.json({ 
      error: 'Internal server error beim Aktualisieren der Social Media Verifikation' 
    }, { status: 500 })
  }
}
