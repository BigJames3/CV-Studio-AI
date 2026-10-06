import { PdfGeneratorService, shouldAllowPdfNetworkRequest } from './pdf-generator.service';

function makeGenerator() {
  const calls: string[] = [];
  const page = {
    setDefaultTimeout: jest.fn(),
    setJavaScriptEnabled: jest.fn(async (enabled: boolean) => {
      calls.push(`setJavaScriptEnabled(${enabled})`);
    }),
    setRequestInterception: jest.fn(async () => undefined),
    on: jest.fn(),
    setViewport: jest.fn(async () => undefined),
    setContent: jest.fn(async () => {
      calls.push('setContent');
    }),
    evaluateHandle: jest.fn(async () => undefined),
    pdf: jest.fn(async () => new Uint8Array([37, 80, 68, 70])),
    close: jest.fn(async () => undefined),
  };
  const pool = { getBrowser: jest.fn(async () => ({ newPage: async () => page })) };
  return { page, calls, generator: new PdfGeneratorService(pool as never) };
}

describe('PdfGeneratorService.htmlToPdf (SEC-007)', () => {
  it('disables JavaScript before loading client HTML', async () => {
    const { calls, generator } = makeGenerator();

    await generator.htmlToPdf('<p>CV</p><script>new WebSocket("ws://127.0.0.1")</script>');

    expect(calls).toEqual(['setJavaScriptEnabled(false)', 'setContent']);
  });

  it('still returns the PDF bytes and closes the page', async () => {
    const { page, generator } = makeGenerator();

    const buffer = await generator.htmlToPdf('<p>CV</p>');

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(page.close).toHaveBeenCalled();
  });
});

describe('shouldAllowPdfNetworkRequest', () => {
  it.each(['data:image/png;base64,AAAA', 'about:blank', 'blob:null/1'])('allows %s', (url) => {
    expect(shouldAllowPdfNetworkRequest(url)).toBe(true);
  });

  it.each(['http://127.0.0.1/', 'https://example.com/a.png', 'file:///etc/passwd'])(
    'blocks %s',
    (url) => {
      expect(shouldAllowPdfNetworkRequest(url)).toBe(false);
    }
  );
});
