<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  let authChecking = true;
  let activeTab = 'dashboard'; // 'dashboard' | 'ledger' | 'mb' | 'labour' | 'materials' | 'loans' | 'reports'

  // Local Storage DB Key
  const DB_KEY = 'ASV_CONTRACTOR_360_DB_V2';

  // State Containers
  let budget = 2500000;
  let transactions = [];
  let mbRecords = [];
  let labourRecords = [];
  let centringRecords = [];
  let loanRecords = [];

  // Modals Control
  let showExpenseModal = false;
  let showMoneyInModal = false;
  let showMbModal = false;
  let showLabourModal = false;
  let showLoanModal = false;
  let previewPhotoUrl = null;

  // Filter & Search Controls
  let searchQuery = '';
  let filterCategory = 'ALL';
  let filterSource = 'ALL';

  // Form Models
  let expForm = {
    category: 'Materials',
    desc: '',
    amount: '',
    source: 'Cash',
    recipient: '',
    date: new Date().toISOString().split('T')[0],
    photo: ''
  };

  let inForm = {
    sourceType: 'Own Money',
    desc: '',
    amount: '',
    target: 'Bank',
    date: new Date().toISOString().split('T')[0]
  };

  let mbForm = {
    desc: '',
    nos: 1,
    l: 10,
    b: 1,
    d: 1,
    unit: 'Cum',
    rate: 450
  };

  let labourForm = {
    name: '',
    role: 'మేస్త్రి (Mason)',
    days: 6,
    rate: 900,
    advance: 0
  };

  let loanForm = {
    lender: '',
    principal: '',
    interest: '1.5% నెలకు',
    date: new Date().toISOString().split('T')[0]
  };

  // Lifecycle
  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
      return;
    }
    authChecking = false;
    loadLocalData();
  });

  function loadLocalData() {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        budget = parsed.budget ?? 2500000;
        transactions = parsed.transactions || [];
        mbRecords = parsed.mbRecords || [];
        labourRecords = parsed.labourRecords || [];
        centringRecords = parsed.centringRecords || [];
        loanRecords = parsed.loanRecords || [];
        return;
      } catch (e) {
        console.error('Data parsing error:', e);
      }
    }

    // Default Seed Data
    budget = 2500000;
    transactions = [
      { id: 101, date: '2026-10-01', category: 'Money In', desc: 'స్వంత పెట్టుబడి (Self Capital)', amount: 400000, source: 'Bank', recipient: 'Project Account', balance: 0, status: 'Received', photo: '' },
      { id: 102, date: '2026-10-02', category: 'Materials', desc: '100 బస్తాల అల్ట్రాటెక్ సిమెంట్', amount: 38000, source: 'Bank', recipient: 'శ్రీనివాస ట్రేడర్స్', balance: 0, status: 'Paid', photo: '' },
      { id: 103, date: '2026-10-03', category: 'Materials', desc: '2 టిప్పర్ల ఇసుక (మంథని క్వారీ)', amount: 32000, source: 'Credit', recipient: 'లక్ష్మి ఇసుక డిపో', balance: 32000, status: 'Due', photo: '' },
      { id: 104, date: '2026-10-04', category: 'Transport', desc: 'JCB ఫౌండేషన్ తవ్వకం 8 గంటలు', amount: 12000, source: 'Cash', recipient: 'వెంకటేష్ JCB', balance: 0, status: 'Paid', photo: '' },
      { id: 105, date: '2026-10-05', category: 'Labour', desc: 'రాములు మేస్త్రి & కూలీల వారం కూలీ', amount: 22500, source: 'Cash', recipient: 'రాములు మేస్త్రి', balance: 0, status: 'Paid', photo: '' },
      { id: 106, date: '2026-10-06', category: 'General', desc: 'సైట్ తాగునీరు, టీ & పూజా ఖర్చులు', amount: 2400, source: 'Cash', recipient: 'లోకల్ షాప్', balance: 0, status: 'Paid', photo: '' }
    ];

    mbRecords = [
      { id: 1, desc: 'Earthwork excavation in foundation', nos: 1, l: 45.0, b: 0.9, d: 1.0, qty: 40.5, unit: 'Cum', rate: 220, amount: 8910 },
      { id: 2, desc: 'P.C.C 1:4:8 Bed Concrete for Compound Wall', nos: 1, l: 45.0, b: 0.9, d: 0.15, qty: 6.075, unit: 'Cum', rate: 4200, amount: 25515 },
      { id: 3, desc: 'C.R.S Stone Masonry in C.M 1:6 for Basement', nos: 1, l: 45.0, b: 0.6, d: 0.75, qty: 20.25, unit: 'Cum', rate: 4800, amount: 97200 }
    ];

    labourRecords = [
      { id: 1, name: 'రాములు', role: 'మేస్త్రి (Mason)', days: 12, rate: 1000, advance: 4000 },
      { id: 2, name: 'శ్రీనివాస్', role: 'మేస్త్రి (Mason)', days: 10, rate: 900, advance: 3000 },
      { id: 3, name: 'లక్ష్మి', role: 'మహిళా కూలీ (Helper)', days: 12, rate: 600, advance: 2000 }
    ];

    centringRecords = [
      { id: 1, contractor: 'గణేష్ సెంట్రింగ్ వర్క్స్', work: 'కాలమ్ బాక్స్ & ప్లింత్ బీమ్', area: 1250, rate: 35, paid: 25000 }
    ];

    loanRecords = [
      { id: 1, lender: 'రమేష్ (ఫైనాన్స్)', date: '2026-10-01', principal: 200000, interest: '1.5% / month', repaid: 50000 }
    ];

    persistState();
  }

  function persistState() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEY, JSON.stringify({
      budget,
      transactions,
      mbRecords,
      labourRecords,
      centringRecords,
      loanRecords
    }));
  }

  // Reactive Dynamic Math
  $: totalMoneyIn = transactions
    .filter(t => t.category === 'Money In')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  $: totalPaidExpenses = transactions
    .filter(t => t.category !== 'Money In' && t.source !== 'Credit')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  $: totalPayablesDue = transactions
    .filter(t => t.source === 'Credit' && t.status === 'Due')
    .reduce((s, t) => s + Number(t.balance || t.amount || 0), 0);

  $: cashIn = transactions.filter(t => t.category === 'Money In' && t.source === 'Cash').reduce((s, t) => s + Number(t.amount), 0);
  $: cashOut = transactions.filter(t => t.category !== 'Money In' && t.source === 'Cash').reduce((s, t) => s + Number(t.amount), 0);
  $: cashBalance = cashIn - cashOut;

  $: bankIn = transactions.filter(t => t.category === 'Money In' && t.source === 'Bank').reduce((s, t) => s + Number(t.amount), 0);
  $: bankOut = transactions.filter(t => t.category !== 'Money In' && (t.source === 'Bank' || t.source === 'UPI')).reduce((s, t) => s + Number(t.amount), 0);
  $: bankBalance = bankIn - bankOut;

  $: loanOutstanding = loanRecords.reduce((sum, l) => sum + (Number(l.principal || 0) - Number(l.repaid || 0)), 0);

  $: mbGrandTotal = mbRecords.reduce((sum, m) => sum + Number(m.amount || 0), 0);

  // Filtered Transactions
  $: filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    const matchQ = !q || (t.desc && t.desc.toLowerCase().includes(q)) || (t.recipient && t.recipient.toLowerCase().includes(q));
    const matchCat = filterCategory === 'ALL' || t.category === filterCategory;
    const matchSrc = filterSource === 'ALL' || t.source === filterSource;
    return matchQ && matchCat && matchSrc;
  });

  // Action Handlers
  function handleExpenseSubmit() {
    if (!expForm.desc || !expForm.amount || !expForm.recipient) {
      alert('దయచేసి పూర్తి వివరాలు నమోదు చేయండి.');
      return;
    }

    const amt = Number(expForm.amount);
    const newTx = {
      id: Date.now(),
      date: expForm.date,
      category: expForm.category,
      desc: expForm.desc,
      amount: amt,
      source: expForm.source,
      recipient: expForm.recipient,
      balance: expForm.source === 'Credit' ? amt : 0,
      status: expForm.source === 'Credit' ? 'Due' : 'Paid',
      photo: expForm.photo || ''
    };

    transactions = [newTx, ...transactions];
    persistState();
    showExpenseModal = false;
    expForm = { category: 'Materials', desc: '', amount: '', source: 'Cash', recipient: '', date: new Date().toISOString().split('T')[0], photo: '' };
  }

  function handleMoneyInSubmit() {
    if (!inForm.desc || !inForm.amount) {
      alert('దయచేసి మొత్తం మరియు వివరాలు నమోదు చేయండి.');
      return;
    }

    const amt = Number(inForm.amount);
    const newTx = {
      id: Date.now(),
      date: inForm.date,
      category: 'Money In',
      desc: `${inForm.sourceType}: ${inForm.desc}`,
      amount: amt,
      source: inForm.target,
      recipient: 'సైట్ ట్రెజరీ (Treasury)',
      balance: 0,
      status: 'Received',
      photo: ''
    };

    if (inForm.sourceType === 'Borrowed / Loan') {
      loanRecords = [...loanRecords, {
        id: Date.now(),
        lender: inForm.desc,
        date: inForm.date,
        principal: amt,
        interest: 'కస్టమ్ రేటు',
        repaid: 0
      }];
    }

    transactions = [newTx, ...transactions];
    persistState();
    showMoneyInModal = false;
    inForm = { sourceType: 'Own Money', desc: '', amount: '', target: 'Bank', date: new Date().toISOString().split('T')[0] };
  }

  function handleMbSubmit() {
    if (!mbForm.desc || !mbForm.rate) {
      alert('దయచేసి పని వివరాలు మరియు రేటు నమోదు చేయండి.');
      return;
    }
    const qty = Number((Number(mbForm.nos) * Number(mbForm.l) * Number(mbForm.b) * Number(mbForm.d)).toFixed(3));
    const amount = Math.round(qty * Number(mbForm.rate));

    mbRecords = [...mbRecords, {
      id: Date.now(),
      desc: mbForm.desc,
      nos: Number(mbForm.nos),
      l: Number(mbForm.l),
      b: Number(mbForm.b),
      d: Number(mbForm.d),
      qty,
      unit: mbForm.unit,
      rate: Number(mbForm.rate),
      amount
    }];

    persistState();
    showMbModal = false;
    mbForm = { desc: '', nos: 1, l: 10, b: 1, d: 1, unit: 'Cum', rate: 450 };
  }

  function handleLabourSubmit() {
    if (!labourForm.name || !labourForm.rate) {
      alert('కూలీ పేరు మరియు రేటు నమోదు చేయండి.');
      return;
    }
    labourRecords = [...labourRecords, {
      id: Date.now(),
      name: labourForm.name,
      role: labourForm.role,
      days: Number(labourForm.days || 1),
      rate: Number(labourForm.rate),
      advance: Number(labourForm.advance || 0)
    }];
    persistState();
    showLabourModal = false;
    labourForm = { name: '', role: 'మేస్త్రి (Mason)', days: 6, rate: 900, advance: 0 };
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        expForm.photo = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  function clearPayableDue(id) {
    transactions = transactions.map(t => {
      if (t.id === id) {
        return { ...t, status: 'Paid', balance: 0 };
      }
      return t;
    });
    persistState();
  }

  function deleteTx(id) {
    if (confirm('ఈ లావాదేవీని తొలగించాలా?')) {
      transactions = transactions.filter(t => t.id !== id);
      persistState();
    }
  }

  function deleteMb(id) {
    if (confirm('ఈ MB రికార్డును తొలగించాలా?')) {
      mbRecords = mbRecords.filter(m => m.id !== id);
      persistState();
    }
  }

  function editBudgetPrompt() {
    const res = prompt('మొత్తం ప్రాజెక్ట్ బడ్జెట్ నమోదు చేయండి (₹):', budget);
    if (res && !isNaN(res)) {
      budget = Number(res);
      persistState();
    }
  }

  // Export to Excel / CSV
  function exportLedgerCSV() {
    let csv = 'ID,Date,Category,Description,Source,Recipient,Amount,Status\n';
    transactions.forEach(t => {
      csv += `"${t.id}","${t.date}","${t.category}","${t.desc}","${t.source}","${t.recipient}","${t.amount}","${t.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BuildTrack_Ledger_${Date.now()}.csv`;
    link.click();
  }

  function exportMbCSV() {
    let csv = 'Item,Description,Nos,Length,Breadth,Depth,Qty,Unit,Rate,TotalAmount\n';
    mbRecords.forEach((m, idx) => {
      csv += `"${idx + 1}","${m.desc}","${m.nos}","${m.l}","${m.b}","${m.d}","${m.qty}","${m.unit}","${m.rate}","${m.amount}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BuildTrack_MBook_${Date.now()}.csv`;
    link.click();
  }
</script>

<svelte:head>
  <title>A.S.V. Contractor 360° | Accounts & MB Management</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Ramabhadra&display=swap" rel="stylesheet">
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-slate-100 flex items-center justify-center text-slate-800">
    <div class="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <div class="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-28">

    <!-- 1. TOP HEADER WITH DESK LINKS -->
    <header class="bg-white border-b-2 border-amber-500 sticky top-0 z-40 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black rounded-2xl flex items-center justify-center text-xl shadow-md">
            🏗️
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base sm:text-lg font-black text-slate-900 font-['Ramabhadra']">
                A.S.V. CONTRACTOR 360° ERP
              </h1>
              <span class="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                GST: 36AMXPA2915K1ZR
              </span>
            </div>
            <p class="text-[11px] text-slate-500">సివిల్ ఇంజనీరింగ్ • M-Book • క్యాష్ ఫ్లో • లేబర్ & మెటీరియల్స్</p>
          </div>
        </div>

        <!-- Desk Navigation & Quick Modals -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            on:click={() => showExpenseModal = true}
            class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1 active:scale-95"
          >
            <span>➕</span> <span>ఖర్చు రాయండి (Expense)</span>
          </button>

          <button
            type="button"
            on:click={() => showMoneyInModal = true}
            class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1 active:scale-95"
          >
            <span>💰</span> <span>ఇన్‌ఫ్లో (Money In)</span>
          </button>

          <a href="/" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-xl font-bold transition shadow">
            🏠 హోమ్
          </a>
          <a href="/admin/news" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold border border-slate-200 transition">
            📰 న్యూస్
          </a>
          <a href="/admin/card-maker" class="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-2 rounded-xl font-bold transition shadow">
            🎨 కార్డ్స్
          </a>
        </div>

      </div>

      <!-- NAVIGATION TABS -->
      <div class="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1 text-xs font-bold">
        <button
          type="button"
          on:click={() => activeTab = 'dashboard'}
          class="px-4 py-2.5 border-b-2 transition whitespace-nowrap {activeTab === 'dashboard' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          📊 డాష్‌బోర్డ్ (Overview)
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'ledger'}
          class="px-4 py-2.5 border-b-2 transition whitespace-nowrap {activeTab === 'ledger' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          📜 పూర్తి లెడ్జర్ & ఫ్లో (Ledger)
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'mb'}
          class="px-4 py-2.5 border-b-2 transition whitespace-nowrap {activeTab === 'mb' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          📐 సివిల్ M-Book (కొలతలు)
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'labour'}
          class="px-4 py-2.5 border-b-2 transition whitespace-nowrap {activeTab === 'labour' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          👷 లేబర్ మస్టర్ & సెంట్రింగ్
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'materials'}
          class="px-4 py-2.5 border-b-2 transition whitespace-nowrap {activeTab === 'materials' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          🚛 మెటీరియల్స్ & ట్రాన్స్‌పోర్ట్
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'loans'}
          class="px-4 py-2.5 border-b-2 transition whitespace-nowrap {activeTab === 'loans' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          🏦 అప్పులు & పెండింగ్ బిల్లులు
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'reports'}
          class="px-4 py-2.5 border-b-2 transition whitespace-nowrap {activeTab === 'reports' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          📑 ఆడిట్ నివేదిక (Reports)
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">

      <!-- ================= 1. TAB: DASHBOARD ================= -->
      {#if activeTab === 'dashboard'}
        <!-- 7 Primary Financial KPIs -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          
          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-slate-500 uppercase block">మొత్తం బడ్జెట్</span>
            <div class="text-sm sm:text-base font-black font-mono text-slate-900 mt-1">₹ {budget.toLocaleString('en-IN')}</div>
            <button type="button" on:click={editBudgetPrompt} class="text-[10px] text-amber-600 font-bold hover:underline">మార్చండి</button>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-emerald-600 uppercase block">మొత్తం Money In</span>
            <div class="text-sm sm:text-base font-black font-mono text-emerald-600 mt-1">₹ {totalMoneyIn.toLocaleString('en-IN')}</div>
            <span class="text-[9px] text-slate-400">పెట్టుబడి + లోన్లు</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-rose-600 uppercase block">సైట్ ఖర్చులు (Paid)</span>
            <div class="text-sm sm:text-base font-black font-mono text-rose-600 mt-1">₹ {totalPaidExpenses.toLocaleString('en-IN')}</div>
            <span class="text-[9px] text-slate-400">చెల్లించిన నగదు</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-blue-600 uppercase block">క్యాష్ ఇన్ హ్యాండ్</span>
            <div class="text-sm sm:text-base font-black font-mono text-blue-600 mt-1">₹ {cashBalance.toLocaleString('en-IN')}</div>
            <span class="text-[9px] text-slate-400">చేతిలో ఉన్న నగదు</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-indigo-600 uppercase block">బ్యాంక్ / UPI బ్యాలెన్స్</span>
            <div class="text-sm sm:text-base font-black font-mono text-indigo-600 mt-1">₹ {bankBalance.toLocaleString('en-IN')}</div>
            <span class="text-[9px] text-slate-400">ఖాతా నిల్వ</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-amber-700 uppercase block">లోన్ బాకీ (Loans)</span>
            <div class="text-sm sm:text-base font-black font-mono text-amber-700 mt-1">₹ {loanOutstanding.toLocaleString('en-IN')}</div>
            <span class="text-[9px] text-slate-400">చెల్లించాల్సిన అప్పు</span>
          </div>

          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm col-span-2 sm:col-span-1">
            <span class="text-[10px] font-bold text-purple-600 uppercase block">పెండింగ్ ఉధార్ (Dues)</span>
            <div class="text-sm sm:text-base font-black font-mono text-purple-600 mt-1">₹ {totalPayablesDue.toLocaleString('en-IN')}</div>
            <span class="text-[9px] text-slate-400">సప్లయర్లకు బాకీ</span>
          </div>

        </div>

        <!-- Flow Formula Banner -->
        <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-5 shadow-lg border border-slate-700">
          <h3 class="text-xs font-black tracking-wider uppercase text-amber-400 font-['Ramabhadra'] mb-3">
            ⚡ సైట్ ఆడిట్ & మనీ ఫ్లో సూత్రం (Money Source ➔ Expense ➔ Paid To ➔ Balance)
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div class="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
              <span class="text-[10px] text-slate-400 uppercase block">1. మొత్తం వచ్చిన నగదు</span>
              <span class="text-sm font-black text-emerald-400 font-mono">₹ {totalMoneyIn.toLocaleString('en-IN')}</span>
            </div>
            <div class="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
              <span class="text-[10px] text-slate-400 uppercase block">2. మొత్తం ఖర్చు చేసినది</span>
              <span class="text-sm font-black text-rose-400 font-mono">₹ {totalPaidExpenses.toLocaleString('en-IN')}</span>
            </div>
            <div class="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
              <span class="text-[10px] text-slate-400 uppercase block">3. మిగిలిన లిక్విడిటీ</span>
              <span class="text-sm font-black text-blue-400 font-mono">₹ {(cashBalance + bankBalance).toLocaleString('en-IN')}</span>
            </div>
            <div class="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
              <span class="text-[10px] text-slate-400 uppercase block">4. బడ్జెట్ మిగులు</span>
              <span class="text-sm font-black text-amber-400 font-mono">₹ {(budget - totalPaidExpenses).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <!-- Recent Ledger & Category Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">తాజా సైట్ లావాదేవీలు</h3>
                <p class="text-[11px] text-slate-500">చివరి 5 ఎంట్రీలు</p>
              </div>
              <button type="button" on:click={() => activeTab = 'ledger'} class="text-xs font-bold text-amber-600 hover:underline">
                పూర్తి లెడ్జర్ చూడండి ➔
              </button>
            </div>

            <div class="space-y-2.5">
              {#each transactions.slice(0, 5) as t}
                <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div class="space-y-0.5">
                    <div class="flex items-center gap-2">
                      <span class="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase {t.category === 'Money In' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'}">
                        {t.category}
                      </span>
                      <span class="text-xs font-black text-slate-900">{t.desc}</span>
                    </div>
                    <p class="text-[11px] text-slate-500 font-mono">
                      {t.source} ➔ {t.recipient} • {t.date}
                    </p>
                  </div>
                  <div class="text-right">
                    <span class="font-mono font-black text-xs {t.category === 'Money In' ? 'text-emerald-600' : 'text-slate-900'}">
                      {t.category === 'Money In' ? '+' : '-'} ₹ {Number(t.amount).toLocaleString('en-IN')}
                    </span>
                    <span class="block text-[10px] {t.status === 'Due' ? 'text-rose-600 font-bold' : 'text-slate-400'}">
                      {t.status}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div class="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">కేటగిరీ వారీగా ఖర్చులు</h3>
              <span class="text-[10px] text-slate-400 font-mono">లైవ్ సమ్</span>
            </div>
            <div class="space-y-3 text-xs">
              {#each ['Materials', 'Labour', 'Centring', 'Transport', 'General'] as cat}
                {@const catSum = transactions.filter(t => t.category === cat).reduce((s, t) => s + Number(t.amount), 0)}
                {@const pct = totalPaidExpenses > 0 ? Math.round((catSum / totalPaidExpenses) * 100) : 0}
                <div class="space-y-1">
                  <div class="flex justify-between font-bold">
                    <span class="text-slate-700">{cat}</span>
                    <span class="font-mono text-slate-900">₹ {catSum.toLocaleString('en-IN')} ({pct}%)</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="bg-amber-500 h-2 rounded-full" style="width: {pct}%"></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- ================= 2. TAB: LEDGER & TRANSACTIONS ================= -->
      {#if activeTab === 'ledger'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-black text-slate-900 font-['Ramabhadra']">
                📜 పూర్తి సైట్ లెడ్జర్ & లావాదేవీల రికార్డు
              </h2>
              <p class="text-xs text-slate-500">తేదీ, కేటగిరీ, నగదు మార్గం, రశీదులతో కూడిన సమగ్ర జాబితా</p>
            </div>

            <div class="flex items-center gap-2">
              <button type="button" on:click={exportLedgerCSV} class="bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow flex items-center gap-1">
                <span>📥</span> Excel ఎక్స్‌పోర్ట్
              </button>
              <button type="button" on:click={() => window.print()} class="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl shadow flex items-center gap-1">
                <span>🖨️</span> ప్రింట్
              </button>
            </div>
          </div>

          <!-- Filters -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="వివరణ లేదా వ్యక్తి పేరు వెతకండి..."
              class="border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />

            <select bind:value={filterCategory} class="border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-bold">
              <option value="ALL">అన్ని కేటగిరీలు (All Categories)</option>
              <option value="Money In">Money In (ఇన్‌ఫ్లో)</option>
              <option value="Materials">Materials (మెటీరియల్స్)</option>
              <option value="Labour">Labour (కూలీలు)</option>
              <option value="Centring">Centring (సెంట్రింగ్)</option>
              <option value="Transport">Transport (ట్రాన్స్‌పోర్ట్/JCB)</option>
              <option value="General">General (ఇతర సైట్ ఖర్చులు)</option>
            </select>

            <select bind:value={filterSource} class="border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-bold">
              <option value="ALL">అన్ని పేమెంట్ మార్గాలు (All Sources)</option>
              <option value="Cash">Cash in Hand (నగదు)</option>
              <option value="Bank">Bank Netbanking</option>
              <option value="UPI">UPI (PhonePe / GPay)</option>
              <option value="Credit">Credit / బాకీ (Udhar)</option>
            </select>
          </div>

          <!-- Ledger Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-slate-900 text-white uppercase text-[11px]">
                  <th class="p-3 rounded-l-xl">తేదీ</th>
                  <th class="p-3">కేటగిరీ</th>
                  <th class="p-3">వివరాలు (Description)</th>
                  <th class="p-3">నగదు మార్గం</th>
                  <th class="p-3">ఎవరికి ఇచ్చారు (Recipient)</th>
                  <th class="p-3 text-right">మొత్తం (₹)</th>
                  <th class="p-3 text-right">స్టేటస్ / బాకీ</th>
                  <th class="p-3 text-center">రశీదు</th>
                  <th class="p-3 text-center rounded-r-xl">చర్య</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each filteredTransactions as t}
                  <tr class="hover:bg-slate-50 transition">
                    <td class="p-2.5 font-mono text-slate-500">{t.date}</td>
                    <td class="p-2.5">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold {t.category === 'Money In' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}">
                        {t.category}
                      </span>
                    </td>
                    <td class="p-2.5 font-bold text-slate-900">{t.desc}</td>
                    <td class="p-2.5 font-mono">{t.source}</td>
                    <td class="p-2.5 font-bold">{t.recipient}</td>
                    <td class="p-2.5 text-right font-mono font-black {t.category === 'Money In' ? 'text-emerald-700' : 'text-slate-900'}">
                      ₹ {Number(t.amount).toLocaleString('en-IN')}
                    </td>
                    <td class="p-2.5 text-right font-mono font-bold {t.status === 'Due' ? 'text-rose-600' : 'text-emerald-600'}">
                      {t.status === 'Due' ? `బాకీ: ₹ ${t.balance}` : '✓ చెల్లించబడింది'}
                    </td>
                    <td class="p-2.5 text-center">
                      {#if t.photo}
                        <button type="button" on:click={() => previewPhotoUrl = t.photo} class="text-blue-600 font-bold hover:underline">
                          📷 రశీదు
                        </button>
                      {:else}
                        <span class="text-slate-300">-</span>
                      {/if}
                    </td>
                    <td class="p-2.5 text-center">
                      <button type="button" on:click={() => deleteTx(t.id)} class="text-rose-500 hover:text-rose-700 font-bold">
                        ✕
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

        </div>
      {/if}

      <!-- ================= 3. TAB: MEASUREMENT BOOK (MB) ================= -->
      {#if activeTab === 'mb'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-black text-slate-900 font-['Ramabhadra']">
                📐 PWD సివిల్ Measurement Book (M-Book)
              </h2>
              <p class="text-xs text-slate-500">ఆటోమేటిక్ లెక్కింపు: Nos × L × B × D/H → Qty × Rate</p>
            </div>

            <div class="flex items-center gap-2">
              <button type="button" on:click={() => showMbModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow">
                ➕ కొలత చేర్చండి
              </button>
              <button type="button" on:click={exportMbCSV} class="bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow">
                MB ఎక్స్‌పోర్ట్
              </button>
              <button type="button" on:click={() => window.print()} class="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl shadow">
                ప్రింట్ MB
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-slate-900 text-white uppercase text-[11px]">
                  <th class="p-2.5 rounded-l-xl">క్ర.సం</th>
                  <th class="p-2.5">పని వివరాలు (Work Description)</th>
                  <th class="p-2.5 text-center">Nos</th>
                  <th class="p-2.5 text-center">పొడవు (L)</th>
                  <th class="p-2.5 text-center">వెడల్పు (B)</th>
                  <th class="p-2.5 text-center">లోతు/ఎత్తు (D/H)</th>
                  <th class="p-2.5 text-right">మొత్తం Qty</th>
                  <th class="p-2.5 text-center">యూనిట్</th>
                  <th class="p-2.5 text-right">రేటు (₹)</th>
                  <th class="p-2.5 text-right">మొత్తం విలువ (₹)</th>
                  <th class="p-2.5 text-center rounded-r-xl">చర్య</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each mbRecords as m, idx}
                  <tr class="hover:bg-slate-50">
                    <td class="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                    <td class="p-2.5 font-bold text-slate-900">{m.desc}</td>
                    <td class="p-2.5 text-center font-mono">{m.nos}</td>
                    <td class="p-2.5 text-center font-mono">{m.l}</td>
                    <td class="p-2.5 text-center font-mono">{m.b}</td>
                    <td class="p-2.5 text-center font-mono">{m.d}</td>
                    <td class="p-2.5 text-right font-mono font-bold text-amber-700">{m.qty}</td>
                    <td class="p-2.5 text-center font-bold text-slate-500">{m.unit}</td>
                    <td class="p-2.5 text-right font-mono">₹ {m.rate}</td>
                    <td class="p-2.5 text-right font-mono font-black text-slate-900">₹ {m.amount.toLocaleString('en-IN')}</td>
                    <td class="p-2.5 text-center">
                      <button type="button" on:click={() => deleteMb(m.id)} class="text-rose-500 font-bold">✕</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr class="bg-amber-50 font-black text-sm border-t-2 border-amber-300">
                  <td colspan="9" class="p-3 text-right font-['Ramabhadra']">మొత్తం MB వర్క్ విలువ (Grand Total):</td>
                  <td class="p-3 text-right font-mono text-amber-900 text-base">₹ {mbGrandTotal.toLocaleString('en-IN')}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      {/if}

      <!-- ================= 4. TAB: LABOUR & CENTRING ================= -->
      {#if activeTab === 'labour'}
        <div class="space-y-6">
          <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">👷 డైలీ లేబర్ మస్టర్ రోల్ (Wages Register)</h3>
                <p class="text-[11px] text-slate-500">మేస్త్రి, కూలీల పని దినాలు, అడ్వాన్సులు & చెల్లించాల్సిన బ్యాలెన్స్</p>
              </div>
              <button type="button" on:click={() => showLabourModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow">
                ➕ లేబర్ నమోదు
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="bg-slate-900 text-white uppercase text-[11px]">
                    <th class="p-2.5 rounded-l-xl">కూలీ / మేస్త్రి పేరు</th>
                    <th class="p-2.5">పని రకం</th>
                    <th class="p-2.5 text-center">పనిచేసిన రోజులు</th>
                    <th class="p-2.5 text-right">రోజువారీ రేటు (₹)</th>
                    <th class="p-2.5 text-right">మొత్తం సంపాదన (₹)</th>
                    <th class="p-2.5 text-right">ఇచ్చిన అడ్వాన్స్ (₹)</th>
                    <th class="p-2.5 text-right font-black text-rose-300">ఇవ్వాల్సిన బాకీ (₹)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {#each labourRecords as l}
                    {@const totalEarned = l.days * l.rate}
                    {@const balanceDue = totalEarned - l.advance}
                    <tr class="hover:bg-slate-50">
                      <td class="p-2.5 font-bold text-slate-900">{l.name}</td>
                      <td class="p-2.5 text-slate-600">{l.role}</td>
                      <td class="p-2.5 text-center font-mono">{l.days}</td>
                      <td class="p-2.5 text-right font-mono">₹ {l.rate}</td>
                      <td class="p-2.5 text-right font-mono font-bold">₹ {totalEarned.toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-right font-mono text-emerald-700">₹ {l.advance.toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-right font-mono font-black text-rose-600">₹ {balanceDue.toLocaleString('en-IN')}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Centring Contract Roll -->
          <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">🪵 సెంట్రింగ్ & షట్టరింగ్ కాంట్రాక్ట్</h3>
              <span class="text-[10px] text-slate-500 font-mono">Sft రేటు లెక్కలు</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="bg-slate-800 text-white uppercase text-[11px]">
                    <th class="p-2.5 rounded-l-xl">కాంట్రాక్టర్</th>
                    <th class="p-2.5">పని సెక్షన్</th>
                    <th class="p-2.5 text-right">వైశాల్యం (Sft)</th>
                    <th class="p-2.5 text-right">రేటు / Sft</th>
                    <th class="p-2.5 text-right">మొత్తం కాంట్రాక్ట్</th>
                    <th class="p-2.5 text-right">ఇచ్చిన నగదు</th>
                    <th class="p-2.5 text-right font-black text-amber-400">మిగిలిన బాకీ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {#each centringRecords as c}
                    {@const cTotal = c.area * c.rate}
                    {@const cBal = cTotal - c.paid}
                    <tr class="hover:bg-slate-50">
                      <td class="p-2.5 font-bold text-slate-900">{c.contractor}</td>
                      <td class="p-2.5 text-slate-600">{c.work}</td>
                      <td class="p-2.5 text-right font-mono">{c.area}</td>
                      <td class="p-2.5 text-right font-mono">₹ {c.rate}</td>
                      <td class="p-2.5 text-right font-mono font-bold">₹ {cTotal.toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-right font-mono text-emerald-700">₹ {c.paid.toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-right font-mono font-black text-amber-600">₹ {cBal.toLocaleString('en-IN')}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {/if}

      <!-- ================= 5. TAB: MATERIALS & TRANSPORT ================= -->
      {#if activeTab === 'materials'}
        <div class="space-y-6">
          <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra'] border-b border-slate-100 pb-2">
              🧱 సిమెంట్, ఇసుక, ఐరన్ & కంకర కొనుగోళ్ల రికార్డు
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="bg-slate-900 text-white uppercase text-[11px]">
                    <th class="p-2.5 rounded-l-xl">తేదీ</th>
                    <th class="p-2.5">మెటీరియల్ / వివరణ</th>
                    <th class="p-2.5">సప్లయర్</th>
                    <th class="p-2.5 text-right">మొత్తం బిల్లు</th>
                    <th class="p-2.5 text-right">చెల్లించినది</th>
                    <th class="p-2.5 text-right font-black text-rose-300">బాకీ (Udhar)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {#each transactions.filter(t => t.category === 'Materials') as m}
                    <tr class="hover:bg-slate-50">
                      <td class="p-2.5 font-mono text-slate-500">{m.date}</td>
                      <td class="p-2.5 font-bold text-slate-900">{m.desc}</td>
                      <td class="p-2.5">{m.recipient}</td>
                      <td class="p-2.5 text-right font-mono font-bold">₹ {Number(m.amount).toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-right font-mono text-emerald-700">{m.status === 'Due' ? '₹ 0' : '₹ ' + Number(m.amount).toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-right font-mono font-black text-rose-600">{m.status === 'Due' ? '₹ ' + m.balance : '₹ 0'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {/if}

      <!-- ================= 6. TAB: LOANS & PAYABLES ================= -->
      {#if activeTab === 'loans'}
        <div class="space-y-6">
          <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">🏦 తెచ్చిన అప్పులు & లోన్లు (Borrowed Capital)</h3>
                <p class="text-[11px] text-slate-500">అప్పు ఇచ్చిన వ్యక్తి, వడ్డీ వివరాలు, చెల్లించినవి & మిగిలిన బాకీ</p>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="bg-slate-900 text-white uppercase text-[11px]">
                    <th class="p-2.5 rounded-l-xl">రుణం ఇచ్చిన వారు (Lender)</th>
                    <th class="p-2.5">తేదీ</th>
                    <th class="p-2.5 text-right">అసలు (Principal)</th>
                    <th class="p-2.5 text-center">వడ్డీ రేటు</th>
                    <th class="p-2.5 text-right">చెల్లించినది (Repaid)</th>
                    <th class="p-2.5 text-right font-black text-amber-400">మిగిలిన అప్పు (Balance)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {#each loanRecords as l}
                    <tr class="hover:bg-slate-50">
                      <td class="p-2.5 font-bold text-slate-900">{l.lender}</td>
                      <td class="p-2.5 font-mono text-slate-500">{l.date}</td>
                      <td class="p-2.5 text-right font-mono font-bold">₹ {Number(l.principal).toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-center font-mono">{l.interest}</td>
                      <td class="p-2.5 text-right font-mono text-emerald-700">₹ {Number(l.repaid).toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-right font-mono font-black text-amber-700">₹ {(l.principal - l.repaid).toLocaleString('en-IN')}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Pending Payables / Credit Bills -->
          <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra'] border-b border-slate-100 pb-2">
              ⏳ సప్లయర్లకు చెల్లించాల్సిన ఉధార్ బిల్లులు (Payables)
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="bg-slate-800 text-white uppercase text-[11px]">
                    <th class="p-2.5 rounded-l-xl">సప్లయర్ / వ్యక్తి</th>
                    <th class="p-2.5">ఐటమ్ వివరాలు</th>
                    <th class="p-2.5 text-right">మొత్తం బిల్లు</th>
                    <th class="p-2.5 text-right font-black text-rose-300">మిగిలిన బాకీ (₹)</th>
                    <th class="p-2.5 text-center rounded-r-xl">బిల్లు క్లియర్ చేయండి</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {#each transactions.filter(t => t.source === 'Credit' && t.status === 'Due') as d}
                    <tr class="hover:bg-slate-50">
                      <td class="p-2.5 font-bold text-slate-900">{d.recipient}</td>
                      <td class="p-2.5 text-slate-700">{d.desc}</td>
                      <td class="p-2.5 text-right font-mono">₹ {Number(d.amount).toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-right font-mono font-black text-rose-600">₹ {Number(d.balance || d.amount).toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-center">
                        <button type="button" on:click={() => clearPayableDue(d.id)} class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow">
                          బాకీ చెల్లించబడింది ✓
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {/if}

      <!-- ================= 7. TAB: AUDIT REPORTS ================= -->
      {#if activeTab === 'reports'}
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-black text-slate-900 font-['Ramabhadra']">📑 సమగ్ర సైట్ ఆడిట్ నివేదిక</h2>
              <p class="text-xs text-slate-500">ఆదాయం, ఖర్చులు, నిల్వలు మరియు బకాయిల అధికారిక స్టేట్‌మెంట్</p>
            </div>
            <button type="button" on:click={() => window.print()} class="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow">
              🖨️ స్టేట్‌మెంట్ ప్రింట్
            </button>
          </div>

          <div class="border-2 border-slate-800 rounded-2xl p-5 space-y-4 bg-white">
            <div class="flex items-center justify-between border-b-2 border-slate-800 pb-3">
              <div>
                <h3 class="font-black text-lg text-slate-900 font-['Ramabhadra']">A.S.V. ENTERPRISES & CIVIL WORKS</h3>
                <p class="text-xs text-slate-600 font-mono">GSTIN: 36AMXPA2915K1ZR • ముత్తారం</p>
              </div>
              <div class="text-right">
                <span class="bg-slate-900 text-white font-mono text-[11px] px-2.5 py-1 rounded">AUDIT SUMMARY</span>
                <p class="text-xs text-slate-500 mt-1">{new Date().toLocaleDateString('te-IN')}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div class="p-3 bg-slate-50 rounded-xl">
                <span class="text-slate-500 block">మొత్తం ఇన్‌ఫ్లో:</span>
                <strong class="text-emerald-700 text-sm">₹ {totalMoneyIn.toLocaleString('en-IN')}</strong>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl">
                <span class="text-slate-500 block">ఖర్చు చేసినది:</span>
                <strong class="text-rose-700 text-sm">₹ {totalPaidExpenses.toLocaleString('en-IN')}</strong>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl">
                <span class="text-slate-500 block">చేతిలో & బ్యాంకులో:</span>
                <strong class="text-blue-700 text-sm">₹ {(cashBalance + bankBalance).toLocaleString('en-IN')}</strong>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl">
                <span class="text-slate-500 block">మొత్తం బాకీలు:</span>
                <strong class="text-amber-800 text-sm">₹ {(loanOutstanding + totalPayablesDue).toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>
        </div>
      {/if}

    </main>

    <!-- EXPENSE MODAL -->
    {#if showExpenseModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">➕ సైట్ ఖర్చు నమోదు చేయండి</h3>
            <button type="button" on:click={() => showExpenseModal = false} class="text-slate-400 font-bold">✕</button>
          </div>

          <form on:submit|preventDefault={handleExpenseSubmit} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">ఖర్చు కేటగిరీ *</label>
              <select bind:value={expForm.category} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                <option value="Materials">Materials (సిమెంట్, ఇసుక, కంకర, ఐరన్)</option>
                <option value="Labour">Labour (మేస్త్రి, కూలీల కూలీ / అడ్వాన్స్)</option>
                <option value="Centring">Centring (సెంట్రింగ్ కాంట్రాక్ట్)</option>
                <option value="Transport">Transport (ట్రాక్టర్, JCB, లారీ కిరాయి)</option>
                <option value="General">General (తాగునీరు, టీ, పూజ, ఇంధనం, ఇతర ఖర్చులు)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">పని / ఖర్చు వివరాలు (Description) *</label>
              <input type="text" bind:value={expForm.desc} required placeholder="ఉదా: 50 బస్తాల సిమెంట్ / మేస్త్రి రాములు కూలీ" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">మొత్తం (Amount - ₹) *</label>
                <input type="number" bind:value={expForm.amount} required placeholder="15000" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">నగదు మార్గం (Payment Source) *</label>
                <select bind:value={expForm.source} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                  <option value="Cash">Cash in Hand (చేతి నగదు)</option>
                  <option value="UPI">UPI (PhonePe / GPay)</option>
                  <option value="Bank">Bank Netbanking</option>
                  <option value="Credit">Credit / ఉధార్ (బాకీ)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">ఎవరికి ఇచ్చారు (Paid To) *</label>
                <input type="text" bind:value={expForm.recipient} required placeholder="సప్లయర్ లేదా వ్యక్తి పేరు" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">తేదీ *</label>
                <input type="date" bind:value={expForm.date} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">బిల్లు / రశీదు ఫోటో (Receipt Photo)</label>
              <input type="file" accept="image/*" on:change={handlePhotoUpload} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-500" />
            </div>

            <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs">
              ఖర్చు నమోదు చేయండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- MONEY IN MODAL -->
    {#if showMoneyInModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">💰 నగదు ఇన్‌ఫ్లో నమోదు (Money In)</h3>
            <button type="button" on:click={() => showMoneyInModal = false} class="text-slate-400 font-bold">✕</button>
          </div>

          <form on:submit|preventDefault={handleMoneyInSubmit} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">ఇన్‌ఫ్లో మార్గం *</label>
              <select bind:value={inForm.sourceType} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                <option value="Own Money">స్వంత నగదు (Self Capital)</option>
                <option value="Bank Withdrawal">బ్యాంక్ నుండి విత్‌డ్రా (Cash Withdrawal)</option>
                <option value="Borrowed / Loan">అప్పు తెచ్చిన నగదు (Borrowed / Loan)</option>
                <option value="Running Bill Received">ప్రభుత్వ రన్నింగ్ బిల్లు వచ్చినది</option>
                <option value="Other Income">ఇతర ఆదాయం</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">వివరణ / ఎవరి వద్ద నుండి వచ్చింది *</label>
              <input type="text" bind:value={inForm.desc} required placeholder="ఉదా: స్వంత డిపాజిట్ / రమేష్ నుండి అప్పు" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">మొత్తం (₹) *</label>
                <input type="number" bind:value={inForm.amount} required placeholder="100000" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">దేనిలోకి చేరింది *</label>
                <select bind:value={inForm.target} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                  <option value="Bank">బ్యాంక్ ఖాతా (Bank Account)</option>
                  <option value="Cash">చేతి నగదు (Cash in Hand)</option>
                </select>
              </div>
            </div>

            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl shadow transition text-xs">
              నగదు సేవ్ చేయండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- MB MODAL -->
    {#if showMbModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">📐 కొత్త MB కొలత చేర్చండి</h3>
            <button type="button" on:click={() => showMbModal = false} class="text-slate-400 font-bold">✕</button>
          </div>

          <form on:submit|preventDefault={handleMbSubmit} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">పని వివరాలు (Work Description) *</label>
              <input type="text" bind:value={mbForm.desc} required placeholder="ఉదా: C.C. Road Bed Concrete" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
            </div>

            <div class="grid grid-cols-4 gap-2">
              <div>
                <label class="block font-bold text-slate-600 mb-1">Nos</label>
                <input type="number" step="any" bind:value={mbForm.nos} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-center" />
              </div>
              <div>
                <label class="block font-bold text-slate-600 mb-1">పొడవు (L)</label>
                <input type="number" step="any" bind:value={mbForm.l} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-center" />
              </div>
              <div>
                <label class="block font-bold text-slate-600 mb-1">వెడల్పు (B)</label>
                <input type="number" step="any" bind:value={mbForm.b} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-center" />
              </div>
              <div>
                <label class="block font-bold text-slate-600 mb-1">లోతు (D)</label>
                <input type="number" step="any" bind:value={mbForm.d} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-center" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">యూనిట్</label>
                <select bind:value={mbForm.unit} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                  <option value="Cum">Cum (ఘనపు మీటర్లు)</option>
                  <option value="Sqm">Sqm (చదరపు మీటర్లు)</option>
                  <option value="Sft">Sft (చదరపు అడుగులు)</option>
                  <option value="Rft">Running Feet (Rft)</option>
                </select>
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">ధర (Rate per Unit - ₹) *</label>
                <input type="number" bind:value={mbForm.rate} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
            </div>

            <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs">
              M-Book లో చేర్చండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- LABOUR MODAL -->
    {#if showLabourModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">👷 లేబర్ నమోదు చేయండి</h3>
            <button type="button" on:click={() => showLabourModal = false} class="text-slate-400 font-bold">✕</button>
          </div>

          <form on:submit|preventDefault={handleLabourSubmit} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">కూలీ / మేస్త్రి పేరు *</label>
              <input type="text" bind:value={labourForm.name} required placeholder="ఉదా: రాములు" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">పని రకం</label>
              <select bind:value={labourForm.role} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                <option value="మేస్త్రి (Mason)">మేస్త్రి (Mason)</option>
                <option value="కూలీ (Male Helper)">పురుష కూలీ (Male Helper)</option>
                <option value="మహిళా కూలీ (Female Helper)">మహిళా కూలీ (Female Helper)</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">రోజులు</label>
                <input type="number" bind:value={labourForm.days} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">రోజు రేటు (₹) *</label>
                <input type="number" bind:value={labourForm.rate} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">ఇచ్చిన అడ్వాన్స్ (₹)</label>
              <input type="number" bind:value={labourForm.advance} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono" />
            </div>

            <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs">
              మస్టర్ లో చేర్చండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- RECEIPT PREVIEW MODAL -->
    {#if previewPhotoUrl}
      <div class="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-4 space-y-3">
          <div class="flex items-center justify-between border-b pb-2">
            <span class="text-xs font-bold text-slate-700">జతచేసిన బిల్లు రశీదు</span>
            <button type="button" on:click={() => previewPhotoUrl = null} class="font-bold text-slate-500">✕</button>
          </div>
          <img src={previewPhotoUrl} alt="Receipt" class="w-full max-h-80 object-contain rounded-2xl bg-black" />
        </div>
      </div>
    {/if}

    <!-- MOBILE FLOATING ACTION BAR -->
    <div class="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 z-40 flex items-center justify-around gap-2 shadow-2xl">
      <button type="button" on:click={() => activeTab = 'dashboard'} class="flex flex-col items-center text-amber-600 text-[10px] font-bold">
        <span class="text-base">📊</span> హోమ్
      </button>
      <button type="button" on:click={() => activeTab = 'ledger'} class="flex flex-col items-center text-slate-600 text-[10px] font-bold">
        <span class="text-base">📜</span> లెడ్జర్
      </button>
      <button type="button" on:click={() => showExpenseModal = true} class="bg-amber-500 text-slate-950 font-black rounded-full w-11 h-11 flex items-center justify-center text-xl shadow-lg -mt-5 border-2 border-white">
        ➕
      </button>
      <button type="button" on:click={() => activeTab = 'mb'} class="flex flex-col items-center text-slate-600 text-[10px] font-bold">
        <span class="text-base">📐</span> M-Book
      </button>
      <button type="button" on:click={() => activeTab = 'reports'} class="flex flex-col items-center text-slate-600 text-[10px] font-bold">
        <span class="text-base">📑</span> ఆడిట్
      </button>
    </div>

  </div>
{/if}