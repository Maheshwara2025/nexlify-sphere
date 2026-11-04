/** @param {unknown} value */
export function csvCell(value) { let text=String(value??''); if (/^[\s\uFEFF]*[=+@-]/u.test(text)) text="'"+text; return '"'+text.replaceAll('"','""')+'"'; }
/** @param {Array<Record<string,unknown>>} rows */
export function ledgerCsv(rows) { const keys=['id','date','category','description','source','recipient','amount','status']; return 'ID,Date,Category,Description,Source,Recipient,Amount,Status\r\n'+rows.map(row=>keys.map(key=>csvCell(row[key])).join(',')).join('\r\n'); }
