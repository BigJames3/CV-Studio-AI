# Analytics instrumentation checklist

- [x] Consent banner gates `enableAnalytics()` (prod); development auto-enables when a PostHog key is set
- [x] `identify` on login/signup
- [x] Funnels: signup, paywall, checkout_started wired (web); signup/login dual-write on API
- [ ] Server Stripe → `checkout_*` / `subscription_*`
- [ ] NPS prompt eligibility (7d+, activated)
- [x] No CV body in props (client taxonomy + server `sanitizeEventProperties`)
- [x] PostHog project (replaces unimplemented Amplitude SDK — see ADR-018)
- [ ] Mobile parity for core events
- [ ] Experiment exposure before measuring
