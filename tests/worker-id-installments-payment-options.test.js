import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateFinancialSummary,getPartyAccount,getPartyOptions} from '../src/lib/contractor/accounting.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const labour=[{
 id:501,worker_id:'LBR-008',worker_name:'Dilip Pache',
 date:'2026-11-01',days:1,daily_rate:1100,advance_paid:0
},{
 id:502,worker_id:'LBR-008',worker_name:'Dilip Pache',
 date:'2026-11-02',days:1,daily_rate:1100,advance_paid:0
}];
const transactions=[{
 id:601,labour_id:501,date:'2026-11-03',category:'Labour & Mestri',
 entry_type:'labour_payment',recipient:'Dilip Pache',amount:800,source:'UPI'
},{
 id:602,labour_id:502,date:'2026-11-06',category:'Labour & Mestri',
 entry_type:'labour_payment',recipient:'Dilip Pache',amount:1000,source:'Bank'
}];
const data={transactions,labour,profiles:[{worker_id:'LBR-008',name:'Dilip Pache'}]};

test('Worker ID Party360 groups multiple Bank/UPI payments to one worker, not an ambiguous legacy party',()=>{
 const options=getPartyOptions(data);
 assert.ok(options.some(p=>p.key==='worker:LBR-008'));
 const account=getPartyAccount('worker:LBR-008',data);
 assert.equal(account.totalBilled,2200);
 assert.equal(account.totalPaid,1800);
 assert.equal(account.totalDue,400);
 assert.equal(account.transactions.length,2);
 assert.equal(account.labour.length,2);
 assert.equal(account.warnings.filter(w=>w.code==='LEGACY_PARTY_UNALLOCATED').length,0);
});

test('Labour payment ledger reduces bank liquidity once and liability, without doubling salary',()=>{
 const result=calculateFinancialSummary(data);
 assert.equal(result.labourPayablesDue,400);
 assert.equal(result.bankBalance,-1800);
 assert.equal(result.totalPaidExpenses,1800);
});

test('New Worker ID installment RPC is atomic, protected, allocates only completed attendance and uses one header',()=>{
 const sql=read('supabase/releases/20261109_worker_id_multiple_instalment_upi_payments.sql');
 assert.match(sql,/BEGIN;[\s\S]*COMMIT;/);
 assert.match(sql,/CREATE TABLE public\.contractor_worker_payments/);
 assert.match(sql,/CREATE FUNCTION public\.contractor_pay_worker_v1/);
 assert.match(sql,/public\.contractor_access_status\(\)/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/AND date<=p_payment_date/);
 assert.match(sql,/p_payment_reference/);
 assert.match(sql,/contractor_private\.idempotency_log/);
 assert.match(sql,/PAYMENT_EXCEEDS_DUE/);
 assert.match(sql,/worker_payment_upi_reference_unique/);
 assert.match(sql,/CREATE POLICY worker_payment_owner_select/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.contractor_pay_worker_v1/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.contractor_pay_worker_v1/);
});

test('Payment UI supports UPI, multiple worker installments, date, UTR and live due',()=>{
 const labourPage=read('src/routes/admin/contractor/labour/+page.svelte');
 const party=read('src/routes/admin/contractor/party/+page.svelte');
 const loader=read('src/lib/contractor/data.js');
 assert.match(labourPage,/contractor_pay_worker_v1/);
 assert.match(labourPage,/Labour ID-wise Payment/);
 assert.match(labourPage,/paymentDue\(l\)/);
 assert.match(labourPage,/Payment Installments/);
 assert.match(labourPage,/UPI Transaction ID/);
 assert.match(labourPage,/max=\{projectToday\(\)\}/);
 assert.match(party,/Labour ID-wise Payment History/);
 assert.match(party,/workerPaymentBatches/);
 assert.match(loader,/contractor_worker_payments/);
});

test('Supplier, merchant, materials, piecework, loans, expenses and receipts contain real payment flows',()=>{
 const supplier=read('src/routes/admin/contractor/materials/suppliers/+page.svelte');
 const materials=read('src/routes/admin/contractor/materials/+page.svelte');
 const piecework=read('src/routes/admin/contractor/piecework/+page.svelte');
 const loans=read('src/routes/admin/contractor/loans/+page.svelte');
 const dashboard=read('src/routes/admin/contractor/+page.svelte');
 assert.match(supplier,/submitStage2AtomicPayment/);
 assert.match(supplier,/payReference/);
 assert.match(supplier,/Payment Date/);
 assert.match(materials,/value="UPI"/);
 assert.match(piecework,/payDate/);
 assert.match(piecework,/remainingPiecework/);
 assert.match(loans,/prepareSupplierSettlementRpc/);
 assert.match(loans,/prepareLoanRepaymentRpc/);
 assert.match(loans,/paymentTarget.balance/);
 assert.match(dashboard,/UPI \(PhonePe\/GPay\)/);
 assert.match(dashboard,/Supplier Bill, Labour Attendance/);
});
