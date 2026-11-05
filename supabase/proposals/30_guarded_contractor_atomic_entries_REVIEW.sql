-- A.S.V. Contractor 360° ERP — Stage 3: Atomic General Ledger (REVIEW ONLY).
-- Covers expenses, receipts/transfers, material purchases, loans, worker profiles,
-- attendance with advances, piecework with advances, labour/piecework settlements.
-- Never apply without review/testing. Stage 2 RPCs remain unchanged.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='60s';
DO $approval_gate$
BEGIN
  RAISE EXCEPTION 'REVIEW ONLY: Stage 3 must pass isolated PostgreSQL tests before live execution';
END
$approval_gate$;

DO $preflight$
BEGIN
  IF to_regprocedure('public.contractor_access_status()') IS NULL
     OR to_regprocedure('public.settle_supplier_credit_bill(bigint,numeric,text,date,text,bigint,text)') IS NULL
     OR to_regclass('contractor_private.idempotency_log') IS NULL
     OR to_regclass('public.contractor_labour') IS NULL
     OR to_regclass('public.contractor_piecework') IS NULL THEN
    RAISE EXCEPTION 'Missing Stage 2 or legacy tables';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolbypassrls) THEN
    RAISE EXCEPTION 'Trusted migration administrator required';
  END IF;
END
$preflight$;

ALTER TABLE public.contractor_transactions
  ADD COLUMN IF NOT EXISTS labour_id bigint,
  ADD COLUMN IF NOT EXISTS piecework_id bigint;

DO $fks$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='fk_contractor_tx_labour') THEN
    ALTER TABLE public.contractor_transactions
      ADD CONSTRAINT fk_contractor_tx_labour FOREIGN KEY(labour_id)
      REFERENCES public.contractor_labour(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='fk_contractor_tx_piecework') THEN
    ALTER TABLE public.contractor_transactions
      ADD CONSTRAINT fk_contractor_tx_piecework FOREIGN KEY(piecework_id)
      REFERENCES public.contractor_piecework(id) ON DELETE RESTRICT;
  END IF;
END
$fks$;

