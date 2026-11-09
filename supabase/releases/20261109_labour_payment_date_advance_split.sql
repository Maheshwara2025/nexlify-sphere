-- One real historical UPI transfer may contain both earned wages and
-- a prepayment against already recorded, later-dated attendance.
-- It must never falsely classify a future-day wage as earned on payment date.
-- Does not modify existing payment RPC; requires explicit advance confirmation.
BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '75s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.contractor_pay_worker_v1(text,numeric,text,date,text,text,text)') IS NULL
    OR to_regclass('public.contractor_worker_payments') IS NULL
    OR to_regclass('public.contractor_labour') IS NULL
    OR to_regclass('contractor_private.idempotency_log') IS NULL
    OR to_regprocedure('public.contractor_access_status()') IS NULL
  THEN RAISE EXCEPTION 'Worker ID payment feature prerequisite not present'; END IF;
  IF to_regprocedure('public.contractor_pay_worker_with_advance_v1(text,numeric,text,date,text,text,text,boolean)') IS NOT NULL
  THEN RAISE EXCEPTION 'Advance payment feature already exists; review before applying'; END IF;
END $preflight$;

CREATE FUNCTION public.contractor_pay_worker_with_advance_v1(
 p_worker_id text,
 p_amount numeric,
 p_funding_source text,
 p_payment_date date,
 p_payment_reference text,
 p_notes text,
 p_idempotency_key text,
 p_confirm_advance boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $pay$
DECLARE
 v_actor uuid;
 v_profile public.contractor_labour_profiles%ROWTYPE;
 v_att public.contractor_labour%ROWTYPE;
 v_existing contractor_private.idempotency_log%ROWTYPE;
 v_request jsonb;
 v_ref text;
 v_notes text;
 v_wage_due numeric:=0;
 v_total_due numeric:=0;
 v_advance_due numeric;
 v_advance_left numeric;
 v_alloc numeric;
 v_paid numeric;
 v_balance numeric;
 v_earned numeric;
 v_wage_result jsonb;
 v_batch_id bigint;
 v_alloc_count integer:=0;
 v_new_row_id bigint;
 v_result jsonb;
BEGIN
 v_actor:=auth.uid();
 IF v_actor IS NULL OR NOT coalesce(
   (public.contractor_access_status()->>'is_admin')::boolean,false
 ) THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;

 IF p_confirm_advance IS DISTINCT FROM true OR
   p_worker_id IS NULL OR p_worker_id !~ '^LBR-[0-9]{3,8}$'
   OR p_amount IS NULL OR p_amount<=0 OR p_amount>999999999
   OR round(p_amount,2)<>p_amount OR
   p_funding_source NOT IN ('Cash','Bank','UPI') OR
   p_payment_date IS NULL OR p_payment_date<DATE '2000-01-01' OR
   p_payment_date>(now() AT TIME ZONE 'Asia/Kolkata')::date OR
   p_idempotency_key IS NULL OR
   p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
 THEN RAISE EXCEPTION 'Invalid worker payment, date or missing explicit advance confirmation'; END IF;

 v_ref:=nullif(btrim(coalesce(p_payment_reference,'')),'');
 v_notes:=btrim(coalesce(p_notes,''));
 IF (v_ref IS NOT NULL AND (length(v_ref)>100 OR v_ref ~ '[<>\\r\\n]'))
   OR length(v_notes)>500 OR v_notes ~ '[<>]'
 THEN RAISE EXCEPTION 'Invalid payment reference or notes'; END IF;

 v_request:=jsonb_build_object('worker_id',p_worker_id,'amount',p_amount,
   'funding',p_funding_source,'date',p_payment_date,'reference',v_ref,
   'notes',v_notes,'confirm_advance',true);
 PERFORM pg_advisory_xact_lock(hashtext('asv_worker_prepay:'||p_idempotency_key));
 SELECT * INTO v_existing FROM contractor_private.idempotency_log
 WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
   IF v_existing.operation<>'worker_payment_with_advance'
      OR v_existing.user_id IS DISTINCT FROM v_actor
      OR v_existing.request_payload IS DISTINCT FROM v_request
   THEN RAISE EXCEPTION 'Idempotency key conflict for historical advance'; END IF;
   RETURN v_existing.response_payload;
 END IF;

 -- Lock worker account, preventing another concurrent installment from changing dues.
 SELECT * INTO v_profile FROM public.contractor_labour_profiles
 WHERE worker_id=p_worker_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Worker ID not found'; END IF;

 FOR v_att IN SELECT * FROM public.contractor_labour
   WHERE worker_id=p_worker_id ORDER BY date,id FOR UPDATE
 LOOP
   SELECT coalesce(sum(amount),0) INTO v_paid FROM public.contractor_transactions
   WHERE entry_type='labour_payment' AND labour_id=v_att.id;
   v_earned:=round(coalesce(v_att.days,0)*coalesce(v_att.daily_rate,0),2);
   v_balance:=greatest(0,v_earned-coalesce(v_att.advance_paid,0)-v_paid);
   v_total_due:=v_total_due+v_balance;
   IF v_att.date<=p_payment_date THEN v_wage_due:=v_wage_due+v_balance; END IF;
 END LOOP;
 v_advance_due:=p_amount-v_wage_due;
 IF v_wage_due<=0 OR v_advance_due<=0 OR v_total_due<p_amount
 THEN RAISE EXCEPTION 'PAYMENT_SPLIT_INVALID: Earned wages as of selected date %, later advance %, total due %',
    v_wage_due,v_advance_due,v_total_due; END IF;

 -- Existing atomic worker payment allocates the earned portion and creates
 -- the batch header. All of this function is one database transaction.
 v_wage_result:=public.contractor_pay_worker_v1(
   p_worker_id,v_wage_due,p_funding_source,p_payment_date,v_ref,v_notes,
   'asv_wage_'||md5(p_idempotency_key));
 v_batch_id:=(v_wage_result->>'batch_id')::bigint;
 IF v_batch_id IS NULL THEN RAISE EXCEPTION 'Wage allocation did not return a payment batch'; END IF;
 v_advance_left:=v_advance_due;
 v_alloc_count:=coalesce((v_wage_result->>'allocations_count')::integer,0);

 FOR v_att IN SELECT * FROM public.contractor_labour
   WHERE worker_id=p_worker_id AND date>p_payment_date
   ORDER BY date,id FOR UPDATE
 LOOP
   SELECT coalesce(sum(amount),0) INTO v_paid FROM public.contractor_transactions
   WHERE entry_type='labour_payment' AND labour_id=v_att.id;
   v_earned:=round(coalesce(v_att.days,0)*coalesce(v_att.daily_rate,0),2);
   v_balance:=greatest(0,v_earned-coalesce(v_att.advance_paid,0)-v_paid);
   IF v_balance<=0 OR v_advance_left<=0 THEN CONTINUE; END IF;
   v_alloc:=least(v_balance,v_advance_left);
   -- An advance is a funded historical transfer held against later recorded
   -- work; update advance_paid so wage dues decrease exactly once.
   UPDATE public.contractor_labour
    SET advance_paid=coalesce(advance_paid,0)+v_alloc
    WHERE id=v_att.id;
   v_alloc_count:=v_alloc_count+1;
   INSERT INTO public.contractor_transactions(
     date,category,description,amount,source,recipient,advance_paid,balance,
     status,invoice_no,entry_type,labour_id)
   VALUES(p_payment_date,'Labour & Mestri',
     'Worker ID '||p_worker_id||' advance given '||p_payment_date::text||
     ' for later attendance '||v_att.date::text||
     CASE WHEN v_ref IS NULL THEN '' ELSE ' (Ref: '||v_ref||')' END,
     v_alloc,p_funding_source,v_profile.name,0,0,'Paid',
     (v_wage_result->>'voucher_no')||'-ADV-'||lpad(v_alloc_count::text,3,'0'),
     'labour_advance',v_att.id)
   RETURNING id INTO v_new_row_id;
   v_advance_left:=round(v_advance_left-v_alloc,2);
 END LOOP;
 IF v_advance_left<>0
 THEN RAISE EXCEPTION 'ADVANCE_ALLOCATION_FAILED: remaining %',v_advance_left; END IF;

 UPDATE public.contractor_worker_payments
   SET amount=p_amount,allocations_count=v_alloc_count,
       notes=CASE WHEN v_notes='' THEN 'Historical payment with advance ₹'||v_advance_due::text
                  ELSE v_notes||' | advance ₹'||v_advance_due::text END
 WHERE id=v_batch_id AND worker_id=p_worker_id;

 v_result:=jsonb_build_object(
   'success',true,'worker_id',p_worker_id,'batch_id',v_batch_id,
   'voucher_no',v_wage_result->>'voucher_no','amount',p_amount,
   'wage_allocated',v_wage_due,'advance_allocated',v_advance_due,
   'allocations_count',v_alloc_count,'funding_source',p_funding_source);

 INSERT INTO contractor_private.idempotency_log(
  idempotency_key,operation,entity_id,request_hash,request_payload,response_payload,user_id)
 VALUES(p_idempotency_key,'worker_payment_with_advance',v_batch_id::text,
   md5(v_request::text),v_request,v_result,v_actor);
 RETURN v_result;
END $pay$;

REVOKE ALL ON FUNCTION public.contractor_pay_worker_with_advance_v1(text,numeric,text,date,text,text,text,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_pay_worker_with_advance_v1(text,numeric,text,date,text,text,text,boolean)
 TO authenticated;
COMMIT;
