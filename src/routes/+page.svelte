<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  let recentClips = [];

async function getRecentClips() {
  const { data } = await supabase
    .from('paper_clips')
    .select('*')
    .order('clip_date', { ascending: false })
    .limit(6);
  if (data) recentClips = data;
}

getRecentClips();

  let recentNews = [];
  let tickerNews = [];
  let loadingNews = true;

  // సర్వీస్ ఎంక్వైరీ ఫారమ్ స్టేట్
  let applicantName = '';
  let applicantMobile = '';
  let selectedService = 'ఇందిరమ్మ కుట్టు మిషన్ దరఖాస్తు';
  let applicantNotes = '';

  const citizenServices = [
    {
      title: 'ఇందిరమ్మ కుట్టు మిషన్',
      badge: 'తాజా దరఖాస్తులు',
      icon: 'fa-scissors',
      color: 'from-pink-500 to-rose-600',
      docs: ['ఆధార్ కార్డు', 'రేషన్ కార్డు', 'కుల, ఆదాయ పత్రాలు', 'ఫోటో'],
      desc: 'మహిళా స్వయం ఉపాధి పథకం కింద ఉచిత కుట్టు మిషన్ ఆన్‌లైన్ దరఖాస్తు.'
    },
    {
      title: 'ఆధార్ & బ్యాంకింగ్ (AEPS)',
      badge: 'తక్షణ సేవ',
      icon: 'fa-fingerprint',
      color: 'from-blue-600 to-indigo-700',
      docs: ['ఆధార్ నంబర్', 'బ్యాంక్ అకౌంట్', 'మొబైల్ లింక్'],
      desc: 'బయోమెట్రిక్ నగదు విత్‌డ్రా, PVC ఆధార్ కార్డు ప్రింటింగ్, అడ్రస్ మార్పు.'
    },
    {
      title: 'ధరణి / భూభారతి & మీసేవ',
      badge: 'రెవెన్యూ సేవలు',
      icon: 'fa-file-shield',
      color: 'from-emerald-600 to-teal-700',
      docs: ['పట్టాదారు పాస్‌బుక్', 'సర్వే నంబర్', 'ఆధార్'],
      desc: 'ROR 1-B, పహాణీ నకలు, ఈసీ (EC), కుల, ఆదాయ ధ్రువీకరణ పత్రాలు.'
    },
    {
      title: 'రైతు భరోసా & PM-కిసాన్',
      badge: 'రైతు సేవలు',
      icon: 'fa-seedling',
      color: 'from-lime-600 to-green-700',
      docs: ['ఆధార్ లింక్ ఫోన్', 'బ్యాంక్ పాస్‌బుక్', 'భూమి వివరాలు'],
      desc: 'e-KYC బయోమెట్రిక్ వెరిఫికేషన్, ఇన్విటేషన్ స్టేటస్, కొత్త రైతుల నమోదు.'
    },
    {
      title: 'IRCTC రైలు & బస్సు టికెట్లు',
      badge: 'అధీకృత ఏజెంట్',
      icon: 'fa-train-subway',
      color: 'from-orange-500 to-amber-600',
      docs: ['ప్రయాణీకుల పేర్లు', 'తేదీ & గమ్యస్థానం', 'ఫోన్ నంబర్'],
      desc: 'జనరల్, తత్కాల్ రైలు టికెట్లు మరియు TSRTC బస్సు సీట్ల రిజర్వేషన్.'
    },
    {
      title: 'జిరాక్స్, కలర్ ప్రింటింగ్ & పాన్',
      badge: '5 నిమిషాల్లో',
      icon: 'fa-print',
      color: 'from-purple-600 to-violet-700',
      docs: ['వాట్సాప్ / ఈమెయిల్ డాక్యుమెంట్ (PDF/Image)'],
      desc: 'హై-స్పీడ్ ప్రింట్లు, లామినేషన్, పాస్‌పోర్ట్ సైజ్ ఫోటోలు & కొత్త పాన్ కార్డు.'
    }
  ];

  onMount(async () => {
    try {
      // తాజా వార్తలను సుపాబేస్ నుండి లోడ్ చేయడం
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      if (data) {
        recentNews = data;
        tickerNews = data.filter(item => item.show_in_ticker || item.alert_type === 'breaking' || item.alert_type === 'flash');
        if (tickerNews.length === 0) tickerNews = data.slice(0, 3);
      }
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      loadingNews = false;
    }
  });

  function sendWhatsAppEnquiry() {
    if (!applicantName.trim() || !applicantMobile.trim()) {
      alert('దయచేసి మీ పేరు మరియు మొబైల్ నంబర్ నమోదు చేయండి.');
      return;
    }
    const msg = `*A.S.V. Enterprises డిజిటల్ సేవా కేంద్రం దరఖాస్తు వినతి*\n\n` +
      `👤 *పేరు:* ${applicantName.trim()}\n` +
      `📱 *ఫోన్:* ${applicantMobile.trim()}\n` +
      `💼 *కావాల్సిన సేవ:* ${selectedService}\n` +
      `📝 *వివరాలు:* ${applicantNotes.trim() || 'పత్రాలు షాప్‌లో చూపిస్తాను'}\n\n` +
      `_ఈ దరఖాస్తు వెబ్‌సైట్ ద్వారా పంపబడింది._`;

    window.open(`https://api.whatsapp.com/send?phone=919949122402&text=${encodeURIComponent(msg)}`, '_blank');
  }

  function quickApplyWhatsApp(serviceTitle) {
    const msg = `నమస్తే A.S.V. Enterprises, నాకు *${serviceTitle}* సేవ కావాలి. దానికి సంబంధించిన వివరాలు, పత్రాల జాబితా తెలపగలరు.`;
    window.open(`https://api.whatsapp.com/send?phone=919949122402&text=${encodeURIComponent(msg)}`, '_blank');
  }
