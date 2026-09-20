<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let paperClips = [];
  let tickerNews = [];
  let newsArticles = [];
  let loadingClips = true;

  // సేవల జాబితా (Citizen & Digital Utilities)
  const services = [
    { title: 'ఆధార్ సేవలు', desc: 'డౌన్‌లోడ్, ప్రింట్, PVC కార్డ్ ఆర్డర్ & బయోమెట్రిక్ అప్‌డేట్ గైడెన్స్', icon: 'fa-id-card', badge: 'అత్యవసరం', color: 'border-blue-500' },
    { title: 'ధరణి & భూభారతి', desc: 'పట్టాదార్ పాస్ పుస్తకం, EC, RoR-1B, మార్కెట్ వాల్యూ & స్లాట్ బుకింగ్', icon: 'fa-map-location-dot', badge: 'రెవెన్యూ', color: 'border-emerald-500' },
    { title: 'ప్రభుత్వ పథకాలు', desc: 'ఇందిరమ్మ కుట్టు మిషన్, రైతు భరోసా, రేషన్ కార్డు మార్పులు & చేర్పులు', icon: 'fa-hand-holding-heart', badge: 'సంక్షేమం', color: 'border-rose-500' },
    { title: 'IRCTC రైలు టికెట్లు', desc: 'అధీకృత ఏజెంట్ ద్వారా కన్ఫర్మ్ రైలు టికెట్లు, తత్కాల్ & క్యాన్సిలేషన్', icon: 'fa-train', badge: 'ఆథరైజ్డ్', color: 'border-amber-500' },
    { title: 'పాన్ కార్డ్ సేవలు', desc: 'కొత్త పాన్ కార్డ్ దరఖాస్తు, కరెక్షన్లు & ఆధార్-పాన్ లింకింగ్ సేవలు', icon: 'fa-address-card', badge: 'తక్షణం', color: 'border-purple-500' },
    { title: 'విద్యుత్ & బిల్లు చెల్లింపులు', desc: 'కరెంట్ బిల్లులు, గ్రామ పంచాయతీ పన్నులు & వాటర్ బిల్లు పేమెంట్స్', icon: 'fa-bolt', badge: 'BBPS', color: 'border-teal-500' },
    { title: 'విద్యార్థి & జాబ్ దరఖాస్తులు', desc: 'TGPSC, SSC, పోలీస్ రిక్రూట్‌మెంట్, స్కాలర్‌షిప్స్ & ఆన్‌లైన్ ఎగ్జామ్ ఫీజులు', icon: 'fa-user-graduate', badge: 'ఎడ్యుకేషన్', color: 'border-indigo-500' },
    { title: 'కలర్ జిరాక్స్ & ప్రింటింగ్', desc: 'హై-క్వాలిటీ ఎప్సన్ కలర్ ప్రింట్స్, లామినేషన్, స్పైరల్ బైండింగ్ & పాస్‌పోర్ట్ సైజ్ ఫోటోలు', icon: 'fa-print', badge: 'ఎప్సన్ HQ', color: 'border-cyan-500' }
  ];

  onMount(async () => {
    // 1. పేపర్ క్లిప్పింగ్స్ లోడ్ చేయడం
    try {
      const { data: clipsData } = await supabase
        .from('paper_clips')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (clipsData) paperClips = clipsData;
    } catch (e) {
      console.log('Error loading clips:', e);
    } finally {
      loadingClips = false;
    }

    // 2. న్యూస్ ఆర్టికల్స్ & టిక్కర్ లోడ్ చేయడం
    try {
      const { data: newsData } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (newsData && newsData.length > 0) {
        newsArticles = newsData;
        tickerNews = newsData.map(n => n.title);
      } else {
        tickerNews = [
          'ముత్తారంలో విశ్వకర్మ జయంతి వేడుకలు ఘనంగా నిర్వహణ',
          'తెలంగాణ ఇందిరమ్మ కుట్టు మిషన్ పథకం దరఖాస్తులు ప్రారంభం - వివరాలకు సంప్రదించండి',
          'A.S.V. Enterprises నందు ఆధార్, ధరణి, పాన్ కార్డ్ మరియు IRCTC రైలు టికెట్ సేవలు అందుబాటులో ఉన్నాయి'
        ];
      }
    } catch (e) {
      tickerNews = ['A.S.V. Enterprises & NS News పోర్టల్‌కు స్వాగతం - ముత్తారం బస్ స్టాండ్ వద్ద'];
    }
  });
</script>

