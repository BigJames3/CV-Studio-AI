import { createHash } from 'crypto';

export const VIEW_SOURCES = [
  'direct',
  'qr',
  'linkedin',
  'email',
  'search',
  'social',
  'job_board',
  'other',
] as const;
export type ViewSource = (typeof VIEW_SOURCES)[number];

/** `?src=` values the app itself writes into share links (QR code, copy button...). */
const EXPLICIT_SOURCES = new Set<ViewSource>(['qr', 'linkedin', 'email']);

const HOST_SOURCES: Array<[RegExp, ViewSource]> = [
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, 'linkedin'],
  [
    /(^|\.)(mail\.google\.com|outlook\.(live|office|office365)\.com|mail\.yahoo\.com|mail\.proton\.me)$/,
    'email',
  ],
  [/(^|\.)(google|bing|duckduckgo|yahoo|qwant|ecosia|yandex|baidu)\.[a-z.]+$/, 'search'],
  [
    /(^|\.)(facebook|fb|instagram|x|twitter|t\.co|whatsapp|wa\.me|telegram|t\.me|reddit|tiktok|youtube)\.(com|me|co|org|net)$|^t\.co$|^wa\.me$|^t\.me$/,
    'social',
  ],
  [
    /(^|\.)(indeed|welcometothejungle|glassdoor|monster|apec|hellowork|jobteaser|malt)\.[a-z.]+$/,
    'job_board',
  ],
];

const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|skype|headless|lighthouse|curl|wget|python-requests|axios|node-fetch/i;

export function isBotUserAgent(userAgent: string | undefined): boolean {
  return !userAgent || BOT_UA.test(userAgent);
}

/** Host of a referrer URL, lowercased, without `www.`; null when missing or unparsable. */
export function referrerHost(referrer: string | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
    return host ? host.slice(0, 255) : null;
  } catch {
    return null;
  }
}

/**
 * Where a visit came from. An explicit `?src=` from our own share links wins, then the
 * referrer host. Referrers from the app itself count as `direct` (preview, copy-paste).
 */
export function classifySource(
  src: string | undefined,
  host: string | null,
  ownHosts: string[] = []
): ViewSource {
  const explicit = src?.trim().toLowerCase() as ViewSource | undefined;
  if (explicit && EXPLICIT_SOURCES.has(explicit)) return explicit;
  if (!host || ownHosts.includes(host)) return 'direct';
  for (const [pattern, source] of HOST_SOURCES) {
    if (pattern.test(host)) return source;
  }
  return 'other';
}

/**
 * Counts one visitor once per UTC day without storing who they are: the day is part of the
 * hashed input, so hashes cannot be linked across days, and the IP never reaches the DB.
 */
export function dailyVisitorHash(ip: string, userAgent: string, now: Date, secret: string): string {
  const day = now.toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${day}|${ip}|${userAgent}|${secret}`)
    .digest('hex')
    .slice(0, 32);
}
