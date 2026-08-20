-- 0) Funções que usam pgcrypto precisam de search_path com extensions
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.prosrc ~ '(digest|hmac|gen_salt|crypt|gen_random_bytes)\('
      AND COALESCE(array_to_string(p.proconfig,','),'') NOT LIKE '%extensions%'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', f.sig);
  END LOOP;
END $$;

-- 1) GRANTS de Data API
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relkind='r' AND n.nspname='public' AND c.relname <> 'spatial_ref_sys'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
  END LOOP;
END $$;

-- 2) Gênesis possível
ALTER TABLE public.profiles ALTER COLUMN full_name SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN email SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN cpf DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cpf_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cpf_valid
  CHECK (cpf IS NULL OR cpf = '' OR validate_cpf(cpf));

-- 3) RLS canônica
DROP POLICY IF EXISTS profiles_select_own_full ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;

CREATE POLICY profiles_select_own_full ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- 4) ADM autorizado
INSERT INTO public.admin_allowed_emails (email, is_active)
VALUES ('soupraieiro.ssa@gmail.com', true)
ON CONFLICT (email) DO UPDATE SET is_active = true;

-- 5) Trigger de gênesis
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, full_name)
  VALUES (NEW.id, NEW.id, COALESCE(NEW.email,''), COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  IF EXISTS (
    SELECT 1 FROM public.admin_allowed_emails
    WHERE lower(email) = lower(COALESCE(NEW.email,'')) AND is_active
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 6) Backfill
INSERT INTO public.profiles (id, user_id, email, full_name)
SELECT u.id, u.id, COALESCE(u.email,''), COALESCE(u.raw_user_meta_data->>'full_name','')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user' FROM auth.users u
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin' FROM auth.users u
WHERE lower(u.email) = 'soupraieiro.ssa@gmail.com'
ON CONFLICT DO NOTHING;