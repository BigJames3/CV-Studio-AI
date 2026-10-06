# BILLING AUDIT VALIDATION REPORT

**Date:** 5 September 2026  
**Workspace branch:** `feature/billing-v2` @ `86fc8a0`  
**Audit under review:** Phase A & B billing redesign (claimed 17/18, 94%, 71 tests, no blockers)  
**Sibling branch the claims actually describe:** `feature/billing` @ `a650be9`  
**Method:** Source review, Jest (plans / subscriptions / invoices slice), `tsc --noEmit`, ESLint, live `/pricing` + `/account/billing` probe  
**Companion canvas:** open [billing audit validation](C:/Users/HP/.cursor/projects/d-Projets-CV-Studio-AI/canvases/billing-audit-validation.canvas.tsx) beside chat.

---

## Executive Summary

- **Audit findings:** **Inaccurate for this workspace.** Mostly accurate for `feature/billing`, which is not checked out.
- **Code quality score:** **58/100** (claimed 78)
- **Feature completeness:** **1 done / 6 partial / 11 missing of 18** (claimed 17/18)
- **Test coverage (claimed slice):** **42 passed, 0 failed** — not 71. Project-wide coverage from that run was **5.31% lines** (thresholds then failed on unrelated modules).
- **Overall accuracy:** **Low** for HEAD; **Medium–High** if the audit is reread as a `feature/billing` report.

**Go/No-Go for this branch:** **No-Go** as “Phase A/B complete”. Do not merge to staging under the 94% claim.

---

## 1. Code Quality Validation

### Backend Type Safety (Claimed: 8/10)

- **Actual score: 7/10** on existing subscription/invoice code; **cannot score 8/10 for a plans module that is absent**.
- Findings:
  - `CheckoutDto` uses `class-validator` (`@IsIn`) — DTO validation **yes**.
  - Production `any`: **0** in subscriptions/invoices services.
  - Production `as never`: **2** (`applyPaidEntitlement` Prisma upsert create/update payloads, `subscriptions.service.ts` ~318–329). Questionable — hides Prisma payload mismatch.
  - Spec `as never`: **7** (acceptable test doubles).
  - `isEligibleForStripeTrial`: **missing** on HEAD.
  - `apps/api/src/modules/plans/`: **does not exist** on HEAD (present on `feature/billing`).
- **Verdict:** Claim **not valid** for this tree (describes `feature/billing`).

### Frontend Type Safety (Claimed: 8/10)

- **Actual score: 7/10** for the files that exist.
- Findings:
  - `page.tsx`: **0** `any`. Hooks/API responses typed in `lib/api/index.ts`.
  - `plan-cards.tsx`, `pricing-plans.tsx`, `lib/billing/plans-catalog.ts`: **absent**.
  - `useQuery` for payments has no explicit error typing; `isError` is only used for `useMe`.
  - No `plansApi` / catalog DTO import.
- **Verdict:** Claim **not valid** (those components are on the other branch). Type hygiene of the monolith page is still decent.

### Error Handling (Claimed: 8/10 backend, 7/10 frontend)

- **Backend actual: 7/10**
  - Checkout: Nest exceptions (`NotFound`, `BadRequest` fail-closed). No try/catch around Stripe `sessions.create` (SDK errors bubble — acceptable).
  - GET /plans Redis fallback: **N/A** (no plans service).
  - Invoice `get`/`download`: `404` / `403` with codes — **yes**.
  - Webhooks: retry/DLQ live in `payments.service.ts` (outside the 71-test slice).
  - Fail-closed checkout: **not covered by a spec** on HEAD.
- **Frontend actual: 5/10**
  - Checkout `catch` sets a French `checkoutError` (error details swallowed).
  - Payments history: **no** `isError`, **no** retry, empty copy shown while loading.
  - No `invoicesApi` error path.
  - App `global-error.tsx` exists; **no** `app/(app)/error.tsx` for billing.
- **Verdict:** Backend claim **slightly high**; frontend claim **overstated**.

### Code Structure (Claimed: 9/10)

- `page.tsx`: **656 lines** (claimed 705 — that is `feature/billing` ~712 physical lines).
- `plan-cards.tsx` extracted: **no** (255 lines on `feature/billing` only).
- `PlansModule`: **no**.
- Circular deps: `SubscriptionsModule` ↔ `PaymentsModule` via `forwardRef` (pre-existing, testable with mocks).
- **Actual score: 5/10**
- **Verdict:** Claim **not valid** for HEAD.

---

## 2. Feature Completeness Validation

HEAD unless noted. `feature/billing` status in parentheses.

