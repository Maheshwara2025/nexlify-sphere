<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let clips = [];
  let loading = true;

  onMount(async () => {
    const { data } = await supabase
      .from('paper_clips')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) clips = data;
    loading = false;
  });
</script>

<svelte:head>
  <title>NS News ఈ-పేపర్ క్లిప్పింగ్స్ | తాజా పత్రికా ప్రకటనలు</title>
</svelte:head>

<div class="min-h-screen bg-slate-100 font-sans">
  <header class="bg-white border-b py-3 px-4 shadow-sm sticky top-0 z-30">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <a href="/" class="text-red-600 font-black text-lg">NS News ఈ-పేపర్ క్లిప్పింగ్స్</a>
      <a href="/" class="text-xs bg-slate-100 border px-3 py-1.5 rounded-lg font-bold">🏠 హోమ్</a>
    </div>
  </header>

  <main class="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
    <div class="border-b pb-3">
      <h1 class="text-xl sm:text-2xl font-black text-slate-900">📰 స్థానిక పత్రికా క్లిప్పింగ్స్</h1>
      <p class="text-xs text-slate-500 mt-1">ముత్తారం, మంథని, పెద్దపల్లి ప్రాంతాల ముఖ్య వార్తా కథనాలు</p>
    </div>

    {#if loading}
      <div class="text-center py-20 text-slate-400">లోడ్ అవుతోంది...</div>
    {:else if clips.length === 0}
      <div class="text-center py-16 bg-white rounded-2xl border border-dashed text-slate-500 text-sm">
        ఇంకా ఎలాంటి పేపర్ క్లిప్పింగ్స్ అప్‌లోడ్ చేయలేదు. 
        <br />
        <a href="/admin/clips" class="text-red-600 font-bold underline mt-2 inline-block">ఇక్కడ క్లిక్ చేసి అప్‌లోడ్ చేయండి</a>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {#each clips as clip}
          <a href="/clip/{clip.id}" class="bg-white rounded-2xl border p-3 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
            <div class="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden mb-3 border">
              <img src={clip.image_url} alt={clip.title} class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            </div>
            <div>
              <span class="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full">
                {clip.newspaper_name} • {clip.clip_date}
              </span>
              <h2 class="text-xs font-bold text-slate-900 mt-1.5 line-clamp-2 leading-snug">
                {clip.title}
              </h2>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </main>
</div>