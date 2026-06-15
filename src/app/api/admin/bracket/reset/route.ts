import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { clearMatchStates } from '@/lib/matchState'
import { updateBracketSettings } from '@/lib/bracketSettings'
import { resetTeamsToDefaultNames } from '@/lib/teamMaintenance'
import { ensureMatchChatSchema } from '@/lib/matchChat'

// Helper function to verify admin
async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  
  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded || !decoded.userId.startsWith('admin_')) {
    return null
  }

  const adminId = decoded.userId.replace('admin_', '')
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  })

  return admin
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    console.log('🔄 Tournament reset requested by admin:', admin.username)

    await ensureMatchChatSchema()
    const resetResult = await prisma.$transaction(async (tx) => {
      const chatDeleteResult = await tx.matchChatMessage.deleteMany({})
      const deleteResult = await tx.match.deleteMany({})
      const reportDeleteResult = await tx.matchResultReport.deleteMany({})
      const teams = await resetTeamsToDefaultNames(tx)
      return {
        deletedMatches: deleteResult.count,
        deletedReports: reportDeleteResult.count,
        deletedChatMessages: chatDeleteResult.count,
        resetTeams: teams.length
      }
    })
    await updateBracketSettings({ tournamentStarted: false, activeGroupRound: 0 })
    clearMatchStates()
    
    console.log(`Tournament reset: ${resetResult.deletedMatches} matches deleted, ${resetResult.deletedReports} IGL reports deleted, ${resetResult.resetTeams} teams reset`)

    return NextResponse.json({ 
      success: true, 
      message: 'Tournament erfolgreich zurückgesetzt',
      deletedMatches: resetResult.deletedMatches,
      deletedReports: resetResult.deletedReports,
      deletedChatMessages: resetResult.deletedChatMessages,
      resetTeams: resetResult.resetTeams
    })

  } catch (error) {
    console.error('Tournament reset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
