<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  let authChecking = true;
  let loadingData = true;

  // Budget state (persisted)
  let budget = 2500000;
  let transactions = [];
  let loanRecords = [];
  let mbRecords = [];
  let labourRecords = [];

  let showExpenseModal = false;
  let showMoneyInModal = false;

  let expForm = {
    category: 'Materials',
    desc: '',
    amount: '',
    source: 'Cash',
    recipient: '',
    date: new Date().toISOString().split('T')[0]
  };

  let inForm = {
    sourceType: 'Own Money',
    desc: '',
    amount: '',
    target: 'Bank',
    date: new Date().toISOString().split('T')[0]
  };

  onMount(async () => {
    // Load persisted budget
    if (typeof window !== 'undefined') {
      const savedBudget = localStorage.getItem('ASV_CONTRACTOR_BUDGET');
      if (savedBudget) {
        budget = Number(savedBudget);
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
      return;
    }
    authChecking = false;
    await fetchServerData();
  });

  async function fetchServerData() {
    loadingData = true;
    try {
      const { data: txData } = await supabase
        .from('contractor_transactions')
        .select('*')
        .order('date', { ascending: false });
      transactions = txData ? txData : [];

      const { data: loanData } = await supabase
        .from('contractor_loans')
        .select('*')
        .order('id', { ascending: false });
      loanRecords = loanData ? loanData : [];

      const { data: mbData } = await supabase
        .from('contractor_mbook')
        .select('*');
      mbRecords = mbData ? mbData : [];

      const { data: labData } = await supabase
        .from('contractor_labour')
        .select('*');
      labourRecords = labData ? labData : [];
    } catch (e) {
      console.error('Server fetch error:', e);
    } finally {
      loadingData = false;
    }
  }

  // Edit budget function
  function editBudget() {
    const val = prompt('ప్రాజెక్ట్ మొత్తం బడ్జెట్ / వర్క్ ఆర్డర్ విలువ (₹) నమోదు చేయండి:', budget);
    if (val !== null && !isNaN(val) && Number(val) >= 0) {
      budget = Number(val);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ASV_CONTRACTOR_BUDGET', budget);
      }
    }
  }

  $: totalInflow = transactions
    .filter(t => t.category === 'Money In')
    .reduce((s, t) => s + (t.amount ? Number(t.amount) : 0), 0);

  $: totalPaidExpenses = transactions
    .filter(t => t.category !== 'Money In' && t.source !== 'Credit')
    .reduce((s, t) => s + (t.amount ? Number(t.amount) : 0), 0);

  $: totalPayablesDue = transactions
    .filter(t => t.source === 'Credit' && t.status === 'Due')
    .reduce((s, t) => {
      const amt = t.balance ? Number(t.balance) : (t.amount ? Number(t.amount) : 0);
      return s + amt;
    }, 0);

  $: cashIn = transactions
    .filter(t => t.category === 'Money In' && t.source === 'Cash')
    .reduce((s, t) => s + (t.amount ? Number(t.amount) : 0), 0);

  $: cashOut = transactions
    .filter(t => t.category !== 'Money In' && t.source === 'Cash')
    .reduce((s, t) => s + (t.amount ? Number(t.amount) : 0), 0);

  $: cashBalance = cashIn - cashOut;

  $: bankIn = transactions
    .filter(t => t.category === 'Money In' && t.source === 'Bank')
    .reduce((s, t) => s + (t.amount ? Number(t.amount) : 0), 0);

  $: bankOut = transactions
    .filter(t => t.category !== 'Money In' && (t.source === 'Bank' ? true : t.source === 'UPI'))
    .reduce((s, t) => s + (t.amount ? Number(t.amount) : 0), 0);

  $: bankBalance = bankIn - bankOut;

  $: loanOutstanding = loanRecords.reduce((sum, l) => {
    const p = l.principal ? Number(l.principal) : 0;
    const r = l.repaid_amount ? Number(l.repaid_amount) : 0;
    return sum + (p - r);
  }, 0);

  $: totalLiquidity = cashBalance + bankBalance;
  $: budgetRemaining = budget - totalPaidExpenses;

  async function submitExpense() {
    if (!expForm.desc || !expForm.amount || !expForm.recipient) {
      alert('దయచేసి పూర్తి వివరాలు నమోదు చేయండి.');
      return;
    }
    const amt = Number(expForm.amount);
    const { error } = await supabase.from('contractor_transactions').insert([{
      date: expForm.date,
      category: expForm.category,
      description: expForm.desc,
      amount: amt,
      source: expForm.source,
      recipient: expForm.recipient,
      balance: expForm.source === 'Credit' ? amt : 0,
      status: expForm.source === 'Credit' ? 'Due' : 'Paid'
    }]);

    if (error) {
      alert('సర్వర్ ఎర్రర్: ' + error.message);
    } else {
      showExpenseModal = false;
      expForm = { category: 'Materials', desc: '', amount: '', source: 'Cash', recipient: '', date: new Date().toISOString().split('T')[0] };
      await fetchServerData();
    }
  }

  async function submitMoneyIn() {
    if (!inForm.desc || !inForm.amount) {
      alert('మొత్తం మరియు వివరాలు నమోదు చేయండి.');
      return;
    }
    const amt = Number(inForm.amount);
    const { error } = await supabase.from('contractor_transactions').insert([{
      date: inForm.date,
      category: 'Money In',
      description: `${inForm.sourceType}: ${inForm.desc}`,
      amount: amt,
      source: inForm.target,
      recipient: 'Project Treasury',
      balance: 0,
      status: 'Received'
    }]);

    if (inForm.sourceType === 'Borrowed / Loan') {
      await supabase.from('contractor_loans').insert([{
        lender_name: inForm.desc,
        date_borrowed: inForm.date,
        principal: amt,
        interest_rate: '1.5% / month',
        repaid_amount: 0
      }]);
    }

    if (error) {
      alert('సర్వర్ ఎర్రర్: ' + error.message);
    } else {
      showMoneyInModal = false;
      inForm = { sourceType: 'Own Money', desc: '', amount: '', target: 'Bank', date: new Date().toISOString().split('T')[0] };
      await fetchServerData();
    }
  }
