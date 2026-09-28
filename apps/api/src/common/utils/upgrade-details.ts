/**
 * `details` of a 402 ENTITLEMENT_REQUIRED error. Business is the top plan: there is nothing to
 * upgrade to, so it gets no upgrade link (the web app offers support instead).
 */
export function upgradeDetails(
  feature: string,
  tier: string
): { feature: string; tier: string; upgradeUrl?: string } {
  return tier === 'business' ? { feature, tier } : { feature, tier, upgradeUrl: '/pricing' };
}
