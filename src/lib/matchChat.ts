import { prisma } from '@/lib/prisma'

let schemaReady = false
let ensureSchemaPromise: Promise<void> | null = null

export const ensureMatchChatSchema = async () => {
  if (schemaReady) {
    return
  }

  if (ensureSchemaPromise) {
    return ensureSchemaPromise
  }

  ensureSchemaPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MatchChatMessage" (
        "id" TEXT NOT NULL,
        "matchId" TEXT NOT NULL,
        "senderUserId" TEXT NOT NULL,
        "senderTeamId" TEXT NOT NULL,
        "senderName" TEXT NOT NULL,
        "senderTeamName" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MatchChatMessage_pkey" PRIMARY KEY ("id")
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MatchChatMessage_matchId_createdAt_idx"
      ON "MatchChatMessage"("matchId", "createdAt");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MatchChatMessage_senderUserId_createdAt_idx"
      ON "MatchChatMessage"("senderUserId", "createdAt");
    `)
    schemaReady = true
  })()

  try {
    await ensureSchemaPromise
  } catch (error) {
    schemaReady = false
    throw error
  } finally {
    ensureSchemaPromise = null
  }
}
