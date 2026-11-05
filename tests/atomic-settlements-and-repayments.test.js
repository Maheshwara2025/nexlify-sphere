import test from 'node:test';
import assert from 'node:assert/strict';
import {
  preparePaymentCommand,
  applyPaymentToSnapshot,
  generateCollisionResistantVoucher,
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

// -----------------------------------------------------------------------------
// Transactional Backend Simulation Harness (Proposal 21 Specification)
// -----------------------------------------------------------------------------
function createMockContractorBackend(initialState) {
  const state = JSON.parse(JSON.stringify(initialState));
  const idempotencyLog = new Map();
  const advisoryLocks = new Set();

  function acquireAdvisoryLock(key) {
    if (advisoryLocks.has(key)) {
      throw new Error(`LockConflict: concurrent lock on ${key}`);
    }
    advisoryLocks.add(key);
    return () => advisoryLocks.delete(key);
  }

  function settleSupplierCreditBill({
    isAdmin,
    obligationId,
    paymentAmount,
    fundingSource,
    paymentDate,
    idempotencyKey,
    materialId = null,
    notes = '',
    simulateAffectedRowCountFailure = false
  }) {
    if (isAdmin !== true) {
      throw new Error('Unauthorized: only verified administrators can settle supplier bills.');
    }

    if (!idempotencyKey || !/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
      throw new Error('Invalid idempotency key: must be a 16-128 character alphanumeric string.');
    }
    if (!obligationId || obligationId <= 0) {
      throw new Error('A valid immutable obligation ID is required.');
    }
    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be positive and greater than zero.');
    }
    if (Math.round(paymentAmount * 100) / 100 !== paymentAmount) {
      throw new Error('Payment amount cannot have more than two decimal places.');
    }
    if (!['Cash', 'Bank', 'UPI'].includes(fundingSource)) {
      throw new Error('Invalid funding source: must be Cash, Bank, or UPI.');
    }
    if (!paymentDate) {
      throw new Error('Payment date is required.');
    }

    const releaseLock = acquireAdvisoryLock(`idemp:${idempotencyKey}`);

    try {
      if (idempotencyLog.has(idempotencyKey)) {
        const entry = idempotencyLog.get(idempotencyKey);
        if (
          entry.operation !== 'supplier_settlement' ||
          entry.entity_id !== String(obligationId) ||
          entry.request_payload.amount !== paymentAmount ||
          entry.request_payload.funding !== fundingSource ||
          entry.request_payload.date !== paymentDate ||
          (entry.request_payload.material_id ?? null) !== (materialId ?? null)
        ) {
          throw new Error(`Idempotency conflict: key "${idempotencyKey}" has already been used for a different request payload.`);
        }
        return entry.response_payload;
      }

      const bill = state.transactions.find((t) => t.id === obligationId);
      if (!bill) {
        throw new Error(`Credit bill transaction ${obligationId} not found.`);
      }
      if (bill.source !== 'Credit') {
        throw new Error(`Transaction ${obligationId} is not a credit obligation.`);
      }
      if ((bill.balance ?? 0) <= 0 || bill.status === 'Paid') {
        throw new Error(`Credit bill ${obligationId} is already fully paid.`);
      }
      if (paymentAmount > bill.balance) {
        throw new Error(`Payment amount (₹${paymentAmount}) exceeds outstanding bill balance (₹${bill.balance}).`);
      }

      const snapshotBefore = JSON.stringify(state);

      try {
        let mat = null;
        if (materialId !== null && materialId !== undefined) {
          mat = state.materials.find((m) => m.id === materialId);
          if (!mat) {
            throw new Error(`Linked material record ${materialId} not found.`);
          }
          if (bill.material_id !== materialId && mat.obligation_tx_id !== obligationId) {
            throw new Error(`Unlinked material: credit bill ${obligationId} has no verified immutable link to material ${materialId}. A reviewed mapping migration is required.`);
          }

          const matBalance = mat.balance_amount ?? (mat.total_amount - (mat.paid_amount ?? 0));
          if (paymentAmount > matBalance) {
            throw new Error(`Payment amount (₹${paymentAmount}) exceeds material ${materialId} outstanding balance (₹${matBalance}).`);
          }

          mat.paid_amount = (mat.paid_amount ?? 0) + paymentAmount;
          mat.balance_amount = Math.max(0, mat.total_amount - mat.paid_amount);

          if (simulateAffectedRowCountFailure) {
            throw new Error('Material update failed: expected 1 row affected, got 0.');
          }
        }

        bill.balance = bill.balance - paymentAmount;
        bill.status = bill.balance === 0 ? 'Paid' : 'Due';

        const voucherNo = generateCollisionResistantVoucher('ASV-PMT', obligationId, idempotencyKey);
        const paymentTxId = (state.transactions.length > 0 ? Math.max(...state.transactions.map((t) => t.id)) : 0) + 1;

        const paymentTx = {
          id: paymentTxId,
          invoice_no: voucherNo,
          date: paymentDate,
          category: bill.category,
          entry_type: 'supplier_payment',
          obligation_id: obligationId,
          material_id: materialId ?? bill.material_id ?? null,
          description: notes || `సప్లయర్ బిల్లు చెల్లింపు: ${bill.recipient}`,
          amount: paymentAmount,
          source: fundingSource,
          recipient: bill.recipient,
          advance_paid: 0,
          balance: 0,
          status: 'Paid'
        };
        state.transactions.push(paymentTx);

        const responsePayload = {
          success: true,
          operation: 'supplier_settlement',
          obligation_id: obligationId,
          payment_tx_id: paymentTxId,
          voucher_no: voucherNo,
          amount_paid: paymentAmount,
          remaining_balance: bill.balance,
          status: bill.status,
          funding_source: fundingSource,
          payment_date: paymentDate,
          material_id: materialId ?? bill.material_id ?? null
        };

        idempotencyLog.set(idempotencyKey, {
          operation: 'supplier_settlement',
          entity_id: String(obligationId),
          request_payload: {
            amount: paymentAmount,
            funding: fundingSource,
            date: paymentDate,
            material_id: materialId
          },
          response_payload: responsePayload
        });

        return responsePayload;
      } catch (subErr) {
        const restored = JSON.parse(snapshotBefore);
        state.transactions = restored.transactions;
        state.materials = restored.materials;
        state.loans = restored.loans;
        throw subErr;
      }
    } finally {
      releaseLock();
    }
  }

  function recordLoanRepayment({
    isAdmin,
    loanId,
    principalAmount = 0,
    interestAmount = 0,
    fundingSource,
    repaymentDate,
    idempotencyKey,
    notes = '',
    simulateAffectedRowCountFailure = false
  }) {
    if (isAdmin !== true) {
      throw new Error('Unauthorized: only verified administrators can record loan repayments.');
    }

    if (!idempotencyKey || !/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
      throw new Error('Invalid idempotency key: must be a 16-128 character alphanumeric string.');
    }
    if (!loanId || loanId <= 0) {
      throw new Error('A valid immutable loan ID is required.');
    }
    if (principalAmount < 0 || interestAmount < 0) {
      throw new Error('Repayment amounts cannot be negative.');
    }
    if (principalAmount + interestAmount <= 0) {
      throw new Error('Total repayment (principal + interest) must be greater than zero.');
    }
    if (
      Math.round(principalAmount * 100) / 100 !== principalAmount ||
      Math.round(interestAmount * 100) / 100 !== interestAmount
    ) {
      throw new Error('Repayment amounts cannot have more than two decimal places.');
    }
    if (!['Cash', 'Bank', 'UPI'].includes(fundingSource)) {
      throw new Error('Invalid funding source: must be Cash, Bank, or UPI.');
    }
    if (!repaymentDate) {
      throw new Error('Repayment date is required.');
    }

    const releaseLock = acquireAdvisoryLock(`idemp:${idempotencyKey}`);

    try {
      if (idempotencyLog.has(idempotencyKey)) {
        const entry = idempotencyLog.get(idempotencyKey);
        if (
          entry.operation !== 'loan_repayment' ||
          entry.entity_id !== String(loanId) ||
          entry.request_payload.principal !== principalAmount ||
          entry.request_payload.interest !== interestAmount ||
          entry.request_payload.funding !== fundingSource ||
          entry.request_payload.date !== repaymentDate
        ) {
          throw new Error(`Idempotency conflict: key "${idempotencyKey}" has already been used for a different request payload.`);
        }
        return entry.response_payload;
      }

      const loan = state.loans.find((l) => l.id === loanId);
      if (!loan) {
        throw new Error(`Loan record ${loanId} not found.`);
      }

      const outstanding = loan.principal - (loan.repaid_amount ?? 0);
      if (principalAmount > outstanding) {
        throw new Error(`Principal repayment (₹${principalAmount}) exceeds outstanding loan principal (₹${outstanding}).`);
      }

      const snapshotBefore = JSON.stringify(state);

      try {
        loan.repaid_amount = (loan.repaid_amount ?? 0) + principalAmount;

        if (simulateAffectedRowCountFailure) {
          throw new Error('Loan update failed: expected 1 row affected, got 0.');
        }

        const principalVoucher = generateCollisionResistantVoucher('ASV-LNR', loanId, idempotencyKey);
        const interestVoucher = generateCollisionResistantVoucher('ASV-INT', loanId, idempotencyKey, new Date(), 'interest');

        let principalTxId = null;
        let interestTxId = null;

        if (principalAmount > 0) {
          principalTxId = (state.transactions.length > 0 ? Math.max(...state.transactions.map((t) => t.id)) : 0) + 1;
          state.transactions.push({
            id: principalTxId,
            invoice_no: principalVoucher,
            date: repaymentDate,
            category: 'Loan Repayment',
            entry_type: 'loan_principal_repaid',
            loan_id: loanId,
            description: notes || `అప్పు అసలు చెల్లింపు: ${loan.lender_name}`,
            amount: principalAmount,
            source: fundingSource,
            recipient: loan.lender_name,
            advance_paid: 0,
            balance: 0,
            status: 'Paid'
          });
        }

        if (interestAmount > 0) {
          interestTxId = (state.transactions.length > 0 ? Math.max(...state.transactions.map((t) => t.id)) : 0) + 1;
          state.transactions.push({
            id: interestTxId,
            invoice_no: interestVoucher,
            date: repaymentDate,
            category: 'Interest & Finance Charges',
            entry_type: 'loan_interest',
            loan_id: loanId,
            description: `అప్పు వడ్డీ చెల్లింపు: ${loan.lender_name}`,
            amount: interestAmount,
            source: fundingSource,
            recipient: loan.lender_name,
            advance_paid: 0,
            balance: 0,
            status: 'Paid'
          });
        }

        const responsePayload = {
          success: true,
          operation: 'loan_repayment',
          loan_id: loanId,
          principal_tx_id: principalTxId,
          interest_tx_id: interestTxId,
          principal_voucher_no: principalVoucher,
          interest_voucher_no: interestVoucher,
          principal_repaid: principalAmount,
          interest_paid: interestAmount,
          total_repaid: loan.repaid_amount,
          remaining_principal: loan.principal - loan.repaid_amount,
          funding_source: fundingSource,
          repayment_date: repaymentDate
        };

        idempotencyLog.set(idempotencyKey, {
          operation: 'loan_repayment',
          entity_id: String(loanId),
          request_payload: {
            principal: principalAmount,
            interest: interestAmount,
            funding: fundingSource,
            date: repaymentDate
          },
          response_payload: responsePayload
        });

        return responsePayload;
      } catch (subErr) {
        const restored = JSON.parse(snapshotBefore);
        state.transactions = restored.transactions;
        state.materials = restored.materials;
        state.loans = restored.loans;
        throw subErr;
      }
    } finally {
      releaseLock();
    }
  }

  return {
    state,
    settleSupplierCreditBill,
    recordLoanRepayment
  };
}

