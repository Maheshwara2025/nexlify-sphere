import test from 'node:test';
import assert from 'node:assert/strict';
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

test('the staged client refuses network calls until both approvals are present', async () => {
  assert.equal(STAGE2_ATOMIC_PAYMENTS_ENABLED, false);
  let calls = 0;
  const mock = { rpc: async () => { calls++; return { data: { success: true }, error: null }; } };
  await assert.rejects(
    submitStage2AtomicPayment(mock, prepareSupplierSettlementRpc(supplier)),
    error => error?.code === 'FINANCIAL_WRITES_DISABLED'
  );
  await assert.rejects(
    submitStage2AtomicPayment(mock, prepareLoanRepaymentRpc(loan)),
    error => error?.code === 'FINANCIAL_WRITES_DISABLED'
  );
  assert.equal(calls, 0);
});
