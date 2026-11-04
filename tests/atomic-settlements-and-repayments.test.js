import test from 'node:test';
import assert from 'node:assert/strict';
import {
  preparePaymentCommand,
  applyPaymentToSnapshot,
  moneyToPaise
} from '../src/lib/contractor/financial-write-gate.js';
import { calculateFinancialSummary } from '../src/lib/contractor/accounting.js';

test('supplier credit settlement command preparation validates bounds and funding accounts', () => {
  const validDraft = {
    operation: 'supplier_payment',
    entityId: 'obligation-101',
    expectedVersion: 1,
    amount: '4500.50',
    outstanding: '10000.00',
    fundingAccount: 'Bank',
    idempotencyKey: 'idemp_supp_pay_0001',
    date: '2026-11-04'
  };

  const command = preparePaymentCommand(validDraft);
  assert.equal(command.operation, 'supplier_payment');
  assert.equal(command.entityId, 'obligation-101');
  assert.equal(command.amountPaise, 450050);
  assert.equal(command.fundingAccount, 'Bank');

  // Test overpayment rejection
  assert.throws(
    () => preparePaymentCommand({ ...validDraft, amount: '10001.00' }),
    /Payment exceeds the outstanding amount/
  );

  // Test zero / negative amount rejection
  assert.throws(
    () => preparePaymentCommand({ ...validDraft, amount: '0.00' }),
    /Payment must be greater than zero/
  );
  assert.throws(
    () => preparePaymentCommand({ ...validDraft, amount: '-500.00' }),
    /Payment must be greater than zero/
  );

  // Test invalid funding account rejection
  assert.throws(
    () => preparePaymentCommand({ ...validDraft, fundingAccount: 'Credit' }),
    /Select Cash, Bank or UPI as the funding account/
  );

  // Test invalid date rejection
  assert.throws(
    () => preparePaymentCommand({ ...validDraft, date: '2026-02-30' }),
    /A valid payment date is required/
  );
});

test('supplier credit settlement atomically updates balance and prevents duplicate submission', () => {
  const initialSnapshot = {
    entityId: 'obligation-101',
    version: 1,
    outstandingPaise: 1000000, // ₹10,000
    repaidPaise: 0,
    processed: {}
  };

  const command = preparePaymentCommand({
    operation: 'supplier_payment',
    entityId: 'obligation-101',
    expectedVersion: 1,
    amount: '4000.00',
    outstanding: '10000.00',
    fundingAccount: 'UPI',
    idempotencyKey: 'idemp_supp_partial_001',
    date: '2026-11-04'
  });

  const updated = applyPaymentToSnapshot(initialSnapshot, command);
  assert.equal(updated.version, 2);
  assert.equal(updated.outstandingPaise, 600000); // Remaining ₹6,000
  assert.equal(updated.repaidPaise, 400000); // Paid ₹4,000

  // Idempotent re-submission returns the same state without re-applying
  const replayed = applyPaymentToSnapshot(updated, command);
  assert.equal(replayed.version, 2);
  assert.equal(replayed.outstandingPaise, 600000);
  assert.equal(replayed.repaidPaise, 400000);

  // Different payment reusing the same idempotency key is rejected
  assert.throws(
    () =>
      applyPaymentToSnapshot(updated, {
        ...command,
        amountPaise: 200000
      }),
    /Idempotency key was reused for a different payment/
  );
});

test('loan repayment correctly separates principal from interest in financial summary', () => {
  // Scenario:
  // Initial Loan: ₹1,00,000 received in Bank
  // Repayment: ₹20,000 principal repaid + ₹1,500 interest paid via Bank
  const summary = calculateFinancialSummary({
    loans: [
      { id: 10, principal: 100000, repaid_amount: 20000 }
    ],
    transactions: [
      // 1. Initial Loan proceeds
      {
        id: 1,
        category: 'Money In',
        description: 'Borrowed / Loan: Shri Krishna Finance',
        amount: 100000,
        source: 'Bank'
      },
      // 2. Client Running Bill
      {
        id: 2,
        category: 'Money In',
        description: 'Running Bill Received: Mutharam Site',
        amount: 50000,
        source: 'Bank'
      },
      // 3. Principal Repayment
      {
        id: 3,
        entry_type: 'loan_principal_repaid',
        loan_id: 10,
        amount: 20000,
        source: 'Bank',
        category: 'Loan Repayment'
      },
      // 4. Interest Payment
      {
        id: 4,
        entry_type: 'loan_interest',
        loan_id: 10,
        amount: 1500,
        source: 'Bank',
        category: 'Loan Interest'
      }
    ]
  });

  // Operating Revenue: Only Running Bill (₹50,000), NOT loan proceeds
  assert.equal(summary.totalInflow, 50000);
  assert.equal(summary.loanProceeds, 100000);
  assert.equal(summary.totalReceipts, 150000);

  // Operating Expenses: Only Interest (₹1,500), NOT principal repayment
  assert.equal(summary.totalPaidExpenses, 1500);
  assert.equal(summary.interestPaid, 1500);
  assert.equal(summary.loanPrincipalRepaid, 20000);

  // Outstanding Loan Liability: ₹1,00,000 - ₹20,000 = ₹80,000
  assert.equal(summary.loanOutstanding, 80000);

  // Bank Balance: +1,00,000 (loan) + 50,000 (bill) - 20,000 (principal) - 1,500 (interest) = ₹1,28,500
  assert.equal(summary.bankBalance, 128500);
  assert.equal(summary.balancesReliable, true);
});

test('loan repayment command preparation rejects overpayment and invalid amounts', () => {
  const loanDraft = {
    operation: 'loan_principal_repaid',
    entityId: 'loan-55',
    expectedVersion: 0,
    amount: '50000.00',
    outstanding: '50000.00',
    fundingAccount: 'Cash',
    idempotencyKey: 'idemp_loan_repay_0055',
    date: '2026-11-04'
  };

  const command = preparePaymentCommand(loanDraft);
  assert.equal(command.amountPaise, 5000000);
  assert.equal(command.fundingAccount, 'Cash');

  // Overpayment: trying to repay 50,001 on a 50,000 balance
  assert.throws(
    () => preparePaymentCommand({ ...loanDraft, amount: '50000.01' }),
    /Payment exceeds the outstanding amount/
  );
});

test('concurrent payment attempt on stale version is safely rejected', () => {
  const snapshotV2 = {
    entityId: 'obligation-202',
    version: 2,
    outstandingPaise: 500000,
    repaidPaise: 500000,
    processed: { 'key-1': 'fingerprint-1' }
  };

  // Caller A has an outdated version 1
  const staleCommand = preparePaymentCommand({
    operation: 'supplier_payment',
    entityId: 'obligation-202',
    expectedVersion: 1, // Stale!
    amount: '2000.00',
    outstanding: '5000.00',
    fundingAccount: 'Bank',
    idempotencyKey: 'idemp_concurrent_002',
    date: '2026-11-04'
  });

  assert.throws(
    () => applyPaymentToSnapshot(snapshotV2, staleCommand),
    /Version conflict: reload the outstanding amount/
  );
});
