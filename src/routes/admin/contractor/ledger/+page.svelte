<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let transactions = [];
  let loading = true;
  let searchQuery = '';
  let filterCategory = 'ALL';
  let filterSource = 'ALL';
  let previewPhotoUrl = null;

  onMount(async () => {
    await fetchLedger();
  });

  async function fetchLedger() {
    loading = true;
    const { data, error } = await supabase
      .from('contractor_transactions')
      .select('*')
      .order('date', { ascending: false });

    if (!error) {
      transactions = data || [];
    }
    loading = false;
  }

  $: filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    const matchQ = !q || (t.description && t.description.toLowerCase().includes(q)) || (t.recipient && t.recipient.toLowerCase().includes(q));
    const matchCat = filterCategory === 'ALL' || t.category === filterCategory;
    const matchSrc = filterSource === 'ALL' || t.source === filterSource;
    return matchQ && matchCat && matchSrc;
  });

  async function deleteTx(id) {
    if (!confirm('ఈ లావాదేవీని సర్వర్ నుండి తొలగించాలా?')) return;
    const { error } = await supabase.from('contractor_transactions').delete().eq('id', id);
    if (!error) {
      transactions = transactions.filter(t => t.id !== id);
    } else {
      alert('తొలగించడం విఫలమైంది: ' + error.message);
    }
  }

  function exportCSV() {
    let csv = 'ID,Date,Category,Description,Source,Recipient,Amount,Status\n';
    filteredTransactions.forEach(t => {
      csv += `"${t.id}","${t.date}","${t.category}","${t.description}","${t.source}","${t.recipient}","${t.amount}","${t.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Ledger_${Date.now()}.csv`;
    link.click();
  }
</script>

<svelte:head>
  <title>సైట్ లెడ్జర్ | A.S.V. Contractor 360°</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-4">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← ప్రధాన డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">📜 పూర్తి సైట్ లెడ్జర్ & మనీ ఫ్లో (Cash Flow Ledger)</h1>
      </div>

      <div class="flex items-center gap-2">
        <button on:click={exportCSV} class="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition">
          📥 Excel ఎక్స్‌పోర్ట్
        </button>
        <button on:click={() => window.print()} class="bg-slate-900 hover:bg-black text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition">
          🖨️ ప్రింట్
        </button>
      </div>
    </div>

    <!-- Filters Panel -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="వివరణ లేదా వ్యక్తి పేరు వెతకండి..."
        class="border border-slate-200 bg-white rounded-xl p-2.5 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />

      <select bind:value={filterCategory} class="border border-slate-200 bg-white rounded-xl p-2.5 font-bold shadow-sm">
        <option value="ALL">అన్ని కేటగిరీలు (All Categories)</option>
        <option value="Money In">Money In (ఇన్‌ఫ్లో)</option>
        <option value="Materials">Materials (మెటీరియల్స్)</option>
        <option value="Labour">Labour (కూలీలు)</option>
        <option value="Centring">Centring (సెంట్రింగ్)</option>
        <option value="Transport">Transport (ట్రాన్స్‌పోర్ట్/JCB)</option>
        <option value="General">General (ఇతర ఖర్చులు)</option>
      </select>

      <select bind:value={filterSource} class="border border-slate-200 bg-white rounded-xl p-2.5 font-bold shadow-sm">
        <option value="ALL">అన్ని పేమెంట్ మార్గాలు (All Sources)</option>
        <option value="Cash">Cash in Hand (చేతి నగదు)</option>
        <option value="Bank">Bank Netbanking</option>
        <option value="UPI">UPI (PhonePe / GPay)</option>
        <option value="Credit">Credit / ఉధార్ (బాకీ)</option>
      </select>
    </div>

    <!-- Ledger Table -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {#if loading}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">డేటా లోడ్ అవుతోంది...</div>
      {:else if filteredTransactions.length === 0}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">ఎలాంటి లావాదేవీలు కనుగొనబడలేదు.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-900 text-white uppercase text-[11px]">
                <th class="p-3">తేదీ</th>
                <th class="p-3">కేటగిరీ</th>
                <th class="p-3">వివరణ</th>
                <th class="p-3">నగదు మార్గం</th>
                <th class="p-3">గ్రహీత</th>
                <th class="p-3 text-right">మొత్తం (₹)</th>
                <th class="p-3 text-right">స్టేటస్</th>
                <th class="p-3 text-center">రశీదు</th>
                <th class="p-3 text-center">చర్య</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each filteredTransactions as t}
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3 font-mono text-slate-500">{t.date}</td>
                  <td class="p-3