import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import { SecurityLogsPanel } from "@/components/SecurityLogsPanel";
import { FinancialIndicators } from "@/components/admin/FinancialIndicators";
import { RankingsCharts } from "@/components/admin/RankingsCharts";
import { ClientAgeCategories } from "@/components/admin/ClientAgeCategories";
import { PaymentIssuesPanel } from "@/components/admin/PaymentIssuesPanel";
import { BeachManagementPanel } from "@/components/admin/BeachManagementPanel";
import { SystemReportsPanel } from "@/components/admin/SystemReportsPanel";
import { MessagesPanel } from "@/components/admin/MessagesPanel";
import { AdvancedMetricsPanel } from "@/components/admin/AdvancedMetricsPanel";
import { AdminGoalsPanel } from "@/components/admin/AdminGoalsPanel";
import { SiteEvaluationPanel } from "@/components/admin/SiteEvaluationPanel";
import { AdminAccountsPanel } from "@/components/admin/AdminAccountsPanel";
import { AdminAlertsPanel } from "@/components/admin/AdminAlertsPanel";
import { ApiSettingsPanel } from "@/components/admin/ApiSettingsPanel";
import { BirthdayClientsPanel } from "@/components/admin/BirthdayClientsPanel";
import { ClientSearchPanel } from "@/components/admin/ClientSearchPanel";
import { AIReportsPanel } from "@/components/admin/AIReportsPanel";
import { OperatingHoursPanel } from "@/components/admin/OperatingHoursPanel";
import { ProgrammerViewPanel } from "@/components/admin/ProgrammerViewPanel";
import { AdminUserCreationPanel } from "@/components/admin/AdminUserCreationPanel";
import { AICouncilPanel } from "@/components/admin/AICouncilPanel";
import { AICouncilMeetingPanel } from "@/components/admin/AICouncilMeetingPanel";
import { CodeIssuesPanel } from "@/components/admin/CodeIssuesPanel";
import { SatoshiDashboard } from "@/components/admin/SatoshiDashboard";
import { DeveloperCodeViewer } from "@/components/admin/DeveloperCodeViewer";
import { SatoshiGovernanceDashboard } from "@/components/admin/SatoshiGovernanceDashboard";
import { AssetRegistryPanel } from "@/components/admin/AssetRegistryPanel";
import { AICouncilVotingPanel } from "@/components/admin/AICouncilVotingPanel";
import { SatoshiSecurityAlertModal } from "@/components/admin/SatoshiSecurityAlertModal";
import SafeModePanel from "@/components/admin/SafeModePanel";
import MonacoDiffEditor from "@/components/admin/MonacoDiffEditor";
import DataFlowStepper from "@/components/admin/DataFlowStepper";
import OrchestratorLogsPanel from "@/components/admin/OrchestratorLogsPanel";
import HealthScorePanel from "@/components/admin/HealthScorePanel";
import ChangeHistoryPanel from "@/components/admin/ChangeHistoryPanel";
import CriticalAlertsPanel from "@/components/admin/CriticalAlertsPanel";
import AIGuidancePanel from "@/components/admin/AIGuidancePanel";
import MissionCardsPanel from "@/components/admin/MissionCardsPanel";
import SatoshiIntegrityPanel from "@/components/admin/SatoshiIntegrityPanel";
import { AICredentialsPanel } from "@/components/admin/AICredentialsPanel";
import { AIProvidersPanel } from "@/components/admin/AIProvidersPanel";
import { AIUsageDashboard } from "@/components/admin/AIUsageDashboard";
import { LGPDHardeningModule } from "@/components/admin/lgpd/LGPDHardeningModule";
import { OntologyDashboard } from "@/components/admin/OntologyDashboard";
import { 
  Users, 
  Store, 
  MessageCircle, 
  LogOut, 
  TrendingUp,
  User,
  ShoppingBag,
  Shield,
  Wallet,
  BarChart3,
  CreditCard,
  Waves,
  UserCheck,
  Bug,
  Activity,
  Target,
  Star,
  Bell,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Menu,
  Lock,
  Rss,
  Brain,
  Clock,
  Code,
  UserPlus,
  Cpu,
  Users2,
  Bug as BugIcon,
  Coins,
  Vote,
  Gauge,
  GitCompare,
  Workflow,
  FileText,
  HeartPulse,
  History,
  AlertOctagon,
  Rocket,
  Fingerprint,
  Key,
  Settings2,
  Scale,
  GitBranch,
} from "lucide-react";
import logoPraieiro from "@/assets/logo-praieiro-circle.png";
import { useSatoshiState } from "@/contexts/SatoshiStateContext";

