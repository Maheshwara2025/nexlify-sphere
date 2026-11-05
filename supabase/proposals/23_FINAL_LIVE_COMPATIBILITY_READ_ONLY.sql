-- A.S.V. CONTRACTOR 360 - final live compatibility check (READ ONLY)
-- Run in existing nexlify-sphere Supabase SQL Editor before Stage 2 migration.
-- No DDL or financial writes. This does not validate the installed auth context.
WITH tx_columns AS (
  SELECT column_name, is_nullable, column_default, is_identity, is_generated, data_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='contractor_transactions'
),
required_insert_columns(name) AS (
  VALUES ('date'), ('category'), ('description'), ('amount'), ('source'),
         ('recipient'), ('invoice_no'), ('advance_paid'), ('balance'), ('status'),
         ('entry_type'), ('obligation_id'), ('material_id'), ('loan_id')
),
results AS (
  SELECT 'Transaction ID auto-generation'::text AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM tx_columns
      WHERE column_name='id' AND
        (is_identity='YES' OR column_default LIKE 'nextval(%')
    ) THEN 'READY' ELSE 'BLOCK' END AS status,
    coalesce((SELECT 'identity='||is_identity||'; default='||coalesce(column_default,'NULL')
       FROM tx_columns WHERE column_name='id'), 'id column missing') AS detail

  UNION ALL
  SELECT 'Unfilled required transaction columns', 
    CASE WHEN count(*)=0 THEN 'READY' ELSE 'BLOCK' END,
    coalesce(string_agg(column_name, ', '), '0 unexpected NOT NULL fields') 
  FROM tx_columns
  WHERE is_nullable='NO'
    AND column_default IS NULL
    AND is_identity <> 'YES'
    AND coalesce(is_generated,'NEVER')='NEVER'
    AND column_name NOT IN (
      'date','category','description','amount','source','recipient',
      'invoice_no','advance_paid','balance','status','entry_type',
      'obligation_id','material_id','loan_id'
    )

  UNION ALL
  SELECT 'Existing payment extension columns',
    CASE WHEN count(*)=0 THEN 'READY' ELSE 'REVIEW' END,
    coalesce(string_agg(c.column_name||':'||c.data_type, ', '), 'new columns will be added')
  FROM tx_columns c 
  WHERE c.column_name IN ('entry_type','obligation_id','material_id','loan_id')

  UNION ALL
  SELECT 'Non-internal transaction table triggers',
    CASE WHEN count(*)=0 THEN 'READY' ELSE 'REVIEW' END,
    coalesce(string_agg(t.tgname, ', '),'0 custom triggers')
  FROM pg_trigger t
  WHERE t.tgrelid='public.contractor_transactions'::regclass AND NOT t.tgisinternal

  UNION ALL
  SELECT 'Existing credit material link',
    CASE WHEN count(*)=0 THEN 'READY' ELSE 'REVIEW' END,
    coalesce(string_agg(c.column_name,', '),'obligation_tx_id will be added')
  FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.table_name='contractor_materials'
    AND c.column_name='obligation_tx_id'

  UNION ALL
  SELECT 'Security-definer creator privileges',
    CASE WHEN r.rolsuper OR r.rolbypassrls THEN 'READY' ELSE 'BLOCK' END,
    'current_user='||current_user||'; superuser='||r.rolsuper||'; bypassrls='||r.rolbypassrls
  FROM pg_roles r
  WHERE r.rolname=current_user

  UNION ALL
  SELECT 'Existing stored payment functions',
    CASE WHEN count(*)=0 THEN 'READY' ELSE 'REVIEW' END,
    coalesce(string_agg(p.proname,', '),'both missing as expected')
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname IN ('settle_supplier_credit_bill','record_loan_repayment')

  UNION ALL
  SELECT 'Existing invoice unique indexes',
    CASE WHEN count(*)=0 THEN 'REVIEW' ELSE 'READY' END,
    coalesce(string_agg(i.indexname,', '), 'Stage 2 will add unique index')
  FROM pg_indexes i
  WHERE i.schemaname='public' AND i.tablename='contractor_transactions'
    AND i.indexdef ILIKE '%UNIQUE%' AND i.indexdef ILIKE '%invoice_no%'
)
SELECT check_name, status, detail
FROM results
ORDER BY CASE status WHEN 'BLOCK' THEN 0 WHEN 'REVIEW' THEN 1 ELSE 2 END, check_name;
