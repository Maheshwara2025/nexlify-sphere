/** Remove the explicit Stage 3 stop gate for disposable CI PostgreSQL ONLY. */
import { readFileSync, writeFileSync } from 'node:fs';

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.PGDATABASE !== 'asv_contract_test') {
  throw new Error('Stage 3 CI gate bypass requires the ephemeral Postgres test DB.');
}
const sql=readFileSync(new URL(
  '../../supabase/proposals/30_guarded_contractor_atomic_entries_REVIEW.sql',
  import.meta.url),'utf8');
const gate=/DO \$approval_gate\$\s*\nBEGIN\s*\n\s*RAISE EXCEPTION 'REVIEW ONLY:[^\n]*;\s*\nEND\s*\n\$approval_gate\$;/g;
if ((sql.match(gate)||[]).length!==1) throw new Error('Stage 3 approval gate changed or missing.');
const changed=sql.replace(gate,'-- Stage 3 gate removed for isolated CI database only.');
writeFileSync('/tmp/asv_stage3_ephemeral_ci.sql',changed);
console.log('Isolated Stage 3 SQL generated (not for production).');
