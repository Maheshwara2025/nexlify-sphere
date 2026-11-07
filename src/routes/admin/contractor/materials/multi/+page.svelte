<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { readAllRows, projectToday } from '$lib/contractor/data.js';
  import { MATERIAL_TYPES, CUSTOM_UNITS, newMaterialLine, billTotals, lineAmount, prepareMultiItemBill } from '$lib/contractor/material-catalog.js';

  let suppliers = [];
  let form = { date: projectToday(), supplier_name: '', supplier_phone: '', bill_number: '',
    payment_mode: 'Credit', advance_paid: 0, advance_source: 'Cash', transport_cost: 0, bill_photo: '' };
  let items = [newMaterialLine('CEMENT')];
  let saving = false;
  let imageLoading = false;
  let error = '';
  let requestKey = '';
  let requestFingerprint = '';
  $: totals = billTotals(items, form.transport_cost);

  onMount(async () => {
    try {
      suppliers = (await readAllRows(supabase, 'contractor_parties')).filter(p => p.party_type === 'Supplier');
    } catch { error = 'సప్లయర్ల జాబితా లోడ్ కాలేదు. పేజీ Refresh చేయండి.'; }
  });

  function chooseSupplier(event) {
    const selected = suppliers.find(p => p.id === Number(event.currentTarget.value));
    if (selected) {
      form.supplier_name = selected.name;
      form.supplier_phone = selected.phone || '';
    }
  }
  function addItem() { if (items.length < 40) items = [...items, newMaterialLine('ROD_6MM')]; }
  function removeItem(index) { if (items.length > 1) items = items.filter((_, i) => i !== index); }
  function onTypeChange(item) {
    const type = MATERIAL_TYPES.find(t => t.code === item.code);
    if (type && type.code !== 'OTHER') item.unit = type.unit;
    items = [...items];
  }
  function loadReceiptPhoto(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10*1024*1024) {
      error = '10MB లోపు JPG, PNG లేదా WebP ఫోటోను ఎంచుకోండి.'; return;
    }
    imageLoading = true; error = '';
    const reader = new FileReader();
    reader.onerror = () => { imageLoading = false; error = 'ఫోటో చదవడం సాధ్యం కాలేదు.'; };
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => { imageLoading = false; error = 'ఫోటో సరిగా లేదు.'; };
      img.onload = () => {
        try {
          const scale = Math.min(1, 850/img.width, 1100/img.height);
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(img.width*scale));
          cv.height = Math.max(1, Math.round(img.height*scale));
          const ctx = cv.getContext('2d');
          if (!ctx) throw new Error('చిత్రం సిద్ధం చేయలేకపోయాం.');
          ctx.drawImage(img,0,0,cv.width,cv.height);
          const encoded = cv.toDataURL('image/jpeg',0.64);
          if (encoded.length > 1900000) throw new Error('ఫోటో చాలా పెద్దగా ఉంది. చిన్న ఫోటో ఎంచుకోండి.');
          form.bill_photo = encoded;
        } catch (err) { error = err?.message || 'ఫోటో సేవ్ కాలేదు.'; }
        finally { imageLoading = false; }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }
  async function saveBill() {
    if (saving || imageLoading) return;
    saving = true; error = '';
    try {
      const payload = prepareMultiItemBill({ ...form, items },projectToday());
      const fingerprint = JSON.stringify(payload);
      if (!requestKey || fingerprint !== requestFingerprint) {
        requestKey = 'asv_multi_' + crypto.randomUUID().replaceAll('-','');
        requestFingerprint = fingerprint;
      }
      const { data, error: rpcError } = await supabase.rpc('contractor_post_material_bill_v1',{
        p_payload:payload, p_idempotency_key:requestKey
      });
      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error('Database నుంచి బిల్లు సేవ్ నిర్ధారణ రాలేదు.');
      requestKey = ''; requestFingerprint = '';
      await goto('/admin/contractor/materials/suppliers');
    } catch (err) {
      const msg = err?.message || 'బిల్లు సేవ్ కాలేదు.';
      error = /BILL_ALREADY_ENTERED|purchase_bill_supplier_invoice_unique/i.test(msg)
        ? 'ఈ సప్లయర్ Invoice Number ఇప్పటికే నమోదైంది (Already Entered).' : msg;
    } finally { saving = false; }
  }
</script>

