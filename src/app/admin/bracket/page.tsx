'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  applyEliminationTeamOrder,
  buildBracketMatches,
  type BracketConnection,
  type BracketMatch,
  type BracketMode,
  type BracketNodeLayout,
  type BracketTeam
} from '@/lib/bracketStructure'
import type { MatchState } from '@/lib/matchState'
import BracketDiagram from '@/components/bracket/BracketDiagram'
import { MAX_TEAMS } from '@/lib/teamDefaults'
import { MAX_GROUP_COUNT, PLAYOFF_TEAM_COUNT, buildGroupPhase, clampGroupCount, type GroupPhaseResult } from '@/lib/groupPhase'
import AdminTopbar from '@/components/AdminTopbar'

const createStateMap = (states: any[]): Map<string, MatchState> => {
  const map = new Map<string, MatchState>()

  states?.forEach((state) => {
    map.set(state.matchId, {
      isLive: Boolean(state.isLive),
      team1Score: Number(state.team1Score) || 0,
      team2Score: Number(state.team2Score) || 0,
      isFinished: Boolean(state.isFinished),
      winnerId: state.winnerId || undefined,
      mapName: state.mapName || undefined,
      lastUpdated: state.lastUpdated || Date.now(),
      source: state.source === 'database' ? 'database' : 'memory'
    })
  })

  return map
}

type BracketSettingsState = {
  mode: BracketMode
  teamSlots: number
  tournamentStarted: boolean
  groupPhaseEnabled: boolean
  groupCount: number
  activeGroupRound: number
  groupTeamOrder: string[]
  eliminationTeamOrder: string[]
}

type AdminChatMessage = {
  id: string
  matchId: string
  senderUserId: string
  senderTeamId: string
  senderName: string
  senderTeamName: string
  message: string
  createdAt: string
}

type AdminChatThread = {
  matchId: string
  isLive: boolean
  isFinished: boolean
  mapName: string | null
  team1Name: string | null
  team2Name: string | null
  messages: AdminChatMessage[]
}

const MIN_TEAM_SLOTS = 2
const MAX_TEAM_SLOTS = MAX_TEAMS

const formatAdminTeamName = (team?: BracketTeam | null, fallback = 'TBD') => {
  if (!team) {
    return fallback
  }

  const slotPosition = team.slotPosition ?? team.position
  const slotName = slotPosition > 0 ? `Team ${slotPosition}` : ''
  if (!slotName || team.name === slotName) {
    return team.name
  }

  return `${team.name} (${slotName})`
}

const isInitialEliminationMatch = (match: BracketMatch) => (
  match.roundOrder === 1 && (match.bracket === 'winner' || match.bracket === 'grand')
)

const isRealEliminationTeam = (team?: BracketTeam) => Boolean(
  team &&
  !team.id.startsWith('virtual-') &&
  !team.id.startsWith('placeholder-') &&
  team.name !== 'TBD' &&
  team.name !== 'Freilos'
)

const clampTeamSlots = (value: number): number => {
  const numericValue = Number.isFinite(value) ? value : Number(value)
  const fallback = Number.isFinite(numericValue) ? numericValue : MIN_TEAM_SLOTS
  return Math.min(Math.max(Math.floor(fallback), MIN_TEAM_SLOTS), MAX_TEAM_SLOTS)
}

const DEFAULT_BRACKET_SETTINGS: BracketSettingsState = {
  mode: 'double',
  teamSlots: 16,
  tournamentStarted: false,
  groupPhaseEnabled: false,
  groupCount: 4,
  activeGroupRound: 0,
  groupTeamOrder: [],
  eliminationTeamOrder: []
}

const MODE_LABELS: Record<BracketMode, string> = {
  single: 'Single Elimination',
  double: 'Double Elimination'
}

const toDatetimeLocalValue = (isoValue?: string | null) => {
  if (!isoValue) {
    return ''
  }

  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

const datetimeLocalToIso = (value: string) => {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return null
  }

  const date = new Date(trimmedValue)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
}

const formatParticipationDeadline = (isoValue?: string | null) => {
  if (!isoValue) {
    return 'Keine Endzeit gesetzt'
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(isoValue))
}

