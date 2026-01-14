import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, Scale, FileText, AlertTriangle } from "lucide-react";

export function ComplianceLGPDPanel() {
  return (
    <div className="space-y-6">
      {/* Header Institucional */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Governança, Segurança e LGPD</CardTitle>
              <CardDescription>Princípios de Privacy by Design, Security by Default e Accountability Técnica</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Texto Institucional Fixo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Marco Institucional</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
              <section>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Declaração de Governança
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Esta plataforma adota os princípios de <strong>Privacy by Design</strong>, 
                  <strong> Security by Default</strong> e <strong>Accountability Técnica</strong>.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Nenhuma alteração estrutural, correção de segurança ou migração é executada 
                  automaticamente a partir deste painel.
                </p>
              </section>

              <Separator />

              <section>
                <h3 className="text-base font-semibold text-foreground">Todas as ações aqui discutidas:</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    São <strong>auditadas</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    São <strong>revisadas</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Exigem <strong>decisão consciente do administrador</strong>
                  </li>
                </ul>
              </section>

              <Separator />

              <section>
                <h3 className="text-base font-semibold text-foreground">Uso de Inteligência Artificial</h3>
                <p className="text-muted-foreground leading-relaxed">
                  O uso de inteligência artificial é <strong>estritamente assistivo, nunca autônomo</strong>, 
                  respeitando:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Lei Geral de Proteção de Dados (LGPD)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Princípios de minimização de dados
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Registro e rastreabilidade das decisões administrativas
                  </li>
                </ul>
              </section>

              <Separator />

              <section className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <h3 className="text-base font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Responsabilidade Legal
                </h3>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  O <strong>administrador é o responsável legal e técnico</strong> pelas decisões 
                  aplicadas ao sistema. Toda ação registrada neste painel constitui evidência 
                  auditável para fins de compliance.
                </p>
              </section>

              <Separator />

              <section>
                <h3 className="text-base font-semibold text-foreground">Princípios LGPD Aplicados</h3>
                <div className="grid gap-3 mt-3">
                  {[
                    { title: "Finalidade", desc: "Tratamento para propósitos legítimos, específicos e informados" },
                    { title: "Adequação", desc: "Compatibilidade com as finalidades informadas" },
                    { title: "Necessidade", desc: "Limitação ao mínimo necessário" },
                    { title: "Livre Acesso", desc: "Garantia de consulta facilitada" },
                    { title: "Qualidade dos Dados", desc: "Exatidão e atualização" },
                    { title: "Transparência", desc: "Informações claras e acessíveis" },
                    { title: "Segurança", desc: "Medidas técnicas e administrativas" },
                    { title: "Prevenção", desc: "Medidas para prevenir danos" },
                    { title: "Não Discriminação", desc: "Impossibilidade de tratamento discriminatório" },
                    { title: "Responsabilização", desc: "Demonstração de adoção de medidas eficazes" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rodapé Fixo */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-4">
          <p className="text-center text-sm font-medium text-amber-600 dark:text-amber-400">
            ⚠️ Este painel não executa código. Ele governa decisões.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
