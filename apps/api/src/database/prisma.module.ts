import { Global, Injectable, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Per-process connection cap when DATABASE_URL does not set one (sized for a 1-CPU pod). */
export const DEFAULT_DATABASE_POOL_SIZE = 5;

/**
 * Prisma sizes its pool from the host's physical CPUs (2 × CPUs + 1), not the pod's CPU limit, so
 * every API replica on a large node opens ~10-20 connections. With the HPA at 20 replicas that can
 * exceed PostgreSQL's max_connections. Cap the pool unless the URL already sets connection_limit
 * (e.g. behind PgBouncer); DATABASE_POOL_SIZE overrides the default.
 */
export function withPoolLimit(
  url: string | undefined,
  poolSize = process.env.DATABASE_POOL_SIZE
): string | undefined {
  if (!url) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.searchParams.has('connection_limit')) return url;
  const size = Number.parseInt(poolSize ?? '', 10);
  parsed.searchParams.set(
    'connection_limit',
    String(Number.isInteger(size) && size > 0 ? size : DEFAULT_DATABASE_POOL_SIZE)
  );
  return parsed.toString();
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = withPoolLimit(process.env.DATABASE_URL);
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
