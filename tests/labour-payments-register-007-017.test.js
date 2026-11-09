import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LABOUR_REPORT_IDS,labourPaymentRegister,labourPaymentCsv,labourBalanceCsv} from '../src/lib/contractor/labour-payments-report.js';

const data={
 profiles:[
  {worker_id:'LBR-007',name:'Rajendar Pache'},
  {worker_id:'LBR-008',name:'Dilip Pache'},
  {worker_id:'LBR-018',name:'Excluded Worker'}
 ],
 attendance:[
  {id:11,worker_id:'LBR-007',days:1,daily_rate:1100,advance_paid:500,worker_name:'Rajendar Pache',date:'2026-10-04'},
  {id:12,worker_id:'LBR-008',days:1,daily_rate:1100,advance_paid:0,worker_name:'Dilip Pache',date:'2026-10-05'},
  {id:13,worker_id:'LBR-008',days:1,daily_rate:1100,advance_paid:0,worker_name:'Dilip Pache',date:'2026-10-06'},
  {id:14,worker_id:'LBR-018',days:1,daily_rate:999,advance_paid:0,worker_name:'Excluded Worker',date:'2026-10-05'}
 ],
 transactions:[
  {id:99,labour_id:11,date:'2026-10-04',amount:500,entry_type:'labour_advance',source:'Cash',invoice_no:'ASV-ADV-99'},
  {id:100,labour_id:11,date:'2026-10-12',amount:600,entry_type:'labour_payment',source:'UPI',invoice_no:'ASV-WPAY-ONE-001'},
  {id:101,labour_id:12,date:'2026-10-12',amount:1100,entry_type:'labour_payment',source:'UPI',invoice_no:'ASV-WPAY-TWO-001'},
  {id:102,labour_id:13,date:'2026-10-12',amount:600,entry_type:'labour_payment',source:'UPI',invoice_no:'ASV-WPAY-TWO-002'},
  {id:103,labour_id:13,date:'2026-10-24',amount:500,entry_type:'labour_payment',source:'Bank',invoice_no:'ASV-DAILY-103'},
  {id:104,labour_id:14,date:'2026-10-12',amount:999,entry_type:'labour_payment',source:'Cash',invoice_no:'ASV-OUTSIDE-104'}
 ],
 workerPayments:[
  {id:10,worker_id:'LBR-007',payment_date:'2026-10-12',amount:600,funding_source:'UPI',voucher_no:'ASV-WPAY-ONE',allocations_count:1,payment_reference:'UTR-ONE'},
  {id:20,worker_id:'LBR-008',payment_date:'2026-10-12',amount:1700,funding_source:'UPI',voucher_no:'ASV-WPAY-TWO',allocations_count:2,payment_reference:'UTR-TWO'},
  {id:30,worker_id:'LBR-018',payment_date:'2026-10-12',amount:999,funding_source:'Cash',voucher_no:'ASV-WPAY-OUT',allocations_count:1}
 ]
};

test('LBR-007 through LBR-017 exactly 11 immutable worker IDs, never LBR-018',()=>{
 assert.deepEqual(LABOUR_REPORT_IDS,Array.from({length:11},(_,i)=>'LBR-'+String(i+7).padStart(3,'0')));
 const result=labourPaymentRegister(data);
 assert.equal(result.rows.length,11);
 assert.equal(result.rows.find(r=>r.workerId==='LBR-018'),undefined);
 assert.equal(result.history.some(r=>r.workerId==='LBR-018'),false);
});
test('Earned wages, advance and linked wage payment are separately accounted for',()=>{
 const r=labourPaymentRegister(data);
 assert.equal(r.totals.earned,3300);
 assert.equal(r.totals.advance,500);
 assert.equal(r.totals.wagePayments,2800);
 assert.equal(r.totals.paid,3300);
 assert.equal(r.totals.due,0);
 assert.equal(r.rows.find(w=>w.workerId==='LBR-007').due,0);
});
test('One actual UPI transfer becomes one history row despite multiple attendance allocations',()=>{
 const r=labourPaymentRegister(data);
 assert.equal(r.history.length,4);
 assert.equal(r.history.filter(x=>x.voucher==='ASV-WPAY-TWO').length,1);
 assert.equal(r.history.find(x=>x.voucher==='ASV-WPAY-TWO').amount,1700);
 assert.equal(r.history.find(x=>x.kind==='Daily Payment').amount,500);
 assert.equal(r.history.find(x=>x.kind==='Advance').amount,500);
 assert.equal(r.historyAmount,3300);
});
test('CSV exposes names, worker IDs, UPI references and safe numeric amount',()=>{
 const r=labourPaymentRegister(data);
 const csv=labourPaymentCsv(r.history);
 const balances=labourBalanceCsv(r.rows);
 assert.match(csv,/LBR-008/);
 assert.match(csv,/UTR-TWO/);
 assert.match(csv,/1700\.00/);
 assert.match(balances,/2200\\.00/);
 const malicious=labourPaymentCsv([{workerId:'LBR-007',name:'=1+2',date:'2026-10-12',amount:1,notes:'@bad'}]);
 assert.ok(malicious.includes("'=1+2"));
 assert.ok(malicious.includes("'@bad"));
});
test('Route is read-only and links from Labour DBMS and nav',()=>{
 const page=readFileSync(new URL('../src/routes/admin/contractor/labour/payments/+page.svelte',import.meta.url),'utf8');
 const labour=readFileSync(new URL('../src/routes/admin/contractor/labour/+page.svelte',import.meta.url),'utf8');
 const nav=readFileSync(new URL('../src/routes/admin/contractor/+layout.svelte',import.meta.url),'utf8');
 assert.match(page,/readAllRows\(supabase,'contractor_worker_payments'/);
 assert.match(page,/labourPaymentRegister/);
 assert.match(page,/labourPaymentCsv/);
 assert.match(page,/labourBalanceCsv/);
 assert.match(page,/Payments History/);
 assert.match(page,/UPI/);
 assert.match(page,/Labour ID-wise Accounts/);
 assert.doesNotMatch(page,/supabase\.rpc\(/);
 assert.doesNotMatch(page,/\.insert\(|\.delete\(|\.update\(/);
 assert.match(labour,/href="\/admin\/contractor\/labour\/payments"/);
 assert.match(nav,/Labour Payments 007–017/);
});
