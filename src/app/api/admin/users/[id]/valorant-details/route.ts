import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { fetchValorantDetails, HenrikApiError } from '@/lib/henrikValorant'

export const dynamic = 'force-dynamic'

async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded || !decoded.userId.startsWith('admin_')) {
    return null
  }

  return prisma.admin.findUnique({
    where: { id: decoded.userId.replace('admin_', '') },
  })
}

function splitValorantName(fullName?: string | null) {
  const value = fullName?.trim() || ''
  const hashIndex = value.indexOf('#')

  if (hashIndex === -1) {
    return null
  }

  const name = value.slice(0, hashIndex).trim()
  const tag = value.slice(hashIndex + 1).trim()

  return name && tag ? { name, tag } : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        inGameName: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })
    }

    const valorantName = splitValorantName(user.inGameName)
    if (!valorantName) {
      return NextResponse.json(
        { error: 'Valorant Name muss im Format Name#Tag gespeichert sein' },
        { status: 400 }
      )
    }

    const details = await fetchValorantDetails(valorantName.name, valorantName.tag)
    const updateData: {
      inGameRank?: string
      valorantCurrentRank?: string | null
      valorantLevel?: number
    } = {}

    if (details.peakRank) {
      updateData.inGameRank = details.peakRank
    }

    if (details.currentRank) {
      updateData.valorantCurrentRank = details.currentRank
    }

    if (typeof details.accountLevel === 'number') {
      updateData.valorantLevel = details.accountLevel
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      })
    }

    return NextResponse.json({ details })
  } catch (error) {
    if (error instanceof HenrikApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }

    console.error('Valorant details fetch error:', error)
    return NextResponse.json(
      { error: 'Valorant Details konnten nicht geladen werden' },
      { status: 500 }
    )
  }
}
