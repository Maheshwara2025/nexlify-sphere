import test from 'node:test';
import assert from 'node:assert/strict';
import {
	calculateFinancialSummary,
	getPartyOptions,
	getPartyAccount
} from '../src/lib/contractor/accounting.js';
import { CATEGORIES, normalizeCategory } from '../src/lib/contractor/categories.js';

test('credit advances and fully settled legacy invoices count as paid without inventing cash movements', () => {
	const summary = calculateFinancialSummary({
		transactions: [
			{
				id: 1,
				category: 'Materials',
				amount: '10000.00',
				source: 'Credit',
				advance_paid: '2000',
				balance: '8000',
				status: 'Due'
			},
			{
				id: 2,
				category: 'Materials',
				amount: '5000.00',
				source: 'Credit',
				advance_paid: 0,
				balance: 0,
				status: 'Paid'
			}
		]
	});
	assert.equal(summary.totalPaidExpenses, 7000);
	assert.equal(summary.totalPayablesDue, 8000);
	assert.equal(summary.cashBalance, 0);
	assert.equal(summary.bankBalance, 0);
	assert.equal(summary.balancesReliable, false);
	assert.equal(summary.warnings.filter((item) => item.code === 'MISSING_FUNDING').length, 2);
});

test('a funded linked supplier settlement does not double-count expense or outstanding', () => {
	const summary = calculateFinancialSummary({
		transactions: [
			{
				id: 1,
				category: 'Materials',
				amount: 1000,
				source: 'Credit',
				advance_paid: 0,
				balance: 0,
				status: 'Paid'
			},
			{ id: 2, entry_type: 'supplier_payment', obligation_id: 1, amount: 1000, source: 'UPI' }
		]
	});
	assert.equal(summary.totalPaidExpenses, 1000);
	assert.equal(summary.totalPayablesDue, 0);
	assert.equal(summary.bankBalance, -1000);
	assert.equal(summary.balancesReliable, true);
});

test('labour and piecework dues include earned unpaid amounts; advances are not counted twice', () => {
	const summary = calculateFinancialSummary({
		labour: [{ id: 1, worker_id: 'LBR-001', days: 1, daily_rate: 800, advance_paid: 0 }],
		piecework: [{ id: 2, total_amount: 21000, advance_paid: 5000, balance_due: 16000 }],
		transactions: [
			{ id: 3, category: 'Centring', amount: 5000, source: 'Cash', balance: 16000, status: 'Due' }
		]
	});
	assert.equal(summary.labourPayablesDue, 800);
	assert.equal(summary.pieceworkPayablesDue, 16000);
	assert.equal(summary.totalPayablesDue, 16800);
	assert.equal(summary.totalLiabilities, 16800);
	assert.equal(summary.totalPaidExpenses, 5000);
	assert.equal(summary.cashBalance, -5000);
});

test('loan principal changes liquidity, not operating income or expense; interest is separate', () => {
	const summary = calculateFinancialSummary({
		loans: [{ id: 1, principal: 10000, repaid_amount: 2000 }],
		transactions: [
			{
				id: 1,
				category: 'Money In',
				description: 'Borrowed / Loan: Lender',
				amount: 10000,
				source: 'Bank'
			},
			{
				id: 2,
				category: 'Money In',
				description: 'Running Bill Received: Bill',
				amount: 3000,
				source: 'UPI'
			},
			{ id: 3, entry_type: 'loan_principal_repaid', loan_id: 1, amount: 2000, source: 'Bank' },
			{ id: 4, entry_type: 'loan_interest', amount: 150, source: 'Bank' }
		]
	});
	assert.equal(summary.totalReceipts, 13000);
	assert.equal(summary.totalInflow, 3000);
	assert.equal(summary.loanProceeds, 10000);
	assert.equal(summary.loanPrincipalRepaid, 2000);
	assert.equal(summary.totalPaidExpenses, 150);
	assert.equal(summary.interestPaid, 150);
	assert.equal(summary.loanOutstanding, 8000);
	assert.equal(summary.bankBalance, 10850);
	assert.equal(summary.categoryTotals[CATEGORIES.INTEREST], 150);
	assert.equal(summary.balancesReliable, true);
});

test('principal repaid without a funded record is visibly unreconciled and overpayments never create negative liabilities', () => {
	const summary = calculateFinancialSummary({
		loans: [{ id: 1, principal: 100, repaid_amount: 120 }]
	});
	assert.equal(summary.loanOutstanding, 0);
	assert.equal(summary.balancesReliable, false);
	assert.ok(summary.warnings.some((item) => item.code === 'OVERPAID_LOAN'));
	assert.ok(summary.warnings.some((item) => item.code === 'MISSING_LOAN_REPAYMENT_POSTING'));
});

test('paise arithmetic remains exact and cash-bank transfers conserve liquidity', () => {
	const summary = calculateFinancialSummary({
		transactions: [
			{ id: 1, category: 'Money In', amount: '0.10', source: 'Cash' },
			{ id: 2, category: 'Money In', amount: '0.20', source: 'Cash' },
			{ id: 3, category: 'Transfer', amount: '0.10', source: 'Cash to Bank' }
		]
	});
	assert.equal(summary.amountsPaise.totalInflow, 30);
	assert.equal(summary.amountsPaise.cashBalance, 20);
	assert.equal(summary.amountsPaise.bankBalance, 10);
	assert.equal(summary.amountsPaise.totalLiquidity, 30);
	assert.equal(summary.totalPaidExpenses, 0);
});

