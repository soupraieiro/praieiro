/**
 * Satoshi Error Dictionary
 * Maps PostgreSQL error codes to user-friendly messages
 */

export interface SatoshiError {
  code: string;
  title: string;
  message: string;
  action: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export const SATOSHI_ERROR_DICTIONARY: Record<string, SatoshiError> = {
  // Class 42 - Syntax Error or Access Rule Violation
  '42P01': {
    code: '42P01',
    title: 'Tabela Não Encontrada',
    message: 'A tabela solicitada não existe no banco de dados.',
    action: 'Verifique se a migração foi executada corretamente.',
    severity: 'critical'
  },
  '42601': {
    code: '42601',
    title: 'Erro de Sintaxe SQL',
    message: 'Comando SQL mal formatado detectado.',
    action: 'Revise a estrutura da query no Ledger.',
    severity: 'error'
  },
  '42710': {
    code: '42710',
    title: 'Objeto Duplicado',
    message: 'Tentativa de criar objeto já existente.',
    action: 'Use DROP IF EXISTS antes de CREATE.',
    severity: 'warning'
  },
  '42P13': {
    code: '42P13',
    title: 'Definição de Função Inválida',
    message: 'Função não pode ser alterada sem remoção prévia.',
    action: 'Execute DROP FUNCTION antes de redefinir.',
    severity: 'error'
  },
  
  // Class 23 - Integrity Constraint Violation
  '23502': {
    code: '23502',
    title: 'Violação NOT NULL',
    message: 'Campo obrigatório não foi preenchido.',
    action: 'Preencha todos os campos obrigatórios do Protocolo.',
    severity: 'error'
  },
  '23503': {
    code: '23503',
    title: 'Violação de Chave Estrangeira',
    message: 'Referência a registro inexistente.',
    action: 'Verifique se a entidade referenciada existe.',
    severity: 'error'
  },
  '23505': {
    code: '23505',
    title: 'Violação de Unicidade',
    message: 'Registro duplicado detectado no Ledger.',
    action: 'Use um identificador único para cada entrada.',
    severity: 'warning'
  },
  '23514': {
    code: '23514',
    title: 'Violação de CHECK',
    message: 'Valor fora das restrições permitidas.',
    action: 'Verifique os limites definidos no Protocolo.',
    severity: 'error'
  },
  
  // Class 22 - Data Exception
  '22001': {
    code: '22001',
    title: 'String Muito Longa',
    message: 'Texto excede o limite do campo.',
    action: 'Reduza o tamanho do texto inserido.',
    severity: 'warning'
  },
  '22P02': {
    code: '22P02',
    title: 'Sintaxe Inválida',
    message: 'Formato de dados não reconhecido.',
    action: 'Verifique o tipo de dado esperado.',
    severity: 'error'
  },
  
  // Class 25 - Invalid Transaction State
  '25P02': {
    code: '25P02',
    title: 'Transação em Estado de Aborto',
    message: 'Transação anterior falhou e não foi rollback.',
    action: 'Reinicie a sessão de banco.',
    severity: 'critical'
  },
  
  // Class 28 - Invalid Authorization
  '28P01': {
    code: '28P01',
    title: 'Autenticação Inválida',
    message: 'Credenciais do Satoshi Engine rejeitadas.',
    action: 'Verifique as chaves de API.',
    severity: 'critical'
  },
  
  // Class 42 - RLS Violation (Supabase specific)
  'PGRST301': {
    code: 'PGRST301',
    title: 'Violação RLS',
    message: 'Política de segurança bloqueou a operação.',
    action: 'Verifique as permissões de acesso.',
    severity: 'error'
  },
  'PGRST116': {
    code: 'PGRST116',
    title: 'Registro Não Encontrado',
    message: 'Nenhum resultado para a consulta.',
    action: 'Verifique os filtros aplicados.',
    severity: 'info'
  },
  
  // Network/Connection errors
  'NETWORK_ERROR': {
    code: 'NETWORK_ERROR',
    title: 'Erro de Rede',
    message: 'Falha na comunicação com o Ledger Satoshi.',
    action: 'Verifique sua conexão com a internet.',
    severity: 'critical'
  },
  'TIMEOUT': {
    code: 'TIMEOUT',
    title: 'Tempo Esgotado',
    message: 'Operação demorou mais que o permitido.',
    action: 'Tente novamente em alguns segundos.',
    severity: 'warning'
  },
  
  // Satoshi Protocol specific
  'SATOSHI_CHECKSUM_INVALID': {
    code: 'SATOSHI_CHECKSUM_INVALID',
    title: 'Checksum Inválido',
    message: 'Integridade de dados comprometida.',
    action: 'Execute verify_satoshi_integrity para diagnóstico.',
    severity: 'critical'
  },
  'SATOSHI_CHAIN_BROKEN': {
    code: 'SATOSHI_CHAIN_BROKEN',
    title: 'Cadeia Quebrada',
    message: 'Sequência de hashes interrompida.',
    action: 'Contate o administrador do Protocolo.',
    severity: 'critical'
  },
  'SATOSHI_CONSENSUS_PENDING': {
    code: 'SATOSHI_CONSENSUS_PENDING',
    title: 'Consenso Pendente',
    message: 'Proposta do Conselho de IA aguarda validação.',
    action: 'Aguarde até que o satoshi_hash seja validado.',
    severity: 'warning'
  },
  'SATOSHI_INSUFFICIENT_BALANCE': {
    code: 'SATOSHI_INSUFFICIENT_BALANCE',
    title: 'Saldo Insuficiente',
    message: 'Não há Conchas suficientes para esta operação.',
    action: 'Adicione créditos à sua carteira digital.',
    severity: 'error'
  }
};

/**
 * Get formatted error from PostgreSQL error code
 */
export function getSatoshiError(code: string | undefined): SatoshiError {
  if (!code) {
    return {
      code: 'UNKNOWN',
      title: 'Erro Desconhecido',
      message: 'Ocorreu um erro não mapeado no Protocolo.',
      action: 'Tente novamente ou contate o suporte.',
      severity: 'error'
    };
  }
  
  return SATOSHI_ERROR_DICTIONARY[code] || {
    code,
    title: `Erro ${code}`,
    message: 'Erro não catalogado no dicionário Satoshi.',
    action: 'Consulte os logs do sistema.',
    severity: 'warning'
  };
}

/**
 * Extract PostgreSQL error code from Supabase error
 */
export function extractErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.code === 'string') return e.code;
    if (typeof e.message === 'string') {
      const match = e.message.match(/\b(\d{5}|PGRST\d+)\b/);
      if (match) return match[1];
    }
    if (e.name === 'TypeError' || e.name === 'NetworkError') {
      return 'NETWORK_ERROR';
    }
  }
  return 'UNKNOWN';
}

/**
 * Format error for toast notification
 */
export function formatSatoshiToast(error: unknown): { title: string; description: string } {
  const code = extractErrorCode(error);
  const satoshiError = getSatoshiError(code);
  return {
    title: `[${satoshiError.code}] ${satoshiError.title}`,
    description: satoshiError.message
  };
}
