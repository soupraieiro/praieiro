import { CheckCircle2, Clock, Shield, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TransactionStatusBadgeProps {
  status: string;
  showTooltip?: boolean;
  size?: "sm" | "default";
}

export function TransactionStatusBadge({ 
  status, 
  showTooltip = true,
  size = "default" 
}: TransactionStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "confirmed":
        return {
          icon: CheckCircle2,
          label: "Confirmado",
          className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
          description: "Transação verificada e registrada permanentemente no ledger",
        };
      case "audited":
        return {
          icon: Shield,
          label: "Auditado",
          className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
          description: "Transação passou por auditoria de compliance e foi certificada",
        };
      case "pending":
        return {
          icon: Clock,
          label: "Pendente",
          className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800",
          description: "Transação aguardando confirmação do sistema",
        };
      case "failed":
        return {
          icon: XCircle,
          label: "Falhou",
          className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
          description: "Transação não foi processada - verifique os detalhes",
        };
      case "processing":
        return {
          icon: Clock,
          label: "Processando",
          className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
          description: "Transação está sendo processada pelo sistema",
        };
      default:
        return {
          icon: AlertTriangle,
          label: status,
          className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800",
          description: "Status da transação",
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const badgeContent = (
    <Badge 
      variant="outline" 
      className={`${config.className} ${size === "sm" ? "text-[10px] px-1.5 py-0" : ""}`}
    >
      <Icon className={`${size === "sm" ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"}`} />
      {config.label}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{badgeContent}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
