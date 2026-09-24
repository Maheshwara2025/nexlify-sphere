<script>
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let authChecking = true;

  // Active Navigation Tab
  let activeTab = 'quick_entry'; 
  // 'quick_entry', 'eng_calc', 'mbook', 'vendor_bills', 'own_invoice', 'album', 'contacts', 'dashboard'

  // Projects Master
  let projects = [];
  let selectedProjectId = null;
  let loading = true;

  // 1. Quick Entry State (GD Master)
  let q_date = new Date().toISOString().split('T')[0];
  let q_type = 'Pooja_Petty'; // 'Pooja_Petty', 'Material_Inward', 'Labour_Attendance', 'JCB_Tractor', 'Material_Used'
  let q_stage = 'Inauguration'; // 'Inauguration', 'Trench', 'PCC', 'Basement', 'Pillars', 'Brickwork', 'Plastering'
  let q_desc = 'శంకుస్థాపన పూజ, కొబ్బరికాయలు, పసుపు, కుంకుమ, సున్నం ఖర్చులు';
  let q_party = 'పూజా సామాగ్రి';
  let q_total = '';
  let q_paid = '';
  let q_mode = 'Cash';
  let q_bill_status = 'Paid'; // 'Paid', 'Credit', 'Partial'

  // Self Voucher Toggle (బిల్లులు లేని చిన్న ఖర్చులకు స్వయం రశీదు)
  let is_self_voucher = true;
  let self_voucher_no = `VCH-${Date.now().toString().slice(-6)}`;

  // Materials & Labour State
  let q_mat_name = 'సిమెంట్ బస్తాలు';
  let q_mat_qty = '';
  let q_mat_unit = 'బస్తాలు';
  let q_masons = '';
  let q_male_labour = '';
  let q_female_labour = '';

  // Multiple Site Photos
  /** @type {File[]} */
  let sitePhotoFiles = [];
  /** @type {string[]} */
  let sitePhotoPreviews = [];
  
  /** @type {File | null} */
  let billPhotoFile = null;
  let billPhotoPreview = null;
  let isSubmitting = false;

  // 2. Civil Engineering Estimator
  let calc_wall_length = 100;
  let calc_pillar_gap = 10;
  let calc_wall_height = 5;
  $: calc_total_pillars = Math.floor(calc_wall_length / calc_pillar_gap) + 1;
  $: calc_brick_estimate = Math.round(calc_wall_length * calc_wall_height * 10);
  $: calc_cement_estimate = Math.round((calc_wall_length * calc_wall_height * 0.035) + (calc_total_pillars * 1.25));

  // 3. M-Book State
  let mb_items = [];
  let mb_stage = 'Trench';
  let mb_item_name = 'పునాది మట్టి తవ్వకం (Earthwork Excavation for Trench & Pillars)';
  let mb_l = '';
  let mb_b = '';
  let mb_d = '';
  let mb_rate = 140;
  let mb_unit = 'Cu.M';

  // 4. Own GST Invoice Generator (A.S.V. Enterprises)
  let inv_no = `ASV/GP/${new Date().getFullYear()}/01`;
  let inv_date = new Date().toISOString().split('T')[0];
  let inv_client = 'గ్రామ పంచాయతీ కార్యదర్శి / సర్పంచ్ గారు';
  let inv_addr = 'గ్రామ పంచాయతీ ముత్తారం, పెద్దపల్లి జిల్లా, తెలంగాణ';
  let inv_work = 'గ్రామ పంచాయతీ ప్రాకార (కాంపౌండ్ వాల్) నిర్మాణం';
  let inv_sac = '9954';
  let inv_items = [
    { desc: 'పునాది తవ్వకం & బెడ్ కాంక్రీట్ పనులు (Excavation & PCC 1:4:8 Bed)', qty: 1, unit: 'LS', rate: 45000 },
    { desc: 'CRS రాతి బేస్‌మెంట్ & 9-అంగుళాల ఇటుక కట్టడం (Masonry Works)', qty: 1, unit: 'LS', rate: 125000 }
  ];
  let inv_gst_rate = 18;
  let showPrintInvoice = false;

  // 5. Dynamic Site Emergency Contacts (Supabase Driven)
  let siteContacts = [];
  let isContactModalOpen = false;
  let editingContactId = null;
  let c_role = '';
  let c_name = '';
  let c_phone = '';
  let c_icon = '👷';

  // DB Records
  let gdEntries = [];
  let materialStock = [];
  let vendorDues = [];
  let cashbookRecords = [];

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
      return;
    }
    authChecking = false;
    await loadInitialData();
  });

  async function loadInitialData() {
    loading = true;
    try {
      const { data: projs } = await supabase.from('contractor_projects').select('*').order('id', { ascending: false });
      projects = projs || [];
      if (projects.length > 0 && !selectedProjectId) {
        selectedProjectId = projects[0].id;
      }
      if (selectedProjectId) {
        await refreshAllRecords();
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function refreshAllRecords() {
    if (!selectedProjectId) return;
    try {
      const { data: gd } = await supabase.from('contractor_gd_entries').select('*').eq('project_id', selectedProjectId).order('id', { ascending: false });
      gdEntries = gd || [];

      const { data: stock } = await supabase.from('contractor_material_stock').select('*').eq('project_id', selectedProjectId);
      materialStock = stock || [];

      const { data: dues } = await supabase.from('contractor_vendor_dues').select('*').eq('project_id', selectedProjectId);
      vendorDues = dues || [];

      const { data: cash } = await supabase.from('contractor_cashbook').select('*').eq('project_id', selectedProjectId).order('id', { ascending: false });
      cashbookRecords = cash || [];

      const { data: mb } = await supabase.from('contractor_mbook').select('*').eq('project_id', selectedProjectId).order('id', { ascending: false });
      mb_items = mb || [];

      await loadContacts();
    } catch (e) {
      console.error(e);
    }
  }

  // Contacts Management (Load, Insert Default, Save, Edit, Delete)
  async function loadContacts() {
    if (!selectedProjectId) return;
    try {
      const { data, error } = await supabase
        .from('contractor_contacts')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('id', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const defaultContacts = [
          { project_id: selectedProjectId, role: 'పంచాయతీ ఏఈ (AE)', name: 'ఇంజనీరింగ్ అధికారి', phone: '9989851608', icon: '🏛️' },
          { project_id: selectedProjectId, role: 'పంచాయతీ సెక్రటరీ', name: 'గ్రామ పంచాయతీ కార్యదర్శి', phone: '9989851608', icon: '📋' },
          { project_id: selectedProjectId, role: 'గ్రామ సర్పంచ్', name: 'సర్పంచ్ గారు', phone: '9989851608', icon: '👑' },
          { project_id: selectedProjectId, role: 'జేసీబీ ఆపరేటర్', name: 'జేసీబీ డ్రైవర్', phone: '9989851608', icon: '🚜' },
          { project_id: selectedProjectId, role: 'ఇసుక / ట్రాక్టర్ సప్లయర్', name: 'ట్రాక్టర్ యజమాని', phone: '9989851608', icon: '🚚' },
          { project_id: selectedProjectId, role: 'సిమెంట్ & స్టీల్ డీలర్', name: 'శ్రీ లక్ష్మి ట్రేడర్స్', phone: '9989851608', icon: '🏪' },
          { project_id: selectedProjectId, role: 'హెడ్ తాపీ మేస్త్రీ', name: 'మేస్త్రీ రాజు', phone: '9989851608', icon: '👷' }
        ];
        await supabase.from('contractor_contacts').insert(defaultContacts);
        const res = await supabase.from('contractor_contacts').select('*').eq('project_id', selectedProjectId);
        siteContacts = res.data || [];
      } else {
        siteContacts = data;
      }
    } catch (e) {
      console.error('Contacts load error:', e);
    }
  }

  async function saveContact() {
    if (!c_role.trim() || !c_name.trim() || !c_phone.trim()) {
      alert('దయచేసి హోదా, పేరు మరియు ఫోన్ నంబర్ నమోదు చేయండి!');
      return;
    }

    try {
      if (editingContactId) {
        const { error } = await supabase
          .from('contractor_contacts')
          .update({
            role: c_role.trim(),
            name: c_name.trim(),
            phone: c_phone.trim(),
            icon: c_icon
          })
          .eq('id', editingContactId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contractor_contacts')
          .insert([{
            project_id: selectedProjectId,
            role: c_role.trim(),
            name: c_name.trim(),
            phone: c_phone.trim(),
            icon: c_icon
          }]);
        if (error) throw error;
      }

      c_role = '';
      c_name = '';
      c_phone = '';
      c_icon = '👷';
      editingContactId = null;
      isContactModalOpen = false;

      await loadContacts();
      alert('✓ కాంటాక్ట్ వివరాలు భద్రపరచబడ్డాయి!');
    } catch (err) {
      alert('లోపం: ' + err.message);
    }
  }

  function startEditContact(c) {
    editingContactId = c.id;
    c_role = c.role;
    c_name = c.name;
    c_phone = c.phone;
    c_icon = c.icon || '👷';
    isContactModalOpen = true;
  }

  async function deleteContact(id, name) {
    if (!confirm(`నిజంగా '${name}' కాంటాక్ట్‌ను తొలగించాలనుకుంటున్నారా?`)) return;
    try {
      const { error } = await supabase.from('contractor_contacts').delete().eq('id', id);
      if (error) throw error;
      await loadContacts();
      alert('కాంటాక్ట్ తొలగించబడింది!');
    } catch (err) {
      alert('లోపం: ' + err.message);
    }
  }

  function openNewContactModal() {
    editingContactId = null;
    c_role = '';
    c_name = '';
    c_phone = '';
    c_icon = '👷';
    isContactModalOpen = true;
  }

  // File Upload Helper
  async function uploadContractorDoc(file, folder) {
    const ext = file.name.split('.').pop();
    const cleanPath = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from('contractor-files').upload(cleanPath, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('contractor-files').getPublicUrl(cleanPath);
    return data.publicUrl;
  }

  function handleMultipleSitePhotos(e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    if (input.files) {
      const newFiles = Array.from(input.files);
      sitePhotoFiles = [...sitePhotoFiles, ...newFiles];
      const newPreviews = newFiles.map(f => URL.createObjectURL(f));
      sitePhotoPreviews = [...sitePhotoPreviews, ...newPreviews];
    }
  }

  function removeSitePhoto(index) {
    sitePhotoFiles.splice(index, 1);
    sitePhotoPreviews.splice(index, 1);
    sitePhotoFiles = [...sitePhotoFiles];
    sitePhotoPreviews = [...sitePhotoPreviews];
  }

  function handleBillPhoto(e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    if (input.files && input.files[0]) {
      billPhotoFile = input.files[0];
      billPhotoPreview = URL.createObjectURL(billPhotoFile);
      is_self_voucher = false;
    }
  }

  function setQuickType(type, stage, party, defaultDesc = '') {
    q_type = type;
    q_stage = stage;
    q_party = party;
    q_desc = defaultDesc;
    if (type === 'Pooja_Petty') {
      is_self_voucher = true;
    }
  }

  // Quick Action Submission
  async function handleQuickSubmit() {
    if (!selectedProjectId) return;
    isSubmitting = true;

    try {
      let siteUrls = [];
      for (const file of sitePhotoFiles) {
        const url = await uploadContractorDoc(file, 'site_stages');
        siteUrls.push(url);
      }
      const finalSitePhotoString = siteUrls.join(',');

      let finalBillUrl = null;
      if (billPhotoFile) {
        finalBillUrl = await uploadContractorDoc(billPhotoFile, 'bills');
      } else if (is_self_voucher) {
        finalBillUrl = `SELF_VOUCHER|${self_voucher_no}|${q_party}|${q_total || 0}`;
      }

      const totalVal = Number(q_total) || 0;
      let paidVal = Number(q_paid) || 0;
      if (q_bill_status === 'Paid') paidVal = totalVal;
      if (q_bill_status === 'Credit') paidVal = 0;

      let entryCat = 'Daily_Expense';
      if (q_type === 'Material_Inward') entryCat = 'Material_Inward';
      else if (q_type === 'Material_Used') entryCat = 'Material_Used';
      else if (q_type === 'Labour_Attendance') entryCat = 'Labour_Wages';

      const fullDescription = `[${q_stage}] ${q_desc || ''}`.trim();

      const payload = {
        project_id: selectedProjectId,
        entry_date: q_date,
        entry_category: entryCat,
        material_name: ['Material_Inward', 'Material_Used'].includes(q_type) ? q_mat_name : null,
        material_qty: Number(q_mat_qty) || 0,
        material_unit: q_mat_unit,
        party_name: q_party.trim() || 'సైట్ ఖర్చు',
        total_amount: totalVal,
        paid_amount: paidVal,
        payment_mode: q_mode,
        masons_count: parseInt(q_masons) || 0,
        labour_count: (parseInt(q_male_labour) || 0) + (parseInt(q_female_labour) || 0),
        work_progress_desc: fullDescription,
        site_photo_url: finalSitePhotoString || null,
        receipt_photo_url: finalBillUrl
      };

      const { error } = await supabase.from('contractor_gd_entries').insert([payload]);
      if (error) throw error;

      q_total = '';
      q_paid = '';
      q_mat_qty = '';
      q_desc = '';
      sitePhotoFiles = [];
      sitePhotoPreviews = [];
      billPhotoFile = null;
      billPhotoPreview = null;
      self_voucher_no = `VCH-${Date.now().toString().slice(-6)}`;

      await refreshAllRecords();
      alert('✓ సైట్ ఎంట్రీ విజయవంతంగా నమోదైంది! స్టాక్, క్యాష్‌బుక్ ఆటో-అప్‌డేట్ అయ్యాయి.');
    } catch (e) {
      console.error(e);
      alert('లోపం: ' + e.message);
    } finally {
      isSubmitting = false;
    }
  }

  // M-Book Submission
  async function handleMBookSubmit() {
    if (!selectedProjectId) return;
    try {
      const { error } = await supabase.from('contractor_mbook').insert([{
        project_id: selectedProjectId,
        item_desc: `[${mb_stage}] ${mb_item_name}`,
        length: Number(mb_l) || 0,
        breadth: Number(mb_b) || 0,
        depth: Number(mb_d) || 0,
        unit: mb_unit,
        rate: Number(mb_rate) || 0
      }]);
      if (error) throw error;
      mb_l = '';
      mb_b = '';
      mb_d = '';
      await refreshAllRecords();
      alert('M-Book కొలత రికార్డ్ అయింది!');
    } catch (err) {
      alert(err.message);
    }
  }

  function addInvoiceItem() {
    inv_items = [...inv_items, { desc: '', qty: 1, unit: 'LS', rate: 0 }];
  }

  function removeInvoiceItem(index) {
    inv_items = inv_items.filter((_, i) => i !== index);
  }

  // Deductions & Invoice Computations
  $: invSubtotal = inv_items.reduce((s, it) => s + (Number(it.qty) * Number(it.rate)), 0);
  $: invTax = (invSubtotal * inv_gst_rate) / 100;
  $: invGrandTotal = invSubtotal + invTax;
  $: dedGstTds = invSubtotal * 0.02;
  $: dedItTds = invSubtotal * 0.01;
  $: dedCess = invSubtotal * 0.01;
  $: dedFsd = invSubtotal * 0.05;
  $: netBankPayable = invGrandTotal - (dedGstTds + dedItTds + dedCess + dedFsd);

  // Financial Metrics
  $: totalCredits = cashbookRecords.filter(c => c.entry_type === 'Credit').reduce((s, c) => s + Number(c.amount || 0), 0);
  $: totalDebits = cashbookRecords.filter(c => c.entry_type === 'Debit').reduce((s, c) => s + Number(c.amount || 0), 0);
  $: cashBalance = totalCredits - totalDebits;
  $: totalDues = vendorDues.reduce((s, v) => s + (Number(v.total_billed || 0) - Number(v.total_paid || 0)), 0);
  $: totalMBookCost = mb_items.reduce((s, m) => s + Number(m.total_cost || 0), 0);

  function sendDPRWhatsApp() {
    const selectedProj = projects.find(p => p.id === selectedProjectId);
    let msg = `*🏗️ డైలీ వర్క్ ప్రోగ్రెస్ రిపోర్ట్ (DPR)*\n`;
    msg += `📌 *ప్రాజెక్ట్:* ${selectedProj?.title || 'గ్రామ పంచాయతీ పని'}\n`;
    msg += `📅 *తేదీ:* ${q_date}\n`;
    msg += `🏢 *కాంట్రాక్టర్:* A.S.V. Enterprises (GST: 36AMXPA2915K1ZR)\n\n`;
    msg += `*నిర్మాణ పురోగతి & వివరాలు:*\n`;
    gdEntries.filter(g => g.entry_date === q_date).forEach((e, idx) => {
      msg += `${idx + 1}. [${e.entry_category}] ${e.work_progress_desc || e.party_name} - ₹${e.paid_amount || e.total_amount}\n`;
    });
    msg += `\n💵 *చేతిలో నికర నిల్వ:* ₹${cashBalance.toLocaleString('en-IN')}`;
    msg += `\n📸 సైట్ ఫోటోలు & వోచర్లు పోర్టల్ లో భద్రపరచబడ్డాయి.`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  }
</script>

<svelte:head>
  <title>A.S.V. Contractor 360° ERP | Professional Suite</title>
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    <div class="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <div class="min-h-screen bg-[#f8fafc] font-sans pb-24 text-slate-900">
    
    <!-- Top Executive Header -->
    <header class="bg-[#0f172a] text-white px-4 py-3 sticky top-0 z-40 border-b-2 border-amber-500 shadow-xl">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
            🏗️
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-sm sm:text-base font-black tracking-wide text-white">A.S.V. CONTRACTOR 360° ERP</h1>
              <span class="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/40">PRO SUITE</span>
            </div>
            <p class="text-[10px] text-slate-400 font-mono">GSTIN: <span class="text-amber-400 font-bold">36AMXPA2915K1ZR</span> • A.S.V. Enterprises</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <select
            bind:value={selectedProjectId}
            on:change={refreshAllRecords}
            class="bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl max-w-[220px] truncate focus:outline-none"
          >
            {#each projects as p}
              <option value={p.id}>📌 {p.title}</option>
            {/each}
          </select>

          <a href="/admin/news" class="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1.5 rounded-xl text-slate-300 font-bold border border-slate-700 transition">
            ← న్యూస్ డెస్క్
          </a>
        </div>

      </div>
    </header>

    <main class="max-w-7xl mx-auto p-3 sm:p-5 space-y-4">

      <!-- Stage Tracker Banner -->
      <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 overflow-x-auto text-[11px] font-bold">
        <span class="text-xs font-black text-slate-900 shrink-0 flex items-center gap-1.5">
          <span>🚩</span>
          <span>ప్రహరీ నిర్మాణ దశ:</span>
        </span>
        <div class="flex items-center gap-1.5 whitespace-nowrap">
          <span class="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-black shadow-sm">1. శంకుస్థాపన ✓</span>
          <span class="text-slate-300">→</span>
          <span class="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-black shadow-sm">2. పునాది తవ్వకం ⛏️</span>
          <span class="text-slate-300">→</span>
          <span class="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600">3. బెడ్ కాంక్రీట్</span>
          <span class="text-slate-300">→</span>
          <span class="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600">4. బేస్‌మెంట్</span>
          <span class="text-slate-300">→</span>
          <span class="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600">5. పిల్లర్లు/బీమ్స్</span>
          <span class="text-slate-300">→</span>
          <span class="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600">6. ఇటుక గోడ</span>
          <span class="text-slate-300">→</span>
          <span class="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600">7. ప్లాస్టరింగ్</span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto scrollbar-thin text-xs font-black">
        <button
          type="button"
          on:click={() => activeTab = 'quick_entry'}
          class="px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'quick_entry' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>⚡ డైలీ క్విక్ ఎంట్రీ</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'eng_calc'}
          class="px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'eng_calc' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>🏛️ పిల్లర్ & గుంతల కాలిక్యులేటర్</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'mbook'}
          class="px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'mbook' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>📐 ఇంజనీరింగ్ M-Book</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'vendor_bills'}
          class="px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'vendor_bills' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>📦 ఇతరుల బిల్లులు & బాకీలు</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'own_invoice'}
          class="px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'own_invoice' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>🧾 A.S.V. ట్యాక్స్ ఇన్వాయిస్ & RA బిల్లు</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'album'}
          class="px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'album' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>📸 సైట్ ఫోటో ఆల్బమ్</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'contacts'}
          class="px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'contacts' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>📞 సైట్ కాంటాక్ట్స్</span>
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'dashboard'}
          class="px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap {activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span>📊 లైవ్ డాష్‌బోర్డ్</span>
        </button>
      </nav>

      <!-- TAB 1: QUICK ENTRY WITH MULTIPLE PHOTOS & SELF-VOUCHER -->
      {#if activeTab === 'quick_entry'}
        <div class="bg-white border border-slate-200 rounded-3xl p-4 sm:p-7 shadow-sm space-y-5">
          
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-black text-slate-900 flex items-center gap-2">
                <span>⚡ తక్షణ సైట్ ఎంట్రీ బోర్డు (Field Quick Logger)</span>
              </h2>
              <p class="text-xs text-slate-500">శంకుస్థాపన పూజ, మెటీరియల్, కూలీల బట్వాడా వివరాలు నిమిషంలో ఎంటర్ చేయండి</p>
            </div>

            <button
              type="button"
              on:click={sendDPRWhatsApp}
              class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5 transition"
            >
              <span>📲 WhatsApp DPR పంపండి</span>
            </button>
          </div>

          <!-- Quick Type Selection Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-bold">
            <button
              type="button"
              on:click={() => setQuickType('Pooja_Petty', 'Inauguration', 'పూజా సామాగ్రి', 'శంకుస్థాపన పూజ, కొబ్బరికాయలు, పసుపు, కుంకుమ, సున్నం ఖర్చులు')}
              class="p-3 rounded-2xl border text-left transition {q_type === 'Pooja_Petty' ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500 shadow' : 'bg-slate-50 border-slate-200 text-slate-700'}"
            >
              <span class="text-2xl block mb-1">🪔</span>
              <span class="block">పూజ & చిల్లర ఖర్చు</span>
              <span class="text-[10px] text-slate-500 font-normal">కొబ్బరికాయ, పసుపు, కుంకుమ</span>
            </button>

            <button
              type="button"
              on:click={() => setQuickType('Material_Inward', 'Trench', 'లక్ష్మి సిమెంట్స్')}
              class="p-3 rounded-2xl border text-left transition {q_type === 'Material_Inward' ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500 shadow' : 'bg-slate-50 border-slate-200 text-slate-700'}"
            >
              <span class="text-2xl block mb-1">🚚</span>
              <span class="block">మెటీరియల్ వచ్చింది</span>
              <span class="text-[10px] text-slate-500 font-normal">సిమెంట్, ఇసుక, కంకర</span>
            </button>

            <button
              type="button"
              on:click={() => setQuickType('Labour_Attendance', 'Trench', 'మేస్త్రీలు & లేబర్')}
              class="p-3 rounded-2xl border text-left transition {q_type === 'Labour_Attendance' ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500 shadow' : 'bg-slate-50 border-slate-200 text-slate-700'}"
            >
              <span class="text-2xl block mb-1">👷</span>
              <span class="block">కూలీల హాజరు & జీతం</span>
              <span class="text-[10px] text-slate-500 font-normal">మేస్త్రీలు, కూలీల బట్వాడా</span>
            </button>

            <button
              type="button"
              on:click={() => setQuickType('Daily_Expense', 'Trench', 'జేసీబీ / ట్రాక్టర్ కిరాయి', 'పునాది గుంతల తవ్వకం & మట్టి తోలకం')}
              class="p-3 rounded-2xl border text-left transition {q_type === 'Daily_Expense' ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500 shadow' : 'bg-slate-50 border-slate-200 text-slate-700'}"
            >
              <span class="text-2xl block mb-1">🚜</span>
              <span class="block">జేసీబీ / ట్రాక్టర్ కిరాయి</span>
              <span class="text-[10px] text-slate-500 font-normal">గుంతల తవ్వకం & రవాణా</span>
            </button>

            <button
              type="button"
              on:click={() => setQuickType('Material_Used', 'Trench', 'సైట్ పని వాడకం')}
              class="p-3 rounded-2xl border text-left transition {q_type === 'Material_Used' ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500 shadow' : 'bg-slate-50 border-slate-200 text-slate-700'}"
            >
              <span class="text-2xl block mb-1">🧱</span>
              <span class="block">సైట్ పని & వాడకం</span>
              <span class="text-[10px] text-slate-500 font-normal">వాడిన సిమెంట్, పూర్తి చేసిన గోడ</span>
            </button>
          </div>

          <form on:submit|preventDefault={handleQuickSubmit} class="space-y-4 pt-1">
            
            <!-- Date & Stage -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">తేదీ *</label>
                <input type="date" bind:value={q_date} class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold" required />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">నిర్మాణ దశ (Construction Stage) *</label>
                <select bind:value={q_stage} class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-950">
                  <option value="Inauguration">🪔 1. శంకుస్థాపన / ప్రారంభ పూజ (Inauguration)</option>
                  <option value="Trench">⛏️ 2. పునాది తవ్వకం & పిల్లర్ గుంతలు (Excavation)</option>
                  <option value="PCC">🧱 3. పునాది బెడ్ కాంక్రీట్ (PCC 1:4:8 Bed)</option>
                  <option value="Basement">🪨 4. రాతి కట్టడం బేస్‌మెంట్ (RR Masonry)</option>
                  <option value="Pillars">🏛️ 5. పిల్లర్లు & ప్లింత్ బీమ్ (Columns & Beams)</option>
                  <option value="Brickwork">🧱 6. 9-అంగుళాల ఇటుకల గోడ (Brick Masonry)</option>
                  <option value="Plastering">🎨 7. ప్లాస్టరింగ్ & రంగులు (Plastering & Coping)</option>
                </select>
              </div>
            </div>

            <!-- Material Details -->
            {#if ['Material_Inward', 'Material_Used'].includes(q_type)}
              <div class="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl space-y-3">
                <span class="text-xs font-black text-blue-950 block">📦 మెటీరియల్ పరిమాణం:</span>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">మెటీరియల్ పేరు</label>
                    <input type="text" bind:value={q_mat_name} placeholder="సిమెంట్, ఇసుక, కంకర" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold" required />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">పరిమాణం (Qty)</label>
                    <input type="number" step="any" bind:value={q_mat_qty} placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono" required />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">యూనిట్</label>
                    <input type="text" bind:value={q_mat_unit} placeholder="బస్తాలు, ట్రాక్టర్లు" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold" />
                  </div>
                </div>
              </div>
            {/if}

            <!-- Labour Details -->
            {#if q_type === 'Labour_Attendance'}
              <div class="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-3">
                <span class="text-xs font-black text-emerald-950 block">👷 కూలీల హాజరు వివరాలు:</span>
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">తాపీ మేస్త్రీలు</label>
                    <input type="number" bind:value={q_masons} placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">మేల్ హెల్పర్లు</label>
                    <input type="number" bind:value={q_male_labour} placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">మహిళా కూలీలు</label>
                    <input type="number" bind:value={q_female_labour} placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono" />
                  </div>
                </div>
              </div>
            {/if}

            <!-- Payment & Bill Status -->
            {#if q_type !== 'Material_Used'}
              <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-xs font-black text-slate-900">💰 ఖర్చు & చెల్లింపు లెక్క:</span>
                  
                  <div class="flex items-center gap-1 text-[11px] font-bold">
                    <button type="button" on:click={() => q_bill_status = 'Paid'} class="px-2.5 py-1 rounded-xl transition {q_bill_status === 'Paid' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}">✓ మొత్తం ఇచ్చాం (Paid)</button>
                    <button type="button" on:click={() => q_bill_status = 'Credit'} class="px-2.5 py-1 rounded-xl transition {q_bill_status === 'Credit' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'}">⏳ పూర్తి బాకీ (Credit)</button>
                    <button type="button" on:click={() => q_bill_status = 'Partial'} class="px-2.5 py-1 rounded-xl transition {q_bill_status === 'Partial' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}">కొంత బాకీ (Partial)</button>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">ఎవరికి ఇచ్చారు / షాప్ పేరు</label>
                    <input type="text" bind:value={q_party} placeholder="ఎవరికి చెల్లించారు" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold" />
                  </div>

                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">మొత్తం ఖర్చు / బిల్లు (₹)</label>
                    <input type="number" step="any" bind:value={q_total} placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono" />
                  </div>

                  {#if q_bill_status === 'Partial'}
                    <div>
                      <label class="block text-[11px] font-bold text-slate-700 mb-1">ఇప్పుడు ఇచ్చిన నగదు (₹)</label>
                      <input type="number" step="any" bind:value={q_paid} placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-emerald-700" />
                    </div>
                  {/if}

                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">చెల్లింపు విధానం</label>
                    <select bind:value={q_mode} class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold">
                      <option value="Cash">నగదు (Cash)</option>
                      <option value="UPI">PhonePe / GPay</option>
                      <option value="Bank">బ్యాంక్ ఖాతా</option>
                    </select>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Work Description -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">వివరాలు / పని పురోగతి (Description)</label>
              <textarea
                bind:value={q_desc}
                rows="2"
                placeholder="వివరాలు ఇక్కడ నమోదు చేయండి..."
                class="w-full bg-slate-50 border border-slate-300 rounded-2xl p-2.5 text-xs"
              ></textarea>
            </div>

            <!-- PHOTOS & SELF-VOUCHER SECTION -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <!-- 1. MULTIPLE SITE PHOTOS PICKER -->
              <div class="border-2 border-dashed border-slate-300 bg-slate-50 p-4 rounded-2xl text-center space-y-2">
                <input
                  type="file"
                  id="multi-site-cam"
                  accept="image/*"
                  multiple
                  on:change={handleMultipleSitePhotos}
                  class="hidden"
                />
                <label for="multi-site-cam" class="cursor-pointer block">
                  <span class="text-3xl block mb-1">📸</span>
                  <span class="text-xs font-black text-slate-800 block">సైట్ ఫోటోలు తీయండి (Multiple Photos)</span>
                  <span class="text-[10px] text-slate-500">శంకుస్థాపన పూజ, తవ్వకం ఫోటోలు ఎన్ని అయినా ఒకేసారి ఎంచుకోవచ్చు</span>
                </label>

                <!-- Selected Previews -->
                {#if sitePhotoPreviews.length > 0}
                  <div class="flex flex-wrap gap-2 pt-2 justify-center">
                    {#each sitePhotoPreviews as prev, idx}
                      <div class="relative group">
                        <img src={prev} alt="Site Preview" class="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-sm" />
                        <button
                          type="button"
                          on:click={() => removeSitePhoto(idx)}
                          class="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow"
                        >
                          ×
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>

              <!-- 2. BILL UPLOAD OR AUTO SELF-VOUCHER SLIP -->
              <div class="border-2 border-dashed border-slate-300 bg-slate-50 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span class="text-xs font-black text-slate-800">🧾 రశీదు / బిల్లు సదుపాయం</span>
                  
                  <!-- Self Voucher Switch -->
                  <label class="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold bg-amber-100 text-amber-950 px-2 py-1 rounded-lg">
                    <input type="checkbox" bind:checked={is_self_voucher} class="w-3.5 h-3.5 text-amber-600 rounded" />
                    <span>బిల్లు లేదు (Auto Self Voucher)</span>
                  </label>
                </div>

                {#if is_self_voucher}
                  <!-- Generated Self Cash Voucher Card Preview -->
                  <div class="bg-white border border-amber-300 rounded-xl p-3 text-[11px] font-mono space-y-1 text-slate-800 shadow-sm">
                    <div class="flex justify-between border-b border-slate-100 pb-1 font-sans">
                      <span class="font-black text-amber-950 text-xs">A.S.V. ENTERPRISES - SELF VOUCHER</span>
                      <span class="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-bold">చిల్లర ఖర్చు స్లిప్</span>
                    </div>
                    <div class="flex justify-between pt-1">
                      <span>వోచర్ నంబర్: <strong>{self_voucher_no}</strong></span>
                      <span>తేదీ: {q_date}</span>
                    </div>
                    <div>
                      <span>ఖర్చు వివరాలు: <strong>{q_party || 'పూజా సామాగ్రి'}</strong> ({q_desc || 'సాధారణ ఖర్చు'})</span>
                    </div>
                    <div class="flex justify-between border-t border-slate-100 pt-1 font-bold font-sans">
                      <span>చెల్లించిన మొత్తం: <strong class="text-emerald-700 text-xs">₹{q_total || 0}</strong> ({q_mode})</span>
                      <span class="text-[9px] text-slate-500">Passed by: Contractor</span>
                    </div>
                  </div>
                  <p class="text-[10px] text-slate-500 text-center">దుకాణంలో బిల్లు ఇవ్వనప్పుడు ఈ ఆటో-స్లిప్ అధికారిక రశీదుగా సేవ్ అవుతుంది.</p>
                {:else}
                  <!-- Manual Bill Upload -->
                  <div class="text-center pt-2">
                    <input type="file" id="bill-pic-in" accept="image/*,.pdf" on:change={handleBillPhoto} class="hidden" />
                    <label for="bill-pic-in" class="cursor-pointer block">
                      <span class="text-2xl block">🧾</span>
                      <span class="text-xs font-bold text-slate-700 block">బిల్లు ఫోటో అప్‌లోడ్ చేయండి</span>
                      {#if billPhotoPreview}
                        <img src={billPhotoPreview} alt="Bill Preview" class="h-16 mx-auto mt-2 rounded-xl object-contain border border-slate-300 bg-white" />
                      {/if}
                    </label>
                  </div>
                {/if}

              </div>

            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              class="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black py-3.5 rounded-2xl shadow-lg transition text-sm cursor-pointer"
            >
              {isSubmitting ? 'ఎంట్రీ సేవ్ అవుతోంది... దయచేసి వేచి ఉండండి' : '🚀 సేవ్ చేయండి (ఆటో-ట్రిగ్గర్ అప్‌డేట్)'}
            </button>

          </form>

        </div>
      {/if}

      <!-- TAB 2: CIVIL ENGINEERING PILLAR & TRENCH CALCULATOR -->
      {#if activeTab === 'eng_calc'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div class="border-b pb-3">
            <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
              <span>🏛️ సివిల్ ఇంజనీరింగ్ పిల్లర్ & గుంతల కాలిక్యులేటర్</span>
            </h3>
            <p class="text-xs text-slate-500">ప్రహరీ గోడ కొలతల ప్రకారం పిల్లర్ల సంఖ్య మరియు మెటీరియల్ కచ్చితమైన అంచనా</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-bold">
            <div>
              <label class="block text-slate-700 mb-1">గోడ మొత్తం పొడవు (అడుగులు)</label>
              <input type="number" bind:value={calc_wall_length} class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono" />
            </div>
            <div>
              <label class="block text-slate-700 mb-1">పిల్లర్ల మధ్య దూరం (అడుగులు)</label>
              <input type="number" bind:value={calc_pillar_gap} class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono" />
            </div>
            <div>
              <label class="block text-slate-700 mb-1">గోడ ఎత్తు (అడుగులు)</label>
              <input type="number" bind:value={calc_wall_height} class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-1">
              <span class="text-[11px] font-bold text-amber-900 block">మొత్తం రావలసిన పిల్లర్లు:</span>
              <span class="text-2xl font-black font-mono text-amber-950">{calc_total_pillars} పిల్లర్లు</span>
              <p class="text-[10px] text-amber-800 font-medium">ప్రతి {calc_pillar_gap} అడుగులకు ఒక పిల్లర్</p>
            </div>

            <div class="bg-blue-50 border border-blue-200 p-4 rounded-2xl space-y-1">
              <span class="text-[11px] font-bold text-blue-900 block">ఇటుకల అంచనా (9" Wall):</span>
              <span class="text-2xl font-black font-mono text-blue-950">~{calc_brick_estimate.toLocaleString('en-IN')} ఇటుకలు</span>
              <p class="text-[10px] text-blue-800 font-medium">{calc_wall_length * calc_wall_height} చ.అ. వైశాల్యానికి</p>
            </div>

            <div class="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-1">
              <span class="text-[11px] font-bold text-emerald-900 block">సిమెంట్ అంచనా:</span>
              <span class="text-2xl font-black font-mono text-emerald-950">~{calc_cement_estimate} బస్తాలు</span>
              <p class="text-[10px] text-emerald-800 font-medium">గోడ కట్టడం + ఫుటింగ్ కాంక్రీట్‌కు</p>
            </div>
          </div>
        </div>
      {/if}

      <!-- TAB 3: M-BOOK -->
      {#if activeTab === 'mbook'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b pb-3">
            <div>
              <h3 class="text-sm font-black text-slate-900">📐 సివిల్ ఇంజనీరింగ్ M-Book మెజర్‌మెంట్స్</h3>
              <p class="text-xs text-slate-500">AE రికార్డుకు సమాంతరంగా $L \times B \times D$ పక్కా కొలతలు</p>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-500 block">మొత్తం క్లెయిమ్ విలువ:</span>
              <span class="text-sm font-black font-mono text-blue-700">₹{totalMBookCost.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <form on:submit|preventDefault={handleMBookSubmit} class="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
            <div class="col-span-2">
              <label class="block font-bold text-slate-700 mb-1">పని వివరణ</label>
              <input type="text" bind:value={mb_item_name} class="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold" required />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">పొడవు (L)</label>
              <input type="number" step="any" bind:value={mb_l} placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold" required />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">వెడల్పు (B)</label>
              <input type="number" step="any" bind:value={mb_b} placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold" required />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">లోతు (D)</label>
              <input type="number" step="any" bind:value={mb_d} placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold" required />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">రేట్ (₹)</label>
              <input type="number" step="any" bind:value={mb_rate} placeholder="0" class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold" />
            </div>
            <button type="submit" class="col-span-2 sm:col-span-6 bg-slate-900 text-white font-bold py-2.5 rounded-xl mt-2 cursor-pointer">
              + M-Book లో నమోదు చేయండి
            </button>
          </form>

          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead class="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th class="p-2.5">పని ఐటమ్</th>
                  <th class="p-2.5">L × B × D</th>
                  <th class="p-2.5">మొత్తం కొలత</th>
                  <th class="p-2.5">రేట్</th>
                  <th class="p-2.5">మొత్తం సొమ్ము</th>
                </tr>
              </thead>
              <tbody>
                {#each mb_items as m}
                  <tr class="border-b hover:bg-slate-50">
                    <td class="p-2.5 font-bold text-slate-900">{m.item_desc}</td>
                    <td class="p-2.5 font-mono text-slate-600">{m.length} × {m.breadth} × {m.depth}</td>
                    <td class="p-2.5 font-mono font-bold text-blue-700">{m.quantity} {m.unit}</td>
                    <td class="p-2.5 font-mono">₹{m.rate}</td>
                    <td class="p-2.5 font-mono font-black text-emerald-700">₹{m.total_cost}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <!-- TAB 4: VENDOR BILLS -->
      {#if activeTab === 'vendor_bills'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b pb-3">
            <div>
              <h3 class="text-sm font-black text-slate-900">📦 సప్లయర్ల బిల్లులు & బాకీల చిట్టా (Vendor Ledger)</h3>
              <p class="text-xs text-slate-500">సిమెంట్, ఇసుక, కంకర డీలర్లకు ఇవ్వాల్సిన బకాయిల పక్కా లెక్క</p>
            </div>
            <div class="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-right">
              <span class="text-[10px] text-amber-800 font-bold block">మొత్తం చెల్లించాల్సిన బాకీ:</span>
              <span class="text-sm font-black font-mono text-amber-950">₹{totalDues.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {#each vendorDues as v}
              {@const due = Number(v.total_billed || 0) - Number(v.total_paid || 0)}
              <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-black text-slate-900">{v.vendor_name}</h4>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full {due > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}">
                    {due > 0 ? 'బాకీ ఉంది' : 'పూర్తిగా చెల్లించాం'}
                  </span>
                </div>
                <div class="text-xs space-y-1 font-mono pt-1 border-t border-slate-200">
                  <div class="flex justify-between text-slate-500"><span>మొత్తం బిల్లు:</span> <span>₹{Number(v.total_billed).toLocaleString('en-IN')}</span></div>
                  <div class="flex justify-between text-slate-500"><span>చెల్లించినది:</span> <span class="text-emerald-700">₹{Number(v.total_paid).toLocaleString('en-IN')}</span></div>
                  <div class="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200"><span>ఇవ్వాల్సిన బాకీ:</span> <span class="text-amber-800 text-sm">₹{due.toLocaleString('en-IN')}</span></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- TAB 5: OWN GST TAX INVOICE & RA BILL MAKER -->
      {#if activeTab === 'own_invoice'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 class="text-base font-black text-slate-900">🧾 A.S.V. ENTERPRISES అధికారిక GST ట్యాక్స్ ఇన్వాయిస్</h3>
              <p class="text-xs text-slate-500">పంచాయతీకి సమర్పించే రన్నింగ్ అకౌంట్ (RA) బిల్లు & డిడక్షన్ల ఆడిట్</p>
            </div>
            <button
              type="button"
              on:click={() => showPrintInvoice = !showPrintInvoice}
              class="bg-slate-950 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl shadow cursor-pointer"
            >
              {showPrintInvoice ? 'ఎడిట్ మోడ్' : '📄 ఇన్వాయిస్ ప్రివ్యూ & ప్రింట్'}
            </button>
          </div>

          {#if !showPrintInvoice}
            <div class="space-y-4 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">ఇన్వాయిస్ నంబర్</label>
                  <input type="text" bind:value={inv_no} class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">తేదీ</label>
                  <input type="date" bind:value={inv_date} class="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">HSN/SAC కోడ్</label>
                  <input type="text" bind:value={inv_sac} class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold" />
                </div>
              </div>

              <!-- Bill Items Configuration -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-black text-slate-900">బిల్లు ఐటమ్స్ (Bill Items):</span>
                  <button type="button" on:click={addInvoiceItem} class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1 rounded-lg">+ ఐటమ్ చేర్చండి</button>
                </div>

                {#each inv_items as item, idx}
                  <div class="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 items-center">
                    <div class="col-span-12 sm:col-span-6">
                      <input type="text" bind:value={item.desc} placeholder="పని పేరు / వివరణ" class="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold" />
                    </div>
                    <div class="col-span-3 sm:col-span-2">
                      <input type="number" bind:value={item.qty} placeholder="Qty" class="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono" />
                    </div>
                    <div class="col-span-4 sm:col-span-2">
                      <input type="number" bind:value={item.rate} placeholder="Rate ₹" class="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono" />
                    </div>
                    <div class="col-span-4 sm:col-span-1 text-right font-mono font-black text-slate-900">
                      ₹{(Number(item.qty) * Number(item.rate)).toLocaleString('en-IN')}
                    </div>
                    <div class="col-span-1 text-right">
                      <button type="button" on:click={() => removeInvoiceItem(idx)} class="text-red-600 font-bold">×</button>
                    </div>
                  </div>
                {/each}
              </div>

              <!-- Deductions Audit Card -->
              <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2">
                <span class="font-black text-amber-950 block">🏛️ ప్రభుత్వ కట్టింపుల ఆడిట్ (Deductions Audit):</span>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div class="bg-white p-2 rounded-xl border border-amber-200">
                    <span class="text-[10px] text-slate-500 block">GST-TDS (2%)</span>
                    <span class="font-bold text-rose-700">₹{dedGstTds.toFixed(2)}</span>
                  </div>
                  <div class="bg-white p-2 rounded-xl border border-amber-200">
                    <span class="text-[10px] text-slate-500 block">IT-TDS (1%)</span>
                    <span class="font-bold text-rose-700">₹{dedItTds.toFixed(2)}</span>
                  </div>
                  <div class="bg-white p-2 rounded-xl border border-amber-200">
                    <span class="text-[10px] text-slate-500 block">Labour Cess (1%)</span>
                    <span class="font-bold text-rose-700">₹{dedCess.toFixed(2)}</span>
                  </div>
                  <div class="bg-white p-2 rounded-xl border border-amber-200">
                    <span class="text-[10px] text-slate-500 block">FSD Deposit (5%)</span>
                    <span class="font-bold text-amber-800">₹{dedFsd.toFixed(2)}</span>
                  </div>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-amber-200 font-bold">
                  <span>బ్యాంక్ ఖాతాలో జమ అయ్యే నికర సొమ్ము:</span>
                  <span class="text-sm font-black text-emerald-800 font-mono">₹{netBankPayable.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          {:else}
            <!-- Printable Tax Invoice Format -->
            <div class="bg-white border-2 border-slate-900 p-6 rounded-2xl space-y-4 shadow-xl text-xs" id="print-area">
              <div class="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                  <h2 class="text-base font-black text-slate-900 font-serif">A.S.V. ENTERPRISES</h2>
                  <p class="text-[11px] text-slate-600">సివిల్ కాంట్రాక్టర్ & జనరల్ సప్లయర్స్</p>
                  <p class="text-[11px] text-slate-600">ముత్తారం, పెద్దపల్లి జిల్లా, తెలంగాణ</p>
                  <p class="text-xs font-mono font-bold text-slate-900 mt-1">GSTIN: 36AMXPA2915K1ZR</p>
                </div>
                <div class="text-right">
                  <span class="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[10px]">TAX INVOICE</span>
                  <p class="font-mono font-bold pt-1">Invoice: {inv_no}</p>
                  <p>Date: {inv_date}</p>
                </div>
              </div>

              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-y border-slate-900 bg-slate-50 font-bold">
                    <th class="p-1.5">పని వివరణ</th>
                    <th class="p-1.5 text-center">పరిమాణం</th>
                    <th class="p-1.5 text-right">రేట్ (₹)</th>
                    <th class="p-1.5 text-right">మొత్తం (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {#each inv_items as it}
                    <tr class="border-b border-slate-200">
                      <td class="p-1.5 font-bold">{it.desc}</td>
                      <td class="p-1.5 text-center font-mono">{it.qty} {it.unit}</td>
                      <td class="p-1.5 text-right font-mono">₹{Number(it.rate).toLocaleString('en-IN')}</td>
                      <td class="p-1.5 text-right font-mono font-bold">₹{(it.qty * it.rate).toLocaleString('en-IN')}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>

              <div class="flex justify-end pt-2">
                <div class="w-56 space-y-1 font-mono">
                  <div class="flex justify-between"><span>Taxable:</span> <span>₹{invSubtotal.toLocaleString('en-IN')}</span></div>
                  <div class="flex justify-between text-slate-600"><span>CGST (9%):</span> <span>₹{(invTax / 2).toFixed(2)}</span></div>
                  <div class="flex justify-between text-slate-600"><span>SGST (9%):</span> <span>₹{(invTax / 2).toFixed(2)}</span></div>
                  <div class="flex justify-between font-black border-t-2 border-slate-900 pt-1 text-sm"><span>Grand Total:</span> <span>₹{invGrandTotal.toLocaleString('en-IN')}</span></div>
                </div>
              </div>

              <div class="no-print pt-3 flex justify-end">
                <button type="button" on:click={() => window.print()} class="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl">🖨️ ప్రింట్ తీసుకోండి</button>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- TAB 6: STAGE-WISE PHOTO ALBUM (ALL PHOTOS GALLERY) -->
      {#if activeTab === 'album'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="border-b pb-3">
            <h3 class="text-sm font-black text-slate-900">📸 ప్రహరీ నిర్మాణ దశలవారీ ఫోటో ఆల్బమ్</h3>
            <p class="text-xs text-slate-500">శంకుస్థాపన పూజ, గుంతల తవ్వకం నుండి గోడ పూర్తయ్యే వరకు అధికారిక గ్యాలరీ</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {#each gdEntries as entry}
              {#if entry.site_photo_url}
                {@const photos = entry.site_photo_url.split(',')}
                {#each photos as singlePic}
                  <div class="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <img src={singlePic} alt="Site Stage" class="w-full h-44 object-cover" />
                    <div class="p-3 text-xs space-y-1">
                      <span class="font-bold text-slate-900 block">{entry.work_progress_desc || 'సైట్ ప్రోగ్రెస్'}</span>
                      <p class="text-[10px] text-slate-500 font-mono">📅 {entry.entry_date}</p>
                      <a href={singlePic} target="_blank" class="text-[11px] text-blue-600 font-bold block pt-1 underline">పూర్తి సైజు చూడండి ↗</a>
                    </div>
                  </div>
                {/each}
              {/if}
            {/each}
          </div>
        </div>
      {/if}

      <!-- TAB 7: SITE EMERGENCY CONTACTS (ADD, EDIT, DELETE, CALL, WHATSAPP) -->
      {#if activeTab === 'contacts'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          
          <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>📞 సైట్ అత్యవసర కాంటాక్ట్స్ డైరెక్టరీ</span>
              </h3>
              <p class="text-xs text-slate-500">అధికారులు, డీలర్లు, మేస్త్రీల ఫోన్ నంబర్లు మేనేజ్ చేసుకోండి</p>
            </div>

            <!-- + Kotha Contact Button -->
            <button
              type="button"
              on:click={openNewContactModal}
              class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-4 py-2 rounded-xl shadow flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>+ కొత్త కాంటాక్ట్ చేర్చండి</span>
            </button>
          </div>

          <!-- Add / Edit Modal Box -->
          {#if isContactModalOpen}
            <div class="bg-amber-50/70 border-2 border-amber-300 p-4 rounded-2xl space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-xs font-black text-amber-950">
                  {editingContactId ? '✏️ కాంటాక్ట్ ఎడిట్ చేయండి' : '+ కొత్త కాంటాక్ట్ వివరాలు'}
                </span>
                <button
                  type="button"
                  on:click={() => isContactModalOpen = false}
                  class="text-xs text-slate-500 hover:text-black font-bold"
                >
                  ✕ రద్దు చేయండి
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-bold">
                <div>
                  <label class="block text-[11px] text-slate-700 mb-1">ఐకాన్ (Emoji)</label>
                  <select bind:value={c_icon} class="w-full bg-white border border-slate-300 rounded-xl p-2">
                    <option value="🏛️">🏛️ అధికారి (AE/Govt)</option>
                    <option value="📋">📋 సెక్రటరీ (Secretary)</option>
                    <option value="👑">👑 సర్పంచ్ (Sarpanch)</option>
                    <option value="🚜">🚜 జేసీబీ / ట్రాక్టర్</option>
                    <option value="🚚">🚚 మెటీరియల్ సప్లయర్</option>
                    <option value="🏪">🏪 సిమెంట్/స్టీల్ డీలర్</option>
                    <option value="👷">👷 మేస్త్రీ / కూలీ</option>
                    <option value="⚡">⚡ ఎలక్ట్రీషియన్ / ప్లంబర్</option>
                    <option value="📞">📞 ఇతర కాంటాక్ట్</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[11px] text-slate-700 mb-1">హోదా / కేటగిరీ *</label>
                  <input
                    type="text"
                    bind:value={c_role}
                    placeholder="ఉదా: పంచాయతీ ఏఈ (AE)"
                    class="w-full bg-white border border-slate-300 rounded-xl p-2"
                  />
                </div>

                <div>
                  <label class="block text-[11px] text-slate-700 mb-1">వ్యక్తి / షాప్ పేరు *</label>
                  <input
                    type="text"
                    bind:value={c_name}
                    placeholder="ఉదా: సురేష్ రావు గారు"
                    class="w-full bg-white border border-slate-300 rounded-xl p-2"
                  />
                </div>

                <div>
                  <label class="block text-[11px] text-slate-700 mb-1">మొబైల్ నంబర్ *</label>
                  <input
                    type="tel"
                    bind:value={c_phone}
                    placeholder="10 అంకెల నంబర్"
                    class="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono"
                  />
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  on:click={() => isContactModalOpen = false}
                  class="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl"
                >
                  క్యాన్సిల్
                </button>
                <button
                  type="button"
                  on:click={saveContact}
                  class="bg-slate-950 text-white text-xs font-black px-4 py-1.5 rounded-xl shadow"
                >
                  {editingContactId ? 'అప్‌డేట్ చేయండి' : 'సేవ్ చేయండి'}
                </button>
              </div>
            </div>
          {/if}

          <!-- Contacts Grid Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each siteContacts as c (c.id)}
              <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between text-xs space-y-3 hover:border-slate-300 transition shadow-sm">
                
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="text-2xl p-2 bg-white rounded-xl border border-slate-200 shadow-sm">{c.icon || '📞'}</span>
                    <div>
                      <h4 class="font-black text-slate-900 text-xs">{c.role}</h4>
                      <p class="text-[11px] text-slate-600 font-medium">{c.name}</p>
                      <p class="text-xs font-mono font-black text-slate-800 pt-0.5">{c.phone}</p>
                    </div>
                  </div>

                  <!-- Edit / Delete Controls -->
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      on:click={() => startEditContact(c)}
                      class="w-7 h-7 bg-white hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold border border-slate-200 shadow-sm transition"
                      title="ఎడిట్ చేయండి"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      on:click={() => deleteContact(c.id, c.name)}
                      class="w-7 h-7 bg-white hover:bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center font-bold border border-slate-200 shadow-sm transition"
                      title="తొలగించండి"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <!-- 1-Click Call & WhatsApp Action Buttons -->
                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <a
                    href="tel:{c.phone}"
                    class="bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-xl flex items-center justify-center gap-1 shadow transition"
                  >
                    <span>📞 కాల్</span>
                  </a>
                  <a
                    href="https://api.whatsapp.com/send?phone=91{c.phone.replace(/\D/g,'')}"
                    target="_blank"
                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 rounded-xl flex items-center justify-center gap-1 shadow transition"
                  >
                    <span>💬 WhatsApp</span>
                  </a>
                </div>

              </div>
            {/each}
          </div>

        </div>
      {/if}

      <!-- TAB 8: LIVE EXECUTIVE DASHBOARD -->
      {#if activeTab === 'dashboard'}
        <div class="space-y-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[11px] font-bold text-slate-500 block">మొత్తం జమలు (Credits)</span>
              <span class="text-base sm:text-lg font-black font-mono text-emerald-700">₹{totalCredits.toLocaleString('en-IN')}</span>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[11px] font-bold text-slate-500 block">మొత్తం ఖర్చులు (Debits)</span>
              <span class="text-base sm:text-lg font-black font-mono text-rose-700">₹{totalDebits.toLocaleString('en-IN')}</span>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[11px] font-bold text-slate-500 block">చేతిలో నగదు (Cash Balance)</span>
              <span class="text-base sm:text-lg font-black font-mono {cashBalance >= 0 ? 'text-blue-700' : 'text-red-700'}">₹{cashBalance.toLocaleString('en-IN')}</span>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[11px] font-bold text-slate-500 block">ఇవ్వాల్సిన బాకీలు (Dues)</span>
              <span class="text-base sm:text-lg font-black font-mono text-amber-700">₹{totalDues.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      {/if}

    </main>
  </div>
{/if}

<style>
  @media print {
    :global(header), :global(nav), .no-print {
      display: none !important;
    }
    #print-area {
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
  }
</style>