import { SOCIAL_REQUIREMENTS } from './socialRequirements'

export type VerificationResult = {
  verified: boolean
  message: string
  manualReview?: boolean
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase()
}

function normalizeTwitchToken(value: string): string {
  return value.trim().replace(/^Bearer\s+/i, '').replace(/^oauth:/i, '')
}

async function twitchHeaders() {
  const clientId = process.env.TWITCH_CLIENT_ID
  const token = process.env.TWITCH_ACCESS_TOKEN
  if (!clientId || !token) {
    return null
  }
  return {
    'Client-ID': clientId.trim(),
    Authorization: `Bearer ${normalizeTwitchToken(token)}`,
  }
}

type TwitchUserLookup =
  | { ok: true; id: string }
  | {
      ok: false
      reason: 'not_found' | 'auth_error' | 'api_error' | 'network_error'
      status?: number
    }

type TwitchTokenValidation =
  | { ok: true }
  | { ok: false; message: string }

async function validateTwitchToken(
  clientId: string,
  accessToken: string
): Promise<TwitchTokenValidation> {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${accessToken}` },
    })

    if (response.status === 401) {
      return {
        ok: false,
        message:
          'Twitch-Access-Token ist ungültig oder abgelaufen. Erzeuge ihn neu mit deiner Twitch-App.',
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        message: 'Twitch-Access-Token konnte nicht validiert werden. Versuche es später erneut.',
      }
    }

    const body = await response.json()
    if (body?.client_id !== clientId) {
      return {
        ok: false,
        message:
          'Twitch-Access-Token passt nicht zur TWITCH_CLIENT_ID. Erzeuge den Token mit genau dieser Twitch-App.',
      }
    }

    if (!body?.user_id) {
      return {
        ok: false,
        message:
          'Twitch-Access-Token muss ein User Access Token sein, kein App Access Token.',
      }
    }

    const scopes = Array.isArray(body?.scopes) ? body.scopes : []
    if (!scopes.includes('moderator:read:followers')) {
      return {
        ok: false,
        message:
          'Twitch-Access-Token braucht den Scope moderator:read:followers.',
      }
    }

    return { ok: true }
  } catch {
    return {
      ok: false,
      message: 'Twitch-API ist gerade nicht erreichbar. Versuche es später erneut.',
    }
  }
}

async function getTwitchUserId(
  login: string,
  headers: Record<string, string>
): Promise<TwitchUserLookup> {
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(normalizeUsername(login))}`,
      { headers }
    )

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'auth_error', status: response.status }
    }

    if (!response.ok) {
      return { ok: false, reason: 'api_error', status: response.status }
    }

    const body = await response.json()
    const id = body?.data?.[0]?.id
    return typeof id === 'string' && id.length > 0
      ? { ok: true, id }
      : { ok: false, reason: 'not_found' }
  } catch {
    return { ok: false, reason: 'network_error' }
  }
}

function twitchLookupFailureMessage(
  lookup: Exclude<TwitchUserLookup, { ok: true }>,
  notFoundMessage: string
): string {
  if (lookup.reason === 'auth_error') {
    return 'Twitch-API-Anmeldung fehlgeschlagen. Prüfe TWITCH_CLIENT_ID / TWITCH_ACCESS_TOKEN.'
  }
  if (lookup.reason === 'api_error') {
    return `Twitch-API konnte nicht abgefragt werden${
      lookup.status ? ` (Status ${lookup.status})` : ''
    }. Versuche es später erneut.`
  }
  if (lookup.reason === 'network_error') {
    return 'Twitch-API ist gerade nicht erreichbar. Versuche es später erneut.'
  }
  return notFoundMessage
}

export async function verifyTwitchFollow(twitchLogin: string): Promise<VerificationResult> {
  const headers = await twitchHeaders()
  if (!headers) {
    return {
      verified: false,
      message: 'Twitch-API ist nicht konfiguriert (TWITCH_CLIENT_ID / TWITCH_ACCESS_TOKEN).',
    }
  }

  const tokenValidation = await validateTwitchToken(
    headers['Client-ID'],
    headers.Authorization.replace(/^Bearer\s+/i, '')
  )
  if (!tokenValidation.ok) {
    return { verified: false, message: tokenValidation.message }
  }

  const channel = SOCIAL_REQUIREMENTS.twitch.channel
  const [broadcaster, user] = await Promise.all([
    getTwitchUserId(channel, headers),
    getTwitchUserId(twitchLogin, headers),
  ])

  if (!broadcaster.ok) {
    return {
      verified: false,
      message: twitchLookupFailureMessage(
        broadcaster,
        `Twitch-Kanal "${channel}" wurde nicht gefunden.`
      ),
    }
  }
  if (!user.ok) {
    return {
      verified: false,
      message: twitchLookupFailureMessage(
        user,
        'Twitch-Account nicht gefunden. Prüfe deinen Twitch Namen.'
      ),
    }
  }

  const response = await fetch(
    `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcaster.id}&user_id=${user.id}`,
    { headers }
  )

  if (response.status === 401 || response.status === 403) {
    return {
      verified: false,
      message:
        'Twitch-Follow konnte nicht geprüft werden. Token braucht moderator:read:followers vom JoeDom-Kanal.',
    }
  }

  if (!response.ok) {
    return { verified: false, message: 'Twitch-Verifikation fehlgeschlagen. Versuche es später erneut.' }
  }

  const body = await response.json()
  const isFollowing = Array.isArray(body?.data) && body.data.length > 0

  return isFollowing
    ? { verified: true, message: `Du folgst ${channel} auf Twitch.` }
    : {
        verified: false,
        message: `Du folgst ${channel} auf Twitch noch nicht. Bitte zuerst folgen und erneut prüfen.`,
      }
}

