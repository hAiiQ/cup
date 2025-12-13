export const TIER_KEYS = ['tier1', 'tier2', 'tier3', 'tier4'] as const
export type TierKey = typeof TIER_KEYS[number]

interface TierMeta {
  label: string
  shortLabel: string
  description: string
  icon: string
  order: number
}

export const TIER_META: Record<TierKey, TierMeta> = {
  tier1: {
    label: 'Tier 1',
    shortLabel: 'TIER 1',
    description: 'Höchste Skill-Kategorie',
    icon: '🥇',
    order: 1
  },
  tier2: {
    label: 'Tier 2',
    shortLabel: 'TIER 2',
    description: 'Obere Mittelkategorie',
    icon: '🥈',
    order: 2
  },
  tier3: {
    label: 'Tier 3',
    shortLabel: 'TIER 3',
    description: 'Untere Mittelkategorie',
    icon: '🥉',
    order: 3
  },
  tier4: {
    label: 'Tier 4',
    shortLabel: 'TIER 4',
    description: 'Niedrigste Skill-Kategorie',
    icon: '🏅',
    order: 4
  }
}

export const TIER_SELECT_OPTIONS = TIER_KEYS.map((key) => ({
  value: key,
  label: `${TIER_META[key].icon} ${TIER_META[key].label}`
}))

export function resolveTierKey(value?: string | number | null): TierKey | null {
  if (typeof value === 'number') {
    const key = TIER_KEYS[value - 1]
    return key ?? null
  }

  if (!value) {
    return null
  }

  const normalized = value.toString().toLowerCase() as TierKey
  return TIER_KEYS.find((key) => key === normalized) ?? null
}

export function isValidTierKey(value?: string | null): value is TierKey {
  return resolveTierKey(value ?? null) !== null
}

export function tierKeyToNumber(key?: TierKey | null): number | null {
  if (!key) {
    return null
  }

  return TIER_META[key]?.order ?? null
}

export function tierToNumber(value?: string | number | null): number | null {
  if (typeof value === 'number') {
    return resolveTierKey(value) ? value : null
  }

  const key = resolveTierKey(value)
  return key ? TIER_META[key].order : null
}

export function formatTierLabel(value?: string | number | null, fallback = ''): string {
  const key = resolveTierKey(value)
  if (!key) {
    return fallback
  }

  return `${TIER_META[key].icon} ${TIER_META[key].label}`
}

export function formatTierShortLabel(value?: string | number | null, fallback = 'UNRANKED'): string {
  const key = resolveTierKey(value)
  if (!key) {
    return fallback
  }

  return TIER_META[key].shortLabel
}
