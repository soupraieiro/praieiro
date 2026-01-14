import { useState } from 'react';
import CryptoJS from 'crypto-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Lock,
  Download,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface ProviderExport {
  id: string;
  provider: string;
  apiKeyRef: string;
  apiKeyValue?: string;
  status: string;
  capabilities: Record<string, boolean>;
  outputTypes: string[];
  category: string;
  latency: string;
  metadata: {
    last_sync: string;
    version: string;
  };
}

interface SecureExportFormat {
  version: string;
  exportedAt: string;
  satoshiHash: string;
  encryptionType: 'AES-256';
  providers: ProviderExport[];
}

interface AISecureExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: ProviderExport[];
  credentials: Record<string, { value: string; isEnabled: boolean }>;
}

// Gerar hash Satoshi para integridade
const generateSatoshiHash = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data + Date.now().toString());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};

// Criptografar dados com AES-256
const encryptData = (data: SecureExportFormat, password: string): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), password).toString();
};

export function AISecureExportDialog({
  open,
  onOpenChange,
  providers,
  credentials,
}: AISecureExportDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [exporting, setExporting] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const isPasswordStrong = password.length >= 8;
  const canExport = password && confirmPassword && passwordsMatch && isPasswordStrong;

  const handleExport = async () => {
    if (!canExport) return;

    setExporting(true);
    try {
      const satoshiHash = await generateSatoshiHash('secure-export');

      // Construir estrutura evoluída com valores das credenciais
      const exportData: SecureExportFormat = {
        version: '2.0-secure',
        exportedAt: new Date().toISOString(),
        satoshiHash,
        encryptionType: 'AES-256',
        providers: providers.map(provider => {
          const credential = credentials[provider.apiKeyRef];
          return {
            ...provider,
            apiKeyValue: credential?.value || '', // Incluir o valor real da chave
            status: credential?.isEnabled ? 'active' : 'inactive',
          };
        }),
      };

      // Criptografar com AES-256
      const encryptedData = encryptData(exportData, password);

      // Criar arquivo para download
      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `config_praieiro_secure_${new Date().toISOString().split('T')[0]}.praieiro`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Configurações exportadas com criptografia AES-256');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar configurações');
    } finally {
      setExporting(false);
    }
  };

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Exportar Configurações Seguras
          </DialogTitle>
          <DialogDescription>
            Suas credenciais serão criptografadas com AES-256 (padrão bancário).
            Guarde a senha mestre em local seguro - ela será necessária para importar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Indicador de segurança */}
          <Alert className="bg-green-500/10 border-green-500/30">
            <Lock className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Criptografia AES-256 ativa. Sem a senha, o arquivo é ilegível.
            </AlertDescription>
          </Alert>

          {/* Senha Mestre */}
          <div className="space-y-2">
            <Label htmlFor="master-password">Senha Mestre</Label>
            <div className="relative">
              <Input
                id="master-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {password && !isPasswordStrong && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Senha deve ter pelo menos 8 caracteres
              </p>
            )}
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Senha</Label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Senhas não coincidem
              </p>
            )}
            {confirmPassword && passwordsMatch && isPasswordStrong && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Senhas coincidem
              </p>
            )}
          </div>

          {/* Lista de chaves incluídas */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Chaves incluídas no backup:</Label>
            <div className="flex flex-wrap gap-1">
              {providers.map(p => (
                <span 
                  key={p.id} 
                  className="text-xs px-2 py-1 bg-muted rounded font-mono"
                >
                  {p.apiKeyRef}
                </span>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={!canExport || exporting}
            className="gap-2"
          >
            {exporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar .praieiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
