# BILLING AUDIT VALIDATION REPORT

**Date:** 5 September 2026  
**Scope:** CV Studio AI billing page redesign (Phase A & B)  
**Method:** Source review, Jest (plans / subscriptions / invoices), ESLint, `tsc --noEmit` (strict), `pnpm audit`  
**Companion canvas:** open [billing audit validation](C:/Users/HP/.cursor/projects/d-Projets-CV-Studio-AI/canvases/billing-audit-validation.canvas.tsx) beside chat for the scored dashboard.

---

## Executive Summary

- **Audit findings:** Mostly valid. Headline completeness (17/18, 94%) and the 71-test claim are accurate. Several numeric details and one security claim are off.
- **Code quality score:** **76/100** (claimed 78%)
- **Feature completeness:** **17/18** (claimed 17/18) — payment-method selector still sits after plan cards
- **Test coverage (billing backend modules):** **78% statements / 80% lines / 71% branches** (claimed 75–85%)
- **Overall audit accuracy:** **High** (~92% of material claims verified)

**Go / No-Go:** Safe to merge to **staging**. Production should add a route-level error boundary and treat monorepo `pnpm audit` findings (Next.js / Multer / tar) as a separate hardening track — they are not introduced by the billing catalog work.

---

## 1. Code Quality Validation

### Backend type safety (claimed 8/10)

**Actual score: 8/10**

| Check                                                | Result                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `any` in production plans / subscriptions / invoices | **0**                                                                                             |
| `unknown`                                            | `PlanRecord.priceMonthly` / `priceYearly` (Prisma Decimal) — appropriate                          |
| `as never` in production                             | **2** — `subscriptions.service.ts` lines 337 and 348 (`prisma.subscription.upsert` create/update) |
| `as never` in specs                                  | Widespread, acceptable for Nest constructor mocks                                                 |
| Checkout DTO                                         | `CheckoutDto` with `@IsIn` on plan, interval, paymentMethod                                       |
| GET `/plans` DTO                                     | No body DTO (none required). Return type is `{ items: CatalogPlanDto[] }`, not a bare array       |

**Verdict:** Claim valid (8/10). The `as never` casts hide a Prisma spread-typing issue; they do not hide runtime `any`.

### Frontend type safety (claimed 8/10)

**Actual score: 8/10**

- Billing / pricing / catalog files: **no `any` / `as never`**.
- `PlanCardsProps`, `CatalogPlan`, `BillingPeriod`, checkout callback `(plan, interval) => void` are explicit.
- `useQuery` results are inferred from `plansApi` / `invoicesApi` (typed clients).
- Duplicate shapes: API `CatalogPlanDto` vs web `CatalogPlan` (optional fields on the client). Drift risk if the catalog DTO changes.

**Type coverage (billing UI files):** ~90% explicit; remaining gaps are inferred React Query data and `catch {}` handlers.

**Verdict:** Claim valid (8/10).

### Error handling (claimed 8/10 backend, 7/10 frontend)

**Backend actual: 7/10**

| Path                           | Status                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST `/subscriptions/checkout` | Throws Nest `NotFound` / `ServiceUnavailable` / `BadRequest`. **No try/catch** around `stripe.checkout.sessions.create` — Stripe SDK errors become 500s |
| GET `/plans` Redis             | `Logger.warn` + fall through to DB (confirmed in test output: `ECONNREFUSED`)                                                                           |
| Stripe webhooks                | `processEventWithRetry`, lock, DLQ, alerts in `payments.service.ts` (outside the 71-test slice, but present)                                            |
| Invoice get/download           | `404 NOT_FOUND`, `403 FORBIDDEN` (`Not your invoice`)                                                                                                   |
| CinetPay `returnUrl`           | Forwarded from checkout, **allowlisted in `CinetpayGateway.safeCinetpayReturnUrl`**                                                                     |

**Frontend actual: 7/10**

