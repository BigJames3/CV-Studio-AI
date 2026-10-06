import { NotFoundException } from '@nestjs/common';
import { PdfExportService } from './pdf-export.service';

const OWNER = 'user-owner';
const ATTACKER = 'user-attacker';
const CV_ID = '11111111-1111-4111-8111-111111111111';

function makeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

function makeService(redis: ReturnType<typeof makeRedis>) {
  const prisma = {
    cv: {
      findFirst: jest.fn().mockResolvedValue({
        id: CV_ID,
        userId: OWNER,
        title: 'CV',
        content: {},
        paper: 'A4',
        deletedAt: null,
      }),
    },
  };
  const entitlements = { assertCan: jest.fn().mockResolvedValue(undefined) };
  const service = new PdfExportService(
    prisma as never,
    redis as never,
    entitlements as never,
    {} as never
  );
  jest.spyOn(service, 'renderFromContent').mockResolvedValue({
    buffer: Buffer.from('%PDF-owner-private'),
    filename: 'Owner_CV.pdf',
    warnings: [],
  });
  return service;
}

async function flushJob() {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
}

describe('PdfExportService async jobs — ownership (BOLA/IDOR)', () => {
  let redis: ReturnType<typeof makeRedis>;
  let service: PdfExportService;
  let jobId: string;

  beforeEach(async () => {
    redis = makeRedis();
    service = makeService(redis);
    ({ jobId } = await service.enqueueFromCvId(OWNER, CV_ID));
    await flushJob();
  });

  it('uses an unguessable job id that does not embed the CV id', () => {
    expect(jobId).toMatch(/^pdf_[0-9a-f-]{36}$/);
    expect(jobId).not.toContain(CV_ID);
  });

  it('lets the owner poll and download the job', async () => {
    const status = await service.getJobStatus(jobId, OWNER);
    expect(status.status).toBe('completed');

    const { buffer, filename } = await service.getJobBuffer(jobId, OWNER);
    expect(buffer.toString()).toBe('%PDF-owner-private');
    expect(filename).toBe('Owner_CV.pdf');
  });

  it('never exposes the owner id or the PDF bytes in the status payload', async () => {
    const status = (await service.getJobStatus(jobId, OWNER)) as Record<string, unknown>;
    expect(status).not.toHaveProperty('ownerId');
    expect(status).not.toHaveProperty('buffer');
    expect(status).not.toHaveProperty('bufferB64');
  });

  it('returns 404 to another user on status and download', async () => {
    await expect(service.getJobStatus(jobId, ATTACKER)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getJobBuffer(jobId, ATTACKER)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the same 404 for unknown jobs, so ids cannot be probed', async () => {
    await expect(service.getJobStatus('pdf_unknown', OWNER)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('keeps ownership when the job is restored from Redis by another instance', async () => {
    const otherInstance = makeService(redis);
    await expect(otherInstance.getJobBuffer(jobId, ATTACKER)).rejects.toBeInstanceOf(
      NotFoundException
    );
    const { buffer } = await otherInstance.getJobBuffer(jobId, OWNER);
    expect(buffer.toString()).toBe('%PDF-owner-private');

    const status = (await otherInstance.getJobStatus(jobId, OWNER)) as Record<string, unknown>;
    expect(status).not.toHaveProperty('bufferB64');
  });

  it('treats legacy jobs without an owner as not found', async () => {
    redis.store.set(
      'pdf:job:pdf_legacy',
      JSON.stringify({
        status: 'completed',
        jobId: 'pdf_legacy',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bufferB64: Buffer.from('%PDF-legacy').toString('base64'),
      })
    );
    const fresh = makeService(redis);
    await expect(fresh.getJobBuffer('pdf_legacy', OWNER)).rejects.toBeInstanceOf(NotFoundException);
  });
});
