/**
 * CONSTITUTIONAL FORM WRAPPER
 * Wrapper para formulários que garante validação constitucional antes do submit.
 * Previne envio de dados incompletos ao banco.
 */

import React, { useCallback, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { ConstitutionalPayload, PayloadValidationResult } from "@/lib/constitutionalPayload";

interface ConstitutionalFormWrapperProps {
  children: React.ReactNode;
  table: string;
  onValidSubmit: (sanitizedPayload: Record<string, unknown>) => Promise<void>;
  getPayload: () => Record<string, unknown>;
  className?: string;
  showValidationStatus?: boolean;
}

export function ConstitutionalFormWrapper({
  children,
  table,
  onValidSubmit,
  getPayload,
  className = "",
  showValidationStatus = false,
}: ConstitutionalFormWrapperProps) {
  const [validationResult, setValidationResult] = useState<PayloadValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      // Obter payload do formulário
      const payload = getPayload();

      // Validar constitucionalmente
      const validation = ConstitutionalPayload.validate(table, payload);
      setValidationResult(validation);

      if (!validation.valid) {
        console.error("[CONSTITUTIONAL] Validação falhou:", validation.errors);
        return;
      }

      setIsSubmitting(true);

      try {
        await onValidSubmit(validation.sanitizedPayload);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro ao submeter formulário";
        setSubmitError(errorMsg);
        console.error("[CONSTITUTIONAL] Submit error:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [table, getPayload, onValidSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className={className}>
      {/* Indicador de Proteção Constitucional */}
      {showValidationStatus && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Protegido por validação constitucional</span>
        </div>
      )}

      {/* Erros de Validação */}
      {validationResult && !validationResult.valid && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dados incompletos</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {validationResult.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Erro de Submit */}
      {submitError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao salvar</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Sucesso */}
      {validationResult?.valid && !submitError && !isSubmitting && (
        <Alert className="mb-4 border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Validação OK</AlertTitle>
          <AlertDescription className="text-green-600/80">
            Todos os campos obrigatórios estão preenchidos.
          </AlertDescription>
        </Alert>
      )}

      {/* Conteúdo do Formulário */}
      {children}

      {/* Estado de Loading */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE DE CAMPO COM VALIDAÇÃO VISUAL
// ═══════════════════════════════════════════════════════════════════

interface ConstitutionalFieldProps {
  name: string;
  label: string;
  required?: boolean;
  value: unknown;
  children: React.ReactNode;
  className?: string;
}

export function ConstitutionalField({
  name,
  label,
  required = false,
  value,
  children,
  className = "",
}: ConstitutionalFieldProps) {
  const isEmpty = value === null || value === undefined || value === "";
  const showWarning = required && isEmpty;

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className="text-sm font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
        {showWarning && (
          <AlertTriangle className="h-3 w-3 text-amber-500" />
        )}
      </label>
      {children}
      {showWarning && (
        <p className="text-xs text-amber-500">
          Este campo é obrigatório
        </p>
      )}
    </div>
  );
}

export default ConstitutionalFormWrapper;
