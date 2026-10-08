<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let mbRecords = [];
  let loading = true;
  let showAddModal = false;

  let form = {
    work_desc: '',
    nos: 1,
    length: 10,
    breadth: 1,
    depth: 1,
    unit: 'Cum',
    rate: 450
  };

  onMount(async () => {
    await fetchMb();
  });

  async function fetchMb() {
    loading = true;
    const { data, error } = await supabase.from('contractor_mbook').select('*').order('id', { ascending: true });
    if (!error) {
      mbRecords = data || [];
    }
    loading = false;
  }

  $: grandTotal = mbRecords.reduce((sum, m) => sum + Number(m.amount || 0), 0);

  async function addMbItem() {
    if (!form.work_desc || !form.rate) {
      alert('దయచేసి పని వివరాలు మరియు రేటు నమోదు చేయండి.');
      return;
    }
    const qty = Number((Number(form.nos) * Number(form.length) * Number(form.breadth) * Number(form.depth)).toFixed(3));
    const amount = Math.round(qty * Number(form.rate));

    const { error } = await supabase.from('contractor_mbook').insert([{
      work_desc: form.work_desc,
      nos: Number(form.nos),
      length: Number(form.length),
      breadth: Number(form.breadth),
      depth: Number(form.depth),
      quantity: qty,
      unit: form.unit,
      rate: Number(form.rate),
      amount: amount
    }]);

    if (!error) {
      showAddModal = false;
      form = { work_desc: '', nos: 1, length: 10, breadth: 1, depth: 1, unit: 'Cum', rate: 450 };
      await fetchMb();
    } else {
      alert('సేవ్ చేయడం విఫలమైంది: ' + error.message);
    }
  }

  async function deleteMbItem(id) {
    if (!confirm('ఈ కొలత రికార్డును తొలగించాలా?')) return;
    const { error } = await supabase.from('contractor_mbook').delete().eq('id', id);
    if (!error) {
      mbRecords = mbRecords.filter(m => m.id !== id);
    }
  }
</script>

<svelte:head>
  <title>సివిల్ M-Book | A.S.V. Contractor 360°</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-4">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← ప్రధాన డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">📐 PWD సివిల్ ఇంజనీరింగ్ Measurement Book (M-Book)</h1>
      </div>

      <div class="flex items-center gap-2">
        <button on:click={() => showAddModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition">
          ➕ కొలత చేర్చండి
        </button>
        <button on:click={() => window.print()} class="bg-slate-900 hover:bg-black text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition">
          🖨️ A4 ప్రింట్
        </button>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {#if loading}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">M-Book లోడ్ అవుతోంది...</div>
      {:else if mbRecords.length === 0}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">ప్రస్తుతం రికార్డులు ఏవీ లేవు. పైనున్న బటన్ నొక్కి కొలతలను నమోదు చేయండి.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-900 text-white uppercase text-[11px]">
                <th class="p-2.5">క్ర.సం</th>
                <th class="p-2.5">పని వివరాలు (Work Description)</th>
                <th class="p-2.5 text-center">Nos</th>
                <th class="p-2.5 text-center">పొడవు (L)</th>
                <th class="p-2.5 text-center">వెడల్పు (B)</th>
                <th class="p-2.5 text-center">లోతు/ఎత్తు (D)</th>
                <th class="p-2.5 text-right">పరిమాణం (Qty)</th>
                <th class="p-2.5 text-center">యూనిట్</th>
                <th class="p-2.5 text-right">రేటు (₹)</th>
                <th class="p-2.5 text-right">మొత్తం (₹)</th>
                <th class="p-2.5 text-center">చర్య</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each mbRecords as m, idx}
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                  <td class="p-2.5 font-bold text-slate-900">{m.work_desc}</td>
                  <td class="p-2.5 text-center font-mono">{m.nos}</td>
                  <td class="p-2.5 text-center font-mono">{m.length}</td>
                  <td class="p-2.5 text-center font-mono">{m.breadth}</td>
                  <td class="p-2.5 text-center font-mono">{m.depth}</td>
                  <td class="p-2.5 text-right font-mono font-bold text-amber-700">{m.quantity}</td>
                  <td class="p-2.5 text-center font-bold text-slate-500">{m.unit}</td>
                  <td class="p-2.5 text-right font-mono">₹ {m.rate}</td>
                  <td class="p-2.5 text-right font-mono font-black text-slate-900">₹ {Number(m.amount).toLocaleString('en-IN')}</td>
                  <td class="p-2.5 text-center">
                    <button on:click={() => deleteMbItem(m.id)} class="text-rose-500 font-bold hover:text-rose-700">✕</button>
                  </td>
                </tr>
              {/each}
            </tbody>
            <tfoot>
              <tr class="bg-amber-50 font-black text-sm border-t-2 border-amber-300">
                <td colspan="9" class="p-3 text-right font-['Ramabhadra']">మొత్తం MB వర్క్ విలువ (Grand Total):</td>
                <td class="p-3 text-right font-mono text-amber-900 text-base">₹ {grandTotal.toLocaleString('en-IN')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      {/if}
    </div>

  </div>
</div>

{#if showAddModal}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
    <div class="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">📐 కొత్త MB కొలత నమోదు</h3>
        <button on:click={() => showAddModal = false} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={addMbItem} class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-slate-700 mb-1">పని వివరాలు (Work Description) *</label>
          <input type="text" bind:value={form.work_desc} required placeholder="ఉదా: C.C. Road Bed Concrete" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
        </div>

        <div class="grid grid-cols-4 gap-2">
          <div>
            <label class="block font-bold text-slate-600 mb-1">Nos</label>
            <input type="number" step="any" bind:value={form.nos} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-center" />
          </div>
          <div>
            <label class="block font-bold text-slate-600 mb-1">పొడవు (L)</label>
            <input type="number" step="any" bind:value={form.length} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-center" />
          </div>
          <div>
            <label class="block font-bold text-slate-600 mb-1">వెడల్పు (B)</label>
            <input type="number" step="any" bind:value={form.breadth} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-center" />
          </div>
          <div>
            <label class="block font-bold text-slate-600 mb-1">లోతు (D)</label>
            <input type="number" step="any" bind:value={form.depth} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-center" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">యూనిట్</label>
            <select bind:value={form.unit} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
              <option value="Cum">Cum (ఘనపు మీటర్లు)</option>
              <option value="Sqm">Sqm (చదరపు మీటర్లు)</option>
              <option value="Sft">Sft (చదరపు అడుగులు)</option>
              <option value="Rft">Running Feet (Rft)</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">ధర (Rate per Unit - ₹) *</label>
            <input type="number" bind:value={form.rate} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
          </div>
        </div>

        <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs">
          సర్వర్‌లో సేవ్ చేయండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}