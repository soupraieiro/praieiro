import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SatoshiStateProvider } from "@/contexts/SatoshiStateContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SatoshiIPGuard } from "@/components/SatoshiIPGuard";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import EncontrarAmbulantesPage from "./pages/EncontrarAmbulantesPage";
import MeusPedidosPage from "./pages/MeusPedidosPage";
import PerfilPage from "./pages/PerfilPage";
import VendorAuthPage from "./pages/VendorAuthPage";
import VendorDashboardPage from "./pages/VendorDashboardPage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminResetPasswordPage from "./pages/AdminResetPasswordPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import AmbulantesPage from "./pages/AmbulantesPage";
import ClientesPage from "./pages/ClientesPage";
import FeedPage from "./pages/FeedPage";
import SobreProjetoPage from "./pages/SobreProjetoPage";
import SoberaniaPage from "./pages/SoberaniaPage";
import AccessBlockedPage from "./pages/AccessBlockedPage";
import NotFound from "./pages/NotFound";
import MarketplacePage from "./pages/MarketplacePage";
import ManifestoPage from "./pages/ManifestoPage";
import WelcomePage from "./pages/WelcomePage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import { FeedFloatingButton } from "./components/FeedFloatingButton";
import { PraieiroBotWidget } from "./components/PraieiroBotWidget";
import { ConchaTransactionListener } from "./components/ConchaTransactionListener";
import { GlobalBroadcastBanner } from "./components/GlobalBroadcastBanner";
import { 
  BottomNavigation, 
  ContextualSuggestions, 
  QuickShortcuts,
  OnboardingTour 
} from "./components/navigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SatoshiStateProvider>
          <Toaster />
          <Sonner />
          <ConchaTransactionListener />
          <GlobalBroadcastBanner />
          <BrowserRouter>
            <SatoshiIPGuard />
            <Routes>
              <Route path="/acesso-bloqueado" element={<AccessBlockedPage />} />
              <Route path="/" element={<Index />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/cadastro" element={<AuthPage />} />
              <Route path="/autenticacao" element={<AuthPage />} />
              <Route path="/auth" element={<AuthPage />} />
              {/* 🏛️ ROTA CANÔNICA OBRIGATÓRIA - Coração do sistema de auth */}
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route 
                path="/bem-vindo" 
                element={
                  <ProtectedRoute>
                    <WelcomePage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/complete-profile" element={<CompleteProfilePage />} />
              <Route
                path="/encontrar" 
                element={
                  <ProtectedRoute>
                    <EncontrarAmbulantesPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/meus-pedidos" 
                element={
                  <ProtectedRoute>
                    <MeusPedidosPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/ambulantes" element={<AmbulantesPage />} />
              <Route path="/login-ambulante" element={<VendorAuthPage />} />
              <Route path="/painel-ambulante" element={<VendorDashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/sobre" element={<SobreProjetoPage />} />
              <Route path="/soberania" element={<SoberaniaPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/manifesto" element={<ManifestoPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route 
                path="/feed" 
                element={
                  <ProtectedRoute>
                    <FeedPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/perfil" 
                element={
                  <ProtectedRoute>
                    <PerfilPage />
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Componentes globais persistentes */}
            <FeedFloatingButton />
            <PraieiroBotWidget />
            
            {/* Sistema de navegação inteligente */}
            <BottomNavigation />
            <ContextualSuggestions />
            <QuickShortcuts />
            <OnboardingTour />
          </BrowserRouter>
        </SatoshiStateProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
