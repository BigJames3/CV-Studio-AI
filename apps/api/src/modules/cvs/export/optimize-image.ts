import { lookup as dnsLookup } from 'dns';
import type { LookupAddress, LookupOptions } from 'dns';
import http from 'http';
import https from 'https';
import { BlockList, isIP } from 'net';

const REMOTE_IMAGE_TIMEOUT_MS = 8_000;
export const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Addresses a user-supplied photo URL must never reach (SEC-005): loopback,
 * private networks, link-local (cloud metadata), and other reserved ranges.
 */
const blockedAddresses = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedAddresses.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  ['::', 96],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blockedAddresses.addSubnet(net, prefix, 'ipv6');
}

/** IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) are matched against the IPv4 rules by BlockList. */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return blockedAddresses.check(address, 'ipv4');
  if (family === 6) return blockedAddresses.check(address, 'ipv6');
  return true;
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number
) => void;

/**
 * Downloads a remote image for the PDF, or returns null. Only public
 * addresses are contacted: the check runs on the resolved addresses used
 * for the connection itself, so DNS tricks cannot bypass it. Redirects are
 * not followed, the response must be an image, and it is capped in size.
 */
export function fetchRemoteImage(
  src: string,
  isBlocked: (address: string) => boolean = isBlockedAddress
): Promise<Buffer | null> {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return Promise.resolve(null);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return Promise.resolve(null);

  const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
  if (isIP(host) && isBlocked(host)) return Promise.resolve(null);

  const lookup = (hostname: string, options: LookupOptions, callback: LookupCallback) => {
    dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err, []);
      if (addresses.length === 0 || addresses.some((a) => isBlocked(a.address))) {
        return callback(Object.assign(new Error('Blocked address'), { code: 'EBLOCKED' }), []);
      }
      if (options.all) return callback(null, addresses);
      return callback(null, addresses[0].address, addresses[0].family);
    });
  };

  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const req = client.get(
      url,
      { lookup, signal: AbortSignal.timeout(REMOTE_IMAGE_TIMEOUT_MS) },
      (res) => {
        const type = String(res.headers['content-type'] ?? '');
        const declared = Number(res.headers['content-length'] ?? 0);
        if (
          res.statusCode !== 200 ||
          !type.toLowerCase().startsWith('image/') ||
          declared > MAX_REMOTE_IMAGE_BYTES
        ) {
          res.resume();
          req.destroy();
          return resolve(null);
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_REMOTE_IMAGE_BYTES) {
            req.destroy();
            return resolve(null);
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', () => resolve(null));
      }
    );
    req.on('error', () => resolve(null));
  });
}

/**
 * Optional image downscale for data-URL / remote photos before PDF embed.
 * Soft-fails when sharp is unavailable.
 */
export async function optimizeImageForPdf(src: string): Promise<string> {
  if (!src) return src;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharpMod = require('sharp');
    const sharp = (sharpMod.default ?? sharpMod) as (input: Buffer) => {
      rotate: () => {
        resize: (o: object) => {
          jpeg: (o: object) => { toBuffer: () => Promise<Buffer> };
        };
      };
    };
    let input: Buffer;
    if (src.startsWith('data:')) {
      const b64 = src.split(',')[1];
      if (!b64) return src;
      input = Buffer.from(b64, 'base64');
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      const remote = await fetchRemoteImage(src);
      if (!remote) return src;
      input = remote;
    } else {
      return src;
    }
    const out = await sharp(input)
      .rotate()
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString('base64')}`;
  } catch {
    return src;
  }
}