interface VendorWithClicks {
  id: string;
  full_name: string;
  product_category: string;
  whatsapp_number: string;
  cpf: string | null;
  phone: string | null;
  status: string | null;
  created_at: string | null;
  establishment_type: string | null;
  click_count: number;
}

interface Client {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  accepted_terms: boolean | null;
  created_at: string | null;
}

interface DashboardMetrics {
  totalVendors: number;
  totalClients: number;
  totalClicks: number;
  todayClicks: number;
}

const ESTABLISHMENT_LABELS: Record<string, string> = {
  ambulante: "Ambulante",
  barraca: "Barraca",
  restaurante: "Restaurante",
  bar: "Bar",
  deposito: "Depósito",
};

import { Cake, Search } from "lucide-react";

const SIDEBAR_ITEMS = [
  { id: "overview", label: "Visão Geral", icon: BarChart3 },
  { id: "financial", label: "Financeiro", icon: Wallet },
  { id: "payments", label: "Pagamentos", icon: CreditCard },
  { id: "birthdays", label: "Aniversariantes", icon: Cake },
  { id: "vendors", label: "Ambulantes", icon: Store },
  { id: "beaches", label: "Praias", icon: Waves },
  { id: "divider1", label: "", icon: null },
  { id: "goals", label: "Metas", icon: Target },
  { id: "alerts", label: "Alertas", icon: Bell },
  { id: "evaluations", label: "Avaliações", icon: Star },
  { id: "ai-reports", label: "Relatórios IA", icon: Brain },
  { id: "ai-council", label: "Conselho IAs", icon: Cpu },
  { id: "ai-meeting", label: "Sala de Reunião", icon: Users2 },
  { id: "ai-voting", label: "Votação Conselho", icon: Vote },
  { id: "satoshi-dashboard", label: "Dashboard Satoshi", icon: Shield },
  { id: "satoshi-governance", label: "Governança Satoshi", icon: Gauge },
  { id: "asset-registry", label: "Registro Conchas", icon: Coins },
  { id: "code-viewer", label: "Código Fonte", icon: Code },
  { id: "code-issues", label: "Code Issues", icon: BugIcon },
  { id: "safe-mode", label: "Safe Mode", icon: Lock },
  { id: "monaco-editor", label: "Editor Código", icon: GitCompare },
  { id: "data-flow", label: "Fluxo de Dados", icon: Workflow },
  { id: "orch-logs", label: "Logs Orquestrador", icon: FileText },
  { id: "health-score", label: "Health Score", icon: HeartPulse },
  { id: "change-history", label: "Histórico Alterações", icon: History },
  { id: "critical-alerts", label: "Alertas Críticos", icon: AlertOctagon },
  { id: "ai-guidance", label: "Orientações IA", icon: Brain },
  { id: "mission-cards", label: "Cartões de Missão", icon: Rocket },
  { id: "satoshi-integrity", label: "Integridade Satoshi", icon: Fingerprint },
  { id: "ontology", label: "Ontologia", icon: GitBranch },
  { id: "lgpd-hardening", label: "LGPD & Hardening", icon: Scale },
  { id: "divider2", label: "", icon: null },
  { id: "client-search", label: "Buscar Cliente", icon: Search },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "messages", label: "Mensagens", icon: MessageCircle },
  { id: "rankings", label: "Rankings", icon: TrendingUp },
  { id: "metrics", label: "Métricas", icon: Activity },
  { id: "divider3", label: "", icon: null },
  { id: "operating-hours", label: "Horário Funcionamento", icon: Clock },
  { id: "programmer-view", label: "Programador", icon: Code },
  { id: "api-settings", label: "Fontes API", icon: Rss },
  { id: "ai-credentials", label: "Credenciais IA", icon: Key },
  { id: "ai-providers", label: "Provedores IA", icon: Settings2 },
  { id: "ai-usage", label: "Uso de IAs", icon: Activity },
  { id: "user-creation", label: "Criar Usuários", icon: UserPlus },
  { id: "accounts", label: "Contas Admin", icon: UserCog },
  { id: "security", label: "Segurança", icon: Shield },
  { id: "system", label: "Sistema", icon: Bug },
];

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalVendors: 0,
    totalClients: 0,
    totalClicks: 0,
    todayClicks: 0,
  });
  const [vendors, setVendors] = useState<VendorWithClicks[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      // Using governance_roles (constitutional) with profile_id
      const { data: roleData } = await (supabase as any).from("governance_roles").select("role").eq("profile_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!roleData) { toast.error("Acesso não autorizado"); await supabase.auth.signOut(); navigate("/admin/login"); return; }
      await loadDashboardData();
    } catch (error) { navigate("/admin/login"); }
  };

  const loadDashboardData = async () => {
    try {
      const [vendorRes, clientRes, clicksRes, todayClicksRes] = await Promise.all([
        supabase.from("vendors").select("*", { count: "exact", head: true }),
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("whatsapp_clicks").select("*", { count: "exact", head: true }),
        supabase.from("whatsapp_clicks").select("*", { count: "exact", head: true }).gte("clicked_at", new Date().toISOString().split("T")[0])
      ]);

      setMetrics({
        totalVendors: vendorRes.count || 0,
        totalClients: clientRes.count || 0,
        totalClicks: clicksRes.count || 0,
        todayClicks: todayClicksRes.count || 0,
      });

      const { data: vendorsData } = await supabase.from("vendors").select("profile_id, product_category, whatsapp_number, status, created_at, establishment_type, profiles(full_name, cpf, phone)");
      if (vendorsData) {
        const vendorsWithClicks = await Promise.all(vendorsData.map(async (vendor) => {
          const { count } = await supabase.from("whatsapp_clicks").select("*", { count: "exact", head: true }).eq("vendor_id", vendor.profile_id);
          const profile = vendor.profiles as any;
          return { 
            id: vendor.profile_id,
            full_name: profile?.full_name || "Vendedor",
            product_category: vendor.product_category,
            whatsapp_number: vendor.whatsapp_number,
            cpf: profile?.cpf || null,
            phone: profile?.phone || null,
            status: vendor.status,
            created_at: vendor.created_at,
            establishment_type: vendor.establishment_type,
            click_count: count || 0 
          };
        }));
        vendorsWithClicks.sort((a, b) => b.click_count - a.click_count);
        setVendors(vendorsWithClicks);
      }

      const { data: clientsData } = await supabase.from("clients").select("profile_id, accepted_terms, created_at, profiles(full_name, email, phone)").order("created_at", { ascending: false });
      if (clientsData) {
        const formattedClients = clientsData.map(c => {
          const profile = c.profiles as any;
          return {
            id: c.profile_id,
            name: profile?.full_name || null,
            email: profile?.email || null,
            phone: profile?.phone || null,
            accepted_terms: c.accepted_terms,
            created_at: c.created_at
          };
        });
        setClients(formattedClients);
      }
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/admin/login"); };
  const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString("pt-BR") : "-";
  const formatPhone = (phone: string | null) => { if (!phone) return "-"; const c = phone.replace(/\D/g, ""); return c.length === 11 ? `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}` : phone; };

  if (loading) {
    return <div className="min-h-screen bg-muted/30 p-6"><div className="mx-auto max-w-7xl space-y-6"><Skeleton className="h-20 w-full" /><div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}</div></div></div>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Ambulantes</CardTitle><Store className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics.totalVendors}</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Clientes</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics.totalClients}</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Cliques Chat</CardTitle><MessageCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics.totalClicks}</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Cliques Hoje</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics.todayClicks}</div></CardContent></Card>
            </div>
            <AdvancedMetricsPanel />
          </div>
        );
      case "financial": return <FinancialIndicators />;
      case "payments": return <PaymentIssuesPanel />;
      case "beaches": return <BeachManagementPanel />;
      case "rankings": return <RankingsCharts />;
      case "birthdays": return <BirthdayClientsPanel />;
      case "client-search": return <ClientSearchPanel />;
      case "goals": return <AdminGoalsPanel />;
      case "evaluations": return <SiteEvaluationPanel />;
      case "accounts": return <AdminAccountsPanel />;
      case "alerts": return <AdminAlertsPanel />;
      case "api-settings": return <ApiSettingsPanel />;
      case "ai-credentials": return <AICredentialsPanel />;
      case "ai-providers": return <AIProvidersPanel />;
      case "ai-usage": return <AIUsageDashboard />;
      case "messages": return <MessagesPanel />;
      case "metrics": return <AdvancedMetricsPanel />;
      case "ai-reports": return <AIReportsPanel />;
      case "ai-council": return <AICouncilPanel />;
      case "ai-meeting": return <AICouncilMeetingPanel />;
      case "satoshi-dashboard": return <SatoshiDashboard />;
      case "satoshi-governance": return <SatoshiGovernanceDashboard />;
      case "asset-registry": return <AssetRegistryPanel />;
      case "ai-voting": return <AICouncilVotingPanel />;
      case "code-viewer": return <DeveloperCodeViewer />;
      case "code-issues": return <CodeIssuesPanel />;
      case "safe-mode": return <SafeModePanel />;
      case "monaco-editor": return <MonacoDiffEditor />;
      case "data-flow": return <DataFlowStepper />;
      case "orch-logs": return <OrchestratorLogsPanel />;
      case "health-score": return <HealthScorePanel />;
      case "change-history": return <ChangeHistoryPanel />;
      case "critical-alerts": return <CriticalAlertsPanel />;
      case "ai-guidance": return <AIGuidancePanel />;
      case "mission-cards": return <MissionCardsPanel />;
      case "satoshi-integrity": return <SatoshiIntegrityPanel />;
      case "lgpd-hardening": return <LGPDHardeningModule />;
      case "operating-hours": return <OperatingHoursPanel />;
      case "programmer-view": return <ProgrammerViewPanel />;
      case "user-creation": return <AdminUserCreationPanel />;
      case "system": return <SystemReportsPanel />;
      case "security": return <SecurityLogsPanel />;
      case "vendors":
        return (
          <Card><CardHeader><CardTitle>Ambulantes Cadastrados</CardTitle><CardDescription>Lista completa de ambulantes</CardDescription></CardHeader><CardContent>
            {vendors.length === 0 ? <div className="flex flex-col items-center py-12"><User className="h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-muted-foreground">Nenhum ambulante cadastrado</p></div> : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Categoria</TableHead><TableHead>Status</TableHead><TableHead>Cadastro</TableHead><TableHead className="text-right">Cliques</TableHead></TableRow></TableHeader><TableBody>
                {vendors.map((v) => (<TableRow key={v.id}><TableCell className="font-medium">{v.full_name}</TableCell><TableCell><Badge variant="outline">{ESTABLISHMENT_LABELS[v.establishment_type || "ambulante"]}</Badge></TableCell><TableCell>{v.product_category}</TableCell><TableCell><Badge variant={v.status === "active" ? "default" : "secondary"}>{v.status === "active" ? "Ativo" : "Inativo"}</Badge></TableCell><TableCell>{formatDate(v.created_at)}</TableCell><TableCell className="text-right font-bold">{v.click_count}</TableCell></TableRow>))}
              </TableBody></Table></div>
            )}
          </CardContent></Card>
        );
      case "clients":
        return (
          <Card><CardHeader><CardTitle>Clientes Registrados</CardTitle><CardDescription>Lista de clientes</CardDescription></CardHeader><CardContent>
            {clients.length === 0 ? <div className="flex flex-col items-center py-12"><User className="h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-muted-foreground">Nenhum cliente registrado</p></div> : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Termos</TableHead><TableHead>Cadastro</TableHead></TableRow></TableHeader><TableBody>
                {clients.map((c) => (<TableRow key={c.id}><TableCell className="font-medium">{c.name || "Sem nome"}</TableCell><TableCell>{c.email || "-"}</TableCell><TableCell>{formatPhone(c.phone)}</TableCell><TableCell><Badge variant={c.accepted_terms ? "default" : "destructive"}>{c.accepted_terms ? "Aceito" : "Pendente"}</Badge></TableCell><TableCell>{formatDate(c.created_at)}</TableCell></TableRow>))}
              </TableBody></Table></div>
            )}
          </CardContent></Card>
        );
      default: return <div>Selecione uma opção</div>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} bg-white border-r transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && <img src={logoPraieiro} alt="Praieiro" className="h-8" />}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {SIDEBAR_ITEMS.map((item) => {
            if (item.id.startsWith("divider")) return <div key={item.id} className="my-2 border-t" />;
            const Icon = item.icon!;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${activeTab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Dashboard Administrativo</h1>
          <div className="flex items-center gap-3">
            <AdminNotificationBell onNavigateToTab={setActiveTab} />
            <NotificationBell />
            <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
      </div>
      
      {/* Satoshi Security Alert Modal with Trumpet */}
      <SatoshiSecurityAlertModal onNavigateToTab={setActiveTab} />
    </div>
  );
}