| Feature                         | Claimed | HEAD    | Other branch | Notes                                                                                     |
| ------------------------------- | ------- | ------- | ------------ | ----------------------------------------------------------------------------------------- |
| GET /plans `@Public`            | Done    | Missing | Present      | `PlansController` + Redis catalog only on `feature/billing`                               |
| Prices on /billing              | Done    | Missing | Present      | HEAD cards have no amounts. Other branch fallback is **$9.99 / $99**, not $7.99           |
| Prices on /pricing              | Done    | Partial | Present      | HEAD hardcoded `9,99$ / 29,99$`, not shared catalog                                       |
| Feature matrix                  | Done    | Missing | Present      | `CheckCircle2` / `XCircle` in `plan-cards.tsx` on other branch                            |
| Business yearly                 | Done    | Missing | Present      | `checkout-business-year` only on other branch                                             |
| 14-day trial                    | Done    | Missing | Present      | HEAD Checkout `subscription_data` has metadata only                                       |
| Trial skip returning users      | Done    | Missing | Present      | `isEligibleForStripeTrial` only on other branch                                           |
| Invoices + PDF UI               | Done    | Missing | Present      | HEAD uses `paymentsApi.history()`. API download returns Stripe URL JSON, not a PDF stream |
| Empty invoices fallback         | Done    | Partial | Present      | HEAD: “Aucune facture pour le moment” only                                                |
| DOCX removed from sells         | Done    | Partial | Present      | Entitlement `[]` on both; HEAD paywall still says “Export PDF & DOCX”                     |
| `STRIPE_FAIL_CLOSED` in Compose | Done    | Missing | Present      | HEAD Compose has `CINETPAY_FAIL_CLOSED` only                                              |
| Recommended badge               | Done    | Missing | Present      | “Recommandé” on other branch Pro card                                                     |
| Savings display                 | Done    | Missing | Present      | `(priceMonthly * 12) - annual`; Pro **$20.88/an** at 9.99×12−99                           |
| French CTAs                     | Done    | Partial | Present      | HEAD: **Upgrade to Business**                                                             |
| Empty-state copy (Après…)       | Done    | Missing | Present      | Other branch line ~742                                                                    |
| Error + retry                   | Done    | Missing | Present      | No `Réessayer` / `refetch` on history                                                     |
| Skeletons                       | Done    | Missing | Present      | Text loader only                                                                          |
| Payment selector                | Partial | Done    | Present      | Selector exists; CTA-vs-selector **order** is the original 1/18 gap on the redesign       |

**HEAD totals:** 1 done · 6 partial · 11 missing → **not 17/18 (94%)**.  
**`feature/billing` totals:** ~17/18 with 1 UX order gap, **if** you accept $9.99 instead of the $7.99 assertion in the audit prompt.

**Verdict:** Audit claim **inaccurate for the running tree**.

---

## 3. Test Coverage Validation

### Backend (claimed slice: plans + subscriptions + invoices)

Command:

```text
pnpm --filter @cvstudio/api exec jest --config jest.config.json src/modules/plans src/modules/subscriptions src/modules/invoices --coverage --forceExit
```

| Metric                         | Claimed             | Measured on HEAD                                                                                       |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------ |
| Tests                          | 71 passed           | **42 passed, 0 failed**                                                                                |
| Suites                         | 6                   | **2** (controller + service only)                                                                      |
| `plans/**/*.spec.ts`           | yes                 | **absent**                                                                                             |
| `invoices.service.spec.ts`     | yes                 | **absent**                                                                                             |
| `entitlements.service.spec.ts` | yes                 | **absent**                                                                                             |
| Coverage 75–85%                | module-scoped claim | Collecting default `src/**` → **5.31% lines**; Jest then **failed** AI/payments/marketplace thresholds |
| Worker leak                    | —                   | Force-exit warning (same as prior run)                                                                 |

Spot-checks on HEAD:

| Test                            | Present                                            |
| ------------------------------- | -------------------------------------------------- |
| `toCatalogPlan`                 | No (no plans module)                               |
| `isEligibleForStripeTrial`      | No                                                 |
| DOCX not sold                   | No dedicated spec; entitlement array is empty      |
| Fail-closed checkout            | No                                                 |
| Webhook trialing → entitlements | In `payments.service.spec.ts` (outside this slice) |

On `feature/billing`, `it(` counts: plans 7 + entitlements 10 + subscriptions 40 + invoices 5 = **62** explicit `it(`; a prior full Jest run today on that tree reported **71/71** (extra cases from `it.each` / extra assertions). That number is **not** reproducible on HEAD.

**Verdict:** 71-test claim **false for this workspace**. Tests that do exist **pass**.

### Frontend

