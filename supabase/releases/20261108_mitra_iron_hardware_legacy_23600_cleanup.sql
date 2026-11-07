-- User-authorized correction: remove two previously entered MITRA IRON HARDWARE
-- credit purchases totalling Rs. 23,600. No payments were posted.
-- Preserve all original values and idempotency receipts in a private audit archive.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.contractor_materials, public.contractor_transactions IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE contractor_private.idempotency_log IN SHARE ROW EXCLUSIVE MODE;

DO $preflight$
BEGIN
  IF to_regclass('contractor_private.removed_material_purchases') IS NOT NULL
  THEN RAISE EXCEPTION 'Removal archive exists; abort reapplication'; END IF;
  IF (SELECT count(*) FROM public.contractor_materials WHERE id IN (3,4)) <> 2
     OR EXISTS (SELECT 1 FROM public.contractor_materials
                WHERE id IN (3,4) AND (
                  party_name IS DISTINCT FROM 'MITRA IRON HARDWARE'
                  OR phone IS DISTINCT FROM '9866087577'
                  OR date IS DISTINCT FROM DATE '2026-10-03'
                  OR payment_mode IS DISTINCT FROM 'Credit'
                  OR paid_amount IS DISTINCT FROM 0
                  OR total_amount IS DISTINCT FROM CASE id WHEN 3 THEN 6200 WHEN 4 THEN 17400 END
                  OR balance_amount IS DISTINCT FROM total_amount
                  OR obligation_tx_id IS DISTINCT FROM CASE id WHEN 3 THEN 13 WHEN 4 THEN 14 END
                ))
  THEN RAISE EXCEPTION 'Supplier material values changed; manual reconciliation required'; END IF;
  IF (SELECT count(*) FROM public.contractor_materials WHERE lower(party_name) LIKE '%mitra%') <> 2
  THEN RAISE EXCEPTION 'Other MITRA material purchases detected; abort exact cleanup'; END IF;
  IF (SELECT count(*) FROM public.contractor_transactions WHERE id IN (13,14)) <> 2
     OR EXISTS (SELECT 1 FROM public.contractor_transactions
               WHERE id IN (13,14) AND (
                 entry_type IS DISTINCT FROM 'credit_obligation'
                 OR source IS DISTINCT FROM 'Credit'
                 OR material_id IS DISTINCT FROM CASE id WHEN 13 THEN 3 WHEN 14 THEN 4 END
                 OR amount IS DISTINCT FROM CASE id WHEN 13 THEN 6200 WHEN 14 THEN 17400 END
                 OR balance IS DISTINCT FROM amount
                 OR status IS DISTINCT FROM 'Due'
                 OR recipient IS DISTINCT FROM 'MITRA IRON HARDWARE'
               ))
  THEN RAISE EXCEPTION 'Credit obligations changed; abort cleanup'; END IF;
  IF EXISTS (SELECT 1 FROM public.contractor_transactions
             WHERE material_id IN(3,4) AND id NOT IN(13,14))
    OR EXISTS (SELECT 1 FROM public.contractor_transactions
             WHERE obligation_id IN(13,14))
  THEN RAISE EXCEPTION 'Linked payments or additional transactions exist; abort removal'; END IF;
  IF (SELECT count(*) FROM contractor_private.idempotency_log
      WHERE operation='material_purchase' AND response_payload->>'material_id' IN ('3','4')) <> 2
  THEN RAISE EXCEPTION 'Idempotency receipts changed; review before removal'; END IF;
END $preflight$;

CREATE TABLE contractor_private.removed_material_purchases (
  material_id bigint PRIMARY KEY,
  obligation_id bigint NOT NULL,
  archived_material jsonb NOT NULL,
  archived_obligation jsonb NOT NULL,
  archived_idempotency_receipts jsonb NOT NULL,
  reason text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contractor_private.removed_material_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON contractor_private.removed_material_purchases FROM PUBLIC,anon,authenticated;

INSERT INTO contractor_private.removed_material_purchases
 (material_id,obligation_id,archived_material,archived_obligation,archived_idempotency_receipts,reason)
SELECT m.id,t.id,to_jsonb(m),to_jsonb(t),
  (SELECT jsonb_agg(to_jsonb(log_entry))
   FROM contractor_private.idempotency_log log_entry
   WHERE log_entry.operation='material_purchase'
     AND log_entry.response_payload->>'material_id'=m.id::text),
  'Explicit owner request: replace two legacy partial supplier entries with one accurate Multi-Item Bill'
FROM public.contractor_materials m
JOIN public.contractor_transactions t ON t.id=m.obligation_tx_id
WHERE m.id IN(3,4);

-- Break verified mutual foreign keys; do not touch any other materials/transactions.
UPDATE public.contractor_materials SET obligation_tx_id=NULL WHERE id IN(3,4);
DELETE FROM contractor_private.idempotency_log
 WHERE operation='material_purchase' AND response_payload->>'material_id' IN('3','4');
DELETE FROM public.contractor_transactions WHERE id IN(13,14);
DELETE FROM public.contractor_materials WHERE id IN(3,4);

DO $postflight$
BEGIN
  IF (SELECT count(*) FROM contractor_private.removed_material_purchases)<>2
    OR EXISTS (SELECT 1 FROM public.contractor_materials WHERE id IN(3,4))
    OR EXISTS (SELECT 1 FROM public.contractor_transactions WHERE id IN(13,14))
    OR EXISTS (SELECT 1 FROM contractor_private.idempotency_log WHERE operation='material_purchase'
               AND response_payload->>'material_id' IN('3','4'))
  THEN RAISE EXCEPTION 'Removal audit failed; rollback all changes'; END IF;
END $postflight$;
COMMIT;
