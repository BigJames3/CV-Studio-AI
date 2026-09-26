import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as aiServicePkg from '@cvstudio/ai-service';
import { AiService } from './ai.service';

jest.mock('@cvstudio/ai-service', () => {
  const actual = jest.requireActual('@cvstudio/ai-service');
  return {
    ...actual,
    runAiFeature: jest.fn((...args: unknown[]) => actual.runAiFeature(...args)),
  };
});

type MockCv = {
  id: string;
  userId: string;
  deletedAt: Date | null;
  content: Record<string, unknown>;
};

describe('AiService', () => {
  const cvId = '11111111-1111-1111-1111-111111111111';
  const userId = 'user-123';
  const runAiFeatureMock = aiServicePkg.runAiFeature as jest.MockedFunction<
    typeof aiServicePkg.runAiFeature
  >;

  function createService(cv: MockCv | null = defaultCv(), quotaUsed = 0) {
    const prisma = {
      cv: {
        findFirst: jest.fn().mockResolvedValue(cv),
      },
      atsReport: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'ats-1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          ...data,
        })),
      },
      aiHistory: {
        create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
        count: jest.fn().mockResolvedValue(quotaUsed),
      },
    };

    const quotas = {
      reserveOptimizeQuota: jest
        .fn()
        .mockResolvedValue({ id: 'res-1', used: quotaUsed, limit: 50 }),
      reserveCoverLetterQuota: jest
        .fn()
        .mockResolvedValue({ id: 'res-1', used: quotaUsed, limit: 20 }),
      reserveAtsExplainQuota: jest
        .fn()
        .mockResolvedValue({ id: 'res-1', used: quotaUsed, limit: 20 }),
      commit: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };

    return {
      service: new AiService(prisma as never, quotas as never),
      prisma,
      quotas,
    };
  }

  function defaultCv(): MockCv {
    return {
      id: cvId,
      userId,
      deletedAt: null,
      content: {
        summary: {
          text: 'Senior TypeScript engineer with strong React and Node.js experience.',
        },
        skills: [{ name: 'TypeScript' }, { name: 'React' }, { name: 'Node.js' }],
      },
    };
  }

  beforeEach(() => {
    process.env.AI_PROVIDER = 'heuristic';
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_API_KEY;
    runAiFeatureMock.mockImplementation((req) =>
      jest.requireActual('@cvstudio/ai-service').runAiFeature(req)
    );
  });

  it('returns queued metadata with shared model routing for CV generation', async () => {
    const { service } = createService();

    const result = await service.generateCv(userId, {
      linkedInUrl: 'https://linkedin.com/in/test',
    });

    expect(result).toMatchObject({
      status: 'queued',
      feature: 'generate-cv',
      model: 'gpt-4o-mini',
      input: {
        linkedInUrl: 'https://linkedin.com/in/test',
      },
    });
    expect(result.jobId).toMatch(/^ai_generate-cv_user-123_/);
  });

  it('optimizes resume via gateway heuristic and persists AiHistory', async () => {
    const { service, quotas } = createService();

    const result = await service.optimizeResume(userId, {
      cvId,
      bulletText: 'Helped build an internal design system',
      tone: 'factual',
    });

    expect(quotas.reserveOptimizeQuota).toHaveBeenCalledWith(userId, cvId);
    expect(quotas.commit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'res-1' }),
      expect.objectContaining({ tokensUsed: 0 })
    );
    expect(quotas.release).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'completed',
      feature: 'optimize-resume',
      promptId: 'optimize_resume',
      promptVersion: 'v3',
      provider: 'heuristic',
      model: 'heuristic-v1',
      quota: { used: 1, limit: 50 },
    });
    expect(result.variants).toHaveLength(3);
    expect(result.variants[0]?.text.toLowerCase()).toContain('design system');
    expect(result.variants[0]?.text).not.toContain('(scaffold)');
  });

  it('maps provider failure to ServiceUnavailableException', async () => {
    const { service } = createService();
    runAiFeatureMock.mockResolvedValueOnce({
      ok: false,
      error: 'provider down',
    });

    await expect(
      service.optimizeResume(userId, {
        cvId,
        bulletText: 'Built APIs',
      })
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('gives the reserved quota slot back when the AI call fails', async () => {
    const { service, quotas } = createService();
    runAiFeatureMock.mockResolvedValueOnce({ ok: false, error: 'provider down' });

    await expect(
      service.optimizeResume(userId, { cvId, bulletText: 'Built APIs' })
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(quotas.release).toHaveBeenCalledWith(expect.objectContaining({ id: 'res-1' }));
    expect(quotas.commit).not.toHaveBeenCalled();
  });

  it('gives the slot back when the cover letter is refused', async () => {
    const { service, quotas } = createService();
    runAiFeatureMock.mockResolvedValueOnce({
      ok: true,
      data: { ok: false, refusals: ['no facts'], warnings: [] },
    });

    await expect(
      service.generateCoverLetter(userId, { cvId, jobDescription: 'Senior engineer' })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(quotas.release).toHaveBeenCalledTimes(1);
  });

  it('does not reserve quota when the CV is not owned by the caller', async () => {
    const { service, quotas, prisma } = createService();
    prisma.cv.findFirst.mockResolvedValueOnce({ ...defaultCv(), userId: 'someone-else' });

    await expect(service.checkAts(userId, { cvId, jobDescription: 'x' })).rejects.toBeDefined();
    expect(quotas.reserveAtsExplainQuota).not.toHaveBeenCalled();
  });

  it('uses default provider error message when gateway error is empty', async () => {
    const { service } = createService();
    runAiFeatureMock.mockResolvedValueOnce({
      ok: false,
    });

    await expect(
      service.optimizeResume(userId, {
        cvId,
        bulletText: 'Built APIs',
      })
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('maps refused optimization to BadRequestException', async () => {
    const { service } = createService();
    runAiFeatureMock.mockResolvedValueOnce({
      ok: true,
      provider: 'heuristic',
      model: 'heuristic-v1',
      data: {
        ok: false,
        variants: [],
        warnings: [],
        refusals: ['cannot invent metrics'],
        promptId: 'optimize_resume',
        promptVersion: 'v3',
      },
    });

    await expect(
      service.optimizeResume(userId, {
        cvId,
        bulletText: 'Built APIs',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses default refusal message when refusals are empty', async () => {
    const { service } = createService();
    runAiFeatureMock.mockResolvedValueOnce({
      ok: true,
      data: {
        ok: false,
        variants: [],
        warnings: [],
        refusals: [],
        promptId: 'optimize_resume',
        promptVersion: 'v3',
      },
    });

    await expect(
      service.optimizeResume(userId, {
        cvId,
        bulletText: 'Built APIs',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists optimize history with default tone when omitted', async () => {
    const { service, quotas } = createService();
    runAiFeatureMock.mockResolvedValueOnce({
      ok: true,
      tokensUsed: 12,
      data: {
        ok: true,
        variants: [{ text: 'Delivered payment webhooks.', rationale: 'clarity' }],
        warnings: [],
        refusals: [],
        promptId: 'optimize_resume',
        promptVersion: 'v3',
      },
    });

    const result = await service.optimizeResume(userId, {
      cvId,
      bulletText: 'Worked on payment webhooks',
    });

    expect(quotas.commit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'res-1' }),
      expect.objectContaining({
        prompt: expect.stringContaining('tone=factual'),
        tokensUsed: 12,
      })
    );
    expect(result.provider).toBe('heuristic');
    expect(result.model).toBe('gpt-4o');
  });

  it('rejects optimize when bulletText is missing', async () => {
    const { service } = createService();

    await expect(service.optimizeResume(userId, { cvId })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('computes ATS score, missing keywords, explain layer, and persists the report', async () => {
    const { service, prisma, quotas } = createService();

    const result = await service.checkAts(userId, {
      cvId,
      jobDescription: 'TypeScript React Node.js GraphQL leadership collaboration',
    });

    expect(quotas.reserveAtsExplainQuota).toHaveBeenCalledWith(userId, cvId);
    expect(prisma.atsReport.create).toHaveBeenCalledTimes(1);
    expect(quotas.commit).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'ats-1',
      feature: 'ats',
      model: 'gpt-4o-mini',
      cvId,
    });
    expect(result.atsScore).toBeCloseTo(50, 5);
    expect(result.explanation).toBeTruthy();
    expect(Array.isArray(result.improvements)).toBe(true);
  });

  it('returns a default ATS score when no job description is provided', async () => {
    const { service, prisma } = createService();

    const result = await service.checkAts(userId, { cvId });

    expect(prisma.atsReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cvId,
        atsScore: 70,
        missingKeywords: [],
      }),
    });
    expect(result.atsScore).toBe(70);
  });

  it('rejects ATS analysis when the CV does not belong to the caller', async () => {
    const { service } = createService({
      ...defaultCv(),
      userId: 'another-user',
    });

    await expect(
      service.checkAts(userId, {
        cvId,
        jobDescription: 'TypeScript React',
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects resume optimization when the CV cannot be found', async () => {
    const { service } = createService(null);

    await expect(
      service.optimizeResume(userId, {
        cvId,
        bulletText: 'Built APIs',
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('generates cover letter via gateway and queues portfolio jobs', async () => {
    const { service, quotas } = createService();

    await expect(
      service.generateCoverLetter(userId, {
        cvId,
        jobDescription: 'Looking for a senior frontend engineer',
        company: 'Acme',
      })
    ).resolves.toMatchObject({
      status: 'completed',
      feature: 'cover-letter',
      letter: expect.objectContaining({
        body: expect.stringContaining('Dear Hiring Manager'),
      }),
    });
    expect(quotas.reserveCoverLetterQuota).toHaveBeenCalledWith(userId, cvId);
    expect(quotas.commit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'res-1' }),
      expect.objectContaining({ prompt: expect.stringContaining('company=Acme') })
    );

    await expect(
      service.generatePortfolio(userId, {
        cvId,
        voice: 'concise',
      })
    ).resolves.toMatchObject({
      status: 'queued',
      feature: 'portfolio',
      model: 'gpt-4o',
    });
  });

  it('returns completed scaffold payloads for match, interview and career advice', async () => {
    const { service } = createService();

    await expect(
      service.matchJob(userId, {
        cvId,
        jobDescription: 'React TypeScript role',
      })
    ).resolves.toMatchObject({
      status: 'completed',
      feature: 'job-match',
      model: 'claude-sonnet',
      matchScore: 68,
    });

    await expect(
      service.interviewPrep(userId, {
        cvId,
        jobDescription: 'React TypeScript role',
      })
    ).resolves.toMatchObject({
      status: 'completed',
      feature: 'interview',
      interviewType: 'hr',
    });

    await expect(
      service.careerAdvice(userId, {
        cvId,
        targetRole: 'Staff Engineer',
      })
    ).resolves.toMatchObject({
      status: 'completed',
      feature: 'career-advice',
      model: 'gpt-4o-mini',
    });
  });

  it('returns grammar and skills scaffolds plus queued import jobs', async () => {
    const { service } = createService();

    await expect(
      service.grammarCheck(userId, {
        text: 'I lead cross-functional teams.',
      })
    ).resolves.toMatchObject({
      status: 'completed',
      feature: 'grammar-check',
      model: 'gpt-4o-mini',
      correctedText: 'I lead cross-functional teams.',
    });

    await expect(
      service.skillsSuggest(userId, {
        cvId,
        targetRole: 'Frontend Engineer',
      })
    ).resolves.toMatchObject({
      status: 'completed',
      feature: 'skills-suggest',
      model: 'gpt-4o-mini',
      suggestions: [],
    });

    await expect(
      service.linkedInImport(userId, {
        profileJson: { headline: 'Engineer' },
      })
    ).resolves.toMatchObject({
      status: 'queued',
      feature: 'linkedin-import',
      model: 'gpt-4o-mini',
      hasProfileJson: true,
    });

    await expect(
      service.parsePdf(userId, {
        fileBase64: 'ZmFrZS1wZGY=',
      })
    ).resolves.toMatchObject({
      status: 'queued',
      feature: 'ocr',
      model: 'gpt-4o',
      bytesHint: 12,
    });
  });
});
