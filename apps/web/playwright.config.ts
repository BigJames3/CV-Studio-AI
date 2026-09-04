import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { loadTestEnv } from './e2e/load-env';

loadTestEnv();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const repoRoot = path.resolve(__dirname, '../..');
const e2eDir = path.join(__dirname, 'e2e');
const stripe = process.env.E2E_STRIPE === '1';
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';
const isCi = process.env.CI === 'true' || process.env.CI === '1';

const apiCommand = isCi
  ? 'pnpm --filter @cvstudio/api exec node dist/main.js'
  : 'pnpm --filter @cvstudio/api dev';
const webCommand = isCi
  ? 'pnpm --filter @cvstudio/web exec next start -p 3000'
  : 'pnpm --filter @cvstudio/web dev';

export default defineConfig({
  testDir: e2eDir,
  testMatch: '**/*.spec.ts',
  globalSetup: path.join(e2eDir, 'global-setup.ts'),
  globalTeardown: path.join(e2eDir, 'global-teardown.ts'),
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: 1,
  reporter: isCi
    ? [
        ['github'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
      ]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  grepInvert: stripe ? undefined : /@stripe/,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'setup', testMatch: /health\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: /health\.setup\.ts/,
    },
  ],
  webServer: skipWebServer
    ? undefined
    : [
        {
          command: apiCommand,
          cwd: repoRoot,
          url: 'http://localhost:3001/api/v1/health',
          reuseExistingServer: !isCi,
          timeout: 180_000,
          env: {
            ...process.env,
            PORT: '3001',
            AUTH_RATE_LIMIT_DISABLED: 'true',
            CINETPAY_API_KEY: process.env.CINETPAY_API_KEY ?? 'test_api_key',
            CINETPAY_SITE_ID: process.env.CINETPAY_SITE_ID ?? 'test_site_id',
            JWT_ACCESS_SECRET:
              process.env.JWT_ACCESS_SECRET ?? 'e2e-access-secret-min-32-characters!!',
            JWT_REFRESH_SECRET:
              process.env.JWT_REFRESH_SECRET ?? 'e2e-refresh-secret-min-32-characters!',
            ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? 'e2e-encryption-key-min-32-characters!!',
          },
        },
        {
          command: webCommand,
          cwd: repoRoot,
          url: baseURL,
          reuseExistingServer: !isCi,
          timeout: 180_000,
        },
      ],
});
