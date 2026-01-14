import { useState } from "react";
import { Copy, Check, Fingerprint, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface TransactionHashDisplayProps {
  hash: string | null;
  compact?: boolean;
  showLabel?: boolean;
}

export function TransactionHashDisplay({ 
  hash, 
  compact = false,
  showLabel = true 
}: TransactionHashDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  if (!hash) return null;

  const displayHash = compact || !showFull 
    ? `${hash.slice(0, 8)}...${hash.slice(-8)}`
    : hash;

  const copyHash = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    toast.success("Hash copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={copyHash}
              className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Fingerprint className="h-3 w-3" />
              {displayHash}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Hash SHA-256 - Clique para copiar</p>
            <code className="text-xs block mt-1 text-muted-foreground">{hash}</code>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="rounded-lg bg-slate-900 p-3 space-y-2">
      {showLabel && (
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">
            Hash de Verificação SHA-256
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-xs text-gray-300 break-all">
          {displayHash}
        </code>
        <div className="flex gap-1">
          {!compact && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
                    onClick={() => setShowFull(!showFull)}
                  >
                    {showFull ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showFull ? "Ocultar" : "Mostrar"} hash completo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
                  onClick={copyHash}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copiar hash</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <p className="text-[10px] text-gray-500">
        Este hash criptográfico prova a integridade e imutabilidade desta transação
      </p>
    </div>
  );
}
