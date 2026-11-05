/**
 * @typedef {Record<string, unknown>} FinancialRow
 * @typedef {{code:string,message:string,recordKey:string}} AccountingWarning
 * @typedef {{transactions?:FinancialRow[],loans?:FinancialRow[],labour?:FinancialRow[],piecework?:FinancialRow[],profiles?:FinancialRow[],parties?:FinancialRow[]}} AccountingData
 * @typedef {{key:string,label:string,type:string,ambiguous:boolean}} PartyOption
 * @typedef {{key:string,type:string,row:FinancialRow}} PartyEntry
 */
import { CATEGORIES, normalizeCategory } from './categories.js';
import { moneyToPaise } from './financial-write-gate.js';

/** @param {unknown} value */
const present = (value) => value !== null && value !== undefined && value !== '';
/** @param {number} paise */
const rupees = (paise) => paise / 100;
/** @param {FinancialRow} record @param {number} index */
const recordId = (record, index) => String(record.id ?? `row-${index}`);
/** @param {unknown} value */
const account = (value) =>
	new Map([
		['cash', 'Cash'],
		['bank', 'Bank'],
		['upi', 'UPI']
	]).get(
		String(value || '')
			.trim()
			.toLowerCase()
	);
/** @param {FinancialRow} tx */
const kindOf = (tx) => String(tx.entry_type || tx.kind || '').toLowerCase();
const settlementKinds = new Set(['supplier_payment', 'labour_payment', 'piecework_payment']);
/** @param {AccountingWarning[]} warnings @param {string} code @param {string} message @param {string} recordKey */
const warn = (warnings, code, message, recordKey) => warnings.push({ code, message, recordKey });

/** @param {unknown} value @param {AccountingWarning[]} warnings @param {string} recordKey @param {string} [field] */
function amount(value, warnings, recordKey, field = 'amount') {
	if (!present(value)) return 0;
	try {
		const paise = moneyToPaise(value);
		if (paise < 0) throw new RangeError('Negative amounts require an explicit reversal record.');
		return paise;
	} catch {
		warn(
			warnings,
			'INVALID_AMOUNT',
			`Invalid ${field}; this record needs reconciliation.`,
			recordKey
		);
		return 0;
	}
}

/** @param {number} left @param {number} right */
function add(left, right) {
	const result = left + right;
	if (!Number.isSafeInteger(result))
		throw new RangeError('Financial totals exceed the safe integer range.');
	return result;
}

/** @param {FinancialRow} tx @param {AccountingWarning[]} warnings @param {string} key */
function creditPosition(tx, warnings, key) {
	const billed = amount(tx.amount, warnings, key);
	const advance = amount(tx.advance_paid, warnings, key, 'advance_paid');
	const balance = present(tx.balance)
		? amount(tx.balance, warnings, key, 'balance')
		: Math.max(0, billed - advance);
	const due = tx.status === 'Paid' ? 0 : balance;
	if (due > billed || advance > billed || (tx.status === 'Paid' && balance > 0)) {
		warn(
			warnings,
			'INCONSISTENT_PAYABLE',
			'Invoice amount, paid status and outstanding balance disagree.',
			key
		);
	}
	return {
		billed,
		paid: Math.max(0, billed - Math.min(due, billed)),
		due: Math.min(due, billed),
		advance
	};
}

/**
 * A read model only; no database access. All arithmetic uses integer paise.
 * Explicit settlement records use entry_type supplier_payment/labour_payment/
 * piecework_payment plus obligation_id. Labour/piecework payments here are
 * additional to their legacy advance_paid; paid_amount may hold a cumulative
 * total. Loan principal uses loan_principal_received/loan_principal_repaid;
 * the existing 'Borrowed / Loan:' receipt prefix is also recognised.
 * Missing legacy funding is reported; a Cash/Bank movement is never invented.
 */
