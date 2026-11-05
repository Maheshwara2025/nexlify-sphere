-- Contractor 360: exactly one attendance per worker ID per calendar date.
-- Keep the earliest original entry. Audit/archive and remove only exact duplicate copies
-- that have no linked cashbook/transaction references. Atomic migration; fail closed on drift.
BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '60s';

LOCK TABLE public.contractor_labour IN ACCESS EXCLUSIVE MODE;

DO $preflight$
BEGIN
  IF to_regclass('public.contractor_labour') IS NULL
    OR to_regclass('public.contractor_transactions') IS NULL
    OR to_regclass('contractor_private.idempotency_log') IS NULL
    OR to_regprocedure('public.contractor_post_entry_v1(text,jsonb,text)') IS NULL
  THEN RAISE EXCEPTION 'Labour attendance schema has changed; migration cancelled'; END IF;

  IF EXISTS (SELECT 1 FROM public.contractor_labour
             WHERE worker_id IS NULL OR btrim(worker_id) = '' OR date IS NULL)
  THEN RAISE EXCEPTION 'Historical attendance has missing worker IDs/dates: review before enforcing uniqueness'; END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.contractor_labour'::regclass
             AND conname='contractor_labour_worker_date_unique')
  THEN RAISE EXCEPTION 'Attendance uniqueness constraint is already installed'; END IF;
END
$preflight$;

-- The archive lives in a non-exposed schema and is NOT accessible to the browser.
CREATE TABLE contractor_private.labour_duplicate_archive (
  removed_id bigint PRIMARY KEY,
  retained_id bigint NOT NULL,
  worker_id text NOT NULL,
  attendance_date date NOT NULL,
  attendance_snapshot jsonb NOT NULL,
  idempotency_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contractor_private.labour_duplicate_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE contractor_private.labour_duplicate_archive FROM PUBLIC, anon, authenticated;

DO $cleanup$
DECLARE
  dupe RECORD;
  retained RECORD;
BEGIN
  FOR dupe IN
    SELECT * FROM (
      SELECT l.*, to_jsonb(l) AS row_snapshot,
        first_value(l.id) OVER (
          PARTITION BY l.worker_id, l.date ORDER BY l.created_at NULLS LAST, l.id
        ) AS retained_id,
        row_number() OVER (
          PARTITION BY l.worker_id, l.date ORDER BY l.created_at NULLS LAST, l.id
        ) AS duplicate_rank
      FROM public.contractor_labour l
    ) ranked
    WHERE ranked.duplicate_rank > 1
    ORDER BY ranked.worker_id, ranked.date, ranked.duplicate_rank
  LOOP
    SELECT * INTO STRICT retained FROM public.contractor_labour WHERE id=dupe.retained_id;

    -- Never silently discard real separate work, changed wages, or an advance.
    IF dupe.worker_name IS DISTINCT FROM retained.worker_name
       OR dupe.role IS DISTINCT FROM retained.role
       OR dupe.work_task IS DISTINCT FROM retained.work_task
       OR dupe.days IS DISTINCT FROM retained.days
       OR dupe.daily_rate IS DISTINCT FROM retained.daily_rate
       OR dupe.advance_paid IS DISTINCT FROM retained.advance_paid
    THEN
      RAISE EXCEPTION 'Conflicting attendance for worker % on %; manual financial reconciliation required',
        dupe.worker_id, dupe.date;
    END IF;

    IF EXISTS (SELECT 1 FROM public.contractor_transactions t WHERE t.labour_id=dupe.id)
    THEN
      RAISE EXCEPTION 'Duplicate attendance % has linked payments/advance: cancelled for review', dupe.id;
    END IF;

    INSERT INTO contractor_private.labour_duplicate_archive (
      removed_id,retained_id,worker_id,attendance_date,
      attendance_snapshot,idempotency_snapshot,reason
    ) VALUES (
      dupe.id,dupe.retained_id,dupe.worker_id,dupe.date,
      dupe.row_snapshot,
      COALESCE((
        SELECT jsonb_agg(to_jsonb(log_entry) ORDER BY log_entry.created_at)
        FROM contractor_private.idempotency_log log_entry
        WHERE log_entry.operation='attendance'
          AND log_entry.response_payload->>'attendance_id' = dupe.id::text
      ),'[]'::jsonb),
      'Identical same-worker same-date attendance entered twice; earliest entry retained'
    );

    -- Remove the deleted record's successful retry receipt as well, to ensure
    -- a future retry cannot falsely report the deleted attendance as successful.
    DELETE FROM contractor_private.idempotency_log
    WHERE operation='attendance' AND response_payload->>'attendance_id'=dupe.id::text;

    DELETE FROM public.contractor_labour WHERE id=dupe.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Expected duplicate attendance % vanished', dupe.id; END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.contractor_labour
    GROUP BY worker_id,date HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Duplicate attendance remains: cannot enforce uniqueness'; END IF;
END
$cleanup$;

ALTER TABLE public.contractor_labour
  ALTER COLUMN worker_id SET NOT NULL,
  ALTER COLUMN date SET NOT NULL,
  ADD CONSTRAINT contractor_labour_worker_id_nonblank
    CHECK (worker_id = btrim(worker_id) AND worker_id <> ''),
  ADD CONSTRAINT contractor_labour_worker_date_unique UNIQUE (worker_id,date);

COMMIT;
