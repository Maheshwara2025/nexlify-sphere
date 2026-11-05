-- PROPOSAL ONLY. Never auto-run; requires separate, explicit remote-DB approval.
-- File: supabase/proposals/22_guarded_atomic_settlements_and_repayments_REVIEW.sql
-- REVIEW ONLY: requires read-only preflight and test database proof before approval.
-- Module: A.S.V. Contractor 360° ERP - Stage 2 Guarded Atomic Settlements & Repayments
--
-- EXACT MIGRATION DEPENDENCY LIST:
-- 1. PostgreSQL 14+ with pgcrypto extension enabled.
-- 2. Stage 1 Owner Bootstrap installed:
--    - Schema 'contractor_private' exists with revoked public access.
--    - Table 'contractor_private.admin_memberships' exists with verified owner user ID.
--    - Function 'public.contractor_access_status()' exists and returns {"is_admin": true}.
--    - Restrictive owner-only RLS policies applied to all 9 contractor_* tables.
-- 3. Base legacy tables confirmed present:
--    - public.contractor_transactions (with columns id, invoice_no, date, category, description, amount, source, recipient, advance_paid, balance, status)
--    - public.contractor_loans (with columns id, lender_name, principal, interest_rate, repaid_amount)
--    - public.contractor_materials (with columns id, date, party_name, material_name, quantity, unit, unit_rate, transport_cost, total_amount, paid_amount, balance_amount)
-- 4. Scope Note:
--    This migration covers ONLY Supplier Credit Bill Settlements and Loan Repayments.
--    General Expenses, Material Purchases and Labour/Piecework Payments remain separate future atomic procedures.

BEGIN;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '3s';

-- -----------------------------------------------------------------------------
-- 0. PROPOSAL APPROVAL GATE
-- -----------------------------------------------------------------------------
DO $proposal_gate$
BEGIN
  RAISE EXCEPTION 'PROPOSAL ONLY: review database schema, verify migration dependencies, obtain separate DB approval, and remove this gate in an approved migration';
END
$proposal_gate$;

-- -----------------------------------------------------------------------------
-- 1. READ-ONLY PREFLIGHT VERIFICATION
-- -----------------------------------------------------------------------------
DO $preflight$
DECLARE
  v_table text;
  v_reg regclass;
BEGIN
  -- Verify executing user is trusted superuser or migration admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = current_user AND (rolsuper OR rolbypassrls)
  ) OR current_user IN ('anon', 'authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Preflight: Requires a separately approved, trusted database migration administrator';
  END IF;

  -- Verify Supabase roles and auth infrastructure
  IF to_regrole('anon') IS NULL OR to_regrole('authenticated') IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'Preflight: Expected Supabase auth roles or auth.uid() function are absent';
  END IF;

  -- Verify contractor_private schema and contractor_access_status exist
  IF to_regnamespace('contractor_private') IS NULL THEN
    RAISE EXCEPTION 'Preflight: Missing prerequisite contractor_private schema. Run Stage 1 bootstrap first.';
  END IF;

  IF to_regprocedure('public.contractor_access_status()') IS NULL THEN
    RAISE EXCEPTION 'Preflight: Missing prerequisite public.contractor_access_status() function. Run Stage 1 bootstrap first.';
  END IF;

  -- Verify required tables exist and have RLS enabled
  FOREACH v_table IN ARRAY ARRAY['contractor_transactions', 'contractor_loans', 'contractor_materials'] LOOP
    v_reg := to_regclass('public.' || v_table);
    IF v_reg IS NULL THEN
      RAISE EXCEPTION 'Preflight: Required table public.% does not exist', v_table;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_table AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'Preflight: Table public.% must have Row Level Security enabled', v_table;
    END IF;
  END LOOP;
END;
$preflight$;

-- -----------------------------------------------------------------------------
-- 2. SCHEMA INTEGRITY EXTENSIONS & IMMUTABLE RELATIONSHIPS
-- -----------------------------------------------------------------------------

-- A. Add ledger reconciliation columns to contractor_transactions if not present
ALTER TABLE public.contractor_transactions
  ADD COLUMN IF NOT EXISTS entry_type text,
  ADD COLUMN IF NOT EXISTS obligation_id bigint,
  ADD COLUMN IF NOT EXISTS loan_id bigint,
  ADD COLUMN IF NOT EXISTS material_id bigint;

-- Foreign key constraints for ledger references
DO $fk_setup$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_contractor_tx_obligation'
  ) THEN
    ALTER TABLE public.contractor_transactions
      ADD CONSTRAINT fk_contractor_tx_obligation
      FOREIGN KEY (obligation_id) REFERENCES public.contractor_transactions(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_contractor_tx_loan'
  ) THEN
    ALTER TABLE public.contractor_transactions
      ADD CONSTRAINT fk_contractor_tx_loan
      FOREIGN KEY (loan_id) REFERENCES public.contractor_loans(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_contractor_tx_material'
  ) THEN
    ALTER TABLE public.contractor_transactions
      ADD CONSTRAINT fk_contractor_tx_material
      FOREIGN KEY (material_id) REFERENCES public.contractor_materials(id)
      ON DELETE RESTRICT;
  END IF;
