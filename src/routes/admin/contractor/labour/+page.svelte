<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { readAllRows, dataErrorMessage, projectToday } from '$lib/contractor/data.js';
  import { runFinancialMutation, FINANCIAL_WRITES_ENABLED } from '$lib/contractor/financial-write-gate.js';
  import { STAGE3_ATOMIC_ENTRIES_ENABLED, createAtomicEntryPoster } from '$lib/contractor/atomic-entry-client.js';
  const postEntry = createAtomicEntryPoster(supabase);
  let savingProfile = false;
  let savingAttendance = false;
  let savingPayment = false;
  let paymentRow = null;
  let paymentAmount = '';
  let paymentFunding = 'Cash';

  let dataError = '';
  let mutationError = '';

  let labourRecords = [];
  let profiles = [];
  let loading = true;
  let showAttendanceModal = false;
  let editRow = null;
  let editSaving = false;
  let editError = '';
  let editSuccess = '';
  let editForm = { date: '', work_task: '', days: 1, daily_rate: 800, reason: '' };
  $: editDateConflict = editRow && labourRecords.find(row =>
    row.id !== editRow.id && row.worker_id === editRow.worker_id && row.date === editForm.date
  ) || null;
  let attendanceWarning = '';
  let attendanceSaveError = '';

  $: duplicateAttendance = labourRecords.find(row =>
    form.worker_id && form.date && row.worker_id === form.worker_id && row.date === form.date
  ) || null;
  $: if (duplicateAttendance) attendanceWarning = 'ఈ కార్మికుడికి ఈ తేదీన హాజరు ఇప్పటికే నమోదైంది (Already Entered). మరోసారి సేవ్ చేయలేరు.';
  $: if (!duplicateAttendance) attendanceWarning = '';

  let showProfileModal = false;

  let profileForm = {
    worker_id: '',
    name: '',
    phone: '',
    aadhar_no: '',
    role: 'పునాది తవ్వకం కూలీ (Excavation Labour)',
    daily_rate: 800,
    address: 'Mutharam'
  };

  let form = {
    date: projectToday(),
    worker_id: '',
    worker_name: '',
    role: 'పునాది తవ్వకం కూలీ (Excavation Labour)',
    work_task: 'పునాది తవ్వకం & రాతి కట్టడం బేస్‌మెంట్',
    days: 1,
    daily_rate: 800,
    advance_paid: 0,
    funding_source: 'Cash'
  };

  onMount(async () => {
    await fetchAll();
  });

  async function fetchAll() {
    loading = true;
    dataError = '';
    try {
      const [workers, attendance] = await Promise.all([readAllRows(supabase,'contractor_labour_profiles',{ascending:true}),readAllRows(supabase,'contractor_labour',{orderBy:'date'})]);
      profiles=workers; labourRecords=attendance;
    } catch (error) {
      dataError = dataErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  function openNewProfileModal() {
    const nextNum = String(profiles.length + 1).padStart(3, '0');
    profileForm = {
      worker_id: 'LBR-' + nextNum,
      name: '',
      phone: '',
      aadhar_no: '',
      role: 'పునాది తవ్వకం కూలీ (Excavation Labour)',
      daily_rate: 800,
      address: 'Mutharam'
    };
    showProfileModal = true;
  }

  async function saveProfile() {
    if (savingProfile) return;
    savingProfile = true; mutationError = '';
    try {
      await postEntry('worker_profile', profileForm);
      showProfileModal = false;
      await fetchAll();
    } catch (error) { mutationError = dataErrorMessage(error); }
    finally { savingProfile = false; }
  }

  function handleProfileSelect(e) {
    const selectedId = e.target.value;
    const found = profiles.find(p => p.worker_id === selectedId);
    if (found) {
      form.worker_id = found.worker_id;
      form.worker_name = found.name;
      form.role = found.role;
      form.daily_rate = found.daily_rate;
    }
  }

  async function addAttendance() {
    if (savingAttendance) return;
    attendanceSaveError = '';
    if (form.date > projectToday()) {
      attendanceSaveError = 'భవిష్యత్తు తేదీకి హాజరు నమోదు చేయలేరు. తేదీని సరిచూడండి.';
      return;
    }
    if (!form.worker_id || !form.date) {
      attendanceSaveError = 'తేదీ మరియు కార్మికుడిని ఎంచుకోండి.';
      return;
    }
    // Friendly client check. The database UNIQUE constraint is the final authority.
    if (duplicateAttendance) {
      attendanceSaveError = attendanceWarning;
      return;
    }
    savingAttendance = true; mutationError = '';
    try {
      // A second operator or browser might have saved the record since this page loaded.
      const { data: existing, error: checkError } = await supabase.from('contractor_labour')
        .select('id').eq('worker_id', form.worker_id).eq('date', form.date).limit(1);
      if (checkError) throw checkError;
      if (existing?.length) {
        attendanceSaveError = 'ఈ కార్మికుడికి ఈ తేదీన హాజరు ఇప్పటికే నమోదైంది (Already Entered).';
        await fetchAll();
        return;
      }
      await postEntry('attendance', form);
      showAttendanceModal = false;
      await fetchAll();
    } catch (error) {
      // PostgreSQL UNIQUE violation (23505) is authoritative for concurrent submits.
      if (error?.code === '23505' || /contractor_labour_worker_date_unique|duplicate key value/i.test(error?.message || '')) {
        attendanceSaveError = 'ఈ కార్మికుడికి ఈ తేదీన హాజరు ఇప్పటికే నమోదైంది (Already Entered).';
      } else {
        attendanceSaveError = dataErrorMessage(error);
      }
      await fetchAll();
    } finally { savingAttendance = false; }
  }

  function openEditAttendance(row) {
    editRow = {...row};
    editForm = {
      date: row.date,
      work_task: row.work_task || '',
      days: Number(row.days || 1),
      daily_rate: Number(row.daily_rate || 0),
      reason: ''
    };
    editError = '';
    editSuccess = '';
  }

  async function saveAttendanceEdit() {
    if (!editRow || editSaving) return;
    editError = '';
    if (!editForm.date || editForm.date > projectToday()) {
      editError = 'భవిష్యత్తు తేదీకి హాజరు నమోదు చేయలేరు. అసలు పని తేదీని ఎంచుకోండి.';
      return;
    }
    if (editDateConflict) {
      editError = 'ఈ కార్మికుడికి ఎంచుకున్న తేదీన హాజరు ఇప్పటికే ఉంది (Already Entered).';
      return;
    }
    if (!editForm.reason.trim() || editForm.reason.trim().length < 5) {
      editError = 'సవరణ ఎందుకు చేస్తున్నారో కారణం నమోదు చేయండి.';
      return;
    }
    editSaving = true;
    try {
      const {data, error} = await supabase.rpc('contractor_edit_attendance_v1', {
        p_attendance_id: editRow.id,
        p_patch: {
          date: editForm.date, work_task: editForm.work_task.trim(),
          days: Number(editForm.days), daily_rate: Number(editForm.daily_rate)
        },
        p_expected: {
          date: editRow.date, work_task: editRow.work_task,
          days: Number(editRow.days), daily_rate: Number(editRow.daily_rate)
        },
        p_reason: editForm.reason.trim()
      });
      if (error) throw error;
      if (!data?.success) throw new Error('Database సవరణ నిర్ధారించలేదు.');
      editRow = null;
      await fetchAll();
      editSuccess = 'హాజరు సవరణ పూర్తయింది. పాత–కొత్త వివరాలు Audit Historyలో భద్రపరచబడ్డాయి.';
    } catch (error) {
      const message = error?.message || '';
      if (error?.code === '23505' || /contractor_labour_worker_date_unique|duplicate key/i.test(message))
        editError = 'ఈ కార్మికుడికి ఎంచుకున్న తేదీన హాజరు ఇప్పటికే ఉంది (Already Entered).';
      else if (/FUTURE_ATTENDANCE_NOT_ALLOWED/.test(message))
        editError = 'భవిష్యత్తు తేదీకి హాజరు నమోదు చేయలేరు.';
      else if (/ATTENDANCE_HAS_PAYMENTS/.test(message))
        editError = 'ఈ హాజరుకు చెల్లింపు/అడ్వాన్స్ ఉంది. నేరుగా మార్చలేరు; లెక్కలు పరిశీలించాలి.';
      else editError = dataErrorMessage(error);
    } finally {
      editSaving = false;
    }
  }

  async function saveLabourPayment() {
    if (!paymentRow || savingPayment) return;
    savingPayment = true; mutationError = '';
    try {
      await postEntry('labour_payment', {
        labour_id: paymentRow.id, date: projectToday(),
        amount: paymentAmount, funding_source: paymentFunding
      });
      paymentRow = null;
      await fetchAll();
    } catch (error) { mutationError = dataErrorMessage(error); }
    finally { savingPayment = false; }
  }

  async function deleteLabour(id) {
    try {
      await runFinancialMutation('reverse-attendance', {id});
    } catch (error) {
      mutationError = dataErrorMessage(error);
    }
  }
</script>

<svelte:head>
  <title>లేబర్ DBMS మాస్టర్ | A.S.V. Contractor 360°</title>
</svelte:head>
{#if dataError}
  <div role="alert" class="m-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">{dataError} <button type="button" on:click={fetchAll} class="ml-3 font-bold underline">మళ్లీ ప్రయత్నించండి</button></div>
{/if}
{#if editSuccess}
  <p role="status" class="m-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">{editSuccess}</p>
{/if}
{#if mutationError}
  <p role="alert" class="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{mutationError}</p>
{/if}
{#if !dataError}


<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-4">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← ప్రధాన డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">👷 లేబర్ DBMS మాస్టర్ & డైలీ వర్క్ హాజరు</h1>
        <p class="text-xs text-slate-500">శాశ్వత ఐడీ (Worker ID: LBR-001), పాత్ర, రోజూ చేసిన పని & పేమెంట్ లెక్కలు</p>
      </div>

      <div class="flex items-center gap-2">
        <button on:click={openNewProfileModal} class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3 py-2 rounded-xl shadow transition cursor-pointer">
          👤 కొత్త వర్కర్ ప్రొఫైల్ (DBMS ID)
        </button>
        <button on:click={() => showAttendanceModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition cursor-pointer">
          ➕ రోజువారీ హాజరు నమోదు
        </button>
      </div>
    </div>

    <!-- Active Worker Profiles Strip -->
    <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
      <div class="flex justify-between items-center border-b pb-2">
        <span class="text-xs font-black text-slate-900 uppercase">రిజిస్టర్ అయిన వర్కర్ ప్రొఫైల్స్ ({profiles.length})</span>
        <button on:click={openNewProfileModal} class="text-xs font-bold text-indigo-600 hover:underline">+ కొత్త ప్రొఫైల్ చేర్చండి</button>
      </div>
      {#if profiles.length === 0}
        <div class="text-xs text-slate-400 py-2">ఇంకా వర్కర్ ప్రొఫైల్స్ నమోదు కాలేదు. పైన ఉన్న బటన్ నొక్కి వర్కర్లను చేర్చండి.</div>
      {:else}
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {#each profiles as p}
            <div class="p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span class="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{p.worker_id}</span>
              <strong class="block text-slate-900 truncate mt-1">{p.name}</strong>
              <span class="text-[10px] text-slate-500 block truncate">{p.role}</span>
              <span class="text-[10.5px] font-mono font-bold text-emerald-700">₹{p.daily_rate}/రోజు</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Attendance Table -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div class="p-3 bg-slate-900 text-white flex justify-between items-center text-xs font-bold">
        <span>📜 రోజువారీ లేబర్ హాజరు & వారు చేసిన పని రికార్డులు</span>
        <span class="text-amber-300 font-mono">మొత్తం: {labourRecords.length} · <span class="text-rose-300">భవిష్యత్తు తేదీలు: {labourRecords.filter(row => row.date > projectToday()).length}</span></span>
      </div>

      {#if loading}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">లోడ్ అవుతోంది...</div>
      {:else if labourRecords.length === 0}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">ప్రస్తుతం ఎలాంటి హాజరు రికార్డులు లేవు.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-100 text-slate-700 uppercase text-[11px] border-b">
                <th class="p-3">తేదీ</th>
                <th class="p-3">ID & వర్కర్ పేరు</th>
                <th class="p-3">పని రకం</th>
                <th class="p-3">ఆ రోజు చేసిన నిర్దిష్ట పని</th>
                <th class="p-3 text-center">రోజులు</th>
                <th class="p-3 text-right">రేటు (₹)</th>
                <th class="p-3 text-right">మొత్తం (₹)</th>
                <th class="p-3 text-right">అడ్వాన్స్ (₹)</th>
                <th class="p-3 text-right font-black text-rose-600">నికర బాకీ (₹)</th>
                <th class="p-3 text-center">చర్య</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each labourRecords as l}
                {@const totalEarned = (l.days ? Number(l.days) : 1) * (l.daily_rate ? Number(l.daily_rate) : 0)}
                {@const balanceDue = totalEarned - (l.advance_paid ? Number(l.advance_paid) : 0)}
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3 font-mono text-slate-500">
                    {l.date}
                    {#if l.date > projectToday()}
                      <span class="mt-1 block whitespace-nowrap rounded bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">⚠️ భవిష్యత్తు తేదీ — సవరించండి</span>
                    {/if}
                  </td>
                  <td class="p-3">
                    <span class="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold mr-1">{l.worker_id || 'LBR'}</span>
                    <strong class="text-slate-900">{l.worker_name}</strong>
                  </td>
                  <td class="p-3 text-slate-600 font-bold">{l.role}</td>
                  <td class="p-3 text-slate-800 font-medium">{l.work_task || 'సైట్ జనరల్ సివిల్ వర్క్'}</td>
                  <td class="p-3 text-center font-mono">{l.days}</td>
                  <td class="p-3 text-right font-mono">₹ {l.daily_rate}</td>
                  <td class="p-3 text-right font-mono font-bold">₹ {totalEarned.toLocaleString('en-IN')}</td>
                  <td class="p-3 text-right font-mono text-emerald-700">₹ {Number(l.advance_paid || 0).toLocaleString('en-IN')}</td>
                  <td class="p-3 text-right font-mono font-black text-rose-600">₹ {balanceDue.toLocaleString('en-IN')}</td>
                  <td class="p-3 text-center whitespace-nowrap">
                    <button type="button" on:click={() => openEditAttendance(l)}
                      class="mr-2 rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800" aria-label="{l.worker_name} హాజరు సవరించండి">✎ సవరించు</button>
                    <button on:click={() => { paymentRow = l; paymentAmount = ''; paymentFunding = 'Cash'; }}
                    class="mr-2 rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">చెల్లింపు</button>
                  <button disabled={!FINANCIAL_WRITES_ENABLED} on:click={() => deleteLabour(l.id)} class="text-rose-500 font-bold hover:text-rose-700">✕</button>
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

<!-- Modal 1: Register New Worker DBMS Profile -->
{#if showProfileModal}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
    <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-xs">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">👤 కొత్త కూలీ DBMS ప్రొఫైల్ నమోదు</h3>
        <button on:click={() => showProfileModal = false} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={saveProfile} class="space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">వర్కర్ ID (Auto) *</label>
            <input type="text" bind:value={profileForm.worker_id} required class="w-full bg-slate-100 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">రోజూవారీ రేటు (₹) *</label>
            <input type="number" bind:value={profileForm.daily_rate} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">కూలీ / మేస్త్రి పూర్తి పేరు *</label>
          <input type="text" bind:value={profileForm.name} required placeholder="ఉదా: రాజేందర్ పాచే" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">పని రకం (Role)</label>
          <select bind:value={profileForm.role} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
            <option value="మేస్త్రి (Head Mason)">మేస్త్రి (Head Mason)</option>
            <option value="రాతి పని మేస్త్రి (Stone Mason)">రాతి పని మేస్త్రి (Stone Mason)</option>
            <option value="పునాది తవ్వకం కూలీ (Excavation Labour)">పునాది తవ్వకం కూలీ (Excavation Labour)</option>
            <option value="మహిళా కూలీ (Female Helper)">మహిళా కూలీ (Female Helper)</option>
            <option value="పురుష కూలీ (Male Helper)">పురుష కూలీ (Male Helper)</option>
            <option value="సెంట్రింగ్ వర్కర్ (Centring Worker)">సెంట్రింగ్ వర్కర్ (Centring Worker)</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">ఫోన్ నంబర్</label>
            <input type="tel" bind:value={profileForm.phone} placeholder="98480..." class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">గ్రామం / చిరునామా</label>
            <input type="text" bind:value={profileForm.address} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2" />
          </div>
        </div>

        <button disabled={!STAGE3_ATOMIC_ENTRIES_ENABLED || savingProfile} type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl shadow transition cursor-pointer">
          ప్రొఫైల్ సేవ్ చేయండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}

<!-- Modal 2: Daily Attendance with Direct Reliable Select Dropdown -->
{#if showAttendanceModal}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
    <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">👷 రోజువారీ హాజరు నమోదు</h3>
        <button type="button" on:click={() => { showAttendanceModal = false; attendanceSaveError = ''; }} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={addAttendance} class="space-y-3">
        {#if attendanceSaveError}
          <div role="alert" class="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{attendanceSaveError}</div>
        {/if}
        <div>
          <label class="block font-bold text-slate-700 mb-1">పని తేదీ *</label>
          <input type="date" bind:value={form.date} max={projectToday()} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          <p class="mt-1 text-[11px] text-slate-500">ఈరోజు లేదా గత తేదీ మాత్రమే. తేదీని సేవ్ చేసే ముందు సరిచూసుకోండి.</p>
        </div>

        <!-- RELIABLE SELECT DROPDOWN INSTEAD OF DATALIST -->
        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="font-bold text-slate-700">కూలీ / మేస్త్రి ప్రొఫైల్ ఎంచుకోండి *</label>
            <button type="button" on:click={openNewProfileModal} class="text-[10px] text-indigo-600 font-bold hover:underline">+ కొత్త ప్రొఫైల్</button>
          </div>
          <select on:change={handleProfileSelect} required class="w-full bg-amber-50 border border-amber-300 rounded-xl p-2.5 font-bold text-slate-900">
            <option value="">-- వర్కర్‌ను ఎంచుకోండి --</option>
            {#each profiles as p}
              <option value={p.worker_id}>{p.worker_id} - {p.name} ({p.role})</option>
            {/each}
          </select>
        </div>

        {#if duplicateAttendance}
          <div role="alert" class="p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm font-bold">
            ⚠️ {attendanceWarning}<br />Record ID: {duplicateAttendance.id} · {form.date}
          </div>
        {/if}

        {#if form.worker_name}
          <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div class="flex justify-between">
              <span class="text-slate-500">ఎంచుకున్న వర్కర్:</span>
              <strong class="text-slate-900">{form.worker_name} ({form.worker_id})</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">పాత్ర & వేతనం:</span>
              <span class="font-mono font-bold text-emerald-700">{form.role} • ₹{form.daily_rate}/రోజు</span>
            </div>
          </div>
        {/if}

        <div>
          <label class="block font-bold text-slate-700 mb-1">ఆ రోజు చేసిన నిర్దిష్ట పని (Specific Work Task) *</label>
          <input type="text" bind:value={form.work_task} required placeholder="ఉదా: పునాది తవ్వకం / రాతి కట్టడం బేస్‌మెంట్" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">పనిచేసిన రోజులు</label>
            <input type="number" step="any" bind:value={form.days} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">రోజువారీ రేటు (₹) *</label>
            <input type="number" bind:value={form.daily_rate} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">ఇచ్చిన అడ్వాన్స్ (Advance ₹ - ఆటో లెడ్జర్ లింక్)</label>
          <input type="number" bind:value={form.advance_paid} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold text-emerald-700" />
        </div>
        {#if Number(form.advance_paid || 0) > 0}
          <label class="block font-bold text-slate-700">అడ్వాన్స్ చెల్లింపు ఖాతా
            <select bind:value={form.funding_source} class="mt-1 w-full rounded-xl border p-2">
              <option value="Cash">Cash</option><option value="Bank">Bank</option><option value="UPI">UPI</option>
            </select>
          </label>
        {/if}

        <button disabled={!STAGE3_ATOMIC_ENTRIES_ENABLED || savingAttendance || !!duplicateAttendance} type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition cursor-pointer">
          {savingAttendance ? 'సేవ్ అవుతోంది…' : duplicateAttendance ? 'ఇప్పటికే నమోదు అయింది' : 'హాజరు నమోదు చేయండి ➔'}
        </button>
      </form>
    </div>
  </div>
{/if}
{/if}


<!-- Modal 3: Audited daily attendance correction -->
{#if editRow}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3">
    <div class="w-full max-w-md max-h-[92vh] overflow-y-auto space-y-4 rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
      <div class="flex items-start justify-between gap-2 border-b pb-3">
        <div>
          <h3 class="font-black text-base">✎ హాజరు సవరించండి (Edit Attendance)</h3>
          <p class="mt-1 text-xs text-slate-600">{editRow.worker_name} · {editRow.worker_id} · Record #{editRow.id}</p>
        </div>
        <button type="button" on:click={() => { editRow = null; editError = ''; }} class="rounded-lg px-2 py-1 text-slate-600" aria-label="మూసివేయండి">✕</button>
      </div>
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
        <strong>ముందుగా నమోదైన తేదీ: {editRow.date}</strong>
        {#if editRow.date > projectToday()}
          <p class="mt-1 font-bold text-red-700">⚠️ డిసెంబర్ వంటి భవిష్యత్తు తేదీ నమోదైంది. అసలు పని జరిగిన తేదీని ఎంచుకోండి.</p>
        {/if}
        <p class="mt-1">సవరణ పూర్తయిన తర్వాత పాత/కొత్త వివరాలు Auditలో నిల్వ ఉంటాయి. Worker ID మార్చలేరు.</p>
      </div>
      {#if editError}
        <p role="alert" class="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{editError}</p>
      {/if}
      {#if editDateConflict}
        <p role="alert" class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-950">
          ఈ కార్మికుడికి ఎంచుకున్న తేదీన హాజరు ఇప్పటికే నమోదైంది (Already Entered).
        </p>
      {/if}
      <form class="space-y-3" on:submit|preventDefault={saveAttendanceEdit}>
        <label class="block text-xs font-bold text-slate-700">సరైన పని తేదీ *
          <input type="date" bind:value={editForm.date} min="2000-01-01" max={projectToday()} required
            class="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm" />
        </label>
        <p class="text-[11px] text-slate-500">ఎంచుకున్న తేదీ (YYYY-MM-DD): {editForm.date || '—'} · ఈరోజు దాటకూడదు.</p>
        <label class="block text-xs font-bold text-slate-700">చేసిన పని *
          <input type="text" bind:value={editForm.work_task} maxlength="500" required
            class="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block text-xs font-bold text-slate-700">పనిచేసిన రోజులు *
            <input type="number" bind:value={editForm.days} min="0.5" max="31" step="0.5" required
              class="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" />
          </label>
          <label class="block text-xs font-bold text-slate-700">రోజువారీ రేటు (₹) *
            <input type="number" bind:value={editForm.daily_rate} min="0.01" step="0.01" required
              class="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" />
          </label>
        </div>
        <label class="block text-xs font-bold text-slate-700">సవరణకు కారణం *
          <textarea bind:value={editForm.reason} minlength="5" maxlength="400" required rows="2"
            placeholder="ఉదా: తేదీ పొరపాటున డిసెంబర్‌గా నమోదైంది"
            class="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"></textarea>
        </label>
        <p class="rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
          సవరించిన వేతనం: ₹{(Number(editForm.days || 0) * Number(editForm.daily_rate || 0)).toLocaleString('en-IN')}
        </p>
        <div class="flex gap-2">
          <button type="button" on:click={() => { editRow = null; editError = ''; }}
            class="flex-1 rounded-xl border border-slate-300 px-3 py-3 font-bold">రద్దు</button>
          <button type="submit"
            disabled={editSaving || !!editDateConflict || !editForm.date || editForm.date > projectToday() || Number(editRow.advance_paid || 0) > 0}
            class="flex-1 rounded-xl bg-indigo-700 px-3 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
            {editSaving ? 'సేవ్ అవుతోంది…' : 'సవరణ సేవ్ చేయండి'}
          </button>
        </div>
        {#if Number(editRow.advance_paid || 0) > 0}
          <p class="text-xs font-bold text-red-700">ఈ హాజరుకు Advance ఉంది. లెక్కలు పరిశీలించే వరకు సవరించలేరు.</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

{#if paymentRow}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3">
    <div class="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 text-slate-900">
      <div class="flex justify-between font-black"><span>కూలీ చెల్లింపు — {paymentRow.worker_name}</span>
        <button type="button" on:click={() => paymentRow=null}>✕</button>
      </div>
      <p class="text-xs text-slate-500">హాజరు # {paymentRow.id} · చెల్లించాల్సిన మొత్తం మించకూడదు.</p>
      <form class="space-y-3" on:submit|preventDefault={saveLabourPayment}>
        <label class="block text-xs font-bold">మొత్తం ₹
          <input type="number" min="0.01" step="0.01" required bind:value={paymentAmount}
            class="mt-1 w-full rounded-lg border p-2" />
        </label>
        <label class="block text-xs font-bold">Payment Account
          <select bind:value={paymentFunding} class="mt-1 w-full rounded-lg border p-2">
            <option value="Cash">Cash</option><option value="Bank">Bank</option><option value="UPI">UPI</option>
          </select>
        </label>
        <button disabled={!STAGE3_ATOMIC_ENTRIES_ENABLED || savingPayment} type="submit"
          class="w-full rounded-lg bg-emerald-700 p-3 font-black text-white disabled:opacity-50">
          {savingPayment ? 'Saving...' : 'Atomic Payment Save'}
        </button>
      </form>
    </div>
  </div>
{/if}
