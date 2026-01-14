import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Coins, Loader2, QrCode, AlertTriangle, CheckCircle2, Navigation } from "lucide-react";
import { useRadarTracking } from "@/hooks/useRadarTracking";
import { ProximitySignalIndicator } from "@/components/ProximitySignalIndicator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Lei 2.1 - REALTIME-FIRST
 * Configuração para detecção de movimento significativo (substitui polling 2s)
 * Usa Geolocation watchPosition para eventos Event-Driven
 */
const MOVEMENT_THRESHOLD_METERS = 3; // Movimento mínimo para trigger
const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 2000 // Cache de 2s para evitar chamadas excessivas
};

interface ConchasPayButtonProps {
  orderId: string;
  orderTotal: number;
  vendorLatitude: number;
  vendorLongitude: number;
  vendorAccuracy?: number;
  vendorId: string;
  onPaymentComplete?: () => void;
  className?: string;
}

// Limites da Regra de Ouro
const THRESHOLD_APPROVED = 3; // metros

export function ConchasPayButton({
  orderId,
  orderTotal,
  vendorLatitude,
  vendorLongitude,
  vendorAccuracy = 0,
  vendorId,
  onPaymentComplete,
  className,
}: ConchasPayButtonProps) {
  const { user } = useAuth();
  const {
    isInitialized,
    isTracking,
    currentLocation,
    proximityStatus,
    startTracking,
    checkProximity,
    refreshLocation,
  } = useRadarTracking();

  const [showDialog, setShowDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isCheckingProximity, setIsCheckingProximity] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  
  // Lei 2.1 - Event-Driven: Refs para controle de watchPosition
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  /**
   * Lei 2.1 - Calcula distância entre duas coordenadas (Haversine simplificado)
   * Usado para detectar movimento significativo
   */
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Raio da Terra em metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Start tracking when dialog opens
  useEffect(() => {
    if (showDialog && user && !isTracking) {
      startTracking(user.id, "client");
    }
  }, [showDialog, user, isTracking, startTracking]);

  /**
   * Lei 2.1 - REALTIME-FIRST
   * Substitui polling de 2s por watchPosition Event-Driven
   * Verifica proximidade apenas quando há movimento significativo
   */
  useEffect(() => {
    if (!showDialog || !navigator.geolocation) return;

    // Verificação inicial
    handleCheckProximity();

    // Event-Driven: watchPosition em vez de setInterval
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Verifica se houve movimento significativo
        if (lastPositionRef.current) {
          const distance = calculateDistance(
            lastPositionRef.current.lat,
            lastPositionRef.current.lng,
            latitude,
            longitude
          );
          
          // Lei 2.1: Só verifica proximidade se movimento > threshold
          if (distance >= MOVEMENT_THRESHOLD_METERS) {
            console.log(`[Lei 2.1] Movimento significativo detectado: ${distance.toFixed(1)}m`);
            lastPositionRef.current = { lat: latitude, lng: longitude };
            handleCheckProximity();
          }
        } else {
          // Primeira posição - inicializa ref
          lastPositionRef.current = { lat: latitude, lng: longitude };
        }
      },
      (error) => {
        console.error("[Lei 2.1] watchPosition error:", error.message);
      },
      POSITION_OPTIONS
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      lastPositionRef.current = null;
    };
  }, [showDialog]);

  const handleCheckProximity = useCallback(async () => {
    if (isCheckingProximity) return;
    
    setIsCheckingProximity(true);
    try {
      await checkProximity({
        orderId,
        vendorLatitude,
        vendorLongitude,
        vendorAccuracy,
      });
    } finally {
      setIsCheckingProximity(false);
    }
  }, [orderId, vendorLatitude, vendorLongitude, vendorAccuracy, checkProximity, isCheckingProximity]);

  const handleOpenDialog = async () => {
    if (!user) {
      toast.error("Faça login para pagar");
      return;
    }
    setShowDialog(true);
  };

  const handlePayWithConchas = async () => {
    if (!proximityStatus.canProceed) {
      toast.error("Aproxime-se do vendedor para pagar");
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Execute the payment via Supabase RPC
      const { data, error } = await supabase.rpc("execute_secure_transfer", {
        p_from_profile_id: user!.id,
        p_to_profile_id: vendorId,
        p_amount: orderTotal,
        p_currency: "CONCHA",
        p_description: `Pagamento pedido #${orderId.substring(0, 8)}`,
        p_reference_id: orderId,
        p_reference_type: "order",
      });

      if (error) {
        throw new Error(error.message);
      }

      // Update order status
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "pending",
        })
        .eq("id", orderId);

      toast.success("Pagamento realizado com sucesso!");
      setShowDialog(false);
      onPaymentComplete?.();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar pagamento");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleQrCodeScan = () => {
    setShowQrScanner(true);
    // TODO: Implement QR code scanner
    toast.info("Scanner de QR Code em desenvolvimento");
  };

  // Calculate remaining distance for display
  const getRemainingDistance = (): string => {
    if (proximityStatus.distanceMeters < 0) return "...";
    if (proximityStatus.distanceMeters <= THRESHOLD_APPROVED) return "✓";
    const remaining = proximityStatus.distanceMeters - THRESHOLD_APPROVED;
    return `${remaining.toFixed(1)}m`;
  };

  // Button disabled state
  const isButtonDisabled = 
    !proximityStatus.canProceed || 
    isProcessingPayment || 
    proximityStatus.verdict === "CHECKING";

  // Get button text based on state
  const getButtonText = (): string => {
    if (isProcessingPayment) return "Processando...";
    if (proximityStatus.verdict === "CHECKING") return "Verificando...";
    if (proximityStatus.verdict === "APPROVED") return `Pagar ${orderTotal.toFixed(2)} Conchas`;
    if (proximityStatus.verdict === "QR_REQUIRED") return "Escanear QR Code";
    if (proximityStatus.distanceMeters > 0) {
      return `Aproxime-se mais ${getRemainingDistance()}`;
    }
    return "Pagar com Conchas";
  };

  return (
    <>
      <Button
        onClick={handleOpenDialog}
        className={className}
        variant="default"
      >
        <Coins className="h-4 w-4 mr-2" />
        Pagar com Conchas
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Pagamento com Conchas
            </DialogTitle>
            <DialogDescription>
              Aproxime-se do vendedor para liberar o pagamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Proximity Signal Indicator */}
            <ProximitySignalIndicator
              proximityStatus={proximityStatus}
              isChecking={isCheckingProximity}
              showDetails={true}
              onRetry={handleCheckProximity}
            />

            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Valor do Pedido</span>
                <span className="font-bold text-lg">
                  <Coins className="h-4 w-4 inline mr-1 text-amber-500" />
                  {orderTotal.toFixed(2)} Conchas
                </span>
              </div>
            </div>

            {/* Status-specific content */}
            {proximityStatus.verdict === "APPROVED" && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm text-green-700">
                  Proximidade verificada! Você pode pagar agora.
                </p>
              </div>
            )}

            {proximityStatus.verdict === "QR_REQUIRED" && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <QrCode className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm text-amber-700 font-medium">
                    QR Code necessário
                  </p>
                  <p className="text-xs text-amber-600">
                    Escaneie o QR Code do vendedor para confirmar a transação
                  </p>
                </div>
              </div>
            )}

            {proximityStatus.verdict === "GEOGRAPHIC_INCONSISTENCY" && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-red-700 font-medium">
                    Fora do alcance
                  </p>
                  <p className="text-xs text-red-600">
                    Você está muito longe do vendedor. Aproxime-se para continuar.
                  </p>
                </div>
              </div>
            )}

            {/* Location refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckProximity}
              disabled={isCheckingProximity}
              className="w-full"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {isCheckingProximity ? "Atualizando..." : "Atualizar Localização"}
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            
            {proximityStatus.verdict === "QR_REQUIRED" ? (
              <Button
                onClick={handleQrCodeScan}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Escanear QR Code
              </Button>
            ) : (
              <Button
                onClick={handlePayWithConchas}
                disabled={isButtonDisabled}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isProcessingPayment ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Coins className="h-4 w-4 mr-2" />
                )}
                {getButtonText()}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
