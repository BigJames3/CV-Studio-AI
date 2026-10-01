import http from 'http';
import type { AddressInfo } from 'net';
import {
  MAX_REMOTE_IMAGE_BYTES,
  fetchRemoteImage,
  isBlockedAddress,
  optimizeImageForPdf,
} from './optimize-image';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

describe('isBlockedAddress (SEC-005)', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.5.4',
    '192.168.1.10',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    '::',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    'fc00::1',
    'fe80::1',
    'not-an-ip',
  ])('blocks %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(['93.184.216.34', '8.8.8.8', '2606:4700:4700::1111'])('allows public %s', (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe('fetchRemoteImage (SEC-005)', () => {
  let server: http.Server;
  let base: string;
  let hits: string[];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      hits.push(req.url ?? '');
      if (req.url === '/photo.png') {
        res.writeHead(200, { 'content-type': 'image/png' });
        return res.end(PNG_1PX);
      }
      if (req.url === '/redirect') {
        res.writeHead(302, { location: '/photo.png' });
        return res.end();
      }
      if (req.url === '/page') {
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end('<html></html>');
      }
      if (req.url === '/huge') {
        res.writeHead(200, { 'content-type': 'image/png' });
        return res.end(Buffer.alloc(MAX_REMOTE_IMAGE_BYTES + 1));
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    hits = [];
  });

  it('never contacts a loopback address', async () => {
    await expect(fetchRemoteImage(`${base}/photo.png`)).resolves.toBeNull();
    expect(hits).toEqual([]);
  });

  it('never contacts a host that resolves to loopback', async () => {
    const port = (server.address() as AddressInfo).port;
    await expect(fetchRemoteImage(`http://localhost:${port}/photo.png`)).resolves.toBeNull();
    expect(hits).toEqual([]);
  });

  it.each([
    'http://[::1]/photo.png',
    'http://[::ffff:127.0.0.1]/photo.png',
    'http://169.254.169.254/latest/',
    'http://0x7f000001/photo.png',
    'ftp://example.com/photo.png',
    'file:///etc/hosts',
    'not a url',
  ])('refuses %s without a request', async (src) => {
    await expect(fetchRemoteImage(src)).resolves.toBeNull();
  });

  describe('once the address is allowed', () => {
    const allowAll = () => false;

    it('returns the image bytes', async () => {
      const buf = await fetchRemoteImage(`${base}/photo.png`, allowAll);
      expect(buf?.equals(PNG_1PX)).toBe(true);
    });

    it('does not follow redirects', async () => {
      await expect(fetchRemoteImage(`${base}/redirect`, allowAll)).resolves.toBeNull();
      expect(hits).toEqual(['/redirect']);
    });

    it('refuses a response that is not an image', async () => {
      await expect(fetchRemoteImage(`${base}/page`, allowAll)).resolves.toBeNull();
    });

    it('refuses an image over the size cap', async () => {
      await expect(fetchRemoteImage(`${base}/huge`, allowAll)).resolves.toBeNull();
    });
  });
});

describe('optimizeImageForPdf', () => {
  it('still embeds data-URL photos', async () => {
    const out = await optimizeImageForPdf(`data:image/png;base64,${PNG_1PX.toString('base64')}`);
    expect(out.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('leaves a blocked remote URL as is instead of downloading it', async () => {
    const src = 'http://127.0.0.1:9/photo.png';
    await expect(optimizeImageForPdf(src)).resolves.toBe(src);
  });
});
