import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  return new PrismaClient({
    // Query logging echoes bound parameters, which for this schema includes
    // customer email and phone — kept out of production entirely.
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error']
  })
}

// ts-node-dev re-executes this module on every reload; without the global the
// old clients keep their pools open and Postgres runs out of connections.
export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

let disconnecting: Promise<void> | undefined

/** Idempotent — several signals can race to shut the process down. */
export async function disconnectPrisma(): Promise<void> {
  disconnecting ??= prisma.$disconnect()
  await disconnecting
}

process.on('beforeExit', () => {
  void disconnectPrisma()
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void disconnectPrisma().finally(() => process.exit(0))
  })
}
