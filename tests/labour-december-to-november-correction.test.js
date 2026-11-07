import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/releases/20261107_correct_14_labour_december_dates_to_november.sql', import.meta.url), 'utf8');

test('exact 14 records are scoped to owner-confirmed dates', () => {
  assert.match(sql, /id BETWEEN 102 AND 115/);
  assert.match(sql, /id BETWEEN 102 AND 111 AND date=DATE '2026-12-01'/);
  assert.match(sql, /id BETWEEN 112 AND 115 AND date=DATE '2026-12-03'/);
  assert.match(sql, /WHEN v_before.date=DATE '2026-12-01' THEN DATE '2026-11-01'/);
  assert.match(sql, /WHEN v_before.date=DATE '2026-12-03' THEN DATE '2026-11-03'/);
  assert.match(sql, /v_changed<>14/);
});

test('correction is transactional, prevents conflicts and preserves all other fields', () => {
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
  assert.match(sql, /LOCK TABLE public\.contractor_labour/);
  assert.match(sql, /Linked payments found; manual reconciliation required/);
  assert.match(sql, /Target date already has worker attendance/);
  assert.match(sql, /Non-date field changed unexpectedly/);
  assert.match(sql, /SET date=v_new_date/);
  assert.doesNotMatch(sql, /DELETE FROM public\.contractor_labour/);
  assert.doesNotMatch(sql, /UPDATE public\.contractor_transactions/);
});

test('each correction is durably recorded in the private attendance audit', () => {
  assert.match(sql, /INSERT INTO contractor_private\.labour_attendance_edit_audit/);
  assert.match(sql, /to_jsonb\(v_before\),to_jsonb\(v_after\)/);
  assert.match(sql, /Owner-authorized correction via audited maintenance migration/);
  assert.match(sql, /count\(\*\) FROM contractor_private\.labour_attendance_edit_audit/);
});
