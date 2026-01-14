-- =====================================================
-- PRAIEIRO - SCHEMA COMPLETO DO BANCO DE DADOS
-- Gerado em: 2026-01-08
-- =====================================================

-- =====================================================
-- 1. EXTENSÕES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis" SCHEMA extensions;

-- =====================================================
-- 2. ENUMS
-- =====================================================
CREATE TYPE public.account_type AS ENUM ('client', 'vendor', 'admin');
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'vendor', 'employee');
CREATE TYPE public.establishment_type AS ENUM ('ambulante', 'barraca', 'restaurante', 'bar', 'deposito');
CREATE TYPE public.transaction_type AS ENUM ('compra', 'venda');

-- =====================================================
-- 3. TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de perfis (central para usuários)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  phone VARCHAR(20),
  data_nascimento DATE,
  sexo VARCHAR(20),
  mother_name TEXT,
  profile_photo_url TEXT,
  wallet_public_key TEXT,
  account_types public.account_type[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles de usuários
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Identificadores de conta (chave pública PRA-...)
CREATE TABLE public.account_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id),
  public_key VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Praias
CREATE TABLE public.beaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beach_name VARCHAR(255) NOT NULL,
  city VARCHAR(100) DEFAULT 'Salvador',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clientes
CREATE TABLE public.clients (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id),
  preferred_beach_id UUID REFERENCES public.beaches(id),
  accepted_terms BOOLEAN DEFAULT false,
  accepted_terms_at TIMESTAMPTZ,
  terms_version VARCHAR(10) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendedores/Ambulantes
CREATE TABLE public.vendors (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id),
  product_category VARCHAR(100) NOT NULL,
  product_description TEXT,
  whatsapp_number VARCHAR(20) NOT NULL,
  establishment_type public.establishment_type,
  status VARCHAR(20) DEFAULT 'active',
  location GEOGRAPHY(Point, 4326),
  location_source VARCHAR(50),
  location_updated_at TIMESTAMPTZ,
  accuracy_radius NUMERIC,
  heading NUMERIC,
  speed NUMERIC,
  altitude NUMERIC,
  altitude_accuracy NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pedidos
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  total_amount NUMERIC(10,2),
  message TEXT,
  client_latitude NUMERIC,
  client_longitude NUMERIC,
  client_accuracy_radius NUMERIC,
  client_heading NUMERIC,
  client_speed NUMERIC,
  client_location_timestamp TIMESTAMPTZ,
  vendor_latitude NUMERIC,
  vendor_longitude NUMERIC,
  vendor_accuracy_radius NUMERIC,
  vendor_heading NUMERIC,
  vendor_location_timestamp TIMESTAMPTZ,
  distance_at_checkout NUMERIC,
  proximity_verified BOOLEAN DEFAULT false,
  proximity_verified_at TIMESTAMPTZ,
  location_auth_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens do pedido
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mensagens
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  sender_id UUID NOT NULL,
  sender_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Avaliações
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id),
  vendor_id UUID NOT NULL,
  client_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',
  category VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  related_order_id UUID REFERENCES public.orders(id),
  related_vendor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. TABELAS FINANCEIRAS
-- =====================================================

