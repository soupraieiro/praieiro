-- =====================================================================
-- PRAIEIRO — EXECUÇÃO DO TESTE DE CARGA SOBERANO
-- Instruções de Uso
-- =====================================================================

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 📋 OPÇÃO 1: EXECUÇÃO COMPLETA (TODAS AS FASES)                     ║
-- ╚════════════════════════════════════════════════════════════════════╝
-- Executa todas as 7 fases sequencialmente
-- Parâmetros: (usuários, transações, conversas)

SELECT * FROM public.stress_run_full_test(50000, 120000, 30000);

-- Para teste menor (desenvolvimento):
-- SELECT * FROM public.stress_run_full_test(1000, 5000, 500);


-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 📋 OPÇÃO 2: EXECUÇÃO POR FASE                                      ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- FASE 1: Cadastrar 50.000 usuários (batch de 1000)
SELECT * FROM public.stress_phase1_register_users(1000, 50000);

-- FASE 2: Criar sessões (70% login, 3% inválidos)
SELECT * FROM public.stress_phase2_create_sessions(0.7, 0.03);

-- FASE 3: Transações financeiras (120k, 2% rollback)
SELECT * FROM public.stress_phase3_transactions(120000, 0.02, 5000);

-- FASE 4: Atividade social (power law)
SELECT * FROM public.stress_phase4_social_activity();

-- FASE 5: Chatbot (30k conversas, 5% inválidas)
SELECT * FROM public.stress_phase5_chatbot(30000, 0.05);

-- FASE 6: Falhas controladas
SELECT * FROM public.stress_phase6_controlled_failures();

-- FASE 7: Validação final
SELECT * FROM public.stress_phase7_validation();


-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 📊 MÉTRICAS E MONITORAMENTO                                        ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- Ver resultados por fase
SELECT 
  test_phase,
  test_name,
  records_inserted,
  records_failed,
  duration_ms,
  ROUND(records_inserted::NUMERIC / NULLIF(duration_ms, 0) * 1000, 2) as records_per_second,
  created_at
FROM public.stress_test_results
ORDER BY created_at DESC
LIMIT 50;

-- Resumo por fase
SELECT 
  test_phase,
  COUNT(*) as batches,
  SUM(records_inserted) as total_records,
  SUM(records_failed) as total_failures,
  SUM(duration_ms) as total_duration_ms,
  ROUND(SUM(records_inserted)::NUMERIC / NULLIF(SUM(duration_ms), 0) * 1000, 2) as avg_records_per_second
FROM public.stress_test_results
GROUP BY test_phase
ORDER BY MIN(created_at);

-- Eventos críticos na blackbox
SELECT 
  event_name,
  payload,
  severity,
  created_at
FROM public.system_blackbox
WHERE event_name LIKE 'STRESS_TEST_%'
ORDER BY created_at DESC
LIMIT 100;


-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 📈 ESTATÍSTICAS DOS DADOS GERADOS                                  ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- Contagem geral
SELECT 
  'stress_test_users' as table_name, COUNT(*) as count FROM public.stress_test_users
UNION ALL SELECT 'stress_test_sessions', COUNT(*) FROM public.stress_test_sessions
UNION ALL SELECT 'stress_test_transactions', COUNT(*) FROM public.stress_test_transactions
UNION ALL SELECT 'stress_test_social_activity', COUNT(*) FROM public.stress_test_social_activity
UNION ALL SELECT 'stress_test_chatbot', COUNT(*) FROM public.stress_test_chatbot;

-- Distribuição de atividade (Power Law check)
SELECT 
  CASE 
    WHEN activity_score < 10 THEN 'Low (0-10)'
    WHEN activity_score < 50 THEN 'Medium (10-50)'
    WHEN activity_score < 90 THEN 'High (50-90)'
    ELSE 'Very High (90-100)'
  END as activity_tier,
  COUNT(*) as user_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM public.stress_test_users
GROUP BY 1
ORDER BY 1;

-- Distribuição de transações por status
SELECT 
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage,
  ROUND(AVG(amount), 2) as avg_amount,
  ROUND(SUM(amount), 2) as total_amount
FROM public.stress_test_transactions
GROUP BY status;

-- Distribuição de atividade social
SELECT 
  activity_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM public.stress_test_social_activity
GROUP BY activity_type
ORDER BY count DESC;

-- Conversas por número de mensagens
SELECT 
  CASE 
    WHEN msg_count <= 3 THEN '1-3 mensagens'
    WHEN msg_count <= 6 THEN '4-6 mensagens'
    ELSE '7+ mensagens'
  END as conversation_size,
  COUNT(*) as conversations
FROM (
  SELECT conversation_id, COUNT(*) as msg_count
  FROM public.stress_test_chatbot
  GROUP BY conversation_id
) sub
GROUP BY 1
ORDER BY 1;


-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ 🧹 LIMPEZA (Apenas quando necessário)                              ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- CUIDADO: Remove todos os dados de teste (mantém histórico e auditoria)
-- SELECT * FROM public.stress_cleanup_test_data();


-- ╔════════════════════════════════════════════════════════════════════╗
-- ║ ✅ VERIFICAÇÕES FINAIS                                             ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- Executar validação completa
SELECT * FROM public.stress_phase7_validation();

-- Verificar integridade do sistema após teste
SELECT 
  (SELECT COUNT(*) FROM public.stress_test_users) as users,
  (SELECT COUNT(*) FROM public.stress_test_sessions) as sessions,
  (SELECT COUNT(*) FROM public.stress_test_transactions) as transactions,
  (SELECT COUNT(*) FROM public.stress_test_social_activity) as social_activities,
  (SELECT COUNT(*) FROM public.stress_test_chatbot) as chatbot_messages,
  (SELECT COUNT(*) FROM public.stress_test_results) as test_results,
  (SELECT COUNT(*) FROM public.system_blackbox WHERE event_name LIKE 'STRESS_TEST_%') as audit_events;