</script>

<svelte:head>
  <title>A.S.V. Enterprises & NS News | అధీకృత డిజిటల్ సేవా కేంద్రం, ముత్తారం</title>
  <meta name="description" content="A.S.V. Enterprises (CSC ID: 514542450010, GSTIN: 36AMXPA2915K1ZR) - డిజిటల్ సేవలు, ప్రభుత్వ పథకాలు, ఆధార్, ధరణి, IRCTC రైలు టికెట్లు మరియు NS News తాజా వార్తలు." />

  <!-- WhatsApp Open Graph Tags -->
  <meta property="og:title" content="A.S.V. Enterprises & NS News Network | ముత్తారం" />
  <meta property="og:description" content="వన్-స్టాప్ డిజిటల్ సొల్యూషన్: ఆధార్, ధరణి, రైతు భరోసా, ఇందిరమ్మ కుట్టు మిషన్, IRCTC టికెట్లు & ముత్తారం మండల తాజా వార్తలు." />
  <meta property="og:url" content="https://nexlifynucleus.in/" />
  <meta property="og:image" content="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&h=630&q=85" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mandali&family=Ramabhadra&family=Noto+Sans+Telugu:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<div class="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-['Noto_Sans_Telugu',sans-serif]">
  
  <!-- 1. అఫీషియల్ టాప్ గవర్నమెంట్ బ్యాడ్జ్ స్ట్రిప్ -->
  <div class="bg-slate-950 text-slate-300 text-[11px] py-1.5 px-4 border-b border-slate-800">
    <div class="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2 font-medium">
      <div class="flex flex-wrap items-center gap-3 text-xs">
        <span class="text-amber-400 font-bold flex items-center gap-1">
          <i class="fa-solid fa-certificate"></i> కేంద్ర, రాష్ట్ర ప్రభుత్వ అధీకృత సేవా కేంద్రం
        </span>
        <span class="hidden sm:inline text-slate-600">•</span>
        <span class="font-mono text-slate-300">CSC ID: <strong class="text-white">514542450010</strong></span>
        <span class="hidden sm:inline text-slate-600">•</span>
        <span class="font-mono text-slate-300">GSTIN: <strong class="text-white">36AMXPA2915K1ZR</strong></span>
      </div>
      <div class="flex items-center gap-4 text-slate-400 text-xs">
        <a href="tel:9949122402" class="hover:text-amber-400 flex items-center gap-1">
          <i class="fa-solid fa-phone text-amber-500"></i> 9949122402
        </a>
        <a href="https://wa.me/919949122402" target="_blank" class="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold">
          <i class="fa-brands fa-whatsapp"></i> వాట్సాప్ డెస్క్
        </a>
      </div>
    </div>
  </div>

  <!-- 2. ప్రధాన హెడర్ (షాప్ బ్రాండింగ్ & పోర్టల్ నావిగేషన్) -->
  <header class="bg-white border-b-2 border-red-600 shadow-sm sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between">
    <!-- Paper Clips Banner on Home Page -->
