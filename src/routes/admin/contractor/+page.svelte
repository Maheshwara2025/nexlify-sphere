<script>
  import { onMount } from 'svelte';
  import { calculateFinancialSummary } from '$lib/contractor/accounting.js';
  import { CATEGORIES } from '$lib/contractor/categories.js';
  import { supabase } from '$lib/supabaseClient';
  import { readAllRows, dataErrorMessage, projectToday } from '$lib/contractor/data.js';
  import { STAGE3_ATOMIC_ENTRIES_ENABLED, createAtomicEntryPoster } from '$lib/contractor/atomic-entry-client.js';
  const postEntry = createAtomicEntryPoster(supabase);
  let savingExpense = false;
  let savingMoneyIn = false;
  let savingTransfer = false;

  let dataError = '';
  let mutationError = '';

  let authChecking = false;
  let labourRecords = [];
  let pieceworkRecords = [];
  let loadingData = true;

  let budget = 400000;
  let transactions = [];
  let loanRecords = [];
  let profilesCount = 0;
  let pieceworkCount = 0;
  let mbookCount = 0;

  let showExpenseModal = false;
  let showMoneyInModal = false;
  let showTransferModal = false;
  let showVoucherModal = false;
  let showSnapshotModal = false;
  let activeVoucher = null;

  // Multi-Category Expense Form
  let expForm = {
    category: 'Site Refreshments & Water',
    desc: '',
    amount: '',
    source: 'Cash',
    recipient: '',
    party_phone: '',
    advance_paid: 0,
    advance_source: 'Cash',
    date: projectToday(),
    photo_url: ''
  };

  // Money In / Received Invoice Form
  let inForm = {
    sourceType: 'Running Bill Received',
    desc: '',
    amount: '',
    target: 'Bank',
    party_phone: '',
    date: projectToday(),
    photo_url: ''
  };

  // Contra Transfer Form (Cash to Bank / Bank to Cash)
  let transferForm = {
    direction: 'Cash to Bank',
    amount: '',
    bank_name: 'SBI Mutharam Branch',
    date: projectToday(),
    photo_url: ''
  };

  onMount(() => {
    let saved=null;
    try { saved = localStorage.getItem('ASV_CONTRACTOR_BUDGET'); } catch { /* Browser storage is optional. */ }
    if (saved !== null && Number.isFinite(Number(saved)) && Number(saved) >= 0) budget = Number(saved);
    else budget = 400000;
    void fetchServerData();
  });

  async function fetchServerData() {
    loadingData = true;
    dataError = '';
    try {
      const [tx, loans, profiles, piecework, mbook, labour] = await Promise.all([
        readAllRows(supabase,'contractor_transactions'), readAllRows(supabase,'contractor_loans'),
        readAllRows(supabase,'contractor_labour_profiles'), readAllRows(supabase,'contractor_piecework'),
        readAllRows(supabase,'contractor_mbook'), readAllRows(supabase,'contractor_labour')
      ]);
      transactions=tx; loanRecords=loans; labourRecords=labour; pieceworkRecords=piecework;
      profilesCount=profiles.length; pieceworkCount=piecework.length; mbookCount=mbook.length;
    } catch (error) {
      dataError = dataErrorMessage(error);
    } finally {
      loadingData = false;
    }
  }

  function editBudget() {
    const value=prompt('ఈ బ్రౌజర్‌లో మాత్రమే సేవ్ అయ్యే బడ్జెట్ అంచనా (₹):',String(budget));
    if(value===null)return;
    const amount=Number(value);
    if(!Number.isFinite(amount)||amount<0||!Number.isSafeInteger(Math.round(amount*100))){mutationError='సరైన బడ్జెట్ మొత్తం నమోదు చేయండి.';return;}
    try {localStorage.setItem('ASV_CONTRACTOR_BUDGET',String(amount));budget=amount;}
    catch {mutationError='ఈ బ్రౌజర్‌లో బడ్జెట్ సేవ్ కాలేదు.';}
  }

  function handlePhotoUpload(e, targetForm) {
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
        if (targetForm === 'exp') {
          expForm.photo_url = canvas.toDataURL('image/jpeg', 0.8);
        } else if (targetForm === 'in') {
          inForm.photo_url = canvas.toDataURL('image/jpeg', 0.8);
        } else if (targetForm === 'transfer') {
          transferForm.photo_url = canvas.toDataURL('image/jpeg', 0.8);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  $: summary = calculateFinancialSummary({transactions,loans:loanRecords,labour:labourRecords,piecework:pieceworkRecords});
  $: ({totalInflow,totalReceipts,ownerCapital,totalPaidExpenses,totalPayablesDue,cashBalance,bankBalance,loanOutstanding,totalLiquidity,totalLiabilities} = summary);
  $: budgetRemaining = budget - totalPaidExpenses;
  $: matTotal = summary.categoryTotals[CATEGORIES.MATERIALS] || 0;
  $: labTotal = (summary.categoryTotals[CATEGORIES.LABOUR] || 0) + (summary.categoryTotals[CATEGORIES.CENTRING] || 0);
  $: refTotal = summary.categoryTotals[CATEGORIES.REFRESHMENTS] || 0;
  $: trnTotal = summary.categoryTotals[CATEGORIES.TRANSPORT] || 0;

  // Expense Submit
  async function submitExpense() {
    if (savingExpense) return;
    savingExpense = true;
    mutationError = '';
    try {
      await postEntry('expense', expForm);
      showExpenseModal = false;
      await fetchServerData();
    } catch (error) {
      mutationError = dataErrorMessage(error);
    } finally {
      savingExpense = false;
    }
  }

  // Money In Submit
  async function submitMoneyIn() {
    if (savingMoneyIn) return;
    savingMoneyIn = true;
    mutationError = '';
    try {
      await postEntry('receipt', inForm);
      showMoneyInModal = false;
      await fetchServerData();
    } catch (error) {
      mutationError = dataErrorMessage(error);
    } finally {
      savingMoneyIn = false;
    }
  }

  // Contra Transfer Submit
  async function submitTransfer() {
    if (savingTransfer) return;
    savingTransfer = true;
    mutationError = '';
    try {
      await postEntry('transfer', transferForm);
      showTransferModal = false;
      await fetchServerData();
    } catch (error) {
      mutationError = dataErrorMessage(error);
    } finally {
      savingTransfer = false;
    }
  }

  function shareSnapshotWhatsApp() {
    let text = '*A.S.V. CONTRACTOR 360° - LIVE FINANCIAL SNAPSHOT*\n\n';
    text += 'Date: ' + new Date().toLocaleDateString('te-IN') + '\n';
    text += 'GST: 36AMXPA2915K1ZR • Mutharam, Peddapalli\n';
    text += '------------------------------------\n';
    text += '*1. CHETHILO & BANK LO UNNA NIDHULU:*\n';
    text += '• Chethi Nagadu (Cash): Rs. ' + cashBalance.toLocaleString('en-IN') + '\n';
    text += '• Bank / UPI Nilva: Rs. ' + bankBalance.toLocaleString('en-IN') + '\n';
    text += '*👉 Total Usable Cash: Rs. ' + totalLiquidity.toLocaleString('en-IN') + '*\n\n';
    text += '*2. PROJECT BUDGET & EXPENSES:*\n';
    text += '• Browser-only Budget Estimate: Rs. ' + budget.toLocaleString('en-IN') + '\n';
    text += '• Total Spent: Rs. ' + totalPaidExpenses.toLocaleString('en-IN') + '\n';
    text += '• Budget Remaining: Rs. ' + budgetRemaining.toLocaleString('en-IN') + '\n\n';
    text += '*3. BAAKEELU & APPULU (LIABILITIES):*\n';
    text += '• Thechina Appulu: Rs. ' + loanOutstanding.toLocaleString('en-IN') + '\n';
    text += '• Supplier / Labour Dues: Rs. ' + totalPayablesDue.toLocaleString('en-IN') + '\n';
    text += '*👉 Total Liabilities: Rs. ' + totalLiabilities.toLocaleString('en-IN') + '*\n';
    text += '------------------------------------\n';
    text += '???????? ????????? ??????? ???????; ??????? ?????.\nGenerated via A.S.V. Enterprises Nexlify ERP';

    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
  }

  function shareVoucherWhatsApp(v) {
    const phoneClean = v.party_phone ? v.party_phone.replace(/[^0-9]/g, '') : '';
    let voucherType = 'PAYMENT VOUCHER';
    if (v.type === 'RECEIPT_INVOICE') voucherType = 'RECEIPT INVOICE';
    if (v.type === 'CONTRA_VOUCHER') voucherType = 'CONTRA TRANSFER';

    let text = '*A.S.V. ENTERPRISES - ' + voucherType + '*\n\n';
    text += 'Voucher No: ' + (v.invoice_no || '') + '\n';
    text += 'Date: ' + (v.date || '') + '\n';
    text += 'Details: ' + (v.description || '') + '\n';
    text += '*Total Amount: Rs. ' + Number(v.amount || 0).toLocaleString('en-IN') + '*\n';
    text += 'Payment Mode: ' + (v.source || '') + '\n';
    text += 'Status: Completed\n\nMutharam Site, Peddapalli.';

    const url = phoneClean 
      ? 'https://api.whatsapp.com/send?phone=91' + phoneClean + '&text=' + encodeURIComponent(text)
      : 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);

    window.open(url, '_blank');
  }

  function printVoucher() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
</script>

<svelte:head>
  <title>A.S.V. Contractor 360° | ERP Dashboard</title>
</svelte:head>
{#if dataError}
  <div role="alert" class="m-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">{dataError} <button type="button" on:click={fetchServerData} class="ml-3 font-bold underline">మళ్లీ ప్రయత్నించండి</button></div>
{/if}
{#if mutationError}
  <p role="alert" class="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{mutationError}</p>
{/if}
{#if !dataError}


{#if authChecking}
  <div class="min-h-screen bg-white flex items-center justify-center text-slate-900">
    <div class="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <div class="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-28">

    <!-- Header with Executive Action Buttons -->
    <header class="bg-white border-b-2 border-amber-500 sticky top-0 z-40 shadow-sm print:hidden">
      <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black rounded-2xl flex items-center justify-center text-xl shadow-md border border-amber-400">
            🏗️
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base sm:text-lg font-black text-slate-900 font-['Ramabhadra']">A.S.V. CONTRACTOR 360° ERP</h1>
              <span class="bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                GST: 36AMXPA2915K1ZR
              </span>
            </div>
            <p class="text-[11px] text-slate-500 font-medium">Supabase Cloud Database • Zero Risk Server Architecture</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- INSTANT FINANCIAL SNAPSHOT BUTTON -->
          <button
            type="button"
            on:click={() => showSnapshotModal = true}
            class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer ring-2 ring-indigo-300"
          >
            <span class="text-amber-300">⚡</span> <span>సైట్ స్నాప్‌షాట్ (Instant Status)</span>
          </button>

          <!-- Expense Button -->
          <button
            type="button"
            on:click={() => showExpenseModal = true}
            class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3 py-2 rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
          >
            <span>➕</span> <span>ఖర్చు (Expense)</span>
          </button>

          <!-- Contra Transfer Button -->
          <button
            type="button"
            on:click={() => showTransferModal = true}
            class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-3 py-2 rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
          >
            <span>🔄</span> <span>నగదు బదిలీ (Cash ⇄ Bank)</span>
          </button>

          <!-- Money In Button -->
          <button
            type="button"
            on:click={() => showMoneyInModal = true}
            class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3 py-2 rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
          >
            <span>💰</span> <span>ఇన్‌ఫ్లో (Money In)</span>
          </button>

          <a href="/" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-2.5 py-2 rounded-xl font-bold border border-slate-200 transition">
            🏠 హోమ్
          </a>
        </div>
      </div>

      <!-- FULL CONNECTED NAVBAR INCLUDING PIECEWORK -->
      <div class="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1 text-xs font-bold scrollbar-none">
        <a href="/admin/contractor" class="px-3 py-2 border-b-2 border-amber-600 text-amber-600 font-black whitespace-nowrap">
          📊 డాష్‌బోర్డ్ (Overview)
        </a>
        <a href="/admin/contractor/materials" class="px-3 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          🧱 మెటీరియల్స్ & బిల్లులు
        </a>
        <a href="/admin/contractor/daily-work" class="px-3 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          📅 డైలీ సైట్ డైరీ & ఫోటోలు
        </a>
        <a href="/admin/contractor/labour" class="px-3 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          👷 లేబర్ DBMS మాస్టర్
        </a>
        <a href="/admin/contractor/piecework" class="px-3 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          📐 సెంట్రింగ్ & పీస్ వర్క్
        </a>
        <a href="/admin/contractor/mbook" class="px-3 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          📏 సివిల్ M-Book (కొలతలు)
        </a>
        <a href="/admin/contractor/party" class="px-3 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          👤 వ్యక్తిగత ఖాతా (Party 360°)
        </a>
        <a href="/admin/contractor/ledger" class="px-3 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          📜 పూర్తి లెడ్జర్ (Cash Flow)
        </a>
        <a href="/admin/contractor/loans" class="px-3 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          🏦 అప్పులు & బాకీలు
        </a>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {#if loadingData}
        <div class="py-16 text-center text-slate-400 font-bold text-xs">డేటా లోడ్ అవుతోంది...</div>
      {:else}
        <p class="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">బడ్జెట్ ఈ బ్రౌజర్‌లో అంచనా మాత్రమే. చారిత్రక రికార్డుల ఆధారంగా నివేదిక; ఖాతాల ధృవీకరణ అవసరం.</p>
        {#if summary.warnings.length > 0}
          <div role="status" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            కొన్ని పాత రికార్డులకు చెల్లింపు ఖాతా లేదా గుర్తింపు వివరాలు లేవు. నిల్వలను తుది లెక్కలుగా పరిగణించవద్దు.
            <details><summary class="mt-2 cursor-pointer font-bold">నిర్ధారణ అవసరమైన రికార్డులు ({summary.warnings.length})</summary><ul>{#each summary.warnings as warning}<li>{warning.recordKey}: {warning.code}</li>{/each}</ul></details>
          </div>
        {/if}
        <!-- Core Financial Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div class="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-500 uppercase block">ప్రాజెక్ట్ బడ్జెట్</span>
                <button type="button" on:click={editBudget} class="text-[10.5px] font-bold text-amber-600 hover:underline">
                  ✏️ మార్చండి
                </button>
              </div>
              <div class="text-sm sm:text-base font-black font-mono text-slate-900 mt-1">₹ {budget.toLocaleString('en-IN')}</div>
            </div>
            <span class="text-[9.5px] text-slate-400 mt-0.5">ఈ బ్రౌజర్‌లో అంచనా మాత్రమే</span>
          </div>

          <div class="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-emerald-600 uppercase block">రాబడి & నిధులు (ఇన్‌ఫ్లో)</span>
            <div class="text-sm sm:text-base font-black font-mono text-emerald-600 mt-1">₹ {(totalInflow || totalReceipts || 0).toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">
              {#if totalInflow > 0 && ownerCapital > 0}
                ఆపరేటింగ్: ₹{totalInflow.toLocaleString('en-IN')} | క్యాపిటల్: ₹{ownerCapital.toLocaleString('en-IN')}
              {:else if ownerCapital > 0}
                పెట్టుబడి నిధులు (Self/Owner Capital)
              {:else}
                ఆపరేటింగ్ రసీదులు (Running Bills/Client)
              {/if}
            </span>
          </div>

          <div class="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-rose-600 uppercase block">సైట్ ఖర్చులు (Paid)</span>
            <div class="text-sm sm:text-base font-black font-mono text-rose-600 mt-1">₹ {totalPaidExpenses.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">చెల్లించిన నగదు</span>
          </div>

          <div class="bg-white border-2 border-blue-200 p-3 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-blue-600 uppercase block">చేతిలో నగదు (Cash)</span>
            <div class="text-sm sm:text-base font-black font-mono text-blue-600 mt-1">₹ {cashBalance.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">పెట్టీ క్యాష్ నిల్వ</span>
          </div>

          <div class="bg-white border-2 border-indigo-200 p-3 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-indigo-600 uppercase block">బ్యాంక్ / UPI నిల్వ</span>
            <div class="text-sm sm:text-base font-black font-mono text-indigo-600 mt-1">₹ {bankBalance.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">ఖాతా బ్యాలెన్స్</span>
          </div>

          <div class="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-amber-700 uppercase block">అప్పులు (Loans Due)</span>
            <div class="text-sm sm:text-base font-black font-mono text-amber-700 mt-1">₹ {loanOutstanding.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">చెల్లించాల్సిన రుణాలు</span>
          </div>

          <div class="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm col-span-2 sm:col-span-1">
            <span class="text-[10px] font-bold text-purple-600 uppercase block">సప్లయర్ / కూలీ బాకీ</span>
            <div class="text-sm sm:text-base font-black font-mono text-purple-600 mt-1">₹ {totalPayablesDue.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">ఉధార్ బిల్లులు</span>
          </div>
        </div>

        <!-- 7 CONNECTED CORE ACTION MODULE CARDS -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <a href="/admin/contractor/labour" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-indigo-500 shadow-sm transition space-y-2 group">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl group-hover:scale-105 transition">👷</div>
              <span class="font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{profilesCount} వర్కర్లు</span>
            </div>
            <h4 class="font-black text-sm text-slate-900">లేబర్ DBMS మాస్టర్</h4>
            <p class="text-xs text-slate-500 leading-relaxed">వర్కర్ ఐడీలు (LBR-001), రోజువారీ హాజరు, చేసిన పని & వేతనాల రికార్డు.</p>
          </a>

          <a href="/admin/contractor/piecework" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-amber-500 shadow-sm transition space-y-2 group">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl group-hover:scale-105 transition">📐</div>
              <span class="font-mono text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">{pieceworkCount} పనులు</span>
            </div>
            <h4 class="font-black text-sm text-slate-900">సెంట్రింగ్ & పీస్ వర్క్</h4>
            <p class="text-xs text-slate-500 leading-relaxed">సెంట్రింగ్, వెల్డింగ్, ఫ్యాబ్రికేషన్ ఫీట్ల కొలతలు, Sft రేటు & అడ్వాన్సులు.</p>
          </a>

          <a href="/admin/contractor/mbook" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-emerald-500 shadow-sm transition space-y-2 group">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl group-hover:scale-105 transition">📏</div>
              <span class="font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">{mbookCount} MB ఎంట్రీలు</span>
            </div>
            <h4 class="font-black text-sm text-slate-900">సివిల్ M-Book & ఎస్టిమేషన్</h4>
            <p class="text-xs text-slate-500 leading-relaxed">పిల్లర్లు, పునాది బెడ్, ఇటుకల సంఖ్య, సిమెంట్ బస్తాలు & రాడ్ల కొలతలు.</p>
          </a>

          <a href="/admin/contractor/daily-work" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-blue-500 shadow-sm transition space-y-2 group">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl group-hover:scale-105 transition">📅</div>
            <h4 class="font-black text-sm text-slate-900">డైలీ సైట్ డైరీ & ఫోటోలు</h4>
            <p class="text-xs text-slate-500 leading-relaxed">రోజువారీ పనుల కేటాయింపు, గ్యాంగ్ వర్కర్ల హాజరు & లైవ్ సైట్ ఫోటోలు.</p>
          </a>

          <a href="/admin/contractor/materials" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-amber-500 shadow-sm transition space-y-2 group">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl group-hover:scale-105 transition">🧱</div>
            <h4 class="font-black text-sm text-slate-900">మెటీరియల్స్ & బిల్లులు</h4>
            <p class="text-xs text-slate-500 leading-relaxed">సిమెంట్, ఇసుక, ఐరన్ పరిమాణం, రేటు, కిరాయి & రశీదు ఫోటోలు.</p>
          </a>

          <a href="/admin/contractor/party" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-purple-500 shadow-sm transition space-y-2 group">
            <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl group-hover:scale-105 transition">👤</div>
            <h4 class="font-black text-sm text-slate-900">వ్యక్తిగత ఖాతా (Party 360°)</h4>
            <p class="text-xs text-slate-500 leading-relaxed">సప్లయర్లు & కూలీల వ్యక్తిగత లెడ్జర్, పాస్‌బుక్ & WhatsApp స్టేట్‌మెంట్.</p>
          </a>

          <a href="/admin/contractor/ledger" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-slate-500 shadow-sm transition space-y-2 group">
            <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl group-hover:scale-105 transition">📜</div>
            <h4 class="font-black text-sm text-slate-900">పూర్తి లెడ్జర్ & క్యాష్ ఫ్లో</h4>
            <p class="text-xs text-slate-500 leading-relaxed">రోజువారీ ఖర్చులు, పేమెంట్లు మరియు డిజిటల్ వోచర్ల రికార్డు.</p>
          </a>

          <a href="/admin/contractor/loans" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-rose-500 shadow-sm transition space-y-2 group">
            <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-xl group-hover:scale-105 transition">🏦</div>
            <h4 class="font-black text-sm text-slate-900">అప్పులు & సప్లయర్ బాకీలు</h4>
            <p class="text-xs text-slate-500 leading-relaxed">తెచ్చిన రుణాలు, వడ్డీ లెక్కలు & చెల్లించాల్సిన ఉధార్ బిల్లులు.</p>
          </a>
        </div>

        <!-- Recent Transactions Ledger with Vouchers -->
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-sm font-black text-slate-900 font-['Ramabhadra']">📜 లైవ్ జనరల్ లెడ్జర్ & డిజిటల్ వోచర్లు (Recent Transactions)</h3>
              <p class="text-xs text-slate-500">ఇక్కడ ఏ ఎంట్రీ చేసినా సంబంధిత ఖాతాలన్నీ ఆటోమేటిక్‌గా అప్‌డేట్ అవుతాయి.</p>
            </div>
            <span class="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">● Live Connected</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-slate-900 text-white uppercase text-[11px]">
                  <th class="p-3">తేదీ</th>
                  <th class="p-3">వోచర్ / ఇన్వాయిస్</th>
                  <th class="p-3">కేటగిరీ</th>
                  <th class="p-3">వివరాలు</th>
                  <th class="p-3">ఎవరికి / బ్యాంక్</th>
                  <th class="p-3 text-right">మొత్తం (₹)</th>
                  <th class="p-3 text-right">విధానం</th>
                  <th class="p-3 text-center">రసీదు</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                {#each transactions.slice(0, 10) as t}
                  <tr class="hover:bg-slate-50 transition">
                    <td class="p-3 font-mono text-slate-500">{t.date}</td>
                    <td class="p-3 font-mono font-bold text-amber-700">{t.invoice_no ? t.invoice_no : ('#TX-' + t.id)}</td>
                    <td class="p-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold {t.category === 'Transfer' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}">
                        {t.category === 'Transfer' ? '🔄 నగదు బదిలీ' : t.category}
                      </span>
                    </td>
                    <td class="p-3 font-bold text-slate-900">{t.description}</td>
                    <td class="p-3 font-bold text-blue-900">{t.recipient}</td>
                    <td class="p-3 text-right font-mono font-black text-slate-900">₹ {Number(t.amount).toLocaleString('en-IN')}</td>
                    <td class="p-3 text-right font-bold {t.status === 'Due' ? 'text-rose-600' : 'text-emerald-600'}">
                      {t.source} {t.balance > 0 ? ('(బాకీ: ₹' + t.balance + ')') : ''}
                    </td>
                    <td class="p-3 text-center">
                      <button
                        type="button"
                        on:click={() => {
                          let vType = 'PAYMENT_VOUCHER';
                          if (t.category === 'Money In') vType = 'RECEIPT_INVOICE';
                          if (t.category === 'Transfer') vType = 'CONTRA_VOUCHER';
                          activeVoucher = { ...t, type: vType };
                          showVoucherModal = true;
                        }}
                        class="bg-amber-50 text-amber-900 border border-amber-300 px-2 py-1 rounded text-[10px] font-bold hover:bg-amber-100 cursor-pointer"
                      >
                        📄 రసీదు
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </main>

    <!-- EXECUTIVE FINANCIAL SNAPSHOT MODAL -->
    {#if showSnapshotModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-xs max-h-[94vh] overflow-y-auto print:m-0 print:p-0">
          <div class="flex items-center justify-between border-b pb-2 print:hidden">
            <div class="flex items-center gap-2">
              <span class="text-base">⚡</span>
              <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">తక్షణ సైట్ ఆర్థిక నివేదిక & నిర్ణయాల సారాంశం</h3>
            </div>
            <button type="button" on:click={() => showSnapshotModal = false} class="text-slate-400 font-bold hover:text-slate-700">✕</button>
          </div>

          <div class="space-y-3">
            <div class="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
              <span class="text-[10px] font-black uppercase text-indigo-800 tracking-wider block">1. ప్రస్తుత అందుబాటులో ఉన్న నిధులు (Available Funds)</span>
              <div class="grid grid-cols-2 gap-3 pt-1">
                <div class="bg-white p-3 rounded-xl border border-blue-100 shadow-xs">
                  <span class="text-[10px] text-slate-500 font-bold block">💵 చేతిలో నగదు (Cash)</span>
                  <span class="text-base font-black font-mono text-blue-700">₹ {cashBalance.toLocaleString('en-IN')}</span>
                </div>
                <div class="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs">
                  <span class="text-[10px] text-slate-500 font-bold block">🏦 బ్యాంక్ / UPI నిల్వ</span>
                  <span class="text-base font-black font-mono text-indigo-700">₹ {bankBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div class="p-2.5 bg-indigo-600 text-white rounded-xl flex justify-between items-center font-bold">
                <span class="text-xs">👉 మొత్తం వాడుకోగల నిల్వ (Total Liquid):</span>
                <span class="text-base font-black font-mono">₹ {totalLiquidity.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span class="text-[10px] font-black uppercase text-slate-700 tracking-wider block">2. ప్రాజెక్ట్ బడ్జెట్ & సైట్ ఖర్చులు</span>
              <div class="grid grid-cols-3 gap-2 text-center">
                <div class="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span class="text-[9.5px] text-slate-500 font-bold block">స్థానిక బడ్జెట్ అంచనా</span>
                  <span class="text-xs font-black font-mono text-slate-900">₹ {budget.toLocaleString('en-IN')}</span>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span class="text-[9.5px] text-slate-500 font-bold block">ఇప్పటివరకు ఖర్చు</span>
                  <span class="text-xs font-black font-mono text-rose-600">₹ {totalPaidExpenses.toLocaleString('en-IN')}</span>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span class="text-[9.5px] text-slate-500 font-bold block">బడ్జెట్ మిగిలిన నిల్వ</span>
                  <span class="text-xs font-black font-mono text-amber-700">₹ {budgetRemaining.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div class="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
              <span class="text-[10px] font-black uppercase text-rose-800 tracking-wider block">3. చెల్లించాల్సిన బాకీలు & అప్పులు</span>
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-white p-2.5 rounded-xl border border-rose-100">
                  <span class="text-[10px] text-slate-500 font-bold block">తెచ్చిన రుణాలు</span>
                  <span class="text-sm font-black font-mono text-rose-700">₹ {loanOutstanding.toLocaleString('en-IN')}</span>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-rose-100">
                  <span class="text-[10px] text-slate-500 font-bold block">సప్లయర్ / కూలీ బాకీలు</span>
                  <span class="text-sm font-black font-mono text-purple-700">₹ {totalPayablesDue.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div class="flex justify-between items-center text-xs font-black text-rose-900 px-1 pt-1">
                <span>మొత్తం క్లియర్ చేయాల్సిన బాకీలు:</span>
                <span class="font-mono text-sm">₹ {totalLiabilities.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-2 border-t print:hidden">
            <button
              type="button"
              on:click={shareSnapshotWhatsApp}
              class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
            >
              <span>📲</span> <span>WhatsApp లో నివేదిక షేర్</span>
            </button>
            <button
              type="button"
              on:click={printVoucher}
              class="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
            >
              <span>🖨️</span> <span>ప్రింట్ / PDF సేవ్</span>
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Contra Transfer Modal -->
    {#if showTransferModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-xs">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">🔄 అంతర్గత నగదు బదిలీ (Cash ⇄ Bank)</h3>
            <button type="button" on:click={() => showTransferModal = false} class="text-slate-400 font-bold">✕</button>
          </div>

          <form on:submit|preventDefault={submitTransfer} class="space-y-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">బదిలీ రకం *</label>
              <select bind:value={transferForm.direction} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-xs">
                <option value="Cash to Bank">🏦 చేతిలో నగదు ➔ బ్యాంకులో జమ</option>
                <option value="Bank to Cash">💵 బ్యాంకు నుండి ➔ చేతికి విత్‌డ్రా</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">మొత్తం (₹) *</label>
              <input type="number" bind:value={transferForm.amount} required placeholder="₹ 0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-black text-sm" />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">బ్యాంకు / ఖాతా వివరాలు *</label>
              <input type="text" bind:value={transferForm.bank_name} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">తేదీ</label>
              <input type="date" bind:value={transferForm.date} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
            </div>

            <button disabled={!STAGE3_ATOMIC_ENTRIES_ENABLED || savingTransfer} type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl shadow transition cursor-pointer text-xs">
              బదిలీని నమోదు చేయండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- Expense Entry Modal -->
    {#if showExpenseModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">➕ సైట్ ఖర్చు నమోదు & వోచర్ జనరేటర్</h3>
            <button type="button" on:click={() => showExpenseModal = false} class="text-slate-400 font-bold">✕</button>
          </div>

          <form on:submit|preventDefault={submitExpense} class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">ఖర్చు కేటగిరీ *</label>
                <select bind:value={expForm.category} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                  <option value="Site Refreshments & Water">🥤 కూల్ డ్రింక్స్, టీ, వాటర్ క్యాన్లు</option>
                  <option value="Materials">🧱 మెటీరియల్స్ (సిమెంట్, ఇసుక, ఐరన్)</option>
                  <option value="Labour & Mestri">👷 లేబర్ కూలీ, మేస్త్రి అడ్వాన్స్</option>
                  <option value="Centring">📐 సెంట్రింగ్ & పీస్ వర్క్</option>
                  <option value="Transport & Fuel">🚚 ట్రాన్స్‌పోర్ట్, డీజిల్, ఆటో కిరాయి</option>
                  <option value="Tools & Equipment">🔧 పనిముట్లు, బైండింగ్ వైర్</option>
                  <option value="General Overheads">📝 జనరల్ సైట్ ఖర్చులు</option>
                </select>
                {#if ['Materials','Labour & Mestri','Centring'].includes(expForm.category)}
                  <p class="mt-1 text-[10px] font-bold text-amber-800">
                    ⚠️ Supplier Bill, Labour Attendance లేదా Piecework బాకీ చెల్లింపును Expenseలో మళ్లీ Save చేయవద్దు.
                    సంబంధించిన Payment Option ఉపయోగించండి. ప్రత్యేకంగా ఇచ్చిన Site ఖర్చులు మాత్రమే ఇక్కడ నమోదు చేయండి.
                  </p>
                {/if}
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">తేదీ</label>
                <input type="date" bind:value={expForm.date} max={projectToday()} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">వివరాలు *</label>
              <input type="text" bind:value={expForm.desc} required placeholder="ఉదా: కూల్ డ్రింక్స్ + వాటర్ క్యాన్ / సిమెంట్ కిరాయి" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">ఎవరికి ఇచ్చారు *</label>
                <input type="text" bind:value={expForm.recipient} required placeholder="ఉదా: బాలాజీ ట్రేడర్స్ / రాములు మేస్త్రి" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">ఫోన్ నంబర్</label>
                <input type="tel" bind:value={expForm.party_phone} placeholder="98480..." class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">మొత్తం ఖర్చు (₹) *</label>
                <input type="number" bind:value={expForm.amount} required placeholder="₹ 0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-black text-sm" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">చెల్లింపు మార్గం</label>
                <select bind:value={expForm.source} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                  <option value="Cash">నగదు (Cash in Hand)</option>
                  <option value="UPI">Google Pay / PhonePe (UPI)</option>
                  <option value="Bank">బ్యాంక్ ట్రాన్స్‌ఫర్ (Bank)</option>
                  <option value="Credit">ఉధార్ / బాకీ (Credit Due)</option>
                </select>
              </div>
            </div>

            {#if expForm.source === 'Credit'}
              <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <label class="block font-bold text-amber-900">ఇచ్చిన అడ్వాన్స్ (Advance ₹):</label>
                <input type="number" min="0" step="0.01" bind:value={expForm.advance_paid} placeholder="0" class="w-full bg-white border border-amber-300 rounded-lg p-2 font-mono font-bold" />
                <label class="block font-bold text-amber-900">అడ్వాన్స్ చెల్లింపు ఖాతా</label>
                <select bind:value={expForm.advance_source} class="w-full bg-white border border-amber-300 rounded-lg p-2">
                  <option value="Cash">Cash</option><option value="Bank">Bank</option><option value="UPI">UPI</option>
                </select>
              </div>
            {/if}

            <div>
              <label class="block font-bold text-slate-700 mb-1">📁 బిల్లు / రశీదు ఫోటో (గ్యాలరీ లేదా కెమెరా)</label>
              <input type="file" accept="image/*" on:change={(e) => handlePhotoUpload(e, 'exp')} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2" />
            </div>

            <button disabled={!STAGE3_ATOMIC_ENTRIES_ENABLED || savingExpense} type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition cursor-pointer text-xs">
              ఖాతాల్లో సేవ్ చేయండి & వోచర్ పొందండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- Money In Modal -->
    {#if showMoneyInModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-xs">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">💰 నగదు ఇన్‌ఫ్లో & రసీదు</h3>
            <button type="button" on:click={() => showMoneyInModal = false} class="text-slate-400 font-bold">✕</button>
          </div>

          <form on:submit|preventDefault={submitMoneyIn} class="space-y-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">ఇన్‌ఫ్లో మార్గం</label>
              <select bind:value={inForm.sourceType} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                <option value="Running Bill Received">రన్నింగ్ బిల్లు వచ్చినది</option>
                <option value="Own Money">స్వంత పెట్టుబడి</option>
                <option value="Borrowed / Loan">అప్పు తెచ్చిన నగదు</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">ఎవరి నుండి వచ్చింది *</label>
              <input type="text" bind:value={inForm.desc} required placeholder="ఉదా: రన్నింగ్ బిల్లు-1" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">మొత్తం (₹) *</label>
                <input type="number" bind:value={inForm.amount} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">చేరిన ఖాతా</label>
                <select bind:value={inForm.target} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                  <option value="Bank">బ్యాంక్</option>
                  <option value="Cash">క్యాష్</option>
                  <option value="UPI">UPI (PhonePe/GPay)</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">తేదీ</label>
              <input type="date" bind:value={inForm.date} max={projectToday()} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
            </div>
            <button disabled={!STAGE3_ATOMIC_ENTRIES_ENABLED || savingMoneyIn} type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl shadow cursor-pointer">
              సేవ్ చేయండి & రసీదు పొందండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- Digital Payment Voucher Modal -->
    {#if showVoucherModal && activeVoucher}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs print:m-0 print:p-0 print:max-w-full">
          <div class="flex items-center justify-between border-b pb-2 print:hidden">
            <span class="text-xs font-bold text-amber-700 font-mono">వోచర్ ప్రివ్యూ</span>
            <button on:click={() => showVoucherModal = false} class="text-slate-400 font-bold">✕</button>
          </div>

          <div class="border-2 border-slate-900 rounded-2xl p-4 space-y-3 bg-white">
            <div class="text-center border-b pb-2">
              <h2 class="text-base font-black font-['Ramabhadra'] text-slate-950">A.S.V. ENTERPRISES</h2>
              <p class="text-[10px] text-slate-600 font-bold">సివిల్ కాంట్రాక్టర్ & జనరల్ ఆర్డర్ సప్లయర్స్</p>
              <p class="text-[9.5px] font-mono text-slate-500">GST: 36AMXPA2915K1ZR • ముత్తారం, పెద్దపల్లి</p>
              <div class="mt-2 inline-block bg-slate-900 text-white font-black text-[10px] px-3 py-0.5 rounded-full uppercase">
                {activeVoucher.type === 'CONTRA_VOUCHER' ? 'అంతర్గత నగదు బదిలీ (CONTRA TRANSFER)' : (activeVoucher.type === 'RECEIPT_INVOICE' ? 'నగదు స్వీకరణ రసీదు (MONEY INVOICE)' : 'చెల్లింపు వోచర్ (PAYMENT VOUCHER)')}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div><strong>వోచర్ నెం:</strong> {activeVoucher.invoice_no}</div>
              <div class="text-right"><strong>తేదీ:</strong> {activeVoucher.date}</div>
            </div>

            <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div><span class="text-slate-500 font-bold">వివరాలు:</span> {activeVoucher.description}</div>
              <div><span class="text-slate-500 font-bold">ఖాతా / బ్యాంక్:</span> <strong>{activeVoucher.recipient}</strong></div>
              <div><span class="text-slate-500 font-bold">విధానం:</span> <strong>{activeVoucher.source}</strong></div>
            </div>

            <div class="flex justify-between items-center p-3 bg-amber-50 rounded-xl border border-amber-200 font-black text-sm">
              <span class="text-amber-950">మొత్తం విలువ:</span>
              <span class="font-mono text-base text-amber-950">₹ {Number(activeVoucher.amount).toLocaleString('en-IN')}</span>
            </div>

            {#if activeVoucher.balance > 0}
              <div class="flex justify-between items-center text-rose-700 font-bold px-1">
                <span>మిగిలిన నికర బాకీ:</span>
                <span class="font-mono">₹ {Number(activeVoucher.balance).toLocaleString('en-IN')}</span>
              </div>
            {/if}

            <div class="pt-6 flex justify-between items-end text-[10px] text-slate-500 border-t">
              <div>అధీకృత సంతకం</div>
              <div class="text-right font-bold text-slate-900">A.S.V. Enterprises</div>
            </div>
          </div>

          <div class="flex gap-2 print:hidden">
            <button on:click={printVoucher} class="flex-1 bg-slate-900 text-white font-black py-2.5 rounded-xl hover:bg-slate-800 transition">
              🖨️ ప్రింట్ / PDF సేవ్
            </button>
            <button on:click={() => shareVoucherWhatsApp(activeVoucher)} class="flex-1 bg-emerald-600 text-white font-black py-2.5 rounded-xl hover:bg-emerald-700 transition">
              📲 వాట్సాప్ రసీదు
            </button>
          </div>
        </div>
      </div>
    {/if}

  </div>
{/if}
{/if}
