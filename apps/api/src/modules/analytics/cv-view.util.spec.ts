import { classifySource, dailyVisitorHash, isBotUserAgent, referrerHost } from './cv-view.util';

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

describe('cv-view utils', () => {
  it('classifies explicit share-link sources first', () => {
    expect(classifySource('qr', 'linkedin.com')).toBe('qr');
    expect(classifySource('EMAIL', null)).toBe('email');
    // Unknown ?src= values cannot inject arbitrary labels.
    expect(classifySource('<script>', null)).toBe('direct');
  });

  it('classifies referrer hosts', () => {
    expect(classifySource(undefined, 'linkedin.com')).toBe('linkedin');
    expect(classifySource(undefined, 'lnkd.in')).toBe('linkedin');
    expect(classifySource(undefined, 'mail.google.com')).toBe('email');
    expect(classifySource(undefined, 'google.fr')).toBe('search');
    expect(classifySource(undefined, 't.co')).toBe('social');
    expect(classifySource(undefined, 'fr.indeed.com')).toBe('job_board');
    expect(classifySource(undefined, 'blog.example.org')).toBe('other');
  });

  it('treats no referrer and our own pages as direct', () => {
    expect(classifySource(undefined, null)).toBe('direct');
    expect(classifySource(undefined, 'cvstudio.ai', ['cvstudio.ai'])).toBe('direct');
  });

  it('extracts referrer hosts safely', () => {
    expect(referrerHost('https://www.LinkedIn.com/feed/?x=1')).toBe('linkedin.com');
    expect(referrerHost('not a url')).toBeNull();
    expect(referrerHost(undefined)).toBeNull();
  });

  it('filters bots and empty user agents', () => {
    expect(isBotUserAgent(CHROME)).toBe(false);
    expect(isBotUserAgent('Googlebot/2.1')).toBe(true);
    expect(isBotUserAgent('facebookexternalhit/1.1')).toBe(true);
    expect(isBotUserAgent(undefined)).toBe(true);
  });

  it('hashes visitors per day, never across days', () => {
    const day1 = new Date('2026-09-26T08:00:00Z');
    const later = new Date('2026-09-26T22:00:00Z');
    const day2 = new Date('2026-09-27T08:00:00Z');
    const a = dailyVisitorHash('1.2.3.4', CHROME, day1, 's');
    expect(a).toHaveLength(32);
    expect(dailyVisitorHash('1.2.3.4', CHROME, later, 's')).toBe(a);
    expect(dailyVisitorHash('1.2.3.4', CHROME, day2, 's')).not.toBe(a);
    expect(dailyVisitorHash('5.6.7.8', CHROME, day1, 's')).not.toBe(a);
    expect(a).not.toContain('1.2.3.4');
  });
});
