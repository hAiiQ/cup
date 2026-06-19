'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatTierShortLabel, resolveTierKey, TIER_SELECT_OPTIONS, type TierKey } from '@/lib/tierConfig'
import { DEFAULT_TEAM_NAMES } from '@/lib/teamDefaults'
import { MIN_VALORANT_LEVEL } from '@/lib/valorantRequirements'
import AdminTopbar, { type DashboardView } from '@/components/AdminTopbar'

const TIER_BADGE_CLASSES: Record<TierKey, string> = {
  tier1: 'bg-blue-600 text-white',
  tier2: 'bg-green-600 text-white',
  tier3: 'bg-yellow-600 text-white',
  tier4: 'bg-orange-600 text-white'
}
const HENRIK_BULK_REQUEST_LIMIT_PER_MINUTE = 20
const HENRIK_REQUESTS_PER_PLAYER_REFRESH = 2
const VALORANT_BULK_SYNC_DELAY_MS = Math.ceil(
  (60000 * HENRIK_REQUESTS_PER_PLAYER_REFRESH) / HENRIK_BULK_REQUEST_LIMIT_PER_MINUTE
)
const VALORANT_BULK_RETRY_DELAY_MS = 60000

interface User {
  id: string
  username: string
  inGameName?: string
  inGameRank?: string
  valorantLevel?: number | null
  valorantCurrentRank?: string | null
  discordName?: string
  twitchName?: string
  instagramName?: string
  tiktokName?: string
  tier?: string
  isStreamer: boolean
  isIGL: boolean
  isVerified: boolean
  rulesAccepted: boolean
  isParticipating: boolean
  twitchVerified: boolean
  instagramVerified: boolean
  discordVerified: boolean
  tiktokVerified: boolean
  inGameNameVerified: boolean
  inGameRankVerified: boolean
  createdAt: string
  team?: {
    id: string
    name: string
  } | null
}

interface AdminTeam {
  id: string
  name: string
  position: number
}

interface ValorantMatchSummary {
  matchId?: string
  map?: string
  mode?: string
  startedAt?: string
  agent?: string
  rank?: string
  won?: boolean
  roundsWon?: number
  roundsLost?: number
  kills: number
  deaths: number
  assists: number
  score?: number
  damage?: number
}

interface ValorantDetails {
  region: string
  accountLevel?: number
  peakRank: string
  currentRank?: string
  rankRating?: number
  lastRankChange?: number
  mmr?: number
  leaderboardRank?: number
  matches: ValorantMatchSummary[]
  totals: {
    kills: number
    deaths: number
    assists: number
    kdRatio: number | null
  }
  matchHistoryError?: string
}

interface ValorantRankRefresh {
  peakRank: string
  currentRank?: string | null
}

type ValorantDetailsState = {
  loading: boolean
  error?: string
  data?: ValorantDetails
}

type UserProfileForm = {
  inGameName: string
  discordName: string
  instagramName: string
  tiktokName: string
}

type ValorantBulkSyncState = {
  isRunning: boolean
  isCancelling: boolean
  isWaitingAfterError: boolean
  total: number
  completed: number
  retries: number
  remainingSeconds: number
  currentName?: string
  status?: string
}

type ParticipationFilter = 'all' | 'participating' | 'not-participating'

const PARTICIPATION_FILTER_OPTIONS: Array<{
  value: ParticipationFilter
  label: string
}> = [
  { value: 'all', label: 'Alle' },
  { value: 'participating', label: 'Nimmt teil' },
  { value: 'not-participating', label: 'Nimmt nicht teil' },
]

const wait = (milliseconds: number, shouldCancel?: () => boolean) =>
  new Promise<boolean>((resolve) => {
    const startedAt = Date.now()

    const tick = () => {
      if (shouldCancel?.()) {
        resolve(false)
        return
      }

      if (Date.now() - startedAt >= milliseconds) {
        resolve(true)
        return
      }

      window.setTimeout(tick, 250)
    }

    tick()
  })

