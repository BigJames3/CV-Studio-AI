# Event taxonomy — quick reference (v1.0)

Full narrative: [ANALYTICS-CV-STUDIO-AI.md](../ANALYTICS-CV-STUDIO-AI.md)

## Naming

- `object_action` snake_case
- Required super props: `platform`, `app_version`, `env`, `session_id`, `plan`
- Never: CV body, passwords, tokens, raw card data

## Inventory

### Acquisition

`page_viewed` · `cta_clicked` · `pricing_viewed` · `template_gallery_viewed`

### Auth

`signup_started` · `signup_succeeded` · `signup_failed` · `login_succeeded` · `login_failed` · `logout` · `onboarding_step_viewed` · `onboarding_completed` · `mfa_enabled` · `password_reset_requested`

### CV

`cv_created` · `cv_opened` · `cv_section_edited` · `cv_autosaved` · `cv_preview_viewed` · `cv_template_applied` · `cv_reordered` · `cv_deleted` · `cv_duplicated` · `cv_version_restored` · `cv_imported` · `cv_exported` · `cv_shared` · `cv_share_revoked` · `portfolio_published`

### AI

`ai_feature_opened` · `ai_feature_run` · `ai_suggestion_shown` · `ai_suggestion_applied` · `ai_suggestion_dismissed` · `ai_quota_hit` · `ats_score_viewed`

### Templates / marketplace

`template_viewed` · `template_previewed` · `marketplace_item_viewed` · `marketplace_purchase_started` · `marketplace_purchase_succeeded`

### Monetization

`paywall_viewed` · `paywall_cta_clicked` · `checkout_started` · `checkout_succeeded` · `checkout_failed` · `checkout_cancelled` · `subscription_renewed` · `subscription_canceled` · `subscription_reactivated` · `entitlement_changed` · `trial_started` · `trial_converted` · `invoice_paid`

### Growth

`notification_permission_prompted` · `notification_permission_result` · `push_notification_opened` · `email_clicked` · `referral_link_copied` · `referral_signup_attributed` · `offline_mode_entered` · `sync_completed`

### Voice of customer

`nps_prompt_shown` · `nps_submitted` · `nps_dismissed` · `csat_submitted` · `feedback_submitted`

### Experiments

`experiment_enrolled` · `experiment_exposure`
