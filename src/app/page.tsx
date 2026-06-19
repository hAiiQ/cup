'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const CASE_ITEM_COUNT = 48
const CASE_WIN_INDEX = 40
const CASE_ITEM_SIZE = 132
const CASE_ITEM_GAP = 16
const CASE_ITEM_SPAN = CASE_ITEM_SIZE + CASE_ITEM_GAP
const CASE_ROLL_DURATION_MS = 6000
const CASE_FAST_PHASE_MS = 2500
const CASE_FINAL_PHASE_START_MS = 4000
const CASE_DECELERATION_ITEM_COUNT = 4
const CASE_FINAL_ITEMS_PER_SECOND = 1
const CASE_IMAGE_SOURCES = ['/bild1.png', '/bild2.png']

const getCaseRollDistanceAtTime = (elapsedMs: number, totalDistance: number) => {
  const finalPhaseDuration = CASE_ROLL_DURATION_MS - CASE_FINAL_PHASE_START_MS
  const finalSpeed = (CASE_ITEM_SPAN * CASE_FINAL_ITEMS_PER_SECOND) / 1000
  const finalPhaseDistance = finalSpeed * finalPhaseDuration
  const decelerationDistance = CASE_ITEM_SPAN * CASE_DECELERATION_ITEM_COUNT
  const fastPhaseDistance = totalDistance - finalPhaseDistance - decelerationDistance
  const decelerationDuration = CASE_FINAL_PHASE_START_MS - CASE_FAST_PHASE_MS
  const speedAtFinalPhase = finalSpeed
  const speedAtFastPhaseEnd =
    (2 * decelerationDistance) / decelerationDuration - speedAtFinalPhase
  const startSpeed = (2 * fastPhaseDistance) / CASE_FAST_PHASE_MS - speedAtFastPhaseEnd
  const clampedElapsed = Math.min(Math.max(elapsedMs, 0), CASE_ROLL_DURATION_MS)

  if (clampedElapsed <= CASE_FAST_PHASE_MS) {
    const acceleration = (speedAtFastPhaseEnd - startSpeed) / CASE_FAST_PHASE_MS
    return startSpeed * clampedElapsed + 0.5 * acceleration * clampedElapsed * clampedElapsed
  }

  if (clampedElapsed <= CASE_FINAL_PHASE_START_MS) {
    const phaseElapsed = clampedElapsed - CASE_FAST_PHASE_MS
    const acceleration =
      (speedAtFinalPhase - speedAtFastPhaseEnd) /
      (CASE_FINAL_PHASE_START_MS - CASE_FAST_PHASE_MS)
    return (
      fastPhaseDistance +
      speedAtFastPhaseEnd * phaseElapsed +
      0.5 * acceleration * phaseElapsed * phaseElapsed
    )
  }

  return (
    totalDistance -
    finalPhaseDistance +
    speedAtFinalPhase * (clampedElapsed - CASE_FINAL_PHASE_START_MS)
  )
}

