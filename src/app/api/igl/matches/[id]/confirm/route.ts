import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setMatchState } from '@/lib/matchState'
import {
  findMatchForTeam,
  getAuthenticatedIglUser,
  getBracketMeta,
  getWinnerSlot,
  loadIglBracketData,
} from '@/lib/iglMatches'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedIglUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Nur IGLs können Ergebnisse bestätigen' },
        { status: 403 }
      )
    }

    if (!user.teamId) {
      return NextResponse.json(
        { error: 'Du bist keinem Team zugewiesen' },
        { status: 400 }
      )
    }

    const { action } = await request.json().catch(() => ({ action: 'confirm' }))
    const shouldReject = action === 'reject'
    const matchId = params.id

    const data = await loadIglBracketData()
    const ownMatch = findMatchForTeam(data.matches, matchId, user.teamId)
    const report = data.reports.find((item) => item.matchId === matchId && item.status === 'pending')

    if (!ownMatch) {
      return NextResponse.json(
        { error: 'Du kannst nur Ergebnisse für Matches deines Teams bearbeiten' },
        { status: 403 }
      )
    }

    if (!report) {
      return NextResponse.json(
        { error: 'Fuer dieses Match liegt kein offenes Ergebnis vor' },
        { status: 404 }
      )
    }

    if (report.reporterTeamId === user.teamId) {
      return NextResponse.json(
        { error: 'Das Ergebnis muss vom Gegnerteam bestätigt werden' },
        { status: 409 }
      )
    }

    if (ownMatch.match.isFinished || ownMatch.match.autoAdvance) {
      return NextResponse.json(
        { error: 'Dieses Match ist bereits abgeschlossen' },
        { status: 409 }
      )
    }

    if (shouldReject) {
      const rejectedReport = await prisma.matchResultReport.update({
        where: { matchId },
        data: {
          status: 'rejected',
          rejectedByTeamId: user.teamId,
          rejectedByUserId: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Ergebnis wurde abgelehnt. Ein IGL kann es neu melden.',
        report: rejectedReport,
      })
    }

    const winnerSlot = report.winnerSlot || getWinnerSlot(report.team1Score, report.team2Score)
    if (!winnerSlot) {
      return NextResponse.json(
        { error: 'Das gemeldete Ergebnis hat keinen Gewinner' },
        { status: 400 }
      )
    }

    const { bracket, round } = getBracketMeta(matchId)
    const now = new Date()
    const updatedState = setMatchState(matchId, {
      team1Score: report.team1Score,
      team2Score: report.team2Score,
      winnerId: winnerSlot,
      isFinished: true,
      isLive: false,
    })

    await prisma.$transaction([
      prisma.match.upsert({
        where: { id: matchId },
        update: {
          team1Id: ownMatch.match.team1?.id,
          team2Id: ownMatch.match.team2?.id,
          team1Score: report.team1Score,
          team2Score: report.team2Score,
          winnerId: null,
          isFinished: true,
          isLive: false,
          playedAt: now,
          updatedAt: now,
        },
        create: {
          id: matchId,
          bracket,
          round,
          matchNumber: 1,
          team1Id: ownMatch.match.team1?.id,
          team2Id: ownMatch.match.team2?.id,
          team1Score: report.team1Score,
          team2Score: report.team2Score,
          isFinished: true,
          isLive: false,
          playedAt: now,
        },
      }),
      prisma.matchResultReport.update({
        where: { matchId },
        data: {
          status: 'confirmed',
          winnerSlot,
          confirmedByTeamId: user.teamId,
          confirmedByUserId: user.id,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Ergebnis bestätigt und ins Bracket übernommen.',
      state: updatedState,
    })
  } catch (error) {
    console.error('IGL confirm result error:', error)
    return NextResponse.json(
      { error: 'Ergebnis konnte nicht bestätigt werden' },
      { status: 500 }
    )
  }
}
