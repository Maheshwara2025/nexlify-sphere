<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let dailyLogs = [];
  let loading = true;
  let showModal = false;
  let previewPhoto = null;

  let form = {
    date: new Date().toISOString().split('T')[0],
    work_title: '',
    section_location: 'కాంపౌండ్ వాల్ సైడ్-A',
    assigned_mestri: 'రాములు మేస్త్రి',
    workers_count: 5,
    work_status: 'Ongoing',
    site_photo: '',
    notes: ''
  };

  onMount(async () => {
    await fetchLogs();
  });

  async function fetchLogs() {
    loading = true;
    const { data } = await supabase.from('contractor_daily_works').select('*').order('date', { ascending: false });
    dailyLogs = data ? data : [];
    loading = false;
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      form.site_photo = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function saveDailyWork() {
    if (!form.work_title || !form.assigned_mestri) {
      alert('దయచేసి పని వివరాలు మరియు మేస్త్రి పేరు నమోదు చేయండి.');
      return;
    }

    const { error } = await supabase.from('contractor_daily_works').insert([{
      date: form.date,
      work_title: form.work_title,
      section_location: form.section_location,
      assigned_mestri: form.assigned_mestri,
      workers_count: Number(form.workers_count),
      work_status: form.work_status,
      site_photo: form.site_photo,
      notes: form.notes
    }]);

    if (!error) {
      showModal = false;
      form = {
        date: new Date().toISOString().split('T')[0],
        work_title: '',
        section_location: 'కాంపౌండ్ వాల్ సైడ్-A',
        assigned_mestri: 'రాములు మేస్త్రి',
        workers_count: 5,
        work_status: 'Ongoing',
        site_photo: '',
        notes: ''
      };
      await fetchLogs();
    } else {
      alert('సేవ్ చేయడం విఫలమైంది: ' + error.message);
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
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">📅 రోజువారీ సైట్ డైరీ & పనుల పురోగతి (Site Log)</h1>
      </div>

      <button on:click={() => showModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition">
        ➕ ఈరోజు పని నమోదు చేయండి
      </button>
    </div>

    {#if loading}
      <div class="py-12 text-center text-slate-400 font-bold text-xs">లోడ్ అవుతోంది...</div>
    {:else if dailyLogs.length === 0}
      <div class="py-12 text-center text-slate-400 font-bold text-xs">ప్రస్తుతం ఎలాంటి సైట్ లాగ్స్ లేవు.</div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each dailyLogs as log}
          <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-mono text-xs text-slate-500 font-bold">{log.date}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full {log.work_status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                  {log.work_status}
                </span>
              </div>

              {#if log.site_photo}
                <div class="h-40 w-full rounded-xl overflow-hidden bg-slate-100 cursor-pointer" on:click={() => previewPhoto = log.site_photo}>
                  <img src={log.site_photo} alt="Site" class="w-full h-full object-cover hover:scale-105 transition" />
                </div>
              {/if}

              <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">{log.work_title}</h3>
              <p class="text-xs text-slate-600">📍 స్థలం: <strong>{log.section_location}</strong></p>
              <p class="text-xs text-slate-600">👷 కేటాయించిన మేస్త్రి: <strong>{log.assigned_mestri}</strong> ({log.workers_count} మంది కూలీలు)</p>
              {#if log.notes}
                <p class="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">{log.notes}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

  </div>
</div>

<!-- Modal -->
{#if showModal}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
    <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-xs">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">📅 సైట్ పని పురోగతి నమోదు</h3>
        <button on:click={() => showModal = false} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={saveDailyWork} class="space-y-3">
        <div>
          <label class="block font-bold text-slate-700 mb-1">పని పేరు / టాస్క్ *</label>
          <input type="text" bind:value={form.work_title} required placeholder="ఉదా: పిల్లర్ల కాంక్రీట్ కాస్టింగ్ & బెడ్ కాంక్రీట్" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">సెక్షన్ / లొకేషన్</label>
          <input type="text" bind:value={form.section_location} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">మేస్త్రి పేరు</label>
            <input type="text" bind:value={form.assigned_mestri} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">కూలీల సంఖ్య</label>
            <input type="number" bind:value={form.workers_count} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono" />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">స్టేటస్</label>
          <select bind:value={form.work_status} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
            <option value="Ongoing">కొనసాగుతోంది (Ongoing)</option>
            <option value="Completed">పూర్తయింది (Completed)</option>
            <option value="Pending">నిలిచిపోయింది (Pending)</option>
          </select>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">సైట్ లైవ్ ఫోటో తీయండి</label>
          <input type="file" accept="image/*" capture="environment" on:change={handlePhotoUpload} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-500" />
        </div>

        <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition">
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
        <span class="text-xs font-bold text-slate-700">సైట్ ఫోటో</span>
        <button on:click={() => previewPhoto = null} class="font-bold">✕</button>
      </div>
      <img src={previewPhoto} alt="Site" class="w-full max-h-[75vh] object-contain rounded-xl bg-slate-100" />
    </div>
  </div>
{/if}
