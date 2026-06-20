import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { ensureParticipationSchema } from '@/lib/participation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const getUserId = (request: NextRequest) => {
  const bearerToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  const token = bearerToken || request.cookies.get('token')?.value
  return token ? verifyToken(token)?.userId : undefined
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    if (!userId || userId.startsWith('admin_')) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    await ensureParticipationSchema()
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isSubstitute: true, isParticipating: false },
      select: { isParticipating: true, isSubstitute: true },
    })

    return NextResponse.json({
      success: true,
      participating: user.isParticipating,
      substitute: user.isSubstitute,
      message: 'Du bist jetzt als Ersatzspieler eingetragen.',
    })
  } catch (error) {
    console.error('Substitute confirmation error:', error)
    return NextResponse.json({ error: 'Ersatzspieler-Status konnte nicht gespeichert werden.' }, { status: 500 })
  }
}
