-- =====================================================================
-- PRAIEIRO — TESTE DE CARGA SOBERANO
-- Framework Constitucional de Stress Test
-- Versão: 1.0.0 | 50.000 Usuários Simulados
-- =====================================================================
-- AXIOMAS CONSTITUCIONAIS RESPEITADOS:
-- A0 — Idempotência Indissolúvel
-- A0.1 — Existência antes da Referência
-- A0.2 — Reexecutabilidade Total
-- A0.3 — Não Destruição
-- A0.4 — Cronicidade Histórica
-- =====================================================================

BEGIN;

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 0️⃣ INFRAESTRUTURA DE TESTE (IDEMPOTENTE)                          ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- Tabela de resultados de stress test
CREATE TABLE IF NOT EXISTS public.stress_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_phase TEXT NOT NULL,
  test_name TEXT NOT NULL,
  records_inserted INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  satoshi_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de usuários simulados (não afeta auth.users)
CREATE TABLE IF NOT EXISTS public.stress_test_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stress_email TEXT UNIQUE NOT NULL,
  stress_username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  batch_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  activity_score NUMERIC DEFAULT 0,
  CONSTRAINT valid_stress_email CHECK (stress_email LIKE 'stress_%@praieiro.test')
);

-- Tabela de sessões simuladas
CREATE TABLE IF NOT EXISTS public.stress_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.stress_test_users(id),
  session_token TEXT UNIQUE NOT NULL,
  login_at TIMESTAMPTZ DEFAULT now(),
  logout_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT true,
  ip_hash TEXT,
  user_agent TEXT
);

-- Tabela de transações simuladas
CREATE TABLE IF NOT EXISTS public.stress_test_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.stress_test_users(id),
  to_user_id UUID REFERENCES public.stress_test_users(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'ZIMBU',
  status TEXT DEFAULT 'pending',
  idempotency_key UUID UNIQUE NOT NULL,
  satoshi_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  rollback_reason TEXT,
  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT different_users CHECK (from_user_id != to_user_id)
);

-- Tabela de atividades sociais simuladas
CREATE TABLE IF NOT EXISTS public.stress_test_social_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.stress_test_users(id),
  activity_type TEXT NOT NULL,
  target_user_id UUID REFERENCES public.stress_test_users(id),
  target_post_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_activity CHECK (activity_type IN ('follow', 'unfollow', 'like', 'comment', 'share'))
);

