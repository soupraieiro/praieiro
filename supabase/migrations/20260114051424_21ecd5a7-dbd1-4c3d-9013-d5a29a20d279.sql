-- ============================================================
-- CORREÇÃO DE SEGURANÇA: Views com SECURITY INVOKER
-- ============================================================

-- Recriar views críticas com security_invoker = true

-- 1. View current_balances
DROP VIEW IF EXISTS public.current_balances CASCADE;
CREATE VIEW public.current_balances 
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (profile_id, currency) 
  profile_id,
  currency,
  balance_after AS balance,
  created_at AS last_updated
FROM public.ledger
ORDER BY profile_id, currency, created_at DESC;

-- 2. View current_state  
DROP VIEW IF EXISTS public.current_state CASCADE;
CREATE VIEW public.current_state
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (entity_id) 
  tx_id,
  entity_id,
  key_structure,
  payload,
  metadata,
  checksum,
  version,
  operation,
  created_at,
  created_by,
  is_anchored
FROM public.protocol_state
WHERE is_archived = false
ORDER BY entity_id, version DESC;

-- 3. View ecosystem_health
DROP VIEW IF EXISTS public.ecosystem_health CASCADE;
CREATE VIEW public.ecosystem_health
WITH (security_invoker = true)
AS
SELECT 
  (SELECT count(*) FROM public.profiles WHERE created_at > (now() - '30 days'::interval)) AS new_users_30d,
  (SELECT count(*) FROM public.vendors WHERE status = 'active') AS active_vendors,
  (SELECT count(*) FROM public.clients) AS total_clients,
  (SELECT COALESCE(sum(total_amount), 0) FROM public.orders WHERE created_at > (now() - '30 days'::interval)) AS gmv_30d,
  (SELECT count(*) FROM public.orders WHERE created_at > (now() - '30 days'::interval)) AS orders_30d,
  (SELECT param_value FROM public.protocol_parameters WHERE param_key = 'phase_current') AS current_phase,
  (SELECT param_value FROM public.protocol_parameters WHERE param_key = 'service_fee_base') AS current_service_fee,
  (SELECT param_value FROM public.protocol_parameters WHERE param_key = 'displacement_fee_per_meter') AS current_displacement_fee;

-- 4. View genre_analytics
DROP VIEW IF EXISTS public.genre_analytics CASCADE;
CREATE VIEW public.genre_analytics
WITH (security_invoker = true)
AS
SELECT 
  mg.genre_key,
  mg.genre_name,
  mg.genre_emoji,
  mg.play_count,
  mg.color_class,
  count(cyw.id) AS webhook_events,
  max(cyw.created_at) AS last_played
FROM public.music_genres mg
LEFT JOIN public.chat_youtube_webhook_events cyw ON cyw.genre = mg.genre_key
WHERE mg.is_active = true
GROUP BY mg.id, mg.genre_key, mg.genre_name, mg.genre_emoji, mg.play_count, mg.color_class
ORDER BY mg.play_count DESC;