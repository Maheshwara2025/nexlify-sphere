/**
 * Stage 3 isolated financial entry adapter.
 * Server RPC owns the single PostgreSQL transaction, authorization,
 * idempotency and linked ledger records. NEVER post separate browser writes.
 */
export const STAGE3_ATOMIC_ENTRIES_ENABLED = true;

export const STAGE3_OPERATIONS = Object.freeze([
  'expense','receipt','transfer','material_purchase','loan_create',
  'worker_profile','attendance','piecework','labour_payment','piecework_payment',
  'site_diary'
]);
const allowed = new Set(STAGE3_OPERATIONS);

/** @param {unknown} value */
const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * One poster per Svelte component. On a failed request, a second submit of
 * the identical payload keeps its original idempotency key (safe retry).
 * Editing the form starts a new request with a new key.
 *
 * @param {{rpc: (name:string,params:Record<string,unknown>)=>Promise<any>}} client
 * @param {()=>string} [newKey] injected only for unit tests.
 */
export function createAtomicEntryPoster(client,newKey=()=>{
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('Cryptographic random UUID generation is required.');
  }
  return 'asv_'+crypto.randomUUID().replaceAll('-','');
}) {
  /** @type {Map<string,{fingerprint:string,key:string}>} */
  const pending = new Map();

  return async function submit(operation,payload) {
    if (!STAGE3_ATOMIC_ENTRIES_ENABLED) {
      throw Object.assign(
        new Error('Atomic financial entries are disabled until Stage 3 migration approval.'),
        {code:'FINANCIAL_WRITES_DISABLED'}
      );
    }
    if (!allowed.has(operation)) throw new TypeError('Unsupported financial operation.');
    if (!payload || typeof payload!=='object' || Array.isArray(payload)) {
      throw new TypeError('Financial entry must be a form object.');
    }
    if (!client || typeof client.rpc!=='function') throw new TypeError('Supabase RPC client required.');
    const normalized=clone(payload);
    const fingerprint=JSON.stringify(normalized);
    let request=pending.get(operation);
    if (!request || request.fingerprint!==fingerprint) {
      request={fingerprint,key:newKey()};
      if(!/^[A-Za-z0-9_-]{16,128}$/.test(request.key)){
        throw new TypeError('Invalid idempotency key.');
      }
      pending.set(operation,request);
    }
    const {data,error}=await client.rpc('contractor_post_entry_v1',{
      p_operation:operation,
      p_payload:normalized,
      p_idempotency_key:request.key
    });
    if(error)throw error;
    if(!data || data.success!==true)throw new Error('Database did not confirm atomic entry success.');
    pending.delete(operation);
    return data;
  };
}
