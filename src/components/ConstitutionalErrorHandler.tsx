import { AlertTriangle, Shield, FileWarning, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConstitutionalError {
  code: 'A0_VIOLATION' | 'A0.5_VIOLATION' | 'SEQUENCE_BREAK' | 'CONSTITUTIONAL_VIOLATION' | 'UNKNOWN';
  message: string;
  originalError?: string;
}

// Parser de erros constitucionais
export function parseConstitutionalError(error: unknown): ConstitutionalError {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('A0_VIOLATION')) {
    return {
      code: 'A0_VIOLATION',
      message: 'O Ledger Satoshi é imutável. Operações de DELETE ou UPDATE são proibidas pelo Axioma A0.',
      originalError: message,
    };
  }

  if (message.includes('A0.5_VIOLATION')) {
    return {
      code: 'A0.5_VIOLATION',
      message: 'O evento GENESIS é sagrado e não pode ser alterado. Protegido pelo Axioma A0.5.',
      originalError: message,
    };
  }

  if (message.includes('SEQUENCE BREAK')) {
    return {
      code: 'SEQUENCE_BREAK',
      message: 'Houve uma tentativa de quebra de sequência no Ledger. A integridade foi preservada.',
      originalError: message,
    };
  }

  if (message.includes('CONSTITUTIONAL')) {
    return {
      code: 'CONSTITUTIONAL_VIOLATION',
      message: 'Esta ação viola a Constituição Técnica da plataforma PRAIEIRO.',
      originalError: message,
    };
  }

  return {
    code: 'UNKNOWN',
    message: message || 'Erro desconhecido',
    originalError: message,
  };
}

interface ConstitutionalErrorAlertProps {
  error: ConstitutionalError;
  onRetry?: () => void;
}

export function ConstitutionalErrorAlert({ error, onRetry }: ConstitutionalErrorAlertProps) {
  const getIcon = () => {
    switch (error.code) {
      case 'A0_VIOLATION':
      case 'A0.5_VIOLATION':
        return <Shield className="h-5 w-5" />;
      case 'SEQUENCE_BREAK':
        return <FileWarning className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    switch (error.code) {
      case 'A0_VIOLATION':
        return 'Violação do Axioma A0';
      case 'A0.5_VIOLATION':
        return 'Violação do Axioma A0.5';
      case 'SEQUENCE_BREAK':
        return 'Quebra de Sequência';
      case 'CONSTITUTIONAL_VIOLATION':
        return 'Violação Constitucional';
      default:
        return 'Erro no Sistema';
    }
  };

  return (
    <Alert variant="destructive" className="border-destructive/50">
      {getIcon()}
      <AlertTitle>{getTitle()}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{error.message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Tentar novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface ConstitutionalErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: ConstitutionalError | null;
  onRetry?: () => void;
}

export function ConstitutionalErrorDialog({
  open,
  onOpenChange,
  error,
  onRetry,
}: ConstitutionalErrorDialogProps) {
  if (!error) return null;

  const getDescription = () => {
    switch (error.code) {
      case 'A0_VIOLATION':
        return 'O ecossistema PRAIEIRO utiliza um Ledger imutável baseado nos princípios de Satoshi. Nenhum registro pode ser alterado ou removido após sua criação, garantindo transparência e confiança absoluta.';
      case 'A0.5_VIOLATION':
        return 'O evento GENESIS é a origem de toda a cadeia de blocos do sistema. Ele é protegido por múltiplas camadas de segurança e nunca pode ser modificado.';
      case 'SEQUENCE_BREAK':
        return 'Cada evento no Ledger possui uma sequência única e encadeada. Esta operação tentou violar essa ordem, mas foi bloqueada automaticamente.';
      default:
        return 'A operação solicitada não é permitida pelas regras da plataforma. Isso garante a integridade e segurança de todos os usuários.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-destructive" />
          </div>
          <DialogTitle>Proteção Constitucional Ativada</DialogTitle>
          <DialogDescription className="space-y-3">
            <p>{error.message}</p>
            <p className="text-xs">{getDescription()}</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Entendi
          </Button>
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar outra ação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
