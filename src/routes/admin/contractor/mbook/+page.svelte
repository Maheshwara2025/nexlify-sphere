<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let mbookRecords = [];
  let loading = true;
  let showModal = false;

  let form = {
    work_category: 'Brick Masonry', // 'RCC Pillar', 'PCC Bed', 'Brick Masonry', 'Earthwork'
    description: 'కాంపౌండ్ వాల్ ఇటుకల కట్టడం (9-inch Brick Wall)',
    nos: 1,
    length: 50, // in meters
    breadth: 0.23, // 9 inches = 0.23m
    depth: 1.8, // 6 feet height = 1.8m
    unit: 'Cum',
    rate: 3500
  };

  // 1. Total Volume in Cubic Meters
  $: volume = Number(form.nos || 1) * Number(form.length || 0) * Number(form.breadth || 0) * Number(form.depth || 0);
  $: totalAmount = volume * Number(form.rate || 0);

  // 2. Civil Engineering Material Estimations
  // Brick Estimation: ~500 bricks per Cum of 9" brick masonry with mortar
  $: estBricks = form.work_category === 'Brick Masonry' ? Math.round(volume * 500) : 0;

  // Cement Estimation:
  // - RCC Pillar (M20): ~8.2 bags per Cum
  // - PCC Bed (1:4:8): ~3.4 bags per Cum
  // - Brickwork (1:6): ~1.4 bags per Cum
  $: estCement = form.work_category === 'RCC Pillar' ? Math.round(volume * 8.2) :
                 (form.work_category === 'PCC Bed' ? Math.round(volume * 3.4) :
                 (form.work_category === 'Brick Masonry' ? Math.round(volume * 1.4) : 0));

  // Sand Estimation: ~0.45 to 0.5 Cum per Cum
  $: estSand = Math.round((volume * 0.45) * 10) / 10;

  // Metal Estimation: For RCC & PCC ~0.9 Cum per Cum
  $: estMetal = (form.work_category === 'RCC Pillar' || form.work_category === 'PCC Bed') ? Math.round((volume * 0.85) * 10) / 10 : 0;

  // Steel / Rod Estimation: RCC Columns have ~80 kg to 100 kg steel per Cum
  $: estSteel = form.work_category === 'RCC Pillar' ? Math.round(volume * 90) : 0;

  onMount(async () => {
    await fetchMbook();
  });

  async function fetchMbook() {
    loading = true;
    const { data } = await supabase.from('contractor_mbook').select('*').order('id', { ascending: false });
    mbookRecords = data ? data : [];
    loading = false;
  }

  function onCategoryChange() {
    if (form.work_category === 'RCC Pillar') {
      form.description = 'ప్రహరీ గోడ పిల్లర్లు కాంక్రీట్ & స్టీల్ కాస్టింగ్ (RCC Columns)';
      form.breadth = 0.3; // 1 foot = 0.3m
      form.depth = 2.4; // 8 feet = 2.4m
      form.rate = 5500;
    } else if (form.work_category === 'PCC Bed') {
      form.description = 'పునాది బెడ్ కాంక్రీట్ (P.C.C. 1:4:8 Bed Concrete)';
      form.breadth = 0.9;
      form.depth = 0.15;
      form.rate = 3200;
    } else if (form.work_category === 'Brick Masonry') {
      form.description = 'ప్రహరీ గోడ ఇటుకల కట్టడం (Brick Masonry in CM 1:6)';
      form.breadth = 0.23;
      form.depth = 1.8;
      form.rate = 3800;
    } else {
      form.description = 'పునాది మట్టి తవ్వకం (Earthwork Excavation)';
      form.breadth = 0.9;
      form.depth = 1.0;
      form.rate = 220;
    }
  }

  async function saveMbook() {
    if (!form.description || !form.rate) {
      alert('Dayachesi vivaralu mariyu rate enter cheyandi.');
      return;
    }

    const { error } = await supabase.from('contractor_mbook').insert([{
      work_category: form.work_category,
      description: form.description,
      nos: Number(form.nos),
      length: Number(form.length),
      breadth: Number(form.breadth),
      depth: Number(form.depth),
      unit: form.unit,
      rate: Number(form.rate),
      total_qty: volume,
      total_amount: totalAmount,
      est_cement_bags: estCement,
      est_sand_tons: estSand,
      est_metal_tons: estMetal,
      est_steel_kg: estSteel,
      est_bricks: estBricks
    }]);

    if (!error) {
      showModal = false;
      await fetchMbook();
    } else {
      alert('Error: ' + error.message);
    }
  }

  async function deleteMbook(id) {
    if (!confirm('Ee M-Book record ni tholaginchala?')) return;
    const { error } = await supabase.from('contractor_mbook').delete().eq('id', id);
    if (!error) {
      mbookRecords = mbookRecords.filter(m => m.id !== id);
    }
  }
