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

  function shareToWhatsApp(item) {
    const text = `🔴 *${item.title}*\n\n${item.summary}\n\n📍 *${item.location}* | NS లైవ్ అప్‌డేట్స్\nపూర్తిగా చదవండి: https://nexlifynucleus.in/shorts#${item.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }
</script>

<svelte:head>
  <title>NS Shorts - స్పీడ్ న్యూస్ బులెటిన్</title>
</svelte:head>

<div class="max-w-md mx-auto min-h-screen bg-slate-900 flex flex-col pb-16 text-white font-sans selection:bg-red-600 selection:text-white">
  <!-- Top Navigation Header -->
  <header class="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 shadow-md">
    <div class="flex items-center justify-between px-4 py-3">
      <div class="flex items-center gap-2">
        <div class="bg-red-600 text-white font-black text-sm px-2 py-0.5 rounded shadow">NS</div>
        <span class="text-base font-black tracking-wider text-white">SHORTS</span>
        <span class="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping ml-0.5"></span>
      </div>
      <a href="/news" class="text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full transition">
        ← వెబ్‌సైట్
      </a>
    </div>

    <!-- Category Tabs -->
    <div class="flex border-t border-slate-800/80 text-xs font-bold text-center">
      <button 
        class="flex-1 py-2.5 border-b-2 transition {activeLang === 'all' ? 'border-red-500 text-red-500 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        on:click={() => activeLang = 'all'}>
        అన్నీ
      </button>
      <button 
        class="flex-1 py-2.5 border-b-2 transition {activeLang === 'te' ? 'border-red-500 text-red-500 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        on:click={() => activeLang = 'te'}>
        తెలుగు
      </button>
      <button 
        class="flex-1 py-2.5 border-b-2 transition {activeLang === 'en' ? 'border-red-500 text-red-500 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        on:click={() => activeLang = 'en'}>
        English
      </button>
      <button 
        class="flex-1 py-2.5 border-b-2 transition {activeLang === 'hi' ? 'border-red-500 text-red-500 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        on:click={() => activeLang = 'hi'}>
        हिंदी
      </button>
    </div>
  </header>

  <!-- Content Feed -->
  <main class="flex-1 p-3 space-y-6">
    {#if loading}
      <div class="flex flex-col items-center justify-center py-32 space-y-3">
        <div class="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-400 text-xs tracking-wide">తాజా వార్తలు లోడ్ అవుతున్నాయి...</p>
      </div>
    {:else if filteredShorts.length === 0}
      <div class="text-center py-32 text-slate-400 text-sm">
        ఈ విభాగంలో తాజా వార్తలు లేవు.
      </div>
    {:else}
      {#each filteredShorts as item (item.id)}
        <article id="{item.id}" class="bg-[#182337] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 flex flex-col transition hover:border-slate-600">
          
          <!-- Image Section with Brand Watermark -->
          <div class="relative w-full aspect-[16/10] bg-slate-800">
            <img 
              src={item.image_url} 
              alt={item.title} 
              class="w-full h-full object-cover" 
              loading="lazy" 
            />
            
            <!-- Top Right Official Logo Watermark -->
            <div class="absolute top-2.5 right-2.5 bg-red-600/90 backdrop-blur text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow">
              NS LIVE
            </div>

            <!-- Bottom Left Metadata Badge -->
            <div class="absolute bottom-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md text-slate-200 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-2 border border-slate-700/50">
              <span class="text-emerald-400">● {item.location || 'తెలంగాణ'}</span>
              <span class="text-slate-500">|</span>
              <span class="text-slate-300">{item.reporter_name || 'NS Reporter'}</span>
            </div>
          </div>

          <!-- Eenadu Style Bold Red Headline Banner -->
          <div class="bg-red-600 px-4 py-3 shadow-inner">
            <h2 class="text-lg font-black text-white leading-snug tracking-normal">
              {item.title}
            </h2>
          </div>

          <!-- Editorial News Summary Body -->
          <div class="p-4 flex-1 flex flex-col justify-between bg-gradient-to-b from-[#182337] to-[#121b2b]">
            <p class="text-[14.5px] text-slate-100 leading-relaxed font-normal text-justify tracking-normal">
              {item.summary}
            </p>

            <!-- Card Bottom Bar -->
            <div class="mt-4 pt-3.5 border-t border-slate-700/50 flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <span>🗓️</span>
                <span>{new Date(item.created_at).toLocaleDateString('te-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>

              <!-- Share Button -->
              <button 
                on:click={() => shareToWhatsApp(item)}
                class="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-full shadow-md transition transform active:scale-95">
                <span>📲 వాట్సాప్ షేర్</span>
              </button>
            </div>
          </div>

        </article>
      {/each}
    {/if}
  </main>
</div>