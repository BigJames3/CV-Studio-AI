# CV Studio AI — Delivery Status (Framework 5 phases / 30 sprints)

Last updated: 2026-07-30

## Mapping

| User framework | Repo roadmap (`docs/ROADMAP-24M`) | Status |
| --- | --- | --- |
| Phase 1 S0 Infra | Sprint 0 | ✅ Done |
| Phase 1 S1 Auth | Sprint 1 (+ S10 MFA/OAuth) | ✅ Core complete |
| Phase 1 S2 Landing | Marketing polish | ✅ Redesigned |
| Phase 1 S3 Editor | Sprint 3 | ✅ Usable (existing) |
| Phase 1 S4 Templates | Sprint 4 | ✅ 5 templates (existing) |
| Phase 1 S5 Export & share | Sprint 4–5 | ✅ PDF + public share + QR; DOCX hidden (coming soon) |
| Phase 1 S6 Dashboard | — | ✅ List + rename/dup/delete/share |
| Phase 1 S7 Billing | Sprint 6–7 | ✅ Stripe fail-closed (idempotency, retry, DLQ, Sentry) |
| Phase 1 S8 Mobile | — | 🟡 Responsive chrome; editor tabs TBD polish |
| Phase 1 S9 QA | — | ✅ Unit + AI/payments coverage gates; Playwright suite |
| Phase 1 S10 Beta | — | 🟡 Monitoring scaffolds in infra docs |
| Phase 2 S11–20 | Core | 🟡 API scaffolds / UI partial — **ATS panel éditeur live** (rules + explain) |
| Phase 3 S21–25 | AI | 🟡 optimize-resume + cover-letter + ATS explain live; rest scaffold |
| Phase 4 S26–30 | Marketplace + mobile | 🟡 Seller UI wired to sales/analytics/listings API; Expo scaffold |

## Sprint 1 — Auth (this delivery)

- [x] Email/password register + login
- [x] JWT access + refresh rotation + reuse detection
- [x] Password reset + email verification
- [x] Google OAuth
- [x] **LinkedIn OAuth (OpenID)** — `POST /auth/oauth/linkedin`
- [x] **TOTP 2FA** — enable / verify / disable + login challenge
- [x] Rate limiting + audit events
- [x] Session list/revoke
- [ ] Apple Sign-In (still Phase 2 stub)

## Sprint 2 — Landing

- [x] Hero brand-first (ink/teal, Fraunces)
- [x] Features / pricing CTA / testimonials / FAQ accordion
- [x] Framer Motion (respects reduced motion)
- [x] JSON-LD SoftwareApplication
- [x] SEO helpers + sitemap/robots (existing)

## Sprint 5–7 additions

- [x] `GET /public/cvs/:slug` + web `/s/[slug]`
- [x] Share QR via `GET /cvs/:id/share`
- [x] Duplicate CV `POST /cvs/:id/duplicate`
- [x] Dashboard actions (rename / duplicate / delete / share)
- [x] Stripe Checkout Session + webhook handlers
- [x] Plan seed (Free / Pro / Business)

## AI gateway vertical slice (2026-07-30)

- [x] `packages/ai-service` `runAiFeature('optimize-resume')` implemented
- [x] Heuristic provider (always available, no vendor key)
- [x] OpenAI-compatible provider (`OPENAI_API_KEY` / `AI_API_KEY`) with heuristic fallback
- [x] Nest `POST /ai/optimize-resume` wired to gateway
- [x] Daily quotas via `AiHistory` (Pro 50 / Business 200)
- [x] Persist optimize calls to `ai_histories`
- [x] Cover letter + ATS explain gateway (heuristic) + quotas
- [ ] Remaining AI features (job match LLM, grammar, OCR, …) still scaffold/queued

## Remaining before “zero defects production”

1. DOCX real generator (entitlement hidden until ready)
2. Global coverage >90% (module gates live for AI + payments)
3. Lighthouse CI on marketing + editor
4. ~~Wire marketplace / seller web to API~~ (seller hub + listings + analytics)
5. ~~Expand AI gateway (cover letter + ATS explain)~~
6. Apple OAuth + production cookie domain hardening
7. Load tests + Sentry/LogRocket keys in staging
8. ~~Stripe fail-closed in production (no `dev_bypass`)~~
9. Playwright e2e suite added (`payment-flow` + PDF); full stack CI run needs services
10. ~~ATS explain layer~~ (heuristic explain on check-ats / explain-ats-score)

## Étapes 11–15 (2026-07-30)

- [x] Stripe webhook idempotency + exponential retry + DLQ + Sentry alert + CronJob
- [x] Fail-closed checkout/webhook when Stripe missing in prod
- [x] Playwright `e2e/payment-flow.spec.ts` + `playwright.config.ts`
- [x] AI cover-letter + ATS explain live with quotas/history
- [x] DOCX entitlement masked (`FEATURE_UNAVAILABLE` / marketing updated)
- [x] Seller dashboard/listings/analytics wired to marketplace API
- [x] CI coverage gates for AI + payments modules
- Doc: `docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`

## 2026-07-30 — ATS editor panel (ROI pick)

- [x] Bouton ATS de l’éditeur branché sur `POST /ai/check-ats`
- [x] Panneau latéral : JD optionnelle, score, mots-clés manquants/couverts, recommandations
- [x] Event analytics `ats_score_viewed`
- [x] Heuristic explain (`ats_explain.v1`) via gateway + quick wins in panel

## 2026-07-30 hardening notes

- AI shared routing contract aligned with API-exposed features in `packages/ai-service`
- Module-level coverage gate for `apps/api/src/modules/ai/ai.service.ts`
- Optimize-resume vertical slice replaces scaffold responses for that endpoint

## How to validate locally

```bash
pnpm docker:up
pnpm db:migrate:deploy
pnpm db:seed
pnpm --filter @cvstudio/api test
pnpm --filter @cvstudio/api test:e2e
pnpm dev
```

Auth smoke: `./test-sprint1-auth.ps1`

Editor ATS: ouvrir un CV → **ATS** → Analyser (avec/sans JD) → score + recommandations visibles.

Optimize-resume smoke (Pro user + JWT):

```bash
curl -X POST http://localhost:3001/ai/optimize-resume \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cvId":"<uuid>","bulletText":"Helped build an internal design system","tone":"factual"}'
```
