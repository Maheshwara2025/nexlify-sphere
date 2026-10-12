<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let dailyLogs = [];
  let labourRecords = [];
  let loading = true;
  let showModal = false;
  let previewPhoto = null;

  let form = {
    date: '2026-10-04',
    work_title: '',
    section_location: 'కాంపౌండ్ వాల్ / పునాది సైట్',
    assigned_mestri: '',
    workers_count: 1,
    work_status: 'Completed',
    site_photo: '',
    notes: '',
    gang_breakdown: ''
  };

  onMount(async () => {
    await fetchLogs();
  });

  async function fetchLogs() {
    loading = true;
    const { data: logs } = await supabase
      .from('contractor_daily_works')
      .select('*')
      .order('date', { ascending: false });
    dailyLogs = logs ? logs : [];

    const { data: labours } = await supabase
      .from('contractor_labour')
      .select('*')
      .order('id', { ascending: false });
    labourRecords = labours ? labours : [];

    loading = false;
  }

  // Workers on selected date
  $: dayLabourers = labourRecords.filter(l => l.date === form.date);
  
  // Role-wise breakdown
  $: masons = dayLabourers.filter(l => l.role && (l.role.includes('మేస్త్రి') || l.role.includes('Mason')));
  $: excavationWorkers = dayLabourers.filter(l => l.role && l.role.includes('పునాది'));
  $: femaleHelpers = dayLabourers.filter(l => l.role && l.role.includes('మహిళా'));
  $: maleHelpers = dayLabourers.filter(l => l.role && l.role.includes('పురుష'));
  
  // Total wages of the gang for that day
  $: totalDayWage = dayLabourers.reduce((sum, l) => sum + (Number(l.daily_rate || 0) * Number(l.days || 1)), 0);

  // Auto-fill workers count and suggested supervisor
  $: {
    if (dayLabourers.length > 0) {
      form.workers_count = dayLabourers.length;
      if (!form.assigned_mestri && masons.length > 0) {
        form.assigned_mestri = masons[0].worker_name;
      }
    }
  }

  // Dynamic distinct mestri list for dropdown
  $: mestriList = Array.from(new Set(
    labourRecords
      .filter(l => l.role && (l.role.includes('మేస్త్రి') || l.role.includes('Mason') || l.role.includes('Head')))
      .map(l => l.worker_name)
      .filter(Boolean)
  ));

  function setQuickDate(d) {
    form.date = d;
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
        form.site_photo = canvas.toDataURL('image/jpeg', 0.8);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function saveDailyWork() {
    if (!form.work_title || !form.assigned_mestri) {
      alert('Dayachesi pani vivaralu mariyu mestri peru enter cheyandi.');
      return;
    }

    // Auto-generate detailed gang summary text
    let gangSummary = `${dayLabourers.length} Mandi (`;
    let parts = [];
    if (masons.length > 0) parts.push(`మేస్త్రీలు: ${masons.length}`);
    if (excavationWorkers.length > 0) parts.push(`తవ్వకం కూలీలు: ${excavationWorkers.length}`);
    if (femaleHelpers.length > 0) parts.push(`మహిళా కూలీలు: ${femaleHelpers.length}`);
    if (maleHelpers.length > 0) parts.push(`పురుష కూలీలు: ${maleHelpers.length}`);
    gangSummary += parts.join(', ') + `) • వేతనం: ₹${totalDayWage.toLocaleString('en-IN')}`;

    const { error } = await supabase.from('contractor_daily_works').insert([{
      date: form.date,
      work_title: form.work_title,
      section_location: form.section_location,
      assigned_mestri: form.assigned_mestri,
      workers_count: Number(form.workers_count || 1),
      work_status: form.work_status,
      site_photo: form.site_photo,
      notes: form.notes ? `${form.notes} | [గ్యాంగ్: ${gangSummary}]` : `[గ్యాంగ్: ${gangSummary}]`
    }]);

    if (!error) {
      const currentDate = form.date;
      showModal = false;
      form = {
        date: currentDate,
        work_title: '',
        section_location: 'కాంపౌండ్ వాల్ / పునాది సైట్',
        assigned_mestri: '',
        workers_count: 1,
        work_status: 'Completed',
        site_photo: '',
        notes: '',
        gang_breakdown: ''
      };
      await fetchLogs();
    } else {
      alert('Save cheyadam fail ayindi: ' + error.message);
    }
  }

  async function deleteLog(id) {
    if (!confirm('Ee daily work record ni tholaginchala?')) return;
    const { error } = await supabase.from('contractor_daily_works').delete().eq('id', id);
    if (!error) {
      dailyLogs = dailyLogs.filter(d => d.id !== id);
    }
  }
</script>

<svelte:head>
  <title>రోజువారీ సైట్ డైరీ | A.S.V. Contractor 360°</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-4">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← ప్రధాన డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">📅 రోజువారీ సైట్ డైరీ & పనుల పురోగతి (Site Work Diary)</h1>
        <p class="text-xs text-slate-500 font-medium">లేబర్ మస్టర్ తో అనుసంధానమైన మేస్త్రీలు, కూలీల వర్గీకరణ & సైట్ ఫోటోలు</p>
      </div>

      <button on:click={() => showModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition cursor-pointer">
        ➕ ఈరోజు / గత పని నమోదు చేయండి
      </button>
    </div>

    {#if loading}
      <div class="py-12 text-center text-slate-400 font-bold text-xs">లోడ్ అవుతోంది...</div>
    {:else if dailyLogs.length === 0}
      <div class="py-12 text-center text-slate-400 font-bold text-xs bg-white rounded-2xl border border-dashed">
        ప్రస్తుతం ఎలాంటి సైట్ లాగ్స్ లేవు. పైనున్న బటన్ నొక్కి పనులను నమోదు చేయండి.
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each dailyLogs as log}
          <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center justify-between border-b pb-2">
                <span class="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  📅 తేదీ: {log.date}
                </span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full {log.work_status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                  {log.work_status === 'Completed' ? 'పూర్తయింది ✓' : 'కొనసాగుతోంది'}
                </span>
              </div>

              {#if log.site_photo}
                <div class="h-44 w-full rounded-xl overflow-hidden bg-slate-100 cursor-pointer border" on:click={() => previewPhoto = log.site_photo}>
                  <img src={log.site_photo} alt="Site" class="w-full h-full object-cover hover:scale-105 transition" />
                </div>
              {/if}

              <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">{log.work_title}</h3>
              <p class="text-xs text-slate-600">📍 స్థలం: <strong>{log.section_location}</strong></p>
              <p class="text-xs text-slate-600">👷 పర్యవేక్షించిన మేస్త్రి: <strong class="text-amber-800">{log.assigned_mestri}</strong></p>
              
              {#if log.notes}
                <div class="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 leading-relaxed font-medium">
                  {log.notes}
                </div>
              {/if}
            </div>

            <div class="pt-2 border-t flex justify-between items-center text-xs">
              <span class="text-[10px] text-slate-400 font-mono">ID: #{log.id}</span>
              <button on:click={() => deleteLog(log.id)} class="text-rose-500 hover:text-rose-700 font-bold">
                తొలగించండి ✕
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

  </div>
</div>

<!-- Modal with Auto-Linked Labour/Mestri Granular Breakdown -->
{#if showModal}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
    <div class="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-xs max-h-[94vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">📅 సైట్ పని పురోగతి నమోదు</h3>
        <button on:click={() => showModal = false} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={saveDailyWork} class="space-y-3">
        <!-- Manual Date Selector -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="font-bold text-slate-700">పని జరిగిన తేదీ (Manual Date) *</label>
            <div class="flex gap-1">
              <button type="button" on:click={() => setQuickDate('2026-10-04')} class="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold hover:bg-amber-200">
                04వ తేదీ
              </button>
              <button type="button" on:click={() => setQuickDate('2026-10-01')} class="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold hover:bg-slate-200">
                01వ తేదీ
              </button>
              <button type="button" on:click={() => setQuickDate(new Date().toISOString().split('T')[0])} class="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold hover:bg-slate-200">
                ఈరోజు
              </button>
            </div>
          </div>
          <input type="date" bind:value={form.date} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-sm" />
        </div>

        <!-- LIVE GRANULAR LABOUR BREAKDOWN CARD (From Labour Master) -->
        {#if dayLabourers.length > 0}
          <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10.5px] font-black text-amber-950 uppercase tracking-wide flex items-center gap-1">
                <span>👷</span> <span>ఈ తేదీకి లేబర్ మస్టర్ వివరాలు ({dayLabourers.length} మంది)</span>
              </span>
              <span class="font-mono font-black text-amber-900 text-xs">వేతనం: ₹ {totalDayWage.toLocaleString('en-IN')}</span>
            </div>

            <!-- Role Pills -->
            <div class="flex flex-wrap gap-1.5 text-[10px]">
              {#if masons.length > 0}
                <span class="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-md">
                  మేస్త్రీలు ({masons.length}): {masons.map(m => m.worker_name).join(', ')}
                </span>
              {/if}
              {#if excavationWorkers.length > 0}
                <span class="bg-amber-100 text-amber-950 font-bold px-2 py-0.5 rounded-md">
                  తవ్వకం కూలీలు ({excavationWorkers.length}): {excavationWorkers.map(w => w.worker_name).join(', ')}
                </span>
              {/if}
              {#if femaleHelpers.length > 0}
                <span class="bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded-md">
                  మహిళా కూలీలు ({femaleHelpers.length}): {femaleHelpers.map(f => f.worker_name).join(', ')}
                </span>
              {/if}
              {#if maleHelpers.length > 0}
                <span class="bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded-md">
                  పురుష కూలీలు ({maleHelpers.length}): {maleHelpers.map(m => m.worker_name).join(', ')}
                </span>
              {/if}
            </div>
          </div>
        {:else}
          <div class="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[10.5px] text-slate-500 italic">
            ఈ తేదీకి లేబర్ మస్టర్ లో ఎలాంటి కూలీల ఎంట్రీలు లేవు (మాన్యువల్ గా సంఖ్య నమోదు చేయవచ్చు).
          </div>
        {/if}

        <div>
          <label class="block font-bold text-slate-700 mb-1">పని పేరు / వివరణ *</label>
          <input type="text" bind:value={form.work_title} required placeholder="ఉదా: పునాది తవ్వకం / రాతి కట్టడం / పిల్లర్ కాస్టింగ్" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">సెక్షన్ / స్థలం (Section Location)</label>
          <input type="text" bind:value={form.section_location} placeholder="ఉదా: కాంపౌండ్ వాల్ / పునాది సైట్" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <!-- Mestri Selection -->
          <div>
            <label class="block font-bold text-slate-700 mb-1">పర్యవేక్షించిన మేస్త్రి *</label>
            <input 
              type="text" 
              list="labour-mestri-list" 
              bind:value={form.assigned_mestri} 
              required 
              placeholder="మేస్త్రి పేరు" 
              class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900" 
            />
            <datalist id="labour-mestri-list">
              {#each mestriList as name}
                <option value={name}></option>
              {/each}
            </datalist>
          </div>

          <!-- Auto Labour Count -->
          <div>
            <label class="block font-bold text-slate-700 mb-1">మొత్తం కూలీల సంఖ్య</label>
            <input type="number" bind:value={form.workers_count} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">పని స్థితి (Status)</label>
          <select bind:value={form.work_status} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
            <option value="Completed">పూర్తయింది (Completed)</option>
            <option value="Ongoing">కొనసాగుతోంది (Ongoing)</option>
            <option value="Pending">నిలిచిపోయింది (Pending)</option>
          </select>
        </div>

        <!-- Image Upload from Gallery / Files -->
        <div>
          <label class="block font-bold text-slate-700 mb-1">📁 సైట్ ఫోటో అప్‌లోడ్ చేయండి (గ్యాలరీ లేదా కెమెరా)</label>
          <input 
            type="file" 
            accept="image/*" 
            on:change={handlePhotoUpload} 
            class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200" 
          />
        </div>

        {#if form.site_photo}
          <div class="relative h-28 w-full rounded-xl overflow-hidden bg-slate-100 border">
            <img src={form.site_photo} alt="Preview" class="w-full h-full object-cover" />
            <button type="button" on:click={() => form.site_photo = ''} class="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]">
              ✕
            </button>
          </div>
        {/if}

        <div>
          <label class="block font-bold text-slate-700 mb-1">అదనపు వివరాలు / రిమార్క్స్</label>
          <textarea bind:value={form.notes} rows="2" placeholder="ఉదా: పునాది తవ్వకం పూర్తి చేసి బెడ్ కాంక్రీట్ ప్రారంభించాము..." class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"></textarea>
        </div>

        <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition cursor-pointer text-xs">
          సైట్ డైరీలో భద్రపరచండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}

{#if previewPhoto}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-lg w-full p-3 space-y-2">
      <div class="flex justify-between items-center border-b pb-1">
        <span class="text-xs font-bold text-slate-700">సైట్ ఫోటో ప్రివ్యూ</span>
        <button on:click={() => previewPhoto = null} class="font-bold">✕</button>
      </div>
      <img src={previewPhoto} alt="Site" class="w-full max-h-[75vh] object-contain rounded-xl bg-slate-100" />
    </div>
  </div>
{/if}
