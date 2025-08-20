'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  username: string
  inGameName: string
  inGameRank: string
  discordName: string
  twitchName: string
  instagramName: string
  tier: string
  isVerified: boolean
  rulesAccepted: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoggedIn: boolean
  loading: boolean
  login: (token: string, userData: User) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      setUser(null)
      setToken(null)
      setIsLoggedIn(false)
      setLoading(false)
      return
    }

    setToken(storedToken)

    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        },
        credentials: 'include' // Include cookies for proper authentication
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          setUser(data.user)
          setIsLoggedIn(true)
        } else {
          // Clear everything if user data is invalid
          localStorage.removeItem('token')
          setUser(null)
          setToken(null)
          setIsLoggedIn(false)
        }
      } else {
        // Clear everything if response is not ok
        localStorage.removeItem('token')
        setUser(null)
        setToken(null)
        setIsLoggedIn(false)
      }
    } catch (error) {
      console.error('Auth refresh error:', error)
      // Clear everything on error
      localStorage.removeItem('token')
      setUser(null)
      setToken(null)
      setIsLoggedIn(false)
    } finally {
      setLoading(false)
    }
  }

  const login = (tokenValue: string, userData: User) => {
    localStorage.setItem('token', tokenValue)
    setToken(tokenValue)
    setUser(userData)
    setIsLoggedIn(true)
    
    // Trigger auth change event to notify other components
    window.dispatchEvent(new Event('authChange'))
  }

  const logout = async () => {
    // Clear localStorage first
    localStorage.removeItem('token')
    
    // Clear state immediately
    setToken(null)
    setUser(null)
    setIsLoggedIn(false)
    
    // Also call the logout API to clear server-side cookies
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' // Include cookies for proper logout
      })
    } catch (error) {
      console.error('Logout API error:', error)
    }
    
    // Trigger auth change event
    window.dispatchEvent(new Event('authChange'))
  }

  useEffect(() => {
    refreshUser()

    const handleAuthChange = () => {
      refreshUser()
    }

    window.addEventListener('authChange', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)

    return () => {
      window.removeEventListener('authChange', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, [])

  const value = {
    user,
    token,
    isLoggedIn,
    loading,
    login,
    logout,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
