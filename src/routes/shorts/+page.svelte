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

  async function downloadNewsImage(item) {
    try {
      const response = await fetch(item.image_url);
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
      window.open(item.image_url, '_blank');
    }
  }

  async function shareWithImage(item) {
    const shareText = `*${item.title}*\n\n${item.summary}\n\n📍 *${item.location}* | NS LIVE\nపూర్తి వివరాలు: https://nexlifynucleus.in/shorts`;

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
        console.log('Falling back to standard WhatsApp URL');
      }
    }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  }
</script>

<svelte:head>
  <title>NS Shorts - స్పీడ్ న్యూస్</title>
</svelte:head>

<!-- మెయిన్ కంటైనర్ -->
<div class="w-full min-h-screen bg-slate-950 flex flex-col items-center p-0 sm:p-4 font-sans text-slate-100">
  
  <div class="w-full max-w-lg flex flex-col h-full sm:min-h-[90vh]">
    
    <!-- హెడర్ -->
    <header class="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 sm:rounded-t-2xl">
      <div class="flex items-center gap-2">
        <span class="bg-red-600 text-white font-black text-xs px-2 py-0.5 rounded">NS</span>
        <span class="text-sm font-black tracking-wider text-white">SHORTS</span>
      </div>
      
      <div class="flex items-center gap-2">
        <span class="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-bold">
          {filteredShorts.length > 0 ? `${currentIndex + 1} / ${filteredShorts.length}` : '0'}
        </span>
        <a href="/news" class="text-xs text-slate-400 hover:text-white font-semibold">
          వెబ్‌సైట్ →
        </a>
      </div>
    </header>

    <!-- కార్డ్ ఏరియా -->
    <main class="flex-1 p-2.5 sm:p-0 flex flex-col justify-start">
      {#if loading}
        <div class="py-32 flex flex-col items-center justify-center space-y-3">
          <div class="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-slate-400">వార్త లోడ్ అవుతోంది...</p>
        </div>
      {:else if !currentItem}
        <div class="py-32 text-center text-slate-400 text-sm">
          వార్తలు అందుబాటులో లేవు.
        </div>
      {:else}
        
        <!-- AUTO-FIT CARD -->
        <article class="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-200 flex flex-col h-auto my-auto">
          
          <!-- ఫోటో బ్యానర్: object-contain తో ఫోటో కట్ అవ్వకుండా సహజంగా కనిపిస్తుంది -->
          <!-- ఫోటో బ్యానర్: సైడ్స్ ఖాళీ లేకుండా కార్డ్ వెడల్పు మొత్తం కవర్ అయ్యేలా -->
          <div class="relative w-full overflow-hidden shrink-0 bg-slate-950">
            <img 
              src={currentItem.image_url} 
              alt={currentItem.title} 
              class="w-full aspect-[4/3] sm:aspect-[16/10] object-cover object-top" 
            />
            <div class="absolute top-3 left-3 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow">
              NS LIVE
            </div>
            <div class="absolute bottom-2.5 left-3 bg-black/75 backdrop-blur text-white px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 shadow">
              <span class="text-yellow-400 font-bold">📍 {currentItem.location || 'తెలంగాణ'}</span>
              <span>•</span>
              <span>{currentItem.reporter_name || 'NS Reporter'}</span>
            </div>
          </div>

          <!-- శీర్షిక -->
          <div class="px-4 pt-3.5 pb-2 border-b border-slate-100">
            <h2 class="text-base sm:text-lg font-black text-slate-950 leading-snug tracking-tight">
              {currentItem.title}
            </h2>
          </div>

          <!-- వార్త బాడీ -->
          <div class="px-4 py-3">
            <p class="text-[14px] sm:text-[14.5px] text-slate-800 leading-relaxed font-normal whitespace-pre-line text-justify">
              {currentItem.summary}
            </p>
          </div>

          <!-- ఫుటర్ -->
          <div class="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span class="text-xs font-semibold text-slate-400">
              {new Date(currentItem.created_at).toLocaleDateString('te-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>

            <div class="flex items-center gap-2">
              <button 
                on:click={() => downloadNewsImage(currentItem)}
                class="flex items-center gap-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full transition">
                <span>📥 ఫోటో</span>
              </button>

              <button 
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
    <footer class="bg-slate-900 border-t border-slate-800 p-2.5 flex items-center justify-between shrink-0 sm:rounded-b-2xl mt-auto">
      <button 
        on:click={prevNews} 
        disabled={currentIndex === 0}
        class="flex-1 mr-2 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-25 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1">
        <span>⬅ మునుపటి వార్త</span>
      </button>
      <button 
        on:click={nextNews} 
        disabled={currentIndex >= filteredShorts.length - 1}
        class="flex-1 ml-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-25 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1">
        <span>తర్వాతి వార్త ➡</span>
      </button>
    </footer>

  </div>
</div>