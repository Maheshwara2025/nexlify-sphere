<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let materials = [];
  let parties = [];
  let loading = true;
  let showModal = false;
  let previewPhoto = null;

  let form = {
    date: new Date().toISOString().split('T')[0],
    party_name: '',
    material_name: 'సిమెంట్ (Cement)',
    quantity: 50,
    unit: 'బస్తాలు (Bags)',
    unit_rate: 380,
    transport_cost: 1500,
    payment_mode: 'Credit',
    bill_photo: ''
  };

  // Safe math calculations without any symbol errors
  $: q = form.quantity ? Number(form.quantity) : 0;
  $: r = form.unit_rate ? Number(form.unit_rate) : 0;
  $: t = form.transport_cost ? Number(form.transport_cost) : 0;
  $: materialCost = q * r;
  $: calculatedTotal = materialCost + t;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    const { data: matData } = await supabase.from('contractor_materials').select('*').order('date', { ascending: false });
    materials = matData ? matData : [];

    const { data: partyData } = await supabase.from('contractor_parties').select('name').eq('party_type', 'Supplier');
    parties = partyData ? partyData.map(p => p.name) : [];

    loading = false;
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_W = 900;
        let w = img.width;
        let h = img.height;
        if (w > MAX_W) {
          h = Math.round((h * MAX_W) / w);
          w = MAX_W;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        form.bill_photo = canvas.toDataURL('image/jpeg', 0.8);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function saveMaterial() {
    if (!form.party_name) {
      alert('Dayachesi supplier peru enter cheyandi.');
      return;
    }
    if (!form.quantity) {
      alert('Dayachesi parimanam (quantity) enter cheyandi.');
      return;
    }
    if (!form.unit_rate) {
      alert('Dayachesi rate enter cheyandi.');
      return;
    }

    const total = calculatedTotal;
    const isCredit = form.payment_mode === 'Credit';
    const paid = isCredit ? 0 : total;
    const bal = isCredit ? total : 0;

    // 1. Insert Material Record
    const { error: matErr } = await supabase.from('contractor_materials').insert([{
      date: form.date,
      party_name: form.party_name,
      material_name: form.material_name,
      quantity: Number(form.quantity),
      unit: form.unit,
      unit_rate: Number(form.unit_rate),
      transport_cost: form.transport_cost ? Number(form.transport_cost) : 0,
      total_amount: total,
      paid_amount: paid,
      balance_amount: bal,
      payment_mode: form.payment_mode,
      bill_photo: form.bill_photo
    }]);

    // 2. Link directly to main transactions & Supplier Ledger
    await supabase.from('contractor_transactions').insert([{
      date: form.date,
      category: 'Materials',
      description: `${form.quantity} ${form.unit} ${form.material_name} (Kirayi: Rs.${form.transport_cost ? form.transport_cost : 0})`,
      amount: total,
      source: form.payment_mode,
      recipient: form.party_name,
      balance: bal,
      status: isCredit ? 'Due' : 'Paid',
      photo_url: form.bill_photo
    }]);

    if (!matErr) {
      showModal = false;
      form = {
        date: new Date().toISOString().split('T')[0],
        party_name: '',
        material_name: 'సిమెంట్ (Cement)',
        quantity: 50,
        unit: 'బస్తాలు (Bags)',
        unit_rate: 380,
        transport_cost: 1500,
        payment_mode: 'Credit',
        bill_photo: ''
      };
      await loadData();
    } else {
      alert('Save cheyadam fail ayindi: ' + matErr.message);
    }
  }
</script>

<svelte:head>
  <title>మెటీరియల్స్ కొనుగోళ్లు | A.S.V. Contractor 360°</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-4">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← ప్రధాన డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">🧱 సైట్ మెటీరియల్స్ & రవాణా ఖర్చుల రిజిస్టర్</h1>
      </div>

      <button on:click={() => showModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition">
        ➕ మెటీరియల్ కొనుగోలు నమోదు
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {#if loading}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">లోడ్ అవుతోంది...</div>
      {:else if materials.length === 0}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">ప్రస్తుతం ఎలాంటి మెటీరియల్ రికార్డులు లేవు.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-900 text-white uppercase text-[11px]">
                <th class="p-3">తేదీ</th>
                <th class="p-3">మెటీరియల్</th>
                <th class="p-3">సప్లయర్</th>
                <th class="p-3 text-right">పరిమాణం</th>
                <th class="p-3 text-right">రేటు (₹)</th>
                <th class="p-3 text-right">కిరాయి (₹)</th>
                <th class="p-3 text-right">మొత్తం బిల్లు (₹)</th>
                <th class="p-3 text-right">స్టేటస్</th>
                <th class="p-3 text-center">బిల్లు ఫోటో</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each materials as m}
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3 font-mono text-slate-500">{m.date}</td>
                  <td class="p-3 font-bold text-slate-900">{m.material_name}</td>
                  <td class="p-3 font-bold text-blue-800">{m.party_name}</td>
                  <td class="p-3 text-right font-mono">{m.quantity} {m.unit}</td>
                  <td class="p-3 text-right font-mono">₹ {m.unit_rate}</td>
                  <td class="p-3 text-right font-mono">₹ {m.transport_cost}</td>
                  <td class="p-3 text-right font-mono font-black text-slate-900">₹ {Number(m.total_amount).toLocaleString('en-IN')}</td>
                  <td class="p-3 text-right font-bold {m.balance_amount > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                    {m.balance_amount > 0 ? `బాకీ: ₹${m.balance_amount}` : 'చెల్లించబడింది'}
                  </td>
                  <td class="p-3 text-center">
                    {#if m.bill_photo}
                      <button on:click={() => previewPhoto = m.bill_photo} class="text-blue-600 font-bold hover:underline">
                        📷 బిల్లు
                      </button>
                    {:else}
                      <span class="text-slate-300">-</span>
                    {/if}
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
    <div class="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto text-xs">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">🧱 కొత్త మెటీరియల్ కొనుగోలు</h3>
        <button on:click={() => showModal = false} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={saveMaterial} class="space-y-3">
        <div>
          <label class="block font-bold text-slate-700 mb-1">సప్లయర్ పేరు (ఖాతా) *</label>
          <input type="text" list="party-list" bind:value={form.party_name} required placeholder="ఉదా: శ్రీనివాస సిమెంట్ ట్రేడర్స్" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
          <datalist id="party-list">
            {#each parties as p}
              <option value={p}></option>
            {/each}
          </datalist>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">మెటీరియల్ రకం</label>
            <select bind:value={form.material_name} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
              <option value="సిమెంట్ (Cement)">సిమెంట్ (Cement)</option>
              <option value="ఇసుక (Sand)">ఇసుక (Sand)</option>
              <option value="స్టీల్ రాడ్లు (TMT Steel)">స్టీల్ రాడ్లు (TMT Steel)</option>
              <option value="కంకర (20mm Metal)">కంకర (20mm Metal)</option>
              <option value="ఇటుకలు (Bricks)">ఇటుకలు (Bricks)</option>
              <option value="తాగునీటి ట్యాంకర్ (Water)">తాగునీటి ట్యాంకర్ (Water)</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">తేదీ</label>
            <input type="date" bind:value={form.date} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">పరిమాణం (Qty) *</label>
            <input type="number" step="any" bind:value={form.quantity} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">యూనిట్</label>
            <select bind:value={form.unit} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
              <option value="బస్తాలు (Bags)">బస్తాలు (Bags)</option>
              <option value="టన్నులు (Tons)">టన్నులు (Tons)</option>
              <option value="టిప్పర్లు (Tippers)">టిప్పర్లు (Tippers)</option>
              <option value="ట్రాక్టర్లు (Tractors)">ట్రాక్టర్లు (Tractors)</option>
              <option value="ట్రిప్పులు (Trips)">ట్రిప్పులు (Trips)</option>
              <option value="సంఖ్య (Nos)">సంఖ్య (Nos)</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">ధర / రేటు (₹) *</label>
            <input type="number" step="any" bind:value={form.unit_rate} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">రవాణా / కిరాయి ఖర్చు (Transport ₹)</label>
            <input type="number" bind:value={form.transport_cost} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">చెల్లింపు విధానం</label>
            <select bind:value={form.payment_mode} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
              <option value="Credit">ఉధార్ / బాకీ (Credit Due)</option>
              <option value="Cash">నగదు (Cash in Hand)</option>
              <option value="Bank">బ్యాంక్ / ఆన్‌లైన్ (Bank/UPI)</option>
            </select>
          </div>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center font-bold">
          <span class="text-amber-900">మొత్తం బిల్లు (ఆటోమేటిక్):</span>
          <span class="text-base text-amber-950 font-mono font-black">₹ {calculatedTotal.toLocaleString('en-IN')}</span>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">బిల్లు / చలాన్ రశీదు ఫోటో తీయండి</label>
          <input type="file" accept="image/*" capture="environment" on:change={handlePhotoUpload} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-500" />
        </div>

        <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition">
          ఖాతాలో నమోదు చేయండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}

{#if previewPhoto}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-lg w-full p-3 space-y-2">
      <div class="flex justify-between items-center border-b pb-1">
        <span class="text-xs font-bold text-slate-700">బిల్లు రశీదు</span>
        <button on:click={() => previewPhoto = null} class="font-bold">✕</button>
      </div>
      <img src={previewPhoto} alt="Bill" class="w-full max-h-[75vh] object-contain rounded-xl bg-slate-100" />
    </div>
  </div>
{/if}