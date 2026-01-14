-- ============================================================
-- CORREÇÃO DE SEGURANÇA: Políticas RLS para dados sensíveis
-- ============================================================

-- 1. Remover políticas RLS existentes da tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 2. Criar políticas RLS seguras para profiles
-- Usuário só pode ver/editar seu próprio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Corrigir políticas de vendors - remover acesso público
DROP POLICY IF EXISTS "Authenticated can view active vendors" ON public.vendors;

-- Política para vendors - usuários só veem seus próprios dados
CREATE POLICY "vendors_select_own" ON public.vendors
FOR SELECT USING (
  profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);