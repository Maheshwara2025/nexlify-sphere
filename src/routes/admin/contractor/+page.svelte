<script>
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let authChecking = true;

  // Active Tab Management
  let activeTab = 'gd'; // 'gd', 'dashboard', 'stock', 'cashbook', 'mbook', 'gst'

  // Projects State
  let projects = [];
  let selectedProjectId = null;
  let loadingProjects = true;

  // GD Form Inputs (Single Master Entry)
  let entry_date = new Date().toISOString().split('T')[0];
  let entry_category = 'Material_Inward';
  let material_name = 'సిమెంట్ బస్తాలు';
  let material_qty = '';
  let material_unit = 'బస్తాలు';
  let party_name = '';
  let total_amount = '';
  let paid_amount = '';
  let payment_mode = 'Cash';
  let masons_count = '';
  let labour_count = '';
  let work_progress_desc = '';
  let gst_invoice_no = '';

  /** @type {File | null} */
  let sitePhotoFile = null;
  let sitePhotoPreview = null;
  /** @type {File | null} */
  let billPhotoFile = null;
  let billPhotoPreview = null;
  let isSubmitting = false;
  let statusMsg = '';
  let statusType = '';

  // Dashboard & Records State
  let gdEntries = [];
  let materialStock = [];
  let vendorDues = [];
  let cashbookRecords = [];
  let mbookRecords = [];
  let gstRecords = [];

  // M-Book Form
  let mb_item_desc = 'CRS రాతి కట్టడం / ఇటుకల గోడ';
  let mb_length = '';
  let mb_breadth = '';
  let mb_depth = '';
  let mb_unit = 'Cu.M';
  let mb_rate = '';
  let mb_remarks = '';

  // GST Form
  let gst_vendor_name = '';
  let gst_vendor_gstin = '';
  let gst_inv_no = '';
  let gst_taxable = '';
  let gst_rate = 18;
  let gst_bill_file = null;

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
      return;
    }
    authChecking = false;
    await loadProjects();
  });

  async function loadProjects() {
    loadingProjects = true;
    try {
      const { data, error } = await supabase
        .from('contractor_projects')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      projects = data || [];
      if (projects.length > 0 && !selectedProjectId) {
        selectedProjectId = projects[0].id;
      }
      if (selectedProjectId) {
        await refreshAllData();
      }
    } catch (e) {
      console.error('Projects load error:', e);
    } finally {
      loadingProjects = false;
    }
  }

  async function refreshAllData() {
    if (!selectedProjectId) return;
    try {
      // 1. GD Entries
      const { data: gd } = await supabase
        .from('contractor_gd_entries')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('id', { ascending: false });
      gdEntries = gd || [];

      // 2. Material Stock
      const { data: stock } = await supabase
        .from('contractor_material_stock')
        .select('*')
        .eq('project_id', selectedProjectId);
      materialStock = stock || [];

      // 3. Vendor Dues
      const { data: dues } = await supabase
        .from('contractor_vendor_dues')
        .select('*')
        .eq('project_id', selectedProjectId);
      vendorDues = dues || [];

      // 4. Cashbook
      const { data: cash } = await supabase
        .from('contractor_cashbook')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('id', { ascending: false });
      cashbookRecords = cash || [];

      // 5. M-Book
      const { data: mb } = await supabase
        .from('contractor_mbook')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('id', { ascending: false });
      mbookRecords = mb || [];

      // 6. GST
      const { data: gst } = await supabase
        .from('contractor_gst_vault')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('id', { ascending: false });
      gstRecords = gst || [];
    } catch (e) {
      console.error('Data refresh error:', e);
    }
  }

  // Summary Metrics
  $: totalCredits = cashbookRecords.filter(c => c.entry_type === 'Credit').reduce((s, c) => s + Number(c.amount || 0), 0);
  $: totalDebits = cashbookRecords.filter(c => c.entry_type === 'Debit').reduce((s, c) => s + Number(c.amount || 0), 0);
  $: cashInHand = totalCredits - totalDebits;
  $: totalPendingDues = vendorDues.reduce((s, v) => s + (Number(v.total_billed || 0) - Number(v.total_paid || 0)), 0);
  $: totalMBookValue = mbookRecords.reduce((s, m) => s + Number(m.total_cost || 0), 0);

  // File Upload Helper
  async function uploadContractorFile(file, folder) {
    const ext = file.name.split('.').pop();
    const cleanName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const { error } = await supabase.storage
      .from('contractor-files')
      .upload(cleanName, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('contractor-files').getPublicUrl(cleanName);
    return data.publicUrl;
  }

  function handleFile(e, type) {
    const target = /** @type {HTMLInputElement} */ (e.target);
    if (target.files && target.files[0]) {
      const f = target.files[0];
      if (type === 'site') {
        sitePhotoFile = f;
        sitePhotoPreview = URL.createObjectURL(f);
      } else if (type === 'bill') {
        billPhotoFile = f;
        billPhotoPreview = URL.createObjectURL(f);
      } else if (type === 'gst') {
        gst_bill_file = f;
      }
    }
  }

  // Submit GD Entry (Trigger automates related tables)
  async function handleGDEntrySubmit() {
    if (!selectedProjectId) {
      alert('Dayachesi mundhuga oka project ni select chesukondi!');
      return;
    }
    isSubmitting = true;
    statusMsg = '';

    try {
      let siteUrl = null;
      let billUrl = null;

      if (sitePhotoFile) {
        siteUrl = await uploadContractorFile(sitePhotoFile, 'site_progress');
      }
      if (billPhotoFile) {
        billUrl = await uploadContractorFile(billPhotoFile, 'bills');
      }

      const payload = {
        project_id: selectedProjectId,
        entry_date,
        entry_category,
        material_name: ['Material_Inward', 'Material_Used'].includes(entry_category) ? material_name : null,
        material_qty: material_qty ? Number(material_qty) : 0,
        material_unit: ['Material_Inward', 'Material_Used'].includes(entry_category) ? material_unit : null,
        party_name: party_name ? party_name.trim() : null,
        total_amount: total_amount ? Number(total_amount) : 0,
        paid_amount: paid_amount ? Number(paid_amount) : 0,
        payment_mode,
        masons_count: masons_count ? parseInt(masons_count) : 0,
        labour_count: labour_count ? parseInt(labour_count) : 0,
        work_progress_desc: work_progress_desc ? work_progress_desc.trim() : null,
        gst_invoice_no: gst_invoice_no ? gst_invoice_no.trim() : null,
        site_photo_url: siteUrl,
        receipt_photo_url: billUrl
      };

      const { error } = await supabase.from('contractor_gd_entries').insert([payload]);
      if (error) throw error;

      statusMsg = '✓ GD Entry safalanga record ayindi! Related tables auto-update ayyayi.';
      statusType = 'success';

      // Reset form
      material_qty = '';
      total_amount = '';
      paid_amount = '';
      work_progress_desc = '';
      sitePhotoFile = null;
      sitePhotoPreview = null;
      billPhotoFile = null;
      billPhotoPreview = null;
      masons_count = '';
      labour_count = '';

      await refreshAllData();
    } catch (err) {
      console.error('GD Submit error:', err);
      statusMsg = 'Lopam: ' + err.message;
      statusType = 'error';
    } finally {
      isSubmitting = false;
    }
  }

  // Submit M-Book
  async function handleMBookSubmit() {
    if (!selectedProjectId || !mb_item_desc) return;
    try {
      const { error } = await supabase.from('contractor_mbook').insert([{
        project_id: selectedProjectId,
        item_desc: mb_item_desc,
        length: Number(mb_length) || 0,
        breadth: Number(mb_breadth) || 0,
        depth: Number(mb_depth) || 0,
        unit: mb_unit,
        rate: Number(mb_rate) || 0,
        remarks: mb_remarks
      }]);
      if (error) throw error;
      mb_length = '';
      mb_breadth = '';
      mb_depth = '';
      mb_rate = '';
      mb_remarks = '';
      await refreshAllData();
      alert('M-Book Measurement record ayindi!');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  // Submit GST Bill
  async function handleGSTSubmit() {
    if (!selectedProjectId || !gst_vendor_name || !gst_taxable) return;
    try {
      let billUrl = null;
      if (gst_bill_file) {
        billUrl = await uploadContractorFile(gst_bill_file, 'gst_bills');
      }
      const taxable = Number(gst_taxable);
      const halfRate = (Number(gst_rate) || 18) / 2;
      const cgst = (taxable * halfRate) / 100;
      const sgst = cgst;
      const total = taxable + cgst + sgst;

      const { error } = await supabase.from('contractor_gst_vault').insert([{
        project_id: selectedProjectId,
        vendor_name: gst_vendor_name,
        vendor_gstin: gst_vendor_gstin,
        invoice_no: gst_inv_no || 'NA',
        taxable_value: taxable,
        gst_rate: Number(gst_rate),
        cgst_amount: cgst,
        sgst_amount: sgst,
        total_amount: total,
        bill_photo_url: billUrl
      }]);
      if (error) throw error;
      gst_vendor_name = '';
      gst_vendor_gstin = '';
      gst_inv_no = '';
      gst_taxable = '';
      gst_bill_file = null;
      await refreshAllData();
      alert('GST Invoice Vault lo save ayindi!');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  // WhatsApp 1-Click End of Day Report
  function sendWhatsAppDPR() {
    const selectedProj = projects.find(p => p.id === selectedProjectId);
    const todayEntries = gdEntries.filter(g => g.entry_date === entry_date);
    
    let text = `*🏗️ డైలీ వర్క్ ప్రోగ్రెస్ రిపోర్ట్ (DPR)*\n`;
    text += `📌 *ప్రాజెక్ట్:* ${selectedProj?.title || 'గ్రామ పంచాయతీ పని'}\n`;
    text += `📅 *తేదీ:* ${entry_date}\n`;
    text += `🏢 *కాంట్రాక్టర్:* A.S.V. Enterprises (GST: 36AMXPA2915K1ZR)\n\n`;

    text += `*ఈరోజు జరిగిన పనుల వివరాలు:*\n`;
    todayEntries.forEach((e, idx) => {
      text += `${idx + 1}. [${e.entry_category}] ${e.work_progress_desc || e.material_name || ''} - ₹${e.paid_amount || e.total_amount || 0}\n`;
    });

    text += `\n💵 *చేతిలో నిల్వ:* ₹${cashInHand.toLocaleString('en-IN')}`;
    text += `\n📦 *సైట్ స్టాక్ & ఫోటోలు ఆన్‌లైన్ లో అప్‌డేట్ అయ్యాయి.*`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }
</script>

<svelte:head>
  <title>A.S.V. Contractor 360° ERP | Site Manager</title>
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
    <div class="text-center space-y-3">
      <div class="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-400">సెక్యూరిటీ చెక్ అవుతోంది...</p>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-slate-100 font-sans pb-20 text-slate-900">
    
    <!-- Top Bar -->
    <header class="bg-slate-950 text-white px-4 py-3 sticky top-0 z-40 border-b-2 border-amber-500 shadow">
      <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center font-black text-base shadow">
            🏗️
          </div>
          <div>
            <h1 class="text-sm sm:text-base font-black tracking-wide text-white flex items-center gap-1.5">
              <span>A.S.V. కాంట్రాక్టర్ 360° ERP</span>
              <span class="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">PRO</span>
            </h1>
            <p class="text-[10px] text-slate-400">GST: 36AMXPA2915K1ZR • A.S.V. Enterprises</p>
          </div>
        </div>

        <!-- Project Switcher & Back -->
        <div class="flex items-center gap-2">
          <select
            bind:value={selectedProjectId}
            on:change={refreshAllData}
            class="bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold px-2.5 py-1.5 rounded-xl max-w-[200px] truncate"
          >
            {#each projects as p}
              <option value={p.id}>{p.title}</option>
            {/each}
          </select>

          <a href="/admin/news" class="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1.5 rounded-xl text-slate-300 font-bold border border-slate-700">
            ← న్యూస్ డెస్క్
          </a>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto p-3 sm:p-5 space-y-4">

      <!-- Navigation Tabs -->
      <div class="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto scrollbar-thin text-xs font-bold">
        <button
          type="button"
          on:click={() => activeTab = 'gd'}
          class="px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'gd' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>⚡ GD ఎంట్రీ (Master)</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'dashboard'}
          class="px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>📊 లైవ్ డాష్‌బోర్డ్</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'stock'}
          class="px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'stock' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>📦 మెటీరియల్ స్టాక్</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'cashbook'}
          class="px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'cashbook' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>💰 క్యాష్ & అప్పులు</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'mbook'}
          class="px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'mbook' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>📐 AE M-Book</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'gst'}
          class="px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'gst' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>🧾 GST వాల్ట్</span>
        </button>
      </div>

      <!-- TAB 1: GD (GENERAL DIARY) MASTER ENTRY -->
      {#if activeTab === 'gd'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-black text-slate-900 flex items-center gap-2">
                <span>⚡ GD (జనరల్ డైరీ) స్మార్ట్ సింగిల్ ఎంట్రీ</span>
              </h2>
              <p class="text-xs text-slate-500">ఇక్కడ ఎంట్రీ చేయగానే స్టాక్, క్యాష్‌బుక్, అప్పులు ఆటోమేటిక్‌గా అప్‌డేట్ అవుతాయి</p>
            </div>
            <button
              type="button"
              on:click={sendWhatsAppDPR}
              class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5"
            >
              <span>📲 WhatsApp DPR రిపోర్ట్</span>
            </button>
          </div>

          {#if statusMsg}
            <div class="p-3.5 rounded-2xl text-xs font-bold {statusType === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}">
              {statusMsg}
            </div>
          {/if}

          <form on:submit|preventDefault={handleGDEntrySubmit} class="space-y-4">
            
            <!-- Date & Category -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">తేదీ</label>
                <input
                  type="date"
                  bind:value={entry_date}
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">ఎంట్రీ కేటగిరీ (Entry Type) *</label>
                <select
                  bind:value={entry_category}
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-950"
                >
                  <option value="Material_Inward">🚚 మెటీరియల్ సైట్‌కి వచ్చింది (Inward)</option>
                  <option value="Material_Used">🧱 పనిలో మెటీరియల్ వాడారు (Used in Work)</option>
                  <option value="Labour_Wages">👷 కూలీలు & మేస్త్రీ జీతాలు / అడ్వాన్సులు</option>
                  <option value="Daily_Expense">☕ సైట్ ఖర్చులు (డీజిల్, టిఫిన్, కిరాయిలు)</option>
                  <option value="Govt_Bill_Received">🏛️ గ్రామ పంచాయతీ నుండి బిల్లు జమయింది</option>
                  <option value="Loan_Taken">🤝 బయట తీసుకున్న అప్పు / చేబదులు</option>
                </select>
              </div>
            </div>

            <!-- Material Details (If Inward or Used) -->
            {#if ['Material_Inward', 'Material_Used'].includes(entry_category)}
              <div class="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl space-y-3">
                <span class="text-xs font-black text-amber-950 block">📦 మెటీరియల్ వివరాలు:</span>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">మెటీరియల్ పేరు</label>
                    <input
                      type="text"
                      bind:value={material_name}
                      placeholder="ఉదా: సిమెంట్, ఇసుక, కంకర, ఇటుకలు"
                      class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">పరిమాణం (Quantity)</label>
                    <input
                      type="number"
                      step="any"
                      bind:value={material_qty}
                      placeholder="ఉదా: 50"
                      class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">కొలత యూనిట్</label>
                    <input
                      type="text"
                      bind:value={material_unit}
                      placeholder="బస్తాలు, ట్రాక్టర్లు, లోడ్లు"
                      class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            {/if}

            <!-- Labour Details (If Labour_Wages) -->
            {#if entry_category === 'Labour_Wages'}
              <div class="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl space-y-3">
                <span class="text-xs font-black text-blue-950 block">👷 కూలీల హాజరు:</span>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">మేస్త్రీలు (Masons Count)</label>
                    <input
                      type="number"
                      bind:value={masons_count}
                      placeholder="ఉదా: 2"
                      class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">కూలీలు (Labour Count)</label>
                    <input
                      type="number"
                      bind:value={labour_count}
                      placeholder="ఉదా: 6"
                      class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono"
                    />
                  </div>
                </div>
              </div>
            {/if}

            <!-- Financials: Party, Total Bill, Paid Amount -->
            {#if entry_category !== 'Material_Used'}
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">వ్యక్తి / వ్యాపారి పేరు (Party)</label>
                  <input
                    type="text"
                    bind:value={party_name}
                    placeholder="ఉదా: లక్ష్మి సిమెంట్స్, మేస్త్రి రాజు"
                    class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">మొత్తం బిల్లు (Total Bill ₹)</label>
                  <input
                    type="number"
                    step="any"
                    bind:value={total_amount}
                    placeholder="0"
                    class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">ఇచ్చిన నగదు (Paid Amount ₹)</label>
                  <input
                    type="number"
                    step="any"
                    bind:value={paid_amount}
                    placeholder="0"
                    class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-emerald-700"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">చెల్లింపు విధానం</label>
                  <select
                    bind:value={payment_mode}
                    class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
                  >
                    <option value="Cash">నగదు (Cash)</option>
                    <option value="UPI">PhonePe / GPay</option>
                    <option value="Bank">బ్యాంక్ ట్రాన్స్‌ఫర్</option>
                  </select>
                </div>
              </div>
            {/if}

            <!-- Work Progress & Photo Capture -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">పని పురోగతి / వివరాలు (Work Notes)</label>
                <textarea
                  bind:value={work_progress_desc}
                  rows="3"
                  placeholder="ఉదా: బేస్‌మెంట్ బెడ్ కాంక్రీట్ పూర్తి, 30 అడుగుల రాతి కట్టడం..."
                  class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
                ></textarea>
              </div>

              <!-- Mandatory Camera Photos -->
              <div class="space-y-2">
                <label class="block text-xs font-bold text-slate-700">📸 సైట్ ఫోటో / బిల్లు రశీదు</label>
                <div class="grid grid-cols-2 gap-2">
                  <div class="border border-dashed border-slate-300 p-2 rounded-xl text-center bg-slate-50">
                    <input
                      type="file"
                      id="site-cam"
                      accept="image/*"
                      capture="environment"
                      on:change={(e) => handleFile(e, 'site')}
                      class="hidden"
                    />
                    <label for="site-cam" class="cursor-pointer block text-[11px] font-bold text-slate-600">
                      <span>📷 సైట్ ఫోటో</span>
                      {#if sitePhotoPreview}
                        <img src={sitePhotoPreview} alt="Site" class="h-14 mx-auto mt-1 rounded object-cover" />
                      {/if}
                    </label>
                  </div>

                  <div class="border border-dashed border-slate-300 p-2 rounded-xl text-center bg-slate-50">
                    <input
                      type="file"
                      id="bill-cam"
                      accept="image/*"
                      on:change={(e) => handleFile(e, 'bill')}
                      class="hidden"
                    />
                    <label for="bill-cam" class="cursor-pointer block text-[11px] font-bold text-slate-600">
                      <span>🧾 బిల్లు ఫోటో</span>
                      {#if billPhotoPreview}
                        <img src={billPhotoPreview} alt="Bill" class="h-14 mx-auto mt-1 rounded object-cover" />
                      {/if}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              class="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black py-3 rounded-2xl shadow transition text-sm cursor-pointer"
            >
              {isSubmitting ? 'GD ఎంట్రీ సేవ్ అవుతోంది...' : '💾 GD ఎంట్రీ సేవ్ చేయండి (ఆటో-ట్రిగ్గర్)'}
            </button>
          </form>

        </div>
      {/if}

      <!-- TAB 2: LIVE DASHBOARD -->
      {#if activeTab === 'dashboard'}
        <div class="space-y-4">
          <!-- Metric Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[11px] font-bold text-slate-500">మొత్తం జమలు (Credits)</span>
              <p class="text-base sm:text-lg font-black text-emerald-700 font-mono mt-1">₹{totalCredits.toLocaleString('en-IN')}</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[11px] font-bold text-slate-500">మొత్తం ఖర్చులు (Debits)</span>
              <p class="text-base sm:text-lg font-black text-rose-700 font-mono mt-1">₹{totalDebits.toLocaleString('en-IN')}</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[11px] font-bold text-slate-500">చేతిలో నగదు (Cash in Hand)</span>
              <p class="text-base sm:text-lg font-black font-mono mt-1 {cashInHand >= 0 ? 'text-blue-700' : 'text-red-700'}">₹{cashInHand.toLocaleString('en-IN')}</p>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[11px] font-bold text-slate-500">ఇవ్వాల్సిన అప్పులు (Dues)</span>
              <p class="text-base sm:text-lg font-black text-amber-700 font-mono mt-1">₹{totalPendingDues.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <!-- Recent GD Entries -->
          <div class="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 class="text-sm font-black text-slate-900">తాజా GD లాగ్ రికార్డులు ({gdEntries.length})</h3>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              {#each gdEntries as g}
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span class="font-bold text-amber-900">[{g.entry_category}]</span>
                    <span class="font-bold text-slate-900 ml-1">{g.party_name || g.material_name || g.work_progress_desc || 'ఎంట్రీ'}</span>
                    <p class="text-[10px] text-slate-500">{g.entry_date} • {g.payment_mode}</p>
                  </div>
                  <div class="text-right">
                    <span class="font-bold font-mono text-slate-900 block">₹{g.paid_amount || g.total_amount || 0}</span>
                    {#if g.site_photo_url}
                      <a href={g.site_photo_url} target="_blank" class="text-[10px] text-blue-600 underline">ఫోటో ↗</a>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- TAB 3: MATERIAL STOCK -->
      {#if activeTab === 'stock'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 class="text-sm font-black text-slate-900">📦 ఆటో-క్యాలిక్యులేటెడ్ మెటీరియల్ స్టాక్ లెక్క</h3>
          {#if materialStock.length === 0}
            <p class="text-xs text-slate-400 py-8 text-center">ఇంకా మెటీరియల్ రికార్డులు నమోదు కాలేదు.</p>
          {:else}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {#each materialStock as st}
                <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1.5">
                  <span class="text-xs font-black text-slate-900 block">{st.material_name}</span>
                  <div class="flex justify-between text-xs">
                    <span class="text-slate-500">వచ్చినవి:</span>
                    <span class="font-bold text-emerald-700 font-mono">{st.total_inward} {st.unit}</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-slate-500">వాడినవి:</span>
                    <span class="font-bold text-rose-700 font-mono">{st.total_used} {st.unit}</span>
                  </div>
                  <div class="flex justify-between text-xs border-t border-slate-200 pt-1">
                    <span class="font-black text-slate-800">మిగిలిన నిల్వ:</span>
                    <span class="font-black text-blue-700 font-mono">{(Number(st.total_inward) - Number(st.total_used)).toFixed(2)} {st.unit}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- TAB 4: CASHBOOK & DUES -->
      {#if activeTab === 'cashbook'}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Vendor Dues -->
          <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 class="text-sm font-black text-slate-900">🤝 అప్పుల చిట్టా (Vendor Udhar Ledger)</h3>
            <div class="space-y-2">
              {#each vendorDues as v}
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between text-xs">
                  <div>
                    <span class="font-bold text-slate-900 block">{v.vendor_name}</span>
                    <span class="text-[10px] text-slate-500">బిల్లు: ₹{v.total_billed} • ఇచ్చాం: ₹{v.total_paid}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-500 block">ఇవ్వాల్సిన బాకీ</span>
                    <span class="font-bold font-mono text-amber-700">₹{(Number(v.total_billed) - Number(v.total_paid)).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Cashbook Debits/Credits -->
          <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 class="text-sm font-black text-slate-900">💰 క్యాష్‌బుక్ రికార్డులు</h3>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              {#each cashbookRecords as c}
                <div class="p-2.5 rounded-xl border flex justify-between text-xs {c.entry_type === 'Credit' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'}">
                  <div>
                    <span class="font-bold {c.entry_type === 'Credit' ? 'text-emerald-800' : 'text-slate-900'}">{c.party_name}</span>
                    <p class="text-[10px] text-slate-500">{c.entry_date} • {c.category}</p>
                  </div>
                  <span class="font-bold font-mono {c.entry_type === 'Credit' ? 'text-emerald-700' : 'text-rose-700'}">
                    {c.entry_type === 'Credit' ? '+' : '-'} ₹{Number(c.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- TAB 5: M-BOOK -->
      {#if activeTab === 'mbook'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="text-sm font-black text-slate-900">📐 AE మెజర్‌మెంట్ బుక్ (M-Book)</h3>
            <span class="text-xs font-bold text-blue-700 font-mono">మొత్తం M-Book విలువ: ₹{totalMBookValue.toLocaleString('en-IN')}</span>
          </div>

          <!-- M-Book Input Form -->
          <form on:submit|preventDefault={handleMBookSubmit} class="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            <div class="col-span-2">
              <label class="block font-bold text-slate-700 mb-1">ఐటమ్ వివరణ</label>
              <input type="text" bind:value={mb_item_desc} class="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold" required />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">పొడవు (L)</label>
              <input type="number" step="any" bind:value={mb_length} placeholder="0" class="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono" required />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">వెడల్పు (B)</label>
              <input type="number" step="any" bind:value={mb_breadth} placeholder="0" class="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono" required />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">లోతు/ఎత్తు (D)</label>
              <input type="number" step="any" bind:value={mb_depth} placeholder="0" class="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono" required />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">రేట్ (₹)</label>
              <input type="number" step="any" bind:value={mb_rate} placeholder="0" class="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono" />
            </div>
            <button type="submit" class="col-span-2 sm:col-span-6 bg-slate-900 text-white font-bold py-2 rounded-xl mt-1">
              + M-Book లో కొలత నమోదు చేయండి
            </button>
          </form>

          <!-- M-Book Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th class="p-2">ఐటమ్</th>
                  <th class="p-2">L × B × D</th>
                  <th class="p-2">మొత్తం కొలత</th>
                  <th class="p-2">రేట్</th>
                  <th class="p-2">మొత్తం సొమ్ము</th>
                </tr>
              </thead>
              <tbody>
                {#each mbookRecords as m}
                  <tr class="border-b">
                    <td class="p-2 font-bold text-slate-900">{m.item_desc}</td>
                    <td class="p-2 font-mono text-slate-600">{m.length} × {m.breadth} × {m.depth}</td>
                    <td class="p-2 font-mono font-bold text-blue-700">{m.quantity} {m.unit}</td>
                    <td class="p-2 font-mono">₹{m.rate}</td>
                    <td class="p-2 font-mono font-black text-emerald-700">₹{m.total_cost}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <!-- TAB 6: GST VAULT -->
      {#if activeTab === 'gst'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="border-b pb-2">
            <h3 class="text-sm font-black text-slate-900">🧾 A.S.V. ENTERPRISES జీఎస్టీ ఇన్వాయిస్ వాల్ట్</h3>
            <p class="text-xs text-slate-500">GSTIN: 36AMXPA2915K1ZR • ఇన్‌పుట్ టాక్స్ క్రెడిట్ (ITC) రికార్డులు</p>
          </div>

          <!-- Add GST Form -->
          <form on:submit|preventDefault={handleGSTSubmit} class="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">సరఫరాదారు పేరు</label>
              <input type="text" bind:value={gst_vendor_name} placeholder="ఉదా: శ్రీ లక్ష్మి ట్రేడర్స్" class="w-full bg-white border border-slate-300 rounded-lg p-1.5" required />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Vendor GSTIN</label>
              <input type="text" bind:value={gst_vendor_gstin} placeholder="36AAAAA0000A1Z5" class="w-full bg-white border border-slate-300 rounded-lg p-1.5 uppercase font-mono" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">బిల్ నంబర్</label>
              <input type="text" bind:value={gst_inv_no} placeholder="INV-001" class="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Taxable Value (₹)</label>
              <input type="number" step="any" bind:value={gst_taxable} placeholder="0" class="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono font-bold" required />
            </div>
            <div class="col-span-1 sm:col-span-2">
              <label class="block font-bold text-slate-700 mb-1">బిల్లు ఫైల్ / ఫోటో అప్‌లోడ్</label>
              <input type="file" accept="image/*,.pdf" on:change={(e) => handleFile(e, 'gst')} class="w-full text-xs" />
            </div>
            <button type="submit" class="col-span-1 sm:col-span-2 bg-slate-900 text-white font-bold py-2 rounded-xl mt-4">
              + GST ఇన్వాయిస్ సేవ్ చేయండి
            </button>
          </form>

          <!-- GST Records -->
          <div class="space-y-2">
            {#each gstRecords as g}
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between text-xs">
                <div>
                  <span class="font-bold text-slate-900 block">{g.vendor_name} ({g.invoice_no})</span>
                  <span class="text-[10px] text-slate-500 font-mono">Taxable: ₹{g.taxable_value} | CGST: ₹{g.cgst_amount} | SGST: ₹{g.sgst_amount}</span>
                </div>
                <div class="text-right">
                  <span class="font-black font-mono text-slate-900 block">Total: ₹{g.total_amount}</span>
                  {#if g.bill_photo_url}
                    <a href={g.bill_photo_url} target="_blank" class="text-[10px] text-blue-600 underline">బిల్లు చూడండి ↗</a>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

    </main>
  </div>
{/if}