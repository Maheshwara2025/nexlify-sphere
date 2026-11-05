import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STAGE2_ATOMIC_PAYMENTS_ENABLED,
  prepareSupplierSettlementRpc,
  prepareLoanRepaymentRpc,
  submitStage2AtomicPayment
} from '../src/lib/contractor/atomic-payment-client.js';

const supplier = {
  obligationId: 101,
  materialId: 201,
  amount: '1250.50',
  fundingSource: 'UPI',
  paymentDate: '2026-11-05',
  idempotencyKey: 'supplier_payment_2026_0001',
  notes: 'Partial payment'
};
const loan = {
  loanId: 8,
  principalAmount: '1000.00',
  interestAmount: '75.50',
  fundingSource: 'Bank',
  repaymentDate: '2026-11-05',
  idempotencyKey: 'loan_payment_2026_0001',
  notes: 'Repayment'
};

test('supplier settlement command maps exact reviewed RPC argument names', () => {
  assert.deepEqual(prepareSupplierSettlementRpc(supplier), {
    rpc: 'settle_supplier_credit_bill',
    params: {
      p_obligation_id: 101,
      p_material_id: 201,
      p_payment_amount: '1250.50',
      p_funding_source: 'UPI',
      p_payment_date: '2026-11-05',
      p_idempotency_key: 'supplier_payment_2026_0001',
      p_notes: 'Partial payment'
    }
  });
});

test('loan repayment command keeps principal, interest and account separate', () => {
  assert.deepEqual(prepareLoanRepaymentRpc(loan), {
    rpc: 'record_loan_repayment',
    params: {
      p_loan_id: 8,
      p_principal_amount: '1000.00',
      p_interest_amount: '75.50',
      p_funding_source: 'Bank',
      p_repayment_date: '2026-11-05',
      p_idempotency_key: 'loan_payment_2026_0001',
      p_notes: 'Repayment'
    }
  });
});

test('invalid supplier settlement amounts, IDs, dates and funding are rejected', () => {
  for (const patch of [
    { obligationId: -1 },
    { materialId: 'abc' },
    { amount: 0 },
    { amount: '1.001' },
    { paymentDate: '2026-02-30' },
    { fundingSource: 'Credit' },
    { idempotencyKey: 'short' }
  ]) {
    assert.throws(() => prepareSupplierSettlementRpc({ ...supplier, ...patch }));
  }
});

test('invalid loan repayments are rejected, while a pure interest payment is permitted', () => {
  assert.equal(
    prepareLoanRepaymentRpc({ ...loan, principalAmount: 0 }).params.p_principal_amount,
    '0.00'
  );
  for (const patch of [
    { loanId: 0 },
    { principalAmount: -1 },
    { interestAmount: '0.001' },
    { principalAmount: 0, interestAmount: 0 },
    { fundingSource: 'Credit' },
    { repaymentDate: '2026-02-30' },
    { idempotencyKey: 'short' }
  ]) {
    assert.throws(() => prepareLoanRepaymentRpc({ ...loan, ...patch }));
  }
});

test('Stage 2 payment adapters call only reviewed RPCs and propagate database errors', async () => {
  assert.equal(STAGE2_ATOMIC_PAYMENTS_ENABLED, true);
  const calls = [];
  const mock = { rpc: async (name, params) => {
    calls.push({name, params});
    return { data: { success: true, operation: name }, error: null };
  } };
  const supplierResult = await submitStage2AtomicPayment(mock, prepareSupplierSettlementRpc(supplier));
  const loanResult = await submitStage2AtomicPayment(mock, prepareLoanRepaymentRpc(loan));
  assert.equal(supplierResult.success, true);
  assert.equal(loanResult.success, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(call => call.name), [
    'settle_supplier_credit_bill', 'record_loan_repayment'
  ]);
  await assert.rejects(
    submitStage2AtomicPayment(mock, { rpc: 'unsafe_financial_write', params: {} }),
    /Unsupported atomic payment/
  );
  assert.equal(calls.length, 2);
  await assert.rejects(
    submitStage2AtomicPayment({rpc: async () => ({error: new Error('DB rejected'),data:null})},
      prepareLoanRepaymentRpc(loan)),
    /DB rejected/
  );
  await assert.rejects(
    submitStage2AtomicPayment({rpc: async () => ({error:null,data:{success:false}})},
      prepareSupplierSettlementRpc(supplier)),
    /did not return verified success/
  );
});


test('loan and supplier UI uses staged atomic request adapters without legacy one-click writes', () => {
  const source = readFileSync(
    new URL('../src/routes/admin/contractor/loans/+page.svelte', import.meta.url),
    'utf8'
  );
  assert.match(source, /openSupplierSettlement\(b\)/);
  assert.match(source, /openLoanRepayment\(l\)/);
  assert.match(source, /prepareSupplierSettlementRpc\(/);
  assert.match(source, /prepareLoanRepaymentRpc\(/);
  assert.match(source, /submitStage2AtomicPayment\(supabase, command\)/);
  assert.match(source, /disabled=\{!STAGE2_ATOMIC_PAYMENTS_ENABLED \|\| paymentBusy\}/);
  assert.doesNotMatch(source, /runFinancialMutation\('loan-repayment'/);
  assert.doesNotMatch(source, /runFinancialMutation\('supplier-payment'/);
});


test('Stage 2 is separately gated; enabling it will not enable legacy expense and labour writes', () => {
  const adapter = readFileSync(
    new URL('../src/lib/contractor/atomic-payment-client.js', import.meta.url),
    'utf8'
  );
  const oldGate = readFileSync(
    new URL('../src/lib/contractor/financial-write-gate.js', import.meta.url),
    'utf8'
  );
  assert.match(adapter, /export const STAGE2_ATOMIC_PAYMENTS_ENABLED = true/);
  assert.match(adapter, /if \(!STAGE2_ATOMIC_PAYMENTS_ENABLED\)/);
  assert.doesNotMatch(adapter, /if \(!FINANCIAL_WRITES_ENABLED/);
  assert.match(oldGate, /export const FINANCIAL_WRITES_ENABLED = false/);
  assert.match(oldGate, /throw error;/);
});
