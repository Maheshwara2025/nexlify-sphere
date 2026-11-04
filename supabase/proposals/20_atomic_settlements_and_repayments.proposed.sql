-- PROPOSAL ONLY. Never auto-run; requires separate, explicit remote-DB approval.
-- Atomic Stored Procedures for Supplier Credit Settlements and Loan Repayments.
-- This proposal adheres to double-entry principles, row-level locking, and idempotency.

BEGIN;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '3s';

DO $proposal_gate$
BEGIN
  RAISE EXCEPTION 'PROPOSAL ONLY: review database schema, obtain separate DB approval, and remove this gate in a reviewed migration';
END
$proposal_gate$;

-- 1. Idempotency Log to prevent duplicate financial submissions
CREATE TABLE IF NOT EXISTS contractor_private.idempotency_log (
  idempotency_key text PRIMARY KEY,
  operation text NOT NULL,
  entity_id text NOT NULL,
  request_payload jsonb NOT NULL,
  response_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE contractor_private.idempotency_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE contractor_private.idempotency_log FROM PUBLIC, anon, authenticated;

-- 2. Atomic Supplier Settlement RPC
-- Settles credit bills with real cash/bank/UPI outflows, updates obligation balance, and records payment voucher.
CREATE OR REPLACE FUNCTION public.settle_supplier_credit_bill(
  p_obligation_id bigint,
  p_payment_amount numeric,
  p_funding_source text,
  p_payment_date date,
  p_idempotency_key text,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $settle$
DECLARE
  v_is_admin boolean;
  v_bill record;
  v_new_balance numeric;
  v_new_status text;
  v_voucher_no text;
  v_payment_tx_id bigint;
  v_existing_response jsonb;
BEGIN
  -- A. Admin Security Gate
  SELECT (public.contractor_access_status() ->> 'is_admin')::boolean INTO v_is_admin;
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: only verified administrators can settle supplier bills.';
  END IF;

  -- B. Idempotency Check
  SELECT response_payload INTO v_existing_response
  FROM contractor_private.idempotency_log
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_existing_response;
  END IF;

  -- C. Input Validation
  IF p_payment_amount IS NULL OR p_payment_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive and greater than zero.';
  END IF;

  IF p_funding_source NOT IN ('Cash', 'Bank', 'UPI') THEN
    RAISE EXCEPTION 'Invalid funding source: must be Cash, Bank, or UPI.';
  END IF;

  IF p_payment_date IS NULL THEN
    RAISE EXCEPTION 'Payment date is required.';
  END IF;

  -- D. Row-level Lock on Obligation (Prevents Race Conditions)
  SELECT * INTO v_bill
  FROM public.contractor_transactions
  WHERE id = p_obligation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit bill transaction % not found.', p_obligation_id;
  END IF;

  IF v_bill.source <> 'Credit' THEN
    RAISE EXCEPTION 'Transaction % is not a credit obligation.', p_obligation_id;
  END IF;

  IF coalesce(v_bill.balance, 0) <= 0 OR v_bill.status = 'Paid' THEN
    RAISE EXCEPTION 'Bill % is already fully paid.', p_obligation_id;
  END IF;

  IF p_payment_amount > v_bill.balance THEN
    RAISE EXCEPTION 'Payment amount (₹%) exceeds outstanding balance (₹%).', p_payment_amount, v_bill.balance;
  END IF;

  -- E. Atomic Balance Update
  v_new_balance := v_bill.balance - p_payment_amount;
  v_new_status := CASE WHEN v_new_balance = 0 THEN 'Paid' ELSE 'Due' END;

  UPDATE public.contractor_transactions
  SET balance = v_new_balance,
      status = v_new_status
  WHERE id = p_obligation_id;

  -- F. Also update matching contractor_materials record if linked
  UPDATE public.contractor_materials
  SET paid_amount = coalesce(paid_amount, 0) + p_payment_amount,
      balance_amount = v_new_balance
  WHERE party_name = v_bill.recipient
    AND date = v_bill.date
    AND total_amount = v_bill.amount
    AND balance_amount = v_bill.balance;

  -- G. Insert Linked Payment Ledger Entry (Cash/Bank Outflow)
  v_voucher_no := 'ASV-PMT-' || lpad(p_obligation_id::text, 4, '0') || '-' || to_char(clock_timestamp(), 'HH24MISS');

  INSERT INTO public.contractor_transactions (
    invoice_no,
    date,
    category,
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
    coalesce(nullif(p_notes, ''), 'సప్లయర్ బిల్లు చెల్లింపు: ' || v_bill.recipient || ' (Ref: ' || coalesce(v_bill.invoice_no, ('#' || p_obligation_id::text)) || ')'),
    p_payment_amount,
    p_funding_source,
    v_bill.recipient,
    0,
    0,
    'Paid'
  ) RETURNING id INTO v_payment_tx_id;

  -- H. Record Idempotency & Return
  v_existing_response := jsonb_build_object(
    'success', true,
    'operation', 'supplier_settlement',
    'obligation_id', p_obligation_id,
    'payment_tx_id', v_payment_tx_id,
    'voucher_no', v_voucher_no,
    'amount_paid', p_payment_amount,
    'remaining_balance', v_new_balance,
    'status', v_new_status
  );

  INSERT INTO contractor_private.idempotency_log (
    idempotency_key,
    operation,
    entity_id,
    request_payload,
    response_payload
  ) VALUES (
    p_idempotency_key,
    'supplier_settlement',
    p_obligation_id::text,
    jsonb_build_object('amount', p_payment_amount, 'funding', p_funding_source, 'date', p_payment_date),
    v_existing_response
  );

  RETURN v_existing_response;
END;
$settle$;

REVOKE ALL ON FUNCTION public.settle_supplier_credit_bill(bigint, numeric, text, date, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_supplier_credit_bill(bigint, numeric, text, date, text, text) TO authenticated;


-- 3. Atomic Loan Repayment RPC
-- Records repayments against loans, separates principal from interest, and deducts cash/bank liquidity.
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
  v_loan record;
  v_cur_outstanding numeric;
  v_new_repaid numeric;
  v_new_outstanding numeric;
  v_principal_tx_id bigint;
  v_interest_tx_id bigint;
  v_voucher_no text;
  v_existing_response jsonb;
BEGIN
  -- A. Admin Security Gate
  SELECT (public.contractor_access_status() ->> 'is_admin')::boolean INTO v_is_admin;
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: only verified administrators can record loan repayments.';
  END IF;

  -- B. Idempotency Check
  SELECT response_payload INTO v_existing_response
  FROM contractor_private.idempotency_log
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_existing_response;
  END IF;

  -- C. Input Validation
  p_principal_amount := coalesce(p_principal_amount, 0);
  p_interest_amount := coalesce(p_interest_amount, 0);

  IF p_principal_amount < 0 OR p_interest_amount < 0 THEN
    RAISE EXCEPTION 'Repayment amounts cannot be negative.';
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

  -- D. Row-level Lock on Loan Record
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

  -- E. Atomic Loan Table Update
  v_new_repaid := coalesce(v_loan.repaid_amount, 0) + p_principal_amount;
  v_new_outstanding := coalesce(v_loan.principal, 0) - v_new_repaid;

  UPDATE public.contractor_loans
  SET repaid_amount = v_new_repaid
  WHERE id = p_loan_id;

  v_voucher_no := 'ASV-LNR-' || lpad(p_loan_id::text, 4, '0') || '-' || to_char(clock_timestamp(), 'HH24MISS');

  -- F. Post Principal Repayment Transaction (Liquidity Outflow, NOT an Operating Expense)
  IF p_principal_amount > 0 THEN
    INSERT INTO public.contractor_transactions (
      invoice_no,
      date,
      category,
      description,
      amount,
      source,
      recipient,
      advance_paid,
      balance,
      status
    ) VALUES (
      v_voucher_no,
      p_repayment_date,
      'Loan Repayment',
      coalesce(nullif(p_notes, ''), 'అప్పు అసలు చెల్లింపు: ' || v_loan.lender_name),
      p_principal_amount,
      p_funding_source,
      v_loan.lender_name,
      0,
      0,
      'Paid'
    ) RETURNING id INTO v_principal_tx_id;
  END IF;

  -- G. Post Interest Payment Transaction (Operating Finance Expense)
  IF p_interest_amount > 0 THEN
    INSERT INTO public.contractor_transactions (
      invoice_no,
      date,
      category,
      description,
      amount,
      source,
      recipient,
      advance_paid,
      balance,
      status
    ) VALUES (
      'ASV-INT-' || lpad(p_loan_id::text, 4, '0') || '-' || to_char(clock_timestamp(), 'HH24MISS'),
      p_repayment_date,
      'Loan Interest',
      'అప్పు వడ్డీ చెల్లింపు: ' || v_loan.lender_name,
      p_interest_amount,
      p_funding_source,
      v_loan.lender_name,
      0,
      0,
      'Paid'
    ) RETURNING id INTO v_interest_tx_id;
  END IF;

  -- H. Record Idempotency & Return
  v_existing_response := jsonb_build_object(
    'success', true,
    'operation', 'loan_repayment',
    'loan_id', p_loan_id,
    'principal_tx_id', v_principal_tx_id,
    'interest_tx_id', v_interest_tx_id,
    'voucher_no', v_voucher_no,
    'principal_repaid', p_principal_amount,
    'interest_paid', p_interest_amount,
    'total_repaid', v_new_repaid,
    'remaining_principal', v_new_outstanding
  );

  INSERT INTO contractor_private.idempotency_log (
    idempotency_key,
    operation,
    entity_id,
    request_payload,
    response_payload
  ) VALUES (
    p_idempotency_key,
    'loan_repayment',
    p_loan_id::text,
    jsonb_build_object('principal', p_principal_amount, 'interest', p_interest_amount, 'funding', p_funding_source, 'date', p_repayment_date),
    v_existing_response
  );

  RETURN v_existing_response;
END;
$repay$;

REVOKE ALL ON FUNCTION public.record_loan_repayment(bigint, numeric, numeric, text, date, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_loan_repayment(bigint, numeric, numeric, text, date, text, text) TO authenticated;

COMMIT;