CREATE OR REPLACE FUNCTION public.contractor_post_entry_v1(
  p_operation text,p_payload jsonb,p_idempotency_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $entry$
DECLARE
  v_owner uuid;
  v_old contractor_private.idempotency_log%ROWTYPE;
  v_result jsonb;
  v_row record;
  v_id bigint;
  v_target bigint;
  v_material bigint;
  v_obligation bigint;
  v_payment jsonb;
  v_amount numeric;
  v_total numeric;
  v_advance numeric;
  v_quantity numeric;
  v_rate numeric;
  v_transport numeric;
  v_days numeric;
  v_unit_qty numeric;
  v_paid numeric;
  v_date date;
  v_kind text;
  v_account text;
  v_category text;
  v_recipient text;
  v_desc text;
  v_funding text;
  v_initial_key text;
  v_img text;
BEGIN
  IF (public.contractor_access_status()->>'is_admin')::boolean IS DISTINCT FROM true
      OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: verified contractor owner required';
  END IF;
  v_owner:=auth.uid();
  IF p_operation NOT IN (
    'expense','receipt','transfer','material_purchase','loan_create',
    'worker_profile','attendance','piecework','labour_payment','piecework_payment',
    'site_diary'
  ) THEN RAISE EXCEPTION 'Unsupported contractor operation'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
     OR length(p_payload::text)>2300000 THEN
    RAISE EXCEPTION 'Invalid JSON entry payload';
  END IF;
  IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' THEN
    RAISE EXCEPTION 'Stable idempotency key required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('asv_entry:'||p_idempotency_key));
  SELECT * INTO v_old FROM contractor_private.idempotency_log
    WHERE idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_old.operation IS DISTINCT FROM p_operation
       OR v_old.entity_id IS DISTINCT FROM p_operation
       OR v_old.user_id IS DISTINCT FROM v_owner
       OR v_old.request_payload IS DISTINCT FROM p_payload
    THEN RAISE EXCEPTION 'Idempotency conflict: key reused for another request'; END IF;
    RETURN v_old.response_payload;
  END IF;
  v_date:=coalesce(nullif(p_payload->>'date','')::date,current_date);
  v_amount:=nullif(p_payload->>'amount','')::numeric;
  v_recipient:=trim(coalesce(p_payload->>'recipient',''));
  v_desc:=trim(coalesce(p_payload->>'desc',''));
  v_category:=trim(coalesce(p_payload->>'category',''));
  v_account:=p_payload->>'source';
  v_img:=nullif(p_payload->>'photo_url','');
  IF v_amount IS NOT NULL AND (v_amount<0 OR v_amount>999999999
     OR round(v_amount,2)<>v_amount) THEN RAISE EXCEPTION 'Invalid money amount'; END IF;
  IF v_img IS NOT NULL AND length(v_img)>2000000 THEN
    RAISE EXCEPTION 'Receipt image is too large';
  END IF;

  IF p_operation='expense' THEN
    IF v_amount IS NULL OR v_amount<=0
       OR length(v_category)<2 OR length(v_category)>120
       OR v_category IN ('Money In','Transfer','Interest & Finance Charges')
       OR length(v_desc)<2 OR length(v_recipient)<1
       OR v_account NOT IN ('Cash','Bank','UPI','Credit')
    THEN RAISE EXCEPTION 'Invalid expense details'; END IF;
    IF v_account='Credit' AND v_category='Materials' THEN
      RAISE EXCEPTION 'Use Material Purchases for linked material credit obligations';
    END IF;
    v_advance:=coalesce(nullif(p_payload->>'advance_paid','')::numeric,0);
    IF v_advance<0 OR v_advance>v_amount OR round(v_advance,2)<>v_advance THEN
      RAISE EXCEPTION 'Invalid advance'; END IF;
    IF v_account='Credit' THEN
      v_funding:=p_payload->>'advance_source';
      IF v_advance>0 AND v_funding NOT IN ('Cash','Bank','UPI') THEN
        RAISE EXCEPTION 'Credit advance needs Cash, Bank or UPI funding source';
      END IF;
      INSERT INTO public.contractor_transactions
        (date,category,description,amount,source,recipient,party_phone,photo_url,
         advance_paid,balance,status,invoice_no,entry_type)
      VALUES(v_date,v_category,v_desc,v_amount,'Credit',v_recipient,
        nullif(p_payload->>'party_phone',''),v_img,0,v_amount,'Due',
        'ASV-EXP-'||gen_random_uuid()::text,'credit_obligation')
      RETURNING id INTO v_id;
      IF v_advance>0 THEN
        v_initial_key:='asv_init_'||substr(md5(p_idempotency_key),1,24);
        v_payment:=public.settle_supplier_credit_bill(
          v_id,v_advance,v_funding,v_date,v_initial_key,NULL,'Initial expense advance');
      END IF;
      v_result:=jsonb_build_object('success',true,'transaction_id',v_id,'initial_payment',v_payment);
    ELSE
      IF v_advance<>0 THEN RAISE EXCEPTION 'Advance field valid only for credit'; END IF;
      INSERT INTO public.contractor_transactions
        (date,category,description,amount,source,recipient,party_phone,photo_url,
         advance_paid,balance,status,invoice_no,entry_type)
      VALUES(v_date,v_category,v_desc,v_amount,v_account,v_recipient,
        nullif(p_payload->>'party_phone',''),v_img,0,0,'Paid',
        'ASV-EXP-'||gen_random_uuid()::text,'expense')
      RETURNING id INTO v_id;
      v_result:=jsonb_build_object('success',true,'transaction_id',v_id);
    END IF;

  ELSIF p_operation IN ('receipt','loan_create') THEN
    IF p_operation='loan_create' THEN
      v_recipient:=trim(coalesce(p_payload->>'lender_name',''));
      v_amount:=nullif(p_payload->>'principal','')::numeric;
      v_kind:='Borrowed / Loan';
      v_account:=coalesce(nullif(p_payload->>'funding_source',''),'Bank');
      v_date:=coalesce(nullif(p_payload->>'date_borrowed','')::date,current_date);
    ELSE
      v_kind:=p_payload->>'sourceType';
      v_recipient:=v_desc;
      v_account:=p_payload->>'target';
    END IF;
    IF v_kind NOT IN ('Running Bill Received','Own Money','Borrowed / Loan')
      OR v_amount IS NULL OR v_amount<=0 OR v_amount>999999999
      OR round(v_amount,2)<>v_amount OR length(v_recipient)<2
      OR v_account NOT IN ('Cash','Bank','UPI') THEN
      RAISE EXCEPTION 'Invalid loan/receipt details';
    END IF;
    IF v_kind='Borrowed / Loan' THEN
      INSERT INTO public.contractor_loans(lender_name,principal,interest_rate,repaid_amount,date_borrowed)
      VALUES(v_recipient,v_amount,
        coalesce(nullif(p_payload->>'interest_rate',''),'1.5% / month'),0,v_date)
      RETURNING id INTO v_target;
    END IF;
    INSERT INTO public.contractor_transactions
      (date,category,description,amount,source,recipient,advance_paid,balance,
       status,invoice_no,entry_type,loan_id)
    VALUES(v_date,'Money In',v_kind||': '||v_recipient,v_amount,v_account,
      v_recipient,0,0,'Received','ASV-REC-'||gen_random_uuid()::text,
      CASE v_kind WHEN 'Borrowed / Loan' THEN 'loan_principal_received'
                  WHEN 'Own Money' THEN 'owner_capital_received'
                  ELSE 'client_receipt' END,v_target)
    RETURNING id INTO v_id;
    v_result:=jsonb_build_object('success',true,'transaction_id',v_id,'loan_id',v_target);

  ELSIF p_operation='transfer' THEN
    v_kind:=p_payload->>'direction';
    v_recipient:=trim(coalesce(p_payload->>'bank_name',''));
    IF v_kind NOT IN ('Cash to Bank','Bank to Cash') OR v_amount IS NULL OR v_amount<=0
      OR length(v_recipient)<2 THEN RAISE EXCEPTION 'Invalid transfer'; END IF;
    INSERT INTO public.contractor_transactions
      (date,category,description,amount,source,recipient,advance_paid,balance,
       status,invoice_no,entry_type)
    VALUES(v_date,'Transfer',v_kind||': '||v_recipient,v_amount,
      v_kind,v_recipient,0,0,'Transferred',
      'ASV-TRF-'||gen_random_uuid()::text,'transfer')
    RETURNING id INTO v_id;
    v_result:=jsonb_build_object('success',true,'transaction_id',v_id);

  ELSIF p_operation='material_purchase' THEN
    v_recipient:=trim(coalesce(p_payload->>'party_name',''));
    v_desc:=trim(coalesce(p_payload->>'material_name',''));
    v_quantity:=nullif(p_payload->>'quantity','')::numeric;
    v_rate:=nullif(p_payload->>'unit_rate','')::numeric;
    v_transport:=coalesce(nullif(p_payload->>'transport_cost','')::numeric,0);
    v_kind:=p_payload->>'payment_mode';
    IF length(v_recipient)<2 OR length(v_desc)<2
      OR v_quantity IS NULL OR v_quantity<=0 OR v_quantity>1000000
      OR v_rate IS NULL OR v_rate<0 OR v_rate>100000000
      OR round(v_rate,2)<>v_rate OR v_transport<0 OR v_transport>100000000
      OR round(v_transport,2)<>v_transport
      OR v_kind NOT IN ('Credit','Cash','Bank','UPI')
    THEN RAISE EXCEPTION 'Invalid material purchase'; END IF;
    v_total:=round(v_quantity*v_rate+v_transport,2);
    IF v_total<=0 OR v_total>999999999 THEN
      RAISE EXCEPTION 'Invalid material total'; END IF;
    v_advance:=CASE WHEN v_kind='Credit'
      THEN coalesce(nullif(p_payload->>'advance_paid','')::numeric,0)
      ELSE v_total END;
    IF v_advance<0 OR v_advance>v_total OR round(v_advance,2)<>v_advance THEN
      RAISE EXCEPTION 'Invalid material advance'; END IF;
    v_funding:=CASE WHEN v_kind='Credit' THEN p_payload->>'advance_source' ELSE v_kind END;
    IF v_advance>0 AND v_funding NOT IN ('Cash','Bank','UPI') THEN
      RAISE EXCEPTION 'Initial material payment requires funding account'; END IF;
    INSERT INTO public.contractor_materials
      (date,party_name,phone,material_name,quantity,unit,unit_rate,
       transport_cost,total_amount,paid_amount,balance_amount,payment_mode,bill_photo)
    VALUES(v_date,v_recipient,nullif(p_payload->>'phone',''),v_desc,v_quantity,
      coalesce(nullif(p_payload->>'unit',''),'Nos'),v_rate,v_transport,v_total,
      0,v_total,v_kind,nullif(p_payload->>'bill_photo',''))
    RETURNING id INTO v_material;
    INSERT INTO public.contractor_transactions
      (date,category,description,amount,source,recipient,party_phone,advance_paid,
       balance,status,invoice_no,entry_type,material_id)
    VALUES(v_date,'Materials',v_desc||' x '||v_quantity::text,v_total,'Credit',
      v_recipient,nullif(p_payload->>'phone',''),0,v_total,'Due',
      'ASV-MAT-'||gen_random_uuid()::text,'credit_obligation',v_material)
    RETURNING id INTO v_obligation;
    UPDATE public.contractor_materials SET obligation_tx_id=v_obligation WHERE id=v_material;
    IF v_advance>0 THEN
      v_initial_key:='asv_init_'||substr(md5(p_idempotency_key),1,24);
      v_payment:=public.settle_supplier_credit_bill(
        v_obligation,v_advance,v_funding,v_date,v_initial_key,v_material,
        'Initial material purchase payment');
    END IF;
    v_result:=jsonb_build_object('success',true,'material_id',v_material,
      'obligation_id',v_obligation,'total',v_total,'initial_payment',v_payment);

  ELSIF p_operation='worker_profile' THEN
    v_recipient:=trim(coalesce(p_payload->>'name',''));
    v_desc:=trim(coalesce(p_payload->>'role',''));
    v_rate:=nullif(p_payload->>'daily_rate','')::numeric;
    IF length(v_recipient)<2 OR length(v_desc)<2 OR v_rate IS NULL
      OR v_rate<=0 OR v_rate>1000000 OR round(v_rate,2)<>v_rate
      OR length(trim(coalesce(p_payload->>'worker_id','')))<3
    THEN RAISE EXCEPTION 'Invalid worker profile'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('asv_worker:'||p_payload->>'worker_id'));
    IF EXISTS(SELECT 1 FROM public.contractor_labour_profiles WHERE worker_id=p_payload->>'worker_id') THEN
      RAISE EXCEPTION 'Worker ID already exists; reload profiles';
    END IF;
    INSERT INTO public.contractor_labour_profiles
      (worker_id,name,phone,aadhar_no,role,daily_rate,address)
    VALUES(p_payload->>'worker_id',v_recipient,nullif(p_payload->>'phone',''),
      nullif(p_payload->>'aadhar_no',''),v_desc,v_rate,nullif(p_payload->>'address',''))
    RETURNING id INTO v_id;
    v_result:=jsonb_build_object('success',true,'profile_id',v_id);

  ELSIF p_operation='attendance' THEN
    SELECT * INTO v_row FROM public.contractor_labour_profiles
      WHERE worker_id=p_payload->>'worker_id' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Select a valid worker profile'; END IF;
    v_days:=nullif(p_payload->>'days','')::numeric;
    v_rate:=nullif(p_payload->>'daily_rate','')::numeric;
    v_advance:=coalesce(nullif(p_payload->>'advance_paid','')::numeric,0);
    v_funding:=p_payload->>'funding_source';
    IF v_days IS NULL OR v_days<=0 OR v_days>31
      OR v_rate IS NULL OR v_rate<=0 OR v_rate>1000000
      OR round(v_rate,2)<>v_rate OR v_advance<0
      OR round(v_advance,2)<>v_advance OR v_advance>round(v_days*v_rate,2)
    THEN RAISE EXCEPTION 'Invalid attendance wages/advance'; END IF;
    IF v_advance>0 AND v_funding NOT IN ('Cash','Bank','UPI') THEN
      RAISE EXCEPTION 'Labour advance needs funding account'; END IF;
    INSERT INTO public.contractor_labour
      (date,worker_id,worker_name,role,work_task,days,daily_rate,advance_paid)
    VALUES(v_date,v_row.worker_id,v_row.name,v_row.role,
      coalesce(nullif(p_payload->>'work_task',''),'General work'),
      v_days,v_rate,v_advance)
    RETURNING id INTO v_id;
    IF v_advance>0 THEN
      INSERT INTO public.contractor_transactions
        (date,category,description,amount,source,recipient,advance_paid,
         balance,status,invoice_no,entry_type,labour_id)
      VALUES(v_date,'Labour & Mestri','Advance: '||v_row.name,v_advance,
        v_funding,v_row.name,0,0,'Paid','ASV-LAB-'||gen_random_uuid()::text,
        'labour_advance',v_id);
    END IF;
    v_result:=jsonb_build_object('success',true,'attendance_id',v_id);

  ELSIF p_operation='piecework' THEN
    v_recipient:=trim(coalesce(p_payload->>'contractor_name',''));
    v_kind:=p_payload->>'calc_mode';
    v_quantity:=nullif(p_payload->>'length_ft','')::numeric;
    v_unit_qty:=coalesce(nullif(p_payload->>'height_ft','')::numeric,1);
    v_rate:=nullif(p_payload->>'rate_per_unit','')::numeric;
    v_advance:=coalesce(nullif(p_payload->>'advance_paid','')::numeric,0);
    v_funding:=p_payload->>'funding_source';
    IF length(v_recipient)<2 OR v_kind NOT IN ('Sft','Rft')
      OR v_quantity IS NULL OR v_quantity<=0 OR v_quantity>1000000
      OR v_unit_qty<=0 OR v_unit_qty>1000000 OR v_rate IS NULL
      OR v_rate<=0 OR v_rate>1000000 OR v_advance<0
      OR round(v_rate,2)<>v_rate OR round(v_advance,2)<>v_advance
    THEN RAISE EXCEPTION 'Invalid piecework'; END IF;
    v_total:=round((CASE WHEN v_kind='Sft' THEN v_quantity*v_unit_qty ELSE v_quantity END)*v_rate,2);
    IF v_total<=0 OR v_total>999999999 OR v_advance>v_total THEN
      RAISE EXCEPTION 'Invalid piecework total or advance'; END IF;
    IF v_advance>0 AND v_funding NOT IN ('Cash','Bank','UPI') THEN
      RAISE EXCEPTION 'Piecework advance needs funding account'; END IF;
    INSERT INTO public.contractor_piecework
      (date,contractor_name,phone,work_type,calc_mode,length_ft,height_ft,
       total_units,rate_per_unit,total_amount,advance_paid,balance_due,notes)
    VALUES(v_date,v_recipient,nullif(p_payload->>'phone',''),
      coalesce(nullif(p_payload->>'work_type',''),'General Piecework'),
      v_kind,v_quantity,v_unit_qty,
      CASE WHEN v_kind='Sft' THEN v_quantity*v_unit_qty ELSE v_quantity END,
      v_rate,v_total,v_advance,v_total-v_advance,
      nullif(p_payload->>'notes',''))
    RETURNING id INTO v_id;
    IF v_advance>0 THEN
      INSERT INTO public.contractor_transactions
        (date,category,description,amount,source,recipient,advance_paid,
         balance,status,invoice_no,entry_type,piecework_id)
      VALUES(v_date,'Centring','Piecework advance: '||v_recipient,v_advance,
        v_funding,v_recipient,0,0,'Paid','ASV-PWC-'||gen_random_uuid()::text,
        'piecework_advance',v_id);
    END IF;
    v_result:=jsonb_build_object('success',true,'piecework_id',v_id);

  ELSIF p_operation='labour_payment' THEN
    v_id:=nullif(p_payload->>'labour_id','')::bigint;
    v_funding:=p_payload->>'funding_source';
    v_amount:=nullif(p_payload->>'amount','')::numeric;
    IF v_id IS NULL OR v_amount IS NULL OR v_amount<=0
      OR round(v_amount,2)<>v_amount OR v_funding NOT IN ('Cash','Bank','UPI')
    THEN RAISE EXCEPTION 'Invalid labour settlement'; END IF;
    SELECT * INTO v_row FROM public.contractor_labour WHERE id=v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Labour attendance not found'; END IF;
    SELECT coalesce(sum(amount),0) INTO v_paid FROM public.contractor_transactions
      WHERE labour_id=v_id AND entry_type='labour_payment';
    v_total:=round(coalesce(v_row.days,1)*v_row.daily_rate,2);
    IF coalesce(v_row.advance_paid,0)+v_paid+v_amount>v_total THEN
      RAISE EXCEPTION 'Labour payment exceeds earned wages';
    END IF;
    INSERT INTO public.contractor_transactions
      (date,category,description,amount,source,recipient,advance_paid,balance,
       status,invoice_no,entry_type,labour_id)
    VALUES(v_date,'Labour & Mestri','Labour payment: '||v_row.worker_name,
      v_amount,v_funding,v_row.worker_name,0,0,'Paid',
      'ASV-LPAY-'||gen_random_uuid()::text,'labour_payment',v_id)
    RETURNING id INTO v_target;
    v_result:=jsonb_build_object('success',true,'transaction_id',v_target,'labour_id',v_id);

  ELSIF p_operation='piecework_payment' THEN
    v_id:=nullif(p_payload->>'piecework_id','')::bigint;
    v_funding:=p_payload->>'funding_source';
    v_amount:=nullif(p_payload->>'amount','')::numeric;
    IF v_id IS NULL OR v_amount IS NULL OR v_amount<=0
      OR round(v_amount,2)<>v_amount OR v_funding NOT IN ('Cash','Bank','UPI')
    THEN RAISE EXCEPTION 'Invalid piecework settlement'; END IF;
    SELECT * INTO v_row FROM public.contractor_piecework WHERE id=v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Piecework contract missing'; END IF;
    SELECT coalesce(sum(amount),0) INTO v_paid FROM public.contractor_transactions
      WHERE piecework_id=v_id AND entry_type='piecework_payment';
    IF coalesce(v_row.advance_paid,0)+v_paid+v_amount>v_row.total_amount THEN
      RAISE EXCEPTION 'Piecework payment exceeds contract amount';
    END IF;
    INSERT INTO public.contractor_transactions
      (date,category,description,amount,source,recipient,advance_paid,balance,
       status,invoice_no,entry_type,piecework_id)
    VALUES(v_date,'Centring','Piecework payment: '||v_row.contractor_name,
      v_amount,v_funding,v_row.contractor_name,0,0,'Paid',
      'ASV-PPAY-'||gen_random_uuid()::text,'piecework_payment',v_id)
    RETURNING id INTO v_target;
    UPDATE public.contractor_piecework SET balance_due=
      greatest(0,v_row.total_amount-coalesce(v_row.advance_paid,0)-v_paid-v_amount)
      WHERE id=v_id;
    v_result:=jsonb_build_object('success',true,'transaction_id',v_target,'piecework_id',v_id);

  ELSIF p_operation='site_diary' THEN
    v_desc:=trim(coalesce(p_payload->>'work_title',''));
    v_recipient:=trim(coalesce(p_payload->>'section_location',''));
    IF length(v_desc)<2 OR length(v_recipient)<2 THEN
      RAISE EXCEPTION 'Site work title and location required'; END IF;
    INSERT INTO public.contractor_daily_works
      (date,work_title,section_location,assigned_mestri,workers_count,
       work_status,site_photo,notes)
    VALUES(v_date,v_desc,v_recipient,
      coalesce(nullif(p_payload->>'assigned_mestri',''),'Not assigned'),
      coalesce(nullif(p_payload->>'workers_count','')::integer,1),
      coalesce(nullif(p_payload->>'work_status',''),'Ongoing'),
      nullif(p_payload->>'site_photo',''),nullif(p_payload->>'notes',''))
    RETURNING id INTO v_id;
    v_result:=jsonb_build_object('success',true,'site_work_id',v_id);
  END IF;

  IF v_result IS NULL THEN RAISE EXCEPTION 'No posting outcome'; END IF;
  INSERT INTO contractor_private.idempotency_log(
    idempotency_key,operation,entity_id,request_hash,request_payload,
    response_payload,user_id
  ) VALUES(
    p_idempotency_key,p_operation,p_operation,md5(p_payload::text),p_payload,
    v_result,v_owner
  );
  RETURN v_result;
END;
$entry$;

REVOKE ALL ON FUNCTION public.contractor_post_entry_v1(text,jsonb,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_post_entry_v1(text,jsonb,text)
  TO authenticated;

DO $postflight$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='contractor_post_entry_v1'
   AND p.prosecdef
 ) THEN RAISE EXCEPTION 'Atomic entry procedure not installed with owner privileges'; END IF;
END
$postflight$;
COMMIT;