| Path                      | Status                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Checkout button           | Error banner + generic French copy                                                                                |
| Invoice / payment history | Distinct error vs empty state; **Réessayer** calls `refetchPayments` + `refetchInvoices`                          |
| Catalog failure           | `plansApi.list` falls back to `FALLBACK_PLANS` (silent)                                                           |
| `useMe` error             | Login prompt                                                                                                      |
| React error boundary      | **None** — no `app/**/error.tsx` in the web app                                                                   |
| Plans skeleton            | Components exist, but `initialData: FALLBACK_PLANS` makes `isPending` false, so plan-card skeletons rarely render |

**Verdict:** Frontend claim valid (7/10). Backend claim slightly high (7/10 actual) because checkout does not wrap the Stripe SDK.

### Code structure (claimed 9/10)

**Actual score: 8/10**

| Claim                              | Measured                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `page.tsx` 705 LOC                 | **768 LOC**                                                                                           |
| `plan-cards.tsx` 256 LOC extracted | **272 LOC** — extracted, yes                                                                          |
| `PlansModule` separate file        | **Yes** (`plans.module.ts`, registered in `AppModule`)                                                |
| plans vs subscriptions vs invoices | Clear split; `SubscriptionsModule` `forwardRef`s `PaymentsModule` (existing cycle, not new spaghetti) |
| Testability                        | High — services constructed with `as never` mocks                                                     |

**Potential refactorings:** split `BillingPageContent` (checkout polling vs history vs plan cards); replace `as never` upsert with an explicit Prisma type; share `CatalogPlan` via `packages/shared-types`.

**Verdict:** Claim slightly generous (8/10). Organization is good; the page is still a god component.

---

## 2. Feature Completeness Validation

Product prices in seed / fallback / tests are **Pro $9.99/mo · $99/yr** and **Business $29.99/mo · $299/yr**, not $7.99. Savings math: `9.99 × 12 − 99 = $20.88` (17%).

| Feature                    | Claimed | Verified | Notes                                                                                               |
| -------------------------- | ------- | -------- | --------------------------------------------------------------------------------------------------- |
| GET `/plans` `@Public`     | Done    | Done     | `@Controller('plans')` `@Get()` `@Public()`. Shape `{ items }`                                      |
| Prices on `/billing`       | Done    | Done     | Month/year toggle; fallback catalog if API fails                                                    |
| Prices on `/pricing`       | Done    | Done     | Same `queryKeys.plans` + `mergeCatalog`                                                             |
| Feature matrix             | Done    | Done     | `CheckCircle2` / `XCircle` on billing. Free **1** check, Pro **5**, Business **7** (not 4 / 8+)     |
| Business yearly            | Done    | Done     | `data-testid="checkout-business-year"` → `interval: 'year'`                                         |
| 14-day trial               | Done    | Done     | `STRIPE_TRIAL_DAYS = 14`; `trial_period_days` on Stripe only                                        |
| Trial skip returning users | Done    | Done     | `isEligibleForStripeTrial`: paid tier, `stripeSubscriptionId`, or active/past_due/canceled paid sub |
| Invoices + PDF             | Done    | Done*    | List + download **JSON `{ url }`**, not `application/pdf`. UI opens Stripe `pdfUrl`                 |
| Empty invoice state        | Done    | Done     | “Aucune facture pour le moment” + first-payment copy                                                |
| DOCX removed from sells    | Done    | Done     | Not in catalog entitlements; spec asserts no `docx`; paywall has no DOCX copy                       |
| `STRIPE_FAIL_CLOSED`       | Done    | Done     | `docker-compose.yml` `'1'`; `.env.production.example=1`; `.env.test` empty                          |
| Recommended badge          | Done    | Done     | Text **Recommandé** on Pro only                                                                     |
| Savings display            | Done    | Done     | “Économies : {amount}/an” + percent label                                                           |
| French CTAs (billing)      | Done    | Done     | “Passer à Pro/Business”. No “Upgrade to” under billing. Editor still has “Upgrade to Pro”           |
| Error + retry              | Done    | Done     | History error ≠ empty state                                                                         |
| Skeletons                  | Done    | Done*    | History + Suspense yes; plan-card skeleton mostly dead due to `initialData`                         |
| Business CTA               | Done    | Done     | `mailto:support@cvstudio.ai?subject=Support Business - CV Studio`                                   |
| Payment selector position  | Partial | Partial  | Still **after** plan cards (`page.tsx` ~552)                                                        |

