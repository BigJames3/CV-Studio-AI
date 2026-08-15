import { PostHog } from 'posthog-node';

const BLOCKED_PROP =
  /password|secret|token|authorization|cookie|cv_body|html|resume_html|content_html/i;

let client: PostHog | null | undefined;

export function isPostHogConfigured(): boolean {
  const key = process.env.POSTHOG_API_KEY;
  return Boolean(key?.startsWith('phc_'));
}

export function getMarketingSpendMonthly(): number {
  const raw = Number(process.env.ANALYTICS_MARKETING_SPEND_MONTHLY ?? 0);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function getClient(): PostHog | null {
  if (client !== undefined) return client;
  if (!isPostHogConfigured() || process.env.NODE_ENV === 'test') {
    client = null;
    return client;
  }
  client = new PostHog(process.env.POSTHOG_API_KEY as string, {
    host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 10,
    flushInterval: 10_000,
  });
  return client;
}

export function sanitizeEventProperties(
  properties?: Record<string, unknown>
): Record<string, unknown> {
  if (!properties) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (BLOCKED_PROP.test(key)) continue;
    if (typeof value === 'string' && value.length > 500) continue;
    out[key] = value;
  }
  return out;
}

export function captureServerEvent(input: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): void {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.capture({
      distinctId: input.distinctId,
      event: input.event,
      properties: {
        ...sanitizeEventProperties(input.properties),
        $lib: 'cvstudio-api',
        env: process.env.NODE_ENV,
      },
    });
  } catch {
    /* never fail the product path */
  }
}

export async function shutdownPostHog(): Promise<void> {
  if (!client) return;
  await client.shutdown();
  client = undefined;
}
