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
      let { data } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', id)
        .single();

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
      console.error('Fetch error:', e);
    } finally {
      loading = false;
    }
  });

  // Modern HTML-to-Image loader (oklch compatible)
  async function loadHtmlToImage() {
    if (window.htmlToImage) return window.htmlToImage;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
      script.onload = () => resolve(window.htmlToImage);
      script.onerror = () => reject(new Error('html-to-image load avvaledu'));
      document.head.appendChild(script);
    });
  }

  // 100% Working PNG Download Function (No oklch crash)
  async function downloadAsImage() {
    if (!article || downloadingClip) return;
    downloadingClip = true;

    try {
      const clipNode = document.getElementById('news-printable-area');
      if (!clipNode) {
        alert('Clipping area dorakaledu!');
        downloadingClip = false;
        return;
      }

      const hti = await loadHtmlToImage();

      // Modern SVG rendering avoids CSS parser errors
      const dataUrl = await hti.toPng(clipNode, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      const safeTitle = (article.headline || article.title || 'news').substring(0, 15).replace(/\s+/g, '_');
      link.download = `NS_News_${safeTitle}_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error(err);
      alert('PNG download error: ' + err.message);
    } finally {
      downloadingClip = false;
    }
  }

  // Direct WhatsApp Image & Link Share
  async function shareWhatsApp() {
    if (!article) return;
    const title = article.headline || article.title;
    const loc = article.location_town || 'ముత్తారం';
    const currentUrl = window.location.href;
    const shareText = `*${title}*\n📍 ${loc} | NS News Network\n\nపూర్తి వార్తా కథనం చదవండి:\n👉 ${currentUrl}\n\n_A.S.V. Enterprises & NS News_`;

    try {
      const clipNode = document.getElementById('news-printable-area');
      const hti = await loadHtmlToImage();
      const blob = await hti.toBlob(clipNode, { pixelRatio: 2, backgroundColor: '#ffffff' });

      if (navigator.canShare && blob) {
        const file = new File([blob], 'news_clip.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: title,
            text: shareText
          });
          return;
        }
      }
    } catch (e) {
      console.log('Native share fallback:', e);
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

      <!-- 📰 News Printable Area (Clean HEX Colors - No OKLCH Conflict) -->
      <div id="news-printable-area" style="background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
        
        <!-- Header Strip -->
        <div style="border-bottom: 2px solid #020617; padding-bottom: 8px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="background-color: #dc2626; color: #ffffff; font-weight: 900; font-size: 11px; padding: 2px 6px; border-radius: 4px;">NS</span>
              <span style="font-weight: 900; font-size: 16px; color: #020617; font-family: 'Ramabhadra', sans-serif;">NS NEWS</span>
            </div>
            <p style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin: 2px 0 0 0;">తెలుగు దినపత్రిక డిజిటల్ నెట్‌వర్క్</p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 11px; font-weight: 700; color: #dc2626; display: block;">{article.location_town || 'ముత్తారం'}</span>
            <span style="font-size: 10px; color: #64748b;">
              {article.created_at ? new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            </span>
          </div>
        </div>

        <!-- Headline -->
        <div style="margin-bottom: 12px;">
          <h1 style="font-size: 18px; font-weight: 900; color: #020617; line-height: 1.35; margin: 0 0 8px 0; font-family: 'Ramabhadra', sans-serif;">
            {article.headline || article.title}
          </h1>

          {#if article.subline_1 || article.subline_2 || article.subline_3}
            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 8px 12px; border-radius: 8px; margin-top: 6px;">
              {#if article.subline_1}
                <div style="color: #334155; font-size: 12px; font-weight: 700; margin-bottom: 2px;">• {article.subline_1}</div>
              {/if}
              {#if article.subline_2}
                <div style="color: #334155; font-size: 12px; font-weight: 700; margin-bottom: 2px;">• {article.subline_2}</div>
              {/if}
              {#if article.subline_3}
                <div style="color: #334155; font-size: 12px; font-weight: 700;">• {article.subline_3}</div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Photo 1 -->
        {#if article.image_url}
          <div class="news-img-box" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background-color: #f8fafc; margin-bottom: 12px;">
            <img
              src={article.image_url}
              alt="News Pic 1"
              crossorigin="anonymous"
              style="width: 100%; max-height: 280px; object-fit: cover; display: block; margin: 0 auto;"
            />
            {#if article.image_caption_1}
              <p style="font-size: 10px; color: #64748b; text-align: center; padding: 4px; background-color: #f1f5f9; margin: 0; font-weight: 600;">
                {article.image_caption_1}
              </p>
            {/if}
          </div>
        {/if}

        <!-- Content -->
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; font-weight: 700; color: #dc2626; margin: 0 0 6px 0;">
            {article.location_town || 'ముత్తారం'} (NS News) :
          </p>
          <div style="color: #1e293b; font-size: 12px; line-height: 1.6; white-space: pre-line; text-align: justify; font-family: 'Noto Sans Telugu', sans-serif;">
            {article.content}
          </div>
        </div>

        <!-- Photo 2 -->
        {#if article.image_url_2}
          <div class="news-img-box" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background-color: #f8fafc; margin-top: 10px; margin-bottom: 12px;">
            <img
              src={article.image_url_2}
              alt="News Pic 2"
              crossorigin="anonymous"
              style="width: 100%; max-height: 200px; object-fit: cover; display: block; margin: 0 auto;"
            />
            {#if article.image_caption_2}
              <p style="font-size: 10px; color: #64748b; text-align: center; padding: 4px; background-color: #f1f5f9; margin: 0; font-weight: 600;">
                {article.image_caption_2}
              </p>
            {/if}
          </div>
        {/if}

        <!-- Footer Strip -->
        <div style="border-top: 2px solid #020617; padding-top: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #475569; font-weight: 700;">
          <span>A.S.V. ENTERPRISES — ముత్తారం</span>
          <span style="color: #dc2626; font-family: monospace;">nexlifynucleus.in</span>
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
  }
</style>