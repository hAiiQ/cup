import { NextApiResponse } from 'next'
import { NextApiResponseServerIO } from '@/lib/socket'

export async function sendTeamsUpdate(res: NextApiResponse | NextApiResponseServerIO) {
  try {
    // Fetch current teams data
    const { prisma } = await import('@/lib/prisma')
    
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                inGameName: true,
                rank: true,
                tier: true,
                isVerified: true,
                discord: true,
                twitch: true,
                isStreamer: true,
              }
            }
          },
          orderBy: {
            assignedAt: 'asc'
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    })

    // Transform data for frontend
    const transformedTeams = teams.map((team: any) => ({
      id: team.id,
      name: team.name,
      position: team.position,
      imageUrl: team.imageUrl,
      members: team.members.map((member: any, index: number) => ({
        id: member.user.id,
        username: member.user.username,
        inGameName: member.user.inGameName,
        rank: member.user.rank,
        tier: member.user.tier,
        isVerified: member.user.isVerified,
        discord: member.user.discord,
        twitch: member.user.twitch,
        isStreamer: member.user.isStreamer,
        role: member.role || (index === 0 ? 'leader' : 'member'),
      }))
    }))

    // Send via WebSocket if available
    const socketRes = res as NextApiResponseServerIO
    if (socketRes.socket?.server?.io) {
      console.log('📡 Broadcasting teams update via WebSocket')
      socketRes.socket.server.io.to('teams-updates').emit('teams-updated', transformedTeams)
    } else {
      console.log('⚠️ WebSocket not available for broadcasting')
    }

    return transformedTeams
  } catch (error) {
    console.error('❌ Error sending teams update:', error)
    return null
  }
}
