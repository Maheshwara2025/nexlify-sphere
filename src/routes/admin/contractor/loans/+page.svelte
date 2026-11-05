<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { readAllRows, dataErrorMessage, projectToday } from '$lib/contractor/data.js';
  import { runFinancialMutation, FINANCIAL_WRITES_ENABLED } from '$lib/contractor/financial-write-gate.js';
  import {
    STAGE2_ATOMIC_PAYMENTS_ENABLED,
    prepareSupplierSettlementRpc,
    prepareLoanRepaymentRpc,
    submitStage2AtomicPayment
  } from '$lib/contractor/atomic-payment-client.js';

  let dataError = '';
  let mutationError = '';

  let loans = [];
  let creditBills = [];
  let loading = true;
  let showLoanModal = false;
  let paymentKind = null;
  let paymentTarget = null;
  let paymentBusy = false;
  let paymentDraft = {};


  let loanForm = {
    id: null,
    lender_name: '',
    principal: '',
    interest_rate: '1.5% నెలకు',
    repaid_amount: 0,
    date_borrowed: projectToday()
  };

  onMount(async () => {
    await fetchLoansAndDues();
  });

  async function fetchLoansAndDues() {
    loading=true; dataError='';
    try {
      const [records,tx]=await Promise.all([readAllRows(supabase,'contractor_loans'),readAllRows(supabase,'contractor_transactions')]);
      loans=records; creditBills=tx.filter(t=>t.source==='Credit' && t.status==='Due');
    } catch(error) { dataError=dataErrorMessage(error); }
    finally { loading=false; }
  }

  async function saveLoan() {
    try { await runFinancialMutation('loan', loanForm); }
    catch (error) { mutationError=dataErrorMessage(error); }
  }

  function openLoanRepayment(loan) {
    mutationError = '';
    paymentKind = 'loan';
    paymentTarget = loan;
    paymentDraft = {
      principalAmount: '',
      interestAmount: '0',
      fundingSource: 'Bank',
      date: projectToday(),
      idempotencyKey: 'asv_' + crypto.randomUUID().replaceAll('-', ''),
      notes: ''
    };
  }

  async function deleteLoan(id) {
    try { await runFinancialMutation('reverse-loan', {id}); }
    catch (error) { mutationError=dataErrorMessage(error); }
  }

  function openSupplierSettlement(bill) {
    mutationError = '';
    paymentKind = 'supplier';
    paymentTarget = bill;
    paymentDraft = {
      amount: '',
      materialId: bill.material_id == null ? '' : String(bill.material_id),
      fundingSource: 'Bank',
      date: projectToday(),
      idempotencyKey: 'asv_' + crypto.randomUUID().replaceAll('-', ''),
      notes: ''
    };
  }

  async function submitStage2Payment() {
    mutationError = '';
    if (!paymentKind || !paymentTarget || paymentBusy) return;
    paymentBusy = true;
    try {
      const command = paymentKind === 'supplier'
        ? prepareSupplierSettlementRpc({
            obligationId: paymentTarget.id,
            materialId: paymentDraft.materialId === '' ? null : paymentDraft.materialId,
            amount: paymentDraft.amount,
            fundingSource: paymentDraft.fundingSource,
            paymentDate: paymentDraft.date,
            idempotencyKey: paymentDraft.idempotencyKey,
            notes: paymentDraft.notes
          })
        : prepareLoanRepaymentRpc({
            loanId: paymentTarget.id,
            principalAmount: paymentDraft.principalAmount,
            interestAmount: paymentDraft.interestAmount,
            fundingSource: paymentDraft.fundingSource,
            repaymentDate: paymentDraft.date,
            idempotencyKey: paymentDraft.idempotencyKey,
            notes: paymentDraft.notes
          });
      await submitStage2AtomicPayment(supabase, command);
      paymentKind = null;
      paymentTarget = null;
      await fetchLoansAndDues();
    } catch (error) {
      mutationError = dataErrorMessage(error);
    } finally {
      paymentBusy = false;
    }
  }
</script>

<svelte:head>
  <title>అప్పులు & సప్లయర్ బాకీలు | A.S.V. Contractor 360°</title>
