CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'client',
    'vendor',
    'admin'
);


--
-- Name: ai_decision_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_decision_scope AS ENUM (
    'user_impact',
    'price_modification',
    'visibility_change',
    'access_control',
    'global_parameter'
);


--
-- Name: amendment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.amendment_status AS ENUM (
    'draft',
    'simulation',
    'public_review',
    'voting',
    'approved',
    'rejected',
    'implemented',
    'revoked'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'vendor',
    'employee'
);


--
-- Name: arbitration_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.arbitration_status AS ENUM (
    'submitted',
    'under_review',
    'panel_assigned',
    'deliberating',
    'decision_made',
    'appealed',
    'final',
    'closed'
);


--
-- Name: consequence_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consequence_type AS ENUM (
    'rollback',
    'scope_limitation',
    'privilege_reduction',
    'public_record',
    'suspension',
    'audit_required'
);


--
-- Name: critical_state_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.critical_state_category AS ENUM (
    'financial_loss',
    'rights_violation',
    'systemic_instability',
    'reputation_damage'
);


--
-- Name: dissolution_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dissolution_status AS ENUM (
    'operational',
    'warning',
    'preparing_dissolution',
    'dissolving',
    'dissolved',
    'archived'
);


--
-- Name: establishment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.establishment_type AS ENUM (
    'ambulante',
    'barraca',
    'restaurante',
    'bar',
    'deposito'
);


--
-- Name: human_verification_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.human_verification_level AS ENUM (
    'unverified',
    'basic',
    'standard',
    'verified',
    'sovereign'
);


--
-- Name: predatory_practice; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.predatory_practice AS ENUM (
    'cognitive_bias_exploitation',
    'psychological_dependency',
    'exit_penalty',
    'asymmetric_power',
    'growth_at_all_costs'
);


--
-- Name: responsibility_agent_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.responsibility_agent_type AS ENUM (
    'ai_agent',
    'human_operator',
    'founder',
    'system'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'compra',
    'venda'
);