/** @param {AccountingData} [data] */
export function calculateFinancialSummary({
	transactions = [],
	loans = [],
	labour = [],
	piecework = []
} = {}) {
	/** @type {AccountingWarning[]} */
	const warnings = [];
	const totals = {
		totalInflow: 0,
		totalReceipts: 0,
		totalPaidExpenses: 0,
		supplierPayablesDue: 0,
		labourPayablesDue: 0,
		pieceworkPayablesDue: 0,
		cashBalance: 0,
		bankBalance: 0,
		loanOutstanding: 0,
		loanProceeds: 0,
		ownerCapital: 0,
		loanPrincipalRepaid: 0,
		interestPaid: 0,
		totalPayablesDue: 0,
		totalLiquidity: 0,
		totalLiabilities: 0
	};
	/** @type {Record<string, number>} */
	const categoryTotalsPaise = {};
	/** @type {Map<string, number>} */
	const invoicePayments = new Map();
	/** @type {Map<string, number>} */
	const labourPayments = new Map();
	/** @type {Map<string, number>} */
	const pieceworkPayments = new Map();
	/** @param {string} category @param {number} paid */
	const recordExpense = (category, paid) => {
		totals.totalPaidExpenses = add(totals.totalPaidExpenses, paid);
		if (category === CATEGORIES.INTEREST) totals.interestPaid = add(totals.interestPaid, paid);
		categoryTotalsPaise[category] = add(categoryTotalsPaise[category] || 0, paid);
	};
	/** @param {unknown} funding @param {number} paise @param {number} direction @param {string} key */
	const move = (funding, paise, direction, key) => {
		const selected = account(funding);
		if (!selected) {
			if (paise)
				warn(
					warnings,
					'MISSING_FUNDING',
					'The payment account is unknown; reconcile cash and bank balances.',
					key
				);
			return;
		}
		const field = selected === 'Cash' ? 'cashBalance' : 'bankBalance';
		totals[field] = add(totals[field], paise * direction);
	};
	// Collect explicit settlements first, so an invoice and its payment do not
	// both become expenses. Physical cash movement is posted only once below.
	transactions.forEach((tx, index) => {
		const kind = kindOf(tx);
		if (!settlementKinds.has(kind)) return;
		const key = `transaction:${recordId(tx, index)}`;
		const paid = amount(tx.amount, warnings, key);
		// Stage 2 supplier obligations link to transaction IDs. Stage 3
		// labour/piecework payments link to their own immutable table IDs,
		// since obligation_id has a FK to contractor_transactions (not labour).
		const linkedId =
			kind === 'supplier_payment'
				? tx.obligation_id
				: kind === 'labour_payment'
					? tx.labour_id
					: tx.piecework_id;
		if (!present(linkedId)) {
			warn(warnings, 'UNALLOCATED_PAYMENT', 'Payment has no verified parent record ID.', key);
			return;
		}
		const target =
			kind === 'supplier_payment'
				? invoicePayments
				: kind === 'labour_payment'
					? labourPayments
					: pieceworkPayments;
		const id = String(linkedId);
		target.set(id, add(target.get(id) || 0, paid));
	});

	transactions.forEach((tx, index) => {
		const key = `transaction:${recordId(tx, index)}`;
		const category = normalizeCategory(tx.category);
		const kind = kindOf(tx);
		const paid = amount(tx.amount, warnings, key);
		const descText = String(tx.description || tx.desc || tx.notes || '');
		const isBorrowing =
			kind === 'loan_principal_received' ||
			(category === CATEGORIES.MONEY_IN &&
				/^(?:borrowed\s*\/\s*loan|borrowed|loan|అప్పు|రుణం)(?:\s*:|\s*\(|$)/i.test(descText));
		const isOwnerCapital =
			kind === 'owner_capital_received' ||
			(category === CATEGORIES.MONEY_IN &&
				/^(?:own\s*money|self\s*capital|capital|స్వంత\s*పెట్టుబడి|పెట్టుబడి)(?:\s*:|\s*\(|$)/i.test(descText));
		if (category === CATEGORIES.TRANSFER) {
			if (tx.source === 'Cash to Bank') {
				move('Cash', paid, -1, key);
				move('Bank', paid, 1, key);
			} else if (tx.source === 'Bank to Cash') {
				move('Bank', paid, -1, key);
				move('Cash', paid, 1, key);
			} else
				warn(
					warnings,
					'INVALID_TRANSFER',
					'Unknown transfer direction; reconcile this record.',
					key
				);
			return;
		}
		if (category === CATEGORIES.MONEY_IN || isBorrowing) {
			move(tx.source, paid, 1, key);
			totals.totalReceipts = add(totals.totalReceipts, paid);
			if (isBorrowing) totals.loanProceeds = add(totals.loanProceeds, paid);
			else if (isOwnerCapital) totals.ownerCapital = add(totals.ownerCapital, paid);
			else totals.totalInflow = add(totals.totalInflow, paid);
			return;
		}
		if (kind === 'loan_principal_repaid') {
			move(tx.source, paid, -1, key);
			totals.loanPrincipalRepaid = add(totals.loanPrincipalRepaid, paid);
			return;
		}
		if (settlementKinds.has(kind)) {
			move(tx.source, paid, -1, key);
			// Settlement cash movement happens once; expenses come from linked
			// supplier obligation or labour/piecework accrual below.
			const records =
				kind === 'supplier_payment' ? transactions : kind === 'labour_payment' ? labour : piecework;
			const linkedId =
				kind === 'supplier_payment' ? tx.obligation_id
					: kind === 'labour_payment' ? tx.labour_id : tx.piecework_id;
			if (
				!records.some(
					(record) => present(record.id) && String(record.id) === String(linkedId)
				)
			) {
				warn(warnings, 'UNALLOCATED_PAYMENT', 'No matching payable obligation was loaded.', key);
			}
			return;
		}
		if (String(tx.source).toLowerCase() === 'credit') {
			const position = creditPosition(tx, warnings, key);
			const linkedPaid = invoicePayments.get(String(tx.id)) || 0;
			const totalPaid = Math.min(
				position.billed,
				Math.max(position.paid, linkedPaid + position.advance)
			);
			recordExpense(category, totalPaid);
			totals.supplierPayablesDue = add(totals.supplierPayablesDue, position.billed - totalPaid);
			const unknownFunding = Math.max(0, totalPaid - linkedPaid);
			if (unknownFunding)
				warn(
					warnings,
					'MISSING_FUNDING',
					'Legacy credit payment has no funding account; cash and bank are unreconciled.',
					key
				);
			return;
		}
		move(tx.source, paid, -1, key);
		const expenseCategory = kind === 'loan_interest' ? CATEGORIES.INTEREST : category;
		recordExpense(expenseCategory, paid);
	});

	labour.forEach((row, index) => {
		const key = `labour:${recordId(row, index)}`;
		const days = Number(row.days ?? 1);
		const daily = amount(row.daily_rate, warnings, key, 'daily_rate');
		let earned = 0;
		if (!Number.isFinite(days) || days < 0)
			warn(warnings, 'INVALID_QUANTITY', 'Invalid attendance days.', key);
		else {
			earned = Math.round(days * daily);
			if (!Number.isSafeInteger(earned))
				throw new RangeError('Wage exceeds the safe integer range.');
		}
		const advance = amount(row.advance_paid, warnings, key, 'advance_paid');
		const additional = labourPayments.get(String(row.id)) || 0;
		const reportedPaid = amount(row.paid_amount, warnings, key, 'paid_amount');
		const paid = Math.max(reportedPaid, add(advance, additional));
		if (paid > earned)
			warn(warnings, 'OVERPAID_OBLIGATION', 'Labour payment exceeds earned wages.', key);
		totals.labourPayablesDue = add(totals.labourPayablesDue, Math.max(0, earned - paid));
		if (
			advance > 0 &&
			!transactions.some(
				(tx) =>
					present(row.id) &&
					present(tx.labour_id) &&
					String(tx.labour_id) === String(row.id) &&
					account(tx.source)
			)
		) {
			warn(
				warnings,
				'UNVERIFIED_ADVANCE_POSTING',
				'Legacy labour advance has no immutable link to a funded ledger entry.',
				key
			);
		}
		// Legacy advances are already represented by the Cash transaction. Only
		// explicit additional settlements are added here, preventing double count.
		recordExpense(CATEGORIES.LABOUR, additional);
	});

	piecework.forEach((row, index) => {
		const key = `piecework:${recordId(row, index)}`;
		const billed = amount(row.total_amount, warnings, key, 'total_amount');
		const advance = amount(row.advance_paid, warnings, key, 'advance_paid');
		const additional = pieceworkPayments.get(String(row.id)) || 0;
		const paid = Math.max(
			amount(row.paid_amount, warnings, key, 'paid_amount'),
			add(advance, additional)
		);
		if (paid > billed)
			warn(warnings, 'OVERPAID_OBLIGATION', 'Piecework payments exceed the contract amount.', key);
		totals.pieceworkPayablesDue = add(totals.pieceworkPayablesDue, Math.max(0, billed - paid));
		if (
			advance > 0 &&
			!transactions.some(
				(tx) =>
					present(row.id) &&
					present(tx.piecework_id) &&
					String(tx.piecework_id) === String(row.id) &&
					account(tx.source)
			)
		) {
			warn(
				warnings,
				'UNVERIFIED_ADVANCE_POSTING',
				'Legacy piecework advance has no immutable link to a funded ledger entry.',
				key
			);
		}
		recordExpense(CATEGORIES.CENTRING, additional);
	});

	loans.forEach((row, index) => {
		const key = `loan:${recordId(row, index)}`;
		const principal = amount(row.principal, warnings, key, 'principal');
		const repaid = amount(row.repaid_amount, warnings, key, 'repaid_amount');
		if (repaid > principal)
			warn(warnings, 'OVERPAID_LOAN', 'Repaid principal exceeds the original loan.', key);
		totals.loanOutstanding = add(totals.loanOutstanding, Math.max(0, principal - repaid));
		const posted = transactions
			.filter(
				(tx) =>
					kindOf(tx) === 'loan_principal_repaid' &&
					present(tx.loan_id) &&
					String(tx.loan_id) === String(row.id)
			)
			.reduce((sum, tx) => add(sum, amount(tx.amount, warnings, key)), 0);
		if (repaid > posted)
			warn(
				warnings,
				'MISSING_LOAN_REPAYMENT_POSTING',
				'Loan repayment has no matching funded principal payment record.',
				key
			);
		if (posted > repaid)
			warn(
				warnings,
				'LOAN_REPAYMENT_MISMATCH',
				'Posted principal payments exceed the loan repayment total; reconcile the loan.',
				key
			);
	});
	totals.totalPayablesDue = add(
		add(totals.supplierPayablesDue, totals.labourPayablesDue),
		totals.pieceworkPayablesDue
	);
	totals.totalLiquidity = add(totals.cashBalance, totals.bankBalance);
	totals.totalLiabilities = add(totals.loanOutstanding, totals.totalPayablesDue);
	const balancesReliable = !warnings.some((item) =>
		[
			'MISSING_FUNDING',
			'MISSING_LOAN_REPAYMENT_POSTING',
			'LOAN_REPAYMENT_MISMATCH',
			'UNVERIFIED_ADVANCE_POSTING',
			'INVALID_AMOUNT',
			'INVALID_TRANSFER'
		].includes(item.code)
	);
	return {
		.../** @type {typeof totals} */ (
			Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, rupees(value)]))
		),
		categoryTotals: Object.fromEntries(
			Object.entries(categoryTotalsPaise).map(([key, value]) => [key, rupees(value)])
		),
		amountsPaise: { ...totals },
		categoryTotalsPaise,
		balancesReliable,
		dataReliable: warnings.length === 0,
		warnings
	};
}

