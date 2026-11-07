-- A.S.V. BuildTrack multi-item material bills and size-wise stock.
-- One existing contractor_materials aggregate + one creditor transaction per bill,
-- enabling existing audited settlement RPC and accounting without double counting.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='75s';

DO $preflight$
BEGIN
 IF to_regclass('public.contractor_materials') IS NULL
    OR to_regclass('public.contractor_transactions') IS NULL
    OR to_regclass('public.contractor_parties') IS NULL
    OR to_regclass('contractor_private.idempotency_log') IS NULL
    OR to_regprocedure('public.settle_supplier_credit_bill(bigint,numeric,text,date,text,bigint,text)') IS NULL
    OR to_regprocedure('public.contractor_access_status()') IS NULL
 THEN RAISE EXCEPTION 'Prerequisite finance schema not deployed'; END IF;
 IF to_regclass('public.contractor_purchase_bills') IS NOT NULL
    OR to_regclass('public.contractor_purchase_bill_items') IS NOT NULL
    OR to_regclass('public.contractor_material_stock_usage') IS NOT NULL
 THEN RAISE EXCEPTION 'Purchase bill schema already installed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM contractor_private.admin_memberships WHERE enabled)
 THEN RAISE EXCEPTION 'Verified administrator missing'; END IF;
END $preflight$;

CREATE TABLE public.contractor_purchase_bills(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 supplier_id bigint NOT NULL REFERENCES public.contractor_parties(id) ON DELETE RESTRICT,
 material_id bigint NOT NULL UNIQUE REFERENCES public.contractor_materials(id) ON DELETE RESTRICT,
 external_invoice_no text,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT purchase_bill_external_no_length CHECK (
  external_invoice_no IS NULL OR (length(external_invoice_no) BETWEEN 1 AND 100)
 )
);
CREATE UNIQUE INDEX contractor_purchase_bill_supplier_invoice_unique
 ON public.contractor_purchase_bills(supplier_id, lower(external_invoice_no))
 WHERE external_invoice_no IS NOT NULL;

CREATE TABLE public.contractor_purchase_bill_items(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 bill_id bigint NOT NULL REFERENCES public.contractor_purchase_bills(id) ON DELETE RESTRICT,
 material_code text NOT NULL,
 material_label text NOT NULL,
 quantity numeric(14,3) NOT NULL CHECK(quantity>0 AND quantity<=1000000),
 unit text NOT NULL CHECK (unit IN('Nos','Kg','Bags','Trips','Tons','CFT','SFT')),
 unit_rate numeric(14,2) NOT NULL CHECK(unit_rate>=0 AND unit_rate<=100000000),
 line_total numeric(17,2) GENERATED ALWAYS AS (round(quantity*unit_rate,2)) STORED,
 CONSTRAINT purchase_item_code_format CHECK (
  material_code IN ('ROD_6MM','ROD_8MM','ROD_10MM','ROD_12MM','BINDING_WIRE','CEMENT','SAND','AGGREGATE_20MM','BRICKS')
  OR (material_code LIKE 'OTHER:%' AND length(material_code) BETWEEN 8 AND 80)
 ),
 CONSTRAINT purchase_item_label_length CHECK(length(material_label) BETWEEN 2 AND 100)
);
CREATE INDEX purchase_bill_items_code_idx ON public.contractor_purchase_bill_items(material_code);
CREATE INDEX purchase_bill_supplier_idx ON public.contractor_purchase_bills(supplier_id);

CREATE TABLE public.contractor_material_stock_usage (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 date date NOT NULL,
 material_code text NOT NULL,
 material_label text NOT NULL,
 unit text NOT NULL CHECK(unit IN('Nos','Kg','Bags','Trips','Tons','CFT','SFT')),
 quantity numeric(14,3) NOT NULL CHECK(quantity>0 AND quantity<=1000000),
 site_name text NOT NULL CHECK(length(site_name) BETWEEN 2 AND 150),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=1000),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_usage_code_idx ON public.contractor_material_stock_usage(material_code);

