<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let labourRecords = [];
  let loading = true;
  let showModal = false;

  let form = {
    worker_name: '',
    role: 'పునాది తవ్వకం కూలీ (Excavation Labour)',
    days: 6,
    daily_rate: 800,
    advance_paid: 0
  };

  onMount(async () => {
    await fetchLabour();
  });

  async function fetchLabour() {
    loading = true;
    const { data, error } = await supabase.from('contractor_labour').select('*').order('id', { ascending: false });
    if (!error) {
      labourRecords = data ? data : [];
    }
    loading = false;
  }

  async function addLabour() {
    if (!form.worker_name || !form.daily_rate) {
      alert('Dayachesi kooli peru mariyu daily rate enter cheyandi.');
      return;
    }

    const { error } = await supabase.from('contractor_labour').insert([{
      worker_name: form.worker_name,
      role: form.role,
      days: Number(form.days),
      daily_rate: Number(form.daily_rate),
      advance_paid: Number(form.advance_paid ? form.advance_paid : 0)
    }]);

    if (!error) {
      showModal = false;
      form = {
        worker_name: '',
        role: 'పునాది తవ్వకం కూలీ (Excavation Labour)',
        days: 6,
        daily_rate: 800,
        advance_paid: 0
      };
      await fetchLabour();
    } else {
      alert('Save cheyadam fail ayindi: ' + error.message);
    }
  }

  async function deleteLabour(id) {
    if (!confirm('Ee kooli record ni tholaginchala?')) return;
    const { error } = await supabase.from('contractor_labour').delete().eq('id', id);
    if (!error) {
      labourRecords = labourRecords.filter(l => l.id !== id);
    }
  }
</script>

<svelte:head>
  <title>లేబర్ మస్టర్ రోల్ | A.S.V. Contractor 360°</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-4">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← ప్రధాన డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">👷 డైలీ లేబర్ మస్టర్ రోల్ & వేతనాల రిజిస్టర్</h1>
      </div>

      <button on:click={() => showModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition cursor-pointer">
        ➕ కొత్త కూలీ / మేస్త్రి నమోదు
      </button>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {#if loading}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">మస్టర్ లోడ్ అవుతోంది...</div>
      {:else if labourRecords.length === 0}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">ప్రస్తుతం ఎలాంటి లేబర్ రికార్డులు లేవు. పైనున్న బటన్ నొక్కి నమోదు చేయండి.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-900 text-white uppercase text-[11px]">
                <th class="p-3">కూలీ / మేస్త్రి పేరు</th>
                <th class="p-3">పని రకం</th>
                <th class="p-3 text-center">పనిచేసిన రోజులు</th>
                <th class="p-3 text-right">రోజువారీ రేటు (₹)</th>
                <th class="p-3 text-right">మొత్తం సంపాదన (₹)</th>
                <th class="p-3 text-right">ఇచ్చిన అడ్వాన్స్ (₹)</th>
                <th class="p-3 text-right font-black text-rose-300">ఇవ్వాల్సిన బాకీ (₹)</th>
                <th class="p-3 text-center">చర్య</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each labourRecords as l}
                {@const totalEarned = Number(l.days) * Number(l.daily_rate)}
                {@const balanceDue = totalEarned - Number(l.advance_paid ? l.advance_paid : 0)}
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3 font-bold text-slate-900">{l.worker_name}</td>
                  <td class="p-3 text-slate-600 font-bold">{l.role}</td>
                  <td class="p-3 text-center font-mono">{l.days}</td>
                  <td class="p-3 text-right font-mono">₹ {l.daily_rate}</td>
                  <td class="p-3 text-right font-mono font-bold">₹ {totalEarned.toLocaleString('en-IN')}</td>
                  <td class="p-3 text-right font-mono text-emerald-700">₹ {Number(l.advance_paid ? l.advance_paid : 0).toLocaleString('en-IN')}</td>
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

{#if showModal}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
    <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-xs">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">👷 కూలీ / మేస్త్రి నమోదు</h3>
        <button on:click={() => showModal = false} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={addLabour} class="space-y-3">
        <div>
          <label class="block font-bold text-slate-700 mb-1">కూలీ / మేస్త్రి పేరు *</label>
          <input type="text" bind:value={form.worker_name} required placeholder="ఉదా: రాములు మేస్త్రి / పోచయ్య" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">పని రకం (Work Role)</label>
          <select bind:value={form.role} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
            <option value="పునాది తవ్వకం కూలీ (Excavation Labour)">పునాది తవ్వకం కూలీ (Excavation Labour)</option>
            <option value="రాతి పని మేస్త్రి (Stone Mason)">రాతి పని మేస్త్రి (Stone Mason)</option>
            <option value="మేస్త్రి (Head Mason)">మేస్త్రి (Head Mason)</option>
            <option value="పురుష కూలీ (Male Helper)">పురుష కూలీ (Male Helper)</option>
            <option value="మహిళా కూలీ (Female Helper)">మహిళా కూలీ (Female Helper)</option>
            <option value="సెంట్రింగ్ వర్కర్ (Centring Worker)">సెంట్రింగ్ వర్కర్ (Centring Worker)</option>
          </select>
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
          <label class="block font-bold text-slate-700 mb-1">ఇచ్చిన అడ్వాన్స్ (Advance ₹)</label>
          <input type="number" bind:value={form.advance_paid} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono" />
        </div>

        <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition cursor-pointer">
          మస్టర్ లో సేవ్ చేయండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}