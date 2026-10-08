<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  let authChecking = true;
  // Tabs: 'dashboard' | 'ledger' | 'party' | 'mb' | 'calculators' | 'labour' | 'loans' | 'gallery' | 'reports'
  let activeTab = 'dashboard';

  // Persistence Key
  const DB_KEY = 'ASV_CONTRACTOR_360_PRO_WHITE_V3';

  // State Containers
  let budget = 2500000;
  let transactions = [];
  let mbRecords = [];
  let labourRecords = [];
  let centringRecords = [];
  let loanRecords = [];
  let siteGallery = [];

  // Modals & Preview Controls
  let showExpenseModal = false;
  let showMoneyInModal = false;
  let showMbModal = false;
  let showLabourModal = false;
  let showLoanModal = false;
  let showGalleryModal = false;
  let previewPhotoUrl = null;

  // Search & Filters
  let searchQuery = '';
  let filterCategory = 'ALL';
  let filterSource = 'ALL';
  let selectedPartyName = '';

  // Forms
  let expForm = {
    category: 'Materials',
    desc: '',
    amount: '',
    source: 'Cash',
    recipient: '',
    date: new Date().toISOString().split('T')[0],
    photo: '',
    photoTag: 'Bill Receipt'
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
    role: 'మేస్త్రి (Head Mason)',
    days: 6,
    rate: 1000,
    advance: 0
  };

  let loanForm = {
    id: null,
    lender: '',
    principal: '',
    interest: '1.5% నెలకు',
    repaid: 0,
    date: new Date().toISOString().split('T')[0]
  };

  let galleryForm = {
    title: '',
    tag: 'ప్రహరీ గోడ నిర్మాణం',
    photo: '',
    date: new Date().toISOString().split('T')[0]
  };

  // Civil Quick Calculator States
  let calcBarDia = 12; // in mm
  let calcBarLength = 12; // in meters
  let calcBarNos = 10;
  $: calcSteelKg = Number((((calcBarDia * calcBarDia) / 162) * calcBarLength * calcBarNos).toFixed(2));

  let calcConcreteVolume = 5; // in Cum
  $: calcCementBags = Math.round(calcConcreteVolume * 8.2); // approx for 1:1.5:3
  $: calcSandCft = Math.round(calcConcreteVolume * 15.5);
  $: calcMetalCft = Math.round(calcConcreteVolume * 31);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
      return;
    }
    authChecking = false;
    loadLocalStore();
  });

  function loadLocalStore() {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
      try {
        const d = JSON.parse(stored);
        budget = d.budget ?? 2500000;
        transactions = d.transactions || [];
        mbRecords = d.mbRecords || [];
        labourRecords = d.labourRecords || [];
        centringRecords = d.centringRecords || [];
        loanRecords = d.loanRecords || [];
        siteGallery = d.siteGallery || [];
        return;
      } catch (e) {
        console.error('Data parsing failed:', e);
      }
    }

    // Default Seed
    budget = 2500000;
    transactions = [
      { id: 101, date: '2026-10-01', category: 'Money In', desc: 'స్వంత పెట్టుబడి (Self Capital)', amount: 450000, source: 'Bank', recipient: 'ప్రాజెక్ట్ ట్రెజరీ', balance: 0, status: 'Received', photo: '' },
      { id: 102, date: '2026-10-02', category: 'Materials', desc: '100 బస్తాల అల్ట్రాటెక్ సిమెంట్', amount: 38000, source: 'Bank', recipient: 'శ్రీనివాస ట్రేడర్స్', balance: 0, status: 'Paid', photo: '' },
      { id: 103, date: '2026-10-03', category: 'Materials', desc: '2 టిప్పర్ల ఇసుక (మంథని)', amount: 32000, source: 'Credit', recipient: 'లక్ష్మి ఇసుక డిపో', balance: 32000, status: 'Due', photo: '' },
      { id: 104, date: '2026-10-04', category: 'Transport', desc: 'JCB ఫౌండేషన్ తవ్వకం 8 గంటలు', amount: 12000, source: 'Cash', recipient: 'వెంకటేష్ JCB', balance: 0, status: 'Paid', photo: '' },
      { id: 105, date: '2026-10-05', category: 'Labour', desc: 'రాములు మేస్త్రి & కూలీల వారం చెల్లింపు', amount: 24500, source: 'Cash', recipient: 'రాములు మేస్త్రి', balance: 0, status: 'Paid', photo: '' },
      { id: 106, date: '2026-10-06', category: 'General', desc: 'సైట్ తాగునీరు, టీ & పూజా ఖర్చులు', amount: 2400, source: 'Cash', recipient: 'లోకల్ కిరాణా', balance: 0, status: 'Paid', photo: '' }
    ];

    mbRecords = [
      { id: 1, desc: 'Earthwork excavation in foundation trench', nos: 1, l: 45.0, b: 0.9, d: 1.0, qty: 40.5, unit: 'Cum', rate: 220, amount: 8910 },
      { id: 2, desc: 'P.C.C 1:4:8 Bed Concrete for Compound Wall', nos: 1, l: 45.0, b: 0.9, d: 0.15, qty: 6.075, unit: 'Cum', rate: 4200, amount: 25515 },
      { id: 3, desc: 'C.R.S Stone Masonry in C.M 1:6 for Basement', nos: 1, l: 45.0, b: 0.6, d: 0.75, qty: 20.25, unit: 'Cum', rate: 4800, amount: 97200 }
    ];

    labourRecords = [
      { id: 1, name: 'రాములు మేస్త్రి', role: 'మేస్త్రి (Head Mason)', days: 12, rate: 1000, advance: 4000 },
      { id: 2, name: 'శ్రీనివాస్', role: 'మేస్త్రి (Mason)', days: 10, rate: 900, advance: 3000 },
      { id: 3, name: 'లక్ష్మి', role: 'మహిళా కూలీ (Helper)', days: 12, rate: 600, advance: 2000 }
    ];

    centringRecords = [
      { id: 1, contractor: 'గణేష్ సెంట్రింగ్ వర్క్స్', work: 'కాలమ్ బాక్స్ & ప్లింత్ బీమ్', area: 1250, rate: 35, paid: 25000 }
    ];

    loanRecords = [
      { id: 1, lender: 'రమేష్ ఫైనాన్స్', date: '2026-10-01', principal: 200000, interest: '1.5% నెలకు', repaid: 50000 }
    ];

    saveState();
  }

  function saveState() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEY, JSON.stringify({
      budget,
      transactions,
      mbRecords,
      labourRecords,
      centringRecords,
      loanRecords,
      siteGallery
    }));
  }

  // Reactive CA Finance Calculations
  $: totalInflow = transactions
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
  $: totalLiquidity = cashBalance + bankBalance;
  $: budgetRemaining = budget - totalPaidExpenses;
  $: budgetUtilizationPercent = budget > 0 ? Math.round((totalPaidExpenses / budget) * 100) : 0;

  // Unique Parties for Individual Report
  $: allParties = Array.from(new Set([
    ...transactions.map(t => t.recipient).filter(Boolean),
    ...labourRecords.map(l => l.name).filter(Boolean),
    ...centringRecords.map(c => c.contractor).filter(Boolean),
    ...loanRecords.map(l => l.lender).filter(Boolean)
  ])).sort();

  // Individual Party Profile Ledger
  $: partyTransactions = transactions.filter(t => t.recipient === selectedPartyName);
  $: partyTotalBilled = partyTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  $: partyTotalPaid = partyTransactions.filter(t => t.status === 'Paid').reduce((s, t) => s + Number(t.amount || 0), 0);
  $: partyBalanceDue = partyTransactions.filter(t => t.status === 'Due').reduce((s, t) => s + Number(t.balance || t.amount || 0), 0);

  // Filtered Global Ledger
  $: filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    const matchQ = !q || (t.desc && t.desc.toLowerCase().includes(q)) || (t.recipient && t.recipient.toLowerCase().includes(q));
    const matchCat = filterCategory === 'ALL' || t.category === filterCategory;
    const matchSrc = filterSource === 'ALL' || t.source === filterSource;
    return matchQ && matchCat && matchSrc;
  });

  // Client-Side Photo Resizer/Compressor (Maximum 850px width for fast local storage)
  function compressAndSetPhoto(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 850;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

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

    if (expForm.photo) {
      siteGallery = [{
        id: Date.now(),
        title: expForm.desc,
        tag: expForm.category,
        photo: expForm.photo,
        date: expForm.date
      }, ...siteGallery];
    }

    saveState();
    showExpenseModal = false;
    expForm = { category: 'Materials', desc: '', amount: '', source: 'Cash', recipient: '', date: new Date().toISOString().split('T')[0], photo: '', photoTag: 'Bill Receipt' };
  }

  function handleMoneyInSubmit() {
    if (!inForm.desc || !inForm.amount) {
      alert('దయచేసి వివరాలు మరియు మొత్తం నమోదు చేయండి.');
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
      recipient: 'ప్రాజెక్ట్ ట్రెజరీ',
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
    saveState();
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
    saveState();
    showMbModal = false;
    mbForm = { desc: '', nos: 1, l: 10, b: 1, d: 1, unit: 'Cum', rate: 450 };
  }

  function handleLabourSubmit() {
    if (!labourForm.name || !labourForm.rate) {
      alert('దయచేసి కూలీ పేరు మరియు రేటు నమోదు చేయండి.');
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
    saveState();
    showLabourModal = false;
    labourForm = { name: '', role: 'మేస్త్రి (Head Mason)', days: 6, rate: 1000, advance: 0 };
  }

  function handleLoanSubmit() {
    if (!loanForm.lender || !loanForm.principal) {
      alert('అప్పు ఇచ్చిన వ్యక్తి పేరు మరియు మొత్తం నమోదు చేయండి.');
      return;
    }
    if (loanForm.id) {
      loanRecords = loanRecords.map(l => l.id === loanForm.id ? { ...l, lender: loanForm.lender, principal: Number(loanForm.principal), interest: loanForm.interest, repaid: Number(loanForm.repaid || 0), date: loanForm.date } : l);
    } else {
      loanRecords = [...loanRecords, {
        id: Date.now(),
        lender: loanForm.lender,
        principal: Number(loanForm.principal),
        interest: loanForm.interest,
        repaid: Number(loanForm.repaid || 0),
        date: loanForm.date
      }];
    }
    saveState();
    showLoanModal = false;
  }

  function handleGallerySubmit() {
    if (!galleryForm.title || !galleryForm.photo) {
      alert('ఫోటో మరియు వివరాలు నమోదు చేయండి.');
      return;
    }
    siteGallery = [{
      id: Date.now(),
      title: galleryForm.title,
      tag: galleryForm.tag,
      photo: galleryForm.photo,
      date: galleryForm.date
    }, ...siteGallery];
    saveState();
    showGalleryModal = false;
    galleryForm = { title: '', tag: 'ప్రహరీ గోడ నిర్మాణం', photo: '', date: new Date().toISOString().split('T')[0] };
  }

  function repayLoan(loan) {
    const curDue = loan.principal - loan.repaid;
    const val = prompt(`ప్రస్తుత బాకీ: ₹ ${curDue.toLocaleString('en-IN')}\nఎంత మొత్తం చెల్లించారు?`, '0');
    if (val && !isNaN(val) && Number(val) > 0) {
      loanRecords = loanRecords.map(l => l.id === loan.id ? { ...l, repaid: l.repaid + Number(val) } : l);
      saveState();
    }
  }

  function deleteTx(id) {
    if (confirm('ఈ లావాదేవీని తొలగించాలా?')) {
      transactions = transactions.filter(t => t.id !== id);
      saveState();
    }
  }

  function clearPayableDue(id) {
    transactions = transactions.map(t => t.id === id ? { ...t, status: 'Paid', balance: 0 } : t);
    saveState();
  }

  function sendPartyWhatsApp() {
    if (!selectedPartyName) return;
    const msg = `*A.S.V. ENTERPRISES - ఖాతా స్టేట్‌మెంట్*\n\nవ్యక్తి / సప్లయర్: ${selectedPartyName}\nమొత్తం పని/బిల్లు: ₹ ${partyTotalBilled.toLocaleString('en-IN')}\nచెల్లించిన మొత్తం: ₹ ${partyTotalPaid.toLocaleString('en-IN')}\n*మిగిలిన నికర బాకీ: ₹ ${partyBalanceDue.toLocaleString('en-IN')}*\n\nతేదీ: ${new Date().toLocaleDateString('te-IN')}\nముత్తారం, పెద్దపల్లి జిల్లా.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  }

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
</script>

<svelte:head>
  <title>A.S.V. Contractor 360° | Construction Accounts & MB Web App</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Ramabhadra&display=swap" rel="stylesheet">
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-white flex items-center justify-center text-slate-900">
    <div class="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <!-- 100% PURE WHITE THEME CONTAINER -->
  <div class="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-28">

    <!-- 1. TOP EXECUTIVE WHITE HEADER -->
    <header class="bg-white border-b-2 border-amber-500 sticky top-0 z-40 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black rounded-2xl flex items-center justify-center text-xl shadow-md border border-amber-400">
            🏗️
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base sm:text-lg font-black text-slate-900 font-['Ramabhadra']">
                A.S.V. CONTRACTOR 360° ERP
              </h1>
              <span class="bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                GST: 36AMXPA2915K1ZR
              </span>
            </div>
            <p class="text-[11px] text-slate-500 font-medium">CA-గ్రేడ్ అకౌంటింగ్ • PWD సివిల్ M-Book • ఫోటో ఎవిడెన్స్ సిస్టమ్</p>
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            on:click={() => showExpenseModal = true}
            class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <span>➕</span> <span>ఖర్చు రాయండి (Expense)</span>
          </button>

          <button
            type="button"
            on:click={() => showMoneyInModal = true}
            class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <span>💰</span> <span>ఇన్‌ఫ్లో (Money In)</span>
          </button>

          <button
            type="button"
            on:click={() => showGalleryModal = true}
            class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow flex items-center gap-1 cursor-pointer"
          >
            <span>📸</span> <span>సైట్ ఫోటో అప్‌లోడ్</span>
          </button>

          <a href="/" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold border border-slate-200 transition">
            🏠 హోమ్
          </a>
        </div>

      </div>

      <!-- TABS BAR -->
      <div class="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1 text-xs font-bold scrollbar-none">
        <button
          type="button"
          on:click={() => activeTab = 'dashboard'}
          class="px-3.5 py-2 border-b-2 transition whitespace-nowrap {activeTab === 'dashboard' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          📊 డాష్‌బోర్డ్ & CA రూపీ ఫ్లో
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'party'}
          class="px-3.5 py-2 border-b-2 transition whitespace-nowrap {activeTab === 'party' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          👤 వ్యక్తిగత ఖాతా (Party Ledger 360°)
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'ledger'}
          class="px-3.5 py-2 border-b-2 transition whitespace-nowrap {activeTab === 'ledger' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          📜 పూర్తి లెడ్జర్ (Cash Flow)
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'mb'}
          class="px-3.5 py-2 border-b-2 transition whitespace-nowrap {activeTab === 'mb' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          📐 సివిల్ M-Book (కొలతలు)
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'calculators'}
          class="px-3.5 py-2 border-b-2 transition whitespace-nowrap {activeTab === 'calculators' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          🧮 ఇంజనీరింగ్ కాలిక్యులేటర్లు
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'labour'}
          class="px-3.5 py-2 border-b-2 transition whitespace-nowrap {activeTab === 'labour' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          👷 లేబర్ మస్టర్ & సెంట్రింగ్
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'loans'}
          class="px-3.5 py-2 border-b-2 transition whitespace-nowrap {activeTab === 'loans' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          🏦 అప్పులు & సప్లయర్ బాకీలు
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'gallery'}
          class="px-3.5 py-2 border-b-2 transition whitespace-nowrap {activeTab === 'gallery' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          📸 సైట్ ప్రోగ్రెస్ ఫోటోలు
        </button>

        <button
          type="button"
          on:click={() => activeTab = 'reports'}
          class="px-3.5 py-2 border-b-2 transition whitespace-nowrap {activeTab === 'reports' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}"
        >
          📑 ఆడిట్ నివేదిక (Audit Statement)
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">

      <!-- ================= 1. TAB: DASHBOARD & CA FLOW ================= -->
      {#if activeTab === 'dashboard'}
        <!-- 7 Core CA Financial Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          
          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <span class="text-[10px] font-bold text-slate-500 uppercase block">ప్రాజెక్ట్ బడ్జెట్</span>
            <div class="text-sm sm:text-base font-black font-mono text-slate-900 mt-1">₹ {budget.toLocaleString('en-IN')}</div>
            <span class="text-[9.5px] text-amber-600 font-bold block mt-0.5">{budgetUtilizationPercent}% వినియోగం</span>
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

        <!-- Clean CA Audit Liquidity Card (White Frame) -->
        <div class="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 class="text-xs font-black uppercase text-amber-600 font-['Ramabhadra'] flex items-center gap-2">
              <span>⚡</span> <span>CA డబుల్-ఎంట్రీ లిక్విడిటీ రికన్సిలియేషన్ (Double-Entry Balance Formula)</span>
            </h3>
            <span class="text-[11px] font-mono font-bold text-slate-500">100% ఆటోమేటిక్ మ్యాచింగ్</span>
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

        <!-- Recent Ledger & Category Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">తాజా సైట్ లావాదేవీల ఫ్లో</h3>
                <p class="text-[11px] text-slate-500">Money Source ➔ Expense ➔ Paid To ➔ Status</p>
              </div>
              <button type="button" on:click={() => activeTab = 'ledger'} class="text-xs font-bold text-amber-600 hover:underline">
                పూర్తి లెడ్జర్ ➔
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
                      {t.status === 'Due' ? `బాకీ: ₹ ${t.balance}` : t.status}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div class="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">కేటగిరీ వారీగా ఖర్చుల విశ్లేషణ</h3>
              <span class="text-[10px] text-slate-400 font-mono">CA Head Summary</span>
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

      <!-- ================= 2. TAB: INDIVIDUAL PARTY / PERSON LEDGER (360°) ================= -->
      {#if activeTab === 'party'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
          
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 class="text-base sm:text-lg font-black text-slate-900 font-['Ramabhadra']">
                👤 వ్యక్తిగత ఖాతా నివేదిక (Individual Party Ledger 360°)
              </h2>
              <p class="text-xs text-slate-500">మేస్త్రి, సప్లయర్ లేదా ఫైనాన్షియర్‌ను ఎంచుకొని వారి పూర్తి లెక్కలు, చెల్లింపులు & బాకీలు చూడండి</p>
            </div>

            <!-- Party Picker -->
            <div class="flex items-center gap-2">
              <select
                bind:value={selectedPartyName}
                class="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- వ్యక్తి / సప్లయర్‌ను ఎంచుకోండి --</option>
                {#each allParties as p}
                  <option value={p}>{p}</option>
                {/each}
              </select>

              {#if selectedPartyName}
                <button
                  type="button"
                  on:click={sendPartyWhatsApp}
                  class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow flex items-center gap-1 cursor-pointer"
                >
                  <span>📲</span> <span>WhatsApp సమ్మరీ</span>
                </button>
              {/if}
            </div>
          </div>

          {#if !selectedPartyName}
            <div class="py-12 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              పైన డ్రాప్‌డౌన్ నుండి వ్యక్తి లేదా సప్లయర్ పేరును ఎంచుకోండి.
            </div>
          {:else}
            <!-- Individual Summary Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span class="text-[10px] text-slate-500 font-bold uppercase block">మొత్తం పని / కొనుగోళ్లు</span>
                <span class="text-lg font-black font-mono text-slate-900">₹ {partyTotalBilled.toLocaleString('en-IN')}</span>
              </div>
              <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <span class="text-[10px] text-emerald-700 font-bold uppercase block">ఇప్పటివరకు చెల్లించినది</span>
                <span class="text-lg font-black font-mono text-emerald-800">₹ {partyTotalPaid.toLocaleString('en-IN')}</span>
              </div>
              <div class="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                <span class="text-[10px] text-rose-700 font-bold uppercase block">ఇంకా చెల్లించాల్సిన నికర బాకీ</span>
                <span class="text-lg font-black font-mono text-rose-700">₹ {partyBalanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <!-- Party Chronological Ledger Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="bg-slate-900 text-white uppercase text-[11px]">
                    <th class="p-2.5 rounded-l-xl">తేదీ</th>
                    <th class="p-2.5">పని / ఐటమ్ వివరాలు</th>
                    <th class="p-2.5">కేటగిరీ</th>
                    <th class="p-2.5">నగదు మార్గం</th>
                    <th class="p-2.5 text-right">మొత్తం బిల్లు (₹)</th>
                    <th class="p-2.5 text-right">స్టేటస్</th>
                    <th class="p-2.5 text-center rounded-r-xl">రశీదు</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {#if partyTransactions.length === 0}
                    <tr>
                      <td colspan="7" class="py-6 text-center text-slate-400">లావాదేవీలు ఏవీ నమోదు కాలేదు.</td>
                    </tr>
                  {:else}
                    {#each partyTransactions as pt}
                      <tr class="hover:bg-slate-50">
                        <td class="p-2.5 font-mono text-slate-500">{pt.date}</td>
                        <td class="p-2.5 font-bold text-slate-900">{pt.desc}</td>
                        <td class="p-2.5">{pt.category}</td>
                        <td class="p-2.5 font-mono">{pt.source}</td>
                        <td class="p-2.5 text-right font-mono font-black text-slate-900">₹ {Number(pt.amount).toLocaleString('en-IN')}</td>
                        <td class="p-2.5 text-right font-mono font-bold {pt.status === 'Due' ? 'text-rose-600' : 'text-emerald-600'}">
                          {pt.status === 'Due' ? `బాకీ: ₹ ${pt.balance}` : '✓ చెల్లించబడింది'}
                        </td>
                        <td class="p-2.5 text-center">
                          {#if pt.photo}
                            <button type="button" on:click={() => previewPhotoUrl = pt.photo} class="text-blue-600 font-bold hover:underline">
                              📷 చూడండి
                            </button>
                          {:else}
                            <span class="text-slate-300">-</span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  {/if}
                </tbody>
              </table>
            </div>
          {/if}

        </div>
      {/if}

      <!-- ================= 3. TAB: CIVIL CALCULATORS (STEEL & CONCRETE) ================= -->
      {#if activeTab === 'calculators'}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Steel TMT Weight Calculator -->
          <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span class="text-xl">🔩</span>
              <div>
                <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">స్టీల్ TMT బరువు కాలిక్యులేటర్ (Steel Weight)</h3>
                <p class="text-[11px] text-slate-500">సూత్రం: డయామీటర్² ÷ 162 × పొడవు × సంఖ్య</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label class="block font-bold text-slate-600 mb-1">డయామీటర్ (Dia - mm)</label>
                <select bind:value={calcBarDia} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                  <option value={8}>8 mm (రింగ్స్)</option>
                  <option value={10}>10 mm (స్లాబ్)</option>
                  <option value={12}>12 mm (బీమ్స్/పిల్లర్లు)</option>
                  <option value={16}>16 mm (భారీ పిల్లర్లు)</option>
                  <option value={20}>20 mm (ఫౌండేషన్)</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-600 mb-1">పొడవు (Meters)</label>
                <input type="number" bind:value={calcBarLength} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>

              <div>
                <label class="block font-bold text-slate-600 mb-1">రాడ్ల సంఖ్య (Nos)</label>
                <input type="number" bind:value={calcBarNos} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
            </div>

            <div class="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
              <span class="font-bold text-amber-900">మొత్తం స్టీల్ బరువు:</span>
              <div class="text-right">
                <span class="text-xl font-black font-mono text-amber-900">{calcSteelKg} Kg</span>
                <span class="text-[11px] text-amber-700 block font-mono">({(calcSteelKg / 1000).toFixed(3)} టన్నులు)</span>
              </div>
            </div>
          </div>

          <!-- Concrete Mix Proportion Estimator -->
          <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span class="text-xl">🧱</span>
              <div>
                <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">కాంక్రీట్ మెటీరియల్ ఎస్టిమేటర్ (M20 Mix)</h3>
                <p class="text-[11px] text-slate-500">ఘనపు మీటర్ల కాంక్రీట్ కు అవసరమైన సిమెంట్, ఇసుక, కంకర</p>
              </div>
            </div>

            <div class="text-xs">
              <label class="block font-bold text-slate-600 mb-1">కాంక్రీట్ పరిమాణం (Volume - Cum)</label>
              <input type="number" bind:value={calcConcreteVolume} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
            </div>

            <div class="grid grid-cols-3 gap-2 text-center text-xs">
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span class="text-[10px] text-slate-500 block">సిమెంట్ (Cement)</span>
                <strong class="text-base font-black text-slate-900 font-mono">{calcCementBags}</strong>
                <span class="text-[10px] text-slate-400 block">బ్యాగులు</span>
              </div>
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span class="text-[10px] text-slate-500 block">ఇసుక (Sand)</span>
                <strong class="text-base font-black text-slate-900 font-mono">{calcSandCft}</strong>
                <span class="text-[10px] text-slate-400 block">Cft</span>
              </div>
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span class="text-[10px] text-slate-500 block">కంకర (20mm Metal)</span>
                <strong class="text-base font-black text-slate-900 font-mono">{calcMetalCft}</strong>
                <span class="text-[10px] text-slate-400 block">Cft</span>
              </div>
            </div>
          </div>

        </div>
      {/if}

      <!-- ================= 4. TAB: MEASUREMENT BOOK (MB) ================= -->
      {#if activeTab === 'mb'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-black text-slate-900 font-['Ramabhadra']">📐 PWD సివిల్ Measurement Book (M-Book)</h2>
              <p class="text-xs text-slate-500">Nos × L × B × D/H = Qty → Total = Qty × Rate</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" on:click={() => showMbModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow cursor-pointer">
                ➕ కొలత చేర్చండి
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
                  <th class="p-2.5">పని వివరాలు</th>
                  <th class="p-2.5 text-center">Nos</th>
                  <th class="p-2.5 text-center">పొడవు (L)</th>
                  <th class="p-2.5 text-center">వెడల్పు (B)</th>
                  <th class="p-2.5 text-center">లోతు (D)</th>
                  <th class="p-2.5 text-right">మొత్తం Qty</th>
                  <th class="p-2.5 text-center">యూనిట్</th>
                  <th class="p-2.5 text-right">రేటు (₹)</th>
                  <th class="p-2.5 text-right">విలువ (₹)</th>
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
                      <button type="button" on:click={() => { if(confirm('MB రికార్డును తొలగించాలా?')) { mbRecords = mbRecords.filter(x => x.id !== m.id); saveState(); } }} class="text-rose-500 font-bold">✕</button>
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

      <!-- ================= 5. TAB: LABOUR & CENTRING ================= -->
      {#if activeTab === 'labour'}
        <div class="space-y-6">
          <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">👷 డైలీ లేబర్ మస్టర్ రోల్</h3>
                <p class="text-[11px] text-slate-500">కూలీల రోజువారీ లెక్కలు & చెల్లించాల్సిన బ్యాలెన్స్</p>
              </div>
              <button type="button" on:click={() => showLabourModal = true} class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl shadow cursor-pointer">
                ➕ కూలీ నమోదు
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="bg-slate-900 text-white uppercase text-[11px]">
                    <th class="p-2.5 rounded-l-xl">కూలీ / మేస్త్రి పేరు</th>
                    <th class="p-2.5">పని రకం</th>
                    <th class="p-2.5 text-center">రోజులు</th>
                    <th class="p-2.5 text-right">రోజు రేటు (₹)</th>
                    <th class="p-2.5 text-right">మొత్తం సంపాదన (₹)</th>
                    <th class="p-2.5 text-right">ఇచ్చిన అడ్వాన్స్ (₹)</th>
                    <th class="p-2.5 text-right font-black text-rose-300">బాకీ (Net Due - ₹)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {#each labourRecords as l}
                    {@const tot = l.days * l.rate}
                    {@const bal = tot - l.advance}
                    <tr class="hover:bg-slate-50">
                      <td class="p-2.5 font-bold text-slate-900">{l.name}</td>
                      <td class="p-2.5 text-slate-600">{l.role}</td>
                      <td class="p-2.5 text-center font-mono">{l.days}</td>
                      <td class="p-2.5 text-right font-mono">₹ {l.rate}</td>
                      <td class="p-2.5 text-right font-mono font-bold">₹ {tot.toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-right font-mono text-emerald-700">₹ {l.advance.toLocaleString('en-IN')}</td>
                      <td class="p-2.5 text-right font-mono font-black text-rose-600">₹ {bal.toLocaleString('en-IN')}</td>
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
                <p class="text-[11px] text-slate-500">అప్పుల రిజిస్టర్, వడ్డీ రేటు, చెల్లింపులు & బ్యాలెన్స్</p>
              </div>
              <button
                type="button"
                on:click={() => { loanForm = { id: null, lender: '', principal: '', interest: '1.5% నెలకు', repaid: 0, date: new Date().toISOString().split('T')[0] }; showLoanModal = true; }}
                class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow cursor-pointer"
              >
                ➕ కొత్త అప్పు నమోదు
              </button>
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
                    <th class="p-2.5 text-center rounded-r-xl">చర్యలు</th>
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
                      <td class="p-2.5 text-center flex items-center justify-center gap-1.5">
                        <button type="button" on:click={() => repayLoan(l)} class="bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold px-2 py-1 rounded text-[10.5px]">
                          💵 చెల్లించు
                        </button>
                        <button type="button" on:click={() => { loanForm = { ...l }; showLoanModal = true; }} class="bg-amber-50 text-amber-800 border border-amber-300 font-bold px-2 py-1 rounded text-[10.5px]">
                          ✏️ ఎడిట్
                        </button>
                        <button type="button" on:click={() => { if(confirm('అప్పు రికార్డును తొలగించాలా?')) { loanRecords = loanRecords.filter(x => x.id !== l.id); saveState(); } }} class="text-rose-500 font-bold text-sm px-1">
                          ✕
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

      <!-- ================= 7. TAB: SITE PHOTO EVIDENCE & PROGRESS GALLERY ================= -->
      {#if activeTab === 'gallery'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">📸 సైట్ వర్క్ ప్రోగ్రెస్ & బిల్లుల ఫోటో గ్యాలరీ</h3>
              <p class="text-[11px] text-slate-500">ఫౌండేషన్, ప్రాకార గోడ, సీసీ రోడ్ల నిర్మాణ దశల రికార్డులు</p>
            </div>
            <button type="button" on:click={() => showGalleryModal = true} class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow cursor-pointer">
              ➕ కొత్త ఫోటో అప్‌లోడ్
            </button>
          </div>

          {#if siteGallery.length === 0}
            <div class="py-12 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              ప్రస్తుతం ఎలాంటి సైట్ ఫోటోలు అప్‌లోడ్ కాలేదు. పైనున్న బటన్ నొక్కి జోడించండి.
            </div>
          {:else}
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {#each siteGallery as g}
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-2 hover:shadow-md transition">
                  <div class="h-40 w-full rounded-xl overflow-hidden bg-slate-200">
                    <img src={g.photo} alt={g.title} class="w-full h-full object-cover cursor-pointer hover:scale-105 transition" on:click={() => previewPhotoUrl = g.photo} />
                  </div>
                  <div>
                    <span class="text-[9.5px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{g.tag}</span>
                    <h4 class="font-black text-xs text-slate-900 mt-1 line-clamp-1">{g.title}</h4>
                    <span class="text-[10px] text-slate-400 font-mono block">{g.date}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- ================= 8. TAB: CA AUDIT REPORT ================= -->
      {#if activeTab === 'reports'}
        <div class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-black text-slate-900 font-['Ramabhadra']">📑 అధికారిక CA సైట్ ఆడిట్ స్టేట్‌మెంట్</h2>
              <p class="text-xs text-slate-500">ఆడిట్ రెడీ ప్రాజెక్ట్ బ్యాలెన్స్ షీట్ & చెల్లింపుల ధ్రువీకరణ</p>
            </div>
            <button type="button" on:click={() => window.print()} class="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow cursor-pointer">
              🖨️ A4 ప్రింట్ చేయండి
            </button>
          </div>

          <!-- Official Printable Sheet -->
          <div class="border-2 border-slate-800 rounded-3xl p-6 space-y-5 bg-white">
            <div class="flex flex-wrap items-center justify-between border-b-2 border-slate-800 pb-4 gap-4">
              <div>
                <h3 class="text-xl font-black text-slate-900 font-['Ramabhadra']">A.S.V. ENTERPRISES</h3>
                <p class="text-xs text-slate-600 font-medium">సివిల్ ఇంజనీరింగ్ కాంట్రాక్టర్ & జనరల్ సప్లయర్స్</p>
                <p class="text-xs text-slate-600">ముత్తారం గ్రామం, పెద్దపల్లి జిల్లా, తెలంగాణ - 505187</p>
                <p class="text-xs font-mono font-bold text-amber-900 mt-0.5">GSTIN: 36AMXPA2915K1ZR</p>
              </div>

              <div class="text-right">
                <span class="bg-slate-900 text-white text-xs font-black px-3 py-1 rounded uppercase">CA STATEMENT</span>
                <p class="text-xs font-mono text-slate-600 mt-2">తేదీ: <strong>{new Date().toLocaleDateString('te-IN')}</strong></p>
              </div>
            </div>

            <!-- Balance Sheet Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span class="text-slate-500 block">మొత్తం ఇన్‌ఫ్లో:</span>
                <strong class="text-emerald-700 text-sm">₹ {totalInflow.toLocaleString('en-IN')}</strong>
              </div>
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span class="text-slate-500 block">సైట్ ఖర్చులు:</span>
                <strong class="text-rose-700 text-sm">₹ {totalPaidExpenses.toLocaleString('en-IN')}</strong>
              </div>
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span class="text-slate-500 block">చేతిలో & బ్యాంకులో:</span>
                <strong class="text-blue-700 text-sm">₹ {totalLiquidity.toLocaleString('en-IN')}</strong>
              </div>
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span class="text-slate-500 block">బాకీలు (Loans+Dues):</span>
                <strong class="text-amber-800 text-sm">₹ {(loanOutstanding + totalPayablesDue).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div class="flex justify-between pt-8 text-xs text-slate-500">
              <div>
                <p>తయారు చేసినవారు (Prepared By)</p>
                <p class="mt-8 font-bold text-slate-900">సైట్ ఇంజనీర్ / అకౌంటెంట్</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-slate-900">For A.S.V. ENTERPRISES</p>
                <p class="mt-8 font-bold text-slate-900">అధీకృత సంతకం & ముద్ర (Authorized Signatory)</p>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- ================= 9. TAB: GLOBAL LEDGER ================= -->
      {#if activeTab === 'ledger'}
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-black text-slate-900 font-['Ramabhadra']">📜 పూర్తి సైట్ లెడ్జర్ (Cash Flow Statement)</h2>
              <p class="text-xs text-slate-500">ప్రతి ఖర్చు మరియు ఆదాయం యొక్క సమగ్ర రికార్డు</p>
            </div>
            <button type="button" on:click={exportLedgerCSV} class="bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow cursor-pointer">
              📥 Excel ఎక్స్‌పోర్ట్
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="bg-slate-900 text-white uppercase text-[11px]">
                  <th class="p-2.5 rounded-l-xl">తేదీ</th>
                  <th class="p-2.5">కేటగిరీ</th>
                  <th class="p-2.5">వివరణ</th>
                  <th class="p-2.5">నగదు మార్గం</th>
                  <th class="p-2.5">ఎవరికి ఇచ్చారు</th>
                  <th class="p-2.5 text-right">మొత్తం (₹)</th>
                  <th class="p-2.5 text-center">రశీదు</th>
                  <th class="p-2.5 text-center rounded-r-xl">చర్య</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each filteredTransactions as t}
                  <tr class="hover:bg-slate-50">
                    <td class="p-2.5 font-mono text-slate-500">{t.date}</td>
                    <td class="p-2.5 font-bold">{t.category}</td>
                    <td class="p-2.5 font-bold text-slate-900">{t.desc}</td>
                    <td class="p-2.5 font-mono">{t.source}</td>
                    <td class="p-2.5">{t.recipient}</td>
                    <td class="p-2.5 text-right font-mono font-black {t.category === 'Money In' ? 'text-emerald-700' : 'text-slate-900'}">₹ {Number(t.amount).toLocaleString('en-IN')}</td>
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
                      <button type="button" on:click={() => deleteTx(t.id)} class="text-rose-500 font-bold">✕</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

    </main>

    <!-- PHOTO PREVIEW MODAL -->
    {#if previewPhotoUrl}
      <div class="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full p-4 space-y-3 shadow-2xl">
          <div class="flex items-center justify-between border-b pb-2">
            <span class="text-xs font-bold text-slate-800">📸 ఫోటో / రశీదు ప్రివ్యూ</span>
            <button type="button" on:click={() => previewPhotoUrl = null} class="text-slate-400 hover:text-black font-bold">✕</button>
          </div>
          <div class="max-h-[75vh] overflow-hidden rounded-2xl flex items-center justify-center bg-slate-100">
            <img src={previewPhotoUrl} alt="Preview" class="w-full h-auto object-contain max-h-[75vh]" />
          </div>
        </div>
      </div>
    {/if}

    <!-- EXPENSE MODAL WITH PHOTO ATTACHMENT -->
    {#if showExpenseModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">➕ సైట్ ఖర్చు నమోదు చేయండి</h3>
            <button type="button" on:click={() => showExpenseModal = false} class="text-slate-400 font-bold">✕</button>
          </div>

          <form on:submit|preventDefault={handleExpenseSubmit} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">ఖర్చు కేటగిరీ</label>
              <select bind:value={expForm.category} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                <option value="Materials">Materials (సిమెంట్, ఇసుక, ఐరన్, కంకర)</option>
                <option value="Labour">Labour (మేస్త్రి, కూలీల ఖర్చులు)</option>
                <option value="Centring">Centring (సెంట్రింగ్ కాంట్రాక్ట్)</option>
                <option value="Transport">Transport (JCB, ట్రాక్టర్, లారీ)</option>
                <option value="General">General (టీ, పూజ, ఇంధనం, ఇతర ఖర్చులు)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">వివరాలు (Description) *</label>
              <input type="text" bind:value={expForm.desc} required placeholder="ఉదా: 50 బస్తాల సిమెంట్ / రాములు మేస్త్రి కూలీ" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">మొత్తం (Amount - ₹) *</label>
                <input type="number" bind:value={expForm.amount} required placeholder="18500" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">నగదు మార్గం</label>
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
                <label class="block font-bold text-slate-700 mb-1">ఎవరికి చెల్లించారు (Paid To) *</label>
                <input type="text" bind:value={expForm.recipient} required placeholder="వ్యక్తి లేదా సప్లయర్ పేరు" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">తేదీ</label>
                <input type="date" bind:value={expForm.date} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">బిల్లు / రశీదు ఫోటో తీయండి / అప్‌లోడ్ చేయండి</label>
              <input type="file" accept="image/*" capture="environment" on:change={(e) => compressAndSetPhoto(e.target.files[0], (url) => expForm.photo = url)} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-500" />
            </div>

            <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs cursor-pointer">
              ఖర్చు నమోదు చేయండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- MONEY IN MODAL -->
    {#if showMoneyInModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">💰 నగదు ఇన్‌ఫ్లో (Money In)</h3>
            <button type="button" on:click={() => showMoneyInModal = false} class="text-slate-400 font-bold">✕</button>
          </div>
          <form on:submit|preventDefault={handleMoneyInSubmit} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">ఇన్‌ఫ్లో మార్గం</label>
              <select bind:value={inForm.sourceType} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                <option value="Own Money">స్వంత నగదు (Self Capital)</option>
                <option value="Bank Withdrawal">బ్యాంక్ నుండి విత్‌డ్రా (Cash)</option>
                <option value="Borrowed / Loan">అప్పు తెచ్చిన నగదు (Borrowed / Loan)</option>
                <option value="Running Bill Received">రన్నింగ్ బిల్లు వచ్చినది</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">వివరాలు</label>
              <input type="text" bind:value={inForm.desc} required placeholder="ఉదా: స్వంత డిపాజిట్ / రమేష్ నుండి అప్పు" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">మొత్తం (₹)</label>
                <input type="number" bind:value={inForm.amount} required placeholder="50000" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">చేరిన ఖాతా</label>
                <select bind:value={inForm.target} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                  <option value="Bank">బ్యాంక్ ఖాతా</option>
                  <option value="Cash">చేతి నగదు</option>
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

    <!-- SITE GALLERY MODAL -->
    {#if showGalleryModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">📸 సైట్ వర్క్ ఫోటో అప్‌లోడ్</h3>
            <button type="button" on:click={() => showGalleryModal = false} class="text-slate-400 font-bold">✕</button>
          </div>
          <form on:submit|preventDefault={handleGallerySubmit} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">పని పేరు / స్టేజ్ *</label>
              <input type="text" bind:value={galleryForm.title} required placeholder="ఉదా: కాంపౌండ్ వాల్ పిల్లర్ కాస్టింగ్" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">ట్యాగ్</label>
              <select bind:value={galleryForm.tag} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                <option value="ప్రహరీ గోడ నిర్మాణం">ప్రహరీ గోడ నిర్మాణం</option>
                <option value="సీసీ రోడ్ ప్యాచ్">సీసీ రోడ్ ప్యాచ్</option>
                <option value="డ్రైనేజీ కాలువ">డ్రైనేజీ కాలువ</option>
                <option value="మెటీరియల్ డెలివరీ">మెటీరియల్ డెలివరీ</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">కెమెరా నుండి ఫోటో తీయండి *</label>
              <input type="file" accept="image/*" capture="environment" required on:change={(e) => compressAndSetPhoto(e.target.files[0], (url) => galleryForm.photo = url)} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2" />
            </div>
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl shadow cursor-pointer">
              గ్యాలరీలో చేర్చండి ➔
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
              <label class="block font-bold text-slate-700 mb-1">పని వివరాలు *</label>
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
            <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs cursor-pointer">
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
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">👷 కూలీ నమోదు చేయండి</h3>
            <button type="button" on:click={() => showLabourModal = false} class="text-slate-400 font-bold">✕</button>
          </div>
          <form on:submit|preventDefault={handleLabourSubmit} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">కూలీ / మేస్త్రి పేరు *</label>
              <input type="text" bind:value={labourForm.name} required placeholder="ఉదా: రాములు మేస్త్రి" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">పని రకం</label>
              <select bind:value={labourForm.role} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                <option value="మేస్త్రి (Head Mason)">మేస్త్రి (Head Mason)</option>
                <option value="కూలీ (Male Helper)">పురుష కూలీ (Male Helper)</option>
                <option value="మహిళా కూలీ (Female Helper)">మహిళా కూలీ (Female Helper)</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">రోజులు</label>
                <input type="number" bind:value={labourForm.days} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">రోజు రేటు (₹) *</label>
                <input type="number" bind:value={labourForm.rate} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold" />
              </div>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">ఇచ్చిన అడ్వాన్స్ (₹)</label>
              <input type="number" bind:value={labourForm.advance} class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono" />
            </div>
            <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs cursor-pointer">
              మస్టర్ లో చేర్చండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- LOAN MODAL -->
    {#if showLoanModal}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <div class="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b pb-2">
            <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">
              {loanForm.id ? '✏️ అప్పు వివరాలు సవరించండి' : '➕ కొత్త అప్పు నమోదు'}
            </h3>
            <button type="button" on:click={() => showLoanModal = false} class="text-slate-400 font-bold">✕</button>
          </div>
          <form on:submit|preventDefault={handleLoanSubmit} class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">రుణం ఇచ్చిన వ్యక్తి పేరు *</label>
              <input type="text" bind:value={loanForm.lender} required placeholder="ఉదా: రమేష్ ఫైనాన్స్" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">అసలు (Principal - ₹) *</label>
                <input type="number" bind:value={loanForm.principal} required placeholder="200000" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">వడ్డీ రేటు</label>
                <input type="text" bind:value={loanForm.interest} placeholder="1.5% నెలకు" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">చెల్లించినది (Repaid - ₹)</label>
                <input type="number" bind:value={loanForm.repaid} placeholder="0" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">తేదీ</label>
                <input type="date" bind:value={loanForm.date} required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold" />
              </div>
            </div>
            <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl shadow transition text-xs cursor-pointer">
              సేవ్ చేయండి ➔
            </button>
          </form>
        </div>
      </div>
    {/if}

    <!-- MOBILE FLOATING ACTION BAR -->
    <div class="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 z-40 flex items-center justify-around gap-2 shadow-2xl">
      <button type="button" on:click={() => activeTab = 'dashboard'} class="flex flex-col items-center text-amber-600 text-[10px] font-bold">
        <span class="text-base">📊</span> హోమ్
      </button>
      <button type="button" on:click={() => activeTab = 'party'} class="flex flex-col items-center text-slate-600 text-[10px] font-bold">
        <span class="text-base">👤</span> ఖాతా
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