'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  discordTag: string | null
  twitterHandle: string | null
  twitchHandle: string | null
  instagramHandle: string | null
  isStreamer: boolean
  teamId: string | null
}

interface Team {
  id: string
  name: string
  memberCount: number
}

export default function SimpleWheelPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [currentAngle, setCurrentAngle] = useState(0)
  
  // Filter states
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [streamerFilter, setStreamerFilter] = useState('all')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    drawWheel()
  }, [filteredUsers, currentAngle])

  useEffect(() => {
    filterUsers()
  }, [users, verificationFilter, streamerFilter])

  const fetchData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        fetch('/api/admin/wheel/users'),
        fetch('/api/admin/wheel/teams')
      ])
      
      const usersData = await usersRes.json()
      const teamsData = await teamsRes.json()
      
      setUsers(usersData)
      setTeams(teamsData)
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error)
    }
  }

  const filterUsers = () => {
    let filtered = users.filter(user => !user.teamId)
    
    if (verificationFilter === 'verified') {
      filtered = filtered.filter(user => 
        user.discordTag || user.twitterHandle || user.twitchHandle || user.instagramHandle
      )
    } else if (verificationFilter === 'unverified') {
      filtered = filtered.filter(user => 
        !user.discordTag && !user.twitterHandle && !user.twitchHandle && !user.instagramHandle
      )
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

    // Farben für die Segmente
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB347']

    // Berechne Winkel pro Segment (in Radians)
    const anglePerSegment = (2 * Math.PI) / filteredUsers.length

    // Zeichne alle Segmente
    filteredUsers.forEach((user, index) => {
      // Start-Winkel für dieses Segment - starte bei 12 Uhr und drehe im Uhrzeigersinn
      // currentAngle ist in Grad, umrechnen zu Radians
      const rotationInRadians = (currentAngle * Math.PI) / 180
      const startAngle = (index * anglePerSegment) - (Math.PI / 2) + rotationInRadians
      const endAngle = ((index + 1) * anglePerSegment) - (Math.PI / 2) + rotationInRadians

      // Zeichne Segment
      ctx.fillStyle = colors[index % colors.length]
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fill()

      // Weiße Umrandung
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.stroke()

      // Text im Segment
      const textAngle = startAngle + (anglePerSegment / 2)
      const textRadius = radius * 0.6

      ctx.save()
      ctx.translate(centerX + Math.cos(textAngle) * textRadius, centerY + Math.sin(textAngle) * textRadius)
      ctx.rotate(textAngle + Math.PI / 2)
      
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      const displayName = user.username.length > 10 ? user.username.substring(0, 8) + '..' : user.username
      ctx.fillText(displayName, 0, -5)
      
      if (user.isStreamer) {
        ctx.fillText('🎥', 0, 10)
      }
      
      ctx.restore()
    })

    // Mittelkreis
    ctx.fillStyle = '#2C3E50'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 3
    ctx.stroke()

    // Logo im Zentrum
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚡', centerX, centerY)

    // ZEIGER - zeigt nach OBEN (12 Uhr Position)
    ctx.fillStyle = '#FF0000'
    ctx.beginPath()
    ctx.moveTo(centerX, 15)           // Spitze oben
    ctx.lineTo(centerX - 12, 45)      // Links unten
    ctx.lineTo(centerX + 12, 45)      // Rechts unten
    ctx.closePath()
    ctx.fill()
    
    // Zeiger Umrandung
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  const spinWheel = () => {
    if (filteredUsers.length === 0 || !selectedTeam || isSpinning) return

    setIsSpinning(true)
    setSelectedUser(null)

    // EINFACHE LOGIK: Wähle zufälligen Gewinner
    const randomWinnerIndex = Math.floor(Math.random() * filteredUsers.length)
    const winner = filteredUsers[randomWinnerIndex]
    
    console.log('🎯 GEWINNER VORAB BESTIMMT:', winner.username, 'Index:', randomWinnerIndex)

    // EINFACHE BERECHNUNG: 
    // Jedes Segment hat 360/anzahl Grad
    // Der Zeiger zeigt nach oben (0°)
    // Segment 0 startet bei 270° (-90°), dann im Uhrzeigersinn
    const segmentSize = 360 / filteredUsers.length
    const segmentStartAngle = 270 + (randomWinnerIndex * segmentSize)  // Start des Gewinner-Segments
    const segmentMiddleAngle = segmentStartAngle + (segmentSize / 2)   // Mitte des Gewinner-Segments
    
    // Das Gewinner-Segment soll unter dem Zeiger (0°/360°) landen
    // Drehe das Rad so, dass die Mitte des Gewinner-Segments bei 0° steht
    const rotationNeeded = (360 - (segmentMiddleAngle % 360)) % 360
    
    // Füge 8 komplette Drehungen hinzu für den visuellen Effekt
    const totalRotation = (8 * 360) + rotationNeeded
    
    console.log('🔄 SPIN-BERECHNUNG:', {
      segmentSize: segmentSize.toFixed(1) + '°',
      segmentStart: segmentStartAngle.toFixed(1) + '°',
      segmentMiddle: segmentMiddleAngle.toFixed(1) + '°',
      rotationNeeded: rotationNeeded.toFixed(1) + '°',
      totalRotation: totalRotation.toFixed(1) + '°'
    })

    // 8 Sekunden Animation mit sanfter Verlangsamung
    const spinDuration = 8000
    const startTime = Date.now()
    const startAngle = currentAngle

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / spinDuration, 1)
      
      // Sanfte Verlangsamung
      const easeOut = 1 - Math.pow(1 - progress, 4)
      const newAngle = startAngle + (totalRotation * easeOut)
      
      setCurrentAngle(newAngle % 360)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation beendet - zeige Gewinner
        console.log('✅ SPIN BEENDET - GEWINNER:', winner.username)
        setSelectedUser(winner)
        setIsSpinning(false)
        
        // VERIFIKATION: Welcher User ist jetzt oben?
        const finalAngle = newAngle % 360
        // Segment das oben steht berechnen
        const adjustedAngle = (finalAngle + 90) % 360  // +90° weil Segment 0 bei 270° startet
        const segmentAtTop = Math.floor(adjustedAngle / segmentSize) % filteredUsers.length
        console.log('🔍 VERIFIKATION:', {
          finalAngle: finalAngle.toFixed(1) + '°',
          adjustedAngle: adjustedAngle.toFixed(1) + '°',
          segmentAtTop: segmentAtTop,
          expectedWinner: randomWinnerIndex,
          actualUserAtTop: filteredUsers[segmentAtTop]?.username
        })
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
              ⚡ VEREINFACHTES GLÜCKSRAD
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Wheel Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              🎰 Glücksrad ({filteredUsers.length} Teilnehmer)
            </h2>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p>Keine verfügbaren Benutzer für das Rad</p>
              </div>
            ) : (
              <div className="text-center">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={400}
                  className="border border-gray-600 rounded-lg mx-auto mb-4"
                />
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Team auswählen:
                    </label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                      disabled={isSpinning}
                    >
                      <option value="">-- Team wählen --</option>
                      {availableTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.memberCount}/6 Mitglieder)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={spinWheel}
                    disabled={!selectedTeam || isSpinning || filteredUsers.length === 0}
                    className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-bold"
                  >
                    {isSpinning ? '🌀 Dreht sich...' : '🎯 RAD DREHEN'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results & Controls */}
          <div className="space-y-6">
            
            {/* Winner Display */}
            {selectedUser && (
              <div className="bg-green-800 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">🏆 GEWINNER!</h3>
                <div className="bg-green-700 rounded-lg p-4">
                  <p className="text-white font-bold text-lg">{selectedUser.username}</p>
                  <p className="text-green-200">
                    {selectedUser.isStreamer ? '🎥 Streamer' : '👤 Teilnehmer'}
                  </p>
                  <div className="mt-2 text-sm text-green-200">
                    {selectedUser.discordTag && <p>Discord: {selectedUser.discordTag}</p>}
                    {selectedUser.twitterHandle && <p>Twitter: @{selectedUser.twitterHandle}</p>}
                    {selectedUser.twitchHandle && <p>Twitch: {selectedUser.twitchHandle}</p>}
                    {selectedUser.instagramHandle && <p>Instagram: @{selectedUser.instagramHandle}</p>}
                  </div>
                </div>
                <button
                  onClick={assignToTeam}
                  disabled={!selectedTeam}
                  className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 transition-colors"
                >
                  Zu Team hinzufügen
                </button>
              </div>
            )}

            {/* Filters */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">🔍 Filter</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Verifizierung:
                  </label>
                  <select
                    value={verificationFilter}
                    onChange={(e) => setVerificationFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  >
                    <option value="all">Alle Benutzer</option>
                    <option value="verified">Nur verifizierte</option>
                    <option value="unverified">Nur unverifizierte</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Streamer-Status:
                  </label>
                  <select
                    value={streamerFilter}
                    onChange={(e) => setStreamerFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  >
                    <option value="all">Alle</option>
                    <option value="streamers">Nur Streamer</option>
                    <option value="non-streamers">Nur Nicht-Streamer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">📊 Statistiken</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-700 rounded-lg p-3">
                  <p className="text-2xl font-bold text-purple-400">{filteredUsers.length}</p>
                  <p className="text-sm text-gray-300">Im Rad</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-400">{availableTeams.length}</p>
                  <p className="text-sm text-gray-300">Verfügbare Teams</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
