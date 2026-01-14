-- ============================================================
-- CORREÇÃO DE SEGURANÇA: Views restantes com SECURITY INVOKER
-- ============================================================

-- 1. protocol_parameters_current
DROP VIEW IF EXISTS public.protocol_parameters_current CASCADE;
CREATE VIEW public.protocol_parameters_current
WITH (security_invoker = true)
AS
SELECT param_key,
    param_name,
    param_value,
    param_unit,
    category,
    min_value,
    max_value,
    is_ai_adjustable,
    last_ai_adjustment,
    description,
    updated_at
FROM public.protocol_parameters
ORDER BY category, param_key;

-- 2. satoshi_audit_view
DROP VIEW IF EXISTS public.satoshi_audit_view CASCADE;
CREATE VIEW public.satoshi_audit_view
WITH (security_invoker = true)
AS
SELECT 'ledger'::text AS source_table,
    ledger.id AS record_id,
    ledger.satoshi_hash AS hash_value,
    ledger.created_at AS record_created,
    CASE WHEN ledger.satoshi_hash IS NULL THEN false ELSE true END AS integrity_valid
FROM public.ledger
UNION ALL
SELECT 'orders'::text AS source_table,
    orders.id AS record_id,
    orders.satoshi_hash AS hash_value,
    orders.created_at AS record_created,
    CASE WHEN orders.satoshi_hash IS NULL THEN false ELSE true END AS integrity_valid
FROM public.orders
UNION ALL
SELECT 'payments'::text AS source_table,
    payments.id AS record_id,
    payments.satoshi_hash AS hash_value,
    payments.created_at AS record_created,
    CASE WHEN payments.satoshi_hash IS NULL THEN false ELSE true END AS integrity_valid
FROM public.payments
UNION ALL
SELECT 'ai_council_information_flows'::text AS source_table,
    ai_council_information_flows.id AS record_id,
    ai_council_information_flows.satoshi_hash AS hash_value,
    ai_council_information_flows.created_at AS record_created,
    CASE WHEN ai_council_information_flows.satoshi_hash IS NULL THEN false ELSE true END AS integrity_valid
FROM public.ai_council_information_flows;

-- 3. social_feed_with_lastro
DROP VIEW IF EXISTS public.social_feed_with_lastro CASCADE;
CREATE VIEW public.social_feed_with_lastro
WITH (security_invoker = true)
AS
SELECT sp.id AS post_id,
    sp.content,
    sp.media_urls,
    sp.like_count,
    sp.comment_count,
    sp.repost_count,
    sp.created_at,
    sp.author_btc_lastro,
    sp.author_trust_at_post,
    sp.weighted_score,
    spr.id AS author_id,
    spr.username AS author_username,
    spr.display_name AS author_display_name,
    spr.avatar_url AS author_avatar,
    spr.btc_trust_score AS author_current_trust,
    spr.verified AS author_verified,
    spr.reputation_level AS author_reputation,
    public.get_btc_parity() AS current_btc_parity,
    sp.like_count::numeric * GREATEST(sp.author_btc_lastro, 0.00000001) AS weighted_relevance
FROM public.social_posts sp
JOIN public.social_profiles spr ON spr.id = sp.author_id
WHERE sp.visibility = 'public'::text AND (sp.expires_at IS NULL OR sp.expires_at > now())
ORDER BY (sp.like_count::numeric * GREATEST(sp.author_btc_lastro, 0.00000001)) DESC, sp.created_at DESC;

-- 4. v_compliance_audit
DROP VIEW IF EXISTS public.v_compliance_audit CASCADE;
CREATE VIEW public.v_compliance_audit
WITH (security_invoker = true)
AS
WITH balance_check AS (
    SELECT ledger.currency,
        sum(ledger.amount) AS net_balance,
        sum(CASE WHEN ledger.amount > 0::numeric THEN ledger.amount ELSE 0::numeric END) AS total_credits,
        sum(CASE WHEN ledger.amount < 0::numeric THEN abs(ledger.amount) ELSE 0::numeric END) AS total_debits,
        count(*) AS transaction_count,
        count(DISTINCT ledger.profile_id) AS unique_accounts,
        min(ledger.created_at) AS first_transaction,
        max(ledger.created_at) AS last_transaction
    FROM public.ledger
    GROUP BY ledger.currency
)
SELECT currency,
    net_balance,
    total_credits,
    total_debits,
    CASE
        WHEN abs(net_balance) < 0.01 THEN 'BALANCED'::text
        WHEN net_balance > 0::numeric THEN 'CREDIT_EXCESS'::text
        ELSE 'DEBIT_EXCESS'::text
    END AS system_status,
    transaction_count,
    unique_accounts,
    first_transaction,
    last_transaction,
    now() AS audit_timestamp
