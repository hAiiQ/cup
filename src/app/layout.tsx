import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import { AuthProvider } from '@/contexts/AuthContext'
import { SocketProvider } from '@/contexts/SocketContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tournament Portal',
  description: 'Gaming Tournament Registration and Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <AuthProvider>
          <SocketProvider>
            <div className="min-h-screen bg-image">
              <Navigation />
              {children}
            </div>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
