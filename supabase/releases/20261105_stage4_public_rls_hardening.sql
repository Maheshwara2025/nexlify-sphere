-- A.S.V. / Nexlify Stage 4: least-privilege exposed public-table access
-- 2026-11-05. Production migration; does not alter data or Stage 2/3 RPC definitions.
-- All changes are transactional; refuse if the inspected security inventory has drifted.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='60s';

DO $preflight$
DECLARE v_count int;
BEGIN
  IF to_regprocedure('public.contractor_access_status()') IS NULL
     OR to_regclass('contractor_private.admin_memberships') IS NULL THEN
    RAISE EXCEPTION 'Stage 4 requires the pre-existing verified admin authorization RPC and trust table';
  END IF;
  SELECT count(*) INTO v_count
    FROM contractor_private.admin_memberships WHERE enabled IS TRUE;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'No enabled verified admin: migration would cause owner lockout';
  END IF;
  IF EXISTS (
    WITH targets AS (
      SELECT unnest(ARRAY[
        'contractor_cashbook','contractor_contacts','contractor_gd_entries',
        'contractor_gst_vault','contractor_material_stock','contractor_projects',
        'contractor_vendor_dues','news_articles','service_requests'
      ]) AS name
    )
    SELECT 1 FROM targets t
      LEFT JOIN pg_class c ON c.oid=to_regclass('public.'||t.name)
    WHERE c.oid IS NULL OR c.relkind <> 'r' OR c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Stage 4 inventory drift: an expected unprotected table is missing or already changed';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
      AND tablename = ANY (ARRAY[
        'contractor_cashbook','contractor_contacts','contractor_gd_entries',
        'contractor_gst_vault','contractor_material_stock','contractor_projects',
        'contractor_vendor_dues','news_articles','service_requests'
      ])) <> 7 THEN
    RAISE EXCEPTION 'Stage 4 policy inventory drift: expected exactly seven old permissive policies';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public'
       AND tablename = ANY (ARRAY[
         'contractor_cashbook','contractor_contacts','contractor_gd_entries',
         'contractor_gst_vault','contractor_material_stock','contractor_projects',
         'contractor_vendor_dues','news_articles','service_requests'
       ])
       AND NOT (
         (tablename='contractor_cashbook' AND policyname='Admin full access cashbook') OR
         (tablename='contractor_gd_entries' AND policyname='Admin full access gd_entries') OR
         (tablename='contractor_gst_vault' AND policyname='Admin full access gst_vault') OR
         (tablename='contractor_material_stock' AND policyname='Admin full access material_stock') OR
         (tablename='contractor_projects' AND policyname='Admin full access projects') OR
         (tablename='contractor_vendor_dues' AND policyname='Admin full access vendor_dues') OR
         (tablename='news_articles' AND policyname='Enable all access for all users')
       )
  ) THEN
    RAISE EXCEPTION 'Stage 4 unexpected policies; manual review needed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename=ANY(ARRAY[
        'contractor_cashbook','contractor_gd_entries','contractor_gst_vault',
        'contractor_material_stock','contractor_projects','contractor_vendor_dues'])
      AND (cmd <> 'ALL' OR qual IS DISTINCT FROM 'true' OR with_check IS DISTINCT FROM 'true')
  ) THEN
    RAISE EXCEPTION 'Legacy contractor policies changed since inspection';
  END IF;
END $preflight$;

-- Drop unconditional policies: a permissive USING(true) overrides later restrictive policies.
DROP POLICY "Admin full access cashbook" ON public.contractor_cashbook;
DROP POLICY "Admin full access gd_entries" ON public.contractor_gd_entries;
DROP POLICY "Admin full access gst_vault" ON public.contractor_gst_vault;
DROP POLICY "Admin full access material_stock" ON public.contractor_material_stock;
DROP POLICY "Admin full access projects" ON public.contractor_projects;
DROP POLICY "Admin full access vendor_dues" ON public.contractor_vendor_dues;
DROP POLICY "Enable all access for all users" ON public.news_articles;

-- Legacy Contractor side tables: owner-only read, direct browser mutations disallowed.
-- Approved atomic financial changes still go through existing Stage 2/3 SECURITY DEFINER RPCs.
DO $contractor$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'contractor_cashbook','contractor_contacts','contractor_gd_entries',
    'contractor_gst_vault','contractor_material_stock','contractor_projects',
    'contractor_vendor_dues'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',table_name);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated',table_name);
    EXECUTE format(
      'CREATE POLICY contractor_verified_owner_select ON public.%I FOR SELECT TO authenticated USING (coalesce((SELECT (public.contractor_access_status()->>''is_admin'')::boolean),false))',
      table_name
    );
  END LOOP;
END $contractor$;

-- Public news remains readable; only the verified owner can insert/edit/delete.
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.news_articles FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.news_articles TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON TABLE public.news_articles TO authenticated;
CREATE POLICY news_read_for_all ON public.news_articles FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY news_owner_insert ON public.news_articles FOR INSERT TO authenticated
  WITH CHECK (coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false));
CREATE POLICY news_owner_update ON public.news_articles FOR UPDATE TO authenticated
  USING (coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false))
  WITH CHECK (coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false));
CREATE POLICY news_owner_delete ON public.news_articles FOR DELETE TO authenticated
  USING (coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false));

-- Public service enquiry: accept submissions without allowing anonymous contact-list reads.
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_requests FROM PUBLIC,anon,authenticated;
GRANT INSERT ON TABLE public.service_requests TO anon,authenticated;
GRANT SELECT,UPDATE,DELETE ON TABLE public.service_requests TO authenticated;
CREATE POLICY service_request_public_insert ON public.service_requests FOR INSERT TO anon,authenticated
  WITH CHECK (true);
CREATE POLICY service_request_owner_read ON public.service_requests FOR SELECT TO authenticated
  USING (coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false));
CREATE POLICY service_request_owner_update ON public.service_requests FOR UPDATE TO authenticated
  USING (coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false))
  WITH CHECK (coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false));
CREATE POLICY service_request_owner_delete ON public.service_requests FOR DELETE TO authenticated
  USING (coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false));

-- Harden legacy SECURITY DEFINER trigger: do not expose direct anonymous invocation.
-- Existing trigger execution remains database-managed.
REVOKE ALL ON FUNCTION public.process_contractor_gd_entry() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.process_contractor_gd_entry() SET search_path=pg_catalog,public;

COMMIT;