--
-- Name: activate_monetization_phase(integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.activate_monetization_phase(p_phase_number integer, p_admin_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Desativar fase atual
  UPDATE public.monetization_phases
  SET is_active = false,
      updated_at = now()
  WHERE is_active = true;
  
  -- Ativar nova fase
  UPDATE public.monetization_phases
  SET is_active = true,
      activated_at = now(),
      activated_by = p_admin_id,
      satoshi_hash = encode(sha256(concat(id::text, p_admin_id::text, now()::text)::bytea), 'hex'),
      updated_at = now()
  WHERE phase_number = p_phase_number
  RETURNING jsonb_build_object(
    'phase_number', phase_number,
    'phase_name', phase_name,
    'transaction_fee_cents', transaction_fee_cents,
    'chat_sentinel_enabled', chat_sentinel_enabled
  ) INTO v_result;
  
  -- Marcar marco como aprovado
  UPDATE public.registration_milestones
  SET admin_approved = true,
      approved_by = p_admin_id,
      approved_at = now()
  WHERE phase_to_activate = p_phase_number;
  
  RETURN v_result;
END;
$$;


--
-- Name: add_conchas_on_order_complete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_conchas_on_order_complete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  order_value DECIMAL := 10.00; -- Valor padrão por pedido
  conchas_to_add INTEGER;
BEGIN
  -- Só processa se o status mudou para 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calcula conchas (1 concha a cada R$10)
    conchas_to_add := FLOOR(order_value / 10);
    
    IF conchas_to_add > 0 THEN
      -- Insere ou atualiza saldo de conchas
      INSERT INTO public.client_conchas (client_id, balance, total_earned)
      VALUES (NEW.client_id, conchas_to_add, conchas_to_add)
      ON CONFLICT (client_id)
      DO UPDATE SET 
        balance = client_conchas.balance + conchas_to_add,
        total_earned = client_conchas.total_earned + conchas_to_add,
        updated_at = now();
      
      -- Registra transação
      INSERT INTO public.concha_transactions (client_id, order_id, amount, type, description)
      VALUES (NEW.client_id, NEW.id, conchas_to_add, 'earned', 'Conchas ganhas pelo pedido');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$_$;


--
-- Name: apply_ai_dilution(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_ai_dilution() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_human INTEGER;
    v_target INTEGER;
BEGIN
    SELECT COALESCE(SUM(voting_power),0)
    INTO v_human
    FROM public.constitutional_signatories
    WHERE role <> 'AI_GUARDIAN' AND is_active;

    v_target := GREATEST(1, LEAST(49, (v_human * 10) / 100));

    UPDATE public.constitutional_signatories
    SET voting_power = v_target
    WHERE role = 'AI_GUARDIAN' AND is_active;
END;
$$;


--
-- Name: audit_log_integrity(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_log_integrity(p_hours integer DEFAULT 24) RETURNS TABLE(log_id uuid, is_valid boolean, log_severity text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    CASE 
      WHEN l.satoshi_hash IS NULL THEN false
      ELSE l.satoshi_hash = encode(sha256(
        (l.id::text || COALESCE(l.log_message, '') || l.created_at::text)::bytea
      ), 'hex')
    END as is_valid,
    l.log_severity,
    l.created_at
  FROM sys_orch_logs l
  WHERE l.created_at >= now() - (p_hours || ' hours')::interval
  ORDER BY l.created_at DESC;
END;
$$;


--
-- Name: audit_new_video(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_new_video() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.ai_council_events (
    agent_id, event_type, target_type, target_id, decision_payload, project_id
  ) VALUES (
    'youtube-indexer', 'video_indexed', 'youtube_video', NEW.video_id,
    jsonb_build_object(
      'title', NEW.title,
      'channel_id', NEW.channel_id,
      'beach_id', NEW.beach_id,
      'view_count', NEW.view_count,
      'trust_multiplier', NEW.trust_multiplier,
      'video_type', NEW.video_type
    ),
    'kaizpbklfejiqpruwnxi'
  );
  RETURN NEW;
END;
$$;


--
-- Name: audit_wallet_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_wallet_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.balance_brl != NEW.balance_brl THEN
    INSERT INTO public.ai_council_events (
      event_type, agent_id, target_type, target_id, decision_payload, btc_context, user_id
    ) VALUES (
      'wallet_balance_change',
      'system_audit',
      'wallet',
      NEW.id,
      jsonb_build_object(
        'old_balance', OLD.balance_brl,
        'new_balance', NEW.balance_brl,
        'delta', NEW.balance_brl - OLD.balance_brl
      ),
      jsonb_build_object(
        'old_btc', OLD.btc_equivalent,
        'new_btc', NEW.btc_equivalent,
        'parity', public.get_btc_parity()
      ),
      (SELECT user_id FROM public.profiles WHERE id = NEW.profile_id)
    );
    
    -- Sincronizar lastro automaticamente
    PERFORM public.sync_social_lastro(NEW.profile_id);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: bulk_sync_profiles(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bulk_sync_profiles(p_profiles jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_profile JSONB;
  v_result JSONB;
  v_results JSONB := '[]'::jsonb;
  v_success_count INT := 0;
  v_error_count INT := 0;
BEGIN
  -- Iterar sobre cada perfil no array
  FOR v_profile IN SELECT * FROM jsonb_array_elements(p_profiles)
  LOOP
    v_result := public.sync_profile_from_external(
      p_user_id := (v_profile->>'user_id')::UUID,
      p_full_name := v_profile->>'full_name',
      p_email := v_profile->>'email',
      p_phone := v_profile->>'phone',
      p_cpf := v_profile->>'cpf',
      p_data_nascimento := (v_profile->>'data_nascimento')::DATE,
      p_sexo := v_profile->>'sexo',
      p_mother_name := v_profile->>'mother_name',
      p_profile_photo_url := v_profile->>'profile_photo_url',
      p_user_type := v_profile->>'user_type',
      p_metadata := v_profile->'metadata'
    );
    
    v_results := v_results || v_result;
    
    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total', jsonb_array_length(p_profiles),
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', v_results
  );
END;
$$;


--
-- Name: calculate_btc_equivalent(numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_btc_equivalent(p_brl_amount numeric) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_parity NUMERIC;
BEGIN
  v_parity := public.get_btc_parity();
  IF v_parity > 0 THEN
    RETURN p_brl_amount / v_parity;
  END IF;
  RETURN 0;
END;
$$;


--
-- Name: calculate_daily_health_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_daily_health_score() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total INTEGER;
  v_success INTEGER;
  v_failed INTEGER;
  v_critical INTEGER;
  v_warnings INTEGER;
  v_avg_time NUMERIC;
  v_score NUMERIC;
  v_hash TEXT;
BEGIN
  -- Contar logs das últimas 24h
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE log_stage = 'COMPLETE'),
    COUNT(*) FILTER (WHERE log_stage = 'ERROR'),
    COUNT(*) FILTER (WHERE log_severity = 'critical'),
    COUNT(*) FILTER (WHERE log_severity = 'warn'),
    COALESCE(AVG(execution_time_ms), 0)
  INTO v_total, v_success, v_failed, v_critical, v_warnings, v_avg_time
  FROM sys_orch_logs
  WHERE created_at >= now() - INTERVAL '24 hours';

  -- Calcular score (100 base, -10 por erro, -20 por crítico)
  v_score := GREATEST(0, 100 - (v_failed * 10) - (v_critical * 20) - (v_warnings * 2));
  
  -- Gerar hash
  v_hash := encode(sha256((now()::text || v_score::text)::bytea), 'hex');

  -- Inserir ou atualizar métricas do dia
  INSERT INTO sys_health_metrics (
    metric_date, total_executions, successful_executions, failed_executions,
    critical_errors, warnings, avg_execution_time_ms, health_score, satoshi_hash
  ) VALUES (
    CURRENT_DATE, v_total, v_success, v_failed, v_critical, v_warnings, v_avg_time, v_score, v_hash
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    total_executions = EXCLUDED.total_executions,
    successful_executions = EXCLUDED.successful_executions,
    failed_executions = EXCLUDED.failed_executions,
    critical_errors = EXCLUDED.critical_errors,
    warnings = EXCLUDED.warnings,
    avg_execution_time_ms = EXCLUDED.avg_execution_time_ms,
    health_score = EXCLUDED.health_score,
    calculated_at = now(),
    satoshi_hash = EXCLUDED.satoshi_hash;

  RETURN jsonb_build_object(
    'health_score', v_score,
    'total_executions', v_total,
    'success_rate', CASE WHEN v_total > 0 THEN round((v_success::numeric / v_total) * 100, 2) ELSE 100 END,
    'critical_errors', v_critical,
    'satoshi_hash', v_hash
  );
END;
$$;


--
-- Name: calculate_distance_km(double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_distance_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision) RETURNS double precision
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN ST_DistanceSphere(
        ST_MakePoint(lon1, lat1),
        ST_MakePoint(lon2, lat2)
    ) / 1000.0;
END;
$$;


--
-- Name: calculate_satoshi_equivalent(numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_satoshi_equivalent(p_brl_amount numeric) RETURNS bigint
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN (public.calculate_btc_equivalent(p_brl_amount) * 100000000)::BIGINT;
END;
$$;


--
-- Name: calculate_transaction_fee(uuid, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_transaction_fee(p_user_id uuid, p_transaction_amount numeric, p_linear_meters numeric DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_governance system_governance%ROWTYPE;
  v_is_god_mode boolean;
  v_fee numeric := 0;
  v_hash text;
BEGIN
  SELECT * INTO v_governance FROM system_governance LIMIT 1;

  SELECT god_mode_bypass INTO v_is_god_mode 
  FROM profiles WHERE id = p_user_id;

  IF v_is_god_mode = true THEN
    v_fee := 1.00 + (p_linear_meters * 0.01);
    v_hash := encode(sha256(convert_to(p_user_id::text || v_fee::text || now()::text, 'UTF8')), 'hex');
    RETURN jsonb_build_object('fee', v_fee, 'god_mode', true, 'satoshi_hash', v_hash);
  END IF;

  CASE v_governance.current_phase
    WHEN 0 THEN v_fee := 0;
    WHEN 1 THEN v_fee := 0.01;
    WHEN 2 THEN v_fee := 0.01 + (p_linear_meters * 0.01);
    WHEN 3 THEN 
      v_fee := GREATEST(v_governance.dynamic_min_fee, 
               LEAST(v_governance.dynamic_max_fee, p_transaction_amount * 0.01));
      v_fee := v_fee + (p_linear_meters * 0.01);
    WHEN 4 THEN 
      v_fee := 1.00 + (p_linear_meters * 0.01);
    ELSE v_fee := 0;
  END CASE;

  v_hash := encode(sha256(convert_to(p_user_id::text || v_fee::text || now()::text, 'UTF8')), 'hex');

  RETURN jsonb_build_object(
    'fee', v_fee,
    'phase', v_governance.current_phase,
    'god_mode', false,
    'satoshi_hash', v_hash
  );
END;
$$;


--
-- Name: calculate_video_engagement(bigint, bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_video_engagement(p_view_count bigint, p_like_count bigint, p_comment_count bigint) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_engagement NUMERIC;
BEGIN
  IF p_view_count > 0 THEN
    v_engagement := ((p_like_count * 10.0 + p_comment_count * 20.0) / p_view_count) * 1000;
  ELSE
    v_engagement := 0;
  END IF;
  RETURN ROUND(v_engagement, 4);
END;
$$;


--
-- Name: calculate_vincenty_distance(double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_vincenty_distance(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision) RETURNS double precision
    LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  a double precision := 6378137.0; -- WGS-84 semi-major axis (meters)
  f double precision := 1/298.257223563; -- WGS-84 flattening
  b double precision := 6356752.314245; -- WGS-84 semi-minor axis
  phi1 double precision;
  phi2 double precision;
  L double precision;
  U1 double precision;
  U2 double precision;
  sinU1 double precision;
  cosU1 double precision;
  sinU2 double precision;
  cosU2 double precision;
  lambda double precision;
  lambda_prev double precision;
  sin_lambda double precision;
  cos_lambda double precision;
  sin_sigma double precision;
  cos_sigma double precision;
  sigma double precision;
  sin_alpha double precision;
  cos_sq_alpha double precision;
  cos_2_sigma_m double precision;
  C double precision;
  u_sq double precision;
  A_const double precision;
  B_const double precision;
  delta_sigma double precision;
  distance double precision;
  iteration_limit integer := 100;
  i integer := 0;
BEGIN
  -- Convert to radians
  phi1 := lat1 * pi() / 180;
  phi2 := lat2 * pi() / 180;
  L := (lon2 - lon1) * pi() / 180;
  
  -- Reduced latitudes
  U1 := atan((1 - f) * tan(phi1));
  U2 := atan((1 - f) * tan(phi2));
  
  sinU1 := sin(U1);
  cosU1 := cos(U1);
  sinU2 := sin(U2);
  cosU2 := cos(U2);
  
  lambda := L;
  
  -- Iterative solution
  LOOP
    lambda_prev := lambda;
    sin_lambda := sin(lambda);
    cos_lambda := cos(lambda);
    
    sin_sigma := sqrt(
      power(cosU2 * sin_lambda, 2) + 
      power(cosU1 * sinU2 - sinU1 * cosU2 * cos_lambda, 2)
    );
    
    IF sin_sigma = 0 THEN
      RETURN 0; -- Coincident points
    END IF;
    
    cos_sigma := sinU1 * sinU2 + cosU1 * cosU2 * cos_lambda;
    sigma := atan2(sin_sigma, cos_sigma);
    
    sin_alpha := cosU1 * cosU2 * sin_lambda / sin_sigma;
    cos_sq_alpha := 1 - power(sin_alpha, 2);
    
    IF cos_sq_alpha = 0 THEN
      cos_2_sigma_m := 0;
    ELSE
      cos_2_sigma_m := cos_sigma - 2 * sinU1 * sinU2 / cos_sq_alpha;
    END IF;
    
    C := f / 16 * cos_sq_alpha * (4 + f * (4 - 3 * cos_sq_alpha));
    
    lambda := L + (1 - C) * f * sin_alpha * (
      sigma + C * sin_sigma * (
        cos_2_sigma_m + C * cos_sigma * (-1 + 2 * power(cos_2_sigma_m, 2))
      )
    );
    
    i := i + 1;
    EXIT WHEN abs(lambda - lambda_prev) < 1e-12 OR i >= iteration_limit;
  END LOOP;
  
  u_sq := cos_sq_alpha * (power(a, 2) - power(b, 2)) / power(b, 2);
  A_const := 1 + u_sq / 16384 * (4096 + u_sq * (-768 + u_sq * (320 - 175 * u_sq)));
  B_const := u_sq / 1024 * (256 + u_sq * (-128 + u_sq * (74 - 47 * u_sq)));
  
  delta_sigma := B_const * sin_sigma * (
    cos_2_sigma_m + B_const / 4 * (
      cos_sigma * (-1 + 2 * power(cos_2_sigma_m, 2)) -
      B_const / 6 * cos_2_sigma_m * (-3 + 4 * power(sin_sigma, 2)) * (-3 + 4 * power(cos_2_sigma_m, 2))
    )
  );
  
  distance := b * A_const * (sigma - delta_sigma);
  
  RETURN distance;
END;
$$;


--
-- Name: calculate_youtube_trust_multiplier(bigint, bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_youtube_trust_multiplier(p_view_count bigint, p_like_count bigint, p_subscriber_count bigint DEFAULT 0) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_multiplier NUMERIC;
  v_view_factor NUMERIC;
  v_engagement_factor NUMERIC;
  v_subscriber_factor NUMERIC;
BEGIN
  v_view_factor := CASE 
    WHEN p_view_count > 0 THEN LOG(p_view_count + 1) / 10.0
    ELSE 0
  END;
  v_engagement_factor := CASE 
    WHEN p_view_count > 0 THEN (p_like_count::NUMERIC / p_view_count) * 5
    ELSE 0
  END;
  v_subscriber_factor := CASE 
    WHEN p_subscriber_count > 0 THEN LOG(p_subscriber_count + 1) / 15.0
    ELSE 0
  END;
  v_multiplier := 1.0 + v_view_factor + v_engagement_factor + v_subscriber_factor;
  RETURN LEAST(ROUND(v_multiplier, 4), 10.0);
END;
$$;


--
-- Name: capture_post_lastro(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.capture_post_lastro() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_lastro NUMERIC;
  v_trust NUMERIC;
BEGIN
  SELECT btc_lastro, btc_trust_score 
  INTO v_lastro, v_trust
  FROM public.social_profiles 
  WHERE id = NEW.author_id;
  
  NEW.author_btc_lastro := COALESCE(v_lastro, 0);
  NEW.author_trust_at_post := COALESCE(v_trust, 0);
  NEW.weighted_score := NEW.author_btc_lastro * 1000;
  
  -- Auditar criação de post
  INSERT INTO public.ai_council_events (
    event_type, agent_id, target_type, target_id, decision_payload, btc_context
  ) VALUES (
    'social_post_created',
    'system_social',
    'post',
    NEW.id,
    jsonb_build_object(
      'author_id', NEW.author_id,
      'visibility', NEW.visibility,
      'content_preview', LEFT(NEW.content, 100)
    ),
    jsonb_build_object(
      'author_lastro', NEW.author_btc_lastro,
      'author_trust', NEW.author_trust_at_post,
      'weighted_score', NEW.weighted_score
    )
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: check_asset_dependencies(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_asset_dependencies(p_asset_type text, p_asset_name text) RETURNS TABLE(has_dependencies boolean, dependency_count integer, dependencies jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_dep_count INTEGER;
  v_deps JSONB;
BEGIN
  SELECT COUNT(*), COALESCE(jsonb_agg(jsonb_build_object(
    'target_type', target_type,
    'target_name', target_name,
    'is_critical', is_critical
  )), '[]'::jsonb)
  INTO v_dep_count, v_deps
  FROM orch_dependencies
  WHERE source_type = p_asset_type AND source_name = p_asset_name;
  
  RETURN QUERY SELECT v_dep_count > 0, v_dep_count, v_deps;
END;
$$;


--
-- Name: check_auth_rate_limit(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_auth_rate_limit(p_identifier text, p_action text, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_allowed boolean;
BEGIN
  -- Check rate limit (5 attempts per 15 minutes for auth)
  v_allowed := public.check_rate_limit(p_identifier, p_action, 5, 15);
  
  -- Log if rate limit exceeded
  IF NOT v_allowed THEN
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      p_identifier,
      NULL,
      p_ip_address,
      p_user_agent,
      jsonb_build_object('action', p_action)
    );
  END IF;
  
  RETURN v_allowed;
END;
$$;


--
-- Name: check_rate_limit(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(p_identifier text, p_action text, p_max_requests integer DEFAULT 10, p_window_minutes integer DEFAULT 15) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_window_start timestamp with time zone;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count requests in current window
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND window_start > v_window_start;
  
  -- If under limit, record this request and return true
  IF v_count < p_max_requests THEN
    INSERT INTO public.rate_limits (identifier, action, window_start)
    VALUES (p_identifier, p_action, now());
    RETURN true;
  END IF;
  
  -- Over limit
  RETURN false;
END;
$$;


--
-- Name: check_registration_milestones(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_registration_milestones() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_profiles INTEGER;
  v_milestone RECORD;
BEGIN
  -- Contar total de perfis
  SELECT COUNT(*) INTO v_total_profiles FROM public.profiles;
  
  -- Verificar se atingiu algum marco
  FOR v_milestone IN 
    SELECT * FROM public.registration_milestones 
    WHERE reached_at IS NULL AND target_count <= v_total_profiles
  LOOP
    -- Marcar como atingido
    UPDATE public.registration_milestones
    SET reached_at = now(),
        satoshi_hash = encode(sha256(concat(v_milestone.id::text, now()::text)::bytea), 'hex')
    WHERE id = v_milestone.id;
    
    -- Criar notificação para admin
    INSERT INTO public.admin_alerts (
      alert_type,
      title,
      message,
      severity,
      indicator_name,
      indicator_value,
      threshold_value
    ) VALUES (
      'milestone_reached',
      'Marco de Cadastros Atingido: ' || v_milestone.milestone_name,
      'O sistema atingiu ' || v_total_profiles || ' cadastros. Autorize a ativação da Fase ' || v_milestone.phase_to_activate || ' no painel de governança.',
      'high',
      'total_registrations',
      v_total_profiles,
      v_milestone.target_count
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;


--
-- Name: classify_risk(text, boolean, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.classify_risk(p_action_type text, p_touches_money boolean DEFAULT false, p_touches_security boolean DEFAULT false, p_global_scope boolean DEFAULT false) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  IF p_global_scope OR p_touches_money OR p_touches_security THEN
    RETURN 'HIGH';
  ELSIF p_action_type IN ('write', 'update', 'delete') THEN
    RETURN 'MEDIUM';
  ELSE
    RETURN 'LOW';
  END IF;
END;
$$;


--
-- Name: cleanup_expired_content(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_content() RETURNS TABLE(deleted_news integer, deleted_posts integer, deleted_images text[])
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  news_count INTEGER;
  posts_count INTEGER;
  expired_images TEXT[];
BEGIN
  -- Get images from posts to be deleted (for storage cleanup reference)
  SELECT ARRAY_AGG(image_url) INTO expired_images
  FROM feed_posts
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  -- Delete expired news (30 minutes)
  DELETE FROM cached_news WHERE expires_at < NOW();
  GET DIAGNOSTICS news_count = ROW_COUNT;
  
  -- Delete expired posts (24 hours)
  DELETE FROM feed_posts WHERE expires_at IS NOT NULL AND expires_at < NOW();
  GET DIAGNOSTICS posts_count = ROW_COUNT;
  
  RETURN QUERY SELECT news_count, posts_count, COALESCE(expired_images, ARRAY[]::TEXT[]);
END;
$$;


--
-- Name: cleanup_expired_feed_content(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_feed_content() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Delete expired user posts (24h)
  DELETE FROM public.feed_posts WHERE expires_at < now();
  
  -- Delete expired news cache (30min)
  DELETE FROM public.cached_news WHERE expires_at < now();
END;
$$;


--
-- Name: cleanup_old_location_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_location_history() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.location_history
  WHERE created_at < now() - interval '30 days';
END;
$$;


--
-- Name: cleanup_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_rate_limits() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;


--
-- Name: create_ai_council_proposal(text, text, numeric, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_ai_council_proposal(p_proposal_type text, p_target_param text, p_proposed_value numeric, p_justification text, p_ecosystem_analysis jsonb, p_agent_key text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_proposal_id UUID; v_current_value NUMERIC; v_satoshi_hash TEXT;
BEGIN
  SELECT param_value INTO v_current_value FROM public.protocol_parameters WHERE param_key = p_target_param;
  v_satoshi_hash := encode(sha256((p_proposal_type || p_target_param || p_proposed_value::TEXT || p_justification)::bytea), 'hex');
  INSERT INTO public.ai_council_proposals (proposal_type, target_param_key, current_value, proposed_value, justification, ecosystem_analysis, satoshi_hash, created_by_agent) VALUES (p_proposal_type, p_target_param, v_current_value, p_proposed_value, p_justification, p_ecosystem_analysis, v_satoshi_hash, p_agent_key) RETURNING proposal_id INTO v_proposal_id;
  RETURN v_proposal_id;
END;
$$;


--
-- Name: create_ai_guidance(text, text, text, text, jsonb, jsonb, text, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_ai_guidance(p_guidance_type text, p_severity text, p_title text, p_description text, p_step_by_step jsonb, p_affected_assets jsonb DEFAULT '[]'::jsonb, p_suggested_code text DEFAULT NULL::text, p_auto_executable boolean DEFAULT false, p_created_by_agent text DEFAULT 'SYSTEM'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_guidance_id UUID;
  v_hash TEXT;
BEGIN
  v_hash := encode(sha256((now()::text || p_title)::bytea), 'hex');
  
  INSERT INTO sys_ai_guidance (
    guidance_type, severity, title, description,
    step_by_step, affected_assets, suggested_code,
    auto_executable, created_by_agent, satoshi_hash
  ) VALUES (
    p_guidance_type, p_severity, p_title, p_description,
    p_step_by_step, p_affected_assets, p_suggested_code,
    p_auto_executable, p_created_by_agent, v_hash
  )
  RETURNING id INTO v_guidance_id;

  RETURN jsonb_build_object(
    'success', true,
    'guidance_id', v_guidance_id,
    'satoshi_hash', v_hash
  );
END;
$$;


--
-- Name: create_protocol_state(text, jsonb, jsonb, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_protocol_state(p_key_structure text, p_payload jsonb, p_metadata jsonb DEFAULT '{}'::jsonb, p_entity_id uuid DEFAULT NULL::uuid, p_operation text DEFAULT 'CREATE'::text, p_btc_context jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_tx_id UUID; v_entity_id UUID;
BEGIN
  v_entity_id := COALESCE(p_entity_id, gen_random_uuid());
  INSERT INTO public.protocol_state (entity_id, key_structure, payload, metadata, operation, btc_context, created_by) VALUES (v_entity_id, p_key_structure, p_payload, p_metadata, p_operation, p_btc_context, auth.uid()) RETURNING tx_id INTO v_tx_id;
  RETURN v_tx_id;
END;
$$;


--
-- Name: create_vendor_wallet(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_vendor_wallet() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.vendor_wallets (vendor_id)
  VALUES (NEW.id)
  ON CONFLICT (vendor_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: detect_orphan_operations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_orphan_operations() RETURNS TABLE(event_id uuid, idempotency_key text, event_type text, created_at timestamp with time zone, is_orphan boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.id as event_id,
    se.idempotency_key,
    se.event_type,
    se.created_at,
    NOT EXISTS (
      SELECT 1 FROM public.operation_dictionary od
      WHERE se.idempotency_key LIKE od.op_key || '%'
         OR se.event_type LIKE od.op_key || '%'
    ) as is_orphan
  FROM public.satoshi_events se
  ORDER BY se.created_at DESC
  LIMIT 100;
END;
$$;


--
-- Name: detect_siege_pattern(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_siege_pattern() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  region_count INTEGER;
  region_name TEXT;
  existing_alert_id UUID;
  new_satoshi_hash TEXT;
BEGIN
  -- Extrair região do metadata ou usar IP como identificador
  region_name := COALESCE(
    NEW.metadata->>'region',
    NEW.metadata->>'country',
    split_part(NEW.ip_address, '.', 1) || '.x.x.x'
  );
  
  -- Contar IPs únicos bloqueados desta região nas últimas 24h
  SELECT COUNT(DISTINCT ip_address) INTO region_count
  FROM banned_ips
  WHERE is_active = true
    AND blocked_at > NOW() - INTERVAL '24 hours'
    AND (
      metadata->>'region' = region_name
      OR metadata->>'country' = region_name
      OR split_part(ip_address, '.', 1) = split_part(NEW.ip_address, '.', 1)
    );
  
  -- Se 3 ou mais IPs, gerar Alerta de Cerco
  IF region_count >= 3 THEN
    -- Gerar hash Satoshi para rastreabilidade
    new_satoshi_hash := encode(
      sha256(
        (NEW.ip_address || region_name || NOW()::TEXT || 'SIEGE_DETECTED')::bytea
      ),
      'hex'
    );
    
    -- Verificar se já existe alerta ativo para esta região
    SELECT id INTO existing_alert_id
    FROM attack_pattern_alerts
    WHERE pattern_type = 'siege'
      AND affected_region = region_name
      AND is_active = true;
    
    IF existing_alert_id IS NOT NULL THEN
      -- Atualizar alerta existente
      UPDATE attack_pattern_alerts
      SET 
        attack_count = attack_count + 1,
        last_detected_at = NOW(),
        ip_addresses = array_append(ip_addresses, NEW.ip_address),
        severity = CASE 
          WHEN attack_count >= 10 THEN 'critical'
          WHEN attack_count >= 5 THEN 'high'
          ELSE 'medium'
        END
      WHERE id = existing_alert_id;
    ELSE
      -- Criar novo alerta de cerco
      INSERT INTO attack_pattern_alerts (
        pattern_type,
        alert_name,
        description,
        affected_region,
        ip_addresses,
        attack_count,
        severity,
        satoshi_hash,
        metadata
      ) VALUES (
        'siege',
        '🚨 ALERTA DE CERCO: ' || region_name,
        'Detectados ' || region_count || ' IPs da mesma região tentando acessar o sistema. Possível ataque coordenado.',
        region_name,
        ARRAY[NEW.ip_address],
        region_count,
        CASE 
          WHEN region_count >= 10 THEN 'critical'
          WHEN region_count >= 5 THEN 'high'
          ELSE 'medium'
        END,
        new_satoshi_hash,
        jsonb_build_object(
          'trigger_ip', NEW.ip_address,
          'trigger_reason', NEW.reason,
          'detected_at', NOW()
        )
      );
      
      -- Notificar admin com prioridade alta
      INSERT INTO ai_council_admin_notifications (
        notification_type,
        priority,
        title,
        message,
        source_agent_id,
        satoshi_hash,
        action_required,
        action_type,
        action_data
      ) VALUES (
        'security_alert',
        'high',
        '🏰 CERCO DETECTADO: ' || region_name,
        'O sistema identificou um padrão de ataque coordenado. ' || region_count || ' IPs da região ' || region_name || ' foram bloqueados nas últimas 24 horas. Hash de verificação: ' || LEFT(new_satoshi_hash, 16) || '...',
        (SELECT id FROM ai_council_agents WHERE agent_key = 'clo' LIMIT 1),
        new_satoshi_hash,
        true,
        'review_siege',
        jsonb_build_object(
          'region', region_name,
          'ip_count', region_count,
          'severity', CASE WHEN region_count >= 10 THEN 'critical' WHEN region_count >= 5 THEN 'high' ELSE 'medium' END
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: execute_ai_guidance(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_ai_guidance(p_guidance_id uuid, p_admin_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_guidance RECORD;
  v_hash TEXT;
BEGIN
  -- Verificar se é admin
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  SELECT * INTO v_guidance FROM sys_ai_guidance WHERE id = p_guidance_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orientação não encontrada');
  END IF;

  v_hash := encode(sha256((now()::text || p_guidance_id::text)::bytea), 'hex');

  UPDATE sys_ai_guidance SET
    status = 'in_progress',
    executed_by = p_admin_id,
    updated_at = now()
  WHERE id = p_guidance_id;

  RETURN jsonb_build_object(
    'success', true,
    'guidance', row_to_json(v_guidance),
    'satoshi_hash', v_hash
  );
END;
$$;


--
-- Name: execute_guidance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_guidance(p_guidance_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_guidance RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_guidance FROM sys_ai_guidance WHERE id = p_guidance_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orientação não encontrada');
  END IF;
  
  -- Atualizar status para em execução
  UPDATE sys_ai_guidance 
  SET status = 'executing', executed_at = now()
  WHERE id = p_guidance_id;
  
  -- Aqui seria executado o código da orientação
  -- Por segurança, apenas marcamos como executado
  UPDATE sys_ai_guidance 
  SET status = 'executed', 
      execution_result = jsonb_build_object(
        'executed_at', now(),
        'executed_by', auth.uid(),
        'success', true
      )
  WHERE id = p_guidance_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'guidance_id', p_guidance_id,
    'executed_at', now()
  );
END;
$$;


--
-- Name: execute_secure_transfer(uuid, uuid, numeric, character varying, text, uuid, character varying, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_secure_transfer(p_from_profile_id uuid, p_to_profile_id uuid, p_amount numeric, p_currency character varying DEFAULT 'BRL'::character varying, p_description text DEFAULT NULL::text, p_idempotency_key uuid DEFAULT NULL::uuid, p_reference_type character varying DEFAULT 'transfer'::character varying, p_reference_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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
  -- Verificar idempotency_key para evitar duplicidade
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.ledger WHERE idempotency_key = p_idempotency_key) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'DUPLICATE_TRANSACTION',
        'message', 'Transação já processada com esta chave de idempotência'
      );
    END IF;
  END IF;

  -- Validar valor positivo
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_AMOUNT',
      'message', 'Valor deve ser positivo'
    );
  END IF;

  -- Obter saldo atual da origem
  SELECT COALESCE(SUM(amount), 0) INTO v_from_balance
  FROM public.ledger
  WHERE profile_id = p_from_profile_id AND currency = p_currency;

  -- Validar saldo suficiente
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_BALANCE',
      'message', 'Saldo insuficiente',
      'current_balance', v_from_balance,
      'requested_amount', p_amount
    );
  END IF;

  -- Calcular saldos após transferência
  v_from_balance_after := v_from_balance - p_amount;
  
  SELECT COALESCE(SUM(amount), 0) + p_amount INTO v_to_balance_after
  FROM public.ledger
  WHERE profile_id = p_to_profile_id AND currency = p_currency;

  -- Gerar ID das transações
  v_debit_id := gen_random_uuid();
  v_credit_id := gen_random_uuid();

  -- Gerar hash de auditoria (SHA-256 simulado como digest)
  v_signature_hash := encode(
    sha256(
      (v_debit_id::text || v_credit_id::text || p_amount::text || v_timestamp::text || p_from_profile_id::text || p_to_profile_id::text)::bytea
    ),
    'hex'
  );

  -- TRANSAÇÃO ATÔMICA: Debitar origem
  INSERT INTO public.ledger (
    id, profile_id, entry_type, amount, balance_after, currency,
    description, reference_type, reference_id, idempotency_key,
    signature_hash, status, origin_id, created_at
  ) VALUES (
    v_debit_id, p_from_profile_id, 'debit', -p_amount, v_from_balance_after,
    p_currency, COALESCE(p_description, 'Transferência enviada'), p_reference_type,
    p_reference_id, p_idempotency_key, v_signature_hash, 'confirmed',
    v_credit_id, v_timestamp
  );

  -- TRANSAÇÃO ATÔMICA: Creditar destino
  INSERT INTO public.ledger (
    id, profile_id, entry_type, amount, balance_after, currency,
    description, reference_type, reference_id,
    signature_hash, status, origin_id, created_at
  ) VALUES (
    v_credit_id, p_to_profile_id, 'credit', p_amount, v_to_balance_after,
    p_currency, COALESCE(p_description, 'Transferência recebida'), p_reference_type,
    p_reference_id, v_signature_hash, 'confirmed',
    v_debit_id, v_timestamp
  );

  -- Retornar recibo digital
  RETURN jsonb_build_object(
    'success', true,
    'receipt', jsonb_build_object(
      'debit_id', v_debit_id,
      'credit_id', v_credit_id,
      'from_profile', p_from_profile_id,
      'to_profile', p_to_profile_id,
      'amount', p_amount,
      'currency', p_currency,
      'from_balance_after', v_from_balance_after,
      'to_balance_after', v_to_balance_after,
      'signature_hash', v_signature_hash,
      'timestamp', v_timestamp,
      'status', 'confirmed'
    )
  );
END;
$$;


--
-- Name: execute_sovereign_action(text, text, uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_sovereign_action(p_action_type text, p_target_type text, p_target_id uuid, p_payload jsonb DEFAULT '{}'::jsonb, p_justification text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_action_id UUID;
    v_actor_id UUID := auth.uid();
BEGIN
    -- Verificar se é soberano
    IF NOT public.is_sovereign(v_actor_id) THEN
        RAISE EXCEPTION 'Acesso negado: apenas usuários soberanos podem executar esta ação';
    END IF;

    -- Registrar ação soberana
    INSERT INTO public.sovereign_actions (
        actor_id, action_type, target_type, target_id, payload, justification
    ) VALUES (
        v_actor_id, p_action_type, p_target_type, p_target_id, p_payload, p_justification
    ) RETURNING id INTO v_action_id;

    -- Registrar no Ledger Satoshi
    INSERT INTO public.satoshi_events (
        idempotency_key, event_type, payload, currency
    ) VALUES (
        'SOVEREIGN_ACTION:' || v_action_id::text,
        'ADAM:' || p_action_type,
        jsonb_build_object(
            'action_id', v_action_id,
            'actor_id', v_actor_id,
            'target_type', p_target_type,
            'target_id', p_target_id,
            'payload', p_payload,
            'justification', p_justification
        ),
        'ZIMBU'
    );

    RETURN v_action_id;
END;
$$;


--
-- Name: find_nearby_profiles(double precision, double precision, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_nearby_profiles(p_latitude double precision, p_longitude double precision, p_radius_km double precision DEFAULT 5.0, p_limit integer DEFAULT 50) RETURNS TABLE(profile_id uuid, profile_full_name text, profile_photo_url text, distance_km double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        profiles.id AS profile_id,
        profiles.full_name AS profile_full_name,
        profiles.profile_photo_url,
        ST_DistanceSphere(
            profiles.location::geometry,
            ST_MakePoint(p_longitude, p_latitude)
        ) / 1000.0 AS distance_km
    FROM public.profiles
    WHERE profiles.location IS NOT NULL
    AND ST_DWithin(
        profiles.location,
        ST_MakePoint(p_longitude, p_latitude)::geography,
        p_radius_km * 1000
    )
    ORDER BY distance_km
    LIMIT p_limit;
END;
$$;


--
-- Name: find_nearby_vendors(double precision, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_nearby_vendors(p_lat double precision, p_lng double precision, p_radius_meters integer DEFAULT 5000) RETURNS TABLE(profile_id uuid, distance_meters double precision, full_name text, email text, phone character varying, product_category character varying, whatsapp_number character varying, profile_photo_url text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.profile_id,
    ST_Distance(
      v.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters,
    p.full_name,
    p.email,
    p.phone,
    v.product_category,
    v.whatsapp_number,
    p.profile_photo_url
  FROM public.vendors v
  JOIN public.profiles p ON v.profile_id = p.id
  WHERE 
    v.status = 'active'
    AND ST_DWithin(
      v.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$;


--
-- Name: find_nearby_vendors_precise(double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_nearby_vendors_precise(p_lat double precision, p_lng double precision, p_radius_meters double precision DEFAULT 5000, p_min_accuracy double precision DEFAULT 50) RETURNS TABLE(profile_id uuid, distance_meters double precision, full_name text, email text, phone character varying, product_category character varying, whatsapp_number character varying, profile_photo_url text, heading numeric, speed numeric, accuracy_radius numeric, location_age_seconds integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.profile_id,
    ST_Distance(
      v.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) as distance_meters,
    p.full_name,
    p.email,
    p.phone,
    v.product_category,
    v.whatsapp_number,
    p.profile_photo_url,
    v.heading,
    v.speed,
    v.accuracy_radius,
    EXTRACT(EPOCH FROM (now() - v.location_updated_at))::integer as location_age_seconds
  FROM public.vendors v
  JOIN public.profiles p ON p.id = v.profile_id
  WHERE 
    v.status = 'active'
    AND v.location IS NOT NULL
    AND ST_DWithin(
      v.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
    AND (v.accuracy_radius IS NULL OR v.accuracy_radius <= p_min_accuracy)
  ORDER BY distance_meters ASC;
END;
$$;


--
-- Name: fn_ban_ip(text, text, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_ban_ip(p_ip_address text, p_reason text DEFAULT 'Manual ban by admin'::text, p_is_permanent boolean DEFAULT false, p_expires_days integer DEFAULT 30) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  ban_id UUID;
  attack_cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO attack_cnt FROM hacker_intelligence_logs WHERE ip_address = p_ip_address;
  INSERT INTO ip_blacklist (ip_address, reason, blocked_by, is_permanent, expires_at, attack_count, satoshi_hash)
  VALUES (
    p_ip_address, p_reason, auth.uid(), p_is_permanent,
    CASE WHEN p_is_permanent THEN NULL ELSE now() + (p_expires_days || ' days')::interval END,
    attack_cnt, md5(p_ip_address || COALESCE(auth.uid()::text, 'system') || now()::text)
  )
  ON CONFLICT (ip_address) DO UPDATE SET
    reason = EXCLUDED.reason, blocked_by = EXCLUDED.blocked_by, blocked_at = now(),
    is_permanent = EXCLUDED.is_permanent, expires_at = EXCLUDED.expires_at, attack_count = EXCLUDED.attack_count
  RETURNING id INTO ban_id;
  
  UPDATE hacker_intelligence_logs SET is_blocked = true, blocked_at = now(), blocked_by = auth.uid() WHERE ip_address = p_ip_address;
  UPDATE threat_summary_daily SET blocked_attempts = blocked_attempts + attack_cnt WHERE summary_date = CURRENT_DATE;
  
  RETURN ban_id;
END;
$$;


--
-- Name: fn_report_hacker_attempt(text, text, text, text, text, text, text, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_report_hacker_attempt(p_ip_address text, p_honeypot_triggered text, p_user_agent text DEFAULT NULL::text, p_request_path text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text, p_country_name text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  log_id UUID;
  existing_count INTEGER;
  damage_estimate NUMERIC;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM hacker_intelligence_logs WHERE ip_address = p_ip_address;
  damage_estimate := (existing_count + 1) * 150.00;
  INSERT INTO hacker_intelligence_logs (
    ip_address, honeypot_triggered, user_agent, request_path,
    country_code, country_name, city, latitude, longitude,
    estimated_damage_prevented, severity, satoshi_hash
  ) VALUES (
    p_ip_address, p_honeypot_triggered, p_user_agent, p_request_path,
    p_country_code, p_country_name, p_city, p_latitude, p_longitude,
    damage_estimate,
    CASE WHEN existing_count > 5 THEN 'critical' WHEN existing_count > 2 THEN 'high' ELSE 'medium' END,
    md5(p_ip_address || p_honeypot_triggered || now()::text)
  ) RETURNING id INTO log_id;
  
  IF existing_count >= 10 THEN
    INSERT INTO ip_blacklist (ip_address, reason, is_permanent, attack_count, satoshi_hash)
    VALUES (p_ip_address, 'Auto-blocked: Exceeded 10 honeypot triggers', true, existing_count + 1, md5(p_ip_address || now()::text))
    ON CONFLICT (ip_address) DO UPDATE SET attack_count = ip_blacklist.attack_count + 1;
  END IF;
  
  INSERT INTO threat_summary_daily (summary_date, total_attempts, blocked_attempts, unique_ips, estimated_savings)
  VALUES (CURRENT_DATE, 1, 0, 1, damage_estimate)
  ON CONFLICT (summary_date) DO UPDATE SET
    total_attempts = threat_summary_daily.total_attempts + 1,
    estimated_savings = threat_summary_daily.estimated_savings + damage_estimate,
    updated_at = now();
  
  RETURN log_id;
END;
$$;


--
-- Name: generate_account_identifier(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_account_identifier() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_key VARCHAR(64);
BEGIN
  -- Generate a unique key using hash
  new_key := encode(digest(NEW.id::text || now()::text || random()::text, 'sha256'), 'hex');
  new_key := 'PRA-' || substr(new_key, 1, 8) || '-' || substr(new_key, 9, 4) || '-' || substr(new_key, 13, 4);
  
  INSERT INTO public.account_identifiers (profile_id, public_key)
  VALUES (NEW.id, new_key)
  ON CONFLICT (profile_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_chat_session_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_chat_session_title() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_first_message TEXT;
  v_message_count INTEGER;
BEGIN
  -- Só gera título após primeira mensagem do usuário
  IF NEW.role = 'user' THEN
    SELECT COUNT(*) INTO v_message_count 
    FROM public.chat_messages 
    WHERE session_id = NEW.session_id AND role = 'user';
    
    IF v_message_count = 0 THEN
      -- Usar as primeiras palavras da mensagem como título
      v_first_message := LEFT(NEW.content, 50);
      IF LENGTH(NEW.content) > 50 THEN
        v_first_message := v_first_message || '...';
      END IF;
      
      UPDATE public.chat_sessions
      SET title = v_first_message
      WHERE id = NEW.session_id AND title = 'Nova Conversa';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_clo_report(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_clo_report() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  active_bans INTEGER;
  critical_alerts INTEGER;
  integrity_status TEXT;
  new_satoshi_hash TEXT;
BEGIN
  -- Contar banimentos ativos
  SELECT COUNT(*) INTO active_bans FROM banned_ips WHERE is_active = true;
  
  -- Contar alertas críticos
  SELECT COUNT(*) INTO critical_alerts 
  FROM attack_pattern_alerts 
  WHERE is_active = true AND severity IN ('high', 'critical');
  
  -- Determinar status de integridade
  integrity_status := CASE
    WHEN critical_alerts > 0 THEN 'COMPROMETIDA'
    WHEN active_bans > 10 THEN 'ALERTA'
    ELSE 'ÍNTEGRA'
  END;
  
  -- Gerar hash
  new_satoshi_hash := encode(
    sha256(('CLO_REPORT_' || NOW()::TEXT || active_bans::TEXT)::bytea),
    'hex'
  );
  
  -- Inserir relatório
  INSERT INTO board_governance_reports (
    report_type,
    director_name,
    report_title,
    report_summary,
    metrics,
    risk_level,
    satoshi_hash,
    requires_action
  ) VALUES (
    'clo',
    'Diretor Jurídico de IA',
    'Relatório de Integridade do Ledger',
    'Status: ' || integrity_status || '. ' || active_bans || ' IPs banidos ativos. ' || critical_alerts || ' alertas críticos.',
    jsonb_build_object(
      'active_bans', active_bans,
      'critical_alerts', critical_alerts,
      'integrity_status', integrity_status,
      'last_ban_hash', NEW.satoshi_hash
    ),
    CASE WHEN integrity_status = 'COMPROMETIDA' THEN 'critical' WHEN integrity_status = 'ALERTA' THEN 'high' ELSE 'low' END,
    new_satoshi_hash,
    critical_alerts > 0
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_code_issue_satoshi_hash(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_code_issue_satoshi_hash() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.satoshi_hash := encode(
    sha256(
      (NEW.id::text || NEW.file_path || NEW.line_start::text || NEW.severity || now()::text)::bytea
    ), 
    'hex'
  );
  RETURN NEW;
END;
$$;


--
-- Name: generate_event_checksum(text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_event_checksum(p_event_type text, p_event_data jsonb, p_previous_checksum text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN encode(sha256((p_event_type || COALESCE(p_event_data::TEXT, '') || COALESCE(p_previous_checksum, 'GENESIS_EVENT') || TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::bytea), 'hex');
END;
$$;


--
-- Name: generate_satoshi_checksum(jsonb, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_satoshi_checksum(p_payload jsonb, p_metadata jsonb, p_previous_checksum text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN encode(sha256((COALESCE(p_payload::TEXT, '') || COALESCE(p_metadata::TEXT, '') || COALESCE(p_previous_checksum, 'GENESIS') || TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))::bytea), 'hex');
END;
$$;


--
-- Name: get_balance(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_balance(p_profile_id uuid, p_currency character varying DEFAULT 'BRL'::character varying) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN public.get_user_balance(p_profile_id, p_currency);
END;
$$;


--
-- Name: get_beach_videos_with_lastro(uuid, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_beach_videos_with_lastro(p_beach_id uuid, p_limit integer DEFAULT 10, p_include_lives boolean DEFAULT true) RETURNS TABLE(video_id text, title text, thumbnail_url text, view_count bigint, like_count bigint, is_live boolean, channel_title text, author_btc_lastro numeric, author_trust_score numeric, weighted_relevance numeric)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    yv.video_id,
    yv.title,
    yv.thumbnail_url,
    yv.view_count,
    yv.like_count,
    yv.is_live,
    yv.channel_title,
    COALESCE(sp.btc_lastro, 0) as author_btc_lastro,
    COALESCE(sp.btc_trust_score, 0) as author_trust_score,
    (yv.engagement_score * yv.trust_multiplier * COALESCE(sp.btc_trust_score, 1)) as weighted_relevance
  FROM public.youtube_videos yv
  LEFT JOIN public.social_profiles sp ON sp.profile_id = yv.profile_id
  WHERE yv.beach_id = p_beach_id
    AND yv.is_active = true
    AND (p_include_lives OR yv.is_live = false)
  ORDER BY yv.is_live DESC, weighted_relevance DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_btc_parity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_btc_parity() RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_parity NUMERIC;
BEGIN
  SELECT btc_parity_last INTO v_parity
  FROM public.cache_store
  WHERE cache_key = 'btc_brl_rate'
  AND (expires_at IS NULL OR expires_at > now())
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- Fallback se não houver cotação
  IF v_parity IS NULL THEN
    v_parity := 650000.00; -- Valor fallback em BRL
  END IF;
  
  RETURN v_parity;
END;
$$;


--
-- Name: get_daily_honeytoken(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_daily_honeytoken() RETURNS TABLE(token_name text, token_value text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  new_token_name TEXT;
  new_token_value TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM satoshi_honeytokens WHERE generation_date = today_date AND is_active = true) THEN
    RETURN QUERY SELECT sh.token_name, sh.token_value 
    FROM satoshi_honeytokens sh 
    WHERE generation_date = today_date AND is_active = true 
    LIMIT 1;
  ELSE
    UPDATE satoshi_honeytokens SET is_active = false WHERE generation_date < today_date;
    new_token_name := 'var_' || substr(md5(today_date::text || 'satoshi_chameleon'), 1, 4);
    new_token_value := encode(gen_random_bytes(16), 'hex');
    INSERT INTO satoshi_honeytokens (token_name, token_value, generation_date, satoshi_hash)
    VALUES (new_token_name, new_token_value, today_date, md5(new_token_name || new_token_value || today_date::text));
    RETURN QUERY SELECT new_token_name, new_token_value;
  END IF;
END;
$$;


--
-- Name: get_last_entity_checksum(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_last_entity_checksum(p_entity_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_checksum TEXT;
BEGIN
  SELECT checksum INTO v_checksum FROM public.protocol_state WHERE entity_id = p_entity_id ORDER BY version DESC LIMIT 1;
  RETURN COALESCE(v_checksum, 'GENESIS');
END;
$$;


--
-- Name: get_mass_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_mass_metrics() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_users integer;
  v_total_clientes integer;
  v_total_praieiros integer;
  v_total_admins integer;
  v_total_shells bigint;
  v_current_phase integer;
  v_base_fee numeric;
  v_projected_revenue numeric;
  v_alert_message text := null;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM profiles;
  SELECT COUNT(*) INTO v_total_clientes FROM profiles WHERE user_type = 'cliente';
  SELECT COUNT(*) INTO v_total_praieiros FROM profiles WHERE user_type = 'praieiro';
  SELECT COUNT(*) INTO v_total_admins FROM profiles WHERE user_type = 'admin';
  SELECT COALESCE(SUM(shell_balance), 0) INTO v_total_shells FROM profiles;

  SELECT current_phase, base_fixed_fee INTO v_current_phase, v_base_fee 
  FROM system_governance LIMIT 1;

  v_projected_revenue := v_total_users * COALESCE(v_base_fee, 0);

  IF v_total_users >= 100000 AND v_current_phase = 0 THEN
    v_alert_message := 'ALERTA SOBERANO: Meta de 100k atingida. Autorizar virada para Fase 1?';
  ELSIF v_total_users >= 250000 AND v_current_phase = 1 THEN
    v_alert_message := 'ALERTA SOBERANO: Meta de 250k atingida. Autorizar virada para Fase 2?';
  END IF;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'total_clientes', v_total_clientes,
    'total_praieiros', v_total_praieiros,
    'total_admins', v_total_admins,
    'total_shells_distributed', v_total_shells,
    'current_phase', COALESCE(v_current_phase, 0),
    'projected_revenue', v_projected_revenue,
    'alert_message', v_alert_message,
    'timestamp', now()
  );
END;
$$;


--
-- Name: get_operation_telemetry(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_operation_telemetry(p_category text DEFAULT NULL::text, p_hours integer DEFAULT 24) RETURNS TABLE(op_key text, category text, description text, event_count bigint, total_zimbu numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    od.op_key,
    od.category,
    od.description,
    COUNT(se.id) as event_count,
    COALESCE(SUM((se.payload->>'amount')::numeric), 0) as total_zimbu
  FROM public.operation_dictionary od
  LEFT JOIN public.satoshi_events se ON (
    se.idempotency_key LIKE od.op_key || '%'
    OR se.event_type LIKE od.op_key || '%'
  )
  AND se.created_at >= now() - (p_hours || ' hours')::interval
  WHERE (p_category IS NULL OR od.category = p_category)
  AND od.is_active = true
  GROUP BY od.op_key, od.category, od.description
  ORDER BY event_count DESC;
END;
$$;


--
-- Name: get_orchestrator_logs(uuid, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_orchestrator_logs(p_orch_id uuid DEFAULT NULL::uuid, p_severity text DEFAULT NULL::text, p_stage text DEFAULT NULL::text, p_search_payload text DEFAULT NULL::text, p_limit integer DEFAULT 100) RETURNS TABLE(id uuid, log_id text, orch_id uuid, log_severity text, log_stage text, log_message text, log_payload jsonb, execution_time_ms integer, actor_email text, error_stack text, satoshi_hash text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id, l.log_id, l.orch_id, l.log_severity, l.log_stage,
    l.log_message, l.log_payload, l.execution_time_ms,
    l.actor_email, l.error_stack, l.satoshi_hash, l.created_at
  FROM sys_orch_logs l
  WHERE 
    (p_orch_id IS NULL OR l.orch_id = p_orch_id)
    AND (p_severity IS NULL OR l.log_severity = p_severity)
    AND (p_stage IS NULL OR l.log_stage = p_stage)
    AND (p_search_payload IS NULL OR l.log_payload::text ILIKE '%' || p_search_payload || '%')
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_profile_by_user_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profile_by_user_id(p_user_id uuid) RETURNS TABLE(id uuid, user_id uuid, full_name text, email text, music_title text, music_artist text, current_youtube_id text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.email,
    p.music_title,
    p.music_artist,
    p.current_youtube_id
  FROM profiles p
  WHERE p.user_id = p_user_id;
END;
$$;


--
-- Name: get_profile_with_assets(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profile_with_assets(p_user_id uuid) RETURNS TABLE(profile_id uuid, full_name text, email text, profile_photo_url text, balance_brl numeric, balance_conchas integer, btc_equivalent numeric, satoshi_equivalent bigint, btc_parity_last numeric, btc_trust_score numeric, reputation_level integer, trust_level integer, wallet_status text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS profile_id,
    p.full_name::TEXT,
    p.email::TEXT,
    p.profile_photo_url::TEXT,
    COALESCE(w.balance_brl, 0) AS balance_brl,
    COALESCE(w.balance_conchas, 0) AS balance_conchas,
    COALESCE(w.btc_equivalent, public.calculate_btc_equivalent(COALESCE(w.balance_brl, 0))) AS btc_equivalent,
    COALESCE(w.satoshi_equivalent, public.calculate_satoshi_equivalent(COALESCE(w.balance_brl, 0))) AS satoshi_equivalent,
    public.get_btc_parity() AS btc_parity_last,
    COALESCE(sp.btc_trust_score, 0) AS btc_trust_score,
    COALESCE(sp.reputation_level, 1) AS reputation_level,
    COALESCE(w.trust_level, 0) AS trust_level,
    COALESCE(w.wallet_status, 'active') AS wallet_status
  FROM public.profiles p
  LEFT JOIN public.wallets w ON w.profile_id = p.id
  LEFT JOIN public.social_profiles sp ON sp.profile_id = p.id
  WHERE p.user_id = p_user_id;
END;
$$;


--
-- Name: get_sync_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sync_status(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_profile RECORD;
  v_last_sync RECORD;
  v_sync_count INT;
BEGIN
  -- Buscar perfil
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROFILE_NOT_FOUND');
  END IF;

  -- Buscar última sincronização
  SELECT * INTO v_last_sync 
  FROM public.satoshi_events 
  WHERE event_type = 'PROFILE_SYNC' 
    AND payload->>'user_id' = p_user_id::text
  ORDER BY created_at DESC 
  LIMIT 1;

  -- Contar total de sincronizações
  SELECT COUNT(*) INTO v_sync_count 
  FROM public.satoshi_events 
  WHERE event_type = 'PROFILE_SYNC' 
    AND payload->>'user_id' = p_user_id::text;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'profile_updated_at', v_profile.updated_at,
    'last_sync_at', v_last_sync.created_at,
    'last_sync_changes', v_last_sync.payload->'changes',
    'total_syncs', v_sync_count,
    'satoshi_hash', v_last_sync.event_hash,
    'is_synced', true
  );
END;
$$;


--
-- Name: get_user_balance(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_balance(p_profile_id uuid, p_currency character varying DEFAULT 'BRL'::character varying) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  SELECT COALESCE(
    (SELECT balance_after 
     FROM public.ledger 
     WHERE profile_id = p_profile_id 
       AND currency = p_currency
     ORDER BY created_at DESC 
     LIMIT 1),
    0
  ) INTO current_balance;
  
  RETURN current_balance;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_profile_id uuid;
BEGIN
  -- 1. Criar profile
  INSERT INTO public.profiles (id, user_id, full_name, avatar_url)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO new_profile_id;

  -- Se profile já existia, buscar o id
  IF new_profile_id IS NULL THEN
    SELECT id INTO new_profile_id FROM public.profiles WHERE user_id = NEW.id;
  END IF;

  -- 2. Criar client vinculado ao profile
  IF new_profile_id IS NOT NULL THEN
    INSERT INTO public.clients (profile_id)
    VALUES (new_profile_id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- 3. Criar role 'user' automaticamente (CRÍTICO - resolve ROLE-02)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 
    AND role = 'admin'
  )
$_$;


--
-- Name: is_positive_content(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_positive_content(title text, description text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  content TEXT;
  forbidden_words TEXT[] := ARRAY['acidente', 'crime', 'morte', 'política', 'violência', 'tragédia', 'trânsito', 'crise', 'assassinato', 'roubo', 'assalto', 'guerra', 'terrorismo', 'desastre'];
  word TEXT;
BEGIN
  content := LOWER(COALESCE(title, '') || ' ' || COALESCE(description, ''));
  
  FOREACH word IN ARRAY forbidden_words LOOP
    IF content LIKE '%' || word || '%' THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$;


--
-- Name: is_sovereign(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_sovereign(check_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = check_user_id 
        AND role IN ('admin', 'super_admin')
    );
END;
$$;


--
-- Name: is_vendor(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_vendor(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'vendor'
  )
$$;


--
-- Name: log_blackbox_error(text, text, text, jsonb, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_blackbox_error(p_origin text, p_error_code text, p_error_message text, p_context jsonb DEFAULT '{}'::jsonb, p_severity text DEFAULT 'error'::text, p_idempotency_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_error_id UUID;
BEGIN
    INSERT INTO public.system_blackbox (
        origin, error_code, error_message, context, severity, idempotency_key
    ) VALUES (
        p_origin, p_error_code, p_error_message, p_context, p_severity, p_idempotency_key
    ) RETURNING id INTO v_error_id;

    -- Se for crítico, notificar Adão
    IF p_severity IN ('critical', 'error') THEN
        INSERT INTO public.adam_notifications (
            notification_type, title, message, severity, action_required, source_error_id
        ) VALUES (
            'SYSTEM_ERROR',
            'Erro ' || p_severity || ': ' || p_error_code,
            p_error_message,
            p_severity,
            TRUE,
            v_error_id
        );
    END IF;

    RETURN v_error_id;
END;
$$;


--
-- Name: log_engineering_error(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_engineering_error(p_error_code text, p_error_message text, p_source_component text DEFAULT NULL::text, p_risk_level text DEFAULT 'LOW'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_category text;
  v_impact text;
  v_suggested_sql text;
  v_hash text;
  v_log_id uuid;
BEGIN
  v_category := CASE 
    WHEN p_error_code = '42P01' THEN 'RELAÇÃO INEXISTENTE'
    WHEN p_error_code = '42703' THEN 'COLUNA ÓRFÃ'
    WHEN p_error_code = '23505' THEN 'VIOLAÇÃO DE UNICIDADE'
    WHEN p_error_code = '42701' THEN 'COLUNA DUPLICADA'
    WHEN p_error_code = '23503' THEN 'VIOLAÇÃO DE FK'
    WHEN p_error_code = '42883' THEN 'FUNÇÃO INEXISTENTE'
    WHEN p_error_code = '22P02' THEN 'TIPO INVÁLIDO'
    ELSE 'ERRO GENÉRICO'
  END;

  v_impact := CASE 
    WHEN p_error_code = '42P01' THEN 'Tabela não encontrada. Possível referência a esquema legado vendors.'
    WHEN p_error_code = '42703' THEN 'Coluna não existe. Verificar campo no JSONB metadata.'
    WHEN p_error_code = '23505' THEN 'Registro duplicado. Usar UPSERT.'
    WHEN p_error_code = '42701' THEN 'Coluna já existe. Ignorar alteração.'
    WHEN p_error_code = '23503' THEN 'Referência inválida. Verificar integridade referencial.'
    WHEN p_error_code = '42883' THEN 'Função não encontrada. Verificar definição no schema.'
    WHEN p_error_code = '22P02' THEN 'Tipo de dado incompatível. Verificar cast.'
    ELSE 'Erro não catalogado. Análise manual necessária.'
  END;

  v_suggested_sql := CASE 
    WHEN p_error_code = '42P01' THEN 'CREATE VIEW vendors AS SELECT * FROM profiles WHERE user_type = ''praieiro'';'
    WHEN p_error_code = '42703' THEN 'SELECT metadata->>''campo'' FROM profiles;'
    WHEN p_error_code = '23505' THEN 'INSERT INTO tabela (...) ON CONFLICT (id) DO UPDATE SET ...;'
    WHEN p_error_code = '42701' THEN '-- Coluna já existe, nenhuma ação necessária'
    WHEN p_error_code = '23503' THEN '-- Verificar se o registro pai existe antes de inserir'
    WHEN p_error_code = '42883' THEN '-- Verificar se a função foi criada corretamente'
    WHEN p_error_code = '22P02' THEN '-- Verificar tipos com information_schema.columns'
    ELSE '-- Analisar: ' || left(p_error_message, 100)
  END;

  v_hash := encode(sha256(convert_to(
    p_error_code || p_error_message || now()::text, 'UTF8'
  )), 'hex');

  INSERT INTO engineering_logs (
    error_code, error_message, error_category, 
    business_impact, suggested_sql, source_component, risk_level, satoshi_hash
  ) VALUES (
    p_error_code, p_error_message, v_category,
    v_impact, v_suggested_sql, p_source_component, p_risk_level, v_hash
  ) RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'log_id', v_log_id,
    'error_code', p_error_code,
    'category', v_category,
    'business_impact', v_impact,
    'suggested_sql', v_suggested_sql,
    'satoshi_hash', v_hash
  );
END;
$$;


--
-- Name: log_health_alert(text, text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_health_alert(p_alert_type text, p_severity text, p_title text, p_message text, p_source text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_id UUID;
  v_hash TEXT;
  v_prev_hash TEXT;
BEGIN
  SELECT satoshi_hash INTO v_prev_hash 
  FROM public.system_health_logs 
  ORDER BY created_at DESC LIMIT 1;
  
  v_hash := encode(digest(
    p_alert_type || p_title || p_message || now()::text || COALESCE(v_prev_hash, 'GENESIS'),
    'sha256'
  ), 'hex');
  
  INSERT INTO public.system_health_logs (
    alert_type, severity, title, message, source_component, metadata, satoshi_hash
  ) VALUES (
    p_alert_type, p_severity, p_title, p_message, p_source, p_metadata, v_hash
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


--
-- Name: log_ledger_event(text, jsonb, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_ledger_event(p_event_type text, p_event_data jsonb, p_actor_id uuid DEFAULT NULL::uuid, p_actor_type text DEFAULT 'system'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_event_id UUID;
  v_tx_id UUID;
  v_sequence BIGINT;
  v_prev_checksum TEXT;
  v_checksum TEXT;
BEGIN
  -- Gerar IDs
  v_event_id := gen_random_uuid();
  v_tx_id := gen_random_uuid();
  
  -- Buscar último checksum e sequence
  SELECT event_checksum, sequence_number INTO v_prev_checksum, v_sequence
  FROM ledger_events
  ORDER BY created_at DESC
  LIMIT 1;
  
  v_sequence := COALESCE(v_sequence, 0) + 1;
  
  -- Gerar checksum SHA256
  v_checksum := encode(
    sha256(
      (COALESCE(v_prev_checksum, 'genesis') || v_event_id::TEXT || p_event_type || p_event_data::TEXT)::BYTEA
    ),
    'hex'
  );
  
  -- Inserir evento
  INSERT INTO ledger_events (
    event_id, tx_id, event_type, event_data, 
    execution_context, event_checksum, previous_event_checksum,
    actor_id, actor_type, sequence_number
  ) VALUES (
    v_event_id, v_tx_id, p_event_type, p_event_data,
    jsonb_build_object('timestamp', now(), 'source', 'marketplace'),
    v_checksum, v_prev_checksum,
    p_actor_id, p_actor_type, v_sequence
  );
  
  RETURN v_event_id;
END;
$$;


--
-- Name: log_notification_activity(uuid, text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_notification_activity(p_notification_id uuid, p_activity_type text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_type text DEFAULT 'admin'::text, p_activity_data jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
  v_previous_hash TEXT;
  v_new_hash TEXT;
BEGIN
  v_id := gen_random_uuid();
  
  -- Buscar hash anterior
  SELECT satoshi_hash INTO v_previous_hash
  FROM public.ai_council_notification_activity
  WHERE notification_id = p_notification_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Gerar novo hash encadeado
  v_new_hash := encode(sha256(
    (v_id::TEXT || COALESCE(v_previous_hash, 'genesis') || p_activity_type || now()::TEXT)::BYTEA
  ), 'hex');
  
  INSERT INTO public.ai_council_notification_activity (
    id, notification_id, activity_type, actor_id, actor_type,
    activity_data, previous_activity_hash, satoshi_hash
  ) VALUES (
    v_id, p_notification_id, p_activity_type, p_actor_id, p_actor_type,
    p_activity_data, v_previous_hash, v_new_hash
  );
  
  -- Atualizar notificação se lida
  IF p_activity_type = 'read' THEN
    UPDATE public.ai_council_admin_notifications
    SET is_read = true, read_at = now()
    WHERE id = p_notification_id;
  END IF;
  
  RETURN v_id;
END;
$$;


--
-- Name: log_orchestrator_event(uuid, text, text, text, jsonb, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_orchestrator_event(p_orch_id uuid DEFAULT NULL::uuid, p_severity text DEFAULT 'info'::text, p_stage text DEFAULT 'INIT'::text, p_message text DEFAULT ''::text, p_payload jsonb DEFAULT '{}'::jsonb, p_execution_time_ms integer DEFAULT NULL::integer, p_error_stack text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_hash TEXT;
  v_log_id TEXT;
BEGIN
  -- Obter usuário atual
  v_user_id := auth.uid();
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Gerar hash satoshi
  v_hash := encode(sha256((now()::text || p_message || COALESCE(p_orch_id::text, ''))::bytea), 'hex');
  v_log_id := 'LOG_' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO sys_orch_logs (
    log_id, orch_id, log_severity, log_stage, log_message,
    log_payload, execution_time_ms, actor_id, actor_email,
    error_stack, satoshi_hash
  ) VALUES (
    v_log_id, p_orch_id, p_severity, p_stage, p_message,
    p_payload, p_execution_time_ms, v_user_id, v_user_email,
    p_error_stack, v_hash
  );

  -- Se for erro crítico, criar alerta
  IF p_severity = 'critical' THEN
    INSERT INTO sys_critical_alerts (
      alert_type, severity, title, message,
      source_table, source_id, metadata, satoshi_hash
    ) VALUES (
      'system', 'critical',
      'Erro Crítico no Orquestrador',
      p_message,
      'sys_orch_logs', p_orch_id,
      jsonb_build_object('stage', p_stage, 'payload', p_payload),
      v_hash
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'satoshi_hash', v_hash
  );
END;
$$;


--
-- Name: log_security_event(text, text, uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_security_event(p_event_type text, p_identifier text, p_user_id uuid DEFAULT NULL::uuid, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_details jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.security_logs (event_type, identifier, user_id, ip_address, user_agent, details)
  VALUES (p_event_type, p_identifier, p_user_id, p_ip_address, p_user_agent, p_details);
END;
$$;


--
-- Name: mine_activity_hash(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mine_activity_hash(p_user_id uuid, p_action text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_timestamp text;
  v_nonce text;
  v_hash_input text;
  v_hash text;
BEGIN
  -- Gerar timestamp ISO 8601
  v_timestamp := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  
  -- Gerar nonce aleatório
  v_nonce := encode(gen_random_bytes(8), 'hex');
  
  -- Montar string de entrada para hash
  v_hash_input := concat(
    COALESCE(p_user_id::text, 'anonymous'),
    '|',
    p_action,
    '|',
    v_timestamp,
    '|',
    v_nonce,
    '|',
    COALESCE(p_metadata::text, '{}')
  );
  
  -- Gerar hash SHA-256
  v_hash := encode(digest(v_hash_input, 'sha256'), 'hex');
  
  RETURN v_hash;
END;
$$;


--
-- Name: notify_admin_ip_banned(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_admin_ip_banned() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Only trigger on new active bans
  IF NEW.is_active = true THEN
    payload := jsonb_build_object(
      'ip_address', NEW.ip_address,
      'reason', NEW.reason,
      'blocked_variable', NEW.blocked_variable,
      'attack_type', NEW.attack_type,
      'severity', NEW.severity,
      'satoshi_hash', NEW.satoshi_hash
    );
    
    -- Log the event (edge function will be called via pg_net or manually)
    RAISE LOG 'IP Banned Alert: %', payload::text;
    
    -- Insert notification record for admin
    INSERT INTO ai_council_admin_notifications (
      notification_type,
      title,
      message,
      priority,
      action_required,
      action_type,
      action_data
    ) VALUES (
      'security_alert',
      'IP Banido pelo Sistema Satoshi',
      'O IP ' || NEW.ip_address || ' foi banido por: ' || NEW.reason,
      'high',
      true,
      'review_ban',
      payload
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  recipient_user_id UUID;
  sender_name VARCHAR;
  order_record RECORD;
BEGIN
  -- Buscar informações do pedido
  SELECT * INTO order_record FROM public.orders WHERE id = NEW.order_id;
  
  IF NEW.sender_type = 'client' THEN
    -- Notificar ambulante
    SELECT user_id INTO recipient_user_id FROM public.vendors WHERE id = order_record.vendor_id;
    SELECT name INTO sender_name FROM public.clients WHERE id = order_record.client_id;
  ELSE
    -- Notificar cliente
    SELECT user_id INTO recipient_user_id FROM public.clients WHERE id = order_record.client_id;
    SELECT full_name INTO sender_name FROM public.vendors WHERE id = order_record.vendor_id;
  END IF;
  
  -- Criar notificação
  INSERT INTO public.notifications (user_id, title, message, type, category, related_order_id)
  VALUES (
    recipient_user_id,
    'Nova mensagem',
    COALESCE(sender_name, 'Alguém') || ' enviou uma mensagem.',
    'info',
    'chat',
    NEW.order_id
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  vendor_user_id UUID;
  client_name VARCHAR;
BEGIN
  -- Buscar user_id do ambulante
  SELECT user_id INTO vendor_user_id FROM public.vendors WHERE id = NEW.vendor_id;
  
  -- Buscar nome do cliente
  SELECT name INTO client_name FROM public.clients WHERE id = NEW.client_id;
  
  -- Notificar ambulante
  INSERT INTO public.notifications (user_id, title, message, type, category, related_order_id, related_vendor_id)
  VALUES (
    vendor_user_id,
    'Novo pedido recebido!',
    'Você recebeu um novo pedido de ' || COALESCE(client_name, 'um cliente') || '. Toque para ver detalhes.',
    'info',
    'order',
    NEW.id,
    NEW.vendor_id
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  client_user_id UUID;
  vendor_name VARCHAR;
  status_message VARCHAR;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Buscar user_id do cliente
    SELECT user_id INTO client_user_id FROM public.clients WHERE id = NEW.client_id;
    
    -- Buscar nome do ambulante
    SELECT full_name INTO vendor_name FROM public.vendors WHERE id = NEW.vendor_id;
    
    -- Definir mensagem baseada no status
    CASE NEW.status
      WHEN 'accepted' THEN
        status_message := vendor_name || ' aceitou seu pedido! Aguarde a chegada.';
      WHEN 'on_the_way' THEN
        status_message := vendor_name || ' está a caminho da sua localização!';
      WHEN 'completed' THEN
        status_message := 'Pedido concluído! Obrigado por usar nosso serviço.';
      WHEN 'cancelled' THEN
        status_message := 'Seu pedido foi cancelado.';
      ELSE
        status_message := 'Status do pedido atualizado para: ' || NEW.status;
    END CASE;
    
    -- Notificar cliente
    INSERT INTO public.notifications (user_id, title, message, type, category, related_order_id)
    VALUES (
      client_user_id,
      'Atualização do pedido',
      status_message,
      CASE WHEN NEW.status = 'cancelled' THEN 'warning' ELSE 'success' END,
      'order',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: process_music_webhook(text, text, uuid, text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_music_webhook(p_event_type text, p_session_id text, p_user_id uuid DEFAULT NULL::uuid, p_source text DEFAULT 'chat'::text, p_music_query text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_video_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_event_id UUID;
  v_genre_query TEXT;
BEGIN
  -- Se for seleção de gênero, buscar query do gênero
  IF p_genre IS NOT NULL AND p_music_query IS NULL THEN
    SELECT search_query INTO v_genre_query FROM music_genres WHERE genre_key = p_genre;
    
    -- Incrementar contador do gênero
    UPDATE music_genres SET play_count = play_count + 1 WHERE genre_key = p_genre;
  ELSE
    v_genre_query := p_music_query;
  END IF;

  -- Inserir evento
  INSERT INTO chat_youtube_webhook_events (
    event_id, event_type, session_id, user_id, source,
    music_query, genre, video_id, status, metadata, payload
  ) VALUES (
    gen_random_uuid()::text,
    p_event_type,
    p_session_id,
    p_user_id,
    p_source,
    COALESCE(v_genre_query, p_music_query),
    p_genre,
    p_video_id,
    'pending',
    p_metadata,
    jsonb_build_object(
      'query', COALESCE(v_genre_query, p_music_query),
      'genre', p_genre,
      'video_id', p_video_id,
      'source', p_source
    )
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;


--
-- Name: promote_to_production(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.promote_to_production(p_admin_id uuid, p_version_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_version RECORD;
  v_safe_mode BOOLEAN;
  v_hash TEXT;
BEGIN
  -- Verificar Safe Mode
  SELECT st_safe_mode INTO v_safe_mode 
  FROM system_governance LIMIT 1;
  
  IF v_safe_mode THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Safe Mode ativo: promoção bloqueada'
    );
  END IF;
  
  -- Verificar se versão existe e está validada
  SELECT * INTO v_version FROM orch_versions WHERE id = p_version_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Versão não encontrada');
  END IF;
  
  IF NOT v_version.is_validated THEN
    RETURN jsonb_build_object('success', false, 'error', 'Versão não validada');
  END IF;
  
  -- Gerar hash
  v_hash := encode(sha256(
    (p_admin_id::text || p_version_id::text || NOW()::text)::bytea
  ), 'hex');
  
  -- Despromover versões anteriores do mesmo asset
  UPDATE orch_versions 
  SET is_production = FALSE 
  WHERE asset_type = v_version.asset_type 
    AND asset_name = v_version.asset_name
    AND is_production = TRUE;
  
  -- Promover nova versão
  UPDATE orch_versions
  SET 
    is_production = TRUE,
    promoted_at = NOW(),
    promoted_by = p_admin_id,
    satoshi_hash = v_hash
  WHERE id = p_version_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'asset', v_version.asset_name,
    'version', v_version.version_number,
    'satoshi_hash', v_hash
  );
END;
$$;


--
-- Name: protocol_parameters_audit_fn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protocol_parameters_audit_fn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_event_checksum TEXT; v_last_checksum TEXT;
BEGIN
  NEW.updated_at := NOW();
  NEW.checksum := public.generate_satoshi_checksum(jsonb_build_object('param_key', NEW.param_key, 'value', NEW.param_value), jsonb_build_object('category', NEW.category, 'updated_by', NEW.updated_by), OLD.checksum);
  SELECT event_checksum INTO v_last_checksum FROM public.ledger_events ORDER BY sequence_number DESC LIMIT 1;
  v_event_checksum := public.generate_event_checksum('PARAM_UPDATE', jsonb_build_object('param_key', NEW.param_key, 'old_value', OLD.param_value, 'new_value', NEW.param_value, 'updated_by', NEW.updated_by), v_last_checksum);
  INSERT INTO public.ledger_events (event_type, event_data, event_checksum, previous_event_checksum, actor_id, actor_type)
  VALUES ('PARAM_UPDATE', jsonb_build_object('param_key', NEW.param_key, 'old_value', OLD.param_value, 'new_value', NEW.param_value, 'category', NEW.category), v_event_checksum, v_last_checksum, NEW.updated_by, CASE WHEN NEW.last_ai_adjustment IS NOT NULL AND NEW.last_ai_adjustment > COALESCE(OLD.last_ai_adjustment, '1970-01-01') THEN 'ai_council' ELSE 'admin' END);
  RETURN NEW;
END;
$$;


--
-- Name: protocol_state_after_insert_fn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protocol_state_after_insert_fn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_last_event_checksum TEXT; v_event_checksum TEXT;
BEGIN
  SELECT event_checksum INTO v_last_event_checksum FROM public.ledger_events ORDER BY sequence_number DESC LIMIT 1;
  v_event_checksum := public.generate_event_checksum('STATE_' || NEW.operation, jsonb_build_object('tx_id', NEW.tx_id, 'entity_id', NEW.entity_id, 'key_structure', NEW.key_structure, 'version', NEW.version), v_last_event_checksum);
  INSERT INTO public.ledger_events (tx_id, event_type, event_data, event_checksum, previous_event_checksum, actor_id, actor_type)
  VALUES (NEW.tx_id, 'STATE_' || NEW.operation, jsonb_build_object('entity_id', NEW.entity_id, 'key_structure', NEW.key_structure, 'payload_hash', encode(sha256(NEW.payload::text::bytea), 'hex'), 'version', NEW.version, 'checksum', NEW.checksum), v_event_checksum, v_last_event_checksum, NEW.created_by, 'system');
  RETURN NEW;
END;
$$;


--
-- Name: protocol_state_before_insert_fn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protocol_state_before_insert_fn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_last_version INTEGER; v_last_checksum TEXT;
BEGIN
  SELECT version, checksum INTO v_last_version, v_last_checksum FROM public.protocol_state WHERE entity_id = NEW.entity_id ORDER BY version DESC LIMIT 1;
  NEW.version := COALESCE(v_last_version, 0) + 1;
  NEW.previous_checksum := v_last_checksum;
  NEW.checksum := public.generate_satoshi_checksum(NEW.payload, NEW.metadata, NEW.previous_checksum);
  RETURN NEW;
END;
$$;


--
-- Name: record_ledger_entry(uuid, character varying, character varying, numeric, character varying, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_ledger_entry(p_profile_id uuid, p_entry_type character varying, p_currency character varying, p_amount numeric, p_reference_type character varying DEFAULT NULL::character varying, p_reference_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_entry_id UUID;
BEGIN
  -- Obter saldo atual
  v_current_balance := COALESCE(public.get_balance(p_profile_id, p_currency), 0);
  
  -- Calcular novo saldo
  IF p_entry_type = 'credit' THEN
    v_new_balance := v_current_balance + p_amount;
  ELSIF p_entry_type = 'debit' THEN
    v_new_balance := v_current_balance - p_amount;
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Saldo insuficiente';
    END IF;
  ELSE
    RAISE EXCEPTION 'Tipo de entrada inválido: %', p_entry_type;
  END IF;
  
  -- Inserir entrada no ledger
  INSERT INTO public.ledger (
    profile_id, entry_type, currency, amount, balance_after,
    reference_type, reference_id, description, metadata
  ) VALUES (
    p_profile_id, p_entry_type, p_currency, p_amount, v_new_balance,
    p_reference_type, p_reference_id, p_description, p_metadata
  ) RETURNING id INTO v_entry_id;
  
  RETURN v_entry_id;
END;
$$;


--
-- Name: record_location_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_location_history() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Inserir no histórico quando localização muda
  IF NEW.location IS DISTINCT FROM OLD.location THEN
    INSERT INTO public.location_history (
      profile_id, location, latitude, longitude,
      accuracy_radius, heading, speed, altitude, source
    )
    SELECT
      NEW.profile_id,
      NEW.location,
      ST_Y(NEW.location::geometry),
      ST_X(NEW.location::geometry),
      NEW.accuracy_radius,
      NEW.heading,
      NEW.speed,
      NEW.altitude,
      NEW.location_source;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: register_daily_access(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_daily_access(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_today date := current_date;
  v_new_count integer;
  v_shell_bonus integer := 0;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF v_profile.last_access_date IS DISTINCT FROM v_today THEN
    v_new_count := COALESCE(v_profile.daily_access_count, 0) + 1;
    
    IF v_new_count % 10 = 0 THEN
      v_shell_bonus := 1;
    END IF;
    
    UPDATE profiles SET
      daily_access_count = v_new_count,
      shell_balance = COALESCE(shell_balance, 0) + v_shell_bonus,
      last_access_date = v_today,
      updated_at = now()
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
      'new_access', true,
      'daily_count', v_new_count,
      'shell_bonus', v_shell_bonus,
      'total_shells', COALESCE(v_profile.shell_balance, 0) + v_shell_bonus
    );
  END IF;
  
  RETURN jsonb_build_object(
    'new_access', false,
    'daily_count', COALESCE(v_profile.daily_access_count, 0),
    'shell_bonus', 0,
    'total_shells', COALESCE(v_profile.shell_balance, 0)
  );
END;
$$;


--
-- Name: register_information_flow(text, text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_information_flow(p_flow_type text, p_source_table text, p_source_id uuid DEFAULT NULL::uuid, p_flow_data jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
  v_risk_score DECIMAL(5,2);
  v_anomaly BOOLEAN := false;
  v_hash TEXT;
BEGIN
  v_id := gen_random_uuid();
  
  -- Calcular risk score baseado no tipo
  v_risk_score := CASE p_flow_type
    WHEN 'transaction' THEN 
      CASE WHEN (p_flow_data->>'amount')::DECIMAL > 1000 THEN 75 ELSE 25 END
    WHEN 'login_failed' THEN 80
    WHEN 'security_alert' THEN 90
    ELSE 10
  END;
  
  -- Detectar anomalia se risk > 70
  v_anomaly := v_risk_score > 70;
  
  -- Gerar hash Satoshi
  v_hash := encode(sha256((v_id::TEXT || p_flow_type || now()::TEXT)::BYTEA), 'hex');
  
  INSERT INTO public.ai_council_information_flows (
    id, flow_type, source_table, source_id, flow_data,
    risk_score, anomaly_detected, satoshi_hash
  ) VALUES (
    v_id, p_flow_type, p_source_table, p_source_id, p_flow_data,
    v_risk_score, v_anomaly, v_hash
  );
  
  -- Se anomalia, criar notificação
  IF v_anomaly THEN
    INSERT INTO public.ai_council_admin_notifications (
      notification_type, priority, title, message, action_required,
      satoshi_hash
    ) VALUES (
      'anomaly_detected', 'high',
      'Anomalia Detectada: ' || p_flow_type,
      'Risk Score: ' || v_risk_score || ' - Requer atenção imediata',
      true,
      encode(sha256((gen_random_uuid()::TEXT || now()::TEXT)::BYTEA), 'hex')
    );
  END IF;
  
  RETURN v_id;
END;
$$;


--
-- Name: satoshi_constitutional_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.satoshi_constitutional_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_prev_hash TEXT;
    v_max_seq BIGINT;
    v_input TEXT;
BEGIN
    -- A0: PROIBIÇÃO ABSOLUTA DE DELETE
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'A0_VIOLATION: LEDGER IS APPEND-ONLY';
    END IF;

    -- A0.5: GENESIS IMUTÁVEL
    IF TG_OP = 'UPDATE' AND OLD.event_type = 'GENESIS' THEN
        RAISE EXCEPTION 'A0.5_VIOLATION: GENESIS IS IMMUTABLE';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.event_type = 'GENESIS' THEN
            NEW.previous_event_hash := NULL;
            IF NEW.sequence <> 1 THEN
                RAISE EXCEPTION 'GENESIS MUST HAVE SEQUENCE = 1';
            END IF;
        ELSE
            SELECT MAX(sequence) INTO v_max_seq FROM public.satoshi_events;
            IF NEW.sequence <> COALESCE(v_max_seq, 0) + 1 THEN
                RAISE EXCEPTION 'SEQUENCE BREAK: EXPECTED %', COALESCE(v_max_seq, 0) + 1;
            END IF;
            SELECT event_hash INTO v_prev_hash
            FROM public.satoshi_events
            ORDER BY sequence DESC
            LIMIT 1;
            NEW.previous_event_hash := v_prev_hash;
        END IF;

        v_input :=
            NEW.id::text || '|' ||
            NEW.sequence::text || '|' ||
            NEW.idempotency_key || '|' ||
            NEW.event_type || '|' ||
            NEW.payload::text || '|' ||
            COALESCE(NEW.previous_event_hash,'GENESIS');

        NEW.event_hash := encode(digest(v_input,'sha256'),'hex');
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: switch_governance_phase(integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.switch_governance_phase(p_new_phase integer, p_admin_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_admin boolean;
  v_old_phase integer;
  v_hash text;
  v_governance_frozen boolean;
BEGIN
  SELECT governance_frozen INTO v_governance_frozen FROM system_governance LIMIT 1;
  
  IF v_governance_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'H-03: Governança congelada. Kill-Switch ativo.');
  END IF;

  SELECT (user_type = 'admin' OR god_mode_bypass = true) INTO v_is_admin 
  FROM profiles WHERE id = p_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: privilégios insuficientes');
  END IF;

  SELECT current_phase INTO v_old_phase FROM system_governance LIMIT 1;

  v_hash := encode(sha256(convert_to(
    p_admin_id::text || p_new_phase::text || now()::text, 'UTF8'
  )), 'hex');

  UPDATE system_governance SET
    current_phase = p_new_phase,
    sentinel_chat_active = (p_new_phase >= 1),
    base_fixed_fee = CASE 
      WHEN p_new_phase = 0 THEN 0.00
      WHEN p_new_phase IN (1, 2, 3) THEN 0.01
      WHEN p_new_phase = 4 THEN 1.00
      ELSE 0.00
    END,
    linear_meter_fee = CASE 
      WHEN p_new_phase >= 2 THEN 0.01
      ELSE 0.00
    END,
    ads_active = (p_new_phase = 0),
    withdrawal_blocked = (p_new_phase < 2),
    phase_activated_at = now(),
    phase_activated_by = p_admin_id,
    satoshi_hash = v_hash,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'old_phase', v_old_phase,
    'new_phase', p_new_phase,
    'satoshi_hash', v_hash,
    'activated_at', now()
  );
END;
$$;


--
-- Name: sync_profile_from_external(uuid, text, text, text, text, date, text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_profile_from_external(p_user_id uuid, p_full_name text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_cpf text DEFAULT NULL::text, p_data_nascimento date DEFAULT NULL::date, p_sexo text DEFAULT NULL::text, p_mother_name text DEFAULT NULL::text, p_profile_photo_url text DEFAULT NULL::text, p_user_type text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_existing RECORD;
  v_changes JSONB := '{}'::jsonb;
  v_has_changes BOOLEAN := false;
  v_result JSONB;
  v_satoshi_key TEXT;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ESTRATÉGIA DE SINCRONIZAÇÃO:
  -- 1. Buscar registro existente
  -- 2. Comparar apenas campos não-nulos do payload com valores atuais
  -- 3. Atualizar SOMENTE campos com divergência real
  -- 4. Registrar mudanças no Ledger Satoshi (append-only)
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Buscar perfil existente
  SELECT * INTO v_existing FROM public.profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Perfil não existe, retornar erro (não criar automaticamente)
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PROFILE_NOT_FOUND',
      'message', 'Perfil não encontrado. Usuário deve completar onboarding primeiro.'
    );
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- GARANTIA DE IDEMPOTÊNCIA:
  -- Apenas atualiza campos onde:
  -- 1. O valor do payload NÃO é nulo
  -- 2. O valor atual é DIFERENTE do valor enviado
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Verificar e registrar mudanças campo a campo
  IF p_full_name IS NOT NULL AND p_full_name <> '' AND v_existing.full_name <> p_full_name THEN
    v_changes := v_changes || jsonb_build_object('full_name', jsonb_build_object('old', v_existing.full_name, 'new', p_full_name));
    v_has_changes := true;
  END IF;

  IF p_email IS NOT NULL AND p_email <> '' AND v_existing.email <> p_email THEN
    v_changes := v_changes || jsonb_build_object('email', jsonb_build_object('old', v_existing.email, 'new', p_email));
    v_has_changes := true;
  END IF;

  IF p_phone IS NOT NULL AND p_phone <> '' AND COALESCE(v_existing.phone, '') <> p_phone THEN
    v_changes := v_changes || jsonb_build_object('phone', jsonb_build_object('old', v_existing.phone, 'new', p_phone));
    v_has_changes := true;
  END IF;

  IF p_data_nascimento IS NOT NULL AND v_existing.data_nascimento IS DISTINCT FROM p_data_nascimento THEN
    v_changes := v_changes || jsonb_build_object('data_nascimento', jsonb_build_object('old', v_existing.data_nascimento, 'new', p_data_nascimento));
    v_has_changes := true;
  END IF;

  IF p_sexo IS NOT NULL AND p_sexo <> '' AND COALESCE(v_existing.sexo, '') <> p_sexo THEN
    v_changes := v_changes || jsonb_build_object('sexo', jsonb_build_object('old', v_existing.sexo, 'new', p_sexo));
    v_has_changes := true;
  END IF;

  IF p_mother_name IS NOT NULL AND p_mother_name <> '' AND COALESCE(v_existing.mother_name, '') <> p_mother_name THEN
    v_changes := v_changes || jsonb_build_object('mother_name', jsonb_build_object('old', v_existing.mother_name, 'new', p_mother_name));
    v_has_changes := true;
  END IF;

  IF p_profile_photo_url IS NOT NULL AND p_profile_photo_url <> '' AND COALESCE(v_existing.profile_photo_url, '') <> p_profile_photo_url THEN
    v_changes := v_changes || jsonb_build_object('profile_photo_url', jsonb_build_object('old', v_existing.profile_photo_url, 'new', p_profile_photo_url));
    v_has_changes := true;
  END IF;

  IF p_user_type IS NOT NULL AND p_user_type <> '' AND COALESCE(v_existing.user_type, 'cliente') <> p_user_type THEN
    v_changes := v_changes || jsonb_build_object('user_type', jsonb_build_object('old', v_existing.user_type, 'new', p_user_type));
    v_has_changes := true;
  END IF;

  -- Se não houver mudanças, retornar sucesso sem alterar nada
  IF NOT v_has_changes THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'NO_CHANGES',
      'message', 'Perfil já está sincronizado. Nenhuma alteração necessária.',
      'user_id', p_user_id
    );
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- EXECUÇÃO DO UPDATE (apenas campos com mudança real)
  -- updated_at só é alterado quando há mudança efetiva
  -- ═══════════════════════════════════════════════════════════════════════════
  UPDATE public.profiles SET
    full_name = CASE WHEN p_full_name IS NOT NULL AND p_full_name <> '' THEN p_full_name ELSE full_name END,
    email = CASE WHEN p_email IS NOT NULL AND p_email <> '' THEN p_email ELSE email END,
    phone = CASE WHEN p_phone IS NOT NULL AND p_phone <> '' THEN p_phone ELSE phone END,
    data_nascimento = CASE WHEN p_data_nascimento IS NOT NULL THEN p_data_nascimento ELSE data_nascimento END,
    sexo = CASE WHEN p_sexo IS NOT NULL AND p_sexo <> '' THEN p_sexo ELSE sexo END,
    mother_name = CASE WHEN p_mother_name IS NOT NULL AND p_mother_name <> '' THEN p_mother_name ELSE mother_name END,
    profile_photo_url = CASE WHEN p_profile_photo_url IS NOT NULL AND p_profile_photo_url <> '' THEN p_profile_photo_url ELSE profile_photo_url END,
    user_type = CASE WHEN p_user_type IS NOT NULL AND p_user_type <> '' THEN p_user_type ELSE user_type END,
    metadata = CASE WHEN p_metadata IS NOT NULL THEN COALESCE(metadata, '{}'::jsonb) || p_metadata ELSE metadata END,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- AUDITORIA SATOSHI: Registrar mudança no Ledger (append-only)
  -- Gera idempotency_key única para cada sincronização
  -- ═══════════════════════════════════════════════════════════════════════════
  v_satoshi_key := 'SYNC:PROFILE:' || p_user_id::text || ':' || to_char(now(), 'YYYYMMDDHH24MISSMS');
  
  INSERT INTO public.satoshi_events (
    sequence,
    idempotency_key,
    event_type,
    payload,
    metadata,
    currency
  ) VALUES (
    COALESCE((SELECT MAX(sequence) + 1 FROM public.satoshi_events), 1),
    v_satoshi_key,
    'PROFILE_SYNC',
    jsonb_build_object(
      'user_id', p_user_id,
      'changes', v_changes,
      'fields_updated', (SELECT count(*) FROM jsonb_object_keys(v_changes)),
      'sync_source', 'external_platform'
    ),
    jsonb_build_object(
      'timestamp', now(),
      'action', 'sync_from_external'
    ),
    'ZIMBU'
  );

  -- Retornar resultado com detalhes das mudanças
  RETURN jsonb_build_object(
    'success', true,
    'action', 'UPDATED',
    'user_id', p_user_id,
    'changes', v_changes,
    'fields_updated', (SELECT count(*) FROM jsonb_object_keys(v_changes)),
    'satoshi_key', v_satoshi_key,
    'message', 'Perfil sincronizado com sucesso.'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'IDEMPOTENCY_CONFLICT',
      'message', 'Sincronização já foi processada anteriormente.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erro ao sincronizar perfil.'
    );
END;
$$;


--
-- Name: sync_social_lastro(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_social_lastro(p_profile_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_btc_equiv NUMERIC;
  v_satoshi_equiv BIGINT;
  v_trust_score NUMERIC;
  v_balance NUMERIC;
BEGIN
  -- Obter saldo atual
  SELECT COALESCE(balance_brl, 0) INTO v_balance
  FROM public.wallets WHERE profile_id = p_profile_id;
  
  -- Calcular equivalentes
  v_btc_equiv := public.calculate_btc_equivalent(v_balance);
  v_satoshi_equiv := public.calculate_satoshi_equivalent(v_balance);
  
  -- Calcular trust score (baseado no lastro + atividade)
  SELECT 
    LEAST(100, (v_btc_equiv * 1000) + (COALESCE(follower_count, 0) * 0.01) + (COALESCE(post_count, 0) * 0.1))
  INTO v_trust_score
  FROM public.social_profiles WHERE profile_id = p_profile_id;
  
  IF v_trust_score IS NULL THEN
    v_trust_score := v_btc_equiv * 1000;
  END IF;
  
  -- Atualizar wallet
  UPDATE public.wallets SET
    btc_equivalent = v_btc_equiv,
    satoshi_equivalent = v_satoshi_equiv,
    last_btc_sync = now(),
    updated_at = now()
  WHERE profile_id = p_profile_id;
  
  -- Atualizar perfil social
  UPDATE public.social_profiles SET
    btc_lastro = v_btc_equiv,
    satoshi_lastro = v_satoshi_equiv,
    btc_trust_score = LEAST(100, v_trust_score),
    updated_at = now()
  WHERE profile_id = p_profile_id;
  
  -- Registrar evento no conselho
  INSERT INTO public.ai_council_events (
    event_type, agent_id, target_type, target_id, decision_payload, btc_context
  ) VALUES (
    'lastro_sync',
    'system_sync',
    'profile',
    p_profile_id,
    jsonb_build_object(
      'action', 'sync_social_lastro',
      'balance_brl', v_balance,
      'btc_equivalent', v_btc_equiv,
      'satoshi_equivalent', v_satoshi_equiv
    ),
    jsonb_build_object(
      'parity', public.get_btc_parity(),
      'trust_score', v_trust_score,
      'synced_at', now()
    )
  );
END;
$$;


--
-- Name: sync_youtube_to_social_lastro(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_youtube_to_social_lastro(p_profile_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_views BIGINT;
  v_total_engagement NUMERIC;
  v_channel_trust NUMERIC;
  v_btc_parity NUMERIC;
  v_btc_bonus NUMERIC;
  v_result JSONB;
BEGIN
  SELECT COALESCE(btc_parity_last, 650000) INTO v_btc_parity
  FROM public.cache_store
  WHERE cache_key = 'btc_brl_rate'
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT 
    COALESCE(SUM(view_count), 0),
    COALESCE(AVG(engagement_score), 0),
    COALESCE(AVG(trust_multiplier), 1.0)
  INTO v_total_views, v_total_engagement, v_channel_trust
  FROM public.youtube_videos
  WHERE profile_id = p_profile_id AND is_active = true;

  v_btc_bonus := (v_total_views / 1000.0) / 100000000.0;

  UPDATE public.social_profiles
  SET 
    btc_trust_score = COALESCE(btc_trust_score, 0) + (v_channel_trust * 0.1),
    btc_lastro = COALESCE(btc_lastro, 0) + v_btc_bonus,
    satoshi_lastro = COALESCE(satoshi_lastro, 0) + (v_total_views / 1000),
    updated_at = now()
  WHERE profile_id = p_profile_id;

  INSERT INTO public.ai_council_events (
    agent_id, event_type, target_type, target_id, decision_payload, project_id
  ) VALUES (
    'youtube-sync-agent', 'youtube_lastro_sync', 'profile', p_profile_id::TEXT,
    jsonb_build_object(
      'total_views', v_total_views,
      'engagement_score', v_total_engagement,
      'trust_multiplier', v_channel_trust,
      'btc_bonus', v_btc_bonus,
      'btc_parity', v_btc_parity
    ),
    'kaizpbklfejiqpruwnxi'
  );

  v_result := jsonb_build_object(
    'success', true,
    'profile_id', p_profile_id,
    'total_views', v_total_views,
    'trust_multiplier', v_channel_trust,
    'btc_bonus', v_btc_bonus
  );
  RETURN v_result;
END;
$$;


--
-- Name: toggle_kill_switch(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.toggle_kill_switch(p_admin_id uuid, p_freeze boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_admin boolean;
  v_hash text;
BEGIN
  SELECT (user_type = 'admin' OR god_mode_bypass = true) INTO v_is_admin 
  FROM profiles WHERE id = p_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  v_hash := encode(sha256(convert_to(
    p_admin_id::text || p_freeze::text || now()::text, 'UTF8'
  )), 'hex');

  UPDATE system_governance SET
    governance_frozen = p_freeze,
    satoshi_hash = v_hash,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'governance_frozen', p_freeze,
    'satoshi_hash', v_hash
  );
END;
$$;


--
-- Name: toggle_safe_mode(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.toggle_safe_mode(p_admin_id uuid, p_activate boolean, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_hash TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar se é admin usando user_roles
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_admin_id AND role = 'admin')
  INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: não é admin');
  END IF;
  
  -- Gerar hash Satoshi
  v_hash := encode(sha256(
    (p_admin_id::text || p_activate::text || NOW()::text || COALESCE(p_reason, ''))::bytea
  ), 'hex');
  
  -- Atualizar governance
  UPDATE system_governance
  SET 
    st_safe_mode = p_activate,
    safe_mode_activated_at = CASE WHEN p_activate THEN NOW() ELSE NULL END,
    safe_mode_reason = CASE WHEN p_activate THEN p_reason ELSE NULL END,
    satoshi_hash = v_hash
  WHERE id = (SELECT id FROM system_governance LIMIT 1);
  
  -- Atualizar tabela de safe mode
  UPDATE safe_mode_state
  SET 
    is_active = p_activate,
    activated_at = CASE WHEN p_activate THEN NOW() ELSE NULL END,
    activated_by = CASE WHEN p_activate THEN p_admin_id ELSE NULL END,
    reason = CASE WHEN p_activate THEN p_reason ELSE NULL END,
    satoshi_hash = v_hash,
    updated_at = NOW()
  WHERE id = (SELECT id FROM safe_mode_state LIMIT 1);
  
  RETURN jsonb_build_object(
    'success', true,
    'safe_mode', p_activate,
    'satoshi_hash', v_hash
  );
END;
$$;


--
-- Name: trigger_chat_webhook(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_chat_webhook() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_event_type TEXT;
  v_payload JSONB;
  v_user_id UUID;
BEGIN
  -- Determinar tipo de evento
  IF TG_TABLE_NAME = 'chat_sessions' THEN
    IF TG_OP = 'INSERT' THEN
      v_event_type := 'session.created';
    ELSIF TG_OP = 'UPDATE' THEN
      v_event_type := 'session.updated';
    END IF;
    v_user_id := NEW.user_id;
    v_payload := jsonb_build_object(
      'session_id', NEW.id,
      'title', NEW.title,
      'model_used', NEW.model_used,
      'message_count', NEW.message_count
    );
    
    INSERT INTO public.chat_webhook_events (
      event_type, session_id, user_id, payload
    ) VALUES (
      v_event_type, NEW.id, v_user_id, v_payload
    );
    
  ELSIF TG_TABLE_NAME = 'chat_messages' THEN
    v_event_type := 'message.' || NEW.role;
    
    SELECT user_id INTO v_user_id 
    FROM public.chat_sessions 
    WHERE id = NEW.session_id;
    
    v_payload := jsonb_build_object(
      'message_id', NEW.id,
      'session_id', NEW.session_id,
      'role', NEW.role,
      'content_preview', LEFT(NEW.content, 100),
      'tokens_used', NEW.tokens_used,
      'response_time_ms', NEW.response_time_ms
    );
    
    INSERT INTO public.chat_webhook_events (
      event_type, session_id, user_id, message_id, payload
    ) VALUES (
      v_event_type, NEW.session_id, v_user_id, NEW.id, v_payload
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_critical_alert_on_error(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_critical_alert_on_error() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_alert_hash TEXT;
BEGIN
  IF NEW.log_severity = 'error' THEN
    -- Gerar hash para o alerta
    v_alert_hash := encode(sha256(
      (NEW.id::text || NEW.log_message || now()::text)::bytea
    ), 'hex');
    
    INSERT INTO sys_critical_alerts (
      alert_type,
      alert_title,
      alert_message,
      alert_severity,
      source_table,
      source_id,
      requires_action,
      satoshi_hash
    ) VALUES (
      'error_detected',
      'Erro Crítico Detectado no Orquestrador',
      format('Log ID: %s - %s (Stage: %s)', NEW.id, NEW.log_message, NEW.log_stage),
      'critical',
      'sys_orch_logs',
      NEW.id,
      true,
      v_alert_hash
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_optimization_guidance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_optimization_guidance() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_timeout_ms INTEGER;
  v_guidance_hash TEXT;
  v_orch_record RECORD;
BEGIN
  -- Buscar o timeout configurado para este orquestrador
  SELECT ov.timeout_ms, ov.orch_id, o.orch_name, o.orch_type
  INTO v_orch_record
  FROM orch_versions ov
  JOIN sys_orchestrator o ON o.id = ov.orch_id
  WHERE ov.orch_id = NEW.orch_id
  AND ov.is_current = true;
  
  -- Verificar se o tempo de execução excede o timeout
  IF v_orch_record.timeout_ms IS NOT NULL 
     AND NEW.execution_time_ms > v_orch_record.timeout_ms THEN
    
    v_guidance_hash := encode(sha256(
      (NEW.id::text || 'optimization' || now()::text)::bytea
    ), 'hex');
    
    INSERT INTO sys_ai_guidance (
      guidance_type,
      guidance_title,
      guidance_description,
      guidance_steps,
      guidance_code,
      target_table,
      target_id,
      priority,
      status,
      satoshi_hash
    ) VALUES (
      'optimization',
      format('Otimização Necessária: %s', COALESCE(v_orch_record.orch_name, 'Componente')),
      format('O tempo de execução (%sms) excedeu o limite configurado (%sms). Recomenda-se otimização.', 
        NEW.execution_time_ms, v_orch_record.timeout_ms),
      jsonb_build_array(
        jsonb_build_object('step', 1, 'action', 'Analisar o código do componente'),
        jsonb_build_object('step', 2, 'action', 'Identificar gargalos de performance'),
        jsonb_build_object('step', 3, 'action', 'Implementar cache se aplicável'),
        jsonb_build_object('step', 4, 'action', 'Otimizar queries SQL'),
        jsonb_build_object('step', 5, 'action', 'Testar e validar melhorias')
      ),
      format('-- Sugestão de otimização para %s
-- Tempo atual: %sms | Limite: %sms
-- Considere adicionar índices ou cache', 
        COALESCE(v_orch_record.orch_name, 'componente'),
        NEW.execution_time_ms, 
        v_orch_record.timeout_ms),
      'sys_orch_logs',
      NEW.id,
      CASE 
        WHEN NEW.execution_time_ms > v_orch_record.timeout_ms * 2 THEN 'critical'
        WHEN NEW.execution_time_ms > v_orch_record.timeout_ms * 1.5 THEN 'high'
        ELSE 'medium'
      END,
      'pending',
      v_guidance_hash
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_chat_analytics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_chat_analytics() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.chat_analytics (date, total_messages)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date) DO UPDATE
  SET 
    total_messages = public.chat_analytics.total_messages + 1,
    avg_response_time_ms = CASE 
      WHEN NEW.response_time_ms IS NOT NULL 
      THEN (public.chat_analytics.avg_response_time_ms + NEW.response_time_ms) / 2
      ELSE public.chat_analytics.avg_response_time_ms
    END,
    total_tokens_used = public.chat_analytics.total_tokens_used + COALESCE(NEW.tokens_used, 0),
    positive_feedback_count = public.chat_analytics.positive_feedback_count + 
      CASE WHEN NEW.feedback_rating >= 4 THEN 1 ELSE 0 END,
    negative_feedback_count = public.chat_analytics.negative_feedback_count + 
      CASE WHEN NEW.feedback_rating IS NOT NULL AND NEW.feedback_rating < 3 THEN 1 ELSE 0 END;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_chat_session_counters(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_chat_session_counters() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.chat_sessions
  SET 
    message_count = message_count + 1,
    total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
    last_activity_at = now(),
    updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_post_weighted_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_post_weighted_score() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.weighted_score := (NEW.like_count * GREATEST(NEW.author_btc_lastro, 0.00000001)) + 
                        (NEW.comment_count * 0.5 * GREATEST(NEW.author_btc_lastro, 0.00000001)) +
                        (NEW.repost_count * 2 * GREATEST(NEW.author_btc_lastro, 0.00000001));
  RETURN NEW;
END;
$$;


--
-- Name: update_satoshi_daily_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_satoshi_daily_metrics() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_audited INTEGER;
  v_total_verified INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_audited FROM public.ledger WHERE satoshi_hash IS NOT NULL;
  SELECT COUNT(*) INTO v_total_verified FROM public.ai_council_events WHERE audit_hash IS NOT NULL;
  
  INSERT INTO public.satoshi_metrics (metric_date, total_audited, total_verified, integrity_score)
  VALUES (CURRENT_DATE, v_total_audited, v_total_verified, 100.00)
  ON CONFLICT (metric_date) DO UPDATE SET
    total_audited = EXCLUDED.total_audited,
    total_verified = EXCLUDED.total_verified,
    updated_at = now();
END;
$$;


--
-- Name: update_system_vaults_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_system_vaults_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_vendor_location(uuid, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vendor_location(p_profile_id uuid, p_latitude double precision, p_longitude double precision) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.vendors_new
  SET 
    location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
    location_updated_at = now()
  WHERE profile_id = p_profile_id;
END;
$$;


--
-- Name: update_vendor_location_precise(uuid, double precision, double precision, double precision, double precision, double precision, double precision, double precision, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vendor_location_precise(p_profile_id uuid, p_latitude double precision, p_longitude double precision, p_accuracy_radius double precision DEFAULT NULL::double precision, p_heading double precision DEFAULT NULL::double precision, p_speed double precision DEFAULT NULL::double precision, p_altitude double precision DEFAULT NULL::double precision, p_altitude_accuracy double precision DEFAULT NULL::double precision, p_source character varying DEFAULT 'gps'::character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_location geography;
  v_old_location geography;
  v_distance_moved double precision := 0;
  v_is_valid boolean := true;
  v_rejection_reason text := NULL;
BEGIN
  -- Validar precisão mínima (rejeitar sinais com accuracy > 50m)
  IF p_accuracy_radius IS NOT NULL AND p_accuracy_radius > 50 THEN
    v_is_valid := false;
    v_rejection_reason := 'Precisão insuficiente: ' || round(p_accuracy_radius::numeric, 1) || 'm (máximo 50m)';
  END IF;
  
  -- Criar ponto geográfico
  v_location := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
  
  -- Obter localização anterior para calcular distância movida
  SELECT location INTO v_old_location
  FROM public.vendors
  WHERE profile_id = p_profile_id;
  
  IF v_old_location IS NOT NULL THEN
    v_distance_moved := ST_Distance(v_location, v_old_location);
  END IF;
  
  -- Se válido, atualizar
  IF v_is_valid THEN
    UPDATE public.vendors
    SET
      location = v_location,
      heading = p_heading,
      speed = p_speed,
      accuracy_radius = p_accuracy_radius,
      altitude = p_altitude,
      altitude_accuracy = p_altitude_accuracy,
      location_source = p_source,
      location_updated_at = now(),
      updated_at = now()
    WHERE profile_id = p_profile_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', v_is_valid,
    'latitude', p_latitude,
    'longitude', p_longitude,
    'accuracy', p_accuracy_radius,
    'heading', p_heading,
    'speed', p_speed,
    'distance_moved', round(v_distance_moved::numeric, 2),
    'rejection_reason', v_rejection_reason,
    'timestamp', now()
  );
END;
$$;


--
-- Name: update_vendor_shop_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vendor_shop_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_video_engagement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_video_engagement() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.engagement_score := calculate_video_engagement(NEW.view_count, NEW.like_count, NEW.comment_count);
  NEW.trust_multiplier := calculate_youtube_trust_multiplier(NEW.view_count, NEW.like_count, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_checkout_balance(uuid, numeric, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_checkout_balance(p_profile_id uuid, p_amount numeric, p_currency character varying DEFAULT 'BRL'::character varying) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  current_balance := public.get_user_balance(p_profile_id, p_currency);
  RETURN current_balance >= p_amount;
END;
$$;


--
-- Name: validate_cpf(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_cpf(cpf_value text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
BEGIN
  RETURN cpf_value ~ '^\d{11}$';
END;
$_$;


--
-- Name: validate_feed_comment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_feed_comment() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Limit content to 20 characters
  IF length(NEW.content) > 20 THEN
    RAISE EXCEPTION 'Comentário deve ter no máximo 20 caracteres';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_feed_post(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_feed_post() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Limit text_content to 30 characters
  IF NEW.text_content IS NOT NULL AND length(NEW.text_content) > 30 THEN
    RAISE EXCEPTION 'Legenda deve ter no máximo 30 caracteres';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_version(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_version(p_admin_id uuid, p_version_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_hash TEXT;
BEGIN
  v_hash := encode(sha256(
    (p_admin_id::text || p_version_id::text || NOW()::text)::bytea
  ), 'hex');
  
  UPDATE orch_versions
  SET 
    is_validated = TRUE,
    validated_at = NOW(),
    validated_by = p_admin_id,
    satoshi_hash = v_hash
  WHERE id = p_version_id;
  
  RETURN jsonb_build_object('success', true, 'satoshi_hash', v_hash);
END;
$$;


--
-- Name: verify_satoshi_hash(text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_satoshi_hash(p_table_name text, p_record_id uuid, p_stored_hash text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_computed_hash TEXT;
  v_record_data TEXT;
BEGIN
  -- Recalcular o hash baseado nos dados do registro
  EXECUTE format(
    'SELECT encode(sha256(row_to_json(t)::text::bytea), ''hex'') FROM %I t WHERE id = $1',
    p_table_name
  ) INTO v_computed_hash USING p_record_id;
  
  -- Comparar com o hash armazenado
  RETURN v_computed_hash = p_stored_hash;
END;
$_$;


--
-- Name: verify_satoshi_integrity(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_satoshi_integrity(p_hash text) RETURNS TABLE(is_valid boolean, source_table text, record_id uuid, details jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT true, 'ledger'::TEXT, l.id, jsonb_build_object('amount', l.amount, 'type', l.entry_type)
  FROM public.ledger l WHERE l.satoshi_hash = p_hash
  UNION ALL
  SELECT true, 'orders'::TEXT, o.id, jsonb_build_object('amount', o.total_amount, 'status', o.status)
  FROM public.orders o WHERE o.satoshi_hash = p_hash
  UNION ALL
  SELECT true, 'payments'::TEXT, p.id, jsonb_build_object('amount', p.amount, 'status', p.status)
  FROM public.payments p WHERE p.satoshi_hash = p_hash
  UNION ALL
  SELECT true, 'ai_council_events'::TEXT, a.id, a.decision_payload
  FROM public.ai_council_events a WHERE a.audit_hash = p_hash;
END;
$$;


--
-- Name: verify_satoshi_integrity_v2(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_satoshi_integrity_v2(p_entity_id uuid DEFAULT NULL::uuid, p_full_chain boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_record RECORD; v_violations JSONB := '[]'::JSONB; v_is_valid BOOLEAN := TRUE; v_total_checked INTEGER := 0; v_result_checksum TEXT; v_start_time TIMESTAMPTZ := NOW();
BEGIN
  FOR v_record IN SELECT * FROM public.protocol_state WHERE (p_entity_id IS NULL OR entity_id = p_entity_id) ORDER BY entity_id, version LOOP
    v_total_checked := v_total_checked + 1;
    IF v_record.checksum IS NULL OR LENGTH(v_record.checksum) != 64 THEN v_is_valid := FALSE; v_violations := v_violations || jsonb_build_object('tx_id', v_record.tx_id, 'entity_id', v_record.entity_id, 'version', v_record.version, 'issue', 'Invalid checksum'); END IF;
  END LOOP;
  IF p_full_chain THEN
    FOR v_record IN SELECT * FROM public.ledger_events ORDER BY sequence_number LOOP
      v_total_checked := v_total_checked + 1;
      IF v_record.event_checksum IS NULL OR LENGTH(v_record.event_checksum) != 64 THEN v_is_valid := FALSE; v_violations := v_violations || jsonb_build_object('event_id', v_record.event_id, 'sequence', v_record.sequence_number, 'issue', 'Invalid event checksum'); END IF;
    END LOOP;
  END IF;
  v_result_checksum := encode(sha256((v_violations::TEXT || v_total_checked::TEXT)::bytea), 'hex');
  INSERT INTO public.integrity_validations (validation_type, scope_entity_id, is_valid, total_records_checked, violations_found, violations, execution_time_ms, result_checksum)
  VALUES (CASE WHEN p_full_chain THEN 'chain_full' WHEN p_entity_id IS NOT NULL THEN 'entity_specific' ELSE 'chain_partial' END, p_entity_id, v_is_valid, v_total_checked, jsonb_array_length(v_violations), v_violations, EXTRACT(MILLISECONDS FROM (NOW() - v_start_time))::INTEGER, v_result_checksum);
  RETURN jsonb_build_object('is_valid', v_is_valid, 'total_checked', v_total_checked, 'violations_count', jsonb_array_length(v_violations), 'violations', v_violations, 'execution_time_ms', EXTRACT(MILLISECONDS FROM (NOW() - v_start_time))::INTEGER, 'result_checksum', v_result_checksum);
END;
$$;


--
-- Name: verify_transaction_proximity(uuid, double precision, double precision, double precision, double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_transaction_proximity(p_order_id uuid, p_client_lat double precision, p_client_lng double precision, p_client_accuracy double precision, p_vendor_lat double precision, p_vendor_lng double precision, p_vendor_accuracy double precision, p_max_distance_meters double precision DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_distance double precision;
  v_effective_margin double precision;
  v_is_valid boolean;
  v_location_hash text;
  v_timestamp timestamptz := now();
BEGIN
  -- Calcular distância precisa com Vincenty
  v_distance := calculate_vincenty_distance(p_client_lat, p_client_lng, p_vendor_lat, p_vendor_lng);
  
  -- Margem efetiva = distância máxima + soma das precisões (overlap de círculos de erro)
  v_effective_margin := p_max_distance_meters + COALESCE(p_client_accuracy, 0) + COALESCE(p_vendor_accuracy, 0);
  
  -- Verificar se a distância está dentro da margem permitida
  v_is_valid := v_distance <= v_effective_margin;
  
  -- Gerar hash de prova de presença (Proof of Presence)
  v_location_hash := encode(
    sha256(
      (p_order_id::text || '|' || 
       p_client_lat::text || ',' || p_client_lng::text || '|' ||
       p_vendor_lat::text || ',' || p_vendor_lng::text || '|' ||
       extract(epoch from v_timestamp)::text)::bytea
    ),
    'hex'
  );
  
  -- Atualizar o pedido com os dados de verificação
  UPDATE public.orders
  SET
    client_latitude = p_client_lat,
    client_longitude = p_client_lng,
    client_accuracy_radius = p_client_accuracy,
    vendor_latitude = p_vendor_lat,
    vendor_longitude = p_vendor_lng,
    vendor_accuracy_radius = p_vendor_accuracy,
    distance_at_checkout = v_distance,
    proximity_verified = v_is_valid,
    proximity_verified_at = CASE WHEN v_is_valid THEN v_timestamp ELSE NULL END,
    location_auth_hash = v_location_hash,
    updated_at = v_timestamp
  WHERE id = p_order_id;
  
  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'distance_meters', round(v_distance::numeric, 2),
    'effective_margin', round(v_effective_margin::numeric, 2),
    'max_allowed', p_max_distance_meters,
    'client_accuracy', COALESCE(p_client_accuracy, 0),
    'vendor_accuracy', COALESCE(p_vendor_accuracy, 0),
    'location_auth_hash', v_location_hash,
    'verified_at', v_timestamp,
    'message', CASE 
      WHEN v_is_valid THEN 'Proximidade verificada com sucesso'
      ELSE 'Distância excede o limite permitido de ' || p_max_distance_meters || 'm'
    END
  );
END;
$$;


SET default_table_access_method = heap;

--
-- Name: account_identifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_identifiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    public_key character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_catalogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_catalogs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    company_logo_url text,
    catalog_url text,
    twitter_handle text,
    contact_email text,
    monthly_fee numeric(10,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    impressions_count integer DEFAULT 0,
    clicks_count integer DEFAULT 0,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: adam_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adam_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text,
    severity text DEFAULT 'info'::text,
    action_required boolean DEFAULT false,
    action_data jsonb,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    source_error_id uuid,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid NOT NULL,
    account_type text NOT NULL,
    linked_vendor_id uuid,
    linked_client_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_ai_verdicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_ai_verdicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    category text NOT NULL,
    problem_description text NOT NULL,
    context_data jsonb DEFAULT '{}'::jsonb,
    gemini_response text,
    gpt_response text,
    deepseek_response text,
    final_verdict text NOT NULL,
    solutions jsonb DEFAULT '[]'::jsonb,
    consensus_reached boolean DEFAULT false,
    processing_time_ms integer,
    requested_by uuid,
    CONSTRAINT admin_ai_verdicts_category_check CHECK ((category = ANY (ARRAY['TECNICA/SEGURANÇA'::text, 'COMERCIAL/ESTRATÉGIA'::text])))
);

ALTER TABLE ONLY public.admin_ai_verdicts REPLICA IDENTITY FULL;


--
-- Name: admin_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    indicator_name text,
    indicator_value numeric,
    threshold_value numeric,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_allowed_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_allowed_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    added_by uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    month date NOT NULL,
    goal_type text NOT NULL,
    goal_name text NOT NULL,
    target_value numeric DEFAULT 0 NOT NULL,
    current_value numeric DEFAULT 0 NOT NULL,
    unit text DEFAULT 'count'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_capability_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_capability_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    capability_key text NOT NULL,
    capability_name text NOT NULL,
    description text,
    output_category text NOT NULL,
    icon_name text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_cognitive_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_cognitive_health (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    provider text NOT NULL,
    fidelity_index numeric(5,2),
    bias_direction text,
    avg_reasoning_length integer,
    short_reasoning_count integer,
    total_tokens_used integer,
    total_cost_usd numeric(10,4),
    decisions_approved integer,
    decisions_blocked integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_cognitive_health_bias_direction_check CHECK ((bias_direction = ANY (ARRAY['profit'::text, 'restriction'::text, 'balanced'::text])))
);


--
-- Name: ai_council_admin_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_admin_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_type text NOT NULL,
    priority text DEFAULT 'normal'::text,
    title text NOT NULL,
    message text NOT NULL,
    source_agent_id uuid,
    source_suggestion_id uuid,
    source_decision_id uuid,
    action_required boolean DEFAULT false,
    action_type text,
    action_data jsonb,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    is_archived boolean DEFAULT false,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_council_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_key text NOT NULL,
    agent_name text NOT NULL,
    agent_role text NOT NULL,
    specialization text[],
    is_active boolean DEFAULT true,
    last_activity_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_council_code_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_code_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_path text NOT NULL,
    line_start integer NOT NULL,
    line_end integer,
    issue_type text NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    suggested_fix text,
    detected_by text DEFAULT 'ai_analyzer'::text,
    status text DEFAULT 'open'::text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_council_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    suggestion_id uuid,
    decision_type text NOT NULL,
    consensus_level numeric(5,2) DEFAULT 0,
    participating_agents text[],
    decision_summary text NOT NULL,
    execution_status text DEFAULT 'pending'::text,
    execution_details jsonb,
    approved_by uuid,
    approved_at timestamp with time zone,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_council_diagnostics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_diagnostics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    problem_title text NOT NULL,
    problem_description text NOT NULL,
    severity text DEFAULT 'medium'::text,
    status text DEFAULT 'pending'::text,
    sql_correction text,
    lovable_prompt text,
    detected_by text DEFAULT 'satoshi'::text,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolved_by uuid,
    CONSTRAINT ai_council_diagnostics_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT ai_council_diagnostics_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'resolved'::text, 'ignored'::text])))
);


--
-- Name: ai_council_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id text DEFAULT 'kaizpbklfejiqpruwnxi'::text,
    event_type text NOT NULL,
    agent_id text NOT NULL,
    target_type text,
    target_id uuid,
    decision_payload jsonb NOT NULL,
    btc_context jsonb,
    user_id uuid,
    session_id text,
    ip_hash text,
    consensus_required boolean DEFAULT false,
    consensus_reached boolean,
    audit_hash text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.ai_council_events REPLICA IDENTITY FULL;


--
-- Name: ai_council_growth_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_growth_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_key text NOT NULL,
    metric_name text NOT NULL,
    category text NOT NULL,
    current_value numeric(15,2) DEFAULT 0,
    previous_value numeric(15,2) DEFAULT 0,
    target_value numeric(15,2),
    trend text DEFAULT 'stable'::text,
    growth_rate numeric(8,4) DEFAULT 0,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_council_information_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_information_flows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flow_type text NOT NULL,
    source_table text NOT NULL,
    source_id uuid,
    flow_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    risk_score numeric(5,2) DEFAULT 0,
    anomaly_detected boolean DEFAULT false,
    anomaly_details jsonb,
    processed_by text[],
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_council_meeting_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_meeting_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    sender_type text NOT NULL,
    sender_id text,
    sender_name text NOT NULL,
    message_content text NOT NULL,
    message_type text DEFAULT 'text'::text,
    attachments jsonb,
    is_pinned boolean DEFAULT false,
    reactions jsonb DEFAULT '{}'::jsonb,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_council_notification_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_notification_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid,
    activity_type text NOT NULL,
    actor_id uuid,
    actor_type text,
    activity_data jsonb,
    previous_activity_hash text,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_council_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_proposals (
    proposal_id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_type text NOT NULL,
    target_param_key text,
    current_value numeric,
    proposed_value numeric,
    justification text NOT NULL,
    ecosystem_analysis jsonb DEFAULT '{}'::jsonb NOT NULL,
    votes_for integer DEFAULT 0,
    votes_against integer DEFAULT 0,
    total_agents integer DEFAULT 3,
    consensus_reached boolean DEFAULT false,
    status text DEFAULT 'pending'::text,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
    executed_at timestamp with time zone,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_agent text,
    CONSTRAINT ai_council_proposals_proposal_type_check CHECK ((proposal_type = ANY (ARRAY['fee_adjustment'::text, 'parameter_change'::text, 'emergency_action'::text, 'system_optimization'::text]))),
    CONSTRAINT ai_council_proposals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'executed'::text, 'expired'::text])))
);


--
-- Name: ai_council_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_type text DEFAULT 'standard'::text,
    session_topic text,
    participants text[],
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    session_summary jsonb,
    decisions_made integer DEFAULT 0,
    suggestions_generated integer DEFAULT 0,
    status text DEFAULT 'active'::text,
    satoshi_hash text
);


--
-- Name: ai_council_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_council_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid,
    suggestion_type text NOT NULL,
    priority text DEFAULT 'medium'::text,
    title text NOT NULL,
    description text NOT NULL,
    impact_score numeric(5,2) DEFAULT 0,
    effort_score numeric(5,2) DEFAULT 0,
    affected_areas text[],
    implementation_steps jsonb,
    status text DEFAULT 'pending'::text,
    admin_response text,
    responded_at timestamp with time zone,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_decision_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_decision_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    decision_scope public.ai_decision_scope NOT NULL,
    agent_id text NOT NULL,
    decision_summary text NOT NULL,
    affected_users integer DEFAULT 0,
    affected_entities jsonb DEFAULT '[]'::jsonb,
    parameters_modified jsonb DEFAULT '{}'::jsonb,
    impact_assessment jsonb DEFAULT '{}'::jsonb,
    reversible boolean DEFAULT true,
    executed_at timestamp with time zone DEFAULT now(),
    rolled_back_at timestamp with time zone,
    rolled_back_by text,
    rollback_reason text,
    satoshi_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_external_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_external_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    fallback_provider text,
    task_type text NOT NULL,
    priority text DEFAULT 'normal'::text,
    is_critical boolean DEFAULT false,
    input_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    output_data jsonb,
    output_data_b jsonb,
    provider_b text,
    consensus_status text,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    tokens_used integer DEFAULT 0,
    tokens_cost_usd numeric(10,6) DEFAULT 0,
    processing_time_ms integer,
    reasoning_logic text,
    reasoning_logic_b text,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_by uuid,
    CONSTRAINT ai_external_tasks_consensus_status_check CHECK ((consensus_status = ANY (ARRAY['pending'::text, 'agreement'::text, 'conflict_detected'::text, 'resolved'::text]))),
    CONSTRAINT ai_external_tasks_fallback_provider_check CHECK ((fallback_provider = ANY (ARRAY['openai'::text, 'anthropic'::text, 'perplexity'::text, 'lovable'::text]))),
    CONSTRAINT ai_external_tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT ai_external_tasks_provider_check CHECK ((provider = ANY (ARRAY['openai'::text, 'anthropic'::text, 'perplexity'::text, 'lovable'::text]))),
    CONSTRAINT ai_external_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'conflict_detected'::text])))
);


--
-- Name: ai_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    metric_type text NOT NULL,
    category text NOT NULL,
    value jsonb,
    description text,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    suggested_by text DEFAULT 'ai_council'::text,
    CONSTRAINT ai_metrics_metric_type_check CHECK ((metric_type = ANY (ARRAY['fixed'::text, 'rotating'::text])))
);


--
-- Name: ai_provider_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_provider_health (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    status text DEFAULT 'unknown'::text NOT NULL,
    last_success_at timestamp with time zone,
    last_failure_at timestamp with time zone,
    consecutive_failures integer DEFAULT 0,
    total_requests integer DEFAULT 0,
    total_failures integer DEFAULT 0,
    avg_latency_ms integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_provider_health_provider_check CHECK ((provider = ANY (ARRAY['openai'::text, 'anthropic'::text, 'perplexity'::text, 'lovable'::text]))),
    CONSTRAINT ai_provider_health_status_check CHECK ((status = ANY (ARRAY['healthy'::text, 'degraded'::text, 'down'::text, 'unknown'::text])))
);


--
-- Name: ai_provider_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_provider_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id text NOT NULL,
    user_id uuid,
    request_type text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    latency_ms integer,
    success boolean DEFAULT true NOT NULL,
    error_message text,
    cost_usd numeric(10,6),
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id text NOT NULL,
    provider_name text NOT NULL,
    provider_company text NOT NULL,
    api_key_ref text NOT NULL,
    status text DEFAULT 'inactive'::text NOT NULL,
    capabilities jsonb DEFAULT '{}'::jsonb NOT NULL,
    output_types text[] DEFAULT ARRAY['text'::text] NOT NULL,
    latency_profile text DEFAULT 'medium'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_default boolean DEFAULT false,
    priority integer DEFAULT 100,
    max_tokens integer,
    cost_per_1k_tokens numeric(10,6),
    legacy_format jsonb,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_providers_latency_profile_check CHECK ((latency_profile = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT ai_providers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'deprecated'::text, 'testing'::text])))
);


--
-- Name: amendment_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amendment_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amendment_id uuid NOT NULL,
    voter_id uuid NOT NULL,
    voter_type text NOT NULL,
    vote text NOT NULL,
    reasoning text,
    voted_at timestamp with time zone DEFAULT now() NOT NULL,
    vote_weight numeric(5,2) DEFAULT 1,
    satoshi_hash text,
    CONSTRAINT amendment_votes_vote_check CHECK ((vote = ANY (ARRAY['for'::text, 'against'::text, 'abstain'::text])))
);


--
-- Name: arbitration_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arbitration_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_number text NOT NULL,
    plaintiff_id uuid NOT NULL,
    defendant_id uuid NOT NULL,
    case_type text NOT NULL,
    case_summary text NOT NULL,
    evidence_plaintiff jsonb DEFAULT '[]'::jsonb,
    evidence_defendant jsonb DEFAULT '[]'::jsonb,
    status public.arbitration_status DEFAULT 'submitted'::public.arbitration_status NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_at timestamp with time zone,
    decision_at timestamp with time zone,
    appeal_deadline timestamp with time zone,
    appeal_count integer DEFAULT 0,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT arbitration_cases_appeal_count_check CHECK ((appeal_count <= 1))
);


--
-- Name: arbitration_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arbitration_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    decision_summary text NOT NULL,
    decision_details jsonb DEFAULT '{}'::jsonb,
    votes_for_plaintiff integer DEFAULT 0,
    votes_for_defendant integer DEFAULT 0,
    votes_neutral integer DEFAULT 0,
    remedies_ordered jsonb DEFAULT '[]'::jsonb,
    ai_fact_presentation jsonb DEFAULT '{}'::jsonb,
    ai_impact_simulation jsonb DEFAULT '{}'::jsonb,
    is_final boolean DEFAULT false,
    finalized_at timestamp with time zone,
    satoshi_hash text NOT NULL,
    immutable_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: arbitration_panels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arbitration_panels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    arbitrator_id uuid NOT NULL,
    panel_position integer NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    vote text,
    vote_reasoning text,
    voted_at timestamp with time zone,
    recused boolean DEFAULT false,
    recusal_reason text,
    satoshi_hash text,
    CONSTRAINT arbitration_panels_panel_position_check CHECK (((panel_position >= 1) AND (panel_position <= 5)))
);


--
-- Name: asset_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_registry (
    asset_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    asset_type text NOT NULL,
    asset_name text NOT NULL,
    asset_description text,
    blockchain text DEFAULT 'praieiro_internal'::text,
    contract_address text,
    token_id text,
    token_standard text DEFAULT 'ERC-20'::text,
    total_supply numeric DEFAULT 0,
    circulating_supply numeric DEFAULT 0,
    decimals integer DEFAULT 2,
    metadata jsonb DEFAULT '{}'::jsonb,
    owner_id uuid,
    status text DEFAULT 'active'::text,
    checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT asset_registry_asset_type_check CHECK ((asset_type = ANY (ARRAY['CONCHA'::text, 'NFT_VENDOR'::text, 'NFT_PRAIEIRO'::text, 'SERVICE_TOKEN'::text, 'GOVERNANCE_TOKEN'::text]))),
    CONSTRAINT asset_registry_status_check CHECK ((status = ANY (ARRAY['active'::text, 'frozen'::text, 'burned'::text, 'pending_mint'::text])))
);


--
-- Name: attack_pattern_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attack_pattern_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pattern_type text NOT NULL,
    alert_name text NOT NULL,
    description text,
    affected_region text,
    ip_addresses text[] DEFAULT '{}'::text[],
    attack_count integer DEFAULT 0,
    first_detected_at timestamp with time zone DEFAULT now() NOT NULL,
    last_detected_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true,
    severity text DEFAULT 'medium'::text,
    satoshi_hash text,
    metadata jsonb DEFAULT '{}'::jsonb,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    CONSTRAINT attack_pattern_alerts_pattern_type_check CHECK ((pattern_type = ANY (ARRAY['siege'::text, 'distributed'::text, 'brute_force'::text, 'coordinated'::text, 'regional'::text]))),
    CONSTRAINT attack_pattern_alerts_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: banned_ips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banned_ips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text NOT NULL,
    reason text NOT NULL,
    blocked_variable text,
    blocked_at timestamp with time zone DEFAULT now() NOT NULL,
    unblocked_at timestamp with time zone,
    unblocked_by uuid,
    is_active boolean DEFAULT true,
    attack_type text,
    severity text DEFAULT 'medium'::text,
    satoshi_hash text,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: beaches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beaches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    beach_name character varying(120) NOT NULL,
    city character varying(80) DEFAULT 'Salvador'::character varying,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    latitude double precision,
    longitude double precision,
    description text
);


--
-- Name: board_governance_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_governance_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_type text NOT NULL,
    director_name text NOT NULL,
    report_title text NOT NULL,
    report_summary text NOT NULL,
    metrics jsonb DEFAULT '{}'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    risk_level text DEFAULT 'low'::text,
    satoshi_hash text,
    region_data jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    requires_action boolean DEFAULT false,
    action_taken_at timestamp with time zone,
    action_taken_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT board_governance_reports_report_type_check CHECK ((report_type = ANY (ARRAY['clo'::text, 'cfo'::text, 'cmo'::text, 'cto'::text, 'ceo'::text]))),
    CONSTRAINT board_governance_reports_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: cache_store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_store (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key text NOT NULL,
    cache_value jsonb NOT NULL,
    btc_parity_last numeric(20,8),
    btc_updated_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cached_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cached_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    image_url text,
    source text,
    url text,
    type text DEFAULT 'news'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:30:00'::interval)
);


--
-- Name: chat_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    total_sessions integer DEFAULT 0,
    total_messages integer DEFAULT 0,
    unique_users integer DEFAULT 0,
    avg_messages_per_session numeric(10,2) DEFAULT 0,
    avg_response_time_ms integer DEFAULT 0,
    total_tokens_used integer DEFAULT 0,
    positive_feedback_count integer DEFAULT 0,
    negative_feedback_count integer DEFAULT 0,
    top_categories jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_contexts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_contexts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    context_key text NOT NULL,
    context_name text NOT NULL,
    system_prompt text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_media_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_media_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid,
    chat_message_id uuid,
    user_query text NOT NULL,
    ai_response text,
    action_type text DEFAULT 'play_video'::text NOT NULL,
    media_query text NOT NULL,
    video_id text,
    playlist_id text,
    detection_method text DEFAULT 'pattern_match'::text,
    confidence_score numeric(3,2) DEFAULT 1.0,
    latency_ms integer,
    playback_started_at timestamp with time zone,
    playback_duration_seconds integer,
    user_skipped boolean DEFAULT false,
    user_feedback text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    tokens_used integer DEFAULT 0,
    response_time_ms integer,
    feedback_rating integer,
    feedback_comment text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_messages_feedback_rating_check CHECK (((feedback_rating >= 1) AND (feedback_rating <= 5))),
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
    title text DEFAULT 'Nova Conversa'::text,
    model_used text DEFAULT 'google/gemini-2.5-flash'::text,
    context_key text DEFAULT 'default'::text,
    message_count integer DEFAULT 0,
    total_tokens_used integer DEFAULT 0,
    is_active boolean DEFAULT true,
    last_activity_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    category text DEFAULT 'geral'::text,
    context_key text DEFAULT 'default'::text,
    display_order integer DEFAULT 0,
    usage_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    session_id uuid,
    user_id uuid,
    message_id uuid,
    payload jsonb DEFAULT '{}'::jsonb,
    processed boolean DEFAULT false,
    processed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_youtube_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_youtube_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    session_id text NOT NULL,
    user_id uuid,
    source text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    music_query text,
    genre text,
    video_id text,
    playlist_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    processed_at timestamp with time zone,
    error_message text,
    latency_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_youtube_webhook_events_event_type_check CHECK ((event_type = ANY (ARRAY['music_request'::text, 'genre_select'::text, 'playback_start'::text, 'playback_end'::text, 'skip'::text, 'error'::text]))),
    CONSTRAINT chat_youtube_webhook_events_source_check CHECK ((source = ANY (ARRAY['chat'::text, 'genre_button'::text, 'playlist'::text, 'direct'::text]))),
    CONSTRAINT chat_youtube_webhook_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: chatbot_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chatbot_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid,
    message_type text NOT NULL,
    message_content text,
    intent_detected text,
    confidence_score numeric(5,4),
    response_time_ms integer,
    context_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: civic_arbitrators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.civic_arbitrators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    verified_human_id uuid NOT NULL,
    arbitrator_name text NOT NULL,
    specializations text[] DEFAULT '{}'::text[],
    cases_judged integer DEFAULT 0,
    approval_rating numeric(5,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    last_case_at timestamp with time zone,
    disqualified_until timestamp with time zone,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_conchas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_conchas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    total_earned integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reais_balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    total_deposited numeric(12,2) DEFAULT 0.00 NOT NULL,
    total_spent numeric(12,2) DEFAULT 0.00 NOT NULL
);


--
-- Name: client_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_product_interests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_product_interests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    vendor_id uuid,
    product_category character varying NOT NULL,
    beach_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    type character varying NOT NULL,
    description text,
    order_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    satoshi_hash text,
    CONSTRAINT client_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying, 'payment'::character varying, 'refund'::character varying])::text[])))
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    profile_id uuid NOT NULL,
    accepted_terms boolean DEFAULT false,
    accepted_terms_at timestamp with time zone,
    terms_version character varying DEFAULT '1.0'::character varying,
    preferred_beach_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: comment_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: concha_emissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concha_emissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_type character varying(20) NOT NULL,
    amount numeric NOT NULL,
    hard_cap numeric DEFAULT 1000000000 NOT NULL,
    total_supply_after numeric NOT NULL,
    reason text,
    authorized_by uuid,
    signature_hash text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT concha_emissions_operation_type_check CHECK (((operation_type)::text = ANY ((ARRAY['mint'::character varying, 'burn'::character varying, 'policy_update'::character varying])::text[])))
);


--
-- Name: concha_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concha_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    order_id uuid,
    amount integer NOT NULL,
    type character varying NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    satoshi_hash text,
    CONSTRAINT concha_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['earned'::character varying, 'spent'::character varying])::text[])))
);


--
-- Name: constitutional_amendments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.constitutional_amendments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amendment_number integer NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    full_text text NOT NULL,
    proposed_by uuid NOT NULL,
    proposed_by_type text NOT NULL,
    status public.amendment_status DEFAULT 'draft'::public.amendment_status NOT NULL,
    simulation_started_at timestamp with time zone,
    simulation_ended_at timestamp with time zone,
    simulation_results jsonb DEFAULT '{}'::jsonb,
    public_review_started_at timestamp with time zone,
    voting_started_at timestamp with time zone,
    voting_ended_at timestamp with time zone,
    founder_approved boolean,
    founder_approved_at timestamp with time zone,
    dao_approved boolean,
    dao_approval_percentage numeric(5,2),
    user_approved boolean,
    user_approval_percentage numeric(5,2),
    requires_67_percent boolean DEFAULT true,
    affects_immutable_axioms boolean DEFAULT false,
    constitutional_block_id integer,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: constitutional_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.constitutional_blocks (
    block_number integer NOT NULL,
    block_hash text NOT NULL,
    previous_block_hash text,
    block_type text NOT NULL,
    content jsonb NOT NULL,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_genesis boolean DEFAULT false,
    is_immutable boolean DEFAULT false,
    axioms_affected text[] DEFAULT '{}'::text[]
);


--
-- Name: constitutional_blocks_block_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.constitutional_blocks_block_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: constitutional_blocks_block_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.constitutional_blocks_block_number_seq OWNED BY public.constitutional_blocks.block_number;


--
-- Name: constitutional_signatories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.constitutional_signatories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    jurisdiction text NOT NULL,
    public_key text NOT NULL,
    voting_power integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    required_for_quorum boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT constitutional_signatories_role_check CHECK ((role = ANY (ARRAY['FOUNDER'::text, 'AI_GUARDIAN'::text, 'COUNCIL'::text, 'SHAREHOLDER'::text]))),
    CONSTRAINT constitutional_signatories_voting_power_check CHECK ((voting_power >= 0))
);


--
-- Name: constitutional_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.constitutional_state (
    id text DEFAULT 'global'::text NOT NULL,
    governance_frozen boolean DEFAULT false NOT NULL,
    frozen_at timestamp with time zone,
    frozen_by text,
    frozen_reason text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    drift_detection_enabled boolean DEFAULT true NOT NULL,
    max_price_drift_percent numeric DEFAULT 15 NOT NULL,
    time_lock_minutes integer DEFAULT 15 NOT NULL,
    satoshi_hash text
);


--
-- Name: constitutional_validation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.constitutional_validation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    decision_id uuid,
    validation_type text NOT NULL,
    agent_id text NOT NULL,
    action_type text NOT NULL,
    is_allowed boolean NOT NULL,
    reasoning_logic text NOT NULL,
    invariant_name text,
    threshold_value numeric,
    actual_value numeric,
    drift_history jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    satoshi_hash text
);


--
-- Name: critical_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.critical_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state_key text NOT NULL,
    state_name text NOT NULL,
    category public.critical_state_category NOT NULL,
    severity_level integer NOT NULL,
    description text,
    detection_rules jsonb DEFAULT '{}'::jsonb,
    auto_response_enabled boolean DEFAULT false,
    requires_human_intervention boolean DEFAULT true,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT critical_states_severity_level_check CHECK (((severity_level >= 1) AND (severity_level <= 10)))
);


--
-- Name: ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    entry_type character varying NOT NULL,
    currency character varying DEFAULT 'BRL'::character varying NOT NULL,
    amount numeric NOT NULL,
    balance_after numeric NOT NULL,
    reference_type character varying,
    reference_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    idempotency_key uuid,
    signature_hash text,
    status character varying(20) DEFAULT 'confirmed'::character varying,
    origin_id uuid,
    satoshi_hash text,
    audited_at timestamp with time zone,
    audited_by text DEFAULT 'satoshi_auto'::text,
    CONSTRAINT ledger_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT ledger_amount_non_negative CHECK ((amount >= (0)::numeric)),
    CONSTRAINT ledger_balance_non_negative CHECK ((balance_after >= (0)::numeric)),
    CONSTRAINT ledger_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'audited'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: current_balances; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.current_balances WITH (security_invoker='true') AS
 SELECT DISTINCT ON (profile_id, currency) profile_id,
    currency,
    balance_after AS balance,
    created_at AS last_updated
   FROM public.ledger
  ORDER BY profile_id, currency, created_at DESC;


--
-- Name: protocol_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.protocol_state (
    tx_id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_structure text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    previous_checksum text,
    checksum text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    operation text DEFAULT 'CREATE'::text NOT NULL,
    btc_context jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    is_anchored boolean DEFAULT false,
    anchor_reference text,
    is_archived boolean DEFAULT false,
    CONSTRAINT protocol_state_operation_check CHECK ((operation = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'ARCHIVE'::text, 'MINT'::text, 'TRANSFER'::text, 'BURN'::text])))
);


--
-- Name: current_state; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.current_state AS
 SELECT DISTINCT ON (entity_id) tx_id,
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
  WHERE (is_archived = false)
  ORDER BY entity_id, version DESC;


--
-- Name: developer_code_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.developer_code_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_audit_id uuid,
    file_path text NOT NULL,
    line_start integer NOT NULL,
    line_end integer,
    severity text NOT NULL,
    issue_type text NOT NULL,
    issue_description text NOT NULL,
    suggested_fix text,
    detected_by text DEFAULT 'ai_council'::text,
    status text DEFAULT 'open'::text,
    resolved_at timestamp with time zone,
    resolved_by text,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT developer_code_issues_severity_check CHECK ((severity = ANY (ARRAY['critical'::text, 'warning'::text, 'info'::text]))),
    CONSTRAINT developer_code_issues_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'ignored'::text])))
);


--
-- Name: developer_source_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.developer_source_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_path text NOT NULL,
    file_name text NOT NULL,
    source_code text NOT NULL,
    language text DEFAULT 'typescript'::text,
    version integer DEFAULT 1,
    last_audit_at timestamp with time zone,
    audited_by text,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: dissolution_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dissolution_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status public.dissolution_status DEFAULT 'operational'::public.dissolution_status NOT NULL,
    initiated_at timestamp with time zone,
    initiated_by uuid,
    reason text,
    estimated_completion timestamp with time zone,
    data_export_progress numeric(5,2) DEFAULT 0,
    keys_destruction_scheduled_at timestamp with time zone,
    keys_destroyed_at timestamp with time zone,
    final_block_hash text,
    final_message text DEFAULT 'Este sistema encerrou sem trair seus princípios.'::text,
    witness_signatures jsonb DEFAULT '[]'::jsonb,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    client_latitude double precision,
    client_longitude double precision,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_amount numeric(10,2) DEFAULT 0,
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    client_accuracy_radius numeric,
    client_heading numeric,
    client_speed numeric,
    client_location_timestamp timestamp with time zone,
    vendor_latitude double precision,
    vendor_longitude double precision,
    vendor_accuracy_radius numeric,
    vendor_heading numeric,
    vendor_location_timestamp timestamp with time zone,
    distance_at_checkout numeric,
    location_auth_hash text,
    proximity_verified boolean DEFAULT false,
    proximity_verified_at timestamp with time zone,
    satoshi_hash text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    data_nascimento date,
    sexo text,
    cpf text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone character varying,
    mother_name character varying,
    profile_photo_url text,
    account_types public.account_type[] DEFAULT '{}'::public.account_type[],
    wallet_public_key text,
    music_title text,
    music_artist text,
    current_youtube_id text,
    user_type text DEFAULT 'cliente'::text,
    linear_meters numeric(12,4) DEFAULT 0,
    shell_balance integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    god_mode_bypass boolean DEFAULT false,
    daily_access_count integer DEFAULT 0,
    last_access_date date,
    location public.geography(Point,4326),
    CONSTRAINT profiles_cpf_valid CHECK (public.validate_cpf(cpf))
);


--
-- Name: protocol_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.protocol_parameters (
    param_id uuid DEFAULT gen_random_uuid() NOT NULL,
    param_key text NOT NULL,
    param_name text NOT NULL,
    param_value numeric NOT NULL,
    param_unit text,
    category text NOT NULL,
    min_value numeric,
    max_value numeric,
    is_ai_adjustable boolean DEFAULT false,
    last_ai_adjustment timestamp with time zone,
    ai_adjustment_reason text,
    description text,
    checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT protocol_parameters_category_check CHECK ((category = ANY (ARRAY['fees'::text, 'radius'::text, 'limits'::text, 'phase'::text, 'ai_council'::text])))
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    profile_id uuid NOT NULL,
    whatsapp_number character varying NOT NULL,
    product_category character varying NOT NULL,
    product_description text,
    establishment_type public.establishment_type DEFAULT 'ambulante'::public.establishment_type,
    location public.geography(Point,4326),
    location_updated_at timestamp with time zone,
    status character varying DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    heading numeric,
    speed numeric,
    accuracy_radius numeric,
    altitude numeric,
    altitude_accuracy numeric,
    location_source character varying(50) DEFAULT 'gps'::character varying,
    linear_meters numeric DEFAULT 0,
    exposure_plan_id uuid,
    exposure_plan_expires_at timestamp with time zone,
    vendor_size text DEFAULT 'ambulante'::text,
    CONSTRAINT vendors_vendor_size_check CHECK ((vendor_size = ANY (ARRAY['ambulante'::text, 'barraca'::text, 'quiosque'::text, 'restaurante'::text])))
);


--
-- Name: ecosystem_health; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ecosystem_health AS
 SELECT ( SELECT count(*) AS count
           FROM public.profiles
          WHERE (profiles.created_at > (now() - '30 days'::interval))) AS new_users_30d,
    ( SELECT count(*) AS count
           FROM public.vendors
          WHERE ((vendors.status)::text = 'active'::text)) AS active_vendors,
    ( SELECT count(*) AS count
           FROM public.clients) AS total_clients,
    ( SELECT COALESCE(sum(orders.total_amount), (0)::numeric) AS "coalesce"
           FROM public.orders
          WHERE (orders.created_at > (now() - '30 days'::interval))) AS gmv_30d,
    ( SELECT count(*) AS count
           FROM public.orders
          WHERE (orders.created_at > (now() - '30 days'::interval))) AS orders_30d,
    ( SELECT protocol_parameters.param_value
           FROM public.protocol_parameters
          WHERE (protocol_parameters.param_key = 'phase_current'::text)) AS current_phase,
    ( SELECT protocol_parameters.param_value
           FROM public.protocol_parameters
          WHERE (protocol_parameters.param_key = 'service_fee_base'::text)) AS current_service_fee,
    ( SELECT protocol_parameters.param_value
           FROM public.protocol_parameters
          WHERE (protocol_parameters.param_key = 'displacement_fee_per_meter'::text)) AS current_displacement_fee;


--
-- Name: editable_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.editable_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_key character varying NOT NULL,
    content_type character varying DEFAULT 'text'::character varying NOT NULL,
    content_value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: employee_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    can_view_users boolean DEFAULT true,
    can_edit_users boolean DEFAULT true,
    can_view_transactions boolean DEFAULT true,
    can_edit_transactions boolean DEFAULT false,
    can_view_orders boolean DEFAULT true,
    can_view_messages boolean DEFAULT true,
    can_view_financial boolean DEFAULT true,
    can_edit_financial boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: engineering_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.engineering_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    error_code text NOT NULL,
    error_message text NOT NULL,
    error_category text,
    business_impact text,
    suggested_sql text,
    source_component text,
    risk_level text DEFAULT 'LOW'::text,
    is_resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ethical_economy_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ethical_economy_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_key text NOT NULL,
    rule_name text NOT NULL,
    prohibited_practice public.predatory_practice NOT NULL,
    description text NOT NULL,
    detection_algorithm jsonb DEFAULT '{}'::jsonb,
    violation_threshold numeric(10,4),
    auto_enforcement boolean DEFAULT true,
    penalty_on_violation jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exposure_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exposure_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_name text NOT NULL,
    plan_level integer NOT NULL,
    monthly_fee_cents integer NOT NULL,
    visibility_boost numeric DEFAULT 1.0,
    featured_in_search boolean DEFAULT false,
    priority_support boolean DEFAULT false,
    analytics_access boolean DEFAULT false,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: feed_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_comment_id uuid,
    CONSTRAINT feed_comments_content_check CHECK ((char_length((content)::text) >= 20)),
    CONSTRAINT feed_comments_content_max_length CHECK ((char_length((content)::text) <= 20))
);


--
-- Name: feed_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feed_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_type character varying NOT NULL,
    image_url text,
    text_content character varying(30),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
    CONSTRAINT feed_posts_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['client'::character varying, 'vendor'::character varying])::text[])))
);


--
-- Name: founder_public_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.founder_public_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    decision_type text NOT NULL,
    decision_summary text NOT NULL,
    context_data jsonb DEFAULT '{}'::jsonb,
    impact_analysis jsonb DEFAULT '{}'::jsonb,
    justification text NOT NULL,
    was_controversial boolean DEFAULT false,
    public_reaction_summary text,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    satoshi_hash text NOT NULL,
    immutable_hash text NOT NULL,
    previous_record_hash text
);


--
-- Name: genre_analytics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.genre_analytics AS
SELECT
    NULL::text AS genre_key,
    NULL::text AS genre_name,
    NULL::text AS genre_emoji,
    NULL::integer AS play_count,
    NULL::text AS color_class,
    NULL::bigint AS webhook_events,
    NULL::timestamp with time zone AS last_played;


--
-- Name: governance_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.governance_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    decision_type text NOT NULL,
    agent_id text NOT NULL,
    target_entity text,
    current_value numeric,
    proposed_value numeric,
    change_percent numeric,
    status text DEFAULT 'pending_confirmation'::text NOT NULL,
    reasoning_logic text NOT NULL,
    invariants_checked jsonb DEFAULT '[]'::jsonb,
    invariants_violated jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmation_deadline timestamp with time zone DEFAULT (now() + '00:15:00'::interval) NOT NULL,
    confirmed_at timestamp with time zone,
    confirmed_by text,
    executed_at timestamp with time zone,
    satoshi_hash text,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: governance_switches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.governance_switches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_key text NOT NULL,
    module_name text NOT NULL,
    module_icon text DEFAULT '🤖'::text,
    mode text DEFAULT 'ai'::text NOT NULL,
    ai_cost_monthly numeric(10,2) DEFAULT 0,
    human_cost_monthly numeric(10,2) DEFAULT 0,
    team_size integer DEFAULT 0,
    break_even_revenue numeric(12,2),
    description text,
    is_active boolean DEFAULT true,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now(),
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_switches_mode_check CHECK ((mode = ANY (ARRAY['ai'::text, 'hybrid'::text, 'human'::text])))
);


--
-- Name: hacker_intelligence_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hacker_intelligence_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text NOT NULL,
    country_code text,
    country_name text,
    city text,
    region text,
    latitude numeric,
    longitude numeric,
    honeypot_triggered text,
    attack_type text DEFAULT 'honeypot_access'::text,
    user_agent text,
    request_path text,
    severity text DEFAULT 'medium'::text,
    is_blocked boolean DEFAULT false,
    blocked_at timestamp with time zone,
    blocked_by uuid,
    estimated_damage_prevented numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    satoshi_hash text
);


--
-- Name: human_work_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.human_work_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_key text NOT NULL,
    task_type text NOT NULL,
    title text NOT NULL,
    description text,
    ai_suggestion jsonb,
    ai_reasoning text,
    human_decision jsonb,
    human_notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text DEFAULT 'normal'::text,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    satoshi_hash text,
    CONSTRAINT human_work_queue_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT human_work_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'approved'::text, 'rejected'::text, 'modified'::text])))
);


--
-- Name: immutable_axioms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.immutable_axioms (
    axiom_id text NOT NULL,
    axiom_number integer NOT NULL,
    axiom_title text NOT NULL,
    axiom_text text NOT NULL,
    rationale text,
    genesis_block_hash text NOT NULL,
    can_never_be_modified boolean DEFAULT true,
    violation_count integer DEFAULT 0,
    last_integrity_check timestamp with time zone DEFAULT now(),
    satoshi_hash text NOT NULL,
    CONSTRAINT immutable_axioms_axiom_number_check CHECK (((axiom_number >= 1) AND (axiom_number <= 12)))
);


--
-- Name: integrity_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrity_validations (
    validation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    validation_type text NOT NULL,
    scope_entity_id uuid,
    is_valid boolean NOT NULL,
    total_records_checked integer DEFAULT 0,
    violations_found integer DEFAULT 0,
    violations jsonb DEFAULT '[]'::jsonb,
    execution_time_ms integer,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    executed_by uuid,
    result_checksum text,
    CONSTRAINT integrity_validations_validation_type_check CHECK ((validation_type = ANY (ARRAY['chain_full'::text, 'chain_partial'::text, 'entity_specific'::text, 'financial_audit'::text, 'council_decision'::text])))
);


--
-- Name: ip_blacklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_blacklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text NOT NULL,
    reason text,
    blocked_by uuid,
    blocked_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_permanent boolean DEFAULT false,
    attack_count integer DEFAULT 1,
    satoshi_hash text
);


--
-- Name: key_destruction_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_destruction_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_identifier text NOT NULL,
    key_type text NOT NULL,
    destruction_method text NOT NULL,
    destroyed_at timestamp with time zone DEFAULT now() NOT NULL,
    witness_count integer DEFAULT 0,
    verification_hashes jsonb DEFAULT '[]'::jsonb,
    public_announcement_url text,
    satoshi_hash text NOT NULL,
    immutable_hash text NOT NULL
);


--
-- Name: knowledge_base; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    solution_key text NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    level text DEFAULT 'GAMMA'::text,
    solution_sql text,
    solution_edge_logic text,
    version integer DEFAULT 1,
    status text DEFAULT 'suggested'::text,
    proposed_by text,
    approved_by uuid,
    approved_at timestamp with time zone,
    usage_count integer DEFAULT 0,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ledger_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_events (
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tx_id uuid,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    execution_context jsonb DEFAULT '{}'::jsonb,
    event_checksum text NOT NULL,
    previous_event_checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_id uuid,
    actor_type text DEFAULT 'user'::text,
    ip_hash text,
    sequence_number bigint NOT NULL,
    CONSTRAINT ledger_events_actor_type_check CHECK ((actor_type = ANY (ARRAY['user'::text, 'system'::text, 'ai_council'::text, 'webhook'::text, 'admin'::text])))
);


--
-- Name: ledger_events_sequence_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ledger_events_sequence_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ledger_events_sequence_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ledger_events_sequence_number_seq OWNED BY public.ledger_events.sequence_number;


--
-- Name: location_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    location public.geography(Point,4326) NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    accuracy_radius numeric,
    heading numeric,
    speed numeric,
    altitude numeric,
    source character varying(50) DEFAULT 'gps'::character varying,
    session_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_type character varying NOT NULL,
    content text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT messages_sender_type_check CHECK (((sender_type)::text = ANY ((ARRAY['client'::character varying, 'vendor'::character varying])::text[])))
);


--
-- Name: monetization_phases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monetization_phases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phase_number integer NOT NULL,
    phase_name text NOT NULL,
    description text,
    registration_trigger integer DEFAULT 0 NOT NULL,
    transaction_fee_cents integer DEFAULT 0,
    linear_meter_fee_cents integer DEFAULT 0,
    regional_fee_min_cents integer DEFAULT 0,
    regional_fee_max_cents integer DEFAULT 0,
    chat_sentinel_enabled boolean DEFAULT false,
    is_active boolean DEFAULT false,
    activated_at timestamp with time zone,
    activated_by uuid,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: music_genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.music_genres (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    genre_key text NOT NULL,
    genre_name text NOT NULL,
    genre_emoji text,
    playlist_id text,
    search_query text NOT NULL,
    color_class text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    play_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying NOT NULL,
    message text NOT NULL,
    type character varying DEFAULT 'info'::character varying NOT NULL,
    category character varying NOT NULL,
    related_order_id uuid,
    related_vendor_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: operating_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operating_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day_of_week integer NOT NULL,
    open_time time without time zone DEFAULT '05:00:00'::time without time zone NOT NULL,
    close_time time without time zone DEFAULT '18:30:00'::time without time zone NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT operating_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: operation_dictionary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation_dictionary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    op_key text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    parent_key text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: orch_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orch_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_asset_id uuid,
    source_type text NOT NULL,
    source_name text NOT NULL,
    target_type text NOT NULL,
    target_name text NOT NULL,
    dependency_type text DEFAULT 'uses'::text,
    is_critical boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    satoshi_hash text,
    CONSTRAINT orch_dependencies_dependency_type_check CHECK ((dependency_type = ANY (ARRAY['uses'::text, 'calls'::text, 'references'::text, 'extends'::text])))
);


--
-- Name: orch_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orch_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_type text NOT NULL,
    asset_name text NOT NULL,
    version_number integer DEFAULT 1 NOT NULL,
    content_hash text NOT NULL,
    content text NOT NULL,
    is_validated boolean DEFAULT false,
    validated_at timestamp with time zone,
    validated_by uuid,
    is_production boolean DEFAULT false,
    promoted_at timestamp with time zone,
    promoted_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    satoshi_hash text,
    timeout_ms integer DEFAULT 30000,
    execution_count integer DEFAULT 0,
    last_execution_at timestamp with time zone,
    last_execution_status text,
    avg_execution_time_ms numeric(10,2),
    CONSTRAINT orch_versions_asset_type_check CHECK ((asset_type = ANY (ARRAY['sql'::text, 'function'::text, 'component'::text, 'config'::text])))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_session_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'brl'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    satoshi_hash text
);


--
-- Name: platform_wallet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_wallet (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_name text NOT NULL,
    balance numeric(12,2) DEFAULT 0,
    currency text DEFAULT 'BRL'::text,
    cnpj text,
    razao_social text,
    nome_fantasia text,
    endereco text,
    cidade text,
    estado text,
    cep text,
    email_corporativo text,
    telefone_corporativo text,
    responsavel_legal text,
    cpf_responsavel text,
    inscricao_estadual text,
    inscricao_municipal text,
    regime_tributario text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: praieiro_chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.praieiro_chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id text NOT NULL,
    message_type text NOT NULL,
    content text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT praieiro_chats_message_type_check CHECK ((message_type = ANY (ARRAY['user'::text, 'praieiro'::text, 'admin'::text])))
);


--
-- Name: price_drift_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_drift_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    old_value numeric NOT NULL,
    new_value numeric NOT NULL,
    change_percent numeric NOT NULL,
    window_start timestamp with time zone NOT NULL,
    window_end timestamp with time zone NOT NULL,
    cumulative_drift numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    satoshi_hash text
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    image_url text,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shop_id uuid
);


--
-- Name: profit_compatibility_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profit_compatibility_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    check_date date DEFAULT CURRENT_DATE NOT NULL,
    revenue_brl numeric(15,2) NOT NULL,
    operational_cost_brl numeric(15,2) NOT NULL,
    profit_margin_percentage numeric(5,2) NOT NULL,
    resilience_index numeric(5,2) NOT NULL,
    cognitive_neutrality_score numeric(5,2) NOT NULL,
    power_asymmetry_index numeric(5,2) NOT NULL,
    is_compatible boolean NOT NULL,
    incompatibility_reasons jsonb DEFAULT '[]'::jsonb,
    corrective_actions jsonb DEFAULT '[]'::jsonb,
    satoshi_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: protocol_parameters_current; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.protocol_parameters_current AS
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


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    action text NOT NULL,
    request_count integer DEFAULT 1 NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: registration_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    milestone_name text NOT NULL,
    target_count integer NOT NULL,
    phase_to_activate integer,
    reached_at timestamp with time zone,
    notified_admin boolean DEFAULT false,
    admin_approved boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp with time zone,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: responsibility_chain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.responsibility_chain (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    failure_id uuid NOT NULL,
    agent_type public.responsibility_agent_type NOT NULL,
    agent_identifier text NOT NULL,
    agent_name text,
    responsibility_percentage numeric(5,2) NOT NULL,
    consequence public.consequence_type NOT NULL,
    consequence_details jsonb DEFAULT '{}'::jsonb,
    consequence_executed_at timestamp with time zone,
    consequence_duration_hours integer,
    appeal_submitted boolean DEFAULT false,
    appeal_outcome text,
    satoshi_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT responsibility_chain_responsibility_percentage_check CHECK (((responsibility_percentage >= (0)::numeric) AND (responsibility_percentage <= (100)::numeric)))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    client_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: safe_mode_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.safe_mode_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_active boolean DEFAULT false,
    activated_at timestamp with time zone,
    activated_by uuid,
    reason text,
    auto_deactivate_at timestamp with time zone,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: satoshi_audit_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.satoshi_audit_view AS
 SELECT 'ledger'::text AS source_table,
    ledger.id AS record_id,
    ledger.satoshi_hash AS hash_value,
    ledger.created_at AS record_created,
        CASE
            WHEN (ledger.satoshi_hash IS NULL) THEN false
            ELSE true
        END AS integrity_valid
   FROM public.ledger
UNION ALL
 SELECT 'orders'::text AS source_table,
    orders.id AS record_id,
    orders.satoshi_hash AS hash_value,
    orders.created_at AS record_created,
        CASE
            WHEN (orders.satoshi_hash IS NULL) THEN false
            ELSE true
        END AS integrity_valid
   FROM public.orders
UNION ALL
 SELECT 'payments'::text AS source_table,
    payments.id AS record_id,
    payments.satoshi_hash AS hash_value,
    payments.created_at AS record_created,
        CASE
            WHEN (payments.satoshi_hash IS NULL) THEN false
            ELSE true
        END AS integrity_valid
   FROM public.payments
UNION ALL
 SELECT 'ai_council_information_flows'::text AS source_table,
    ai_council_information_flows.id AS record_id,
    ai_council_information_flows.satoshi_hash AS hash_value,
    ai_council_information_flows.created_at AS record_created,
        CASE
            WHEN (ai_council_information_flows.satoshi_hash IS NULL) THEN false
            ELSE true
        END AS integrity_valid
   FROM public.ai_council_information_flows;


--
-- Name: satoshi_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.satoshi_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sequence bigint NOT NULL,
    idempotency_key text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    previous_event_hash text,
    event_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    currency text DEFAULT 'ZIMBU'::text NOT NULL,
    CONSTRAINT currency_fixed CHECK ((currency = 'ZIMBU'::text)),
    CONSTRAINT genesis_sequence CHECK (((event_type <> 'GENESIS'::text) OR (sequence = 1)))
);


--
-- Name: satoshi_honeytokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.satoshi_honeytokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_name text NOT NULL,
    token_value text NOT NULL,
    generation_date date DEFAULT CURRENT_DATE NOT NULL,
    is_active boolean DEFAULT true,
    access_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    satoshi_hash text
);


--
-- Name: satoshi_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.satoshi_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_date date DEFAULT CURRENT_DATE NOT NULL,
    total_audited integer DEFAULT 0,
    total_verified integer DEFAULT 0,
    integrity_score numeric(5,2) DEFAULT 100.00,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: search_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_intents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id text,
    query text NOT NULL,
    place_id text,
    place_name text,
    place_type text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    search_source text DEFAULT 'google_places'::text,
    result_count integer DEFAULT 0,
    selected boolean DEFAULT false,
    flow_success boolean,
    error_type text,
    device_info jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: security_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    identifier text NOT NULL,
    user_id uuid,
    ip_address text,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shadow_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shadow_audits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type text NOT NULL,
    risk_level text NOT NULL,
    original_decision jsonb,
    strategist_review jsonb,
    drift_detected boolean DEFAULT false,
    drift_severity text,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_type text DEFAULT 'anonymous'::text,
    rating integer NOT NULL,
    ease_of_use integer,
    design_rating integer,
    functionality_rating integer,
    comment text,
    suggestion text,
    would_recommend boolean DEFAULT true,
    page_evaluated text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT site_evaluations_design_rating_check CHECK (((design_rating >= 1) AND (design_rating <= 5))),
    CONSTRAINT site_evaluations_ease_of_use_check CHECK (((ease_of_use >= 1) AND (ease_of_use <= 5))),
    CONSTRAINT site_evaluations_functionality_rating_check CHECK (((functionality_rating >= 1) AND (functionality_rating <= 5))),
    CONSTRAINT site_evaluations_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: social_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    media_urls text[],
    author_btc_lastro numeric(20,8) DEFAULT 0,
    author_trust_at_post numeric(10,4) DEFAULT 0,
    like_count integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    repost_count integer DEFAULT 0,
    weighted_score numeric(20,8) DEFAULT 0,
    is_pinned boolean DEFAULT false,
    visibility text DEFAULT 'public'::text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT social_posts_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'followers'::text, 'private'::text])))
);


--
-- Name: social_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    username text,
    display_name text,
    bio text,
    avatar_url text,
    cover_url text,
    btc_trust_score numeric(10,4) DEFAULT 0,
    btc_lastro numeric(20,8) DEFAULT 0,
    satoshi_lastro bigint DEFAULT 0,
    reputation_level integer DEFAULT 1,
    follower_count integer DEFAULT 0,
    following_count integer DEFAULT 0,
    post_count integer DEFAULT 0,
    verified boolean DEFAULT false,
    verification_type text,
    is_active boolean DEFAULT true,
    last_activity_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT social_profiles_reputation_level_check CHECK (((reputation_level >= 1) AND (reputation_level <= 10)))
);


--
-- Name: social_feed_with_lastro; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.social_feed_with_lastro WITH (security_invoker='true') AS
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
    ((sp.like_count)::numeric * GREATEST(sp.author_btc_lastro, 0.00000001)) AS weighted_relevance
   FROM (public.social_posts sp
     JOIN public.social_profiles spr ON ((spr.id = sp.author_id)))
  WHERE ((sp.visibility = 'public'::text) AND ((sp.expires_at IS NULL) OR (sp.expires_at > now())))
  ORDER BY ((sp.like_count)::numeric * GREATEST(sp.author_btc_lastro, 0.00000001)) DESC, sp.created_at DESC;


--
-- Name: source_code_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_code_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_path text NOT NULL,
    content text NOT NULL,
    snapshot_date timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: sovereign_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sovereign_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    action_type text NOT NULL,
    target_type text,
    target_id uuid,
    payload jsonb DEFAULT '{}'::jsonb,
    justification text,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sovereign_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sovereign_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_date date DEFAULT CURRENT_DATE NOT NULL,
    ai_operations_percent numeric(5,2) DEFAULT 100,
    human_operations_percent numeric(5,2) DEFAULT 0,
    total_operational_cost numeric(12,2) DEFAULT 0,
    ai_cost numeric(12,2) DEFAULT 0,
    human_cost numeric(12,2) DEFAULT 0,
    pending_conflicts integer DEFAULT 0,
    laws_compliance jsonb DEFAULT '{}'::jsonb,
    next_hire_threshold numeric(12,2),
    current_revenue numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sovereign_vitality; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sovereign_vitality (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    founder_id uuid,
    last_heartbeat timestamp with time zone DEFAULT now(),
    heartbeat_interval_days integer DEFAULT 30,
    regency_mode text DEFAULT 'preservation'::text,
    successor_email_encrypted text,
    successor_wallet_encrypted text,
    is_regency_active boolean DEFAULT false,
    regency_activated_at timestamp with time zone,
    testament_principles jsonb DEFAULT '[]'::jsonb,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sovereign_vitality_regency_mode_check CHECK ((regency_mode = ANY (ARRAY['preservation'::text, 'autopilot'::text, 'liquidation'::text])))
);


--
-- Name: stress_test_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stress_test_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_phase text NOT NULL,
    test_name text NOT NULL,
    records_inserted integer,
    duration_ms integer,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sys_ai_guidance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_ai_guidance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guidance_type text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    step_by_step jsonb DEFAULT '[]'::jsonb NOT NULL,
    affected_assets jsonb DEFAULT '[]'::jsonb,
    suggested_code text,
    auto_executable boolean DEFAULT false,
    executed_at timestamp with time zone,
    executed_by uuid,
    execution_result jsonb,
    status text DEFAULT 'pending'::text,
    created_by_agent text,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sys_ai_guidance_guidance_type_check CHECK ((guidance_type = ANY (ARRAY['error_fix'::text, 'optimization'::text, 'security'::text, 'best_practice'::text, 'alert'::text]))),
    CONSTRAINT sys_ai_guidance_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT sys_ai_guidance_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'dismissed'::text, 'failed'::text])))
);


--
-- Name: sys_change_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_change_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    orch_id uuid,
    changed_by uuid NOT NULL,
    changed_by_email text NOT NULL,
    change_type text NOT NULL,
    previous_content text,
    new_content text,
    previous_version integer,
    new_version integer,
    change_summary text,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sys_change_history_change_type_check CHECK ((change_type = ANY (ARRAY['create'::text, 'update'::text, 'validate'::text, 'promote'::text, 'rollback'::text, 'delete'::text])))
);


--
-- Name: sys_critical_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_critical_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    source_table text,
    source_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    acknowledged_at timestamp with time zone,
    acknowledged_by uuid,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    resolution_notes text,
    auto_generated boolean DEFAULT true,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sys_critical_alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['security'::text, 'performance'::text, 'data_integrity'::text, 'system'::text, 'dependency'::text]))),
    CONSTRAINT sys_critical_alerts_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: sys_health_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_health_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_date date DEFAULT CURRENT_DATE NOT NULL,
    total_executions integer DEFAULT 0,
    successful_executions integer DEFAULT 0,
    failed_executions integer DEFAULT 0,
    avg_execution_time_ms numeric(10,2) DEFAULT 0,
    critical_errors integer DEFAULT 0,
    warnings integer DEFAULT 0,
    health_score numeric(5,2) DEFAULT 100,
    calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    satoshi_hash text
);


--
-- Name: sys_orch_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_orch_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    log_id text DEFAULT ('LOG_'::text || substr((gen_random_uuid())::text, 1, 8)) NOT NULL,
    orch_id uuid,
    log_severity text DEFAULT 'info'::text NOT NULL,
    log_stage text DEFAULT 'INIT'::text NOT NULL,
    log_message text NOT NULL,
    log_payload jsonb DEFAULT '{}'::jsonb,
    execution_time_ms integer,
    actor_id uuid,
    actor_email text,
    actor_ip text,
    error_stack text,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sys_orch_logs_log_severity_check CHECK ((log_severity = ANY (ARRAY['debug'::text, 'info'::text, 'warn'::text, 'error'::text, 'critical'::text]))),
    CONSTRAINT sys_orch_logs_log_stage_check CHECK ((log_stage = ANY (ARRAY['INIT'::text, 'PRE_VALIDATION'::text, 'EXECUTION'::text, 'POST_PROCESS'::text, 'COMPLETE'::text, 'ERROR'::text])))
);


--
-- Name: system_blackbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_blackbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    origin text NOT NULL,
    error_code text,
    error_message text,
    context jsonb DEFAULT '{}'::jsonb,
    idempotency_key text,
    severity text DEFAULT 'error'::text,
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_cycle_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_cycle_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_type text NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit text,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_governance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_governance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    current_phase integer DEFAULT 0 NOT NULL,
    governance_frozen boolean DEFAULT false NOT NULL,
    sentinel_chat_active boolean DEFAULT false NOT NULL,
    base_fixed_fee numeric(10,4) DEFAULT 0.00 NOT NULL,
    linear_meter_fee numeric(10,4) DEFAULT 0.00 NOT NULL,
    dynamic_min_fee numeric(10,4) DEFAULT 0.10 NOT NULL,
    dynamic_max_fee numeric(10,4) DEFAULT 1.00 NOT NULL,
    ads_active boolean DEFAULT true NOT NULL,
    withdrawal_blocked boolean DEFAULT true NOT NULL,
    god_mode_uids uuid[] DEFAULT ARRAY[]::uuid[],
    phase_activated_at timestamp with time zone DEFAULT now(),
    phase_activated_by uuid,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    st_safe_mode boolean DEFAULT false,
    safe_mode_activated_at timestamp with time zone,
    safe_mode_reason text
);


--
-- Name: system_health_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_health_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    source_component text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT system_health_logs_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text, 'emergency'::text])))
);


--
-- Name: system_vaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_vaults (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vault_name character varying(100) NOT NULL,
    vault_type character varying(50) NOT NULL,
    currency character varying(10) DEFAULT 'BRL'::character varying NOT NULL,
    balance numeric DEFAULT 0 NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT system_vaults_balance_check CHECK ((balance >= (0)::numeric)),
    CONSTRAINT system_vaults_vault_type_check CHECK (((vault_type)::text = ANY ((ARRAY['reserve'::character varying, 'fee_collection'::character varying, 'concha_treasury'::character varying, 'operational'::character varying])::text[])))
);


--
-- Name: systemic_failures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.systemic_failures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    failure_vector text NOT NULL,
    failure_description text NOT NULL,
    severity_level integer NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    detected_by text,
    detection_method text,
    impact_assessment jsonb DEFAULT '{}'::jsonb,
    affected_users_count integer DEFAULT 0,
    financial_impact_brl numeric(15,2) DEFAULT 0,
    satoshi_hash text NOT NULL,
    resolved_at timestamp with time zone,
    resolution_summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT systemic_failures_severity_level_check CHECK (((severity_level >= 1) AND (severity_level <= 10)))
);


--
-- Name: telemetry_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telemetry_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_name text NOT NULL,
    event_type text NOT NULL,
    user_id uuid,
    session_id text,
    properties jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: threat_summary_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.threat_summary_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    summary_date date DEFAULT CURRENT_DATE NOT NULL,
    total_attempts integer DEFAULT 0,
    blocked_attempts integer DEFAULT 0,
    unique_ips integer DEFAULT 0,
    top_attack_type text,
    estimated_savings numeric DEFAULT 0,
    cfo_analysis text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    satoshi_hash text
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tipo public.transaction_type NOT NULL,
    valor numeric(12,2) NOT NULL,
    descricao text,
    data_transacao timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pendente'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'concluido'::text, 'cancelado'::text])))
);


--
-- Name: unified_pins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_pins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    google_place_id text,
    mapbox_feature_id text,
    name text NOT NULL,
    address text,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    place_type text,
    metadata jsonb,
    search_count integer DEFAULT 1,
    last_searched_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_daily_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_daily_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    access_date date DEFAULT CURRENT_DATE NOT NULL,
    access_count integer DEFAULT 1,
    conchas_earned integer DEFAULT 0,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_data_exports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_data_exports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    export_type text NOT NULL,
    export_status text DEFAULT 'pending'::text NOT NULL,
    tables_exported text[] DEFAULT '{}'::text[],
    total_records integer DEFAULT 0,
    export_url text,
    encryption_key_hash text,
    expires_at timestamp with time zone,
    downloaded_at timestamp with time zone,
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_type text NOT NULL,
    onboarding_completed boolean DEFAULT false,
    tutorial_step integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_types_user_type_check CHECK ((user_type = ANY (ARRAY['client'::text, 'praieiro'::text])))
);


--
-- Name: v_compliance_audit; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_compliance_audit WITH (security_invoker='on') AS
 WITH balance_check AS (
         SELECT ledger.currency,
            sum(ledger.amount) AS net_balance,
            sum(
                CASE
                    WHEN (ledger.amount > (0)::numeric) THEN ledger.amount
                    ELSE (0)::numeric
                END) AS total_credits,
            sum(
                CASE
                    WHEN (ledger.amount < (0)::numeric) THEN abs(ledger.amount)
                    ELSE (0)::numeric
                END) AS total_debits,
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
            WHEN (abs(net_balance) < 0.01) THEN 'BALANCED'::text
            WHEN (net_balance > (0)::numeric) THEN 'CREDIT_EXCESS'::text
            ELSE 'DEBIT_EXCESS'::text
        END AS system_status,
    transaction_count,
    unique_accounts,
    first_transaction,
    last_transaction,
    now() AS audit_timestamp
   FROM balance_check;


--
-- Name: v_concha_supply; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_concha_supply WITH (security_invoker='on') AS
 SELECT COALESCE(sum(
        CASE
            WHEN ((operation_type)::text = 'mint'::text) THEN amount
            ELSE (0)::numeric
        END), (0)::numeric) AS total_minted,
    COALESCE(sum(
        CASE
            WHEN ((operation_type)::text = 'burn'::text) THEN amount
            ELSE (0)::numeric
        END), (0)::numeric) AS total_burned,
    COALESCE(sum(
        CASE
            WHEN ((operation_type)::text = 'mint'::text) THEN amount
            ELSE (- amount)
        END), (0)::numeric) AS current_supply,
    ( SELECT concha_emissions_1.hard_cap
           FROM public.concha_emissions concha_emissions_1
          ORDER BY concha_emissions_1.created_at DESC
         LIMIT 1) AS hard_cap,
    (( SELECT concha_emissions_1.hard_cap
           FROM public.concha_emissions concha_emissions_1
          ORDER BY concha_emissions_1.created_at DESC
         LIMIT 1) - COALESCE(sum(
        CASE
            WHEN ((operation_type)::text = 'mint'::text) THEN amount
            ELSE (- amount)
        END), (0)::numeric)) AS available_to_mint
   FROM public.concha_emissions
  WHERE ((operation_type)::text = ANY ((ARRAY['mint'::character varying, 'burn'::character varying])::text[]));


--
-- Name: v_user_transaction_security; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_transaction_security WITH (security_invoker='on') AS
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
    (("left"(signature_hash, 8) || '...'::text) || "right"(signature_hash, 8)) AS hash_display
   FROM public.ledger l
  ORDER BY created_at DESC;


--
-- Name: vendor_beach_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_beach_link (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid,
    beach_id uuid,
    is_listed boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vendor_ratings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vendor_ratings WITH (security_invoker='true') AS
 SELECT vendor_id,
    avg(rating) AS average_rating,
    count(*) AS total_reviews
   FROM public.reviews
  GROUP BY vendor_id;


--
-- Name: vendor_shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_shops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    shop_name text NOT NULL,
    description text,
    logo_url text,
    banner_url text,
    latitude double precision,
    longitude double precision,
    is_open boolean DEFAULT false,
    rating numeric(3,2) DEFAULT 0,
    total_sales integer DEFAULT 0,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vendor_shops_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'inactive'::text])))
);


--
-- Name: vendor_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    type character varying NOT NULL,
    description text,
    order_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying, 'sale'::character varying, 'refund'::character varying, 'adjustment'::character varying])::text[])))
);


--
-- Name: vendor_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    balance numeric(12,2) DEFAULT 0.00 NOT NULL,
    total_received numeric(12,2) DEFAULT 0.00 NOT NULL,
    total_withdrawn numeric(12,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendors_location_precise; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vendors_location_precise WITH (security_invoker='true') AS
 SELECT v.profile_id,
    p.full_name,
    v.product_category,
    v.whatsapp_number,
    p.profile_photo_url,
    public.st_y((v.location)::public.geometry) AS latitude,
    public.st_x((v.location)::public.geometry) AS longitude,
    v.heading,
    v.speed,
    v.accuracy_radius,
    v.location_source,
    v.location_updated_at,
    v.status,
    (EXTRACT(epoch FROM (now() - v.location_updated_at)))::integer AS location_age_seconds,
        CASE
            WHEN (v.location_updated_at > (now() - '00:01:00'::interval)) THEN 'fresh'::text
            WHEN (v.location_updated_at > (now() - '00:05:00'::interval)) THEN 'recent'::text
            WHEN (v.location_updated_at > (now() - '00:15:00'::interval)) THEN 'stale'::text
            ELSE 'outdated'::text
        END AS freshness
   FROM (public.vendors v
     JOIN public.profiles p ON ((p.id = v.profile_id)))
  WHERE (((v.status)::text = 'active'::text) AND (v.location IS NOT NULL));


--
-- Name: vendors_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vendors_public WITH (security_invoker='true') AS
 SELECT v.profile_id,
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
    public.st_y((v.location)::public.geometry) AS latitude,
    public.st_x((v.location)::public.geometry) AS longitude,
    v.created_at
   FROM (public.vendors v
     JOIN public.profiles p ON ((v.profile_id = p.id)))
  WHERE ((v.status)::text = 'active'::text);


--
-- Name: verified_humans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verified_humans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    verification_level public.human_verification_level DEFAULT 'unverified'::public.human_verification_level NOT NULL,
    verification_factors jsonb DEFAULT '[]'::jsonb,
    biometric_hash text,
    verified_at timestamp with time zone,
    verified_by uuid,
    is_unique_biological boolean DEFAULT true,
    anti_fraud_score numeric(5,2) DEFAULT 0,
    last_verification_check timestamp with time zone DEFAULT now(),
    satoshi_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wallet_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_profile_id uuid NOT NULL,
    recipient_profile_id uuid NOT NULL,
    amount numeric NOT NULL,
    currency character varying(10) DEFAULT 'BRL'::character varying,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying,
    transaction_hash text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT different_parties CHECK ((sender_profile_id <> recipient_profile_id)),
    CONSTRAINT wallet_transfers_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT wallet_transfers_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    balance_brl numeric(20,2) DEFAULT 0,
    balance_conchas integer DEFAULT 0,
    btc_equivalent numeric(20,8) DEFAULT 0,
    satoshi_equivalent bigint DEFAULT 0,
    last_btc_sync timestamp with time zone DEFAULT now(),
    wallet_status text DEFAULT 'active'::text,
    trust_level integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT wallets_trust_level_check CHECK (((trust_level >= 0) AND (trust_level <= 100))),
    CONSTRAINT wallets_wallet_status_check CHECK ((wallet_status = ANY (ARRAY['active'::text, 'frozen'::text, 'suspended'::text])))
);


--
-- Name: whatsapp_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    clicked_at timestamp with time zone DEFAULT now() NOT NULL,
    beach_id uuid
);


--
-- Name: whatsapp_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    vendor_id uuid,
    pin_id uuid,
    message_template text,
    map_link text,
    generated_link text NOT NULL,
    clicked boolean DEFAULT false,
    clicked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: youtube_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.youtube_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id text NOT NULL,
    channel_title text NOT NULL,
    description text,
    custom_url text,
    thumbnail_url text,
    banner_url text,
    subscriber_count bigint DEFAULT 0,
    video_count bigint DEFAULT 0,
    view_count bigint DEFAULT 0,
    profile_id uuid,
    social_profile_id uuid,
    channel_trust_score numeric(10,4) DEFAULT 0,
    btc_lastro_from_youtube numeric(18,8) DEFAULT 0,
    is_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_synced_at timestamp with time zone DEFAULT now()
);


--
-- Name: youtube_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.youtube_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_type text NOT NULL,
    video_id text,
    channel_id text,
    beach_id uuid,
    status text DEFAULT 'pending'::text,
    quota_used integer DEFAULT 0,
    response_data jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT youtube_sync_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'error'::text, 'cached'::text]))),
    CONSTRAINT youtube_sync_log_sync_type_check CHECK ((sync_type = ANY (ARRAY['video'::text, 'channel'::text, 'live'::text, 'search'::text])))
);


--
-- Name: youtube_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.youtube_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id text NOT NULL,
    title text NOT NULL,
    description text,
    thumbnail_url text,
    channel_id text NOT NULL,
    channel_title text,
    view_count bigint DEFAULT 0,
    like_count bigint DEFAULT 0,
    comment_count bigint DEFAULT 0,
    duration text,
    published_at timestamp with time zone,
    video_type text DEFAULT 'video'::text,
    is_live boolean DEFAULT false,
    live_broadcast_content text,
    beach_id uuid,
    vendor_id uuid,
    profile_id uuid,
    trust_multiplier numeric(10,4) DEFAULT 1.0,
    engagement_score numeric(12,4) DEFAULT 0,
    btc_equivalent numeric(18,8) DEFAULT 0,
    satoshi_equivalent bigint DEFAULT 0,
    tags text[],
    category_id text,
    default_language text,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    verified_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_synced_at timestamp with time zone DEFAULT now(),
    cache_expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
    CONSTRAINT youtube_videos_video_type_check CHECK ((video_type = ANY (ARRAY['video'::text, 'short'::text, 'live'::text])))
);


--
-- Name: constitutional_blocks block_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_blocks ALTER COLUMN block_number SET DEFAULT nextval('public.constitutional_blocks_block_number_seq'::regclass);


--
-- Name: ledger_events sequence_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_events ALTER COLUMN sequence_number SET DEFAULT nextval('public.ledger_events_sequence_number_seq'::regclass);


--
-- Name: account_identifiers account_identifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_identifiers
    ADD CONSTRAINT account_identifiers_pkey PRIMARY KEY (id);


--
-- Name: account_identifiers account_identifiers_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_identifiers
    ADD CONSTRAINT account_identifiers_profile_id_key UNIQUE (profile_id);


--
-- Name: account_identifiers account_identifiers_public_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_identifiers
    ADD CONSTRAINT account_identifiers_public_key_key UNIQUE (public_key);


--
-- Name: ad_catalogs ad_catalogs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_catalogs
    ADD CONSTRAINT ad_catalogs_pkey PRIMARY KEY (id);


--
-- Name: adam_notifications adam_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adam_notifications
    ADD CONSTRAINT adam_notifications_pkey PRIMARY KEY (id);


--
-- Name: admin_accounts admin_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_accounts
    ADD CONSTRAINT admin_accounts_pkey PRIMARY KEY (id);


--
-- Name: admin_ai_verdicts admin_ai_verdicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_ai_verdicts
    ADD CONSTRAINT admin_ai_verdicts_pkey PRIMARY KEY (id);


--
-- Name: admin_alerts admin_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_alerts
    ADD CONSTRAINT admin_alerts_pkey PRIMARY KEY (id);


--
-- Name: admin_allowed_emails admin_allowed_emails_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_allowed_emails
    ADD CONSTRAINT admin_allowed_emails_email_key UNIQUE (email);


--
-- Name: admin_allowed_emails admin_allowed_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_allowed_emails
    ADD CONSTRAINT admin_allowed_emails_pkey PRIMARY KEY (id);


--
-- Name: admin_config admin_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_config
    ADD CONSTRAINT admin_config_config_key_key UNIQUE (config_key);


--
-- Name: admin_config admin_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_config
    ADD CONSTRAINT admin_config_pkey PRIMARY KEY (id);


--
-- Name: admin_goals admin_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_goals
    ADD CONSTRAINT admin_goals_pkey PRIMARY KEY (id);


--
-- Name: ai_capability_types ai_capability_types_capability_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_capability_types
    ADD CONSTRAINT ai_capability_types_capability_key_key UNIQUE (capability_key);


--
-- Name: ai_capability_types ai_capability_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_capability_types
    ADD CONSTRAINT ai_capability_types_pkey PRIMARY KEY (id);


--
-- Name: ai_cognitive_health ai_cognitive_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_cognitive_health
    ADD CONSTRAINT ai_cognitive_health_pkey PRIMARY KEY (id);


--
-- Name: ai_cognitive_health ai_cognitive_health_week_start_provider_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_cognitive_health
    ADD CONSTRAINT ai_cognitive_health_week_start_provider_key UNIQUE (week_start, provider);


--
-- Name: ai_council_admin_notifications ai_council_admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_admin_notifications
    ADD CONSTRAINT ai_council_admin_notifications_pkey PRIMARY KEY (id);


--
-- Name: ai_council_agents ai_council_agents_agent_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_agents
    ADD CONSTRAINT ai_council_agents_agent_key_key UNIQUE (agent_key);


--
-- Name: ai_council_agents ai_council_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_agents
    ADD CONSTRAINT ai_council_agents_pkey PRIMARY KEY (id);


--
-- Name: ai_council_code_issues ai_council_code_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_code_issues
    ADD CONSTRAINT ai_council_code_issues_pkey PRIMARY KEY (id);


--
-- Name: ai_council_decisions ai_council_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_decisions
    ADD CONSTRAINT ai_council_decisions_pkey PRIMARY KEY (id);


--
-- Name: ai_council_diagnostics ai_council_diagnostics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_diagnostics
    ADD CONSTRAINT ai_council_diagnostics_pkey PRIMARY KEY (id);


--
-- Name: ai_council_events ai_council_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_events
    ADD CONSTRAINT ai_council_events_pkey PRIMARY KEY (id);


--
-- Name: ai_council_growth_metrics ai_council_growth_metrics_metric_key_period_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_growth_metrics
    ADD CONSTRAINT ai_council_growth_metrics_metric_key_period_start_key UNIQUE (metric_key, period_start);


--
-- Name: ai_council_growth_metrics ai_council_growth_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_growth_metrics
    ADD CONSTRAINT ai_council_growth_metrics_pkey PRIMARY KEY (id);


--
-- Name: ai_council_information_flows ai_council_information_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_information_flows
    ADD CONSTRAINT ai_council_information_flows_pkey PRIMARY KEY (id);


--
-- Name: ai_council_meeting_messages ai_council_meeting_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_meeting_messages
    ADD CONSTRAINT ai_council_meeting_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_council_notification_activity ai_council_notification_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_notification_activity
    ADD CONSTRAINT ai_council_notification_activity_pkey PRIMARY KEY (id);


--
-- Name: ai_council_proposals ai_council_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_proposals
    ADD CONSTRAINT ai_council_proposals_pkey PRIMARY KEY (proposal_id);


--
-- Name: ai_council_sessions ai_council_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_sessions
    ADD CONSTRAINT ai_council_sessions_pkey PRIMARY KEY (id);


--
-- Name: ai_council_suggestions ai_council_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_suggestions
    ADD CONSTRAINT ai_council_suggestions_pkey PRIMARY KEY (id);


--
-- Name: ai_decision_log ai_decision_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_decision_log
    ADD CONSTRAINT ai_decision_log_pkey PRIMARY KEY (id);


--
-- Name: ai_external_tasks ai_external_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_external_tasks
    ADD CONSTRAINT ai_external_tasks_pkey PRIMARY KEY (id);


--
-- Name: ai_metrics ai_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_metrics
    ADD CONSTRAINT ai_metrics_pkey PRIMARY KEY (id);


--
-- Name: ai_provider_health ai_provider_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_health
    ADD CONSTRAINT ai_provider_health_pkey PRIMARY KEY (id);


--
-- Name: ai_provider_health ai_provider_health_provider_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_health
    ADD CONSTRAINT ai_provider_health_provider_key UNIQUE (provider);


--
-- Name: ai_provider_usage_logs ai_provider_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_usage_logs
    ADD CONSTRAINT ai_provider_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_providers ai_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_pkey PRIMARY KEY (id);


--
-- Name: ai_providers ai_providers_provider_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_provider_id_key UNIQUE (provider_id);


--
-- Name: amendment_votes amendment_votes_amendment_id_voter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendment_votes
    ADD CONSTRAINT amendment_votes_amendment_id_voter_id_key UNIQUE (amendment_id, voter_id);


--
-- Name: amendment_votes amendment_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendment_votes
    ADD CONSTRAINT amendment_votes_pkey PRIMARY KEY (id);


--
-- Name: arbitration_cases arbitration_cases_case_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_cases
    ADD CONSTRAINT arbitration_cases_case_number_key UNIQUE (case_number);


--
-- Name: arbitration_cases arbitration_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_cases
    ADD CONSTRAINT arbitration_cases_pkey PRIMARY KEY (id);


--
-- Name: arbitration_decisions arbitration_decisions_immutable_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_decisions
    ADD CONSTRAINT arbitration_decisions_immutable_hash_key UNIQUE (immutable_hash);


--
-- Name: arbitration_decisions arbitration_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_decisions
    ADD CONSTRAINT arbitration_decisions_pkey PRIMARY KEY (id);


--
-- Name: arbitration_panels arbitration_panels_case_id_arbitrator_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_panels
    ADD CONSTRAINT arbitration_panels_case_id_arbitrator_id_key UNIQUE (case_id, arbitrator_id);


--
-- Name: arbitration_panels arbitration_panels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_panels
    ADD CONSTRAINT arbitration_panels_pkey PRIMARY KEY (id);


--
-- Name: asset_registry asset_registry_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_registry
    ADD CONSTRAINT asset_registry_entity_id_key UNIQUE (entity_id);


--
-- Name: asset_registry asset_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_registry
    ADD CONSTRAINT asset_registry_pkey PRIMARY KEY (asset_id);


--
-- Name: attack_pattern_alerts attack_pattern_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attack_pattern_alerts
    ADD CONSTRAINT attack_pattern_alerts_pkey PRIMARY KEY (id);


--
-- Name: banned_ips banned_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banned_ips
    ADD CONSTRAINT banned_ips_pkey PRIMARY KEY (id);


--
-- Name: beaches beaches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beaches
    ADD CONSTRAINT beaches_pkey PRIMARY KEY (id);


--
-- Name: board_governance_reports board_governance_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_governance_reports
    ADD CONSTRAINT board_governance_reports_pkey PRIMARY KEY (id);


--
-- Name: cache_store cache_store_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_store
    ADD CONSTRAINT cache_store_cache_key_key UNIQUE (cache_key);


--
-- Name: cache_store cache_store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_store
    ADD CONSTRAINT cache_store_pkey PRIMARY KEY (id);


--
-- Name: cached_news cached_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cached_news
    ADD CONSTRAINT cached_news_pkey PRIMARY KEY (id);


--
-- Name: chat_analytics chat_analytics_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_analytics
    ADD CONSTRAINT chat_analytics_date_key UNIQUE (date);


--
-- Name: chat_analytics chat_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_analytics
    ADD CONSTRAINT chat_analytics_pkey PRIMARY KEY (id);


--
-- Name: chat_contexts chat_contexts_context_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_contexts
    ADD CONSTRAINT chat_contexts_context_key_key UNIQUE (context_key);


--
-- Name: chat_contexts chat_contexts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_contexts
    ADD CONSTRAINT chat_contexts_pkey PRIMARY KEY (id);


--
-- Name: chat_media_interactions chat_media_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_media_interactions
    ADD CONSTRAINT chat_media_interactions_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_session_token_key UNIQUE (session_token);


--
-- Name: chat_suggestions chat_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_suggestions
    ADD CONSTRAINT chat_suggestions_pkey PRIMARY KEY (id);


--
-- Name: chat_webhook_events chat_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_webhook_events
    ADD CONSTRAINT chat_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: chat_youtube_webhook_events chat_youtube_webhook_events_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_youtube_webhook_events
    ADD CONSTRAINT chat_youtube_webhook_events_event_id_key UNIQUE (event_id);


--
-- Name: chat_youtube_webhook_events chat_youtube_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_youtube_webhook_events
    ADD CONSTRAINT chat_youtube_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: chatbot_interactions chatbot_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_interactions
    ADD CONSTRAINT chatbot_interactions_pkey PRIMARY KEY (id);


--
-- Name: civic_arbitrators civic_arbitrators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.civic_arbitrators
    ADD CONSTRAINT civic_arbitrators_pkey PRIMARY KEY (id);


--
-- Name: civic_arbitrators civic_arbitrators_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.civic_arbitrators
    ADD CONSTRAINT civic_arbitrators_user_id_key UNIQUE (user_id);


--
-- Name: client_conchas client_conchas_client_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_conchas
    ADD CONSTRAINT client_conchas_client_id_unique UNIQUE (client_id);


--
-- Name: client_conchas client_conchas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_conchas
    ADD CONSTRAINT client_conchas_pkey PRIMARY KEY (id);


--
-- Name: client_favorites client_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_favorites
    ADD CONSTRAINT client_favorites_pkey PRIMARY KEY (id);


--
-- Name: client_favorites client_favorites_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_favorites
    ADD CONSTRAINT client_favorites_unique UNIQUE (client_id, vendor_id);


--
-- Name: client_product_interests client_product_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_product_interests
    ADD CONSTRAINT client_product_interests_pkey PRIMARY KEY (id);


--
-- Name: client_transactions client_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_transactions
    ADD CONSTRAINT client_transactions_pkey PRIMARY KEY (id);


--
-- Name: clients clients_new_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_new_pkey PRIMARY KEY (profile_id);


--
-- Name: comment_likes comment_likes_comment_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_user_id_key UNIQUE (comment_id, user_id);


--
-- Name: comment_likes comment_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_pkey PRIMARY KEY (id);


--
-- Name: concha_emissions concha_emissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concha_emissions
    ADD CONSTRAINT concha_emissions_pkey PRIMARY KEY (id);


--
-- Name: concha_transactions concha_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concha_transactions
    ADD CONSTRAINT concha_transactions_pkey PRIMARY KEY (id);


--
-- Name: constitutional_amendments constitutional_amendments_amendment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_amendments
    ADD CONSTRAINT constitutional_amendments_amendment_number_key UNIQUE (amendment_number);


--
-- Name: constitutional_amendments constitutional_amendments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_amendments
    ADD CONSTRAINT constitutional_amendments_pkey PRIMARY KEY (id);


--
-- Name: constitutional_blocks constitutional_blocks_block_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_blocks
    ADD CONSTRAINT constitutional_blocks_block_hash_key UNIQUE (block_hash);


--
-- Name: constitutional_blocks constitutional_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_blocks
    ADD CONSTRAINT constitutional_blocks_pkey PRIMARY KEY (block_number);


--
-- Name: constitutional_signatories constitutional_signatories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_signatories
    ADD CONSTRAINT constitutional_signatories_pkey PRIMARY KEY (id);


--
-- Name: constitutional_signatories constitutional_signatories_public_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_signatories
    ADD CONSTRAINT constitutional_signatories_public_key_key UNIQUE (public_key);


--
-- Name: constitutional_state constitutional_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_state
    ADD CONSTRAINT constitutional_state_pkey PRIMARY KEY (id);


--
-- Name: constitutional_validation_logs constitutional_validation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_validation_logs
    ADD CONSTRAINT constitutional_validation_logs_pkey PRIMARY KEY (id);


--
-- Name: critical_states critical_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critical_states
    ADD CONSTRAINT critical_states_pkey PRIMARY KEY (id);


--
-- Name: critical_states critical_states_state_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.critical_states
    ADD CONSTRAINT critical_states_state_key_key UNIQUE (state_key);


--
-- Name: developer_code_issues developer_code_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.developer_code_issues
    ADD CONSTRAINT developer_code_issues_pkey PRIMARY KEY (id);


--
-- Name: developer_source_audit developer_source_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.developer_source_audit
    ADD CONSTRAINT developer_source_audit_pkey PRIMARY KEY (id);


--
-- Name: dissolution_state dissolution_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dissolution_state
    ADD CONSTRAINT dissolution_state_pkey PRIMARY KEY (id);


--
-- Name: editable_content editable_content_content_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.editable_content
    ADD CONSTRAINT editable_content_content_key_key UNIQUE (content_key);


--
-- Name: editable_content editable_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.editable_content
    ADD CONSTRAINT editable_content_pkey PRIMARY KEY (id);


--
-- Name: employee_permissions employee_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_permissions
    ADD CONSTRAINT employee_permissions_pkey PRIMARY KEY (id);


--
-- Name: employee_permissions employee_permissions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_permissions
    ADD CONSTRAINT employee_permissions_user_id_key UNIQUE (user_id);


--
-- Name: engineering_logs engineering_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engineering_logs
    ADD CONSTRAINT engineering_logs_pkey PRIMARY KEY (id);


--
-- Name: ethical_economy_rules ethical_economy_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ethical_economy_rules
    ADD CONSTRAINT ethical_economy_rules_pkey PRIMARY KEY (id);


--
-- Name: ethical_economy_rules ethical_economy_rules_rule_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ethical_economy_rules
    ADD CONSTRAINT ethical_economy_rules_rule_key_key UNIQUE (rule_key);


--
-- Name: exposure_plans exposure_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exposure_plans
    ADD CONSTRAINT exposure_plans_pkey PRIMARY KEY (id);


--
-- Name: exposure_plans exposure_plans_plan_level_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exposure_plans
    ADD CONSTRAINT exposure_plans_plan_level_key UNIQUE (plan_level);


--
-- Name: exposure_plans exposure_plans_plan_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exposure_plans
    ADD CONSTRAINT exposure_plans_plan_name_key UNIQUE (plan_name);


--
-- Name: feed_comments feed_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_comments
    ADD CONSTRAINT feed_comments_pkey PRIMARY KEY (id);


--
-- Name: feed_likes feed_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_likes
    ADD CONSTRAINT feed_likes_pkey PRIMARY KEY (id);


--
-- Name: feed_likes feed_likes_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_likes
    ADD CONSTRAINT feed_likes_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: feed_posts feed_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_posts
    ADD CONSTRAINT feed_posts_pkey PRIMARY KEY (id);


--
-- Name: founder_public_record founder_public_record_immutable_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.founder_public_record
    ADD CONSTRAINT founder_public_record_immutable_hash_key UNIQUE (immutable_hash);


--
-- Name: founder_public_record founder_public_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.founder_public_record
    ADD CONSTRAINT founder_public_record_pkey PRIMARY KEY (id);


--
-- Name: governance_decisions governance_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_decisions
    ADD CONSTRAINT governance_decisions_pkey PRIMARY KEY (id);


--
-- Name: governance_switches governance_switches_module_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_switches
    ADD CONSTRAINT governance_switches_module_key_key UNIQUE (module_key);


--
-- Name: governance_switches governance_switches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_switches
    ADD CONSTRAINT governance_switches_pkey PRIMARY KEY (id);


--
-- Name: hacker_intelligence_logs hacker_intelligence_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hacker_intelligence_logs
    ADD CONSTRAINT hacker_intelligence_logs_pkey PRIMARY KEY (id);


--
-- Name: human_work_queue human_work_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.human_work_queue
    ADD CONSTRAINT human_work_queue_pkey PRIMARY KEY (id);


--
-- Name: immutable_axioms immutable_axioms_axiom_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immutable_axioms
    ADD CONSTRAINT immutable_axioms_axiom_number_key UNIQUE (axiom_number);


--
-- Name: immutable_axioms immutable_axioms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immutable_axioms
    ADD CONSTRAINT immutable_axioms_pkey PRIMARY KEY (axiom_id);


--
-- Name: integrity_validations integrity_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrity_validations
    ADD CONSTRAINT integrity_validations_pkey PRIMARY KEY (validation_id);


--
-- Name: ip_blacklist ip_blacklist_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_blacklist
    ADD CONSTRAINT ip_blacklist_ip_address_key UNIQUE (ip_address);


--
-- Name: ip_blacklist ip_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_blacklist
    ADD CONSTRAINT ip_blacklist_pkey PRIMARY KEY (id);


--
-- Name: key_destruction_log key_destruction_log_immutable_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_destruction_log
    ADD CONSTRAINT key_destruction_log_immutable_hash_key UNIQUE (immutable_hash);


--
-- Name: key_destruction_log key_destruction_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_destruction_log
    ADD CONSTRAINT key_destruction_log_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base knowledge_base_solution_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_solution_key_key UNIQUE (solution_key);


--
-- Name: ledger_events ledger_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_events
    ADD CONSTRAINT ledger_events_pkey PRIMARY KEY (event_id);


--
-- Name: ledger_events ledger_events_sequence_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_events
    ADD CONSTRAINT ledger_events_sequence_number_key UNIQUE (sequence_number);


--
-- Name: ledger ledger_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: ledger ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_pkey PRIMARY KEY (id);


--
-- Name: location_history location_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_history
    ADD CONSTRAINT location_history_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: monetization_phases monetization_phases_phase_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monetization_phases
    ADD CONSTRAINT monetization_phases_phase_number_key UNIQUE (phase_number);


--
-- Name: monetization_phases monetization_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monetization_phases
    ADD CONSTRAINT monetization_phases_pkey PRIMARY KEY (id);


--
-- Name: music_genres music_genres_genre_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_genres
    ADD CONSTRAINT music_genres_genre_key_key UNIQUE (genre_key);


--
-- Name: music_genres music_genres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.music_genres
    ADD CONSTRAINT music_genres_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: operating_hours operating_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operating_hours
    ADD CONSTRAINT operating_hours_pkey PRIMARY KEY (id);


--
-- Name: operation_dictionary operation_dictionary_op_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_dictionary
    ADD CONSTRAINT operation_dictionary_op_key_key UNIQUE (op_key);


--
-- Name: operation_dictionary operation_dictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_dictionary
    ADD CONSTRAINT operation_dictionary_pkey PRIMARY KEY (id);


--
-- Name: orch_dependencies orch_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orch_dependencies
    ADD CONSTRAINT orch_dependencies_pkey PRIMARY KEY (id);


--
-- Name: orch_versions orch_versions_asset_type_asset_name_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orch_versions
    ADD CONSTRAINT orch_versions_asset_type_asset_name_version_number_key UNIQUE (asset_type, asset_name, version_number);


--
-- Name: orch_versions orch_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orch_versions
    ADD CONSTRAINT orch_versions_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: platform_wallet platform_wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_wallet
    ADD CONSTRAINT platform_wallet_pkey PRIMARY KEY (id);


--
-- Name: praieiro_chats praieiro_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.praieiro_chats
    ADD CONSTRAINT praieiro_chats_pkey PRIMARY KEY (id);


--
-- Name: price_drift_history price_drift_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_drift_history
    ADD CONSTRAINT price_drift_history_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_cpf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_cpf_key UNIQUE (cpf);


--
-- Name: profiles profiles_cpf_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_cpf_unique UNIQUE (cpf);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: profit_compatibility_checks profit_compatibility_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profit_compatibility_checks
    ADD CONSTRAINT profit_compatibility_checks_pkey PRIMARY KEY (id);


--
-- Name: protocol_parameters protocol_parameters_param_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.protocol_parameters
    ADD CONSTRAINT protocol_parameters_param_key_key UNIQUE (param_key);


--
-- Name: protocol_parameters protocol_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.protocol_parameters
    ADD CONSTRAINT protocol_parameters_pkey PRIMARY KEY (param_id);


--
-- Name: protocol_state protocol_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.protocol_state
    ADD CONSTRAINT protocol_state_pkey PRIMARY KEY (tx_id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: registration_milestones registration_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_milestones
    ADD CONSTRAINT registration_milestones_pkey PRIMARY KEY (id);


--
-- Name: registration_milestones registration_milestones_target_count_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_milestones
    ADD CONSTRAINT registration_milestones_target_count_key UNIQUE (target_count);


--
-- Name: responsibility_chain responsibility_chain_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibility_chain
    ADD CONSTRAINT responsibility_chain_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_key UNIQUE (order_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: safe_mode_state safe_mode_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safe_mode_state
    ADD CONSTRAINT safe_mode_state_pkey PRIMARY KEY (id);


--
-- Name: satoshi_events satoshi_events_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.satoshi_events
    ADD CONSTRAINT satoshi_events_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: satoshi_events satoshi_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.satoshi_events
    ADD CONSTRAINT satoshi_events_pkey PRIMARY KEY (id);


--
-- Name: satoshi_honeytokens satoshi_honeytokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.satoshi_honeytokens
    ADD CONSTRAINT satoshi_honeytokens_pkey PRIMARY KEY (id);


--
-- Name: satoshi_metrics satoshi_metrics_metric_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.satoshi_metrics
    ADD CONSTRAINT satoshi_metrics_metric_date_key UNIQUE (metric_date);


--
-- Name: satoshi_metrics satoshi_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.satoshi_metrics
    ADD CONSTRAINT satoshi_metrics_pkey PRIMARY KEY (id);


--
-- Name: search_intents search_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_intents
    ADD CONSTRAINT search_intents_pkey PRIMARY KEY (id);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: shadow_audits shadow_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shadow_audits
    ADD CONSTRAINT shadow_audits_pkey PRIMARY KEY (id);


--
-- Name: site_evaluations site_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_evaluations
    ADD CONSTRAINT site_evaluations_pkey PRIMARY KEY (id);


--
-- Name: social_posts social_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_pkey PRIMARY KEY (id);


--
-- Name: social_profiles social_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT social_profiles_pkey PRIMARY KEY (id);


--
-- Name: social_profiles social_profiles_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT social_profiles_profile_id_key UNIQUE (profile_id);


--
-- Name: social_profiles social_profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT social_profiles_username_key UNIQUE (username);


--
-- Name: source_code_snapshots source_code_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_code_snapshots
    ADD CONSTRAINT source_code_snapshots_pkey PRIMARY KEY (id);


--
-- Name: sovereign_actions sovereign_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sovereign_actions
    ADD CONSTRAINT sovereign_actions_pkey PRIMARY KEY (id);


--
-- Name: sovereign_metrics sovereign_metrics_metric_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sovereign_metrics
    ADD CONSTRAINT sovereign_metrics_metric_date_key UNIQUE (metric_date);


--
-- Name: sovereign_metrics sovereign_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sovereign_metrics
    ADD CONSTRAINT sovereign_metrics_pkey PRIMARY KEY (id);


--
-- Name: sovereign_vitality sovereign_vitality_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sovereign_vitality
    ADD CONSTRAINT sovereign_vitality_pkey PRIMARY KEY (id);


--
-- Name: stress_test_results stress_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stress_test_results
    ADD CONSTRAINT stress_test_results_pkey PRIMARY KEY (id);


--
-- Name: sys_ai_guidance sys_ai_guidance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_ai_guidance
    ADD CONSTRAINT sys_ai_guidance_pkey PRIMARY KEY (id);


--
-- Name: sys_change_history sys_change_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_change_history
    ADD CONSTRAINT sys_change_history_pkey PRIMARY KEY (id);


--
-- Name: sys_critical_alerts sys_critical_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_critical_alerts
    ADD CONSTRAINT sys_critical_alerts_pkey PRIMARY KEY (id);


--
-- Name: sys_health_metrics sys_health_metrics_metric_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_health_metrics
    ADD CONSTRAINT sys_health_metrics_metric_date_key UNIQUE (metric_date);


--
-- Name: sys_health_metrics sys_health_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_health_metrics
    ADD CONSTRAINT sys_health_metrics_pkey PRIMARY KEY (id);


--
-- Name: sys_orch_logs sys_orch_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_orch_logs
    ADD CONSTRAINT sys_orch_logs_pkey PRIMARY KEY (id);


--
-- Name: system_blackbox system_blackbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_blackbox
    ADD CONSTRAINT system_blackbox_pkey PRIMARY KEY (id);


--
-- Name: system_cycle_metrics system_cycle_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_cycle_metrics
    ADD CONSTRAINT system_cycle_metrics_pkey PRIMARY KEY (id);


--
-- Name: system_governance system_governance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_governance
    ADD CONSTRAINT system_governance_pkey PRIMARY KEY (id);


--
-- Name: system_health_logs system_health_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health_logs
    ADD CONSTRAINT system_health_logs_pkey PRIMARY KEY (id);


--
-- Name: system_vaults system_vaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_vaults
    ADD CONSTRAINT system_vaults_pkey PRIMARY KEY (id);


--
-- Name: system_vaults system_vaults_vault_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_vaults
    ADD CONSTRAINT system_vaults_vault_name_key UNIQUE (vault_name);


--
-- Name: systemic_failures systemic_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.systemic_failures
    ADD CONSTRAINT systemic_failures_pkey PRIMARY KEY (id);


--
-- Name: telemetry_events telemetry_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telemetry_events
    ADD CONSTRAINT telemetry_events_pkey PRIMARY KEY (id);


--
-- Name: threat_summary_daily threat_summary_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_summary_daily
    ADD CONSTRAINT threat_summary_daily_pkey PRIMARY KEY (id);


--
-- Name: threat_summary_daily threat_summary_daily_summary_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threat_summary_daily
    ADD CONSTRAINT threat_summary_daily_summary_date_key UNIQUE (summary_date);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: unified_pins unified_pins_google_place_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_pins
    ADD CONSTRAINT unified_pins_google_place_id_key UNIQUE (google_place_id);


--
-- Name: unified_pins unified_pins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_pins
    ADD CONSTRAINT unified_pins_pkey PRIMARY KEY (id);


--
-- Name: user_daily_access user_daily_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_access
    ADD CONSTRAINT user_daily_access_pkey PRIMARY KEY (id);


--
-- Name: user_daily_access user_daily_access_user_id_access_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_access
    ADD CONSTRAINT user_daily_access_user_id_access_date_key UNIQUE (user_id, access_date);


--
-- Name: user_data_exports user_data_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_data_exports
    ADD CONSTRAINT user_data_exports_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_types user_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_types
    ADD CONSTRAINT user_types_pkey PRIMARY KEY (id);


--
-- Name: user_types user_types_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_types
    ADD CONSTRAINT user_types_user_id_key UNIQUE (user_id);


--
-- Name: vendor_beach_link vendor_beach_link_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_beach_link
    ADD CONSTRAINT vendor_beach_link_pkey PRIMARY KEY (id);


--
-- Name: vendor_beach_link vendor_beach_link_vendor_id_beach_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_beach_link
    ADD CONSTRAINT vendor_beach_link_vendor_id_beach_id_key UNIQUE (vendor_id, beach_id);


--
-- Name: vendor_shops vendor_shops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_shops
    ADD CONSTRAINT vendor_shops_pkey PRIMARY KEY (id);


--
-- Name: vendor_shops vendor_shops_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_shops
    ADD CONSTRAINT vendor_shops_profile_id_key UNIQUE (profile_id);


--
-- Name: vendor_transactions vendor_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_transactions
    ADD CONSTRAINT vendor_transactions_pkey PRIMARY KEY (id);


--
-- Name: vendor_wallets vendor_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_wallets
    ADD CONSTRAINT vendor_wallets_pkey PRIMARY KEY (id);


--
-- Name: vendor_wallets vendor_wallets_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_wallets
    ADD CONSTRAINT vendor_wallets_vendor_id_key UNIQUE (vendor_id);


--
-- Name: vendors vendors_new_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_new_pkey PRIMARY KEY (profile_id);


--
-- Name: verified_humans verified_humans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_humans
    ADD CONSTRAINT verified_humans_pkey PRIMARY KEY (id);


--
-- Name: verified_humans verified_humans_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_humans
    ADD CONSTRAINT verified_humans_user_id_key UNIQUE (user_id);


--
-- Name: wallet_transfers wallet_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transfers
    ADD CONSTRAINT wallet_transfers_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_profile_id_key UNIQUE (profile_id);


--
-- Name: whatsapp_clicks whatsapp_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_clicks
    ADD CONSTRAINT whatsapp_clicks_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_links whatsapp_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_links
    ADD CONSTRAINT whatsapp_links_pkey PRIMARY KEY (id);


--
-- Name: youtube_channels youtube_channels_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_channels
    ADD CONSTRAINT youtube_channels_channel_id_key UNIQUE (channel_id);


--
-- Name: youtube_channels youtube_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_channels
    ADD CONSTRAINT youtube_channels_pkey PRIMARY KEY (id);


--
-- Name: youtube_sync_log youtube_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_sync_log
    ADD CONSTRAINT youtube_sync_log_pkey PRIMARY KEY (id);


--
-- Name: youtube_videos youtube_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_videos
    ADD CONSTRAINT youtube_videos_pkey PRIMARY KEY (id);


--
-- Name: youtube_videos youtube_videos_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_videos
    ADD CONSTRAINT youtube_videos_video_id_key UNIQUE (video_id);


--
-- Name: idx_adam_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adam_notifications_read ON public.adam_notifications USING btree (is_read) WHERE (is_read = false);


--
-- Name: idx_admin_ai_verdicts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_ai_verdicts_category ON public.admin_ai_verdicts USING btree (category);


--
-- Name: idx_admin_ai_verdicts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_ai_verdicts_created_at ON public.admin_ai_verdicts USING btree (created_at DESC);


--
-- Name: idx_ai_council_events_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_council_events_agent ON public.ai_council_events USING btree (agent_id);


--
-- Name: idx_ai_council_events_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_council_events_project ON public.ai_council_events USING btree (project_id);


--
-- Name: idx_ai_council_events_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_council_events_target ON public.ai_council_events USING btree (target_type, target_id);


--
-- Name: idx_ai_council_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_council_events_type ON public.ai_council_events USING btree (event_type, created_at DESC);


--
-- Name: idx_ai_council_satoshi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_council_satoshi ON public.ai_council_events USING btree (audit_hash) WHERE (audit_hash IS NOT NULL);


--
-- Name: idx_ai_decision_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_decision_agent ON public.ai_decision_log USING btree (agent_id);


--
-- Name: idx_ai_decision_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_decision_scope ON public.ai_decision_log USING btree (decision_scope);


--
-- Name: idx_ai_external_tasks_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_external_tasks_created ON public.ai_external_tasks USING btree (created_at DESC);


--
-- Name: idx_ai_external_tasks_critical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_external_tasks_critical ON public.ai_external_tasks USING btree (is_critical) WHERE (is_critical = true);


--
-- Name: idx_ai_external_tasks_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_external_tasks_priority ON public.ai_external_tasks USING btree (priority);


--
-- Name: idx_ai_external_tasks_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_external_tasks_provider ON public.ai_external_tasks USING btree (provider);


--
-- Name: idx_ai_external_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_external_tasks_status ON public.ai_external_tasks USING btree (status);


--
-- Name: idx_ai_metrics_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_active ON public.ai_metrics USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_ai_proposals_param; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_proposals_param ON public.ai_council_proposals USING btree (target_param_key);


--
-- Name: idx_ai_proposals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_proposals_status ON public.ai_council_proposals USING btree (status);


--
-- Name: idx_ai_provider_health_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_provider_health_provider ON public.ai_provider_health USING btree (provider);


--
-- Name: idx_ai_provider_health_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_provider_health_status ON public.ai_provider_health USING btree (status);


--
-- Name: idx_ai_providers_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_providers_priority ON public.ai_providers USING btree (priority);


--
-- Name: idx_ai_providers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_providers_status ON public.ai_providers USING btree (status);


--
-- Name: idx_ai_usage_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_created ON public.ai_provider_usage_logs USING btree (created_at DESC);


--
-- Name: idx_ai_usage_logs_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_provider ON public.ai_provider_usage_logs USING btree (provider_id);


--
-- Name: idx_amendment_votes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amendment_votes ON public.amendment_votes USING btree (amendment_id);


--
-- Name: idx_amendments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amendments_status ON public.constitutional_amendments USING btree (status);


--
-- Name: idx_arbitration_parties; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arbitration_parties ON public.arbitration_cases USING btree (plaintiff_id, defendant_id);


--
-- Name: idx_arbitration_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arbitration_status ON public.arbitration_cases USING btree (status);


--
-- Name: idx_asset_registry_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_registry_entity ON public.asset_registry USING btree (entity_id);


--
-- Name: idx_asset_registry_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_registry_owner ON public.asset_registry USING btree (owner_id);


--
-- Name: idx_asset_registry_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_registry_type ON public.asset_registry USING btree (asset_type);


--
-- Name: idx_attack_patterns_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attack_patterns_active ON public.attack_pattern_alerts USING btree (is_active, severity);


--
-- Name: idx_attack_patterns_region; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attack_patterns_region ON public.attack_pattern_alerts USING btree (affected_region);


--
-- Name: idx_banned_ips_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_banned_ips_active ON public.banned_ips USING btree (is_active);


--
-- Name: idx_banned_ips_blocked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_banned_ips_blocked_at ON public.banned_ips USING btree (blocked_at);


--
-- Name: idx_beaches_coords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beaches_coords ON public.beaches USING btree (latitude, longitude) WHERE (latitude IS NOT NULL);


--
-- Name: idx_blackbox_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blackbox_created ON public.system_blackbox USING btree (created_at DESC);


--
-- Name: idx_blackbox_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blackbox_resolved ON public.system_blackbox USING btree (resolved) WHERE (resolved = false);


--
-- Name: idx_blacklist_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blacklist_ip ON public.ip_blacklist USING btree (ip_address);


--
-- Name: idx_cache_store_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_store_expires ON public.cache_store USING btree (expires_at);


--
-- Name: idx_cache_store_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_store_key ON public.cache_store USING btree (cache_key);


--
-- Name: idx_chat_media_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_media_action ON public.chat_media_interactions USING btree (action_type);


--
-- Name: idx_chat_media_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_media_created ON public.chat_media_interactions USING btree (created_at DESC);


--
-- Name: idx_chat_media_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_media_query ON public.chat_media_interactions USING btree (media_query);


--
-- Name: idx_chat_media_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_media_session ON public.chat_media_interactions USING btree (session_id);


--
-- Name: idx_chat_media_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_media_user ON public.chat_media_interactions USING btree (user_id);


--
-- Name: idx_chat_messages_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_role ON public.chat_messages USING btree (role);


--
-- Name: idx_chat_messages_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_session ON public.chat_messages USING btree (session_id, created_at DESC);


--
-- Name: idx_chat_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_active ON public.chat_sessions USING btree (is_active, last_activity_at DESC);


--
-- Name: idx_chat_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_token ON public.chat_sessions USING btree (session_token);


--
-- Name: idx_chat_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions USING btree (user_id);


--
-- Name: idx_chat_suggestions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_suggestions_category ON public.chat_suggestions USING btree (category, is_active);


--
-- Name: idx_chat_webhook_events_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_webhook_events_session ON public.chat_webhook_events USING btree (session_id);


--
-- Name: idx_chat_webhook_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_webhook_events_type ON public.chat_webhook_events USING btree (event_type, processed);


--
-- Name: idx_chatbot_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chatbot_created ON public.chatbot_interactions USING btree (created_at DESC);


--
-- Name: idx_chatbot_interactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chatbot_interactions_user_id ON public.chatbot_interactions USING btree (user_id);


--
-- Name: idx_chatbot_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chatbot_session ON public.chatbot_interactions USING btree (session_id);


--
-- Name: idx_client_conchas_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_conchas_client_id ON public.client_conchas USING btree (client_id);


--
-- Name: idx_client_favorites_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_favorites_client_id ON public.client_favorites USING btree (client_id);


--
-- Name: idx_client_favorites_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_favorites_vendor_id ON public.client_favorites USING btree (vendor_id);


--
-- Name: idx_code_issues_file; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_issues_file ON public.ai_council_code_issues USING btree (file_path);


--
-- Name: idx_code_issues_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_issues_severity ON public.ai_council_code_issues USING btree (severity);


--
-- Name: idx_concha_transactions_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concha_transactions_client_id ON public.concha_transactions USING btree (client_id);


--
-- Name: idx_decisions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_decisions_status ON public.ai_council_decisions USING btree (execution_status);


--
-- Name: idx_developer_code_issues_file_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_developer_code_issues_file_path ON public.developer_code_issues USING btree (file_path);


--
-- Name: idx_developer_code_issues_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_developer_code_issues_severity ON public.developer_code_issues USING btree (severity);


--
-- Name: idx_developer_code_issues_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_developer_code_issues_status ON public.developer_code_issues USING btree (status);


--
-- Name: idx_developer_source_audit_file_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_developer_source_audit_file_path ON public.developer_source_audit USING btree (file_path);


--
-- Name: idx_engineering_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engineering_logs_created_at ON public.engineering_logs USING btree (created_at DESC);


--
-- Name: idx_engineering_logs_error_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engineering_logs_error_code ON public.engineering_logs USING btree (error_code);


--
-- Name: idx_failures_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_failures_severity ON public.systemic_failures USING btree (severity_level);


--
-- Name: idx_governance_decisions_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_governance_decisions_agent ON public.governance_decisions USING btree (agent_id);


--
-- Name: idx_governance_decisions_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_governance_decisions_deadline ON public.governance_decisions USING btree (confirmation_deadline);


--
-- Name: idx_governance_decisions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_governance_decisions_status ON public.governance_decisions USING btree (status);


--
-- Name: idx_governance_reports_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_governance_reports_created ON public.board_governance_reports USING btree (created_at DESC);


--
-- Name: idx_governance_reports_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_governance_reports_type ON public.board_governance_reports USING btree (report_type);


--
-- Name: idx_hacker_logs_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hacker_logs_country ON public.hacker_intelligence_logs USING btree (country_code);


--
-- Name: idx_hacker_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hacker_logs_created ON public.hacker_intelligence_logs USING btree (created_at DESC);


--
-- Name: idx_hacker_logs_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hacker_logs_ip ON public.hacker_intelligence_logs USING btree (ip_address);


--
-- Name: idx_honeytokens_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_honeytokens_date ON public.satoshi_honeytokens USING btree (generation_date);


--
-- Name: idx_human_work_queue_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_human_work_queue_module ON public.human_work_queue USING btree (module_key);


--
-- Name: idx_human_work_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_human_work_queue_status ON public.human_work_queue USING btree (status);


--
-- Name: idx_info_flows_anomaly; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_info_flows_anomaly ON public.ai_council_information_flows USING btree (anomaly_detected) WHERE (anomaly_detected = true);


--
-- Name: idx_info_flows_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_info_flows_created ON public.ai_council_information_flows USING btree (created_at DESC);


--
-- Name: idx_info_flows_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_info_flows_type ON public.ai_council_information_flows USING btree (flow_type);


--
-- Name: idx_knowledge_base_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_category ON public.knowledge_base USING btree (category);


--
-- Name: idx_ledger_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_created_at ON public.ledger USING btree (created_at DESC);


--
-- Name: idx_ledger_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_currency ON public.ledger USING btree (currency);


--
-- Name: idx_ledger_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_events_created ON public.ledger_events USING btree (created_at DESC);


--
-- Name: idx_ledger_events_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_events_sequence ON public.ledger_events USING btree (sequence_number);


--
-- Name: idx_ledger_events_tx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_events_tx ON public.ledger_events USING btree (tx_id);


--
-- Name: idx_ledger_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_events_type ON public.ledger_events USING btree (event_type);


--
-- Name: idx_ledger_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_idempotency ON public.ledger USING btree (idempotency_key);


--
-- Name: idx_ledger_profile_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_profile_created ON public.ledger USING btree (profile_id, created_at DESC);


--
-- Name: idx_ledger_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_profile_id ON public.ledger USING btree (profile_id);


--
-- Name: idx_ledger_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_reference ON public.ledger USING btree (reference_type, reference_id);


--
-- Name: idx_ledger_satoshi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_satoshi ON public.ledger USING btree (satoshi_hash) WHERE (satoshi_hash IS NOT NULL);


--
-- Name: idx_ledger_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_status ON public.ledger USING btree (status);


--
-- Name: idx_location_history_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_history_profile ON public.location_history USING btree (profile_id, created_at DESC);


--
-- Name: idx_location_history_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_history_time ON public.location_history USING btree (created_at DESC);


--
-- Name: idx_meeting_messages_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_messages_session ON public.ai_council_meeting_messages USING btree (session_id, created_at);


--
-- Name: idx_music_genres_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_music_genres_active ON public.music_genres USING btree (is_active, display_order);


--
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_priority ON public.ai_council_admin_notifications USING btree (priority);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.ai_council_admin_notifications USING btree (is_read) WHERE (is_read = false);


--
-- Name: idx_orch_deps_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orch_deps_source ON public.orch_dependencies USING btree (source_type, source_name);


--
-- Name: idx_orch_deps_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orch_deps_target ON public.orch_dependencies USING btree (target_type, target_name);


--
-- Name: idx_orch_versions_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orch_versions_asset ON public.orch_versions USING btree (asset_type, asset_name);


--
-- Name: idx_orch_versions_production; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orch_versions_production ON public.orch_versions USING btree (is_production) WHERE (is_production = true);


--
-- Name: idx_orders_satoshi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_satoshi ON public.orders USING btree (satoshi_hash) WHERE (satoshi_hash IS NOT NULL);


--
-- Name: idx_payments_satoshi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_satoshi ON public.payments USING btree (satoshi_hash) WHERE (satoshi_hash IS NOT NULL);


--
-- Name: idx_payments_stripe_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_stripe_session ON public.payments USING btree (stripe_session_id);


--
-- Name: idx_payments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_user_id ON public.payments USING btree (user_id);


--
-- Name: idx_praieiro_chats_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_praieiro_chats_created ON public.praieiro_chats USING btree (created_at DESC);


--
-- Name: idx_praieiro_chats_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_praieiro_chats_session ON public.praieiro_chats USING btree (session_id);


--
-- Name: idx_praieiro_chats_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_praieiro_chats_user ON public.praieiro_chats USING btree (user_id);


--
-- Name: idx_price_drift_agent_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_drift_agent_entity ON public.price_drift_history USING btree (agent_id, entity_type, entity_id);


--
-- Name: idx_price_drift_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_drift_window ON public.price_drift_history USING btree (window_start, window_end);


--
-- Name: idx_products_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_shop ON public.products USING btree (shop_id);


--
-- Name: idx_profiles_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_location ON public.profiles USING gist (location);


--
-- Name: idx_profiles_shell_balance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_shell_balance ON public.profiles USING btree (shell_balance);


--
-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);


--
-- Name: idx_profiles_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_user_type ON public.profiles USING btree (user_type);


--
-- Name: idx_profiles_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_wallet ON public.profiles USING btree (wallet_public_key) WHERE (wallet_public_key IS NOT NULL);


--
-- Name: idx_protocol_params_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_protocol_params_category ON public.protocol_parameters USING btree (category);


--
-- Name: idx_protocol_params_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_protocol_params_key ON public.protocol_parameters USING btree (param_key);


--
-- Name: idx_protocol_state_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_protocol_state_created ON public.protocol_state USING btree (created_at DESC);


--
-- Name: idx_protocol_state_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_protocol_state_entity ON public.protocol_state USING btree (entity_id);


--
-- Name: idx_protocol_state_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_protocol_state_key ON public.protocol_state USING btree (key_structure);


--
-- Name: idx_protocol_state_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_protocol_state_metadata_gin ON public.protocol_state USING gin (metadata);


--
-- Name: idx_protocol_state_payload_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_protocol_state_payload_gin ON public.protocol_state USING gin (payload);


--
-- Name: idx_protocol_state_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_protocol_state_version ON public.protocol_state USING btree (entity_id, version DESC);


--
-- Name: idx_rate_limits_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits USING btree (identifier, action, window_start);


--
-- Name: idx_responsibility_failure; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_responsibility_failure ON public.responsibility_chain USING btree (failure_id);


--
-- Name: idx_reviews_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_order_id ON public.reviews USING btree (order_id);


--
-- Name: idx_reviews_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_vendor_id ON public.reviews USING btree (vendor_id);


--
-- Name: idx_search_intents_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_intents_created ON public.search_intents USING btree (created_at DESC);


--
-- Name: idx_search_intents_place_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_intents_place_id ON public.search_intents USING btree (place_id);


--
-- Name: idx_search_intents_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_intents_query ON public.search_intents USING btree (query);


--
-- Name: idx_security_logs_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_lookup ON public.security_logs USING btree (event_type, identifier, created_at DESC);


--
-- Name: idx_security_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_logs_user ON public.security_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_shadow_audits_drift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shadow_audits_drift ON public.shadow_audits USING btree (drift_detected) WHERE (drift_detected = true);


--
-- Name: idx_single_genesis; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_single_genesis ON public.satoshi_events USING btree (event_type) WHERE (event_type = 'GENESIS'::text);


--
-- Name: idx_social_posts_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_posts_author ON public.social_posts USING btree (author_id, created_at DESC);


--
-- Name: idx_social_posts_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_posts_created ON public.social_posts USING btree (created_at DESC);


--
-- Name: idx_social_posts_weighted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_posts_weighted ON public.social_posts USING btree (weighted_score DESC);


--
-- Name: idx_social_profiles_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_profiles_profile ON public.social_profiles USING btree (profile_id);


--
-- Name: idx_social_profiles_trust; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_profiles_trust ON public.social_profiles USING btree (btc_trust_score DESC);


--
-- Name: idx_social_profiles_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_profiles_username ON public.social_profiles USING btree (username);


--
-- Name: idx_sovereign_actions_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sovereign_actions_actor ON public.sovereign_actions USING btree (actor_id);


--
-- Name: idx_suggestions_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suggestions_priority ON public.ai_council_suggestions USING btree (priority);


--
-- Name: idx_suggestions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suggestions_status ON public.ai_council_suggestions USING btree (status);


--
-- Name: idx_sys_ai_guidance_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_ai_guidance_status ON public.sys_ai_guidance USING btree (status);


--
-- Name: idx_sys_change_history_orch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_change_history_orch_id ON public.sys_change_history USING btree (orch_id);


--
-- Name: idx_sys_critical_alerts_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_critical_alerts_resolved ON public.sys_critical_alerts USING btree (resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_sys_critical_alerts_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_critical_alerts_severity ON public.sys_critical_alerts USING btree (severity);


--
-- Name: idx_sys_orch_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_orch_logs_created_at ON public.sys_orch_logs USING btree (created_at DESC);


--
-- Name: idx_sys_orch_logs_orch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_orch_logs_orch_id ON public.sys_orch_logs USING btree (orch_id);


--
-- Name: idx_sys_orch_logs_payload; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_orch_logs_payload ON public.sys_orch_logs USING gin (log_payload);


--
-- Name: idx_sys_orch_logs_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_orch_logs_severity ON public.sys_orch_logs USING btree (log_severity);


--
-- Name: idx_sys_orch_logs_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sys_orch_logs_stage ON public.sys_orch_logs USING btree (log_stage);


--
-- Name: idx_telemetry_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telemetry_created_at ON public.telemetry_events USING btree (created_at DESC);


--
-- Name: idx_telemetry_stress; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telemetry_stress ON public.telemetry_events USING btree (event_name) WHERE (((properties ->> 'stress_test'::text))::boolean = true);


--
-- Name: idx_transactions_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_data ON public.transactions USING btree (data_transacao DESC);


--
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- Name: idx_unified_pins_coords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_pins_coords ON public.unified_pins USING btree (latitude, longitude);


--
-- Name: idx_unified_pins_search_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unified_pins_search_count ON public.unified_pins USING btree (search_count DESC);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_validation_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_logs_created ON public.constitutional_validation_logs USING btree (created_at DESC);


--
-- Name: idx_validation_logs_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_logs_decision ON public.constitutional_validation_logs USING btree (decision_id);


--
-- Name: idx_vendor_shops_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_shops_location ON public.vendor_shops USING btree (latitude, longitude);


--
-- Name: idx_vendor_shops_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_shops_profile ON public.vendor_shops USING btree (profile_id);


--
-- Name: idx_vendor_shops_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_shops_status ON public.vendor_shops USING btree (status);


--
-- Name: idx_vendors_accuracy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_accuracy ON public.vendors USING btree (accuracy_radius) WHERE (accuracy_radius IS NOT NULL);


--
-- Name: idx_vendors_active_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_active_location ON public.vendors USING btree (status, location_updated_at) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_vendors_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_location ON public.vendors USING gist (location);


--
-- Name: idx_vendors_location_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_location_gist ON public.vendors USING gist (location);


--
-- Name: idx_verified_humans_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verified_humans_level ON public.verified_humans USING btree (verification_level);


--
-- Name: idx_wallets_btc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_btc ON public.wallets USING btree (btc_equivalent DESC);


--
-- Name: idx_wallets_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_profile ON public.wallets USING btree (profile_id);


--
-- Name: idx_webhook_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_created ON public.chat_youtube_webhook_events USING btree (created_at DESC);


--
-- Name: idx_webhook_events_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_session ON public.chat_youtube_webhook_events USING btree (session_id);


--
-- Name: idx_webhook_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_status ON public.chat_youtube_webhook_events USING btree (status);


--
-- Name: idx_webhook_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_type ON public.chat_youtube_webhook_events USING btree (event_type);


--
-- Name: idx_webhook_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_user ON public.chat_youtube_webhook_events USING btree (user_id);


--
-- Name: idx_youtube_channels_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_channels_channel_id ON public.youtube_channels USING btree (channel_id);


--
-- Name: idx_youtube_channels_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_channels_profile_id ON public.youtube_channels USING btree (profile_id);


--
-- Name: idx_youtube_sync_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_sync_log_created ON public.youtube_sync_log USING btree (created_at DESC);


--
-- Name: idx_youtube_videos_beach_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_videos_beach_id ON public.youtube_videos USING btree (beach_id);


--
-- Name: idx_youtube_videos_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_videos_cache_expires ON public.youtube_videos USING btree (cache_expires_at);


--
-- Name: idx_youtube_videos_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_videos_channel_id ON public.youtube_videos USING btree (channel_id);


--
-- Name: idx_youtube_videos_engagement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_videos_engagement ON public.youtube_videos USING btree (engagement_score DESC);


--
-- Name: idx_youtube_videos_is_live; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_videos_is_live ON public.youtube_videos USING btree (is_live) WHERE (is_live = true);


--
-- Name: idx_youtube_videos_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_videos_profile_id ON public.youtube_videos USING btree (profile_id);


--
-- Name: idx_youtube_videos_video_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_videos_video_id ON public.youtube_videos USING btree (video_id);


--
-- Name: idx_youtube_videos_video_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_videos_video_type ON public.youtube_videos USING btree (video_type);


--
-- Name: genre_analytics _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.genre_analytics WITH (security_invoker='true') AS
 SELECT mg.genre_key,
    mg.genre_name,
    mg.genre_emoji,
    mg.play_count,
    mg.color_class,
    count(cyw.id) AS webhook_events,
    max(cyw.created_at) AS last_played
   FROM (public.music_genres mg
     LEFT JOIN public.chat_youtube_webhook_events cyw ON ((cyw.genre = mg.genre_key)))
  WHERE (mg.is_active = true)
  GROUP BY mg.id
  ORDER BY mg.play_count DESC;


--
-- Name: profiles check_milestones_on_profile; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_milestones_on_profile AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.check_registration_milestones();


--
-- Name: messages on_new_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();


--
-- Name: orders on_new_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();


--
-- Name: orders on_order_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_order_status_change AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();


--
-- Name: profiles on_profile_created_generate_key; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created_generate_key AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.generate_account_identifier();


--
-- Name: protocol_parameters protocol_parameters_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER protocol_parameters_audit BEFORE UPDATE ON public.protocol_parameters FOR EACH ROW EXECUTE FUNCTION public.protocol_parameters_audit_fn();


--
-- Name: protocol_state protocol_state_after_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER protocol_state_after_insert AFTER INSERT ON public.protocol_state FOR EACH ROW EXECUTE FUNCTION public.protocol_state_after_insert_fn();


--
-- Name: protocol_state protocol_state_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER protocol_state_before_insert BEFORE INSERT ON public.protocol_state FOR EACH ROW EXECUTE FUNCTION public.protocol_state_before_insert_fn();


--
-- Name: vendors trg_record_location_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_record_location_history AFTER UPDATE OF location ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.record_location_history();


--
-- Name: satoshi_events trg_satoshi_constitution; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_satoshi_constitution BEFORE INSERT OR DELETE OR UPDATE ON public.satoshi_events FOR EACH ROW EXECUTE FUNCTION public.satoshi_constitutional_trigger();


--
-- Name: orders trigger_add_conchas_on_order_complete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_add_conchas_on_order_complete AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.add_conchas_on_order_complete();


--
-- Name: youtube_videos trigger_audit_new_video; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_new_video AFTER INSERT ON public.youtube_videos FOR EACH ROW EXECUTE FUNCTION public.audit_new_video();


--
-- Name: wallets trigger_audit_wallet; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_wallet AFTER UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.audit_wallet_changes();


--
-- Name: social_posts trigger_capture_post_lastro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_capture_post_lastro BEFORE INSERT ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.capture_post_lastro();


--
-- Name: chat_messages trigger_chat_message_webhook; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_chat_message_webhook AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.trigger_chat_webhook();


--
-- Name: chat_sessions trigger_chat_session_webhook; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_chat_session_webhook AFTER INSERT OR UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.trigger_chat_webhook();


--
-- Name: developer_code_issues trigger_code_issue_satoshi_hash; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_code_issue_satoshi_hash BEFORE INSERT ON public.developer_code_issues FOR EACH ROW EXECUTE FUNCTION public.generate_code_issue_satoshi_hash();


--
-- Name: banned_ips trigger_detect_siege_pattern; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_detect_siege_pattern AFTER INSERT ON public.banned_ips FOR EACH ROW EXECUTE FUNCTION public.detect_siege_pattern();


--
-- Name: sys_orch_logs trigger_error_to_alert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_error_to_alert AFTER INSERT ON public.sys_orch_logs FOR EACH ROW EXECUTE FUNCTION public.trigger_critical_alert_on_error();


--
-- Name: banned_ips trigger_generate_clo_report; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_clo_report AFTER INSERT ON public.banned_ips FOR EACH ROW EXECUTE FUNCTION public.generate_clo_report();


--
-- Name: chat_messages trigger_generate_session_title; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_session_title BEFORE INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.generate_chat_session_title();


--
-- Name: banned_ips trigger_notify_admin_ip_banned; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_admin_ip_banned AFTER INSERT ON public.banned_ips FOR EACH ROW EXECUTE FUNCTION public.notify_admin_ip_banned();


--
-- Name: sys_orch_logs trigger_optimization_check; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_optimization_check AFTER INSERT ON public.sys_orch_logs FOR EACH ROW WHEN ((new.execution_time_ms IS NOT NULL)) EXECUTE FUNCTION public.trigger_optimization_guidance();


--
-- Name: chat_messages trigger_update_chat_analytics; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_chat_analytics AFTER INSERT OR UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_chat_analytics();


--
-- Name: chat_messages trigger_update_session_counters; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_session_counters AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_chat_session_counters();


--
-- Name: youtube_videos trigger_update_video_engagement; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_video_engagement BEFORE INSERT OR UPDATE OF view_count, like_count, comment_count ON public.youtube_videos FOR EACH ROW EXECUTE FUNCTION public.update_video_engagement();


--
-- Name: social_posts trigger_update_weighted_score; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_weighted_score BEFORE UPDATE OF like_count, comment_count, repost_count ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.update_post_weighted_score();


--
-- Name: admin_config update_admin_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_config_updated_at BEFORE UPDATE ON public.admin_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_goals update_admin_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_goals_updated_at BEFORE UPDATE ON public.admin_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_providers update_ai_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chat_media_interactions update_chat_media_interactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chat_media_interactions_updated_at BEFORE UPDATE ON public.chat_media_interactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: editable_content update_editable_content_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_editable_content_updated_at BEFORE UPDATE ON public.editable_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feed_posts update_feed_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_feed_posts_updated_at BEFORE UPDATE ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: music_genres update_music_genres_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_music_genres_updated_at BEFORE UPDATE ON public.music_genres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_vaults update_system_vaults_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_vaults_timestamp BEFORE UPDATE ON public.system_vaults FOR EACH ROW EXECUTE FUNCTION public.update_system_vaults_updated_at();


--
-- Name: unified_pins update_unified_pins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_unified_pins_updated_at BEFORE UPDATE ON public.unified_pins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendor_shops update_vendor_shops_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendor_shops_timestamp BEFORE UPDATE ON public.vendor_shops FOR EACH ROW EXECUTE FUNCTION public.update_vendor_shop_timestamp();


--
-- Name: vendor_wallets update_vendor_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendor_wallets_updated_at BEFORE UPDATE ON public.vendor_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors update_vendors_new_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendors_new_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chat_youtube_webhook_events update_webhook_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_webhook_events_updated_at BEFORE UPDATE ON public.chat_youtube_webhook_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feed_comments validate_feed_comment_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_feed_comment_trigger BEFORE INSERT OR UPDATE ON public.feed_comments FOR EACH ROW EXECUTE FUNCTION public.validate_feed_comment();


--
-- Name: feed_posts validate_feed_post_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_feed_post_trigger BEFORE INSERT OR UPDATE ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION public.validate_feed_post();


--
-- Name: account_identifiers account_identifiers_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_identifiers
    ADD CONSTRAINT account_identifiers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: admin_ai_verdicts admin_ai_verdicts_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_ai_verdicts
    ADD CONSTRAINT admin_ai_verdicts_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: admin_allowed_emails admin_allowed_emails_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_allowed_emails
    ADD CONSTRAINT admin_allowed_emails_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id);


--
-- Name: ai_council_admin_notifications ai_council_admin_notifications_source_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_admin_notifications
    ADD CONSTRAINT ai_council_admin_notifications_source_agent_id_fkey FOREIGN KEY (source_agent_id) REFERENCES public.ai_council_agents(id);


--
-- Name: ai_council_admin_notifications ai_council_admin_notifications_source_decision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_admin_notifications
    ADD CONSTRAINT ai_council_admin_notifications_source_decision_id_fkey FOREIGN KEY (source_decision_id) REFERENCES public.ai_council_decisions(id);


--
-- Name: ai_council_admin_notifications ai_council_admin_notifications_source_suggestion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_admin_notifications
    ADD CONSTRAINT ai_council_admin_notifications_source_suggestion_id_fkey FOREIGN KEY (source_suggestion_id) REFERENCES public.ai_council_suggestions(id);


--
-- Name: ai_council_decisions ai_council_decisions_suggestion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_decisions
    ADD CONSTRAINT ai_council_decisions_suggestion_id_fkey FOREIGN KEY (suggestion_id) REFERENCES public.ai_council_suggestions(id);


--
-- Name: ai_council_diagnostics ai_council_diagnostics_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_diagnostics
    ADD CONSTRAINT ai_council_diagnostics_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id);


--
-- Name: ai_council_meeting_messages ai_council_meeting_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_meeting_messages
    ADD CONSTRAINT ai_council_meeting_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_council_sessions(id);


--
-- Name: ai_council_notification_activity ai_council_notification_activity_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_notification_activity
    ADD CONSTRAINT ai_council_notification_activity_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.ai_council_admin_notifications(id);


--
-- Name: ai_council_proposals ai_council_proposals_target_param_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_proposals
    ADD CONSTRAINT ai_council_proposals_target_param_key_fkey FOREIGN KEY (target_param_key) REFERENCES public.protocol_parameters(param_key);


--
-- Name: ai_council_suggestions ai_council_suggestions_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_council_suggestions
    ADD CONSTRAINT ai_council_suggestions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_council_agents(id);


--
-- Name: ai_external_tasks ai_external_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_external_tasks
    ADD CONSTRAINT ai_external_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: ai_provider_usage_logs ai_provider_usage_logs_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_usage_logs
    ADD CONSTRAINT ai_provider_usage_logs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.ai_providers(provider_id);


--
-- Name: amendment_votes amendment_votes_amendment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendment_votes
    ADD CONSTRAINT amendment_votes_amendment_id_fkey FOREIGN KEY (amendment_id) REFERENCES public.constitutional_amendments(id) ON DELETE CASCADE;


--
-- Name: amendment_votes amendment_votes_voter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amendment_votes
    ADD CONSTRAINT amendment_votes_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES auth.users(id);


--
-- Name: arbitration_cases arbitration_cases_defendant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_cases
    ADD CONSTRAINT arbitration_cases_defendant_id_fkey FOREIGN KEY (defendant_id) REFERENCES auth.users(id);


--
-- Name: arbitration_cases arbitration_cases_plaintiff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_cases
    ADD CONSTRAINT arbitration_cases_plaintiff_id_fkey FOREIGN KEY (plaintiff_id) REFERENCES auth.users(id);


--
-- Name: arbitration_decisions arbitration_decisions_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_decisions
    ADD CONSTRAINT arbitration_decisions_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.arbitration_cases(id) ON DELETE CASCADE;


--
-- Name: arbitration_panels arbitration_panels_arbitrator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_panels
    ADD CONSTRAINT arbitration_panels_arbitrator_id_fkey FOREIGN KEY (arbitrator_id) REFERENCES public.civic_arbitrators(id);


--
-- Name: arbitration_panels arbitration_panels_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arbitration_panels
    ADD CONSTRAINT arbitration_panels_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.arbitration_cases(id) ON DELETE CASCADE;


--
-- Name: asset_registry asset_registry_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_registry
    ADD CONSTRAINT asset_registry_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: banned_ips banned_ips_unblocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banned_ips
    ADD CONSTRAINT banned_ips_unblocked_by_fkey FOREIGN KEY (unblocked_by) REFERENCES auth.users(id);


--
-- Name: chat_media_interactions chat_media_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_media_interactions
    ADD CONSTRAINT chat_media_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_webhook_events chat_webhook_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_webhook_events
    ADD CONSTRAINT chat_webhook_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE SET NULL;


--
-- Name: chat_youtube_webhook_events chat_youtube_webhook_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_youtube_webhook_events
    ADD CONSTRAINT chat_youtube_webhook_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: civic_arbitrators civic_arbitrators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.civic_arbitrators
    ADD CONSTRAINT civic_arbitrators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: civic_arbitrators civic_arbitrators_verified_human_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.civic_arbitrators
    ADD CONSTRAINT civic_arbitrators_verified_human_id_fkey FOREIGN KEY (verified_human_id) REFERENCES public.verified_humans(id);


--
-- Name: client_product_interests client_product_interests_beach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_product_interests
    ADD CONSTRAINT client_product_interests_beach_id_fkey FOREIGN KEY (beach_id) REFERENCES public.beaches(id) ON DELETE SET NULL;


--
-- Name: client_transactions client_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_transactions
    ADD CONSTRAINT client_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: clients clients_new_preferred_beach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_new_preferred_beach_id_fkey FOREIGN KEY (preferred_beach_id) REFERENCES public.beaches(id);


--
-- Name: clients clients_new_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_new_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.feed_comments(id) ON DELETE CASCADE;


--
-- Name: concha_emissions concha_emissions_authorized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concha_emissions
    ADD CONSTRAINT concha_emissions_authorized_by_fkey FOREIGN KEY (authorized_by) REFERENCES public.profiles(id);


--
-- Name: concha_transactions concha_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concha_transactions
    ADD CONSTRAINT concha_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: constitutional_amendments constitutional_amendments_constitutional_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_amendments
    ADD CONSTRAINT constitutional_amendments_constitutional_block_id_fkey FOREIGN KEY (constitutional_block_id) REFERENCES public.constitutional_blocks(block_number);


--
-- Name: constitutional_amendments constitutional_amendments_proposed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_amendments
    ADD CONSTRAINT constitutional_amendments_proposed_by_fkey FOREIGN KEY (proposed_by) REFERENCES auth.users(id);


--
-- Name: constitutional_validation_logs constitutional_validation_logs_decision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constitutional_validation_logs
    ADD CONSTRAINT constitutional_validation_logs_decision_id_fkey FOREIGN KEY (decision_id) REFERENCES public.governance_decisions(id);


--
-- Name: developer_code_issues developer_code_issues_source_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.developer_code_issues
    ADD CONSTRAINT developer_code_issues_source_audit_id_fkey FOREIGN KEY (source_audit_id) REFERENCES public.developer_source_audit(id) ON DELETE CASCADE;


--
-- Name: dissolution_state dissolution_state_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dissolution_state
    ADD CONSTRAINT dissolution_state_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES auth.users(id);


--
-- Name: employee_permissions employee_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_permissions
    ADD CONSTRAINT employee_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: feed_comments feed_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_comments
    ADD CONSTRAINT feed_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.feed_comments(id) ON DELETE CASCADE;


--
-- Name: feed_comments feed_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_comments
    ADD CONSTRAINT feed_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feed_posts(id) ON DELETE CASCADE;


--
-- Name: feed_likes feed_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_likes
    ADD CONSTRAINT feed_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feed_posts(id) ON DELETE CASCADE;


--
-- Name: governance_switches governance_switches_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.governance_switches
    ADD CONSTRAINT governance_switches_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: hacker_intelligence_logs hacker_intelligence_logs_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hacker_intelligence_logs
    ADD CONSTRAINT hacker_intelligence_logs_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES auth.users(id);


--
-- Name: human_work_queue human_work_queue_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.human_work_queue
    ADD CONSTRAINT human_work_queue_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: ip_blacklist ip_blacklist_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_blacklist
    ADD CONSTRAINT ip_blacklist_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES auth.users(id);


--
-- Name: ledger_events ledger_events_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_events
    ADD CONSTRAINT ledger_events_tx_id_fkey FOREIGN KEY (tx_id) REFERENCES public.protocol_state(tx_id) ON DELETE RESTRICT;


--
-- Name: ledger ledger_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: monetization_phases monetization_phases_activated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monetization_phases
    ADD CONSTRAINT monetization_phases_activated_by_fkey FOREIGN KEY (activated_by) REFERENCES auth.users(id);


--
-- Name: notifications notifications_related_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_order_id_fkey FOREIGN KEY (related_order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: operation_dictionary operation_dictionary_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_dictionary
    ADD CONSTRAINT operation_dictionary_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: orch_dependencies orch_dependencies_source_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orch_dependencies
    ADD CONSTRAINT orch_dependencies_source_asset_id_fkey FOREIGN KEY (source_asset_id) REFERENCES public.orch_versions(id) ON DELETE CASCADE;


--
-- Name: orch_versions orch_versions_promoted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orch_versions
    ADD CONSTRAINT orch_versions_promoted_by_fkey FOREIGN KEY (promoted_by) REFERENCES auth.users(id);


--
-- Name: orch_versions orch_versions_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orch_versions
    ADD CONSTRAINT orch_versions_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES auth.users(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: praieiro_chats praieiro_chats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.praieiro_chats
    ADD CONSTRAINT praieiro_chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: products products_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.vendor_shops(id) ON DELETE CASCADE;


--
-- Name: protocol_parameters protocol_parameters_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.protocol_parameters
    ADD CONSTRAINT protocol_parameters_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: protocol_state protocol_state_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.protocol_state
    ADD CONSTRAINT protocol_state_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: registration_milestones registration_milestones_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_milestones
    ADD CONSTRAINT registration_milestones_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: registration_milestones registration_milestones_phase_to_activate_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_milestones
    ADD CONSTRAINT registration_milestones_phase_to_activate_fkey FOREIGN KEY (phase_to_activate) REFERENCES public.monetization_phases(phase_number);


--
-- Name: responsibility_chain responsibility_chain_failure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibility_chain
    ADD CONSTRAINT responsibility_chain_failure_id_fkey FOREIGN KEY (failure_id) REFERENCES public.systemic_failures(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: safe_mode_state safe_mode_state_activated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safe_mode_state
    ADD CONSTRAINT safe_mode_state_activated_by_fkey FOREIGN KEY (activated_by) REFERENCES auth.users(id);


--
-- Name: search_intents search_intents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_intents
    ADD CONSTRAINT search_intents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: security_logs security_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: social_posts social_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.social_profiles(id) ON DELETE CASCADE;


--
-- Name: social_profiles social_profiles_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT social_profiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: source_code_snapshots source_code_snapshots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_code_snapshots
    ADD CONSTRAINT source_code_snapshots_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: sovereign_vitality sovereign_vitality_founder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sovereign_vitality
    ADD CONSTRAINT sovereign_vitality_founder_id_fkey FOREIGN KEY (founder_id) REFERENCES auth.users(id);


--
-- Name: sys_change_history sys_change_history_orch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_change_history
    ADD CONSTRAINT sys_change_history_orch_id_fkey FOREIGN KEY (orch_id) REFERENCES public.orch_versions(id) ON DELETE CASCADE;


--
-- Name: sys_orch_logs sys_orch_logs_orch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_orch_logs
    ADD CONSTRAINT sys_orch_logs_orch_id_fkey FOREIGN KEY (orch_id) REFERENCES public.orch_versions(id) ON DELETE SET NULL;


--
-- Name: system_health_logs system_health_logs_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_health_logs
    ADD CONSTRAINT system_health_logs_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_daily_access user_daily_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_access
    ADD CONSTRAINT user_daily_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_data_exports user_data_exports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_data_exports
    ADD CONSTRAINT user_data_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_types user_types_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_types
    ADD CONSTRAINT user_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vendor_beach_link vendor_beach_link_beach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_beach_link
    ADD CONSTRAINT vendor_beach_link_beach_id_fkey FOREIGN KEY (beach_id) REFERENCES public.beaches(id) ON DELETE CASCADE;


--
-- Name: vendor_shops vendor_shops_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_shops
    ADD CONSTRAINT vendor_shops_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: vendor_transactions vendor_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_transactions
    ADD CONSTRAINT vendor_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: vendors vendors_exposure_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_exposure_plan_id_fkey FOREIGN KEY (exposure_plan_id) REFERENCES public.exposure_plans(id);


--
-- Name: vendors vendors_new_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_new_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: verified_humans verified_humans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verified_humans
    ADD CONSTRAINT verified_humans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transfers wallet_transfers_recipient_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transfers
    ADD CONSTRAINT wallet_transfers_recipient_profile_id_fkey FOREIGN KEY (recipient_profile_id) REFERENCES public.profiles(id);


--
-- Name: wallet_transfers wallet_transfers_sender_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transfers
    ADD CONSTRAINT wallet_transfers_sender_profile_id_fkey FOREIGN KEY (sender_profile_id) REFERENCES public.profiles(id);


--
-- Name: wallets wallets_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: whatsapp_clicks whatsapp_clicks_beach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_clicks
    ADD CONSTRAINT whatsapp_clicks_beach_id_fkey FOREIGN KEY (beach_id) REFERENCES public.beaches(id) ON DELETE SET NULL;


--
-- Name: whatsapp_links whatsapp_links_pin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_links
    ADD CONSTRAINT whatsapp_links_pin_id_fkey FOREIGN KEY (pin_id) REFERENCES public.unified_pins(id);


--
-- Name: whatsapp_links whatsapp_links_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_links
    ADD CONSTRAINT whatsapp_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: youtube_channels youtube_channels_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_channels
    ADD CONSTRAINT youtube_channels_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: youtube_channels youtube_channels_social_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_channels
    ADD CONSTRAINT youtube_channels_social_profile_id_fkey FOREIGN KEY (social_profile_id) REFERENCES public.social_profiles(id) ON DELETE SET NULL;


--
-- Name: youtube_sync_log youtube_sync_log_beach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_sync_log
    ADD CONSTRAINT youtube_sync_log_beach_id_fkey FOREIGN KEY (beach_id) REFERENCES public.beaches(id);


--
-- Name: youtube_videos youtube_videos_beach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_videos
    ADD CONSTRAINT youtube_videos_beach_id_fkey FOREIGN KEY (beach_id) REFERENCES public.beaches(id) ON DELETE SET NULL;


--
-- Name: youtube_videos youtube_videos_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_videos
    ADD CONSTRAINT youtube_videos_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_providers AI providers são visíveis para todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "AI providers são visíveis para todos" ON public.ai_providers FOR SELECT USING (true);


--
-- Name: developer_source_audit Admin can insert source audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert source audit" ON public.developer_source_audit FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: developer_code_issues Admin can manage code issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage code issues" ON public.developer_code_issues USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: ai_provider_health Admin can read ai_provider_health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read ai_provider_health" ON public.ai_provider_health FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: developer_source_audit Admin can update source audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update source audit" ON public.developer_source_audit FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: developer_code_issues Admin can view code issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view code issues" ON public.developer_code_issues FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: developer_source_audit Admin can view source audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view source audit" ON public.developer_source_audit FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_allowed_emails Admins can insert allowed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert allowed emails" ON public.admin_allowed_emails FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: praieiro_chats Admins can insert as praieiro; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert as praieiro" ON public.praieiro_chats FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: beaches Admins can insert beaches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert beaches" ON public.beaches FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sys_change_history Admins can insert sys_change_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert sys_change_history" ON public.sys_change_history FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sys_orch_logs Admins can insert sys_orch_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert sys_orch_logs" ON public.sys_orch_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_ai_verdicts Admins can insert verdicts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert verdicts" ON public.admin_ai_verdicts FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: admin_accounts Admins can manage accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage accounts" ON public.admin_accounts USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: ad_catalogs Admins can manage ad catalogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage ad catalogs" ON public.ad_catalogs USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));


--
-- Name: ai_council_agents Admins can manage ai_council_agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage ai_council_agents" ON public.ai_council_agents USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: ai_external_tasks Admins can manage ai_external_tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage ai_external_tasks" ON public.ai_external_tasks USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: ai_metrics Admins can manage ai_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage ai_metrics" ON public.ai_metrics USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: admin_alerts Admins can manage alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage alerts" ON public.admin_alerts USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: client_transactions Admins can manage all client transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all client transactions" ON public.client_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chatbot_interactions Admins can manage all interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all interactions" ON public.chatbot_interactions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: messages Admins can manage all messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all messages" ON public.messages TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: order_items Admins can manage all order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all order items" ON public.order_items USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins can manage all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all orders" ON public.orders TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vendor_transactions Admins can manage all vendor transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all vendor transactions" ON public.vendor_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vendors Admins can manage all vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all vendors" ON public.vendors USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vendor_wallets Admins can manage all wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all wallets" ON public.vendor_wallets USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: wallets Admins can manage all wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all wallets" ON public.wallets USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: admin_allowed_emails Admins can manage allowed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage allowed emails" ON public.admin_allowed_emails TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ip_blacklist Admins can manage blacklist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage blacklist" ON public.ip_blacklist USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_council_code_issues Admins can manage code_issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage code_issues" ON public.ai_council_code_issues USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: concha_transactions Admins can manage concha transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage concha transactions" ON public.concha_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: editable_content Admins can manage content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage content" ON public.editable_content USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_council_decisions Admins can manage decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage decisions" ON public.ai_council_decisions USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: orch_dependencies Admins can manage dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage dependencies" ON public.orch_dependencies USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: operation_dictionary Admins can manage dictionary; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage dictionary" ON public.operation_dictionary USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: employee_permissions Admins can manage employee permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage employee permissions" ON public.employee_permissions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: engineering_logs Admins can manage engineering logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage engineering logs" ON public.engineering_logs USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));


--
-- Name: admin_goals Admins can manage goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage goals" ON public.admin_goals USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: system_governance Admins can manage governance via roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage governance via roles" ON public.system_governance USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: governance_switches Admins can manage governance_switches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage governance_switches" ON public.governance_switches USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: ai_council_growth_metrics Admins can manage growth_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage growth_metrics" ON public.ai_council_growth_metrics USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: satoshi_honeytokens Admins can manage honeytokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage honeytokens" ON public.satoshi_honeytokens USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: human_work_queue Admins can manage human_work_queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage human_work_queue" ON public.human_work_queue USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: ai_council_information_flows Admins can manage information_flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage information_flows" ON public.ai_council_information_flows USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: knowledge_base Admins can manage knowledge base; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage knowledge base" ON public.knowledge_base USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));


--
-- Name: ai_council_meeting_messages Admins can manage meeting_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage meeting_messages" ON public.ai_council_meeting_messages USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: ai_council_notification_activity Admins can manage notification_activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage notification_activity" ON public.ai_council_notification_activity USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: ai_council_admin_notifications Admins can manage notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage notifications" ON public.ai_council_admin_notifications USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: platform_wallet Admins can manage platform_wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage platform_wallet" ON public.platform_wallet USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: safe_mode_state Admins can manage safe mode; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage safe mode" ON public.safe_mode_state USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: satoshi_metrics Admins can manage satoshi metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage satoshi metrics" ON public.satoshi_metrics USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_council_sessions Admins can manage sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sessions" ON public.ai_council_sessions USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: shadow_audits Admins can manage shadow audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shadow audits" ON public.shadow_audits USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text)))));


--
-- Name: sovereign_vitality Admins can manage sovereign_vitality; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sovereign_vitality" ON public.sovereign_vitality USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: ai_council_suggestions Admins can manage suggestions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage suggestions" ON public.ai_council_suggestions USING ((EXISTS ( SELECT 1
   FROM public.admin_allowed_emails
  WHERE ((admin_allowed_emails.email = (auth.jwt() ->> 'email'::text)) AND (admin_allowed_emails.is_active = true)))));


--
-- Name: sys_ai_guidance Admins can manage sys_ai_guidance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sys_ai_guidance" ON public.sys_ai_guidance TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sys_critical_alerts Admins can manage sys_critical_alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sys_critical_alerts" ON public.sys_critical_alerts TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sys_health_metrics Admins can manage sys_health_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sys_health_metrics" ON public.sys_health_metrics TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: threat_summary_daily Admins can manage threat summary; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage threat summary" ON public.threat_summary_daily USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orch_versions Admins can manage versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage versions" ON public.orch_versions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chat_webhook_events Admins can manage webhook events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage webhook events" ON public.chat_webhook_events USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: whatsapp_clicks Admins can read all clicks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all clicks" ON public.whatsapp_clicks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_product_interests Admins can read all interests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all interests" ON public.client_product_interests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: attack_pattern_alerts Admins can read attack pattern alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read attack pattern alerts" ON public.attack_pattern_alerts FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: constitutional_state Admins can read constitutional state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read constitutional state" ON public.constitutional_state FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: governance_decisions Admins can read governance decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read governance decisions" ON public.governance_decisions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: board_governance_reports Admins can read governance reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read governance reports" ON public.board_governance_reports FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: price_drift_history Admins can read price drift; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read price drift" ON public.price_drift_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: constitutional_validation_logs Admins can read validation logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read validation logs" ON public.constitutional_validation_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: hacker_intelligence_logs Admins can select hacker logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can select hacker logs" ON public.hacker_intelligence_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_provider_health Admins can update ai_provider_health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update ai_provider_health" ON public.ai_provider_health FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: admin_allowed_emails Admins can update allowed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update allowed emails" ON public.admin_allowed_emails FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: attack_pattern_alerts Admins can update attack pattern alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update attack pattern alerts" ON public.attack_pattern_alerts FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: banned_ips Admins can update banned IPs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update banned IPs" ON public.banned_ips FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: beaches Admins can update beaches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update beaches" ON public.beaches FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_config Admins can update config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update config" ON public.admin_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: constitutional_state Admins can update constitutional state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update constitutional state" ON public.constitutional_state FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: governance_decisions Admins can update governance decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update governance decisions" ON public.governance_decisions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: board_governance_reports Admins can update governance reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update governance reports" ON public.board_governance_reports FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: hacker_intelligence_logs Admins can update hacker logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update hacker logs" ON public.hacker_intelligence_logs FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_cognitive_health Admins can view ai_cognitive_health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view ai_cognitive_health" ON public.ai_cognitive_health FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: ai_provider_health Admins can view ai_provider_health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view ai_provider_health" ON public.ai_provider_health FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: praieiro_chats Admins can view all chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all chats" ON public.praieiro_chats FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: client_transactions Admins can view all client transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all client transactions" ON public.client_transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: clients Admins can view all clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: site_evaluations Admins can view all evaluations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all evaluations" ON public.site_evaluations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: account_identifiers Admins can view all identifiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all identifiers" ON public.account_identifiers FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: wallet_transfers Admins can view all transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all transfers" ON public.wallet_transfers FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vendor_transactions Admins can view all vendor transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all vendor transactions" ON public.vendor_transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_ai_verdicts Admins can view all verdicts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all verdicts" ON public.admin_ai_verdicts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: vendor_wallets Admins can view all wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all wallets" ON public.vendor_wallets FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chat_analytics Admins can view analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view analytics" ON public.chat_analytics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: banned_ips Admins can view banned IPs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view banned IPs" ON public.banned_ips FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: admin_config Admins can view config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view config" ON public.admin_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_council_events Admins can view council events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view council events" ON public.ai_council_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: system_cycle_metrics Admins can view cycle metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view cycle metrics" ON public.system_cycle_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: operation_dictionary Admins can view dictionary; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view dictionary" ON public.operation_dictionary FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: system_health_logs Admins can view health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view health logs" ON public.system_health_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: security_logs Admins can view security logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view security logs" ON public.security_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sovereign_metrics Admins can view sovereign_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view sovereign_metrics" ON public.sovereign_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: sys_ai_guidance Admins can view sys_ai_guidance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view sys_ai_guidance" ON public.sys_ai_guidance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sys_change_history Admins can view sys_change_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view sys_change_history" ON public.sys_change_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sys_critical_alerts Admins can view sys_critical_alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view sys_critical_alerts" ON public.sys_critical_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sys_health_metrics Admins can view sys_health_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view sys_health_metrics" ON public.sys_health_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sys_orch_logs Admins can view sys_orch_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view sys_orch_logs" ON public.sys_orch_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: constitutional_amendments Admins manage amendments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage amendments" ON public.constitutional_amendments FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: civic_arbitrators Admins manage arbitrators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage arbitrators" ON public.civic_arbitrators USING (public.is_admin(auth.uid()));


--
-- Name: arbitration_cases Admins manage cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage cases" ON public.arbitration_cases FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: critical_states Admins manage critical states; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage critical states" ON public.critical_states USING (public.is_admin(auth.uid()));


--
-- Name: concha_emissions Admins manage emissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage emissions" ON public.concha_emissions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ethical_economy_rules Admins manage ethical rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage ethical rules" ON public.ethical_economy_rules USING (public.is_admin(auth.uid()));


--
-- Name: systemic_failures Admins manage failures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage failures" ON public.systemic_failures USING (public.is_admin(auth.uid()));


--
-- Name: responsibility_chain Admins manage responsibility; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage responsibility" ON public.responsibility_chain USING (public.is_admin(auth.uid()));


--
-- Name: system_vaults Admins manage vaults; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage vaults" ON public.system_vaults USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: verified_humans Admins manage verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage verifications" ON public.verified_humans USING (public.is_admin(auth.uid()));


--
-- Name: ai_council_diagnostics Admins podem atualizar diagnósticos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar diagnósticos" ON public.ai_council_diagnostics FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: reviews Admins podem gerenciar reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem gerenciar reviews" ON public.reviews USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: youtube_videos Admins podem gerenciar vídeos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem gerenciar vídeos" ON public.youtube_videos USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: ai_council_diagnostics Admins podem ver diagnósticos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver diagnósticos" ON public.ai_council_diagnostics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: notifications Admins podem ver todas notificações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todas notificações" ON public.notifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ledger Admins read all ledger entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all ledger entries" ON public.ledger FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: stress_test_results Allow all stress_test_results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all stress_test_results" ON public.stress_test_results USING (true);


--
-- Name: telemetry_events Allow insert telemetry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert telemetry" ON public.telemetry_events FOR INSERT WITH CHECK (true);


--
-- Name: telemetry_events Allow select telemetry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select telemetry" ON public.telemetry_events FOR SELECT USING (true);


--
-- Name: cache_store Anyone can read cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read cache" ON public.cache_store FOR SELECT USING (true);


--
-- Name: whatsapp_clicks Anyone can track clicks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can track clicks" ON public.whatsapp_clicks FOR INSERT WITH CHECK ((vendor_id IS NOT NULL));


--
-- Name: client_product_interests Anyone can track interests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can track interests" ON public.client_product_interests FOR INSERT WITH CHECK (((product_category IS NOT NULL) AND ((product_category)::text <> ''::text)));


--
-- Name: ad_catalogs Anyone can view active ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active ads" ON public.ad_catalogs FOR SELECT USING ((is_active = true));


--
-- Name: chat_contexts Anyone can view active contexts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active contexts" ON public.chat_contexts FOR SELECT USING ((is_active = true));


--
-- Name: music_genres Anyone can view active genres; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active genres" ON public.music_genres FOR SELECT USING ((is_active = true));


--
-- Name: feed_posts Anyone can view active posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active posts" ON public.feed_posts FOR SELECT USING (((expires_at IS NULL) OR (expires_at > now())));


--
-- Name: social_profiles Anyone can view active social profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active social profiles" ON public.social_profiles FOR SELECT USING ((is_active = true));


--
-- Name: chat_suggestions Anyone can view active suggestions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active suggestions" ON public.chat_suggestions FOR SELECT USING ((is_active = true));


--
-- Name: knowledge_base Anyone can view approved solutions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved solutions" ON public.knowledge_base FOR SELECT USING ((status = 'approved'::text));


--
-- Name: products Anyone can view available products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view available products" ON public.products FOR SELECT USING ((is_available = true));


--
-- Name: cached_news Anyone can view cached news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view cached news" ON public.cached_news FOR SELECT USING (((expires_at IS NULL) OR (expires_at > now())));


--
-- Name: comment_likes Anyone can view comment likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view comment likes" ON public.comment_likes FOR SELECT USING (true);


--
-- Name: feed_comments Anyone can view comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view comments" ON public.feed_comments FOR SELECT USING (true);


--
-- Name: editable_content Anyone can view content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view content" ON public.editable_content FOR SELECT USING (true);


--
-- Name: orch_dependencies Anyone can view dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view dependencies" ON public.orch_dependencies FOR SELECT USING (true);


--
-- Name: exposure_plans Anyone can view exposure plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view exposure plans" ON public.exposure_plans FOR SELECT USING (true);


--
-- Name: system_governance Anyone can view governance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view governance" ON public.system_governance FOR SELECT USING (true);


--
-- Name: feed_likes Anyone can view likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view likes" ON public.feed_likes FOR SELECT USING (true);


--
-- Name: registration_milestones Anyone can view milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view milestones" ON public.registration_milestones FOR SELECT USING (true);


--
-- Name: monetization_phases Anyone can view monetization phases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view monetization phases" ON public.monetization_phases FOR SELECT USING (true);


--
-- Name: feed_posts Anyone can view non-expired posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view non-expired posts" ON public.feed_posts FOR SELECT USING (((expires_at > now()) OR (expires_at IS NULL)));


--
-- Name: orch_versions Anyone can view production versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view production versions" ON public.orch_versions FOR SELECT USING ((is_production = true));


--
-- Name: social_posts Anyone can view public posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view public posts" ON public.social_posts FOR SELECT USING (((visibility = 'public'::text) AND ((expires_at IS NULL) OR (expires_at > now()))));


--
-- Name: safe_mode_state Anyone can view safe mode; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view safe mode" ON public.safe_mode_state FOR SELECT USING (true);


--
-- Name: satoshi_metrics Anyone can view satoshi metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view satoshi metrics" ON public.satoshi_metrics FOR SELECT USING (true);


--
-- Name: concha_emissions Anyone reads emissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads emissions" ON public.concha_emissions FOR SELECT USING (true);


--
-- Name: ai_capability_types Apenas admins podem gerenciar capabilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas admins podem gerenciar capabilities" ON public.ai_capability_types USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: ai_providers Apenas admins podem gerenciar provedores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas admins podem gerenciar provedores" ON public.ai_providers USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: youtube_sync_log Apenas admins veem logs de sync; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas admins veem logs de sync" ON public.youtube_sync_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND ('admin'::public.account_type = ANY (p.account_types))))));


--
-- Name: arbitration_panels Arbitrators vote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Arbitrators vote" ON public.arbitration_panels FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.civic_arbitrators
  WHERE ((civic_arbitrators.id = arbitration_panels.arbitrator_id) AND (civic_arbitrators.user_id = auth.uid())))));


--
-- Name: feed_comments Authenticated can comment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can comment" ON public.feed_comments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: feed_posts Authenticated can create posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can create posts" ON public.feed_posts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: feed_likes Authenticated can like; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can like" ON public.feed_likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: vendors Authenticated can view active vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view active vendors" ON public.vendors FOR SELECT USING ((((status)::text = 'active'::text) AND (auth.uid() IS NOT NULL)));


--
-- Name: ledger Authenticated insert ledger entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated insert ledger entries" ON public.ledger FOR INSERT WITH CHECK (((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: site_evaluations Authenticated users can create evaluations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create evaluations" ON public.site_evaluations FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: whatsapp_links Authenticated users can insert WhatsApp links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert WhatsApp links" ON public.whatsapp_links FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: location_history Authenticated users can insert location history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert location history" ON public.location_history FOR INSERT WITH CHECK (((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: search_intents Authenticated users can insert search intents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert search intents" ON public.search_intents FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: chat_youtube_webhook_events Authenticated users can insert webhook events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert webhook events" ON public.chat_youtube_webhook_events FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) OR (user_id IS NULL)));


--
-- Name: comment_likes Authenticated users can like comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can like comments" ON public.comment_likes FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: vendor_beach_link Beach links viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Beach links viewable by authenticated users" ON public.vendor_beach_link FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: beaches Beaches viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Beaches viewable by authenticated users" ON public.beaches FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: youtube_channels Canais são públicos para leitura; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Canais são públicos para leitura" ON public.youtube_channels FOR SELECT USING ((is_active = true));


--
-- Name: ai_capability_types Capability types são públicos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Capability types são públicos" ON public.ai_capability_types FOR SELECT USING (true);


--
-- Name: employee_permissions Employees can view own permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view own permissions" ON public.employee_permissions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: satoshi_events Escrita autenticada no ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Escrita autenticada no ledger" ON public.satoshi_events FOR INSERT WITH CHECK (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


--
-- Name: founder_public_record Founder insert record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founder insert record" ON public.founder_public_record FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: dissolution_state Founder manage dissolution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founder manage dissolution" ON public.dissolution_state USING (public.is_admin(auth.uid()));


--
-- Name: vendor_shops Inserir loja para o próprio vendedor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Inserir loja para o próprio vendedor" ON public.vendor_shops FOR INSERT WITH CHECK ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: satoshi_events Ledger público para leitura; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Ledger público para leitura" ON public.satoshi_events FOR SELECT USING (true);


--
-- Name: ai_provider_usage_logs Logs podem ser inseridos por funções autenticadas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Logs podem ser inseridos por funções autenticadas" ON public.ai_provider_usage_logs FOR INSERT WITH CHECK (true);


--
-- Name: ai_provider_usage_logs Logs são visíveis apenas para admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Logs são visíveis apenas para admins" ON public.ai_provider_usage_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: vendor_shops Lojas públicas visíveis para todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lojas públicas visíveis para todos" ON public.vendor_shops FOR SELECT USING ((status = 'active'::text));


--
-- Name: operating_hours Only admins can modify operating hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can modify operating hours" ON public.operating_hours USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: admin_allowed_emails Only admins can view allowed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view allowed emails" ON public.admin_allowed_emails FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: source_code_snapshots Only admins can view source code; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view source code" ON public.source_code_snapshots FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: feed_posts Only clients can create posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only clients can create posts" ON public.feed_posts FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND ((user_type)::text = 'client'::text) AND (EXISTS ( SELECT 1
   FROM (public.clients c
     JOIN public.profiles p ON ((p.id = c.profile_id)))
  WHERE (p.user_id = auth.uid())))));


--
-- Name: notifications Only triggers can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only triggers can insert notifications" ON public.notifications FOR INSERT WITH CHECK (false);


--
-- Name: operating_hours Operating hours are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operating hours are publicly readable" ON public.operating_hours FOR SELECT USING (true);


--
-- Name: arbitration_panels Panel view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Panel view" ON public.arbitration_panels FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.civic_arbitrators
  WHERE ((civic_arbitrators.id = arbitration_panels.arbitrator_id) AND (civic_arbitrators.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.arbitration_cases c
  WHERE ((c.id = arbitration_panels.case_id) AND ((c.plaintiff_id = auth.uid()) OR (c.defendant_id = auth.uid()))))) OR public.is_admin(auth.uid())));


--
-- Name: arbitration_cases Parties view cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Parties view cases" ON public.arbitration_cases FOR SELECT USING (((auth.uid() = plaintiff_id) OR (auth.uid() = defendant_id) OR public.is_admin(auth.uid())));


--
-- Name: ai_decision_log Public read AI decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read AI decisions" ON public.ai_decision_log FOR SELECT USING (true);


--
-- Name: constitutional_amendments Public read amendments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read amendments" ON public.constitutional_amendments FOR SELECT USING (true);


--
-- Name: civic_arbitrators Public read arbitrators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read arbitrators" ON public.civic_arbitrators FOR SELECT USING (true);


--
-- Name: immutable_axioms Public read axioms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read axioms" ON public.immutable_axioms FOR SELECT USING (true);


--
-- Name: constitutional_blocks Public read blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read blocks" ON public.constitutional_blocks FOR SELECT USING (true);


--
-- Name: critical_states Public read critical states; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read critical states" ON public.critical_states FOR SELECT USING (true);


--
-- Name: arbitration_decisions Public read decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read decisions" ON public.arbitration_decisions FOR SELECT USING (true);


--
-- Name: key_destruction_log Public read destruction; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read destruction" ON public.key_destruction_log FOR SELECT USING (true);


--
-- Name: dissolution_state Public read dissolution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read dissolution" ON public.dissolution_state FOR SELECT USING (true);


--
-- Name: ethical_economy_rules Public read ethical rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read ethical rules" ON public.ethical_economy_rules FOR SELECT USING (true);


--
-- Name: systemic_failures Public read failures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read failures" ON public.systemic_failures FOR SELECT USING (true);


--
-- Name: founder_public_record Public read founder record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read founder record" ON public.founder_public_record FOR SELECT USING (true);


--
-- Name: profit_compatibility_checks Public read profit checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read profit checks" ON public.profit_compatibility_checks FOR SELECT USING (true);


--
-- Name: responsibility_chain Public read responsibility; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read responsibility" ON public.responsibility_chain FOR SELECT USING (true);


--
-- Name: reviews Reviews are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reviews are viewable by authenticated users" ON public.reviews FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: hacker_intelligence_logs Service can insert hacker logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert hacker logs" ON public.hacker_intelligence_logs FOR INSERT WITH CHECK (true);


--
-- Name: satoshi_honeytokens Service can insert honeytokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert honeytokens" ON public.satoshi_honeytokens FOR INSERT WITH CHECK (true);


--
-- Name: ai_cognitive_health Service role ai_cognitive_health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role ai_cognitive_health" ON public.ai_cognitive_health USING ((auth.role() = 'service_role'::text));


--
-- Name: ai_external_tasks Service role ai_external_tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role ai_external_tasks" ON public.ai_external_tasks USING ((auth.role() = 'service_role'::text));


--
-- Name: ai_provider_health Service role ai_provider_health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role ai_provider_health" ON public.ai_provider_health USING ((auth.role() = 'service_role'::text));


--
-- Name: security_logs Service role can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert logs" ON public.security_logs FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: unified_pins Service role can insert unified pins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert unified pins" ON public.unified_pins FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: cached_news Service role can manage cached news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage cached news" ON public.cached_news USING (true) WITH CHECK (true);


--
-- Name: account_identifiers Service role can manage identifiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage identifiers" ON public.account_identifiers TO service_role USING (true) WITH CHECK (true);


--
-- Name: ai_provider_health Service role can update ai_provider_health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update ai_provider_health" ON public.ai_provider_health USING (true) WITH CHECK (true);


--
-- Name: ai_council_notification_activity Service role full access activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access activity" ON public.ai_council_notification_activity TO service_role USING (true) WITH CHECK (true);


--
-- Name: ai_council_agents Service role full access agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access agents" ON public.ai_council_agents TO service_role USING (true) WITH CHECK (true);


--
-- Name: developer_code_issues Service role full access code issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access code issues" ON public.developer_code_issues USING ((auth.role() = 'service_role'::text));


--
-- Name: ai_council_code_issues Service role full access code_issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access code_issues" ON public.ai_council_code_issues TO service_role USING (true) WITH CHECK (true);


--
-- Name: ai_council_decisions Service role full access decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access decisions" ON public.ai_council_decisions TO service_role USING (true) WITH CHECK (true);


--
-- Name: ai_council_information_flows Service role full access flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access flows" ON public.ai_council_information_flows TO service_role USING (true) WITH CHECK (true);


--
-- Name: ai_council_meeting_messages Service role full access messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access messages" ON public.ai_council_meeting_messages TO service_role USING (true) WITH CHECK (true);


--
-- Name: ai_council_growth_metrics Service role full access metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access metrics" ON public.ai_council_growth_metrics TO service_role USING (true) WITH CHECK (true);


--
-- Name: ai_council_admin_notifications Service role full access notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access notifications" ON public.ai_council_admin_notifications TO service_role USING (true) WITH CHECK (true);


--
-- Name: ai_council_sessions Service role full access sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access sessions" ON public.ai_council_sessions TO service_role USING (true) WITH CHECK (true);


--
-- Name: developer_source_audit Service role full access source audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access source audit" ON public.developer_source_audit USING ((auth.role() = 'service_role'::text));


--
-- Name: ai_council_suggestions Service role full access suggestions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access suggestions" ON public.ai_council_suggestions TO service_role USING (true) WITH CHECK (true);


--
-- Name: governance_switches Service role governance_switches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role governance_switches" ON public.governance_switches USING ((auth.role() = 'service_role'::text));


--
-- Name: cache_store Service role manages cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages cache" ON public.cache_store USING ((auth.uid() IS NOT NULL));


--
-- Name: rate_limits Service role manages rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages rate limits" ON public.rate_limits TO service_role USING (true) WITH CHECK (true);


--
-- Name: sovereign_metrics Service role sovereign_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role sovereign_metrics" ON public.sovereign_metrics USING ((auth.role() = 'service_role'::text));


--
-- Name: constitutional_signatories Signatários públicos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Signatários públicos" ON public.constitutional_signatories FOR SELECT USING (true);


--
-- Name: ai_council_diagnostics Sistema pode inserir diagnósticos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sistema pode inserir diagnósticos" ON public.ai_council_diagnostics FOR INSERT WITH CHECK (true);


--
-- Name: youtube_sync_log Sistema pode inserir logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sistema pode inserir logs" ON public.youtube_sync_log FOR INSERT WITH CHECK (true);


--
-- Name: sovereign_actions Soberanos podem ver ações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Soberanos podem ver ações" ON public.sovereign_actions USING (public.is_sovereign());


--
-- Name: system_blackbox Soberanos podem ver blackbox; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Soberanos podem ver blackbox" ON public.system_blackbox USING (public.is_sovereign());


--
-- Name: adam_notifications Soberanos podem ver notificações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Soberanos podem ver notificações" ON public.adam_notifications USING (public.is_sovereign());


--
-- Name: board_governance_reports System and admins can insert governance reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System and admins can insert governance reports" ON public.board_governance_reports FOR INSERT WITH CHECK (true);


--
-- Name: attack_pattern_alerts System can insert attack pattern alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert attack pattern alerts" ON public.attack_pattern_alerts FOR INSERT WITH CHECK (true);


--
-- Name: banned_ips System can insert banned IPs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert banned IPs" ON public.banned_ips FOR INSERT WITH CHECK (true);


--
-- Name: chat_media_interactions System can insert chat media interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert chat media interactions" ON public.chat_media_interactions FOR INSERT WITH CHECK (true);


--
-- Name: ai_council_events System can insert council events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert council events" ON public.ai_council_events FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: system_cycle_metrics System can insert cycle metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert cycle metrics" ON public.system_cycle_metrics FOR INSERT WITH CHECK (true);


--
-- Name: governance_decisions System can insert governance decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert governance decisions" ON public.governance_decisions FOR INSERT WITH CHECK (true);


--
-- Name: system_health_logs System can insert health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert health logs" ON public.system_health_logs FOR INSERT WITH CHECK (true);


--
-- Name: price_drift_history System can insert price drift; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert price drift" ON public.price_drift_history FOR INSERT WITH CHECK (true);


--
-- Name: constitutional_validation_logs System can insert validation logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert validation logs" ON public.constitutional_validation_logs FOR INSERT WITH CHECK (true);


--
-- Name: unified_pins System can update unified pins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update unified pins" ON public.unified_pins FOR UPDATE USING (true);


--
-- Name: user_data_exports System create exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System create exports" ON public.user_data_exports FOR INSERT WITH CHECK (true);


--
-- Name: ai_decision_log System insert AI decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System insert AI decisions" ON public.ai_decision_log FOR INSERT WITH CHECK (true);


--
-- Name: constitutional_blocks System insert blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System insert blocks" ON public.constitutional_blocks FOR INSERT WITH CHECK (true);


--
-- Name: arbitration_decisions System insert decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System insert decisions" ON public.arbitration_decisions FOR INSERT WITH CHECK (true);


--
-- Name: profit_compatibility_checks System insert profit checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System insert profit checks" ON public.profit_compatibility_checks FOR INSERT WITH CHECK (true);


--
-- Name: client_conchas Trigger can manage conchas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Trigger can manage conchas" ON public.client_conchas USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: unified_pins Unified pins are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Unified pins are publicly readable" ON public.unified_pins FOR SELECT USING (true);


--
-- Name: wallets Users can create own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own wallet" ON public.wallets FOR INSERT TO authenticated WITH CHECK ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: chat_sessions Users can create their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own sessions" ON public.chat_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_roles Users can create their own user role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own user role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (role = 'user'::public.app_role)));


--
-- Name: wallet_transfers Users can create transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create transfers" ON public.wallet_transfers FOR INSERT WITH CHECK ((sender_profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: feed_comments Users can delete own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own comments" ON public.feed_comments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: client_favorites Users can delete own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own favorites" ON public.client_favorites FOR DELETE USING ((client_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: feed_posts Users can delete own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own posts" ON public.feed_posts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: comment_likes Users can delete their own comment likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comment likes" ON public.comment_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: feed_posts Users can delete their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own posts" ON public.feed_posts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: chat_sessions Users can delete their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own sessions" ON public.chat_sessions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can insert messages in their sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages in their sessions" ON public.chat_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));


--
-- Name: clients Users can insert own client data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own client data" ON public.clients FOR INSERT WITH CHECK ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: client_favorites Users can insert own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own favorites" ON public.client_favorites FOR INSERT WITH CHECK ((client_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: chatbot_interactions Users can insert own interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own interactions" ON public.chatbot_interactions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: transactions Users can insert own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK ((user_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: vendors Users can insert own vendor data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own vendor data" ON public.vendors FOR INSERT WITH CHECK ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: user_roles Users can insert own vendor role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own vendor role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (role = 'vendor'::public.app_role)));


--
-- Name: user_daily_access Users can insert their own access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own access" ON public.user_daily_access FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: praieiro_chats Users can insert their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own messages" ON public.praieiro_chats FOR INSERT WITH CHECK ((message_type = 'user'::text));


--
-- Name: payments Users can insert their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own payments" ON public.payments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_types Users can insert their own type; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own type" ON public.user_types FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: social_posts Users can manage own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own posts" ON public.social_posts USING ((author_id IN ( SELECT sp.id
   FROM (public.social_profiles sp
     JOIN public.profiles p ON ((p.id = sp.profile_id)))
  WHERE (p.user_id = auth.uid()))));


--
-- Name: social_profiles Users can manage own social profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own social profile" ON public.social_profiles USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: user_roles Users can read own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: feed_likes Users can unlike; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unlike" ON public.feed_likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can update messages in their sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update messages in their sessions" ON public.chat_messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));


--
-- Name: whatsapp_links Users can update own WhatsApp links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own WhatsApp links" ON public.whatsapp_links FOR UPDATE TO authenticated USING (((user_id IS NULL) OR (user_id = auth.uid()))) WITH CHECK (((user_id IS NULL) OR (user_id = auth.uid())));


--
-- Name: clients Users can update own client data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own client data" ON public.clients FOR UPDATE USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: transactions Users can update own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING ((user_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: vendors Users can update own vendor data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own vendor data" ON public.vendors FOR UPDATE USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: wallets Users can update own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: user_daily_access Users can update their own access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own access" ON public.user_daily_access FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chat_media_interactions Users can update their own chat media interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own chat media interactions" ON public.chat_media_interactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chat_sessions Users can update their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own sessions" ON public.chat_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_types Users can update their own type; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own type" ON public.user_types FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chat_youtube_webhook_events Users can update their own webhook events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own webhook events" ON public.chat_youtube_webhook_events FOR UPDATE USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: chat_messages Users can view messages from their sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages from their sessions" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));


--
-- Name: whatsapp_links Users can view own WhatsApp links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own WhatsApp links" ON public.whatsapp_links FOR SELECT USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: clients Users can view own client data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own client data" ON public.clients FOR SELECT USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: concha_transactions Users can view own concha transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own concha transactions" ON public.concha_transactions FOR SELECT USING ((client_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: client_favorites Users can view own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own favorites" ON public.client_favorites FOR SELECT USING ((client_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: account_identifiers Users can view own identifier; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own identifier" ON public.account_identifiers FOR SELECT USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: chatbot_interactions Users can view own interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own interactions" ON public.chatbot_interactions FOR SELECT USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: location_history Users can view own location history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own location history" ON public.location_history FOR SELECT USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: search_intents Users can view own search intents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own search intents" ON public.search_intents FOR SELECT USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: transactions Users can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING ((user_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: wallet_transfers Users can view own transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transfers" ON public.wallet_transfers FOR SELECT USING (((sender_profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))) OR (recipient_profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));


--
-- Name: vendors Users can view own vendor data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own vendor data" ON public.vendors FOR SELECT USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: wallets Users can view own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: user_daily_access Users can view their own access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own access" ON public.user_daily_access FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_media_interactions Users can view their own chat media interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own chat media interactions" ON public.chat_media_interactions FOR SELECT USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: praieiro_chats Users can view their own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own chats" ON public.praieiro_chats FOR SELECT USING (((auth.uid() = user_id) OR (session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text))));


--
-- Name: payments Users can view their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: chat_sessions Users can view their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sessions" ON public.chat_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_types Users can view their own type; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own type" ON public.user_types FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_youtube_webhook_events Users can view their own webhook events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own webhook events" ON public.chat_youtube_webhook_events FOR SELECT USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: amendment_votes Users cast vote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users cast vote" ON public.amendment_votes FOR INSERT WITH CHECK ((voter_id = auth.uid()));


--
-- Name: ledger Users read own ledger entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own ledger entries" ON public.ledger FOR SELECT USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: arbitration_cases Users submit cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users submit cases" ON public.arbitration_cases FOR INSERT WITH CHECK ((auth.uid() = plaintiff_id));


--
-- Name: user_data_exports Users view own exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own exports" ON public.user_data_exports FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: verified_humans Users view own verification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own verification" ON public.verified_humans FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: amendment_votes Users view own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own votes" ON public.amendment_votes FOR SELECT USING ((voter_id = auth.uid()));


--
-- Name: notifications Usuários podem marcar como lida; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem marcar como lida" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Usuários podem ver próprias notificações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver próprias notificações" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: youtube_channels Usuários podem vincular próprio canal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem vincular próprio canal" ON public.youtube_channels FOR UPDATE USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: vendor_shops Vendedores podem atualizar sua loja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vendedores podem atualizar sua loja" ON public.vendor_shops FOR UPDATE USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: vendor_shops Vendedores podem ver sua própria loja; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vendedores podem ver sua própria loja" ON public.vendor_shops FOR SELECT USING ((profile_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: constitutional_amendments Verified propose amendments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Verified propose amendments" ON public.constitutional_amendments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.verified_humans
  WHERE ((verified_humans.user_id = auth.uid()) AND (verified_humans.verification_level = ANY (ARRAY['verified'::public.human_verification_level, 'sovereign'::public.human_verification_level]))))));


--
-- Name: youtube_videos Vídeos são públicos para leitura; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Vídeos são públicos para leitura" ON public.youtube_videos FOR SELECT USING ((is_active = true));


--
-- Name: account_identifiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_identifiers ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_catalogs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_catalogs ENABLE ROW LEVEL SECURITY;

--
-- Name: adam_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.adam_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_ai_verdicts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_ai_verdicts ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_allowed_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_allowed_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_capability_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_capability_types ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_cognitive_health; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_cognitive_health ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_admin_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_admin_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_code_issues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_code_issues ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_diagnostics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_diagnostics ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_events ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_growth_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_growth_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_information_flows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_information_flows ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_meeting_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_meeting_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_notification_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_notification_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_proposals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_council_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_decision_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_decision_log ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_external_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_external_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_council_proposals ai_proposals_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_proposals_insert ON public.ai_council_proposals FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: ai_council_proposals ai_proposals_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_proposals_select ON public.ai_council_proposals FOR SELECT TO authenticated USING (true);


--
-- Name: ai_provider_health; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_provider_health ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_provider_usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_provider_usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: amendment_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.amendment_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: arbitration_cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.arbitration_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: arbitration_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.arbitration_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: arbitration_panels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.arbitration_panels ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_registry; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_registry ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_registry asset_registry_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY asset_registry_insert ON public.asset_registry FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: asset_registry asset_registry_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY asset_registry_select ON public.asset_registry FOR SELECT TO authenticated USING (((owner_id = auth.uid()) OR (status = 'active'::text)));


--
-- Name: asset_registry asset_registry_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY asset_registry_update ON public.asset_registry FOR UPDATE TO authenticated USING (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));


--
-- Name: attack_pattern_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attack_pattern_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: banned_ips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

--
-- Name: beaches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.beaches ENABLE ROW LEVEL SECURITY;

--
-- Name: board_governance_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_governance_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: cache_store; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cache_store ENABLE ROW LEVEL SECURITY;

--
-- Name: cached_news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cached_news ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_contexts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_contexts ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_media_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_media_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_youtube_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_youtube_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: chatbot_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chatbot_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: civic_arbitrators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.civic_arbitrators ENABLE ROW LEVEL SECURITY;

--
-- Name: client_conchas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_conchas ENABLE ROW LEVEL SECURITY;

--
-- Name: client_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: client_product_interests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_product_interests ENABLE ROW LEVEL SECURITY;

--
-- Name: client_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: concha_emissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.concha_emissions ENABLE ROW LEVEL SECURITY;

--
-- Name: concha_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.concha_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: constitutional_amendments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.constitutional_amendments ENABLE ROW LEVEL SECURITY;

--
-- Name: constitutional_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.constitutional_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: constitutional_signatories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.constitutional_signatories ENABLE ROW LEVEL SECURITY;

--
-- Name: constitutional_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.constitutional_state ENABLE ROW LEVEL SECURITY;

--
-- Name: constitutional_validation_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.constitutional_validation_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: critical_states; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.critical_states ENABLE ROW LEVEL SECURITY;

--
-- Name: developer_code_issues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.developer_code_issues ENABLE ROW LEVEL SECURITY;

--
-- Name: developer_source_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.developer_source_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: dissolution_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dissolution_state ENABLE ROW LEVEL SECURITY;

--
-- Name: editable_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.editable_content ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: engineering_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.engineering_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ethical_economy_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ethical_economy_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: exposure_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exposure_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: feed_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: feed_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: feed_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: founder_public_record; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.founder_public_record ENABLE ROW LEVEL SECURITY;

--
-- Name: governance_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.governance_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: governance_switches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.governance_switches ENABLE ROW LEVEL SECURITY;

--
-- Name: hacker_intelligence_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hacker_intelligence_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: human_work_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.human_work_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: immutable_axioms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.immutable_axioms ENABLE ROW LEVEL SECURITY;

--
-- Name: integrity_validations integrity_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY integrity_insert ON public.integrity_validations FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: integrity_validations integrity_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY integrity_select ON public.integrity_validations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: integrity_validations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integrity_validations ENABLE ROW LEVEL SECURITY;

--
-- Name: ip_blacklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ip_blacklist ENABLE ROW LEVEL SECURITY;

--
-- Name: key_destruction_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.key_destruction_log ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_base; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ledger_events ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_events ledger_events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ledger_events_select ON public.ledger_events FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))) OR (actor_id = auth.uid())));


