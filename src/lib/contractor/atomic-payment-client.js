/**
 * Staged atomic payment RPC adapters for A.S.V. Contractor 360.
 * IMPORTANT: INACTIVE until the Stage 2 migration passes independent review.
 * These adapters never issue sequential browser-side writes.
 */
import { moneyToPaise } from './financial-write-gate.js';

export const STAGE2_ATOMIC_PAYMENTS_ENABLED = false;

const KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const ACCOUNTS = new Set(['Cash', 'Bank', 'UPI']);

function positiveId(value, label) {
  const text = String(value ?? '');
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) {
    throw new TypeError(label + ' must be a positive safe integer.');
  }
  return Number(text);
}

function decimal(value, allowZero = false) {
  const paise = moneyToPaise(value);
  if (paise < 0 || (!allowZero && paise === 0)) {
    throw new RangeError('Payment must be positive; components may be zero.');
  }
  return Math.floor(paise / 100) + '.' + String(paise % 100).padStart(2, '0');
}

function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError('Select a valid payment date.');
  }
  const parsed = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new TypeError('Select a valid payment date.');
  }
  return value;
}

function stableKey(value) {
  if (typeof value !== 'string' || !KEY_PATTERN.test(value)) {
    throw new TypeError('Stable idempotency key must have 16–128 safe characters.');
  }
  return value;
}

function account(value) {
  if (typeof value !== 'string' || !ACCOUNTS.has(value)) {
    throw new TypeError('Select Cash, Bank or UPI.');
  }
  return value;
}

function note(value) {
  const result = value == null ? '' : String(value);
  if (result.length > 2000) throw new RangeError('Notes exceed the limit.');
  return result;
}

/**
 * @param {{obligationId:string|number,materialId?:string|number|null,amount:unknown,
 * fundingSource:string,paymentDate:string,idempotencyKey:string,notes?:string}} draft
 */
export function prepareSupplierSettlementRpc(draft) {
  if (!draft) throw new TypeError('Supplier settlement is required.');
  return Object.freeze({
    rpc: 'settle_supplier_credit_bill',
    params: Object.freeze({
      p_obligation_id: positiveId(draft.obligationId, 'Obligation'),
      p_material_id: draft.materialId == null ? null : positiveId(draft.materialId, 'Material'),
      p_payment_amount: decimal(draft.amount),
      p_funding_source: account(draft.fundingSource),
      p_payment_date: date(draft.paymentDate),
      p_idempotency_key: stableKey(draft.idempotencyKey),
      p_notes: note(draft.notes)
    })
  });
}

/**
 * @param {{loanId:string|number,principalAmount:unknown,interestAmount:unknown,
 * fundingSource:string,repaymentDate:string,idempotencyKey:string,notes?:string}} draft
 */
export function prepareLoanRepaymentRpc(draft) {
  if (!draft) throw new TypeError('Loan repayment is required.');
  const principal = decimal(draft.principalAmount, true);
  const interest = decimal(draft.interestAmount, true);
  if (moneyToPaise(principal) + moneyToPaise(interest) <= 0) {
    throw new RangeError('Principal and interest cannot both be zero.');
  }
  return Object.freeze({
    rpc: 'record_loan_repayment',
    params: Object.freeze({
      p_loan_id: positiveId(draft.loanId, 'Loan'),
      p_principal_amount: principal,
      p_interest_amount: interest,
      p_funding_source: account(draft.fundingSource),
      p_repayment_date: date(draft.repaymentDate),
      p_idempotency_key: stableKey(draft.idempotencyKey),
      p_notes: note(draft.notes)
    })
  });
}

/** Never calls the database until the separate Stage 2 approval switch is enabled.
 * The legacy global financial write gate remains permanently disabled, so
 * unsupported expense/material/attendance mutations cannot become active.

 * @param {{rpc:Function}} client
 * @param {{rpc:string,params:Record<string,unknown>}} command
 */
export async function submitStage2AtomicPayment(client, command) {
  if (!STAGE2_ATOMIC_PAYMENTS_ENABLED) {
    const error = new Error('Financial payments disabled pending Stage 2 migration approval.');
    Object.assign(error, { code: 'FINANCIAL_WRITES_DISABLED' });
    throw error;
  }
  if (!client || typeof client.rpc !== 'function') throw new TypeError('Supabase RPC client required.');
  if (!command || !['settle_supplier_credit_bill', 'record_loan_repayment'].includes(command.rpc)) {
    throw new TypeError('Unsupported atomic payment command.');
  }
  const result = await client.rpc(command.rpc, command.params);
  if (result?.error) throw result.error;
  if (!result?.data || result.data.success !== true) {
    throw new Error('Atomic payment did not return verified success.');
  }
  return result.data;
}
