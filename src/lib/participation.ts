import { prisma } from '@/lib/prisma'

let ensureParticipationPromise: Promise<void> | null = null
let participationSchemaReady = false

export const ensureParticipationSchema = async () => {
  if (participationSchemaReady) {
    return
  }

  if (ensureParticipationPromise) {
    return ensureParticipationPromise
  }

  ensureParticipationPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "isParticipating" BOOLEAN NOT NULL DEFAULT FALSE;
    `)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "isSubstitute" BOOLEAN NOT NULL DEFAULT FALSE;
    `)
    participationSchemaReady = true
  })()

  try {
    await ensureParticipationPromise
  } catch (error) {
    participationSchemaReady = false
    throw error
  } finally {
    ensureParticipationPromise = null
  }
}
