import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/database/prisma.module';
import { LifecycleEmailsService } from '../src/modules/lifecycle-emails/lifecycle-emails.service';
import { signUnsubscribe } from '../src/modules/lifecycle-emails/unsubscribe-token';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-01T09:00:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

const STARTED_CV = { summary: { text: 'Comptable' }, experiences: [{ id: 'e1' }] };
const EMPTY_CV = { summary: { text: '' }, experiences: [] };

describe('Lifecycle e-mails (real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let service: LifecycleEmailsService;
  const mail = { send: jest.fn().mockResolvedValue(true) };
  const tag = `lc${Date.now()}`;
  const ids: Record<string, string> = {};

  async function user(
    name: string,
    data: {
      createdAt: Date;
      lastLoginAt?: Date | null;
      verified?: boolean;
      optOut?: boolean;
      cv?: object;
      ats?: boolean;
    }
  ) {
    const u = await prisma.user.create({
      data: {
        email: `${tag}.${name}@cvstudio.test`,
        firstName: name,
        lastName: 'Test',
        isEmailVerified: data.verified ?? true,
        lifecycleEmailsOptOut: data.optOut ?? false,
        createdAt: data.createdAt,
        lastLoginAt: data.lastLoginAt ?? null,
      },
    });
    if (data.cv) {
      const cv = await prisma.cv.create({
        data: { userId: u.id, title: 'CV', content: data.cv },
      });
      if (data.ats) {
        await prisma.atsReport.create({
          data: { cvId: cv.id, atsScore: 72, missingKeywords: [], recommendations: [] },
        });
      }
    }
    ids[name] = u.id;
    return u;
  }

  /** E-mails sent to this file's users (other suites leave users in the shared test DB). */
  const sentTo = () =>
    mail.send.mock.calls
      .map(([m]) => m)
      .filter((m) => (m.to as string).startsWith(`${tag}.`))
      .map((m) => ({
        name: (m.to as string).slice(tag.length + 1).split('@')[0],
        subject: m.subject as string,
        oneClick: (m.headers as Record<string, string> | undefined)?.['List-Unsubscribe'],
      }));

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY =
      process.env.ENCRYPTION_KEY ?? 'test-encryption-key-min-32-characters!!';
    app = await createTestApp({
      configure: (b) => b.overrideProvider(MailService).useValue(mail),
    });
    prisma = app.get(PrismaService);
    service = app.get(LifecycleEmailsService);

    await user('nocv', { createdAt: ago(2) }); // cv_unfinished (no CV)
    await user('emptycv', { createdAt: ago(2), cv: EMPTY_CV }); // cv_unfinished (started)
    await user('fresh', { createdAt: ago(0.5) }); // too early for anything
    await user('startedcv', { createdAt: ago(2), cv: STARTED_CV }); // nothing
    await user('noats', { createdAt: ago(5), cv: STARTED_CV }); // ats_tip
    await user('withats', { createdAt: ago(5), cv: STARTED_CV, ats: true }); // nothing
    await user('dormant', { createdAt: ago(60), lastLoginAt: ago(40), cv: STARTED_CV }); // reactivation
    await user('active', { createdAt: ago(60), lastLoginAt: ago(2), cv: STARTED_CV }); // nothing
    await user('unverified', { createdAt: ago(2), verified: false }); // nothing
    await user('optout', { createdAt: ago(2), optOut: true }); // nothing
    // Trial ending in 3 days, opted out of tips: the billing notice still goes.
    const trial = await user('trial', { createdAt: ago(11), optOut: true, cv: STARTED_CV });
    const pro = await prisma.plan.findUniqueOrThrow({ where: { name: 'Pro' } });
    await prisma.subscription.create({
      data: {
        userId: trial.id,
        planId: pro.id,
        status: 'trialing',
        currentPeriodStart: ago(11),
        currentPeriodEnd: new Date(NOW.getTime() + 3 * DAY),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: `${tag}.` } } });
    await app.close();
  });

  beforeEach(() => mail.send.mockClear());

  it('sends each person the one e-mail that fits, and nothing to the others', async () => {
    await service.runDaily(NOW);

    const sent = sentTo();
    expect(sent.map((s) => s.name).sort()).toEqual(
      ['dormant', 'emptycv', 'noats', 'nocv', 'trial'].sort()
    );
    const subject = (name: string) => sent.find((s) => s.name === name)?.subject;
    expect(subject('nocv')).toBe('Créez votre CV en 2 minutes');
    expect(subject('emptycv')).toContain('presque prêt');
    expect(subject('noats')).toContain('filtres des recruteurs');
    expect(subject('dormant')).toContain('vous attendent');
    expect(subject('trial')).toMatch(/^Votre essai Pro se termine le/);

    // One-click unsubscribe header on reminders, none on the billing notice.
    expect(sent.find((s) => s.name === 'nocv')?.oneClick).toMatch(
      /\/api\/v1\/emails\/unsubscribe\?u=.+&t=.+>$/
    );
    expect(sent.find((s) => s.name === 'trial')?.oneClick).toBeUndefined();
  });

  it('never sends the same e-mail twice, and spaces reminders by 3 days', async () => {
    await service.runDaily(NOW);
    expect(sentTo()).toHaveLength(0);

    // Two days later the windows have moved: 'fresh' (now 2.5 days old) gets the unfinished-CV
    // reminder and 'startedcv' (4 days) the ATS tip. 'emptycv' got an e-mail 2 days ago (gap)
    // and its CV is empty (no ATS tip); nobody gets a second copy of an e-mail.
    await service.runDaily(new Date(NOW.getTime() + 2 * DAY));
    expect(sentTo().map((s) => [s.name, s.subject])).toEqual(
      expect.arrayContaining([
        ['fresh', 'Créez votre CV en 2 minutes'],
        ['startedcv', 'Votre CV passe-t-il les filtres des recruteurs ?'],
      ])
    );
    expect(sentTo()).toHaveLength(2);
  });

  it('forgets an e-mail SMTP refused, so a later run retries it', async () => {
    await user('smtpfail', { createdAt: ago(2) });
    mail.send.mockImplementation(async (m: { to: string }) => !m.to.includes('.smtpfail@'));
    await service.runDaily(NOW);
    expect(await prisma.lifecycleEmail.count({ where: { userId: ids.smtpfail } })).toBe(0);

    mail.send.mockResolvedValue(true);
    await service.runDaily(NOW);
    expect(sentTo().filter((s) => s.name === 'smtpfail')).toHaveLength(2);
    expect(await prisma.lifecycleEmail.count({ where: { userId: ids.smtpfail } })).toBe(1);
  });

  it('unsubscribes with a valid signed link only', async () => {
    const id = ids.startedcv;
    await request(app.getHttpServer())
      .post(`/api/v1/emails/unsubscribe?u=${id}&t=forged`)
      .expect(400);

    // RFC 8058 one-click: form body, credentials in the query.
    await request(app.getHttpServer())
      .post(`/api/v1/emails/unsubscribe?u=${id}&t=${signUnsubscribe(id)}`)
      .type('form')
      .send('List-Unsubscribe=One-Click')
      .expect(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).lifecycleEmailsOptOut).toBe(
      true
    );

    // The /desinscription page: JSON body.
    const other = ids.active;
    await request(app.getHttpServer())
      .post('/api/v1/emails/unsubscribe')
      .send({ u: other, t: signUnsubscribe(other) })
      .expect(200);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: other } })).lifecycleEmailsOptOut
    ).toBe(true);
  });
});
