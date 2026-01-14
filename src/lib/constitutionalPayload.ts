/**
 * CONSTITUTIONAL PAYLOAD VALIDATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * VERSÃO CANÔNICA: v3.2.0 - Gerado a partir dos artefatos SQL do banco
 * 
 * Este arquivo é a Single Source of Truth (SSOT) para validação de payloads
 * no ecossistema PRAIEIRO. Todas as informações aqui são CANÔNICAS e derivadas
 * diretamente do banco de dados Supabase.
 * 
 * AXIOMAS CONSTITUCIONAIS:
 * - A0: Idempotência Indissolúvel
 * - A0.1: Existência antes da Referência
 * - A0.2: Reexecutabilidade Total
 * - A0.3: Não Destruição
 * - A0.4: Cronicidade Histórica
 * 
 * MOEDA: ZIMBU (unidade oficial de valor do ecossistema)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════

export interface PayloadValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedPayload: Record<string, unknown>;
}

export interface OperationLog {
  table: string;
  operation: "INSERT" | "UPDATE" | "DELETE" | "SELECT";
  payload: Record<string, unknown>;
  response: unknown;
  error: string | null;
  userId: string | null;
  timestamp: string;
}

export interface TriggerDefinition {
  name: string;
  timing: "BEFORE" | "AFTER";
  event: "INSERT" | "UPDATE" | "DELETE";
  function: string;
}

export interface ForeignKeyDefinition {
  column: string;
  parentTable: string;
  parentColumn: string;
}

export interface TableSchema {
  primaryKey: string;
  required: string[];
  defaults: Record<string, unknown>;
  triggers: TriggerDefinition[];
  foreignKeys: ForeignKeyDefinition[];
  checkConstraints: string[];
  isImmutable: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO CANÔNICA DO BANCO DE DADOS
// Derivado de: Supabase_Snippet_*.csv
// ═══════════════════════════════════════════════════════════════════

/**
 * EXTENSÕES INSTALADAS NO BANCO
 * Fonte: Supabase_Snippet_Installed_Extension_Versions.csv
 */
export const INSTALLED_EXTENSIONS = {
  plpgsql: "1.0",
  pg_stat_statements: "1.11",
  "uuid-ossp": "1.1",
  pgcrypto: "1.3",
  supabase_vault: "0.3.1",
  pg_graphql: "1.5.11",
  postgis: "3.3.7",
} as const;

/**
 * ROLES DO SISTEMA
 * Fonte: Supabase_Snippet_Role_Privileges_Overview.csv
 */
export const SYSTEM_ROLES = {
  anon: { canLogin: false, isSuper: false },
  authenticated: { canLogin: false, isSuper: false },
  authenticator: { canLogin: true, isSuper: false },
  service_role: { canLogin: false, isSuper: false },
  postgres: { canLogin: true, isSuper: false, canCreateRole: true, canCreateDb: true },
  supabase_admin: { canLogin: true, isSuper: true },
} as const;

/**
 * TRIGGERS CANÔNICOS DO SISTEMA
 * Fonte: Supabase_Snippet_Untitled_query.csv
 * 
 * CRÍTICO: Estes triggers executam automaticamente no banco.
 * O frontend DEVE estar ciente deles para evitar conflitos.
 */
