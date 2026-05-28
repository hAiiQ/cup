import { NextRequest } from 'next/server'
import {
  VALORANT_LOOKUP_LIMIT,
  VALORANT_LOOKUP_WINDOW_MINUTES,
  VALORANT_LOOKUP_WINDOW_MS,
} from './valorantLookupLimits'

export { VALORANT_LOOKUP_LIMIT, VALORANT_LOOKUP_WINDOW_MINUTES, VALORANT_LOOKUP_WINDOW_MS }

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

const valorantLookupRequests = new Map<string, number[]>()

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const clientIp = request.headers.get('x-client-ip')?.trim()
  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  const nextIp = (request as NextRequest & { ip?: string }).ip?.trim()
  const userAgent = request.headers.get('user-agent')?.trim()
  return forwardedFor || realIp || clientIp || cfIp || nextIp || userAgent || 'unknown'
}

export function checkValorantLookupRateLimit(request: NextRequest): RateLimitResult {
  const now = Date.now()
  const windowStart = now - VALORANT_LOOKUP_WINDOW_MS
  const key = `valorant:${getClientIdentifier(request)}`
  const recentRequests = (valorantLookupRequests.get(key) || []).filter((time) => time > windowStart)

  if (recentRequests.length >= VALORANT_LOOKUP_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: recentRequests[0] + VALORANT_LOOKUP_WINDOW_MS - now,
    }
  }

  recentRequests.push(now)
  valorantLookupRequests.set(key, recentRequests)

  return {
    allowed: true,
    remaining: Math.max(VALORANT_LOOKUP_LIMIT - recentRequests.length, 0),
    retryAfterMs: 0,
  }
}

export function getValorantRateLimitMessage(retryAfterMs: number) {
  const retryAfterMinutes = Math.max(1, Math.ceil(retryAfterMs / 60_000))
  return `Zu viele Valorant-Prüfungen. Maximal ${VALORANT_LOOKUP_LIMIT} Prüfungen alle ${VALORANT_LOOKUP_WINDOW_MINUTES} Minuten. Bitte warte ca. ${retryAfterMinutes} Minute${retryAfterMinutes === 1 ? '' : 'n'}.`
}

export function getRetryAfterSeconds(retryAfterMs: number) {
  return Math.max(1, Math.ceil(retryAfterMs / 1000))
}