/** @param {AccountingData} [data] */
function partyIndex({
	transactions = [],
	labour = [],
	profiles = [],
	parties = [],
	piecework = []
} = {}) {
	/** @type {Map<string, PartyOption>} */
	const options = new Map();
	/** @type {PartyEntry[]} */
	const entries = [];
	/** @param {string} key @param {string} label @param {string} type */
	const put = (key, label, type) => {
		if (!options.has(key)) options.set(key, { key, label, type, ambiguous: type === 'legacy' });
	};
	/** @param {unknown} id */
	const workerKey = (id) => `worker:${encodeURIComponent(String(id))}`;
	/** @param {unknown} id */
	const partyKey = (id) => `party:${encodeURIComponent(String(id))}`;
	profiles.forEach((profile) => {
		if (present(profile.worker_id))
			put(
				workerKey(profile.worker_id),
				`${profile.name || 'Worker'} (${profile.worker_id})`,
				'worker'
			);
	});
	parties.forEach((party) => {
		if (present(party.id))
			put(partyKey(party.id), `${party.name || 'Party'} (ID ${party.id})`, 'supplier');
	});
	/** @param {FinancialRow[]} rows @param {string} type */
	const attach = (rows, type) =>
		rows.forEach((row, index) => {
			let key;
			if (present(row.worker_id)) {
				key = workerKey(row.worker_id);
				put(key, `${row.worker_name || row.recipient || 'Worker'} (${row.worker_id})`, 'worker');
			} else if (present(row.party_id) || present(row.contractor_id)) {
				const id = row.party_id ?? row.contractor_id;
				key = partyKey(id);
				put(
					key,
					`${row.recipient || row.party_name || row.contractor_name || 'Party'} (ID ${id})`,
					'supplier'
				);
			} else {
				key = `legacy:${type}:${encodeURIComponent(recordId(row, index))}`;
				const name = row.recipient || row.worker_name || row.contractor_name || 'Unnamed party';
				put(key, `${name} — unallocated ${type} ${recordId(row, index)}`, 'legacy');
			}
			entries.push({ key, type, row });
		});
	attach(transactions, 'transaction');
	attach(labour, 'labour');
	attach(piecework, 'piecework');
	return { options, entries };
}

