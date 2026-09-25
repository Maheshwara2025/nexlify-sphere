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

  // Services Catalog with Direct WhatsApp Query
  const citizenServices = [
    {
      id: 'aadhaar',
      title: 'ఆధార్ సేవలు',
      icon: '🆔',
      tag: 'ఆధార్',
      color: 'border-blue-500 bg-blue-50/50 text-blue-900',
      badgeColor: 'bg-blue-600 text-white',
      desc: 'డౌన్‌లోడ్, PVC కార్డ్ ఆర్డర్ & బయోమెట్రిక్ అడ్రస్ ప్రింట్లు.',
      whatsappMsg: 'నమస్తే A.S.V. Enterprises, నాకు ఆధార్ సర్వీస్ వివరాలు కావాలి.'
    },
    {
      id: 'dharani',
      title: 'ధరణి & భూభారతి',
      icon: '🌾',
      tag: 'రెవెన్యూ',
      color: 'border-emerald-500 bg-emerald-50/50 text-emerald-900',
      badgeColor: 'bg-emerald-600 text-white',
      desc: 'పట్టాదారు పాస్ పుస్తకం, EC, 1B, ROR-1B, స్లాట్ బుకింగ్ & ల్యాండ్ మ్యాప్స్.',
      whatsappMsg: 'నమస్తే, నాకు ధరణి / భూభారతి పత్రాల సర్వీస్ కావాలి.'
    },
    {
      id: 'schemes',
      title: 'ప్రభుత్వ పథకాలు',
      icon: '🏛️',
      tag: 'సంక్షేమం',
      color: 'border-amber-500 bg-amber-50/50 text-amber-900',
      badgeColor: 'bg-amber-600 text-white',
      desc: 'రైతు భరోసా, ఇందిరమ్మ ఇండ్లు, కొత్త పింఛన్లు, గృహజ్యోతి దరఖాస్తులు.',
      whatsappMsg: 'నమస్తే, నాకు ప్రభుత్వ సంక్షేమ పథకాల దరఖాస్తు సహాయం కావాలి.'
    },
    {
      id: 'irctc',
      title: 'IRCTC రైలు & బస్సు టికెట్లు',
      icon: '🚆',
      tag: 'IRCTC',
      color: 'border-orange-500 bg-orange-50/50 text-orange-900',
      badgeColor: 'bg-orange-600 text-white',
      desc: 'అధికారిక రైలు బుకింగ్, తత్కాల్, ఫ్లైట్ & ఆర్టీసీ బస్సు రిజర్వేషన్లు.',
      whatsappMsg: 'నమస్తే, నాకు రైలు / బస్సు టికెట్ బుకింగ్ కావాలి.'
    },
    {
      id: 'ration',
      title: 'రేషన్ కార్డ్ సేవలు',
      icon: '🍚',
      tag: 'సివిల్ సప్లైస్',
      color: 'border-rose-500 bg-rose-50/50 text-rose-900',
      badgeColor: 'bg-rose-600 text-white',
      desc: 'కొత్త స్మార్ట్ రేషన్ కార్డులు, సభ్యుల చేరిక/తొలగింపు & ఆన్‌లైన్ కాపీలు.',
      whatsappMsg: 'నమస్తే, నాకు రేషన్ కార్డ్ సర్వీస్ వివరాలు కావాలి.'
    },
    {
      id: 'bills',
      title: 'విద్యుత్ & బిల్లు చెల్లింపులు',
      icon: '⚡',
      tag: 'BBPS',
      color: 'border-cyan-500 bg-cyan-50/50 text-cyan-900',
      badgeColor: 'bg-cyan-600 text-white',
      desc: 'కరెంట్ బిల్లులు, గ్రామ పంచాయతీ పన్నులు, నీటి బిల్లులు & మొబైల్ రీఛార్జి.',
      whatsappMsg: 'నమస్తే, నేను బిల్లు చెల్లింపులు చేయాలనుకుంటున్నాను.'
    },
    {
      id: 'pan_insurance',
      title: 'పాన్ కార్డ్ & ఇన్సూరెన్స్',
      icon: '📋',
      tag: 'ఇన్సూరెన్స్',
      color: 'border-purple-500 bg-purple-50/50 text-purple-900',
      badgeColor: 'bg-purple-600 text-white',
      desc: 'తక్షణ ఈ-పాన్, కొత్త పాన్ కార్డులు, బైక్/కార్ ఇన్సూరెన్స్ పాలసీలు.',
      whatsappMsg: 'నమస్తే, నాకు పాన్ కార్డ్ / వెహికల్ ఇన్సూరెన్స్ వివరాలు కావాలి.'
    },
    {
      id: 'printing',
      title: 'కలర్ జిరాక్స్ & ప్రింటింగ్',
      icon: '🖨️',
      tag: 'ప్రింటింగ్ HQ',
      color: 'border-slate-500 bg-slate-50/50 text-slate-900',
      badgeColor: 'bg-slate-800 text-white',
      desc: 'హై-క్వాలిటీ కలర్ ప్రింట్లు, లామినేషన్, పాస్‌పోర్ట్ సైజ్ ఫోటోలు & డాక్యుమెంట్ స్కానింగ్.',
      whatsappMsg: 'నమస్తే, నాకు డాక్యుమెంట్ ప్రింటింగ్ / జిరాక్స్ సేవలు కావాలి.'
    }
  ];

  onMount(async () => {
    updateClock();
    const interval = setInterval(updateClock, 1000);
    await loadHomeData();
    return () => clearInterval(interval);
  });

  function updateClock() {
    const now = new Date();
    currentTime = now.toLocaleTimeString('te-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    currentDate = now.toLocaleDateString('te-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  }

  async function loadHomeData() {
    loadingNews = true;
    try {
      // 1. Fetch Latest News Articles
      let { data: newsData } = await supabase
        .from('news_articles')
        .select('id, headline, title, category, location_town, image_url, created_at')
        .order('id', { ascending: false })
        .limit(6);

      if (!newsData || newsData.length === 0) {
        const res = await supabase.from('news').select('id, title, headline, category, location_town, image_url, created_at').order('id', { ascending: false }).limit(6);
        newsData = res.data;
      }
      latestNews = newsData || [];

      // 2. Fetch Latest Newspaper Clips
      const { data: clipsData } = await supabase
        .from('news_articles')
        .select('id, headline, title, image_url, created_at')
        .not('image_url', 'is', null)
        .order('id', { ascending: false })
        .limit(4);

      paperClips = clipsData || [];
    } catch (e) {
      console.error('Home load error:', e);
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
  <title>A.S.V. ENTERPRISES & NS NEWS | ముత్తారం డిజిటల్ సేవా కేంద్రం & న్యూస్ పోర్టల్</title>
  <meta name="description" content="ముత్తారంలో విశ్వసనీయ మీసేవ, ఆధార్, ధరణి, ఆన్‌లైన్ ప్రభుత్వ సేవలు మరియు NS News తాజా వార్తా వేదిక." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Ramabhadra&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">
  
  <!-- 1. TOP STATUTORY & CLOCK STRIP -->
  <div class="bg-[#090d16] text-white border-b border-slate-800 text-[11px] py-1.5 px-3">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-3 text-slate-300 font-mono">
        <span class="flex items-center gap-1.5 text-amber-400 font-bold">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{currentDate}</span> • <span>{currentTime}</span>
        </span>
        <span class="hidden md:inline text-slate-600">|</span>
        <span class="hidden md:inline">📍 ముత్తారం, పెద్దపల్లి జిల్లా, తెలంగాణ</span>
      </div>

      <div class="flex items-center gap-3 font-mono text-[10px]">
        <span class="text-slate-400">GSTIN: <strong class="text-amber-400">36AMXPA2915K1ZR</strong></span>
        <span class="hidden sm:inline text-slate-400">CSC ID: <strong class="text-emerald-400">514542450010</strong></span>
        <a href="tel:9949122402" class="text-white hover:text-amber-400 font-bold flex items-center gap-1 transition">
          <span>📞</span> <span>9949122402</span>
        </a>
      </div>
    </div>
  </div>

  <!-- 2. MAIN EXECUTIVE NAVBAR -->
  <header class="bg-[#0f172a] text-white sticky top-0 z-40 shadow-xl border-b-2 border-red-600">
    <div class="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
      
      <!-- Brand Logos -->
      <a href="/" class="flex items-center gap-2.5">
        <div class="w-10 h-10 bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md border border-white/20">
          NS
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-black text-base sm:text-lg tracking-wide text-white font-['Ramabhadra']">A.S.V. ENTERPRISES</span>
            <span class="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">NEWS</span>
          </div>
          <p class="text-[10px] text-slate-400 font-medium">మీ సేవా • డిజిటల్ సర్వీసెస్ • NS News నెట్‌వర్క్</p>
        </div>
      </a>

      <!-- Navigation Actions -->
      <div class="flex items-center gap-2">
        <a href="/news" class="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-xl font-black transition shadow flex items-center gap-1">
          <span>📰</span> <span class="hidden sm:inline">వార్తలు</span>
        </a>
        <a href="/clips" class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl font-bold border border-slate-700 transition">
          <span>📸</span> <span class="hidden sm:inline">ఈ-పేపర్ క్లిప్స్</span>
        </a>
        <a href="/admin/contractor" class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs px-3 py-1.5 rounded-xl font-black transition shadow flex items-center gap-1">
          <span>🏗️</span> <span class="hidden md:inline">కాంట్రాక్టర్ 360°</span>
        </a>
        <a href="/admin/login" class="bg-slate-900 hover:bg-black text-slate-400 hover:text-white text-xs px-2.5 py-1.5 rounded-xl font-bold border border-slate-800 transition">
          🔒 లాగిన్
        </a>
      </div>

    </div>
  </header>

  <!-- 3. LIVE BREAKING NEWS RUNNING TICKER -->
  <div class="bg-slate-950 border-b border-red-600 text-white flex items-center overflow-hidden py-1.5 px-3 shadow-inner">
    <div class="bg-red-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-md shrink-0 flex items-center gap-1.5 shadow mr-2">
      <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
      <span>తాజా వార్తలు</span>
    </div>

    <marquee 
      behavior="scroll" 
      direction="left" 
      scrollamount="6" 
      onmouseover="this.stop();" 
      onmouseout="this.start();" 
      class="text-xs sm:text-[13px] font-bold tracking-wide"
    >
      {#if latestNews.length > 0}
        {#each latestNews as item}
          <a href="/news/{item.id}" class="hover:underline mx-4 text-slate-100 hover:text-amber-300">
            🔴 {item.headline || item.title}
          </a>
          <span class="text-amber-400 mx-2">•</span>
        {/each}
      {:else}
        <span class="mx-4 text-slate-300">🔴 A.S.V. Enterprises & NS News: ముత్తారం మరియు తెలంగాణ వార్తల కోసం పోర్టల్‌ను చూస్తూనే ఉండండి...</span>
      {/if}
    </marquee>
  </div>

  <main class="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-7">

    <!-- 4. HERO SHOWCASE BANNER -->
    <section class="relative bg-gradient-to-br from-[#0b1120] via-[#111827] to-[#1e1b4b] text-white rounded-3xl p-6 sm:p-9 shadow-2xl border border-slate-800 overflow-hidden">
      <!-- Glow Gradients -->
      <div class="absolute -right-20 -top-20 w-72 h-72 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -left-20 -bottom-20 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 max-w-3xl space-y-4">
        
        <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-xs text-amber-300 font-bold">
          <span>⭐</span>
          <span>గ్రామ పంచాయతీ కార్యాలయం పక్కన, ముత్తారం</span>
        </div>

        <h1 class="text-2xl sm:text-4xl font-black leading-tight tracking-tight font-['Ramabhadra']">
          మీ డిజిటల్ & ప్రభుత్వ సేవల అవసరాలు <br class="hidden sm:inline" />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
            అన్నీ ఒకే చోట — ముత్తారంలో!
          </span>
        </h1>

        <p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
          తెలంగాణ ప్రభుత్వ సంక్షేమ పథకాలు, ఆధార్ సేవలు, ధరణి భూభారతి పత్రాలు, IRCTC రైలు టికెట్లు మరియు స్థానిక తాజా వార్తల విశ్వసనీయ డిజిటల్ వేదిక.
        </p>

        <!-- Trust Badges -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
          <div class="bg-black/40 border border-slate-700/80 p-2 rounded-xl text-center">
            <span class="text-[9px] text-slate-400 block font-sans">CSC ID</span>
            <strong class="text-amber-400">514542450010</strong>
          </div>
          <div class="bg-black/40 border border-slate-700/80 p-2 rounded-xl text-center">
            <span class="text-[9px] text-slate-400 block font-sans">GSTIN</span>
            <strong class="text-emerald-400">36AMXPA2915K1ZR</strong>
          </div>
          <div class="bg-black/40 border border-slate-700/80 p-2 rounded-xl text-center">
            <span class="text-[9px] text-slate-400 block font-sans">UDYAM REG</span>
            <strong class="text-cyan-400">UDYAM-TS-25-0025822</strong>
          </div>
          <div class="bg-black/40 border border-slate-700/80 p-2 rounded-xl text-center">
            <span class="text-[9px] text-slate-400 block font-sans">AGENT STATUS</span>
            <strong class="text-rose-400">Authorized Agent</strong>
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <a
            href="/news"
            class="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-black px-5 py-3 rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>📰</span>
            <span>NS న్యూస్ పోర్టల్ ఓపెన్ చేయండి</span>
          </a>

          <button
            type="button"
            on:click={() => openWhatsApp('నమస్తే A.S.V. Enterprises, నాకు డిజిటల్ సేవల వివరాలు కావాలి.')}
            class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black px-5 py-3 rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>💬</span>
            <span>వాట్సాప్ సంప్రదింపు</span>
          </button>

          <a
            href="/admin/card-maker"
            class="bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl border border-slate-700 transition flex items-center gap-2"
          >
            <span>🎨</span>
            <span>కార్డ్ స్టూడియో</span>
          </a>
        </div>

      </div>
    </section>

    <!-- 5. CITIZEN & DIGITAL UTILITIES (8 SERVICE CARDS) -->
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 font-['Ramabhadra']">
            <span>🏛️</span>
            <span>ప్రజల సేవలు & ప్రభుత్వ సంక్షేమ పథకాలు</span>
          </h2>
          <p class="text-xs text-slate-500">ముత్తారంలోని మా కేంద్రంలో అందుబాటులో ఉన్న ముఖ్యమైన ఆన్‌లైన్ సేవలు</p>
        </div>
        <span class="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-sm">
          A.S.V. అధికారిక సేవలు
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {#each citizenServices as s}
          <div class="bg-white border-2 {s.color} rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-2xl p-2 bg-white rounded-xl shadow-sm border border-slate-100">{s.icon}</span>
                <span class="{s.badgeColor} text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {s.tag}
                </span>
              </div>
              <h3 class="font-black text-sm text-slate-900 font-['Ramabhadra']">{s.title}</h3>
              <p class="text-[11.5px] text-slate-600 leading-relaxed font-medium mt-1">
                {s.desc}
              </p>
            </div>

            <button
              type="button"
              on:click={() => openWhatsApp(s.whatsappMsg)}
              class="w-full bg-slate-900 hover:bg-black text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95"
            >
              <span>వివరాలు & అప్లై ➔</span>
            </button>
          </div>
        {/each}
      </div>
    </section>

    <!-- 6. LIVE NS NEWS PULSE SECTION (FROM SUPABASE) -->
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 font-['Ramabhadra']">
            <span>📰</span>
            <span>NS News — తాజా ముత్తారం & తెలంగాణ వార్తలు</span>
          </h2>
          <p class="text-xs text-slate-500">క్షేత్రస్థాయి నుండి నిజమైన వార్తలు, పంచాయతీ అప్‌డేట్స్</p>
        </div>

        <a href="/news" class="text-xs font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition">
          అన్ని వార్తలు చూడండి ➔
        </a>
      </div>

      {#if loadingNews}
        <div class="py-12 text-center text-xs font-bold text-slate-400">వార్తలు లోడ్ అవుతున్నాయి...</div>
      {:else if latestNews.length === 0}
        <div class="py-10 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
          ప్రస్తుతం వార్తలు లోడ్ కావడం లేదు. <br />
          <a href="/news" class="text-red-600 font-bold underline mt-1 inline-block">న్యూస్ డెస్క్ ఓపెన్ చేయండి</a>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each latestNews as art}
            <article class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                {#if art.image_url}
                  <div class="h-44 w-full bg-slate-100 overflow-hidden relative">
                    <img src={art.image_url} alt={art.headline || 'News'} class="w-full h-full object-cover hover:scale-105 transition duration-300" />
                    <span class="absolute top-2 left-2 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow">
                      {art.location_town || 'ముత్తారం'}
                    </span>
                  </div>
                {/if}

                <div class="p-4 space-y-2">
                  <span class="text-[10px] font-bold text-slate-400 uppercase">
                    {art.created_at ? new Date(art.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'తాజా వార్త'}
                  </span>
                  <h3 class="font-black text-sm text-slate-900 leading-snug line-clamp-2 font-['Ramabhadra']">
                    {art.headline || art.title}
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

    <!-- 7. E-PAPER CLIPPINGS HIGHLIGHT -->
    {#if paperClips.length > 0}
      <section class="space-y-4">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h2 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 font-['Ramabhadra']">
              <span>📸</span>
              <span>తాజా ఈ-పేపర్ క్లిప్పింగ్స్ (Press Clips)</span>
            </h2>
            <p class="text-xs text-slate-500">దినపత్రికలలో ప్రచురితమైన ప్రత్యేక ముఖ్యాంశాలు</p>
          </div>
          <a href="/clips" class="text-xs font-bold text-slate-600 hover:text-black">మరిన్ని క్లిప్స్ ➔</a>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {#each paperClips as clip}
            <button
              type="button"
              on:click={() => activeClipModal = clip.image_url}
              class="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm hover:border-red-400 transition text-left cursor-pointer group"
            >
              <div class="h-44 w-full bg-slate-100 rounded-xl overflow-hidden mb-2">
                <img src={clip.image_url} alt="Clip" class="w-full h-full object-cover group-hover:scale-105 transition" />
              </div>
              <p class="text-[11px] font-bold text-slate-800 line-clamp-2">
                {clip.headline || clip.title || 'పేపర్ క్లిప్'}
              </p>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    <!-- 8. CONTRACTOR 360 & A.S.V. CIVIL PROFILE -->
    <section class="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-wrap items-center justify-between gap-4">
      <div class="max-w-2xl space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🏗️</span>
          <h2 class="text-lg sm:text-xl font-black font-['Ramabhadra']">A.S.V. ENTERPRISES — సివిల్ కాంట్రాక్టింగ్ & సప్లైస్</h2>
        </div>
        <p class="text-xs sm:text-sm font-bold text-amber-950 leading-relaxed">
          గ్రామ పంచాయతీ ప్రహరీ నిర్మాణాలు, సీసీ రోడ్లు, డ్రైనేజీలు, ప్రభుత్వ ఇంజనీరింగ్ పనులు & రా మెటీరియల్ సప్లై.
        </p>
        <p class="text-[11px] font-mono font-bold text-amber-950">GSTIN: 36AMXPA2915K1ZR • అధీకృత కాంట్రాక్టర్</p>
      </div>

      <div class="flex items-center gap-2">
        <a
          href="/admin/contractor"
          class="bg-slate-950 hover:bg-black text-amber-300 text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl shadow transition"
        >
          కాంట్రాక్టర్ ERP సూట్ ➔
        </a>
      </div>
    </section>

    <!-- 9. CONTACT & CENTER INFORMATION -->
    <footer class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        <div class="md:col-span-8 space-y-2">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-sm">ASV</span>
            <h3 class="text-base font-black text-slate-900 font-['Ramabhadra']">A.S.V. ENTERPRISES — మీ విశ్వసనీయ సేవా కేంద్రం</h3>
          </div>
          
          <p class="text-xs text-slate-600 leading-relaxed">
            📍 <strong>చిరునామా:</strong> గ్రామ పంచాయతీ కార్యాలయం & వాటర్ ప్లాంట్ సమీపంలో, ముత్తారం గ్రామం, పెద్దపల్లి జిల్లా, తెలంగాణ - 505187.
          </p>
          <p class="text-xs text-slate-600">
            ⏰ <strong>పనివేళలు:</strong> ఉదయం 8:00 AM నుండి రాత్రి 9:00 PM వరకు (అన్ని రోజులలో తెరిచి ఉంటుంది).
          </p>
        </div>

        <div class="md:col-span-4 flex flex-col gap-2">
          <a
            href="tel:9949122402"
            class="w-full bg-slate-900 hover:bg-black text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow flex items-center justify-center gap-2 transition"
          >
            <span>📞</span> <span>కాల్ చేయండి: 9949122402</span>
          </a>

          <button
            type="button"
            on:click={() => openWhatsApp('నమస్తే, నాకు మీసేవ కేంద్రం సేవలు కావాలి.')}
            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>💬</span> <span>వాట్సాప్ మెసేజ్ చేయండి</span>
          </button>
        </div>

      </div>

      <div class="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium gap-2">
        <p>© 2026 A.S.V. Enterprises & NS News Network. All rights reserved.</p>
        <div class="flex items-center gap-3">
          <a href="/admin/login" class="hover:underline">అడ్మిన్ డెస్క్</a>
          <span>•</span>
          <a href="/news" class="hover:underline">వార్తలు</a>
          <span>•</span>
          <a href="/admin/contractor" class="hover:underline">కాంట్రాక్టర్</a>
        </div>
      </div>
    </footer>

  </main>

  <!-- 10. MOBILE FLOATING ACTION BAR (STICKY BOTTOM) -->
  <div class="sm:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a] border-t border-slate-800 p-2 z-50 flex items-center justify-around gap-2 shadow-2xl">
    <a
      href="tel:9949122402"
      class="flex-1 bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1 shadow"
    >
      <span>📞 కాల్</span>
    </a>
    <button
      type="button"
      on:click={() => openWhatsApp('నమస్తే A.S.V. Enterprises, నాకు సర్వీస్ సమాచారం కావాలి.')}
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