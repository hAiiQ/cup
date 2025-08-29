'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  discordName: string | null
  twitchName: string | null
  instagramName: string | null
  tier: string | null
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
  const [tierFilter, setTierFilter] = useState('all')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (filteredUsers.length > 0) {
      drawWheel()
    }
  }, [filteredUsers, currentAngle])

  useEffect(() => {
    filterUsers()
  }, [users, verificationFilter, streamerFilter, tierFilter])

  const fetchData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        fetch('/api/wheel/users'),
        fetch('/api/wheel/teams')
      ])
      
      if (!usersRes.ok || !teamsRes.ok) {
        console.error('API Response nicht OK:', { usersStatus: usersRes.status, teamsStatus: teamsRes.status })
        return
      }
      
      const usersData = await usersRes.json()
      const teamsData = await teamsRes.json()
      
      console.log('Daten geladen:', { userCount: usersData.length, teamCount: teamsData.length })
      
      setUsers(usersData || [])
      setTeams(teamsData || [])
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error)
      // Fallback zu leeren Arrays
      setUsers([])
      setTeams([])
    }
  }

  const filterUsers = () => {
    let filtered = users.filter(user => !user.teamId)
    
    if (verificationFilter === 'verified') {
      filtered = filtered.filter(user => 
        user.discordName || user.twitchName || user.instagramName
      )
    } else if (verificationFilter === 'unverified') {
      filtered = filtered.filter(user => 
        !user.discordName && !user.twitchName && !user.instagramName
      )
    }
    
    if (streamerFilter === 'streamers') {
      filtered = filtered.filter(user => user.isStreamer === true)
    } else if (streamerFilter === 'non-streamers') {
      filtered = filtered.filter(user => user.isStreamer === false)
    }
    
    if (tierFilter !== 'all') {
      filtered = filtered.filter(user => user.tier === tierFilter)
    }
    
    setFilteredUsers(filtered)
  }

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas || filteredUsers.length === 0) {
      console.log('Canvas nicht verfügbar oder keine User:', { canvas: !!canvas, userCount: filteredUsers.length })
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Canvas Context nicht verfügbar')
      return
    }

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

    // KORREKTE GEWINNER-BERECHNUNG:
    // 1. Der Zeiger zeigt nach OBEN (12 Uhr = 0°)
    // 2. Segmente starten bei -90° (12 Uhr) und gehen im Uhrzeigersinn
    // 3. Wir wollen, dass der Gewinner unter dem Zeiger (0°) steht
    
    const segmentSize = 360 / filteredUsers.length
    
    // Der Gewinner soll direkt unter dem Zeiger stehen
    // Berechne wie viel das Rad drehen muss, damit der Gewinner oben ist
    const winnerAngleInWheel = randomWinnerIndex * segmentSize + (segmentSize / 2) // Mitte des Gewinner-Segments
    
    // Das Rad dreht sich, also brauchen wir die INVERSE Rotation
    // Wenn Gewinner bei 90° steht, muss Rad um -90° drehen (oder +270°)
    const targetRotation = -winnerAngleInWheel
    
    // Füge 12-15 komplette Drehungen hinzu + die Ziel-Rotation für längeren Spin
    const extraRotations = 12 + Math.random() * 3 // 12-15 volle Drehungen
    const totalRotation = (extraRotations * 360) + targetRotation
    
    console.log('🎯 KORREKTE SPIN-BERECHNUNG:', {
      winnerIndex: randomWinnerIndex,
      winnerName: winner.username,
      segmentSize: segmentSize.toFixed(1) + '°',
      winnerAngleInWheel: winnerAngleInWheel.toFixed(1) + '°',
      targetRotation: targetRotation.toFixed(1) + '°',
      extraRotations: extraRotations.toFixed(1),
      totalRotation: totalRotation.toFixed(1) + '°'
    })

    // 12 Sekunden Animation mit sanfter Verlangsamung für dramatischeren Effekt
    const spinDuration = 12000
    const startTime = Date.now()
    const startAngle = currentAngle

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / spinDuration, 1)
      
      // Dramatischere Verlangsamung - startet schnell, wird langsamer zum Ende
      const easeOut = 1 - Math.pow(1 - progress, 5) // Noch sanftere Verlangsamung
      const newAngle = startAngle + (totalRotation * easeOut)
      
      setCurrentAngle(newAngle % 360)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation beendet - zeige Gewinner
        console.log('✅ SPIN BEENDET - GEWINNER:', winner.username)
        setSelectedUser(winner)
        setIsSpinning(false)
        
        // VERIFIKATION: Welcher User ist jetzt wirklich oben?
        const finalAngle = newAngle % 360
        const normalizedAngle = (360 - finalAngle) % 360 // Rad dreht sich rückwärts
        const segmentAtTop = Math.floor(normalizedAngle / segmentSize) % filteredUsers.length
        
        console.log('🔍 FINALE VERIFIKATION:', {
          finalAngle: finalAngle.toFixed(1) + '°',
          normalizedAngle: normalizedAngle.toFixed(1) + '°',
          segmentAtTop: segmentAtTop,
          expectedWinner: randomWinnerIndex,
          actualUserAtTop: filteredUsers[segmentAtTop]?.username,
          isCorrect: segmentAtTop === randomWinnerIndex ? '✅' : '❌'
        })
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  const assignToTeam = async () => {
    if (!selectedUser || !selectedTeam) return

    try {
      const response = await fetch('/api/wheel/assign', {
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
                    {isSpinning ? '🌀 Dreht sich... (12s)' : '🎯 RAD DREHEN (12s)'}
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
                    {selectedUser.tier && ` • ${selectedUser.tier === 'tier1' ? '🥇 Tier 1' : selectedUser.tier === 'tier2' ? '🥈 Tier 2' : selectedUser.tier === 'tier3' ? '🥉 Tier 3' : selectedUser.tier}`}
                  </p>
                  <div className="mt-2 text-sm text-green-200">
                    {selectedUser.discordName && <p>Discord: {selectedUser.discordName}</p>}
                    {selectedUser.twitchName && <p>Twitch: {selectedUser.twitchName}</p>}
                    {selectedUser.instagramName && <p>Instagram: @{selectedUser.instagramName}</p>}
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tier-Filter:
                  </label>
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  >
                    <option value="all">Alle Tiers</option>
                    <option value="tier1">🥇 Tier 1</option>
                    <option value="tier2">🥈 Tier 2</option>
                    <option value="tier3">🥉 Tier 3</option>
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
