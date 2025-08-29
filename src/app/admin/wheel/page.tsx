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

export default function WheelPage() {
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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Filter states
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [streamerFilter, setStreamerFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')

  // Admin Authentication Check
  useEffect(() => {
    checkAdminAuth()
  }, [])

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/check', {
        credentials: 'include'
      })
      
      if (response.ok) {
        setIsAuthenticated(true)
        fetchData()
      } else {
        console.log('❌ Admin not authenticated, redirecting to login with redirect parameter')
        router.push('/admin?redirect=' + encodeURIComponent('/admin/wheel'))
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/admin?redirect=' + encodeURIComponent('/admin/wheel'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && filteredUsers.length > 0) {
      drawWheel()
    }
  }, [isAuthenticated, filteredUsers, currentAngle])

  useEffect(() => {
    applyFilters()
  }, [users, verificationFilter, streamerFilter, tierFilter])

  const fetchData = async () => {
    try {
      console.log('🎯 Fetching users for wheel (public test)')
      const usersResponse = await fetch('/api/wheel/users', {
        cache: 'no-store'
      })
      
      console.log('🎯 Fetching teams for wheel (public test)')
      const teamsResponse = await fetch('/api/wheel/teams', {
        cache: 'no-store'
      })

      if (usersResponse.ok && teamsResponse.ok) {
        const usersData = await usersResponse.json()
        const teamsData = await teamsResponse.json()
        
        console.log('✅ Data loaded:', { users: usersData.length, teams: teamsData.length })
        setUsers(usersData)
        setTeams(teamsData)
      } else {
        console.error('❌ Failed to fetch data:', { 
          usersStatus: usersResponse.status, 
          teamsStatus: teamsResponse.status 
        })
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error)
    }
  }

  const applyFilters = () => {
    let filtered = users.filter(user => !user.teamId) // Nur Users ohne Team
    
    if (verificationFilter === 'verified') {
      filtered = filtered.filter(user => user.username?.includes('✅') || user.discordName?.includes('✅'))
    } else if (verificationFilter === 'unverified') {
      filtered = filtered.filter(user => !(user.username?.includes('✅') || user.discordName?.includes('✅')))
    }
    
    if (streamerFilter === 'streamers') {
      filtered = filtered.filter(user => user.isStreamer)
    } else if (streamerFilter === 'participants') {
      filtered = filtered.filter(user => !user.isStreamer)
    }
    
    if (tierFilter !== 'all') {
      if (tierFilter === 'none') {
        filtered = filtered.filter(user => !user.tier)
      } else {
        filtered = filtered.filter(user => user.tier === tierFilter)
      }
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
    const radius = Math.min(centerX, centerY) - 30  // Größerer Abstand für modernes Design

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

      // Text im Segment - AUSSEN an der Kante für bessere Lesbarkeit
      const textAngle = startAngle + (anglePerSegment / 2)
      const textRadius = radius * 0.85  // Näher am äußeren Rand

      ctx.save()
      
      // Clipping-Region für dieses Segment erstellen
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.clip() // Text wird nur in diesem Segment gezeichnet
      
      ctx.translate(centerX + Math.cos(textAngle) * textRadius, centerY + Math.sin(textAngle) * textRadius)
      ctx.rotate(textAngle + Math.PI / 2)
      
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 16px Arial'  // Etwas kleiner für bessere Anpassung
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Berechne maximale Textbreite basierend auf Segmentgröße
      const maxTextWidth = (radius * anglePerSegment) * 0.8 // 80% der Segmentbreite
      
      // Dynamische Textkürzung basierend auf verfügbarem Platz
      let displayName = user.username
      const textMetrics = ctx.measureText(displayName)
      
      if (textMetrics.width > maxTextWidth) {
        // Kürze Text bis er passt
        while (ctx.measureText(displayName + '..').width > maxTextWidth && displayName.length > 1) {
          displayName = displayName.substring(0, displayName.length - 1)
        }
        displayName = displayName + '..'
      }
      
      ctx.fillText(displayName, 0, -8)
      
      if (user.isStreamer) {
        ctx.font = 'bold 18px Arial'  // Kleineres Emoji für bessere Anpassung
        ctx.fillText('🎥', 0, 12)
      }
      
      ctx.restore()
    })

    // Mittelkreis - größer für modernes Design
    ctx.fillStyle = '#2C3E50'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI)  // Größerer Mittelkreis
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 4
    ctx.stroke()

    // Logo im Zentrum - größer
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 36px Arial'  // Größeres Logo
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚡', centerX, centerY)

    // ZEIGER - lila, nach unten zeigend, kleiner und höher positioniert  
    ctx.fillStyle = '#a855f7'  // Lila Farbe
    ctx.beginPath()
    ctx.moveTo(centerX, 32)           // Spitze unten - 33px höher (65-33=32)
    ctx.lineTo(centerX - 15, -8)      // Links oben - 33px höher (25-33=-8)
    ctx.lineTo(centerX + 15, -8)      // Rechts oben - 33px höher (25-33=-8)
    ctx.closePath()
    ctx.fill()
    
    // Zeiger Umrandung - dicker
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  const spinWheel = () => {
    if (filteredUsers.length === 0 || !selectedTeam || isSpinning) return

    // WICHTIG: Reset das Rad auf 0° SOFORT vor allem anderen
    setCurrentAngle(0)
    
    setIsSpinning(true)
    setSelectedUser(null)

    // Wähle einen zufälligen Gewinner
    const randomWinnerIndex = Math.floor(Math.random() * filteredUsers.length)
    const winner = filteredUsers[randomWinnerIndex]
    
    console.log('🎯 GEWINNER VORAB BESTIMMT:', winner.username, 'Index:', randomWinnerIndex)

    // REALISTISCHER GEWINNER-STOPP:
    // Statt perfekt mittig, stoppe irgendwo im Gewinner-Segment für Authentizität
    
    const segmentSize = 360 / filteredUsers.length
    
    // Zufällige Position innerhalb des Gewinner-Segments (nicht immer mittig)
    const randomPositionInSegment = 0.2 + (Math.random() * 0.6) // 20% bis 80% des Segments
    const winnerAngleInWheel = randomWinnerIndex * segmentSize + (segmentSize * randomPositionInSegment)
    
    // Das Rad dreht sich, also brauchen wir die INVERSE Rotation
    const targetRotation = (360 - winnerAngleInWheel) % 360
    
    // Exakt 12 komplette Drehungen für Konsistenz
    const totalRotation = (12 * 360) + targetRotation
    
    console.log('🎰 REALISTISCHER SPIN:', {
      winnerIndex: randomWinnerIndex,
      winnerName: winner.username,
      segmentSize: segmentSize.toFixed(1) + '°',
      positionInSegment: (randomPositionInSegment * 100).toFixed(1) + '%',
      winnerAngleInWheel: winnerAngleInWheel.toFixed(1) + '°',
      targetRotation: targetRotation.toFixed(1) + '°',
      totalRotation: totalRotation.toFixed(1) + '°'
    })

    // 12 Sekunden Animation mit sanfter Verlangsamung für dramatischeren Effekt
    const spinDuration = 12000
    const startTime = Date.now()
    const startAngle = 0  // IMMER von 0° starten nach Reset

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / spinDuration, 1)
      
      // Dramatischere Verlangsamung - startet schnell, wird langsamer zum Ende
      const easeOut = 1 - Math.pow(1 - progress, 5)
      let newAngle = startAngle + (totalRotation * easeOut)
      
      setCurrentAngle(newAngle % 360)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // NACH-ANIMATION: Sanfte Zentrierung
        const stopAngle = newAngle % 360
        const centerPosition = randomWinnerIndex * segmentSize + (segmentSize / 2) // Perfekt mittig
        const targetCenterAngle = (360 - centerPosition) % 360
        
        console.log('🎯 ZENTRIERUNG STARTET:', {
          stopAngle: stopAngle.toFixed(1) + '°',
          targetCenterAngle: targetCenterAngle.toFixed(1) + '°'
        })
        
        // Berechne den kürzesten Weg zur Mitte
        let angleDifference = targetCenterAngle - stopAngle
        if (angleDifference > 180) angleDifference -= 360
        if (angleDifference < -180) angleDifference += 360
        
        // Zentrierung Animation
        const centeringDuration = 800
        const centeringStartTime = Date.now()
        
        const centeringAnimate = () => {
          const centeringElapsed = Date.now() - centeringStartTime
          const centeringProgress = Math.min(centeringElapsed / centeringDuration, 1)
          
          // Sanfte Easing für Zentrierung
          const easeInOut = centeringProgress < 0.5 
            ? 2 * centeringProgress * centeringProgress 
            : 1 - Math.pow(-2 * centeringProgress + 2, 2) / 2
          
          const currentCenteringAngle = stopAngle + (angleDifference * easeInOut)
          setCurrentAngle(currentCenteringAngle % 360)
          
          if (centeringProgress < 1) {
            animationRef.current = requestAnimationFrame(centeringAnimate)
          } else {
            // Animation beendet - zeige Gewinner
            setCurrentAngle(targetCenterAngle)
            setSelectedUser(winner)
            setIsSpinning(false)
            console.log('🏆 SPIN ABGESCHLOSSEN! Gewinner:', winner.username)
          }
        }
        
        animationRef.current = requestAnimationFrame(centeringAnimate)
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
        })
      })

      if (response.ok) {
        console.log('✅ User erfolgreich zugewiesen!')
        setSelectedUser(null)
        fetchData() // Aktualisiere die Daten
      } else {
        console.error('❌ Fehler beim Zuweisen')
      }
    } catch (error) {
      console.error('❌ Netzwerkfehler:', error)
    }
  }

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const availableTeams = teams.filter(team => team.memberCount < 6)

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Überprüfe Admin-Berechtigung...</p>
        </div>
      </div>
    )
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex justify-between items-center">
            <div className="text-2xl font-bold text-purple-400">
              ⚡ GLÜCKSRAD
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

      {/* Main Content - 3 Column Layout */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Left Column - Filters & Controls */}
          <div className="xl:col-span-1 space-y-4">
            {/* Filters */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-3">🔍 Filter</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Verifizierung:
                  </label>
                  <select
                    value={verificationFilter}
                    onChange={(e) => setVerificationFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="all">Alle Benutzer</option>
                    <option value="verified">Nur verifizierte</option>
                    <option value="unverified">Nur unverifizierte</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Streamer-Status:
                  </label>
                  <select
                    value={streamerFilter}
                    onChange={(e) => setStreamerFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="all">Alle</option>
                    <option value="streamers">Nur Streamer</option>
                    <option value="participants">Nur Teilnehmer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Tier-Level:
                  </label>
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="all">Alle Tiers</option>
                    <option value="tier1">🥇 Tier 1</option>
                    <option value="tier2">🥈 Tier 2</option>
                    <option value="tier3">🥉 Tier 3</option>
                    <option value="none">Kein Tier</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-3 text-xs text-gray-400 bg-gray-700 rounded px-2 py-1">
                Teilnehmer: {filteredUsers.length}
              </div>
            </div>

            {/* Team Selection & Spin */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-3">🎯 Aktion</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Team auswählen:
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    disabled={isSpinning}
                  >
                    <option value="">-- Team wählen --</option>
                    {availableTeams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.memberCount}/6)
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={spinWheel}
                  disabled={!selectedTeam || isSpinning || filteredUsers.length === 0}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 shadow-lg text-sm"
                >
                  {isSpinning ? '🌀 Dreht...' : '🎯 DREHEN'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Center Column - Main Wheel (Larger) */}
          <div className="xl:col-span-2 flex flex-col items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-6 w-full">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">
                🎰 Glücksrad
              </h2>
              
              {filteredUsers.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <p>Keine verfügbaren Benutzer</p>
                </div>
              ) : (
                <div className="text-center">
                  <canvas
                    ref={canvasRef}
                    width={750}
                    height={750}
                    className="border-2 border-purple-500 rounded-full mx-auto shadow-2xl shadow-purple-500/30 max-w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Winner Display */}
          <div className="xl:col-span-1">
            {selectedUser ? (
              <div className="bg-green-800 rounded-lg p-4 sticky top-4">
                <h3 className="text-lg font-bold text-white mb-3">🏆 GEWINNER!</h3>
                <div className="bg-green-700 rounded-lg p-3">
                  <p className="text-white font-bold text-lg">{selectedUser.username}</p>
                  <p className="text-green-200 text-sm">
                    {selectedUser.isStreamer ? '🎥 Streamer' : '👤 Teilnehmer'}
                    {selectedUser.tier && ` • ${selectedUser.tier === 'tier1' ? '🥇 Tier 1' : selectedUser.tier === 'tier2' ? '🥈 Tier 2' : selectedUser.tier === 'tier3' ? '🥉 Tier 3' : selectedUser.tier}`}
                  </p>
                </div>
                <button
                  onClick={assignToTeam}
                  disabled={!selectedTeam}
                  className="w-full mt-3 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 transition-colors text-sm font-bold"
                >
                  Zu Team hinzufügen
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3">📊 Status</h3>
                <div className="space-y-2">
                  <div className="bg-gray-700 rounded p-2">
                    <p className="text-purple-400 font-bold text-lg">{filteredUsers.length}</p>
                    <p className="text-xs text-gray-300">Im Rad</p>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <p className="text-green-400 font-bold text-lg">{availableTeams.length}</p>
                    <p className="text-xs text-gray-300">Teams verfügbar</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
