import { NextRequest, NextResponse } from 'next/server'
import {
  findMatchForTeam,
  getAuthenticatedIglUser,
  loadIglBracketData,
} from '@/lib/iglMatches'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedIglUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Nur IGLs können diese Seite nutzen' },
        { status: 403 }
      )
    }

    const data = await loadIglBracketData()
    const reportsByMatch = new Map(data.reports.map((report) => [report.matchId, report]))

    const enrichMatch = (match: (typeof data.matches)[number] | (typeof data.groupMatches)[number]) => {
      const ownMatch = user.teamId ? findMatchForTeam([match], match.id, user.teamId) : null
      const report = reportsByMatch.get(match.id) || null
      const canManage =
        Boolean(ownMatch) &&
        match.isLive &&
        !match.isFinished &&
        !match.autoAdvance
      const isOwnReport = Boolean(report && user.teamId && report.reporterTeamId === user.teamId)
      const canConfirmResult = Boolean(
        canManage &&
          report?.status === 'pending' &&
          user.teamId &&
          report.reporterTeamId !== user.teamId
      )
      const canSubmitResult = Boolean(
        canManage &&
          (!report || report.status === 'rejected' || isOwnReport)
      )

      return {
        ...match,
        ownSlot: ownMatch?.teamSlot || null,
        report,
        canSubmitResult,
        canConfirmResult,
      }
    }
    const matches = data.matches.map(enrichMatch)
    const groupMatches = data.groupMatches.map(enrichMatch)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        twitchName: user.twitchName,
        teamId: user.teamId,
        team: user.team,
        isIGL: user.isIGL,
      },
      matches,
      groupMatches,
      groupPhase: data.groupPhase,
      teams: data.teams,
      reports: data.reports,
      layout: data.layout,
      connections: data.connections,
      slotCount: data.slotCount,
      requestedSlotCount: data.requestedSlotCount,
      mode: data.mode,
      settings: data.settings,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('IGL matches fetch error:', error)
    return NextResponse.json(
      { error: 'IGL Bracket konnte nicht geladen werden' },
      { status: 500 }
    )
  }
}
