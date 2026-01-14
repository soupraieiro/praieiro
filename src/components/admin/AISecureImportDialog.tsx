import { useState, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Lock,
  Upload,
  Shield,
  Eye,
  EyeOff,
  FileKey,
  CheckCircle,
  AlertTriangle,
  FileWarning,
} from 'lucide-react';

interface ProviderImport {
  id: string;
  provider: string;
  apiKeyRef: string;
  apiKeyValue?: string;
  status: string;
  capabilities: Record<string, boolean>;
  outputTypes: string[];
  category?: string;
  latency: string;
}

interface SecureImportFormat {
  version: string;
  exportedAt: string;
  satoshiHash: string;
  encryptionType: 'AES-256';
  providers: ProviderImport[];
}

interface AISecureImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (providers: ProviderImport[]) => void;
}

// Descriptografar dados com AES-256
const decryptData = (encryptedData: string, password: string): SecureImportFormat | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    return JSON.parse(decryptedString);
  } catch (error) {
    return null;
  }
};

export function AISecureImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: AISecureImportDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [decryptedData, setDecryptedData] = useState<SecureImportFormat | null>(null);
  const [decryptionError, setDecryptionError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setDecryptedData(null);
    setDecryptionError(false);

    try {
      const content = await file.text();
      setFileContent(content);
    } catch (error) {
      toast.error('Erro ao ler o arquivo');
      setSelectedFile(null);
    }
  };

  const handleDecrypt = () => {
    if (!fileContent || !password) return;

    setDecryptionError(false);
    const result = decryptData(fileContent, password);

    if (!result) {
      setDecryptionError(true);
      toast.error('Senha incorreta ou arquivo corrompido');
      return;
    }

    // Validar estrutura
    if (!result.providers || !Array.isArray(result.providers)) {
      setDecryptionError(true);
      toast.error('Formato de arquivo inválido');
      return;
    }

    setDecryptedData(result);
    toast.success('Arquivo descriptografado com sucesso!');
  };

  const handleImport = async () => {
    if (!decryptedData) return;

    setImporting(true);
    try {
      onImportComplete(decryptedData.providers);
      toast.success(`${decryptedData.providers.length} credenciais importadas com sucesso`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar configurações');
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setPassword('');
    setShowPassword(false);
    setSelectedFile(null);
    setFileContent(null);
    setDecryptedData(null);
    setDecryptionError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts[parts.length - 1].toLowerCase();
  };

  const isValidExtension = selectedFile 
    ? ['praieiro', 'json'].includes(getFileExtension(selectedFile.name))
    : true;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileKey className="h-5 w-5 text-blue-600" />
            Importar Backup Seguro
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo .praieiro exportado anteriormente e insira a senha mestre
            usada na exportação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Seleção de arquivo */}
          <div className="space-y-2">
            <Label htmlFor="backup-file">Arquivo de Backup</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                id="backup-file"
                type="file"
                accept=".praieiro,.json"
                onChange={handleFileSelect}
                className="flex-1"
              />
            </div>
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm">
                {isValidExtension ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <FileWarning className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-muted-foreground">{selectedFile.name}</span>
                <Badge variant={isValidExtension ? 'outline' : 'destructive'}>
                  .{getFileExtension(selectedFile.name)}
                </Badge>
              </div>
            )}
          </div>

          {/* Senha Mestre */}
          {selectedFile && (
            <div className="space-y-2">
              <Label htmlFor="import-password">Senha Mestre</Label>
              <div className="relative">
                <Input
                  id="import-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha usada na exportação"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pr-10 ${decryptionError ? 'border-destructive' : ''}`}
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
              {decryptionError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Senha incorreta ou arquivo corrompido
                </p>
              )}
              
              {!decryptedData && fileContent && (
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={handleDecrypt}
                  disabled={!password}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Descriptografar
                </Button>
              )}
            </div>
          )}

          {/* Preview dos dados descriptografados */}
          {decryptedData && (
            <div className="space-y-3">
              <Alert className="bg-green-500/10 border-green-500/30">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  Arquivo descriptografado com sucesso!
                </AlertDescription>
              </Alert>

              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Versão:</span>
                  <span className="font-mono">{decryptedData.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exportado em:</span>
                  <span className="font-mono">
                    {new Date(decryptedData.exportedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Satoshi Hash:</span>
                  <span className="font-mono text-xs">{decryptedData.satoshiHash}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Provedores:</span>
                  <Badge variant="secondary">{decryptedData.providers.length}</Badge>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Chaves a importar:</Label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {decryptedData.providers.map(p => (
                    <Badge 
                      key={p.id} 
                      variant={p.apiKeyValue ? 'default' : 'secondary'}
                      className="text-xs font-mono"
                    >
                      {p.apiKeyRef}
                      {p.apiKeyValue && <CheckCircle className="h-3 w-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!decryptedData || importing}
            className="gap-2"
          >
            {importing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Importar Credenciais
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
