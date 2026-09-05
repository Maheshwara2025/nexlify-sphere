<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let shorts = [];
  let loading = true;
  let activeLang = 'all';

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

  // ఇమేజ్ మరియు టెక్స్ట్‌తో సహా వాట్సాప్ షేర్ చేయడం
  async function shareCard(item) {
    const shareText = `*${item.title}*\n\n${item.summary}\n\n📍 *${item.location}* | NS LIVE\nపూర్తిగా చదవండి: https://nexlifynucleus.in/shorts#${item.id}`;

    // మొబైల్ బ్రౌజర్లలో ఫైల్ షేరింగ్ సపోర్ట్ ఉంటే ఇమేజ్ తో సహా వాట్సాప్ ఓపెన్ అవుతుంది
    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(item.image_url);
        const blob = await response.blob();
        const file = new File([blob], 'news.jpg', { type: blob.type || 'image/jpeg' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: item.title,
            text: shareText,
            files: [file]
          });
          return;
        }
      } catch (err) {
        console.log('Direct image share fallback');
      }
    }

    // ఫాల్‌బ్యాక్: సాధారణ వాట్సాప్ వెబ్ లింక్
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  }
</script>

<svelte:head>
  <title>NS Shorts - వేగవంతమైన వార్తలు</title>
</svelte:head>

<div class="max-w-md mx-auto min-h-screen bg-slate-100 flex flex-col pb-16 font-sans">
  <!-- Clean Header -->
  <header class="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
    <div class="flex items-center justify-between px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="bg-red-600 text-white font-black text-sm px-2 py-0.5 rounded shadow-sm">NS</span>
        <span class="text-base font-extrabold tracking-tight text-gray-900">SHORTS</span>
      </div>
      <a href="/news" class="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition">
        ← వెబ్‌సైట్
      </a>
    </div>

    <!-- Category Filter -->
    <div class="flex border-t border-gray-100 text-xs font-bold text-center">
      <button 
        class="flex-1 py-2.5 border-b-2 transition {activeLang === 'all' ? 'border-red-600 text-red-600 font-extrabold bg-red-50/50' : 'border-transparent text-gray-500'}"
        on:click={() => activeLang = 'all'}>
        అన్నీ
      </button>
      <button 
        class="flex-1 py-2.5 border-b-2 transition {activeLang === 'te' ? 'border-red-600 text-red-600 font-extrabold bg-red-50/50' : 'border-transparent text-gray-500'}"
        on:click={() => activeLang = 'te'}>
        తెలుగు
      </button>
      <button 
        class="flex-1 py-2.5 border-b-2 transition {activeLang === 'en' ? 'border-red-600 text-red-600 font-extrabold bg-red-50/50' : 'border-transparent text-gray-500'}"
        on:click={() => activeLang = 'en'}>
        English
      </button>
      <button 
        class="flex-1 py-2.5 border-b-2 transition {activeLang === 'hi' ? 'border-red-600 text-red-600 font-extrabold bg-red-50/50' : 'border-transparent text-gray-500'}"
        on:click={() => activeLang = 'hi'}>
        हिंदी
      </button>
    </div>
  </header>

  <!-- Feed Cards -->
  <main class="flex-1 p-3.5 space-y-5">
    {#if loading}
      <div class="flex flex-col items-center justify-center py-32 space-y-2">
        <div class="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-gray-500 text-xs">వార్తలు లోడ్ అవుతున్నాయి...</p>
      </div>
    {:else if filteredShorts.length === 0}
      <div class="text-center py-32 text-gray-400 text-sm">
        ఈ విభాగంలో తాజా వార్తలు లేవు.
      </div>
    {:else}
      {#each filteredShorts as item (item.id)}
        <article id="{item.id}" class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200/90 flex flex-col transition hover:shadow-md">
          
          <!-- Image Box with Badge -->
          <div class="relative w-full aspect-[16/10] bg-gray-100 overflow-hidden">
            <img 
              src={item.image_url} 
              alt={item.title} 
              class="w-full h-full object-cover" 
              loading="lazy" 
            />

            <div class="absolute top-3 left-3 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow">
              NS LIVE
            </div>

            <div class="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-2">
              <span class="text-yellow-300 font-bold">📍 {item.location || 'తెలంగాణ'}</span>
              <span>•</span>
              <span class="text-gray-200">{item.reporter_name || 'NS Desk'}</span>
            </div>
          </div>

          <!-- Headline (Pure Professional Typography) -->
          <div class="px-4 pt-3.5 pb-1">
            <h2 class="text-[17px] font-black text-gray-950 leading-snug tracking-tight">
              {item.title}
            </h2>
          </div>

          <!-- News Body -->
          <div class="px-4 py-2.5 flex-1">
            <p class="text-[14px] text-gray-700 leading-relaxed font-normal text-justify">
              {item.summary}
            </p>
          </div>

          <!-- Bottom Meta & Action Bar -->
          <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span class="text-[11px] font-semibold text-gray-400">
              {new Date(item.created_at).toLocaleDateString('te-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>

            <button 
              on:click={() => shareCard(item)}
              class="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm transition active:scale-95">
              <span>📲 వాట్సాప్ షేర్</span>
            </button>
          </div>

        </article>
      {/each}
    {/if}
  </main>
</div>