import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TEAM_MEMBER_LIMIT, TeamsService } from './teams.service';

type Role = 'owner' | 'admin' | 'editor' | 'viewer';
type Member = { id: string; teamId: string; userId: string; role: Role };

/** Small in-memory Prisma double covering what TeamsService touches. */
function makeDb(members: Member[], business = new Set(['alice'])) {
  const rows = members.map((m) => ({ ...m }));
  let nextId = 0;
  const pick = (m: Member) => ({ ...m, user: { email: `${m.userId}@x.io` } });

  const teamMember = {
    findUnique: jest.fn(
      async ({ where }: { where: { teamId_userId: { teamId: string; userId: string } } }) =>
        rows.find(
          (m) => m.teamId === where.teamId_userId.teamId && m.userId === where.teamId_userId.userId
        ) ?? null
    ),
    findFirst: jest.fn(async ({ where }: { where: Partial<Member> }) => {
      const found = rows.find((m) =>
        Object.entries(where).every(([k, v]) => m[k as keyof Member] === v)
      );
      return found ? pick(found) : null;
    }),
    findMany: jest.fn(async () => []),
    count: jest.fn(
      async ({ where }: { where: { teamId: string } }) =>
        rows.filter((m) => m.teamId === where.teamId).length
    ),
    create: jest.fn(async ({ data }: { data: Omit<Member, 'id'> }) => {
      if (rows.some((m) => m.teamId === data.teamId && m.userId === data.userId)) {
        throw new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        });
      }
      const row = { id: `m-new-${nextId++}`, ...data };
      rows.push(row);
      return pick(row);
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: { role: Role } }) => {
      const row = rows.find((m) => m.id === where.id)!;
      row.role = data.role;
      return pick(row);
    }),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      rows.splice(
        rows.findIndex((m) => m.id === where.id),
        1
      );
      return {};
    }),
  };
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    teamMember,
    team: {
      create: jest.fn(async ({ data }) => ({ id: 'team-new', createdAt: new Date(), ...data })),
    },
  };
  const prisma = {
    teamMember,
    team: { findUnique: jest.fn(), delete: jest.fn().mockResolvedValue({}) },
    user: { findFirst: jest.fn() },
    cv: { updateMany: jest.fn((args) => ({ op: 'unshare', args })) },
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : Promise.all(arg as [])
    ),
  };
  const entitlements = {
    assertCan: jest.fn(async (userId: string) => {
      if (!business.has(userId)) throw new ForbiddenException('Business required');
    }),
    can: jest.fn(async (userId: string) => business.has(userId)),
  };
  return {
    rows,
    prisma,
    entitlements,
    service: new TeamsService(prisma as never, entitlements as never),
  };
}

const TEAM: Member[] = [
  { id: 'm-owner', teamId: 't1', userId: 'alice', role: 'owner' },
  { id: 'm-admin', teamId: 't1', userId: 'bob', role: 'admin' },
  { id: 'm-editor', teamId: 't1', userId: 'carol', role: 'editor' },
  { id: 'm-viewer', teamId: 't1', userId: 'dan', role: 'viewer' },
];

