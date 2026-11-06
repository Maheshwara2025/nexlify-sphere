-- Audited one-time correction requested by owner: LBR-009 "jitendar pache"
-- Only historical attendance with incorrectly entered daily_rate = 800 changes to 1100.
-- Existing 1100-rate attendance, days, advances, and payment records are untouched.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.contractor_labour_profiles, public.contractor_labour,
           public.contractor_transactions IN SHARE ROW EXCLUSIVE MODE;

DO $preflight$
DECLARE
  v_profile_count integer;
  v_total integer;
  v_at_800 integer;
  v_at_1100 integer;
  v_days numeric;
  v_payment_count integer;
  v_target_ids bigint[];
BEGIN
  SELECT COUNT(*) INTO v_profile_count
    FROM public.contractor_labour_profiles
    WHERE worker_id='LBR-009' AND lower(btrim(name))='jitendar pache' AND daily_rate=800;
  SELECT count(*), count(*) FILTER(WHERE daily_rate=800),
      count(*) FILTER(WHERE daily_rate=1100),
      COALESCE(sum(days) FILTER(WHERE daily_rate=800),0)
  INTO v_total,v_at_800,v_at_1100,v_days
  FROM public.contractor_labour WHERE worker_id='LBR-009';

  SELECT array_agg(id ORDER BY id) INTO v_target_ids
  FROM public.contractor_labour WHERE worker_id='LBR-009' AND daily_rate=800;

  SELECT count(*) INTO v_payment_count
  FROM public.contractor_transactions t JOIN public.contractor_labour l
    ON t.labour_id=l.id WHERE l.worker_id='LBR-009';

  IF v_profile_count<>1 OR v_total<>12 OR v_at_800<>10 OR v_at_1100<>2
     OR v_days<>10.5 OR v_payment_count<>0
     OR v_target_ids IS DISTINCT FROM ARRAY[11,38,42,46,50,54,58,62,66,121]::bigint[]
  THEN
    RAISE EXCEPTION 'LBR-009 financial data drift: abort correction for manual reconciliation';
  END IF;
  IF EXISTS(SELECT 1 FROM public.contractor_labour WHERE worker_id='LBR-009'
    AND (advance_paid<>0 OR days IS NULL OR days<=0))
  THEN RAISE EXCEPTION 'LBR-009 advances or attendance terms changed'; END IF;
  IF to_regclass('contractor_private.labour_rate_corrections') IS NOT NULL
  THEN RAISE EXCEPTION 'Rate correction history table already exists; review changes'; END IF;
END $preflight$;

-- Independent audit before changing any monetary rate, inaccessible to Data API users.
CREATE TABLE contractor_private.labour_rate_corrections (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  worker_id text NOT NULL,
  entry_kind text NOT NULL CHECK (entry_kind IN ('worker_profile','attendance')),
  record_id bigint NOT NULL,
  work_date date,
  old_daily_rate numeric NOT NULL,
  new_daily_rate numeric NOT NULL,
  days numeric,
  original_record jsonb NOT NULL,
  correction_reason text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contractor_private.labour_rate_corrections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE contractor_private.labour_rate_corrections FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE contractor_private.labour_rate_corrections_audit_id_seq FROM PUBLIC,anon,authenticated;

INSERT INTO contractor_private.labour_rate_corrections
  (worker_id,entry_kind,record_id,work_date,old_daily_rate,new_daily_rate,days,original_record,correction_reason)
SELECT worker_id,'worker_profile',id,NULL,daily_rate,1100,NULL,to_jsonb(p),
  'Owner-requested LBR-009 daily wage correction: 800 to 1100'
FROM public.contractor_labour_profiles p
WHERE worker_id='LBR-009' AND daily_rate=800;

INSERT INTO contractor_private.labour_rate_corrections
  (worker_id,entry_kind,record_id,work_date,old_daily_rate,new_daily_rate,days,original_record,correction_reason)
SELECT worker_id,'attendance',id,date,daily_rate,1100,days,to_jsonb(l),
  'Owner-requested LBR-009 daily wage correction: 800 to 1100'
FROM public.contractor_labour l
WHERE worker_id='LBR-009' AND daily_rate=800;

DO $change$
DECLARE
  v_profiles integer;
  v_attendance integer;
BEGIN
  UPDATE public.contractor_labour_profiles
    SET daily_rate=1100
    WHERE worker_id='LBR-009' AND daily_rate=800;
  GET DIAGNOSTICS v_profiles = ROW_COUNT;

  UPDATE public.contractor_labour
    SET daily_rate=1100
    WHERE worker_id='LBR-009' AND daily_rate=800;
  GET DIAGNOSTICS v_attendance = ROW_COUNT;

  IF v_profiles<>1 OR v_attendance<>10
    OR (SELECT count(*) FROM contractor_private.labour_rate_corrections
        WHERE worker_id='LBR-009')<>11
    OR EXISTS(SELECT 1 FROM public.contractor_labour
              WHERE worker_id='LBR-009' AND daily_rate<>1100)
  THEN RAISE EXCEPTION 'Unexpected number of corrections; rollback all updates'; END IF;
END $change$;
COMMIT;
