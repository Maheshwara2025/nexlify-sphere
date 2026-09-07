<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let shorts = [];
  let loading = true;
  let activeLang = 'all';
  let currentIndex = 0;
  let activeMediaIndex = 1; // మల్టిపుల్ ఇమేజెస్ స్విచ్ చేయడానికి (1 or 2)

  onMount(async () => {
    const { data, error } = await supabase
      .from('shorts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      shorts = data;
    }
    loading = false;
  });

  $: filteredShorts = (shorts || []).filter(s => activeLang === 'all' || s.language === activeLang);
  $: currentItem = filteredShorts.length > 0 && currentIndex < filteredShorts.length ? filteredShorts[currentIndex] : null;

  // వార్త మారినప్పుడల్లా మొదటి ఫోటోకు రీసెట్ చేయడం
  $: if (currentItem) {
    activeMediaIndex = 1;
  }

  function nextNews() {
    if (currentIndex < filteredShorts.length - 1) {
      currentIndex++;
    }
  }

  function prevNews() {
    if (currentIndex > 0) {
      currentIndex--;
    }
  }

  // యూట్యూబ్ లింక్ నుండి ఎంబెడ్ URL పొందడం
  function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('shorts/')) {
      videoId = url.split('shorts/')[1]?.split('?')[0];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  async function downloadNewsImage(item) {
    const targetUrl = (activeMediaIndex === 2 && item.image_url_2) ? item.image_url_2 : item.image_url;
    if (!targetUrl) return;

    try {
      const response = await fetch(targetUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NS-News-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      window.open(targetUrl, '_blank');
    }
  }

  async function shareWithImage(item) {
    const shareText = `*${item.title}*\n\n${item.summary}\n\n📍 *${item.location || 'తెలంగాణ'}* | NS LIVE\nపూర్తి వివరాలు: https://nexlifynucleus.in/shorts`;
    const targetUrl = item.image_url;

    if (navigator.share && targetUrl) {
      try {
        const response = await fetch(targetUrl);
        const blob = await response.blob();
        const file = new File([blob], 'NS_News.jpg', { type: blob.type || 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            text: shareText
          });
          return;
        }
      } catch (err) {
        console.log('Mobile share fallback');
      }
    }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  }
</script>

<svelte:head>
  <title>NS Shorts - స్పీడ్ న్యూస్</title>
  <!-- విభిన్న భాషల Google Fonts లోడింగ్ -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mandali&family=Noto+Sans+Devanagari:wght@400;700&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
</svelte:head>

<!-- మెయిన్ కంటైనర్ (ఆహ్లాదకరమైన లైట్ బ్యాక్‌గ్రౌండ్) -->
<div class="w-full min-h-screen bg-slate-200/70 flex flex-col items-center p-0 sm:p-4 font-sans text-slate-900">
  
  <div class="w-full max-w-md flex flex-col h-full sm:min-h-[92vh]">
    
    <!-- హెడర్ -->
    <header class="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 sm:rounded-t-2xl shadow-sm">
      <div class="flex items-center gap-2">
        <span class="bg-red-600 text-white font-black text-xs px-2 py-0.5 rounded shadow-sm">NS</span>
        <span class="text-sm font-black tracking-wider text-slate-900">SHORTS</span>
      </div>
      
      <!-- భాషల ఫిల్టర్ & సంఖ్య -->
      <div class="flex items-center gap-2">
        <div class="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
          <button on:click={() => { activeLang = 'all'; currentIndex = 0; }} class="px-2 py-0.5 rounded {activeLang === 'all' ? 'bg-white shadow text-red-600' : 'text-slate-600'}">అన్నీ</button>
          <button on:click={() => { activeLang = 'te'; currentIndex = 0; }} class="px-2 py-0.5 rounded {activeLang === 'te' ? 'bg-white shadow text-red-600' : 'text-slate-600'}">తెలుగు</button>
          <button on:click={() => { activeLang = 'en'; currentIndex = 0; }} class="px-2 py-0.5 rounded {activeLang === 'en' ? 'bg-white shadow text-red-600' : 'text-slate-600'}">EN</button>
        </div>
        <span class="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-bold border border-slate-200">
          {filteredShorts.length > 0 ? `${currentIndex + 1}/${filteredShorts.length}` : '0'}
        </span>
      </div>
    </header>

    <!-- కార్డ్ ఏరియా -->
    <main class="flex-1 p-2 sm:p-0 flex flex-col justify-start my-auto">
      {#if loading}
        <div class="py-32 flex flex-col items-center justify-center space-y-3">
          <div class="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-slate-500 font-bold">వార్త లోడ్ అవుతోంది...</p>
        </div>
      {:else if !currentItem}
        <div class="py-32 text-center text-slate-500 text-sm font-bold bg-white rounded-2xl shadow-sm border border-slate-200 m-2">
          వార్తలు అందుబాటులో లేవు.
        </div>
      {:else}
        
        <!-- AUTO-FIT CARD -->
        <article class="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-200 flex flex-col h-auto">
          
          <!-- మీడియా సెక్షన్ (యూట్యూబ్ వీడియో లేదా ఫోటోలు) -->
          {#if currentItem.youtube_url && getYouTubeEmbedUrl(currentItem.youtube_url)}
            <div class="relative w-full aspect-video bg-black shrink-0">
              <iframe 
                src={getYouTubeEmbedUrl(currentItem.youtube_url)} 
                title={currentItem.title}
                class="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
              ></iframe>
            </div>
          {:else}
            <!-- ఫోటో వ్యూవర్ (కట్ అవ్వకుండా 100% ఆటో-హైట్) -->
            <div class="relative w-full overflow-hidden shrink-0 bg-slate-950">
              <img 
                src={activeMediaIndex === 2 && currentItem.image_url_2 ? currentItem.image_url_2 : currentItem.image_url} 
                alt={currentItem.title} 
                class="w-full h-auto block object-contain" 
              />
              
              <div class="absolute top-3 left-3 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow">
                NS LIVE
              </div>

              <!-- రెండవ ఫోటో ఉంటే స్విచ్ బటన్లు -->
              {#if currentItem.image_url_2}
                <div class="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2 py-1 rounded-full">
                  <button 
                    type="button"
                    on:click={() => activeMediaIndex = 1} 
                    class="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition {activeMediaIndex === 1 ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}">
                    1
                  </button>
                  <button 
                    type="button"
                    on:click={() => activeMediaIndex = 2} 
                    class="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition {activeMediaIndex === 2 ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}">
                    2
                  </button>
                </div>
              {/if}

              <div class="absolute bottom-2.5 left-3 bg-black/75 backdrop-blur text-white px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 shadow">
                <span class="text-amber-400 font-bold">📍 {currentItem.location || 'తెలంగాణ'}</span>
                <span>•</span>
                <span>{currentItem.reporter_name || 'NS Reporter'}</span>
              </div>
            </div>
          {/if}

          <!-- శీర్షిక (భాషను బట్టి ప్రత్యేక ఫాంట్) -->
          <div class="px-4 pt-3.5 pb-2 border-b border-slate-100">
            <h2 class="text-base sm:text-[17px] font-black text-slate-900 leading-snug tracking-tight"
                style="font-family: {currentItem.language === 'te' ? `'Mandali', sans-serif` : currentItem.language === 'hi' ? `'Noto Sans Devanagari', sans-serif` : `'Plus Jakarta Sans', sans-serif`};">
              {currentItem.title}
            </h2>
          </div>

          <!-- వార్త బాడీ -->
          <div class="px-4 py-3">
            <p class="text-[14px] sm:text-[14.5px] text-slate-800 leading-relaxed font-normal whitespace-pre-line text-justify"
               style="font-family: {currentItem.language === 'te' ? `'Mandali', sans-serif` : currentItem.language === 'hi' ? `'Noto Sans Devanagari', sans-serif` : `'Plus Jakarta Sans', sans-serif`};">
              {currentItem.summary}
            </p>
          </div>

          <!-- ఫుటర్ & షేరింగ్ బటన్లు -->
          <div class="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span class="text-xs font-semibold text-slate-400">
              {currentItem.created_at ? new Date(currentItem.created_at).toLocaleDateString('te-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
            </span>

            <div class="flex items-center gap-2">
              <button 
                type="button"
                on:click={() => downloadNewsImage(currentItem)}
                class="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-full transition shadow-sm">
                <span>📥 ఫోటో</span>
              </button>

              <button 
                type="button"
                on:click={() => shareWithImage(currentItem)}
                class="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow transition active:scale-95">
                <span>📲 వాట్సాప్</span>
              </button>
            </div>
          </div>

        </article>

      {/if}
    </main>

    <!-- నావిగేషన్ బటన్లు -->
    <footer class="bg-white border-t border-slate-200 p-2.5 flex items-center justify-between shrink-0 sm:rounded-b-2xl shadow-sm mt-auto">
      <button 
        type="button"
        on:click={prevNews} 
        disabled={currentIndex === 0}
        class="flex-1 mr-2 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 border border-slate-300">
        <span>⬅ మునుపటి వార్త</span>
      </button>
      <button 
        type="button"
        on:click={nextNews} 
        disabled={currentIndex >= filteredShorts.length - 1}
        class="flex-1 ml-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 shadow">
        <span>తర్వాతి వార్త ➡</span>
      </button>
    </footer>

  </div>
</div>