</svelte:head>
{#if dataError}
  <div role="alert" class="m-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">{dataError} <button type="button" on:click={fetchLoansAndDues} class="ml-3 font-bold underline">మళ్లీ ప్రయత్నించండి</button></div>
{/if}
{#if mutationError}
  <p role="alert" class="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{mutationError}</p>
{/if}
{#if !dataError}


<div class="min-h-screen bg-[#f8fafc] text-slate-900 p-4 sm:p-6 space-y-6">
  <div class="max-w-7xl mx-auto space-y-6">
    
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div>
        <a href="/admin/contractor" class="text-xs font-bold text-amber-600 hover:underline">← ప్రధాన డాష్‌బోర్డ్</a>
        <h1 class="text-base sm:text-xl font-black font-['Ramabhadra']">🏦 అప్పులు & సప్లయర్ బాకీల రిజిస్టర్</h1>
      </div>

      <button
        on:click={() => { loanForm = { id: null, lender_name: '', principal: '', interest_rate: '1.5% నెలకు', repaid_amount: 0, date_borrowed: projectToday() }; showLoanModal = true; }}
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
                    <button on:click={() => openLoanRepayment(l)} class="bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold px-2 py-1 rounded text-[10.5px]">
                      💵 చెల్లించు
                    </button>
                    <button on:click={() => { loanForm = { ...l }; showLoanModal = true; }} class="bg-amber-50 text-amber-800 border border-amber-300 font-bold px-2 py-1 rounded text-[10.5px]">
                      ✏️ ఎడిట్
                    </button>
                    <button disabled={!FINANCIAL_WRITES_ENABLED} on:click={() => deleteLoan(l.id)} class="text-rose-500 font-bold hover:text-rose-700 px-1">
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
                    <button on:click={() => openSupplierSettlement(b)} class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10.5px] font-bold shadow">
                      చెల్లింపు నమోదు
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

        <button disabled={!FINANCIAL_WRITES_ENABLED} type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs">
          సర్వర్‌లో సేవ్ చేయండి ➔
        </button>
      </form>
    </div>
  </div>
{/if}

{/if}


{#if paymentKind && paymentTarget}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3">
    <div class="w-full max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="font-black text-base">
          {paymentKind === 'supplier' ? 'సప్లయర్ బిల్లు చెల్లింపు' : 'అప్పు రీపేమెంట్'}
        </h3>
        <button type="button" on:click={() => paymentKind = null} aria-label="Close payment form">✕</button>
      </div>
      <p class="mb-4 text-xs text-slate-600">
        {paymentKind === 'supplier' ? paymentTarget.recipient : paymentTarget.lender_name}
        · Ref #{paymentTarget.id}
      </p>
      {#if !STAGE2_ATOMIC_PAYMENTS_ENABLED}
        <p role="status" class="mb-4 rounded-lg border border-amber-400 bg-amber-50 p-3 text-xs text-amber-900">
          ఈ చెల్లింపు ఫారమ్ సిద్ధంగా ఉంది. Server-side Atomic Payment Approval వరకు Save నిలిపివేయబడింది.
        </p>
      {/if}
      <form class="space-y-3 text-xs" on:submit|preventDefault={submitStage2Payment}>
        {#if paymentKind === 'supplier'}
          <label class="block font-bold">చెల్లించవలసిన మొత్తం (₹)
            <input class="mt-1 w-full rounded-lg border p-2" type="number" min="0.01" step="0.01" required bind:value={paymentDraft.amount} />
          </label>
          <label class="block font-bold">Verified Material ID (if linked)
            <input class="mt-1 w-full rounded-lg border p-2" type="number" min="1" step="1" bind:value={paymentDraft.materialId} />
          </label>
        {:else}
          <label class="block font-bold">అప్పు అసలు (Principal ₹)
            <input class="mt-1 w-full rounded-lg border p-2" type="number" min="0" step="0.01" required bind:value={paymentDraft.principalAmount} />
          </label>
          <label class="block font-bold">వడ్డీ (Interest ₹)
            <input class="mt-1 w-full rounded-lg border p-2" type="number" min="0" step="0.01" required bind:value={paymentDraft.interestAmount} />
          </label>
        {/if}
        <label class="block font-bold">Payment Source
          <select class="mt-1 w-full rounded-lg border p-2" bind:value={paymentDraft.fundingSource}>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="UPI">UPI</option>
          </select>
        </label>
        <label class="block font-bold">తేదీ
          <input class="mt-1 w-full rounded-lg border p-2" type="date" required bind:value={paymentDraft.date} />
        </label>
        <label class="block font-bold">వివరాలు
          <input class="mt-1 w-full rounded-lg border p-2" type="text" maxlength="2000" bind:value={paymentDraft.notes} />
        </label>
        <button type="submit" disabled={!STAGE2_ATOMIC_PAYMENTS_ENABLED || paymentBusy}
          class="w-full rounded-xl bg-emerald-700 p-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
          {paymentBusy ? 'సేవ్ అవుతోంది...' : 'Atomic Payment Save'}
        </button>
      </form>
    </div>
  </div>
{/if}
