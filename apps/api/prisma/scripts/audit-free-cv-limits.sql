-- Phase 5: free users over the 1-CV limit (active CVs only).
-- Expected after first enforcement: 0 rows. Do not auto-delete; grandfather extras.

SELECT
  u.id AS user_id,
  u.email,
  u.subscription_tier,
  COUNT(c.id) AS cv_count
FROM users u
JOIN cvs c ON c.user_id = u.id
WHERE u.subscription_tier = 'free'
  AND u.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY u.id, u.email, u.subscription_tier
HAVING COUNT(c.id) > 1;
