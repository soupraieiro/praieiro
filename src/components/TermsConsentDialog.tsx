import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

interface TermsConsentDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  type: "client" | "vendor";
}

export function TermsConsentDialog({ open, onAccept, onDecline, type }: TermsConsentDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const { toast } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setAccepted(false);
    }
  }, [open]);

  const handleToggleAccept = () => {
    const newValue = !accepted;
    setAccepted(newValue);
    if (newValue) {
      toast({
        title: "Termos aceitos",
        description: "Você pode continuar com o cadastro.",
        duration: 2000,
      });
    }
  };

  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="text-lg sm:text-xl text-primary">
            Termos de Uso e Política de Privacidade
          </DialogTitle>
          <DialogDescription className="text-sm">
            Por favor, leia atentamente os termos abaixo antes de continuar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[280px] sm:h-[400px] rounded-md border p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4 text-sm text-muted-foreground">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">1. Coleta de Dados</h3>
            <p>
              Ao utilizar o Praieiro, você concorda com a coleta e tratamento dos seguintes dados pessoais:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>Número de telefone</li>
              {type === "vendor" && (
                <>
                  <li>CPF (para vendedores)</li>
                  <li>Data de nascimento</li>
                  <li>Foto de perfil</li>
                  <li>Informações sobre produtos e serviços oferecidos</li>
                </>
              )}
              <li>Dados de localização (praias frequentadas)</li>
              <li>Histórico de interações na plataforma</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground">2. Uso dos Dados</h3>
            <p>Seus dados serão utilizados para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Facilitar a conexão entre clientes e vendedores ambulantes</li>
              <li>Melhorar a experiência na plataforma</li>
              <li>Enviar comunicações relevantes sobre o serviço</li>
              <li>Gerar estatísticas e análises de uso (de forma anonimizada)</li>
              <li>Garantir a segurança e integridade da plataforma</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground">3. Compartilhamento de Dados</h3>
            <p>
              <strong>Para clientes:</strong> Apenas seu primeiro nome e cidade serão visíveis para vendedores. 
              Seu número de contato só será compartilhado quando você iniciar uma conversa pelo chat da plataforma.
            </p>
            <p>
              <strong>Para vendedores:</strong> Seu nome, categoria de produtos, descrição e foto de perfil 
              serão públicos. Você receberá mensagens via chat da plataforma. Dados pessoais como CPF 
              são mantidos em sigilo e acessíveis apenas pela administração.
            </p>

            <h3 className="text-base font-semibold text-foreground">4. Rastreamento de Interações</h3>
            <p>
              O Praieiro registra interações como cliques em botões de chat e visualizações de perfis 
              para fins de análise e melhoria do serviço. Esses dados são utilizados para:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Identificar produtos mais procurados</li>
              <li>Melhorar a experiência dos usuários</li>
              <li>Fornecer estatísticas aos vendedores sobre seu desempenho</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground">5. Segurança dos Dados</h3>
            <p>
              Utilizamos medidas de segurança técnicas e organizacionais para proteger seus dados 
              contra acesso não autorizado, perda ou alteração.
            </p>

            <h3 className="text-base font-semibold text-foreground">6. Seus Direitos</h3>
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar seu consentimento a qualquer momento</li>
            </ul>
            <p>
              Para exercer esses direitos, entre em contato conosco pelo WhatsApp disponível na plataforma.
            </p>

            <h3 className="text-base font-semibold text-foreground">7. Programa de Conchas</h3>
            <p>
              O Praieiro oferece um programa de fidelidade chamado "Conchas":
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>A cada R$ 10 em compras, você ganha 1 Concha</li>
              <li>Cada Concha equivale a R$ 0,10 (dez centavos)</li>
              <li>As Conchas são acumuladas automaticamente após pedidos concluídos</li>
              <li>
                <strong>Fase Piloto:</strong> Durante a fase piloto do projeto, as Conchas serão 
                acumuladas normalmente, porém não poderão ser utilizadas para pagamento. A utilização 
                das Conchas será liberada após a estruturação completa da empresa.
              </li>
              <li>O Praieiro se reserva o direito de alterar as regras do programa com aviso prévio</li>
            </ul>

            {type === "vendor" && (
              <>
                <h3 className="text-base font-semibold text-foreground">8. Indicadores de Gestão para Praieiros</h3>
                <p>
                  Os Praieiros (ambulantes, barraqueiros, donos de bares e restaurantes) 
                  terão acesso a ferramentas de acompanhamento de gestão do negócio:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Indicadores de fluxo de caixa (entradas e saídas)</li>
                  <li>Visualização de saldo e total recebido</li>
                  <li>Estatísticas de visualizações e pedidos</li>
                  <li>Taxa de conversão de visitantes em clientes</li>
                  <li>Histórico de transações</li>
                </ul>
                <p className="mt-2">
                  <strong>Período Gratuito de Lançamento:</strong> Durante os primeiros 6 (seis) meses 
                  a partir do lançamento oficial da plataforma (Janeiro de 2026), todos os Praieiros 
                  cadastrados terão acesso gratuito e completo aos indicadores de gestão.
                </p>
                <p className="mt-2">
                  <strong>Após o Período Gratuito:</strong> Após o término do período de lançamento, 
                  o acesso aos indicadores de gestão será disponibilizado mediante assinatura do 
                  plano "Praieiro Premium". Os valores e condições da assinatura serão comunicados 
                  com antecedência mínima de 30 dias antes do término do período gratuito.
                </p>
              </>
            )}

            <h3 className="text-base font-semibold text-foreground">{type === "vendor" ? "9" : "8"}. Alterações nos Termos</h3>
            <p>
              Reservamos o direito de alterar estes termos a qualquer momento. Alterações significativas 
              serão comunicadas por e-mail ou através da plataforma.
            </p>

            <h3 className="text-base font-semibold text-foreground">{type === "vendor" ? "10" : "9"}. Contato</h3>
            <p>
              Para dúvidas sobre esta política ou sobre o tratamento de seus dados, 
              entre em contato através do nosso WhatsApp.
            </p>

            <p className="text-xs text-muted-foreground mt-4">
              Versão 1.2 - Última atualização: Janeiro de 2026
            </p>
          </div>
        </ScrollArea>

        <div 
          className={`flex items-start space-x-3 py-4 px-3 -mx-1 rounded-lg cursor-pointer touch-manipulation transition-all duration-200 ${
            accepted 
              ? "bg-primary/10 border-2 border-primary" 
              : "hover:bg-muted/50 active:bg-muted border-2 border-transparent"
          }`}
          onClick={handleToggleAccept}
        >
          <Checkbox 
            id="accept-terms" 
            checked={accepted} 
            onCheckedChange={(checked) => {
              setAccepted(checked === true);
              if (checked) {
                toast({
                  title: "Termos aceitos",
                  description: "Você pode continuar com o cadastro.",
                  duration: 2000,
                });
              }
            }}
            className="mt-0.5 h-6 w-6 min-h-[24px] min-w-[24px] shrink-0"
          />
          <div className="flex-1">
            <Label htmlFor="accept-terms" className="text-sm cursor-pointer leading-relaxed select-none">
              Li e concordo com os Termos de Uso e Política de Privacidade do Praieiro
            </Label>
            {accepted && (
              <div className="flex items-center gap-1.5 mt-1.5 text-primary text-xs font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Termos aceitos</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={onDecline}
            className="w-full sm:w-auto min-h-[44px] touch-manipulation"
          >
            Não concordo
          </Button>
          <Button 
            onClick={handleAccept} 
            disabled={!accepted}
            className="w-full sm:w-auto min-h-[44px] touch-manipulation"
          >
            Concordo e quero continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
