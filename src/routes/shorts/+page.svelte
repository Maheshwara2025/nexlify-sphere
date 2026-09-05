<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let shorts = [];
  let loading = true;
  let activeLang = 'all';
  let currentIndex = 0;

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

  $: filteredShorts = activeLang === 'all' 
    ? shorts 
    : shorts.filter(s => s.language === activeLang);

  $: currentItem = filteredShorts[currentIndex] || null;

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

  // మొబైల్ బ్రౌజర్ల ద్వారా ఇమేజ్ ఫైల్‌తో వాట్సాప్‌కు షేర్ చేయడం
  async function shareWithImage(item) {
    const shareText = `*${item.title}*\n\n${item.summary}\n\n📍 *${item.location}* | NS LIVE\nపూర్తిగా చదవండి: https://nexlifynucleus.in/shorts`;

    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(item.image_url);
        const blob = await response.blob();
        const file = new File([blob], 'news_image.jpg', { type: blob.type || 'image/jpeg' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: item.title,
            text: shareText,
            files: [file]
          });
          return;
        }
      } catch (err) {
        console.log('Fallback to text share');
      }
    }

    // ఫాల్‌బ్యాక్
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  }
</script>

<svelte:head>
  <title>NS Shorts - స్పీడ్ న్యూస్</title>
</svelte:head>

<div class="max-w-md mx-auto h-screen bg-slate-950 flex flex-col font-sans overflow-hidden text-slate-100">
  
  <!-- Header -->
  <header class="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-2">
      <span class="bg-red-600 text-white font-black text-xs px-2 py-0.5 rounded">NS</span>
      <span class="text-sm font-black tracking-wider">SHORTS</span>
    </div>
    
    <div class="flex items-center gap-2">
      <span class="text-[11px] text-slate-400 font-bold">
        {filteredShorts.length > 0 ? `${currentIndex + 1} / ${filteredShorts.length}` : '0'}
      </span>
      <a href="/news" class="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-bold">
        వెబ్‌సైట్
      </a>
    </div>
  </header>

  <!-- Content Screen -->
  <main class="flex-1 flex flex-col justify-between p-3 overflow-y-auto">
    {#if loading}
      <div class="flex-1 flex flex-col items-center justify-center space-y-3">
        <div class="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs text-slate-400">వార్త లోడ్ అవుతోంది...</p>
      </div>
    {:else if !currentItem}
      <div class="flex-1 flex items-center justify-center text-slate-400 text-sm">
        వార్తలు అందుబాటులో లేవు.
      </div>
    {:else}
      <!-- Single Full Card Presentation -->
      <article class="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col h-full max-h-[82vh]">
        
        <!-- Big Photo Banner -->
        <div class="relative w-full h-56 bg-slate-100 shrink-0 overflow-hidden">
          <img 
            src={currentItem.image_url} 
            alt={currentItem.title} 
            class="w-full h-full object-cover" 
          />
          <div class="absolute top-3 left-3 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow">
            NS LIVE
          </div>
          <div class="absolute bottom-2.5 left-3 bg-black/70 backdrop-blur text-white px-2.5 py-1 rounded-md text-[11px] font-medium">
            <span class="text-yellow-400 font-bold">📍 {currentItem.location || 'తెలంగాణ'}</span>
            <span> • </span>
            <span>{currentItem.reporter_name || 'NS Reporter'}</span>
          </div>
        </div>

        <!-- Headline Area -->
        <div class="px-4 pt-3 pb-2 border-b border-slate-100 shrink-0">
          <h2 class="text-lg font-black text-slate-950 leading-snug tracking-tight">
            {currentItem.title}
          </h2>
        </div>

        <!-- Summary Description (Scrollable if lengthy) -->
        <div class="p-4 flex-1 overflow-y-auto">
          <p class="text-[14.5px] text-slate-800 leading-relaxed font-normal whitespace-pre-line text-justify">
            {currentItem.summary}
          </p>
        </div>

        <!-- Card Footer -->
        <div class="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span class="text-[11px] font-bold text-slate-400">
            {new Date(currentItem.created_at).toLocaleDateString('te-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>

          <button 
            on:click={() => shareWithImage(currentItem)}
            class="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow transition active:scale-95">
            <span>📲 వాట్సాప్ షేర్</span>
          </button>
        </div>

      </article>
    {/if}
  </main>

  <!-- Bottom Navigation Buttons (Prev / Next) -->
  <footer class="bg-slate-900 border-t border-slate-800 p-2.5 flex items-center justify-between shrink-0">
    <button 
      on:click={prevNews} 
      disabled={currentIndex === 0}
      class="flex-1 mr-2 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1">
      <span>⬅ మునుపటి వార్త</span>
    </button>
    <button 
      on:click={nextNews} 
      disabled={currentIndex >= filteredShorts.length - 1}
      class="flex-1 ml-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:hover:bg-red-600 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1">
      <span>తర్వాతి వార్త ➡</span>
    </button>
  </footer>

</div>