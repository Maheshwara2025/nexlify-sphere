export const CATEGORIES = Object.freeze({
	MONEY_IN: 'Money In',
	TRANSFER: 'Transfer',
	MATERIALS: 'Materials',
	LABOUR: 'Labour & Mestri',
	CENTRING: 'Centring',
	TRANSPORT: 'Transport & Fuel',
	GENERAL: 'General Overheads',
	REFRESHMENTS: 'Site Refreshments & Water',
	INTEREST: 'Interest & Finance Charges'
});

const aliases = new Map([
	['money in', CATEGORIES.MONEY_IN],
	['money-in', CATEGORIES.MONEY_IN],
	['inflow', CATEGORIES.MONEY_IN],
	['income', CATEGORIES.MONEY_IN],
	['revenue', CATEGORIES.MONEY_IN],
	['receipt', CATEGORIES.MONEY_IN],
	['receipts', CATEGORIES.MONEY_IN],
	['running bill', CATEGORIES.MONEY_IN],
	['running bill received', CATEGORIES.MONEY_IN],
	['client advance', CATEGORIES.MONEY_IN],
	['నగదు ఇన్‌ఫ్లో', CATEGORIES.MONEY_IN],
	['ఇన్‌ఫ్లో', CATEGORIES.MONEY_IN],
	['మొత్తం ఇన్‌ఫ్లో', CATEGORIES.MONEY_IN],
	['రాబడి', CATEGORIES.MONEY_IN],
	['transfer', CATEGORIES.TRANSFER],
	['materials', CATEGORIES.MATERIALS],
	['labour', CATEGORIES.LABOUR],
	['labor', CATEGORIES.LABOUR],
	['labour & mestri', CATEGORIES.LABOUR],
	['centring', CATEGORIES.CENTRING],
	['transport', CATEGORIES.TRANSPORT],
	['transport & fuel', CATEGORIES.TRANSPORT],
	['general', CATEGORIES.GENERAL],
	['general overheads', CATEGORIES.GENERAL],
	['site refreshments & water', CATEGORIES.REFRESHMENTS],
	['loan interest', CATEGORIES.INTEREST],
	['interest', CATEGORIES.INTEREST],
	['interest & finance charges', CATEGORIES.INTEREST]
]);

/** @param {unknown} value */
export function normalizeCategory(value) {
	const label = typeof value === 'string' ? value.trim() : '';
	return aliases.get(label.toLowerCase()) || label || 'Uncategorised';
}
