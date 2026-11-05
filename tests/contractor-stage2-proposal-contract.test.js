import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const proposed = readFileSync(
  new URL('../supabase/proposals/22_guarded_atomic_settlements_and_repayments_REVIEW.sql', import.meta.url),
  'utf8'
);
const preflight = readFileSync(
  new URL('../supabase/proposals/21_READ_ONLY_preflight.sql', import.meta.url),
  'utf8'
);
const gate = readFileSync(
  new URL('../src/lib/contractor/financial-write-gate.js', import.meta.url),
  'utf8'
);

test('the Stage 2 migration retains its explicit stop-before-mutation approval gate', () => {
  assert.match(proposed, /DO \$proposal_gate\$/);
  assert.match(proposed, /RAISE EXCEPTION 'PROPOSAL ONLY:/);
  assert.match(proposed, /BEGIN;/);
  assert.match(proposed, /COMMIT;/);
});

test('readiness preflight is read-only and checks 19 base column contracts', () => {
  assert.match(preflight, /READ ONLY preflight/);
  assert.match(preflight, /SELECT check_name, status, detail/);
  assert.match(preflight, /Duplicate nonblank invoice numbers/);
  assert.match(preflight, /Credit bills needing verified material mappings/);
  assert.doesNotMatch(preflight, /^\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE|TRUNCATE)\s+/im);
});

test('proposal requires immutable material IDs and rejects conflicting links', () => {
  assert.match(proposed, /Material credit bill requires a verified immutable material ID/);
  assert.match(proposed, /Missing or conflicting immutable material mapping/);
  assert.match(proposed, /v_bill\.material_id <> p_material_id/);
  assert.match(proposed, /v_mat\.obligation_tx_id <> p_obligation_id/);
  assert.match(proposed, /balance inconsistent: reconcile before settlement/);
});

test('idempotency binds user, notes and financial request fields for both RPCs', () => {
  assert.equal((proposed.match(/v_existing_owner IS DISTINCT FROM v_user_id/g) || []).length, 2);
  assert.equal((proposed.match(/coalesce\(v_existing_req ->> 'notes',''\) <> coalesce\(p_notes,''\)/g) || []).length, 2);
  assert.equal((proposed.match(/'notes', coalesce\(p_notes,''\)/g) || []).length, 2);
  assert.match(proposed, /pg_advisory_xact_lock/);
});

test('unauthorized financial writes remain disabled in production code', () => {
  assert.match(gate, /export const FINANCIAL_WRITES_ENABLED = false;/);
  assert.match(gate, /code: 'FINANCIAL_WRITES_DISABLED'/);
  assert.match(gate, /throw error;/);
});
