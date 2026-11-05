/**
 * Disposable Postgres-only migration gate bypass. Never run on Supabase.
 * The approved-source SQL always retains the proposal stop gate.
 * GitHub Actions uses this script ONLY with its ephemeral asv_contract_test DB.
 */
import { readFileSync, writeFileSync } from 'node:fs';

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.PGDATABASE !== 'asv_contract_test') {
  throw new Error('Refusing to stage SQL: only the isolated GitHub Actions test database is allowed.');
}

const from = new URL(
  '../../supabase/proposals/22_guarded_atomic_settlements_and_repayments_REVIEW.sql',
  import.meta.url
);
const guarded = readFileSync(from, 'utf8');
const gate = /DO \$proposal_gate\$\s*\nBEGIN\s*\n\s*RAISE EXCEPTION 'PROPOSAL ONLY:[^\n]*;\s*\nEND\s*\n\$proposal_gate\$;/g;
const matches = guarded.match(gate);
if (!matches || matches.length !== 1) {
  throw new Error('Expected exactly one known approval gate; proposal changed unexpectedly.');
}

const ciOnly = guarded.replace(
  gate,
  '-- PROPOSAL GATE REMOVED FOR ISOLATED EPHEMERAL CI POSTGRES ONLY.'
);
const output = '/tmp/asv_contractor_stage2_ephemeral_ci.sql';
writeFileSync(output, ciOnly);
console.log('Created gated CI-only review migration at ' + output);