END;
$fk_setup$;

-- B. Add paid/balance columns and obligation link to contractor_materials if not present
ALTER TABLE public.contractor_materials
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_amount numeric,
  ADD COLUMN IF NOT EXISTS obligation_tx_id bigint;

DO $mat_fk_setup$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_contractor_mat_obligation'
  ) THEN
    ALTER TABLE public.contractor_materials
      ADD CONSTRAINT fk_contractor_mat_obligation
      FOREIGN KEY (obligation_tx_id) REFERENCES public.contractor_transactions(id)
      ON DELETE RESTRICT;
  END IF;
END;
$mat_fk_setup$;

-- C. Collision-resistant unique index on invoice_no
CREATE UNIQUE INDEX IF NOT EXISTS uq_contractor_transactions_invoice_no
  ON public.contractor_transactions(invoice_no)
  WHERE invoice_no IS NOT NULL AND invoice_no <> '';

-- -----------------------------------------------------------------------------
-- 3. REQUEST-BOUND IDEMPOTENCY LOG TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contractor_private.idempotency_log (
  idempotency_key text PRIMARY KEY,
  operation text NOT NULL,
  entity_id text NOT NULL,
  request_hash text NOT NULL,
  request_payload jsonb NOT NULL,
  response_payload jsonb NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE contractor_private.idempotency_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE contractor_private.idempotency_log FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. ATOMIC SUPPLIER CREDIT SETTLEMENT RPC
-- -----------------------------------------------------------------------------
-- Settles credit bills with real cash/bank/UPI outflows, updates obligation balance,
-- verifies immutable material link (failing closed if unlinked), checks affected-row
-- counts, generates collision-resistant vouchers, and reconciles ledger entry_type.
CREATE OR REPLACE FUNCTION public.settle_supplier_credit_bill(
  p_obligation_id bigint,
  p_payment_amount numeric,
  p_funding_source text,
  p_payment_date date,
  p_idempotency_key text,
  p_material_id bigint DEFAULT NULL,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $settle$
DECLARE
  v_is_admin boolean;
  v_user_id uuid;
  v_existing_op text;
  v_existing_entity text;
  v_existing_owner uuid;
  v_existing_req jsonb;
  v_existing_resp jsonb;
  v_req_hash text;
  v_bill record;
  v_mat record;
  v_mat_balance numeric;
  v_new_balance numeric;
  v_new_status text;
  v_voucher_no text;
  v_payment_tx_id bigint;
  v_bill_rows integer;
  v_mat_rows integer;
BEGIN
  -- A. Admin Security Gate: strictly verified against single-owner membership
  SELECT (public.contractor_access_status() ->> 'is_admin')::boolean, auth.uid()
  INTO v_is_admin, v_user_id;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: only verified administrators can settle supplier bills.';
  END IF;

  -- B. Input Bounds & Type Validation
  IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' THEN
    RAISE EXCEPTION 'Invalid idempotency key: must be a 16-128 character alphanumeric string.';
  END IF;

  IF p_obligation_id IS NULL OR p_obligation_id <= 0 THEN
    RAISE EXCEPTION 'A valid immutable obligation ID is required.';
  END IF;

  IF p_payment_amount IS NULL OR p_payment_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive and greater than zero.';
  END IF;

  IF round(p_payment_amount, 2) <> p_payment_amount THEN
    RAISE EXCEPTION 'Payment amount cannot have more than two decimal places.';
  END IF;

  IF p_funding_source NOT IN ('Cash', 'Bank', 'UPI') THEN
    RAISE EXCEPTION 'Invalid funding source: must be Cash, Bank, or UPI.';
  END IF;

  IF p_payment_date IS NULL THEN
    RAISE EXCEPTION 'Payment date is required.';
  END IF;

  -- C. Database-Safe Concurrency: Transaction-level advisory lock on idempotency key
  PERFORM pg_advisory_xact_lock(hashtext('idemp:' || p_idempotency_key));

  -- D. Request-Bound Idempotency Check
  v_req_hash := md5(
    'supplier_settlement:' ||
    p_obligation_id::text || ':' ||
    p_payment_amount::text || ':' ||
    p_funding_source || ':' ||
    p_payment_date::text || ':' ||
    coalesce(p_material_id::text, 'none') || ':' || coalesce(p_notes,'')
  );

  SELECT operation, entity_id, user_id, request_payload, response_payload
  INTO v_existing_op, v_existing_entity, v_existing_owner, v_existing_req, v_existing_resp
  FROM contractor_private.idempotency_log
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    -- Verify every request parameter matches exactly; reject conflicting reuse
    IF v_existing_op <> 'supplier_settlement'
       OR v_existing_entity <> p_obligation_id::text
       OR v_existing_owner IS DISTINCT FROM v_user_id
       OR (v_existing_req ->> 'amount')::numeric <> p_payment_amount
       OR (v_existing_req ->> 'funding') <> p_funding_source
       OR (v_existing_req ->> 'date')::date <> p_payment_date
       OR coalesce(v_existing_req ->> 'material_id', '') <> coalesce(p_material_id::text, '')
       OR coalesce(v_existing_req ->> 'notes','') <> coalesce(p_notes,'') THEN
      RAISE EXCEPTION 'Idempotency conflict: key "%" has already been used for a different request payload.', p_idempotency_key;
    END IF;
    RETURN v_existing_resp;
  END IF;

  -- E. Row-level Lock on Obligation (Prevents Race Conditions)
  SELECT * INTO v_bill
  FROM public.contractor_transactions
  WHERE id = p_obligation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit bill transaction % not found.', p_obligation_id;
  END IF;

  IF v_bill.source <> 'Credit' THEN
    RAISE EXCEPTION 'Transaction % is not a credit obligation (source is "%").', p_obligation_id, v_bill.source;
  END IF;

  IF coalesce(v_bill.balance, 0) <= 0 OR v_bill.status = 'Paid' THEN
    RAISE EXCEPTION 'Credit bill % is already fully paid.', p_obligation_id;
  END IF;

  IF p_payment_amount > v_bill.balance THEN
    RAISE EXCEPTION 'Payment amount (₹%) exceeds outstanding bill balance (₹%).', p_payment_amount, v_bill.balance;
  END IF;

  -- Missing material references must never leave the material balance stale.
  -- Legacy rows without immutable links need a separate reviewed mapping.
  IF p_material_id IS NULL
      AND (v_bill.material_id IS NOT NULL
        OR lower(trim(coalesce(v_bill.category,''))) IN ('materials','material','మెటీరియల్స్')) THEN
    RAISE EXCEPTION 'Material credit bill requires a verified immutable material ID.';
  END IF;

  -- F. Immutable Material Link Verification (Fail Closed on Unlinked/Mismatched)
  IF p_material_id IS NOT NULL THEN
    SELECT * INTO v_mat
    FROM public.contractor_materials
    WHERE id = p_material_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked material record % not found.', p_material_id;
    END IF;

    -- A one-sided immutable link is acceptable, conflicting links are never acceptable.
    IF (v_bill.material_id IS NOT NULL AND v_bill.material_id <> p_material_id)
      OR (v_mat.obligation_tx_id IS NOT NULL AND v_mat.obligation_tx_id <> p_obligation_id)
      OR (v_bill.material_id IS NULL AND v_mat.obligation_tx_id IS NULL) THEN
      RAISE EXCEPTION 'Missing or conflicting immutable material mapping: bill %, material %.', p_obligation_id, p_material_id;
    END IF;

    IF v_mat.total_amount < 0 OR coalesce(v_mat.paid_amount,0) < 0
      OR coalesce(v_mat.balance_amount,0) < 0
      OR abs(coalesce(v_mat.paid_amount,0)+coalesce(v_mat.balance_amount,0)-v_mat.total_amount)>0.01 THEN
      RAISE EXCEPTION 'Material % balance inconsistent: reconcile before settlement.', p_material_id;
    END IF;

    -- Verify material balance and prevent overpayment
    v_mat_balance := coalesce(v_mat.balance_amount, coalesce(v_mat.total_amount, 0) - coalesce(v_mat.paid_amount, 0));
    IF p_payment_amount > v_mat_balance THEN
      RAISE EXCEPTION 'Payment amount (₹%) exceeds material % outstanding balance (₹%).', p_payment_amount, p_material_id, v_mat_balance;
    END IF;

    -- Update material row and verify affected-row count
    UPDATE public.contractor_materials
    SET paid_amount = coalesce(paid_amount, 0) + p_payment_amount,
        balance_amount = greatest(0, coalesce(total_amount, 0) - (coalesce(paid_amount, 0) + p_payment_amount))
    WHERE id = p_material_id;

    GET DIAGNOSTICS v_mat_rows = ROW_COUNT;
    IF v_mat_rows <> 1 THEN
      RAISE EXCEPTION 'Material update failed: expected 1 row affected, got %.', v_mat_rows;
    END IF;
  END IF;

  -- G. Atomic Balance Update on Obligation & Verify Affected Row Count
  v_new_balance := v_bill.balance - p_payment_amount;
  v_new_status := CASE WHEN v_new_balance = 0 THEN 'Paid' ELSE 'Due' END;

  UPDATE public.contractor_transactions
  SET balance = v_new_balance,
      status = v_new_status
  WHERE id = p_obligation_id;

  GET DIAGNOSTICS v_bill_rows = ROW_COUNT;
  IF v_bill_rows <> 1 THEN
    RAISE EXCEPTION 'Obligation update failed: expected 1 row affected, got %.', v_bill_rows;
  END IF;

  -- H. Collision-Resistant Voucher Reference
  v_voucher_no := 'ASV-PMT-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-'
                  || lpad(p_obligation_id::text, 4, '0') || '-'
                  || substr(md5(clock_timestamp()::text || random()::text || p_idempotency_key), 1, 8);

  -- I. Insert Linked Payment Ledger Entry (Reconciled with accounting.js)
  -- entry_type = 'supplier_payment' ensures the payment is routed to invoicePayments
  -- and deducted from liquidity without double-counting as an operating expense.
  INSERT INTO public.contractor_transactions (
    invoice_no,
    date,
    category,
    entry_type,
    obligation_id,
    material_id,
    description,
    amount,
    source,
    recipient,
    advance_paid,
    balance,
    status
  ) VALUES (
    v_voucher_no,
    p_payment_date,
    v_bill.category,
    'supplier_payment',
    p_obligation_id,
    coalesce(p_material_id, v_bill.material_id),
    coalesce(nullif(p_notes, ''), 'సప్లయర్ బిల్లు చెల్లింపు: ' || v_bill.recipient || ' (Obligation Ref: #' || p_obligation_id::text || CASE WHEN p_material_id IS NOT NULL THEN ', Material ID: #' || p_material_id::text ELSE '' END || ')'),
    p_payment_amount,
    p_funding_source,
    v_bill.recipient,
    0,
    0,
    'Paid'
  ) RETURNING id INTO v_payment_tx_id;

  -- J. Record Request-Bound Idempotency Log & Build Success Response
  v_existing_resp := jsonb_build_object(
    'success', true,
    'operation', 'supplier_settlement',
    'obligation_id', p_obligation_id,
    'payment_tx_id', v_payment_tx_id,
    'voucher_no', v_voucher_no,
    'amount_paid', p_payment_amount,
    'remaining_balance', v_new_balance,
    'status', v_new_status,
    'funding_source', p_funding_source,
    'payment_date', p_payment_date,
    'material_id', coalesce(p_material_id, v_bill.material_id)
  );

  INSERT INTO contractor_private.idempotency_log (
    idempotency_key,
    operation,
    entity_id,
    request_hash,
    request_payload,
    response_payload,
    user_id
  ) VALUES (
    p_idempotency_key,
    'supplier_settlement',
    p_obligation_id::text,
    v_req_hash,
    jsonb_build_object(
      'amount', p_payment_amount,
      'funding', p_funding_source,
      'date', p_payment_date,
      'material_id', p_material_id,
      'notes', coalesce(p_notes,'')
    ),
    v_existing_resp,
    v_user_id
  );

  RETURN v_existing_resp;
END;
$settle$;

REVOKE ALL ON FUNCTION public.settle_supplier_credit_bill(bigint, numeric, text, date, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_supplier_credit_bill(bigint, numeric, text, date, text, bigint, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. ATOMIC LOAN REPAYMENT RPC
-- -----------------------------------------------------------------------------
-- Records repayments against loans, separates principal from interest, prevents
-- overpayment, deducts cash/bank liquidity without inflating operating expenses,
-- uses collision-resistant vouchers, and logs request-bound idempotency.
CREATE OR REPLACE FUNCTION public.record_loan_repayment(
  p_loan_id bigint,
  p_principal_amount numeric,
  p_interest_amount numeric,
  p_funding_source text,
  p_repayment_date date,
  p_idempotency_key text,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $repay$
DECLARE
  v_is_admin boolean;
  v_user_id uuid;
  v_existing_op text;
  v_existing_entity text;
  v_existing_owner uuid;
  v_existing_req jsonb;
  v_existing_resp jsonb;
  v_req_hash text;
  v_loan record;
  v_cur_outstanding numeric;
  v_new_repaid numeric;
  v_new_outstanding numeric;
  v_principal_tx_id bigint;
  v_interest_tx_id bigint;
  v_principal_voucher text;
  v_interest_voucher text;
  v_loan_rows integer;
BEGIN
  -- A. Admin Security Gate: strictly verified against single-owner membership
  SELECT (public.contractor_access_status() ->> 'is_admin')::boolean, auth.uid()
  INTO v_is_admin, v_user_id;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: only verified administrators can record loan repayments.';
  END IF;

  -- B. Input Bounds & Type Validation
  IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' THEN
    RAISE EXCEPTION 'Invalid idempotency key: must be a 16-128 character alphanumeric string.';
  END IF;

  IF p_loan_id IS NULL OR p_loan_id <= 0 THEN
    RAISE EXCEPTION 'A valid immutable loan ID is required.';
  END IF;

  p_principal_amount := coalesce(p_principal_amount, 0);
  p_interest_amount := coalesce(p_interest_amount, 0);

  IF p_principal_amount < 0 OR p_interest_amount < 0 THEN
    RAISE EXCEPTION 'Repayment amounts cannot be negative.';
  END IF;

  IF round(p_principal_amount, 2) <> p_principal_amount OR round(p_interest_amount, 2) <> p_interest_amount THEN
    RAISE EXCEPTION 'Repayment amounts cannot have more than two decimal places.';
  END IF;

  IF (p_principal_amount + p_interest_amount) <= 0 THEN
    RAISE EXCEPTION 'Total repayment (principal + interest) must be greater than zero.';
  END IF;

  IF p_funding_source NOT IN ('Cash', 'Bank', 'UPI') THEN
    RAISE EXCEPTION 'Invalid funding source: must be Cash, Bank, or UPI.';
  END IF;

  IF p_repayment_date IS NULL THEN
    RAISE EXCEPTION 'Repayment date is required.';
  END IF;

  -- C. Database-Safe Concurrency: Transaction-level advisory lock on idempotency key
  PERFORM pg_advisory_xact_lock(hashtext('idemp:' || p_idempotency_key));

  -- D. Request-Bound Idempotency Check
  v_req_hash := md5(
    'loan_repayment:' ||
    p_loan_id::text || ':' ||
    p_principal_amount::text || ':' ||
    p_interest_amount::text || ':' ||
    p_funding_source || ':' ||
    p_repayment_date::text || ':' || coalesce(p_notes,'')
  );

  SELECT operation, entity_id, user_id, request_payload, response_payload
  INTO v_existing_op, v_existing_entity, v_existing_owner, v_existing_req, v_existing_resp
  FROM contractor_private.idempotency_log
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    -- Verify every request parameter matches exactly; reject conflicting reuse
    IF v_existing_op <> 'loan_repayment'
       OR v_existing_entity <> p_loan_id::text
       OR v_existing_owner IS DISTINCT FROM v_user_id
       OR (v_existing_req ->> 'principal')::numeric <> p_principal_amount
       OR (v_existing_req ->> 'interest')::numeric <> p_interest_amount
       OR (v_existing_req ->> 'funding') <> p_funding_source
       OR (v_existing_req ->> 'date')::date <> p_repayment_date
       OR coalesce(v_existing_req ->> 'notes','') <> coalesce(p_notes,'') THEN
      RAISE EXCEPTION 'Idempotency conflict: key "%" has already been used for a different request payload.', p_idempotency_key;
    END IF;
    RETURN v_existing_resp;
  END IF;

  -- E. Row-level Lock on Loan Record (Prevents Race Conditions)
  SELECT * INTO v_loan
  FROM public.contractor_loans
  WHERE id = p_loan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan record % not found.', p_loan_id;
  END IF;

  v_cur_outstanding := coalesce(v_loan.principal, 0) - coalesce(v_loan.repaid_amount, 0);

  IF p_principal_amount > v_cur_outstanding THEN
    RAISE EXCEPTION 'Principal repayment (₹%) exceeds outstanding loan principal (₹%).', p_principal_amount, v_cur_outstanding;
  END IF;

  -- F. Atomic Loan Table Update & Check Affected Row Count
  v_new_repaid := coalesce(v_loan.repaid_amount, 0) + p_principal_amount;
  v_new_outstanding := coalesce(v_loan.principal, 0) - v_new_repaid;

  UPDATE public.contractor_loans
  SET repaid_amount = v_new_repaid
  WHERE id = p_loan_id;

  GET DIAGNOSTICS v_loan_rows = ROW_COUNT;
  IF v_loan_rows <> 1 THEN
    RAISE EXCEPTION 'Loan update failed: expected 1 row affected, got %.', v_loan_rows;
  END IF;

  -- G. Collision-Resistant Voucher References
  v_principal_voucher := 'ASV-LNR-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-'
                         || lpad(p_loan_id::text, 4, '0') || '-'
                         || substr(md5(clock_timestamp()::text || random()::text || p_idempotency_key), 1, 8);

  v_interest_voucher := 'ASV-INT-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-'
                        || lpad(p_loan_id::text, 4, '0') || '-'
                        || substr(md5(clock_timestamp()::text || random()::text || p_idempotency_key || ':interest'), 1, 8);

  -- H. Post Principal Repayment Transaction (Liquidity Outflow, NOT an Operating Expense)
  -- entry_type = 'loan_principal_repaid' and loan_id link ensure accounting.js
  -- updates loanPrincipalRepaid without counting principal as operating expense or inflating profit.
  IF p_principal_amount > 0 THEN
    INSERT INTO public.contractor_transactions (
      invoice_no,
      date,
      category,
      entry_type,
      loan_id,
      description,
      amount,
      source,
      recipient,
      advance_paid,
      balance,
      status
    ) VALUES (
      v_principal_voucher,
      p_repayment_date,
      'Loan Repayment',
      'loan_principal_repaid',
      p_loan_id,
      coalesce(nullif(p_notes, ''), 'అప్పు అసలు చెల్లింపు: ' || v_loan.lender_name || ' (Loan Ref: #' || p_loan_id::text || ')'),
      p_principal_amount,
      p_funding_source,
      v_loan.lender_name,
      0,
      0,
      'Paid'
    ) RETURNING id INTO v_principal_tx_id;
  END IF;

  -- I. Post Interest Payment Transaction (Operating Finance Expense)
  -- entry_type = 'loan_interest' ensures accounting.js counts interest under Interest & Finance Charges.
  IF p_interest_amount > 0 THEN
    INSERT INTO public.contractor_transactions (
      invoice_no,
      date,
      category,
      entry_type,
      loan_id,
      description,
      amount,
      source,
      recipient,
      advance_paid,
      balance,
      status
    ) VALUES (
      v_interest_voucher,
      p_repayment_date,
      'Interest & Finance Charges',
      'loan_interest',
      p_loan_id,
      'అప్పు వడ్డీ చెల్లింపు: ' || v_loan.lender_name || ' (Loan Ref: #' || p_loan_id::text || ')',
      p_interest_amount,
      p_funding_source,
      v_loan.lender_name,
      0,
      0,
      'Paid'
    ) RETURNING id INTO v_interest_tx_id;
  END IF;

  -- J. Record Request-Bound Idempotency Log & Build Success Response
  v_existing_resp := jsonb_build_object(
    'success', true,
    'operation', 'loan_repayment',
    'loan_id', p_loan_id,
    'principal_tx_id', v_principal_tx_id,
    'interest_tx_id', v_interest_tx_id,
    'principal_voucher_no', v_principal_voucher,
    'interest_voucher_no', v_interest_voucher,
    'principal_repaid', p_principal_amount,
    'interest_paid', p_interest_amount,
    'total_repaid', v_new_repaid,
    'remaining_principal', v_new_outstanding,
    'funding_source', p_funding_source,
    'repayment_date', p_repayment_date
  );

  INSERT INTO contractor_private.idempotency_log (
    idempotency_key,
    operation,
    entity_id,
    request_hash,
    request_payload,
    response_payload,
    user_id
  ) VALUES (
    p_idempotency_key,
    'loan_repayment',
    p_loan_id::text,
    v_req_hash,
    jsonb_build_object(
      'principal', p_principal_amount,
      'interest', p_interest_amount,
      'funding', p_funding_source,
      'date', p_repayment_date,
      'notes', coalesce(p_notes,'')
    ),
    v_existing_resp,
    v_user_id
  );

  RETURN v_existing_resp;
END;
$repay$;

REVOKE ALL ON FUNCTION public.record_loan_repayment(bigint, numeric, numeric, text, date, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_loan_repayment(bigint, numeric, numeric, text, date, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. POSTFLIGHT VERIFICATION
-- -----------------------------------------------------------------------------
DO $postflight$
BEGIN
  -- Verify settle_supplier_credit_bill routine, security definer and search_path
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'settle_supplier_credit_bill' AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'Postflight: settle_supplier_credit_bill was not created as SECURITY DEFINER';
  END IF;

  -- Verify record_loan_repayment routine, security definer and search_path
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'record_loan_repayment' AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'Postflight: record_loan_repayment was not created as SECURITY DEFINER';
  END IF;

  -- Verify idempotency_log table and RLS
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'contractor_private' AND c.relname = 'idempotency_log' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Postflight: contractor_private.idempotency_log was not created with RLS';
  END IF;

  -- Verify ledger columns on contractor_transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contractor_transactions' AND column_name = 'entry_type'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contractor_transactions' AND column_name = 'obligation_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contractor_transactions' AND column_name = 'loan_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contractor_transactions' AND column_name = 'material_id'
  ) THEN
    RAISE EXCEPTION 'Postflight: contractor_transactions ledger columns missing';
  END IF;

  -- Verify unique invoice index
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'contractor_transactions' AND indexname = 'uq_contractor_transactions_invoice_no'
  ) THEN
    RAISE EXCEPTION 'Postflight: uq_contractor_transactions_invoice_no index missing';
  END IF;
END;
$postflight$;

COMMIT;
