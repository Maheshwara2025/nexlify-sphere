<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let labourRecords = [];
  let profiles = [];
  let loading = true;
  let showAttendanceModal = false;
  let showProfileModal = false;

  // New Profile Form
  let profileForm = {
    worker_id: '',
    name: '',
    phone: '',
    aadhar_no: '',
    role: 'పునాది తవ్వకం కూలీ (Excavation Labour)',
    daily_rate: 800,
    address: 'ముత్తారం'
  };

  // Daily Muster Attendance Form
  let form = {
    date: '2026-10-04',
    worker_id: '',
    worker_name: '',
    role: 'పునాది తవ్వకం కూలీ (Excavation Labour)',
    work_task: 'పునాది తవ్వకం & రాతి కట్టడం బేస్‌మెంట్',
    days: 1,
    daily_rate: 800,
    advance_paid: 0
  };

  onMount(async () => {
    await fetchAll();
  });

  async function fetchAll() {
    loading = true;
    const { data: profs } = await supabase.from('contractor_labour_profiles').select('*').order('id', { ascending: true });
    profiles = profs ? profs : [];

    const { data: records } = await supabase.from('contractor_labour').select('*').order('date', { ascending: false });
    labourRecords = records ? records : [];
    loading = false;
  }

  function openNewProfileModal() {
    const nextNum = 101 + profiles.length;
    profileForm = {
      worker_id: 'LBR-' + nextNum,
      name: '',
      phone: '',
      aadhar_no: '',
      role: 'పునాది తవ్వకం కూలీ (Excavation Labour)',
      daily_rate: 800,
      address: 'ముత్తారం'
    };
    showProfileModal = true;
  }

  async function saveProfile() {
    if (!profileForm.name || !profileForm.worker_id) {
      alert('Dayachesi peru mariyu Worker ID enter cheyandi.');
      return;
    }

    const { error } = await supabase.from('contractor_labour_profiles').insert([profileForm]);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      showProfileModal = false;
      await fetchAll();
    }
  }

  function onSelectWorkerName(e) {
    const selectedName = e.target.value;
    const found = profiles.find(p => p.name === selectedName);
    if (found) {
      form.worker_id = found.worker_id;
      form.role = found.role;
      form.daily_rate = found.daily_rate;
    }
  }

  async function addAttendance() {
    if (!form.worker_name || !form.daily_rate) {
      alert('Dayachesi kooli peru mariyu daily rate enter cheyandi.');
      return;
    }

    const totalEarned = Number(form.days || 1) * Number(form.daily_rate);
    const advance = Number(form.advance_paid || 0);

    const { error } = await supabase.from('contractor_labour').insert([{
      date: form.date,
      worker_id: form.worker_id || ('LBR-' + (100 + profiles.length)),
      worker_name: form.worker_name,
      role: form.role,
      work_task: form.work_task,
      days: Number(form.days || 1),
      daily_rate: Number(form.daily_rate),
      advance_paid: advance
    }]);

    if (!error) {
      // Auto-post advance to General Ledger if advance is paid
      if (advance > 0) {
        await supabase.from('contractor_transactions').insert([{
          date: form.date,
          category: 'Labour & Mestri',
          description: `${form.worker_name} (${form.role}) - కూలీ అడ్వాన్స్`,
          amount: advance,
          source: 'Cash',
          recipient: form.worker_name,
          balance: 0,
          status: 'Paid'
        }]);
      }

      const curDate = form.date;
      showAttendanceModal = false;
      form = {
        date: curDate,
        worker_id: '',
        worker_name: '',
        role: 'పునాది తవ్వకం కూలీ (Excavation Labour)',
        work_task: 'పునాది తవ్వకం & రాతి కట్టడం బేస్‌మెంట్',
        days: 1,
        daily_rate: 800,
        advance_paid: 0
      };
      await fetchAll();
    } else {
      alert('Save cheyadam fail ayindi: ' + error.message);
    }
  }

  async function deleteLabour(id) {
    if (!confirm('Ee kooli attendance record ni tholaginchala?')) return;
    const { error } = await supabase.from('contractor_labour').delete().eq('id', id);
    if (!error) {
      labourRecords = labourRecords.filter(l => l.id !== id);
    }
  }
</script>

