<script>
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';

  let articles = [];
  let loading = true;
  let searchQuery = '';
  let selectedCategory = 'అన్నీ';

  const categories = [
    'అన్నీ',
    'రాజకీయాలు',
    'వ్యాపారం & ఫైనాన్స్',
    'టెక్నాలజీ',
    'ఆరోగ్యం',
    'వాతావరణం & పర్యావరణం',
    'విద్య & ఉద్యోగాలు',
    'సైన్స్ & పరిశోధనలు',
    'క్రీడలు & గేమ్స్',
    'సంస్కృతి & సమాజం',
    'ప్రపంచ వార్తలు'
  ];

  onMount(async () => {
    try {
      // 1. news_articles టేబుల్ నుండి వార్తలు తేవడం
      let { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('id', { ascending: false });

      // 2. ఒకవేళ news_articles లో డేటా లేకపోతే news టేబుల్ ఫాల్‌బ్యాక్
      if (!data || data.length === 0) {
        const fallback = await supabase
          .from('news')
          .select('*')
          .order('id', { ascending: false });
        data = fallback.data || [];
      }

      articles = data || [];
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      loading = false;
    }
  });

  // లైవ్ టిక్కర్ వార్తలు
  $: tickerArticles = articles.filter(a => a.show_in_ticker !== false);

  // ఫిల్టర్ మరియు సెర్చ్ లాజిక్
  $: filteredArticles = articles.filter((a) => {
    const matchCat = selectedCategory === 'అన్నీ' || a.category === selectedCategory;
    const textToSearch = `${a.headline || a.title || ''} ${a.content || ''} ${a.location_town || ''}`.toLowerCase();
    const matchQuery = !searchQuery.trim() || textToSearch.includes(searchQuery.toLowerCase().trim());
    return matchCat && matchQuery;
  });
</script>

<svelte:head>
  <title>NS News | నిజమైన వార్తల వేదిక | A.S.V Digital Network</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">

  <!-- 1. మెయిన్ హెడర్ -->
  <header class="bg-[#0b1120] text-white border-b-2 border-red-600 sticky top-0 z-40 shadow-md">
    <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      
      <!-- ఎడమవైపు హోమ్ లింక్ -->
      <a 
        href="/" 
        class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow transition flex items-center gap-1.5"
      >
        <span>🏠 డిజిటల్ సేవలు (హోమ్)</span>
      </a>

      <!-- సెంటర్ లోగో -->
      <div class="flex items-center gap-2">
        <span class="bg-red-600 text-white font-black text-sm px-2 py-0.5 rounded shadow">NS</span>
        <div>
          <h1 class="text-base sm:text-lg font-black tracking-wider text-white font-['Ramabhadra']">NS NEWS</h1>
          <p class="text-[9px] text-slate-400 font-bold tracking-widest uppercase">A.S.V Digital Network</p>
        </div>
      </div>

      <!-- కుడివైపు బటన్లు -->
      <div class="flex items-center gap-2">
        <a 
          href="/admin/news" 
          class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 font-bold transition flex items-center gap-1"
        >
          <span>🔐 అడ్మిన్ డెస్క్</span>
        </a>
        <a 
          href="https://api.whatsapp.com/send?phone=919989851608&text={encodeURIComponent('నమస్తే NS News, నా వద్ద ఒక తాజా వార్త/సమాచారం ఉంది:')}"
          target="_blank"
          rel="noreferrer"
          class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 shadow"
        >
          <span>📲 వార్త పంపండి</span>
        </a>
      </div>

    </div>
  </header>

  <!-- 2. లైవ్ న్యూస్ టిక్కర్ -->
  {#if tickerArticles.length > 0}
    <div class="bg-red-700 text-white py-1.5 px-4 shadow-inner flex items-center gap-3 overflow-hidden">
      <div class="bg-red-950 text-amber-300 text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 flex items-center gap-1">
        <span>⚡</span>
        <span>లైవ్ న్యూస్</span>
      </div>
      <div class="overflow-x-auto whitespace-nowrap scrollbar-none text-xs font-semibold">
        {#each tickerArticles as tArt, idx}
          <a href="/news/{tArt.id}" class="hover:underline hover:text-amber-200 transition mr-6 inline-block">
            <span class="text-amber-300 font-bold">[{tArt.location_town || 'ముత్తారం'}]</span> {tArt.headline || tArt.title}
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <div class="max-w-7xl mx-auto px-4 py-5 space-y-5">

    <!-- 3. కేటగిరీల బార్ & సెర్చ్ బాక్స్ -->
    <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      <!-- కేటగిరీలు -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-thin">
        {#each categories as cat}
          <button
            type="button"
            on:click={() => selectedCategory = cat}
            class="px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer {selectedCategory === cat ? 'bg-red-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
          >
            {cat}
          </button>
        {/each}
      </div>

      <!-- సెర్చ్ బాక్స్ -->
      <div class="relative min-w-[240px]">
        <span class="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="వార్త లేదా ఊరి పేరు శోధించండి..."
          class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-red-500 transition"
        />
      </div>
    </div>

    <!-- 4. మెయిన్ లేఅవుట్ (Left: News Cards 8 Cols, Right: Services Sidebar 4 Cols) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

      <!-- ఎడమవైపు వార్తల గ్రిడ్ -->
      <div class="lg:col-span-8 space-y-4">
        
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 class="text-base font-black text-slate-900 flex items-center gap-2 font-['Ramabhadra']">
            <span class="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
            <span>తాజా ప్రధాన వార్తలు</span>
          </h2>
          <span class="text-xs font-bold text-slate-500 font-mono">
            {filteredArticles.length} కథనాలు
          </span>
        </div>

        {#if loading}
          <div class="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold text-sm">
            వార్తలు లోడ్ అవుతున్నాయి...
          </div>
        {:else if filteredArticles.length === 0}
          <div class="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 space-y-2">
            <p class="text-base font-bold">ఎలాంటి వార్తా కథనాలు కనుగొనబడలేదు.</p>
            <p class="text-xs">దయచేసి వేరే కేటగిరీ లేదా సెర్చ్ పదం ఎంచుకోండి.</p>
          </div>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {#each filteredArticles as item (item.id)}
              <div class="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group">
                
                <div>
                  <!-- చిత్రం -->
                  <div class="relative aspect-video bg-slate-100 overflow-hidden border-b border-slate-100">
                    {#if item.image_url}
                      <img
                        src={item.image_url}
                        alt={item.headline || item.title}
                        loading="lazy"
                        class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    {:else}
                      <div class="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-bold text-xs">
                        NS NEWS
                      </div>
                    {/if}

                    <!-- అలర్ట్ బ్యాడ్జ్ (బ్రేకింగ్ / ఫ్లాష్) -->
                    {#if item.alert_type === 'breaking'}
                      <span class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">
                        బ్రేకింగ్
                      </span>
                    {:else if item.alert_type === 'flash'}
                      <span class="absolute top-2 left-2 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow">
                        ఫ్లాష్
                      </span>
                    {/if}
                  </div>

                  <!-- వివరాలు -->
                  <div class="p-4 space-y-2">
                    <div class="flex items-center gap-2 text-[11px] font-bold">
                      <span class="text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        {item.location_town || 'ముత్తారం'}
                      </span>
                      <span class="text-slate-400">•</span>
                      <span class="text-slate-500">
                        {item.category || 'రాజకీయాలు'}
                      </span>
                    </div>

                    <!-- హెడ్‌లైన్ -->
                    <h3 class="text-sm sm:text-base font-black text-slate-900 group-hover:text-red-600 transition line-clamp-2 leading-snug font-['Ramabhadra']">
                      {item.headline || item.title}
                    </h3>

                    <!-- కథనం క్లిప్పింగ్ -->
                    <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.content || ''}
                    </p>
                  </div>
                </div>

                <!-- ఫుటర్ (తేదీ & రీడ్ మోర్ లింక్) -->
                <div class="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                  <span class="text-slate-400">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </span>

                  <a 
                    href="/news/{item.id}" 
                    class="text-red-600 hover:text-red-700 flex items-center gap-1 group-hover:translate-x-0.5 transition"
                  >
                    <span>పూర్తి కథనం</span>
                    <span>→</span>
                  </a>
                </div>

              </div>
            {/each}
          </div>
        {/if}

      </div>

      <!-- కుడివైపు సైడ్‌బార్ (డిజిటల్ సేవలు & స్పాన్సర్ యాడ్) -->
      <aside class="lg:col-span-4 space-y-4">
        
        <!-- 1. డిజిటల్ సేవా కేంద్రం క్విక్ యాక్సెస్ బాక్స్ -->
        <div class="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white rounded-3xl p-5 shadow-lg space-y-4">
          <div>
            <span class="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">
              డిజిటల్ సేవా కేంద్రం
            </span>
            <h3 class="text-base font-black mt-1">ముఖ్యమైన పౌర & రైతు సేవలు</h3>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs font-bold text-slate-900">
            <a href="/" class="bg-white/95 hover:bg-white p-2.5 rounded-xl shadow-sm transition">
              <span class="block text-red-600">🪪 ఆధార్ సేవలు</span>
              <span class="text-[10px] text-slate-500 font-normal">అప్‌డేట్, ప్రింట్ & బుకింగ్</span>
            </a>

            <a href="/" class="bg-white/95 hover:bg-white p-2.5 rounded-xl shadow-sm transition">
              <span class="block text-emerald-700">🌾 రైతు సేవలు</span>
              <span class="text-[10px] text-slate-500 font-normal">రైతు భరోసా, ఎరువులు</span>
            </a>

            <a href="/" class="bg-white/95 hover:bg-white p-2.5 rounded-xl shadow-sm transition">
              <span class="block text-blue-700">🏛️ భూభారతి / ధరణి</span>
              <span class="text-[10px] text-slate-500 font-normal">పట్టాదారు పాస్‌బుక్, ROR-1B</span>
            </a>

            <a href="/" class="bg-white/95 hover:bg-white p-2.5 rounded-xl shadow-sm transition">
              <span class="block text-purple-700">🗳️ ఓటర్ సేవలు</span>
              <span class="text-[10px] text-slate-500 font-normal">కొత్త ఓటరు, కరెక్షన్లు</span>
            </a>

            <a href="/" class="bg-white/95 hover:bg-white p-2.5 rounded-xl shadow-sm transition">
              <span class="block text-sky-700">🎓 విద్యార్థి సేవలు</span>
              <span class="text-[10px] text-slate-500 font-normal">స్కాలర్‌షిప్స్, జాబ్ పోర్టల్స్</span>
            </a>

            <a href="/" class="bg-white/95 hover:bg-white p-2.5 rounded-xl shadow-sm transition">
              <span class="block text-amber-700">⚡ విద్యుత్ & బిల్లులు</span>
              <span class="text-[10px] text-slate-500 font-normal">కరెంట్ బిల్లులు, రీఛార్జీలు</span>
            </a>

            <a href="/" class="bg-white/95 hover:bg-white p-2.5 rounded-xl shadow-sm transition">
              <span class="block text-rose-700">🏥 ఆరోగ్య / ఇన్సూరెన్స్</span>
              <span class="text-[10px] text-slate-500 font-normal">ఆయుష్మాన్ భారత్, బీమా</span>
            </a>

            <a href="/" class="bg-white/95 hover:bg-white p-2.5 rounded-xl shadow-sm transition">
              <span class="block text-slate-800">🏡 గ్రామ పంచాయతీ</span>
              <span class="text-[10px] text-slate-500 font-normal">అనుమతులు, సర్టిఫికెట్లు</span>
            </a>
          </div>

          <a 
            href="/" 
            class="block w-full text-center bg-slate-950 hover:bg-black text-white text-xs font-black py-2.5 rounded-xl transition shadow"
          >
            అన్ని డిజిటల్ సేవలు చూడండి →
          </a>
        </div>

        <!-- 2. వాణిజ్య ప్రకటన / Sponsor Ad Box -->
        <div class="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-3xl p-5 space-y-3">
          <div class="flex items-center justify-between text-red-600 text-xs font-black">
            <span>📢 వాణిజ్య ప్రకటన / SPONSOR AD</span>
            <span>⭐</span>
          </div>
          
          <h4 class="text-sm font-black text-slate-900">మీ వ్యాపార ప్రకటన ఇక్కడ ఇవ్వండి!</h4>
          <p class="text-xs text-slate-600 leading-relaxed">
            వేలాది మంది పాఠకులు మీ షాప్, వ్యాపారం మరియు సేవల సమాచారాన్ని అతి తక్కువ ధరలోనే చూడగలరు.
          </p>

          <a
            href="https://api.whatsapp.com/send?phone=919989851608&text={encodeURIComponent('నమస్తే NS News, వెబ్‌సైట్‌లో వాణిజ్య ప్రకటన (Ad) ఇవ్వాలనుకుంటున్నాను. వివరాలు తెలియజేయగలరు.')}"
            target="_blank"
            rel="noreferrer"
            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition shadow"
          >
            <span>💬 యాడ్ బుకింగ్ కోసం WhatsApp చేయండి</span>
          </a>
        </div>

        <!-- 3. అత్యవసర హెల్ప్‌లైన్ నంబర్లు -->
        <div class="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 class="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>🚨</span>
              <span>అత్యవసర హెల్ప్‌లైన్ నంబర్లు</span>
            </h4>
            <span class="text-[10px] text-emerald-600 font-bold">24x7 సేవలు</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span class="text-slate-500 block text-[10px]">పోలీస్ కంట్రోల్</span>
              <a href="tel:112" class="text-red-600 font-mono font-black text-sm">112</a>
            </div>

            <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span class="text-slate-500 block text-[10px]">అంబులెన్స్ సర్వీస్</span>
              <a href="tel:108" class="text-emerald-600 font-mono font-black text-sm">108</a>
            </div>

            <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span class="text-slate-500 block text-[10px]">విద్యుత్ సమస్యలు</span>
              <a href="tel:1912" class="text-amber-600 font-mono font-black text-sm">1912</a>
            </div>

            <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span class="text-slate-500 block text-[10px]">సైబర్ క్రైమ్ హెల్ప్‌లైన్</span>
              <a href="tel:1930" class="text-blue-600 font-mono font-black text-sm">1930</a>
            </div>
          </div>
        </div>

      </aside>

    </div>

  </div>

</div>