- Unit tests under `apps/web/src`: **0** (claim accurate).
- Playwright: 11 billing-related specs (checkout, geo, plan limits, webhooks). **No** invoice PDF, **no** trial_period_days assertion, **no** `checkout-business-year`.

### Test quality (HEAD subscriptions specs)

- **Score: 8/10** for what they cover.
- **Strong:** return-URL allowlist, `cancelAtPeriodEnd`, paid-entitlement mapping, checkout routing Stripe vs CinetPay, DTO enum validation, POST `/subscriptions` 403.
- **Weak / missing:** trial, fail-closed, catalog, invoices, `as never` Prisma payloads.

---

## 4. Static Analysis Results

### TypeScript

- `pnpm --filter @cvstudio/api exec tsc -p tsconfig.json --noEmit` → **0 errors**
- `pnpm --filter @cvstudio/web exec tsc -p tsconfig.json --noEmit` → **0 errors**
- There is no `apps/api/src/modules/billing/` tree to run `tsc --strict` on.

### ESLint

- Claimed paths `src/modules/plans/` and `src/lib/billing/` → **ESLint error: no files matching pattern** (validates absence).
- Existing `subscriptions/` + `invoices/` → **0 errors** (`--max-warnings 0`).
- Existing billing page + `payment-selector` + pricing → **0 errors**.

### Security

- `pnpm audit --prod --audit-level=high` earlier today: **critical** `tar` (node-tar decompression DoS). Not billing-specific; still a prod-deps issue.
- Stripe: constructor + API `2025-02-24.acacia`, not `StripeClient`; no Customer Portal; no Tax registration check.

### Complexity

- `checkout()`: long but linear (method routing + fail-closed + session create). Cyclomatic **moderate**.
- `BillingPageContent`: **high** (geo, two pollers, checkout, cancel, banners). Fits the 656-LOC debt the original audit assigned to the _other_ page.

---

## 5. Issues Found During Validation

| Issue                                                                  | Severity | Audit listed?            | Status                                      |
| ---------------------------------------------------------------------- | -------- | ------------------------ | ------------------------------------------- |
| Audit measured `feature/billing`, workspace is `feature/billing-v2`    | Critical | No                       | **Missed** — invalidates 94% / 71 / 705 LOC |
| Paywall promises 14-day trial; Checkout never sets `trial_period_days` | Critical | No (on this tree)        | **Missed**                                  |
| `Upgrade to Business` English CTA                                      | High     | No                       | **Missed** on HEAD                          |
| Invoices API unused; empty state while loading                         | High     | Partially (older audits) | Still true                                  |
| Prices $9.99 not $7.99 even on redesign fallback                       | Medium   | No                       | Prompt assertion is wrong                   |
| Paywall still sells DOCX                                               | High     | Claimed fixed            | **False on HEAD**                           |
| `as never` upsert payloads                                             | Medium   | Sometimes                | Present                                     |
| CinetPay upserts `trialing` before payment                             | Medium   | No                       | **Missed**                                  |
| No billing `error.tsx` (only `global-error.tsx`)                       | Low      | Template mentioned       | Partial                                     |
| Jest force-exit / open handles                                         | Low      | Yes                      | Confirmed                                   |
| Compose missing `STRIPE_FAIL_CLOSED`                                   | High     | Claimed set              | **False on HEAD**                           |
| Invoice download is URL JSON, not generated PDF                        | Medium   | Overstated as “PDF”      | **Partial**                                 |

---

## 6. Validation Checklist

- [x] All 3 audit parts reviewed
- [x] Code quality scores verified (**not** within 1 point of claims)
- [x] Feature completeness verified (**not** 17/18 on HEAD)
- [x] Test claims verified (**42/42** in slice, **not** 71/71)
- [x] Static analysis run (tsc 0 errors; ESLint 0 on existing files; claimed dirs missing)
- [x] Known issues spot-checked
- [x] Major issues missed by audit: **yes** (wrong branch + false trial + English CTA)
- [x] Overall audit accuracy: **LOW** for HEAD

---

## 7. Final Verdict

**Audit accuracy: Low for the checked-out branch. Do not treat 94% / 71 tests / no blockers as current.**

Recommendation:

- **Not safe to merge this branch** as Phase A/B complete.
- **Go/No-Go in the original audit is invalid here**; it applies to `feature/billing` after a fresh pass (prices are 9.99, CTA order still partial, Tax/Portal still open).
- Timeline “ready for staging” is **not** realistic until that branch is landed or the P0 gaps on HEAD are implemented.
- Add a route-level error boundary if you keep the 656-line page.

### Suggested next step

Merge or cherry-pick `feature/billing` onto the running tree, then re-run this validation. Until then, the 71-test / 17/18 dashboard is a report on code that is **not** what localhost is serving.