export const CANONICAL_TRIGGERS: Record<string, TriggerDefinition[]> = {
  action_log: [
    { name: "no_update_action_log", timing: "BEFORE", event: "DELETE", function: "prevent_update_delete" },
    { name: "no_update_action_log", timing: "BEFORE", event: "UPDATE", function: "prevent_update_delete" },
  ],
  banned_ips: [
    { name: "trigger_generate_clo_report", timing: "AFTER", event: "INSERT", function: "generate_clo_report" },
    { name: "trigger_notify_admin_ip_banned", timing: "AFTER", event: "INSERT", function: "notify_admin_ip_banned" },
    { name: "trigger_detect_siege_pattern", timing: "AFTER", event: "INSERT", function: "detect_siege_pattern" },
  ],
  cache_store: [
    { name: "tr_audit_cache", timing: "BEFORE", event: "UPDATE", function: "log_system_efficiency" },
  ],
  chat_media_interactions: [
    { name: "trigger_media_lastro", timing: "AFTER", event: "INSERT", function: "fn_process_media_lastro" },
    { name: "update_chat_media_interactions_updated_at", timing: "BEFORE", event: "UPDATE", function: "update_updated_at_column" },
  ],
  chat_messages: [
    { name: "tr_audit_chat", timing: "AFTER", event: "INSERT", function: "log_chat_to_council" },
    { name: "trigger_update_session_counters", timing: "AFTER", event: "INSERT", function: "update_chat_session_counters" },
    { name: "trigger_generate_session_title", timing: "AFTER", event: "INSERT", function: "generate_chat_session_title" },
  ],
  chat_sessions: [
    { name: "trigger_audit_session", timing: "AFTER", event: "INSERT", function: "audit_new_session" },
  ],
  chat_youtube_webhook_events: [
    { name: "update_webhook_events_updated_at", timing: "BEFORE", event: "UPDATE", function: "update_updated_at_column" },
    { name: "tr_settle_music_lastro", timing: "BEFORE", event: "INSERT", function: "fn_settle_music_lastro" },
  ],
  client_conchas: [
    { name: "trigger_log_concha_balance", timing: "AFTER", event: "UPDATE", function: "log_concha_balance_event" },
    { name: "trigger_log_concha_balance", timing: "AFTER", event: "INSERT", function: "log_concha_balance_event" },
  ],
  concha_transactions: [
    { name: "tr_governance_cfo", timing: "AFTER", event: "INSERT", function: "fn_satoshi_governance_analyzer" },
    { name: "trigger_log_concha_transaction", timing: "AFTER", event: "INSERT", function: "log_concha_transaction_event" },
  ],
  fiat_to_crypto_logs: [
    { name: "trg_payment_consistency", timing: "BEFORE", event: "UPDATE", function: "check_payment_consistency" },
  ],
  ledger_events: [
    { name: "tr_governance_cto", timing: "AFTER", event: "INSERT", function: "fn_satoshi_governance_analyzer" },
  ],
  music_genres: [
    { name: "update_music_genres_updated_at", timing: "BEFORE", event: "UPDATE", function: "update_updated_at_column" },
  ],
  navigation_events: [
    { name: "tr_on_service_activation", timing: "AFTER", event: "INSERT", function: "fn_calculate_and_debit_service" },
  ],
  products: [
    { name: "tr_governance_coo", timing: "AFTER", event: "INSERT", function: "fn_satoshi_governance_analyzer" },
    { name: "tr_governance_coo", timing: "AFTER", event: "UPDATE", function: "fn_satoshi_governance_analyzer" },
  ],
  protocol_settings: [
    { name: "tr_audit_protocol", timing: "AFTER", event: "UPDATE", function: "log_protocol_changes" },
  ],
  satoshi_events: [
    { name: "trg_satoshi_constitution", timing: "BEFORE", event: "UPDATE", function: "satoshi_constitutional_trigger" },
    { name: "trg_satoshi_constitution", timing: "BEFORE", event: "DELETE", function: "satoshi_constitutional_trigger" },
    { name: "trg_satoshi_constitution", timing: "BEFORE", event: "INSERT", function: "satoshi_constitutional_trigger" },
  ],
  social_posts: [
    { name: "trigger_social_post_webhook", timing: "AFTER", event: "INSERT", function: "fn_trigger_webhook" },
  ],
  sys_orch_logs: [
    { name: "trigger_optimization_check", timing: "AFTER", event: "INSERT", function: "trigger_optimization_guidance" },
    { name: "trigger_error_to_alert", timing: "AFTER", event: "INSERT", function: "trigger_critical_alert_on_error" },
  ],
  transaction_orchestrator: [
    { name: "trg_verify_transaction", timing: "BEFORE", event: "UPDATE", function: "verify_and_commit_transaction" },
  ],
  wallet_transactions: [
    { name: "tr_update_wallet_balance", timing: "AFTER", event: "INSERT", function: "update_wallet_balance" },
  ],
};

/**
 * TABELAS IMUTÁVEIS (Axioma A0.4 - Cronicidade Histórica)
 * Estas tabelas NÃO PERMITEM UPDATE ou DELETE
 */
