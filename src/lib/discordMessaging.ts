type DiscordMember = {
  nick?: string | null
  user?: {
    id?: string
    username?: string
    global_name?: string | null
    discriminator?: string
  }
}

export type DiscordMessageRecipient = {
  discordName?: string | null
}

export type DiscordDeliveryResult = {
  total: number
  sent: number
  missingDiscord: number
  notFound: number
  failed: number
}

export const isDiscordMessagingConfigured = () => Boolean(
  process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID
)

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

const discordRequest = async (
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<Response> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bot ${token}`)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(`https://discord.com/api/v10${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    })

    if (response.status !== 429 || attempt === 2) return response

    const body = await response.clone().json().catch(() => ({}))
    const retryAfterSeconds = Number(body.retry_after) || 1
    await wait(Math.ceil(retryAfterSeconds * 1000))
  }

  throw new Error('Discord-Anfrage konnte nicht ausgeführt werden.')
}

const loadGuildMembers = async (guildId: string, token: string) => {
  const members: DiscordMember[] = []
  let after: string | undefined

  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ limit: '1000' })
    if (after) query.set('after', after)

    const response = await discordRequest(`/guilds/${guildId}/members?${query}`, token)
    if (!response.ok) {
      const message = response.status === 403
        ? 'Discord-Bot benötigt den Server Members Intent und Zugriff auf den Server.'
        : `Discord-Mitglieder konnten nicht geladen werden (${response.status}).`
      throw new Error(message)
    }

    const pageMembers = await response.json()
    if (!Array.isArray(pageMembers)) break

    members.push(...pageMembers)
    if (pageMembers.length < 1000) break

    after = pageMembers[pageMembers.length - 1]?.user?.id
    if (!after) break
  }

  return members
}

const getNameKeys = (value?: string | null) => {
  if (!value) return []
  const normalized = value.trim().replace(/^@/, '').toLowerCase()
  if (!normalized) return []

  const withoutDiscriminator = normalized.replace(/#\d{4}$/, '')
  return withoutDiscriminator === normalized
    ? [normalized]
    : [normalized, withoutDiscriminator]
}

const buildMemberIndex = (members: DiscordMember[]) => {
  const index = new Map<string, Map<string, DiscordMember>>()

  members.forEach((member) => {
    const userId = member.user?.id
    if (!userId) return

    const aliases = [member.user?.username, member.user?.global_name, member.nick]
    if (member.user?.username && member.user.discriminator && member.user.discriminator !== '0') {
      aliases.push(`${member.user.username}#${member.user.discriminator}`)
    }

    aliases.flatMap(getNameKeys).forEach((key) => {
      const matches = index.get(key) || new Map<string, DiscordMember>()
      matches.set(userId, member)
      index.set(key, matches)
    })
  })

  return index
}

const findMember = (index: Map<string, Map<string, DiscordMember>>, discordName: string) => {
  const matches = new Map<string, DiscordMember>()
  getNameKeys(discordName).forEach((key) => {
    index.get(key)?.forEach((member, id) => matches.set(id, member))
  })

  return matches.size === 1 ? Array.from(matches.values())[0] : null
}

const sendDirectMessage = async (userId: string, content: string, token: string) => {
  const channelResponse = await discordRequest('/users/@me/channels', token, {
    method: 'POST',
    body: JSON.stringify({ recipient_id: userId }),
  })
  if (!channelResponse.ok) return false

  const channel = await channelResponse.json().catch(() => ({}))
  if (!channel.id) return false

  const messageResponse = await discordRequest(`/channels/${channel.id}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({
      content,
      allowed_mentions: { parse: [] },
    }),
  })

  return messageResponse.ok
}

export const sendDiscordDirectMessages = async (
  recipients: DiscordMessageRecipient[],
  content: string
): Promise<DiscordDeliveryResult> => {
  const token = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID
  if (!token || !guildId) {
    throw new Error('Discord-Bot oder Discord-Server ist nicht konfiguriert.')
  }

  const members = await loadGuildMembers(guildId, token)
  const memberIndex = buildMemberIndex(members)
  let sent = 0
  let missingDiscord = 0
  let notFound = 0
  let failed = 0
  let nextIndex = 0
  const messagedDiscordIds = new Set<string>()

  const workers = Array.from({ length: Math.min(3, Math.max(recipients.length, 1)) }, async () => {
    while (nextIndex < recipients.length) {
      const recipient = recipients[nextIndex]
      nextIndex += 1

      if (!recipient.discordName) {
        missingDiscord += 1
        continue
      }

      const member = findMember(memberIndex, recipient.discordName)
      const discordId = member?.user?.id
      if (!discordId) {
        notFound += 1
        continue
      }

      if (messagedDiscordIds.has(discordId)) continue
      messagedDiscordIds.add(discordId)

      if (await sendDirectMessage(discordId, content, token)) {
        sent += 1
      } else {
        failed += 1
      }
    }
  })

  await Promise.all(workers)

  return {
    total: recipients.length,
    sent,
    missingDiscord,
    notFound,
    failed,
  }
}
