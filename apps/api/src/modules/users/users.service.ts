import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';
import { AuthSessionService } from '../auth/auth-session.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: AuthSessionService
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        location: true,
        countryCode: true,
        bio: true,
        subscriptionTier: true,
        isEmailVerified: true,
        is2faEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const avatarUrl =
      dto.avatarUrl === undefined
        ? undefined
        : dto.avatarUrl === null || dto.avatarUrl === ''
          ? null
          : dto.avatarUrl;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        location: true,
        bio: true,
        subscriptionTier: true,
        updatedAt: true,
      },
    });
  }

  async deleteMe(userId: string) {
    await this.sessions.revokeAllForUser(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true, purgeScheduled: true };
  }
}
