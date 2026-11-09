<script>
  import { onMount } from 'svelte';
  import { getPartyOptions,getPartyAccount } from '$lib/contractor/accounting.js';
  import { supabase } from '$lib/supabaseClient';
  import { readAllRows, dataErrorMessage, projectToday } from '$lib/contractor/data.js';
  import { runFinancialMutation, FINANCIAL_WRITES_ENABLED } from '$lib/contractor/financial-write-gate.js';

  let dataError = '';
  let mutationError = '';

  let transactions = [];
  let labourRecords = [];
  let profiles=[];
  let parties=[];
  let pieceworkRecords=[];
  let workerPaymentBatches=[];
  let selectedParty = '';
  let loading = true;

  onMount(() => { void fetchPartyData(); });

  async function fetchPartyData() {
    loading=true; dataError='';
    try {
      const [tx,labour,workers,suppliers,contracts,batches]=await Promise.all([
        readAllRows(supabase,'contractor_transactions',{orderBy:'date'}),
        readAllRows(supabase,'contractor_labour',{orderBy:'date'}),
        readAllRows(supabase,'contractor_labour_profiles'),
        readAllRows(supabase,'contractor_parties'),
        readAllRows(supabase,'contractor_piecework'),
        readAllRows(supabase,'contractor_worker_payments',{orderBy:'payment_date'})
      ]);
      transactions=tx; labourRecords=labour; profiles=workers; parties=suppliers;
      pieceworkRecords=contracts; workerPaymentBatches=batches;
    } catch(error) { dataError=dataErrorMessage(error); }
    finally { loading=false; }
  }

  $: partyData={transactions,labour:labourRecords,profiles,parties,piecework:pieceworkRecords};
  $: allParties=getPartyOptions(partyData);
  $: account=getPartyAccount(selectedParty,partyData);
  $: partyLabel=account.label || '';
  $: partyTx=account.transactions;
  $: partyLabour=account.labour;
  $: isWorker=account.type==='worker';
  $: supBilled=account.totalBilled;
  $: supPaid=account.totalPaid;
  $: supDue=account.totalDue;
  $: labTotalDays=account.totalDays;
  $: labTotalEarned=account.totalBilled;
  $: labAdvancePaid=account.totalPaid;
  $: selectedWorkerId=selectedParty.startsWith('worker:')?decodeURIComponent(selectedParty.slice(7)):'';
  $: workerHistory=workerPaymentBatches.filter(b=>b.worker_id===selectedWorkerId);
  $: labNetDue=account.totalDue;
  function shareWhatsApp() {
    let text = `*A.S.V. ENTERPRISES - వ్యక్తిగత ఖాతా నివేదిక*\n\n`;
    text += `పేరు: ${partyLabel}\n`;
    if (isWorker) {
      text += `హోదా: కూలీ / మేస్త్రి\n`;
      text += `మొత్తం పనిచేసిన రోజులు: ${labTotalDays} రోజులు\n`;
      text += `మొత్తం వేతనం: ₹ ${labTotalEarned.toLocaleString('en-IN')}\n`;
      text += `చెల్లించిన మొత్తం (Advance + Payments): ₹ ${labAdvancePaid.toLocaleString('en-IN')}\n`;
      text += `*మిగిలిన నికర బాకీ: ₹ ${labNetDue.toLocaleString('en-IN')}*\n`;
    } else {
      text += `హోదా: సప్లయర్ / ట్రేడర్\n`;
      text += `మొత్తం బిల్లు: ₹ ${supBilled.toLocaleString('en-IN')}\n`;
      text += `చెల్లించినది: ₹ ${supPaid.toLocaleString('en-IN')}\n`;
      text += `*మిగిలిన బాకీ: ₹ ${supDue.toLocaleString('en-IN')}*\n`;
    }
    text += `\nతేదీ: ${new Date().toLocaleDateString('te-IN')}\nముత్తారం సైట్, పెద్దపల్లి జిల్లా.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }
</script>

<svelte:head>
  <title>వ్యక్తిగత ఖాతా | A.S.V. Contractor 360°</title>
</svelte:head>
{#if dataError}
  <div role="alert" class="m-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">{dataError} <button type="button" on:click={fetchPartyData} class="ml-3 font-bold underline">మళ్లీ ప్రయత్నించండి</button></div>
{/if}
{#if mutationError}
  <p role="alert" class="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{mutationError}</p>
{/if}
{#if !dataError}


<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-4">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← కాంట్రాక్టర్ డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-lg font-black font-['Ramabhadra']">👤 వ్యక్తిగత ఖాతా నివేదిక (Party 360° & Labour Ledger)</h1>
      </div>

      <div class="flex items-center gap-2">
        <select bind:value={selectedParty} class="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold shadow-xs">
          <option value="">-- సప్లయర్ లేదా కూలీ / మేస్త్రిని ఎంచుకోండి --</option>
          {#each allParties as p}
            <option value={p.key}>{p.label}</option>
          {/each}
        </select>
        {#if selectedParty}
          <button on:click={shareWhatsApp} class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition cursor-pointer">
            📲 WhatsApp షేర్
          </button>
        {/if}
      </div>
    </div>

    {#if loading}
      <div class="py-16 text-center text-slate-400 font-bold text-xs">డేటా లోడ్ అవుతోంది...</div>
    {:else if !selectedParty}
      <div class="py-16 text-center text-slate-400 font-bold text-xs bg-white rounded-2xl border border-dashed">
        డ్రాప్‌డౌన్ నుండి సప్లయర్ లేదా కూలీ / మేస్త్రి పేరును ఎంచుకోండి.
      </div>
    {:else}
      {#if account.warnings.length > 0}<p class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">ఈ పాత రికార్డులకు శాశ్వత పార్టీ గుర్తింపు లేదా చెల్లింపు వివరాల నిర్ధారణ అవసరం.</p>{/if}
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span class="text-[10px] text-slate-500 font-bold uppercase block">{isWorker ? 'మొత్తం వేతనం (Total Earned)' : 'మొత్తం కొనుగోళ్లు / పని'}</span>
          <span class="text-lg font-black font-mono">₹ {(isWorker ? labTotalEarned : supBilled).toLocaleString('en-IN')}</span>
          {#if isWorker}
            <span class="text-[10.5px] text-indigo-600 block mt-0.5 font-bold">పనిచేసిన రోజులు: {labTotalDays}</span>
          {/if}
        </div>
        <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
          <span class="text-[10px] text-emerald-700 font-bold uppercase block">{isWorker ? 'చెల్లించిన మొత్తం (Advance + UPI/Bank/Cash)' : 'చెల్లించిన నగదు'}</span>
          <span class="text-lg font-black font-mono text-emerald-800">₹ {(isWorker ? labAdvancePaid : supPaid).toLocaleString('en-IN')}</span>
        </div>
        <div class="p-4 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm">
          <span class="text-[10px] text-rose-700 font-bold uppercase block">మిగిలిన నికర బాకీ (Net Due)</span>
          <span class="text-lg font-black font-mono text-rose-700">₹ {(isWorker ? labNetDue : supDue).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {#if isWorker}
        <section class="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-black">💸 Labour ID-wise Payment History (Installments)</h2>
            <a href="/admin/contractor/labour" class="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white">
              ₹ Worker Payment నమోదు
            </a>
          </div>
          {#if workerHistory.length===0}
            <p class="text-xs text-slate-500">ఈ Labour IDకి Worker-wise Payments ఇంకా నమోదు కాలేదు.</p>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full min-w-[450px] text-left text-xs">
                <thead><tr class="border-b bg-slate-100"><th class="p-2">Payment Date</th><th class="p-2">Mode</th><th class="p-2">UPI/Bank Ref</th><th class="p-2 text-right">మొత్తం</th></tr></thead>
                <tbody>
                  {#each workerHistory as batch}
                    <tr class="border-b">
                      <td class="p-2">{batch.payment_date}</td>
                      <td class="p-2 font-bold">{batch.funding_source}</td>
                      <td class="p-2">{batch.payment_reference || batch.voucher_no}</td>
                      <td class="p-2 text-right font-black">₹{Number(batch.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
          <p class="text-[11px] text-slate-600">ఒకే UPI Paymentను పలు Attendance తేదీలకు సర్దుబాటు చేసినా, పై పట్టికలో ఒక్క Paymentగా కనిపిస్తుంది. కింద Ledgerలో వాటి విడి Allocationలు ఉంటాయి.</p>
        </section>
      {/if}

      <!-- Labour Passbook Table -->
      {#if isWorker}
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-2">
          <div class="p-3 bg-slate-900 text-white text-xs font-bold">
            👷 {partyLabel} - రోజువారీ పనుల హాజరు & పేమెంట్ పాస్‌బుక్
          </div>
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-100 uppercase text-[11px] text-slate-700 border-b">
                <th class="p-2.5">తేదీ</th>
                <th class="p-2.5">పని రకం</th>
                <th class="p-2.5">చేసిన నిర్దిష్ట పని (Specific Work)</th>
                <th class="p-2.5 text-right">రోజువారీ రేటు</th>
                <th class="p-2.5 text-right">సంపాదన (₹)</th>
                <th class="p-2.5 text-right">అడ్వాన్స్ (₹)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each partyLabour as pl}
                <tr class="hover:bg-slate-50">
                  <td class="p-2.5 font-mono text-slate-500">{pl.date}</td>
                  <td class="p-2.5 font-bold text-slate-900">{pl.role}</td>
                  <td class="p-2.5 text-slate-700">{pl.work_task || 'సైట్ సివిల్ వర్క్'}</td>
                  <td class="p-2.5 text-right font-mono">₹ {pl.daily_rate}</td>
                  <td class="p-2.5 text-right font-mono font-bold">₹ {Number(pl.days * pl.daily_rate).toLocaleString('en-IN')}</td>
                  <td class="p-2.5 text-right font-mono text-emerald-700 font-bold">₹ {Number(pl.advance_paid || 0).toLocaleString('en-IN')}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <!-- Supplier Transactions Table -->
      {#if partyTx.length > 0}
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div class="p-3 bg-slate-800 text-white text-xs font-bold">
            📜 జనరల్ లెడ్జర్ రికార్డులు & పేమెంట్లు
          </div>
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-100 uppercase text-[11px] text-slate-700 border-b">
                <th class="p-2.5">తేదీ</th>
                <th class="p-2.5">వివరాలు</th>
                <th class="p-2.5">నగదు మార్గం</th>
                <th class="p-2.5 text-right">మొత్తం (₹)</th>
                <th class="p-2.5 text-right">స్టేటస్</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each partyTx as pt}
                <tr class="hover:bg-slate-50">
                  <td class="p-2.5 font-mono text-slate-500">{pt.date}</td>
                  <td class="p-2.5 font-bold">{pt.description}</td>
                  <td class="p-2.5 font-mono">{pt.source}</td>
                  <td class="p-2.5 text-right font-mono font-bold">₹ {Number(pt.amount).toLocaleString('en-IN')}</td>
                  <td class="p-2.5 text-right font-bold {pt.status === 'Due' ? 'text-rose-600' : 'text-emerald-600'}">
                    {pt.status === 'Due' ? `బాకీ: ₹ ${pt.balance}` : 'చెల్లించబడింది'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}

  </div>
</div>

{/if}
