/**
 * EXPORTS CENTRALIZADOS - SISTEMA CONSTITUCIONAL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este arquivo exporta todos os componentes, hooks e utilitários
 * do sistema constitucional PRAIEIRO.
 * 
 * AXIOMA FUNDAMENTAL:
 * profiles.id === auth.users.id (IDENTIDADE SOBERANA)
 * NÃO EXISTE profiles.user_id
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// HOOKS CONSTITUCIONAIS
// ═══════════════════════════════════════════════════════════════════

export { 
  useConstitutionalOperation,
  useSatoshiEvent,
  useLedgerEntry,
} from "@/hooks/useConstitutionalOperation";

export {
  useConstitutionalQuery,
  useRequireAuth,
  getRLSBlockMessage,
  getRLSBlockSeverity,
  type RLSBlockReason,
  type ConstitutionalQueryResult,
} from "@/hooks/useConstitutionalQuery";

// Hook do Ledger Financeiro Satoshi (única fonte de verdade financeira)
export {
  useFinancialLedger,
  type FinancialEvent,
  type FinancialBalance,
} from "@/hooks/useFinancialLedger";

// ═══════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════

export {
  ConstitutionalRLSGuard,
  RLSBlockAlert,
  EmptyStateWithRLSCheck,
  withRLSProtection,
} from "@/components/ConstitutionalRLSGuard";

export {
  ConstitutionalFeedback,
  ValidationErrorList,
  OperationStatusBadge,
} from "@/components/ConstitutionalFeedback";

export {
  ConstitutionalErrorAlert,
  ConstitutionalErrorDialog,
  parseConstitutionalError,
} from "@/components/ConstitutionalErrorHandler";

export {
  ConstitutionalFormWrapper,
  ConstitutionalField,
} from "@/components/ConstitutionalFormWrapper";

// ═══════════════════════════════════════════════════════════════════
// BIBLIOTECA CORE
// ═══════════════════════════════════════════════════════════════════

export {
  ConstitutionalPayload,
  // Funções
  sanitizePayload,
  validatePayload,
  validateRequiredFields,
  safeInsert,
  safeUpdate,
  safeInsertWithFKCheck,
  verifyParentExists,
  generateIdempotencyKey,
  generateSatoshiHash,
  isImmutableTable,
  getTableTriggers,
  willTriggerConflict,
  logOperation,
  getOperationLogs,
  clearOperationLogs,
  // Constantes
  CONSTITUTIONAL_DEFAULTS,
  REQUIRED_FIELDS,
  CANONICAL_TRIGGERS,
  CANONICAL_FOREIGN_KEYS,
  CHECK_CONSTRAINTS,
  IMMUTABLE_TABLES,
  PUBLIC_TABLES,
  PUBLIC_VIEWS,
  GATEWAY_VIEWS,
  INSTALLED_EXTENSIONS,
  SYSTEM_ROLES,
  SYSTEM_METADATA,
  // Tipos
  type PayloadValidationResult,
  type OperationLog,
  type TriggerDefinition,
  type ForeignKeyDefinition,
  type TableSchema,
  type SafeOperationResult,
} from "@/lib/constitutionalPayload";
