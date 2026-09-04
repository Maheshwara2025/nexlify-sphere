<script>
  export let data;
  let activeLang = 'all'; // 'all', 'te', 'en', 'hi'

  // భాష ఆధారంగా వార్తలను ఫిల్టర్ చేయడం
  $: filteredShorts = activeLang === 'all' 
    ? data.shorts 
    : data.shorts.filter(s => s.language === activeLang);

  // WhatsApp డైరెక్ట్ షేరింగ్ ఫంక్షన్
  function shareToWhatsApp(item) {
    const text = `*${item.title}*\n\n${item.summary}\n\nపూర్తి వివరాల కోసం క్లిక్ చేయండి: https://nexlifynucleus.in/shorts#${item.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }
</script>

<svelte:head>
  <title>NS Shorts - త్వరిత వార్తలు</title>
</svelte:head>

<div class="max-w-md mx-auto min-h-screen bg-gray-100 flex flex-col pb-16">
  <!-- టాప్ హెడర్ & లాంగ్వేజ్ ఫిల్టర్స్ -->
  <header class="sticky top-0 z-30 bg-white border-b shadow-sm">
    <div class="flex items-center justify-between px-4 py-3">
      <h1 class="text-lg font-black tracking-tight text-red-600 flex items-center gap-1">
        <span class="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs">NS</span> SHORTS
      </h1>
      <a href="/news" class="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200">
        ← మెయిన్ న్యూస్
      </a>
    </div>

    <!-- భాషల ఎంపిక ట్యాబ్‌లు -->
    <div class="flex border-t text-xs font-medium text-center">
      <button 
        class="flex-1 py-2 border-b-2 {activeLang === 'all' ? 'border-red-600 text-red-600 font-bold' : 'border-transparent text-gray-500'}"
        on:click={() => activeLang = 'all'}>
        అన్నీ
      </button>
      <button 
        class="flex-1 py-2 border-b-2 {activeLang === 'te' ? 'border-red-600 text-red-600 font-bold' : 'border-transparent text-gray-500'}"
        on:click={() => activeLang = 'te'}>
        తెలుగు
      </button>
      <button 
        class="flex-1 py-2 border-b-2 {activeLang === 'en' ? 'border-red-600 text-red-600 font-bold' : 'border-transparent text-gray-500'}"
        on:click={() => activeLang = 'en'}>
        English
      </button>
      <button 
        class="flex-1 py-2 border-b-2 {activeLang === 'hi' ? 'border-red-600 text-red-600 font-bold' : 'border-transparent text-gray-500'}"
        on:click={() => activeLang = 'hi'}>
        हिंदी
      </button>
    </div>
  </header>

  <!-- షార్ట్స్ ఫీడ్ (Way2News తరహా కార్డ్స్) -->
  <main class="flex-1 p-3 space-y-4">
    {#if filteredShorts.length === 0}
      <div class="text-center py-20 text-gray-500 text-sm">
        ఈ విభాగంలో వార్తలు లేవు.
      </div>
    {:else}
      {#each filteredShorts as item (item.id)}
        <article id="{item.id}" class="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col">
          <!-- ఇమేజ్ & రిపోర్టర్ బ్యాడ్జ్ -->
          <div class="relative w-full aspect-video bg-gray-200">
            <img 
              src={item.image_url} 
              alt={item.title} 
              class="w-full h-full object-cover" 
              loading="lazy" 
            />
            <div class="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-[11px] flex items-center gap-1.5">
              <span>👤 {item.reporter_name}</span>
              <span>•</span>
              <span class="text-yellow-400 font-semibold">{item.location}</span>
            </div>
          </div>

          <!-- వార్త బాడీ -->
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h2 class="text-base font-bold text-gray-900 leading-snug mb-2">
                {item.title}
              </h2>
              <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {item.summary}
              </p>
            </div>

            <!-- షేరింగ్ బటన్స్ -->
            <div class="mt-4 pt-3 border-t flex items-center justify-between gap-2">
              <span class="text-[11px] text-gray-400">
                {new Date(item.created_at).toLocaleDateString('te-IN', { month: 'short', day: 'numeric' })}
              </span>
              <button 
                on:click={() => shareToWhatsApp(item)}
                class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                <span>📲 వాట్సాప్‌లో షేర్</span>
              </button>
            </div>
          </div>
        </article>
      {/each}
    {/if}
  </main>
</div>