- **Done:** 17/18
- **Partial:** 1 (CTA / selector order)
- **Missing:** 0
- **Verdict:** Audit claim **accurate (94%)**. Example numbers in the audit brief ($7.99, 4/8+ checks, PDF bytes) do not match the code.

---

## 3. Test Coverage Validation

### Backend tests (claimed 71 passed, 0 failed)

Command (pnpm does not expose `test:api`; Jest was invoked on the billing modules):

```text
npx jest --config jest.config.json src/modules/plans src/modules/subscriptions src/modules/invoices
```

**Result: 71 passed, 0 failed, 6 suites.** Matches the claim exactly.

Spot-checks:

| Test                                            | Present                                                         |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `toCatalogPlan` prices / entitlements / no DOCX | Yes (`plans.service.spec.ts`)                                   |
| 14-day trial + skip returning Stripe customer   | Yes                                                             |
| Fail-closed checkout blocks without Stripe      | Yes                                                             |
| `trialing` → `subscriptionTier: 'pro'`          | Yes (`grants Pro entitlements while Stripe status is trialing`) |
| Direct `isEligibleForStripeTrial` export        | No — private, tested via checkout                               |

**Coverage (those modules, excluding specs/modules):**

| Metric     | Value  |
| ---------- | ------ |
| Statements | 77.96% |
| Lines      | 79.54% |
| Functions  | 74.46% |
| Branches   | 70.62% |

In range of claimed 75–85% for statements/lines. Branches sit just under 75%. Weak spots: `invoices.controller.ts` **0%**, `subscriptions.service.ts` cancel / GDPR cancel / fail-open bypass largely untested.

**Jest open handles:** confirmed (`Force exiting Jest: Have you considered using --detectOpenHandles`). Listed as noise in the audit — **valid**.

`payments.service.spec.ts` (webhook retry / DLQ) exists but is **not** part of the 71.

### Frontend tests (claimed 0 unit)

- `apps/web/src/**/*.test.tsx` / `*.spec.tsx`: **0**
- Playwright: `e2e/pages/billing.page.ts`, `stripe-checkout.spec.ts`, upgrade/downgrade specs
- Gaps: no invoice PDF E2E, no trial assertion, no yearly Business click (`startBusinessCheckout` is monthly only)

**Verdict:** Unit-test claim accurate. E2E present but not re-run in this validation.

### Test quality: 8/10

**Strong:** catalog mapping, DOCX exclusion, Redis fallback, trial eligibility via checkout, fail-closed, Stripe return-URL allowlist, trialing entitlements, invoice 403/404.

**Weak:** invoices controller untested; invoice `list()` happy path uncovered (lines 11–15); `isEligibleForStripeTrial` not isolated; checkout Stripe-throw path untested; geo `it.each` lives in a backend spec.

---

## 4. Static Analysis Results

### TypeScript

- API `tsconfig` **strict: true** — `npx tsc -p tsconfig.json --noEmit` → **0 errors**
- Web same → **0 errors**
- There is no `apps/api/src/modules/billing/` glob; plans / subscriptions / invoices were typechecked via the project.

### ESLint

- `apps/api` plans / subscriptions / invoices: **0 errors** (`--max-warnings 0`)
- Billing / pricing / plan-cards / catalog on web: **0 errors**

### Security (`pnpm audit --prod --audit-level=high`)

**94 vulnerabilities: 5 low · 41 moderate · 47 high · 1 critical.**

The critical/high set is **monorepo platform** (node-tar, Next.js DoS/SSRF/middleware, Multer DoS, lodash template, Sentry→webpack→fast-uri). None are unique to `plan-catalog.ts` / the billing page. The audit claim “0 high/critical” is **false for the repo**, not evidence of a new billing defect.