test('idempotency is strictly request-bound: rejects conflicting reuse across amount, funding, date, and materialId', () => {
  const backend = createMockContractorBackend({
    transactions: [
      { id: 101, source: 'Credit', balance: 10000, status: 'Due', category: 'Materials', recipient: 'Sri Lakshmi Traders', material_id: 201 }
    ],
    materials: [
      { id: 201, total_amount: 10000, paid_amount: 0, balance_amount: 10000 }
    ],
    loans: []
  });

  const baseParams = {
    isAdmin: true,
    obligationId: 101,
    paymentAmount: 4000,
    fundingSource: 'Bank',
    paymentDate: '2026-11-05',
    idempotencyKey: 'idemp_strict_0000000001',
    materialId: 201
  };

  // First execution succeeds
  const res1 = backend.settleSupplierCreditBill(baseParams);
  assert.equal(res1.success, true);
  assert.equal(res1.amount_paid, 4000);
  assert.equal(res1.remaining_balance, 6000);

  // Identical replay returns exact cached response
  const resReplay = backend.settleSupplierCreditBill(baseParams);
  assert.deepEqual(resReplay, res1);

  // Conflicting amount reuse is rejected
  assert.throws(
    () => backend.settleSupplierCreditBill({ ...baseParams, paymentAmount: 5000 }),
    /Idempotency conflict.*different request payload/
  );

  // Conflicting funding source reuse is rejected
  assert.throws(
    () => backend.settleSupplierCreditBill({ ...baseParams, fundingSource: 'Cash' }),
    /Idempotency conflict.*different request payload/
  );

  // Conflicting payment date reuse is rejected
  assert.throws(
    () => backend.settleSupplierCreditBill({ ...baseParams, paymentDate: '2026-11-06' }),
    /Idempotency conflict.*different request payload/
  );

  // Conflicting material ID reuse is rejected
  assert.throws(
    () => backend.settleSupplierCreditBill({ ...baseParams, materialId: null }),
    /Idempotency conflict.*different request payload/
  );
});

