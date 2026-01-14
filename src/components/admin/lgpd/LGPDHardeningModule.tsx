import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  ClipboardList, 
  Scale, 
  Database, 
  Bot,
  Lock
} from "lucide-react";

import { HardeningPanel } from "./HardeningPanel";
import { AuditTemplatePanel } from "./AuditTemplatePanel";
import { ComplianceLGPDPanel } from "./ComplianceLGPDPanel";
import { ValidationQueriesPanel } from "./ValidationQueriesPanel";
import { PraieiroAdmBotPanel } from "./PraieiroAdmBotPanel";

const TABS = [
  { 
    id: "hardening", 
    label: "Hardening & Correção", 
    icon: Shield,
    description: "Prompt mestre e regras de correção"
  },
  { 
    id: "audit", 
    label: "Auditoria Técnica", 
    icon: ClipboardList,
    description: "Templates reutilizáveis"
  },
  { 
    id: "compliance", 
    label: "Compliance & LGPD", 
    icon: Scale,
    description: "Marco institucional e princípios"
  },
  { 
    id: "validation", 
    label: "Validação Pós-Migração", 
    icon: Database,
    description: "Queries somente leitura"
  },
  { 
    id: "praieirobot", 
    label: "PraieiroBot ADM", 
    icon: Bot,
    description: "Conselheiro IA (Texto + Voz)"
  },
];

export function LGPDHardeningModule() {
  const [activeTab, setActiveTab] = useState("hardening");

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Editoria LGPD & Hardening</h1>
                <Badge variant="outline" className="text-xs">
                  Governança Técnica
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Módulo institucional de governança, auditoria, compliance e apoio à decisão
              </p>
            </div>
          </div>
          
          {/* Aviso Principal */}
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Shield className="h-4 w-4 flex-shrink-0" />
              <span>
                <strong>Modo Governança:</strong> Este módulo existe para governar decisões, não para executá-las.
                Nenhuma aba executa código automaticamente.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navegação por Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
          {TABS.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <tab.icon className="h-4 w-4" />
              <span className="text-xs font-medium hidden sm:block">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Descrição da Aba Ativa */}
        <Card className="border-muted">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              {TABS.map((tab) => {
                if (tab.id !== activeTab) return null;
                const TabIcon = tab.icon;
                return (
                  <div key={tab.id} className="flex items-center gap-3">
                    <TabIcon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{tab.label}</p>
                      <p className="text-xs text-muted-foreground">{tab.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo das Tabs */}
        <TabsContent value="hardening" className="mt-0">
          <HardeningPanel />
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
          <AuditTemplatePanel />
        </TabsContent>

        <TabsContent value="compliance" className="mt-0">
          <ComplianceLGPDPanel />
        </TabsContent>

        <TabsContent value="validation" className="mt-0">
          <ValidationQueriesPanel />
        </TabsContent>

        <TabsContent value="praieirobot" className="mt-0">
          <PraieiroAdmBotPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