</script>

<svelte:head>
  <title>A.S.V. Contractor 360° | Main Dashboard</title>
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-white flex items-center justify-center text-slate-900">
    <div class="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <div class="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-28">

    <header class="bg-white border-b-2 border-amber-500 sticky top-0 z-40 shadow-sm">
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
          <button
            type="button"
            on:click={() => showExpenseModal = true}
            class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
          >
            <span>➕</span> <span>ఖర్చు రాయండి (Expense)</span>
          </button>

          <button
            type="button"
            on:click={() => showMoneyInModal = true}
            class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
          >
            <span>💰</span> <span>ఇన్‌ఫ్లో (Money In)</span>
          </button>

          <a href="/" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold border border-slate-200 transition">
            🏠 హోమ్
          </a>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1 text-xs font-bold scrollbar-none">
        <a href="/admin/contractor" class="px-3.5 py-2 border-b-2 border-amber-600 text-amber-600 font-black whitespace-nowrap">
          📊 డాష్‌బోర్డ్ (Overview)
        </a>
        <a href="/admin/contractor/ledger" class="px-3.5 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          📜 పూర్తి లెడ్జర్ (Cash Flow)
        </a>
        <a href="/admin/contractor/party" class="px-3.5 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          👤 వ్యక్తిగత ఖాతా (Party 360°)
        </a>
        <a href="/admin/contractor/mbook" class="px-3.5 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          📐 సివిల్ M-Book (కొలతలు)
        </a>
        <a href="/admin/contractor/labour" class="px-3.5 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          👷 లేబర్ మస్టర్ & సెంట్రింగ్
        </a>
        <a href="/admin/contractor/loans" class="px-3.5 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap">
          🏦 అప్పులు & సప్లయర్ బాకీలు
        </a>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {#if loadingData}
        <div class="py-16 text-center text-slate-400 font-bold text-xs">డేటా లోడ్ అవుతోంది...</div>
      {:else}
        <!-- 7 Core Financial Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          
          <!-- EDITABLE PROJECT BUDGET CARD -->
          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-500 uppercase block">ప్రాజెక్ట్ బడ్జెట్</span>
                <button
                  type="button"
                  on:click={editBudget}
                  class="text-[10.5px] font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                  title="బడ్జెట్ మార్చండి"
                >
                  ✏️ మార్చండి
                </button>
              </div>
              <div class="text-sm sm:text-base font-black font-mono text-slate-900 mt-1">₹ {budget.toLocaleString('en-IN')}</div>
            </div>
            <span class="text-[9.5px] text-slate-400 mt-0.5">మంజూరైన వ్యయం</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-emerald-600 uppercase block">మొత్తం ఇన్‌ఫ్లో (In)</span>
            <div class="text-sm sm:text-base font-black font-mono text-emerald-600 mt-1">₹ {totalInflow.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">స్వంత + అప్పులు</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-rose-600 uppercase block">సైట్ ఖర్చులు (Paid)</span>
            <div class="text-sm sm:text-base font-black font-mono text-rose-600 mt-1">₹ {totalPaidExpenses.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">చెల్లించిన నగదు</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-blue-600 uppercase block">చేతిలో నగదు (Cash)</span>
            <div class="text-sm sm:text-base font-black font-mono text-blue-600 mt-1">₹ {cashBalance.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">పెట్టీ క్యాష్</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-indigo-600 uppercase block">బ్యాంక్ / UPI నిల్వ</span>
            <div class="text-sm sm:text-base font-black font-mono text-indigo-600 mt-1">₹ {bankBalance.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">ఖాతా బ్యాలెన్స్</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-amber-700 uppercase block">అప్పులు (Loans Due)</span>
            <div class="text-sm sm:text-base font-black font-mono text-amber-700 mt-1">₹ {loanOutstanding.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">చెల్లించాల్సిన అప్పు</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm col-span-2 sm:col-span-1">
            <span class="text-[10px] font-bold text-purple-600 uppercase block">సప్లయర్ బాకీ (Dues)</span>
            <div class="text-sm sm:text-base font-black font-mono text-purple-600 mt-1">₹ {totalPayablesDue.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-slate-400">ఉధార్ బిల్లులు</span>
          </div>
        </div>

        <div class="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 class="text-xs font-black uppercase text-amber-600 flex items-center gap-2 font-['Ramabhadra']">
              <span>⚡</span> <span>సర్వర్ డబుల్-ఎంట్రీ లిక్విడిటీ స్టేటస్ (Live Server Match)</span>
            </h3>
            <span class="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">● Cloud Connected</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span class="text-[10.5px] text-slate-500 block">1. మొత్తం వచ్చిన నిధులు</span>
              <strong class="text-sm font-black text-emerald-700 font-mono">₹ {totalInflow.toLocaleString('en-IN')}</strong>
            </div>
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span class="text-[10.5px] text-slate-500 block">2. మొత్తం ఖర్చు చేసినది</span>
              <strong class="text-sm font-black text-rose-700 font-mono">₹ {totalPaidExpenses.toLocaleString('en-IN')}</strong>
            </div>
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span class="text-[10.5px] text-slate-500 block">3. చేతిలో + బ్యాంకులో మిగులు</span>
              <strong class="text-sm font-black text-blue-700 font-mono">₹ {totalLiquidity.toLocaleString('en-IN')}</strong>
            </div>
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span class="text-[10.5px] text-slate-500 block">4. బడ్జెట్ మిగిలిన నిల్వ</span>
              <strong class="text-sm font-black text-amber-700 font-mono">₹ {budgetRemaining.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="/admin/contractor/ledger" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-amber-500 shadow-sm transition space-y-2 group">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl group-hover:scale-105 transition">📜</div>
            <h4 class="font-black text-sm text-slate-900">సైట్ లెడ్జర్ & క్యాష్ ఫ్లో</h4>
            <p class="text-xs text-slate-500 leading-relaxed">రోజువారీ ఖర్చులు, చెల్లింపుల పూర్తి రికార్డు.</p>
          </a>
          <a href="/admin/contractor/party" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-amber-500 shadow-sm transition space-y-2 group">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl group-hover:scale-105 transition">👤</div>
            <h4 class="font-black text-sm text-slate-900">వ్యక్తిగత ఖాతా (Party 360°)</h4>
            <p class="text-xs text-slate-500 leading-relaxed">వ్యక్తిగత లెడ్జర్ & వాట్సాప్ స్టేట్‌మెంట్.</p>
          </a>
          <a href="/admin/contractor/mbook" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-amber-500 shadow-sm transition space-y-2 group">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl group-hover:scale-105 transition">📐</div>
            <h4 class="font-black text-sm text-slate-900">సివిల్ M-Book (కొలతలు)</h4>
            <p class="text-xs text-slate-500 leading-relaxed">పొడవు, వెడల్పు, లోతు ఆటోమేటిక్ వాల్యూమ్.</p>
          </a>
          <a href="/admin/contractor/loans" class="bg-white border border-slate-200 p-4 rounded-2xl hover:border-amber-500 shadow-sm transition space-y-2 group">
            <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl group-hover:scale-105 transition">🏦</div>
            <h4 class="font-black text-sm text-slate-900">అప్పులు & సప్లయర్ బాకీలు</h4>
            <p class="text-xs text-slate-500 leading-relaxed">తెచ్చిన రుణాలు, వడ్డీ లెక్కలు, ఉధార్ బిల్లులు.</p>
          </a>
        </div>
      {/if}
    </main>

    {#if showExpenseModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">➕ సైట్ ఖర్చు నమోదు</h3>
            <button type="button" on:click={() => showExpenseModal = false} class="text-slate-400 font-bold">✕</button>
          </div>
          <form on:submit|preventDefault={submitExpense} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">ఖర్చు కేటగిరీ</label>
              <select bind:value={expForm.category} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                <option value="Materials">Materials</option>
                <option value="Labour">Labour</option>
                <option value="Centring">Centring</option>
                <option value="Transport">Transport</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">వివరాలు *</label>
              <input type="text" bind:value={expForm.desc} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">మొత్తం (₹) *</label>
                <input type="number" bind:value={expForm.amount} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">నగదు మార్గం</label>
                <select bind:value={expForm.source} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                  <option value="Cash">Cash in Hand</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank</option>
                  <option value="Credit">Credit (ఉధార్)</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">ఎవరికి ఇచ్చారు *</label>
                <input type="text" bind:value={expForm.recipient} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">తేదీ</label>
                <input type="date" bind:value={expForm.date} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
              </div>
            </div>
            <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs cursor-pointer">
              సర్వర్‌లో సేవ్ చేయండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    {#if showMoneyInModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">💰 నగదు ఇన్‌ఫ్లో నమోదు</h3>
            <button type="button" on:click={() => showMoneyInModal = false} class="text-slate-400 font-bold">✕</button>
          </div>
          <form on:submit|preventDefault={submitMoneyIn} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">ఇన్‌ఫ్లో మార్గం</label>
              <select bind:value={inForm.sourceType} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                <option value="Own Money">స్వంత నగదు</option>
                <option value="Bank Withdrawal">బ్యాంక్ విత్‌డ్రా</option>
                <option value="Borrowed / Loan">అప్పు తెచ్చిన నగదు</option>
                <option value="Running Bill Received">రన్నింగ్ బిల్లు వచ్చినది</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">వివరాలు *</label>
              <input type="text" bind:value={inForm.desc} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
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
                </select>
              </div>
            </div>
            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl shadow cursor-pointer">
              సేవ్ చేయండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

  </div>
{/if}