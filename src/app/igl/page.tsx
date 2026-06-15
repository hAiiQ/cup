'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BracketDiagram from '@/components/bracket/BracketDiagram'
import type {
  BracketConnection,
  BracketMatch,
  BracketMode,
  BracketNodeLayout,
  BracketTeam,
} from '@/lib/bracketStructure'
import type { GroupPhaseResult } from '@/lib/groupPhase'

type IglReport = {
  id: string
  matchId: string
  reporterTeamId: string
  reporterUserId: string
  team1Score: number
  team2Score: number
  winnerSlot: 'team1' | 'team2' | null
  status: 'pending' | 'confirmed' | 'rejected'
  confirmedByTeamId: string | null
  confirmedByUserId: string | null
  rejectedByTeamId: string | null
  rejectedByUserId: string | null
  createdAt: string
  updatedAt: string
}

type IglChatMessage = {
  id: string
  matchId: string
  senderUserId: string
  senderTeamId: string
  senderName: string
  senderTeamName: string
  message: string
  createdAt: string
}

type IglMatch = BracketMatch & {
  ownSlot: 'team1' | 'team2' | null
  report: IglReport | null
  canSubmitResult: boolean
  canConfirmResult: boolean
  chatMessages: IglChatMessage[]
}

type IglUser = {
  id: string
  username: string
  twitchName: string | null
  teamId: string | null
  team: BracketTeam | null
  isIGL: boolean
}

type IglPayload = {
  user: IglUser
  matches: IglMatch[]
  groupMatches: IglMatch[]
  groupPhase: GroupPhaseResult | null
  teams: BracketTeam[]
  layout: BracketNodeLayout[]
  connections: BracketConnection[]
  slotCount: number
  requestedSlotCount: number
  mode: BracketMode
  lastUpdated: string
}

type ScoreDraft = {
  team1: string
  team2: string
}

const isRealTeam = (team?: BracketTeam) => {
  return Boolean(
    team &&
      !team.id.startsWith('virtual-') &&
      !team.id.startsWith('placeholder-') &&
      team.name !== 'TBD' &&
      team.name !== 'Freilos'
  )
}

