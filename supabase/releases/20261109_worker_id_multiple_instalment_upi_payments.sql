-- One Worker ID = one running account, with unlimited installment payments.
-- Keep existing per-attendance payment RPC; new worker payment atomically distributes
-- one Bank/UPI/Cash transfer over the oldest unpaid attendance rows.
BEGIN;
SET LOCAL lock_timeout='7s';
SET LOCAL statement_timeout='75s';
DO $preflight$
BEGIN
 IF to_regclass('public.contractor_labour_profiles') IS NULL
   OR to_regclass('public.contractor_labour') IS NULL
   OR to_regclass('public.contractor_transactions') IS NULL
   OR to_regclass('contractor_private.idempotency_log') IS NULL
   OR to_regprocedure('public.contractor_access_status()') IS NULL
 THEN RAISE EXCEPTION 'Labour accounting prerequisites missing'; END IF;
 IF to_regclass('public.contractor_worker_payments') IS NOT NULL
   OR to_regprocedure('public.contractor_pay_worker_v1(text,numeric,text,date,text,text,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'Worker payment feature already installed'; END IF;
END $preflight$;

-- A single payment header represents one real transfer. Each linked ledger
-- allocation below is an attendance payment; summed cash movement is ONE transfer.
CREATE TABLE public.contractor_worker_payments (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 worker_id text NOT NULL REFERENCES public.contractor_labour_profiles(worker_id) ON DELETE RESTRICT,
 voucher_no text NOT NULL UNIQUE,
 payment_date date NOT NULL,
 amount numeric(14,2) NOT NULL CHECK(amount>0),
 funding_source text NOT NULL CHECK(funding_source IN('Cash','Bank','UPI')),
 payment_reference text CHECK(payment_reference IS NULL OR
   (length(payment_reference) BETWEEN 1 AND 100 AND payment_reference !~ '[<>\\r\\n]')),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=500),
 allocations_count integer NOT NULL CHECK(allocations_count>0),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX worker_payment_upi_reference_unique ON public.contractor_worker_payments
 (worker_id,lower(payment_reference))
 WHERE funding_source='UPI' AND payment_reference IS NOT NULL;
CREATE INDEX contractor_worker_payments_worker_date_idx
 ON public.contractor_worker_payments(worker_id,payment_date,id);
ALTER TABLE public.contractor_worker_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.contractor_worker_payments FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.contractor_worker_payments TO authenticated;
CREATE POLICY worker_payment_owner_select ON public.contractor_worker_payments
 FOR SELECT TO authenticated USING (
  coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false)
 );

