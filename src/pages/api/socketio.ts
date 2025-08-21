import { NextApiRequest } from 'next'
import { Server as ServerIO } from 'socket.io'
import { Server as NetServer } from 'http'
import { NextApiResponseServerIO } from '@/lib/socket'

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    console.log('✅ Socket is already running')
  } else {
    console.log('🔄 Socket is initializing')
    const io = new ServerIO(res.socket.server as any, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: "*",
      },
    })
    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('🔌 User connected:', socket.id)
      
      socket.on('join-teams', () => {
        socket.join('teams-updates')
        console.log('👥 User joined teams updates:', socket.id)
      })

      socket.on('leave-teams', () => {
        socket.leave('teams-updates')
        console.log('👋 User left teams updates:', socket.id)
      })

      socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id)
      })
    })
  }
  res.end()
}
