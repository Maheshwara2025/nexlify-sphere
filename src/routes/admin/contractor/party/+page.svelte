<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let transactions = [];
  let selectedParty = '';
  let loading = true;

  onMount(async () => {
    const { data } = await supabase.from('contractor_transactions').select('*').order('date', { ascending: false });
    transactions = data || [];
    loading = false;
  });

  $: parties = Array.from(new Set(transactions.map(t => t.recipient).filter(Boolean))).sort();
  $: partyTx = transactions.filter(t => t.recipient === selectedParty);$: totalBilled = partyTx.reduce((s, t) => s + Number(t.amount || 0), 0);
  $: totalPaid = partyTx.filter(t => t.status === 'Paid').reduce((s, t) => s + Number(t.amount || 0), 0);$: balanceDue = partyTx.filter(t => t.status === 'Due').reduce((s, t) => s + Number(t.balance || t.amount || 0), 0);

  function shareWhatsApp() {
    const text = `*A.S.V. ENTERPRISES - పార్టీ ఖాతా నివేదిక*\n\nవ్యక్తి/సప్లయర్: ${selectedParty}\nమొత్తం బిల్లు: ₹ ${totalBilled.toLocaleString('en-IN')}\nచెల్లించినది: ₹ ${totalPaid.toLocaleString('en-IN')}\n*మిగిలిన నికర బాకీ: ₹ ${balanceDue.toLocaleString('en-IN')}*\n\nతేదీ: ${new Date().toLocaleDateString('te-IN')}\nముత్తారం, పెద్దపల్లి జిల్లా.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }
</script>

<svelte:head>
  <title>పార్టీ లెడ్జర్ | A.S.V. Contractor 360°</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-4">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← కాంట్రాక్టర్ డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-lg font-black font-['Ramabhadra']">👤 వ్యక్తిగత ఖాతా నివేదిక (Party 360°)</h1>
      </div>

      <div class="flex items-center gap-2">
        <select bind:value={selectedParty} class="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold">
          <option value="">-- సప్లయర్ / కూలీని ఎంచుకోండి --</option>
          {#each parties as p}
            <option value={p}>{p}</option>
          {/each}
        </select>
        {#if selectedParty}
          <button on:click={shareWhatsApp} class="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
            📲 WhatsApp షేర్
          </button>
        {/if}
      </div>
    </div>

    {#if loading}
      <div class="py-16 text-center text-slate-400 font-bold text-xs">డేటా లోడ్ అవుతోంది...</div>
    {:else if !selectedParty}
      <div class="py-16 text-center text-slate-400 font-bold text-xs bg-white rounded-2xl border border-dashed">
        డ్రాప్‌డౌన్ నుండి సప్లయర్ లేదా వ్యక్తి పేరును ఎంచుకోండి.
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span class="text-[10px] text-slate-500 font-bold uppercase block">మొత్తం కొనుగోళ్లు / పని</span>
          <span class="text-lg font-black font-mono">₹ {totalBilled.toLocaleString('en-IN')}</span>
        </div>
        <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
          <span class="text-[10px] text-emerald-700 font-bold uppercase block">చెల్లించిన నగదు</span>
          <span class="text-lg font-black font-mono text-emerald-800">₹ {totalPaid.toLocaleString('en-IN')}</span>
        </div>
        <div class="p-4 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm">
          <span class="text-[10px] text-rose-700 font-bold uppercase block">మిగిలిన నికర బాకీ</span>
          <span class="text-lg font-black font-mono text-rose-700">₹ {balanceDue.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="bg-slate-900 text-white uppercase text-[11px]">
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

  </div>
</div>
