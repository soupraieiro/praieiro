/**
 * COMPONENTE DE FEEDBACK PARA OPERAÇÕES CONSTITUCIONAIS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Mostra feedback visual para operações de banco que podem falhar por:
 * - Campos obrigatórios ausentes
 * - Violação de FK
 * - Bloqueio RLS
 * - Tabela imutável
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Database, 
  Lock,
  RefreshCw,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { SafeOperationResult } from "@/lib/constitutionalPayload";

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

interface ConstitutionalFeedbackProps<T> {
  result: SafeOperationResult<T> | null;
  isLoading?: boolean;
  isRLSBlocked?: boolean;
  showSuccess?: boolean;
  onRetry?: () => void;
  className?: string;
}

interface ValidationErrorListProps {
  errors: string[];
  title?: string;
}

interface OperationStatusBadgeProps {
  isLoading: boolean;
  success: boolean | null;
  isRLSBlocked?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export function ConstitutionalFeedback<T>({
  result,
  isLoading = false,
  isRLSBlocked = false,
  showSuccess = true,
  onRetry,
  className = "",
}: ConstitutionalFeedbackProps<T>) {
  if (isLoading) {
    return (
      <Alert className={`animate-pulse ${className}`}>
        <Database className="h-4 w-4" />
        <AlertTitle>Processando...</AlertTitle>
        <AlertDescription>
          Validando dados e executando operação constitucional.
        </AlertDescription>
      </Alert>
    );
  }

  if (!result) {
    return null;
  }

  // Sucesso
  if (result.success && showSuccess) {
    return (
      <Alert className={`border-green-500/50 bg-green-500/10 ${className}`}>
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-600">Operação Realizada</AlertTitle>
        <AlertDescription>
          Dados salvos com sucesso.
          {result.triggersExecuted && result.triggersExecuted.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">Triggers executados:</span>
              {result.triggersExecuted.map((trigger, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {trigger}
                </Badge>
              ))}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Erro de validação
  if (result.validationErrors.length > 0) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Dados Incompletos</AlertTitle>
        <AlertDescription>
          <ValidationErrorList errors={result.validationErrors} />
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Corrigir e Tentar Novamente
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Bloqueio RLS
  if (isRLSBlocked || (result.error && isRLSErrorMessage(result.error))) {
    return (
      <Alert variant="destructive" className={className}>
        <Lock className="h-4 w-4" />
        <AlertTitle>Acesso Negado (RLS)</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            Você não tem permissão para executar esta operação.
            Verifique se está autenticado com a conta correta.
          </p>
          <Badge variant="outline" className="text-xs">
            Política de segurança ativa
          </Badge>
        </AlertDescription>
      </Alert>
    );
  }

  // Erro de FK
  if (result.error?.includes("FK violation") || result.error?.includes("foreign key")) {
    return (
      <Alert variant="destructive" className={className}>
        <Database className="h-4 w-4" />
        <AlertTitle>Dependência Ausente</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            Este registro depende de outro que não existe.
            Crie o registro pai primeiro.
          </p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {result.error}
          </code>
        </AlertDescription>
      </Alert>
    );
  }

  // Erro de tabela imutável
  if (result.error?.includes("imutável") || result.error?.includes("VIOLAÇÃO CONSTITUCIONAL")) {
    return (
      <Alert variant="destructive" className={className}>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Tabela Imutável</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            Esta tabela é protegida pela Constituição e não permite alterações.
            Apenas novos registros podem ser adicionados (INSERT).
          </p>
          <Badge variant="secondary" className="text-xs">
            Axioma A0.4 - Cronicidade Histórica
          </Badge>
        </AlertDescription>
      </Alert>
    );
  }

  // Erro genérico
  if (result.error) {
    return (
      <Alert variant="destructive" className={className}>
        <XCircle className="h-4 w-4" />
        <AlertTitle>Erro na Operação</AlertTitle>
        <AlertDescription>
          <p className="mb-2">{result.error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════

export function ValidationErrorList({ errors, title = "Campos obrigatórios:" }: ValidationErrorListProps) {
  if (errors.length === 0) return null;

  return (
    <div className="mt-2">
      <p className="text-sm font-medium mb-1">{title}</p>
      <ul className="list-disc list-inside space-y-1">
        {errors.map((error, index) => (
          <li key={index} className="text-sm">
            {error}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OperationStatusBadge({ 
  isLoading, 
  success, 
  isRLSBlocked 
}: OperationStatusBadgeProps) {
  if (isLoading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        <Database className="h-3 w-3 mr-1" />
        Processando...
      </Badge>
    );
  }

  if (isRLSBlocked) {
    return (
      <Badge variant="destructive">
        <Lock className="h-3 w-3 mr-1" />
        Bloqueado
      </Badge>
    );
  }

  if (success === true) {
    return (
      <Badge variant="default" className="bg-green-500">
        <ShieldCheck className="h-3 w-3 mr-1" />
        Sucesso
      </Badge>
    );
  }

  if (success === false) {
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Erro
      </Badge>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════

function isRLSErrorMessage(message: string): boolean {
  const rlsIndicators = [
    "permission denied",
    "RLS",
    "row-level security",
    "policy",
    "violates row-level security",
  ];
  return rlsIndicators.some(indicator => 
    message.toLowerCase().includes(indicator.toLowerCase())
  );
}

export default ConstitutionalFeedback;
