'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

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
  twitchVerified: boolean
  instagramVerified: boolean
  discordVerified: boolean
  inGameNameVerified: boolean
  inGameRankVerified: boolean
  rulesAccepted: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    inGameName: '',
    inGameRank: '',
    discordName: '',
    twitchName: '',
    instagramName: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    console.log('Dashboard useEffect - Token check:', token ? 'EXISTS' : 'NOT FOUND')
    
    if (!token) {
      console.log('No token found, redirecting to login')
      router.push('/login')
      return
    }

    console.log('Token found, fetching user profile...')
    fetchUserProfile()
  }, [router])

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('No token in fetchUserProfile, redirecting to login')
        router.push('/login')
        return
      }

      console.log('Making API call to /api/user/profile with token') // Debug

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('Profile API response status:', response.status) // Debug

      if (response.ok) {
        const data = await response.json()
        console.log('Profile API response data:', data) // Debug
        
        if (data.success && data.user) {
          console.log('Setting user data:', data.user)
          setUser(data.user)
          
          // Update edit form with current user data
          setEditForm({
            inGameName: data.user.inGameName || '',
            inGameRank: data.user.inGameRank || '',
            discordName: data.user.discordName || '',
            twitchName: data.user.twitchName || '',
            instagramName: data.user.instagramName || ''
          })
          
          // Regel-Überprüfung entfernt - gehe direkt zum Dashboard
          console.log('User data loaded successfully, staying on dashboard')
        } else {
          console.log('Profile request failed with data:', data)
          localStorage.removeItem('token')
          router.push('/login')
        }
      } else {
        console.log('Profile request failed with status:', response.status)
        const errorText = await response.text()
        console.log('Error response text:', errorText)
        localStorage.removeItem('token')
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      localStorage.removeItem('token')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      router.push('/')
    }
  }

  const handleEditProfile = () => {
    setEditMode(true)
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    // Reset form to current user data
    if (user) {
      setEditForm({
        inGameName: user.inGameName || '',
        inGameRank: user.inGameRank || '',
        discordName: user.discordName || '',
        twitchName: user.twitchName || '',
        instagramName: user.instagramName || ''
      })
    }
  }

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.user)
          setEditMode(false)
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-image flex items-center justify-center">
        <div className="text-white text-xl">Lade Dashboard...</div>
      </div>
    )
  }

  return (
    <>
      {/* Main Dashboard Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-xl p-8 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">
                    🎮 Willkommen, {user?.inGameName || user?.username}!
                  </h1>
                  <p className="text-white/80 text-lg">
                    Du bist für das JOEDOM'S PATH OF LOKI Tournament registriert
                  </p>
                </div>
                <div className="hidden md:block">
                  {(() => {
                    const hasAccounts = user?.twitchName || user?.instagramName || user?.discordName
                    const hasInGameInfo = user?.inGameName || user?.inGameRank
                    const allSocialVerified = (!user?.twitchName || user?.twitchVerified) && 
                                             (!user?.instagramName || user?.instagramVerified) && 
                                             (!user?.discordName || user?.discordVerified)
                    const allInGameVerified = (!user?.inGameName || user?.inGameNameVerified) && 
                                             (!user?.inGameRank || user?.inGameRankVerified)
                    const hasVerified = user?.twitchVerified || user?.instagramVerified || user?.discordVerified || 
                                      user?.inGameNameVerified || user?.inGameRankVerified
                    
                    if (!hasAccounts && !hasInGameInfo) {
                      return (
                        <div className="bg-gray-600/30 border border-gray-500 rounded-xl px-6 py-3 text-center">
                          <div className="text-3xl mb-2">📝</div>
                          <div className="text-gray-300 font-medium">Keine Infos</div>
                          <div className="text-gray-400 text-sm">Profil vervollständigen</div>
                        </div>
                      )
                    } else if (allSocialVerified && allInGameVerified) {
                      return (
                        <div className="bg-green-600/30 border border-green-400 rounded-xl px-6 py-3 text-center">
                          <div className="text-3xl mb-2">✅</div>
                          <div className="text-green-200 font-medium">Vollständig</div>
                          <div className="text-green-300 text-sm">Alle Daten verifiziert</div>
                        </div>
                      )
                    } else if (hasVerified) {
                      return (
                        <div className="bg-yellow-600/30 border border-yellow-400 rounded-xl px-6 py-3 text-center">
                          <div className="text-3xl mb-2">⏳</div>
                          <div className="text-yellow-200 font-medium">Teilweise</div>
                          <div className="text-yellow-300 text-sm">Verifikation läuft</div>
                        </div>
                      )
                    } else {
                      return (
                        <div className="bg-red-600/30 border border-red-400 rounded-xl px-6 py-3 text-center">
                          <div className="text-3xl mb-2">❌</div>
                          <div className="text-red-200 font-medium">Ausstehend</div>
                          <div className="text-red-300 text-sm">Verifikation nötig</div>
                        </div>
                      )
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            
            {/* Profile Section - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 h-full">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-white flex items-center">
                    <span className="mr-3">�</span>
                    Dein Profil
                  </h2>
                  {!editMode && (
                    <button
                      onClick={handleEditProfile}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all hover:scale-105 flex items-center"
                    >
                      <span className="mr-2">✏️</span>
                      Bearbeiten
                    </button>
                  )}
                </div>
                
                {!editMode ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Player Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-white/90 mb-3 border-b border-white/20 pb-2">🎮 Spieler Daten</h3>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/70 text-sm mb-1">Username</div>
                        <div className="text-white font-medium text-lg">{user?.username}</div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/70 text-sm mb-1">In-Game Name</div>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            {user?.inGameName || <span className="text-gray-400 italic">Nicht angegeben</span>}
                          </span>
                          {user?.inGameName && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user?.inGameNameVerified 
                                ? 'bg-green-600/20 text-green-300 border border-green-500' 
                                : 'bg-yellow-600/20 text-yellow-300 border border-yellow-500'
                            }`}>
                              {user?.inGameNameVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/70 text-sm mb-1">Rank</div>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            {user?.inGameRank || <span className="text-gray-400 italic">Nicht angegeben</span>}
                          </span>
                          {user?.inGameRank && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user?.inGameRankVerified 
                                ? 'bg-green-600/20 text-green-300 border border-green-500' 
                                : 'bg-yellow-600/20 text-yellow-300 border border-yellow-500'
                            }`}>
                              {user?.inGameRankVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/70 text-sm mb-1">Tier</div>
                        <div className="text-white font-medium">
                          {user?.tier ? (
                            <span className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-500">
                              {user.tier.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-yellow-400 italic">Wird vom Admin zugewiesen</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Social Media */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-white/90 mb-3 border-b border-white/20 pb-2">🌐 Social Media</h3>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/70 text-sm mb-1 flex items-center">
                          <span className="mr-2">💬</span>
                          Discord
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            {user?.discordName || <span className="text-gray-400 italic">Nicht angegeben</span>}
                          </span>
                          {user?.discordName && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user?.discordVerified 
                                ? 'bg-green-600/20 text-green-300 border border-green-500' 
                                : 'bg-yellow-600/20 text-yellow-300 border border-yellow-500'
                            }`}>
                              {user?.discordVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/70 text-sm mb-1 flex items-center">
                          <span className="mr-2">🎥</span>
                          Twitch
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            {user?.twitchName || <span className="text-gray-400 italic">Nicht angegeben</span>}
                          </span>
                          {user?.twitchName && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user?.twitchVerified 
                                ? 'bg-green-600/20 text-green-300 border border-green-500' 
                                : 'bg-yellow-600/20 text-yellow-300 border border-yellow-500'
                            }`}>
                              {user?.twitchVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/70 text-sm mb-1 flex items-center">
                          <span className="mr-2">📸</span>
                          Instagram
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            {user?.instagramName || <span className="text-gray-400 italic">Nicht angegeben</span>}
                          </span>
                          {user?.instagramName && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user?.instagramVerified 
                                ? 'bg-green-600/20 text-green-300 border border-green-500' 
                                : 'bg-yellow-600/20 text-yellow-300 border border-yellow-500'
                            }`}>
                              {user?.instagramVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-yellow-600/20 border border-yellow-400 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">✏️</span>
                        <div>
                          <div className="text-yellow-200 font-medium">Profil bearbeiten</div>
                          <div className="text-yellow-300 text-sm">Vervollständige deine Informationen für die Verifikation</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Player Info Edit */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white/90 mb-3 border-b border-white/20 pb-2">🎮 Spieler Daten</h3>
                        
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="text-white/70 text-sm mb-1">Username</div>
                          <div className="text-white font-medium">{user?.username}</div>
                          <div className="text-xs text-gray-400 mt-1">Username kann nicht geändert werden</div>
                        </div>

                        <div className="bg-white/5 rounded-lg p-4">
                          <label className="block text-white/70 text-sm mb-2">In-Game Name</label>
                          <input
                            type="text"
                            value={editForm.inGameName}
                            onChange={(e) => handleInputChange('inGameName', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                            placeholder="Dein In-Game Name"
                          />
                        </div>

                        <div className="bg-white/5 rounded-lg p-4">
                          <label className="block text-white/70 text-sm mb-2">Rank</label>
                          <select
                            value={editForm.inGameRank}
                            onChange={(e) => handleInputChange('inGameRank', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="" className="bg-gray-800">Wähle deinen Rank</option>
                            <option value="Gold" className="bg-gray-800">Gold</option>
                            <option value="Platinum" className="bg-gray-800">Platinum</option>
                            <option value="Diamond" className="bg-gray-800">Diamond</option>
                            <option value="Grandmaster" className="bg-gray-800">Grandmaster</option>
                            <option value="Celestial" className="bg-gray-800">Celestial</option>
                            <option value="Eternity" className="bg-gray-800">Eternity</option>
                            <option value="One Above All" className="bg-gray-800">One Above All</option>
                          </select>
                        </div>

                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="text-white/70 text-sm mb-1">Tier</div>
                          <div className="text-white font-medium">
                            {user?.tier ? (
                              <span className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-500">
                                {user.tier.toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-yellow-400 italic">Wird vom Admin zugewiesen</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Tier wird vom Admin zugewiesen</div>
                        </div>
                      </div>

                      {/* Social Media Edit */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white/90 mb-3 border-b border-white/20 pb-2">🌐 Social Media</h3>
                        
                        <div className="bg-white/5 rounded-lg p-4">
                          <label className="block text-white/70 text-sm mb-2 flex items-center">
                            <span className="mr-2">💬</span>
                            Discord
                          </label>
                          <input
                            type="text"
                            value={editForm.discordName}
                            onChange={(e) => handleInputChange('discordName', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                            placeholder="Dein Discord Name (z.B. username#1234)"
                          />
                        </div>

                        <div className="bg-white/5 rounded-lg p-4">
                          <label className="block text-white/70 text-sm mb-2 flex items-center">
                            <span className="mr-2">🎥</span>
                            Twitch
                          </label>
                          <input
                            type="text"
                            value={editForm.twitchName}
                            onChange={(e) => handleInputChange('twitchName', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                            placeholder="Dein Twitch Kanal Name"
                          />
                        </div>

                        <div className="bg-white/5 rounded-lg p-4">
                          <label className="block text-white/70 text-sm mb-2 flex items-center">
                            <span className="mr-2">📸</span>
                            Instagram
                          </label>
                          <input
                            type="text"
                            value={editForm.instagramName}
                            onChange={(e) => handleInputChange('instagramName', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                            placeholder="Dein Instagram Name"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-4 pt-6">
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center justify-center"
                      >
                        <span className="mr-2">💾</span>
                        Speichern
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center justify-center"
                      >
                        <span className="mr-2">❌</span>
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tournament Status Sidebar */}
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-3">🏆</span>
                  Tournament Status
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500 rounded-lg p-4">
                    <div className="text-purple-200 font-medium text-sm">Registriert für:</div>
                    <div className="text-white text-lg font-bold mt-1">JOEDOM'S PATH OF LOKI</div>
                    <div className="text-purple-200 text-sm mt-1">Marvel Rivals Tournament</div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/70 text-sm mb-2">Status</div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-green-300 font-medium">Registriert</span>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/70 text-sm mb-2">Team</div>
                    <div className="text-yellow-300 font-medium">
                      ⚡ Automatische Zuteilung durch Admin
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="mr-3">📊</span>
                  Quick Stats
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Format:</span>
                    <span className="text-white font-medium">Double Elimination</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Teams:</span>
                    <span className="text-white font-medium">8 Teams</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Max Spieler:</span>
                    <span className="text-white font-medium">6 pro Team</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Spiel:</span>
                    <span className="text-white font-medium">Marvel Rivals</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Link href="/bracket" className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all hover:scale-105 group">
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
                <h3 className="text-white font-semibold mb-2 text-lg">Tournament Bracket</h3>
                <p className="text-white/70 text-sm">Verfolge das aktuelle Tournament Bracket</p>
              </div>
            </Link>
            
            <Link href="/teams" className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all hover:scale-105 group">
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">👥</div>
                <h3 className="text-white font-semibold mb-2 text-lg">Teams</h3>
                <p className="text-white/70 text-sm">Übersicht aller Teams und Spieler</p>
              </div>
            </Link>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 opacity-75">
              <div className="text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-white font-semibold mb-2 text-lg">Dein Team</h3>
                <p className="text-white/70 text-sm">Wird durch Admin zugewiesen</p>
              </div>
            </div>
          </div>

          {/* Tournament Rules & Info */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-xl p-8 border border-blue-500/30">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <span className="mr-3">ℹ️</span>
              Tournament Information
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-blue-300 font-medium text-sm mb-1">Format</div>
                <div className="text-white text-lg font-semibold">Double Elimination</div>
                <div className="text-blue-200 text-xs mt-1">Winner & Loser Bracket</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-purple-300 font-medium text-sm mb-1">Teams</div>
                <div className="text-white text-lg font-semibold">8 Teams</div>
                <div className="text-purple-200 text-xs mt-1">Max. 6 Spieler pro Team</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-pink-300 font-medium text-sm mb-1">Spiel</div>
                <div className="text-white text-lg font-semibold">Marvel Rivals</div>
                <div className="text-pink-200 text-xs mt-1">Competitive 6v6</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-green-300 font-medium text-sm mb-1">Status</div>
                <div className="text-white text-lg font-semibold">Anmeldung offen</div>
                <div className="text-green-200 text-xs mt-1">Registrierung aktiv</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
