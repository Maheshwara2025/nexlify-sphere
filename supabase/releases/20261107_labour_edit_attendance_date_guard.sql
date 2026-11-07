-- Labour Attendance edit + future date guard. Historical rows remain untouched.
-- Reuse the verified owner membership; edits are audited and require explicit reason.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
BEGIN
  IF to_regclass('public.contractor_labour') IS NULL
    OR to_regclass('public.contractor_transactions') IS NULL
    OR to_regprocedure('public.contractor_access_status()') IS NULL
    OR to_regprocedure('public.contractor_post_entry_v1(text,jsonb,text)') IS NULL
    OR to_regclass('contractor_private.admin_memberships') IS NULL
  THEN RAISE EXCEPTION 'Labour attendance prerequisite schema missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM contractor_private.admin_memberships WHERE enabled IS TRUE)
  THEN RAISE EXCEPTION 'No verified admin; fail closed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conrelid='public.contractor_labour'::regclass
      AND conname='contractor_labour_worker_date_unique')
  THEN RAISE EXCEPTION 'Missing one-worker-one-day uniqueness constraint'; END IF;
  IF to_regclass('contractor_private.labour_attendance_edit_audit') IS NOT NULL
    OR to_regprocedure('public.contractor_edit_attendance_v1(bigint,jsonb,jsonb,text)') IS NOT NULL
  THEN RAISE EXCEPTION 'Attendance edit migration already present; do not reapply'; END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
        AND tablename='contractor_labour' AND policyname IN (
          'Allow all operations for labour','Allow all labour','contractor_owner_gate'))<>3
    OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
        AND tablename='contractor_labour' AND policyname NOT IN (
          'Allow all operations for labour','Allow all labour','contractor_owner_gate'))
  THEN RAISE EXCEPTION 'Labour security policy inventory changed; manual review required'; END IF;
END $preflight$;