export default function AdminBracketPage() {
  const [teams, setTeams] = useState<BracketTeam[]>([])
  const [bracket, setBracket] = useState<BracketMatch[]>([])
  const [layout, setLayout] = useState<BracketNodeLayout[]>([])
  const [connections, setConnections] = useState<BracketConnection[]>([])
  const [groupPhase, setGroupPhase] = useState<GroupPhaseResult | null>(null)
  const [slotCount, setSlotCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)
  const [scoreInputs, setScoreInputs] = useState({ team1: '0', team2: '0' })
  const [renameInputs, setRenameInputs] = useState({ team1: '', team2: '' })
  const [panelMessage, setPanelMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [liveMutationLoading, setLiveMutationLoading] = useState(false)
  const [scoreMutationLoading, setScoreMutationLoading] = useState(false)
  const [teamRenameLoading, setTeamRenameLoading] = useState<'team1' | 'team2' | null>(null)
  const selectedMatchIdRef = useRef<string | null>(null)
  const [bracketSettings, setBracketSettings] = useState<BracketSettingsState>(() => ({ ...DEFAULT_BRACKET_SETTINGS }))
  const [settingsDraft, setSettingsDraft] = useState<BracketSettingsState>(() => ({ ...DEFAULT_BRACKET_SETTINGS }))
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [tournamentStartLoading, setTournamentStartLoading] = useState(false)
  const [groupRoundLoading, setGroupRoundLoading] = useState(false)
  const [groupOrderSaving, setGroupOrderSaving] = useState(false)
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null)
  const [dropTargetTeamId, setDropTargetTeamId] = useState<string | null>(null)
  const [eliminationOrderSaving, setEliminationOrderSaving] = useState(false)
  const [draggedEliminationTeamId, setDraggedEliminationTeamId] = useState<string | null>(null)
  const [dropTargetEliminationTeamId, setDropTargetEliminationTeamId] = useState<string | null>(null)
  const [participationOpen, setParticipationOpen] = useState(false)
  const [participatingCount, setParticipatingCount] = useState(0)
  const [registeredUserCount, setRegisteredUserCount] = useState(0)
  const [participationEndsAt, setParticipationEndsAt] = useState<string | null>(null)
  const [participationDeadlineInput, setParticipationDeadlineInput] = useState('')
  const [participationLoading, setParticipationLoading] = useState(false)
  const [participationResetLoading, setParticipationResetLoading] = useState(false)
  const [participationDeadlineSaving, setParticipationDeadlineSaving] = useState(false)
  const [participationReminderLoading, setParticipationReminderLoading] = useState(false)
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [chatThreads, setChatThreads] = useState<AdminChatThread[]>([])
  const [selectedChatMatchId, setSelectedChatMatchId] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [settingsAlert, setSettingsAlert] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const participationDeadlineEditingRef = useRef(false)
  const participationDeadlineDirtyRef = useRef(false)
  const settingsChanged =
    settingsDraft.mode !== bracketSettings.mode ||
    settingsDraft.teamSlots !== bracketSettings.teamSlots ||
    settingsDraft.groupPhaseEnabled !== bracketSettings.groupPhaseEnabled ||
    settingsDraft.groupCount !== bracketSettings.groupCount
  const modeOptions: BracketMode[] = ['double', 'single']
  const configuredSlotCount = bracketSettings.teamSlots
  const activeBracketSlots = bracketSettings.groupPhaseEnabled ? PLAYOFF_TEAM_COUNT : configuredSlotCount
  const autoFreilosCount = slotCount > 0 && configuredSlotCount > 0
    ? Math.max(slotCount - activeBracketSlots, 0)
    : 0
  const pendingParticipationCount = Math.max(registeredUserCount - participatingCount, 0)
  const currentGroupRound = groupPhase?.rounds.find(
    (round) => round.round === bracketSettings.activeGroupRound
  )
  const canActivateNextGroupRound = Boolean(
    bracketSettings.groupPhaseEnabled &&
    bracketSettings.tournamentStarted &&
    groupPhase &&
    bracketSettings.activeGroupRound < groupPhase.totalRounds &&
    (bracketSettings.activeGroupRound === 0 || currentGroupRound?.isComplete)
  )
  const canReorderGroupTeams = Boolean(
    groupPhase &&
    bracketSettings.groupPhaseEnabled &&
    bracketSettings.activeGroupRound === 0 &&
    !groupOrderSaving
  )
  const eliminationBracketStarted = bracket.some((match) =>
    match.isLive ||
    match.isFinished ||
    (match.team1Score ?? 0) > 0 ||
    (match.team2Score ?? 0) > 0
  )
  const canReorderEliminationTeams = Boolean(
    bracket.length > 0 &&
    !eliminationOrderSaving &&
    !eliminationBracketStarted
  )

  useEffect(() => {
    checkAdminAuth()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const interval = window.setInterval(fetchParticipationStatus, 4000)
    return () => window.clearInterval(interval)
  }, [isAuthenticated])

  useEffect(() => {
    if (!selectedMatch && !chatModalOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedMatch) {
          clearMatchSelection()
        } else {
          setChatModalOpen(false)
        }
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedMatch, chatModalOpen])

  useEffect(() => {
    if (!chatModalOpen) {
      return
    }

    const interval = window.setInterval(() => fetchChatThreads(false), 4000)
    return () => window.clearInterval(interval)
  }, [chatModalOpen])

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/check', {
        credentials: 'include'
      })

      if (response.ok) {
        setIsAuthenticated(true)
        await Promise.all([fetchData(), fetchParticipationStatus()])
      } else {
        setIsAuthenticated(false)
        window.location.href = '/admin?redirect=' + encodeURIComponent('/admin/bracket')
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error)
      setIsAuthenticated(false)
      window.location.href = '/admin?redirect=' + encodeURIComponent('/admin/bracket')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const fetchData = async (showMainSpinner = true) => {
    try {
      if (showMainSpinner) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const requestInit: RequestInit = { credentials: 'include' }

      const [teamsRes, statesRes, settingsRes] = await Promise.all([
        fetch('/api/admin/teams', requestInit),
        fetch('/api/admin/bracket/matches/live-states', requestInit),
        fetch('/api/admin/bracket/settings', requestInit)
      ])

      let fetchedTeams: BracketTeam[] = []
      if (teamsRes.ok) {
        const payload = await teamsRes.json()
        fetchedTeams = (payload.teams || []).map((team: any) => ({
          id: team.id,
          name: team.name,
          position: team.position || 0
        }))
      }

      let stateMap = new Map<string, MatchState>()
      if (statesRes.ok) {
        const statePayload = await statesRes.json()
        stateMap = createStateMap(statePayload.states || [])
      }

      let persistedSettings: BracketSettingsState = { ...DEFAULT_BRACKET_SETTINGS }
      if (settingsRes.ok) {
        const settingsPayload = await settingsRes.json()
        if (settingsPayload?.settings) {
          persistedSettings = {
            mode: settingsPayload.settings.mode === 'single' ? 'single' : 'double',
            teamSlots: clampTeamSlots(settingsPayload.settings.teamSlots),
            tournamentStarted: Boolean(settingsPayload.settings.tournamentStarted),
            groupPhaseEnabled: Boolean(settingsPayload.settings.groupPhaseEnabled),
            groupCount: clampGroupCount(settingsPayload.settings.groupCount, clampTeamSlots(settingsPayload.settings.teamSlots)),
            activeGroupRound: Math.max(0, Math.floor(Number(settingsPayload.settings.activeGroupRound) || 0)),
            groupTeamOrder: Array.isArray(settingsPayload.settings.groupTeamOrder)
              ? settingsPayload.settings.groupTeamOrder.filter((teamId: unknown): teamId is string => typeof teamId === 'string')
              : [],
            eliminationTeamOrder: Array.isArray(settingsPayload.settings.eliminationTeamOrder)
              ? settingsPayload.settings.eliminationTeamOrder.filter((teamId: unknown): teamId is string => typeof teamId === 'string')
              : []
          }
        }
      }

      const limitedTeams = fetchedTeams
        .filter((team) => team.position <= persistedSettings.teamSlots)
        .slice(0, persistedSettings.teamSlots)

      setTeams(limitedTeams)
      setBracketSettings(persistedSettings)
      setSettingsDraft(persistedSettings)

      const nextGroupPhase = persistedSettings.groupPhaseEnabled
        ? buildGroupPhase(
            limitedTeams,
            persistedSettings.groupCount,
            PLAYOFF_TEAM_COUNT,
            persistedSettings.teamSlots,
            stateMap,
            persistedSettings.activeGroupRound,
            persistedSettings.groupTeamOrder
          )
        : null
      const bracketTeams = applyEliminationTeamOrder(
        nextGroupPhase?.advancingTeams || limitedTeams,
        persistedSettings.eliminationTeamOrder
      )
      const bracketSlotCount = persistedSettings.groupPhaseEnabled ? PLAYOFF_TEAM_COUNT : persistedSettings.teamSlots

      setGroupPhase(nextGroupPhase)

      const bracketResult = buildBracketMatches(bracketTeams, stateMap, {
        mode: persistedSettings.mode,
        slotCount: bracketSlotCount,
        autoAdvanceByes: persistedSettings.tournamentStarted
      })
      setBracket(bracketResult.matches)
      setLayout(bracketResult.layout)
      setConnections(bracketResult.connections)
      setSlotCount(bracketResult.slotCount)

      if (selectedMatchIdRef.current) {
        const refreshed = [
          ...(nextGroupPhase?.rounds.flatMap((round) => round.matches) || []),
          ...bracketResult.matches
        ].find(match => match.id === selectedMatchIdRef.current)
        if (refreshed) {
          setSelectedMatch(refreshed)
          setScoreInputs({
            team1: String(refreshed.team1Score ?? 0),
            team2: String(refreshed.team2Score ?? 0)
          })
          setRenameInputs({
            team1: refreshed.team1?.name || '',
            team2: refreshed.team2?.name || ''
          })
        }
      }
    } catch (error) {
      console.error('Error fetching bracket data:', error)
    } finally {
      if (showMainSpinner) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  const handleModeSelect = (mode: BracketMode) => {
    setSettingsDraft((prev) => ({ ...prev, mode }))
    setSettingsAlert(null)
  }

  const handleSlotValueChange = (value: number) => {
    setSettingsDraft((prev) => {
      const teamSlots = clampTeamSlots(value)
      return {
        ...prev,
        teamSlots,
        groupCount: clampGroupCount(prev.groupCount, teamSlots)
      }
    })
    setSettingsAlert(null)
  }

  const fetchParticipationStatus = async () => {
    try {
      const response = await fetch('/api/admin/participation', {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setParticipationOpen(Boolean(data.open))
        setParticipatingCount(Number(data.participatingCount) || 0)
        setRegisteredUserCount(Number(data.userCount) || 0)
        setParticipationEndsAt(data.participationEndsAt || null)
        if (!participationDeadlineEditingRef.current && !participationDeadlineDirtyRef.current) {
          setParticipationDeadlineInput(toDatetimeLocalValue(data.participationEndsAt))
        }
      }
    } catch (error) {
      console.error('Participation status error:', error)
    }
  }

  const toggleParticipation = async () => {
    if (participationLoading) {
      return
    }

    const nextAction = participationOpen ? 'close' : 'open'
    const deadlineIso = datetimeLocalToIso(participationDeadlineInput)
    if (nextAction === 'open' && deadlineIso === undefined) {
      setSettingsAlert({ type: 'error', text: 'Bitte gib eine gültige Teilnahme-Endzeit ein.' })
      return
    }

    setParticipationLoading(true)
    setSettingsAlert(null)

    try {
      const response = await fetch('/api/admin/participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: nextAction,
          ...(nextAction === 'open' ? { participationEndsAt: deadlineIso } : {}),
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Teilnahme konnte nicht aktualisiert werden.')
      }

      setParticipationOpen(Boolean(data.open))
      setParticipatingCount(Number(data.participatingCount) || 0)
      setRegisteredUserCount(Number(data.userCount) || 0)
      setParticipationEndsAt(data.participationEndsAt || null)
      participationDeadlineDirtyRef.current = false
      setParticipationDeadlineInput(toDatetimeLocalValue(data.participationEndsAt))
      setSettingsAlert({ type: 'success', text: data.message })
    } catch (error) {
      setSettingsAlert({
        type: 'error',
        text: error instanceof Error ? error.message : 'Teilnahme konnte nicht aktualisiert werden.',
      })
    } finally {
      setParticipationLoading(false)
    }
  }

  const resetParticipation = async () => {
    if (
      participationResetLoading ||
      !window.confirm('Möchtest du wirklich alle Teilnahme-Bestätigungen zurücksetzen?')
    ) {
      return
    }

    setParticipationResetLoading(true)
    setSettingsAlert(null)

    try {
      const response = await fetch('/api/admin/participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reset' }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Teilnahmen konnten nicht zurückgesetzt werden.')
      }

      setParticipationOpen(Boolean(data.open))
      setParticipatingCount(Number(data.participatingCount) || 0)
      setRegisteredUserCount(Number(data.userCount) || 0)
      setParticipationEndsAt(data.participationEndsAt || null)
      participationDeadlineDirtyRef.current = false
      setParticipationDeadlineInput(toDatetimeLocalValue(data.participationEndsAt))
      setSettingsAlert({
        type: 'success',
        text: data.message || 'Teilnahmen wurden zurückgesetzt.',
      })
    } catch (error) {
      setSettingsAlert({
        type: 'error',
        text: error instanceof Error ? error.message : 'Teilnahmen konnten nicht zurückgesetzt werden.',
      })
    } finally {
      setParticipationResetLoading(false)
    }
  }

  const sendParticipationReminders = async () => {
    if (
      participationReminderLoading ||
      !participationOpen ||
      !window.confirm(
        `Discord-Erinnerung an bis zu ${pendingParticipationCount} Nicht-Teilnehmer senden?`
      )
    ) {
      return
    }

    setParticipationReminderLoading(true)
    setSettingsAlert(null)

    try {
      const response = await fetch('/api/admin/participation/remind', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Discord-Erinnerungen konnten nicht gesendet werden.')
      }

      setSettingsAlert({
        type: 'success',
        text: data.message || 'Discord-Erinnerungen wurden versendet.',
      })
      await fetchParticipationStatus()
    } catch (error) {
      setSettingsAlert({
        type: 'error',
        text: error instanceof Error ? error.message : 'Discord-Erinnerungen konnten nicht gesendet werden.',
      })
    } finally {
      setParticipationReminderLoading(false)
    }
  }

  const saveParticipationDeadline = async () => {
    if (participationDeadlineSaving) {
      return
    }

    const deadlineIso = datetimeLocalToIso(participationDeadlineInput)
    if (deadlineIso === undefined) {
      setSettingsAlert({ type: 'error', text: 'Bitte gib eine gültige Teilnahme-Endzeit ein.' })
      return
    }

    setParticipationDeadlineSaving(true)
    setSettingsAlert(null)

    try {
      const response = await fetch('/api/admin/participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'deadline',
          participationEndsAt: deadlineIso,
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Endzeit konnte nicht gespeichert werden.')
      }

      setParticipationOpen(Boolean(data.open))
      setParticipatingCount(Number(data.participatingCount) || 0)
      setRegisteredUserCount(Number(data.userCount) || 0)
      setParticipationEndsAt(data.participationEndsAt || null)
      participationDeadlineDirtyRef.current = false
      setParticipationDeadlineInput(toDatetimeLocalValue(data.participationEndsAt))
      setSettingsAlert({
        type: 'success',
        text: data.message || 'Teilnahme-Endzeit wurde gespeichert.',
      })
    } catch (error) {
      setSettingsAlert({
        type: 'error',
        text: error instanceof Error ? error.message : 'Endzeit konnte nicht gespeichert werden.',
      })
    } finally {
      setParticipationDeadlineSaving(false)
    }
  }

  const handleGroupPhaseToggle = () => {
    setSettingsDraft((prev) => ({
      ...prev,
      groupPhaseEnabled: !prev.groupPhaseEnabled,
      groupCount: clampGroupCount(prev.groupCount, prev.teamSlots)
    }))
    setSettingsAlert(null)
  }

  const handleGroupCountChange = (value: number) => {
    setSettingsDraft((prev) => ({ ...prev, groupCount: clampGroupCount(value, prev.teamSlots) }))
    setSettingsAlert(null)
  }

  const saveBracketSettings = async () => {
    if (!settingsChanged || settingsSaving) {
      return
    }

    setSettingsSaving(true)
    setSettingsAlert(null)

    try {
      const response = await fetch('/api/admin/bracket/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settingsDraft)
      })

      if (!response.ok) {
        throw new Error('Failed to save bracket settings')
      }

      const payload = await response.json()
      const updatedSettings: BracketSettingsState = {
        mode: payload?.settings?.mode === 'single' ? 'single' : 'double',
        teamSlots: clampTeamSlots(payload?.settings?.teamSlots ?? settingsDraft.teamSlots),
        tournamentStarted: Boolean(payload?.settings?.tournamentStarted),
        groupPhaseEnabled: Boolean(payload?.settings?.groupPhaseEnabled),
        groupCount: clampGroupCount(payload?.settings?.groupCount ?? settingsDraft.groupCount, clampTeamSlots(payload?.settings?.teamSlots ?? settingsDraft.teamSlots)),
        activeGroupRound: Math.max(0, Math.floor(Number(payload?.settings?.activeGroupRound) || 0)),
        groupTeamOrder: Array.isArray(payload?.settings?.groupTeamOrder)
          ? payload.settings.groupTeamOrder.filter((teamId: unknown): teamId is string => typeof teamId === 'string')
          : settingsDraft.groupTeamOrder,
        eliminationTeamOrder: Array.isArray(payload?.settings?.eliminationTeamOrder)
          ? payload.settings.eliminationTeamOrder.filter((teamId: unknown): teamId is string => typeof teamId === 'string')
          : settingsDraft.eliminationTeamOrder
      }

      setBracketSettings(updatedSettings)
      setSettingsDraft(updatedSettings)
      setSettingsAlert({ type: 'success', text: 'Einstellungen gespeichert. Bracket wird aktualisiert...' })
      await fetchData(false)
    } catch (error) {
      console.error('Error saving bracket settings:', error)
      setSettingsAlert({ type: 'error', text: 'Einstellungen konnten nicht gespeichert werden.' })
    } finally {
      setSettingsSaving(false)
    }
  }

  const swapGroupTeams = async (targetTeamId: string) => {
    const sourceTeamId = draggedTeamId
    setDraggedTeamId(null)
    setDropTargetTeamId(null)

    if (
      !sourceTeamId ||
      sourceTeamId === targetTeamId ||
      groupOrderSaving ||
      bracketSettings.activeGroupRound > 0
    ) {
      return
    }

    const activeTeamIds = new Set(teams.map((team) => team.id))
    const nextOrder = bracketSettings.groupTeamOrder.filter((teamId) => activeTeamIds.has(teamId))

    for (const team of [...teams].sort((a, b) => a.position - b.position)) {
      if (!nextOrder.includes(team.id)) {
        nextOrder.push(team.id)
      }
    }

    const sourceIndex = nextOrder.indexOf(sourceTeamId)
    const targetIndex = nextOrder.indexOf(targetTeamId)
    if (sourceIndex < 0 || targetIndex < 0) {
      return
    }

    const sourceTeam = nextOrder[sourceIndex]
    nextOrder[sourceIndex] = nextOrder[targetIndex]
    nextOrder[targetIndex] = sourceTeam

    setGroupOrderSaving(true)
    setSettingsAlert(null)

    try {
      const response = await fetch('/api/admin/bracket/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupTeamOrder: nextOrder }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Teams konnten nicht getauscht werden.')
      }

      setSettingsAlert({
        type: 'success',
        text: 'Teams getauscht. Gruppen und Bracket wurden aktualisiert.',
      })
      await fetchData(false)
    } catch (error) {
      setSettingsAlert({
        type: 'error',
        text: error instanceof Error ? error.message : 'Teams konnten nicht getauscht werden.',
      })
    } finally {
      setGroupOrderSaving(false)
    }
  }

  const swapEliminationTeams = async (targetTeamId: string) => {
    const sourceTeamId = draggedEliminationTeamId
    setDraggedEliminationTeamId(null)
    setDropTargetEliminationTeamId(null)

    if (
      !sourceTeamId ||
      sourceTeamId === targetTeamId ||
      eliminationOrderSaving ||
      eliminationBracketStarted
    ) {
      return
    }

    const eliminationTeamsById = new Map<string, BracketTeam>()
    for (const match of bracket.filter(isInitialEliminationMatch)) {
      if (isRealEliminationTeam(match.team1)) {
        eliminationTeamsById.set(match.team1!.id, match.team1!)
      }
      if (isRealEliminationTeam(match.team2)) {
        eliminationTeamsById.set(match.team2!.id, match.team2!)
      }
    }

    const activeTeamIds = new Set(eliminationTeamsById.keys())
    const nextOrder = bracketSettings.eliminationTeamOrder.filter((teamId) => activeTeamIds.has(teamId))
    const remainingTeams = Array.from(eliminationTeamsById.values()).sort((a, b) => a.position - b.position)

    for (const team of remainingTeams) {
      if (!nextOrder.includes(team.id)) {
        nextOrder.push(team.id)
      }
    }

    const sourceIndex = nextOrder.indexOf(sourceTeamId)
    const targetIndex = nextOrder.indexOf(targetTeamId)
    if (sourceIndex < 0 || targetIndex < 0) {
      return
    }

    const sourceTeam = nextOrder[sourceIndex]
    nextOrder[sourceIndex] = nextOrder[targetIndex]
    nextOrder[targetIndex] = sourceTeam

    setEliminationOrderSaving(true)
    setSettingsAlert(null)

    try {
      const response = await fetch('/api/admin/bracket/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eliminationTeamOrder: nextOrder }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Elimination-Teams konnten nicht getauscht werden.')
      }

      setSettingsAlert({
        type: 'success',
        text: 'Elimination-Teams getauscht. Die Gruppenphase blieb unveraendert.',
      })
      await fetchData(false)
    } catch (error) {
      setSettingsAlert({
        type: 'error',
        text: error instanceof Error ? error.message : 'Elimination-Teams konnten nicht getauscht werden.',
      })
    } finally {
      setEliminationOrderSaving(false)
    }
  }

  const startTournament = async () => {
    if (bracketSettings.tournamentStarted || tournamentStartLoading) {
      return
    }

    if (teams.length < 2) {
      setSettingsAlert({ type: 'error', text: 'Zum Starten müssen mindestens 2 Teams besetzt sein.' })
      return
    }

    const confirmationText = bracketSettings.groupPhaseEnabled
      ? 'Turnier jetzt starten? Danach kannst du die erste Gruppenrunde aktivieren und live stellen.'
      : 'Turnier jetzt starten? Ab dann werden Freilose automatisch im Bracket weitergerechnet.'

    if (!confirm(confirmationText)) {
      return
    }

    setTournamentStartLoading(true)
    setSettingsAlert(null)

    try {
      const response = await fetch('/api/admin/bracket/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tournamentStarted: true })
      })

      if (!response.ok) {
        throw new Error('Tournament konnte nicht gestartet werden')
      }

      const payload = await response.json()
      const updatedSettings: BracketSettingsState = {
        mode: payload?.settings?.mode === 'single' ? 'single' : 'double',
        teamSlots: clampTeamSlots(payload?.settings?.teamSlots ?? bracketSettings.teamSlots),
        tournamentStarted: Boolean(payload?.settings?.tournamentStarted),
        groupPhaseEnabled: Boolean(payload?.settings?.groupPhaseEnabled),
        groupCount: clampGroupCount(payload?.settings?.groupCount ?? bracketSettings.groupCount, clampTeamSlots(payload?.settings?.teamSlots ?? bracketSettings.teamSlots)),
        activeGroupRound: Math.max(0, Math.floor(Number(payload?.settings?.activeGroupRound) || 0)),
        groupTeamOrder: Array.isArray(payload?.settings?.groupTeamOrder)
          ? payload.settings.groupTeamOrder.filter((teamId: unknown): teamId is string => typeof teamId === 'string')
          : bracketSettings.groupTeamOrder,
        eliminationTeamOrder: Array.isArray(payload?.settings?.eliminationTeamOrder)
          ? payload.settings.eliminationTeamOrder.filter((teamId: unknown): teamId is string => typeof teamId === 'string')
          : bracketSettings.eliminationTeamOrder
      }

      setBracketSettings(updatedSettings)
      setSettingsDraft(updatedSettings)
      setSettingsAlert({
        type: 'success',
        text: updatedSettings.groupPhaseEnabled
          ? 'Turnier gestartet. Du kannst jetzt die erste Gruppenrunde live stellen.'
          : 'Turnier gestartet. Freilose werden jetzt angewendet.'
      })
      await fetchData(false)
    } catch (error) {
      console.error('Error starting tournament:', error)
      setSettingsAlert({ type: 'error', text: 'Turnier konnte nicht gestartet werden.' })
    } finally {
      setTournamentStartLoading(false)
    }
  }

  const activateNextGroupRound = async () => {
    if (!groupPhase || groupRoundLoading) {
      return
    }

    setGroupRoundLoading(true)
    setSettingsAlert(null)

    try {
      const response = await fetch('/api/admin/bracket/group-round', {
        method: 'POST',
        credentials: 'include'
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Die nächste Gruppenrunde konnte nicht aktiviert werden.')
      }

      setSettingsAlert({
        type: 'success',
        text: payload.message || 'Die nächste Gruppenrunde ist jetzt live.'
      })
      await fetchData(false)
    } catch (error) {
      setSettingsAlert({
        type: 'error',
        text: error instanceof Error ? error.message : 'Die nächste Gruppenrunde konnte nicht aktiviert werden.'
      })
    } finally {
      setGroupRoundLoading(false)
    }
  }

  const resetTournament = async () => {
    if (!confirm('Möchtest du das Tournament wirklich komplett zurücksetzen?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/bracket/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      if (response.ok) {
        alert('Tournament erfolgreich zurückgesetzt!')
        await fetchData()
      } else {
        alert('Fehler beim Zurücksetzen des Tournaments')
      }
    } catch (error) {
      console.error('Error resetting tournament:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const handleMatchSelect = (match?: BracketMatch) => {
    if (!match) {
      return
    }

    selectedMatchIdRef.current = match.id
    setSelectedMatch(match)
    setScoreInputs({
      team1: String(match.team1Score ?? 0),
      team2: String(match.team2Score ?? 0)
    })
    setRenameInputs({
      team1: match.team1?.name || '',
      team2: match.team2?.name || ''
    })
    setPanelMessage(null)
  }

  const clearMatchSelection = () => {
    selectedMatchIdRef.current = null
    setSelectedMatch(null)
    setRenameInputs({ team1: '', team2: '' })
    setPanelMessage(null)
  }

  const fetchChatThreads = async (showLoading = true) => {
    if (showLoading) {
      setChatLoading(true)
    }
    setChatError('')

    try {
      const response = await fetch('/api/admin/match-chats', {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Match-Chats konnten nicht geladen werden.')
      }

      const threads = Array.isArray(data.threads) ? data.threads : []
      setChatThreads(threads)
      setSelectedChatMatchId((current) => {
        if (current && threads.some((thread: AdminChatThread) => thread.matchId === current)) {
          return current
        }
        return threads[0]?.matchId || null
      })
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Match-Chats konnten nicht geladen werden.')
    } finally {
      setChatLoading(false)
    }
  }

  const openChatModal = async () => {
    setChatModalOpen(true)
    await fetchChatThreads()
  }

  const handleScoreInputChange = (team: 'team1' | 'team2', event: ChangeEvent<HTMLInputElement>) => {
    const sanitized = event.target.value.replace(/[^0-9]/g, '')
    setScoreInputs(prev => ({
      ...prev,
      [team]: sanitized
    }))
  }

  const handleRenameInputChange = (team: 'team1' | 'team2', event: ChangeEvent<HTMLInputElement>) => {
    setRenameInputs(prev => ({
      ...prev,
      [team]: event.target.value
    }))
  }

  const saveTeamRename = async (teamKey: 'team1' | 'team2') => {
    if (!selectedMatch) {
      return
    }

    const targetTeam = teamKey === 'team1' ? selectedMatch.team1 : selectedMatch.team2
    if (!targetTeam?.id) {
      setPanelMessage({ type: 'error', text: 'Kein echtes Team für diesen Slot vorhanden.' })
      return
    }

    if (targetTeam.id.startsWith('placeholder') || targetTeam.id.startsWith('virtual-')) {
      setPanelMessage({ type: 'error', text: 'Dieser Slot muss zunächst mit einem Team besetzt werden.' })
      return
    }

    const desiredName = (renameInputs[teamKey] || '').trim()
    if (!desiredName) {
      setPanelMessage({ type: 'error', text: 'Teamname darf nicht leer sein.' })
      return
    }

    setTeamRenameLoading(teamKey)
    setPanelMessage(null)

    try {
      const response = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId: targetTeam.id, name: desiredName })
      })

      if (!response.ok) {
        throw new Error('Teamname konnte nicht gespeichert werden')
      }

      setPanelMessage({ type: 'success', text: 'Teamname aktualisiert.' })
      await fetchData(false)
    } catch (error) {
      console.error('Error renaming team:', error)
      setPanelMessage({ type: 'error', text: 'Teamname konnte nicht gespeichert werden.' })
    } finally {
      setTeamRenameLoading(null)
    }
  }

  const toggleMatchLive = async () => {
    if (!selectedMatch) {
      return
    }

    setLiveMutationLoading(true)
    setPanelMessage(null)

    try {
      const response = await fetch('/api/admin/bracket/matches/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          matchId: selectedMatch.id,
          isLive: !selectedMatch.isLive
        })
      })

      if (!response.ok) {
        throw new Error('Live-Status konnte nicht gespeichert werden')
      }

      setPanelMessage({
        type: 'success',
        text: !selectedMatch.isLive ? 'Match wurde als LIVE markiert.' : 'Match wurde gestoppt.'
      })
      await fetchData(false)
    } catch (error) {
      console.error('Error toggling live status:', error)
      setPanelMessage({ type: 'error', text: 'Live-Status konnte nicht aktualisiert werden.' })
    } finally {
      setLiveMutationLoading(false)
    }
  }

  const saveMatchScore = async () => {
    if (!selectedMatch) {
      return
    }

    const team1Score = parseInt(scoreInputs.team1 || '0', 10)
    const team2Score = parseInt(scoreInputs.team2 || '0', 10)

    setScoreMutationLoading(true)
    setPanelMessage(null)

    try {
      const response = await fetch('/api/admin/bracket/matches/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          matchId: selectedMatch.id,
          team1Score,
          team2Score
        })
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Match-Ergebnis konnte nicht gespeichert werden')
      }

      setPanelMessage({ type: 'success', text: payload.message || 'Match-Ergebnis gespeichert.' })
      await fetchData(false)
    } catch (error) {
      console.error('Error saving match score:', error)
      setPanelMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Match-Ergebnis konnte nicht gespeichert werden.'
      })
    } finally {
      setScoreMutationLoading(false)
    }
  }

  const MatchBox = ({
    match,
    className = '',
    onSelect,
    isSelected
  }: {
    match?: BracketMatch,
    className?: string,
    onSelect?: (match: BracketMatch) => void,
    isSelected?: boolean
  }) => {
    if (!match) {
      return (
        <div className={`bg-gray-900/60 border border-dashed border-white/15 rounded-lg p-3 text-center text-gray-400 text-sm ${className}`}>
          Match folgt
        </div>
      )
    }

    const team1Name = formatAdminTeamName(match.team1)
    const team2Name = formatAdminTeamName(match.team2)
    const team1Wins = match.isFinished && match.winnerId === 'team1'
    const team2Wins = match.isFinished && match.winnerId === 'team2'
    const canDragInitialTeams = canReorderEliminationTeams && isInitialEliminationMatch(match)
    const canDragTeam1 = canDragInitialTeams && isRealEliminationTeam(match.team1)
    const canDragTeam2 = canDragInitialTeams && isRealEliminationTeam(match.team2)

    return (
      <button
        type="button"
        onClick={() => onSelect?.(match)}
        className={`${match.isFeatured ? 'bg-[#2b1648] shadow-[0_0_22px_rgba(145,70,255,0.35)]' : 'bg-gray-900/75'} border ${isSelected ? 'border-purple-300 ring-2 ring-purple-400/70' : match.isFeatured ? 'border-[#9146ff] ring-2 ring-[#9146ff]/40' : 'border-white/10 hover:border-purple-400/70'} rounded-lg px-3 py-3 w-full h-full flex flex-col justify-center shadow-lg transition-all duration-200 text-left ${className}`}
        aria-pressed={isSelected}
      >
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-purple-200/80 mb-2">
          <div className="flex items-center gap-2">
            {match.isFeatured && (
              <span className="rounded bg-[#9146ff] px-2 py-0.5 font-bold text-white">TWITCH CAST</span>
            )}
            {match.isLive ? (
              <span className="text-red-300 font-bold animate-pulse">LIVE</span>
            ) : match.isFinished ? (
              <span className="text-green-300 font-semibold">Ergebnis gespeichert</span>
            ) : !match.isFeatured ? (
              <span className="text-white/50">Bereit</span>
            ) : null}
          </div>
          {isSelected && <span className="text-cyan-300 font-semibold">Ausgewählt</span>}
        </div>

        <div className="flex items-center justify-center gap-3 text-white text-sm font-bold w-full">
          <span
            draggable={canDragTeam1}
            onDragStart={(event) => {
              if (!canDragTeam1 || !match.team1) return
              event.stopPropagation()
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', match.team1.id)
              setDraggedEliminationTeamId(match.team1.id)
            }}
            onDragOver={(event) => {
              if (!canDragTeam1 || !match.team1 || draggedEliminationTeamId === match.team1.id) return
              event.preventDefault()
              event.stopPropagation()
              event.dataTransfer.dropEffect = 'move'
              setDropTargetEliminationTeamId(match.team1.id)
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              if (match.team1) void swapEliminationTeams(match.team1.id)
            }}
            onDragEnd={() => {
              setDraggedEliminationTeamId(null)
              setDropTargetEliminationTeamId(null)
            }}
            title={canDragTeam1 ? 'Ziehen, um Elimination-Teams zu tauschen' : undefined}
            className={`flex-1 min-w-0 truncate rounded px-1 text-right ${team1Wins ? 'text-green-400' : ''} ${
              canDragTeam1 ? 'cursor-grab hover:bg-cyan-500/15 active:cursor-grabbing' : ''
            } ${draggedEliminationTeamId === match.team1?.id ? 'opacity-40' : ''} ${
              dropTargetEliminationTeamId === match.team1?.id ? 'bg-cyan-500/25 ring-1 ring-cyan-300' : ''
            }`}
          >
            {team1Name}
          </span>
          <span className={`flex-none w-16 text-center whitespace-nowrap text-purple-200 ${match.isLive ? 'text-yellow-300' : ''}`}>
            {(match.team1Score ?? 0)} - {(match.team2Score ?? 0)}
          </span>
          <span
            draggable={canDragTeam2}
            onDragStart={(event) => {
              if (!canDragTeam2 || !match.team2) return
              event.stopPropagation()
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', match.team2.id)
              setDraggedEliminationTeamId(match.team2.id)
            }}
            onDragOver={(event) => {
              if (!canDragTeam2 || !match.team2 || draggedEliminationTeamId === match.team2.id) return
              event.preventDefault()
              event.stopPropagation()
              event.dataTransfer.dropEffect = 'move'
              setDropTargetEliminationTeamId(match.team2.id)
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              if (match.team2) void swapEliminationTeams(match.team2.id)
            }}
            onDragEnd={() => {
              setDraggedEliminationTeamId(null)
              setDropTargetEliminationTeamId(null)
            }}
            title={canDragTeam2 ? 'Ziehen, um Elimination-Teams zu tauschen' : undefined}
            className={`flex-1 min-w-0 truncate rounded px-1 text-left ${team2Wins ? 'text-green-400' : ''} ${
              canDragTeam2 ? 'cursor-grab hover:bg-cyan-500/15 active:cursor-grabbing' : ''
            } ${draggedEliminationTeamId === match.team2?.id ? 'opacity-40' : ''} ${
              dropTargetEliminationTeamId === match.team2?.id ? 'bg-cyan-500/25 ring-1 ring-cyan-300' : ''
            }`}
          >
            {team2Name}
          </span>
        </div>
        {match.mapName && (
          <div className="mt-1 text-center text-[11px] font-semibold text-cyan-200">
            Map: {match.mapName}
          </div>
        )}

        {match.autoAdvance && (
          <p className="text-xs text-center text-cyan-200 mt-2">Freilos – Team rückt automatisch weiter</p>
        )}
      </button>
    )
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Überprüfe Admin-Berechtigung...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Weiterleitung zum Admin-Login...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Tournament Bracket...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-image">
      <AdminTopbar active="bracket" />

      <section className="border-b border-white/10 bg-gray-900/95 text-white">
        <div className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-orange-300">Tournament Administration</p>
              <h1 className="mt-1 text-3xl font-bold">Summer Cup Bracket</h1>
              <p className="mt-1 text-sm text-gray-400">
                Turnierablauf, Teilnahme und Live-Matches zentral steuern.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-md border border-white/10 bg-gray-950 px-3 py-2 text-gray-200">
                {teams.length} Teams
              </span>
              <span className="rounded-md border border-white/10 bg-gray-950 px-3 py-2 text-gray-200">
                {bracketSettings.groupPhaseEnabled
                  ? `${bracketSettings.groupCount} Gruppen · Top ${PLAYOFF_TEAM_COUNT}`
                  : `${configuredSlotCount} Slots`}
              </span>
              <span className="rounded-md border border-white/10 bg-gray-950 px-3 py-2 text-gray-200">
                {MODE_LABELS[bracketSettings.mode]}
              </span>
              <span className="rounded-md border border-white/10 bg-gray-950 px-3 py-2 text-gray-200">
                {slotCount > 0 ? `${slotCount} Seeds` : 'Seeds offen'}
              </span>
              <span
                className={`rounded-md border px-3 py-2 ${
                  bracketSettings.tournamentStarted
                    ? 'border-green-400/30 bg-green-500/15 text-green-100'
                    : 'border-orange-400/30 bg-orange-500/15 text-orange-100'
                }`}
              >
                {bracketSettings.tournamentStarted ? 'Turnier läuft' : 'Noch nicht gestartet'}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 border-t border-white/10 pt-4 xl:grid-cols-[auto_auto_minmax(0,1fr)]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Turnier</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startTournament}
                  className={`min-h-10 rounded-md px-4 py-2 text-sm font-bold transition-colors ${
                    bracketSettings.tournamentStarted
                      ? 'cursor-default bg-green-700 text-green-100'
                      : 'bg-orange-600 text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-gray-700'
                  }`}
                  disabled={bracketSettings.tournamentStarted || tournamentStartLoading || teams.length < 2}
                >
                  {tournamentStartLoading
                    ? 'Starte...'
                    : bracketSettings.tournamentStarted
                      ? 'Turnier gestartet'
                      : 'Turnier starten'}
                </button>
                {bracketSettings.groupPhaseEnabled && (
                  <button
                    type="button"
                    onClick={activateNextGroupRound}
                    disabled={!canActivateNextGroupRound || groupRoundLoading}
                    className="min-h-10 rounded-md bg-cyan-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-gray-700"
                  >
                    {groupRoundLoading
                      ? 'Aktiviere...'
                      : bracketSettings.activeGroupRound >= (groupPhase?.totalRounds || 0)
                        ? 'Gruppenphase abgeschlossen'
                        : `Runde ${bracketSettings.activeGroupRound + 1} live stellen`}
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Teilnahme</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-56 flex-1">
                  <span className="mb-1 block text-xs font-semibold text-gray-400">Endzeit</span>
                  <input
                    type="datetime-local"
                    value={participationDeadlineInput}
                    onFocus={() => {
                      participationDeadlineEditingRef.current = true
                    }}
                    onBlur={() => {
                      participationDeadlineEditingRef.current = false
                    }}
                    onChange={(event) => {
                      participationDeadlineDirtyRef.current = true
                      setParticipationDeadlineInput(event.target.value)
                    }}
                    className="min-h-10 w-full rounded-md border border-gray-600 bg-gray-950 px-3 py-2 text-sm font-semibold text-white outline-none transition-colors focus:border-yellow-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveParticipationDeadline}
                  disabled={participationDeadlineSaving || participationLoading}
                  className="min-h-10 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100 transition-colors hover:bg-yellow-500/20 disabled:cursor-wait disabled:opacity-60"
                >
                  {participationDeadlineSaving ? 'Speichere...' : 'Endzeit speichern'}
                </button>
                <button
                  type="button"
                  onClick={toggleParticipation}
                  disabled={participationLoading || participationResetLoading}
                  className={`min-h-10 rounded-md px-4 py-2 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-700 ${
                    participationOpen
                      ? 'bg-green-700 hover:bg-green-600'
                      : 'bg-yellow-600 hover:bg-yellow-500'
                  }`}
                >
                  {participationLoading
                    ? 'Speichere...'
                    : participationOpen
                      ? `Teilnahme offen (${participatingCount})`
                      : `Teilnahme öffnen (${participatingCount})`}
                </button>
                <button
                  type="button"
                  onClick={resetParticipation}
                  disabled={participationResetLoading || participationLoading || participatingCount === 0}
                  className="min-h-10 rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-bold text-gray-100 transition-colors hover:border-gray-400 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {participationResetLoading ? 'Setze zurück...' : 'Zurücksetzen'}
                </button>
                <button
                  type="button"
                  onClick={sendParticipationReminders}
                  disabled={
                    participationReminderLoading ||
                    participationLoading ||
                    !participationOpen ||
                    pendingParticipationCount === 0
                  }
                  className="min-h-10 rounded-md border border-indigo-500/50 bg-indigo-600/20 px-4 py-2 text-sm font-bold text-indigo-100 transition-colors hover:bg-indigo-600/35 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {participationReminderLoading
                    ? 'Sende DMs...'
                    : `Discord erinnern (${pendingParticipationCount})`}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {participationOpen
                  ? `Aktiv bis ${formatParticipationDeadline(participationEndsAt)}`
                  : `Geschlossen · ${formatParticipationDeadline(participationEndsAt)}`}
              </p>
            </div>

            <div className="xl:justify-self-end">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500 xl:text-right">Werkzeuge</p>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <button
                  type="button"
                  onClick={openChatModal}
                  className="min-h-10 rounded-md bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-600"
                >
                  Match-Chats
                </button>
                <button
                  type="button"
                  onClick={() => fetchData(false)}
                  disabled={refreshing}
                  className="min-h-10 rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-wait disabled:bg-gray-700"
                >
                  {refreshing ? 'Aktualisiere...' : 'Aktualisieren'}
                </button>
                <button
                  type="button"
                  onClick={resetTournament}
                  className="min-h-10 rounded-md bg-red-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600"
                >
                  Turnier zurücksetzen
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full px-4 py-6 space-y-8 max-w-[1800px] mx-auto">
        <section className="bg-black/30 backdrop-blur-sm rounded-xl p-5 border border-purple-500/60">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Bracket Einstellungen</h2>
              <p className="text-purple-200 text-sm">Wähle Gruppenphase, Teamslots und Eliminierungsmodus, bevor Matches generiert werden.</p>
            </div>
            <div className="text-sm text-white/70">
              Aktiv: {MODE_LABELS[bracketSettings.mode]} • {bracketSettings.groupPhaseEnabled ? `${bracketSettings.groupCount} Gruppen, Top ${PLAYOFF_TEAM_COUNT}` : `${configuredSlotCount} Slots`} (Seeds: {slotCount || '...'})
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-4">
            <div className="space-y-3">
              <p className="text-white/80 text-sm font-semibold">Turniermodus</p>
              <div className="flex flex-wrap gap-3">
                {modeOptions.map((mode) => {
                  const active = settingsDraft.mode === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleModeSelect(mode)}
                      className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${active ? 'bg-purple-600 text-white border-purple-400 shadow-lg' : 'bg-black/40 text-white/70 border-white/15 hover:border-purple-300/70'}`}
                    >
                      {MODE_LABELS[mode]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-white/80 text-sm font-semibold">Gruppenphase</p>
              <button
                type="button"
                onClick={handleGroupPhaseToggle}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors ${settingsDraft.groupPhaseEnabled ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-white/15 bg-black/40 text-white/70 hover:border-cyan-300/70'}`}
              >
                {settingsDraft.groupPhaseEnabled ? 'Aktiv: Gruppenphase vor K.o.-Baum' : 'Inaktiv: Direkt K.o.-Baum'}
              </button>
              <p className="text-xs text-white/50">
                Bei aktiver Gruppenphase werden bis zu {MAX_TEAM_SLOTS} Teams verteilt. Top {PLAYOFF_TEAM_COUNT} gehen in den vorhandenen Baum.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-white/80 text-sm font-semibold">Team Slots</p>
              <div className="space-y-4">
                <input
                  type="range"
                  min={MIN_TEAM_SLOTS}
                  max={MAX_TEAM_SLOTS}
                  value={settingsDraft.teamSlots}
                  onChange={(event) => handleSlotValueChange(Number(event.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={MIN_TEAM_SLOTS}
                    max={MAX_TEAM_SLOTS}
                    value={settingsDraft.teamSlots}
                    onChange={(event) => handleSlotValueChange(Number(event.target.value))}
                    className="w-24 rounded bg-black/40 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-white/70 text-sm">Slots (min {MIN_TEAM_SLOTS} · max {MAX_TEAM_SLOTS})</span>
                </div>
              </div>
              <p className="text-xs text-white/50">
                {slotCount > 0
                  ? autoFreilosCount > 0
                    ? `${autoFreilosCount} Freilos-Slots werden automatisch vergeben, damit das ${slotCount}-Slot Bracket funktioniert.`
                    : 'Keine Freilos-Slots nötig. Bracket läuft ohne automatische Byes.'
                  : 'Slots werden automatisch auf gültige Werte begrenzt.'}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-white/80 text-sm font-semibold">Gruppen</p>
              <div className={`space-y-4 ${settingsDraft.groupPhaseEnabled ? '' : 'opacity-45'}`}>
                <input
                  type="range"
                  min={1}
                  max={clampGroupCount(MAX_GROUP_COUNT, settingsDraft.teamSlots)}
                  value={settingsDraft.groupCount}
                  onChange={(event) => handleGroupCountChange(Number(event.target.value))}
                  disabled={!settingsDraft.groupPhaseEnabled}
                  className="w-full accent-emerald-400 disabled:cursor-not-allowed"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={clampGroupCount(MAX_GROUP_COUNT, settingsDraft.teamSlots)}
                    value={settingsDraft.groupCount}
                    onChange={(event) => handleGroupCountChange(Number(event.target.value))}
                    disabled={!settingsDraft.groupPhaseEnabled}
                    className="w-24 rounded bg-black/40 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-emerald-400 disabled:cursor-not-allowed"
                  />
                  <span className="text-white/70 text-sm">Gruppen</span>
                </div>
              </div>
              <p className="text-xs text-white/50">
                Teams werden im Snake-Verfahren verteilt, damit die Gruppen möglichst gleich groß bleiben.
              </p>
            </div>

            <div className="space-y-4 bg-gray-900/50 border border-white/10 rounded-lg p-4">
              {settingsAlert ? (
                <div className={`text-sm px-3 py-2 rounded ${settingsAlert.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-400/40' : 'bg-red-500/20 text-red-200 border border-red-400/40'}`}>
                  {settingsAlert.text}
                </div>
              ) : (
                <p className="text-xs text-white/60">Speichere Änderungen, damit Bracket und Öffi-Ansicht automatisch neu generiert werden.</p>
              )}

              <button
                type="button"
                onClick={saveBracketSettings}
                disabled={!settingsChanged || settingsSaving}
                className={`w-full px-4 py-3 rounded font-semibold text-white transition-colors ${settingsChanged ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 cursor-not-allowed'} ${settingsSaving ? 'opacity-60' : ''}`}
              >
                {settingsSaving ? 'Speichere...' : 'Einstellungen speichern & anwenden'}
              </button>
            </div>
          </div>
        </section>

        {groupPhase && (
          <section className="bg-black/25 backdrop-blur-sm rounded-xl p-5 border border-cyan-500/45">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Gruppenphase</h2>
                <p className="text-cyan-100 text-sm">
                  Jeder spielt einmal gegen jedes andere Team der Gruppe. Grün markiert ist die aktuelle Top-{PLAYOFF_TEAM_COUNT}-Prognose.
                </p>
                <p className="mt-1 text-xs text-cyan-200/70">
                  {groupOrderSaving
                    ? 'Tausch wird gespeichert...'
                    : bracketSettings.activeGroupRound > 0
                      ? 'Drag-and-drop ist nach dem Start der ersten Gruppenrunde gesperrt.'
                      : 'Ziehe ein Team auf ein anderes Team, um beide Plaetze zu tauschen.'}
                </p>
              </div>
              <div className="rounded-md border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100">
                Runde {bracketSettings.activeGroupRound}/{groupPhase.totalRounds}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {groupPhase.groups.map((group) => (
                <article key={group.name} className="rounded-lg border border-white/15 bg-gray-950/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{group.name}</h3>
                    <span className="text-xs text-white/50">{group.teams.length} Teams</span>
                  </div>
                  <div className="space-y-2">
                    {group.standings.map((standing) => (
                      <div
                        key={standing.team.id}
                        draggable={canReorderGroupTeams}
                        onDragStart={(event) => {
                          if (!canReorderGroupTeams) return
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', standing.team.id)
                          setDraggedTeamId(standing.team.id)
                        }}
                        onDragOver={(event) => {
                          if (!canReorderGroupTeams || draggedTeamId === standing.team.id) return
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                          setDropTargetTeamId(standing.team.id)
                        }}
                        onDragLeave={() => {
                          if (dropTargetTeamId === standing.team.id) {
                            setDropTargetTeamId(null)
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault()
                          void swapGroupTeams(standing.team.id)
                        }}
                        onDragEnd={() => {
                          setDraggedTeamId(null)
                          setDropTargetTeamId(null)
                        }}
                        title={canReorderGroupTeams ? 'Ziehen, um Teams zu tauschen' : undefined}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border px-3 py-2 text-sm transition-all ${
                          canReorderGroupTeams ? 'cursor-grab active:cursor-grabbing' : ''
                        } ${
                          draggedTeamId === standing.team.id ? 'opacity-40' : ''
                        } ${
                          dropTargetTeamId === standing.team.id
                            ? 'scale-[1.02] border-cyan-300 bg-cyan-500/20 ring-2 ring-cyan-300/30'
                            : standing.qualified
                              ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-50'
                              : 'border-white/10 bg-black/25 text-white/75'
                        }`}
                      >
                        <span className="min-w-0 truncate font-semibold">{standing.rank}. {formatAdminTeamName(standing.team)}</span>
                        <span className="shrink-0 text-xs text-white/70" title="RA = abgegebene Runden">
                          {standing.wins}S · {standing.losses}N · RA {standing.scoreAgainst}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {groupPhase && (
          <section className="bg-black/25 backdrop-blur-sm rounded-xl p-5 border border-blue-500/40">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Gruppenrunden</h2>
                <p className="text-blue-100 text-sm">
                  Eine neue Runde kann aktiviert werden, sobald alle Ergebnisse der aktuellen Runde bestätigt oder vom Admin eingetragen wurden.
                </p>
              </div>
              <div className="text-sm text-white/60">
                {groupPhase.rounds.filter((round) => round.isComplete).length}/{groupPhase.totalRounds} Runden abgeschlossen
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {groupPhase.rounds.map((round) => {
                const isCurrent = round.round === bracketSettings.activeGroupRound
                const isNext = round.round === bracketSettings.activeGroupRound + 1
                const isReady = isNext && canActivateNextGroupRound
                const isLocked = round.round > bracketSettings.activeGroupRound && !isReady

                return (
                  <article
                    key={round.round}
                    className={`rounded-lg border p-4 ${isCurrent ? 'border-cyan-300/60 bg-cyan-500/10' : round.isComplete ? 'border-green-400/30 bg-green-500/5' : 'border-white/10 bg-gray-950/50'} ${isLocked ? 'opacity-60' : ''}`}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-white">{round.label}</h3>
                      <span className={`rounded px-2 py-1 text-xs font-bold ${round.isComplete ? 'bg-green-500/20 text-green-100' : isCurrent ? 'bg-cyan-500/20 text-cyan-100' : 'bg-white/10 text-white/60'}`}>
                        {round.isComplete ? 'Abgeschlossen' : isCurrent ? 'Aktiv' : isReady ? 'Bereit' : isLocked ? 'Gesperrt' : 'Geplant'}
                      </span>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                      {round.matches.map((match) => (
                        <MatchBox
                          key={match.id}
                          match={match}
                          onSelect={handleMatchSelect}
                          isSelected={selectedMatch?.id === match.id}
                        />
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        <section className="bg-black/20 backdrop-blur-sm rounded-xl p-5 border border-purple-500/50">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Elimination Bracket</h2>
            <p className="mt-1 text-sm text-purple-100/75">
              {eliminationOrderSaving
                ? 'Tausch wird gespeichert...'
                : eliminationBracketStarted
                  ? 'Drag-and-drop ist nach dem Start des Elimination-Brackets gesperrt.'
                  : 'Ziehe in der ersten Runde einen Teamnamen auf einen anderen. Die Gruppenphase bleibt unveraendert.'}
            </p>
          </div>
          <div className="overflow-x-auto pb-2">
            <BracketDiagram
              matches={bracket}
              layout={layout}
              connections={connections}
              renderMatch={(match) => (
                <MatchBox
                  match={match}
                  className="h-full"
                  onSelect={handleMatchSelect}
                  isSelected={Boolean(match && selectedMatch?.id === match.id)}
                />
              )}
              className="mx-auto"
            />
          </div>
        </section>

        {chatModalOpen && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setChatModalOpen(false)
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="match-chats-title"
              className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-indigo-400/50 bg-gray-950 shadow-2xl"
            >
              <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-gray-900 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-300">IGL Kommunikation</p>
                  <h2 id="match-chats-title" className="mt-1 text-2xl font-bold text-white">Alle Match-Chats</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    {chatThreads.length} Chats · {chatThreads.reduce((total, thread) => total + thread.messages.length, 0)} Nachrichten
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchChatThreads()}
                    disabled={chatLoading}
                    className="rounded border border-indigo-400/40 bg-indigo-500/15 px-3 py-2 text-sm font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/25 disabled:cursor-wait disabled:opacity-60"
                  >
                    {chatLoading ? 'Lade...' : 'Aktualisieren'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatModalOpen(false)}
                    aria-label="Fenster schließen"
                    title="Schließen"
                    className="flex h-10 w-10 items-center justify-center rounded border border-white/15 bg-black/30 text-xl font-bold text-white transition-colors hover:border-indigo-300 hover:bg-indigo-500/20"
                  >
                    X
                  </button>
                </div>
              </header>

              {chatError ? (
                <div className="m-5 rounded border border-red-500/40 bg-red-500/15 p-4 text-red-100">
                  {chatError}
                </div>
              ) : chatLoading && chatThreads.length === 0 ? (
                <div className="flex min-h-80 items-center justify-center text-gray-400">
                  Match-Chats werden geladen...
                </div>
              ) : chatThreads.length === 0 ? (
                <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                  <h3 className="text-xl font-bold text-white">Noch keine Match-Chats</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Sobald IGLs in einem Live-Match schreiben, erscheint der Verlauf hier.
                  </p>
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 md:grid-cols-[320px_minmax(0,1fr)]">
                  <aside className="max-h-48 min-h-0 overflow-y-auto border-b border-white/10 bg-gray-900/60 p-3 md:max-h-none md:border-b-0 md:border-r">
                    <div className="space-y-2">
                      {chatThreads.map((thread) => {
                        const bracketMatch = [
                          ...(groupPhase?.rounds.flatMap((round) => round.matches) || []),
                          ...bracket,
                        ].find((match) => match.id === thread.matchId)
                        const team1Name = bracketMatch?.team1
                          ? formatAdminTeamName(bracketMatch.team1)
                          : thread.team1Name
                        const team2Name = bracketMatch?.team2
                          ? formatAdminTeamName(bracketMatch.team2)
                          : thread.team2Name
                        const title = team1Name && team2Name
                          ? `${team1Name} gegen ${team2Name}`
                          : thread.matchId
                        const lastMessage = thread.messages[thread.messages.length - 1]

                        return (
                          <button
                            key={thread.matchId}
                            type="button"
                            onClick={() => setSelectedChatMatchId(thread.matchId)}
                            className={`w-full rounded border p-3 text-left transition-colors ${
                              selectedChatMatchId === thread.matchId
                                ? 'border-indigo-400 bg-indigo-500/20'
                                : 'border-white/10 bg-black/25 hover:border-indigo-400/50 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-bold text-white">{title}</span>
                              <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                thread.isLive
                                  ? 'bg-red-500/20 text-red-200'
                                  : thread.isFinished
                                    ? 'bg-green-500/20 text-green-200'
                                    : 'bg-white/10 text-gray-400'
                              }`}>
                                {thread.isLive ? 'Live' : thread.isFinished ? 'Beendet' : 'Inaktiv'}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
                              <span>{thread.messages.length} Nachrichten</span>
                              <span>
                                {lastMessage
                                  ? new Date(lastMessage.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                                  : ''}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </aside>

                  <div className="flex min-h-[360px] flex-col md:min-h-0">
                    {(() => {
                      const thread = chatThreads.find((item) => item.matchId === selectedChatMatchId)
                      if (!thread) {
                        return (
                          <div className="flex flex-1 items-center justify-center text-gray-500">
                            Wähle links einen Chat aus.
                          </div>
                        )
                      }

                      const bracketMatch = [
                        ...(groupPhase?.rounds.flatMap((round) => round.matches) || []),
                        ...bracket,
                      ].find((match) => match.id === thread.matchId)
                      const team1Name = bracketMatch?.team1
                        ? formatAdminTeamName(bracketMatch.team1)
                        : thread.team1Name
                      const team2Name = bracketMatch?.team2
                        ? formatAdminTeamName(bracketMatch.team2)
                        : thread.team2Name

                      return (
                        <>
                          <div className="border-b border-white/10 bg-gray-900/40 px-5 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-bold text-white">
                                  {team1Name && team2Name ? `${team1Name} gegen ${team2Name}` : thread.matchId}
                                </h3>
                                <p className="mt-1 text-xs text-gray-500">Match-ID: {thread.matchId}</p>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                {(bracketMatch?.mapName || thread.mapName) && (
                                  <span className="rounded bg-cyan-500/15 px-2 py-1 text-cyan-100">
                                    Map: {bracketMatch?.mapName || thread.mapName}
                                  </span>
                                )}
                                <span className={`rounded px-2 py-1 ${
                                  thread.isLive
                                    ? 'bg-red-500/20 text-red-100'
                                    : thread.isFinished
                                      ? 'bg-green-500/20 text-green-100'
                                      : 'bg-white/10 text-gray-300'
                                }`}>
                                  {thread.isLive ? 'Live' : thread.isFinished ? 'Beendet' : 'Inaktiv'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                            {thread.messages.map((chatMessage) => (
                              <article
                                key={chatMessage.id}
                                className="rounded border border-white/10 bg-gray-900/65 px-4 py-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-indigo-200">{chatMessage.senderName}</span>
                                    <span className="rounded bg-white/10 px-2 py-0.5 text-gray-300">
                                      {chatMessage.senderTeamName}
                                    </span>
                                  </div>
                                  <time className="text-gray-500">
                                    {new Date(chatMessage.createdAt).toLocaleString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </time>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-100">
                                  {chatMessage.message}
                                </p>
                              </article>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {selectedMatch && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                clearMatchSelection()
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="match-control-title"
              className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-purple-400/60 bg-gray-950 shadow-2xl"
            >
              <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-gray-900 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-purple-300">{selectedMatch.roundLabel}</p>
                  <h2 id="match-control-title" className="mt-1 truncate text-2xl font-bold text-white">
                    Match bearbeiten
                  </h2>
                  <p className="mt-1 truncate text-sm text-gray-400">
                    {formatAdminTeamName(selectedMatch.team1)} gegen {formatAdminTeamName(selectedMatch.team2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearMatchSelection}
                  aria-label="Fenster schließen"
                  title="Schließen"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-white/15 bg-black/30 text-xl font-bold text-white transition-colors hover:border-purple-300 hover:bg-purple-500/20"
                >
                  X
                </button>
              </header>

              <div className="overflow-y-auto p-5">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-white/10 bg-gray-900/60 p-4">
                      <p className="mb-1 text-xs uppercase text-white/50">Runden Team 1</p>
                      <p className="mb-3 text-lg font-semibold text-white">{formatAdminTeamName(selectedMatch.team1)}</p>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={scoreInputs.team1}
                        onChange={(event) => handleScoreInputChange('team1', event)}
                        className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                      />
                    </div>

                    <div className="rounded-lg border border-white/10 bg-gray-900/60 p-4">
                      <p className="mb-1 text-xs uppercase text-white/50">Runden Team 2</p>
                      <p className="mb-3 text-lg font-semibold text-white">{formatAdminTeamName(selectedMatch.team2)}</p>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={scoreInputs.team2}
                        onChange={(event) => handleScoreInputChange('team2', event)}
                        className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {panelMessage && (
                      <div
                        className={`rounded-lg border px-4 py-3 text-sm ${panelMessage.type === 'success' ? 'border-green-500/40 bg-green-600/20 text-green-200' : 'border-red-500/40 bg-red-600/20 text-red-200'}`}
                      >
                        {panelMessage.text}
                      </div>
                    )}

                    <div className="space-y-3 rounded-lg border border-white/10 bg-gray-900/60 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded bg-black/40 px-2 py-1 text-xs uppercase text-white/70">
                          {selectedMatch.isLive ? 'Live' : selectedMatch.isFinished ? 'Beendet' : 'Bereit'}
                        </span>
                        {selectedMatch.winnerId && (
                          <span className="rounded bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-200">
                            Gewinner: {selectedMatch.winnerId === 'team1' ? formatAdminTeamName(selectedMatch.team1, 'Team 1') : formatAdminTeamName(selectedMatch.team2, 'Team 2')}
                          </span>
                        )}
                        {selectedMatch.autoAdvance && (
                          <span className="rounded bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-200">
                            Freilos
                          </span>
                        )}
                        {selectedMatch.mapName && (
                          <span className="rounded bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-100">
                            Map: {selectedMatch.mapName}
                          </span>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          onClick={toggleMatchLive}
                          disabled={liveMutationLoading}
                          className={`rounded px-4 py-2 font-semibold text-white transition-colors ${selectedMatch.isLive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} ${liveMutationLoading ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {liveMutationLoading ? 'Speichere...' : selectedMatch.isLive ? 'Match stoppen' : 'Match starten'}
                        </button>
                        <button
                          onClick={saveMatchScore}
                          disabled={scoreMutationLoading}
                          className={`rounded bg-purple-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-purple-700 ${scoreMutationLoading ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {scoreMutationLoading ? 'Speichere...' : 'Ergebnis speichern'}
                        </button>
                      </div>

                      <p className="text-xs text-white/60">
                        Trage den finalen Rundenscore ein, zum Beispiel 13:10. Das Team mit mehr gewonnenen Runden wird automatisch weitergetragen.
                      </p>
                    </div>

                    <div className="space-y-4 rounded-lg border border-white/10 bg-gray-900/60 p-4">
                      <h3 className="text-lg font-semibold text-white">Teamnamen bearbeiten</h3>
                      {[{ key: 'team1' as const, label: 'Team 1', team: selectedMatch.team1 }, { key: 'team2' as const, label: 'Team 2', team: selectedMatch.team2 }].map(({ key, label, team }) => {
                        const isLoading = teamRenameLoading === key
                        const teamId = team?.id || ''
                        const disabled = !teamId || teamId.startsWith('placeholder') || teamId.startsWith('virtual-')

                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <p className="text-white/80">{label}</p>
                              {team?.name && <span className="text-xs text-white/50">Aktuell: {formatAdminTeamName(team)}</span>}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                type="text"
                                value={renameInputs[key]}
                                onChange={(event) => handleRenameInputChange(key, event)}
                                maxLength={40}
                                disabled={disabled}
                                placeholder={team?.name || 'Noch kein Team'}
                                className="flex-1 rounded border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-purple-400 focus:outline-none disabled:opacity-40"
                              />
                              <button
                                onClick={() => saveTeamRename(key)}
                                disabled={disabled || isLoading || !(renameInputs[key] || '').trim()}
                                className={`rounded bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 ${isLoading ? 'opacity-60' : ''}`}
                              >
                                {isLoading ? 'Speichere...' : 'Speichern'}
                              </button>
                            </div>
                            {disabled && <p className="text-xs text-white/40">Dieser Slot ist noch nicht mit einem Team belegt.</p>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        <section>
          <h2 className="text-2xl font-bold text-white text-center mb-4">TEILNEHMENDE TEAMS</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {teams.map(team => (
              <div key={team.id} className="bg-purple-600/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
                <h3 className="text-white font-semibold text-center text-base">{formatAdminTeamName(team)}</h3>
                <p className="text-purple-200 text-center text-xs">Position {team.position}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
