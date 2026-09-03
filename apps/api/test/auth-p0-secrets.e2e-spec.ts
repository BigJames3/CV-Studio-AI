import { assertAuthSecrets } from '../src/modules/auth/auth-secrets';
import { createTestApp } from './create-test-app';

describe('P0: JWT Secrets Validation', () => {
  it('should fail if JWT_ACCESS_SECRET is missing', () => {
    expect(() =>
      assertAuthSecrets({
        JWT_ACCESS_SECRET: '',
        JWT_REFRESH_SECRET: 'y'.repeat(32),
        NODE_ENV: 'test',
      })
    ).toThrow(/JWT_ACCESS_SECRET not set/);
  });

  it('should fail if JWT_REFRESH_SECRET uses a default value', () => {
    expect(() =>
      assertAuthSecrets({
        JWT_ACCESS_SECRET: 'x'.repeat(32),
        JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me',
        NODE_ENV: 'test',
      })
    ).toThrow(/using default/);
  });

  it('should fail if access and refresh secrets are identical', () => {
    const same = 'a'.repeat(32);
    expect(() =>
      assertAuthSecrets({
        JWT_ACCESS_SECRET: same,
        JWT_REFRESH_SECRET: same,
        NODE_ENV: 'test',
      })
    ).toThrow(/must be different/);
  });

  it('should boot successfully with strong, distinct secrets', async () => {
    const app = await createTestApp();
    expect(app).toBeDefined();
    await app.close();
  });
});
