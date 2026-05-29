'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatTierLabel, TIER_SELECT_OPTIONS } from '@/lib/tierConfig'
import { TEAM_PLAYER_LIMIT } from '@/lib/teamCapacity'

const WHEEL_TICK_SOUND_SRC = '/wheelspin.mp3'
const WHEEL_TICK_POOL_SIZE = 10
const WHEEL_TICK_VOLUME = 0.45
const WHEEL_TICK_STAGGER_MS = 14
const MAX_TICKS_PER_FRAME = 12
const WHEEL_CANVAS_SIZE = 900
const WHEEL_SIZE_STORAGE_KEY = 'adminWheelSizePercent'
const DEFAULT_WHEEL_SIZE_PERCENT = 100
const MIN_WHEEL_SIZE_PERCENT = 70
const MAX_WHEEL_SIZE_PERCENT = 120

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
  position?: number
}

export default function WheelPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const tickAudioPoolRef = useRef<HTMLAudioElement[]>([])
  const tickAudioIndexRef = useRef(0)
  const tickTimeoutsRef = useRef<number[]>([])
  const lastSegmentCrossingRef = useRef<number | null>(null)
  
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [currentAngle, setCurrentAngle] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [wheelSizePercent, setWheelSizePercent] = useState(DEFAULT_WHEEL_SIZE_PERCENT)
  
  // Filter states
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [streamerFilter, setStreamerFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')

  // Admin Authentication Check
  useEffect(() => {
    checkAdminAuth()
  }, [])

  useEffect(() => {
    const storedSize = window.localStorage.getItem(WHEEL_SIZE_STORAGE_KEY)
    const parsedSize = storedSize ? Number(storedSize) : DEFAULT_WHEEL_SIZE_PERCENT

    if (Number.isFinite(parsedSize)) {
      setWheelSizePercent(
        Math.min(Math.max(parsedSize, MIN_WHEEL_SIZE_PERCENT), MAX_WHEEL_SIZE_PERCENT)
      )
    }
  }, [])

  useEffect(() => {
    tickAudioPoolRef.current = Array.from({ length: WHEEL_TICK_POOL_SIZE }, () => {
      const audio = new Audio(WHEEL_TICK_SOUND_SRC)
      audio.preload = 'auto'
      audio.volume = WHEEL_TICK_VOLUME
      return audio
    })

    return () => {
      tickTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      tickTimeoutsRef.current = []
      tickAudioPoolRef.current.forEach((audio) => {
        audio.pause()
        audio.currentTime = 0
      })
    }
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
        
        const sortedTeams: Team[] = Array.isArray(teamsData)
          ? [...teamsData].sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
          : []

        console.log('✅ Data loaded:', { users: usersData.length, teams: sortedTeams.length })
        setUsers(usersData)
        setTeams(sortedTeams)
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

  const updateWheelSize = (value: number) => {
    const nextSize = Math.min(Math.max(value, MIN_WHEEL_SIZE_PERCENT), MAX_WHEEL_SIZE_PERCENT)
    setWheelSizePercent(nextSize)
    window.localStorage.setItem(WHEEL_SIZE_STORAGE_KEY, String(nextSize))
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

  const playWheelTick = () => {
    const pool = tickAudioPoolRef.current
    if (pool.length === 0) return

    const audio = pool[tickAudioIndexRef.current % pool.length]
    tickAudioIndexRef.current += 1
    audio.currentTime = 0
    void audio.play().catch(() => {
      // The browser can block audio until an admin has interacted with the page.
    })
  }

  const queueWheelTicks = (count: number) => {
    const tickCount = Math.min(count, MAX_TICKS_PER_FRAME)
    for (let index = 0; index < tickCount; index += 1) {
      const timeoutId = window.setTimeout(() => {
        playWheelTick()
        tickTimeoutsRef.current = tickTimeoutsRef.current.filter((id) => id !== timeoutId)
      }, index * WHEEL_TICK_STAGGER_MS)
      tickTimeoutsRef.current.push(timeoutId)
    }
  }

  const updateWheelTickSound = (absoluteAngle: number, segmentSize: number) => {
    if (segmentSize <= 0) return

    const currentBoundaryIndex = Math.floor(absoluteAngle / segmentSize)
    const previousBoundaryIndex = lastSegmentCrossingRef.current

    if (previousBoundaryIndex === null) {
      lastSegmentCrossingRef.current = currentBoundaryIndex
      return
    }

    const crossedLines = Math.abs(currentBoundaryIndex - previousBoundaryIndex)
    if (crossedLines > 0) {
      queueWheelTicks(crossedLines)
      lastSegmentCrossingRef.current = currentBoundaryIndex
    }
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
    const radius = Math.min(centerX, centerY) - 42

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const wheelBackground = ctx.createRadialGradient(centerX, centerY, 80, centerX, centerY, radius + 34)
    wheelBackground.addColorStop(0, '#111827')
    wheelBackground.addColorStop(1, '#020617')
    ctx.fillStyle = wheelBackground
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 32, 0, 2 * Math.PI)
    ctx.fill()

    const colors = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#ca8a04', '#dc2626', '#db2777', '#4f46e5']

    // Berechne Winkel pro Segment (in Radians)
    const anglePerSegment = (2 * Math.PI) / filteredUsers.length

    // Zeichne alle Segmente
    filteredUsers.forEach((user, index) => {
      // Start-Winkel für dieses Segment - starte bei 12 Uhr und drehe im Uhrzeigersinn
      // currentAngle ist in Grad, umrechnen zu Radians
      const rotationInRadians = (currentAngle * Math.PI) / 180
      const startAngle = (index * anglePerSegment) - (Math.PI / 2) + rotationInRadians
      const endAngle = ((index + 1) * anglePerSegment) - (Math.PI / 2) + rotationInRadians

      const segmentGradient = ctx.createRadialGradient(centerX, centerY, 72, centerX, centerY, radius)
      segmentGradient.addColorStop(0, colors[index % colors.length])
      segmentGradient.addColorStop(1, '#111827')

      ctx.fillStyle = segmentGradient
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = 'rgba(255,255,255,0.62)'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Text im Segment - AUSSEN an der Kante für bessere Lesbarkeit
      const textAngle = startAngle + (anglePerSegment / 2)
      const textRadius = radius * 0.78

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
      ctx.font = '700 16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Berechne maximale Textbreite basierend auf Segmentgröße
      const maxTextWidth = (radius * anglePerSegment) * 0.8 // 80% der Segmentbreite
      
      // Dynamische Textkürzung basierend auf verfügbarem Platz
      let displayName = user.twitchName || user.username
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
        ctx.font = '700 11px Arial'
        ctx.fillStyle = '#fbcfe8'
        ctx.fillText('STREAMER', 0, 13)
      }
      
      ctx.restore()
    })

    ctx.strokeStyle = 'rgba(216,180,254,0.95)'
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 3, 0, 2 * Math.PI)
    ctx.stroke()

    const centerGradient = ctx.createRadialGradient(centerX - 18, centerY - 22, 12, centerX, centerY, 68)
    centerGradient.addColorStop(0, '#475569')
    centerGradient.addColorStop(1, '#020617')
    ctx.fillStyle = centerGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 68, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 24px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SPIN', centerX, centerY)

    ctx.save()
    ctx.shadowColor = 'rgba(251,191,36,0.55)'
    ctx.shadowBlur = 18
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.moveTo(centerX, 58)
    ctx.lineTo(centerX - 18, 18)
    ctx.lineTo(centerX + 18, 18)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
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
    lastSegmentCrossingRef.current = Math.floor(startAngle / segmentSize)

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / spinDuration, 1)
      
      // Dramatischere Verlangsamung - startet schnell, wird langsamer zum Ende
      const easeOut = 1 - Math.pow(1 - progress, 5)
      let newAngle = startAngle + (totalRotation * easeOut)
      
      updateWheelTickSound(newAngle, segmentSize)
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
        lastSegmentCrossingRef.current = Math.floor(stopAngle / segmentSize)
        
        const centeringAnimate = () => {
          const centeringElapsed = Date.now() - centeringStartTime
          const centeringProgress = Math.min(centeringElapsed / centeringDuration, 1)
          
          // Sanfte Easing für Zentrierung
          const easeInOut = centeringProgress < 0.5 
            ? 2 * centeringProgress * centeringProgress 
            : 1 - Math.pow(-2 * centeringProgress + 2, 2) / 2
          
          const currentCenteringAngle = stopAngle + (angleDifference * easeInOut)
          updateWheelTickSound(currentCenteringAngle, segmentSize)
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

  const availableTeams = teams.filter(team => team.memberCount < TEAM_PLAYER_LIMIT)
  const selectedTeamInfo = teams.find((team) => team.id === selectedTeam)
  const openTeamSlots = availableTeams.reduce(
    (total, team) => total + Math.max(TEAM_PLAYER_LIMIT - team.memberCount, 0),
    0
  )
  const streamerCount = filteredUsers.filter((user) => user.isStreamer).length
  const participantCount = filteredUsers.length - streamerCount
  const wheelPixelSize = Math.round((WHEEL_CANVAS_SIZE * wheelSizePercent) / 100)

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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/95">
        <div className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">
          <nav className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
                Admin Tool
              </div>
              <h1 className="mt-1 text-3xl font-bold text-white">Glücksrad</h1>
              <p className="mt-1 text-sm text-gray-400">
                Freie Spieler filtern, ziehen und direkt einem Team zuweisen.
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="self-start rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-100 transition-colors hover:border-purple-400 hover:text-purple-100 md:self-auto"
            >
              Zurück zum Dashboard
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <main className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
            <div className="text-2xl font-bold text-purple-200">{filteredUsers.length}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Im Rad</div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
            <div className="text-2xl font-bold text-pink-200">{streamerCount}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Streamer</div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
            <div className="text-2xl font-bold text-cyan-200">{participantCount}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Teilnehmer</div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
            <div className="text-2xl font-bold text-green-200">{openTeamSlots}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Freie Slots</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)_260px] 2xl:grid-cols-[280px_minmax(0,1fr)_280px]">
          
          {/* Left Column - Filters & Controls */}
          <div className="space-y-4">
            {/* Filters */}
            <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Filter</h2>
                <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-200">
                  {filteredUsers.length} aktiv
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Verifizierung:
                  </label>
                  <select
                    value={verificationFilter}
                    onChange={(e) => setVerificationFilter(e.target.value)}
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none"
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
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none"
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
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value="all">Alle Tiers</option>
                    {TIER_SELECT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value="none">Kein Tier</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-400">
                Nur Spieler ohne Team werden angezeigt.
              </div>
            </div>

            {/* Team Selection & Spin */}
            <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
              <h2 className="mb-4 text-lg font-bold text-white">Aktion</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Team auswählen:
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSpinning}
                  >
                    <option value="">Team wählen</option>
                    {availableTeams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.memberCount}/{TEAM_PLAYER_LIMIT})
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedTeamInfo && (
                  <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-100">
                    <div className="font-semibold">{selectedTeamInfo.name}</div>
                    <div className="text-xs text-green-200/80">
                      {selectedTeamInfo.memberCount}/{TEAM_PLAYER_LIMIT} Spieler belegt
                    </div>
                  </div>
                )}

                <button
                  onClick={spinWheel}
                  disabled={!selectedTeam || isSpinning || filteredUsers.length === 0}
                  className="w-full rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/30 transition-all hover:from-purple-500 hover:to-pink-500 disabled:cursor-not-allowed disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400"
                >
                  {isSpinning ? 'Dreht...' : 'Rad drehen'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Center Column - Main Wheel (Larger) */}
          <div className="flex min-w-0 flex-col items-center justify-center">
            <div className="flex min-h-[780px] w-full flex-col rounded-lg border border-gray-800 bg-gray-900/80 p-5 xl:min-h-[840px] 2xl:min-h-[900px]">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Ziehung</h2>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-[220px] rounded-md border border-gray-800 bg-gray-950/80 px-3 py-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="wheel-size" className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Radgröße
                      </label>
                      <button
                        type="button"
                        onClick={() => updateWheelSize(DEFAULT_WHEEL_SIZE_PERCENT)}
                        className="text-xs font-semibold text-purple-200 transition-colors hover:text-white"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        id="wheel-size"
                        type="range"
                        min={MIN_WHEEL_SIZE_PERCENT}
                        max={MAX_WHEEL_SIZE_PERCENT}
                        step={5}
                        value={wheelSizePercent}
                        onChange={(event) => updateWheelSize(Number(event.target.value))}
                        className="w-full accent-purple-500"
                      />
                      <span className="w-12 text-right text-sm font-bold text-purple-100">
                        {wheelSizePercent}%
                      </span>
                    </div>
                  </div>
                  <div className={`self-start rounded-full border px-3 py-1 text-xs font-semibold sm:self-auto ${
                    isSpinning
                      ? 'border-pink-400/60 bg-pink-500/15 text-pink-100'
                      : 'border-gray-700 bg-gray-950 text-gray-300'
                  }`}>
                    {isSpinning ? 'Spin läuft' : 'Bereit'}
                  </div>
                </div>
              </div>
              
              {filteredUsers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950/60 py-16 text-center text-gray-400">
                  <p className="text-lg font-semibold text-gray-200">Keine verfügbaren Spieler</p>
                  <p className="mt-1 text-sm text-gray-500">Passe die Filter an oder prüfe, ob noch Spieler ohne Team offen sind.</p>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={WHEEL_CANVAS_SIZE}
                    height={WHEEL_CANVAS_SIZE}
                    className="aspect-square w-full rounded-full border border-purple-400/50 bg-gray-950 shadow-2xl shadow-purple-900/40 transition-[max-width] duration-200"
                    style={{ maxWidth: `${wheelPixelSize}px` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Winner Display */}
          <div className="space-y-4">
            {selectedUser ? (
              <div className="sticky top-4 rounded-lg border border-green-500/40 bg-green-500/10 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-green-300">Gewinner</div>
                <div className="rounded-md border border-green-500/30 bg-gray-950/70 p-4">
                  <p className="truncate text-2xl font-bold text-white">{selectedUser.twitchName || selectedUser.username}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2.5 py-1 text-green-100">
                      {selectedUser.isStreamer ? 'Streamer' : 'Teilnehmer'}
                    </span>
                    {selectedUser.tier && (
                      <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-purple-100">
                        {formatTierLabel(selectedUser.tier)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={assignToTeam}
                  disabled={!selectedTeam}
                  className="mt-3 w-full rounded-md bg-green-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                >
                  Zu Team hinzufügen
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
                <h2 className="mb-3 text-lg font-bold text-white">Status</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-gray-800 bg-gray-950 p-3">
                    <p className="text-2xl font-bold text-purple-200">{filteredUsers.length}</p>
                    <p className="text-xs text-gray-500">Im Rad</p>
                  </div>
                  <div className="rounded-md border border-gray-800 bg-gray-950 p-3">
                    <p className="text-2xl font-bold text-green-200">{availableTeams.length}</p>
                    <p className="text-xs text-gray-500">Teams frei</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Spieler im Rad</h2>
                <span className="text-xs text-gray-500">{filteredUsers.length}</span>
              </div>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {filteredUsers.length === 0 ? (
                  <div className="rounded-md border border-gray-800 bg-gray-950 p-4 text-sm text-gray-500">
                    Keine Spieler mit diesen Filtern.
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="rounded-md border border-gray-800 bg-gray-950/80 p-3">
                      <div className="truncate font-semibold text-white">{user.twitchName || user.username}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-gray-300">
                          {user.tier ? formatTierLabel(user.tier) : 'Kein Tier'}
                        </span>
                        {user.isStreamer && (
                          <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-pink-200">
                            Streamer
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