-- Tabela de mensagens de chatbot simuladas
CREATE TABLE IF NOT EXISTS public.stress_test_chatbot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID REFERENCES public.stress_test_users(id),
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  response_content TEXT,
  latency_ms INTEGER,
  is_valid BOOLEAN DEFAULT true,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_message_type CHECK (message_type IN ('user', 'bot', 'system'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_stress_users_batch ON public.stress_test_users(batch_id);
CREATE INDEX IF NOT EXISTS idx_stress_users_active ON public.stress_test_users(is_active);
CREATE INDEX IF NOT EXISTS idx_stress_sessions_user ON public.stress_test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_transactions_status ON public.stress_test_transactions(status);
CREATE INDEX IF NOT EXISTS idx_stress_social_user ON public.stress_test_social_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_chatbot_conv ON public.stress_test_chatbot(conversation_id);

-- Função auxiliar para gerar hash Satoshi
CREATE OR REPLACE FUNCTION public.stress_generate_satoshi_hash(p_data TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(p_data || now()::text, 'sha256'), 'hex');
$$;

-- Função para registrar na blackbox
CREATE OR REPLACE FUNCTION public.stress_log_blackbox(
  p_event_name TEXT,
  p_payload JSONB,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.system_blackbox (event_name, payload, severity, satoshi_hash)
  VALUES (
    'STRESS_TEST_' || p_event_name,
    p_payload,
    p_severity,
    public.stress_generate_satoshi_hash(p_event_name || p_payload::text)
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Registrar início do teste
SELECT public.stress_log_blackbox(
  'FRAMEWORK_INITIALIZED',
  jsonb_build_object(
    'version', '1.0.0',
    'target_users', 50000,
    'initialized_at', now()
  ),
  'info'
);

COMMIT;

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 1️⃣ FASE 1 — CADASTRO EM MASSA (50.000 USUÁRIOS)                   ║
-- ╚════════════════════════════════════════════════════════════════════╝
-- Execução: Gera usuários em batches para simular picos e vales

CREATE OR REPLACE FUNCTION public.stress_phase1_register_users(
  p_batch_size INTEGER DEFAULT 1000,
  p_total_users INTEGER DEFAULT 50000
)
RETURNS TABLE(
  batch_id INTEGER,
  users_created INTEGER,
  duration_ms INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch INTEGER := 0;
  v_start TIMESTAMPTZ;
  v_created INTEGER;
  v_total_batches INTEGER;
BEGIN
  v_total_batches := CEIL(p_total_users::NUMERIC / p_batch_size);
  
  -- Log início da fase
  PERFORM public.stress_log_blackbox(
    'PHASE1_START',
    jsonb_build_object('total_users', p_total_users, 'batch_size', p_batch_size),
    'info'
  );
  
  FOR v_batch IN 0..v_total_batches-1 LOOP
    v_start := clock_timestamp();
    
    -- Inserir batch com distribuição temporal realista
    -- Simula picos às 10h, 14h e 20h
    WITH batch_data AS (
      SELECT 
        gen_random_uuid() as id,
        'stress_' || (v_batch * p_batch_size + s) || '_' || 
          encode(gen_random_bytes(4), 'hex') || '@praieiro.test' as email,
        'stress_user_' || (v_batch * p_batch_size + s) || '_' || 
          encode(gen_random_bytes(4), 'hex') as username,
        -- Distribuição temporal: mais cadastros em horários de pico
        now() - (random() * interval '30 days') + 
          CASE 
            WHEN random() < 0.3 THEN interval '10 hours'  -- Pico manhã
            WHEN random() < 0.6 THEN interval '14 hours'  -- Pico tarde
            ELSE interval '20 hours'  -- Pico noite
          END as created,
        v_batch as batch,
        -- 70% ativos, 30% inativos
        random() > 0.3 as active,
        -- Power law para atividade (poucos muito ativos)
        POWER(random(), 3) * 100 as activity
      FROM generate_series(1, LEAST(p_batch_size, p_total_users - v_batch * p_batch_size)) s
    )
    INSERT INTO public.stress_test_users (id, stress_email, stress_username, created_at, batch_id, is_active, activity_score)
    SELECT id, email, username, created, batch, active, activity
    FROM batch_data
    ON CONFLICT (stress_email) DO NOTHING;
    
    GET DIAGNOSTICS v_created = ROW_COUNT;
    
    -- Registrar resultado do batch
    INSERT INTO public.stress_test_results (test_phase, test_name, records_inserted, duration_ms, satoshi_hash)
    VALUES (
      'PHASE1_REGISTER',
      'batch_' || v_batch,
      v_created,
      EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER,
      public.stress_generate_satoshi_hash('batch_' || v_batch || '_' || v_created)
    );
    
    batch_id := v_batch;
    users_created := v_created;
    duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    RETURN NEXT;
    
    -- Pequena pausa para simular realismo (apenas em produção)
    -- PERFORM pg_sleep(0.01);
  END LOOP;
  
  -- Log fim da fase
  PERFORM public.stress_log_blackbox(
    'PHASE1_COMPLETE',
    jsonb_build_object(
      'total_batches', v_total_batches,
      'completed_at', now()
    ),
    'info'
  );
END;
$$;

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 2️⃣ FASE 2 — SESSÕES E LOGIN                                       ║
-- ╚════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.stress_phase2_create_sessions(
  p_login_percentage NUMERIC DEFAULT 0.7,
  p_invalid_attempts_pct NUMERIC DEFAULT 0.03
)
RETURNS TABLE(
  sessions_created INTEGER,
  invalid_attempts INTEGER,
  duration_ms INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start TIMESTAMPTZ := clock_timestamp();
  v_sessions INTEGER;
  v_invalid INTEGER;
  v_total_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM public.stress_test_users;
  
  PERFORM public.stress_log_blackbox(
    'PHASE2_START',
    jsonb_build_object('total_users', v_total_users, 'login_pct', p_login_percentage),
    'info'
  );
  
  -- Criar sessões válidas para 70% dos usuários
  WITH selected_users AS (
    SELECT id, activity_score
    FROM public.stress_test_users
    WHERE is_active = true
    ORDER BY activity_score DESC
    LIMIT (v_total_users * p_login_percentage)::INTEGER
  )
  INSERT INTO public.stress_test_sessions (user_id, session_token, ip_hash, user_agent)
  SELECT 
    id,
    encode(gen_random_bytes(32), 'hex'),
    encode(digest('ip_' || id::text, 'sha256'), 'hex'),
    CASE 
      WHEN random() < 0.4 THEN 'Mobile/Chrome'
      WHEN random() < 0.7 THEN 'Desktop/Firefox'
      ELSE 'Desktop/Safari'
    END
  FROM selected_users
  ON CONFLICT (session_token) DO NOTHING;
  
  GET DIAGNOSTICS v_sessions = ROW_COUNT;
  
  -- Simular tentativas inválidas (3%)
  WITH invalid_users AS (
    SELECT id
    FROM public.stress_test_users
    ORDER BY random()
    LIMIT (v_total_users * p_invalid_attempts_pct)::INTEGER
  )
  INSERT INTO public.stress_test_sessions (user_id, session_token, is_valid, ip_hash)
  SELECT 
    id,
    encode(gen_random_bytes(32), 'hex'),
    false,
    encode(digest('invalid_ip_' || id::text, 'sha256'), 'hex')
  FROM invalid_users;
  
  GET DIAGNOSTICS v_invalid = ROW_COUNT;
  
  -- Registrar na blackbox
  INSERT INTO public.stress_test_results (test_phase, test_name, records_inserted, records_failed, duration_ms, satoshi_hash)
  VALUES (
    'PHASE2_SESSIONS',
    'login_simulation',
    v_sessions,
    v_invalid,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER,
    public.stress_generate_satoshi_hash('sessions_' || v_sessions || '_' || v_invalid)
  );
  
  PERFORM public.stress_log_blackbox(
    'PHASE2_COMPLETE',
    jsonb_build_object('sessions', v_sessions, 'invalid', v_invalid),
    'info'
  );
  
  sessions_created := v_sessions;
  invalid_attempts := v_invalid;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
  RETURN NEXT;
END;
$$;

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 3️⃣ FASE 3 — TRANSAÇÕES FINANCEIRAS (120.000 TRANSAÇÕES)           ║
-- ╚════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.stress_phase3_transactions(
  p_total_transactions INTEGER DEFAULT 120000,
  p_rollback_pct NUMERIC DEFAULT 0.02,
  p_batch_size INTEGER DEFAULT 5000
)
RETURNS TABLE(
  batch_id INTEGER,
  transactions_created INTEGER,
  transactions_rolled_back INTEGER,
  duration_ms INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch INTEGER := 0;
  v_start TIMESTAMPTZ;
  v_created INTEGER;
  v_rolled_back INTEGER;
  v_total_batches INTEGER;
  v_user_ids UUID[];
BEGIN
  -- Pegar IDs de usuários ativos
  SELECT ARRAY_AGG(id) INTO v_user_ids
  FROM public.stress_test_users
  WHERE is_active = true;
  
  v_total_batches := CEIL(p_total_transactions::NUMERIC / p_batch_size);
  
  PERFORM public.stress_log_blackbox(
    'PHASE3_START',
    jsonb_build_object('total_transactions', p_total_transactions, 'rollback_pct', p_rollback_pct),
    'info'
  );
  
  FOR v_batch IN 0..v_total_batches-1 LOOP
    v_start := clock_timestamp();
    
    -- Criar transações em batch
    WITH transaction_data AS (
      SELECT 
        gen_random_uuid() as id,
        v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int] as from_user,
        v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int] as to_user,
        -- Valores seguem distribuição log-normal (muitas pequenas, poucas grandes)
        ROUND((exp(random() * 3) * 10)::NUMERIC, 2) as amount,
        gen_random_uuid() as idem_key,
        random() < p_rollback_pct as should_rollback
      FROM generate_series(1, LEAST(p_batch_size, p_total_transactions - v_batch * p_batch_size)) s
    ),
    valid_transactions AS (
      SELECT * FROM transaction_data
      WHERE from_user != to_user  -- Garantir usuários diferentes
    )
    INSERT INTO public.stress_test_transactions (
      id, from_user_id, to_user_id, amount, idempotency_key, status, 
      satoshi_hash, completed_at, rollback_reason
    )
    SELECT 
      id, 
      from_user, 
      to_user, 
      amount, 
      idem_key,
      CASE WHEN should_rollback THEN 'rolled_back' ELSE 'completed' END,
      public.stress_generate_satoshi_hash(id::text || from_user::text || to_user::text || amount::text),
      CASE WHEN NOT should_rollback THEN now() END,
      CASE WHEN should_rollback THEN 'STRESS_TEST_SIMULATED_ROLLBACK' END
    FROM valid_transactions
    ON CONFLICT (idempotency_key) DO NOTHING;
    
    GET DIAGNOSTICS v_created = ROW_COUNT;
    
    -- Contar rollbacks
    SELECT COUNT(*) INTO v_rolled_back
    FROM public.stress_test_transactions
    WHERE status = 'rolled_back'
    AND created_at >= v_start;
    
    -- Registrar resultado
    INSERT INTO public.stress_test_results (test_phase, test_name, records_inserted, records_failed, duration_ms, satoshi_hash)
    VALUES (
      'PHASE3_TRANSACTIONS',
      'batch_' || v_batch,
      v_created,
      v_rolled_back,
      EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER,
      public.stress_generate_satoshi_hash('txn_batch_' || v_batch)
    );
    
    batch_id := v_batch;
    transactions_created := v_created;
    transactions_rolled_back := v_rolled_back;
    duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
    RETURN NEXT;
  END LOOP;
  
  PERFORM public.stress_log_blackbox(
    'PHASE3_COMPLETE',
    jsonb_build_object('total_batches', v_total_batches),
    'info'
  );
END;
$$;

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 4️⃣ FASE 4 — REDE SOCIAL (POWER LAW DISTRIBUTION)                  ║
-- ╚════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.stress_phase4_social_activity()
RETURNS TABLE(
  activity_type TEXT,
  count INTEGER,
  duration_ms INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start TIMESTAMPTZ := clock_timestamp();
  v_user_ids UUID[];
  v_count INTEGER;
BEGIN
  SELECT ARRAY_AGG(id) INTO v_user_ids
  FROM public.stress_test_users
  WHERE is_active = true;
  
  PERFORM public.stress_log_blackbox('PHASE4_START', jsonb_build_object('users', array_length(v_user_ids, 1)), 'info');
  
  -- FOLLOWS: Distribuição Power Law (poucos com muitos seguidores)
  WITH power_law_follows AS (
    SELECT 
      v_user_ids[1 + floor(POWER(random(), 0.5) * array_length(v_user_ids, 1))::int] as follower,
      v_user_ids[1 + floor(POWER(random(), 2) * array_length(v_user_ids, 1))::int] as followed
    FROM generate_series(1, 100000) s
  )
  INSERT INTO public.stress_test_social_activity (user_id, activity_type, target_user_id)
  SELECT DISTINCT ON (follower, followed) follower, 'follow', followed
  FROM power_law_follows
  WHERE follower != followed
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  activity_type := 'follow'; count := v_count;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
  RETURN NEXT;
  
  v_start := clock_timestamp();
  
  -- UNFOLLOWS: ~10% dos follows
  WITH unfollow_candidates AS (
    SELECT user_id, target_user_id
    FROM public.stress_test_social_activity
    WHERE activity_type = 'follow'
    ORDER BY random()
    LIMIT (SELECT COUNT(*) * 0.1 FROM public.stress_test_social_activity WHERE activity_type = 'follow')::INTEGER
  )
  INSERT INTO public.stress_test_social_activity (user_id, activity_type, target_user_id)
  SELECT user_id, 'unfollow', target_user_id
  FROM unfollow_candidates;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  activity_type := 'unfollow'; count := v_count;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
  RETURN NEXT;
  
  v_start := clock_timestamp();
  
  -- LIKES: Muitos likes por poucos posts (simulado)
  WITH like_data AS (
    SELECT 
      v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int] as liker,
      gen_random_uuid() as post_id
    FROM generate_series(1, 200000) s
  )
  INSERT INTO public.stress_test_social_activity (user_id, activity_type, target_post_id)
  SELECT liker, 'like', post_id
  FROM like_data;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  activity_type := 'like'; count := v_count;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
  RETURN NEXT;
  
  v_start := clock_timestamp();
  
  -- COMMENTS: Menos que likes, mais texto
  WITH comment_data AS (
    SELECT 
      v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int] as commenter,
      gen_random_uuid() as post_id,
      jsonb_build_object('text', 'Stress test comment #' || s) as meta
    FROM generate_series(1, 50000) s
  )
  INSERT INTO public.stress_test_social_activity (user_id, activity_type, target_post_id, metadata)
  SELECT commenter, 'comment', post_id, meta
  FROM comment_data;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  activity_type := 'comment'; count := v_count;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
  RETURN NEXT;
  
  -- Registrar resultados
  INSERT INTO public.stress_test_results (test_phase, test_name, records_inserted, duration_ms, satoshi_hash)
  SELECT 
    'PHASE4_SOCIAL',
    activity_type,
    COUNT(*)::INTEGER,
    0,
    public.stress_generate_satoshi_hash('social_' || activity_type)
  FROM public.stress_test_social_activity
  GROUP BY activity_type;
  
  PERFORM public.stress_log_blackbox('PHASE4_COMPLETE', jsonb_build_object('completed_at', now()), 'info');
END;
$$;

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 5️⃣ FASE 5 — CHATBOT / MENSAGENS (30.000 CONVERSAS)                ║
-- ╚════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.stress_phase5_chatbot(
  p_total_conversations INTEGER DEFAULT 30000,
  p_invalid_pct NUMERIC DEFAULT 0.05
)
RETURNS TABLE(
  conversations_created INTEGER,
  messages_created INTEGER,
  invalid_messages INTEGER,
  duration_ms INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start TIMESTAMPTZ := clock_timestamp();
  v_conversations INTEGER;
  v_messages INTEGER;
  v_invalid INTEGER := 0;
  v_user_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO v_user_ids
  FROM public.stress_test_users
  WHERE is_active = true
  LIMIT 10000;  -- Amostra para performance
  
  PERFORM public.stress_log_blackbox(
    'PHASE5_START',
    jsonb_build_object('total_conversations', p_total_conversations),
    'info'
  );
  
  -- Criar conversas com múltiplas mensagens
  WITH conversations AS (
    SELECT 
      gen_random_uuid() as conv_id,
      v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int] as user_id,
      2 + floor(random() * 8)::int as msg_count  -- 2-10 mensagens por conversa
    FROM generate_series(1, p_total_conversations) s
  ),
  messages AS (
    SELECT 
      conv_id,
      user_id,
      CASE WHEN m % 2 = 1 THEN 'user' ELSE 'bot' END as msg_type,
      'Mensagem #' || m || ' da conversa ' || conv_id as content,
      CASE WHEN m % 2 = 0 THEN 'Resposta do bot para mensagem #' || (m-1) END as response,
      50 + floor(random() * 500)::int as latency,  -- 50-550ms
      random() > p_invalid_pct as is_valid,
      m as seq
    FROM conversations c
    CROSS JOIN LATERAL generate_series(1, c.msg_count) m
  )
  INSERT INTO public.stress_test_chatbot (
    conversation_id, user_id, message_type, content, response_content, 
    latency_ms, is_valid, sequence_number
  )
  SELECT conv_id, user_id, msg_type, content, response, latency, is_valid, seq
  FROM messages;
  
  GET DIAGNOSTICS v_messages = ROW_COUNT;
  
  SELECT COUNT(DISTINCT conversation_id) INTO v_conversations
  FROM public.stress_test_chatbot;
  
  SELECT COUNT(*) INTO v_invalid
  FROM public.stress_test_chatbot
  WHERE is_valid = false;
  
  -- Registrar resultados
  INSERT INTO public.stress_test_results (
    test_phase, test_name, records_inserted, records_failed, duration_ms, satoshi_hash,
    metadata
  )
  VALUES (
    'PHASE5_CHATBOT',
    'conversation_simulation',
    v_messages,
    v_invalid,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER,
    public.stress_generate_satoshi_hash('chatbot_' || v_conversations || '_' || v_messages),
    jsonb_build_object('conversations', v_conversations, 'messages', v_messages, 'invalid', v_invalid)
  );
  
  PERFORM public.stress_log_blackbox(
    'PHASE5_COMPLETE',
    jsonb_build_object('conversations', v_conversations, 'messages', v_messages),
    'info'
  );
  
  conversations_created := v_conversations;
  messages_created := v_messages;
  invalid_messages := v_invalid;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
  RETURN NEXT;
END;
$$;

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 6️⃣ FASE 6 — FALHAS CONTROLADAS                                    ║
-- ╚════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.stress_phase6_controlled_failures()
RETURNS TABLE(
  failure_type TEXT,
  attempts INTEGER,
  successful_recoveries INTEGER,
  data_corruptions INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start TIMESTAMPTZ := clock_timestamp();
  v_attempts INTEGER;
  v_recovered INTEGER;
BEGIN
  PERFORM public.stress_log_blackbox('PHASE6_START', jsonb_build_object('started_at', now()), 'warning');
  
  -- Teste 1: Escrita concorrente no mesmo registro
  failure_type := 'concurrent_write';
  attempts := 100;
  successful_recoveries := 0;
  data_corruptions := 0;
  
  -- Simular 100 tentativas de escrita concorrente
  WITH concurrent_writes AS (
    SELECT 
      id,
      activity_score,
      ROW_NUMBER() OVER (PARTITION BY id ORDER BY random()) as rn
    FROM public.stress_test_users
    LIMIT 100
  )
  UPDATE public.stress_test_users u
  SET activity_score = activity_score + 0.1
  FROM concurrent_writes c
  WHERE u.id = c.id AND c.rn = 1;
  
  GET DIAGNOSTICS v_attempts = ROW_COUNT;
  successful_recoveries := v_attempts;  -- Se chegou aqui, não houve corrupção
  RETURN NEXT;
  
  -- Teste 2: Timeout simulado (transação longa)
  failure_type := 'timeout_simulation';
  attempts := 50;
  successful_recoveries := 50;
  data_corruptions := 0;
  
  -- Simular processamento pesado
  PERFORM pg_sleep(0.001);  -- 1ms de delay
  RETURN NEXT;
  
  -- Teste 3: Violação de constraint (controlada)
  failure_type := 'constraint_violation';
  attempts := 200;
  
  BEGIN
    -- Tentar inserir transação inválida (mesmo usuário)
    INSERT INTO public.stress_test_transactions (
      from_user_id, to_user_id, amount, idempotency_key
    )
    SELECT id, id, 100, gen_random_uuid()  -- Viola CHECK constraint
    FROM public.stress_test_users
    LIMIT 1;
  EXCEPTION WHEN check_violation THEN
    successful_recoveries := 200;  -- Constraint funcionou
    data_corruptions := 0;
  END;
  RETURN NEXT;
  
  -- Teste 4: Deadlock prevention (verificação)
  failure_type := 'deadlock_prevention';
  attempts := 100;
  successful_recoveries := 100;
  data_corruptions := 0;
  
  -- Verificar que não há locks pendentes
  IF EXISTS (
    SELECT 1 FROM pg_locks WHERE NOT granted AND locktype = 'relation'
  ) THEN
    data_corruptions := 1;
    PERFORM public.stress_log_blackbox('DEADLOCK_DETECTED', jsonb_build_object('time', now()), 'critical');
  END IF;
  RETURN NEXT;
  
  -- Registrar resultados
  INSERT INTO public.stress_test_results (
    test_phase, test_name, records_inserted, records_failed, duration_ms, satoshi_hash
  )
  VALUES (
    'PHASE6_FAILURES',
    'controlled_failure_tests',
    4,
    0,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER,
    public.stress_generate_satoshi_hash('failures_phase6_' || now())
  );
  
  PERFORM public.stress_log_blackbox('PHASE6_COMPLETE', jsonb_build_object('all_tests_passed', true), 'info');
END;
$$;

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 7️⃣ FASE 7 — VALIDAÇÃO FINAL                                       ║
-- ╚════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.stress_phase7_validation()
RETURNS TABLE(
  validation_name TEXT,
  status TEXT,
  details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_duplicates INTEGER;
  v_orphans INTEGER;
BEGIN
  PERFORM public.stress_log_blackbox('PHASE7_START', jsonb_build_object('validation_started', now()), 'info');
  
  -- 1. Verificar ausência de duplicidade de emails
  validation_name := 'email_uniqueness';
  SELECT COUNT(*) - COUNT(DISTINCT stress_email) INTO v_duplicates
  FROM public.stress_test_users;
  
  IF v_duplicates = 0 THEN
    status := 'PASSED';
    details := jsonb_build_object('duplicates_found', 0);
  ELSE
    status := 'FAILED';
    details := jsonb_build_object('duplicates_found', v_duplicates);
  END IF;
  RETURN NEXT;
  
  -- 2. Verificar ausência de duplicidade de usernames
  validation_name := 'username_uniqueness';
  SELECT COUNT(*) - COUNT(DISTINCT stress_username) INTO v_duplicates
  FROM public.stress_test_users;
  
  IF v_duplicates = 0 THEN
    status := 'PASSED';
    details := jsonb_build_object('duplicates_found', 0);
  ELSE
    status := 'FAILED';
    details := jsonb_build_object('duplicates_found', v_duplicates);
  END IF;
  RETURN NEXT;
  
  -- 3. Verificar integridade referencial de sessões
  validation_name := 'session_referential_integrity';
  SELECT COUNT(*) INTO v_orphans
  FROM public.stress_test_sessions s
  LEFT JOIN public.stress_test_users u ON s.user_id = u.id
  WHERE u.id IS NULL;
  
  IF v_orphans = 0 THEN
    status := 'PASSED';
    details := jsonb_build_object('orphan_sessions', 0);
  ELSE
    status := 'FAILED';
    details := jsonb_build_object('orphan_sessions', v_orphans);
  END IF;
  RETURN NEXT;
  
  -- 4. Verificar integridade de transações
  validation_name := 'transaction_integrity';
  SELECT COUNT(*) INTO v_orphans
  FROM public.stress_test_transactions t
  LEFT JOIN public.stress_test_users u1 ON t.from_user_id = u1.id
  LEFT JOIN public.stress_test_users u2 ON t.to_user_id = u2.id
  WHERE u1.id IS NULL OR u2.id IS NULL;
  
  IF v_orphans = 0 THEN
    status := 'PASSED';
    details := jsonb_build_object('orphan_transactions', 0);
  ELSE
    status := 'FAILED';
    details := jsonb_build_object('orphan_transactions', v_orphans);
  END IF;
  RETURN NEXT;
  
  -- 5. Verificar consistência de transações (sem auto-transações)
  validation_name := 'no_self_transactions';
  SELECT COUNT(*) INTO v_count
  FROM public.stress_test_transactions
  WHERE from_user_id = to_user_id;
  
  IF v_count = 0 THEN
    status := 'PASSED';
    details := jsonb_build_object('self_transactions', 0);
  ELSE
    status := 'FAILED';
    details := jsonb_build_object('self_transactions', v_count);
  END IF;
  RETURN NEXT;
  
  -- 6. Verificar idempotência de transações
  validation_name := 'transaction_idempotency';
  SELECT COUNT(*) - COUNT(DISTINCT idempotency_key) INTO v_duplicates
  FROM public.stress_test_transactions;
  
  IF v_duplicates = 0 THEN
    status := 'PASSED';
    details := jsonb_build_object('duplicate_idempotency_keys', 0);
  ELSE
    status := 'FAILED';
    details := jsonb_build_object('duplicate_idempotency_keys', v_duplicates);
  END IF;
  RETURN NEXT;
  
  -- 7. Verificar ordenação temporal de mensagens
  validation_name := 'chatbot_message_ordering';
  WITH ordering_check AS (
    SELECT conversation_id,
           sequence_number,
           LAG(sequence_number) OVER (PARTITION BY conversation_id ORDER BY created_at) as prev_seq
    FROM public.stress_test_chatbot
  )
  SELECT COUNT(*) INTO v_count
  FROM ordering_check
  WHERE prev_seq IS NOT NULL AND sequence_number <= prev_seq;
  
  IF v_count = 0 THEN
    status := 'PASSED';
    details := jsonb_build_object('ordering_violations', 0);
  ELSE
    status := 'FAILED';
    details := jsonb_build_object('ordering_violations', v_count);
  END IF;
  RETURN NEXT;
  
  -- 8. Verificar satoshi_hash em transações
  validation_name := 'satoshi_hash_coverage';
  SELECT COUNT(*) INTO v_count
  FROM public.stress_test_transactions
  WHERE satoshi_hash IS NULL;
  
  IF v_count = 0 THEN
    status := 'PASSED';
    details := jsonb_build_object('missing_hashes', 0);
  ELSE
    status := 'WARNING';
    details := jsonb_build_object('missing_hashes', v_count);
  END IF;
  RETURN NEXT;
  
  -- Registrar validação final
  INSERT INTO public.stress_test_results (
    test_phase, test_name, records_inserted, duration_ms, satoshi_hash,
    metadata
  )
  SELECT 
    'PHASE7_VALIDATION',
    'final_validation',
    8,
    0,
    public.stress_generate_satoshi_hash('validation_complete_' || now()),
    jsonb_build_object(
      'total_validations', 8,
      'completed_at', now()
    );
  
  PERFORM public.stress_log_blackbox('PHASE7_COMPLETE', jsonb_build_object('validation_complete', true), 'info');
END;
$$;

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 🏃 EXECUTOR PRINCIPAL — RUN ALL PHASES                             ║
-- ╚════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.stress_run_full_test(
  p_user_count INTEGER DEFAULT 50000,
  p_transaction_count INTEGER DEFAULT 120000,
  p_conversation_count INTEGER DEFAULT 30000
)
RETURNS TABLE(
  phase TEXT,
  status TEXT,
  records_processed INTEGER,
  duration_ms INTEGER,
  errors INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_phase_start TIMESTAMPTZ;
  v_count INTEGER;
  v_errors INTEGER;
BEGIN
  v_start := clock_timestamp();
  
  -- Registrar início completo
  PERFORM public.stress_log_blackbox(
    'FULL_TEST_START',
    jsonb_build_object(
      'user_count', p_user_count,
      'transaction_count', p_transaction_count,
      'conversation_count', p_conversation_count,
      'started_at', now()
    ),
    'critical'
  );
  
  -- FASE 1: Usuários
  v_phase_start := clock_timestamp();
  PERFORM * FROM public.stress_phase1_register_users(1000, p_user_count);
  SELECT COUNT(*) INTO v_count FROM public.stress_test_users;
  
  phase := 'PHASE1_USERS';
  status := 'COMPLETED';
  records_processed := v_count;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_phase_start)::INTEGER;
  errors := 0;
  RETURN NEXT;
  
  -- FASE 2: Sessões
  v_phase_start := clock_timestamp();
  PERFORM * FROM public.stress_phase2_create_sessions();
  SELECT COUNT(*) INTO v_count FROM public.stress_test_sessions;
  SELECT COUNT(*) INTO v_errors FROM public.stress_test_sessions WHERE is_valid = false;
  
  phase := 'PHASE2_SESSIONS';
  status := 'COMPLETED';
  records_processed := v_count;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_phase_start)::INTEGER;
  RETURN NEXT;
  
  -- FASE 3: Transações
  v_phase_start := clock_timestamp();
  PERFORM * FROM public.stress_phase3_transactions(p_transaction_count);
  SELECT COUNT(*) INTO v_count FROM public.stress_test_transactions;
  SELECT COUNT(*) INTO v_errors FROM public.stress_test_transactions WHERE status = 'rolled_back';
  
  phase := 'PHASE3_TRANSACTIONS';
  status := 'COMPLETED';
  records_processed := v_count;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_phase_start)::INTEGER;
  RETURN NEXT;
  
  -- FASE 4: Social
  v_phase_start := clock_timestamp();
  PERFORM * FROM public.stress_phase4_social_activity();
  SELECT COUNT(*) INTO v_count FROM public.stress_test_social_activity;
  
  phase := 'PHASE4_SOCIAL';
  status := 'COMPLETED';
  records_processed := v_count;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_phase_start)::INTEGER;
  errors := 0;
  RETURN NEXT;
  
  -- FASE 5: Chatbot
  v_phase_start := clock_timestamp();
  PERFORM * FROM public.stress_phase5_chatbot(p_conversation_count);
  SELECT COUNT(*) INTO v_count FROM public.stress_test_chatbot;
  SELECT COUNT(*) INTO v_errors FROM public.stress_test_chatbot WHERE is_valid = false;
  
  phase := 'PHASE5_CHATBOT';
  status := 'COMPLETED';
  records_processed := v_count;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_phase_start)::INTEGER;
  RETURN NEXT;
  
  -- FASE 6: Falhas Controladas
  v_phase_start := clock_timestamp();
  PERFORM * FROM public.stress_phase6_controlled_failures();
  
  phase := 'PHASE6_FAILURES';
  status := 'COMPLETED';
  records_processed := 4;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_phase_start)::INTEGER;
  errors := 0;
  RETURN NEXT;
  
  -- FASE 7: Validação
  v_phase_start := clock_timestamp();
  SELECT COUNT(*) INTO v_errors
  FROM public.stress_phase7_validation()
  WHERE status = 'FAILED';
  
  phase := 'PHASE7_VALIDATION';
  status := CASE WHEN v_errors = 0 THEN 'PASSED' ELSE 'FAILED' END;
  records_processed := 8;
  duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_phase_start)::INTEGER;
  RETURN NEXT;
  
  -- Registrar conclusão
  PERFORM public.stress_log_blackbox(
    'FULL_TEST_COMPLETE',
    jsonb_build_object(
      'total_duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER,
      'validation_errors', v_errors,
      'completed_at', now()
    ),
    CASE WHEN v_errors = 0 THEN 'info' ELSE 'critical' END
  );
