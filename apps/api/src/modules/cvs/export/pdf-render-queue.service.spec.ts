const queueInstances: Array<Record<string, jest.Mock>> = [];
const workerInstances: Array<{ processor: (job: unknown) => Promise<string>; opts: unknown }> = [];

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => {
    const queue = {
      add: jest.fn(),
      getWorkersCount: jest.fn().mockResolvedValue(1),
      close: jest.fn().mockResolvedValue(undefined),
    };
    queueInstances.push(queue);
    return queue;
  }),
  QueueEvents: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation((_name, processor, opts) => {
    const worker = { processor, opts, on: jest.fn(), close: jest.fn() };
    workerInstances.push(worker);
    return worker;
  }),
}));

import { Queue } from 'bullmq';
import { PdfRenderQueue } from './pdf-render-queue.service';

const PDF = Buffer.from('%PDF-1.7 rendered');

function makeRenderer(mode?: string) {
  if (mode) process.env.PDF_RENDER_MODE = mode;
  else delete process.env.PDF_RENDER_MODE;
  const generator = { htmlToPdf: jest.fn().mockResolvedValue(PDF) };
  const renderer = new PdfRenderQueue(generator as never);
  renderer.onModuleInit();
  return { renderer, generator, queue: queueInstances[queueInstances.length - 1] };
}

describe('PdfRenderQueue', () => {
  const originalMode = process.env.PDF_RENDER_MODE;

  beforeEach(() => {
    queueInstances.length = 0;
    workerInstances.length = 0;
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalMode === undefined) delete process.env.PDF_RENDER_MODE;
    else process.env.PDF_RENDER_MODE = originalMode;
  });

  it('renders inline by default and opens no queue connection', async () => {
    const { renderer, generator } = makeRenderer();

    await expect(renderer.htmlToPdf('<p>cv</p>', { pageSize: 'A4' })).resolves.toBe(PDF);
    expect(generator.htmlToPdf).toHaveBeenCalledWith('<p>cv</p>', { pageSize: 'A4' });
    expect(Queue).not.toHaveBeenCalled();
  });

  it('sends the render to a worker in queue mode and decodes its result', async () => {
    const { renderer, generator, queue } = makeRenderer('queue');
    const waitUntilFinished = jest.fn().mockResolvedValue(PDF.toString('base64'));
    queue.add.mockResolvedValue({ waitUntilFinished });

    const result = await renderer.htmlToPdf('<p>cv</p>', { wysiwyg: true });

    expect(result.equals(PDF)).toBe(true);
    expect(generator.htmlToPdf).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(
      'render',
      { html: '<p>cv</p>', options: { wysiwyg: true } },
      expect.objectContaining({ attempts: 2 })
    );
    expect(waitUntilFinished).toHaveBeenCalledWith(expect.anything(), 60_000);
  });

  it('renders inline when no worker is alive, and caches that answer', async () => {
    const { renderer, generator, queue } = makeRenderer('queue');
    queue.getWorkersCount.mockResolvedValue(0);

    await renderer.htmlToPdf('<p>a</p>');
    await renderer.htmlToPdf('<p>b</p>');

    expect(generator.htmlToPdf).toHaveBeenCalledTimes(2);
    expect(queue.add).not.toHaveBeenCalled();
    expect(queue.getWorkersCount).toHaveBeenCalledTimes(1);
  });

  it('renders inline when the queue is unreachable', async () => {
    const { renderer, generator, queue } = makeRenderer('queue');
    queue.getWorkersCount.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(renderer.htmlToPdf('<p>cv</p>')).resolves.toBe(PDF);
    expect(generator.htmlToPdf).toHaveBeenCalledTimes(1);
  });

  it('propagates a render failure reported by the worker', async () => {
    const { renderer, queue } = makeRenderer('queue');
    queue.add.mockResolvedValue({
      waitUntilFinished: jest.fn().mockRejectedValue(new Error('Navigation timeout')),
    });

    await expect(renderer.htmlToPdf('<p>cv</p>')).rejects.toThrow('Navigation timeout');
  });

  it('worker processor renders with the local Chromium and returns base64', async () => {
    const { renderer, generator } = makeRenderer();
    renderer.startWorker(3);
    const [worker] = workerInstances;

    const out = await worker.processor({
      data: { html: '<p>cv</p>', options: { quality: 'high' } },
    });

    expect(Buffer.from(out, 'base64').equals(PDF)).toBe(true);
    expect(generator.htmlToPdf).toHaveBeenCalledWith('<p>cv</p>', { quality: 'high' });
    expect(worker.opts).toMatchObject({
      concurrency: 3,
      connection: { maxRetriesPerRequest: null },
    });
  });
});
