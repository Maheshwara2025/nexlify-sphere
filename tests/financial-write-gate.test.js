import test from 'node:test';
import assert from 'node:assert/strict';
import {
	FINANCIAL_WRITES_ENABLED,
	runFinancialMutation,
	moneyToPaise,
	preparePaymentCommand,
	applyPaymentToSnapshot
} from '../src/lib/contractor/financial-write-gate.js';

const draft = {
	operation: 'loan_principal_repaid',
	entityId: 'loan-1',
	expectedVersion: 0,
	amount: '20.00',
	outstanding: '100.00',
	fundingAccount: 'Bank',
	idempotencyKey: 'stable_payment_0001',
	date: '2026-11-02'
};

test('the production financial write gate always rejects, including an alleged override payload', async () => {
	assert.equal(FINANCIAL_WRITES_ENABLED, false);
	for (const operation of [
		'create_expense',
		'create_material',
		'clear_credit',
		'repay_loan',
		'delete_transaction'
	]) {
		await assert.rejects(
			runFinancialMutation(operation, { enabled: true, force: true }),
			(error) =>
				error.code === 'FINANCIAL_WRITES_DISABLED' && error.message.includes('సేవ్ చేయబడవు')
		);
	}
});

test('money validation rejects fractional paise, non-finite, malformed and unsafe amounts', () => {
	assert.equal(moneyToPaise('1234.56'), 123456);
	assert.equal(moneyToPaise(0.1 + 0.2), 30);
	for (const value of ['1.005', '1e3', '', NaN, Infinity, Number.MAX_SAFE_INTEGER])
		assert.throws(() => moneyToPaise(value));
});

test('a payment requires positive bounded amount, actual funding and stable operation identity', () => {
	assert.equal(preparePaymentCommand(draft).amountPaise, 2000);
	for (const patch of [
		{ amount: 0 },
		{ amount: -1 },
		{ amount: 101 },
		{ fundingAccount: 'Credit' },
		{ idempotencyKey: '' },
		{ entityId: '' },
		{ expectedVersion: -1 },
		{ date: '2026-02-30' }
	]) {
		assert.throws(() => preparePaymentCommand({ ...draft, ...patch }));
	}
});

test('the pure future-backend model replays an identical command once and rejects reused keys', () => {
	const command = preparePaymentCommand(draft);
	const original = {
		entityId: 'loan-1',
		version: 0,
		outstandingPaise: 10000,
		repaidPaise: 0,
		processed: {}
	};
	const paid = applyPaymentToSnapshot(original, command);
	assert.equal(paid.outstandingPaise, 8000);
	assert.equal(paid.repaidPaise, 2000);
	assert.equal(original.repaidPaise, 0);
	assert.equal(applyPaymentToSnapshot(paid, command), paid);
	assert.throws(
		() => applyPaymentToSnapshot(paid, { ...command, amountPaise: 3000 }),
		/Idempotency/
	);
});

test('a stale concurrent payment must reload the version and cannot overwrite a previous repayment', () => {
	const original = {
		entityId: 'loan-1',
		version: 0,
		outstandingPaise: 10000,
		repaidPaise: 0,
		processed: {}
	};
	const first = preparePaymentCommand(draft);
	const second = preparePaymentCommand({
		...draft,
		amount: 30,
		idempotencyKey: 'stable_payment_0002'
	});
	const paid = applyPaymentToSnapshot(original, first);
	assert.throws(() => applyPaymentToSnapshot(paid, second), /Version conflict/);
	const refreshed = preparePaymentCommand({
		...draft,
		amount: 30,
		outstanding: 80,
		expectedVersion: 1,
		idempotencyKey: 'stable_payment_0002'
	});
	const result = applyPaymentToSnapshot(paid, refreshed);
	assert.equal(result.outstandingPaise, 5000);
	assert.equal(result.repaidPaise, 5000);
});
