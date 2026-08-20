DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT DISTINCT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.cmd IN ('SELECT','ALL')
      AND (p.roles::text LIKE '%anon%' OR p.roles::text LIKE '%public%')
      AND COALESCE(p.qual,'true') NOT LIKE '%auth.uid()%'
      AND COALESCE(p.qual,'true') NOT LIKE '%has_role%'
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t.tablename);
  END LOOP;
END $$;