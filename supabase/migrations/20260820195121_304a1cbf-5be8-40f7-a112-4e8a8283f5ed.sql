-- função sem recursão
CREATE OR REPLACE FUNCTION public.is_active_vendor_profile(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.vendors v WHERE v.profile_id = _profile_id AND v.status = 'active');
$$;
REVOKE ALL ON FUNCTION public.is_active_vendor_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_vendor_profile(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS profiles_select_public_data ON public.profiles;
CREATE POLICY profiles_select_public_data ON public.profiles
  FOR SELECT USING (public.is_active_vendor_profile(id));

-- vendors: identidade soberana, sem subconsulta em profiles
DROP POLICY IF EXISTS "Users can insert own vendor data" ON public.vendors;
DROP POLICY IF EXISTS "Users can update own vendor data" ON public.vendors;
DROP POLICY IF EXISTS "Users can view own vendor data" ON public.vendors;
DROP POLICY IF EXISTS vendors_select_own ON public.vendors;

CREATE POLICY vendors_insert_own ON public.vendors
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY vendors_update_own ON public.vendors
  FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY vendors_select_own ON public.vendors
  FOR SELECT TO authenticated USING (profile_id = auth.uid());