import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/database/prisma.module';

describe('P0: X-Forwarded-For Spoofing Prevention', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not treat a client-supplied X-Forwarded-For as the client IP', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '1.2.3.4, 5.6.7.8')
      .send({ email: 'spoof@example.com', password: 'wrong-password' })
      .expect(401);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'auth.login.fail' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
    expect(audit?.ipAddress).not.toBe('1.2.3.4');
    expect(audit?.ipAddress).not.toBe('5.6.7.8');
  });
});