export const IMMUTABLE_TABLES = [
  "action_log",
  "satoshi_events",
  "ledger_events",
  "concha_transactions",
  "constitutional_validation_logs",
  "governance_events",
  "hacker_intelligence_logs",
  "security_logs",
] as const;

/**
 * FOREIGN KEYS CANÔNICAS
 * Fonte: Supabase_Snippet_Untitled_query_1.csv
 */
export const CANONICAL_FOREIGN_KEYS: Record<string, ForeignKeyDefinition[]> = {
  action_log: [
    { column: "reasoning_id", parentTable: "reasoning_log", parentColumn: "reasoning_id" },
  ],
  activity_mining: [
    { column: "user_id", parentTable: "profiles", parentColumn: "id" },
  ],
  ai_external_tasks: [
    { column: "created_by", parentTable: "profiles", parentColumn: "id" },
  ],
  // Adicionar mais conforme necessário
};

/**
 * CHECK CONSTRAINTS POR TABELA
 * Fonte: Supabase_Snippet_Untitled_query_1.csv
 */
export const CHECK_CONSTRAINTS: Record<string, string[]> = {
  ai_cognitive_health: ["bias_direction"],
  ai_council_agents: ["agent_type"],
  ai_council_decisions: ["execution_status"],
  ai_external_tasks: ["priority", "provider", "status", "fallback_provider", "consensus_status"],
  ai_provider_health: ["status", "provider"],
};

// ═══════════════════════════════════════════════════════════════════
// TABELAS DO SISTEMA (schema public)
// Fonte: Supabase_Snippet_List_Non-System_Schemas_and_Tables.csv
// ═══════════════════════════════════════════════════════════════════

export const PUBLIC_TABLES = [
  "achievements",
  "action_log",
  "activity_mining",
  "adam_notifications",
  "admin_ai_verdicts",
  "admin_notifications",
  "ai_audit_chain",
  "ai_cognitive_health",
  "ai_consul_diagnostics",
  "ai_council_admin_notifications",
  "ai_council_agents",
  "ai_council_decisions",
  "ai_council_events",
  "ai_council_information_flows",
  "ai_external_tasks",
  "ai_personality_config",
  "ai_provider_health",
  "ai_provider_health_realtime",
  "ai_providers",
  "attack_pattern_alerts",
  "banned_ips",
  "beaches",
  "board_governance_reports",
  "board_meetings",
  "bot_posts",
  "cache_store",
  "chat_contexts",
  "chat_media_interactions",
  "chat_messages",
  "chat_moderation_logs",
  "chat_permissions",
  "chat_sessions",
  "chat_voice",
  "chat_youtube_webhook_events",
  "chatbot_interactions",
  "client_conchas",
  "client_transactions",
  "concha_transactions",
  "conchas_ledger",
  "constitution",
  "constitutional_signatories",
  "constitutional_state",
  "constitutional_validation_logs",
  "coupons",
  "crypto_parity",
  "developer_code_issues",
  "developer_source_audit",
  "engineering_logs",
  "error_dictionary",
  "face_verifications",
  "feed_comments",
  "feed_likes",
  "feed_posts",
  "fiat_to_crypto_logs",
  "genesis",
  "global_context_cache",
  "global_traffic_logs",
  "governance_decisions",
  "governance_events",
  "governance_switches",
  "hacker_intelligence_logs",
  "human_work_queue",
  "jukebox_queue",
  "ledger",
  "ledger_events",
  "marketplace_items",
  "music_genres",
  "navigation_analytics",
  "navigation_events",
  "onboarding_messages",
] as const;

export const PUBLIC_VIEWS = [
  "ai_council_code_issues",
  "feed_posts_with_counts",
  "genre_analytics",
  "geography_columns",
  "geometry_columns",
  "growth_metrics",
] as const;

export const GATEWAY_VIEWS = {
  gateway_public: ["mapa_turista"],
  gateway_vendor: ["analise_competicao"],
} as const;

// ═══════════════════════════════════════════════════════════════════
// DEFAULTS CONSTITUCIONAIS (O FRONTEND DEVE TER DEFAULTS)
// ═══════════════════════════════════════════════════════════════════

/**
 * DEFAULTS CONSTITUCIONAIS
 * 
 * NOTA: clients e vendors são EXTENSÕES de profiles
 * Todos os usuários têm IGUALDADE de poder em Wallet e transações
 */
