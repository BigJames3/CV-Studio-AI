# Analytics instrumentation checklist

- [ ] Consent banner gates `enableAnalytics()`
- [ ] `identify` on login/signup
- [ ] Funnels: signup, activation, paywall events wired
- [ ] Server Stripe → `checkout_*` / `subscription_*`
- [ ] NPS prompt eligibility (7d+, activated)
- [ ] No CV body in props (code review)
- [ ] Staging Amplitude project verified
- [ ] Mobile parity for core events
- [ ] Experiment exposure before measuring
