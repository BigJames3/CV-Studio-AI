import { DEFAULT_DATABASE_POOL_SIZE, withPoolLimit } from './prisma.module';

const BASE = 'postgresql://user:p%40ss@db.internal:5432/cvstudio?schema=public';

describe('withPoolLimit', () => {
  it('adds the default connection_limit and keeps the rest of the URL', () => {
    const url = new URL(withPoolLimit(BASE, undefined)!);
    expect(url.searchParams.get('connection_limit')).toBe(String(DEFAULT_DATABASE_POOL_SIZE));
    expect(url.searchParams.get('schema')).toBe('public');
    expect(url.password).toBe('p%40ss');
    expect(url.host).toBe('db.internal:5432');
  });

  it('uses DATABASE_POOL_SIZE when it is a positive integer', () => {
    expect(new URL(withPoolLimit(BASE, '12')!).searchParams.get('connection_limit')).toBe('12');
    expect(new URL(withPoolLimit(BASE, '0')!).searchParams.get('connection_limit')).toBe('5');
    expect(new URL(withPoolLimit(BASE, 'abc')!).searchParams.get('connection_limit')).toBe('5');
  });

  it('never overrides a connection_limit already set in the URL', () => {
    const pgbouncer = `${BASE}&pgbouncer=true&connection_limit=1`;
    expect(withPoolLimit(pgbouncer, '12')).toBe(pgbouncer);
  });

  it('leaves a missing or unparsable URL untouched', () => {
    expect(withPoolLimit(undefined, undefined)).toBeUndefined();
    expect(withPoolLimit('not a url', undefined)).toBe('not a url');
  });
});
