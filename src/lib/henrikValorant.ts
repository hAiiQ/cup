const HENRIK_BASE = 'https://api.henrikdev.xyz/valorant'

export class HenrikApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 500
  ) {
    super(message)
    this.name = 'HenrikApiError'
  }
}

type HenrikResponse<T> = {
  status?: number
  errors?: Array<{ message?: string }>
  data?: T
}

async function henrikGet<T>(path: string): Promise<T> {
  const apiKey = process.env.HENRIKDEV_API_KEY?.trim()
  if (!apiKey) {
    throw new HenrikApiError(
      'API_KEY_MISSING',
      'Rank-API ist nicht konfiguriert (HENRIKDEV_API_KEY fehlt auf dem Server).',
      503
    )
  }

  const url = new URL(`${HENRIK_BASE}${path}`)
  url.searchParams.set('api_key', apiKey)

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  })

  let body: HenrikResponse<T>
  try {
    body = await response.json()
  } catch {
    throw new HenrikApiError('INVALID_RESPONSE', 'Ungültige Antwort von der Rank-API', 502)
  }

  if (!response.ok || (body.status && body.status >= 400)) {
    const message =
      body.errors?.[0]?.message ||
      (response.status === 404 ? 'Spieler nicht gefunden' : 'Rank konnte nicht abgerufen werden')
    throw new HenrikApiError('LOOKUP_FAILED', message, response.status === 404 ? 404 : 502)
  }

  if (!body.data) {
    throw new HenrikApiError('NO_DATA', 'Keine Rank-Daten gefunden', 404)
  }

  return body.data
}

type AccountData = {
  region?: string
}

type MmrData = {
  current?: { tier?: { name?: string } }
  peak?: { tier?: { name?: string } }
}

const REGION_FALLBACKS = ['eu', 'na', 'ap', 'kr', 'br', 'latam']

export async function fetchValorantRank(name: string, tag: string): Promise<{
  rank: string
  region: string
  currentRank?: string
}> {
  const trimmedName = name.trim()
  const trimmedTag = tag.trim()

  let region: string | undefined
  try {
    const account = await henrikGet<AccountData>(
      `/v1/account/${encodeURIComponent(trimmedName)}/${encodeURIComponent(trimmedTag)}`
    )
    region = account.region?.toLowerCase()
  } catch (error) {
    if (error instanceof HenrikApiError && error.code !== 'LOOKUP_FAILED') {
      throw error
    }
  }

  const regionsToTry = region
    ? [region, ...REGION_FALLBACKS.filter((r) => r !== region)]
    : REGION_FALLBACKS

  let lastError: Error | null = null

  for (const tryRegion of regionsToTry) {
    try {
      const mmr = await henrikGet<MmrData>(
        `/v3/mmr/${tryRegion}/pc/${encodeURIComponent(trimmedName)}/${encodeURIComponent(trimmedTag)}`
      )

      const peakRank = mmr.peak?.tier?.name?.trim()
      const currentRank = mmr.current?.tier?.name?.trim()
      const rank = peakRank || currentRank

      if (!rank) {
        throw new HenrikApiError('NO_RANK', 'Kein Rank für diesen Account gefunden', 404)
      }

      return {
        rank,
        region: tryRegion,
        currentRank: currentRank || undefined,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (error instanceof HenrikApiError && error.code === 'API_KEY_MISSING') {
        throw error
      }
    }
  }

  throw (
    lastError ||
    new HenrikApiError('NO_RANK', 'Rank konnte für diesen Spieler nicht ermittelt werden', 404)
  )
}