const getValorantBulkSyncSeconds = (playerCount: number) =>
  Math.ceil((playerCount * VALORANT_BULK_SYNC_DELAY_MS) / 1000)

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(Math.ceil(totalSeconds), 0)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [teamOptions, setTeamOptions] = useState<AdminTeam[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')
  const [participationFilter, setParticipationFilter] = useState<ParticipationFilter>('all')
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userProfileForm, setUserProfileForm] = useState<UserProfileForm>({
    inGameName: '',
    discordName: '',
    instagramName: '',
    tiktokName: '',
  })
  const [savingUserProfile, setSavingUserProfile] = useState(false)
  const [userProfileError, setUserProfileError] = useState<string | null>(null)
  const [resettingTeams, setResettingTeams] = useState(false)
  const [valorantDetailsByUser, setValorantDetailsByUser] = useState<Record<string, ValorantDetailsState>>({})
  const [valorantBulkSync, setValorantBulkSync] = useState<ValorantBulkSyncState>({
    isRunning: false,
    isCancelling: false,
    isWaitingAfterError: false,
    total: 0,
    completed: 0,
    retries: 0,
    remainingSeconds: 0,
  })
  const valorantBulkCancelRef = useRef(false)
  const router = useRouter()
  const resolvedTeamOptions = teamOptions.length > 0
    ? [...teamOptions].sort((a, b) => a.position - b.position)
    : DEFAULT_TEAM_NAMES.map((name, index) => ({
        id: `default-${index + 1}`,
        name,
        position: index + 1
      }))
  const valorantBulkSyncUsers = users.filter((user) => user.inGameName?.trim())
  const filteredUsers = users.filter((user) => {
    if (participationFilter === 'participating') return user.isParticipating
    if (participationFilter === 'not-participating') return !user.isParticipating
    return true
  })
  const valorantBulkEstimatedSeconds = getValorantBulkSyncSeconds(valorantBulkSyncUsers.length)
  const valorantBulkProgressPercent = valorantBulkSync.total > 0
    ? Math.round((valorantBulkSync.completed / valorantBulkSync.total) * 100)
    : 0

  useEffect(() => {
    fetchData()
    const view = new URLSearchParams(window.location.search).get('view')
    if (view === 'overview' || view === 'users') {
      setActiveTab(view)
    }
  }, [])

  useEffect(() => {
    if (!valorantBulkSync.isRunning) {
      return
    }

    const intervalId = window.setInterval(() => {
      setValorantBulkSync((prev) =>
        prev.isRunning
          ? { ...prev, remainingSeconds: Math.max(prev.remainingSeconds - 1, 0) }
          : prev
      )
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [valorantBulkSync.isRunning])

  useEffect(() => {
    if (!editingUser) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingUserProfile) {
        setEditingUser(null)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [editingUser, savingUserProfile])

  const fetchData = async () => {
    try {
      const [usersRes, statsRes, teamsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
        fetch('/api/admin/teams')
      ])

      // Check if admin is authenticated
      if (usersRes.status === 401 || statsRes.status === 401 || teamsRes.status === 401) {
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

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeamOptions(teamsData.teams || [])
      } else {
        console.error('Failed to fetch teams:', teamsRes.status)
        setTeamOptions([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setUsers([])
      setStats({ totalUsers: 0, verifiedUsers: 0, unverifiedUsers: 0 })
      setTeamOptions([])
    } finally {
      setLoading(false)
    }
  }

  const selectDashboardView = (view: DashboardView) => {
    setActiveTab(view)
    const url = new URL(window.location.href)
    url.searchParams.set('view', view)
    window.history.replaceState(null, '', url)
  }

  const deleteUser = async (userId: string, twitchName: string) => {
    if (!confirm(`Bist du sicher, dass du den Benutzer "${twitchName}" löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
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
        alert(`Benutzer "${twitchName}" wurde erfolgreich gelöscht.`)
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

  const toggleSocialVerification = async (userId: string, platform: 'twitch' | 'instagram' | 'discord' | 'tiktok' | 'inGameName' | 'inGameRank', currentStatus: boolean) => {
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
        setUsers(prev => prev.map(u => {
          if (u.id !== userId) return u
          const updated = { ...u, [`${platform}Verified`]: !currentStatus } as User
          const allSocial =
            (!updated.twitchName || updated.twitchVerified) &&
            (!updated.instagramName || updated.instagramVerified) &&
            (!updated.discordName || updated.discordVerified) &&
            (!updated.tiktokName || updated.tiktokVerified)
          const allInGame =
            (!updated.inGameName || updated.inGameNameVerified) &&
            (!updated.inGameRank || updated.inGameRankVerified)
          return { ...updated, isVerified: allSocial && allInGame }
        }))
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

  const openUserProfileEditor = (user: User) => {
    setEditingUser(user)
    setUserProfileForm({
      inGameName: user.inGameName || '',
      discordName: user.discordName || '',
      instagramName: user.instagramName || '',
      tiktokName: user.tiktokName || '',
    })
    setUserProfileError(null)
  }

  const closeUserProfileEditor = () => {
    if (!savingUserProfile) {
      setEditingUser(null)
      setUserProfileError(null)
    }
  }

  const saveUserProfile = async () => {
    if (!editingUser || savingUserProfile) {
      return
    }

    setSavingUserProfile(true)
    setUserProfileError(null)

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userProfileForm),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Profildaten konnten nicht gespeichert werden.')
      }

      setUsers((prev) => prev.map((user) => (user.id === editingUser.id ? data.user : user)))
      setEditingUser(null)
    } catch (error) {
      setUserProfileError(
        error instanceof Error ? error.message : 'Profildaten konnten nicht gespeichert werden.'
      )
    } finally {
      setSavingUserProfile(false)
    }
  }

  const toggleIglStatus = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/toggle-igl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(prev => prev.map(u =>
          u.id === userId
            ? { ...u, isIGL: data.isIGL }
            : u
        ))
      } else {
        alert('Fehler beim Aktualisieren des IGL Status')
      }
    } catch (error) {
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const loadValorantDetails = async (userId: string) => {
    setValorantDetailsByUser((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], loading: true, error: undefined },
    }))

    try {
      const response = await fetch(`/api/admin/users/${userId}/valorant-details`)
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Valorant Details konnten nicht geladen werden')
      }

      const details = data.details as ValorantDetails

      setValorantDetailsByUser((prev) => ({
        ...prev,
        [userId]: { loading: false, data: details },
      }))

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                inGameRank: details.peakRank || user.inGameRank,
                valorantCurrentRank: details.currentRank || user.valorantCurrentRank,
                valorantLevel:
                  typeof details.accountLevel === 'number'
                    ? details.accountLevel
                    : user.valorantLevel,
              }
            : user
        )
      )
      return true
    } catch (error) {
      setValorantDetailsByUser((prev) => ({
        ...prev,
        [userId]: {
          loading: false,
          error: error instanceof Error ? error.message : 'Valorant Details konnten nicht geladen werden',
        },
      }))
      return false
    }
  }

  const refreshValorantRank = async (userId: string) => {
    setValorantDetailsByUser((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], loading: true, error: undefined },
    }))

    try {
      const response = await fetch(`/api/admin/users/${userId}/valorant-rank`)
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Valorant Rank konnte nicht aktualisiert werden')
      }

      const rank = data.rank as ValorantRankRefresh

      setValorantDetailsByUser((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], loading: false, error: undefined },
      }))

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                inGameRank: rank.peakRank || user.inGameRank,
                valorantCurrentRank: rank.currentRank || user.valorantCurrentRank,
              }
            : user
        )
      )
      return true
    } catch (error) {
      setValorantDetailsByUser((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          loading: false,
          error: error instanceof Error ? error.message : 'Valorant Rank konnte nicht aktualisiert werden',
        },
      }))
      return false
    }
  }

  const runValorantBulkSync = async () => {
    if (valorantBulkSync.isRunning) {
      return
    }

    const syncQueue = [...valorantBulkSyncUsers]

    if (syncQueue.length === 0) {
      alert('Keine Spieler mit Valorant Name gefunden.')
      return
    }

    valorantBulkCancelRef.current = false
    setValorantBulkSync({
      isRunning: true,
      isCancelling: false,
      isWaitingAfterError: false,
      total: syncQueue.length,
      completed: 0,
      retries: 0,
      remainingSeconds: valorantBulkEstimatedSeconds,
      status: undefined,
    })

    let retries = 0
    let wasCancelled = false

    for (let index = 0; index < syncQueue.length; index += 1) {
      const user = syncQueue[index]
      let playerFinished = false

      while (!playerFinished) {
        if (valorantBulkCancelRef.current) {
          wasCancelled = true
          break
        }

        setValorantBulkSync((prev) => ({
          ...prev,
          isWaitingAfterError: false,
          currentName: getUserDisplayName(user),
          status: undefined,
        }))

        const success = await refreshValorantRank(user.id)

        if (valorantBulkCancelRef.current) {
          wasCancelled = true
          break
        }

        if (!success) {
          retries += 1
          setValorantBulkSync((prev) => ({
            ...prev,
            isWaitingAfterError: true,
            retries,
            remainingSeconds: Math.ceil(VALORANT_BULK_RETRY_DELAY_MS / 1000),
            status: 'Fehler - neuer Versuch nach Wartezeit',
          }))

          const shouldContinue = await wait(
            VALORANT_BULK_RETRY_DELAY_MS,
            () => valorantBulkCancelRef.current
          )

          if (!shouldContinue) {
            wasCancelled = true
            break
          }

          continue
        }

        playerFinished = true

        const completed = index + 1
        const remainingPlayers = syncQueue.length - completed

        setValorantBulkSync((prev) => ({
          ...prev,
          completed,
          remainingSeconds: Math.max(
            prev.remainingSeconds,
            getValorantBulkSyncSeconds(remainingPlayers)
          ),
        }))

        if (remainingPlayers > 0) {
          const shouldContinue = await wait(
            VALORANT_BULK_SYNC_DELAY_MS,
            () => valorantBulkCancelRef.current
          )

          if (!shouldContinue) {
            wasCancelled = true
            break
          }
        }
      }

      if (wasCancelled) {
        break
      }
    }

    setValorantBulkSync((prev) => ({
      ...prev,
      isRunning: false,
      isCancelling: false,
      isWaitingAfterError: false,
      currentName: undefined,
      remainingSeconds: 0,
      status: wasCancelled ? 'Abgebrochen' : 'Fertig',
    }))
  }

  const cancelValorantBulkSync = () => {
    if (!valorantBulkSync.isRunning) {
      return
    }

    valorantBulkCancelRef.current = true
    setValorantBulkSync((prev) => ({
      ...prev,
      isCancelling: true,
      isWaitingAfterError: false,
      remainingSeconds: 0,
      status: 'Wird abgebrochen...',
    }))
  }

  const closeValorantDetails = (userId: string) => {
    setValorantDetailsByUser((prev) => {
      const next = { ...prev }
      delete next[userId]
      return next
    })
  }

  const resetTeams = async () => {
    if (resettingTeams) {
      return
    }

    if (!confirm('Möchtest du wirklich alle Teams löschen und neu anlegen?')) {
      return
    }

    setResettingTeams(true)

    try {
      const response = await fetch('/api/admin/teams/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        await fetchData()
        alert('Teams wurden erfolgreich zurückgesetzt.')
      } else {
        const data = await response.json().catch(() => ({}))
        alert(data.error || 'Fehler beim Zurücksetzen der Teams')
      }
    } catch (error) {
      alert('Ein Fehler ist aufgetreten beim Zurücksetzen der Teams')
    } finally {
      setResettingTeams(false)
    }
  }

  const getUserDisplayName = (user: User) => user.twitchName || user.username

  const getVerificationSummary = (user: User) => {
    const allItems = [
      { value: user.twitchName, verified: user.twitchVerified },
      { value: user.discordName, verified: user.discordVerified },
      { value: user.instagramName, verified: user.instagramVerified },
      { value: user.tiktokName, verified: user.tiktokVerified },
    ].filter((item) => item.value)
    const verifiedCount = allItems.filter((item) => item.verified).length
    return {
      total: allItems.length,
      verified: verifiedCount,
      complete: allItems.length > 0 && verifiedCount === allItems.length,
      partial: verifiedCount > 0 && verifiedCount < allItems.length,
    }
  }

  const formatJoinDate = (value: string) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? 'Datum offen'
      : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const formatMatchDate = (value?: string) => {
    if (!value) {
      return 'Datum offen'
    }

    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? 'Datum offen'
      : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const formatNumber = (value?: number | null) => {
    return typeof value === 'number' ? value.toLocaleString('de-DE') : '--'
  }

  const formatKdRatio = (value: number | null, hasMatches = true) => {
    if (!hasMatches) {
      return '--'
    }

    return typeof value === 'number' ? value.toFixed(2) : 'Perfect'
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
      <AdminTopbar
        active={activeTab === 'overview' ? 'overview' : 'users'}
        onSelectDashboardView={selectDashboardView}
      />

      <div className="container mx-auto px-4 py-8">
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
              <div className="grid md:grid-cols-3 gap-4">
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
                <button
                  type="button"
                  onClick={resetTeams}
                  disabled={resettingTeams}
                  className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 transition-colors text-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="text-2xl mb-2">🧼</div>
                  <div className="font-semibold">Teams zurücksetzen</div>
                  <div className="text-sm opacity-80">
                    {resettingTeams ? 'Setze Teams neu auf...' : 'Alle 10 Plätze säubern'}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-red-300">Admin</p>
                  <h1 className="text-4xl font-bold text-white mt-1">User Management</h1>
                  <p className="text-gray-400 mt-2">
                    Spieler, Verifikation, Badges und Team-Zuweisung in einer kompakten Ansicht.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-3 min-w-28">
                    <div className="text-2xl font-bold text-white">{users.length}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Spieler</div>
                  </div>
                  <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-3 min-w-28">
                    <div className="text-2xl font-bold text-green-300">
                      {users.filter((user) => user.isVerified).length}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Verifiziert</div>
                  </div>
                  <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-3 min-w-28">
                    <div className="text-2xl font-bold text-blue-300">
                      {users.filter((user) => user.team).length}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Im Team</div>
                  </div>
                  <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-3 min-w-28">
                    <div className="text-2xl font-bold text-blue-300">
                      {users.filter((user) => user.isIGL).length}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">IGL</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-lg border border-gray-700 bg-gray-900/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Teilnahme filtern
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {filteredUsers.length} von {users.length} Usern werden angezeigt
                  </div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="User nach Teilnahme filtern">
                  {PARTICIPATION_FILTER_OPTIONS.map((option) => {
                    const isActive = participationFilter === option.value

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setParticipationFilter(option.value)}
                        aria-pressed={isActive}
                        className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                          isActive
                            ? 'border-red-400 bg-red-600 text-white'
                            : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-sky-500/25 bg-sky-950/30 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-wide text-sky-300">
                      Valorant Rank Sync
                    </div>
                    <div className="mt-1 text-sm text-gray-300">
                      Aktualisiert aktuellen Rank und Peak Rank
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span>{valorantBulkSyncUsers.length} Spieler in der Queue</span>
                      <span>
                        {valorantBulkSync.isRunning
                          ? valorantBulkSync.isWaitingAfterError
                            ? `Nächster Versuch in ca. ${formatDuration(valorantBulkSync.remainingSeconds)}`
                            : `Fertig in ca. ${formatDuration(valorantBulkSync.remainingSeconds)}`
                          : `Dauer ca. ${formatDuration(valorantBulkEstimatedSeconds)}`}
                      </span>
                      {valorantBulkSync.currentName && (
                        <span>Aktuell: {valorantBulkSync.currentName}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={runValorantBulkSync}
                      disabled={valorantBulkSync.isRunning || valorantBulkSyncUsers.length === 0}
                      className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                    >
                      {valorantBulkSync.isRunning ? 'Ranks werden aktualisiert...' : 'Alle Ranks aktualisieren'}
                    </button>
                    {valorantBulkSync.isRunning && (
                      <button
                        type="button"
                        onClick={cancelValorantBulkSync}
                        disabled={valorantBulkSync.isCancelling}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                      >
                        {valorantBulkSync.isCancelling ? 'Bricht ab...' : 'Abbrechen'}
                      </button>
                    )}
                  </div>
                </div>

                {(valorantBulkSync.isRunning || valorantBulkSync.completed > 0) && (
                  <div className="mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                      <span>
                        {valorantBulkSync.completed}/{valorantBulkSync.total} fertig
                      </span>
                      <span>
                        {valorantBulkSync.status ||
                          (valorantBulkSync.retries > 0
                            ? `${valorantBulkSync.retries} Wiederholungen`
                            : `${valorantBulkProgressPercent}%`)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-900">
                      <div
                        className="h-full rounded-full bg-sky-400 transition-all duration-300"
                        style={{ width: `${valorantBulkProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {users.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-10 text-center">
                <h2 className="text-2xl font-bold text-white">Noch keine User</h2>
                <p className="text-gray-400 mt-2">Sobald sich Spieler registrieren, erscheinen sie hier.</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-10 text-center">
                <h2 className="text-2xl font-bold text-white">Keine passenden User</h2>
                <p className="text-gray-400 mt-2">Für diesen Teilnahmefilter wurden keine User gefunden.</p>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredUsers.map((user) => {
                  const displayName = getUserDisplayName(user)
                  const verification = getVerificationSummary(user)
                  const tierKey = resolveTierKey(user.tier)
                  const tierBadgeClass = tierKey ? TIER_BADGE_CLASSES[tierKey] : 'bg-gray-700 text-gray-300'
                  const tierBadgeLabel = tierKey ? formatTierShortLabel(tierKey) : 'KEIN TIER'
                  const levelKnown = typeof user.valorantLevel === 'number'
                  const levelReady = levelKnown && user.valorantLevel! >= MIN_VALORANT_LEVEL
                  const valorantDetails = valorantDetailsByUser[user.id]
                  const verificationLabel =
                    verification.total === 0
                      ? 'Keine Daten'
                      : verification.complete
                        ? 'Voll verifiziert'
                        : verification.partial
                          ? `${verification.verified}/${verification.total} verifiziert`
                          : 'Nicht verifiziert'
                  const verificationClass =
                    verification.total === 0
                      ? 'bg-gray-700 text-gray-300 border-gray-600'
                      : verification.complete
                        ? 'bg-green-600/20 text-green-200 border-green-500/60'
                        : verification.partial
                          ? 'bg-yellow-600/20 text-yellow-200 border-yellow-500/60'
                          : 'bg-red-600/20 text-red-200 border-red-500/60'
                  const verificationItems = [
                    { key: 'twitch' as const, label: 'Twitch', value: user.twitchName, verified: user.twitchVerified },
                    { key: 'discord' as const, label: 'Discord', value: user.discordName, verified: user.discordVerified },
                    { key: 'instagram' as const, label: 'Instagram', value: user.instagramName, verified: user.instagramVerified },
                    { key: 'tiktok' as const, label: 'TikTok', value: user.tiktokName, verified: user.tiktokVerified },
                  ]

                  return (
                    <div key={user.id} className="bg-gray-800 rounded-lg border border-gray-700 p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-bold text-white truncate">{displayName}</h2>
                            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${verificationClass}`}>
                              {verificationLabel}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                            <span>Ingame: {user.inGameName || 'Nicht angegeben'}</span>
                            <span>{user.team?.name || 'Kein Team'}</span>
                            <span>Seit {formatJoinDate(user.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 md:self-start">
                          <button
                            type="button"
                            onClick={() => openUserProfileEditor(user)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-600 bg-gray-700 text-xl text-white transition-colors hover:border-sky-400 hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                            title="Profildaten bearbeiten"
                            aria-label={`${displayName} bearbeiten`}
                          >
                            ⚙
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, displayName)}
                            disabled={deletingUser === user.id}
                            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                          >
                            {deletingUser === user.id ? 'Lösche...' : 'Löschen'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span
                          className={`px-3 py-1 rounded-full border text-xs font-bold ${
                            !levelKnown
                              ? 'bg-gray-700/70 text-gray-300 border-gray-600'
                              : levelReady
                                ? 'bg-cyan-600/20 text-cyan-200 border-cyan-500/60'
                                : 'bg-red-600/20 text-red-200 border-red-500/60'
                          }`}
                        >
                          {levelKnown ? `LVL ${user.valorantLevel}` : 'LVL OFFEN'}
                        </span>
                        <span className="px-3 py-1 rounded-full border border-sky-500/60 bg-sky-600/20 text-sky-200 text-xs font-bold">
                          {user.valorantCurrentRank ? `AKTUELL ${user.valorantCurrentRank}` : 'AKTUELL OFFEN'}
                        </span>
                        <span className="px-3 py-1 rounded-full border border-indigo-500/60 bg-indigo-600/20 text-indigo-200 text-xs font-bold">
                          {user.inGameRank ? `PEAK ${user.inGameRank}` : 'PEAK OFFEN'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${tierBadgeClass}`}>
                          {tierBadgeLabel}
                        </span>
                        {user.isStreamer && (
                          <span className="px-3 py-1 rounded-full border border-pink-500/60 bg-pink-600/20 text-pink-200 text-xs font-bold">
                            STREAMER
                          </span>
                        )}
                        {user.isIGL && (
                          <span className="px-3 py-1 rounded-full border border-blue-500/60 bg-blue-600/20 text-blue-200 text-xs font-bold">
                            IGL
                          </span>
                        )}
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                              Tier
                            </label>
                            <select
                              value={user.tier || ''}
                              onChange={(e) => updateTier(user.id, e.target.value)}
                              className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-400"
                            >
                              <option value="">Kein Tier</option>
                              {TIER_SELECT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                              Team
                            </label>
                            <select
                              value={user.team ? user.team.name : ''}
                              onChange={(e) => updateTeamAssignment(user.id, e.target.value)}
                              className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-400"
                            >
                              <option value="">Kein Team</option>
                              {resolvedTeamOptions.map((team) => (
                                <option key={team.id} value={team.name}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => toggleStreamerStatus(user.id)}
                            className={`w-full rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                              user.isStreamer
                                ? 'bg-pink-600 text-white hover:bg-pink-700'
                                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                            }`}
                          >
                            {user.isStreamer ? 'Streamer entfernen' : 'Als Streamer markieren'}
                          </button>

                          <button
                            onClick={() => toggleIglStatus(user.id)}
                            className={`w-full rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                              user.isIGL
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                            }`}
                          >
                            {user.isIGL ? 'IGL entfernen' : 'Als IGL markieren'}
                          </button>

                          <button
                            onClick={() => loadValorantDetails(user.id)}
                            disabled={valorantBulkSync.isRunning || valorantDetails?.loading || !user.inGameName}
                            className="w-full rounded-md border border-sky-500/50 bg-sky-600/20 px-3 py-2 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-600/30 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                          >
                            {valorantDetails?.loading
                              ? 'Lade Valorant Daten...'
                              : valorantDetails?.data
                                ? 'Valorant Daten aktualisieren'
                                : 'Valorant Daten anzeigen'}
                          </button>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Social Media
                            </label>
                            <span className="text-xs text-gray-500">
                              Handles & Verifikation
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {verificationItems.map((item) => (
                              <button
                                key={item.key}
                                onClick={() => toggleSocialVerification(user.id, item.key, item.verified)}
                                disabled={!item.value}
                                className={`rounded-md border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed ${
                                  !item.value
                                    ? 'bg-gray-900/50 border-gray-800 text-gray-600'
                                    : item.verified
                                      ? 'bg-green-600/15 border-green-500/60 text-green-200 hover:bg-green-600/25'
                                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-yellow-500 hover:text-yellow-200'
                                }`}
                              >
                                <span className="block font-semibold">{item.label}</span>
                                <span className={`mt-1 block truncate ${item.value ? 'text-white' : 'text-gray-600'}`}>
                                  {item.value || 'Nicht angegeben'}
                                </span>
                                <span className="block mt-1 text-[11px] uppercase tracking-wide">
                                  {!item.value ? 'Fehlt' : item.verified ? 'Verifiziert' : 'Offen'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {valorantDetails?.error && (
                        <div className="mt-4 flex flex-col gap-3 rounded-md border border-red-500/40 bg-red-600/15 p-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between">
                          <span>{valorantDetails.error}</span>
                          <button
                            onClick={() => closeValorantDetails(user.id)}
                            className="self-start rounded-md border border-red-400/50 px-3 py-1 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/20 sm:self-auto"
                          >
                            Schließen
                          </button>
                        </div>
                      )}

                      {valorantDetails?.data && (
                        <div className="mt-5 rounded-lg border border-sky-500/25 bg-gray-950/50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                                Valorant Details
                              </div>
                              <div className="mt-1 text-sm text-gray-400">
                                Region {valorantDetails.data.region.toUpperCase()} - letzte Competitive Matches
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {valorantDetails.data.leaderboardRank && (
                                <div className="text-sm font-semibold text-yellow-200">
                                  Leaderboard #{formatNumber(valorantDetails.data.leaderboardRank)}
                                </div>
                              )}
                              <button
                                onClick={() => closeValorantDetails(user.id)}
                                className="rounded-md border border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:border-sky-400 hover:text-sky-100"
                              >
                                Schließen
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-md border border-gray-700 bg-gray-900/70 p-3">
                              <div className="text-xs uppercase tracking-wide text-gray-500">Aktueller Rank</div>
                              <div className="mt-1 text-lg font-bold text-sky-200">
                                {valorantDetails.data.currentRank || 'Offen'}
                              </div>
                            </div>
                            <div className="rounded-md border border-gray-700 bg-gray-900/70 p-3">
                              <div className="text-xs uppercase tracking-wide text-gray-500">RR</div>
                              <div className="mt-1 text-lg font-bold text-green-200">
                                {formatNumber(valorantDetails.data.rankRating)}
                              </div>
                            </div>
                            <div className="rounded-md border border-gray-700 bg-gray-900/70 p-3">
                              <div className="text-xs uppercase tracking-wide text-gray-500">MMR</div>
                              <div className="mt-1 text-lg font-bold text-purple-200">
                                {formatNumber(valorantDetails.data.mmr)}
                              </div>
                            </div>
                            <div className="rounded-md border border-gray-700 bg-gray-900/70 p-3">
                              <div className="text-xs uppercase tracking-wide text-gray-500">K/D</div>
                              <div className="mt-1 text-lg font-bold text-red-200">
                                {formatKdRatio(
                                  valorantDetails.data.totals.kdRatio,
                                  valorantDetails.data.matches.length > 0
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-md border border-gray-700 bg-gray-900/50 p-3">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300">
                              <span>Kills {valorantDetails.data.totals.kills}</span>
                              <span>Deaths {valorantDetails.data.totals.deaths}</span>
                              <span>Assists {valorantDetails.data.totals.assists}</span>
                              {typeof valorantDetails.data.lastRankChange === 'number' && (
                                <span>
                                  Letzte RR-Änderung {valorantDetails.data.lastRankChange > 0 ? '+' : ''}
                                  {valorantDetails.data.lastRankChange}
                                </span>
                              )}
                            </div>
                          </div>

                          {valorantDetails.data.matchHistoryError && (
                            <div className="mt-3 rounded-md border border-yellow-500/40 bg-yellow-600/15 p-3 text-sm text-yellow-100">
                              {valorantDetails.data.matchHistoryError}
                            </div>
                          )}

                          <div className="mt-4 space-y-2">
                            {valorantDetails.data.matches.length === 0 ? (
                              <div className="rounded-md border border-gray-700 bg-gray-900/60 p-3 text-sm text-gray-400">
                                Keine Match-History gefunden.
                              </div>
                            ) : (
                              valorantDetails.data.matches.map((match, index) => (
                                <div
                                  key={match.matchId || `${user.id}-match-${index}`}
                                  className="rounded-md border border-gray-700 bg-gray-900/60 p-3"
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                                            match.won === true
                                              ? 'border-green-500/60 bg-green-600/20 text-green-200'
                                              : match.won === false
                                                ? 'border-red-500/60 bg-red-600/20 text-red-200'
                                                : 'border-gray-600 bg-gray-700/70 text-gray-300'
                                          }`}
                                        >
                                          {match.won === true ? 'WIN' : match.won === false ? 'LOSS' : 'OFFEN'}
                                        </span>
                                        <span className="font-semibold text-white">
                                          {match.map || 'Map offen'}
                                        </span>
                                        <span className="text-sm text-gray-400">
                                          {match.agent || 'Agent offen'}
                                        </span>
                                        {match.roundsWon !== undefined && match.roundsLost !== undefined && (
                                          <span className="text-sm text-gray-500">
                                            {match.roundsWon}:{match.roundsLost}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-1 text-xs text-gray-500">
                                        {formatMatchDate(match.startedAt)} - {match.mode || 'Modus offen'}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-200">
                                      <span>{match.kills}/{match.deaths}/{match.assists}</span>
                                      <span className="text-gray-500">K/D/A</span>
                                      {match.rank && (
                                        <span className="rounded-full border border-sky-500/40 bg-sky-600/15 px-2 py-1 text-xs text-sky-200">
                                          {match.rank}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {editingUser && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeUserProfileEditor()
              }
            }}
          >
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-gray-600 bg-gray-900 shadow-2xl">
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-700 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">User Management</p>
                  <h2 id="edit-user-title" className="truncate text-2xl font-bold text-white">
                    {getUserDisplayName(editingUser)} bearbeiten
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeUserProfileEditor}
                  disabled={savingUserProfile}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-600 bg-gray-800 text-xl text-gray-200 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
                  aria-label="Fenster schließen"
                  title="Schließen"
                >
                  ×
                </button>
              </div>

              <div className="min-h-0 space-y-4 overflow-y-auto p-5">
                <div>
                  <label htmlFor="edit-ingame-name" className="mb-1.5 block text-sm font-semibold text-gray-200">
                    Ingame-Name
                  </label>
                  <input
                    id="edit-ingame-name"
                    type="text"
                    maxLength={100}
                    value={userProfileForm.inGameName}
                    onChange={(event) =>
                      setUserProfileForm((prev) => ({ ...prev, inGameName: event.target.value }))
                    }
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2.5 text-white outline-none transition-colors focus:border-sky-400"
                    placeholder="Name#Tag"
                  />
                </div>

                <div>
                  <label htmlFor="edit-discord-name" className="mb-1.5 block text-sm font-semibold text-gray-200">
                    Discord-Name
                  </label>
                  <input
                    id="edit-discord-name"
                    type="text"
                    maxLength={100}
                    value={userProfileForm.discordName}
                    onChange={(event) =>
                      setUserProfileForm((prev) => ({ ...prev, discordName: event.target.value }))
                    }
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2.5 text-white outline-none transition-colors focus:border-sky-400"
                    placeholder="Discord-Name"
                  />
                </div>

                <div>
                  <label htmlFor="edit-instagram-name" className="mb-1.5 block text-sm font-semibold text-gray-200">
                    Instagram-Name
                  </label>
                  <input
                    id="edit-instagram-name"
                    type="text"
                    maxLength={100}
                    value={userProfileForm.instagramName}
                    onChange={(event) =>
                      setUserProfileForm((prev) => ({ ...prev, instagramName: event.target.value }))
                    }
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2.5 text-white outline-none transition-colors focus:border-sky-400"
                    placeholder="Instagram-Name"
                  />
                </div>

                <div>
                  <label htmlFor="edit-tiktok-name" className="mb-1.5 block text-sm font-semibold text-gray-200">
                    TikTok-Name
                  </label>
                  <input
                    id="edit-tiktok-name"
                    type="text"
                    maxLength={100}
                    value={userProfileForm.tiktokName}
                    onChange={(event) =>
                      setUserProfileForm((prev) => ({ ...prev, tiktokName: event.target.value }))
                    }
                    className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2.5 text-white outline-none transition-colors focus:border-sky-400"
                    placeholder="TikTok-Name"
                  />
                </div>

                {userProfileError && (
                  <div className="rounded-md border border-red-500/50 bg-red-500/15 px-3 py-2 text-sm text-red-100">
                    {userProfileError}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-700 bg-gray-950/60 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeUserProfileEditor}
                  disabled={savingUserProfile}
                  className="rounded-md border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={saveUserProfile}
                  disabled={savingUserProfile}
                  className="rounded-md bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-wait disabled:bg-gray-700"
                >
                  {savingUserProfile ? 'Speichert...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