-- Keep complete before/after snapshots; no public Data API access.
CREATE TABLE contractor_private.labour_attendance_edit_audit(
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  attendance_id bigint NOT NULL,
  worker_id text NOT NULL,
  changed_by uuid NOT NULL,
  old_row jsonb NOT NULL,
  new_row jsonb NOT NULL,
  reason text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contractor_private.labour_attendance_edit_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE contractor_private.labour_attendance_edit_audit
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE contractor_private.labour_attendance_edit_audit_audit_id_seq
  FROM PUBLIC,anon,authenticated;

-- Disallow future attendance at the database boundary, even if someone bypasses the form.
-- The existing December records are kept until the owner confirms the correct real dates.
CREATE FUNCTION contractor_private.labour_reject_future_attendance_date()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $guard$
BEGIN
  IF NEW.date IS NULL OR NEW.date > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
    RAISE EXCEPTION 'FUTURE_ATTENDANCE_NOT_ALLOWED: పని తేదీ ఈరోజు లేదా గత తేదీ మాత్రమే ఉండాలి'
      USING ERRCODE='22007';
  END IF;
  RETURN NEW;
END $guard$;

CREATE TRIGGER labour_reject_future_attendance_date
BEFORE INSERT OR UPDATE OF date ON public.contractor_labour
FOR EACH ROW EXECUTE FUNCTION contractor_private.labour_reject_future_attendance_date();
REVOKE ALL ON FUNCTION contractor_private.labour_reject_future_attendance_date()
  FROM PUBLIC,anon,authenticated;

-- The earlier unconditional RLS policies allowed any signed-in user to edit payroll.
-- Retain verified-owner reading, require the audited RPC for all corrections.
DROP POLICY "Allow all operations for labour" ON public.contractor_labour;
DROP POLICY "Allow all labour" ON public.contractor_labour;
DROP POLICY "contractor_owner_gate" ON public.contractor_labour;
REVOKE ALL ON TABLE public.contractor_labour FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.contractor_labour TO authenticated;
CREATE POLICY labour_verified_owner_select ON public.contractor_labour
FOR SELECT TO authenticated USING (
  coalesce((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false)
);

-- An authorized correction is atomic and auditable; never change worker identity,
-- attendance advances, or rows that have any linked financial transaction.
CREATE FUNCTION public.contractor_edit_attendance_v1(
  p_attendance_id bigint,
  p_patch jsonb,
  p_expected jsonb,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $edit$
DECLARE
  v_before public.contractor_labour%ROWTYPE;
  v_after public.contractor_labour%ROWTYPE;
  v_date date;
  v_task text;
  v_days numeric;
  v_rate numeric;
  v_reason text;
  v_actor uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL OR NOT coalesce(
     (public.contractor_access_status()->>'is_admin')::boolean,false
  ) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED: అనుమతి ఉన్న నిర్వాహకులకు మాత్రమే సవరించే అవకాశం'
      USING ERRCODE='42501';
  END IF;
  IF p_attendance_id IS NULL OR p_patch IS NULL
     OR p_expected IS NULL OR jsonb_typeof(p_patch)<>'object'
     OR jsonb_typeof(p_expected)<>'object'
  THEN RAISE EXCEPTION 'Invalid edit request'; END IF;

  v_reason := btrim(coalesce(p_reason,''));
  IF length(v_reason)<5 OR length(v_reason)>400 THEN
    RAISE EXCEPTION 'EDIT_REASON_REQUIRED: సవరణకు కారణం నమోదు చేయండి';
  END IF;
  v_date := nullif(p_patch->>'date','')::date;
  v_task := btrim(coalesce(p_patch->>'work_task',''));
  v_days := nullif(p_patch->>'days','')::numeric;
  v_rate := nullif(p_patch->>'daily_rate','')::numeric;
  IF v_date IS NULL OR v_date > (now() AT TIME ZONE 'Asia/Kolkata')::date
     OR v_date < DATE '2000-01-01' THEN
    RAISE EXCEPTION 'FUTURE_ATTENDANCE_NOT_ALLOWED: పని తేదీ ఈరోజు లేదా గత తేదీ మాత్రమే ఉండాలి';
  END IF;
  IF length(v_task)<2 OR length(v_task)>500 OR
     v_days IS NULL OR v_days<=0 OR v_days>31 OR
     v_rate IS NULL OR v_rate<=0 OR v_rate>1000000 OR
     round(v_rate,2)<>v_rate OR round(v_days*v_rate,2)>999999999
  THEN RAISE EXCEPTION 'Invalid edited attendance values'; END IF;

  SELECT * INTO v_before FROM public.contractor_labour
    WHERE id=p_attendance_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ATTENDANCE_NOT_FOUND: హాజరు రికార్డు కనబడలేదు'; END IF;

  IF v_before.date::text IS DISTINCT FROM p_expected->>'date'
     OR v_before.work_task IS DISTINCT FROM p_expected->>'work_task'
     OR v_before.days IS DISTINCT FROM (p_expected->>'days')::numeric
     OR v_before.daily_rate IS DISTINCT FROM (p_expected->>'daily_rate')::numeric
  THEN RAISE EXCEPTION 'ATTENDANCE_CHANGED: ఈ రికార్డు మారింది. రిఫ్రెష్ చేసి మళ్లీ ప్రయత్నించండి'; END IF;

  IF coalesce(v_before.advance_paid,0)<>0 OR
     EXISTS (SELECT 1 FROM public.contractor_transactions t
             WHERE t.labour_id=p_attendance_id)
  THEN RAISE EXCEPTION 'ATTENDANCE_HAS_PAYMENTS: చెల్లింపులు ఉన్న హాజరును ముందుగా లెక్కలు పరిశీలించకుండా మార్చలేరు'; END IF;

  IF v_before.date=v_date AND v_before.work_task=v_task
     AND v_before.days=v_days AND v_before.daily_rate=v_rate
  THEN RAISE EXCEPTION 'NO_CHANGES: ఎలాంటి మార్పులు చేయలేదు'; END IF;

  UPDATE public.contractor_labour
     SET date=v_date,work_task=v_task,days=v_days,daily_rate=v_rate
   WHERE id=p_attendance_id RETURNING * INTO v_after;
  -- Existing UNIQUE(worker_id,date) rejects a competing or duplicate target date.
  INSERT INTO contractor_private.labour_attendance_edit_audit
    (attendance_id,worker_id,changed_by,old_row,new_row,reason)
  VALUES (p_attendance_id,v_before.worker_id,v_actor,to_jsonb(v_before),
          to_jsonb(v_after),v_reason);
  RETURN jsonb_build_object('success',true,'attendance_id',p_attendance_id,
     'worker_id',v_after.worker_id,'new_date',v_after.date,
     'old_date',v_before.date);
END $edit$;

REVOKE ALL ON FUNCTION public.contractor_edit_attendance_v1(bigint,jsonb,jsonb,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_edit_attendance_v1(bigint,jsonb,jsonb,text)
  TO authenticated;

COMMIT;