/** Names are display text only. Legacy name-only records stay unallocated. */
/** @param {AccountingData} [data] */
export function getPartyOptions(data = {}) {
	return [...partyIndex(data).options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** @param {string} partyKey @param {AccountingData} [data] */
export function getPartyAccount(partyKey, data = {}) {
	const { options, entries } = partyIndex(data);
	const option = options.get(partyKey) || {
		key: partyKey,
		label: '',
		type: 'unknown',
		ambiguous: false
	};
	const chosen = entries.filter((entry) => entry.key === partyKey);
	const transactions = chosen
		.filter((entry) => entry.type === 'transaction')
		.map((entry) => entry.row);
	const labour = chosen.filter((entry) => entry.type === 'labour').map((entry) => entry.row);
	const piecework = chosen.filter((entry) => entry.type === 'piecework').map((entry) => entry.row);
	/** @type {AccountingWarning[]} */
	const warnings = [];
	if (option.ambiguous)
		warn(
			warnings,
			'LEGACY_PARTY_UNALLOCATED',
			'Assign an immutable party ID before combining this legacy record with another account.',
			partyKey
		);
	let billed = 0,
		paid = 0,
		totalDays = 0;
	labour.forEach((row, index) => {
		const key = `labour:${recordId(row, index)}`;
		const days = Number(row.days ?? 1);
		if (!Number.isFinite(days) || days < 0) {
			warn(warnings, 'INVALID_QUANTITY', 'Invalid attendance days.', key);
			return;
		}
		totalDays += days;
		billed = add(billed, Math.round(days * amount(row.daily_rate, warnings, key, 'daily_rate')));
		paid = add(
			paid,
			Math.max(amount(row.advance_paid, warnings, key), amount(row.paid_amount, warnings, key))
		);
	});
	piecework.forEach((row, index) => {
		const key = `piecework:${recordId(row, index)}`;
		billed = add(billed, amount(row.total_amount, warnings, key));
		paid = add(
			paid,
			Math.max(amount(row.advance_paid, warnings, key), amount(row.paid_amount, warnings, key))
		);
	});
	transactions.forEach((tx, index) => {
		const category = normalizeCategory(tx.category);
		const kind = kindOf(tx);
		const key = `transaction:${recordId(tx, index)}`;
		if (
			category === CATEGORIES.MONEY_IN ||
			category === CATEGORIES.TRANSFER ||
			kind.startsWith('loan_')
		)
			return;
		if (settlementKinds.has(kind)) {
			if (kind !== 'supplier_payment') paid = add(paid, amount(tx.amount, warnings, key));
			return;
		}
		// Identified legacy wage advances are already included in attendance.
		if (option.type === 'worker' && category === CATEGORIES.LABOUR && labour.length) return;
		if (String(tx.source).toLowerCase() === 'credit') {
			const position = creditPosition(tx, warnings, key);
			const linked = transactions
				.filter(
					(payment) =>
						kindOf(payment) === 'supplier_payment' &&
						present(payment.obligation_id) &&
						String(payment.obligation_id) === String(tx.id)
				)
				.reduce((sum, payment) => add(sum, amount(payment.amount, warnings, key)), 0);
			billed = add(billed, position.billed);
			paid = add(
				paid,
				Math.min(position.billed, Math.max(position.paid, linked + position.advance))
			);
		} else {
			const value = amount(tx.amount, warnings, key);
			billed = add(billed, value);
			paid = add(paid, value);
		}
	});
	return {
		...option,
		transactions,
		labour,
		piecework,
		totalDays,
		totalBilled: rupees(billed),
		totalPaid: rupees(paid),
		totalDue: rupees(Math.max(0, billed - paid)),
		warnings
	};
}
