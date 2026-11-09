<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { impactColor } from '$lib/magnetNews.js';
  let articles=[];
  let loading=true;
  let message='';
  onMount(async()=>{
    const {data,error}=await supabase.from('ns_magnet_articles')
      .select('id,slug,headline,image_url,points,category,location_town,published_at')
      .eq('status','published').order('published_at',{ascending:false}).limit(60);
    if(error) message='వార్తలను లోడ్ చేయలేకపోయాం.';
    articles=data||[];
    loading=false;
  });
</script>
<svelte:head>
  <title>NS మ్యాగ్నెట్ న్యూస్ | NS NEWS</title>
  <meta name="description" content="NS Magnet News — స్పష్టమైన తెలుగు వార్తలు, ఆరు రంగుల ముఖ్యాంశాలు."/>
</svelte:head>
<div class="min-h-screen bg-slate-100 pb-16 text-slate-900" style="font-family:'Noto Sans Telugu','Nirmala UI',sans-serif">
  <header class="bg-[#0b1120] text-white border-b-4 border-red-600">
    <div class="max-w-6xl mx-auto p-4 flex flex-wrap justify-between items-center gap-3">
      <a href="/news" class="text-sm bg-slate-700 rounded-lg px-3 py-2">← NS NEWS</a>
      <div class="flex gap-2 items-center"><span class="bg-red-600 rounded-md px-2 py-1 font-black">NS</span><strong>మ్యాగ్నెట్ న్యూస్</strong></div>
      <a href="/admin/news/magnet" class="text-sm bg-slate-700 rounded-lg px-3 py-2">Admin Studio</a>
    </div>
  </header>
  <main class="max-w-6xl mx-auto p-4 md:p-7">
    <h1 class="text-2xl font-black mb-2">NS మ్యాగ్నెట్ న్యూస్</h1>
    <p class="text-sm text-slate-500 mb-6">ఫొటోపై ప్రధాన శీర్షిక • ఆకర్షణీయమైన తెలుగు Impact Points • పూర్తి వార్త</p>
    {#if loading}<p>వార్తలు లోడ్ అవుతున్నాయి…</p>
    {:else if message}<p class="rounded-xl bg-white p-5" role="alert">{message}</p>
    {:else if !articles.length}<p class="rounded-xl bg-white p-5">ఇంకా మ్యాగ్నెట్ వార్తలు ప్రచురించలేదు.</p>
    {:else}
      <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {#each articles as a (a.id)}
          <a href="/news/magnet/{a.slug}" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition block group">
            <div class="h-56 relative bg-slate-800">
              {#if a.image_url}<img src={a.image_url} alt={a.headline} loading="lazy" class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"/>{/if}
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent"></div>
              <span class="absolute top-3 left-3 bg-black/80 text-white rounded-lg px-2 py-1 text-xs font-black"><span class="text-red-500">NS</span> NEWS</span>
              <h2 class="absolute bottom-4 left-4 right-4 text-white font-black text-lg leading-8">{a.headline}</h2>
            </div>
            <div class="p-4 space-y-2">
              <p class="text-xs text-slate-500">{a.location_town || 'తెలంగాణ'} • {a.category}</p>
              {#each (a.points||[]).slice(0,2) as point,i}
                <div class="rounded-lg p-2 border-l-4" style:border-color={impactColor(i,a.headline).ink} style:background-color={impactColor(i,a.headline).bg}>
                  <span class="font-bold text-sm" style:color={impactColor(i,a.headline).ink}>{point.title}</span>
                </div>
              {/each}
              <div class="text-red-700 text-sm font-extrabold pt-1">పూర్తి వార్త చదవండి →</div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </main>
</div>