CREATE FUNCTION public.contractor_pay_worker_v1(
 p_worker_id text,p_amount numeric,p_funding_source text,p_payment_date date,
 p_payment_reference text,p_notes text,p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $worker$
DECLARE
 v_actor uuid;
 v_owner public.contractor_labour_profiles%ROWTYPE;
 v_att public.contractor_labour%ROWTYPE;
 v_existing contractor_private.idempotency_log%ROWTYPE;
 v_request jsonb;
 v_result jsonb;
 v_left numeric;
 v_earned numeric;
 v_already_paid numeric;
 v_due numeric;
 v_alloc numeric;
 v_count integer:=0;
 v_batch_id bigint;
 v_tx_id bigint;
 v_voucher text;
 v_ref text;
 v_notes text;
BEGIN
 v_actor:=auth.uid();
 IF v_actor IS NULL OR NOT coalesce(
  (public.contractor_access_status()->>'is_admin')::boolean,false
 ) THEN RAISE EXCEPTION 'ADMIN_REQUIRED: verified owner only' USING ERRCODE='42501'; END IF;
 IF p_worker_id IS NULL OR p_worker_id !~ '^LBR-[0-9]{3,8}$'
   OR p_amount IS NULL OR p_amount<=0 OR p_amount>999999999
   OR round(p_amount,2)<>p_amount
   OR p_funding_source NOT IN('Cash','Bank','UPI')
   OR p_payment_date IS NULL OR p_payment_date<DATE '2000-01-01'
   OR p_payment_date>(now() AT TIME ZONE 'Asia/Kolkata')::date
   OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
 THEN RAISE EXCEPTION 'Invalid worker ID, amount, payment date, source or request key'; END IF;
 v_ref:=nullif(btrim(coalesce(p_payment_reference,'')),'');
 v_notes:=btrim(coalesce(p_notes,''));
 IF (v_ref IS NOT NULL AND (length(v_ref)>100 OR v_ref ~ '[<>\\r\\n]'))
   OR length(v_notes)>500 OR v_notes ~ '[<>]'
 THEN RAISE EXCEPTION 'Payment reference or notes invalid'; END IF;
 v_request:=jsonb_build_object(
  'worker_id',p_worker_id,'amount',p_amount,'funding',p_funding_source,
  'date',p_payment_date,'reference',v_ref,'notes',v_notes
 );
 PERFORM pg_advisory_xact_lock(hashtext('asv_worker_payment:'||p_idempotency_key));
 SELECT * INTO v_existing FROM contractor_private.idempotency_log
 WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_existing.operation<>'worker_payment'
    OR v_existing.user_id IS DISTINCT FROM v_actor
    OR v_existing.request_payload IS DISTINCT FROM v_request
  THEN RAISE EXCEPTION 'Idempotency conflict: different payment using same request key'; END IF;
  RETURN v_existing.response_payload;
 END IF;

 -- Serialize worker installments, and lock every attendance while allocating.
 SELECT * INTO v_owner FROM public.contractor_labour_profiles
 WHERE worker_id=p_worker_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Worker ID not found'; END IF;
 v_left:=p_amount;
 v_voucher:='ASV-WPAY-'||replace(pg_catalog.gen_random_uuid()::text,'-','');

 FOR v_att IN SELECT * FROM public.contractor_labour
   WHERE worker_id=p_worker_id ORDER BY date,id FOR UPDATE
 LOOP
   SELECT coalesce(sum(amount),0) INTO v_already_paid
   FROM public.contractor_transactions
   WHERE entry_type='labour_payment' AND labour_id=v_att.id;
   v_earned:=round(coalesce(v_att.days,0)*coalesce(v_att.daily_rate,0),2);
   v_due:=greatest(0,v_earned-coalesce(v_att.advance_paid,0)-v_already_paid);
   IF v_due<=0 OR v_left<=0 THEN CONTINUE; END IF;
   v_alloc:=least(v_left,v_due);
   INSERT INTO public.contractor_transactions
    (date,category,description,amount,source,recipient,advance_paid,balance,
      status,invoice_no,entry_type,labour_id)
   VALUES
    (p_payment_date,'Labour & Mestri',
     'Worker ID '||p_worker_id||' payment for attendance '||v_att.date::text||
       CASE WHEN v_ref IS NULL THEN '' ELSE ' (Ref: '||v_ref||')' END,
     v_alloc,p_funding_source,v_owner.name,0,0,'Paid',v_voucher,
     'labour_payment',v_att.id)
   RETURNING id INTO v_tx_id;
   v_count:=v_count+1;
   v_left:=round(v_left-v_alloc,2);
 END LOOP;

 IF v_count=0 OR v_left<>0 THEN
  RAISE EXCEPTION 'PAYMENT_EXCEEDS_DUE: Worker ID % has insufficient unpaid wages; no payment saved',p_worker_id;
 END IF;
 INSERT INTO public.contractor_worker_payments
  (worker_id,voucher_no,payment_date,amount,funding_source,payment_reference,
    notes,allocations_count,created_by)
 VALUES(p_worker_id,v_voucher,p_payment_date,p_amount,p_funding_source,
   v_ref,v_notes,v_count,v_actor)
 RETURNING id INTO v_batch_id;
 v_result:=jsonb_build_object('success',true,'worker_id',p_worker_id,
   'batch_id',v_batch_id,'voucher_no',v_voucher,
   'amount',p_amount,'allocations_count',v_count,'funding_source',p_funding_source);
 INSERT INTO contractor_private.idempotency_log
  (idempotency_key,operation,entity_id,request_hash,request_payload,response_payload,user_id)
 VALUES(p_idempotency_key,'worker_payment',v_batch_id::text,
   md5(v_request::text),v_request,v_result,v_actor);
 RETURN v_result;
END $worker$;

REVOKE ALL ON FUNCTION public.contractor_pay_worker_v1(text,numeric,text,date,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_pay_worker_v1(text,numeric,text,date,text,text,text)
 TO authenticated;
COMMIT;
