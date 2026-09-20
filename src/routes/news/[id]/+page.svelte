<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let article = null;
  let loading = true;
  let errorMsg = '';
  let fontSizeLevel = 1;
  let embedVideoUrl = null;

  const fontSizes = [
    'text-[15px] sm:text-[16px] leading-relaxed',
    'text-[17px] sm:text-[18px] leading-loose',
    'text-[19px] sm:text-[21px] leading-loose'
  ];
  // Paper clip image download chese function
  let downloadingClip = false;

  async function downloadAsImage() {
    downloadingClip = true;
    try {
      // html2canvas library dynamic load
      if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
        await new Promise((resolve) => (script.onload = resolve));
      }

      const clipElement = document.getElementById('news-printable-area');
      if (!clipElement) return;

      const canvas = await window.html2canvas(clipElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `NS_News_Clip_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('Image download lo samasya vachindi: ' + err.message);
    } finally {
      downloadingClip = false;
    }
  }

  function parseYouTube(url) {
    if (!url) return null;
    let videoId = '';
    try {
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('shorts/')) {
        videoId = url.split('shorts/')[1]?.split('?')[0];
      } else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch (e) {
      return null;
    }
  }

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
        embedVideoUrl = parseYouTube(article.youtube_url);
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
  
  <!-- హెడర్ బార్ -->
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

  <!-- మెయిన్ కంటెంట్ -->
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

      <!-- అక్షరాల పరిమాణం & ప్రింట్ టూల్‌బార్ -->
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
      <div class="no-print flex items-center gap-2 mb-4 justify-end">
  <button
    on:click={downloadAsImage}
    disabled={downloadingClip}
    class="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition"
  >
    <span>📸</span>
    <span>{downloadingClip ? 'క్లిప్ సిద్ధమవుతోంది...' : 'పేపర్ క్లిప్‌గా డౌన్‌లోడ్ (PNG)'}</span>
  </button>
</div>

      <!-- ఆర్టికల్ కార్డ్ -->
      <article class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 print:p-0 print:border-none print:shadow-none">
        
        <!-- మస్త్‌హెడ్ -->
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

        <!-- ప్రధాన హెడ్‌లైన్ -->
        <h2 class="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 leading-snug tracking-tight mb-4">
          {article.headline}
        </h2>

        <!-- సబ్‌లైన్స్ -->
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

        <!-- 1. ప్రధాన కవర్ ఫోటో (పైకప్పు కట్ అవ్వకుండా మనుషులందరూ 100% కనిపించే సహజ వ్యూ) -->
        {#if article.image_url}
          <figure class="mb-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
            <div class="w-full flex items-center justify-center p-1 sm:p-2">
              <img
                src={article.image_url}
                alt={article.headline}
                class="w-full h-auto max-h-[520px] object-contain rounded-xl"
              />
            </div>
            <figcaption class="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold">
              <span class="text-amber-400">📍 {article.location_town || 'ముత్తారం'}</span>
              <span class="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase">NS NEWS</span>
            </figcaption>
          </figure>
        {/if}

        <!-- లొకేషన్ & రిపోర్టర్ బైలైన్ -->
        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 text-xs sm:text-sm font-bold text-slate-700">
          <span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-md">
            {article.location_town || 'ముత్తారం'} (NS News)
          </span>
          <span>:</span>
          <span class="text-slate-500 font-medium">
            {article.reporter_name ? `${article.reporter_name} ప్రతినిధి` : 'ముత్తారం ప్రతినిధి'}, {new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'long' })}
          </span>
        </div>

        <!-- వార్తా కథనం బాడీ -->
        <div class="text-slate-900 font-normal whitespace-pre-line text-justify {fontSizes[fontSizeLevel]} mb-6">
          {article.content || article.summary}
        </div>

        <!-- 2. రెండవ అనుబంధ ఫోటో (మనుషులు ఎవరూ కట్ కాకుండా సహజ పరిమాణం) -->
        {#if article.image_url_2}
          <figure class="my-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
            <div class="w-full flex items-center justify-center p-1 sm:p-2">
              <img
                src={article.image_url_2}
                alt={article.headline}
                class="w-full h-auto max-h-[520px] object-contain rounded-xl"
              />
            </div>
            <figcaption class="bg-slate-100 border-t border-slate-200 text-slate-600 px-4 py-2 text-xs font-medium text-center">
              కార్యక్రమ దృశ్యం
            </figcaption>
          </figure>
        {/if}

        <!-- యూట్యూబ్ వీడియో -->
        {#if embedVideoUrl}
          <div class="my-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video">
            <iframe
              src={embedVideoUrl}
              title={article.headline}
              class="w-full h-full border-0"
              allowfullscreen
            ></iframe>
          </div>
        {/if}

        <!-- ఫుటర్ షేర్ బటన్ -->
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

  <!-- ఫుటర్ -->
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
<style>
  @media print {
    @page {
      margin: 4mm 6mm !important;
      size: A4 portrait;
    }

    :global(nav),
    :global(header),
    :global(footer),
    .no-print,
    button,
    .action-buttons {
      display: none !important;
    }

    :global(body) {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #news-printable-area {
      border: 1px solid #cbd5e1 !important;
      padding: 10px !important;
      margin: 0 auto !important;
      max-width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Photo cut avvakunda size control */
    img {
      max-height: 165px !important;
      width: auto !important;
      margin: 4px auto !important;
      display: block !important;
      object-fit: contain !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    h1 {
      font-size: 16px !important;
      line-height: 1.25 !important;
      margin-bottom: 6px !important;
      color: #000000 !important;
    }

    p {
      font-size: 11px !important;
      line-height: 1.4 !important;
      margin-bottom: 6px !important;
      color: #1e293b !important;
    }
  }
</style>