FROM balance_check;

-- 5. v_concha_supply
DROP VIEW IF EXISTS public.v_concha_supply CASCADE;
CREATE VIEW public.v_concha_supply
WITH (security_invoker = true)
AS
SELECT COALESCE(sum(CASE WHEN operation_type::text = 'mint'::text THEN amount ELSE 0::numeric END), 0::numeric) AS total_minted,
    COALESCE(sum(CASE WHEN operation_type::text = 'burn'::text THEN amount ELSE 0::numeric END), 0::numeric) AS total_burned,
    COALESCE(sum(CASE WHEN operation_type::text = 'mint'::text THEN amount ELSE - amount END), 0::numeric) AS current_supply,
    (SELECT concha_emissions_1.hard_cap FROM public.concha_emissions concha_emissions_1 ORDER BY concha_emissions_1.created_at DESC LIMIT 1) AS hard_cap,
    ((SELECT concha_emissions_1.hard_cap FROM public.concha_emissions concha_emissions_1 ORDER BY concha_emissions_1.created_at DESC LIMIT 1)) - COALESCE(sum(CASE WHEN operation_type::text = 'mint'::text THEN amount ELSE - amount END), 0::numeric) AS available_to_mint
FROM public.concha_emissions
WHERE operation_type::text = ANY (ARRAY['mint'::text, 'burn'::text]);

-- 6. v_user_transaction_security
DROP VIEW IF EXISTS public.v_user_transaction_security CASCADE;
CREATE VIEW public.v_user_transaction_security
WITH (security_invoker = true)
AS
SELECT id,
    profile_id,
    entry_type,
    amount,
    balance_after,
    currency,
    description,
    status,
    signature_hash,
    created_at,
    (left(signature_hash, 8) || '...'::text) || right(signature_hash, 8) AS hash_display
FROM public.ledger l
ORDER BY created_at DESC;

-- 7. vendor_ratings
DROP VIEW IF EXISTS public.vendor_ratings CASCADE;
CREATE VIEW public.vendor_ratings
WITH (security_invoker = true)
AS
SELECT vendor_id,
    avg(rating) AS average_rating,
    count(*) AS total_reviews
FROM public.reviews
GROUP BY vendor_id;

-- 8. vendors_location_precise (SEGURANÇA: restringir dados sensíveis)
DROP VIEW IF EXISTS public.vendors_location_precise CASCADE;
CREATE VIEW public.vendors_location_precise
WITH (security_invoker = true)
AS
SELECT v.profile_id,
    -- Não expor full_name e whatsapp para todos
    v.product_category,
    st_y(v.location::geometry) AS latitude,
    st_x(v.location::geometry) AS longitude,
    v.heading,
    v.speed,
    v.accuracy_radius,
    v.location_source,
    v.location_updated_at,
    v.status,
    EXTRACT(epoch FROM now() - v.location_updated_at)::integer AS location_age_seconds,
    CASE
        WHEN v.location_updated_at > (now() - '00:01:00'::interval) THEN 'fresh'::text
        WHEN v.location_updated_at > (now() - '00:05:00'::interval) THEN 'recent'::text
        WHEN v.location_updated_at > (now() - '00:15:00'::interval) THEN 'stale'::text
        ELSE 'outdated'::text
    END AS freshness
FROM public.vendors v
WHERE v.status::text = 'active'::text AND v.location IS NOT NULL;

-- 9. vendors_public (SEGURANÇA: remover dados sensíveis como email, phone, whatsapp)
DROP VIEW IF EXISTS public.vendors_public CASCADE;
CREATE VIEW public.vendors_public
WITH (security_invoker = true)
AS
SELECT v.profile_id,
    v.product_category,
    v.product_description,
    v.status,
    v.establishment_type,
    -- Localização aproximada (2 casas decimais = ~1km precisão)
    round(st_y(v.location::geometry)::numeric, 2) AS latitude,
    round(st_x(v.location::geometry)::numeric, 2) AS longitude,
    v.created_at
FROM public.vendors v
WHERE v.status::text = 'active'::text;