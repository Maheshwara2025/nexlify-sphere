-- Only disposable PostgreSQL 16 CI database. NEVER run on production.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
DO $tests$
DECLARE
  r jsonb;
  r2 jsonb;
  vmsg text;
  v_labour_id bigint;
  v_piece_id bigint;
  mat_id bigint;
  ob_id bigint;
  newloan bigint;
BEGIN
  r:=public.contractor_post_entry_v1('expense',
    '{"date":"2026-11-05","source":"Cash","category":"General Overheads","desc":"Site office charge","recipient":"Shop","amount":"300.00"}'::jsonb,
    'asv_ci_stage3_expense_00000001');
  IF (r->>'success')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Expense save failed'; END IF;

  r2:=public.contractor_post_entry_v1('expense',
    '{"date":"2026-11-05","source":"Cash","category":"General Overheads","desc":"Site office charge","recipient":"Shop","amount":"300.00"}'::jsonb,
    'asv_ci_stage3_expense_00000001');
  IF r IS DISTINCT FROM r2 THEN RAISE EXCEPTION 'Idempotency retry created mismatch'; END IF;

  BEGIN
    PERFORM public.contractor_post_entry_v1('expense',
      '{"date":"2026-11-05","source":"Cash","category":"General Overheads","desc":"Other charge","recipient":"Shop","amount":"301.00"}'::jsonb,
      'asv_ci_stage3_expense_00000001');
    RAISE EXCEPTION 'EXPECTED_CONFLICT';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS vmsg=MESSAGE_TEXT;
    IF vmsg='EXPECTED_CONFLICT' OR position('Idempotency conflict' in vmsg)=0
    THEN RAISE EXCEPTION 'Expected request-bound idempotency conflict, got %',vmsg; END IF;
  END;

  r:=public.contractor_post_entry_v1('expense',
    '{"date":"2026-11-05","source":"Credit","category":"Transport & Fuel","desc":"Earthwork lorry rent","recipient":"Driver","amount":"900.00","advance_paid":"100.00","advance_source":"Bank"}'::jsonb,
    'asv_ci_stage3_credit_000000001');
  IF (SELECT balance FROM public.contractor_transactions
      WHERE id=(r->>'transaction_id')::bigint) <> 800 THEN
    RAISE EXCEPTION 'Credit expense with advance not reconciled'; END IF;

  r:=public.contractor_post_entry_v1('receipt',
    '{"date":"2026-11-05","sourceType":"Own Money","desc":"Owner capital introduced","target":"Bank","amount":"2000.00"}'::jsonb,
    'asv_ci_stage3_receipt_00000001');
  IF NOT EXISTS(SELECT 1 FROM public.contractor_transactions WHERE id=(r->>'transaction_id')::bigint AND entry_type='owner_capital_received')
    THEN RAISE EXCEPTION 'Owner receipt wrong accounting category'; END IF;

  r:=public.contractor_post_entry_v1('transfer',
    '{"date":"2026-11-05","direction":"Cash to Bank","bank_name":"Test bank","amount":"150.00"}'::jsonb,
    'asv_ci_stage3_transfer_000001');
  IF NOT EXISTS(SELECT 1 FROM public.contractor_transactions WHERE id=(r->>'transaction_id')::bigint AND category='Transfer' AND source='Cash to Bank')
    THEN RAISE EXCEPTION 'Transfer not posted as contra'; END IF;

  r:=public.contractor_post_entry_v1('material_purchase',
    '{"date":"2026-11-05","party_name":"Test Supplier","material_name":"Sand","quantity":2,"unit":"Trip","unit_rate":"500.00","transport_cost":"50.00","payment_mode":"Bank"}'::jsonb,
    'asv_ci_stage3_material_0000001');
  mat_id:=(r->>'material_id')::bigint;
  ob_id:=(r->>'obligation_id')::bigint;
  IF (SELECT balance FROM public.contractor_transactions WHERE id=ob_id)<>0
     OR (SELECT balance_amount FROM public.contractor_materials WHERE id=mat_id)<>0
     OR (SELECT paid_amount FROM public.contractor_materials WHERE id=mat_id)<>1050
     OR (SELECT obligation_tx_id FROM public.contractor_materials WHERE id=mat_id)<>ob_id
    THEN RAISE EXCEPTION 'Paid material purchase ledger mismatch'; END IF;

  r:=public.contractor_post_entry_v1('material_purchase',
    '{"date":"2026-11-05","party_name":"Second Supplier","material_name":"Cement","quantity":4,"unit":"Bags","unit_rate":"300.00","transport_cost":"0","payment_mode":"Credit","advance_paid":"200.00","advance_source":"Cash"}'::jsonb,
    'asv_ci_stage3_material_0000002');
  IF (SELECT balance FROM public.contractor_transactions WHERE id=(r->>'obligation_id')::bigint)<>1000
    THEN RAISE EXCEPTION 'Partial material credit due mismatch'; END IF;

  r:=public.contractor_post_entry_v1('loan_create',
    '{"lender_name":"Test Bank","principal":"5000.00","interest_rate":"1.5% / month","date_borrowed":"2026-11-05","funding_source":"Bank"}'::jsonb,
    'asv_ci_stage3_new_loan_000001');
  newloan:=(r->>'loan_id')::bigint;
  IF newloan IS NULL OR NOT EXISTS(SELECT 1 FROM public.contractor_transactions WHERE loan_id=newloan AND entry_type='loan_principal_received')
    THEN RAISE EXCEPTION 'New loan missing Cashbook entry'; END IF;

  r:=public.contractor_post_entry_v1('worker_profile',
    '{"worker_id":"TEST-LBR-01","name":"Test Worker","role":"Site Helper","daily_rate":"800.00"}'::jsonb,
    'asv_ci_stage3_worker_00000001');
  IF (r->>'profile_id') IS NULL THEN RAISE EXCEPTION 'Worker profile not saved'; END IF;

  r:=public.contractor_post_entry_v1('attendance',
    '{"date":"2026-11-05","worker_id":"TEST-LBR-01","work_task":"Site work","days":"1","daily_rate":"800.00","advance_paid":"200.00","funding_source":"Cash"}'::jsonb,
    'asv_ci_stage3_attendance_0001');
  v_labour_id:=(r->>'attendance_id')::bigint;
  IF NOT EXISTS(SELECT 1 FROM public.contractor_transactions
    WHERE labour_id=v_labour_id AND entry_type='labour_advance' AND amount=200)
    THEN RAISE EXCEPTION 'Labour advance funding entry missing'; END IF;

  r:=public.contractor_post_entry_v1('labour_payment',
    jsonb_build_object('date','2026-11-05','labour_id',v_labour_id,
      'funding_source','Bank','amount','600.00'),
    'asv_ci_stage3_labour_payment_01');
  IF NOT EXISTS(SELECT 1 FROM public.contractor_transactions
    WHERE labour_id=v_labour_id AND entry_type='labour_payment' AND amount=600)
    THEN RAISE EXCEPTION 'Labour settlement ledger entry missing'; END IF;

  BEGIN
    PERFORM public.contractor_post_entry_v1('labour_payment',
      jsonb_build_object('date','2026-11-05','labour_id',v_labour_id,
        'funding_source','Cash','amount','1.00'),
      'asv_ci_stage3_labour_overpay_01');
    RAISE EXCEPTION 'EXPECTED_LABOUR_OVERPAY_REJECTION';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS vmsg=MESSAGE_TEXT;
    IF vmsg='EXPECTED_LABOUR_OVERPAY_REJECTION' OR position('exceeds' in vmsg)=0
    THEN RAISE EXCEPTION 'Wrong labour overpay behavior: %',vmsg; END IF;
  END;

  r:=public.contractor_post_entry_v1('piecework',
    '{"date":"2026-11-05","contractor_name":"Test Mestri","calc_mode":"Sft","length_ft":"10","height_ft":"2","rate_per_unit":"40.00","advance_paid":"100.00","funding_source":"Cash"}'::jsonb,
    'asv_ci_stage3_piecework_00001');
  v_piece_id:=(r->>'piecework_id')::bigint;
  IF (SELECT balance_due FROM public.contractor_piecework WHERE id=v_piece_id)<>700
    THEN RAISE EXCEPTION 'Piecework balance mismatch'; END IF;

  r:=public.contractor_post_entry_v1('piecework_payment',
    jsonb_build_object('date','2026-11-05','piecework_id',v_piece_id,
      'funding_source','UPI','amount','700.00'),
    'asv_ci_stage3_piecework_pay_01');
  IF (SELECT balance_due FROM public.contractor_piecework WHERE id=v_piece_id)<>0
     OR NOT EXISTS(SELECT 1 FROM public.contractor_transactions
       WHERE piecework_id=v_piece_id AND entry_type='piecework_payment' AND amount=700)
    THEN RAISE EXCEPTION 'Piecework settlement mismatch'; END IF;

  r:=public.contractor_post_entry_v1('site_diary',
    '{"date":"2026-11-05","work_title":"Test compound wall","section_location":"Test site","workers_count":3}'::jsonb,
    'asv_ci_stage3_site_diary_00001');
  IF (r->>'site_work_id') IS NULL THEN RAISE EXCEPTION 'Site diary entry missing'; END IF;
END
$tests$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
DO $unauthorized$
DECLARE msg text;
BEGIN
  BEGIN
    PERFORM public.contractor_post_entry_v1('expense',
      '{"date":"2026-11-05","source":"Cash","category":"General Overheads","desc":"Bad write","recipient":"X","amount":"10.00"}'::jsonb,
      'asv_ci_stage3_unauthorized_01');
    RAISE EXCEPTION 'EXPECTED_NON_OWNER_DENIAL';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
    IF msg='EXPECTED_NON_OWNER_DENIAL' OR position('Unauthorized' in msg)=0
    THEN RAISE EXCEPTION 'Expected denial, got %',msg; END IF;
  END;
END
$unauthorized$;
COMMIT;

-- No financial records from this suite ever touch actual Supabase.
SELECT 'STAGE 3 ATOMIC ENTRY INTEGRATION PASSED' AS stage3_result;