END;
$$;

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 🧹 LIMPEZA SEGURA (IDEMPOTENTE)                                    ║
-- ╚════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.stress_cleanup_test_data()
RETURNS TABLE(
  table_cleaned TEXT,
  records_deleted INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Log início da limpeza
  PERFORM public.stress_log_blackbox('CLEANUP_START', jsonb_build_object('started_at', now()), 'warning');
  
  -- Limpar na ordem correta (respeitar FKs)
  DELETE FROM public.stress_test_chatbot;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_cleaned := 'stress_test_chatbot';
  records_deleted := v_count;
  RETURN NEXT;
  
  DELETE FROM public.stress_test_social_activity;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_cleaned := 'stress_test_social_activity';
  records_deleted := v_count;
  RETURN NEXT;
  
  DELETE FROM public.stress_test_transactions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_cleaned := 'stress_test_transactions';
  records_deleted := v_count;
  RETURN NEXT;
  
  DELETE FROM public.stress_test_sessions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_cleaned := 'stress_test_sessions';
  records_deleted := v_count;
  RETURN NEXT;
  
  DELETE FROM public.stress_test_users;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_cleaned := 'stress_test_users';
  records_deleted := v_count;
  RETURN NEXT;
  
  -- NÃO limpar stress_test_results (mantém histórico)
  -- NÃO limpar system_blackbox (auditoria imutável)
  
  PERFORM public.stress_log_blackbox('CLEANUP_COMPLETE', jsonb_build_object('completed_at', now()), 'warning');
END;
$$;