<svelte:head><title>Multi-Item Purchase Bill | A.S.V. BuildTrack</title></svelte:head>
<div class="min-h-screen bg-slate-50 p-3 sm:p-6 text-slate-900">
 <div class="mx-auto max-w-6xl space-y-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
   <div>
    <a href="/admin/contractor/materials" class="text-sm font-bold text-indigo-700 hover:underline">← మెటీరియల్స్‌కు తిరిగి</a>
    <h1 class="mt-2 text-xl sm:text-2xl font-black">🧾 Multi-Item Material Purchase Bill</h1>
    <p class="mt-1 text-sm text-slate-600">ఒకే బిల్లు · అనేక సరుకులు · ఒకే Supplier Credit Due</p>
   </div>
   <a href="/admin/contractor/materials/suppliers" class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">Supplier Bill 360°</a>
  </div>
  {#if error}<p role="alert" class="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>{/if}
  <form on:submit|preventDefault={saveBill} class="space-y-4">
   <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
    <h2 class="text-lg font-black">1. సప్లయర్ & బిల్లు వివరాలు</h2>
    {#if suppliers.length}
      <label class="block text-xs font-bold">ఇప్పటికే ఉన్న Supplier (Optional)
       <select on:change={chooseSupplier} class="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-sm">
        <option value="">కొత్త Supplier / స్వయంగా నమోదు</option>
        {#each suppliers as supplier}<option value={supplier.id}>{supplier.name} · {supplier.phone||'ఫోన్ లేదు'}</option>{/each}
       </select>
      </label>
    {/if}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
     <label class="text-xs font-bold">సప్లయర్ పేరు *
      <input class="mt-1 block w-full rounded-lg border p-3 text-sm" type="text" bind:value={form.supplier_name} maxlength="150" required placeholder="MITRA IRON HARDWARE"/>
     </label>
     <label class="text-xs font-bold">ఫోన్ నంబర్
      <input class="mt-1 block w-full rounded-lg border p-3 text-sm" type="tel" bind:value={form.supplier_phone} placeholder="10-digit mobile"/>
     </label>
     <label class="text-xs font-bold">కొనుగోలు తేదీ *
      <input class="mt-1 block w-full rounded-lg border p-3 text-sm" type="date" max={projectToday()} bind:value={form.date} required/>
     </label>
     <label class="text-xs font-bold">సప్లయర్ బిల్లు నంబర్ (ఉంటే)
      <input class="mt-1 block w-full rounded-lg border p-3 text-sm" type="text" bind:value={form.bill_number} maxlength="100" placeholder="Invoice No. / Estimate Ref."/>
     </label>
    </div>
   </section>
   <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3">
     <div><h2 class="text-lg font-black">2. మెటీరియల్స్</h2><p class="text-xs text-slate-600">ప్రతి సైజును వేరే లైన్‌లో నమోదు చేయండి.</p></div>
     <button type="button" on:click={addItem} disabled={items.length>=40} class="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">＋ Add Item</button>
    </div>
    {#each items as item,i}
     <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
      <div class="flex items-center justify-between">
       <strong class="text-sm">Item #{i+1}</strong>
       <button type="button" disabled={items.length===1} on:click={() => removeItem(i)} class="rounded-lg px-2 py-1 text-sm font-bold text-red-700 disabled:opacity-30">✕ తీసివేయు</button>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-12">
       <label class="text-xs font-bold sm:col-span-4">మెటీరియల్ *
        <select class="mt-1 block w-full rounded-lg border bg-white p-3 text-sm" bind:value={item.code} on:change={() => onTypeChange(item)}>
         {#each MATERIAL_TYPES as type}<option value={type.code}>{type.label}</option>{/each}
        </select>
       </label>
       {#if item.code==='OTHER'}
        <label class="text-xs font-bold sm:col-span-3">మెటీరియల్ పేరు *
         <input class="mt-1 block w-full rounded-lg border p-3 text-sm" bind:value={item.label} maxlength="70" required/>
        </label>
        <label class="text-xs font-bold sm:col-span-2">Unit *
         <select class="mt-1 w-full rounded-lg border bg-white p-3 text-sm" bind:value={item.unit}>
          {#each CUSTOM_UNITS as unit}<option value={unit}>{unit}</option>{/each}
         </select>
        </label>
       {/if}
       <label class="text-xs font-bold {item.code==='OTHER'?'sm:col-span-1':'sm:col-span-3'}">Qty *
        <input type="number" step="0.001" min="0.001" required bind:value={item.quantity} class="mt-1 block w-full rounded-lg border p-3 text-sm"/>
       </label>
       <label class="text-xs font-bold {item.code==='OTHER'?'sm:col-span-2':'sm:col-span-3'}">Rate ₹ *
        <input type="number" min="0" step="0.01" required bind:value={item.unit_rate} class="mt-1 block w-full rounded-lg border p-3 text-sm"/>
       </label>
       {#if item.code!=='OTHER'}
        <span class="flex items-end pb-3 text-xs font-bold text-slate-500 sm:col-span-2">{MATERIAL_TYPES.find(t=>t.code===item.code)?.unit}</span>
       {/if}
      </div>
      <div class="text-right text-sm font-black">మొత్తం ₹{lineAmount(item).toLocaleString('en-IN')}</div>
     </div>
    {/each}
    <div class="grid gap-3 sm:grid-cols-2">
     <label class="text-xs font-bold">రవాణా ఛార్జీలు ₹ (ఒక బిల్లుకు ఒక్కసారి)
      <input type="number" min="0" step="0.01" bind:value={form.transport_cost} class="mt-1 block w-full rounded-lg border p-3 text-sm"/>
     </label>
     <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-right">
      <p class="text-xs text-amber-900">Items ₹{totals.itemsTotal.toLocaleString('en-IN')} + Transport ₹{totals.transport.toLocaleString('en-IN')}</p>
      <p class="mt-1 text-xl font-black text-amber-950">Grand Total ₹{totals.grandTotal.toLocaleString('en-IN')}</p>
     </div>
    </div>
   </section>
   <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-sm">
    <h2 class="text-lg font-black">3. చెల్లింపు & బిల్లు ఫోటో</h2>
    <div class="grid gap-3 sm:grid-cols-2">
     <label class="text-xs font-bold">చెల్లింపు విధానం
      <select bind:value={form.payment_mode} class="mt-1 block w-full rounded-lg border bg-white p-3 text-sm">
       <option value="Credit">Credit / బాకీ</option><option value="Cash">Cash / నగదు</option>
       <option value="Bank">Bank</option><option value="UPI">UPI</option>
      </select>
     </label>
     {#if form.payment_mode==='Credit'}
      <label class="text-xs font-bold">ఇప్పటికే చెల్లించిన అడ్వాన్స్ ₹
       <input type="number" min="0" step="0.01" bind:value={form.advance_paid} class="mt-1 block w-full rounded-lg border p-3 text-sm"/>
      </label>
     {/if}
     {#if form.payment_mode==='Credit' && Number(form.advance_paid)>0}
      <label class="text-xs font-bold">అడ్వాన్స్ చెల్లింపు ఖాతా
       <select bind:value={form.advance_source} class="mt-1 block w-full rounded-lg border bg-white p-3 text-sm">
        <option value="Cash">Cash</option><option value="Bank">Bank</option><option value="UPI">UPI</option>
       </select>
      </label>
     {/if}
    </div>
    <label class="block text-xs font-bold">📷 బిల్లు / రసీదు ఫోటో (Optional)
     <input type="file" accept="image/jpeg,image/png,image/webp" on:change={loadReceiptPhoto}
       class="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-sm"/>
    </label>
    {#if imageLoading}<p class="text-xs text-amber-700">ఫోటో సిద్ధమవుతోంది...</p>{/if}
    {#if form.bill_photo}
     <div><img src={form.bill_photo} alt="బిల్లు ఫోటో ప్రివ్యూ" class="max-h-44 rounded-lg border object-contain"/>
      <button type="button" on:click={() => form.bill_photo = ''} class="mt-1 text-xs font-bold text-red-700">ఫోటో తీసివేయండి</button>
     </div>
    {/if}
    <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-medium text-indigo-900">
     ఒకే సప్లయర్ బిల్లుకు ఒకే Credit Due ఉంటుంది. ఒకే బిల్లును మరోసారి నమోదు చేయకండి.
     గతంలో నమోదైన MITRA IRON HARDWARE ఎంట్రీలను తిరిగి తీసుకురాలేదు.
    </div>
    <button type="submit" disabled={saving||imageLoading||totals.grandTotal<=0}
      class="w-full rounded-xl bg-amber-500 py-4 text-base font-black text-slate-900 disabled:opacity-50">
      {saving?'సేవ్ అవుతోంది…':'బిల్లు సేవ్ చేయండి →'}
    </button>
   </section>
  </form>
 </div>
</div>