async function resolveDiscordGuildId(): Promise<string> {
  if (process.env.DISCORD_GUILD_ID) {
    return process.env.DISCORD_GUILD_ID
  }
  const invite = SOCIAL_REQUIREMENTS.discord.inviteCode
  const response = await fetch(`https://discord.com/api/v10/invites/${invite}?with_counts=true`)
  if (!response.ok) {
    return SOCIAL_REQUIREMENTS.discord.guildId
  }
  const body = await response.json()
  return body?.guild?.id ?? body?.guild_id ?? SOCIAL_REQUIREMENTS.discord.guildId
}

export async function verifyDiscordMembership(discordUsername: string): Promise<VerificationResult> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    return {
      verified: false,
      message: 'Discord-Bot ist nicht konfiguriert (DISCORD_BOT_TOKEN).',
    }
  }

  const guildId = await resolveDiscordGuildId()
  const query = normalizeUsername(discordUsername)

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=5`,
    {
      headers: { Authorization: `Bot ${botToken}` },
    }
  )

  if (response.status === 403) {
    return {
      verified: false,
      message:
        'Discord-Bot hat keine Berechtigung. Bot braucht Server Members Intent und Zugriff auf den Server.',
    }
  }

  if (!response.ok) {
    return { verified: false, message: 'Discord-Verifikation fehlgeschlagen.' }
  }

  const members = await response.json()
  const found = Array.isArray(members)
    ? members.some((member: { user?: { username?: string; global_name?: string } }) => {
        const username = member.user?.username?.toLowerCase() ?? ''
        const globalName = member.user?.global_name?.toLowerCase() ?? ''
        return username === query || globalName === query || username.includes(query)
      })
    : false

  return found
    ? { verified: true, message: 'Du bist im Boss Gang Discord.' }
    : {
        verified: false,
        message: `Du bist noch nicht im Discord. Tritt bei: ${SOCIAL_REQUIREMENTS.discord.url}`,
      }
}

/** Instagram/TikTok: no public follow-check API — admin confirms after user follows */
export function verifyInstagramPending(instagramUsername: string): VerificationResult {
  if (!instagramUsername.trim()) {
    return { verified: false, message: 'Instagram-Benutzername fehlt.' }
  }
  return {
    verified: false,
    manualReview: true,
    message: `Folge ${SOCIAL_REQUIREMENTS.instagram.url} — ein Admin bestätigt deinen Instagram-Follow.`,
  }
}

export function verifyTikTokPending(tiktokUsername: string): VerificationResult {
  if (!tiktokUsername.trim()) {
    return { verified: false, message: 'TikTok-Benutzername fehlt.' }
  }
  return {
    verified: false,
    manualReview: true,
    message: `Folge ${SOCIAL_REQUIREMENTS.tiktok.url} — ein Admin bestätigt deinen TikTok-Follow.`,
  }
}

export type SocialAccountsInput = {
  twitch: string
  discord: string
  instagram: string
  tiktok: string
}

export type AllVerificationResults = Record<
  'twitch' | 'discord' | 'instagram' | 'tiktok',
  VerificationResult
>

export async function verifyAllSocialAccounts(
  accounts: SocialAccountsInput
): Promise<AllVerificationResults> {
  const [twitch, discord, instagram, tiktok] = await Promise.all([
    verifyTwitchFollow(accounts.twitch),
    verifyDiscordMembership(accounts.discord),
    Promise.resolve(verifyInstagramPending(accounts.instagram)),
    Promise.resolve(verifyTikTokPending(accounts.tiktok)),
  ])

  return { twitch, discord, instagram, tiktok }
}

export function isFullyVerified(results: AllVerificationResults): boolean {
  return (
    results.twitch.verified &&
    results.discord.verified &&
    results.instagram.verified &&
    results.tiktok.verified
  )
}

export function isAutoVerified(results: AllVerificationResults): boolean {
  return results.twitch.verified && results.discord.verified
}