-- Public schema only used for the verified owner's SELECT.
-- All mutations require atomic, audited, authorization-checking RPCs.
ALTER TABLE public.contractor_purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_purchase_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_material_stock_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contractor_purchase_bills,public.contractor_purchase_bill_items,public.contractor_material_stock_usage
 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.contractor_purchase_bills,public.contractor_purchase_bill_items,public.contractor_material_stock_usage
 TO authenticated;
CREATE POLICY purchase_bill_verified_owner_select ON public.contractor_purchase_bills
 FOR SELECT TO authenticated USING (
   coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false)
 );
CREATE POLICY purchase_items_verified_owner_select ON public.contractor_purchase_bill_items
 FOR SELECT TO authenticated USING (
   coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false)
 );
CREATE POLICY material_usage_verified_owner_select ON public.contractor_material_stock_usage
 FOR SELECT TO authenticated USING (
   coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false)
 );

CREATE FUNCTION public.contractor_post_material_bill_v1(
 p_payload jsonb, p_idempotency_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $bill$
DECLARE
 v_actor uuid;
 v_supplier text;
 v_phone text;
 v_bill_number text;
 v_invoice_date date;
 v_transport numeric;
 v_total numeric:=0;
 v_paid numeric;
 v_mode text;
 v_funding text;
 v_photo text;
 v_material_id bigint;
 v_obligation_id bigint;
 v_bill_id bigint;
 v_supplier_id bigint;
 v_item jsonb;
 v_code text;
 v_label text;
 v_unit text;
 v_quantity numeric;
 v_rate numeric;
 v_count integer:=0;
 v_response jsonb;
 v_old contractor_private.idempotency_log%ROWTYPE;
 v_payment jsonb;
BEGIN
 v_actor:=auth.uid();
 IF v_actor IS NULL OR NOT coalesce(
  (public.contractor_access_status()->>'is_admin')::boolean,false
 ) THEN RAISE EXCEPTION 'ADMIN_REQUIRED: verify contractor owner login' USING ERRCODE='42501'; END IF;
 IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
    OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
 THEN RAISE EXCEPTION 'Invalid bill request or idempotency key'; END IF;

 PERFORM pg_advisory_xact_lock(hashtext('multi_bill:'||p_idempotency_key));
 SELECT * INTO v_old FROM contractor_private.idempotency_log
 WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_old.operation<>'multi_item_material_bill'
     OR v_old.user_id IS DISTINCT FROM v_actor
     OR v_old.request_payload IS DISTINCT FROM p_payload
  THEN RAISE EXCEPTION 'Idempotency conflict: this request key was already used'; END IF;
  RETURN v_old.response_payload;
 END IF;

 v_supplier:=btrim(coalesce(p_payload->>'supplier_name',''));
 v_phone:=nullif(regexp_replace(coalesce(p_payload->>'supplier_phone',''),'[^0-9]','','g'),'');
 v_bill_number:=nullif(btrim(coalesce(p_payload->>'bill_number','')),'');
 v_invoice_date:=nullif(p_payload->>'date','')::date;
 v_mode:=p_payload->>'payment_mode';
 v_transport:=coalesce(nullif(p_payload->>'transport_cost','')::numeric,0);
 v_photo:=nullif(p_payload->>'bill_photo','');
 IF length(v_supplier)<2 OR length(v_supplier)>150 OR
    (v_phone IS NOT NULL AND v_phone !~ '^[0-9]{10}$') OR
    (v_bill_number IS NOT NULL AND length(v_bill_number)>100) OR
    v_invoice_date IS NULL OR v_invoice_date> (now() AT TIME ZONE 'Asia/Kolkata')::date OR
    v_transport<0 OR v_transport>10000000 OR round(v_transport,2)<>v_transport OR
    v_mode NOT IN ('Credit','Cash','Bank','UPI') OR
    (v_photo IS NOT NULL AND length(v_photo)>2000000)
 THEN RAISE EXCEPTION 'Invalid supplier details, date, transport, payment mode or bill image'; END IF;
 IF jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_payload->'items') NOT BETWEEN 1 AND 40
 THEN RAISE EXCEPTION 'Bill must contain 1–40 material lines'; END IF;

 -- Lock this supplier's human-readable identity for concurrent first registration.
 PERFORM pg_advisory_xact_lock(hashtext('supplier:'||lower(v_supplier)||':'||coalesce(v_phone,'')));
 SELECT id INTO v_supplier_id FROM public.contractor_parties
 WHERE party_type='Supplier'
   AND lower(btrim(name))=lower(v_supplier)
   AND nullif(regexp_replace(coalesce(phone,''),'[^0-9]','','g'),'') IS NOT DISTINCT FROM v_phone
 ORDER BY id LIMIT 1 FOR UPDATE;
 IF v_supplier_id IS NULL THEN
   INSERT INTO public.contractor_parties(name,phone,party_type,opening_balance)
   VALUES(v_supplier,v_phone,'Supplier',0) RETURNING id INTO v_supplier_id;
 END IF;
 IF v_bill_number IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.contractor_purchase_bills
   WHERE supplier_id=v_supplier_id AND lower(external_invoice_no)=lower(v_bill_number)
 ) THEN RAISE EXCEPTION 'BILL_ALREADY_ENTERED: this supplier invoice number is already saved'; END IF;

 -- Validate item list before writing any money, then insert item details afterward.
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'items') AS value
 LOOP
  IF jsonb_typeof(v_item)<>'object' THEN RAISE EXCEPTION 'Invalid material item'; END IF;
  v_code:=v_item->>'code';
  v_quantity:=nullif(v_item->>'quantity','')::numeric;
  v_rate:=nullif(v_item->>'unit_rate','')::numeric;
  v_label:=CASE v_code
   WHEN 'ROD_6MM' THEN '6mm Steel Rods'
   WHEN 'ROD_8MM' THEN '8mm Steel Rods'
   WHEN 'ROD_10MM' THEN '10mm Steel Rods'
   WHEN 'ROD_12MM' THEN '12mm Steel Rods'
   WHEN 'BINDING_WIRE' THEN 'Binding Wire'
   WHEN 'CEMENT' THEN 'Cement'
   WHEN 'SAND' THEN 'Sand'
   WHEN 'AGGREGATE_20MM' THEN '20mm Aggregate'
   WHEN 'BRICKS' THEN 'Bricks'
   WHEN 'OTHER' THEN btrim(coalesce(v_item->>'label',''))
   ELSE NULL END;
  IF v_code='OTHER' THEN
    IF length(v_label) NOT BETWEEN 2 AND 70 OR v_label ~ '[<>]' THEN
      RAISE EXCEPTION 'Custom material name must be 2–70 characters'; END IF;
    v_code:='OTHER:'||upper(v_label);
    v_unit:=v_item->>'unit';
  ELSE
    v_unit:=CASE WHEN v_code IN('ROD_6MM','ROD_8MM','ROD_10MM','ROD_12MM') THEN 'Nos'
      WHEN v_code='BINDING_WIRE' THEN 'Kg'
      WHEN v_code='CEMENT' THEN 'Bags'
      WHEN v_code IN('SAND','AGGREGATE_20MM','BRICKS') THEN 'Trips'
      ELSE NULL END;
  END IF;
  IF v_label IS NULL OR v_unit NOT IN ('Nos','Kg','Bags','Trips','Tons','CFT','SFT')
     OR v_quantity IS NULL OR v_quantity<=0 OR v_quantity>1000000
     OR round(v_quantity,3)<>v_quantity OR
     v_rate IS NULL OR v_rate<0 OR v_rate>100000000 OR round(v_rate,2)<>v_rate
  THEN RAISE EXCEPTION 'Invalid material code, unit, quantity or rate'; END IF;
  v_total:=v_total+round(v_quantity*v_rate,2);
  v_count:=v_count+1;
 END LOOP;
 v_total:=round(v_total+v_transport,2);
 IF v_total<=0 OR v_total>999999999 OR v_count=0
 THEN RAISE EXCEPTION 'Invalid material bill total'; END IF;

 v_paid:=CASE WHEN v_mode='Credit'
   THEN coalesce(nullif(p_payload->>'advance_paid','')::numeric,0) ELSE v_total END;
 v_funding:=CASE WHEN v_mode='Credit' THEN p_payload->>'advance_source' ELSE v_mode END;
 IF v_paid<0 OR v_paid>v_total OR round(v_paid,2)<>v_paid
    OR (v_paid>0 AND v_funding NOT IN ('Cash','Bank','UPI'))
 THEN RAISE EXCEPTION 'Invalid initial payment or funding account'; END IF;

 -- Exactly one material aggregate row and one credit obligation per multi-line bill.
 INSERT INTO public.contractor_materials
  (date,party_name,phone,material_name,material_code,quantity,unit,unit_rate,
   transport_cost,total_amount,paid_amount,balance_amount,payment_mode,bill_photo)
 VALUES (v_invoice_date,v_supplier,v_phone,'మల్టీ ఐటమ్ కొనుగోలు బిల్లు (Multi-Item Bill)',
   'BILL_MULTI',1,'Bill',v_total-v_transport,
   v_transport,v_total,0,v_total,v_mode,v_photo)
 RETURNING id INTO v_material_id;

 INSERT INTO public.contractor_transactions
  (date,category,description,amount,source,recipient,party_phone,advance_paid,
   balance,status,invoice_no,entry_type,material_id)
 VALUES(v_invoice_date,'Materials',
   'Multi-Item Material Bill ('||v_count||' lines) '||coalesce(v_bill_number,''),
   v_total,'Credit',v_supplier,v_phone,0,v_total,'Due',
   'ASV-MB-'||pg_catalog.gen_random_uuid()::text,'credit_obligation',v_material_id)
 RETURNING id INTO v_obligation_id;

 UPDATE public.contractor_materials SET obligation_tx_id=v_obligation_id
 WHERE id=v_material_id;
 INSERT INTO public.contractor_purchase_bills
  (supplier_id,material_id,external_invoice_no,created_by)
 VALUES(v_supplier_id,v_material_id,v_bill_number,v_actor)
 RETURNING id INTO v_bill_id;

 -- Recreate canonical validated items (never trust browser-submitted totals).
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'items') AS value
 LOOP
  v_code:=v_item->>'code';
  v_label:=CASE v_code
   WHEN 'ROD_6MM' THEN '6mm Steel Rods'
   WHEN 'ROD_8MM' THEN '8mm Steel Rods'
   WHEN 'ROD_10MM' THEN '10mm Steel Rods'
   WHEN 'ROD_12MM' THEN '12mm Steel Rods'
   WHEN 'BINDING_WIRE' THEN 'Binding Wire'
   WHEN 'CEMENT' THEN 'Cement'
   WHEN 'SAND' THEN 'Sand'
   WHEN 'AGGREGATE_20MM' THEN '20mm Aggregate'
   WHEN 'BRICKS' THEN 'Bricks'
   ELSE btrim(v_item->>'label') END;
  v_unit:=CASE WHEN v_code IN('ROD_6MM','ROD_8MM','ROD_10MM','ROD_12MM') THEN 'Nos'
      WHEN v_code='BINDING_WIRE' THEN 'Kg'
      WHEN v_code='CEMENT' THEN 'Bags'
      WHEN v_code IN('SAND','AGGREGATE_20MM','BRICKS') THEN 'Trips'
      ELSE v_item->>'unit' END;
  IF v_code='OTHER' THEN v_code:='OTHER:'||upper(v_label); END IF;
  INSERT INTO public.contractor_purchase_bill_items
   (bill_id,material_code,material_label,quantity,unit,unit_rate)
  VALUES(v_bill_id,v_code,v_label,
   (v_item->>'quantity')::numeric,v_unit,(v_item->>'unit_rate')::numeric);
 END LOOP;

 IF v_paid>0 THEN
  v_payment:=public.settle_supplier_credit_bill(
    v_obligation_id,v_paid,v_funding,v_invoice_date,
    'asv_multi_init_'||substr(md5(p_idempotency_key),1,30),
    v_material_id,'Initial multi-item bill payment');
 END IF;

 v_response:=jsonb_build_object('success',true,'bill_id',v_bill_id,
   'supplier_id',v_supplier_id,'material_id',v_material_id,
   'obligation_id',v_obligation_id,'total',v_total,
   'initial_payment',v_payment,'item_count',v_count);
 INSERT INTO contractor_private.idempotency_log
  (idempotency_key,operation,entity_id,request_hash,request_payload,response_payload,user_id)
 VALUES(p_idempotency_key,'multi_item_material_bill',v_bill_id::text,
   md5(p_payload::text),p_payload,v_response,v_actor);
 RETURN v_response;
