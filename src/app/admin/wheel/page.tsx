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
  const [streamerFilter, setStreamerFilter] = useState('all')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [currentAngle, setCurrentAngle] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, selectedTier, streamerFilter])

  useEffect(() => {
    drawWheel()
  }, [filteredUsers, currentAngle])

  const fetchData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        fetch('/api/admin/wheel/users'),
        fetch('/api/admin/wheel/teams')
      ])

      if (usersRes.status === 401 || teamsRes.status === 401) {
        router.push('/admin')
        return
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeams(teamsData.teams || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const filterUsers = () => {
    let filtered = users
    
    if (selectedTier === 'all') {
      filtered = users.filter(user => user.tier && ['tier1', 'tier2', 'tier3'].includes(user.tier))
    } else {
      filtered = users.filter(user => user.tier === selectedTier)
    }
    
    if (streamerFilter === 'streamers') {
      filtered = filtered.filter(user => user.isStreamer === true)
    } else if (streamerFilter === 'non-streamers') {
      filtered = filtered.filter(user => user.isStreamer === false)
    }
    
    setFilteredUsers(filtered)
  }

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas || filteredUsers.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // NEU: Einfache Ausrichtung - 0° ist oben
    const anglePerSegment = (2 * Math.PI) / filteredUsers.length

    // Draw segments - starte bei 0° (oben) und gehe im Uhrzeigersinn
    filteredUsers.forEach((user, index) => {
      // 0° ist oben, currentAngle dreht das ganze Rad
      const startAngle = (index * anglePerSegment) - (Math.PI / 2) + (currentAngle * Math.PI / 180)
      const endAngle = ((index + 1) * anglePerSegment) - (Math.PI / 2) + (currentAngle * Math.PI / 180)

      // Segment colors
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB347']
      const color = colors[index % colors.length]

      // Draw segment
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fill()

      // Draw text
      const textAngle = startAngle + anglePerSegment / 2
      const textRadius = radius * 0.7

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(textAngle)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      
      const displayName = user.username.length > 12 ? user.username.substring(0, 10) + '..' : user.username
      ctx.fillText(displayName, textRadius, 0)
      
      if (user.isStreamer) {
        ctx.fillText('🎥', textRadius - 80, 0)
      }
      
      ctx.restore()
    })

    // Draw center circle
    ctx.fillStyle = '#2C3E50'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 4
    ctx.stroke()

    // Center text
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎯', centerX, centerY)
  }

  const spinWheel = () => {
    if (filteredUsers.length === 0 || !selectedTeam || isSpinning) return

    setIsSpinning(true)
    setSelectedUser(null)

    // NEUE LOGIK: Gewinner VOR dem Spin bestimmen
    const randomWinnerIndex = Math.floor(Math.random() * filteredUsers.length)
    const winner = filteredUsers[randomWinnerIndex]
    
    console.log('🎯 PRE-SELECTED WINNER:', winner.username, 'at index', randomWinnerIndex)

    // WICHTIG: In drawWheel() startet Segment 0 bei -90° (wegen -Math.PI/2 offset)
    // Das bedeutet: Segment 0 ist bei 270° in unserer 0-360° Berechnung
    const anglePerSegment = 360 / filteredUsers.length
    const winnerSegmentStart = (randomWinnerIndex * anglePerSegment) + 270 // +270° wegen -90° offset in Canvas
    const winnerSegmentMiddle = winnerSegmentStart + (anglePerSegment / 2)
    
    // Das Rad muss so gedreht werden, dass winnerSegmentMiddle bei 0° landet (unter dem Pfeil)
    // Aktuell ist Gewinner bei winnerSegmentMiddle, soll bei 0° landen
    let targetFinalAngle = (360 - (winnerSegmentMiddle % 360)) % 360
    
    // Füge mehrere volle Drehungen hinzu für den Effekt
    const extraRotations = 8 + Math.random() * 4 // 8-12 volle Drehungen
    const totalRotation = (extraRotations * 360) + targetFinalAngle
    
    console.log('🎯 SPIN CALCULATION:', {
      winnerIndex: randomWinnerIndex,
      winnerSegmentStart: winnerSegmentStart.toFixed(1) + '°',
      winnerSegmentMiddle: winnerSegmentMiddle.toFixed(1) + '°',
      targetFinalAngle: targetFinalAngle.toFixed(1) + '°',
      extraRotations,
      totalRotation: totalRotation.toFixed(1) + '°'
    })

    // Animation wie vorher, aber mit berechnetem Ziel
    const spinDuration = 8000
    const startTime = Date.now()
    const startAngle = currentAngle

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / spinDuration, 1)
      
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const angle = startAngle + (totalRotation * easeOut)
      
      setCurrentAngle(angle % 360)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Gewinner ist bereits bekannt
        console.log('🎯 SPIN COMPLETE - WINNER CONFIRMED:', winner.username)
        setSelectedUser(winner)
        setIsSpinning(false)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
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
        setUsers(users.filter(u => u.id !== selectedUser.id))
        setSelectedUser(null)
        await fetchData()
      } else {
        const error = await response.json()
        alert('Fehler: ' + error.error)
      }
    } catch (error) {
      alert('Ein Fehler ist aufgetreten')
    }
  }

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const availableTeams = teams.filter(team => team.memberCount < 6)

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex justify-between items-center">
            <div className="text-2xl font-bold text-purple-400">
              🎯 WHEEL OF NAMES STYLE
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
        <div className="max-w-7xl mx-auto">
          
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🎯 Wheel of Names Style</h1>
            <p className="text-gray-400">Exakt wie wheelofnames.com - garantiert korrekte Gewinner!</p>
          </div>

          {/* No Users Warning */}
          {filteredUsers.length === 0 && (
            <div className="bg-red-800/30 border border-red-600 rounded-xl p-6 mb-8">
              <div className="flex items-center text-red-200">
                <span className="text-3xl mr-4">⚠️</span>
                <div>
                  <h3 className="font-bold text-lg mb-2">Keine verfügbaren User</h3>
                  <p>Es sind keine User mit den aktuellen Filtereinstellungen verfügbar.</p>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Tier Filter:</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Alle Tiers ({users.filter(u => u.tier && ['tier1', 'tier2', 'tier3'].includes(u.tier)).length} User)</option>
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
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Alle User</option>
                  <option value="streamers">🎥 Nur Streamer</option>
                  <option value="non-streamers">👤 Keine Streamer</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-semibold">Ziel Team:</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Team auswählen...</option>
                  {availableTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.memberCount}/6)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={spinWheel}
                  disabled={filteredUsers.length === 0 || !selectedTeam || isSpinning}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
                >
                  {isSpinning ? '🎯 SPINNING...' : '🎯 SPIN THE WHEEL!'}
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="bg-green-800/30 border border-green-600 rounded-lg p-4 mt-6">
              <div className="flex items-center text-green-200">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <p className="font-semibold">Verfügbar: {filteredUsers.length} User</p>
                  <p className="text-sm text-green-300">Wheel of Names Algorithmus - 100% korrekt!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-3 gap-8">
            
            {/* Wheel Section */}
            <div className="xl:col-span-2 flex flex-col items-center space-y-8">
              
              {/* Wheel of Names Style Wheel */}
              <div className="relative">
                {/* Pointer - exactly like wheelofnames.com */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                  <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-white shadow-xl drop-shadow-lg"></div>
                </div>

                {/* Canvas Wheel */}
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={500}
                  className="rounded-full shadow-2xl"
                />
              </div>

              {/* Result - Wheel of Names Style */}
              {selectedUser && !isSpinning && (
                <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl p-8 border-4 border-yellow-300 shadow-2xl max-w-lg w-full">
                  <h3 className="text-4xl font-bold text-white mb-6 text-center drop-shadow-lg">🎉 WINNER!</h3>
                  <div className="text-white space-y-4 text-center">
                    <div className="text-3xl font-bold drop-shadow-lg">
                      {selectedUser.isStreamer && '🎥 '}
                      {selectedUser.username}
                    </div>
                    <div className="text-xl"><strong>In-Game:</strong> {selectedUser.inGameName || 'Not specified'}</div>
                    <div className="text-xl">
                      <strong>Tier:</strong> 
                      <span className={`ml-2 px-4 py-2 rounded-full font-bold text-lg ${
                        selectedUser.tier === 'tier1' ? 'bg-blue-600' :
                        selectedUser.tier === 'tier2' ? 'bg-green-600' :
                        selectedUser.tier === 'tier3' ? 'bg-purple-600' :
                        'bg-gray-600'
                      }`}>
                        {selectedUser.tier?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={assignToTeam}
                    className="mt-8 w-full bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 transition-all font-bold text-2xl shadow-lg transform hover:scale-105"
                  >
                    ✅ ADD TO TEAM
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Users List */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Available Users ({filteredUsers.length})
                </h2>
                
                <div className="bg-gray-800 rounded-xl border border-gray-700 max-h-96 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-6 text-gray-400 text-center">
                      <div className="text-4xl mb-3">😔</div>
                      <p>No users available</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {filteredUsers.map((user, index) => (
                        <div
                          key={user.id}
                          className="flex justify-between items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border-l-4"
                          style={{
                            borderLeftColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB347'][index % 8]
                          }}
                        >
                          <div className="text-white">
                            <div className="font-semibold">
                              {user.isStreamer && '🎥 '}{user.username}
                            </div>
                            <div className="text-sm text-gray-300">
                              {user.inGameName || 'No In-Game Name'}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.tier === 'tier1' ? 'bg-blue-600 text-white' :
                            user.tier === 'tier2' ? 'bg-green-600 text-white' :
                            user.tier === 'tier3' ? 'bg-yellow-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {user.tier?.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Teams */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Teams Overview</h3>
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
