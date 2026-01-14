-- =====================================================
-- PRAIEIRO STRESS TEST MONITORING QUERIES
-- Execute estas queries para monitorar locks e atividade
-- =====================================================

-- 1. MONITORAMENTO DE ATIVIDADE EM TEMPO REAL
-- Ver todas as queries ativas
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  wait_event_type,
  wait_event,
  query_start,
  now() - query_start as query_duration,
  LEFT(query, 100) as query_preview
FROM pg_stat_activity
WHERE state != 'idle'
  AND pid != pg_backend_pid()
ORDER BY query_start ASC;

-- 2. DETECÇÃO DE LOCKS DE TABELA
SELECT 
  l.locktype,
  l.relation::regclass as table_name,
  l.mode,
  l.granted,
  l.pid,
  a.usename,
  a.state,
  a.wait_event_type,
  now() - a.query_start as lock_duration,
  LEFT(a.query, 80) as query_preview
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation IS NOT NULL
  AND NOT l.granted
ORDER BY lock_duration DESC;

-- 3. LOCKS BLOQUEANTES (Quem está travando quem)
SELECT 
  blocked.pid AS blocked_pid,
  blocked.usename AS blocked_user,
  blocking.pid AS blocking_pid,
  blocking.usename AS blocking_user,
  blocked_locks.locktype AS lock_type,
  blocked_locks.relation::regclass AS locked_table,
  now() - blocked.query_start AS blocked_duration,
  LEFT(blocked.query, 60) AS blocked_query,
  LEFT(blocking.query, 60) AS blocking_query
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.relation = blocked_locks.relation
  AND blocking_locks.granted
  AND blocked_locks.pid != blocking_locks.pid
JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 4. ESTATÍSTICAS DE TABELAS (Para ver impacto do stress)
SELECT 
  schemaname,
  relname as table_name,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct,
  n_tup_ins as total_inserts,
  n_tup_upd as total_updates,
  n_tup_del as total_deletes,
  last_autovacuum,
  pg_size_pretty(pg_relation_size(schemaname || '.' || relname)) as table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 20;

-- 5. CONEXÕES POR ESTADO
SELECT 
  state,
  COUNT(*) as connection_count,
  MAX(now() - query_start) as max_duration
FROM pg_stat_activity
GROUP BY state
ORDER BY connection_count DESC;

-- 6. QUERIES MAIS LENTAS (últimas 100)
SELECT 
  pid,
  usename,
  now() - query_start as duration,
  state,
  wait_event_type,
  wait_event,
  LEFT(query, 150) as query
FROM pg_stat_activity
WHERE query NOT LIKE '%pg_stat%'
  AND state != 'idle'
ORDER BY query_start ASC
LIMIT 100;

-- 7. STRESS TEST RESULTS (Ver progresso)
SELECT 
  test_phase,
  test_name,
  records_inserted,
  duration_ms,
  ROUND(records_inserted::NUMERIC / NULLIF(duration_ms, 0) * 1000, 2) as records_per_second,
  error_message,
  created_at
FROM stress_test_results
ORDER BY created_at DESC
LIMIT 20;

-- 8. ANÁLISE DE WAL (Write-Ahead Log)
-- Se WAL crescer muito, indica pressão de escrita
SELECT 
  pg_current_wal_lsn() as current_wal_position,
  pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0') / 1024 / 1024 as wal_mb_since_start;

-- 9. CACHE HIT RATIO (Deve ser > 99%)
SELECT 
  'index hit rate' as metric,
  ROUND(100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0), 2) as hit_rate_pct
FROM pg_statio_user_indexes
UNION ALL
SELECT 
  'table hit rate',
  ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0), 2)
FROM pg_statio_user_tables;

-- 10. LIMPEZA PÓS-STRESS (Execute quando quiser limpar)
-- DELETE FROM telemetry_events WHERE (properties->>'stress_test')::boolean = true;
-- DELETE FROM chatbot_interactions WHERE (context_data->>'stress_test')::boolean = true;
-- DELETE FROM feed_posts WHERE text_content LIKE 'STRESS_%';
-- DELETE FROM rate_limits WHERE identifier LIKE 'exaustao+%' OR identifier LIKE 'stress_%';
-- DELETE FROM stress_test_results;
