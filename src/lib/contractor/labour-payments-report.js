/**
 * Read-only, verified-owner Labour Payment Register for LBR-007…LBR-017.
 * One row per real bank/UPI/cash transfer, not per attendance allocation.
 */
export const LABOUR_REPORT_IDS=Object.freeze(
  Array.from({length:11},(_,i)=>'LBR-'+String(i+7).padStart(3,'0'))
);
const money=v=>Math.round((Number(v)||0)*100)/100;

export function labourPaymentRegister(data={}){
  const allowed=new Set(LABOUR_REPORT_IDS);
  const profiles=data.profiles||[];
  const attendance=data.attendance||[];
  const transactions=data.transactions||[];
  const workerPayments=data.workerPayments||[];
  const profileMap=new Map(profiles.filter(p=>allowed.has(p.worker_id)).map(p=>[p.worker_id,p]));
  const workerAttendance=attendance.filter(a=>allowed.has(a.worker_id));
  const attendanceById=new Map(workerAttendance.map(a=>[String(a.id),a]));
  const linkedTx=transactions.filter(t=>
    ['labour_payment','labour_advance'].includes(t.entry_type)&&
    attendanceById.has(String(t.labour_id))
  );
  const paidByAttendance=new Map();
  for(const tx of linkedTx){
    if(tx.entry_type==='labour_payment'){
      const key=String(tx.labour_id);
      paidByAttendance.set(key,money((paidByAttendance.get(key)||0)+Number(tx.amount||0)));
    }
  }
  const rows=LABOUR_REPORT_IDS.map(workerId=>{
    const worker=workerAttendance.filter(a=>a.worker_id===workerId);
    const earned=money(worker.reduce((s,a)=>s+Number(a.days||0)*Number(a.daily_rate||0),0));
    const advance=money(worker.reduce((s,a)=>s+Number(a.advance_paid||0),0));
    const wagePayments=money(worker.reduce((s,a)=>s+Number(paidByAttendance.get(String(a.id))||0),0));
    const due=money(worker.reduce((s,a)=>s+
      Math.max(0,Number(a.days||0)*Number(a.daily_rate||0)-
        Number(a.advance_paid||0)-Number(paidByAttendance.get(String(a.id))||0)),0));
    return {workerId,name:profileMap.get(workerId)?.name||
      worker[0]?.worker_name||'ప్రొఫైల్ లేదు',
      attendanceCount:worker.length,earned,advance,wagePayments,
      paid:money(advance+wagePayments),due};
  });
  const totals={
    earned:money(rows.reduce((s,r)=>s+r.earned,0)),
    advance:money(rows.reduce((s,r)=>s+r.advance,0)),
    wagePayments:money(rows.reduce((s,r)=>s+r.wagePayments,0)),
    paid:money(rows.reduce((s,r)=>s+r.paid,0)),
    due:money(rows.reduce((s,r)=>s+r.due,0))
  };

  // Worker payment headers are the source of truth for a single transfer,
  // even when the backend allocates it across several attendance days.
  const headers=workerPayments.filter(h=>allowed.has(h.worker_id));
  const assignedVoucherPrefixes=headers.map(h=>String(h.voucher_no||'')).filter(Boolean);
  const history=headers.map(h=>({
    id:'batch:'+String(h.id),
    workerId:h.worker_id,
    name:profileMap.get(h.worker_id)?.name||h.worker_id,
    date:String(h.payment_date||''),
    amount:money(h.amount),
    source:h.funding_source||'—',
    reference:h.payment_reference||'',
    voucher:h.voucher_no||'',
    kind:'Worker Payment',
    allocations:Number(h.allocations_count||0),
    notes:h.notes||''
  }));
  // Legacy daily payments / advances have no worker payment header.
  // Exclude new split allocations by their voucher prefix to avoid double counting.
  for(const tx of linkedTx){
    const invoice=String(tx.invoice_no||'');
    if(assignedVoucherPrefixes.some(prefix=>invoice.startsWith(prefix+'-')))continue;
    const workerId=attendanceById.get(String(tx.labour_id)).worker_id;
    history.push({
      id:'legacy:'+String(tx.id),workerId,
      name:profileMap.get(workerId)?.name||attendanceById.get(String(tx.labour_id))?.worker_name||workerId,
      date:String(tx.date||''),
      amount:money(tx.amount),
      source:tx.source||'—',
      reference:'',
      voucher:invoice,
      kind:tx.entry_type==='labour_advance'?'Advance':'Daily Payment',
      allocations:1,notes:tx.description||''
    });
  }
  history.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  return {rows,totals,history,historyAmount:money(history.reduce((s,h)=>s+h.amount,0))};
}
function escapeCsvCell(value){
  const original=String(value??'');
  // Never open untrusted worker or note text as a formula in Excel/Sheets.
  const text=/^[\s]*[=+@\-\t\r]/.test(original)?"'"+original:original;
  return '"'+text.replaceAll('"','""')+'"';
}
export function labourPaymentCsv(history=[]){
  const heading=['Labour ID','Worker Name','Payment Date','Payment Type','Mode','Amount (INR)','UPI/Bank Reference','Voucher','Notes'];
  const data=history.map(h=>[
    h.workerId,h.name,h.date,h.kind,h.source,
    Number(h.amount).toFixed(2),h.reference,h.voucher,h.notes
  ]);
  return [heading,...data].map(row=>row.map(escapeCsvCell).join(',')).join('\r\n');
}
export function labourBalanceCsv(rows=[]){
  const header=['Labour ID','Worker Name','Attendance Days/Records','Earned (INR)','Advances (INR)','Wage Payments (INR)','Total Paid (INR)','Due (INR)'];
  return [header,...rows.map(r=>[
    r.workerId,r.name,r.attendanceCount,
    Number(r.earned).toFixed(2),Number(r.advance).toFixed(2),
    Number(r.wagePayments).toFixed(2),Number(r.paid).toFixed(2),Number(r.due).toFixed(2)
  ])].map(row=>row.map(escapeCsvCell).join(',')).join('\r\n');
}
