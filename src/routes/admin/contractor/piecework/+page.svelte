<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { readAllRows, dataErrorMessage, projectToday } from '$lib/contractor/data.js';
  import { STAGE3_ATOMIC_ENTRIES_ENABLED, createAtomicEntryPoster } from '$lib/contractor/atomic-entry-client.js';
  const postEntry = createAtomicEntryPoster(supabase);
  let savingContract = false;
  let savingPayment = false;
  let payContract = null;
  let payAmount = '';
  let payFunding = 'Cash';

  let dataError = '';
  let mutationError = '';

  let contracts = [];
  let loading = true;
  let showModal = false;

  let form = {
    date: projectToday(),
    contractor_name: '',
    phone: '',
    work_type: 'సెంట్రింగ్ పని (Centring Work)',
    calc_mode: 'Sft',
    length_ft: 100,
    height_ft: 6,
    rate_per_unit: 35, // Rs. 35 per Sft
    advance_paid: 0,
    funding_source: 'Cash',
    notes: 'కాంపౌండ్ వాల్ సెంట్రింగ్ & ప్లేట్స్'
  };
$: lengthVal = form.length_ft ? Number(form.length_ft) : 0;
  $: heightVal = form.height_ft ? Number(form.height_ft) : 0;
  $: rateVal = form.rate_per_unit ? Number(form.rate_per_unit) : 0;
  $: advanceVal = form.advance_paid ? Number(form.advance_paid) : 0;

  $: calculatedUnits = form.calc_mode === 'Sft' ? (lengthVal * heightVal) : lengthVal;
  $: totalContractCost = calculatedUnits * rateVal;
  $: balanceDue = totalContractCost - advanceVal;
  onMount(async () => {
    await fetchContracts();
  });

  async function fetchContracts() {
    loading=true; dataError='';
    try {
      contracts=await readAllRows(supabase,'contractor_piecework',{orderBy:'date'});
    } catch(error) { dataError=dataErrorMessage(error); }
    finally { loading=false; }
  }

  async function saveContract() {
    if (savingContract) return;
    savingContract = true; mutationError = '';
    try {
      await postEntry('piecework', form);
      showModal = false;
      await fetchContracts();
    } catch (error) { mutationError=dataErrorMessage(error); }
    finally { savingContract = false; }
  }

  async function settlePiecework() {
    if (!payContract || savingPayment) return;
    savingPayment = true; mutationError = '';
    try {
      await postEntry('piecework_payment', {
        piecework_id: payContract.id,
        amount: payAmount,
        funding_source: payFunding,
        date: projectToday()
      });
      payContract = null;
      await fetchContracts();
    } catch (error) { mutationError=dataErrorMessage(error); }
    finally { savingPayment = false; }
  }
</script>

<svelte:head>
  <title>సెంట్రింగ్ & పీస్ వర్క్ లెక్కలు | A.S.V. Contractor 360°</title>
