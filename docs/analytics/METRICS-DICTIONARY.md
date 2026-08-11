# Metrics dictionary — CV Studio AI

| Metric                   | Definition                                                              | Owner        |
| ------------------------ | ----------------------------------------------------------------------- | ------------ |
| **WAE**                  | Users with ≥1 `cv_section_edited` AND ≥1 `cv_preview_viewed` in last 7d | Data PM      |
| **Activated_24h**        | Completes activation funnel within 24h of `signup_succeeded`            | Growth       |
| **Free→Paid CVR 28d**    | Users with `checkout_succeeded` within 28d of signup / signups          | Growth       |
| **Paywall CVR**          | `checkout_succeeded` / `paywall_viewed` (same session or 7d)            | Growth       |
| **MRR**                  | Sum of active subscription MRR normalized monthly                       | Finance      |
| **ARPU**                 | MRR / # paid active accounts                                            | Finance      |
| **Logo churn (monthly)** | Canceled paid / paid at start of month                                  | Finance      |
| **Revenue churn**        | Lost MRR / starting MRR                                                 | Finance      |
| **LTV (quick)**          | ARPU × GM% × (1 / monthly churn)                                        | Finance+Data |
| **LTV90**                | Net revenue days 0–90 by cohort                                         | Data         |
| **CAC (blended)**        | Marketing+sales cost / new paid customers                               | Growth       |
| **LTV:CAC**              | LTV / CAC                                                               | Growth       |
| **NPS**                  | %9–10 − %0–6 over rolling responses 90d                                 | Data PM      |
| **K-factor**             | invites × conversion_to_signup                                          | Growth       |
| **AI apply rate**        | `ai_suggestion_applied` / `ai_feature_run`                              | Product      |

Update this dictionary before renaming metrics in dashboards.