const formatTime = (value?: string) => {
  if (!value) return 'gerade eben'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'gerade eben'
    : date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export default function IglPage() {
  const router = useRouter()
  const [payload, setPayload] = useState<IglPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, ScoreDraft>>({})
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null)
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({})
  const [busyChatMatchId, setBusyChatMatchId] = useState<string | null>(null)

  const fetchData = async (showSpinner = false) => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    if (showSpinner) {
      setRefreshing(true)
    }

    try {
      const response = await fetch('/api/igl/matches', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error || 'IGL Bereich konnte nicht geladen werden')
        setPayload(null)
        return
      }

      setPayload(data)
      setError('')
      setScoreDrafts((prev) => {
        const next = { ...prev }
        ;[...(data.groupMatches || []), ...(data.matches || [])].forEach((match: IglMatch) => {
          if (!next[match.id]) {
            next[match.id] = {
              team1: String(match.report?.team1Score ?? match.team1Score ?? 0),
              team2: String(match.report?.team2Score ?? match.team2Score ?? 0),
            }
          }
        })
        return next
      })
    } catch (fetchError) {
      console.error('IGL page fetch error:', fetchError)
      setError('IGL Bereich konnte nicht geladen werden')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = window.setInterval(() => fetchData(false), 4000)
    return () => window.clearInterval(interval)
  }, [])

  const ownMatches = useMemo(() => {
    return [...(payload?.groupMatches || []), ...(payload?.matches || [])].filter((match) => match.ownSlot)
  }, [payload?.groupMatches, payload?.matches])

  const actionableMatches = useMemo(() => {
    return ownMatches.filter((match) => match.canSubmitResult || match.canConfirmResult)
  }, [ownMatches])

  const groupMatchesById = useMemo(() => {
    return new Map((payload?.groupMatches || []).map((match) => [match.id, match]))
  }, [payload?.groupMatches])

  const visibleTeams = useMemo(() => {
    if (payload?.groupPhase) {
      return payload.groupPhase.groups.flatMap((group) => group.teams)
    }

    return payload?.teams || []
  }, [payload?.groupPhase, payload?.teams])

  const updateDraft = (matchId: string, key: keyof ScoreDraft, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '')
    setScoreDrafts((prev) => ({
      ...prev,
      [matchId]: {
        team1: prev[matchId]?.team1 ?? '0',
        team2: prev[matchId]?.team2 ?? '0',
        [key]: sanitized,
      },
    }))
  }

  const submitResult = async (match: IglMatch) => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const draft = scoreDrafts[match.id] || { team1: '0', team2: '0' }
    setBusyMatchId(match.id)
    setMessage(null)

    try {
      const response = await fetch('/api/igl/matches/report', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          matchId: match.id,
          team1Score: Number(draft.team1 || 0),
          team2Score: Number(draft.team2 || 0),
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Ergebnis konnte nicht gemeldet werden')
      }

      setMessage({ type: 'success', text: data.message || 'Ergebnis gemeldet.' })
      await fetchData(false)
    } catch (submitError) {
      setMessage({
        type: 'error',
        text: submitError instanceof Error ? submitError.message : 'Ergebnis konnte nicht gemeldet werden',
      })
    } finally {
      setBusyMatchId(null)
    }
  }

  const confirmResult = async (match: IglMatch, action: 'confirm' | 'reject') => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    setBusyMatchId(match.id)
    setMessage(null)

    try {
      const response = await fetch(`/api/igl/matches/${encodeURIComponent(match.id)}/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Ergebnis konnte nicht bearbeitet werden')
      }

      setMessage({ type: 'success', text: data.message || 'Ergebnis aktualisiert.' })
      await fetchData(false)
    } catch (confirmError) {
      setMessage({
        type: 'error',
        text: confirmError instanceof Error ? confirmError.message : 'Ergebnis konnte nicht bearbeitet werden',
      })
    } finally {
      setBusyMatchId(null)
    }
  }

  const sendChatMessage = async (event: FormEvent<HTMLFormElement>, match: IglMatch) => {
    event.preventDefault()

    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const chatMessage = (chatDrafts[match.id] || '').trim()
    if (!chatMessage || busyChatMatchId === match.id) {
      return
    }

    setBusyChatMatchId(match.id)
    setMessage(null)

    try {
      const response = await fetch(`/api/igl/matches/${encodeURIComponent(match.id)}/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message: chatMessage }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Nachricht konnte nicht gesendet werden')
      }

      setChatDrafts((prev) => ({ ...prev, [match.id]: '' }))
      await fetchData(false)
    } catch (chatError) {
      setMessage({
        type: 'error',
        text: chatError instanceof Error ? chatError.message : 'Nachricht konnte nicht gesendet werden',
      })
    } finally {
      setBusyChatMatchId(null)
    }
  }

  const renderMatchBox = (match?: IglMatch) => {
    if (!match) {
      return (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-gray-950/70 p-3 text-sm text-gray-500">
          Match folgt
        </div>
      )
    }

    const team1Name = match.team1?.name || 'TBD'
    const team2Name = match.team2?.name || 'TBD'
    const isOwnMatch = Boolean(match.ownSlot)
    const team1Wins = match.isFinished && match.winnerId === 'team1'
    const team2Wins = match.isFinished && match.winnerId === 'team2'
    const hasPendingReport = match.report?.status === 'pending'

    return (
      <div
        className={`flex h-full flex-col justify-center rounded-lg border px-3 py-2 shadow-lg ${
          isOwnMatch
            ? 'border-blue-400/80 bg-blue-950/70 ring-1 ring-blue-500/60'
            : 'border-white/10 bg-gray-950/75'
        }`}
      >
        <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide">
          {match.isLive ? (
            <span className="text-red-300">Live</span>
          ) : match.isFinished ? (
            <span className="text-green-300">Beendet</span>
          ) : (
            <span className="text-gray-500">Bereit</span>
          )}
          {hasPendingReport && <span className="text-yellow-300">Pending</span>}
          {isOwnMatch && <span className="text-blue-200">Dein Team</span>}
        </div>
        <div className="flex items-center justify-center gap-2 text-[13px] font-bold text-white">
          <span className={`min-w-0 flex-1 truncate text-right ${team1Wins ? 'text-green-300' : ''}`}>
            {team1Name}
          </span>
          <span className={`w-14 flex-none text-center ${match.isLive ? 'text-yellow-200' : 'text-purple-200'}`}>
            {match.team1Score ?? 0} - {match.team2Score ?? 0}
          </span>
          <span className={`min-w-0 flex-1 truncate text-left ${team2Wins ? 'text-green-300' : ''}`}>
            {team2Name}
          </span>
        </div>
        {match.mapName && (
          <div className="mt-1 text-center text-[11px] font-semibold text-cyan-200">
            Map: {match.mapName}
          </div>
        )}
      </div>
    )
  }

  const renderMatchControl = (match: IglMatch) => {
    const draft = scoreDrafts[match.id] || {
      team1: String(match.report?.team1Score ?? match.team1Score ?? 0),
      team2: String(match.report?.team2Score ?? match.team2Score ?? 0),
    }
    const pendingFromOpponent =
      match.report?.status === 'pending' &&
      payload?.user.teamId &&
      match.report.reporterTeamId !== payload.user.teamId
    const pendingFromOwnTeam =
      match.report?.status === 'pending' &&
      payload?.user.teamId &&
      match.report.reporterTeamId === payload.user.teamId
    const chatDraft = chatDrafts[match.id] || ''
    const chatMessages = match.chatMessages || []

    return (
      <div key={match.id} className="rounded-lg border border-gray-700 bg-gray-900/85 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-300">
              {match.roundLabel}
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">{match.label}</h2>
            <p className="mt-1 text-sm text-gray-400">
              {match.team1?.name || 'TBD'} gegen {match.team2?.name || 'TBD'}
            </p>
            {match.mapName && (
              <p className="mt-1 text-sm font-semibold text-cyan-200">Map: {match.mapName}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-red-500/50 bg-red-600/15 px-3 py-1 text-red-100">
              Live
            </span>
            <span className="rounded-full border border-blue-500/50 bg-blue-600/15 px-3 py-1 text-blue-100">
              {match.ownSlot === 'team1' ? match.team1?.name : match.team2?.name}
            </span>
          </div>
        </div>

        {pendingFromOpponent && match.report ? (
          <div className="mt-4 rounded-md border border-yellow-500/40 bg-yellow-600/15 p-4">
            <div className="text-sm font-semibold text-yellow-100">
              Gegnerteam meldet: {match.report.team1Score} - {match.report.team2Score}
            </div>
            <p className="mt-1 text-xs text-yellow-100/70">
              Bitte nur bestätigen, wenn das Ergebnis stimmt.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => confirmResult(match, 'confirm')}
                disabled={busyMatchId === match.id}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-gray-700"
              >
                Ergebnis bestätigen
              </button>
              <button
                onClick={() => confirmResult(match, 'reject')}
                disabled={busyMatchId === match.id}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-gray-700"
              >
                Ablehnen
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                {match.team1?.name || 'Team 1'}
              </span>
              <input
                type="number"
                min="0"
                max="99"
                value={draft.team1}
                onChange={(event) => updateDraft(match.id, 'team1', event.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                {match.team2?.name || 'Team 2'}
              </span>
              <input
                type="number"
                min="0"
                max="99"
                value={draft.team2}
                onChange={(event) => updateDraft(match.id, 'team2', event.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
              />
            </label>
            <button
              onClick={() => submitResult(match)}
              disabled={busyMatchId === match.id}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700"
            >
              {pendingFromOwnTeam ? 'Aktualisieren' : 'Ergebnis melden'}
            </button>
          </div>
        )}

        {!pendingFromOpponent && (
          <p className="mt-3 text-xs text-gray-500">
            Finalen Rundenscore eintragen, zum Beispiel 13:10. Unentschieden sind nicht möglich.
          </p>
        )}

        {pendingFromOwnTeam && (
          <p className="mt-3 rounded-md border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-sm text-blue-100">
            Dein Team hat ein Ergebnis gemeldet. Warte auf die Bestätigung des Gegnerteams.
          </p>
        )}

        <div className="mt-5 border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-white">Match-Chat</h3>
            <span className="text-xs text-gray-500">{chatMessages.length} Nachrichten</span>
          </div>

          <div className="mt-3 flex min-h-32 max-h-64 flex-col-reverse gap-2 overflow-y-auto rounded-md border border-gray-700 bg-gray-950/80 p-3">
            {chatMessages.length === 0 ? (
              <div className="my-auto text-center text-sm text-gray-500">Noch keine Nachrichten</div>
            ) : (
              [...chatMessages].reverse().map((chatMessage) => {
                const isOwnMessage = chatMessage.senderUserId === payload?.user.id

                return (
                  <div
                    key={chatMessage.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-md border px-3 py-2 ${
                        isOwnMessage
                          ? 'border-blue-400/40 bg-blue-600/20 text-blue-50'
                          : 'border-gray-700 bg-gray-900 text-gray-100'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px]">
                        <span className="font-bold">{chatMessage.senderName}</span>
                        <span className={isOwnMessage ? 'text-blue-200/70' : 'text-gray-500'}>
                          {chatMessage.senderTeamName}
                        </span>
                        <span className={isOwnMessage ? 'text-blue-200/60' : 'text-gray-600'}>
                          {formatTime(chatMessage.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{chatMessage.message}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <form
            onSubmit={(event) => sendChatMessage(event, match)}
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">Nachricht</span>
              <textarea
                rows={2}
                maxLength={500}
                value={chatDraft}
                onChange={(event) => {
                  const value = event.target.value
                  setChatDrafts((prev) => ({ ...prev, [match.id]: value }))
                }}
                placeholder="Nachricht schreiben..."
                className="block w-full resize-none rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-blue-400 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={!chatDraft.trim() || busyChatMatchId === match.id}
              className="h-10 rounded-md bg-blue-600 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700"
            >
              {busyChatMatchId === match.id ? 'Sende...' : 'Senden'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-xl">Lade IGL Bereich...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-lg border border-red-500/40 bg-red-600/15 p-6 text-center">
          <h1 className="text-2xl font-bold">Kein Zugriff</h1>
          <p className="mt-2 text-red-100">{error}</p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-500"
          >
            Zum Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const team = payload?.user.team
  const hasTeam = Boolean(payload?.user.teamId && team)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <main className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-blue-500/30 bg-gray-900/85 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300">
                IGL Match Center
              </div>
              <h1 className="mt-2 text-3xl font-bold text-white">Ergebnisse melden</h1>
              <p className="mt-2 text-sm text-gray-400">
                Live-Matches deines Teams eintragen und Gegner-Reports bestätigen.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-gray-700 bg-gray-950 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">Dein Team</div>
                <div className="mt-1 text-lg font-bold text-blue-200">{team?.name || 'Kein Team'}</div>
              </div>
              <div className="rounded-md border border-gray-700 bg-gray-950 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">Eigene Matches</div>
                <div className="mt-1 text-lg font-bold text-white">{ownMatches.length}</div>
              </div>
              <div className="rounded-md border border-gray-700 bg-gray-950 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">Live Aktionen</div>
                <div className="mt-1 text-lg font-bold text-green-200">{actionableMatches.length}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="rounded-md border border-blue-500/50 bg-blue-600/20 px-4 py-2 text-sm font-semibold text-blue-100 transition-colors hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? 'Aktualisiere...' : 'Aktualisieren'}
            </button>
            {payload?.lastUpdated && (
              <span className="text-sm text-gray-500">Stand {formatTime(payload.lastUpdated)}</span>
            )}
          </div>
        </section>

        {message && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-green-500/40 bg-green-600/15 text-green-100'
                : 'border-red-500/40 bg-red-600/15 text-red-100'
            }`}
          >
            {message.text}
          </div>
        )}

        {!hasTeam && (
          <section className="rounded-lg border border-yellow-500/40 bg-yellow-600/15 p-5 text-yellow-100">
            Du bist als IGL markiert, aber noch keinem Team zugewiesen. Sobald du in einem Team bist, erscheinen hier deine Live-Matches.
          </section>
        )}

        <section className="rounded-lg border border-gray-800 bg-gray-900/80 p-5">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Deine Live-Matches</h2>
              <p className="mt-1 text-sm text-gray-400">
                Ergebnisse werden erst offiziell, wenn das andere Team bestätigt.
              </p>
            </div>
            <div className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs font-semibold text-gray-300">
              {payload?.mode === 'single' ? 'Single Elimination' : 'Double Elimination'}
            </div>
          </div>

          {actionableMatches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950/70 p-8 text-center text-gray-400">
              Aktuell ist kein Live-Match deines Teams offen.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {actionableMatches.map((match) => renderMatchControl(match))}
            </div>
          )}
        </section>

        {payload?.groupPhase && (
          <>
            <section className="rounded-lg border border-cyan-500/35 bg-gray-900/80 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Gruppenphase</h2>
                  <p className="mt-1 text-sm text-cyan-100/75">
                    Jeder spielt einmal gegen jedes andere Team der Gruppe.
                  </p>
                </div>
                <div className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100">
                  Runde {payload.groupPhase.activeRound}/{payload.groupPhase.totalRounds}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {payload.groupPhase.groups.map((group) => (
                  <article key={group.name} className="rounded-lg border border-white/10 bg-gray-950/65 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">{group.name}</h3>
                      <span className="text-xs text-gray-500">{group.teams.length} Teams</span>
                    </div>
                    <div className="space-y-2">
                      {group.standings.map((standing) => (
                        <div
                          key={standing.team.id}
                          className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border px-3 py-2 text-sm ${
                            standing.team.id === payload.user.teamId
                              ? 'border-blue-400/70 bg-blue-600/20 text-blue-50'
                              : standing.qualified
                                ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-50'
                                : 'border-white/10 bg-black/25 text-gray-200'
                          }`}
                        >
                          <span className="min-w-0 truncate font-semibold">
                            {standing.rank}. {standing.team.name}
                          </span>
                          <span className="shrink-0 text-xs text-white/65" title="RA = abgegebene Runden">
                            {standing.wins}S · {standing.losses}N · RA {standing.scoreAgainst}
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-blue-500/30 bg-gray-900/80 p-5">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Gruppenrunden</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Aktive Spiele deines Teams erscheinen zusätzlich oben zur Ergebnismeldung.
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {payload.groupPhase.rounds.filter((round) => round.isComplete).length}/{payload.groupPhase.totalRounds} abgeschlossen
                </div>
              </div>

              <div className="space-y-5">
                {payload.groupPhase.rounds.map((round) => (
                  <article
                    key={round.round}
                    className={`rounded-lg border p-4 ${
                      round.isActive
                        ? 'border-cyan-400/55 bg-cyan-500/10'
                        : round.isComplete
                          ? 'border-green-500/25 bg-green-500/5'
                          : 'border-white/10 bg-gray-950/45'
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-lg font-bold">{round.label}</h3>
                      <span className={`rounded px-2 py-1 text-xs font-bold ${
                        round.isComplete
                          ? 'bg-green-500/20 text-green-100'
                          : round.isActive
                            ? 'bg-cyan-500/20 text-cyan-100'
                            : 'bg-white/10 text-gray-400'
                      }`}>
                        {round.isComplete ? 'Abgeschlossen' : round.isActive ? 'Live' : 'Geplant'}
                      </span>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                      {round.matches.map((groupMatch) => (
                        <div key={groupMatch.id} className="min-h-20">
                          {renderMatchBox(groupMatchesById.get(groupMatch.id))}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="rounded-lg border border-purple-500/40 bg-black/25 p-5">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Tournament Bracket</h2>
              <p className="mt-1 text-sm text-purple-200">
                Dein Team ist blau markiert. Live-Matches werden automatisch aktualisiert.
              </p>
            </div>
            <div className="text-sm text-gray-400">
              {payload?.teams.length || 0} Teams · {payload?.requestedSlotCount || 0} Slots
            </div>
          </div>

          <div className="overflow-auto pb-2">
            {payload && payload.layout.length > 0 ? (
              <BracketDiagram
                matches={payload.matches}
                layout={payload.layout}
                connections={payload.connections}
                renderMatch={(match) => renderMatchBox(match as IglMatch | undefined)}
                className="mx-auto"
              />
            ) : (
              <div className="py-10 text-center text-purple-200">Bracket wird vorbereitet...</div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-800 bg-gray-900/75 p-5">
          <h2 className="text-xl font-bold">Teams</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
            {visibleTeams.filter((item) => isRealTeam(item)).map((item) => (
              <div
                key={item.id}
                className={`rounded-md border p-3 ${
                  item.id === payload?.user.teamId
                    ? 'border-blue-400 bg-blue-600/20 text-blue-100'
                    : 'border-gray-700 bg-gray-950 text-gray-200'
                }`}
              >
                <div className="font-semibold">{item.name}</div>
                <div className="text-xs text-gray-500">Position {item.position}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
