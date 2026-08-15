import { expect, Page } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { getMe, getSubscription } from './api';

export async function expectPlanBadge(page: Page, plan: 'free' | 'pro' | 'business') {
  await expect(page.getByTestId('plan-badge').first()).toContainText(new RegExp(plan, 'i'), {
    timeout: 20_000,
  });
}

export async function expectSubscriptionTier(
  request: APIRequestContext,
  token: string,
  plan: 'free' | 'pro' | 'business'
) {
  const me = await getMe(request, token);
  expect(me.subscriptionTier).toBe(plan);
  const sub = await getSubscription(request, token);
  expect(sub.tier).toBe(plan);
  if (plan === 'free') {
    expect(sub.entitlements.cvCreate).toBe(true);
  } else {
    expect(sub.subscription?.status).toMatch(/active|trialing/);
    expect(sub.entitlements.cvCreate).toBe(true);
  }
  return sub;
}
