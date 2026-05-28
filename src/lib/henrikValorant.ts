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
    headers: {
      Accept: 'application/json',
      Authorization: apiKey,
    },
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
  account_level?: number
}

type MmrData = {
  current?: {
    tier?: { name?: string }
    rr?: number
    last_change?: number
    elo?: number
    leaderboard_placement?: {
      rank?: number
      updated_at?: string
    }
  }
  peak?: { tier?: { name?: string } }
}

type MatchMetadata = {
  match_id?: string
  matchid?: string
  map?: string | { name?: string }
  mode?: string
  queue?: string | { id?: string; name?: string }
  game_start?: number
  game_start_patched?: string
  started_at?: string
}

type MatchPlayer = {
  name?: string
  tag?: string
  team?: string
  team_id?: string
  character?: string
  agent?: { name?: string }
  currenttier_patched?: string
  tier?: { name?: string }
  stats?: {
    score?: number
    kills?: number
    deaths?: number
    assists?: number
    headshots?: number
    damage?: { dealt?: number }
  }
  damage_made?: number
}

type MatchTeam = {
  team_id?: string
  won?: boolean
  has_won?: boolean
  rounds?: { won?: number; lost?: number }
  rounds_won?: number
  rounds_lost?: number
}

type MatchData = {
  metadata?: MatchMetadata
  players?: MatchPlayer[] | { all_players?: MatchPlayer[] }
  teams?: MatchTeam[] | Record<string, MatchTeam>
}

export type ValorantMatchSummary = {
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
  headshots?: number
}

export type ValorantDetails = {
  region: string
  accountLevel?: number
  peakRank: string
  currentRank?: string
  rankRating?: number
  lastRankChange?: number
  mmr?: number
  leaderboardRank?: number
  leaderboardUpdatedAt?: string
  matches: ValorantMatchSummary[]
  totals: {
    kills: number
    deaths: number
    assists: number
    kdRatio: number | null
  }
  matchHistoryError?: string
}

const REGION_FALLBACKS = ['eu', 'na', 'ap', 'kr', 'br', 'latam']

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function getMatchPlayers(match: MatchData): MatchPlayer[] {
  if (Array.isArray(match.players)) {
    return match.players
  }

  if (match.players && Array.isArray(match.players.all_players)) {
    return match.players.all_players
  }

  return []
}

function findMatchPlayer(match: MatchData, name: string, tag: string): MatchPlayer | undefined {
  const targetName = name.trim().toLowerCase()
  const targetTag = tag.trim().toLowerCase()

  return getMatchPlayers(match).find((player) => {
    return (
      player.name?.trim().toLowerCase() === targetName &&
      player.tag?.trim().toLowerCase() === targetTag
    )
  })
}

function getMatchTeam(match: MatchData, teamId?: string): MatchTeam | undefined {
  if (!teamId || !match.teams) {
    return undefined
  }

  if (Array.isArray(match.teams)) {
    return match.teams.find((team) => team.team_id?.toLowerCase() === teamId.toLowerCase())
  }

  return match.teams[teamId.toLowerCase()] || match.teams[teamId]
}

function getMapName(map?: MatchMetadata['map']): string | undefined {
  if (!map) {
    return undefined
  }

  return typeof map === 'string' ? map : map.name
}

function getQueueName(queue?: MatchMetadata['queue'], mode?: string): string | undefined {
  if (!queue) {
    return mode
  }

  return typeof queue === 'string' ? queue : queue.name || queue.id || mode
}

function getStartedAt(metadata?: MatchMetadata): string | undefined {
  if (!metadata) {
    return undefined
  }

  if (metadata.started_at) {
    return metadata.started_at
  }

  if (typeof metadata.game_start === 'number') {
    return new Date(metadata.game_start * 1000).toISOString()
  }

  return metadata.game_start_patched
}

