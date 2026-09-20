<script>
  import { supabase } from '$lib/supabaseClient';

  let clips = [];
  let loading = true;
  let searchQuery = '';

  async function loadAllClips() {
    loading = true;
    const { data, error } = await supabase
      .from('paper_clips')
      .select('*')
      .order('clip_date', { ascending: false });

    if (!error && data) {
      clips = data;
    }
    loading = false;
  }

  loadAllClips();

  // Filter clips based on search input
  $: filteredClips = clips.filter(clip => 
    clip.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clip.newspaper_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
</script>

<svelte:head>
  <title>E-Paper Clips | తాజా వార్తా క్లిప్పింగ్స్</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
  <div class="max-w-6xl mx-auto space-y-6">

    <!-- Header Section -->
    <div class="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <a href="/" class="text-xs font-bold text-blue-600 hover:underline mb-1 inline-block">← హోమ్ పేజీకి వెళ్లండి</a>
        <h1 class="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2">
          📰 తాజా ఈ-పేపర్ క్లిప్పింగ్స్
        </h1>
        <p class="text-xs md:text-sm text-slate-500 mt-1">
          దినపత్రికల్లో ప్రచురితమైన ముఖ్య వార్తా కథనాల సమాహారం
        </p>
      </div>

      <!-- Search Box -->
      <div class="w-full md:w-72">
        <input 
          type="text" 
          bind:value={searchQuery}
          placeholder="వార్త లేదా పత్రిక పేరు వెతకండి..." 
          class="w-full border rounded-xl px-3.5 py-2.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition"
        />
      </div>
    </div>

    <!-- Clips Content Area -->
    {#if loading}
      <div class="text-center py-20 text-slate-500 text-sm font-medium">
        పేపర్ క్లిప్పింగ్స్ లోడ్ అవుతున్నాయి...
      </div>
    {:else if filteredClips.length === 0}
      <div class="bg-white rounded-2xl p-12 text-center border text-slate-500 text-sm">
        ఎలాంటి క్లిప్పింగ్స్ లభించలేదు.
      </div>
    {:else}
      <!-- Clips Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {#each filteredClips as item}
          <div class="bg-white rounded-2xl border shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between">
            <div>
              <a href="/clip/{item.id}" target="_blank" class="block aspect-[4/3] bg-slate-100 overflow-hidden group">
                <img 
                  src={item.image_url} 
                  alt={item.title} 
                  class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </a>
              <div class="p-4 space-y-2">
                <div class="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span class="bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-bold">{item.newspaper_name}</span>
                  <span>{item.page_number}</span>
                </div>
                <h2 class="text-sm font-bold text-slate-900 line-clamp-2 leading-snug hover:text-red-600 transition">
                  <a href="/clip/{item.id}" target="_blank">{item.title}</a>
                </h2>
              </div>
            </div>

            <!-- Footer Action -->
            <div class="px-4 pb-4 pt-1 border-t border-slate-100 flex items-center justify-between mt-2">
              <span class="text-[11px] text-slate-400 font-semibold">{item.clip_date}</span>
              <a 
                href="/clip/{item.id}" 
                target="_blank" 
                class="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                చదవండి ➡
              </a>
            </div>
          </div>
        {/each}
      </div>
    {/if}

  </div>
</div>