</script>

<svelte:head>
  <title>సివిల్ M-Book & మెటీరియల్ ఎస్టిమేషన్ | A.S.V. Contractor 360°</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-4">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← ప్రధాన డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">📐 PWD సివిల్ M-Book & లైవ్ మెటీరియల్ ఎస్టిమేషన్</h1>
        <p class="text-xs text-slate-500">పిల్లర్లు, బెడ్ కాంక్రీట్, ఇటుకల సంఖ్య, సిమెంట్ బస్తాలు, ఇసుక & రాడ్ల కొలతల ఆటోమేటిక్ లెక్కింపు</p>
      </div>

      <button on:click={() => showModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition cursor-pointer">
        ➕ కొత్త MB కొలత నమోదు
      </button>
    </div>

    <!-- M-Book Table -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {#if loading}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">లోడ్ అవుతోంది...</div>
      {:else if mbookRecords.length === 0}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">ప్రస్తుతం ఎలాంటి M-Book రికార్డులు లేవు.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-900 text-white uppercase text-[11px]">
                <th class="p-3">పని వివరాలు</th>
                <th class="p-3 text-center">Nos</th>
                <th class="p-3 text-center">L (మీ)</th>
                <th class="p-3 text-center">B (మీ)</th>
                <th class="p-3 text-center">D/H (మీ)</th>
                <th class="p-3 text-right">వాల్యూమ్ (Cum)</th>
                <th class="p-3 text-right">మొత్తం బిల్లు (₹)</th>
                <th class="p-3 bg-slate-800 text-amber-300">అవసరమైన మెటీరియల్స్ (Estimations)</th>
                <th class="p-3 text-center">చర్య</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each mbookRecords as m}
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3 font-bold text-slate-900">
                    <span class="block text-[10px] text-amber-700">{m.work_category}</span>
                    {m.description}
                  </td>
                  <td class="p-3 text-center font-mono">{m.nos}</td>
                  <td class="p-3 text-center font-mono">{m.length}</td>
                  <td class="p-3 text-center font-mono">{m.breadth}</td>
                  <td class="p-3 text-center font-mono">{m.depth}</td>
                  <td class="p-3 text-right font-mono font-bold text-indigo-700">{Number(m.total_qty).toFixed(2)} {m.unit}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">₹ {Number(m.total_amount).toLocaleString('en-IN')}</td>
                  <td class="p-3 bg-amber-50/50 font-mono text-[11px] leading-relaxed">
                    {#if m.est_bricks > 0}
                      <span class="font-bold text-rose-800">🧱 {m.est_bricks.toLocaleString('en-IN')} ఇటుకలు</span><br/>
                    {/if}
                    {#if m.est_cement_bags > 0}
                      <span class="font-bold text-slate-900">📦 {m.est_cement_bags} సిమెంట్ బస్తాలు</span><br/>
                    {/if}
                    {#if m.est_steel_kg > 0}
                      <span class="font-bold text-blue-900">🔩 {m.est_steel_kg} Kg స్టీల్/రాడ్లు</span><br/>
                    {/if}
                    {#if m.est_sand_tons > 0}
                      <span class="text-amber-900">⏳ {m.est_sand_tons} Cum ఇసుక</span>
                    {/if}
                  </td>
                  <td class="p-3 text-center">
                    <button on:click={() => deleteMbook(m.id)} class="text-rose-500 font-bold hover:text-rose-700">✕</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

  </div>
</div>

<!-- Modal -->
{#if showModal}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
    <div class="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-xs max-h-[94vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">📐 కొత్త MB కొలత & మెటీరియల్ కాలిక్యులేటర్</h3>
        <button on:click={() => showModal = false} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={saveMbook} class="space-y-3">
        <div>
          <label class="block font-bold text-slate-700 mb-1">పని విభాగం (Civil Category) *</label>
          <select bind:value={form.work_category} on:change={onCategoryChange} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
            <option value="Brick Masonry">🧱 ప్రహరీ గోడ ఇటుకల కట్టడం (Brick Masonry)</option>
            <option value="RCC Pillar">🏛️ ప్రహరీ గోడ పిల్లర్లు (RCC Pillar Columns)</option>
            <option value="PCC Bed">🏗️ పునాది బెడ్ కాంక్రీట్ (P.C.C. Bed Concrete)</option>
            <option value="Earthwork">⛏️ పునాది తవ్వకం (Earthwork Excavation)</option>
          </select>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">పని వివరణ (Work Description) *</label>
          <input type="text" bind:value={form.description} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
        </div>

        <div class="grid grid-cols-4 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">సంఖ్య (Nos)</label>
            <input type="number" bind:value={form.nos} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">పొడవు (L)</label>
            <input type="number" step="any" bind:value={form.length} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">వెడల్పు (B)</label>
            <input type="number" step="any" bind:value={form.breadth} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">ఎత్తు/లోతు (D)</label>
            <input type="number" step="any" bind:value={form.depth} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">యూనిట్</label>
            <input type="text" bind:value={form.unit} readonly class="w-full bg-slate-100 border border-slate-300 rounded-xl p-2 font-bold font-mono" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">ధర (Rate per Cum - ₹) *</label>
            <input type="number" step="any" bind:value={form.rate} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
        </div>

        <!-- LIVE MATERIAL ESTIMATION BOX -->
        <div class="p-3 bg-amber-50 border border-amber-300 rounded-2xl space-y-1.5">
          <div class="flex justify-between items-center font-black text-amber-950">
            <span>వాల్యూమ్: {volume.toFixed(2)} Cum</span>
            <span class="text-sm font-mono">బిల్లు: ₹ {totalAmount.toLocaleString('en-IN')}</span>
          </div>
          <div class="border-t border-amber-200 pt-1.5 text-[11px] font-bold space-y-0.5">
            <span class="text-slate-600 block text-[10px] uppercase">ఈ కొలతకు అవసరమైన మెటీరియల్స్ (Auto Estimated):</span>
            {#if estBricks > 0}
              <div class="text-rose-700">🧱 అవసరమైన ఇటుకలు: <strong>{estBricks.toLocaleString('en-IN')}</strong> సంఖ్య</div>
            {/if}
            {#if estCement > 0}
              <div class="text-slate-900">📦 అవసరమైన సిమెంట్: <strong>{estCement} బస్తాలు</strong></div>
            {/if}
            {#if estSteel > 0}
              <div class="text-blue-900">🔩 అవసరమైన స్టీల్/రాడ్లు: <strong>~{estSteel} Kg</strong></div>
            {/if}
            {#if estSand > 0}
              <div class="text-amber-900">⏳ అవసరమైన ఇసుక: <strong>~{estSand} Cum</strong></div>
            {/if}
          </div>
        </div>

        <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition cursor-pointer">
          M-Book లో సేవ్ చేయండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}