-- Ledger (livro-razão central)
CREATE TABLE public.ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  entry_type VARCHAR(20) NOT NULL,
  amount NUMERIC(18,8) NOT NULL,
  balance_after NUMERIC(18,8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'BRL',
  description TEXT,
  reference_type VARCHAR(50),
  reference_id UUID,
  origin_id UUID,
  idempotency_key UUID,
  signature_hash TEXT,
  metadata JSONB,
  status VARCHAR(20) DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pagamentos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'BRL',
  status VARCHAR(20) DEFAULT 'pending',
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transações
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  tipo public.transaction_type NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  descricao TEXT,
  status VARCHAR(20) DEFAULT 'pendente',
  data_transacao TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Carteiras de vendedores
CREATE TABLE public.vendor_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL UNIQUE,
  balance NUMERIC(10,2) DEFAULT 0,
  total_received NUMERIC(10,2) DEFAULT 0,
  total_withdrawn NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transações de vendedores
CREATE TABLE public.vendor_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  amount NUMERIC(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transferências de carteira
CREATE TABLE public.wallet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  recipient_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC(18,8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'BRL',
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  transaction_hash TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. SISTEMA DE CONCHAS (Programa de Fidelidade)
-- =====================================================

CREATE TABLE public.client_conchas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,
  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  total_deposited NUMERIC(10,2) DEFAULT 0,
  reais_balance NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.concha_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  amount NUMERIC(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.client_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  amount NUMERIC(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.concha_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type VARCHAR(20) NOT NULL,
  amount NUMERIC(18,8) NOT NULL,
  total_supply_after NUMERIC(18,8) NOT NULL,
  hard_cap NUMERIC(18,8) DEFAULT 1000000000,
  reason TEXT,
  authorized_by UUID REFERENCES public.profiles(id),
  signature_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. FEED E CONTEÚDO SOCIAL
-- =====================================================

CREATE TABLE public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  text_content TEXT,
  image_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.feed_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE public.feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.feed_comments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

CREATE TABLE public.cached_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  image_url TEXT,
  source TEXT,
  type VARCHAR(50) DEFAULT 'news',
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 7. ADMINISTRAÇÃO
-- =====================================================

CREATE TABLE public.admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  linked_client_id UUID,
  linked_vendor_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning',
  indicator_name TEXT,
  indicator_value NUMERIC,
  threshold_value NUMERIC,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_type VARCHAR(50) NOT NULL,
  goal_name TEXT NOT NULL,
  target_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'count',
  month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  can_view_users BOOLEAN DEFAULT false,
  can_edit_users BOOLEAN DEFAULT false,
  can_view_orders BOOLEAN DEFAULT true,
  can_view_transactions BOOLEAN DEFAULT false,
  can_edit_transactions BOOLEAN DEFAULT false,
  can_view_financial BOOLEAN DEFAULT false,
  can_edit_financial BOOLEAN DEFAULT false,
  can_view_messages BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 8. SEGURANÇA E AUDITORIA
-- =====================================================

CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type VARCHAR(50) NOT NULL,
  identifier TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.site_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_type VARCHAR(20),
  page_evaluated VARCHAR(100),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  design_rating INTEGER,
  functionality_rating INTEGER,
  ease_of_use INTEGER,
  would_recommend BOOLEAN,
  comment TEXT,
  suggestion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 9. LOCALIZAÇÃO E GEOLOCALIZAÇÃO
-- =====================================================

CREATE TABLE public.location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy_radius NUMERIC,
  heading NUMERIC,
  speed NUMERIC,
  altitude NUMERIC,
  source VARCHAR(50),
  session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.unified_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  place_type VARCHAR(50),
  google_place_id TEXT,
  mapbox_feature_id TEXT,
  metadata JSONB,
  search_count INTEGER DEFAULT 0,
  last_searched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.search_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID,
  query TEXT NOT NULL,
  search_source VARCHAR(50),
  result_count INTEGER,
  selected BOOLEAN DEFAULT false,
  place_id TEXT,
  place_name TEXT,
  place_type VARCHAR(50),
  latitude NUMERIC,
  longitude NUMERIC,
  flow_success BOOLEAN,
  error_type VARCHAR(50),
  device_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 10. INTEGRAÇÕES WHATSAPP
-- =====================================================

CREATE TABLE public.whatsapp_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  beach_id UUID REFERENCES public.beaches(id),
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  vendor_id UUID,
  pin_id UUID REFERENCES public.unified_pins(id),
  generated_link TEXT NOT NULL,
  map_link TEXT,
  message_template TEXT,
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 11. RELACIONAMENTOS ADICIONAIS
-- =====================================================

CREATE TABLE public.vendor_beach_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID,
  beach_id UUID REFERENCES public.beaches(id),
  is_listed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.client_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, vendor_id)
);

CREATE TABLE public.client_product_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  vendor_id UUID,
  beach_id UUID REFERENCES public.beaches(id),
  product_category VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.editable_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key VARCHAR(100) NOT NULL UNIQUE,
  content_type VARCHAR(50) DEFAULT 'text',
  content_value TEXT NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.system_vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_name VARCHAR(100) NOT NULL UNIQUE,
  vault_type VARCHAR(50) NOT NULL,
  balance NUMERIC(18,8) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'BRL',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 12. VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.current_balances AS
SELECT DISTINCT ON (profile_id, currency)
  profile_id,
  currency,
  balance_after AS balance,
  created_at AS last_updated
FROM public.ledger
ORDER BY profile_id, currency, created_at DESC;

CREATE OR REPLACE VIEW public.vendor_ratings AS
SELECT
  vendor_id,
  AVG(rating) AS average_rating,
  COUNT(*) AS total_reviews
FROM public.reviews
GROUP BY vendor_id;

CREATE OR REPLACE VIEW public.vendors_public AS
SELECT
  v.profile_id,
  p.full_name,
  p.email,
  p.phone,
  p.profile_photo_url,
  v.product_category,
  v.product_description,
  v.whatsapp_number,
  v.status,
  v.location,
  v.establishment_type,
  ST_Y(v.location::geometry) AS latitude,
  ST_X(v.location::geometry) AS longitude,
  v.created_at
FROM public.vendors v
JOIN public.profiles p ON v.profile_id = p.id
WHERE v.status = 'active';

CREATE OR REPLACE VIEW public.vendors_location_precise AS
SELECT
  v.profile_id,
  p.full_name,
  v.product_category,
  v.whatsapp_number,
  p.profile_photo_url,
  ST_Y(v.location::geometry) AS latitude,
  ST_X(v.location::geometry) AS longitude,
  v.heading,
  v.speed,
  v.accuracy_radius,
  v.location_source,
  v.location_updated_at,
  v.status,
  EXTRACT(EPOCH FROM (now() - v.location_updated_at))::integer AS location_age_seconds,
  CASE
    WHEN v.location_updated_at > now() - interval '1 minute' THEN 'fresh'
    WHEN v.location_updated_at > now() - interval '5 minutes' THEN 'recent'
    WHEN v.location_updated_at > now() - interval '15 minutes' THEN 'stale'
    ELSE 'outdated'
  END AS freshness
FROM public.vendors v
JOIN public.profiles p ON p.id = v.profile_id
WHERE v.status = 'active' AND v.location IS NOT NULL;

CREATE OR REPLACE VIEW public.v_concha_supply AS
SELECT
  COALESCE(SUM(CASE WHEN operation_type = 'mint' THEN amount ELSE 0 END), 0) AS total_minted,
  COALESCE(SUM(CASE WHEN operation_type = 'burn' THEN amount ELSE 0 END), 0) AS total_burned,
  COALESCE(SUM(CASE WHEN operation_type = 'mint' THEN amount ELSE -amount END), 0) AS current_supply,
  (SELECT hard_cap FROM public.concha_emissions ORDER BY created_at DESC LIMIT 1) AS hard_cap,
  (SELECT hard_cap FROM public.concha_emissions ORDER BY created_at DESC LIMIT 1) -
    COALESCE(SUM(CASE WHEN operation_type = 'mint' THEN amount ELSE -amount END), 0) AS available_to_mint
FROM public.concha_emissions
WHERE operation_type IN ('mint', 'burn');

CREATE OR REPLACE VIEW public.v_compliance_audit AS
WITH balance_check AS (
  SELECT
    currency,
    SUM(amount) AS net_balance,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_credits,
    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS total_debits,
    COUNT(*) AS transaction_count,
    COUNT(DISTINCT profile_id) AS unique_accounts,
    MIN(created_at) AS first_transaction,
    MAX(created_at) AS last_transaction
  FROM public.ledger
  GROUP BY currency
)
SELECT
  currency,
  net_balance,
  total_credits,
  total_debits,
  CASE
    WHEN ABS(net_balance) < 0.01 THEN 'BALANCED'
    WHEN net_balance > 0 THEN 'CREDIT_EXCESS'
    ELSE 'DEBIT_EXCESS'
  END AS system_status,
  transaction_count,
  unique_accounts,
  first_transaction,
  last_transaction,
  now() AS audit_timestamp
FROM balance_check;

CREATE OR REPLACE VIEW public.v_user_transaction_security AS
SELECT
  id,
  profile_id,
  entry_type,
  amount,
  balance_after,
  currency,
  description,
  status,
  signature_hash,
  created_at,
  LEFT(signature_hash, 8) || '...' || RIGHT(signature_hash, 8) AS hash_display
FROM public.ledger
ORDER BY created_at DESC;

-- =====================================================
-- 13. FUNÇÕES
-- =====================================================

-- Função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Função generate_account_identifier
CREATE OR REPLACE FUNCTION public.generate_account_identifier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_key VARCHAR(64);
BEGIN
  new_key := encode(digest(NEW.id::text || now()::text || random()::text, 'sha256'), 'hex');
  new_key := 'PRA-' || substr(new_key, 1, 8) || '-' || substr(new_key, 9, 4) || '-' || substr(new_key, 13, 4);
  
  INSERT INTO public.account_identifiers (profile_id, public_key)
  VALUES (NEW.id, new_key)
  ON CONFLICT (profile_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Função execute_secure_transfer
CREATE OR REPLACE FUNCTION public.execute_secure_transfer(
  p_from_profile_id UUID,
  p_to_profile_id UUID,
  p_amount NUMERIC,
  p_currency VARCHAR DEFAULT 'BRL',
  p_description TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT 'transfer',
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_from_balance NUMERIC;
  v_to_balance_after NUMERIC;
  v_from_balance_after NUMERIC;
  v_debit_id UUID;
  v_credit_id UUID;
  v_signature_hash TEXT;
  v_timestamp TIMESTAMPTZ := now();
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.ledger WHERE idempotency_key = p_idempotency_key) THEN
      RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_TRANSACTION');
    END IF;
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_from_balance
  FROM public.ledger
  WHERE profile_id = p_from_profile_id AND currency = p_currency;

  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE');
  END IF;

  v_from_balance_after := v_from_balance - p_amount;
  
  SELECT COALESCE(SUM(amount), 0) + p_amount INTO v_to_balance_after
  FROM public.ledger
  WHERE profile_id = p_to_profile_id AND currency = p_currency;

  v_debit_id := gen_random_uuid();
  v_credit_id := gen_random_uuid();

  v_signature_hash := encode(sha256((v_debit_id::text || v_credit_id::text || p_amount::text || v_timestamp::text)::bytea), 'hex');

  INSERT INTO public.ledger (id, profile_id, entry_type, amount, balance_after, currency, description, reference_type, reference_id, idempotency_key, signature_hash, status, origin_id, created_at)
  VALUES (v_debit_id, p_from_profile_id, 'debit', -p_amount, v_from_balance_after, p_currency, COALESCE(p_description, 'Transferência enviada'), p_reference_type, p_reference_id, p_idempotency_key, v_signature_hash, 'confirmed', v_credit_id, v_timestamp);

  INSERT INTO public.ledger (id, profile_id, entry_type, amount, balance_after, currency, description, reference_type, reference_id, signature_hash, status, origin_id, created_at)
  VALUES (v_credit_id, p_to_profile_id, 'credit', p_amount, v_to_balance_after, p_currency, COALESCE(p_description, 'Transferência recebida'), p_reference_type, p_reference_id, v_signature_hash, 'confirmed', v_debit_id, v_timestamp);

  RETURN jsonb_build_object('success', true, 'debit_id', v_debit_id, 'credit_id', v_credit_id, 'signature_hash', v_signature_hash);
END;
$$;

-- Função find_nearby_vendors
CREATE OR REPLACE FUNCTION public.find_nearby_vendors(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE(
  profile_id UUID,
  distance_meters DOUBLE PRECISION,
  full_name TEXT,
  email TEXT,
  phone VARCHAR,
  product_category VARCHAR,
  whatsapp_number VARCHAR,
  profile_photo_url TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.profile_id,
    ST_Distance(v.location::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_meters,
    p.full_name,
    p.email,
    p.phone,
    v.product_category,
    v.whatsapp_number,
    p.profile_photo_url
  FROM public.vendors v
  JOIN public.profiles p ON v.profile_id = p.id
  WHERE v.status = 'active'
    AND ST_DWithin(v.location::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
  ORDER BY distance_meters ASC;
END;
$$;

-- Função check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM public.rate_limits
  WHERE identifier = p_identifier AND action = p_action AND window_start > v_window_start;
  
  IF v_count < p_max_requests THEN
    INSERT INTO public.rate_limits (identifier, action, window_start) VALUES (p_identifier, p_action, now());
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Função cleanup_rate_limits
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Função add_conchas_on_order_complete
CREATE OR REPLACE FUNCTION public.add_conchas_on_order_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conchas_to_add INTEGER;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    conchas_to_add := FLOOR(COALESCE(NEW.total_amount, 10) / 10);
    
    IF conchas_to_add > 0 THEN
      INSERT INTO public.client_conchas (client_id, balance, total_earned)
      VALUES (NEW.client_id, conchas_to_add, conchas_to_add)
      ON CONFLICT (client_id)
      DO UPDATE SET 
        balance = client_conchas.balance + conchas_to_add,
        total_earned = client_conchas.total_earned + conchas_to_add,
        updated_at = now();
      
      INSERT INTO public.concha_transactions (client_id, order_id, amount, type, description)
      VALUES (NEW.client_id, NEW.id, conchas_to_add, 'earned', 'Conchas ganhas pelo pedido');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Função validate_feed_post
CREATE OR REPLACE FUNCTION public.validate_feed_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.text_content IS NOT NULL AND length(NEW.text_content) > 30 THEN
    RAISE EXCEPTION 'Legenda deve ter no máximo 30 caracteres';
  END IF;
  RETURN NEW;
END;
$$;

-- Função validate_feed_comment
CREATE OR REPLACE FUNCTION public.validate_feed_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.content) > 20 THEN
    RAISE EXCEPTION 'Comentário deve ter no máximo 20 caracteres';
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- 14. TRIGGERS
-- =====================================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_profile_created_generate_key
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION generate_account_identifier();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_add_conchas_on_order_complete
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION add_conchas_on_order_complete();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_wallets_updated_at
  BEFORE UPDATE ON public.vendor_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feed_posts_updated_at
  BEFORE UPDATE ON public.feed_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER validate_feed_post_trigger
  BEFORE INSERT OR UPDATE ON public.feed_posts
  FOR EACH ROW EXECUTE FUNCTION validate_feed_post();

CREATE TRIGGER validate_feed_comment_trigger
  BEFORE INSERT OR UPDATE ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION validate_feed_comment();

CREATE TRIGGER update_admin_goals_updated_at
  BEFORE UPDATE ON public.admin_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_pins_updated_at
  BEFORE UPDATE ON public.unified_pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 15. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_conchas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concha_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concha_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_beach_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_product_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editable_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_vaults ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Políticas para user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Políticas para account_identifiers
CREATE POLICY "Users can view own identifier" ON public.account_identifiers
  FOR SELECT USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all identifiers" ON public.account_identifiers
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Políticas para beaches
CREATE POLICY "Anyone can view active beaches" ON public.beaches
  FOR SELECT USING (is_active = true OR auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage beaches" ON public.beaches
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Políticas para clients
CREATE POLICY "Users can view own client data" ON public.clients
  FOR SELECT USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own client data" ON public.clients
  FOR ALL USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all clients" ON public.clients
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Políticas para vendors
CREATE POLICY "Anyone can view active vendors" ON public.vendors
  FOR SELECT USING (status = 'active');
CREATE POLICY "Vendors can manage own data" ON public.vendors
  FOR ALL USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all vendors" ON public.vendors
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Políticas para products
CREATE POLICY "Anyone can view available products" ON public.products
  FOR SELECT USING (is_available = true);
CREATE POLICY "Vendors can manage own products" ON public.products
  FOR ALL USING (vendor_id IN (SELECT profile_id FROM public.vendors WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Políticas para orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (
    client_id IN (SELECT profile_id FROM public.clients WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
    OR vendor_id IN (SELECT profile_id FROM public.vendors WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (client_id IN (SELECT profile_id FROM public.clients WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Políticas para messages
CREATE POLICY "Users can view messages from own orders" ON public.messages
  FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE 
    client_id IN (SELECT profile_id FROM public.clients WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
    OR vendor_id IN (SELECT profile_id FROM public.vendors WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))));
CREATE POLICY "Users can send messages to own orders" ON public.messages
  FOR INSERT WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE 
    client_id IN (SELECT profile_id FROM public.clients WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
    OR vendor_id IN (SELECT profile_id FROM public.vendors WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))));

-- Políticas para notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Políticas para feed_posts
CREATE POLICY "Anyone can view posts" ON public.feed_posts
  FOR SELECT USING (expires_at IS NULL OR expires_at > now());
CREATE POLICY "Users can create posts" ON public.feed_posts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own posts" ON public.feed_posts
  FOR DELETE USING (user_id = auth.uid());

-- Políticas para feed_likes
CREATE POLICY "Anyone can view likes" ON public.feed_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON public.feed_likes
  FOR ALL USING (user_id = auth.uid());

-- Políticas para feed_comments
CREATE POLICY "Anyone can view comments" ON public.feed_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.feed_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own comments" ON public.feed_comments
  FOR DELETE USING (user_id = auth.uid());

-- Políticas para cached_news
CREATE POLICY "Anyone can view cached news" ON public.cached_news
  FOR SELECT USING (expires_at IS NULL OR expires_at > now());

-- Políticas para admin tables
CREATE POLICY "Admins can manage admin_accounts" ON public.admin_accounts
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage admin_alerts" ON public.admin_alerts
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage admin_goals" ON public.admin_goals
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Políticas para employee_permissions
CREATE POLICY "Admins can manage employee permissions" ON public.employee_permissions
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees can view own permissions" ON public.employee_permissions
  FOR SELECT USING (user_id = auth.uid());

-- Políticas para wallet_transfers
CREATE POLICY "Users can view own transfers" ON public.wallet_transfers
  FOR SELECT USING (
    sender_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR recipient_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can create transfers from own wallet" ON public.wallet_transfers
  FOR INSERT WITH CHECK (sender_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all transfers" ON public.wallet_transfers
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Políticas para ledger
CREATE POLICY "Users can view own ledger" ON public.ledger
  FOR SELECT USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all ledger" ON public.ledger
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Políticas para site_evaluations
CREATE POLICY "Anyone can create evaluations" ON public.site_evaluations
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view evaluations" ON public.site_evaluations
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Políticas para client_favorites
CREATE POLICY "Users can view own favorites" ON public.client_favorites
  FOR SELECT USING (client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own favorites" ON public.client_favorites
  FOR ALL USING (client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 16. ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_location ON public.vendors USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_ledger_profile_id ON public.ledger(profile_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON public.ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON public.feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_expires_at ON public.feed_posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier, action);

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================
