import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type TeamRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from '../subscriptions/entitlements.service';
import { lockUserScope, USER_LOCK_TX_OPTIONS } from '../../common/utils/user-lock';
import type { AssignableTeamRole } from './dto/team.dto';

/** Seats per team, owner included. */
export const TEAM_MEMBER_LIMIT = 10;

export type CvAccess = 'owner' | 'editor' | 'viewer';

const MANAGER_ROLES: TeamRole[] = ['owner', 'admin'];
const EDITOR_ROLES: TeamRole[] = ['owner', 'admin', 'editor'];

const MEMBER_SELECT = {
  id: true,
  userId: true,
  role: true,
  createdAt: true,
  user: { select: { email: true, firstName: true, lastName: true } },
} as const;

function notFound(): NotFoundException {
  // Same answer for "no such team" and "not a member", so team ids cannot be probed.
  return new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team not found' });
}

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService
  ) {}

  async listMine(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        team: {
          select: { id: true, name: true, createdAt: true, _count: { select: { members: true } } },
        },
      },
    });
    return Promise.all(
      memberships.map(async ({ role, team }) => ({
        id: team.id,
        name: team.name,
        createdAt: team.createdAt,
        memberCount: team._count.members,
        myRole: role,
        active: await this.isActive(team.id),
      }))
    );
  }

  async create(userId: string, name: string) {
    await this.entitlements.assertCan(userId, 'team:manage', 'Teams require a Business plan');
    return this.prisma.$transaction(async (tx) => {
      await lockUserScope(tx, userId, 'team:create');
      const owned = await tx.teamMember.findFirst({ where: { userId, role: 'owner' } });
      if (owned) {
        throw new ConflictException({
          code: 'TEAM_ALREADY_OWNED',
          message: 'You already own a team',
        });
      }
      const team = await tx.team.create({ data: { name } });
      await tx.teamMember.create({ data: { teamId: team.id, userId, role: 'owner' } });
      return { id: team.id, name: team.name, createdAt: team.createdAt, myRole: 'owner' as const };
    }, USER_LOCK_TX_OPTIONS);
  }

  async get(userId: string, teamId: string) {
    const me = await this.membership(teamId, userId);
    if (!me) throw notFound();
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        members: { select: MEMBER_SELECT, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!team) throw notFound();
    return {
      ...team,
      myRole: me.role,
      memberLimit: TEAM_MEMBER_LIMIT,
      active: await this.isActive(teamId),
    };
  }

  async addMember(userId: string, teamId: string, email: string, role: AssignableTeamRole) {
    const me = await this.requireManager(teamId, userId);
    this.assertCanGrant(me.role, role);
    await this.assertActive(teamId);

    const invitee = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    if (!invitee) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'No CV Studio account uses this email. Ask them to sign up first.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Serialise seat counting per team so parallel invites cannot overshoot the limit.
      await lockUserScope(tx, teamId, 'team:seats');
      const seats = await tx.teamMember.count({ where: { teamId } });
      if (seats >= TEAM_MEMBER_LIMIT) {
        throw new ForbiddenException({
          code: 'TEAM_MEMBER_LIMIT',
          message: `A team has at most ${TEAM_MEMBER_LIMIT} members`,
        });
      }
      try {
        return await tx.teamMember.create({
          data: { teamId, userId: invitee.id, role },
          select: MEMBER_SELECT,
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictException({
            code: 'ALREADY_MEMBER',
            message: 'This user is already in the team',
          });
        }
        throw err;
      }
    }, USER_LOCK_TX_OPTIONS);
  }

  async updateMember(userId: string, teamId: string, memberId: string, role: AssignableTeamRole) {
    const me = await this.requireManager(teamId, userId);
    const target = await this.member(teamId, memberId);
    if (target.role === 'owner') {
      throw new ForbiddenException({
        code: 'TEAM_OWNER_LOCKED',
        message: 'The owner role is fixed',
      });
    }
    this.assertCanGrant(me.role, role);
    this.assertCanGrant(me.role, target.role as AssignableTeamRole);
    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
      select: MEMBER_SELECT,
    });
  }

  /** Managers remove members; anyone but the owner can leave. Their CVs leave the team too. */
  async removeMember(userId: string, teamId: string, memberId: string) {
    const me = await this.membership(teamId, userId);
    if (!me) throw notFound();
    const target = await this.member(teamId, memberId);
    if (target.role === 'owner') {
      throw new ForbiddenException({
        code: 'TEAM_OWNER_LOCKED',
        message: 'The owner cannot leave; delete the team instead',
      });
    }
    if (target.userId !== userId) {
      if (!MANAGER_ROLES.includes(me.role)) throw this.managerRequired();
      this.assertCanGrant(me.role, target.role as AssignableTeamRole);
    }
    await this.prisma.$transaction([
      this.prisma.cv.updateMany({
        where: { teamId, userId: target.userId },
        data: { teamId: null },
      }),
      this.prisma.teamMember.delete({ where: { id: memberId } }),
    ]);
    return { removed: true };
  }

  /** Deleting a team unshares its CVs (FK `ON DELETE SET NULL`); no CV is deleted. */
  async remove(userId: string, teamId: string) {
    const me = await this.membership(teamId, userId);
    if (!me) throw notFound();
    if (me.role !== 'owner') {
      throw new ForbiddenException({
        code: 'TEAM_OWNER_REQUIRED',
        message: 'Only the owner can delete the team',
      });
    }
    await this.prisma.team.delete({ where: { id: teamId } });
    return { deleted: true };
  }

  /**
   * What `userId` may do with a CV: its owner, or a member of the team it is shared with
   * while that team is active (its owner still has Business). `null` means no access.
   */
  async cvAccess(userId: string, cv: { userId: string; teamId: string | null }) {
    if (cv.userId === userId) return 'owner' as CvAccess;
    if (!cv.teamId) return null;
    const me = await this.membership(cv.teamId, userId);
    if (!me || !(await this.isActive(cv.teamId))) return null;
    return (EDITOR_ROLES.includes(me.role) ? 'editor' : 'viewer') as CvAccess;
  }

  /** Owner-side check before sharing a CV: the owner must be able to edit in an active team. */
  async assertCanShareInto(userId: string, teamId: string) {
    const me = await this.membership(teamId, userId);
    if (!me) throw notFound();
    if (!EDITOR_ROLES.includes(me.role)) {
      throw new ForbiddenException({
        code: 'TEAM_EDITOR_REQUIRED',
        message: 'Viewers cannot share CVs with the team',
      });
    }
    await this.assertActive(teamId);
  }

  /** Teams whose shared CVs `userId` can currently see, with the role they hold there. */
  async activeMemberships(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true, role: true, team: { select: { name: true } } },
    });
    const active = await Promise.all(memberships.map((m) => this.isActive(m.teamId)));
    return memberships
      .filter((_, i) => active[i])
      .map((m) => ({
        teamId: m.teamId,
        teamName: m.team.name,
        access: (EDITOR_ROLES.includes(m.role) ? 'editor' : 'viewer') as CvAccess,
      }));
  }

  private async isActive(teamId: string): Promise<boolean> {
    const owner = await this.prisma.teamMember.findFirst({
      where: { teamId, role: 'owner' },
      select: { userId: true },
    });
    return owner ? this.entitlements.can(owner.userId, 'team:manage') : false;
  }

  private async assertActive(teamId: string) {
    if (!(await this.isActive(teamId))) {
      throw new ForbiddenException({
        code: 'TEAM_INACTIVE',
        message: "The team owner's Business plan is no longer active",
        statusCode: 402,
      });
    }
  }

  private membership(teamId: string, userId: string) {
    return this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { id: true, role: true },
    });
  }

  private async member(teamId: string, memberId: string) {
    const target = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
      select: { id: true, userId: true, role: true },
    });
    if (!target) {
      throw new NotFoundException({ code: 'MEMBER_NOT_FOUND', message: 'Member not found' });
    }
    return target;
  }

  private async requireManager(teamId: string, userId: string) {
    const me = await this.membership(teamId, userId);
    if (!me) throw notFound();
    if (!MANAGER_ROLES.includes(me.role)) throw this.managerRequired();
    return me;
  }

  /** Admins manage editors and viewers; only the owner grants, changes or removes admins. */
  private assertCanGrant(myRole: TeamRole, role: AssignableTeamRole) {
    if (role === 'admin' && myRole !== 'owner') {
      throw new ForbiddenException({
        code: 'TEAM_OWNER_REQUIRED',
        message: 'Only the owner manages admins',
      });
    }
  }

  private managerRequired() {
    return new ForbiddenException({
      code: 'TEAM_MANAGER_REQUIRED',
      message: 'Only the owner or an admin can manage members',
    });
  }
}
