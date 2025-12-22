import { prisma } from '@/lib/prisma'
import { MAX_TEAMS } from '@/lib/teamDefaults'

export type BracketMode = 'single' | 'double'

export interface BracketSettings {
  mode: BracketMode
  teamSlots: number
}

const DEFAULT_SETTINGS: BracketSettings = {
  mode: 'double',
  teamSlots: 16
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

export async function getBracketSettings(): Promise<BracketSettings> {
  try {
    const record = await prisma.bracketSetting.findUnique({ where: { id: SETTINGS_ID } })
    if (!record) {
      return DEFAULT_SETTINGS
    }

    return {
      mode: normalizeMode(record.mode),
      teamSlots: clampTeamSlots(record.teamSlots)
    }
  } catch (error) {
    console.warn('Failed to load bracket settings, falling back to defaults:', error)
    return DEFAULT_SETTINGS
  }
}

export async function updateBracketSettings(
  update: Partial<BracketSettings>
): Promise<BracketSettings> {
  const mode = normalizeMode(update.mode)
  const teamSlots = clampTeamSlots(update.teamSlots)

  const saved = await prisma.bracketSetting.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      mode,
      teamSlots
    },
    update: {
      mode,
      teamSlots
    }
  })

  return {
    mode: normalizeMode(saved.mode),
    teamSlots: clampTeamSlots(saved.teamSlots)
  }
}