test('supplier settlement validates immutable material link and fails closed on unlinked/mismatched rows', () => {
  const backend = createMockContractorBackend({
    transactions: [
      // Valid link via material_id
      { id: 101, source: 'Credit', balance: 8000, status: 'Due', category: 'Materials', recipient: 'Trader A', material_id: 201 },
      // Unlinked legacy row (no material_id)
      { id: 102, source: 'Credit', balance: 5000, status: 'Due', category: 'Materials', recipient: 'Trader B', material_id: null }
    ],
    materials: [
      { id: 201, total_amount: 8000, paid_amount: 0, balance_amount: 8000 },
      // Material without link back to obligation
      { id: 202, total_amount: 5000, paid_amount: 0, balance_amount: 5000, obligation_tx_id: null }
    ],
    loans: []
  });

  // A. Matching linked material succeeds
  const ok = backend.settleSupplierCreditBill({
    isAdmin: true,
    obligationId: 101,
    paymentAmount: 3000,
    fundingSource: 'UPI',
    paymentDate: '2026-11-05',
    idempotencyKey: 'idemp_link_match_000001',
    materialId: 201
  });
  assert.equal(ok.success, true);
  assert.equal(backend.state.materials.find((m) => m.id === 201).paid_amount, 3000);
  assert.equal(backend.state.materials.find((m) => m.id === 201).balance_amount, 5000);

  // B. Unlinked legacy obligation with material ID fails closed
  assert.throws(
    () =>
      backend.settleSupplierCreditBill({
        isAdmin: true,
        obligationId: 102,
        paymentAmount: 2000,
        fundingSource: 'Cash',
        paymentDate: '2026-11-05',
        idempotencyKey: 'idemp_unlinked_00000001',
        materialId: 202
      }),
    /Unlinked material: credit bill 102 has no verified immutable link to material 202/
  );

  // C. Mismatched material ID fails closed
  assert.throws(
    () =>
      backend.settleSupplierCreditBill({
        isAdmin: true,
        obligationId: 101,
        paymentAmount: 1000,
        fundingSource: 'Bank',
        paymentDate: '2026-11-05',
        idempotencyKey: 'idemp_mismatch_0000001',
        materialId: 202
      }),
    /Unlinked material/
  );

  // D. Non-existent material ID fails closed
  assert.throws(
    () =>
      backend.settleSupplierCreditBill({
        isAdmin: true,
        obligationId: 101,
        paymentAmount: 1000,
        fundingSource: 'Bank',
        paymentDate: '2026-11-05',
        idempotencyKey: 'idemp_notfound_0000001',
        materialId: 9999
      }),
    /Linked material record 9999 not found/
  );
});

