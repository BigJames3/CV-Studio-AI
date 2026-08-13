import { Logger } from '@nestjs/common';
import { PostHog } from 'posthog-node';

const logger = new Logger('PostHog');

let client: PostHog | null = null;

function isConfigured(): boolean {
  const key = process.env.POSTHOG_API_KEY;
  return Boolean(key && !key.includes('xxx'));
}

export function getPostHogClient(): PostHog | null {
  if (!isConfigured()) return null;
  if (!client) {
    client = new PostHog(process.env.POSTHOG_API_KEY as string, {
      host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      flushInterval: 10_000,
      disableGeoip: true,
    });
  }
  return client;
}

export function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    ...properties,
  };

  if (!isConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`[dry-run] ${event} user=${userId}`);
    }
    return;
  }

  try {
    getPostHogClient()?.capture({
      distinctId: userId,
      event,
      properties: payload,
    });
  } catch (err) {
    logger.warn(`capture failed: ${(err as Error).message}`);
  }
}

export function captureServerIdentify(userId: string, properties: Record<string, unknown>): void {
  if (!isConfigured()) return;
  try {
    getPostHogClient()?.identify({
      distinctId: userId,
      properties,
    });
  } catch (err) {
    logger.warn(`identify failed: ${(err as Error).message}`);
  }
}

export async function shutdownPostHog(): Promise<void> {
  if (!client) return;
  try {
    await client.shutdown();
  } catch (err) {
    logger.warn(`shutdown failed: ${(err as Error).message}`);
  } finally {
    client = null;
  }
}