</svelte:head>
{#if dataError}
  <div role="alert" class="m-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">{dataError} <button type="button" on:click={fetchContracts} class="ml-3 font-bold underline">మళ్లీ ప్రయత్నించండి</button></div>
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
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">📐 సెంట్రింగ్ & పీస్ వర్క్ కాంట్రాక్టులు (Feet-wise Sft Calculator)</h1>
        <p class="text-xs text-slate-500">సెంట్రింగ్, ఫ్యాబ్రికేషన్, వెల్డింగ్ పొడవు $\times$ ఎత్తు కొలతలు, Sft రేటు & అడ్వాన్స్ లెక్కలు</p>
      </div>

      <button on:click={() => showModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition cursor-pointer">
        ➕ కొత్త సెంట్రింగ్ / పీస్ వర్క్ నమోదు
      </button>
    </div>

    <!-- Contracts Table -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {#if loading}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">లోడ్ అవుతోంది...</div>
      {:else if contracts.length === 0}
        <div class="py-12 text-center text-slate-400 font-bold text-xs">ప్రస్తుతం ఎలాంటి పీస్ వర్క్ కాంట్రాక్టులు లేవు.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-900 text-white uppercase text-[11px]">
                <th class="p-3">తేదీ</th>
                <th class="p-3">కాంట్రాక్టర్ / మేస్త్రి</th>
                <th class="p-3">పని రకం</th>
                <th class="p-3 text-right">కొలతలు (Feet)</th>
                <th class="p-3 text-right">మొత్తం Sft / Rft</th>
                <th class="p-3 text-right">రేటు / Sft (₹)</th>
                <th class="p-3 text-right">మొత్తం కాంట్రాక్ట్ (₹)</th>
                <th class="p-3 text-right">అడ్వాన్స్ (₹)</th>
                <th class="p-3 text-right font-black text-rose-300">మిగిలిన బాకీ (₹)</th>
                <th class="p-3">Payment</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each contracts as c}
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-3 font-mono text-slate-500">{c.date}</td>
                  <td class="p-3 font-bold text-slate-900">{c.contractor_name}</td>
                  <td class="p-3 font-bold text-indigo-700">{c.work_type}</td>
                  <td class="p-3 text-right font-mono">{c.length_ft}' × {c.height_ft}'</td>
                  <td class="p-3 text-right font-mono font-bold">{c.total_units} {c.calc_mode}</td>
                  <td class="p-3 text-right font-mono">₹ {c.rate_per_unit}</td>
                  <td class="p-3 text-right font-mono font-bold">₹ {Number(c.total_amount).toLocaleString('en-IN')}</td>
                  <td class="p-3 text-right font-mono text-emerald-700">₹ {Number(c.advance_paid || 0).toLocaleString('en-IN')}</td>
                  <td class="p-3 text-right font-mono font-black text-rose-600">₹ {Number(c.balance_due).toLocaleString('en-IN')}</td>
                  <td class="p-3">
                    <button type="button" disabled={Number(c.balance_due || 0) <= 0}
                      on:click={() => { payContract = c; payAmount = ''; payFunding = 'Cash'; }}
                      class="rounded bg-emerald-50 px-2 py-1 font-bold text-emerald-800 disabled:opacity-40">
                      చెల్లింపు
                    </button>
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
    <div class="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">📐 సెంట్రింగ్ / పీస్ వర్క్ కొలతల నమోదు</h3>
        <button on:click={() => showModal = false} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={saveContract} class="space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">కాంట్రాక్టర్ / మేస్త్రి పేరు *</label>
            <input type="text" bind:value={form.contractor_name} required placeholder="ఉదా: శ్రీనివాస్ సెంట్రింగ్" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">ఫోన్ నంబర్</label>
            <input type="tel" bind:value={form.phone} placeholder="98480..." class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">పని రకం</label>
            <select bind:value={form.work_type} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
              <option value="సెంట్రింగ్ పని (Centring Work)">సెంట్రింగ్ పని (Centring Work)</option>
              <option value="రేకుల షెడ్ వెల్డింగ్ (Welding Fabrication)">రేకుల షెడ్ వెల్డింగ్ (Welding Fabrication)</option>
              <option value="ప్లంబింగ్ కాంట్రాక్ట్ (Plumbing Piece-rate)">ప్లంబింగ్ కాంట్రాక్ట్ (Plumbing Piece-rate)</option>
              <option value="టైల్స్ ఫిట్టింగ్ (Tiles Fitting)">టైల్స్ ఫిట్టింగ్ (Tiles Fitting)</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">కొలత విధానం</label>
            <select bind:value={form.calc_mode} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
              <option value="Sft">చదరపు అడుగులు (Sft: L × H)</option>
              <option value="Rft">రన్నింగ్ ఫీట్ (Rft: Length only)</option>
            </select>
          </div>
        </div>

        <!-- Feet Measurements -->
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">పొడవు (Feet) *</label>
            <input type="number" step="any" bind:value={form.length_ft} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
          {#if form.calc_mode === 'Sft'}
            <div>
              <label class="block font-bold text-slate-700 mb-1">ఎత్తు / వెడల్పు (Feet) *</label>
              <input type="number" step="any" bind:value={form.height_ft} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
            </div>
          {/if}
          <div>
            <label class="block font-bold text-slate-700 mb-1">రేటు / Unit (₹) *</label>
            <input type="number" step="any" bind:value={form.rate_per_unit} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
          </div>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center font-bold">
          <span class="text-amber-900">మొత్తం వైశాల్యం: {calculatedUnits} {form.calc_mode}</span>
          <span class="text-base text-amber-950 font-mono font-black">మొత్తం: ₹ {totalContractCost.toLocaleString('en-IN')}</span>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">ఇచ్చిన అడ్వాన్స్ (Advance ₹)</label>
          <input type="number" min="0" step="0.01" bind:value={form.advance_paid} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold text-emerald-700" />
          <span class="text-[10px] text-slate-400 block mt-0.5">మిగిలిన బాకీ: ₹ {balanceDue.toLocaleString('en-IN')}</span>
          {#if Number(form.advance_paid || 0) > 0}
            <label class="mt-2 block text-xs font-bold">అడ్వాన్స్ చెల్లింపు ఖాతా
              <select bind:value={form.funding_source} class="mt-1 w-full rounded-lg border p-2">
                <option value="Cash">Cash</option><option value="Bank">Bank</option><option value="UPI">UPI</option>
              </select>
            </label>
          {/if}
        </div>

        <button disabled={!STAGE3_ATOMIC_ENTRIES_ENABLED || savingContract} type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition cursor-pointer">
          సేవ్ చేయండి & లెడ్జర్‌లో నమోదు చేయండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}

{/if}


{#if payContract}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3">
    <div class="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 text-slate-900">
      <div class="flex justify-between font-black"><span>పీస్‌వర్క్ చెల్లింపు — {payContract.contractor_name}</span>
        <button type="button" on:click={() => payContract=null}>✕</button>
      </div>
      <p class="text-xs text-slate-500">Contract #{payContract.id} · బాకీ ₹{payContract.balance_due}</p>
      <form class="space-y-3" on:submit|preventDefault={settlePiecework}>
        <label class="block text-xs font-bold">మొత్తం ₹
          <input type="number" min="0.01" step="0.01" required bind:value={payAmount}
            class="mt-1 w-full rounded-lg border p-2" />
        </label>
        <label class="block text-xs font-bold">Payment Account
          <select bind:value={payFunding} class="mt-1 w-full rounded-lg border p-2">
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
