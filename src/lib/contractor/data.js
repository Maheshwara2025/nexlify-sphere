/** Read complete, checked pages. Never display a silently truncated financial report. */
export const CONTRACTOR_TABLES = Object.freeze(['contractor_transactions','contractor_loans','contractor_labour_profiles','contractor_piecework','contractor_mbook','contractor_daily_works','contractor_labour','contractor_materials','contractor_parties']);
/** @param {import('@supabase/supabase-js').SupabaseClient} client @param {string} table @param {{orderBy?:string,ascending?:boolean,maxRows?:number}} [options] */
export async function readAllRows(client, table, options = {}) {
  if (!CONTRACTOR_TABLES.includes(table)) throw new Error('తెలియని డేటా విభాగం.');
  const {orderBy='id', ascending=false, maxRows=25000} = options;
  const rows = []; let expected = null;
  while (true) {
    let query = client.from(table).select('*', {count:'exact'}).order(orderBy, {ascending});
    if (orderBy !== 'id') query = query.order('id', {ascending:true});
    const result = await query.range(rows.length, rows.length + 499);
    if (result.error) throw new Error('డేటా లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి.', {cause:result.error});
    if (!Array.isArray(result.data) || !Number.isSafeInteger(result.count) || result.count < 0) throw new Error('పూర్తి రికార్డులు నిర్ధారించలేకపోయాం. మళ్లీ ప్రయత్నించండి.');
    if (expected === null) expected = result.count;
    if (expected !== result.count) throw new Error('రికార్డులు మారాయి. నివేదికను మళ్లీ లోడ్ చేయండి.');
    if (expected > maxRows) throw new Error('నివేదిక పరిమితి దాటింది. పూర్తి నివేదిక కోసం నిర్వాహకుడిని సంప్రదించండి.');
    if (rows.length < expected && result.data.length === 0) throw new Error('కొన్ని రికార్డులు అందలేదు. మళ్లీ ప్రయత్నించండి.');
    rows.push(...result.data);
    if (rows.length >= expected) {
      if (rows.length !== expected) throw new Error('రికార్డుల సంఖ్య సరిపోలలేదు. మళ్లీ ప్రయత్నించండి.');
      const ids = rows.map(row => row.id);
      if (ids.some(id => id === null || id === undefined) || new Set(ids).size !== ids.length) throw new Error('రికార్డుల క్రమం మారింది. మళ్లీ లోడ్ చేయండి.');
      return rows;
    }
  }
}
/** @param {unknown} error */
export function dataErrorMessage(error) { return error instanceof Error ? error.message : 'డేటా లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి.'; }
/** Local date for the Indian project; avoids UTC changing the selected day. */
export function projectToday() { return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