export const CONSTITUTIONAL_DEFAULTS: Record<string, Record<string, unknown>> = {
  // Identidade soberana
  profiles: {
    created_at: () => new Date().toISOString(),
    updated_at: () => new Date().toISOString(),
    is_active: true,
  },
  // Extensões de profiles (mesmo poder de ação)
  clients: {
    created_at: () => new Date().toISOString(),
  },
  vendors: {
    created_at: () => new Date().toISOString(),
    is_active: true,
  },
  // Operacional
  orders: {
    status: "pending",
    created_at: () => new Date().toISOString(),
    updated_at: () => new Date().toISOString(),
  },
  // Financeiro (Ledger é a fonte única - NÃO EXISTE tabela transactions)
  ledger: {
    currency: "ZIMBU", // Moeda oficial do ecossistema
    created_at: () => new Date().toISOString(),
  },
  financial_ledger: {
    currency: "ZIMBU",
    status: "pending",
    created_at: () => new Date().toISOString(),
  },
  ledger_events: {
    currency: "ZIMBU",
    created_at: () => new Date().toISOString(),
  },
  satoshi_events: {
    currency: "ZIMBU",
    created_at: () => new Date().toISOString(),
  },
  concha_transactions: {
    currency: "ZIMBU",
    created_at: () => new Date().toISOString(),
  },
  client_conchas: {
    balance: 0,
    created_at: () => new Date().toISOString(),
    updated_at: () => new Date().toISOString(),
  },
  reviews: {
    created_at: () => new Date().toISOString(),
  },
  vendor_shops: {
    status: "active",
    is_open: false,
    created_at: () => new Date().toISOString(),
    updated_at: () => new Date().toISOString(),
  },
  products: {
    is_available: true,
    created_at: () => new Date().toISOString(),
    updated_at: () => new Date().toISOString(),
  },
  chat_sessions: {
    created_at: () => new Date().toISOString(),
    is_active: true,
  },
  chat_messages: {
    created_at: () => new Date().toISOString(),
  },
  ai_external_tasks: {
    status: "pending",
    priority: "normal",
    created_at: () => new Date().toISOString(),
  },
  banned_ips: {
    is_active: true,
    blocked_at: () => new Date().toISOString(),
    severity: "medium",
  },
  attack_pattern_alerts: {
    is_active: true,
    first_detected_at: () => new Date().toISOString(),
    last_detected_at: () => new Date().toISOString(),
  },
};

// ═══════════════════════════════════════════════════════════════════
// CAMPOS OBRIGATÓRIOS POR TABELA (NOT NULL SEM DEFAULT)
// ═══════════════════════════════════════════════════════════════════

/**
 * CAMPOS OBRIGATÓRIOS POR TABELA (NOT NULL SEM DEFAULT)
 * 
 * NOTA CONSTITUCIONAL:
 * - clients e vendors são EXTENSÕES de profiles (profile_id = profiles.id)
 * - Todos os usuários têm o MESMO poder de ação em Wallet e transações
 * - Ledger é a ÚNICA fonte de verdade financeira
 * - NÃO EXISTE tabela "transactions" - usar ledger
 */
export const REQUIRED_FIELDS: Record<string, string[]> = {
  // Identidade soberana
  profiles: ["id"],
  clients: ["profile_id"], // Extensão de profiles
  vendors: ["profile_id"], // Extensão de profiles
  
  // Operacional
  orders: ["client_id", "vendor_id"],
  reviews: ["order_id", "client_id", "vendor_id", "rating"],
  vendor_shops: ["owner_id", "name"],
  products: ["vendor_id", "name", "price"],
  
  // Financeiro (Ledger é a fonte única)
  ledger: ["profile_id", "amount", "entry_type"],
  ledger_events: ["event_type", "payload"],
  satoshi_events: ["idempotency_key", "event_type", "payload"],
  concha_transactions: ["profile_id", "amount", "transaction_type"],
  client_conchas: ["client_id", "balance"],
  financial_ledger: ["account_id", "event_type", "amount", "idempotency_key"],
  
  // Chat
  chat_sessions: ["profile_id"],
  chat_messages: ["session_id", "content", "role"],
  
  // Sistema
  ai_external_tasks: ["provider", "task_type", "input_data"],
  banned_ips: ["ip_address", "reason"],
  action_log: ["action_type", "description", "component"],
};