function summarizeMatch(match: MatchData, name: string, tag: string): ValorantMatchSummary | null {
  const player = findMatchPlayer(match, name, tag)
  if (!player) {
    return null
  }

  const metadata = match.metadata
  const teamId = player.team_id || player.team
  const team = getMatchTeam(match, teamId)
  const roundsWon = asNumber(team?.rounds?.won) ?? asNumber(team?.rounds_won)
  const roundsLost = asNumber(team?.rounds?.lost) ?? asNumber(team?.rounds_lost)
  const stats = player.stats || {}
  const damage = asNumber(player.damage_made) ?? asNumber(stats.damage?.dealt)

  return {
    matchId: metadata?.match_id || metadata?.matchid,
    map: getMapName(metadata?.map),
    mode: getQueueName(metadata?.queue, metadata?.mode),
    startedAt: getStartedAt(metadata),
    agent: player.agent?.name || player.character,
    rank: player.tier?.name || player.currenttier_patched,
    won: typeof team?.won === 'boolean' ? team.won : team?.has_won,
    roundsWon,
    roundsLost,
    kills: asNumber(stats.kills) ?? 0,
    deaths: asNumber(stats.deaths) ?? 0,
    assists: asNumber(stats.assists) ?? 0,
    score: asNumber(stats.score),
    damage,
    headshots: asNumber(stats.headshots),
  }
}

export async function fetchValorantRank(name: string, tag: string): Promise<{
  rank: string
  region: string
  currentRank?: string
  accountLevel?: number
  rankRating?: number
  lastRankChange?: number
  mmr?: number
  leaderboardRank?: number
  leaderboardUpdatedAt?: string
}> {
  const trimmedName = name.trim()
  const trimmedTag = tag.trim()

  let region: string | undefined
  let accountLevel: number | undefined
  try {
    const account = await henrikGet<AccountData>(
      `/v1/account/${encodeURIComponent(trimmedName)}/${encodeURIComponent(trimmedTag)}`
    )
    region = account.region?.toLowerCase()
    accountLevel =
      typeof account.account_level === 'number' ? account.account_level : undefined
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
        accountLevel,
        rankRating: asNumber(mmr.current?.rr),
        lastRankChange: asNumber(mmr.current?.last_change),
        mmr: asNumber(mmr.current?.elo),
        leaderboardRank: asNumber(mmr.current?.leaderboard_placement?.rank),
        leaderboardUpdatedAt: mmr.current?.leaderboard_placement?.updated_at,
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

export async function fetchValorantDetails(name: string, tag: string): Promise<ValorantDetails> {
  const rankInfo = await fetchValorantRank(name, tag)
  let matchHistoryError: string | undefined
  let matches: ValorantMatchSummary[] = []

  try {
    const matchData = await henrikGet<MatchData[]>(
      `/v4/matches/${rankInfo.region}/pc/${encodeURIComponent(name.trim())}/${encodeURIComponent(tag.trim())}?mode=competitive&size=5`
    )

    matches = matchData
      .map((match) => summarizeMatch(match, name, tag))
      .filter((match): match is ValorantMatchSummary => Boolean(match))
  } catch (error) {
    matchHistoryError =
      error instanceof HenrikApiError
        ? error.message
        : 'Match History konnte nicht abgerufen werden'
  }

  const totals = matches.reduce(
    (acc, match) => ({
      kills: acc.kills + match.kills,
      deaths: acc.deaths + match.deaths,
      assists: acc.assists + match.assists,
    }),
    { kills: 0, deaths: 0, assists: 0 }
  )

  return {
    region: rankInfo.region,
    accountLevel: rankInfo.accountLevel,
    peakRank: rankInfo.rank,
    currentRank: rankInfo.currentRank,
    rankRating: rankInfo.rankRating,
    lastRankChange: rankInfo.lastRankChange,
    mmr: rankInfo.mmr,
    leaderboardRank: rankInfo.leaderboardRank,
    leaderboardUpdatedAt: rankInfo.leaderboardUpdatedAt,
    matches,
    totals: {
      ...totals,
      kdRatio: totals.deaths > 0 ? Math.round((totals.kills / totals.deaths) * 100) / 100 : null,
    },
    matchHistoryError,
  }
}
