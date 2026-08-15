import type { FullConfig } from '@playwright/test';
import { loadTestEnv } from './load-env';

export default async function globalSetup(_config: FullConfig) {
  loadTestEnv();
}