test('zero attendance remains zero and invalid monetary values are flagged', () => {
	const summary = calculateFinancialSummary({
		labour: [{ id: 1, days: 0, daily_rate: 800 }],
		transactions: [{ id: 1, category: 'Materials', amount: 'NaN', source: 'Cash' }]
	});
	assert.equal(summary.labourPayablesDue, 0);
	assert.equal(summary.balancesReliable, false);
	assert.ok(summary.warnings.some((item) => item.code === 'INVALID_AMOUNT'));
});

test('legacy categories map to one canonical accounting/filter vocabulary', () => {
	assert.equal(normalizeCategory('Labour'), CATEGORIES.LABOUR);
	assert.equal(normalizeCategory('Transport'), CATEGORIES.TRANSPORT);
	assert.equal(normalizeCategory('General'), CATEGORIES.GENERAL);
	assert.equal(normalizeCategory('Custom category'), 'Custom category');
});

test('same-name workers and suppliers stay separate by immutable IDs', () => {
	const data = {
		profiles: [
			{ worker_id: 'LBR-001', name: 'Ramesh' },
			{ worker_id: 'LBR-002', name: 'Ramesh' }
		],
		parties: [{ id: 9, name: 'Ramesh' }],
		labour: [
			{
				id: 1,
				worker_id: 'LBR-001',
				worker_name: 'Ramesh',
				days: 1,
				daily_rate: 800,
				advance_paid: 100
			},
			{
				id: 2,
				worker_id: 'LBR-002',
				worker_name: 'Ramesh',
				days: 1,
				daily_rate: 1000,
				advance_paid: 200
			}
		],
		transactions: [
			{
				id: 3,
				party_id: 9,
				recipient: 'Ramesh',
				amount: 10000,
				advance_paid: 2000,
				balance: 8000,
				status: 'Due',
				source: 'Credit',
				category: 'Materials'
			}
		]
	};
	assert.equal(getPartyOptions(data).length, 3);
	assert.equal(getPartyAccount('worker:LBR-001', data).totalDue, 700);
	assert.equal(getPartyAccount('worker:LBR-002', data).totalDue, 800);
	const supplier = getPartyAccount('party:9', data);
	assert.equal(supplier.totalBilled, 10000);
	assert.equal(supplier.totalPaid, 2000);
	assert.equal(supplier.totalDue, 8000);
});

test('name-only legacy rows are isolated even when names match a known profile', () => {
	const data = {
		profiles: [{ worker_id: 'LBR-001', name: 'Ramesh' }],
		transactions: [
			{ id: 1, recipient: 'Ramesh', amount: 100, source: 'Cash', category: 'Materials' },
			{ id: 2, recipient: 'Ramesh', amount: 200, source: 'Cash', category: 'Materials' }
		]
	};
	const options = getPartyOptions(data);
	assert.equal(options.length, 3);
	assert.equal(getPartyAccount('worker:LBR-001', data).totalPaid, 0);
	assert.equal(getPartyAccount('legacy:transaction:1', data).totalPaid, 100);
	assert.equal(getPartyAccount('legacy:transaction:2', data).totalPaid, 200);
	assert.ok(
		getPartyAccount('legacy:transaction:1', data).warnings.some(
			(item) => item.code === 'LEGACY_PARTY_UNALLOCATED'
		)
	);
});

test('owner capital is funding rather than operating revenue', () => {
	const summary = calculateFinancialSummary({
		transactions: [
			{ id: 1, category: 'Money In', description: 'Own Money: Owner', amount: 5000, source: 'Cash' }
		]
	});
	assert.equal(summary.ownerCapital, 5000);
	assert.equal(summary.totalInflow, 0);
	assert.equal(summary.totalReceipts, 5000);
	assert.equal(summary.cashBalance, 5000);
});

test('a source advance without an immutable ledger link is shown as unverified, never invented as cash movement', () => {
	const summary = calculateFinancialSummary({
		labour: [{ id: 1, days: 1, daily_rate: 800, advance_paid: 200 }]
	});
	assert.equal(summary.labourPayablesDue, 600);
	assert.equal(summary.cashBalance, 0);
	assert.equal(summary.balancesReliable, false);
	assert.ok(summary.warnings.some((item) => item.code === 'UNVERIFIED_ADVANCE_POSTING'));
});

test('posted loan repayments inconsistent with the loan record require reconciliation', () => {
	const summary = calculateFinancialSummary({
		loans: [{ id: 1, principal: 1000, repaid_amount: 0 }],
		transactions: [
			{ id: 2, entry_type: 'loan_principal_repaid', loan_id: 1, amount: 100, source: 'Cash' }
		]
	});
	assert.equal(summary.balancesReliable, false);
	assert.ok(summary.warnings.some((item) => item.code === 'LOAN_REPAYMENT_MISMATCH'));
});

test('reconciles operating income, client receipts and owner self-capital across language variants', () => {
	const summary = calculateFinancialSummary({
		transactions: [
			{ id: 1, category: 'నగదు ఇన్‌ఫ్లో', description: 'Running Bill Received: Bill #1', amount: 350000, source: 'Bank' },
			{ id: 2, category: 'Money In', description: 'స్వంత పెట్టుబడి (Self Capital)', amount: 450000, source: 'Bank' },
			{ id: 3, category: 'రాబడి', description: 'Client Advance: Site Boundary', amount: 50000, source: 'UPI' }
		]
	});
	assert.equal(summary.ownerCapital, 450000);
	assert.equal(summary.totalInflow, 400000); // 350000 + 50000
	assert.equal(summary.totalReceipts, 850000); // 450000 + 400000
	assert.equal(summary.bankBalance, 850000);
});
