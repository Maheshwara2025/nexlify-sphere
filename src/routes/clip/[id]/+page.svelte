<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let clip = null;
  let loading = true;

  onMount(async () => {
    const clipId = $page.params.id;
    const { data } = await supabase
      .from('paper_clips')
      .select('*')
      .eq('id', clipId)
      .single();

    clip = data;
    loading = false;
  });

  function shareWhatsApp() {
    if (!clip) return;
    const shareText = `*${clip.title}*\n\n📰 పత్రిక: ${clip.newspaper_name} (${clip.page_number})\n📅 తేదీ: ${clip.clip_date}\n\nపూర్తి పేపర్ క్లిప్ ఇక్కడ చదవండి:\n👉 https://nexlifynucleus.in/clip/${clip.id}\n\n_A.S.V. Enterprises & NS News, ముత్తారం_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  }
</script>

<svelte:head>
  {#if clip}
    <title>{clip.title} | {clip.newspaper_name} - NS News</title>
    <meta property="og:title" content="{clip.title} | {clip.newspaper_name}" />
    <meta property="og:description" content="{clip.newspaper_name} ({clip.page_number}) - తేదీ: {clip.clip_date}. ముత్తారం మండల వార్తా కథనం." />
    <meta property="og:image" content="{clip.image_url}" />
    <meta property="og:image:secure_url" content="{clip.image_url}" />
  {/if}
</svelte:head>

<div class="min-h-screen bg-slate-100 flex flex-col font-sans">
  <header class="bg-white border-b py-3 px-4 shadow-sm sticky top-0 z-30">
    <div class="max-w-3xl mx-auto flex items-center justify-between">
      <a href="/" class="text-red-600 font-black text-lg">NS News ఈ-పేపర్</a>
      <a href="/" class="text-xs bg-slate-100 border px-3 py-1.5 rounded-lg font-bold">హోమ్ పేజీ</a>
    </div>
  </header>

  <main class="max-w-2xl mx-auto p-4 flex-grow w-full space-y-4">
    {#if loading}
      <div class="text-center py-20 text-slate-400">పేపర్ క్లిప్ లోడ్ అవుతోంది...</div>
    {:else if clip}
      <div class="bg-white rounded-3xl p-5 shadow-sm border space-y-4">
        <div>
          <span class="bg-red-50 text-red-600 text-[11px] font-bold px-2.5 py-1 rounded-full">
            {clip.newspaper_name} • {clip.page_number} • {clip.clip_date}
          </span>
          <h1 class="text-xl sm:text-2xl font-black text-slate-900 mt-2 leading-snug">
            {clip.title}
          </h1>
        </div>

        <!-- Paper Clip Image -->
        <div class="border rounded-2xl overflow-hidden bg-slate-50 flex justify-center">
          <img src={clip.image_url} alt={clip.title} class="w-full h-auto object-contain max-h-[80vh]" />
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button on:click={shareWhatsApp} class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow">
            <span>📲 WhatsApp లో షేర్</span>
          </button>
          <a href={clip.image_url} download target="_blank" class="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm text-center shadow">
            <span>⬇️ డౌన్‌లోడ్ చేయండి</span>
          </a>
        </div>
      </div>

      <!-- Shop Branding Card -->
      <div class="bg-gradient-to-r from-red-600 to-amber-600 text-white p-5 rounded-2xl shadow text-center space-y-1">
        <h3 class="font-black text-base">A.S.V. ENTERPRISES — ముత్తారం బస్ స్టాండ్</h3>
        <p class="text-xs text-amber-100">డిజిటల్ సేవలు, ప్రభుత్వ పథకాల దరఖాస్తు, కలర్ ప్రింటింగ్ & జెరాక్స్ కొరకు సంప్రదించండి: 9949122402</p>
      </div>
    {/if}
  </main>
</div>