test('material and loan overpayment checks reject invalid amounts and check affected-row counts', () => {
  const backend = createMockContractorBackend({
    transactions: [
      { id: 101, source: 'Credit', balance: 5000, status: 'Due', category: 'Materials', recipient: 'Supplier C', material_id: 301 }
    ],
    materials: [
      { id: 301, total_amount: 5000, paid_amount: 2000, balance_amount: 3000 }
    ],
    loans: [
      { id: 50, lender_name: 'HDFC Bank', principal: 100000, repaid_amount: 80000 }
    ]
  });

  // Bill overpayment: trying to pay ₹5,001 on ₹5,000 balance
  assert.throws(
    () =>
      backend.settleSupplierCreditBill({
        isAdmin: true,
        obligationId: 101,
        paymentAmount: 5001,
        fundingSource: 'Bank',
        paymentDate: '2026-11-05',
        idempotencyKey: 'idemp_overpay_bill_0001'
      }),
    /exceeds outstanding bill balance/
  );

  // Material overpayment: material balance is only ₹3,000; paying ₹4,000 must fail
  assert.throws(
    () =>
      backend.settleSupplierCreditBill({
        isAdmin: true,
        obligationId: 101,
        paymentAmount: 4000,
        fundingSource: 'Bank',
        paymentDate: '2026-11-05',
        idempotencyKey: 'idemp_overpay_mat_00001',
        materialId: 301
      }),
    /exceeds material 301 outstanding balance/
  );

  // Loan principal overpayment: outstanding is ₹20,000; paying ₹20,001 must fail
  assert.throws(
    () =>
      backend.recordLoanRepayment({
        isAdmin: true,
        loanId: 50,
        principalAmount: 20001,
        interestAmount: 500,
        fundingSource: 'Bank',
        repaymentDate: '2026-11-05',
        idempotencyKey: 'idemp_overpay_loan_0001'
      }),
    /exceeds outstanding loan principal/
  );

  // Affected row count failure triggers rollback
  assert.throws(
    () =>
      backend.settleSupplierCreditBill({
        isAdmin: true,
        obligationId: 101,
        paymentAmount: 1000,
        fundingSource: 'Bank',
        paymentDate: '2026-11-05',
        idempotencyKey: 'idemp_rowcount_fail_001',
        materialId: 301,
        simulateAffectedRowCountFailure: true
      }),
    /Material update failed: expected 1 row affected/
  );
  // State was cleanly rolled back
  assert.equal(backend.state.transactions.find((t) => t.id === 101).balance, 5000);
  assert.equal(backend.state.materials.find((m) => m.id === 301).paid_amount, 2000);
});

