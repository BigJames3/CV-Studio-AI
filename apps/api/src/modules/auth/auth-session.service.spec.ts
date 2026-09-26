import { AuthSessionService, REFRESH_REUSE_GRACE_SECONDS } from './auth-session.service';

/** Minimal in-memory Redis: TTLs are recorded, expiry is simulated by deleting keys. */
function fakeRedis() {
  const store = new Map<string, string>();
  const ttls = new Map<string, number | undefined>();
  return {
    store,
    ttls,
    connect: jest.fn(async () => undefined),
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: string, ttl?: number) => {
      store.set(k, v);
      ttls.set(k, ttl);
    }),
    del: jest.fn(async (...keys: string[]) => {
      keys.forEach((k) => store.delete(k));
    }),
    client: { sadd: jest.fn(async () => 1), srem: jest.fn(async () => 1) },
  };
}

function fakePrisma() {
  return {
    authSession: {
      updateMany: jest.fn(async (_args: { data?: { revokedAt?: unknown } }) => ({ count: 1 })),
      findFirst: jest.fn(async () => null),
    },
  };
}

describe('AuthSessionService.rotate', () => {
  const userId = 'user-1';
  const familyId = 'fam-1';
  let redis: ReturnType<typeof fakeRedis>;
  let prisma: ReturnType<typeof fakePrisma>;
  let service: AuthSessionService;

  beforeEach(() => {
    redis = fakeRedis();
    prisma = fakePrisma();
    service = new AuthSessionService(redis as never, prisma as never);
    redis.store.set(`refresh:family:${familyId}`, 'jti-A');
    redis.store.set(`refresh:jti:jti-A`, JSON.stringify({ userId, familyId, sessionId: 's1' }));
  });

  const revoked = () =>
    prisma.authSession.updateMany.mock.calls.some(([arg]) => arg.data?.revokedAt !== undefined);

  it('rotates the current token and opens a grace window for it', async () => {
    await expect(service.rotate(userId, familyId, 'jti-A', 'jti-B')).resolves.toBe('ok');

    expect(redis.store.get(`refresh:family:${familyId}`)).toBe('jti-B');
    expect(redis.store.has('refresh:jti:jti-A')).toBe(false);
    expect(redis.store.get(`refresh:grace:${familyId}`)).toBe('jti-A:jti-B');
    expect(redis.ttls.get(`refresh:grace:${familyId}`)).toBe(REFRESH_REUSE_GRACE_SECONDS);
    expect(REFRESH_REUSE_GRACE_SECONDS).toBe(10);
  });

  it('accepts the previous token within the grace window (aborted response race)', async () => {
    await service.rotate(userId, familyId, 'jti-A', 'jti-B');

    await expect(service.rotate(userId, familyId, 'jti-A', 'jti-C')).resolves.toBe('ok');

    expect(redis.store.get(`refresh:family:${familyId}`)).toBe('jti-C');
    expect(redis.store.has('refresh:jti:jti-B')).toBe(false);
    expect(JSON.parse(redis.store.get('refresh:jti:jti-C') as string).sessionId).toBe('s1');
    expect(revoked()).toBe(false);
  });

  it('treats the previous token as reuse once the grace window expired', async () => {
    await service.rotate(userId, familyId, 'jti-A', 'jti-B');
    redis.store.delete(`refresh:grace:${familyId}`); // TTL elapsed

    await expect(service.rotate(userId, familyId, 'jti-A', 'jti-C')).resolves.toBe('reuse');
    expect(redis.store.has(`refresh:family:${familyId}`)).toBe(false);
    expect(revoked()).toBe(true);
  });

  it('treats an older token (two rotations back) as reuse', async () => {
    await service.rotate(userId, familyId, 'jti-A', 'jti-B');
    await service.rotate(userId, familyId, 'jti-B', 'jti-C');

    await expect(service.rotate(userId, familyId, 'jti-A', 'jti-D')).resolves.toBe('reuse');
    expect(revoked()).toBe(true);
  });

  it('does not accept the same previous token twice', async () => {
    await service.rotate(userId, familyId, 'jti-A', 'jti-B');
    await expect(service.rotate(userId, familyId, 'jti-A', 'jti-C')).resolves.toBe('ok');

    await expect(service.rotate(userId, familyId, 'jti-A', 'jti-D')).resolves.toBe('reuse');
    expect(revoked()).toBe(true);
  });

  it('returns invalid for an unknown family', async () => {
    await expect(service.rotate(userId, 'unknown', 'jti-A', 'jti-B')).resolves.toBe('invalid');
  });

  it('clears the grace window when the family is revoked', async () => {
    await service.rotate(userId, familyId, 'jti-A', 'jti-B');

    await service.revokeFamily(userId, familyId);

    expect(redis.store.has(`refresh:grace:${familyId}`)).toBe(false);
  });
});
