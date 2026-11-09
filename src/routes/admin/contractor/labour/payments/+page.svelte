<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { readAllRows, dataErrorMessage, projectToday } from '$lib/contractor/data.js';
  import { labourPaymentRegister, labourPaymentCsv, labourBalanceCsv } from '$lib/contractor/labour-payments-report.js';

  let report=null;
  let loading=true;
  let error='';
  let workerFilter='ALL';
  let modeFilter='ALL';
  let fromDate='';
  let toDate='';
  $: workerRows = report?.rows||[];
  $: paymentHistory = report?.history||[];
  $: visiblePayments = paymentHistory.filter(p=>
    (workerFilter==='ALL'||p.workerId===workerFilter) &&
    (modeFilter==='ALL'||p.source===modeFilter) &&
    (!fromDate||p.date>=fromDate) &&
    (!toDate||p.date<=toDate)
  );
  $: filteredTotal=Math.round(visiblePayments.reduce((sum,p)=>sum+Number(p.amount||0),0)*100)/100;

  onMount(()=>{void refresh();});
  async function refresh(){
    loading=true; error='';
    try{
      const [profiles,attendance,transactions,workerPayments]=await Promise.all([
        readAllRows(supabase,'contractor_labour_profiles',{ascending:true}),
        readAllRows(supabase,'contractor_labour',{orderBy:'date'}),
        readAllRows(supabase,'contractor_transactions',{orderBy:'date'}),
        readAllRows(supabase,'contractor_worker_payments',{orderBy:'payment_date'})
      ]);
      report=labourPaymentRegister({profiles,attendance,transactions,workerPayments});
    }catch(e){
      error=dataErrorMessage(e);
      report=null;
    }finally{loading=false;}
  }

  function exportCsv(filename,contents){
    const blob=new Blob(['\ufeff'+contents],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=filename;
    document.body.appendChild(link);link.click();link.remove();
    URL.revokeObjectURL(url);
  }
  const money=value=>Number(value||0).toLocaleString('en-IN',{
    minimumFractionDigits:0,maximumFractionDigits:2
  });
  function clearFilters(){workerFilter='ALL';modeFilter='ALL';fromDate='';toDate='';}
</script>

<svelte:head>
 <title>LBR-007–017 Labour Payments Register | A.S.V. BuildTrack</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 p-3 text-slate-900 sm:p-6">
 <div class="mx-auto max-w-7xl space-y-5">
  <header class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4 print:border-0">
   <div>
    <a href="/admin/contractor/labour" class="text-xs font-bold text-indigo-700 hover:underline print:hidden">← Labour DBMS</a>
    <h1 class="mt-2 text-xl font-black sm:text-2xl">👷 Labour Payments Register</h1>
    <p class="text-sm font-semibold text-slate-600">LBR-007 నుంచి LBR-017 వరకు · 11 మంది కార్మికుల ఒకే ఖాతా నివేదిక</p>
    <p class="mt-1 text-xs text-slate-500">A.S.V. ENTERPRISES · నివేదిక చూసిన తేదీ: {projectToday()}</p>
   </div>
   <div class="flex flex-wrap gap-2 print:hidden">
    <a href="/admin/contractor/labour" class="rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-black text-white">₹ Payment నమోదు</a>
    <button type="button" on:click={refresh} disabled={loading}
      class="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold disabled:opacity-50">
      ↻ Refresh
    </button>
   </div>
  </header>

  {#if error}
    <p role="alert" class="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-900">{error} <button type="button" class="ml-2 underline" on:click={refresh}>మళ్లీ ప్రయత్నించండి</button></p>
  {:else if loading}
    <p role="status" class="rounded-xl bg-white p-6 text-sm font-bold text-slate-600">అన్ని Labour, Payment, Advance రికార్డులను పరిశీలిస్తున్నాం…</p>
  {:else if report}
    <section aria-label="All-time labour totals" class="space-y-2">
      <h2 class="text-base font-black">మొత్తం ఖాతా (All-time Summary)</h2>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
       <div class="rounded-xl border bg-white p-3 shadow-sm">
        <p class="text-[11px] font-bold text-slate-500">మొత్తం వేతనాలు</p>
        <p class="mt-1 text-lg font-black sm:text-xl">₹{money(report.totals.earned)}</p>
       </div>
       <div class="rounded-xl border bg-white p-3 shadow-sm">
        <p class="text-[11px] font-bold text-slate-500">వేతన Payments</p>
        <p class="mt-1 text-lg font-black text-indigo-700 sm:text-xl">₹{money(report.totals.wagePayments)}</p>
       </div>
       <div class="rounded-xl border bg-white p-3 shadow-sm">
        <p class="text-[11px] font-bold text-slate-500">Advances</p>
        <p class="mt-1 text-lg font-black text-amber-700 sm:text-xl">₹{money(report.totals.advance)}</p>
       </div>
       <div class="rounded-xl border bg-white p-3 shadow-sm">
        <p class="text-[11px] font-bold text-slate-500">మిగిలిన బాకీ</p>
        <p class="mt-1 text-lg font-black text-rose-700 sm:text-xl">₹{money(report.totals.due)}</p>
       </div>
      </div>
      <p class="text-[11px] text-slate-500">వేతన Payments + Advance = మొత్తం చెల్లింపులు ₹{money(report.totals.paid)}. ఇది 11 మంది మొత్తం ఖాతా; కింద Payment Date Filter ఎంచుకున్నా ఈ All-time Balance మారదు.</p>
    </section>

    <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
       <h2 class="text-base font-black">Labour ID-wise Accounts (LBR-007 → LBR-017)</h2>
       <button type="button" on:click={() => exportCsv('ASV-LBR007-017-balances.csv',labourBalanceCsv(workerRows))}
        class="rounded-lg border border-indigo-300 px-3 py-2 text-xs font-black text-indigo-800 print:hidden">⬇ Accounts CSV</button>
      </div>
      <div class="overflow-x-auto">
       <table class="w-full min-w-[700px] text-left text-xs">
        <thead class="bg-slate-900 text-white"><tr>
         <th scope="col" class="p-2.5">Labour ID</th><th scope="col" class="p-2.5">పేరు</th>
         <th scope="col" class="p-2.5 text-right">వేతనం</th><th scope="col" class="p-2.5 text-right">Advance</th>
         <th scope="col" class="p-2.5 text-right">Payments</th><th scope="col" class="p-2.5 text-right">బాకీ</th>
         <th scope="col" class="p-2.5 print:hidden">వివరాలు</th>
        </tr></thead>
        <tbody>
         {#each workerRows as r (r.workerId)}
          <tr class="border-b border-slate-100 even:bg-slate-50">
           <td class="p-2.5 font-mono font-black text-indigo-800">{r.workerId}</td>
           <td class="p-2.5 font-bold">{r.name}</td>
           <td class="p-2.5 text-right">₹{money(r.earned)}</td>
           <td class="p-2.5 text-right">₹{money(r.advance)}</td>
           <td class="p-2.5 text-right font-bold text-emerald-800">₹{money(r.wagePayments)}</td>
           <td class="p-2.5 text-right font-black text-rose-700">₹{money(r.due)}</td>
           <td class="p-2.5 print:hidden">
            <button type="button" class="font-black text-indigo-700 underline"
              on:click={() => {workerFilter=r.workerId;modeFilter='ALL';fromDate='';toDate='';}}>
              Payments చూడు
            </button>
           </td>
          </tr>
         {/each}
        </tbody>
        <tfoot class="bg-indigo-50 font-black"><tr>
         <td colspan="2" class="p-2.5">మొత్తం (11 Labour IDs)</td>
         <td class="p-2.5 text-right">₹{money(report.totals.earned)}</td>
         <td class="p-2.5 text-right">₹{money(report.totals.advance)}</td>
         <td class="p-2.5 text-right">₹{money(report.totals.wagePayments)}</td>
         <td class="p-2.5 text-right">₹{money(report.totals.due)}</td>
         <td class="print:hidden"></td>
        </tr></tfoot>
       </table>
      </div>
    </section>

    <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
     <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
       <h2 class="text-base font-black">💸 Payments History — ఒకే పట్టిక</h2>
       <p class="text-xs text-slate-500">ఒకే UPI Voucher పలు Attendance రోజులకు సర్దుబాటు అయినా ఇక్కడ ఒక్కసారి మాత్రమే చూపిస్తుంది.</p>
      </div>
      <div class="flex flex-wrap gap-2 print:hidden">
       <button type="button" on:click={() => exportCsv('ASV-LBR007-017-payments.csv',labourPaymentCsv(visiblePayments))}
        class="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white">⬇ Payments CSV</button>
       <button type="button" on:click={() => window.print()}
        class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black">🖨 Print / PDF</button>
      </div>
     </div>
     <div class="grid gap-3 sm:grid-cols-4 print:hidden">
      <label class="text-xs font-bold">Labour ID
       <select class="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5"
        bind:value={workerFilter}>
        <option value="ALL">అందరూ (LBR-007–017)</option>
        {#each workerRows as row (row.workerId)}
         <option value={row.workerId}>{row.workerId} — {row.name}</option>
        {/each}
       </select>
      </label>
      <label class="text-xs font-bold">Payment Mode
       <select class="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5"
        bind:value={modeFilter}>
        <option value="ALL">Cash + Bank + UPI</option>
        <option value="UPI">UPI మాత్రమే</option>
        <option value="Bank">Bank మాత్రమే</option>
        <option value="Cash">Cash మాత్రమే</option>
       </select>
      </label>
      <label class="text-xs font-bold">నుంచి (Payment Date)
       <input type="date" class="mt-1 block w-full rounded-lg border border-slate-300 p-2.5"
        bind:value={fromDate} max={projectToday()}/>
      </label>
      <label class="text-xs font-bold">వరకు (Payment Date)
       <input type="date" class="mt-1 block w-full rounded-lg border border-slate-300 p-2.5"
        bind:value={toDate} max={projectToday()}/>
      </label>
     </div>
     <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 p-3">
      <p class="text-xs font-bold text-emerald-900">ఎంచుకున్న Payments: {visiblePayments.length} · మొత్తం ₹{money(filteredTotal)}</p>
      <button type="button" on:click={clearFilters} class="text-xs font-black text-indigo-700 underline print:hidden">Filter తొలగించు</button>
     </div>
     {#if fromDate && toDate && fromDate>toDate}
      <p role="alert" class="rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-900">From Date, To Date కంటే పెద్దగా ఉంది. తేదీలను సరిచేయండి.</p>
     {/if}
     <div class="overflow-x-auto">
      <table class="w-full min-w-[760px] text-left text-xs">
       <thead class="bg-slate-900 text-white"><tr>
        <th scope="col" class="p-2.5">Payment Date</th><th scope="col" class="p-2.5">Labour ID / పేరు</th>
        <th scope="col" class="p-2.5">రకం</th><th scope="col" class="p-2.5">Mode</th>
        <th scope="col" class="p-2.5 text-right">Amount</th><th scope="col" class="p-2.5">UPI Ref / Voucher</th>
       </tr></thead>
       <tbody>
        {#each visiblePayments as p (p.id)}
         <tr class="border-b border-slate-100 even:bg-slate-50">
          <td class="p-2.5 font-mono">{p.date}</td>
          <td class="p-2.5"><span class="font-mono font-black text-indigo-700">{p.workerId}</span> · {p.name}</td>
          <td class="p-2.5">{p.kind}</td>
          <td class="p-2.5 font-bold">{p.source}</td>
          <td class="p-2.5 text-right font-black">₹{money(p.amount)}</td>
          <td class="break-all p-2.5 text-[11px]">{p.reference||p.voucher||'—'}</td>
         </tr>
        {:else}
         <tr><td colspan="6" class="p-6 text-center text-slate-500">ఈ Filterకు Payment Records లేవు.</td></tr>
        {/each}
       </tbody>
      </table>
     </div>
     <p class="text-[11px] text-slate-500">Payment Historyలో “Worker Payment” ఒకే నిజమైన బదిలీ; Attendance Allocationsను మళ్లీ కలపలేదు. పాత Daily Payment/Advanceకు Batch Voucher లేకుంటే అవి వేరుగా కనిపిస్తాయి. ఈ నివేదిక Read-only — కొత్త బ్యాంక్ ట్రాన్స్‌ఫర్ జరగదు.</p>
    </section>
  {/if}
 </div>
</div>