--
-- Name: location_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: monetization_phases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monetization_phases ENABLE ROW LEVEL SECURITY;

--
-- Name: music_genres; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.music_genres ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: operating_hours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operating_hours ENABLE ROW LEVEL SECURITY;

--
-- Name: operation_dictionary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operation_dictionary ENABLE ROW LEVEL SECURITY;

--
-- Name: orch_dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orch_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: orch_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orch_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_wallet; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_wallet ENABLE ROW LEVEL SECURITY;

--
-- Name: praieiro_chats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.praieiro_chats ENABLE ROW LEVEL SECURITY;

--
-- Name: price_drift_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_drift_history ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profit_compatibility_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profit_compatibility_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: protocol_parameters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.protocol_parameters ENABLE ROW LEVEL SECURITY;

--
-- Name: protocol_parameters protocol_params_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY protocol_params_select ON public.protocol_parameters FOR SELECT TO authenticated USING (true);


--
-- Name: protocol_parameters protocol_params_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY protocol_params_update ON public.protocol_parameters FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: protocol_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.protocol_state ENABLE ROW LEVEL SECURITY;

--
-- Name: protocol_state protocol_state_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY protocol_state_insert ON public.protocol_state FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: protocol_state protocol_state_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY protocol_state_select ON public.protocol_state FOR SELECT TO authenticated USING (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));


