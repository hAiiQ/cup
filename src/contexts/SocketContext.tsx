'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { io as ClientIO, Socket } from 'socket.io-client'

type SocketContextType = {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export const useSocket = () => {
  return useContext(SocketContext)
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const socketInstance = ClientIO(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      path: '/api/socketio',
      addTrailingSlash: false,
    })

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected:', socketInstance.id)
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket disconnected')
      setIsConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
