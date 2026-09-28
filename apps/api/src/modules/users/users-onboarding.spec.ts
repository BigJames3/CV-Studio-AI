import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UsersService } from './users.service';
import { OnboardingDto } from './dto/onboarding.dto';

describe('UsersService.updateOnboarding', () => {
  const userId = 'user-1';

  function createService(current: { onboardingCompletedAt: Date | null }) {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: userId, ...current }),
        update: jest.fn(async ({ data }) => ({ id: userId, ...data })),
      },
    };
    const service = new UsersService(prisma as never, {} as never, {} as never, {} as never);
    return { service, prisma };
  }

  it('saves the target role (trimmed) and level without completing', async () => {
    const { service, prisma } = createService({ onboardingCompletedAt: null });
    await service.updateOnboarding(userId, { targetRole: '  Comptable ', careerLevel: 'junior' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: { targetRole: 'Comptable', careerLevel: 'junior' },
      })
    );
  });

  it('sets the completion date once, and never moves it', async () => {
    const first = createService({ onboardingCompletedAt: null });
    await first.service.updateOnboarding(userId, { completed: true });
    expect(first.prisma.user.update.mock.calls[0][0].data.onboardingCompletedAt).toBeInstanceOf(
      Date
    );

    const again = createService({ onboardingCompletedAt: new Date('2026-09-01') });
    await again.service.updateOnboarding(userId, { completed: true });
    expect(again.prisma.user.update.mock.calls[0][0].data).not.toHaveProperty(
      'onboardingCompletedAt'
    );
  });

  it('clears the target role when an empty one is sent', async () => {
    const { service, prisma } = createService({ onboardingCompletedAt: null });
    await service.updateOnboarding(userId, { targetRole: '   ' });
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ targetRole: null });
  });
});

describe('OnboardingDto', () => {
  it('accepts the known career levels only', async () => {
    const ok = await validate(plainToInstance(OnboardingDto, { careerLevel: 'senior' }));
    const bad = await validate(plainToInstance(OnboardingDto, { careerLevel: 'ceo' }));
    expect(ok).toHaveLength(0);
    expect(bad[0]?.property).toBe('careerLevel');
  });

  it('caps the target role at 120 characters', async () => {
    const errors = await validate(plainToInstance(OnboardingDto, { targetRole: 'x'.repeat(121) }));
    expect(errors[0]?.property).toBe('targetRole');
  });
});
