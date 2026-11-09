import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateFinancialSummary, getPartyAccount} from '../src/lib/contractor/accounting.js';

const sql=readFileSync(new URL('../supabase/releases/20261109_labour_payment_date_advance_split.sql',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/routes/admin/contractor/labour/+page.svelte',import.meta.url),'utf8');

test('historic installment split has confirmed advance, one real payment header, request idempotency',()=>{
 assert.match(sql,/BEGIN;[\s\S]*COMMIT;/);
 assert.match(sql,/CREATE FUNCTION public\.contractor_pay_worker_with_advance_v1/);
 assert.match(sql,/p_confirm_advance IS DISTINCT FROM true/);
 assert.match(sql,/public\.contractor_access_status\(\)/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/p_payment_date/);
 assert.match(sql,/v_advance_due:=p_amount-v_wage_due/);
 assert.match(sql,/v_wage_result:=public\.contractor_pay_worker_v1/);
 assert.match(sql,/UPDATE public\.contractor_worker_payments/);
 assert.match(sql,/v_wage_result->>'voucher_no'/);
 assert.match(sql,/contractor_private\.idempotency_log/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.contractor_pay_worker_with_advance_v1/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.contractor_pay_worker_with_advance_v1/);
});
test('Advance is an actual dated ledger debit and reduces future wage once, without postdating wages',()=>{
 assert.match(sql,/WHERE worker_id=p_worker_id AND date>p_payment_date/);
 assert.match(sql,/SET advance_paid=coalesce\(advance_paid,0\)\+v_alloc/);
 assert.match(sql,/'labour_advance',v_att.id/);
 assert.match(sql,/v_advance_left<>0/);
 assert.doesNotMatch(sql,/DELETE FROM public\.contractor_labour/);
 assert.doesNotMatch(sql,/UPDATE public\.contractor_labour[\s\S]*SET date=/);
});
test('Payment form displays date-scoped dues and requires explicit checkbox for prepayment',()=>{
 assert.match(page,/workerDueAsOfPaymentDate/);
 assert.match(page,/workerAdvanceNeeded/);
 assert.match(page,/workerPaymentAdvanceConfirmed/);
 assert.match(page,/bind:checked=\{workerPaymentAdvanceConfirmed\}/);
 assert.match(page,/contractor_pay_worker_with_advance_v1/);
 assert.match(page,/p_confirm_advance=true/);
 assert.match(page,/Payment Split/);
 assert.match(page,/₹\{workerAdvanceNeeded\.toLocaleString\('en-IN'\)\}/);
 assert.match(page,/workerPaymentAdvanceConfirmed=false/);
});
test('Finance reconciles first transfer 7700 and split historical 11000 into one set of cash outflows',()=>{
 const rows=[
  {id:3,worker_id:'LBR-008',worker_name:'Dilip Pache',date:'2026-10-04',days:7,daily_rate:1100,advance_paid:0},
  {id:37,worker_id:'LBR-008',worker_name:'Dilip Pache',date:'2026-10-17',days:9.5,daily_rate:1100,advance_paid:0},
  {id:112,worker_id:'LBR-008',worker_name:'Dilip Pache',date:'2026-11-03',days:1.5,daily_rate:1100,advance_paid:550},
  {id:119,worker_id:'LBR-008',worker_name:'Dilip Pache',date:'2026-11-04',days:1.5,daily_rate:1100,advance_paid:0}
 ];
 // 7*1100 + 9.5*1100 + 1.5*1100 +1.5*1100 = 21450.
 const transactions=[
  {id:1,date:'2026-10-12',labour_id:3,amount:7700,entry_type:'labour_payment',category:'Labour & Mestri',source:'UPI',recipient:'Dilip Pache'},
  {id:2,date:'2026-10-26',labour_id:37,amount:10450,entry_type:'labour_payment',category:'Labour & Mestri',source:'UPI',recipient:'Dilip Pache'},
  {id:3,date:'2026-10-26',labour_id:112,amount:550,entry_type:'labour_advance',category:'Labour & Mestri',source:'UPI',recipient:'Dilip Pache'}
 ];
 const data={labour:rows,transactions,profiles:[{worker_id:'LBR-008',name:'Dilip Pache'}]};
 const x=calculateFinancialSummary(data);
 assert.equal(x.labourPayablesDue,2750);
 assert.equal(x.bankBalance,-18700);
 const passbook=getPartyAccount('worker:LBR-008',data);
 assert.equal(passbook.totalBilled,21450);
 assert.equal(passbook.totalPaid,18700);
 assert.equal(passbook.totalDue,2750);
});