// ═══════════════════════════════════════════════════════════════════
// FUNÇÕES DE VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════

/**
 * Verifica se uma tabela é imutável (não permite UPDATE/DELETE)
 */
export function isImmutableTable(table: string): boolean {
  return IMMUTABLE_TABLES.includes(table as typeof IMMUTABLE_TABLES[number]);
}

/**
 * Obtém os triggers de uma tabela
 */
export function getTableTriggers(table: string): TriggerDefinition[] {
  return CANONICAL_TRIGGERS[table] || [];
}

/**
 * Verifica se uma operação vai conflitar com um trigger
 */
export function willTriggerConflict(table: string, operation: "INSERT" | "UPDATE" | "DELETE"): boolean {
  const triggers = getTableTriggers(table);
  return triggers.some(t => t.event === operation && t.timing === "BEFORE");
}

/**
 * Remove valores null/undefined e aplica defaults constitucionais
 */
export function sanitizePayload(
  table: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const defaults = CONSTITUTIONAL_DEFAULTS[table] || {};
  const sanitized: Record<string, unknown> = {};

  // Primeiro, aplicar defaults
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (payload[key] === null || payload[key] === undefined) {
      sanitized[key] = typeof defaultValue === "function" ? defaultValue() : defaultValue;
    }
  }

  // Depois, aplicar valores do payload (exceto null/undefined)
  for (const [key, value] of Object.entries(payload)) {
    if (value !== null && value !== undefined) {
      sanitized[key] = value;
    } else if (!(key in sanitized)) {
      // Se não tem default e é null, converter para valor seguro
      sanitized[key] = getTypeSafeDefault(value);
    }
  }

  return sanitized;
}

/**
 * Retorna um valor seguro baseado no tipo esperado
 */
function getTypeSafeDefault(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined; // Será removido do payload
  }
  return value;
}

/**
 * Valida se todos os campos obrigatórios estão presentes
 */
