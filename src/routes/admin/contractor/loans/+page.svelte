<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let loans = [];
  let creditBills = [];
  let loading = true;
  let showLoanModal = false;

  let loanForm = {
    id: null,
    lender_name: '',
    principal: '',
    interest_rate: '1.5% నెలకు',
    repaid_amount: 0,
    date_borrowed: new Date().toISOString().split('T')[0]
  };

  onMount(async () => {
    await fetchLoansAndDues();
  });

  async function fetchLoansAndDues() {
    loading = true;
    const { data: loanData } = await supabase.from('contractor_loans').select('*').order('id', { ascending: false });
    loans = loanData || [];

    const { data: txData } = await supabase
      .from('contractor_transactions')
      .select('*')
      .eq('source', 'Credit')
      .eq('status', 'Due');
    creditBills = txData || [];

    loading = false;
  }

  async function saveLoan() {
    if (!loanForm.lender_name || !loanForm.principal) {
      alert('దయచేసి అప్పు ఇచ్చిన వ్యక్తి పేరు మరియు అసలు మొత్తం నమోదు చేయండి.');
      return;
    }

    if (loanForm.id) {
      await supabase.from('contractor_loans').update({
        lender_name: loanForm.lender_name,
        principal: Number(loanForm.principal),
        interest_rate: loanForm.interest_rate,
        repaid_amount: Number(loanForm.repaid_amount),
        date_borrowed: loanForm.date_borrowed
      }).eq('id', loanForm.id);
    } else {
      await supabase.from('contractor_loans').insert([{
        lender_name: loanForm.lender_name,
        principal: Number(loanForm.principal),
        interest_rate: loanForm.interest_rate,
        repaid_amount: 0,
        date_borrowed: loanForm.date_borrowed
      }]);
    }

    showLoanModal = false;
    await fetchLoansAndDues();
  }

  async function repayAmount(loan) {
    const curDue = loan.principal - loan.repaid_amount;
    const val = prompt(`ప్రస్తుత బాకీ: ₹ ${curDue.toLocaleString('en-IN')}\nఎంత మొత్తం చెల్లించారు?`, '0');
    if (val && !isNaN(val) && Number(val) > 0) {
      const newRepaid = Number(loan.repaid_amount) + Number(val);
      await supabase.from('contractor_loans').update({ repaid_amount: newRepaid }).eq('id', loan.id);
      await fetchLoansAndDues();
    }
  }

  async function deleteLoan(id) {
    if (!confirm('ఈ అప్పు రికార్డును తొలగించాలా?')) return;
    await supabase.from('contractor_loans').delete().eq('id', id);
    loans = loans.filter(l => l.id !== id);
  }

  async function clearCreditBill(id) {
    if (!confirm('ఈ సప్లయర్ బిల్లు చెల్లించబడిందా?')) return;
    await supabase.from('contractor_transactions').update({ status: 'Paid', balance: 0 }).eq('id', id);
    creditBills = creditBills.filter(c => c.id !== id);
  }
</script>