describe('TeamsService', () => {
  describe('create', () => {
    it('requires a Business plan', async () => {
      const { service } = makeDb([]);
      await expect(service.create('zoe', 'Team')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates the team with the caller as owner', async () => {
      const { service, rows } = makeDb([]);
      await expect(service.create('alice', 'Recrutement')).resolves.toMatchObject({
        name: 'Recrutement',
        myRole: 'owner',
      });
      expect(rows).toEqual([expect.objectContaining({ userId: 'alice', role: 'owner' })]);
    });

    it('allows only one owned team per user', async () => {
      const { service } = makeDb(TEAM);
      await expect(service.create('alice', 'Second')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('addMember', () => {
    it('adds an existing account with the requested role', async () => {
      const { service, prisma } = makeDb(TEAM);
      prisma.user.findFirst.mockResolvedValue({ id: 'erin' });
      await expect(service.addMember('bob', 't1', 'erin@x.io', 'viewer')).resolves.toMatchObject({
        userId: 'erin',
        role: 'viewer',
      });
    });

    it('hides the team from non-members and refuses editors and viewers', async () => {
      const { service, prisma } = makeDb(TEAM);
      prisma.user.findFirst.mockResolvedValue({ id: 'erin' });
      await expect(service.addMember('zoe', 't1', 'e@x.io', 'editor')).rejects.toBeInstanceOf(
        NotFoundException
      );
      for (const user of ['carol', 'dan']) {
        await expect(service.addMember(user, 't1', 'e@x.io', 'editor')).rejects.toMatchObject({
          response: expect.objectContaining({ code: 'TEAM_MANAGER_REQUIRED' }),
        });
      }
    });

    it('lets only the owner grant admin', async () => {
      const { service, prisma } = makeDb(TEAM);
      prisma.user.findFirst.mockResolvedValue({ id: 'erin' });
      await expect(service.addMember('bob', 't1', 'e@x.io', 'admin')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TEAM_OWNER_REQUIRED' }),
      });
      await expect(service.addMember('alice', 't1', 'e@x.io', 'admin')).resolves.toMatchObject({
        role: 'admin',
      });
    });

    it('stops invites once the owner lost Business', async () => {
      const { service, prisma } = makeDb(TEAM, new Set());
      prisma.user.findFirst.mockResolvedValue({ id: 'erin' });
      await expect(service.addMember('alice', 't1', 'e@x.io', 'editor')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TEAM_INACTIVE' }),
      });
    });

    it('explains when the email has no account', async () => {
      const { service, prisma } = makeDb(TEAM);
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.addMember('alice', 't1', 'nobody@x.io', 'editor')).rejects.toMatchObject(
        { response: expect.objectContaining({ code: 'USER_NOT_FOUND' }) }
      );
    });

    it('rejects duplicates and enforces the seat limit', async () => {
      const { service, prisma } = makeDb(TEAM);
      prisma.user.findFirst.mockResolvedValue({ id: 'carol' });
      await expect(service.addMember('alice', 't1', 'c@x.io', 'editor')).rejects.toBeInstanceOf(
        ConflictException
      );

      const full = Array.from({ length: TEAM_MEMBER_LIMIT }, (_, i) => ({
        id: `m${i}`,
        teamId: 't1',
        userId: i === 0 ? 'alice' : `u${i}`,
        role: (i === 0 ? 'owner' : 'editor') as Role,
      }));
      const { service: fullService, prisma: fullPrisma } = makeDb(full);
      fullPrisma.user.findFirst.mockResolvedValue({ id: 'erin' });
      await expect(fullService.addMember('alice', 't1', 'e@x.io', 'editor')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TEAM_MEMBER_LIMIT' }),
      });
    });
  });

  describe('updateMember', () => {
    it('never changes the owner, and admins cannot touch admins', async () => {
      const { service } = makeDb([
        ...TEAM,
        { id: 'm-admin2', teamId: 't1', userId: 'eve', role: 'admin' },
      ]);
      await expect(service.updateMember('alice', 't1', 'm-owner', 'editor')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TEAM_OWNER_LOCKED' }),
      });
      await expect(service.updateMember('bob', 't1', 'm-admin2', 'viewer')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TEAM_OWNER_REQUIRED' }),
      });
      await expect(service.updateMember('bob', 't1', 'm-editor', 'viewer')).resolves.toMatchObject({
        role: 'viewer',
      });
    });
  });

  describe('removeMember', () => {
    it('lets members leave and unshares their CVs from the team', async () => {
      const { service, prisma, rows } = makeDb(TEAM);
      await expect(service.removeMember('dan', 't1', 'm-viewer')).resolves.toEqual({
        removed: true,
      });
      expect(prisma.cv.updateMany).toHaveBeenCalledWith({
        where: { teamId: 't1', userId: 'dan' },
        data: { teamId: null },
      });
      expect(rows.map((m) => m.userId)).not.toContain('dan');
    });

    it('keeps the owner and stops editors removing others', async () => {
      const { service } = makeDb(TEAM);
      await expect(service.removeMember('alice', 't1', 'm-owner')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TEAM_OWNER_LOCKED' }),
      });
      await expect(service.removeMember('carol', 't1', 'm-viewer')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TEAM_MANAGER_REQUIRED' }),
      });
    });
  });

  it('only the owner deletes the team', async () => {
    const { service, prisma } = makeDb(TEAM);
    await expect(service.remove('bob', 't1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('alice', 't1')).resolves.toEqual({ deleted: true });
    expect(prisma.team.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  describe('cvAccess', () => {
    const cv = { userId: 'zoe', teamId: 't1' };

    it('maps team roles to editor or viewer access', async () => {
      const { service } = makeDb(TEAM);
      await expect(service.cvAccess('zoe', cv)).resolves.toBe('owner');
      await expect(service.cvAccess('bob', cv)).resolves.toBe('editor');
      await expect(service.cvAccess('carol', cv)).resolves.toBe('editor');
      await expect(service.cvAccess('dan', cv)).resolves.toBe('viewer');
      await expect(service.cvAccess('stranger', cv)).resolves.toBeNull();
      await expect(service.cvAccess('bob', { userId: 'zoe', teamId: null })).resolves.toBeNull();
    });

    it('closes shared CVs when the team owner is no longer Business', async () => {
      const { service } = makeDb(TEAM, new Set());
      await expect(service.cvAccess('carol', cv)).resolves.toBeNull();
      await expect(service.cvAccess('zoe', cv)).resolves.toBe('owner');
    });
  });

  it('lets only editors of an active team share into it', async () => {
    const { service } = makeDb(TEAM);
    await expect(service.assertCanShareInto('dan', 't1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'TEAM_EDITOR_REQUIRED' }),
    });
    await expect(service.assertCanShareInto('carol', 't1')).resolves.toBeUndefined();
    await expect(service.assertCanShareInto('zoe', 't1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
