'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  inGameName?: string
  tier: string
  isStreamer: boolean
}

interface Team {
  id: string
  name: string
  position: number
  memberCount: number
}

export default function WheelPage() {
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedTier, setSelectedTier] = useState('all')
  const [streamerFilter, setStreamerFilter] = useState('all') // 'all', 'streamers', 'non-streamers'
  const [selectedTeam, setSelectedTeam] = useState('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [rotation, setRotation] = useState(0)
  const wheelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, selectedTier, streamerFilter])

  const fetchData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        fetch('/api/admin/wheel/users'),
        fetch('/api/admin/wheel/teams')
      ])

      // Check if admin is authenticated
      if (usersRes.status === 401 || teamsRes.status === 401) {
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

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeams(teamsData.teams || [])
      } else {
        console.error('Failed to fetch teams:', teamsRes.status)
        setTeams([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setUsers([])
      setTeams([])
    }
  }

  const filterUsers = () => {
    let filtered = users
    
    // Tier Filter
    if (selectedTier === 'all') {
      // Nur User mit gültigen Tiers (tier1, tier2, tier3)
      filtered = users.filter(user => user.tier && ['tier1', 'tier2', 'tier3'].includes(user.tier))
    } else {
      filtered = users.filter(user => user.tier === selectedTier)
    }
    
    // Streamer Filter
    if (streamerFilter === 'streamers') {
      filtered = filtered.filter(user => user.isStreamer === true)
    } else if (streamerFilter === 'non-streamers') {
      filtered = filtered.filter(user => user.isStreamer === false)
    }
    // 'all' zeigt alle User (keine zusätzliche Filterung nötig)
    
    setFilteredUsers(filtered)
  }

  const spinWheel = () => {
    if (filteredUsers.length === 0 || !selectedTeam || isSpinning) return

    setIsSpinning(true)
    setSelectedUser(null)

    // Random rotation between 3 and 8 full rotations plus random angle
    const randomRotation = (3 + Math.random() * 5) * 360 + Math.random() * 360
    setRotation(prev => prev + randomRotation)

    // Select random user
    const randomIndex = Math.floor(Math.random() * filteredUsers.length)
    const winner = filteredUsers[randomIndex]

    setTimeout(() => {
      setSelectedUser(winner)
      setIsSpinning(false)
    }, 3000)
  }

  const assignToTeam = async () => {
    if (!selectedUser || !selectedTeam) return

    try {
      const response = await fetch('/api/admin/wheel/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          teamId: selectedTeam
        }),
      })

      if (response.ok) {
        // Remove user from available users
        setUsers(users.filter(u => u.id !== selectedUser.id))
        setSelectedUser(null)
        // Refresh teams data
        await fetchData()
        alert(`${selectedUser.username} wurde erfolgreich zum Team hinzugefügt!`)
      } else {
        const error = await response.json()
        alert('Fehler: ' + error.error)
      }
    } catch (error) {
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const availableTeams = teams.filter(team => team.memberCount < 6)

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex justify-between items-center">
            <div className="text-2xl font-bold text-purple-400">
              🎯 GLÜCKSRAD
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Zurück zum Dashboard
            </button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Main Content - Better Layout */}
        <div className="max-w-7xl mx-auto">
          
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🎯 Team Zulosung</h1>
            <p className="text-gray-400">Verwende das Glücksrad für faire Team-Zuteilungen</p>
          </div>

          {/* Controls Section - Top Bar */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Tier Filter:</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="all">Alle spinnbaren Tiers ({users.filter(u => u.tier && ['tier1', 'tier2', 'tier3'].includes(u.tier)).length} User)</option>
                  <option value="tier1">Tier 1 ({users.filter(u => u.tier === 'tier1').length} User)</option>
                  <option value="tier2">Tier 2 ({users.filter(u => u.tier === 'tier2').length} User)</option>
                  <option value="tier3">Tier 3 ({users.filter(u => u.tier === 'tier3').length} User)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">🎥 Streamer Filter:</label>
                <select
                  value={streamerFilter}
                  onChange={(e) => setStreamerFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="all">Alle User ({users.length} User)</option>
                  <option value="streamers">🎥 Nur Streamer ({users.filter(u => u.isStreamer).length} User)</option>
                  <option value="non-streamers">👤 Keine Streamer ({users.filter(u => !u.isStreamer).length} User)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Ziel Team:</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="">Team auswählen...</option>
                  {availableTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.memberCount}/6 Mitglieder)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={spinWheel}
                  disabled={filteredUsers.length === 0 || !selectedTeam || isSpinning}
                  className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {isSpinning ? '🎯 Dreht sich...' : '🎯 Rad drehen!'}
                </button>
              </div>
            </div>

            {/* Filter Info - moved down */}
            <div className="bg-blue-800/30 border border-blue-600 rounded-lg p-4 mb-6">
              <div className="flex items-center text-blue-200">
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <p className="font-semibold">Aktuelle Filterung: {filteredUsers.length} verfügbare User</p>
                  <p className="text-sm text-blue-300">
                    {selectedTier === 'all' ? 'Alle Tiers' : selectedTier.toUpperCase()} 
                    {' • '}
                    {streamerFilter === 'all' ? 'Alle User' :
                     streamerFilter === 'streamers' ? 'Nur Streamer' :
                     'Keine Streamer'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-3 gap-8">
            
            {/* Wheel Section - Larger and Centered */}
            <div className="xl:col-span-2 flex flex-col items-center space-y-8">
              
              {/* Larger Wheel */}
              <div className="flex justify-center">
                <div className="relative">
                  <div
                    ref={wheelRef}
                    className="w-96 h-96 md:w-[500px] md:h-[500px] rounded-full border-8 border-purple-600 relative overflow-hidden bg-gradient-to-br from-purple-800 via-purple-600 to-pink-600 shadow-2xl"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: isSpinning ? 'transform 3s cubic-bezier(0.23, 1, 0.32, 1)' : 'none'
                    }}
                  >
                    {/* Wheel segments */}
                    {filteredUsers.slice(0, 12).map((user, index) => {
                      const angle = (360 / Math.min(filteredUsers.length, 12)) * index
                      
                      return (
                        <div
                          key={user.id}
                          className="absolute inset-0"
                          style={{
                            transform: `rotate(${angle}deg)`,
                            transformOrigin: 'center'
                          }}
                        >
                          <div
                            className="absolute text-white text-xs md:text-sm font-semibold whitespace-nowrap text-center"
                            style={{
                              top: '15px',
                              left: '50%',
                              transform: `translateX(-50%) rotate(${-angle}deg)`,
                              transformOrigin: 'center',
                              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                              maxWidth: '80px'
                            }}
                          >
                            {user.username.length > 10 ? user.username.substring(0, 8) + '...' : user.username}
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Center circle */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 bg-gray-800 rounded-full border-4 border-white flex items-center justify-center shadow-xl">
                      <span className="text-white font-bold text-xl md:text-2xl">🎯</span>
                    </div>
                  </div>
                  
                  {/* Pointer */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3">
                    <div className="w-0 h-0 border-l-6 border-r-6 border-b-12 border-l-transparent border-r-transparent border-b-yellow-400 shadow-lg"></div>
                  </div>
                </div>
              </div>

              {/* Result Section */}
              {selectedUser && (
                <div className="bg-gradient-to-r from-green-800 to-green-700 rounded-xl p-8 border border-green-600 shadow-xl max-w-md w-full">
                  <h3 className="text-2xl font-bold text-white mb-4 text-center">🎉 Gewinner!</h3>
                  <div className="text-white space-y-2 text-center">
                    <p className="text-xl font-semibold">
                      {selectedUser.isStreamer && '🎥 '}
                      {selectedUser.username}
                      {selectedUser.isStreamer && ' (Streamer)'}
                    </p>
                    <p><strong>In-Game:</strong> {selectedUser.inGameName || 'Nicht angegeben'}</p>
                    <p><strong>Tier:</strong> <span className="uppercase bg-white/20 px-2 py-1 rounded">{selectedUser.tier}</span></p>
                    {selectedUser.isStreamer && (
                      <p><strong>Status:</strong> <span className="bg-purple-500/30 px-2 py-1 rounded">🎥 Streamer</span></p>
                    )}
                  </div>
                  <button
                    onClick={assignToTeam}
                    className="mt-6 w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
                  >
                    Zum Team hinzufügen
                  </button>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              
              {/* Available Users List */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Verfügbare User ({filteredUsers.length})
                </h2>
                
                <div className="bg-gray-800 rounded-xl border border-gray-700 max-h-96 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-6 text-gray-400 text-center">
                      Keine verfügbaren User für die ausgewählten Filter
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex justify-between items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          <div className="text-white">
                            <div className="font-semibold">
                              {user.isStreamer && '🎥 '}
                              {user.username}
                            </div>
                            <div className="text-sm text-gray-300">
                              {user.inGameName || 'Kein In-Game Name'}
                              {user.isStreamer && ' • Streamer'}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.tier === 'tier1' ? 'bg-blue-600 text-white' :
                            user.tier === 'tier2' ? 'bg-green-600 text-white' :
                            user.tier === 'tier3' ? 'bg-yellow-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {user.tier ? user.tier.toUpperCase() : 'KEIN TIER'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Teams Overview */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Teams Übersicht</h3>
                <div className="space-y-3">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex justify-between items-center p-3 bg-gray-700 rounded-lg"
                    >
                      <span className="text-white font-medium">{team.name}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        team.memberCount >= 6 ? 'bg-red-600 text-white' :
                        team.memberCount >= 4 ? 'bg-yellow-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {team.memberCount}/6
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