<svelte:head>
  <title>లేబర్ మాస్టర్ & హాజరు | A.S.V. Contractor 360°</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-4">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← ప్రధాన డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">👷 లేబర్ DBMS మాస్టర్ & డైలీ వర్క్ హాజరు</h1>
        <p class="text-xs text-slate-500">వ్యక్తిగత ఐడీ (Worker ID), ఆధార్, ఫోన్ నంబర్లు, రోజూ చేసిన పని & వేతనాల రికార్డు</p>
      </div>

      <div class="flex items-center gap-2">
        <button on:click={openNewProfileModal} class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3 py-2 rounded-xl shadow transition cursor-pointer">
          👤 కొత్త కూలీ ప్రొఫైల్ (DBMS ID)
        </button>
        <button on:click={() => showAttendanceModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition cursor-pointer">
          ➕ రోజువారీ హాజరు నమోదు
        </button>
      </div>
    </div>

    <!-- Attendance Table -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div class="p-3 bg-slate-900 text-white flex justify-between items-center text-xs font-bold">
        <span>📜 రోజువారీ లేబర్ హాజరు & వారు చేసిన పని రికార్డులు</span>
        <span class="text-amber-300 font-mono">మొత్తం రికార్డులు: {labourRecords.length}</span>
      </div>

      {#if loading}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">లోడ్ అవుతోంది...</div>
      {:else if labourRecords.length === 0}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">ప్రస్తుతం ఎలాంటి రికార్డులు లేవు.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-100 text-slate-700 uppercase text-[11px] border-b">
                <th class="p-3">తేదీ</th>
                <th class="p-3">ID & కూలీ పేరు</th>
                <th class="p-3">పని రకం (Role)</th>
                <th class="p-3">ఆ రోజు చేసిన పని (Daily Task)</th>
                <th class="p-3 text-center">రోజులు</th>
                <th class="p-3 text-right">రేటు (₹)</th>
                <th class="p-3 text-right">సంపాదన (₹)</th>
                <th class="p-3 text-right">అడ్వాన్స్ (₹)</th>
                <th class="p-3 text-right font-black text-rose-600">నికర బాకీ (₹)</th>
                <th class="p-3 text-center">చర్య</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each labourRecords as l}
                {@const totalEarned = Number(l.days) * Number(l.daily_rate)}
                {@const balanceDue = totalEarned - Number(l.advance_paid || 0)}
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3 font-mono text-slate-500">{l.date}</td>
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
                  <td class="p-3 text-center">
                    <button on:click={() => deleteLabour(l.id)} class="text-rose-500 font-bold hover:text-rose-700">✕</button>
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
            <label class="block font-bold text-slate-700 mb-1">ఆధార్ నంబర్ (Optional)</label>
            <input type="text" bind:value={profileForm.aadhar_no} placeholder="XXXX XXXX XXXX" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono" />
          </div>
        </div>

        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl shadow transition cursor-pointer">
          DBMS లో భద్రపరచండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}

<!-- Modal 2: Daily Attendance & Specific Work Task -->
{#if showAttendanceModal}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
    <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">👷 రోజువారీ హాజరు నమోదు</h3>
        <button on:click={() => showAttendanceModal = false} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={addAttendance} class="space-y-3">
        <div>
          <label class="block font-bold text-slate-700 mb-1">పని తేదీ *</label>
          <input type="date" bind:value={form.date} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">కూలీ / మేస్త్రి పేరు (DBMS Link) *</label>
          <input 
            type="text" 
            list="worker-names" 
            bind:value={form.worker_name} 
            on:input={onSelectWorkerName} 
            required 
            placeholder="పేరు ఎంచుకోండి లేదా టైప్ చేయండి" 
            class="w-full bg-amber-50 border border-amber-300 rounded-xl p-2.5 font-bold" 
          />
          <datalist id="worker-names">
            {#each profiles as p}
              <option value={p.name}>{p.worker_id} - {p.role}</option>
            {/each}
          </datalist>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">ఆ రోజు చేసిన పని వివరాలు (Work Done) *</label>
          <input type="text" bind:value={form.work_task} required placeholder="ఉదా: ఉత్తరం వైపు పునాది తవ్వకం / పిల్లర్ రాడ్ బెండింగ్" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
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

        <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition cursor-pointer">
          హాజరు నమోదు చేయండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}