test('collision-resistant voucher reference conforms to database format and avoids second-level collisions', () => {
  const v1 = generateCollisionResistantVoucher('ASV-PMT', 101, 'idemp_voucher_test_01');
  const v2 = generateCollisionResistantVoucher('ASV-PMT', 101, 'idemp_voucher_test_02');
  const vLoan = generateCollisionResistantVoucher('ASV-LNR', 50, 'idemp_voucher_loan_01');
  const vInt = generateCollisionResistantVoucher('ASV-INT', 50, 'idemp_voucher_loan_01', new Date(), 'interest');

  // Format check: PREFIX-YYYYMMDD-ID-HASH8
  const voucherRegex = /^ASV-(?:PMT|LNR|INT)-\d{8}-\d{4}-[a-f0-9]{8}$/;
  assert.match(v1, voucherRegex);
  assert.match(v2, voucherRegex);
  assert.match(vLoan, voucherRegex);
  assert.match(vInt, voucherRegex);

  // Distinct idempotency keys produce distinct vouchers
  assert.notEqual(v1, v2);
  // Principal and interest for same loan produce distinct vouchers
  assert.notEqual(vLoan, vInt);
});

test('supplier settlement and loan repayments reconcile perfectly with financial summary and prevent double counting', () => {
  const backend = createMockContractorBackend({
    transactions: [
      // 1. Initial owner capital received into Bank
      {
        id: 1,
        category: 'Money In',
        description: 'Own Money: Initial Capital',
        amount: 50000,
        source: 'Bank'
      },
      // 2. Loan received into Bank
      {
        id: 2,
        category: 'Money In',
        description: 'Borrowed / Loan: Shri Krishna Finance',
        amount: 100000,
        source: 'Bank'
      },
      // 3. Credit Material Purchase (Recorded once under Materials)
      {
        id: 10,
        invoice_no: 'INV-MAT-1001',
        date: '2026-11-01',
        category: 'Materials',
        description: 'Cement Purchase on Credit',
        amount: 30000,
        source: 'Credit',
        recipient: 'Sri Lakshmi Traders',
        advance_paid: 0,
        balance: 30000,
        status: 'Due',
        material_id: 201
      }
    ],
    materials: [
      { id: 201, total_amount: 30000, paid_amount: 0, balance_amount: 30000 }
    ],
    loans: [
      { id: 1, lender_name: 'Shri Krishna Finance', principal: 100000, repaid_amount: 0 }
    ]
  });

  // Execute Supplier Settlement: Pay ₹20,000 from Bank against Bill #10
  const settleResult = backend.settleSupplierCreditBill({
    isAdmin: true,
    obligationId: 10,
    paymentAmount: 20000,
    fundingSource: 'Bank',
    paymentDate: '2026-11-05',
    idempotencyKey: 'idemp_ledger_reconcile_01',
    materialId: 201
  });
  assert.equal(settleResult.success, true);
  assert.equal(settleResult.remaining_balance, 10000);

  // Execute Loan Repayment: Repay ₹15,000 principal + ₹1,200 interest via Bank
  const loanResult = backend.recordLoanRepayment({
    isAdmin: true,
    loanId: 1,
    principalAmount: 15000,
    interestAmount: 1200,
    fundingSource: 'Bank',
    repaymentDate: '2026-11-05',
    idempotencyKey: 'idemp_ledger_reconcile_02'
  });
  assert.equal(loanResult.success, true);
  assert.equal(loanResult.remaining_principal, 85000);

  // Now calculate full financial summary from the backend ledger
  const summary = calculateFinancialSummary({
    transactions: backend.state.transactions,
    loans: backend.state.loans,
    labour: [],
    piecework: []
  });

  // Operating Revenue: ₹0 (Capital & Loan are funding inflows, NOT operating revenue)
  assert.equal(summary.totalInflow, 0);
  assert.equal(summary.ownerCapital, 50000);
  assert.equal(summary.loanProceeds, 100000);
  assert.equal(summary.totalReceipts, 150000);

  // Operating Expenses:
  // - Material expense: ₹20,000 (actual paid portion, NOT ₹30,000 billed + ₹20,000 payment = ₹50,000 double counted!)
  // - Interest: ₹1,200
  // - Principal repayment of ₹15,000 is NOT an operating expense
  assert.equal(summary.totalPaidExpenses, 21200);
  assert.equal(summary.interestPaid, 1200);
  assert.equal(summary.loanPrincipalRepaid, 15000);

  // Outstanding Liabilities:
  // - Supplier Due: ₹10,000 (₹30,000 billed - ₹20,000 paid)
  // - Loan Outstanding: ₹85,000 (₹1,00,000 - ₹15,000 repaid)
  assert.equal(summary.supplierPayablesDue, 10000);
  assert.equal(summary.loanOutstanding, 85000);

  // Bank Liquidity:
  // Inflows: +₹50,000 (capital) + ₹1,00,000 (loan) = ₹1,50,000
  // Outflows: -₹20,000 (supplier) - ₹15,000 (loan principal) - ₹1,200 (loan interest) = -₹36,200
  // Final Bank Balance = ₹1,13,800
  assert.equal(summary.bankBalance, 113800);
  assert.equal(summary.balancesReliable, true);
});

