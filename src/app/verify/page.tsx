'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SOCIAL_REQUIREMENTS } from '@/lib/socialRequirements'

type Platform = 'twitch' | 'discord' | 'instagram' | 'tiktok'

type ResultMap = Partial<
  Record<Platform, { verified: boolean; message: string; manualReview?: boolean }>
>

export default function VerifyPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState({
    twitch: '',
    discord: '',
    instagram: '',
    tiktok: '',
  })
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ResultMap>({})
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const pending = sessionStorage.getItem('pendingVerification')
    if (pending) {
      try {
        const parsed = JSON.parse(pending)
        setAccounts((prev) => ({ ...prev, ...parsed }))
        sessionStorage.removeItem('pendingVerification')
      } catch {
        // ignore invalid session data
      }
    }
  }, [router])

  const runVerification = async () => {
    setError('')
    setLoading(true)
    setResults({})

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/verify-social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ socialAccounts: accounts }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Verifikation fehlgeschlagen')
        return
      }

      setResults(data.results || {})

      if (data.allVerified) {
        setTimeout(() => router.push('/dashboard'), 1500)
      }
    } catch {
      setError('Verifikation fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const requirementCards: { key: Platform; emoji: string }[] = [
    { key: 'twitch', emoji: '📺' },
    { key: 'discord', emoji: '💬' },
    { key: 'instagram', emoji: '📸' },
    { key: 'tiktok', emoji: '🎵' },
  ]

  return (
    <div className="min-h-screen bg-image flex items-center justify-center px-4 py-10">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 w-full max-w-2xl border border-white/20">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">Social Verifikation</h1>
        <p className="text-white/80 text-center mb-8">
          Folge allen Accounts und trage deine Benutzernamen ein. Twitch & Discord werden automatisch
          geprüft; Instagram & TikTok bestätigt ein Admin nach dem Follow.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {requirementCards.map(({ key, emoji }) => {
            const req = SOCIAL_REQUIREMENTS[key]
            return (
              <a
                key={key}
                href={req.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 border border-white/20 rounded-lg p-4 hover:bg-white/15 transition-colors"
              >
                <div className="text-2xl mb-2">{emoji}</div>
                <div className="text-white font-semibold text-sm">{req.label}</div>
                <div className="text-purple-300 text-xs mt-1">{req.action}</div>
              </a>
            )
          })}
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-white mb-2">Twitch Benutzername *</label>
            <input
              value={accounts.twitch}
              onChange={(e) => setAccounts({ ...accounts, twitch: e.target.value })}
              placeholder="dein_twitch_name"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white"
            />
          </div>
          <div>
            <label className="block text-white mb-2">Discord Benutzername *</label>
            <input
              value={accounts.discord}
              onChange={(e) => setAccounts({ ...accounts, discord: e.target.value })}
              placeholder="dein_discord_name"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white"
            />
          </div>
          <div>
            <label className="block text-white mb-2">Instagram Benutzername *</label>
            <input
              value={accounts.instagram}
              onChange={(e) => setAccounts({ ...accounts, instagram: e.target.value })}
              placeholder="dein_instagram_name"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white"
            />
          </div>
          <div>
            <label className="block text-white mb-2">TikTok Benutzername *</label>
            <input
              value={accounts.tiktok}
              onChange={(e) => setAccounts({ ...accounts, tiktok: e.target.value })}
              placeholder="dein_tiktok_name"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white"
            />
          </div>
        </div>

        {Object.keys(results).length > 0 && (
          <div className="space-y-2 mb-6">
            {requirementCards.map(({ key }) => {
              const result = results[key]
              if (!result) return null
              return (
                <div
                  key={key}
                  className={`rounded-lg p-3 text-sm border ${
                    result.verified
                      ? 'bg-green-500/20 border-green-500/40 text-green-100'
                      : result.manualReview
                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-100'
                        : 'bg-red-500/20 border-red-500/40 text-red-100'
                  }`}
                >
                  <strong className="capitalize">{key}:</strong> {result.message}
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 mb-4">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={runVerification}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Wird geprüft...' : 'Verifikation starten'}
        </button>

        <p className="text-center text-white/60 text-sm mt-6">
          <Link href="/dashboard" className="text-purple-300 hover:underline">
            Zum Dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}
