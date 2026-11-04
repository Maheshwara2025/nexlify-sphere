/**
 * @typedef {{operation:string,entityId:string,expectedVersion:number,amount:unknown,outstanding:unknown,fundingAccount:string,idempotencyKey:string,date:string}} PaymentDraft
 * @typedef {{entityId:string,version:number,outstandingPaise:number,repaidPaise:number,processed?:Record<string,string>}} PaymentSnapshot
 */
// This is deliberately not an environment toggle. No reviewed atomic persistence
// contract exists yet. Browser-side sequential writes must remain disabled.
export const FINANCIAL_WRITES_ENABLED = false;
export const FINANCIAL_WRITES_DISABLED_MESSAGE =
	'ఆర్థిక లావాదేవీల సేవింగ్ తాత్కాలికంగా నిలిపివేయబడింది. భద్రమైన ఒకే డేటాబేస్ లావాదేవీ (atomic backend) సమీక్ష పూర్తయ్యే వరకు కొత్త ఖర్చులు, చెల్లింపులు లేదా అప్పులు సేవ్ చేయబడవు.';

/** @param {unknown} _operation @param {unknown} [_payload] */
export async function runFinancialMutation(_operation, _payload) {
	const error = Object.assign(new Error(FINANCIAL_WRITES_DISABLED_MESSAGE), {
		code: 'FINANCIAL_WRITES_DISABLED'
	});
	throw error;
}

/** Convert rupees to integer paise; reject fractional paise and unsafe values. */
/** @param {unknown} value */
export function moneyToPaise(value) {
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) throw new TypeError('Amount must be finite.');
		const scaled = value * 100;
		const rounded = Math.round(scaled);
		if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 0.000001) {
			throw new RangeError('Use an amount within range with at most two decimal places.');
		}
		return rounded;
	}
	if (typeof value !== 'string' || !/^-?\d+(?:\.\d{1,2})?$/.test(value.trim())) {
		throw new TypeError('Use a decimal rupee amount with at most two decimal places.');
	}
	const text = value.trim();
	const negative = text.startsWith('-');
	const [whole, fraction = ''] = text.replace(/^-/, '').split('.');
	const paise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
	const signed = negative ? -paise : paise;
	if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < BigInt(Number.MIN_SAFE_INTEGER)) {
		throw new RangeError('Amount exceeds the supported range.');
	}
	return Number(signed);
}

/** Pure validation only. This neither saves nor authorizes a payment. */
/** @param {PaymentDraft} draft */
export function preparePaymentCommand(draft) {
	const allowed = new Set([
		'supplier_payment',
		'labour_payment',
		'piecework_payment',
		'loan_principal_repaid',
		'loan_interest'
	]);
	if (!draft || !allowed.has(draft.operation))
		throw new TypeError('Unsupported payment operation.');
	if (typeof draft.entityId !== 'string' || !draft.entityId.trim())
		throw new TypeError('An immutable entity ID is required.');
	if (!Number.isSafeInteger(draft.expectedVersion) || draft.expectedVersion < 0)
		throw new TypeError('An expected record version is required.');
	if (!['Cash', 'Bank', 'UPI'].includes(draft.fundingAccount))
		throw new TypeError('Select Cash, Bank or UPI as the funding account.');
	if (
		typeof draft.idempotencyKey !== 'string' ||
		!/^[A-Za-z0-9_-]{16,128}$/.test(draft.idempotencyKey)
	) {
		throw new TypeError('Provide a stable idempotency key of 16–128 characters.');
	}
	if (
		typeof draft.date !== 'string' ||
		!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
		new Date(`${draft.date}T00:00:00.000Z`).toISOString().slice(0, 10) !== draft.date
	) {
		throw new TypeError('A valid payment date is required.');
	}
	const amountPaise = moneyToPaise(draft.amount);
	const outstandingPaise = moneyToPaise(draft.outstanding);
	if (amountPaise <= 0) throw new RangeError('Payment must be greater than zero.');
	if (outstandingPaise < 0 || amountPaise > outstandingPaise)
		throw new RangeError('Payment exceeds the outstanding amount.');
	return Object.freeze({
		operation: draft.operation,
		entityId: draft.entityId,
		expectedVersion: draft.expectedVersion,
		amountPaise,
		fundingAccount: draft.fundingAccount,
		idempotencyKey: draft.idempotencyKey,
		date: draft.date
	});
}

/**
 * Pure accounting model for reviewing the future backend contract. It is not
 * persistence, a lock, or a substitute for a database transaction/unique index.
 */
/** @param {PaymentSnapshot} snapshot @param {ReturnType<typeof preparePaymentCommand>} command */
export function applyPaymentToSnapshot(snapshot, command) {
	if (!snapshot || command.entityId !== snapshot.entityId)
		throw new Error('Payment entity does not match.');
	const journal = snapshot.processed || {};
	const fingerprint = JSON.stringify(command);
	if (Object.hasOwn(journal, command.idempotencyKey)) {
		if (journal[command.idempotencyKey] !== fingerprint)
			throw new Error('Idempotency key was reused for a different payment.');
		return snapshot;
	}
	if (command.expectedVersion !== snapshot.version)
		throw new Error('Version conflict: reload the outstanding amount.');
	if (
		!Number.isSafeInteger(command.amountPaise) ||
		command.amountPaise <= 0 ||
		command.amountPaise > snapshot.outstandingPaise
	) {
		throw new RangeError('Payment exceeds the outstanding amount.');
	}
	return {
		...snapshot,
		version: snapshot.version + 1,
		outstandingPaise: snapshot.outstandingPaise - command.amountPaise,
		repaidPaise: (snapshot.repaidPaise || 0) + command.amountPaise,
		processed: { ...journal, [command.idempotencyKey]: fingerprint }
	};
}
