import type { FullConfig } from '@playwright/test';

/** webServer processes are stopped by Playwright; nothing else to tear down. */
export default async function globalTeardown(_config: FullConfig) {
  return undefined;
}
