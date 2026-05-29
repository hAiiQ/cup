import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  findMatchForTeam,
  getAuthenticatedIglUser,
  getWinnerSlot,
  loadIglBracketData,
} from '@/lib/iglMatches'

export const dynamic = 'force-dynamic'

const parseScore = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 99 ? numeric : null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedIglUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Nur IGLs können Ergebnisse melden' },
        { status: 403 }
      )
    }

    if (!user.teamId) {
      return NextResponse.json(
        { error: 'Du bist keinem Team zugewiesen' },
        { status: 400 }
      )
    }

    const { matchId, team1Score: rawTeam1Score, team2Score: rawTeam2Score } = await request.json()
    const team1Score = parseScore(rawTeam1Score)
    const team2Score = parseScore(rawTeam2Score)

    if (!matchId || team1Score === null || team2Score === null) {
      return NextResponse.json(
        { error: 'Match ID und gueltige Scores sind erforderlich' },
        { status: 400 }
      )
    }

    const winnerSlot = getWinnerSlot(team1Score, team2Score)
    if (!winnerSlot) {
      return NextResponse.json(
        { error: 'Ein Ergebnis braucht einen Gewinner. Unentschieden können nicht gemeldet werden.' },
        { status: 400 }
      )
    }

    const data = await loadIglBracketData()
    const ownMatch = findMatchForTeam(data.matches, matchId, user.teamId)

    if (!ownMatch) {
      return NextResponse.json(
        { error: 'Du kannst nur Ergebnisse für Matches deines Teams melden' },
        { status: 403 }
      )
    }

    if (!ownMatch.match.isLive || ownMatch.match.isFinished || ownMatch.match.autoAdvance) {
      return NextResponse.json(
        { error: 'Ergebnisse können erst gemeldet werden, wenn dein Match live ist' },
        { status: 400 }
      )
    }

    const existingReport = data.reports.find((report) => report.matchId === matchId)
    if (existingReport?.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Dieses Ergebnis wurde bereits bestätigt' },
        { status: 409 }
      )
    }

    if (existingReport?.status === 'pending' && existingReport.reporterTeamId !== user.teamId) {
      return NextResponse.json(
        { error: 'Das Gegnerteam hat bereits ein Ergebnis gemeldet. Bitte bestaetige oder lehne es ab.' },
        { status: 409 }
      )
    }

    const report = await prisma.matchResultReport.upsert({
      where: { matchId },
      update: {
        reporterTeamId: user.teamId,
        reporterUserId: user.id,
        team1Score,
        team2Score,
        winnerSlot,
        status: 'pending',
        confirmedByTeamId: null,
        confirmedByUserId: null,
        rejectedByTeamId: null,
        rejectedByUserId: null,
      },
      create: {
        matchId,
        reporterTeamId: user.teamId,
        reporterUserId: user.id,
        team1Score,
        team2Score,
        winnerSlot,
        status: 'pending',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Ergebnis gemeldet. Das Gegnerteam muss es noch bestätigen.',
      report,
    })
  } catch (error) {
    console.error('IGL report result error:', error)
    return NextResponse.json(
      { error: 'Ergebnis konnte nicht gemeldet werden' },
      { status: 500 }
    )
  }
}
