import { Button } from "@/components/ui/button";
import { usePiuNotification } from "@/hooks/usePiuNotification";
import { Volume2, Bell, Shell } from "lucide-react";

interface PiuTestButtonProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Botão para testar o Sistema Piu
 * Útil para demonstrar som e notificações
 */
export function PiuTestButton({ className, showLabel = true }: PiuTestButtonProps) {
  const { notifyPiu, requestNotificationPermission } = usePiuNotification();

  const handleTestReceived = () => {
    notifyPiu({
      type: "received",
      amount: 50,
      title: "🐚 Teste: Conchas Recebidas!",
    });
  };

  const handleTestSale = () => {
    notifyPiu({
      type: "sale",
      amount: 25,
      title: "💰 Teste: Venda na Loja!",
    });
  };

  const handleTestPurchase = () => {
    notifyPiu({
      type: "purchase",
      amount: 15,
    });
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      notifyPiu({
        type: "received",
        amount: 0,
        title: "🔔 Notificações Ativadas!",
        description: "Você receberá alertas de transações",
      });
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleTestReceived}
        className="gap-2"
      >
        <Shell className="h-4 w-4 text-green-500" />
        {showLabel && "Testar Piu (Receber)"}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleTestSale}
        className="gap-2"
      >
        <Volume2 className="h-4 w-4 text-amber-500" />
        {showLabel && "Testar Venda"}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleTestPurchase}
        className="gap-2"
      >
        <Shell className="h-4 w-4 text-orange-500" />
        {showLabel && "Testar Compra"}
      </Button>
      
      <Button
        variant="secondary"
        size="sm"
        onClick={handleEnableNotifications}
        className="gap-2"
      >
        <Bell className="h-4 w-4" />
        {showLabel && "Ativar Notificações"}
      </Button>
    </div>
  );
}
