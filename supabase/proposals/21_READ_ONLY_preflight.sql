-- A.S.V. Contractor 360 - Stage 2 READ ONLY preflight.
-- Safe to run in the existing nexlify-sphere Supabase SQL Editor.
-- This file NEVER executes ALTER/CREATE/INSERT/UPDATE/DELETE/GRANT/REVOKE.
-- Do not remove the proposal gate or enable financial writes based solely on this report.
--
-- Statuses: BLOCK = fix before migration; REVIEW = confirm mapping/semantics;
-- READY = the check passed. No live payment is submitted by this script.

WITH required(table_name, column_name, udt_name) AS (
  VALUES
    ('contractor_transactions','id','int8'),
    ('contractor_transactions','invoice_no','text'),
    ('contractor_transactions','date','date'),
    ('contractor_transactions','category','text'),
    ('contractor_transactions','description','text'),
    ('contractor_transactions','amount','numeric'),
    ('contractor_transactions','source','text'),
    ('contractor_transactions','recipient','text'),
    ('contractor_transactions','advance_paid','numeric'),
    ('contractor_transactions','balance','numeric'),
    ('contractor_transactions','status','text'),
    ('contractor_loans','id','int8'),
    ('contractor_loans','lender_name','text'),
    ('contractor_loans','principal','numeric'),
    ('contractor_loans','repaid_amount','numeric'),
    ('contractor_materials','id','int8'),
    ('contractor_materials','total_amount','numeric'),
    ('contractor_materials','paid_amount','numeric'),
    ('contractor_materials','balance_amount','numeric')
),
column_checks AS (
  SELECT r.table_name, r.column_name, r.udt_name AS expected_type,
         c.udt_name AS actual_type
  FROM required r
  LEFT JOIN information_schema.columns c
    ON c.table_schema='public'
   AND c.table_name=r.table_name
   AND c.column_name=r.column_name
),
rls_table_status AS (
  -- The API's anon/authenticated roles are not table owners. Their safety
  -- depends on RLS + restrictive owner policy and no anon table grants.
  -- FORCE ROW LEVEL SECURITY is not a prerequisite; forcing it can break
  -- owner/SECURITY DEFINER migrations and needs a separate security review.
  SELECT
    c.relname,
    c.relrowsecurity AS rls_enabled,
    has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS anon_any_crud,
    EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = c.relname
        AND p.policyname = 'contractor_owner_gate'
        AND p.permissive = 'RESTRICTIVE'
        AND p.cmd = 'ALL'
        AND 'authenticated' = ANY(p.roles)
        AND coalesce(p.qual,'') ILIKE '%contractor_access_status%'
        AND coalesce(p.with_check,'') ILIKE '%contractor_access_status%'
    ) AS owner_gate_present
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
    AND c.relname = ANY(ARRAY[
      'contractor_transactions','contractor_loans','contractor_materials',
      'contractor_labour','contractor_labour_profiles','contractor_piecework',
      'contractor_daily_works','contractor_mbook','contractor_parties'
    ])
),
result AS (
  SELECT
    'Required base columns and types (19)'::text AS check_name,
    CASE WHEN count(*) FILTER (WHERE actual_type IS DISTINCT FROM expected_type) = 0
         THEN 'READY' ELSE 'BLOCK' END AS status,
    count(*) FILTER (WHERE actual_type IS DISTINCT FROM expected_type)::text
      || ' missing/wrong columns' AS detail
  FROM column_checks

  UNION ALL

  SELECT 'Owner access RPC',
    CASE WHEN to_regprocedure('public.contractor_access_status()') IS NOT NULL
      THEN 'READY' ELSE 'BLOCK' END,
    coalesce(to_regprocedure('public.contractor_access_status()')::text,'missing')

  UNION ALL

  SELECT 'Private membership schema',
    CASE WHEN to_regclass('contractor_private.admin_memberships') IS NOT NULL
      THEN 'READY' ELSE 'BLOCK' END,
    coalesce(to_regclass('contractor_private.admin_memberships')::text,'missing')

  UNION ALL

  SELECT 'RLS + restrictive owner gate + no anon CRUD (nine tables)',
    CASE WHEN count(*)=9 AND bool_and(rls_enabled)
            AND count(*) FILTER (WHERE owner_gate_present)=9
            AND count(*) FILTER (WHERE anon_any_crud)=0
         THEN 'READY' ELSE 'BLOCK' END,
    count(*)::text || ' tables found; '
      || count(*) FILTER (WHERE rls_enabled)::text || ' with RLS; '
      || count(*) FILTER (WHERE owner_gate_present)::text || ' with restrictive owner policy; '
      || count(*) FILTER (WHERE anon_any_crud)::text || ' with anon CRUD grants'
  FROM rls_table_status

  UNION ALL

  SELECT 'Duplicate nonblank invoice numbers',
    CASE WHEN count(*)=0 THEN 'READY' ELSE 'BLOCK' END,
    count(*)::text || ' duplicate invoice values (unique index would fail)'
  FROM (
    SELECT invoice_no FROM public.contractor_transactions
    WHERE invoice_no IS NOT NULL AND invoice_no <> ''
    GROUP BY invoice_no HAVING count(*) > 1
  ) duplicates

  UNION ALL

  SELECT 'Loan principal and repayment bounds',
    CASE WHEN count(*)=0 THEN 'READY' ELSE 'BLOCK' END,
    count(*)::text || ' invalid loan records'
  FROM public.contractor_loans
  WHERE principal < 0 OR coalesce(repaid_amount,0) < 0
     OR coalesce(repaid_amount,0)>principal

  UNION ALL

  SELECT 'Material paid and balance reconciliation',
    CASE WHEN count(*)=0 THEN 'READY' ELSE 'BLOCK' END,
    count(*)::text || ' unreconciled material records'
  FROM public.contractor_materials
  WHERE total_amount < 0 OR coalesce(paid_amount,0)<0
     OR coalesce(balance_amount,0)<0
     OR abs(coalesce(paid_amount,0)+coalesce(balance_amount,0)-total_amount)>0.01

  UNION ALL

  SELECT 'Invalid credit obligation balances',
    CASE WHEN count(*)=0 THEN 'READY' ELSE 'BLOCK' END,
    count(*)::text || ' credit bills with invalid payable values'
  FROM public.contractor_transactions
  WHERE source='Credit'
    AND (amount<0 OR coalesce(advance_paid,0)<0
       OR coalesce(balance,0)<0 OR coalesce(balance,0)>amount
       OR (status='Paid' AND coalesce(balance,0)>0))

  UNION ALL

  SELECT 'Credit bills needing verified material mappings',
    CASE WHEN count(*)=0 THEN 'READY' ELSE 'REVIEW' END,
    count(*)::text || ' material credit obligations have no stored material_id'
  FROM public.contractor_transactions
  WHERE source='Credit'
    AND lower(trim(coalesce(category,''))) IN ('materials','material','మెటీరియల్స్')
    AND nullif(to_jsonb(contractor_transactions)->>'material_id','') IS NULL

  UNION ALL

  SELECT 'Stage 2 idempotency table',
    CASE WHEN to_regclass('contractor_private.idempotency_log') IS NULL
      THEN 'READY' ELSE 'REVIEW' END,
    CASE WHEN to_regclass('contractor_private.idempotency_log') IS NULL
      THEN 'not installed (expected before Stage 2)'
      ELSE 'already exists - migration needs an idempotent review' END

  UNION ALL

  SELECT 'Stage 2 settlement RPC',
    CASE WHEN to_regprocedure('public.settle_supplier_credit_bill(bigint,numeric,text,date,text,bigint,text)') IS NULL
      THEN 'READY' ELSE 'REVIEW' END,
    CASE WHEN to_regprocedure('public.settle_supplier_credit_bill(bigint,numeric,text,date,text,bigint,text)') IS NULL
      THEN 'not installed (expected before Stage 2)'
      ELSE 'already exists - compare function definition before replacing' END

  UNION ALL

  SELECT 'Stage 2 loan repayment RPC',
    CASE WHEN to_regprocedure('public.record_loan_repayment(bigint,numeric,numeric,text,date,text,text)') IS NULL
      THEN 'READY' ELSE 'REVIEW' END,
    CASE WHEN to_regprocedure('public.record_loan_repayment(bigint,numeric,numeric,text,date,text,text)') IS NULL
      THEN 'not installed (expected before Stage 2)'
      ELSE 'already exists - compare function definition before replacing' END
)
SELECT check_name, status, detail
FROM result
ORDER BY CASE status WHEN 'BLOCK' THEN 0 WHEN 'REVIEW' THEN 1 ELSE 2 END,
         check_name;