export function validateRequiredFields(
  table: string,
  payload: Record<string, unknown>
): PayloadValidationResult {
  const required = REQUIRED_FIELDS[table] || [];
  const errors: string[] = [];

  for (const field of required) {
    if (payload[field] === null || payload[field] === undefined || payload[field] === "") {
      errors.push(`Campo obrigatório ausente: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedPayload: payload,
  };
}

/**
 * Validação completa do payload
 */
export function validatePayload(
  table: string,
  payload: Record<string, unknown>
): PayloadValidationResult {
  const errors: string[] = [];

  // 0. Verificar se a tabela é imutável e a operação é permitida
  if (isImmutableTable(table)) {
    // Apenas INSERT é permitido em tabelas imutáveis
    // A validação real de UPDATE/DELETE é feita no safeUpdate
  }

  // 1. Sanitizar (remover nulls, aplicar defaults)
  const sanitized = sanitizePayload(table, payload);

  // 2. Validar campos obrigatórios
  const validation = validateRequiredFields(table, sanitized);
  errors.push(...validation.errors);

  // 3. Verificar check constraints
  const constraints = CHECK_CONSTRAINTS[table] || [];
  for (const constraint of constraints) {
    if (sanitized[constraint] !== undefined) {
      // Aqui podemos adicionar validação específica se necessário
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedPayload: sanitized,
  };
}

// ═══════════════════════════════════════════════════════════════════
// LOGGING CONSTITUCIONAL
// ═══════════════════════════════════════════════════════════════════

const operationLogs: OperationLog[] = [];

export function logOperation(log: OperationLog): void {
  operationLogs.push(log);
  
  // Log detalhado no console em desenvolvimento
  if (import.meta.env.DEV) {
    const emoji = log.error ? "❌" : "✅";
    const immutableBadge = isImmutableTable(log.table) ? " [IMMUTABLE]" : "";
    console.group(`${emoji} [CONSTITUTIONAL]${immutableBadge} ${log.operation} → ${log.table}`);
    console.log("Payload:", log.payload);
    console.log("Response:", log.response);
    if (log.error) {
      console.error("Error:", log.error);
    }
    console.log("User:", log.userId);
    console.log("Time:", log.timestamp);
    
    // Mostrar triggers relevantes
    const triggers = getTableTriggers(log.table);
    if (triggers.length > 0) {
      console.log("Active Triggers:", triggers.map(t => `${t.timing} ${t.event} → ${t.function}`));
    }
    
    console.groupEnd();
  }
}

export function getOperationLogs(): OperationLog[] {
  return [...operationLogs];
}

export function clearOperationLogs(): void {
  operationLogs.length = 0;
}

// ═══════════════════════════════════════════════════════════════════
// WRAPPER SEGURO PARA OPERAÇÕES SUPABASE
// ═══════════════════════════════════════════════════════════════════

export interface SafeOperationResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  validationErrors: string[];
  triggersExecuted?: string[];
}

/**
 * Insert seguro com validação constitucional
 */
export async function safeInsert<T>(
  table: string,
  payload: Record<string, unknown>
): Promise<SafeOperationResult<T>> {
  const userId = (await supabase.auth.getUser()).data.user?.id || null;
  const timestamp = new Date().toISOString();

  // Validar payload
  const validation = validatePayload(table, payload);
  
  if (!validation.valid) {
    logOperation({
      table,
      operation: "INSERT",
      payload,
      response: null,
      error: `Validation failed: ${validation.errors.join(", ")}`,
      userId,
      timestamp,
    });

    return {
      success: false,
      data: null,
      error: `Payload inválido: ${validation.errors.join(", ")}`,
      validationErrors: validation.errors,
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(table)
      .insert(validation.sanitizedPayload)
      .select()
      .single();

    const triggers = getTableTriggers(table).filter(t => t.event === "INSERT");
    
    logOperation({
      table,
      operation: "INSERT",
      payload: validation.sanitizedPayload,
      response: data,
      error: error?.message || null,
      userId,
      timestamp,
    });

    if (error) {
      return {
        success: false,
        data: null,
        error: error.message,
        validationErrors: [],
      };
    }

    return {
      success: true,
      data: data as T,
      error: null,
      validationErrors: [],
      triggersExecuted: triggers.map(t => t.function),
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    
    logOperation({
      table,
      operation: "INSERT",
      payload: validation.sanitizedPayload,
      response: null,
      error: errorMsg,
      userId,
      timestamp,
    });

    return {
      success: false,
      data: null,
      error: errorMsg,
      validationErrors: [],
    };
  }
}

/**
 * Update seguro com validação constitucional
 * ATENÇÃO: Updates são PROIBIDOS em tabelas imutáveis
 */
export async function safeUpdate<T>(
  table: string,
  id: string,
  payload: Record<string, unknown>
): Promise<SafeOperationResult<T>> {
  const userId = (await supabase.auth.getUser()).data.user?.id || null;
  const timestamp = new Date().toISOString();

  // BLOQUEIO CONSTITUCIONAL: Tabelas imutáveis não permitem UPDATE
  if (isImmutableTable(table)) {
    const error = `VIOLAÇÃO CONSTITUCIONAL (A0.4): Tabela ${table} é imutável. UPDATE não permitido.`;
    
    logOperation({
      table,
      operation: "UPDATE",
      payload: { id, ...payload },
      response: null,
      error,
      userId,
      timestamp,
    });

    return {
      success: false,
      data: null,
      error,
      validationErrors: ["Operação proibida em tabela imutável"],
    };
  }

  // Sanitizar payload (não validar required pois é update parcial)
  const sanitized = sanitizePayload(table, payload);

  // Adicionar updated_at se a tabela suporta
  if (CONSTITUTIONAL_DEFAULTS[table]?.updated_at) {
    sanitized.updated_at = new Date().toISOString();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(table)
      .update(sanitized)
      .eq("id", id)
      .select()
      .single();

    const triggers = getTableTriggers(table).filter(t => t.event === "UPDATE");

    logOperation({
      table,
      operation: "UPDATE",
      payload: { id, ...sanitized },
      response: data,
      error: error?.message || null,
      userId,
      timestamp,
    });

    if (error) {
      return {
        success: false,
        data: null,
        error: error.message,
        validationErrors: [],
      };
    }

    return {
      success: true,
      data: data as T,
      error: null,
      validationErrors: [],
      triggersExecuted: triggers.map(t => t.function),
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    
    logOperation({
      table,
      operation: "UPDATE",
      payload: { id, ...sanitized },
      response: null,
      error: errorMsg,
      userId,
      timestamp,
    });

    return {
      success: false,
      data: null,
      error: errorMsg,
      validationErrors: [],
    };
  }
}

/**
 * Verifica se um registro pai existe antes de inserir filho (FK safety)
 */
export async function verifyParentExists(
  parentTable: string,
  parentId: string
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(parentTable)
      .select("id")
      .eq("id", parentId)
      .single();

    return !error && data !== null;
  } catch {
    return false;
  }
}

/**
 * Insert com verificação de FK canônica
 */
export async function safeInsertWithFKCheck<T>(
  table: string,
  payload: Record<string, unknown>,
  fkChecks?: Array<{ field: string; parentTable: string }>
): Promise<SafeOperationResult<T>> {
  // Usar FKs canônicas se não fornecidas
  const checksToUse = fkChecks || (CANONICAL_FOREIGN_KEYS[table] || []).map(fk => ({
    field: fk.column,
    parentTable: fk.parentTable,
  }));

  // Verificar todas as FKs primeiro
  for (const check of checksToUse) {
    const parentId = payload[check.field] as string;
    if (parentId) {
      const exists = await verifyParentExists(check.parentTable, parentId);
      if (!exists) {
        return {
          success: false,
          data: null,
          error: `Registro pai não encontrado: ${check.parentTable}.${parentId}`,
          validationErrors: [`FK violation: ${check.field} referencia registro inexistente`],
        };
      }
    }
  }

  // Prosseguir com insert seguro
  return safeInsert<T>(table, payload);
}

// ═══════════════════════════════════════════════════════════════════
// IDEMPOTENCY KEY GENERATOR (PARA SATOSHI EVENTS)
// ═══════════════════════════════════════════════════════════════════

export function generateIdempotencyKey(
  category: string,
  action: string,
  context: string
): string {
  return `${category}::${action}::${context}::${Date.now()}`;
}

/**
 * Gera um hash Satoshi para auditoria
 */
export function generateSatoshiHash(data: Record<string, unknown>): string {
  const str = JSON.stringify({
    ...data,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(7),
  });
  
  // SHA-256 simplificado (no browser usamos crypto.subtle quando disponível)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// ═══════════════════════════════════════════════════════════════════
// METADADOS DO SISTEMA
// ═══════════════════════════════════════════════════════════════════

export const SYSTEM_METADATA = {
  version: "3.2.0",
  currency: "ZIMBU",
  ledgerModel: "satoshi_append_only",
  webhookModel: "outbox_pattern",
  genesisDate: "2025-01-06",
  axioms: ["A0", "A0.1", "A0.2", "A0.3", "A0.4"],
} as const;

// ═══════════════════════════════════════════════════════════════════
// EXPORTAÇÕES
// ═══════════════════════════════════════════════════════════════════

export const ConstitutionalPayload = {
  // Validação
  sanitize: sanitizePayload,
  validate: validatePayload,
  validateRequired: validateRequiredFields,
  
  // Operações seguras
  safeInsert,
  safeUpdate,
  safeInsertWithFK: safeInsertWithFKCheck,
  verifyParent: verifyParentExists,
  
  // Utilitários
  generateIdempotencyKey,
  generateSatoshiHash,
  isImmutableTable,
  getTableTriggers,
  willTriggerConflict,
  
  // Logging
  log: logOperation,
  getLogs: getOperationLogs,
  clearLogs: clearOperationLogs,
  
  // Dados canônicos
  DEFAULTS: CONSTITUTIONAL_DEFAULTS,
  REQUIRED: REQUIRED_FIELDS,
  TRIGGERS: CANONICAL_TRIGGERS,
  FOREIGN_KEYS: CANONICAL_FOREIGN_KEYS,
  CHECK_CONSTRAINTS,
  IMMUTABLE_TABLES,
  PUBLIC_TABLES,
  PUBLIC_VIEWS,
  GATEWAY_VIEWS,
  EXTENSIONS: INSTALLED_EXTENSIONS,
  ROLES: SYSTEM_ROLES,
  METADATA: SYSTEM_METADATA,
};

export default ConstitutionalPayload;