export default function HomePage() {
  const { isLoggedIn, loading } = useAuth()
  const [caseOpen, setCaseOpen] = useState(false)
  const [caseRunId, setCaseRunId] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const caseTrackRef = useRef<HTMLDivElement | null>(null)
  const caseAnimationFrameRef = useRef<number | null>(null)
  const caseImagesReadyRef = useRef(false)
  const caseImagePreloadRef = useRef<Promise<void> | null>(null)
  const caseRollDistance = CASE_WIN_INDEX * CASE_ITEM_SPAN

  const caseItems = useMemo(
    () =>
      Array.from({ length: CASE_ITEM_COUNT }, (_, index) => ({
        src: index === CASE_WIN_INDEX ? CASE_IMAGE_SOURCES[1] : CASE_IMAGE_SOURCES[0],
        isWinner: index === CASE_WIN_INDEX,
      })),
    []
  )

  const preloadCaseImages = useCallback(() => {
    if (caseImagesReadyRef.current) {
      return Promise.resolve()
    }

    if (caseImagePreloadRef.current) {
      return caseImagePreloadRef.current
    }

    caseImagePreloadRef.current = Promise.all(
      CASE_IMAGE_SOURCES.map(
        (src) =>
          new Promise<void>((resolve) => {
            const image = new window.Image()
            let settled = false
            const finish = () => {
              if (settled) {
                return
              }

              settled = true
              resolve()
            }

            image.onload = finish
            image.onerror = finish
            image.src = src

            if (image.complete) {
              finish()
            }
          })
      )
    ).then(() => {
      caseImagesReadyRef.current = true
    })

    return caseImagePreloadRef.current
  }, [])

  const stopCaseAudio = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }, [])

  const cancelCaseRoll = useCallback(() => {
    if (caseAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(caseAnimationFrameRef.current)
      caseAnimationFrameRef.current = null
    }
  }, [])

  useEffect(() => {
    void preloadCaseImages()
  }, [preloadCaseImages])

  const closeCaseOpening = useCallback(() => {
    cancelCaseRoll()
    if (caseTrackRef.current) {
      caseTrackRef.current.style.transform = 'translate3d(0, 0, 0)'
    }
    setCaseOpen(false)
    stopCaseAudio()
  }, [cancelCaseRoll, stopCaseAudio])

  useEffect(() => {
    if (!caseOpen) {
      return
    }

    const rollTimer = window.setTimeout(() => {
      const track = caseTrackRef.current
      if (!track) {
        return
      }

      cancelCaseRoll()
      track.style.transform = 'translate3d(0, 0, 0)'

      const startTime = window.performance.now()
      const animateCaseRoll = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const distance = getCaseRollDistanceAtTime(elapsed, caseRollDistance)
        track.style.transform = `translate3d(-${distance.toFixed(2)}px, 0, 0)`

        if (elapsed < CASE_ROLL_DURATION_MS) {
          caseAnimationFrameRef.current = window.requestAnimationFrame(animateCaseRoll)
          return
        }

        caseAnimationFrameRef.current = null
        track.style.transform = `translate3d(-${caseRollDistance}px, 0, 0)`
      }

      caseAnimationFrameRef.current = window.requestAnimationFrame(animateCaseRoll)
    }, 80)

    return () => {
      window.clearTimeout(rollTimer)
      cancelCaseRoll()
    }
  }, [cancelCaseRoll, caseOpen, caseRunId, caseRollDistance])

  useEffect(() => {
    if (!caseOpen) {
      return
    }

    const handlePointerDown = () => closeCaseOpening()

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [caseOpen, closeCaseOpening])

  const handleCaseOpening = () => {
    cancelCaseRoll()
    if (caseTrackRef.current) {
      caseTrackRef.current.style.transform = 'translate3d(0, 0, 0)'
    }

    const openCase = () => {
      setCaseOpen(true)
      setCaseRunId((current) => current + 1)

      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        void audio.play().catch(() => {
          // Browser may block audio in unusual cases.
        })
      }
    }

    if (caseImagesReadyRef.current) {
      openCase()
      return
    }

    void preloadCaseImages().then(openCase)
  }

  return (
    <>
      <audio ref={audioRef} src="/caseopening.mp3" preload="auto" />
      <div aria-hidden="true" className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
        {CASE_IMAGE_SOURCES.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            width={CASE_ITEM_SIZE}
            height={CASE_ITEM_SIZE}
            loading="eager"
            decoding="async"
          />
        ))}
      </div>

      {/* Hero Section */}
      <main className="min-h-screen flex flex-col justify-center items-center px-4 py-20 relative">
        
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold text-white mb-6 no-text-shadow">
              SUMMER CUP
              <br />
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Nimm teil am Summer Cup. Registriere dich, entdecke neue Spieler und kämpfe um den Sieg!
            </p>
            
            {/* Tournament Details */}
            <div className="flex justify-center gap-6 mb-8 flex-wrap">
              <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 rounded-xl px-6 py-4 border-2 border-yellow-400/50 shadow-[0_16px_38px_rgba(251,146,60,0.36),0_0_24px_rgba(236,72,153,0.28)] hover:shadow-[0_18px_44px_rgba(251,146,60,0.44),0_0_30px_rgba(236,72,153,0.34)] transform hover:scale-105 transition-all duration-300">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">📅 19.06.2026 - 21.06.2026</div>
                  <div className="text-orange-100 text-sm font-medium">Sommerturnier</div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleCaseOpening}
                className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl px-6 py-4 border-2 border-orange-300/50 shadow-[0_16px_38px_rgba(234,88,12,0.38),0_0_22px_rgba(250,204,21,0.24)] hover:shadow-[0_18px_44px_rgba(234,88,12,0.46),0_0_28px_rgba(250,204,21,0.3)] transform hover:scale-105 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-100"
                aria-label="Preisgeld Animation starten"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">💰 100€ Preisgeld</div>
                  <div className="text-yellow-100 text-sm font-medium">Zu gewinnen</div>
                </div>
              </button>
            </div>
            
            <div className="space-y-4 mb-12">
              {!loading && !isLoggedIn && (
                <Link href="/register" className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105">
                  Jetzt Registrieren
                </Link>
              )}
              {!loading && isLoggedIn && (
                <Link href="/dashboard" className="inline-block bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105">
                  Zum Dashboard
                </Link>
              )}
              <div className="flex justify-center space-x-8 mt-8">
                <Link href="/bracket" className="text-white/80 hover:text-white transition-colors">
                  Tournament Bracket
                </Link>
                <Link href="/teams" className="text-white/80 hover:text-white transition-colors">
                  Teams
                </Link>
                <Link href="/rules" className="text-white/80 hover:text-white transition-colors">
                  Regeln
                </Link>
              </div>
            </div>
          </div>

          {/* Tournament Info Cards */}
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
              <h3 className="text-xl font-semibold text-white mb-4">Turniersystem</h3>
              <p className="text-white/80">
                Wird noch bekanntgegeben — das finale Turniersystem steht noch nicht fest.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
              <h3 className="text-xl font-semibold text-white mb-4">Teamanzahl</h3>
              <p className="text-white/80">
                Die genaue Anzahl der teilnehmenden Teams ist noch unklar und wird noch bekanntgegeben.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
              <h3 className="text-xl font-semibold text-white mb-4">Live Updates</h3>
              <p className="text-white/80">
                Verfolge das Tournament live mit automatischen Updates des Brackets und Ergebnissen.
              </p>
            </div>
          </div>
          
        </div>
      </main>

      {caseOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Preisgeld Animation"
          onClickCapture={closeCaseOpening}
        >
          <div className="w-full max-w-4xl">
            <div className="relative overflow-hidden rounded-xl border-4 border-yellow-300 bg-black/55 py-5 shadow-[0_0_38px_rgba(253,224,71,0.45)]">
              <div className="pointer-events-none absolute inset-y-3 left-1/2 z-20 w-1 -translate-x-1/2 rounded-full bg-yellow-300/25 shadow-[0_0_24px_rgba(253,224,71,0.25)]" />
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-black/80 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-black/80 to-transparent" />

              <div
                ref={caseTrackRef}
                className="flex"
                style={{
                  gap: `${CASE_ITEM_GAP}px`,
                  paddingLeft: `calc(50% - ${CASE_ITEM_SIZE / 2}px)`,
                  paddingRight: `calc(50% - ${CASE_ITEM_SIZE / 2}px)`,
                  animation: 'none',
                  transform: 'translate3d(0, 0, 0)',
                  transition: 'none',
                  willChange: 'transform',
                }}
              >
                {caseItems.map((item, index) => (
                  <div
                    key={`${caseRunId}-${index}`}
                    className={`shrink-0 overflow-hidden rounded-lg border-2 bg-white/5 shadow-lg ${
                      item.isWinner
                        ? 'border-yellow-300 shadow-yellow-300/30'
                        : 'border-white/15'
                    }`}
                    style={{ width: CASE_ITEM_SIZE, height: CASE_ITEM_SIZE }}
                  >
                    <img
                      src={item.src}
                      alt="Preisbild"
                      width={CASE_ITEM_SIZE}
                      height={CASE_ITEM_SIZE}
                      loading="eager"
                      decoding="sync"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
