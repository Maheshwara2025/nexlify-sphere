<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  // Live Clock & Date
  let currentTime = '';
  let currentDate = '';

  // Data States
  let latestNews = [];
  let paperClips = [];
  let loadingNews = true;
  let activeClipModal = null;

  // 8 CSC & Citizen Utility Services
  const citizenServices = [
    {
      id: 'aadhaar',
      title: 'ఆధార్ సేవలు (Aadhaar)',
      icon: '🆔',
      badge: 'CSC ID: 514542450010',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      borderColor: 'border-blue-200 hover:border-blue-500',
      iconBg: 'bg-blue-600 text-white',
      desc: 'ఆధార్ డౌన్‌లోడ్, పీవీసీ (PVC) స్మార్ట్ కార్డ్ ప్రింటింగ్, బయోమెట్రిక్ & అడ్రస్ అప్‌డేట్స్.',
      whatsappMsg: 'నమస్తే A.S.V. Enterprises, నాకు ఆధార్ సేవల వివరాలు కావాలి.'
    },
    {
      id: 'dharani',
      title: 'ధరణి & భూభారతి (Dharani)',
      icon: '🌾',
      badge: 'రెవెన్యూ పత్రాలు',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderColor: 'border-emerald-200 hover:border-emerald-500',
      iconBg: 'bg-emerald-600 text-white',
      desc: 'పట్టాదారు పాస్ పుస్తకం కాపీలు, EC, 1B, ROR-1B, స్లాట్ బుకింగ్ & ల్యాండ్ మ్యాప్స్.',
      whatsappMsg: 'నమస్తే, నాకు ధరణి / భూభారతి రెవెన్యూ సేవల వివరాలు కావాలి.'
    },
    {
      id: 'schemes',
      title: 'ప్రభుత్వ సంక్షేమ పథకాలు',
      icon: '🏛️',
      badge: 'తెలంగాణ పథకాలు',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      borderColor: 'border-amber-200 hover:border-amber-500',
      iconBg: 'bg-amber-600 text-white',
      desc: 'ఇందిరమ్మ ఇండ్లు, కొత్త పింఛన్లు, గృహజ్యోతి, రైతు భరోసా & రేషన్ కార్డ్ దరఖాస్తులు.',
      whatsappMsg: 'నమస్తే, నాకు ప్రభుత్వ సంక్షేమ పథకాల ఆన్‌లైన్ దరఖాస్తు సహాయం కావాలి.'
    },
    {
      id: 'irctc',
      title: 'IRCTC రైలు & బస్సు టికెట్లు',
      icon: '🚆',
      badge: 'అధికారిక బుకింగ్',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      borderColor: 'border-orange-200 hover:border-orange-500',
      iconBg: 'bg-orange-600 text-white',
      desc: 'కన్ఫర్మ్డ్ రైలు టికెట్ బుకింగ్, తత్కాల్ సర్వీసెస్, ఫ్లైట్ టికెట్లు & TSRTC బస్సు రిజర్వేషన్.',
      whatsappMsg: 'నమస్తే, నాకు రైలు / బస్సు టికెట్ బుకింగ్ సర్వీస్ కావాలి.'
    },
    {
      id: 'ration',
      title: 'రేషన్ కార్డ్ సేవలు',
      icon: '🍚',
      badge: 'సివిల్ సప్లైస్',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      borderColor: 'border-rose-200 hover:border-rose-500',
      iconBg: 'bg-rose-600 text-white',
      desc: 'కొత్త స్మార్ట్ రేషన్ కార్డులు, సభ్యుల చేరిక/తొలగింపు & డిజిటల్ రేషన్ కార్డ్ కాపీలు.',
      whatsappMsg: 'నమస్తే, నాకు రేషన్ కార్డ్ సేవల వివరాలు కావాలి.'
    },
    {
      id: 'bills',
      title: 'విద్యుత్ & BBPS బిల్లులు',
      icon: '⚡',
      badge: 'తక్షణ రశీదు',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      borderColor: 'border-cyan-200 hover:border-cyan-500',
      iconBg: 'bg-cyan-600 text-white',
      desc: 'కరెంట్ బిల్లులు, గ్రామ పంచాయతీ పన్నులు, నీటి బిల్లులు, ఫాస్టాగ్ & మొబైల్ రీఛార్జ్.',
      whatsappMsg: 'నమస్తే, నేను విద్యుత్ / పంచాయతీ పన్ను బిల్లు చెల్లింపులు చేయాలనుకుంటున్నాను.'
    },
    {
      id: 'pan',
      title: 'పాన్ కార్డ్ & ఇన్సూరెన్స్',
      icon: '📋',
      badge: 'తక్షణ ఈ-పాన్',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      borderColor: 'border-purple-200 hover:border-purple-500',
      iconBg: 'bg-purple-600 text-white',
      desc: 'కొత్త పాన్ కార్డ్ (ఈ-పాన్), కరెక్షన్లు, బైక్ & కార్ ఇన్సూరెన్స్ పాలసీల రెన్యూవల్.',
      whatsappMsg: 'నమస్తే, నాకు పాన్ కార్డ్ / వెహికల్ ఇన్సూరెన్స్ వివరాలు కావాలి.'
    },
    {
      id: 'printing',
      title: 'కలర్ జిరాక్స్ & ప్రింటింగ్ హబ్',
      icon: '🖨️',
      badge: 'హై-క్వాలిటీ ప్రింటింగ్',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      borderColor: 'border-slate-200 hover:border-slate-500',
      iconBg: 'bg-slate-800 text-white',
      desc: 'హెచ్‌డీ కలర్ ప్రింట్లు, లామినేషన్, పాస్‌పోర్ట్ సైజ్ ఫోటోలు, ఆన్‌లైన్ అప్లికేషన్ ప్రింట్లు.',
      whatsappMsg: 'నమస్తే, నాకు డాక్యుమెంట్ ప్రింటింగ్ / జిరాక్స్ సేవలు కావాలి.'
    }
  ];

  // Civil Contracting Disciplines
  const contractingWorks = [
    {
      title: 'గ్రామ పంచాయతీ ప్రాకార నిర్మాణాలు',
      subtitle: 'GP Compound Walls & Fencing',
      icon: '🧱',
      desc: 'గ్రామ పంచాయతీ కార్యాలయాలు, వైకుంఠ ధామాలు, రైతు వేదికలు & ప్రభుత్వ భవనాల దృఢమైన ప్రహరీ గోడల నిర్మాణం.'
    },
    {
      title: 'సీసీ రోడ్లు & అంతర్గత డ్రైనేజీలు',
      subtitle: 'CC Roads & Drainage Works',
      icon: '🛣️',
      desc: 'నాణ్యమైన కాంక్రీట్ రోడ్లు, అండర్‌గ్రౌండ్ డ్రైనేజీ కాలువలు, మరియు కల్వర్టుల ఇంజనీరింగ్ పనులు.'
    },
    {
      title: 'సివిల్ మెటీరియల్స్ & రా మెటీరియల్ సప్లై',
      subtitle: 'Building Supplies & Aggregates',
      icon: '🚛',
      desc: 'సిమెంట్, ఐరన్, క్రషర్ మెటల్, ఇసుక, కంకర మరియు నిర్మాణ సామగ్రి హోల్‌సేల్ సప్లై.'
    },
    {
      title: 'జీఎస్టీ బిల్లింగ్ & ఎం-బుక్ రికార్డులు',
      subtitle: 'Audit Ready Invoicing & M-Book',
      icon: '📑',
      desc: 'ప్రభుత్వ ఇంజనీరింగ్ నిబంధనల ప్రకారం అధికారిక జీఎస్టీ ఇన్వాయిసింగ్ & సాంకేతిక కొలతల నిర్వహణ.'
    }
  ];

  onMount(async () => {
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    await loadHomeData();
    return () => clearInterval(clockInterval);
  });

  function updateClock() {
    const now = new Date();
    currentTime = now.toLocaleTimeString('te-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    currentDate = now.toLocaleDateString('te-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  }

  async function loadHomeData() {
    loadingNews = true;
    try {
      let { data: newsData, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('id', { ascending: false })
        .limit(6);

      if (error || !newsData || newsData.length === 0) {
        const res = await supabase.from('news').select('*').order('id', { ascending: false }).limit(6);
        newsData = res.data;
      }

      latestNews = (newsData || []).map(item => ({
        id: item.id,
        headline: item.headline || item.title || 'తాజా వార్త',
        location: item.location_town || item.location || item.place || 'ముత్తారం',
        image_url: item.image_url || null,
        created_at: item.created_at || null
      }));

      paperClips = latestNews.filter(n => n.image_url).slice(0, 4);
    } catch (e) {
      console.error('Home data load error:', e);
    } finally {
      loadingNews = false;
    }
  }

  function openWhatsApp(msg) {
    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?phone=919949122402&text=${encoded}`, '_blank');
  }
</script>

<svelte:head>
  <title>A.S.V. ENTERPRISES & NS NEWS | ముత్తారం అధికారిక పోర్టల్</title>
  <meta name="description" content="ముత్తారంలో విశ్వసనీయ మీసేవ, ఆధార్, ధరణి సేవలు, సివిల్ కాంట్రాక్టింగ్ మరియు NS News స్థానిక తాజా వార్తా వేదిక." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Ramabhadra&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-24">
  
  <!-- 1. STATUTORY TOP HEADER STRIP -->
  <div class="bg-slate-950 text-slate-300 border-b border-slate-800 text-[11px] py-1.5 px-3">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
      
      <div class="flex items-center gap-2 font-mono">
        <span class="flex items-center gap-1.5 text-amber-400 font-bold">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{currentDate}</span> • <span>{currentTime}</span>
        </span>
        <span class="hidden md:inline text-slate-700">|</span>
        <span class="hidden md:inline text-slate-400">📍 ముత్తారం, పెద్దపల్లి జిల్లా, తెలంగాణ - 505187</span>
      </div>

      <div class="flex items-center gap-3 font-mono text-[10.5px]">
        <span>GSTIN: <strong class="text-amber-400 font-bold">36AMXPA2915K1ZR</strong></span>
        <span class="hidden sm:inline">CSC ID: <strong class="text-emerald-400 font-bold">514542450010</strong></span>
        <a href="tel:9949122402" class="text-white hover:text-amber-400 font-bold flex items-center gap-1 transition">
          <span>📞</span> <span>9949122402</span>
        </a>
      </div>

    </div>
  </div>

  <!-- 2. MAIN WHITE BRAND NAVBAR -->
  <header class="bg-white text-slate-900 sticky top-0 z-40 shadow-sm border-b-2 border-red-600">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
      
      <a href="/" class="flex items-center gap-3">
        <div class="w-11 h-11 bg-gradient-to-br from-red-600 via-rose-600 to-amber-500 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-md border border-white/20">
          ASV
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-black text-lg sm:text-xl tracking-tight text-slate-900 font-['Ramabhadra']">A.S.V. ENTERPRISES</span>
            <span class="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">NEWS</span>
          </div>
          <p class="text-[11px] text-slate-500 font-medium">మీసేవ • సివిల్ కాంట్రాక్టింగ్ • NS News నెట్‌వర్క్</p>
        </div>
      </a>

      <!-- Public Navigation Buttons -->
      <div class="flex items-center gap-2">
        <a href="/news" class="bg-red-600 hover:bg-red-700 text-white text-xs px-3.5 py-2 rounded-xl font-black transition shadow flex items-center gap-1.5">
          <span>📰</span> <span>తాజా వార్తలు</span>
        </a>

        <a href="/clips" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold border border-slate-200 transition hidden sm:flex items-center gap-1">
          <span>📸</span> <span>ఈ-పేపర్ క్లిప్స్</span>
        </a>

        <a href="/admin/login" class="bg-slate-900 hover:bg-black text-white text-xs px-3 py-2 rounded-xl font-bold transition shadow flex items-center gap-1">
          <span>🔒</span> <span>అడ్మిన్ లాగిన్</span>
        </a>
      </div>

    </div>
  </header>

  <!-- 3. UNIFIED RED LIVE NEWS TICKER (MATCHING /news 100%) -->
  <div class="bg-[#b91c1c] text-white flex items-center overflow-hidden py-1.5 px-3 shadow-md border-b border-red-800">
    <div class="bg-black text-white font-black text-xs px-2.5 py-1 rounded shrink-0 flex items-center gap-1.5 shadow mr-2 z-10">
      <span class="text-red-500 font-black text-sm leading-none">+</span>
      <span class="tracking-wide">లైవ్ న్యూస్</span>
    </div>

    <marquee 
      behavior="scroll" 
      direction="left" 
      scrollamount="6" 
      class="text-xs sm:text-[13px] font-bold tracking-wide"
    >
      {#if latestNews.length > 0}
        {#each latestNews as item}
          <a href="/news/{item.id}" class="hover:underline mx-4 text-white inline-flex items-center gap-1.5">
            <span class="text-yellow-300 font-black">[{item.location}]</span>
            <span class="text-white font-medium">{item.headline}</span>
          </a>
          <span class="text-yellow-400 font-bold mx-2">•</span>
        {/each}
      {:else}
        <span class="mx-4 text-white inline-flex items-center gap-1.5">
          <span class="text-yellow-300 font-black">[ముత్తారం]</span>
          <span>A.S.V. Enterprises & NS News: తాజా ముత్తారం మరియు తెలంగాణ వార్తల కోసం చూస్తూనే ఉండండి...</span>
        </span>
      {/if}
    </marquee>
  </div>

  <main class="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-10">

    <!-- 4. GRAND EXECUTIVE HERO SECTION -->
    <section class="relative bg-gradient-to-br from-white via-slate-50 to-amber-50/30 rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200 overflow-hidden">
      <div class="absolute -right-20 -top-20 w-80 h-80 bg-red-100/40 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-100/50 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 max-w-4xl space-y-4">
        <div class="inline-flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1 rounded-full text-xs font-bold shadow-sm">
          <span>🏛️</span>
          <span>ముత్తారం ప్రధాన డిజిటల్ సేవా కేంద్రం & సివిల్ కాంట్రాక్టింగ్</span>
        </div>

        <h1 class="text-2xl sm:text-4xl md:text-5xl font-black leading-tight text-slate-950 font-['Ramabhadra']">
          మీ డిజిటల్, మీసేవ & నిర్మాణ సేవల వేదిక <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-amber-600">
            అన్నీ ఒకే చోట — ముత్తారంలో!
          </span>
        </h1>

        <p class="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium max-w-2xl">
          తెలంగాణ ప్రభుత్వ సంక్షేమ పథకాలు, ఆధార్, ధరణి రెవెన్యూ పత్రాలు, IRCTC రైలు టికెట్లు, గ్రామ పంచాయతీ సివిల్ ఇంజనీరింగ్ పనులు మరియు <strong>NS News</strong> స్థానిక తాజా వార్తల అధికారిక కేంద్రం.
        </p>

        <!-- Official Registration Badges Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 font-mono text-[11px]">
          <div class="bg-white border border-slate-200 p-2.5 rounded-2xl text-center shadow-sm">
            <span class="text-[9px] text-slate-500 block font-sans">CSC CENTER ID</span>
            <strong class="text-emerald-700 text-xs sm:text-sm font-bold">514542450010</strong>
          </div>
          <div class="bg-white border border-slate-200 p-2.5 rounded-2xl text-center shadow-sm">
            <span class="text-[9px] text-slate-500 block font-sans">GSTIN (A.S.V.)</span>
            <strong class="text-amber-800 text-xs sm:text-sm font-bold">36AMXPA2915K1ZR</strong>
          </div>
          <div class="bg-white border border-slate-200 p-2.5 rounded-2xl text-center shadow-sm">
            <span class="text-[9px] text-slate-500 block font-sans">UDYAM MSME</span>
            <strong class="text-blue-700 text-xs sm:text-sm font-bold">UDYAM-TS-25-0025822</strong>
          </div>
          <div class="bg-white border border-slate-200 p-2.5 rounded-2xl text-center shadow-sm">
            <span class="text-[9px] text-slate-500 block font-sans">AUTHORIZATION</span>
            <strong class="text-rose-700 text-xs sm:text-sm font-bold">Govt Authorized</strong>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-3 pt-3">
          <a
            href="/news"
            class="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-black px-5 py-3 rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>📰</span> <span>NS న్యూస్ పోర్టల్</span>
          </a>

          <button
            type="button"
            on:click={() => openWhatsApp('నమస్తే A.S.V. Enterprises, నాకు మీసేవ / డిజిటల్ సేవల వివరాలు కావాలి.')}
            class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black px-5 py-3 rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>💬</span> <span>వాట్సాప్ సంప్రదింపు</span>
          </button>

          <a
            href="#civil-contracting"
            class="bg-slate-900 hover:bg-black text-amber-300 text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl shadow-md transition flex items-center gap-2"
          >
            <span>🏗️</span> <span>సివిల్ కాంట్రాక్టింగ్ పనులు</span>
          </a>
        </div>

      </div>
    </section>

    <!-- 5. CITIZEN & DIGITAL UTILITIES (8 ALL-IN-ONE SERVICE CARDS) -->
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 class="text-base sm:text-xl font-black text-slate-900 flex items-center gap-2 font-['Ramabhadra']">
            <span>🏛️</span> <span>CSC మీసేవ & ప్రజల సంక్షేమ సేవలు</span>
          </h2>
          <p class="text-xs text-slate-500">ముత్తారంలోని A.S.V. కేంద్రంలో అందుబాటులో ఉన్న ముఖ్యమైన ఆన్‌లైన్ సేవలు</p>
        </div>
        <span class="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-sm">
          అధికారిక CSC కేంద్రం
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each citizenServices as s}
          <div class="bg-white border-2 {s.borderColor} rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-3 group">
            <div>
              <div class="flex items-center justify-between mb-2.5">
                <span class="text-xl p-2.5 {s.iconBg} rounded-xl shadow-sm">{s.icon}</span>
                <span class="{s.badgeColor} border text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {s.badge}
                </span>
              </div>
              <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra'] group-hover:text-red-600 transition">
                {s.title}
              </h3>
              <p class="text-xs text-slate-600 leading-relaxed font-medium mt-1.5">
                {s.desc}
              </p>
            </div>

            <button
              type="button"
              on:click={() => openWhatsApp(s.whatsappMsg)}
              class="w-full bg-slate-900 hover:bg-red-600 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95"
            >
              <span>వివరాలు & అప్లై చేయండి ➔</span>
            </button>
          </div>
        {/each}
      </div>
    </section>

    <!-- 6. COMPLETELY RECONSTRUCTED: CIVIL CONTRACTING & ENGINEERING SHOWCASE -->
    <section id="civil-contracting" class="space-y-4">
      <div class="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white rounded-3xl p-6 sm:p-9 shadow-xl border border-slate-800 space-y-6">
        
        <!-- Header & Badges -->
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-5">
          <div class="space-y-1.5 max-w-2xl">
            <div class="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-full text-xs font-bold">
              <span>🏗️</span> <span>A.S.V. ENTERPRISES — సివిల్ కాంట్రాక్టర్ & జనరల్ సప్లయర్స్</span>
            </div>
            <h2 class="text-xl sm:text-3xl font-black text-white font-['Ramabhadra']">
              ప్రభుత్వ & పంచాయతీ సివిల్ ఇంజనీరింగ్ పనులు
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              ముత్తారం మరియు పెద్దపల్లి పరిసర ప్రాంతాల్లో నాణ్యతా ప్రమాణాలతో కూడిన ప్రాకార గోడలు, సీసీ రోడ్లు, డ్రైనేజీ నిర్మాణాలు & రా మెటీరియల్ సప్లై.
            </p>
          </div>

          <div class="flex flex-col sm:items-end gap-2 text-xs font-mono">
            <span class="bg-black/60 border border-slate-700 px-3 py-1.5 rounded-xl text-amber-400 font-bold">
              GSTIN: 36AMXPA2915K1ZR
            </span>
            <span class="text-slate-400">అధికారిక క్లాస్ కాంట్రాక్టర్ • ఆడిట్ రెడీ</span>
          </div>
        </div>

        <!-- 4 Disciplines Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {#each contractingWorks as work}
            <div class="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 space-y-2 hover:border-amber-400/60 transition shadow-inner flex flex-col justify-between">
              <div>
                <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl mb-2">
                  {work.icon}
                </div>
                <h3 class="font-black text-sm text-white font-['Ramabhadra']">{work.title}</h3>
                <span class="text-[10px] text-amber-400 font-mono block mb-1">{work.subtitle}</span>
                <p class="text-xs text-slate-300 leading-relaxed font-normal">
                  {work.desc}
                </p>
              </div>
            </div>
          {/each}
        </div>

        <!-- Consultation Action Strip -->
        <div class="bg-black/40 border border-slate-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-0.5">
            <h4 class="font-bold text-sm text-white">నిర్మాణ అంచనాలు, కొలతలు & క్వోటేషన్ కోసం సంప్రదించండి</h4>
            <p class="text-xs text-slate-400">గ్రామ పంచాయతీ అభివృద్ధి పనుల ప్రాజెక్ట్ సంప్రదింపులు తక్షణమే అందించబడును.</p>
          </div>

          <div class="flex items-center gap-2.5">
            <button
              type="button"
              on:click={() => openWhatsApp('నమస్తే A.S.V. Enterprises, నాకు సివిల్ కాంట్రాక్ట్ & నిర్మాణ సేవల అంచనా వివరాలు కావాలి.')}
              class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>💬</span> <span>వాట్సాప్ కొటేషన్</span>
            </button>
            <a
              href="tel:9949122402"
              class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-black px-4 py-2.5 rounded-xl transition shadow flex items-center gap-1.5"
            >
              <span>📞</span> <span>డైరెక్ట్ కాల్</span>
            </a>
          </div>
        </div>

      </div>
    </section>

    <!-- 7. NS NEWS PORTAL PULSE -->
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 class="text-base sm:text-xl font-black text-slate-900 flex items-center gap-2 font-['Ramabhadra']">
            <span>📰</span> <span>NS News — తాజా ముత్తారం & తెలంగాణ వార్తలు</span>
          </h2>
          <p class="text-xs text-slate-500">క్షేత్రస్థాయి నుండి నిజమైన నివేదికలు, స్థానిక వార్తలు</p>
        </div>

        <a href="/news" class="text-xs font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3.5 py-1.5 rounded-xl border border-red-200 transition">
          అన్ని వార్తలు చూడండి ➔
        </a>
      </div>

      {#if loadingNews}
        <div class="py-12 text-center text-xs font-bold text-slate-400">వార్తలు లోడ్ అవుతున్నాయి...</div>
      {:else if latestNews.length === 0}
        <div class="py-10 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
          తాజా వార్తలు త్వరలో అప్‌డేట్ అవుతాయి. <br />
          <a href="/news" class="text-red-600 font-bold underline mt-1.5 inline-block">న్యూస్ పోర్టల్ ఓపెన్ చేయండి</a>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each latestNews as art}
            <article class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                {#if art.image_url}
                  <div class="h-44 w-full bg-slate-100 overflow-hidden relative">
                    <img src={art.image_url} alt={art.headline} class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    <span class="absolute top-2 left-2 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow">
                      {art.location}
                    </span>
                  </div>
                {/if}

                <div class="p-4 space-y-2">
                  <span class="text-[10px] font-bold text-slate-400 uppercase font-mono">
                    {art.created_at ? new Date(art.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'తాజా వార్త'}
                  </span>
                  <h3 class="font-black text-sm text-slate-900 leading-snug line-clamp-2 font-['Ramabhadra'] group-hover:text-red-600 transition">
                    {art.headline}
                  </h3>
                </div>
              </div>

              <div class="p-4 pt-0">
                <a
                  href="/news/{art.id}"
                  class="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold py-2 rounded-xl text-center block transition"
                >
                  పూర్తి వార్త చదవండి ➔
                </a>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>

    <!-- 8. E-PAPER CLIPPINGS HIGHLIGHT -->
    {#if paperClips.length > 0}
      <section class="space-y-4">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 font-['Ramabhadra']">
              <span>📸</span> <span>తాజా ఈ-పేపర్ క్లిప్పింగ్స్ (Press Clips)</span>
            </h2>
            <p class="text-xs text-slate-500">ప్రధాన దినపత్రికలలో ప్రచురితమైన ప్రత్యేక ముఖ్యాంశాలు</p>
          </div>
          <a href="/clips" class="text-xs font-bold text-red-600 hover:underline">మరిన్ని క్లిప్స్ ➔</a>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {#each paperClips as clip}
            <button
              type="button"
              on:click={() => activeClipModal = clip.image_url}
              class="bg-white p-2.5 rounded-2xl border border-slate-200 hover:border-red-400 transition text-left cursor-pointer group shadow-sm"
            >
              <div class="h-44 w-full bg-slate-100 rounded-xl overflow-hidden mb-2">
                <img src={clip.image_url} alt="Clip" class="w-full h-full object-cover group-hover:scale-105 transition" />
              </div>
              <p class="text-[11px] font-bold text-slate-800 line-clamp-2">
                {clip.headline || 'పేపర్ క్లిప్'}
              </p>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    <!-- 9. CONTACT & CENTER FOOTER (WHITE CARD) -->
    <footer class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-9 shadow-sm space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        <div class="md:col-span-8 space-y-2.5">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-base shadow">ASV</span>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 font-['Ramabhadra']">A.S.V. ENTERPRISES — మీ విశ్వసనీయ సేవా కేంద్రం</h3>
              <p class="text-[11px] text-slate-600 font-mono">GSTIN: 36AMXPA2915K1ZR • CSC ID: 514542450010</p>
            </div>
          </div>
          
          <p class="text-xs text-slate-600 leading-relaxed">
            📍 <strong>చిరునామా:</strong> గ్రామ పంచాయతీ కార్యాలయం & వాటర్ ప్లాంట్ సమీపంలో, ముత్తారం గ్రామం, పెద్దపల్లి జిల్లా, తెలంగాణ - 505187.
          </p>
          <p class="text-xs text-slate-600">
            ⏰ <strong>పనివేళలు:</strong> ఉదయం 8:00 AM నుండి రాత్రి 9:00 PM వరకు (అన్ని రోజులలో తెరిచి ఉంటుంది).
          </p>
        </div>

        <div class="md:col-span-4 flex flex-col gap-2.5">
          <a
            href="tel:9949122402"
            class="w-full bg-slate-900 hover:bg-black text-white text-xs font-bold py-3 px-4 rounded-2xl shadow flex items-center justify-center gap-2 transition"
          >
            <span>📞</span> <span>కాల్ చేయండి: 9949122402</span>
          </a>

          <button
            type="button"
            on:click={() => openWhatsApp('నమస్తే A.S.V. Enterprises, నాకు మీసేవ కేంద్రం / కాంట్రాక్టింగ్ సేవల వివరాలు కావాలి.')}
            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded-2xl shadow flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>💬</span> <span>వాట్సాప్ మెసేజ్ చేయండి</span>
          </button>
        </div>

      </div>

      <div class="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium gap-2">
        <p>© 2026 A.S.V. Enterprises & NS News Network. All rights reserved.</p>
        <div class="flex items-center gap-3">
          <a href="/news" class="hover:underline">వార్తలు</a>
          <span>•</span>
          <a href="/clips" class="hover:underline">ఈ-పేపర్</a>
          <span>•</span>
          <a href="/admin/login" class="hover:underline font-bold text-slate-700">అధికారిక లాగిన్</a>
        </div>
      </div>
    </footer>

  </main>

  <!-- 10. MOBILE FLOATING ACTION BAR -->
  <div class="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 z-50 flex items-center justify-around gap-2 shadow-2xl">
    <a
      href="tel:9949122402"
      class="flex-1 bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1 shadow"
    >
      <span>📞 కాల్</span>
    </a>
    <button
      type="button"
      on:click={() => openWhatsApp('నమస్తే A.S.V. Enterprises, నాకు సేవల సమాచారం కావాలి.')}
      class="flex-1 bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1 shadow cursor-pointer"
    >
      <span>💬 వాట్సాప్</span>
    </button>
    <a
      href="/news"
      class="flex-1 bg-red-600 text-white text-xs font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1 shadow"
    >
      <span>📰 న్యూస్</span>
    </a>
  </div>

  <!-- Clip Zoom Modal -->
  {#if activeClipModal}
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-xl w-full p-2 relative shadow-2xl">
        <button
          type="button"
          on:click={() => activeClipModal = null}
          class="absolute top-3 right-3 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold"
        >
          ✕
        </button>
        <img src={activeClipModal} alt="Enlarged Clip" class="w-full max-h-[80vh] object-contain rounded-xl" />
      </div>
    </div>
  {/if}

</div>