END $bill$;

CREATE FUNCTION public.contractor_use_material_stock_v1(
 p_payload jsonb, p_idempotency_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $usage$
DECLARE
 v_actor uuid;
 v_code text;
 v_label text;
 v_unit text;
 v_quantity numeric;
 v_available numeric;
 v_site text;
 v_date date;
 v_notes text;
 v_count bigint;
 v_id bigint;
 v_old contractor_private.idempotency_log%ROWTYPE;
 v_response jsonb;
BEGIN
 v_actor:=auth.uid();
 IF v_actor IS NULL OR NOT coalesce(
  (public.contractor_access_status()->>'is_admin')::boolean,false
 ) THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
    OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
 THEN RAISE EXCEPTION 'Invalid usage request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('stock_usage:'||p_idempotency_key));
 SELECT * INTO v_old FROM contractor_private.idempotency_log
 WHERE idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_old.operation<>'material_stock_usage'
    OR v_old.user_id IS DISTINCT FROM v_actor
    OR v_old.request_payload IS DISTINCT FROM p_payload
  THEN RAISE EXCEPTION 'Idempotency key conflict for usage'; END IF;
  RETURN v_old.response_payload;
 END IF;
 v_code:=p_payload->>'material_code';
 v_quantity:=nullif(p_payload->>'quantity','')::numeric;
 v_site:=btrim(coalesce(p_payload->>'site_name',''));
 v_date:=nullif(p_payload->>'date','')::date;
 v_notes:=btrim(coalesce(p_payload->>'notes',''));
 IF v_code IS NULL OR length(v_code)>80 OR length(v_site) NOT BETWEEN 2 AND 150
    OR length(v_notes)>1000 OR v_date IS NULL
    OR v_date>(now() AT TIME ZONE 'Asia/Kolkata')::date
    OR v_quantity IS NULL OR v_quantity<=0 OR v_quantity>1000000
    OR round(v_quantity,3)<>v_quantity
 THEN RAISE EXCEPTION 'Invalid site usage, quantity or date'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('material_stock:'||v_code));
 SELECT min(material_label),min(unit),count(*)
 INTO v_label,v_unit,v_count
 FROM public.contractor_purchase_bill_items WHERE material_code=v_code;
 IF v_count=0 OR
   (SELECT count(DISTINCT unit) FROM public.contractor_purchase_bill_items WHERE material_code=v_code)<>1
 THEN RAISE EXCEPTION 'Material stock item not found or unit inconsistent'; END IF;
 SELECT coalesce((SELECT sum(quantity) FROM public.contractor_purchase_bill_items
   WHERE material_code=v_code),0) -
   coalesce((SELECT sum(quantity) FROM public.contractor_material_stock_usage
   WHERE material_code=v_code),0)
 INTO v_available;
 IF v_quantity>v_available THEN
   RAISE EXCEPTION 'INSUFFICIENT_STOCK: % % available; cannot issue %',
     v_available,v_unit,v_quantity;
 END IF;
 INSERT INTO public.contractor_material_stock_usage
  (date,material_code,material_label,unit,quantity,site_name,notes,created_by)
 VALUES(v_date,v_code,v_label,v_unit,v_quantity,v_site,v_notes,v_actor)
 RETURNING id INTO v_id;
 v_response:=jsonb_build_object('success',true,'usage_id',v_id,
   'material_code',v_code,'issued',v_quantity,'remaining',v_available-v_quantity);
 INSERT INTO contractor_private.idempotency_log
  (idempotency_key,operation,entity_id,request_hash,request_payload,response_payload,user_id)
 VALUES(p_idempotency_key,'material_stock_usage',v_id::text,
   md5(p_payload::text),p_payload,v_response,v_actor);
 RETURN v_response;
END $usage$;

REVOKE ALL ON FUNCTION public.contractor_post_material_bill_v1(jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.contractor_use_material_stock_v1(jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_post_material_bill_v1(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_use_material_stock_v1(jsonb,text) TO authenticated;
COMMIT;
