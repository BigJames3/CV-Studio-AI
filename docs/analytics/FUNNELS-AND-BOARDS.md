# Funnels & boards — Amplitude setup

## Saved funnels

1. **Signup** — `page_viewed` (path=/) → `cta_clicked` → `signup_started` → `signup_succeeded` → `cv_created`
2. **Activation 24h** — `signup_succeeded` → `cv_section_edited` → `cv_preview_viewed` → `cv_exported` (success=true)
3. **Paywall** — `paywall_viewed` → `checkout_started` → `checkout_succeeded` (group by `trigger`)
4. **AI value** — `ai_feature_opened` → `ai_feature_run` → `ai_suggestion_applied`

Holding window: 7 days (signup) · 1 day (activation) · 7 days (paywall).

## Boards

### Growth (weekly)

- WAE trend
- Activation 24h rate
- D1/D7/D30 usage retention
- Signup by channel

### Monetization

- MRR (warehouse tile or Stripe)
- Paywall CVR by trigger
- Free→Paid 28d
- Cancel reasons

### Product health

- Export success rate
- AI success / latency p95
- Autosave errors (if tracked)

### Voice

- NPS rolling 90d
- Promoter % · Detractor %

## Cohorts to save

- Activated_24h
- Paid_active
- AI_week1
- Dormant_14d_was_engaged
