import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreditCard, Loader2, MapPin, Calculator, CheckCircle2 } from "lucide-react";
import { useOrderPayment } from "@/hooks/useOrderPayment";
import { toast } from "sonner";

interface PaymentButtonProps {
  orderId: string;
  orderTotal: number;
  vendorLatitude?: number | null;
  vendorLongitude?: number | null;
  clientLatitude?: number | null;
  clientLongitude?: number | null;
  onPaymentComplete?: () => void;
}

export function PaymentButton({
  orderId,
  orderTotal,
  vendorLatitude,
  vendorLongitude,
  clientLatitude,
  clientLongitude,
  onPaymentComplete,
}: PaymentButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    distanceMeters: number;
    distanceFee: number;
    serviceFee: number;
    productTotal: number;
    grandTotal: number;
    url: string;
  } | null>(null);
  
  const { isProcessing, initiateCheckout } = useOrderPayment();

  const handlePreparePayment = async () => {
    const result = await initiateCheckout({
      orderId,
      vendorLatitude,
      vendorLongitude,
      clientLatitude,
      clientLongitude,
    });

    if (result) {
      setCheckoutData(result);
      setShowDialog(true);
    }
  };

  const handleConfirmPayment = () => {
    if (checkoutData?.url) {
      window.open(checkoutData.url, "_blank");
      toast.info("Após o pagamento, volte aqui e atualize a página");
      setShowDialog(false);
      onPaymentComplete?.();
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  };

  return (
    <>
      <Button
        onClick={handlePreparePayment}
        disabled={isProcessing}
        className="gap-2 bg-accent hover:bg-accent/90"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {isProcessing ? "Preparando..." : "Pagar Agora"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" />
              Resumo do Pagamento
            </DialogTitle>
            <DialogDescription>
              Confira os valores antes de prosseguir
            </DialogDescription>
          </DialogHeader>

          {checkoutData && (
            <div className="space-y-4 py-4">
              {/* Products */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Produtos</span>
                <span className="font-medium">{formatCurrency(checkoutData.productTotal)}</span>
              </div>

              {/* Service Fee */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Taxa de Serviço</span>
                </div>
                <span className="font-medium">{formatCurrency(checkoutData.serviceFee)}</span>
              </div>

              {/* Distance Fee */}
              {checkoutData.distanceMeters > 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Taxa de Distância</span>
                      <p className="text-xs text-muted-foreground">
                        {checkoutData.distanceMeters}m × R$0,01
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">{formatCurrency(checkoutData.distanceFee)}</span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-accent" />
                    <span className="font-bold text-lg">Total</span>
                  </div>
                  <span className="font-bold text-lg text-accent">
                    {formatCurrency(checkoutData.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <p>Você será redirecionado para uma página segura do Stripe para finalizar o pagamento.</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              className="flex-1 bg-accent hover:bg-accent/90 gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Pagar com Stripe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
