export const VALORANT_MAP_POOL = [
  'Ascent',
  'Breeze',
  'Fracture',
  'Haven',
  'Lotus',
  'Pearl',
  'Split',
  'Abyss',
  'Bind',
  'Corrode',
  'Icebox',
  'Sunset',
] as const

export type ValorantMap = (typeof VALORANT_MAP_POOL)[number]

export const getRandomValorantMap = (): ValorantMap => {
  return VALORANT_MAP_POOL[Math.floor(Math.random() * VALORANT_MAP_POOL.length)]
}
