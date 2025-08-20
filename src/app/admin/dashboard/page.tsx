'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  username: string
  inGameName?: string
  inGameRank?: string
  discordName?: string
  twitchName?: string
  instagramName?: string
  tier?: string
  isStreamer: boolean
  isVerified: boolean
  rulesAccepted: boolean
  twitchVerified: boolean
  instagramVerified: boolean
  discordVerified: boolean
  inGameNameVerified: boolean
  inGameRankVerified: boolean
  createdAt: string
  teamMemberships?: {
    team: {
      id: string
      name: string
    }
  }[]
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats')
      ])

      // Check if admin is authenticated
      if (usersRes.status === 401 || statsRes.status === 401) {
        console.log('Admin not authenticated, redirecting to login...')
        router.push('/admin')
        return
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      } else {
        console.error('Failed to fetch users:', usersRes.status)
        setUsers([])
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      } else {
        console.error('Failed to fetch stats:', statsRes.status)
        setStats({ totalUsers: 0, verifiedUsers: 0, unverifiedUsers: 0 })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setUsers([])
      setStats({ totalUsers: 0, verifiedUsers: 0, unverifiedUsers: 0 })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Bist du sicher, dass du den Benutzer "${username}" löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return
    }

    setDeletingUser(userId)
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Remove user from local state
        setUsers(prev => prev.filter(u => u.id !== userId))
        // Refresh stats
        await fetchData()
        alert(`Benutzer "${username}" wurde erfolgreich gelöscht.`)
      } else {
        const data = await response.json()
        alert(data.error || 'Fehler beim Löschen des Users')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Ein Fehler ist aufgetreten beim Löschen des Users')
    } finally {
      setDeletingUser(null)
    }
  }

  const toggleSocialVerification = async (userId: string, platform: 'twitch' | 'instagram' | 'discord' | 'inGameName' | 'inGameRank', currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/social-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          verified: !currentStatus
        }),
      })

      if (response.ok) {
        // Update local state
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { 
                ...u, 
                [`${platform}Verified`]: !currentStatus,
                // Update overall verification status
                isVerified: platform === 'twitch' ? !currentStatus : u.twitchVerified &&
                           platform === 'instagram' ? !currentStatus : u.instagramVerified &&
                           platform === 'discord' ? !currentStatus : u.discordVerified
              } 
            : u
        ))
      } else {
        alert('Fehler beim Aktualisieren der Verifikation')
      }
    } catch (error) {
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const updateTier = async (userId: string, tier: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/tier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      })

      if (response.ok) {
        // Update local state
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, tier } 
            : u
        ))
      } else {
        alert('Fehler beim Aktualisieren des Tiers')
      }
    } catch (error) {
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const updateTeamAssignment = async (userId: string, teamName: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamName }),
      })

      if (response.ok) {
        // Refresh user data to get updated team assignments
        await fetchData()
      } else {
        const data = await response.json()
        alert(data.error || 'Fehler beim Aktualisieren der Team-Zuweisung')
      }
    } catch (error) {
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const toggleStreamerStatus = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/toggle-streamer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const data = await response.json()
        // Update local state
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, isStreamer: data.isStreamer } 
            : u
        ))
      } else {
        alert('Fehler beim Aktualisieren des Streamer Status')
      }
    } catch (error) {
      alert('Ein Fehler ist aufgetreten')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Admin Dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex justify-between items-center">
            <div className="text-2xl font-bold text-red-400">
              🔒 ADMIN PANEL
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Administrator</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Abmelden
              </button>
            </div>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Übersicht
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'users'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            User Management
          </button>
          <Link
            href="/admin/wheel"
            className="px-6 py-3 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            🎯 Glücksrad
          </Link>
          <Link
            href="/admin/bracket"
            className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            🏆 Tournament Bracket
          </Link>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white">Dashboard Übersicht</h1>
            
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-2">Registrierte User</h3>
                <p className="text-3xl font-bold text-blue-400">{stats.totalUsers}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-2">Verifizierte User</h3>
                <p className="text-3xl font-bold text-green-400">{stats.verifiedUsers}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-2">Warten auf Verifikation</h3>
                <p className="text-3xl font-bold text-yellow-400">{stats.unverifiedUsers}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-semibold text-white mb-4">Schnellzugriff</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Link
                  href="/admin/wheel"
                  className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="font-semibold">Glücksrad</div>
                  <div className="text-sm opacity-80">User zu Teams zuweisen</div>
                </Link>
                <Link
                  href="/admin/bracket"
                  className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="font-semibold">Tournament Bracket</div>
                  <div className="text-sm opacity-80">Matches verwalten</div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white">User Management</h1>
            
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-4 text-gray-300">Username</th>
                      <th className="text-left p-4 text-gray-300">In-Game Name</th>
                      <th className="text-left p-4 text-gray-300">Rank</th>
                      <th className="text-left p-4 text-gray-300">Tier & Status</th>
                      <th className="text-left p-4 text-gray-300">Team</th>
                      <th className="text-left p-4 text-gray-300">Twitch</th>
                      <th className="text-left p-4 text-gray-300">Instagram</th>
                      <th className="text-left p-4 text-gray-300">Discord</th>
                      <th className="text-left p-4 text-gray-300">Status</th>
                      <th className="text-left p-4 text-gray-300">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-gray-700">
                        <td className="p-4 text-white">{user.username}</td>
                        
                        {/* In-Game Name Verification */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-gray-300 text-sm">{user.inGameName || '-'}</p>
                            {user.inGameName && (
                              <button
                                onClick={() => toggleSocialVerification(user.id, 'inGameName', user.inGameNameVerified)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  user.inGameNameVerified 
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                }`}
                              >
                                {user.inGameNameVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* In-Game Rank Verification */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-gray-300 text-sm">{user.inGameRank || '-'}</p>
                            {user.inGameRank && (
                              <button
                                onClick={() => toggleSocialVerification(user.id, 'inGameRank', user.inGameRankVerified)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  user.inGameRankVerified 
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                }`}
                              >
                                {user.inGameRankVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                              </button>
                            )}
                          </div>
                        </td>
                        
                        {/* Tier Selection */}
                        <td className="p-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {/* Tier Badge */}
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                user.tier === 'tier1' ? 'bg-blue-600 text-white' :
                                user.tier === 'tier2' ? 'bg-green-600 text-white' :
                                user.tier === 'tier3' ? 'bg-yellow-600 text-white' :
                                'bg-gray-600 text-gray-300'
                              }`}>
                                {user.tier ? user.tier.toUpperCase() : 'KEIN TIER'}
                              </span>
                              
                              {/* Streamer Badge */}
                              {user.isStreamer && (
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-600 text-white">
                                  🎥 STREAMER
                                </span>
                              )}
                            </div>
                            
                            <div className="flex gap-1">
                              {/* Tier Selection */}
                              <select
                                value={user.tier || ''}
                                onChange={(e) => updateTier(user.id, e.target.value)}
                                className="bg-gray-700 border border-gray-600 rounded text-xs text-white px-2 py-1 focus:outline-none focus:border-blue-500 flex-1"
                              >
                                <option value="">Kein Tier</option>
                                <option value="tier1">Tier 1</option>
                                <option value="tier2">Tier 2</option>
                                <option value="tier3">Tier 3</option>
                              </select>
                              
                              {/* Streamer Toggle */}
                              <button
                                onClick={() => toggleStreamerStatus(user.id)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  user.isStreamer 
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                }`}
                                title={user.isStreamer ? 'Streamer Status entfernen' : 'Als Streamer markieren'}
                              >
                                🎥
                              </button>
                            </div>
                          </div>
                        </td>
                        
                        {/* Team Assignment */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-gray-300 text-sm">
                              {user.teamMemberships && user.teamMemberships.length > 0 
                                ? user.teamMemberships[0].team.name 
                                : 'Kein Team'
                              }
                            </p>
                            <select
                              value={user.teamMemberships && user.teamMemberships.length > 0 ? user.teamMemberships[0].team.name : ''}
                              onChange={(e) => updateTeamAssignment(user.id, e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded text-xs text-white px-2 py-1 focus:outline-none focus:border-blue-500"
                            >
                              <option value="">Kein Team</option>
                              <option value="Alpha">Alpha</option>
                              <option value="Beta">Beta</option>
                              <option value="Gamma">Gamma</option>
                              <option value="Delta">Delta</option>
                              <option value="Echo">Echo</option>
                              <option value="Foxtrot">Foxtrot</option>
                              <option value="Golf">Golf</option>
                              <option value="Hotel">Hotel</option>
                            </select>
                          </div>
                        </td>
                        
                        {/* Twitch Verification */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-gray-300 text-sm">{user.twitchName || '-'}</p>
                            {user.twitchName && (
                              <button
                                onClick={() => toggleSocialVerification(user.id, 'twitch', user.twitchVerified)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  user.twitchVerified 
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                }`}
                              >
                                {user.twitchVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Instagram Verification */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-gray-300 text-sm">{user.instagramName || '-'}</p>
                            {user.instagramName && (
                              <button
                                onClick={() => toggleSocialVerification(user.id, 'instagram', user.instagramVerified)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  user.instagramVerified 
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                }`}
                              >
                                {user.instagramVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Discord Verification */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-gray-300 text-sm">{user.discordName || '-'}</p>
                            {user.discordName && (
                              <button
                                onClick={() => toggleSocialVerification(user.id, 'discord', user.discordVerified)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  user.discordVerified 
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                }`}
                              >
                                {user.discordVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Overall Status */}
                        <td className="p-4">
                          {(() => {
                            const hasAccounts = user.twitchName || user.instagramName || user.discordName
                            const hasInGameInfo = user.inGameName || user.inGameRank
                            const allSocialVerified = (!user.twitchName || user.twitchVerified) && 
                                                     (!user.instagramName || user.instagramVerified) && 
                                                     (!user.discordName || user.discordVerified)
                            const allInGameVerified = (!user.inGameName || user.inGameNameVerified) && 
                                                     (!user.inGameRank || user.inGameRankVerified)
                            const hasVerified = user.twitchVerified || user.instagramVerified || user.discordVerified || 
                                              user.inGameNameVerified || user.inGameRankVerified
                            
                            if (!hasAccounts && !hasInGameInfo) {
                              return <span className="bg-gray-600 text-white px-2 py-1 rounded text-sm">Keine Infos</span>
                            } else if (allSocialVerified && allInGameVerified) {
                              return <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">Vollständig verifiziert</span>
                            } else if (hasVerified) {
                              return <span className="bg-yellow-600 text-white px-2 py-1 rounded text-sm">Teilweise verifiziert</span>
                            } else {
                              return <span className="bg-red-600 text-white px-2 py-1 rounded text-sm">Nicht verifiziert</span>
                            }
                          })()}
                        </td>
                        {/* Actions */}
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => deleteUser(user.id, user.username)}
                              disabled={deletingUser === user.id}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center space-x-1"
                            >
                              {deletingUser === user.id ? (
                                <>
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>...</span>
                                </>
                              ) : (
                                <>
                                  <span>🗑️</span>
                                  <span>Löschen</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