--
-- Name: rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: registration_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.registration_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: responsibility_chain; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.responsibility_chain ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: safe_mode_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.safe_mode_state ENABLE ROW LEVEL SECURITY;

--
-- Name: satoshi_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.satoshi_events ENABLE ROW LEVEL SECURITY;

--
-- Name: satoshi_honeytokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.satoshi_honeytokens ENABLE ROW LEVEL SECURITY;

--
-- Name: satoshi_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.satoshi_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: search_intents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.search_intents ENABLE ROW LEVEL SECURITY;

--
-- Name: security_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: shadow_audits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shadow_audits ENABLE ROW LEVEL SECURITY;

--
-- Name: site_evaluations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_evaluations ENABLE ROW LEVEL SECURITY;

--
-- Name: social_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: social_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: source_code_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.source_code_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: sovereign_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sovereign_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: sovereign_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sovereign_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: sovereign_vitality; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sovereign_vitality ENABLE ROW LEVEL SECURITY;

--
-- Name: stress_test_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stress_test_results ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_ai_guidance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_ai_guidance ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_change_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_change_history ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_critical_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_critical_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_health_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_health_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: sys_orch_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sys_orch_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_blackbox; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_blackbox ENABLE ROW LEVEL SECURITY;

--
-- Name: system_cycle_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_cycle_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: system_governance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_governance ENABLE ROW LEVEL SECURITY;

--
-- Name: system_health_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_vaults; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_vaults ENABLE ROW LEVEL SECURITY;

--
-- Name: systemic_failures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.systemic_failures ENABLE ROW LEVEL SECURITY;

--
-- Name: telemetry_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

--
-- Name: threat_summary_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.threat_summary_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: unified_pins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unified_pins ENABLE ROW LEVEL SECURITY;

--
-- Name: user_daily_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_daily_access ENABLE ROW LEVEL SECURITY;

--
-- Name: user_data_exports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_data_exports ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_types ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_beach_link; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_beach_link ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_shops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_shops ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: verified_humans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verified_humans ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_clicks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_links ENABLE ROW LEVEL SECURITY;

--
-- Name: youtube_channels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: youtube_sync_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.youtube_sync_log ENABLE ROW LEVEL SECURITY;

--
-- Name: youtube_videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;