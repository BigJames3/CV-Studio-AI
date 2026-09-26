import type { Prisma } from '@prisma/client';

/** Interactive transactions that take a user lock wait at most this long for it. */
export const USER_LOCK_TX_OPTIONS = { maxWait: 5_000, timeout: 10_000 } as const;

/**
 * Serialize "check quota, then write" for one user and scope across every API instance.
 * Postgres transaction-level advisory lock: released automatically on commit or rollback.
 * Other users (and other scopes) are not blocked.
 */
export async function lockUserScope(
  tx: Prisma.TransactionClient,
  userId: string,
  scope: string
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${scope}:${userId}`}, 0))`;
}
