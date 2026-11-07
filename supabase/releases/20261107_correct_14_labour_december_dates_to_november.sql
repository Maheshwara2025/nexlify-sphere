-- Owner-authorized correction, Nov 7 2026.
-- 2026-12-01 -> 2026-11-01 (10 attendance IDs 102..111)
-- 2026-12-03 -> 2026-11-03 (4 attendance IDs 112..115)
-- No labour identity, wages, work, payment, or days change.
-- Historical before/after states are stored in contractor_private.labour_attendance_edit_audit.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='60s';

LOCK TABLE public.contractor_labour IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.contractor_transactions IN SHARE MODE;

DO $correct$
DECLARE
  v_admin uuid;
  v_before public.contractor_labour%ROWTYPE;
  v_after public.contractor_labour%ROWTYPE;
  v_new_date date;
  v_changed integer := 0;
BEGIN
  IF to_regclass('contractor_private.labour_attendance_edit_audit') IS NULL
     OR to_regclass('public.contractor_labour') IS NULL
  THEN RAISE EXCEPTION 'Attendance audit tables not present'; END IF;

  IF (SELECT count(*) FROM contractor_private.admin_memberships WHERE enabled=true) <> 1
  THEN RAISE EXCEPTION 'Expected exactly one enabled authorizing admin; stop'; END IF;
  SELECT user_id INTO STRICT v_admin FROM contractor_private.admin_memberships WHERE enabled=true;

  -- Verify the complete expected input, including both group sizes, before touching rows.
  IF (SELECT count(*) FROM public.contractor_labour WHERE id BETWEEN 102 AND 115) <> 14
     OR (SELECT count(*) FROM public.contractor_labour WHERE id BETWEEN 102 AND 111 AND date=DATE '2026-12-01') <> 10
     OR (SELECT count(*) FROM public.contractor_labour WHERE id BETWEEN 112 AND 115 AND date=DATE '2026-12-03') <> 4
     OR EXISTS (
       SELECT 1 FROM public.contractor_labour
       WHERE id BETWEEN 102 AND 115 AND (
         days IS DISTINCT FROM 1.5 OR advance_paid IS DISTINCT FROM 0
       )
     )
  THEN RAISE EXCEPTION 'Attendance values or dates drifted; no correction performed'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.contractor_transactions t
    WHERE t.labour_id BETWEEN 102 AND 115
  ) THEN RAISE EXCEPTION 'Linked payments found; manual reconciliation required'; END IF;

  IF EXISTS (
    SELECT 1 FROM contractor_private.labour_attendance_edit_audit
    WHERE attendance_id BETWEEN 102 AND 115
  ) THEN RAISE EXCEPTION 'Attendance already edited; refusing to apply again'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.contractor_labour src
    JOIN public.contractor_labour dst
      ON dst.worker_id=src.worker_id AND dst.id<>src.id
     AND dst.date=(CASE
       WHEN src.date=DATE '2026-12-01' THEN DATE '2026-11-01'
       WHEN src.date=DATE '2026-12-03' THEN DATE '2026-11-03'
       ELSE src.date END)
    WHERE src.id BETWEEN 102 AND 115
  ) THEN RAISE EXCEPTION 'Target date already has worker attendance'; END IF;

  FOR v_before IN
    SELECT * FROM public.contractor_labour
    WHERE id BETWEEN 102 AND 115 ORDER BY id FOR UPDATE
  LOOP
    v_new_date := CASE
      WHEN v_before.date=DATE '2026-12-01' THEN DATE '2026-11-01'
      WHEN v_before.date=DATE '2026-12-03' THEN DATE '2026-11-03'
      ELSE NULL END;
    IF v_new_date IS NULL THEN RAISE EXCEPTION 'Unexpected old date for attendance %',v_before.id; END IF;

    UPDATE public.contractor_labour
    SET date=v_new_date
    WHERE id=v_before.id AND date=v_before.date
    RETURNING * INTO STRICT v_after;

    INSERT INTO contractor_private.labour_attendance_edit_audit
      (attendance_id,worker_id,changed_by,old_row,new_row,reason)
    VALUES (
      v_before.id,v_before.worker_id,v_admin,to_jsonb(v_before),to_jsonb(v_after),
      'Owner-authorized correction via audited maintenance migration: incorrect December month selected in attendance form; actual work was November 1 or November 3, 2026. changed_by records the authorizing owner.'
    );

    -- Explicitly verify no fields besides date changed.
    IF (to_jsonb(v_before)-'date') <> (to_jsonb(v_after)-'date') THEN
      RAISE EXCEPTION 'Non-date field changed unexpectedly on attendance %',v_before.id;
    END IF;
    v_changed := v_changed+1;
  END LOOP;

  IF v_changed<>14
   OR (SELECT count(*) FROM contractor_private.labour_attendance_edit_audit
       WHERE attendance_id BETWEEN 102 AND 115)<>14
   OR EXISTS (SELECT 1 FROM public.contractor_labour
              WHERE id BETWEEN 102 AND 115 AND date NOT IN (DATE '2026-11-01',DATE '2026-11-03'))
  THEN RAISE EXCEPTION 'Final row/audit count mismatch; rollback all changes'; END IF;
END $correct$;
COMMIT;
