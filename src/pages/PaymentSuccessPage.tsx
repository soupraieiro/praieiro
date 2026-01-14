import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, ShoppingBag } from "lucide-react";

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Pagamento Confirmado!
          </h1>
          <p className="text-muted-foreground">
            Seu pagamento foi processado com sucesso. Obrigado pela sua compra!
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Você receberá um e-mail de confirmação em breve com os detalhes da sua compra.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button asChild variant="outline">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Link>
          </Button>
          <Button asChild>
            <Link to="/meus-pedidos">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Ver Meus Pedidos
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
