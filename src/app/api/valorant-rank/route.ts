import { NextRequest, NextResponse } from 'next/server'
import { fetchValorantRank, HenrikApiError } from '@/lib/henrikValorant'
import { MIN_VALORANT_LEVEL } from '@/lib/valorantRequirements'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')?.trim()
  const tag = searchParams.get('tag')?.trim()

  if (!name || !tag) {
    return NextResponse.json({ error: 'Name und Tag sind erforderlich (Format: Name#Tag)' }, { status: 400 })
  }

  try {
    const result = await fetchValorantRank(name, tag)
    return NextResponse.json({
      rank: result.rank,
      currentRank: result.currentRank,
      level: result.accountLevel,
      rankRating: result.rankRating,
      mmr: result.mmr,
      minimumLevel: MIN_VALORANT_LEVEL,
      region: result.region,
      name,
      tag,
    })
  } catch (error) {
    if (error instanceof HenrikApiError) {
      console.error('Valorant rank lookup:', error.code, error.message)
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }

    console.error('Valorant rank lookup error:', error)
    return NextResponse.json(
      { error: 'Rank konnte nicht abgerufen werden', code: 'UNKNOWN' },
      { status: 500 }
    )
  }
}
