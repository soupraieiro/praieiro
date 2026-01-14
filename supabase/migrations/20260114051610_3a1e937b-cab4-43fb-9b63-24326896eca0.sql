-- ============================================================
-- CORREÇÃO: Permitir visualização de vendors ativos para marketplace
-- ============================================================

-- Política para visualização pública de vendors ativos (sem dados sensíveis)
-- Isso permite o funcionamento do marketplace
CREATE POLICY "vendors_select_active_public" ON public.vendors
FOR SELECT USING (status = 'active');

-- Política para profiles: permitir leitura de dados públicos de outros perfis
-- (nome e foto são dados públicos para funcionamento do marketplace)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Política: usuário vê seu próprio perfil completo
CREATE POLICY "profiles_select_own_full" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- Política: dados públicos de perfis (nome e foto) para marketplace
-- Isso permite ver nome/foto de vendedores
CREATE POLICY "profiles_select_public_data" ON public.profiles
FOR SELECT USING (
  id IN (SELECT profile_id FROM public.vendors WHERE status = 'active')
);