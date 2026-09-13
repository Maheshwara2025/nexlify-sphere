<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let article = null;
  let loading = true;
  let errorMsg = '';
  let fontSizeLevel = 1;

  const fontSizes = [
    'text-[15px] sm:text-[16px] leading-relaxed',
    'text-[17px] sm:text-[18px] leading-loose',
    'text-[19px] sm:text-[21px] leading-loose'
  ];

  onMount(async () => {
    const id = $page.params.id;
    if (!id) {
      errorMsg = 'వార్త ఐడీ లభించలేదు.';
      loading = false;
      return;
    }

    try {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', id);

      if (error) throw error;

      if (data && data.length > 0) {
        article = data[0];
      } else {
        errorMsg = 'ఈ వార్తా కథనం అందుబాటులో లేదు.';
      }
    } catch (err) {
      console.error(err);
      errorMsg = 'వార్తను లోడ్ చేయడంలో సమస్య ఏర్పడింది.';
    } finally {
      loading = false;
    }
  });

  function handlePrint() {
    window.print();
  }

  function shareWhatsApp() {
    if (!article) return;
    const text = `*${article.headline}*\n\n${article.subline_1 || ''}\n\nపూర్తి కథనం: https://nexlifynucleus.in/news/${article.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }
</script>

<svelte:head>
  <title>{article ? `${article.headline} | NS News` : 'NS News | వార్తా వివరాలు'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mandali&family=Ramabhadra&family=Noto+Sans+Telugu:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<div class="min-h-screen bg-[#f3f4f6] text-slate-800 flex flex-col font-['Noto_Sans_Telugu',sans-serif]">
  
  <header class="bg-slate-950 text-white sticky top-0 z-50 border-b-2 border-red-600 shadow-md print:hidden">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/" class="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl flex items-center gap-2 shadow border border-orange-400/30">
          <i class="fa-solid fa-house-chimney text-yellow-200"></i>
          <span>డిజిటల్ సేవలు (హోమ్)</span>
        </a>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-black text-base shadow font-['Ramabhadra']">
            NS
          </div>
          <div>
            <a href="/news" class="text-lg sm:text-xl font-extrabold tracking-tight text-white font-['Ramabhadra']">
              NS NEWS
            </a>
          </div>
        </div>
      </div>

      <div>
        <a href="/news" class="bg-slate-800 hover:bg-slate-700 text-xs px-3.5 py-2 rounded-xl border border-slate-700 font-bold text-slate-200 flex items-center gap-1.5">
          <i class="fa-solid fa-arrow-left text-xs"></i> <span>అన్ని వార్తలు</span>
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 py-6 sm:py-8 flex-grow w-full">
    {#if loading}
      <div class="text-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <i class="fa-solid fa-circle-notch fa-spin text-4xl text-red-600 mb-3"></i>
        <p class="text-slate-600 font-bold text-sm">వార్తా కథనం లోడ్ అవుతోంది...</p>
      </div>
    {:else if errorMsg || !article}
      <div class="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
        <i class="fa-solid fa-triangle-exclamation text-4xl text-amber-500"></i>
        <h3 class="text-lg font-bold text-slate-800">{errorMsg || 'వార్త లభించలేదు'}</h3>
        <a href="/news" class="inline-block bg-red-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-red-700 transition">
          న్యూస్ హోమ్ పేజీకి వెళ్లండి
        </a>
      </div>
    {:else}

      <div class="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs mb-4 print:hidden">
        <div class="flex items-center gap-1.5 text-xs font-bold text-slate-600">
          <span>అక్షరాల పరిమాణం:</span>
          <button type="button" on:click={() => fontSizeLevel = 0} class="w-7 h-7 rounded-lg border flex items-center justify-center {fontSizeLevel === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100'}">A-</button>
          <button type="button" on:click={() => fontSizeLevel = 1} class="w-7 h-7 rounded-lg border flex items-center justify-center {fontSizeLevel === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100'}">A</button>
          <button type="button" on:click={() => fontSizeLevel = 2} class="w-7 h-7 rounded-lg border flex items-center justify-center {fontSizeLevel === 2 ? 'bg-slate-900 text-white' : 'bg-slate-100'}">A+</button>
        </div>

        <button type="button" on:click={handlePrint} class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow">
          <i class="fa-solid fa-camera"></i>
          <span>e-Paper క్లిప్పింగ్ డౌన్‌లోడ్</span>
        </button>
      </div>

      <article class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 print:p-0 print:border-none print:shadow-none">
        
        <div class="border-b-2 border-slate-900 pb-3 mb-5 flex items-end justify-between">
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-950 font-['Ramabhadra']">NS NEWS</h1>
            <span class="text-[11px] text-slate-500 font-bold block">తెలుగు దినపత్రిక డిజిటల్ నెట్‌వర్క్</span>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold text-slate-900 block">{article.location_town || 'ముత్తారం'}</span>
            <span class="text-[11px] text-slate-500 font-medium">
              {new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        <h2 class="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 leading-snug tracking-tight mb-4">
          {article.headline}
        </h2>

        {#if article.subline_1}
          <div class="bg-rose-50/60 border-l-4 border-red-600 p-3.5 rounded-r-xl mb-6 space-y-1.5">
            <p class="text-sm sm:text-base font-bold text-red-950 flex items-start gap-2">
              <span class="text-red-600">•</span> <span>{article.subline_1}</span>
            </p>
            {#if article.subline_2}
              <p class="text-xs sm:text-sm font-semibold text-slate-700 flex items-start gap-2">
                <span class="text-red-500">•</span> <span>{article.subline_2}</span>
              </p>
            {/if}
          </div>
        {/if}

        <!-- ఫోటోలు: తలలు కట్ కాకుండా ఉండేందుకు object-cover object-top -->
      <!-- ఫోటో గ్యాలరీ: మనుషులు పూర్తిగా కనిపిస్తూ, కింది కెమెరా వాటర్‌మార్క్ కవర్ అయ్యే సెటప్ -->
        {#if article.image_url || article.image_url_2}
          <div class="grid grid-cols-1 {article.image_url_2 ? 'md:grid-cols-2' : ''} gap-4 mb-6">
            
            {#if article.image_url}
              <div class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm flex flex-col justify-start">
                <!-- -mb-7 ద్వారా కింది కెమెరా వాటర్‌మార్క్ కట్ అవుతుంది, మనుషులు 100% స్పష్టంగా కనిపిస్తారు -->
                <div class="overflow-hidden w-full">
                  <img
                    src={article.image_url}
                    alt={article.headline}
                    class="w-full h-auto block -mb-7"
                  />
                </div>
                <div class="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur text-white text-[10px] font-black px-2 py-0.5 rounded shadow uppercase z-10">
                  NS NEWS
                </div>
              </div>
            {/if}

            {#if article.image_url_2}
              <div class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm flex flex-col justify-start">
                <div class="overflow-hidden w-full">
                  <img
                    src={article.image_url_2}
                    alt={article.headline}
                    class="w-full h-auto block -mb-7"
                  />
                </div>
                <div class="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur text-white text-[10px] font-black px-2 py-0.5 rounded shadow uppercase z-10">
                  NS NEWS
                </div>
              </div>
            {/if}

          </div>
        {/if}
        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 text-xs sm:text-sm font-bold text-slate-700">
          <span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-md">
            {article.location_town || 'ముత్తారం'} (NS News)
          </span>
          <span>:</span>
          <span class="text-slate-500 font-medium">
            {article.reporter_name ? `${article.reporter_name} ప్రతినిధి` : 'ముత్తారం ప్రతినిధి'}, {new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'long' })}
          </span>
        </div>

        <div class="text-slate-900 font-normal whitespace-pre-line text-justify {fontSizes[fontSizeLevel]}">
          {article.content || article.summary}
        </div>

        <div class="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-500">షేర్ చేయండి:</span>
            <button type="button" on:click={shareWhatsApp} class="bg-[#25D366] text-white text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow">
              <i class="fa-brands fa-whatsapp text-sm"></i> <span>WhatsApp</span>
            </button>
          </div>
          <a href="/news" class="text-xs font-bold text-red-600 hover:text-red-700">
            ఇతర వార్తలు చూడండి ➡
          </a>
        </div>

      </article>
    {/if}
  </main>

  <footer class="bg-slate-950 text-slate-400 border-t border-slate-800 py-6 mt-auto text-xs print:hidden">
    <div class="max-w-6xl mx-auto px-4 flex justify-between items-center">
      <p>© 2026 NS News — A.S.V Enterprises.</p>
      <div class="flex gap-4 font-semibold">
        <a href="/" class="text-orange-400">🏠 హోమ్</a>
        <a href="/news" class="hover:text-white">న్యూస్</a>
        <a href="/shorts" class="hover:text-white">షార్ట్స్</a>
      </div>
    </div>
  </footer>

</div>