test('unauthorized actor is blocked from executing settlement or repayment', () => {
  const backend = createMockContractorBackend({
    transactions: [
      { id: 101, source: 'Credit', balance: 5000, status: 'Due', category: 'Materials', recipient: 'Supplier', material_id: 201 }
    ],
    materials: [{ id: 201, total_amount: 5000, paid_amount: 0, balance_amount: 5000 }],
    loans: [{ id: 1, lender_name: 'Lender', principal: 10000, repaid_amount: 0 }]
  });

  // Non-admin settlement attempt is rejected
  assert.throws(
    () =>
      backend.settleSupplierCreditBill({
        isAdmin: false,
        obligationId: 101,
        paymentAmount: 1000,
        fundingSource: 'Cash',
        paymentDate: '2026-11-05',
        idempotencyKey: 'idemp_unauth_000000001'
      }),
    /Unauthorized: only verified administrators can settle supplier bills/
  );

  // Non-admin loan repayment attempt is rejected
  assert.throws(
    () =>
      backend.recordLoanRepayment({
        isAdmin: false,
        loanId: 1,
        principalAmount: 1000,
        fundingSource: 'Cash',
        repaymentDate: '2026-11-05',
        idempotencyKey: 'idemp_unauth_000000002'
      }),
    /Unauthorized: only verified administrators can record loan repayments/
  );
});
