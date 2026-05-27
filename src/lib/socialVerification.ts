import { SOCIAL_REQUIREMENTS } from './socialRequirements'

export type VerificationResult = {
  verified: boolean
  message: string
  manualReview?: boolean
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase()
}

async function twitchHeaders() {
  const clientId = process.env.TWITCH_CLIENT_ID
  const token = process.env.TWITCH_ACCESS_TOKEN
  if (!clientId || !token) {
    return null
  }
  return {
    'Client-ID': clientId,
    Authorization: `Bearer ${token}`,
  }
}

async function getTwitchUserId(login: string, headers: Record<string, string>): Promise<string | null> {
  const response = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
    { headers }
  )
  if (!response.ok) return null
  const body = await response.json()
  return body?.data?.[0]?.id ?? null
}

export async function verifyTwitchFollow(twitchLogin: string): Promise<VerificationResult> {
  const headers = await twitchHeaders()
  if (!headers) {
    return {
      verified: false,
      message: 'Twitch-API ist nicht konfiguriert (TWITCH_CLIENT_ID / TWITCH_ACCESS_TOKEN).',
    }
  }

  const channel = SOCIAL_REQUIREMENTS.twitch.channel
  const broadcasterId = await getTwitchUserId(channel, headers)
  const userId = await getTwitchUserId(normalizeUsername(twitchLogin), headers)

  if (!broadcasterId) {
    return { verified: false, message: `Twitch-Kanal "${channel}" wurde nicht gefunden.` }
  }
  if (!userId) {
    return { verified: false, message: 'Twitch-Account nicht gefunden. Prüfe deinen Benutzernamen.' }
  }

  const response = await fetch(
    `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&user_id=${userId}`,
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
