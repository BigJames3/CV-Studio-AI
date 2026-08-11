-- CV Studio AI — Seed plans (Free / Pro / Business)

INSERT INTO plans (
  id, name, description,
  price_monthly, price_yearly, cv_limit,
  ai_features, priority_support, custom_domain,
  marketplace_access, api_access, is_active
) VALUES
(
  gen_random_uuid(),
  'Free',
  '1 CV, 5 templates, PDF export, no AI',
  0, 0, 1,
  false, false, false, false, false, true
),
(
  gen_random_uuid(),
  'Pro',
  'Unlimited CVs, 50+ templates, all AI features, ATS, portfolio',
  9.99, 99.00, 999999,
  true, true, false, true, false, true
),
(
  gen_random_uuid(),
  'Business',
  'Everything in Pro + team collab, analytics, API, branding',
  29.99, 299.00, 999999,
  true, true, true, true, true, true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  cv_limit = EXCLUDED.cv_limit,
  ai_features = EXCLUDED.ai_features,
  priority_support = EXCLUDED.priority_support,
  custom_domain = EXCLUDED.custom_domain,
  marketplace_access = EXCLUDED.marketplace_access,
  api_access = EXCLUDED.api_access,
  is_active = EXCLUDED.is_active;
