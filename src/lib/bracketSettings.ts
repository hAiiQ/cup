import { prisma } from '@/lib/prisma'
import { MAX_TEAMS } from '@/lib/teamDefaults'
import { clampGroupCount, clampGroupRoundCount } from '@/lib/groupPhase'

export type BracketMode = 'single' | 'double'

export interface BracketSettings {
  mode: BracketMode
  teamSlots: number
  tournamentStarted: boolean
  groupPhaseEnabled: boolean
  groupCount: number
  groupRoundCount: number
  activeGroupRound: number
  groupTeamOrder: string[]
  eliminationTeamOrder: string[]
  participationOpen: boolean
  participationEndsAt: Date | null
}

const DEFAULT_SETTINGS: BracketSettings = {
  mode: 'double',
  teamSlots: 16,
  tournamentStarted: false,
  groupPhaseEnabled: false,
  groupCount: 4,
  groupRoundCount: 3,
  activeGroupRound: 0,
  groupTeamOrder: [],
  eliminationTeamOrder: [],
  participationOpen: false,
  participationEndsAt: null
}

const MIN_TEAM_SLOTS = 2
const SETTINGS_ID = 'default'

const clampTeamSlots = (value?: number | null) => {
  const numericValue = typeof value === 'number' ? value : Number(value)

  if (!numericValue || Number.isNaN(numericValue)) {
    return DEFAULT_SETTINGS.teamSlots
  }

  return Math.min(Math.max(Math.floor(numericValue), MIN_TEAM_SLOTS), MAX_TEAMS)
}

const normalizeMode = (mode?: string | null): BracketMode => {
  return mode === 'single' ? 'single' : 'double'
}

const normalizeParticipationEndsAt = (value?: Date | string | null): Date | null => {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

export const normalizeGroupTeamOrder = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(new Set(
    value
      .filter((teamId): teamId is string => typeof teamId === 'string')
      .map((teamId) => teamId.trim())
      .filter(Boolean)
  ))
}

export const isParticipationOpenNow = (
  settings: Pick<BracketSettings, 'participationOpen' | 'participationEndsAt'>,
  now = new Date()
) => {
  const endsAt = normalizeParticipationEndsAt(settings.participationEndsAt)
  return Boolean(settings.participationOpen && (!endsAt || endsAt.getTime() > now.getTime()))
}

let ensureTablePromise: Promise<void> | null = null
let tableReady = false

const doesBracketSettingsTableExist = async (): Promise<boolean> => {
  try {
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'BracketSetting'
      ) AS "exists";
    `

    return Boolean(result?.[0]?.exists)
  } catch (error) {
    console.error('Failed to check BracketSetting table existence:', error)
    return false
  }
}

const ensureBracketSettingsTable = async () => {
  if (tableReady) {
    return
  }

  if (ensureTablePromise) {
    return ensureTablePromise
  }

  ensureTablePromise = (async () => {
    try {
      const exists = await doesBracketSettingsTableExist()
      if (!exists) {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "BracketSetting" (
            id TEXT PRIMARY KEY,
            mode TEXT NOT NULL DEFAULT 'double',
            "teamSlots" INTEGER NOT NULL DEFAULT 16,
            "tournamentStarted" BOOLEAN NOT NULL DEFAULT FALSE,
            "groupPhaseEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
            "groupCount" INTEGER NOT NULL DEFAULT 4,
            "groupRoundCount" INTEGER NOT NULL DEFAULT 0,
            "activeGroupRound" INTEGER NOT NULL DEFAULT 0,
            "groupTeamOrder" JSONB NOT NULL DEFAULT '[]'::jsonb,
            "eliminationTeamOrder" JSONB NOT NULL DEFAULT '[]'::jsonb,
            "participationOpen" BOOLEAN NOT NULL DEFAULT FALSE,
            "participationEndsAt" TIMESTAMPTZ,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `)
      } else {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "BracketSetting"
          ADD COLUMN IF NOT EXISTS "tournamentStarted" BOOLEAN NOT NULL DEFAULT FALSE;
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "BracketSetting"
          ADD COLUMN IF NOT EXISTS "groupPhaseEnabled" BOOLEAN NOT NULL DEFAULT FALSE;
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "BracketSetting"
          ADD COLUMN IF NOT EXISTS "groupCount" INTEGER NOT NULL DEFAULT 4;
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "BracketSetting"
          ADD COLUMN IF NOT EXISTS "groupRoundCount" INTEGER NOT NULL DEFAULT 0;
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "BracketSetting"
          ADD COLUMN IF NOT EXISTS "activeGroupRound" INTEGER NOT NULL DEFAULT 0;
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "BracketSetting"
          ADD COLUMN IF NOT EXISTS "groupTeamOrder" JSONB NOT NULL DEFAULT '[]'::jsonb;
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "BracketSetting"
          ADD COLUMN IF NOT EXISTS "eliminationTeamOrder" JSONB NOT NULL DEFAULT '[]'::jsonb;
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "BracketSetting"
          ADD COLUMN IF NOT EXISTS "participationOpen" BOOLEAN NOT NULL DEFAULT FALSE;
        `)
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "BracketSetting"
          ADD COLUMN IF NOT EXISTS "participationEndsAt" TIMESTAMPTZ;
        `)
      }

      if (!exists) {
        await prisma.bracketSetting.upsert({
          where: { id: SETTINGS_ID },
          create: {
            id: SETTINGS_ID,
            mode: DEFAULT_SETTINGS.mode,
            teamSlots: DEFAULT_SETTINGS.teamSlots,
            tournamentStarted: DEFAULT_SETTINGS.tournamentStarted,
            groupPhaseEnabled: DEFAULT_SETTINGS.groupPhaseEnabled,
            groupCount: DEFAULT_SETTINGS.groupCount,
            groupRoundCount: DEFAULT_SETTINGS.groupRoundCount,
            activeGroupRound: DEFAULT_SETTINGS.activeGroupRound,
            groupTeamOrder: DEFAULT_SETTINGS.groupTeamOrder,
            eliminationTeamOrder: DEFAULT_SETTINGS.eliminationTeamOrder,
            participationOpen: DEFAULT_SETTINGS.participationOpen,
            participationEndsAt: DEFAULT_SETTINGS.participationEndsAt
          },
          update: {}
        })
      }

      tableReady = true
    } catch (error) {
      tableReady = false
      console.error('Failed to ensure BracketSetting table:', error)
      throw error
    } finally {
      ensureTablePromise = null
    }
  })()

  return ensureTablePromise
}

