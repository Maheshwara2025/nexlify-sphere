<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let article = null;
  let loading = true;
  let downloadingClip = false;

  onMount(async () => {
    const id = $page.params.id;
    if (!id) return;

    try {
      // 1. news_articles table check cheyadam
      let { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', id)
        .single();

      // 2. news table fallback
      if (!data) {
        const res = await supabase
          .from('news')
          .select('*')
          .eq('id', id)
          .single();
        data = res.data;
      }

      article = data;
    } catch (e) {
      console.error('Error fetching article:', e);
    } finally {
      loading = false;
    }
  });

  // Image ni clean ga Canvas Base64 loki convert chese function (CORS Fix)
  async function getBase64ImageFromUrl(imageUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (e) {
          resolve(imageUrl);
        }
      };
      img.onerror = () => resolve(imageUrl);
      // Cache-buster to bypass browser CORS cache
      img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 'cors=' + Date.now();
    });
  }

  // PNG Paper Clip Download Function
  async function downloadAsImage() {
    if (!article || downloadingClip) return;
    downloadingClip = true;

    try {
      const clipElement = document.getElementById('news-printable-area');
      if (!clipElement) {
        alert('Clipping area dorakaledu!');
        downloadingClip = false;
        return;
      }

      // html2canvas dynamic loading
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('html2canvas library load avvaledu'));
          document.head.appendChild(script);
        });
      }

      // Card loni images ni Base64 loki replace cheyadam
      const imgElements = clipElement.querySelectorAll('img');
      for (const img of imgElements) {
        if (img.src && !img.src.startsWith('data:')) {
          const b64 = await getBase64ImageFromUrl(img.src);
          img.src = b64;
        }
      }

      // Render wait
      await new Promise((r) => setTimeout(r, 250));

      const canvas = await window.html2canvas(clipElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const link = document.createElement('a');
      const safeTitle = (article.headline || article.title || 'news').substring(0, 15).replace(/\s+/g, '_');
      link.download = `NS_News_${safeTitle}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error(err);
      alert('PNG download cheyadamlo samasya: ' + err.message);
    } finally {
      downloadingClip = false;
    }
  }

  // WhatsApp Smart Share Function
  async function shareWhatsApp() {
    if (!article) return;
    const title = article.headline || article.title;
    const loc = article.location_town || 'ముత్తారం';
    const currentUrl = window.location.href;

    const shareText = `*${title}*\n📍 ${loc} | NS News Network\n\nపూర్తి వార్తా కథనం చదవండి:\n👉 ${currentUrl}\n\n_A.S.V. Enterprises & NS News_`;

    // Mobile lo photo tho direct WhatsApp share sadyam aithe
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: currentUrl
        });
        return;
      } catch (e) {
        // Fallback to regular WhatsApp URL
      }
    }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  }
</script>

<svelte:head>
  {#if article}
    <title>{article.headline || article.title} | NS News</title>
  {/if}
</svelte:head>

<div class="min-h-screen bg-slate-100 font-sans pb-12">
  
  <!-- Screen Navigation Header -->
  <header class="no-print bg-slate-950 text-white py-3 px-4 shadow-md sticky top-0 z-40 border-b border-slate-800">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <a href="/" class="flex items-center gap-2">
        <span class="bg-red-600 text-white font-black text-xs px-2 py-0.5 rounded shadow">NS</span>
        <span class="font-black text-sm tracking-wide">NEWS PORTAL</span>
      </a>
      <div class="flex items-center gap-2">
        <a href="/" class="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 font-bold">
          🏠 హోమ్
        </a>
        <a href="/news" class="text-xs bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg font-bold">
          అన్ని వార్తలు
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-3xl mx-auto p-3 sm:p-6 space-y-4">
    {#if loading}
      <div class="text-center py-20 text-slate-400 text-sm font-bold">వార్తా కథనం లోడ్ అవుతోంది...</div>
    {:else if !article}
      <div class="text-center py-20 bg-white rounded-2xl border border-dashed text-slate-500">
        వార్త కనుగొనబడలేదు. <br />
        <a href="/news" class="text-red-600 font-bold underline mt-2 inline-block">వార్తల పేజీకి వెళ్లండి</a>
      </div>
    {:else}
      
      <!-- Top Action Buttons -->
      <div class="no-print flex flex-wrap items-center justify-between gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <span class="text-xs font-bold text-slate-600">పేపర్ క్లిప్ ఆప్షన్లు:</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            on:click={downloadAsImage}
            disabled={downloadingClip}
            class="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>📸</span>
            <span>{downloadingClip ? 'క్లిప్ సిద్ధమవుతోంది...' : 'పేపర్ క్లిప్‌గా డౌన్‌లోడ్ (PNG)'}</span>
          </button>
          
          <button
            type="button"
            on:click={() => window.print()}
            class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🖨️ ప్రింట్ / PDF</span>
          </button>

          <button
            type="button"
            on:click={shareWhatsApp}
            class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>📲 WhatsApp</span>
          </button>
        </div>
      </div>

      <!-- 📰 News Printable Area (ID: news-printable-area) -->
      <div id="news-printable-area" class="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
        
        <!-- Header Strip -->
        <div class="border-b-2 border-slate-900 pb-2.5 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="bg-red-600 text-white font-black text-xs px-1.5 py-0.5 rounded">NS</span>
              <span class="font-black text-base tracking-tight text-slate-950 font-['Ramabhadra']">NS NEWS</span>
            </div>
            <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">తెలుగు దినపత్రిక డిజిటల్ నెట్‌వర్క్</p>
          </div>
          <div class="text-right">
            <span class="text-[11px] font-bold text-red-600 block">{article.location_town || 'ముత్తారం'}</span>
            <span class="text-[10px] text-slate-500">
              {article.created_at ? new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            </span>
          </div>
        </div>

        <!-- Headline -->
        <div>
          <h1 class="text-lg sm:text-2xl font-black text-slate-950 leading-snug font-['Ramabhadra']">
            {article.headline || article.title}
          </h1>

          <!-- Sublines -->
          {#if article.subline_1 || article.subline_2 || article.subline_3}
            <div class="mt-2.5 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs font-bold text-slate-700">
              {#if article.subline_1}
                <div class="flex items-start gap-1.5">
                  <span class="text-red-600">•</span>
                  <span>{article.subline_1}</span>
                </div>
              {/if}
              {#if article.subline_2}
                <div class="flex items-start gap-1.5">
                  <span class="text-red-600">•</span>
                  <span>{article.subline_2}</span>
                </div>
              {/if}
              {#if article.subline_3}
                <div class="flex items-start gap-1.5">
                  <span class="text-red-600">•</span>
                  <span>{article.subline_3}</span>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Photo 1 -->
        {#if article.image_url}
          <div class="news-img-box rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <img
              src={article.image_url}
              alt="News Pic 1"
              class="w-full h-auto max-h-[320px] object-cover mx-auto block"
            />
            {#if article.image_caption_1}
              <p class="text-[10px] text-slate-500 text-center py-1 bg-slate-100 border-t font-semibold">
                {article.image_caption_1}
              </p>
            {/if}
          </div>
        {/if}

        <!-- Content Body -->
        <div class="space-y-2">
          <p class="text-xs font-bold text-red-600">
            {article.location_town || 'ముత్తారం'} (NS News) :
          </p>

          <div class="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line text-justify font-['Noto_Sans_Telugu']">
            {article.content}
          </div>
        </div>

        <!-- Photo 2 (Optional) -->
        {#if article.image_url_2}
          <div class="news-img-box rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mt-3">
            <img
              src={article.image_url_2}
              alt="News Pic 2"
              class="w-full h-auto max-h-[220px] object-cover mx-auto block"
            />
            {#if article.image_caption_2}
              <p class="text-[10px] text-slate-500 text-center py-1 bg-slate-100 border-t font-semibold">
                {article.image_caption_2}
              </p>
            {/if}
          </div>
        {/if}

        <!-- Bottom Paper Branding -->
        <div class="border-t-2 border-slate-900 pt-2 flex items-center justify-between text-[10px] text-slate-600 font-bold">
          <span>A.S.V. ENTERPRISES — ముత్తారం</span>
          <span class="text-red-600 font-mono">nexlifynucleus.in</span>
        </div>

      </div>

    {/if}
  </main>
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
    button {
      display: none !important;
    }

    :global(body) {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #news-printable-area {
      border: 1px solid #94a3b8 !important;
      box-shadow: none !important;
      padding: 8px 12px !important;
      margin: 0 auto !important;
      max-width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .news-img-box img {
      max-height: 155px !important;
      width: auto !important;
      margin: 2px auto !important;
      display: block !important;
      object-fit: contain !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    h1 {
      font-size: 15px !important;
      line-height: 1.25 !important;
      margin-bottom: 4px !important;
      color: #000000 !important;
    }

    p, div {
      font-size: 10.5px !important;
      line-height: 1.4 !important;
      color: #0f172a !important;
    }
  }
</style>