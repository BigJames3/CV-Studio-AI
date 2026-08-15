-- Marketplace seller ownership backfill.
-- Ops: take a DB backup before applying.
-- Official catalog seeds stay unowned (created_by NULL) so they cannot be listed.
-- Existing marketplace listings that already point at a non-catalog template
-- receive created_by = listing.seller_id.

UPDATE templates t
SET created_by = mt.seller_id
FROM marketplace_templates mt
WHERE mt.template_id = t.id
  AND t.created_by IS NULL
  AND t.id NOT IN (
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111102',
    '11111111-1111-4111-8111-111111111103',
    '11111111-1111-4111-8111-111111111104',
    '11111111-1111-4111-8111-111111111105'
  );