<svelte:head>
  <title>అప్పులు & సప్లయర్ బాకీలు | A.S.V. Contractor 360°</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← ప్రధాన డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">🏦 అప్పులు & సప్లయర్ బాకీల రిజిస్టర్</h1>
      </div>

      <button
        on:click={() => { loanForm = { id: null, lender_name: '', principal: '', interest_rate: '1.5% నెలకు', repaid_amount: 0, date_borrowed: new Date().toISOString().split('T')[0] }; showLoanModal = true; }}
        class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition"
      >
        ➕ కొత్త అప్పు నమోదు
      </button>
    </div>

    <!-- Loans Section -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
      <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">తెచ్చిన రుణాలు (Borrowed Loans)</h3>
      
      {#if loading}
        <div class="py-8 text-center text-slate-400 font-bold text-xs">లోడ్ అవుతోంది...</div>
      {:else if loans.length === 0}
        <div class="py-8 text-center text-slate-400 font-bold text-xs">ఎలాంటి అప్పులు నమోదు కాలేదు.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-900 text-white uppercase text-[11px]">
                <th class="p-2.5">రుణం ఇచ్చిన వారు</th>
                <th class="p-2.5">తేదీ</th>
                <th class="p-2.5 text-right">అసలు (Principal)</th>
                <th class="p-2.5 text-center">వడ్డీ రేటు</th>
                <th class="p-2.5 text-right">చెల్లించినది</th>
                <th class="p-2.5 text-right font-black text-amber-400">మిగిలిన అప్పు</th>
                <th class="p-2.5 text-center">చర్యలు</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each loans as l}
                {@const bal = l.principal - l.repaid_amount}
                <tr class="hover:bg-slate-50">
                  <td class="p-2.5 font-bold text-slate-900">{l.lender_name}</td>
                  <td class="p-2.5 font-mono text-slate-500">{l.date_borrowed}</td>
                  <td class="p-2.5 text-right font-mono font-bold">₹ {Number(l.principal).toLocaleString('en-IN')}</td>
                  <td class="p-2.5 text-center font-mono">{l.interest_rate}</td>
                  <td class="p-2.5 text-right font-mono text-emerald-700">₹ {Number(l.repaid_amount).toLocaleString('en-IN')}</td>
                  <td class="p-2.5 text-right font-mono font-black text-amber-700">₹ {bal.toLocaleString('en-IN')}</td>
                  <td class="p-2.5 text-center flex items-center justify-center gap-1.5">
                    <button on:click={() => repayAmount(l)} class="bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold px-2 py-1 rounded text-[10.5px]">
                      💵 చెల్లించు
                    </button>
                    <button on:click={() => { loanForm = { ...l }; showLoanModal = true; }} class="bg-amber-50 text-amber-800 border border-amber-300 font-bold px-2 py-1 rounded text-[10.5px]">
                      ✏️ ఎడిట్
                    </button>
                    <button on:click={() => deleteLoan(l.id)} class="text-rose-500 font-bold hover:text-rose-700 px-1">
                      ✕
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Supplier Payables Section -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
      <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">సప్లయర్లకు చెల్లించాల్సిన ఉధార్ బిల్లులు (Credit Payables)</h3>
      
      {#if creditBills.length === 0}
        <div class="py-8 text-center text-slate-400 font-bold text-xs">పెండింగ్ ఉధార్ బిల్లులు ఏవీ లేవు.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-800 text-white uppercase text-[11px]">
                <th class="p-2.5">సప్లయర్</th>
                <th class="p-2.5">ఐటమ్ వివరణ</th>
                <th class="p-2.5 text-right">మొత్తం బిల్లు</th>
                <th class="p-2.5 text-right font-black text-rose-300">బాకీ (₹)</th>
                <th class="p-2.5 text-center">చర్య</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              {#each creditBills as b}
                <tr class="hover:bg-slate-50">
                  <td class="p-2.5 font-bold text-slate-900">{b.recipient}</td>
                  <td class="p-2.5 text-slate-700">{b.description}</td>
                  <td class="p-2.5 text-right font-mono">₹ {Number(b.amount).toLocaleString('en-IN')}</td>
                  <td class="p-2.5 text-right font-mono font-black text-rose-600">₹ {Number(b.balance || b.amount).toLocaleString('en-IN')}</td>
                  <td class="p-2.5 text-center">
                    <button on:click={() => clearCreditBill(b.id)} class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10.5px] font-bold shadow">
                      చెల్లించబడింది ✓
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

{#if showLoanModal}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
    <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between border-b pb-2">
        <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">
          {loanForm.id ? '✏️ అప్పు సవరణ' : '➕ కొత్త అప్పు నమోదు'}
        </h3>
        <button on:click={() => showLoanModal = false} class="font-bold text-slate-400">✕</button>
      </div>

      <form on:submit|preventDefault={saveLoan} class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-slate-700 mb-1">రుణం ఇచ్చిన వ్యక్తి పేరు *</label>
          <input type="text" bind:value={loanForm.lender_name} required placeholder="ఉదా: రమేష్ ఫైనాన్స్" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-bold text-slate-700 mb-1">అసలు (₹) *</label>
            <input type="number" bind:value={loanForm.principal} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">వడ్డీ రేటు</label>
            <input type="text" bind:value={loanForm.interest_rate} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono" />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">తేదీ</label>
          <input type="date" bind:value={loanForm.date_borrowed} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
        </div>

        <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs">
          సర్వర్‌లో సేవ్ చేయండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}
