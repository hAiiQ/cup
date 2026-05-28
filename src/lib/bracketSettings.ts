import { prisma } from '@/lib/prisma'
import { MAX_TEAMS } from '@/lib/teamDefaults'

export type BracketMode = 'single' | 'double'

export interface BracketSettings {
  mode: BracketMode
  teamSlots: number
  tournamentStarted: boolean
}

const DEFAULT_SETTINGS: BracketSettings = {
  mode: 'double',
  teamSlots: 16,
  tournamentStarted: false
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
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `)
      } else {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "BracketSetting"
          ADD COLUMN IF NOT EXISTS "tournamentStarted" BOOLEAN NOT NULL DEFAULT FALSE;
        `)
      }

      if (!exists) {
        await prisma.bracketSetting.upsert({
          where: { id: SETTINGS_ID },
          create: {
            id: SETTINGS_ID,
            mode: DEFAULT_SETTINGS.mode,
            teamSlots: DEFAULT_SETTINGS.teamSlots,
            tournamentStarted: DEFAULT_SETTINGS.tournamentStarted
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

    return {
      mode: normalizeMode(record.mode),
      teamSlots: clampTeamSlots(record.teamSlots),
      tournamentStarted: Boolean(record.tournamentStarted)
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

  const saved = await prisma.bracketSetting.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      mode,
      teamSlots,
      tournamentStarted
    },
    update: {
      mode,
      teamSlots,
      tournamentStarted
    }
  })

  return {
    mode: normalizeMode(saved.mode),
    teamSlots: clampTeamSlots(saved.teamSlots),
    tournamentStarted: Boolean(saved.tournamentStarted)
  }
}
