/**
 * CLI: check the Stripe configuration (keys, prices, webhooks, customer portal).
 * Usage: pnpm stripe:check   (or pnpm --filter @cvstudio/api stripe:check)
 *
 * Read-only: it never creates or changes anything in Stripe. Exit code 1 on any error.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseEnv } from 'util';
import Stripe from 'stripe';
import { checkStripeConfig, type CheckLevel } from '../modules/payments/stripe-config-check';
import { isNonPlaceholderSecret } from '../modules/payments/payment-env';

/** Same files and precedence as the API (ConfigModule): process env, then .env.local, then .env. */
function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    const path = join(__dirname, '..', '..', file);
    if (!existsSync(path)) continue;
    for (const [name, value] of Object.entries(parseEnv(readFileSync(path, 'utf8')))) {
      if (process.env[name] === undefined) process.env[name] = value;
    }
  }
}

const ICON: Record<CheckLevel, string> = { ok: '✔', warn: '!', error: '✖' };

async function main() {
  loadEnvFiles();
  const key = process.env.STRIPE_SECRET_KEY;
  const stripe = isNonPlaceholderSecret(key)
    ? new Stripe(key, { apiVersion: '2025-02-24.acacia' })
    : null;

  const results = await checkStripeConfig(process.env, stripe);
  for (const { level, message } of results) {
    console.log(`${ICON[level]} ${message}`);
  }

  const errors = results.filter((r) => r.level === 'error').length;
  const warnings = results.filter((r) => r.level === 'warn').length;
  console.log(`\n${errors} error(s), ${warnings} warning(s).`);
  if (errors > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