<svelte:head>
  <title>A.S.V. Enterprises & NS News | అధీకృత డిజిటల్ సేవా కేంద్రం, ముత్తారం</title>
  <meta name="description" content="A.S.V. Enterprises (CSC ID: 514542450010) - డిజిటల్ సేవలు, ప్రభుత్వ సంక్షేమ పథకాలు, ధరణి, ఆధార్ మరియు ముత్తారం మండల తాజా వార్తలు." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mandali&family=Ramabhadra&family=Noto+Sans+Telugu:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<div class="min-h-screen bg-slate-100 text-slate-900 font-['Noto_Sans_Telugu',sans-serif] flex flex-col">

  <!-- 1. టాప్ స్ట్రిప్ (అధికారిక వివరాలు & హెల్ప్‌లైన్) -->
  <div class="bg-slate-950 text-amber-300 py-1.5 px-4 text-[11px] font-semibold border-b border-slate-800 select-none">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          కేంద్ర, రాష్ట్ర ప్రభుత్వ అధీకృత సేవా కేంద్రం
        </span>
        <span class="text-slate-600 hidden sm:inline">•</span>
        <span class="text-slate-300 hidden sm:inline">CSC ID: <strong class="text-white font-mono">514542450010</strong></span>
        <span class="text-slate-600 hidden md:inline">•</span>
        <span class="text-slate-300 hidden md:inline">GSTIN: <strong class="text-white font-mono">36AMXPA2915K1ZR</strong></span>
      </div>
      <div class="flex items-center gap-4 text-xs">
        <a href="tel:9949122402" class="hover:text-white transition flex items-center gap-1">
          <i class="fa-solid fa-phone text-emerald-400"></i> 9949122402
        </a>
        <a href="https://wa.me/919949122402" target="_blank" class="hover:text-emerald-400 transition flex items-center gap-1">
          <i class="fa-brands fa-whatsapp text-emerald-400 text-sm"></i> వాట్సాప్ డెస్క్
        </a>
      </div>
    </div>
  </div>

  <!-- 2. ప్రధాన హెడర్ (షాప్ బ్రాండింగ్ & నావిగేషన్ - క్లీన్ లేఅవుట్) -->
  <header class="bg-white border-b-2 border-red-600 shadow-sm sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between">
      
      <!-- షాప్ లోగో & టైటిల్ -->
      <a href="/" class="flex items-center gap-3 group">
        <div class="w-11 h-11 bg-slate-950 text-white rounded-xl flex items-center justify-center font-black text-base shadow-md group-hover:bg-red-600 transition tracking-tighter">
          ASV
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-['Ramabhadra'] text-lg sm:text-xl font-black text-slate-950 tracking-tight leading-none">
              A.S.V. ENTERPRISES
            </h1>
          </div>
          <p class="text-[10px] sm:text-xs text-slate-500 font-bold mt-0.5">
            మీ మనీ - మీ సేవ - మీ సౌలభ్యం • బస్ స్టాండ్ వద్ద, ముత్తారం
          </p>
        </div>
      </a>

      <!-- బ్యాడ్జ్‌లు & బటన్లు -->
      <div class="flex items-center gap-2 sm:gap-2.5">
        <span class="bg-red-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg uppercase shadow-sm">
          CSC CENTER
        </span>
        <span class="bg-rose-700 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg uppercase shadow-sm hidden xs:inline-block">
          NS NEWS
        </span>
        <a
          href="/admin/clips"
          class="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-lg transition flex items-center gap-1"
        >
          <i class="fa-solid fa-newspaper text-red-600"></i>
          <span>క్లిప్స్ అప్‌లోడ్</span>
        </a>
        <a
          href="/admin/login"
          class="bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-bold px-3 py-1 rounded-lg transition flex items-center gap-1 shadow"
        >
          <i class="fa-solid fa-lock text-[10px] text-amber-400"></i>
          <span>లాగిన్</span>
        </a>
      </div>

    </div>
  </header>

  <!-- 3. లైవ్ న్యూస్ స్క్రోలింగ్ టిక్కర్ -->
  {#if tickerNews.length > 0}
    <div class="bg-slate-900 text-white border-b border-slate-800 py-2 px-4 shadow-inner flex items-center gap-3 overflow-hidden select-none">
      <div class="flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded shadow shrink-0">
        <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
        <span>తాజా వార్తలు</span>
      </div>
      <div class="overflow-hidden whitespace-nowrap w-full">
        <div class="inline-block animate-marquee text-xs font-medium text-amber-200">
          {#each tickerNews as item}
            <span class="mx-6">🔸 {item}</span>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <main class="flex-grow space-y-6 pb-12">

    <!-- 4. నేటి పేపర్ క్లిప్పింగ్స్ విభాగం (హెడర్ క్రింద, పర్ఫెక్ట్ లేఅవుట్) -->
    <section class="max-w-7xl mx-auto px-4 pt-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div class="flex items-center gap-2">
            <span class="text-xl">📰</span>
            <h2 class="font-['Ramabhadra'] text-base sm:text-lg font-black text-slate-900">
              నేటి పేపర్ క్లిప్పింగ్స్ (E-Paper Clips)
            </h2>
          </div>
          <div class="flex items-center gap-3">
            <a href="/clip" class="text-xs font-bold text-red-600 hover:text-red-700 hover:underline">
              అన్నీ చూడండి ➡
            </a>
          </div>
        </div>

        {#if loadingClips}
          <div class="text-center py-6 text-xs text-slate-400">పేపర్ క్లిప్పింగ్స్ లోడ్ అవుతున్నాయి...</div>
        {:else if paperClips.length === 0}
          <div class="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed">
            ఇంకా ఎలాంటి పేపర్ క్లిప్పింగ్స్ అప్‌లోడ్ చేయలేదు. 
            <a href="/admin/clips" class="text-red-600 font-bold underline ml-1">ఇక్కడ క్లిక్ చేసి మొదటి క్లిప్ అప్‌లోడ్ చేయండి</a>
          </div>
        {:else}
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {#each paperClips as clip}
              <a
                href="/clip/{clip.id}"
                class="group block bg-slate-50 border border-slate-200 rounded-xl p-2 hover:border-red-500 hover:shadow-md transition duration-200"
              >
                <div class="aspect-[3/4] overflow-hidden rounded-lg bg-white border border-slate-200 mb-2 relative">
                  <img
                    src={clip.image_url}
                    alt={clip.title}
                    class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <span class="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                    {clip.page_number || 'Clip'}
                  </span>
                </div>
                <h3 class="text-[11px] font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-red-600 transition">
                  {clip.title}
                </h3>
                <span class="text-[9px] text-slate-500 block mt-1">
                  {clip.newspaper_name}
                </span>
              </a>
            {/each}
          </div>
        {/if}

      </div>
    </section>

    <!-- 5. హీరో బ్యానర్ (డిజిటల్ సేవలు & అధీకృత ప్రకటన) -->
    <section class="max-w-7xl mx-auto px-4">
      <div class="bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white rounded-3xl p-6 sm:p-10 shadow-xl border-2 border-red-600/40 relative overflow-hidden">
        
        <div class="max-w-3xl space-y-4 relative z-10">
          <div class="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/40 px-3.5 py-1 rounded-full text-xs font-bold text-red-400">
            <i class="fa-solid fa-shield-halved"></i>
            <span>ONE STOP SOLUTION FOR ALL YOUR DIGITAL & CITIZEN NEEDS</span>
          </div>

          <h2 class="text-2xl sm:text-4xl lg:text-5xl font-black font-['Ramabhadra'] tracking-tight text-white leading-tight">
            మీ డిజిటల్ & ప్రభుత్వ సేవల అవసరాలు <br class="hidden sm:inline" />
            అన్నీ ఒకే చోట — <span class="text-amber-400 underline underline-offset-4 decoration-red-600">ముత్తారంలో!</span>
          </h2>

          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            తెలంగాణ ప్రభుత్వ సంక్షేమ పథకాలు, ఆధార్ సేవలు, ధరణి భూభారతి పత్రాలు, IRCTC కన్ఫర్మ్ రైలు టికెట్లు మరియు ఆన్‌లైన్ ప్రింటింగ్ పనులకు నమ్మకమైన అధికారిక సేవా కేంద్రం.
          </p>

          <!-- రిజిస్ట్రేషన్ బ్యాడ్జ్‌లు -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div class="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
              <span class="text-[10px] text-slate-400 uppercase font-bold block">CSC ID</span>
              <span class="text-xs sm:text-sm font-black text-amber-300 font-mono">514542450010</span>
            </div>
            <div class="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
              <span class="text-[10px] text-slate-400 uppercase font-bold block">GST NUMBER</span>
              <span class="text-xs sm:text-sm font-black text-white font-mono">36AMXPA2915K1ZR</span>
            </div>
            <div class="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
              <span class="text-[10px] text-slate-400 uppercase font-bold block">UDYAM REG</span>
              <span class="text-xs sm:text-sm font-black text-white font-mono text-nowrap">UDYAM-TS-23-0025822</span>
            </div>
            <div class="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center">
              <span class="text-[10px] text-slate-400 uppercase font-bold block">IRCTC DESK</span>
              <span class="text-xs sm:text-sm font-black text-emerald-400">Authorized Agent</span>
            </div>
          </div>

          <!-- యాక్షన్ బటన్లు -->
          <div class="flex flex-wrap items-center gap-3 pt-3">
            <a
              href="https://wa.me/919949122402?text=నమస్తే%20A.S.V.%20Enterprises,%20నాకు%20ఈ%20సేవ%20కావాలి:"
              target="_blank"
              class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition active:scale-95"
            >
              <i class="fa-brands fa-whatsapp text-base"></i>
              <span>వాట్సాప్ ద్వారా నేరుగా సంప్రదించండి</span>
            </a>
            <a
              href="/admin/doc-cleaner"
              class="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-bold px-4 py-3 rounded-xl transition flex items-center gap-2"
            >
              <i class="fa-solid fa-print text-amber-400"></i>
              <span>డాక్యుమెంట్ స్కానర్ & ప్రింట్ డెస్క్</span>
            </a>
          </div>

        </div>

      </div>
    </section>

    <!-- 6. ప్రజా సేవలు & ప్రభుత్వ సంక్షేమ పథకాలు (గ్రిడ్ లేఅవుట్) -->
    <section class="max-w-7xl mx-auto px-4 space-y-4">
      <div class="flex items-end justify-between border-b border-slate-200 pb-3">
        <div>
          <span class="text-[10px] font-bold text-red-600 uppercase tracking-widest block">CITIZEN & DIGITAL UTILITIES</span>
          <h2 class="text-xl sm:text-2xl font-black text-slate-900 font-['Ramabhadra']">
            ప్రజా సేవలు & ప్రభుత్వ సంక్షేమ పథకాలు
          </h2>
        </div>
        <span class="text-xs text-slate-500 hidden sm:block">పత్రాలు తీసుకుని షాప్‌కు రండి లేదా వాట్సాప్‌లో పంపండి</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each services as s}
          <div class="bg-white rounded-2xl p-5 border-2 {s.color} shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 text-lg">
                  <i class="fa-solid {s.icon}"></i>
                </div>
                <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {s.badge}
                </span>
              </div>
              <h3 class="font-['Ramabhadra'] text-base font-bold text-slate-900">{s.title}</h3>
              <p class="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
            </div>

            <a
              href="https://wa.me/919949122402?text=నమస్తే,%20నాకు%20{encodeURIComponent(s.title)}%20సేవ%20గురించి%20వివరాలు%20కావాలి."
              target="_blank"
              class="text-xs font-bold text-slate-900 hover:text-red-600 flex items-center justify-between border-t pt-2.5 transition"
            >
              <span>వివరాలు & అప్లై ➡</span>
              <i class="fa-brands fa-whatsapp text-emerald-600 text-sm"></i>
            </a>
          </div>
        {/each}
      </div>
    </section>

    <!-- 7. షాప్ లొకేషన్ & సంప్రదింపు బ్యానర్ -->
    <section class="max-w-7xl mx-auto px-4">
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div class="md:col-span-8 space-y-2">
          <span class="text-xs font-bold text-red-600 uppercase tracking-wider block">సందర్శించండి</span>
          <h3 class="text-xl sm:text-2xl font-black text-slate-900 font-['Ramabhadra']">
            A.S.V. ENTERPRISES — మీ విశ్వసనీయ సేవా కేంద్రం
          </h3>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
            గ్రామ పంచాయతీ కార్యాలయం & బస్ స్టాండ్ సమీపంలో, ముత్తారం మండల కేంద్రం, పెద్దపల్లి జిల్లా, తెలంగాణ - 505531.
            <br />
            పనివేళలు: ఉదయం 8:00 AM నుండి రాత్రి 9:00 PM వరకు (అన్ని రోజులలో).
          </p>
        </div>

        <div class="md:col-span-4 flex flex-col gap-2.5 text-center">
          <a
            href="tel:9949122402"
            class="bg-slate-900 hover:bg-slate-800 text-white font-black text-sm py-3 px-4 rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <i class="fa-solid fa-phone text-amber-400"></i>
            <span>కాల్ చేయండి: 9949122402</span>
          </a>
          <a
            href="https://wa.me/919949122402"
            target="_blank"
            class="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm py-3 px-4 rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <i class="fa-brands fa-whatsapp text-base"></i>
            <span>వాట్సాప్ మెసేజ్ పంపండి</span>
          </a>
        </div>
      </div>
    </section>

  </main>

  <!-- 8. ఫుటర్ -->
  <footer class="bg-slate-950 text-slate-400 py-8 px-4 border-t border-slate-800 text-xs text-center space-y-2">
    <p class="font-bold text-slate-300">
      © 2026 A.S.V. ENTERPRISES & NS NEWS NETWORK. ALL RIGHTS RESERVED.
    </p>
    <p class="text-[11px] text-slate-500">
      ముత్తారం, పెద్దపల్లి జిల్లా, తెలంగాణ | CSC VLE ID: 514542450010 | GSTIN: 36AMXPA2915K1ZR
    </p>
  </footer>

</div>

<style>
  @keyframes marquee {
    0% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }
  .animate-marquee {
    display: inline-block;
    animation: marquee 30s linear infinite;
  }
</style>