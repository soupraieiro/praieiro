# 📊 PRAIEIRO — Métricas do Teste de Carga Soberano

## 🎯 Objetivos do Teste

| Métrica | Valor Esperado | Tolerância |
|---------|---------------|------------|
| Usuários cadastrados | 50.000 | ± 0 (idempotente) |
| Sessões ativas | ~35.000 (70%) | ± 5% |
| Tentativas inválidas | ~1.500 (3%) | ± 1% |
| Transações criadas | 120.000 | ± 1% |
| Transações rollback | ~2.400 (2%) | ± 0.5% |
| Atividades sociais | ~350.000+ | Variável |
| Conversas chatbot | 30.000 | ± 0 |
| Mensagens chatbot | ~150.000 | Variável (2-10/conv) |

---

## ⏱️ Performance Esperada

### Fase 1 — Cadastro em Massa
- **Throughput**: 5.000-10.000 registros/segundo
- **Tempo total**: 5-10 segundos para 50k usuários
- **Batches**: 50 (1.000 usuários cada)

### Fase 2 — Sessões
- **Throughput**: 10.000-20.000 sessões/segundo
- **Tempo total**: 2-4 segundos

### Fase 3 — Transações
- **Throughput**: 3.000-8.000 transações/segundo
- **Tempo total**: 15-40 segundos para 120k
- **Batches**: 24 (5.000 cada)

### Fase 4 — Rede Social
- **Follows**: ~100.000 (power law)
- **Unfollows**: ~10.000 (10% dos follows)
- **Likes**: ~200.000
- **Comments**: ~50.000

### Fase 5 — Chatbot
- **Conversas**: 30.000
- **Mensagens/conversa**: 2-10 (média ~5)
- **Latência simulada**: 50-550ms

### Fase 6 — Falhas Controladas
- **Testes**: 4 tipos
- **Recuperações esperadas**: 100%
- **Corrupções esperadas**: 0

### Fase 7 — Validação
- **Verificações**: 8
- **Todas devem**: PASSED

---

## ✅ Critérios de Sucesso

### CRÍTICO (Falha = Teste Falhou)
- [ ] Zero duplicidade de emails
- [ ] Zero duplicidade de usernames
- [ ] Zero transações self-referencing
- [ ] Zero violações de integridade referencial
- [ ] Zero corrupção de dados em falhas controladas
- [ ] 100% das transações com satoshi_hash

### WARNING (Investigar, mas não bloqueia)
- [ ] Rollbacks acima de 3%
- [ ] Mensagens inválidas acima de 7%
- [ ] Performance abaixo de 1.000 records/segundo

### INFO (Métricas de observação)
- [ ] Distribuição power law verificada
- [ ] Timestamps escalonados corretamente
- [ ] Ordenação temporal de mensagens

---

## 🚫 Falhas Aceitáveis vs Críticas

### ✅ Aceitáveis (Comportamento esperado)
| Tipo | Descrição | Quantidade |
|------|-----------|------------|
| Rollback de transação | Simulado propositalmente | ~2% |
| Tentativa de login inválida | Parte do teste de segurança | ~3% |
| Mensagem inválida | Teste de validação | ~5% |
| Timeout em operação longa | Limite de recursos | Eventual |

### ❌ Críticas (Devem ser ZERO)
| Tipo | Descrição | Ação |
|------|-----------|------|
| Duplicidade de chave primária | Falha de idempotência | Investigar imediatamente |
| Violação de FK | Dados órfãos | Rollback necessário |
| Auto-transação | Violação de constraint | Bug no código |
| Deadlock não resolvido | Lock infinito | Intervenção manual |
| Corrupção de dados | Inconsistência | Restaurar backup |
| Hash Satoshi ausente | Falha de auditoria | Reprocessar |

---

## 📈 Dashboard de Monitoramento

```sql
-- Executar durante o teste para acompanhar
SELECT 
  test_phase,
  COUNT(*) as batches_completed,
  SUM(records_inserted) as total_records,
  ROUND(AVG(records_inserted::NUMERIC / NULLIF(duration_ms, 0) * 1000), 0) as avg_rps,
  MAX(created_at) as last_update
FROM public.stress_test_results
GROUP BY test_phase
ORDER BY MAX(created_at) DESC;
```

---

## 🔄 Reexecutabilidade

O teste é **100% idempotente**:

1. **Pode ser executado múltiplas vezes** sem efeitos colaterais
2. **ON CONFLICT DO NOTHING** previne duplicatas
3. **Chaves únicas** garantem integridade
4. **Limpeza opcional** preserva histórico de resultados

### Para reexecutar:
```sql
-- Limpar dados de teste (opcional)
SELECT * FROM public.stress_cleanup_test_data();

-- Executar novamente
SELECT * FROM public.stress_run_full_test(50000, 120000, 30000);
```

---

## 🛡️ Axiomas Constitucionais Respeitados

| Axioma | Descrição | Implementação |
|--------|-----------|---------------|
| A0 | Idempotência Indissolúvel | ON CONFLICT, UNIQUE constraints |
| A0.1 | Existência antes da Referência | FKs validadas, ordem de criação |
| A0.2 | Reexecutabilidade Total | Funções determinísticas |
| A0.3 | Não Destruição | DELETE apenas em cleanup explícito |
| A0.4 | Cronicidade Histórica | satoshi_hash em todas transações |

---

## 📝 Notas de Execução

### Ambiente Recomendado
- **RAM**: Mínimo 4GB disponível
- **CPU**: 2+ cores
- **Conexões**: Pool de 20+ conexões
- **Statement Timeout**: Desabilitado ou > 5 minutos

### Monitoramento Paralelo
Execute em outra sessão:
```sql
-- Ver queries ativas
SELECT pid, state, wait_event_type, query 
FROM pg_stat_activity 
WHERE state != 'idle';

-- Ver locks
SELECT * FROM pg_locks WHERE NOT granted;
```