export async function getBracketSettings(): Promise<BracketSettings> {
  try {
    await ensureBracketSettingsTable()
    const record = await prisma.bracketSetting.findUnique({ where: { id: SETTINGS_ID } })
    if (!record) {
      return DEFAULT_SETTINGS
    }

    const teamSlots = clampTeamSlots(record.teamSlots)
    const groupCount = clampGroupCount(record.groupCount, teamSlots)

    return {
      mode: normalizeMode(record.mode),
      teamSlots,
      tournamentStarted: Boolean(record.tournamentStarted),
      groupPhaseEnabled: Boolean(record.groupPhaseEnabled),
      groupCount,
      groupRoundCount: clampGroupRoundCount(record.groupRoundCount, teamSlots, groupCount),
      activeGroupRound: Math.max(0, Math.floor(record.activeGroupRound || 0)),
      groupTeamOrder: normalizeGroupTeamOrder(record.groupTeamOrder),
      eliminationTeamOrder: normalizeGroupTeamOrder(record.eliminationTeamOrder),
      participationOpen: Boolean(record.participationOpen),
      participationEndsAt: normalizeParticipationEndsAt(record.participationEndsAt)
    }
  } catch (error) {
    console.warn('Failed to load bracket settings, falling back to defaults:', error)
    return DEFAULT_SETTINGS
  }
}

export async function updateBracketSettings(
  update: Partial<BracketSettings>
): Promise<BracketSettings> {
  await ensureBracketSettingsTable()

  const current = await getBracketSettings()
  const mode = update.mode === undefined ? current.mode : normalizeMode(update.mode)
  const teamSlots = update.teamSlots === undefined ? current.teamSlots : clampTeamSlots(update.teamSlots)
  const tournamentStarted = update.tournamentStarted === undefined
    ? current.tournamentStarted
    : Boolean(update.tournamentStarted)
  const groupPhaseEnabled = update.groupPhaseEnabled === undefined
    ? current.groupPhaseEnabled
    : Boolean(update.groupPhaseEnabled)
  const groupCount = update.groupCount === undefined
    ? clampGroupCount(current.groupCount, teamSlots)
    : clampGroupCount(update.groupCount, teamSlots)
  const groupRoundCount = update.groupRoundCount === undefined
    ? clampGroupRoundCount(current.groupRoundCount, teamSlots, groupCount)
    : clampGroupRoundCount(update.groupRoundCount, teamSlots, groupCount)
  const activeGroupRound = update.activeGroupRound === undefined
    ? current.activeGroupRound
    : Math.max(0, Math.floor(Number(update.activeGroupRound) || 0))
  const groupTeamOrder = update.groupTeamOrder === undefined
    ? current.groupTeamOrder
    : normalizeGroupTeamOrder(update.groupTeamOrder)
  const eliminationTeamOrder = update.eliminationTeamOrder === undefined
    ? current.eliminationTeamOrder
    : normalizeGroupTeamOrder(update.eliminationTeamOrder)
  const participationOpen = update.participationOpen === undefined
    ? current.participationOpen
    : Boolean(update.participationOpen)
  const participationEndsAt = update.participationEndsAt === undefined
    ? current.participationEndsAt
    : normalizeParticipationEndsAt(update.participationEndsAt)

  const saved = await prisma.bracketSetting.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      mode,
      teamSlots,
      tournamentStarted,
      groupPhaseEnabled,
      groupCount,
      groupRoundCount,
      activeGroupRound,
      groupTeamOrder,
      eliminationTeamOrder,
      participationOpen,
      participationEndsAt
    },
    update: {
      mode,
      teamSlots,
      tournamentStarted,
      groupPhaseEnabled,
      groupCount,
      groupRoundCount,
      activeGroupRound,
      groupTeamOrder,
      eliminationTeamOrder,
      participationOpen,
      participationEndsAt
    }
  })

  const savedTeamSlots = clampTeamSlots(saved.teamSlots)
  const savedGroupCount = clampGroupCount(saved.groupCount, savedTeamSlots)

  return {
    mode: normalizeMode(saved.mode),
    teamSlots: savedTeamSlots,
    tournamentStarted: Boolean(saved.tournamentStarted),
    groupPhaseEnabled: Boolean(saved.groupPhaseEnabled),
    groupCount: savedGroupCount,
    groupRoundCount: clampGroupRoundCount(saved.groupRoundCount, savedTeamSlots, savedGroupCount),
    activeGroupRound: Math.max(0, Math.floor(saved.activeGroupRound || 0)),
    groupTeamOrder: normalizeGroupTeamOrder(saved.groupTeamOrder),
    eliminationTeamOrder: normalizeGroupTeamOrder(saved.eliminationTeamOrder),
    participationOpen: Boolean(saved.participationOpen),
    participationEndsAt: normalizeParticipationEndsAt(saved.participationEndsAt)
  }
}
