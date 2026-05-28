'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatTierShortLabel, resolveTierKey, TIER_SELECT_OPTIONS, type TierKey } from '@/lib/tierConfig'
import { DEFAULT_TEAM_NAMES } from '@/lib/teamDefaults'
import { MIN_VALORANT_LEVEL } from '@/lib/valorantRequirements'

const TIER_BADGE_CLASSES: Record<TierKey, string> = {
  tier1: 'bg-blue-600 text-white',
  tier2: 'bg-green-600 text-white',
  tier3: 'bg-yellow-600 text-white',
  tier4: 'bg-orange-600 text-white'
}

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
  isVerified: boolean
  rulesAccepted: boolean
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

type ValorantDetailsState = {
  loading: boolean
  error?: string
  data?: ValorantDetails
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
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [resettingTeams, setResettingTeams] = useState(false)
  const [valorantDetailsByUser, setValorantDetailsByUser] = useState<Record<string, ValorantDetailsState>>({})
  const router = useRouter()
  const resolvedTeamOptions = teamOptions.length > 0
    ? [...teamOptions].sort((a, b) => a.position - b.position)
    : DEFAULT_TEAM_NAMES.map((name, index) => ({
        id: `default-${index + 1}`,
        name,
        position: index + 1
      }))

  useEffect(() => {
    fetchData()
  }, [])

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

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
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
    } catch (error) {
      setValorantDetailsByUser((prev) => ({
        ...prev,
        [userId]: {
          loading: false,
          error: error instanceof Error ? error.message : 'Valorant Details konnten nicht geladen werden',
        },
      }))
    }
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
    const socialItems = [
      { value: user.twitchName, verified: user.twitchVerified },
      { value: user.instagramName, verified: user.instagramVerified },
      { value: user.discordName, verified: user.discordVerified },
      { value: user.tiktokName, verified: user.tiktokVerified },
    ]
    const gameItems = [
      { value: user.inGameName, verified: user.inGameNameVerified },
      { value: user.inGameRank, verified: user.inGameRankVerified },
    ]
    const allItems = [...socialItems, ...gameItems].filter((item) => item.value)
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
                    <div className="text-2xl font-bold text-cyan-300">
                      {
                        users.filter(
                          (user) =>
                            typeof user.valorantLevel === 'number' &&
                            user.valorantLevel >= MIN_VALORANT_LEVEL
                        ).length
                      }
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Level OK</div>
                  </div>
                  <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-3 min-w-28">
                    <div className="text-2xl font-bold text-blue-300">
                      {users.filter((user) => user.team).length}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Im Team</div>
                  </div>
                </div>
              </div>
            </div>

            {users.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-10 text-center">
                <h2 className="text-2xl font-bold text-white">Noch keine User</h2>
                <p className="text-gray-400 mt-2">Sobald sich Spieler registrieren, erscheinen sie hier.</p>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {users.map((user) => {
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
                    { key: 'inGameName' as const, label: 'Riot ID', value: user.inGameName, verified: user.inGameNameVerified },
                    { key: 'inGameRank' as const, label: 'Rank', value: user.inGameRank, verified: user.inGameRankVerified },
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
                            <span>{user.inGameName || 'Riot ID offen'}</span>
                            <span>{user.team?.name || 'Kein Team'}</span>
                            <span>Seit {formatJoinDate(user.createdAt)}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteUser(user.id, displayName)}
                          disabled={deletingUser === user.id}
                          className="md:self-start rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                        >
                          {deletingUser === user.id ? 'Loesche...' : 'Loeschen'}
                        </button>
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
                            onClick={() => loadValorantDetails(user.id)}
                            disabled={valorantDetails?.loading || !user.inGameName}
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
                              Verifikation
                            </label>
                            <span className="text-xs text-gray-500">
                              Mindestlevel {MIN_VALORANT_LEVEL}
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
                                <span className="block mt-1 truncate">
                                  {!item.value ? 'Fehlt' : item.verified ? 'Verifiziert' : 'Offen'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {valorantDetails?.error && (
                        <div className="mt-4 rounded-md border border-red-500/40 bg-red-600/15 p-3 text-sm text-red-200">
                          {valorantDetails.error}
                        </div>
                      )}

                      {valorantDetails?.data && (
                        <div className="mt-5 rounded-lg border border-sky-500/25 bg-gray-950/50 p-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                                Valorant Details
                              </div>
                              <div className="mt-1 text-sm text-gray-400">
                                Region {valorantDetails.data.region.toUpperCase()} - letzte Competitive Matches
                              </div>
                            </div>
                            {valorantDetails.data.leaderboardRank && (
                              <div className="text-sm font-semibold text-yellow-200">
                                Leaderboard #{formatNumber(valorantDetails.data.leaderboardRank)}
                              </div>
                            )}
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
                                  Letzte RR-Aenderung {valorantDetails.data.lastRankChange > 0 ? '+' : ''}
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
      </div>
    </div>
  )
}