<div class="my-8 max-w-6xl mx-auto px-4">
  <div class="flex justify-between items-center mb-4 border-b pb-2">
    <h2 class="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
      📰 నేటి పేపర్ క్లిప్పింగ్స్ (E-Paper Clips)
    </h2>
    <a href="/clips" class="text-xs font-bold text-red-600 hover:underline">
      అన్నీ చూడండి →
    </a>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    {#each recentClips as clip}
      <a href="/clip/{clip.id}" class="group bg-white rounded-xl border p-2 hover:shadow-md transition">
        <div class="h-40 w-full overflow-hidden rounded-lg bg-slate-100 mb-2">
          <img src={clip.image_url} alt={clip.title} class="w-full h-full object-cover group-hover:scale-105 transition" />
        </div>
        <h3 class="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">{clip.title}</h3>
        <p class="text-[10px] text-slate-500 mt-1">{clip.newspaper_name} • {clip.page_number}</p>
      </a>
    {/each}
  </div>
</div>
      
      <!-- లోగో & బ్రాండ్ టైటిల్ -->
      <a href="/" class="flex items-center gap-3">
        <div class="w-11 h-11 bg-slate-950 border-2 border-red-600 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow font-['Ramabhadra']">
          ASV
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-lg sm:text-2xl font-black text-slate-950 font-['Ramabhadra'] tracking-tight">
              A.S.V. ENTERPRISES
            </span>
            <span class="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase">
              CSC CENTER
            </span>
          </div>
          <p class="text-[11px] text-slate-500 font-bold hidden sm:block">
            మీ పని - మా సేవ - మీ సౌలభ్యం • బస్ స్టాండ్ వద్ద, ముత్తారం, పెద్దపల్లి జిల్లా
          </p>
        </div>
      </a>

      <!-- యాక్షన్ బటన్లు -->
      <div class="flex items-center gap-2">
        <a
          href="/news"
          class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
        >
          <i class="fa-solid fa-newspaper text-yellow-200"></i>
          <span>NS NEWS పోర్టల్</span>
        </a>

        <a
          href="/admin/login"
          class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition border border-slate-300 hidden md:flex items-center gap-1"
        >
          <i class="fa-solid fa-lock text-slate-500"></i>
          <span>అడ్మిన్ లాగిన్</span>
        </a>
      </div>

    </div>
  </header>



  <!-- 3. లైవ్ న్యూస్ స్క్రోలింగ్ టిక్కర్ -->
  {#if tickerNews.length > 0}
    <div class="bg-slate-900 border-b border-slate-800 text-white flex items-center text-xs overflow-hidden h-9 shadow-inner select-none">
      <div class="bg-red-600 font-black px-3.5 h-full flex items-center gap-1.5 text-white shrink-0 uppercase tracking-wider text-[11px] z-10 shadow">
        <i class="fa-solid fa-bolt text-yellow-300 animate-pulse"></i>
        <span>బ్రేకింగ్ న్యూస్</span>
      </div>
      <div class="overflow-hidden whitespace-nowrap flex-grow relative">
        <div class="inline-block animate-marquee pl-6 font-semibold text-slate-200">
          {#each tickerNews as tItem}
            <a href={`/news/${tItem.id}`} class="hover:text-amber-400 mr-12 inline-flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              <span>{tItem.headline}</span>
            </a>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <main class="max-w-7xl mx-auto px-4 py-6 sm:py-8 flex-grow w-full space-y-10">

    <!-- 4. హీరో విభాగం: వన్-స్టాప్ డిజిటల్ & పౌర సేవల సొల్యూషన్ -->
    <section class="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl text-white p-6 sm:p-10 border-2 border-slate-800 shadow-xl relative overflow-hidden">
      <!-- బ్యాక్‌గ్రౌండ్ లైట్ గ్లో -->
      <div class="absolute -right-16 -bottom-16 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -left-16 -top-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 max-w-3xl space-y-4">
        <div class="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/40 px-3 py-1 rounded-full text-xs font-bold text-red-400">
          <i class="fa-solid fa-shield-halved"></i>
          <span>ONE STOP SOLUTION FOR ALL YOUR DIGITAL & CITIZEN NEEDS</span>
        </div>

        <h1 class="text-2xl sm:text-4xl lg:text-5xl font-black font-['Ramabhadra'] leading-tight text-white tracking-tight">
          మీ డిజిటల్ & ప్రభుత్వ సేవల అవసరాలు <br class="hidden sm:inline" />
          <span class="bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
            అన్నీ ఒకే చోట — ముత్తారంలో!
          </span>
        </h1>

        <p class="text-slate-300 text-xs sm:text-base leading-relaxed font-normal">
          తెలంగాణ ప్రభుత్వ పథకాలు, ఆధార్ నగదు ఉపసంహరణ, ధరణి భూభారతి పత్రాలు, IRCTC రైలు టికెట్లు, మరియు ఆన్‌లైన్ జిరాక్స్ ప్రింటింగ్ సేవలు నమ్మకమైన వేగంతో పొందండి.
        </p>

        <!-- ట్రస్ట్ కార్డ్స్ గ్రిడ్ -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
            <span class="text-amber-400 font-bold text-xs block">CSC ID</span>
            <strong class="font-mono text-white text-xs sm:text-sm">514542450010</strong>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
            <span class="text-amber-400 font-bold text-xs block">GST NUMBER</span>
            <strong class="font-mono text-white text-[11px] sm:text-xs">36AMXPA2915K1ZR</strong>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
            <span class="text-amber-400 font-bold text-xs block">UDYAM REG</span>
            <strong class="font-mono text-white text-[10px] sm:text-xs">UDYAM-TS-23-0025822</strong>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
            <span class="text-amber-400 font-bold text-xs block">IRCTC TRAIN DESK</span>
            <strong class="text-white text-xs sm:text-sm font-bold">Authorized Agent</strong>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-4">
          <a
            href="https://wa.me/919949122402?text=నమస్తే%20ASV%20Enterprises,%20నాకు%20డిజిటల్%20సేవల%20గురించి%20వివరాలు%20కావాలి."
            target="_blank"
            class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition active:scale-95"
          >
            <i class="fa-brands fa-whatsapp text-lg"></i>
            <span>వాట్సాప్ ద్వారా నేరుగా సంప్రదించండి</span>
          </a>

          <a
            href="#services"
            class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl border border-slate-700 transition"
          >
            సేవల వివరాలు & పత్రాలు ⬇
          </a>
        </div>
      </div>
    </section>

    <!-- 5. అందుబాటులో ఉన్న ప్రజా & డిజిటల్ సేవలు (ఇందిరమ్మ కుట్టు మిషన్ సహా) -->
    <section id="services" class="space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-2 border-b-2 border-slate-900 pb-3">
        <div>
          <span class="text-xs font-bold text-red-600 uppercase tracking-wider block">CITIZEN & DIGITAL UTILITIES</span>
          <h2 class="text-2xl sm:text-3xl font-black text-slate-950 font-['Ramabhadra']">
            ప్రజా సేవలు & ప్రభుత్వ సంక్షేమ పథకాలు
          </h2>
        </div>
        <p class="text-xs text-slate-500 font-semibold">
          పత్రాలు తీసుకుని షాప్‌కు రండి లేదా వాట్సాప్‌లో పంపండి
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each citizenServices as service}
          <div class="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between">
            
            <div class="p-6 space-y-4">
              <div class="flex items-center justify-between">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br {service.color} text-white flex items-center justify-center text-xl shadow">
                  <i class="fa-solid {service.icon}"></i>
                </div>
                <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wider">
                  {service.badge}
                </span>
              </div>

              <div>
                <h3 class="text-lg font-black text-slate-900 leading-snug">
                  {service.title}
                </h3>
                <p class="text-xs text-slate-600 mt-1 leading-relaxed">
                  {service.desc}
                </p>
              </div>

              <!-- అవసరమైన పత్రాలు -->
              <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5">
                <span class="text-[11px] font-bold text-slate-700 block">అవసరమైన పత్రాలు (Required Documents):</span>
                <ul class="text-[11px] text-slate-600 space-y-1">
                  {#each service.docs as doc}
                    <li class="flex items-center gap-1.5">
                      <i class="fa-solid fa-circle-check text-emerald-600 text-[10px]"></i>
                      <span>{doc}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>

            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                on:click={() => quickApplyWhatsApp(service.title)}
                class="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
              >
                <i class="fa-brands fa-whatsapp text-sm"></i>
                <span>వాట్సాప్‌లో అప్లై చేయండి</span>
              </button>
              <button
                type="button"
                on:click={() => {
                  selectedService = service.title;
                  document.getElementById('service-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                class="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
              >
                ఫారమ్ నింపండి ➡
              </button>
            </div>

          </div>
        {/each}
      </div>
    </section>

    <!-- 6. NS NEWS తాజా ముఖ్యాంశాలు (లైవ్ వార్తల కార్డ్స్) -->
    <section class="space-y-6 pt-4">
      <div class="flex flex-wrap items-end justify-between gap-2 border-b-2 border-red-600 pb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 bg-red-600 rounded-full animate-ping inline-block"></span>
            <span class="text-xs font-black text-red-600 uppercase tracking-wider">NS NEWS NETWORK</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-slate-950 font-['Ramabhadra']">
            తాజా స్థానిక & ప్రాంతీయ వార్తలు
          </h2>
        </div>
        <a href="/news" class="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
          <span>అన్ని వార్తలు చూడండి</span>
          <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>

      {#if loadingNews}
        <div class="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <i class="fa-solid fa-circle-notch fa-spin text-3xl text-red-600 mb-2"></i>
          <p class="text-xs font-bold text-slate-600">తాజా వార్తలు లోడ్ అవుతున్నాయి...</p>
        </div>
      {:else if recentNews.length === 0}
        <div class="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 font-bold text-xs">
          ప్రస్తుతం ఎలాంటి వార్తలు అందుబాటులో లేవు.
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each recentNews as article}
            <article class="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between">
              <div>
                {#if article.image_url}
                  <div class="w-full h-48 overflow-hidden bg-slate-100 relative">
                    <img
                      src={article.image_url}
                      alt={article.headline}
                      class="w-full h-full object-cover hover:scale-105 transition duration-300"
                    />
                    <span class="absolute top-3 left-3 bg-slate-950/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {article.category || 'స్థానిక వార్త'}
                    </span>
                  </div>
                {/if}

                <div class="p-5 space-y-2">
                  <div class="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span class="text-red-600 font-bold">📍 {article.location_town || 'ముత్తారం'}</span>
                    <span>{new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>

                  <h3 class="text-base font-black text-slate-950 leading-snug hover:text-red-600 transition">
                    <a href={`/news/${article.id}`}>
                      {article.headline}
                    </a>
                  </h3>

                  {#if article.subline_1}
                    <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      • {article.subline_1}
                    </p>
                  {/if}
                </div>
              </div>

              <div class="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <a href={`/news/${article.id}`} class="text-xs font-bold text-red-600 hover:text-red-700">
                  పూర్తి వార్త చదవండి ➡
                </a>
                <span class="text-[10px] text-slate-400 font-bold uppercase">NS DIGITAL</span>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>

    <!-- 7. ఆన్‌లైన్ సర్వీస్ రిక్వెస్ట్ డెస్క్ & షాప్ సమాచారం -->
    <section id="service-form" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-4">
      
      <!-- ఎడమవైపు: తక్షణ దరఖాస్తు / వినతి ఫారమ్ (7 Cols) -->
      <div class="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
        <div>
          <span class="text-xs font-black text-red-600 uppercase tracking-wider block">ONLINE REQUEST DESK</span>
          <h3 class="text-xl sm:text-2xl font-black text-slate-950 font-['Ramabhadra']">
            సేవ కోసం ఆన్‌లైన్ దరఖాస్తు వినతి
          </h3>
          <p class="text-xs text-slate-500 mt-1">
            మీ వివరాలు నమోదు చేయండి; మేము నేరుగా మీతో మాట్లాడి పని పూర్తి చేస్తాము.
          </p>
        </div>

        <form on:submit|preventDefault={sendWhatsAppEnquiry} class="space-y-4 text-xs font-bold text-slate-700">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="app-name" class="block mb-1">పూర్తి పేరు (Full Name) *</label>
              <input
                id="app-name"
                type="text"
                bind:value={applicantName}
                required
                placeholder="ఉదా: రాజయ్య"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none text-slate-900 font-semibold text-sm"
              />
            </div>

            <div>
              <label for="app-mobile" class="block mb-1">మొబైల్ నంబర్ (WhatsApp Number) *</label>
              <input
                id="app-mobile"
                type="tel"
                bind:value={applicantMobile}
                required
                placeholder="ఉదా: 9876543210"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none text-slate-900 font-semibold text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label for="app-service" class="block mb-1">కావాల్సిన సేవ (Select Service) *</label>
            <select
              id="app-service"
              bind:value={selectedService}
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-red-600 focus:outline-none text-slate-900 font-semibold text-sm bg-white"
            >
              <option value="ఇందిరమ్మ కుట్టు మిషన్ దరఖాస్తు">ఇందిరమ్మ కుట్టు మిషన్ దరఖాస్తు</option>
              <option value="ఆధార్ బయోమెట్రిక్ / నగదు విత్‌డ్రా">ఆధార్ బయోమెట్రిక్ / నగదు విత్‌డ్రా</option>
              <option value="ధరణి / భూభారతి / మీసేవ సర్టిఫికెట్లు">ధరణి / భూభారతి / మీసేవ సర్టిఫికెట్లు</option>
              <option value="రైతు భరోసా / PM-కిసాన్ e-KYC">రైతు భరోసా / PM-కిసాన్ e-KYC</option>
              <option value="IRCTC రైలు టికెట్ల బుకింగ్">IRCTC రైలు టికెట్ల బుకింగ్</option>
              <option value="ఆన్‌లైన్ జిరాక్స్ & కలర్ ప్రింటింగ్">ఆన్‌లైన్ జిరాక్స్ & కలర్ ప్రింటింగ్</option>
              <option value="కొత్త పాన్ కార్డు / ఓటర్ కార్డు సేవలు">కొత్త పాన్ కార్డు / ఓటర్ కార్డు సేవలు</option>
              <option value="ఇతర డిజిటల్ సేవ">ఇతర డిజిటల్ సేవ</option>
            </select>
          </div>

          <div>
            <label for="app-notes" class="block mb-1">అదనపు వివరాలు (ఐచ్ఛికం)</label>
            <textarea
              id="app-notes"
              bind:value={applicantNotes}
              rows="3"
              placeholder="మీకు సంబంధించిన అదనపు సమాచారం లేదా సందేహాలు ఇక్కడ రాయండి..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 focus:outline-none text-slate-900 font-medium text-xs leading-relaxed"
            ></textarea>
          </div>

          <button
            type="submit"
            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-md transition flex items-center justify-center gap-2 active:scale-98"
          >
            <i class="fa-brands fa-whatsapp text-lg"></i>
            <span>అభ్యర్థనను వాట్సాప్ ద్వారా పంపండి</span>
          </button>
        </form>
      </div>

      <!-- కుడివైపు: షాప్ చిరునామా & డైరెక్ట్ ప్రింట్ హెల్ప్‌లైన్ (5 Cols) -->
      <div class="lg:col-span-5 bg-slate-950 text-white rounded-3xl border-2 border-red-600 shadow-sm p-6 sm:p-8 flex flex-col justify-between space-y-6">
        <div class="space-y-4">
          <div class="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <i class="fa-solid fa-location-dot"></i>
            <span>షాప్ చిరునామా & సంప్రదింపులు</span>
          </div>

          <div>
            <h4 class="text-xl font-black font-['Ramabhadra'] text-white">A.S.V. ENTERPRISES</h4>
            <p class="text-xs text-slate-400 font-semibold mt-1 leading-relaxed">
              బస్ స్టాండ్ సమీపంలో, ముత్తారం (మండల కేంద్రం), <br />
              పెద్దపల్లి జిల్లా, తెలంగాణ — 505184.
            </p>
          </div>

          <div class="space-y-2 pt-2 text-xs font-semibold">
            <div class="flex items-center gap-2.5 text-slate-300">
              <i class="fa-solid fa-phone text-amber-500 w-4"></i>
              <span>మొబైల్: <strong>9949122402 / 9502336495</strong></span>
            </div>
            <div class="flex items-center gap-2.5 text-slate-300">
              <i class="fa-solid fa-envelope text-amber-500 w-4"></i>
              <span>ఈమెయిల్: <strong>nexlifynucleus@gmail.com</strong></span>
            </div>
            <div class="flex items-center gap-2.5 text-slate-300">
              <i class="fa-solid fa-clock text-amber-500 w-4"></i>
              <span>పనివేళలు: <strong>ఉదయం 8:00 నుండి రాత్రి 8:30 వరకు</strong></span>
            </div>
          </div>
        </div>

        <!-- ఫాస్ట్ జిరాక్స్ & ప్రింటింగ్ కాల్అవుట్ -->
        <div class="bg-white/10 border border-white/10 rounded-2xl p-4 space-y-2">
          <span class="text-amber-300 font-bold text-xs flex items-center gap-1.5">
            <i class="fa-solid fa-bolt"></i> అర్జెంట్ ప్రింటింగ్ & జిరాక్స్ డెస్క్
          </span>
          <p class="text-[11px] text-slate-300 leading-relaxed font-medium">
            మీ ఫైల్స్ / సర్టిఫికెట్లు మా వాట్సాప్‌కు సెండ్ చేయండి. మీరు షాప్‌కు వచ్చేలోపే ప్రింట్లు సిద్ధంగా ఉంటాయి!
          </p>
        </div>
      </div>

    </section>

  </main>

  <!-- 8. ఫుటర్ బ్రాండింగ్ -->
  <footer class="bg-slate-950 text-slate-400 border-t-2 border-red-600 py-8 mt-12 text-xs">
    <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
      <div>
        <div class="flex items-center gap-2 text-white font-black text-base font-['Ramabhadra']">
          <span class="text-red-600">ASV</span> A.S.V. ENTERPRISES
        </div>
        <p class="text-[11px] text-slate-500 mt-1">
          అధీకృత కేంద్ర, రాష్ట్ర ప్రభుత్వ డిజిటల్ సేవా కేంద్రం • ముత్తారం, పెద్దపల్లి జిల్లా.
        </p>
      </div>

      <div class="flex flex-wrap justify-center gap-4 font-semibold text-slate-300">
        <a href="/" class="text-amber-400">హోమ్</a>
        <a href="#services" class="hover:text-white">ప్రజా సేవలు</a>
        <a href="/news" class="hover:text-white">NS News</a>
        <a href="/admin/digital-express" class="hover:text-white">డిజిటల్ ఎక్స్‌ప్రెస్ డెస్క్</a>
      </div>

      <div class="text-center md:text-right font-mono text-[11px] text-slate-500">
        © 2026 A.S.V. Enterprises. All rights reserved.
      </div>
    </div>
  </footer>

</div>

<style>
  @keyframes marquee {
    0% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }
  .animate-marquee {
    display: inline-block;
    white-space: nowrap;
    animation: marquee 35s linear infinite;
  }
</style>