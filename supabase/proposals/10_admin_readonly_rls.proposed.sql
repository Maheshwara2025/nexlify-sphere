-- PROPOSAL ONLY. Never auto-run; needs separate, explicit remote-DB approval.
-- First rollout is SELECT-ONLY. It does not enable any financial or operational mutation.
BEGIN;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '3s';

DO $proposal_gate$
BEGIN
  RAISE EXCEPTION 'PROPOSAL ONLY: review catalog export, complete fingerprint, obtain separate DB approval, and remove this gate in a reviewed migration';
END
$proposal_gate$;

CREATE TEMP TABLE _contractor_security_review (
  expected_security_fingerprint text NOT NULL,
  approval_reference text NOT NULL
) ON COMMIT DROP;
INSERT INTO _contractor_security_review VALUES (
  'REVIEW_REQUIRED', 'SEPARATE_DATABASE_APPROVAL_REQUIRED'
);

CREATE TEMP TABLE _contractor_current_security ON COMMIT DROP AS

WITH targets AS (
  SELECT unnest(ARRAY[
    'contractor_transactions', 'contractor_loans', 'contractor_labour_profiles',
    'contractor_piecework', 'contractor_mbook', 'contractor_daily_works',
    'contractor_labour', 'contractor_materials', 'contractor_parties'
  ]) AS table_name
), snapshot AS (
  SELECT t.table_name, c.oid::text AS table_oid, c.relkind, c.relrowsecurity,
         c.relforcerowsecurity, c.relowner::regrole::text AS owner,
         c.relacl::text AS table_acl,
         (SELECT jsonb_agg(jsonb_build_object(
            'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
            'not_null', a.attnotnull, 'acl', a.attacl::text,
            'default', pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum)
          FROM pg_attribute a LEFT JOIN pg_attrdef d
            ON d.adrelid = a.attrelid AND d.adnum = a.attnum
          WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
         (SELECT jsonb_agg(jsonb_build_object(
            'name', p.polname, 'command', p.polcmd, 'permissive', p.polpermissive,
            'roles', p.polroles::text, 'using', pg_get_expr(p.polqual, p.polrelid),
            'check', pg_get_expr(p.polwithcheck, p.polrelid)) ORDER BY p.polname)
          FROM pg_policy p WHERE p.polrelid = c.oid) AS policies,
         (SELECT jsonb_agg(pg_get_constraintdef(k.oid, true) ORDER BY k.conname)
          FROM pg_constraint k WHERE k.conrelid = c.oid) AS constraints,
         (SELECT jsonb_agg(pg_get_triggerdef(g.oid, true) ORDER BY g.tgname)
          FROM pg_trigger g WHERE g.tgrelid = c.oid AND NOT g.tgisinternal) AS triggers
  FROM targets t LEFT JOIN pg_class c ON c.oid = to_regclass('public.' || t.table_name)
)
SELECT md5(coalesce(jsonb_agg(to_jsonb(snapshot) ORDER BY table_name)::text, '[]')) AS security_fingerprint
FROM snapshot
;

DO $preflight$
DECLARE
  t text;
  c regclass;
  actual text;
  expected text;
BEGIN
  SELECT expected_security_fingerprint INTO expected FROM _contractor_security_review;
  SELECT security_fingerprint INTO actual FROM _contractor_current_security;
  IF expected = 'REVIEW_REQUIRED' OR expected IS DISTINCT FROM actual THEN
    RAISE EXCEPTION 'Unreviewed or changed legacy security/schema fingerprint';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolsuper OR rolbypassrls))
     OR current_user IN ('anon','authenticated','service_role') THEN
    RAISE EXCEPTION 'Requires a separately approved, trusted database migration owner';
  END IF;
  IF to_regrole('anon') IS NULL OR to_regrole('authenticated') IS NULL
     OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'Expected Supabase roles/auth.uid are absent';
  END IF;
  IF to_regclass('auth.users') IS NULL OR NOT EXISTS (
     SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('auth.users')
       AND attname = 'id' AND atttypid = 'uuid'::regtype AND attnotnull) THEN
    RAISE EXCEPTION 'auth.users.id uuid NOT NULL must be verified';
  END IF;
  IF to_regnamespace('contractor_private') IS NOT NULL
     OR to_regprocedure('public.contractor_access_status()') IS NOT NULL THEN
    RAISE EXCEPTION 'Existing trust objects require a separate reviewed upgrade; do not replace blindly';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'Existing public SECURITY DEFINER routines need explicit review; no implicit allowlist';
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'contractor_transactions','contractor_loans','contractor_labour_profiles',
    'contractor_piecework','contractor_mbook','contractor_daily_works',
    'contractor_labour','contractor_materials','contractor_parties'
  ] LOOP
    c := to_regclass('public.' || t);
    IF c IS NULL OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = c AND relkind = 'r') THEN
      RAISE EXCEPTION 'Missing/nonordinary legacy table: %', t;
    END IF;
    -- Locks fail quickly instead of interrupting an unknown production workload.
    EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE', t);
    IF EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = c) THEN
      -- PostgreSQL permissive policies OR together. Adding an admin policy is insufficient.
      RAISE EXCEPTION 'Existing policies on % must be reviewed explicitly; no policies are silently dropped', t;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = c AND attnum > 0 AND attacl IS NOT NULL) THEN
      RAISE EXCEPTION 'Existing column grants on % require explicit review', t;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE oid = c
       AND pg_get_userbyid(relowner) IN ('anon','authenticated')) THEN
      RAISE EXCEPTION 'Untrusted legacy table owner on %', t;
    END IF;
  END LOOP;
END
$preflight$;

-- Prevent concurrent catalog changes between fingerprint comparison and policy creation:
-- production migration must acquire these locks BEFORE its final fingerprint calculation.
-- The reviewed runnable version must move the fingerprint calculation under the same locks.

CREATE SCHEMA contractor_private;
REVOKE ALL ON SCHEMA contractor_private FROM PUBLIC, anon, authenticated;

-- Empty, private, fail-closed trust map. No admin identity is bootstrapped by this proposal.
CREATE TABLE contractor_private.admin_memberships (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE contractor_private.admin_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE contractor_private.admin_memberships FROM PUBLIC, anon, authenticated;

-- Trusted definer owns the private map; table-owner bypass is intentional on this table only.
-- auth.uid() reads the caller's signed JWT identity; user_metadata is never used for trust.
CREATE FUNCTION public.contractor_access_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $status$
  SELECT pg_catalog.jsonb_build_object(
    'is_admin', EXISTS (
      SELECT 1 FROM contractor_private.admin_memberships AS m
      WHERE m.user_id = (SELECT auth.uid()) AND m.enabled
    )
  );
$status$;
REVOKE ALL ON FUNCTION public.contractor_access_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_access_status() TO authenticated;

DO $policies$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contractor_transactions','contractor_loans','contractor_labour_profiles',
    'contractor_piecework','contractor_mbook','contractor_daily_works',
    'contractor_labour','contractor_materials','contractor_parties'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', t);
    EXECUTE format(
      'CREATE POLICY contractor_admin_read ON public.%I FOR SELECT TO authenticated USING ((public.contractor_access_status() ->> ''is_admin'')::boolean)',
      t
    );
  END LOOP;
END
$policies$;

-- No INSERT/UPDATE/DELETE policies, no authenticated DML grants, no membership mutation RPC.
-- No data rows, existing transactions, legacy budget values, or old attachments are changed.
-- Membership bootstrap must be a separately reviewed owner action using a verified auth UUID.
-- Re-run the verification inventory and role tests before considering release.
COMMIT;