Billing-relevant config **is** fail-closed in compose + production example.

### Complexity

| Function                                  | Assessment                                                  |
| ----------------------------------------- | ----------------------------------------------------------- |
| `SubscriptionsService.checkout`           | ~9 decision points — acceptable                             |
| `BillingPageContent` (render + 5 effects) | **Well above 10** — polling, geo, cancel, history, checkout |
| `toCatalogPlan`                           | Low                                                         |

---

## 5. Issues Found During Validation

| Issue                                                                                  | Severity | Audit listed?           | Status                                                                        |
| -------------------------------------------------------------------------------------- | -------- | ----------------------- | ----------------------------------------------------------------------------- |
| Payment selector after plan cards                                                      | Medium   | Yes                     | Confirmed                                                                     |
| Duplicate `CatalogPlan` / `CatalogPlanDto`                                             | Medium   | Yes (type drift)        | Confirmed                                                                     |
| Jest open handles                                                                      | Low      | Yes                     | Confirmed                                                                     |
| `page.tsx` size                                                                        | Medium   | Yes, but **705 vs 768** | Number wrong                                                                  |
| No React `error.tsx` / error boundary                                                  | Medium   | No                      | **Missed**                                                                    |
| Invoice download returns JSON URL, not PDF bytes                                       | Medium   | No                      | **Missed** (behavior still usable)                                            |
| `invoices.controller.ts` 0% coverage                                                   | Low      | No                      | **Missed**                                                                    |
| Plan skeletons skipped because of `initialData`                                        | Low      | No                      | **Missed**                                                                    |
| Checkout has no Stripe try/catch                                                       | Low      | Claimed present         | **Overclaimed**                                                               |
| Feature matrix “4 / 8+ checks”                                                         | Low      | Example in brief        | **Inaccurate**                                                                |
| Pro price $7.99                                                                        | Low      | Example in brief        | Product is **$9.99**                                                          |
| `as never` on Prisma upsert (L337/348)                                                 | Low      | Yes in brief            | Confirmed                                                                     |
| CinetPay checkout upserts `status: 'trialing'` on the **paid** plan row before payment | Medium   | No                      | **Missed** (tier still `user.subscriptionTier`, so not an entitlement bypass) |
| `pnpm audit` high/critical                                                             | Medium   | Implied 0               | **Inaccurate** for the monorepo                                               |
| “Upgrade to Pro” in `ExportPDFButton.tsx`                                              | Low      | Out of billing grep     | Adjacent leftover                                                             |

No new **blockers**. Oldest billing-page audit criticals (direct POST create, open redirect on Stripe success URL) appear **fixed** (`ForbiddenException` on create; `safeReturnUrl` on Stripe).

---

## 6. Validation Checklist

- [x] All 3 audit parts reviewed
- [x] Code quality scores verified (within 1 point except backend errors 8→7)
- [x] Feature completeness verified (17/18 = 94%)
- [x] Test claims verified (71/71 pass)
- [x] Static analysis run (tsc + eslint: 0 errors)
- [x] Known issues spot-checked
- [x] Missed issues documented (error boundary, invoice content-type, CinetPay placeholder row, audit CVE claim)
- [x] Overall audit accuracy: **HIGH**

---

## 7. Final Verdict

**Audit accuracy: HIGH (~92% of claims verified).**

The 94% feature score and the 71-test result are real, not inflated. Treat the original brief’s $7.99 / 4-check matrix / “download returns PDF” / “0 CVEs” lines as template leftovers, not as product truth.

### Recommendation

- **Staging merge:** Yes
- **Go/No-Go for staging:** Valid
- **Timeline:** Realistic for remaining UX (selector order) and tech debt (split `page.tsx`)
- **Before production:** add `app/(app)/account/billing/error.tsx` (or a layout error boundary); optionally stream or proxy invoice PDFs; decide whether CinetPay should insert a Free/pending row instead of `trialing` + paid `planId`
- **Separate track:** upgrade Next.js / Multer / tar after reviewing `pnpm audit`
