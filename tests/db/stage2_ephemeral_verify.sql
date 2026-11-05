-- Executed only in disposable asv_contract_test CI database; never production.
-- This file expects stage2_ephemeral_fixture.sql and reviewed v22 installed.

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);

DO $settlement_test$
DECLARE
  r1 jsonb;
  r2 jsonb;
  v_msg text;
BEGIN
  SELECT public.settle_supplier_credit_bill(
    101,2500.00,'Bank','2026-11-05','asv_ci_supplier_settlement_0001',201,'Supplier test'
  ) INTO r1;
  SELECT public.settle_supplier_credit_bill(
    101,2500.00,'Bank','2026-11-05','asv_ci_supplier_settlement_0001',201,'Supplier test'
  ) INTO r2;
  IF r1 IS DISTINCT FROM r2 OR (r1->>'remaining_balance')::numeric <> 7500 THEN
    RAISE EXCEPTION 'Supplier idempotency replay failed';
  END IF;

  BEGIN
    PERFORM public.settle_supplier_credit_bill(
      101,2500.00,'Cash','2026-11-05','asv_ci_supplier_settlement_0001',201,'Supplier test'
    );
    RAISE EXCEPTION 'EXPECTED_CONFLICT_MISSING';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_msg=MESSAGE_TEXT;
    IF v_msg='EXPECTED_CONFLICT_MISSING' OR position('Idempotency conflict' in v_msg)=0 THEN
      RAISE EXCEPTION 'Wrong result for reused key: %',v_msg;
    END IF;
  END;

  BEGIN
    PERFORM public.settle_supplier_credit_bill(
      101,100.00,'Bank','2026-11-05','asv_ci_bad_mapping_00000001',202,'Wrong bill'
    );
    RAISE EXCEPTION 'EXPECTED_MAPPING_REJECTION_MISSING';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_msg=MESSAGE_TEXT;
    IF v_msg='EXPECTED_MAPPING_REJECTION_MISSING' OR position('immutable material mapping' in v_msg)=0 THEN
      RAISE EXCEPTION 'Wrong result for mismatched material link: %',v_msg;
    END IF;
  END;

  BEGIN
    PERFORM public.settle_supplier_credit_bill(
      101,100.00,'Bank','2026-11-05','asv_ci_missing_mapping_00001',NULL,'No material ID'
    );
    RAISE EXCEPTION 'EXPECTED_MISSING_MATERIAL_REJECTION';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_msg=MESSAGE_TEXT;
    IF v_msg='EXPECTED_MISSING_MATERIAL_REJECTION' OR position('material ID' in v_msg)=0 THEN
      RAISE EXCEPTION 'Wrong result for missing material ID: %',v_msg;
    END IF;
  END;

  BEGIN
    PERFORM public.settle_supplier_credit_bill(
      101,99999.00,'Bank','2026-11-05','asv_ci_overpayment_000001',201,'Overpayment'
    );
    RAISE EXCEPTION 'EXPECTED_OVERPAYMENT_REJECTION';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_msg=MESSAGE_TEXT;
    IF v_msg='EXPECTED_OVERPAYMENT_REJECTION' OR position('exceeds' in v_msg)=0 THEN
      RAISE EXCEPTION 'Wrong result for overpayment: %',v_msg;
    END IF;
  END;

  IF (SELECT balance FROM public.contractor_transactions WHERE id=101) <> 7500
    OR (SELECT paid_amount FROM public.contractor_materials WHERE id=201) <> 2500
    OR (SELECT balance_amount FROM public.contractor_materials WHERE id=201) <> 7500
    OR (SELECT count(*) FROM public.contractor_transactions WHERE entry_type='supplier_payment') <> 1 THEN
    RAISE EXCEPTION 'Supplier financial side effects are not atomic or consistent';
  END IF;
END;
$settlement_test$;

DO $loan_test$
DECLARE
  r1 jsonb;
  r2 jsonb;
  v_msg text;
BEGIN
  SELECT public.record_loan_repayment(
    301,1000.00,75.00,'Cash','2026-11-05','asv_ci_loan_repayment_000001','Loan test'
  ) INTO r1;
  SELECT public.record_loan_repayment(
    301,1000.00,75.00,'Cash','2026-11-05','asv_ci_loan_repayment_000001','Loan test'
  ) INTO r2;
  IF r1 IS DISTINCT FROM r2 OR (r1->>'remaining_principal')::numeric <> 4000 THEN
    RAISE EXCEPTION 'Loan idempotency replay failed';
  END IF;

  BEGIN
    PERFORM public.record_loan_repayment(
      301,1000.00,76.00,'Cash','2026-11-05','asv_ci_loan_repayment_000001','Loan test'
    );
    RAISE EXCEPTION 'EXPECTED_LOAN_CONFLICT_MISSING';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_msg=MESSAGE_TEXT;
    IF v_msg='EXPECTED_LOAN_CONFLICT_MISSING' OR position('Idempotency conflict' in v_msg)=0 THEN
      RAISE EXCEPTION 'Wrong loan conflict result: %',v_msg;
    END IF;
  END;
  IF (SELECT repaid_amount FROM public.contractor_loans WHERE id=301) <> 1000
    OR (SELECT count(*) FROM public.contractor_transactions WHERE entry_type='loan_principal_repaid') <> 1
    OR (SELECT count(*) FROM public.contractor_transactions WHERE entry_type='loan_interest') <> 1 THEN
    RAISE EXCEPTION 'Loan principal and interest postings are inconsistent';
  END IF;
END;
$loan_test$;

-- Authenticated non-owner must fail, independent of table grants.
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
DO $access_test$
DECLARE v_msg text;
BEGIN
  BEGIN
    PERFORM public.record_loan_repayment(
      301,100.00,0,'Bank','2026-11-05','asv_ci_unauthorized_0000001','Blocked'
    );
    RAISE EXCEPTION 'EXPECTED_UNAUTHORIZED_REJECTION';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_msg=MESSAGE_TEXT;
    IF v_msg='EXPECTED_UNAUTHORIZED_REJECTION' OR position('Unauthorized' in v_msg)=0 THEN
      RAISE EXCEPTION 'Wrong non-owner access result: %',v_msg;
    END IF;
  END;
END;
$access_test$;
COMMIT;

-- Assertions as fixture/database owner after the authenticated session.
DO $final$
BEGIN
  IF (SELECT balance FROM public.contractor_transactions WHERE id=101) <> 7500 THEN
    RAISE EXCEPTION 'Supplier balance did not persist';
  END IF;
  IF (SELECT repaid_amount FROM public.contractor_loans WHERE id=301) <> 1000 THEN
    RAISE EXCEPTION 'Loan principal did not persist';
  END IF;
  IF (SELECT count(*) FROM contractor_private.idempotency_log) <> 2 THEN
    RAISE EXCEPTION 'Expected exactly two idempotent payment commands';
  END IF;
  IF (SELECT count(*) FROM public.contractor_transactions
      WHERE entry_type IN ('supplier_payment','loan_principal_repaid','loan_interest')) <> 3 THEN
    RAISE EXCEPTION 'Expected exactly three payment ledger rows';
  END IF;
END;
$final$;

SELECT 'EPHEMERAL STAGE2 POSTGRES TRANSACTION TESTS PASSED' AS result;
