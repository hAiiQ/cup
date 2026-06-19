import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const PARTICIPANT_COUNT = 100
const PLAYERS_PER_PRIMARY_TIER = 20

type TierKey = 'tier1' | 'tier2' | 'tier3' | 'tier4'

interface RankedParticipant {
  id: string
  username: string
  inGameName: string | null
  peakRank: string
  currentRank: string
}

const RANK_SCORES: Record<string, number> = {
  unrated: 0,
  'iron 1': 1,
  'iron 2': 2,
  'iron 3': 3,
  'bronze 1': 4,
  'bronze 2': 5,
  'bronze 3': 6,
  'silver 1': 7,
  'silver 2': 8,
  'silver 3': 9,
  'gold 1': 10,
  'gold 2': 11,
  'gold 3': 12,
  'platinum 1': 13,
  'platinum 2': 14,
  'platinum 3': 15,
  'diamond 1': 16,
  'diamond 2': 17,
  'diamond 3': 18,
  'ascendant 1': 19,
  'ascendant 2': 20,
  'ascendant 3': 21,
  'immortal 1': 22,
  'immortal 2': 23,
  'immortal 3': 24,
  radiant: 25,
}

async function isAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  const decoded = token ? verifyToken(token) : null

  if (!decoded?.userId.startsWith('admin_')) {
    return false
  }

  const adminId = decoded.userId.replace('admin_', '')
  if (adminId === 'env_admin') {
    return true
  }

  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true },
  })

  return Boolean(admin)
}

function normalizeRank(rank: string) {
  return rank.trim().toLowerCase().replace(/\s+/g, ' ')
}

function getRankScore(rank: string) {
  return RANK_SCORES[normalizeRank(rank)]
}

function getNaturalTier(peakRank: string): TierKey {
  const normalizedRank = normalizeRank(peakRank)

  if (normalizedRank === 'radiant' || normalizedRank.startsWith('immortal ')) {
    return 'tier1'
  }
  if (normalizedRank.startsWith('ascendant ')) {
    return 'tier2'
  }
  if (normalizedRank.startsWith('diamond ')) {
    return 'tier3'
  }
  return 'tier4'
}

function compareWeakestFirst(a: RankedParticipant, b: RankedParticipant) {
  const currentRankDifference = getRankScore(a.currentRank) - getRankScore(b.currentRank)
  if (currentRankDifference !== 0) {
    return currentRankDifference
  }

  const peakRankDifference = getRankScore(a.peakRank) - getRankScore(b.peakRank)
  if (peakRankDifference !== 0) {
    return peakRankDifference
  }

  return (a.inGameName || a.username).localeCompare(b.inGameName || b.username, 'de')
}

function moveWeakest(
  source: RankedParticipant[],
  destination: RankedParticipant[],
  amount: number
) {
  if (amount <= 0) {
    return []
  }

  source.sort(compareWeakestFirst)
  const moved = source.splice(0, amount)
  destination.push(...moved)
  return moved
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const participants = await prisma.user.findMany({
      where: { isParticipating: true },
      select: {
        id: true,
        username: true,
        inGameName: true,
        inGameRank: true,
        valorantCurrentRank: true,
      },
    })

    if (participants.length !== PARTICIPANT_COUNT) {
      return NextResponse.json(
        {
          error: `Es muessen genau ${PARTICIPANT_COUNT} Teilnehmer vorhanden sein. Aktuell sind es ${participants.length}.`,
        },
        { status: 409 }
      )
    }

    const incompletePlayers = participants.filter(
      (player) =>
        !player.inGameRank ||
        !player.valorantCurrentRank ||
        getRankScore(player.inGameRank) === undefined ||
        getRankScore(player.valorantCurrentRank) === undefined
    )

    if (incompletePlayers.length > 0) {
      return NextResponse.json(
        {
          error: `${incompletePlayers.length} Teilnehmer haben keinen gueltigen aktuellen Rank oder Peak Rank. Bitte zuerst die Ranks aktualisieren.`,
          players: incompletePlayers.map((player) => player.inGameName || player.username),
        },
        { status: 409 }
      )
    }

    const rankedParticipants: RankedParticipant[] = participants.map((player) => ({
      id: player.id,
      username: player.username,
      inGameName: player.inGameName,
      peakRank: player.inGameRank as string,
      currentRank: player.valorantCurrentRank as string,
    }))

    const groups: Record<TierKey, RankedParticipant[]> = {
      tier1: [],
      tier2: [],
      tier3: [],
      tier4: [],
    }

    for (const player of rankedParticipants) {
      groups[getNaturalTier(player.peakRank)].push(player)
    }

    const initialCounts = {
      tier1: groups.tier1.length,
      tier2: groups.tier2.length,
      tier3: groups.tier3.length,
      tier4: groups.tier4.length,
    }

    if (groups.tier1.length < PLAYERS_PER_PRIMARY_TIER) {
      return NextResponse.json(
        { error: 'Es gibt weniger als 20 Radiant- und Immortal-Spieler fuer Tier 1.' },
        { status: 409 }
      )
    }

    const tier1ToTier2 = moveWeakest(
      groups.tier1,
      groups.tier2,
      groups.tier1.length - PLAYERS_PER_PRIMARY_TIER
    )

    if (groups.tier2.length < PLAYERS_PER_PRIMARY_TIER) {
      return NextResponse.json(
        { error: 'Nach der ersten Abstufung gibt es weniger als 20 Spieler fuer Tier 2.' },
        { status: 409 }
      )
    }

    const tier2ToTier3 = moveWeakest(
      groups.tier2,
      groups.tier3,
      groups.tier2.length - PLAYERS_PER_PRIMARY_TIER
    )

    if (groups.tier3.length < PLAYERS_PER_PRIMARY_TIER) {
      return NextResponse.json(
        { error: 'Nach der zweiten Abstufung gibt es weniger als 20 Spieler fuer Tier 3.' },
        { status: 409 }
      )
    }

    const tier3ToTier4 = moveWeakest(
      groups.tier3,
      groups.tier4,
      groups.tier3.length - PLAYERS_PER_PRIMARY_TIER
    )

    const finalCounts = {
      tier1: groups.tier1.length,
      tier2: groups.tier2.length,
      tier3: groups.tier3.length,
      tier4: groups.tier4.length,
    }

    if (
      finalCounts.tier1 !== 20 ||
      finalCounts.tier2 !== 20 ||
      finalCounts.tier3 !== 20 ||
      finalCounts.tier4 !== 40
    ) {
      return NextResponse.json(
        { error: 'Die Zielverteilung 20 / 20 / 20 / 40 konnte nicht erstellt werden.' },
        { status: 409 }
      )
    }

    await prisma.$transaction(
      (Object.keys(groups) as TierKey[]).map((tier) =>
        prisma.user.updateMany({
          where: { id: { in: groups[tier].map((player) => player.id) } },
          data: { tier },
        })
      )
    )

    return NextResponse.json({
      success: true,
      initialCounts,
      finalCounts,
      moved: {
        tier1ToTier2: tier1ToTier2.length,
        tier2ToTier3: tier2ToTier3.length,
        tier3ToTier4: tier3ToTier4.length,
      },
    })
  } catch (error) {
    console.error('Automatic tier assignment failed:', error)
    return NextResponse.json(
      { error: 'Die automatische Tier-Zuweisung ist fehlgeschlagen.' },
      { status: 500 }
    )
  }
}
