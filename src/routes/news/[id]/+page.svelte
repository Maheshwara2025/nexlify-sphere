<script>
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let article = null;
  let loading = true;
  let downloadingClip = false;

  // 1. Eenadu Style 9 Royal Colors for Headlines
  const headlineColors = [
    '#b91c1c', // Deep Red (Eenadu style)
    '#1d4ed8', // Royal Blue
    '#047857', // Forest Green
    '#7c3aed', // Purple
    '#c2410c', // Burnt Orange
    '#0f766e', // Deep Teal
    '#be123c', // Cherry Rose
    '#1e293b', // Slate Dark
    '#831843'  // Maroon
  ];

  $: currentHeadlineColor = article?.id ? headlineColors[article.id % headlineColors.length] : headlineColors[0];

  // 2. English Article Auto Detection
  $: isEnglishArticle = (() => {
    if (!article) return false;
    const sampleText = ((article.headline || '') + ' ' + (article.content || '')).substring(0, 200);
    const hasTelugu = /[\u0C00-\u0C7F]/.test(sampleText);
    const hasEnglish = /[a-zA-Z]{4,}/.test(sampleText);
    return hasEnglish && !hasTelugu;
  })();

  // 3. High Clarity & Slower English Voice Reader
  let isSpeaking = false;
  let isPaused = false;

  function toggleSpeech() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Ee browser lo audio reader support ledu.');
      return;
    }

    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        isPaused = false;
      } else {
        window.speechSynthesis.pause();
        isPaused = true;
      }
      return;
    }

    window.speechSynthesis.cancel();
    const textToRead = `${article.headline || ''}. ${article.content || ''}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);

    // Speed ni 0.84 ki taggincham (Slow & Clear Audio)
    utterance.rate = 0.84;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Best natural English voice select cheyadam
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Aria') || v.name.includes('Jenny'))
    ) || voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB');

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => { isSpeaking = true; isPaused = false; };
    utterance.onend = () => { isSpeaking = false; isPaused = false; };
    utterance.onerror = () => { isSpeaking = false; isPaused = false; };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      isPaused = false;
    }
  }

  onDestroy(() => {
    stopSpeech();
  });

  // 4. Eenadu Style Font Sizing (A- A A+)
  let fontSizeIndex = 1;
  const fontSizes = [
    { label: 'A-', style: 'font-size: 14px; line-height: 1.7;' },
    { label: 'A',  style: 'font-size: 16.5px; line-height: 1.75;' },
    { label: 'A+', style: 'font-size: 19.5px; line-height: 1.8;' }
  ];

  let copyFeedback = false;

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

  // Reading time calculate cheyadam
  $: readingTime = (() => {
    if (!article?.content) return 1;
    const words = article.content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 150));
  })();

  // Tags create cheyadam
  $: articleTags = (() => {
    if (!article) return [];
    const set = new Set();
    if (article.location_town) set.add(article.location_town);
    if (article.category) set.add(article.category);
    set.add('NS News');
    set.add('Telangana');
    return Array.from(set);
  })();

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

  async function downloadAsImage() {
    if (!article || downloadingClip) return;
    downloadingClip = true;

    try {
      const clipNode = document.getElementById('news-printable-area');
      if (!clipNode) return;

      const hti = await loadHtmlToImage();
      const dataUrl = await hti.toPng(clipNode, {
        quality: 0.98,
        pixelRatio: 2.5,
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
      alert('PNG download error: ' + err.message);
    } finally {
      downloadingClip = false;
    }
  }

  function getShareData() {
    const title = article?.headline || article?.title || 'NS News';
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `*${title}*\n📍 ${article?.location_town || 'ముత్తారం'} | NS News Network\n\nపూర్తి వార్త చదవండి:\n👉 ${url}\n\n_A.S.V. Enterprises & NS News_`;
    return { title, url, text };
  }

  function shareWhatsApp() {
    const { text } = getShareData();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  function shareFacebook() {
    const { url } = getShareData();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  }

  function shareTwitter() {
    const { title, url } = getShareData();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
  }

  function shareTelegram() {
    const { title, url } = getShareData();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
  }

  async function copyPageLink() {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyFeedback = true;
      setTimeout(() => copyFeedback = false, 2000);
    } catch (e) {
      alert('Link copy avvaledu');
    }
  }
</script>

<svelte:head>
  {#if article}
    <title>{article.headline || article.title} | NS News</title>
  {/if}
</svelte:head>

<div class="min-h-screen bg-[#f4f6f9] font-sans pb-16 text-slate-900">
  
  <!-- Eenadu Style Top Header -->
  <header class="no-print bg-[#0a0f1d] text-white py-3 px-4 shadow-md sticky top-0 z-40 border-b-2 border-red-600">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/" class="flex items-center gap-2">
          <span class="bg-red-600 text-white font-black text-xs px-2 py-0.5 rounded shadow">NS</span>
          <span class="font-black text-sm tracking-wide text-white font-['Ramabhadra']">NS NEWS</span>
        </a>
        <span class="hidden sm:inline-block text-[11px] text-slate-400 border-l border-slate-700 pl-3">
          డిజిటల్ దినపత్రిక
        </span>
      </div>

      <div class="flex items-center gap-2">
        <a href="/" class="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 font-bold transition">
          🏠 హోమ్
        </a>
        <a href="/news" class="text-xs bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg font-bold transition shadow">
          అన్ని వార్తలు
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">
    {#if loading}
      <div class="text-center py-28 text-slate-500 font-bold text-sm">వార్తా కథనం లోడ్ అవుతోంది...</div>
    {:else if !article}
      <div class="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500">
        వార్త కనుగొనబడలేదు. <br />
        <a href="/news" class="text-red-600 font-bold underline mt-2 inline-block">వార్తల పేజీకి వెళ్లండి</a>
      </div>
    {:else}

      <!-- Eenadu Style Breadcrumb & Action Strip -->
      <div class="no-print flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        
        <!-- Breadcrumb Links -->
        <div class="flex items-center gap-1.5 text-slate-500 font-medium">
          <a href="/" class="hover:text-red-600 transition">హోమ్</a>
          <span>›</span>
          <a href="/news" class="hover:text-red-600 transition">వార్తలు</a>
          <span>›</span>
          <span class="text-red-700 font-bold">{article.location_town || 'తెలంగాణ'}</span>
        </div>

        <!-- PNG Clip & Print Buttons -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            on:click={downloadAsImage}
            disabled={downloadingClip}
            class="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="పేపర్ క్లిప్‌గా డౌన్‌లోడ్ చేయండి"
          >
            <span>📸</span>
            <span>{downloadingClip ? 'సిద్ధమవుతోంది...' : 'పేపర్ క్లిప్ (PNG)'}</span>
          </button>
          
          <button
            type="button"
            on:click={() => window.print()}
            class="bg-slate-900 hover:bg-black text-white font-bold px-3 py-1.5 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🖨️ ప్రింట్ / PDF</span>
          </button>
        </div>

      </div>

      <!-- 📰 Eenadu Portal Style Card (No Face Cut - Fully Contained Photo) -->
      <article 
        id="news-printable-area" 
        style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.05);"
      >
        
        <!-- 1. Eenadu Style Big Bold Headline -->
        <div style="margin-bottom: 14px;">
          <h1 
            style="color: {currentHeadlineColor}; font-size: 26px; line-height: 1.35; font-weight: 900; margin: 0; font-family: 'Ramabhadra', 'Noto Sans Telugu', sans-serif; letter-spacing: -0.01em;"
          >
            {article.headline || article.title}
          </h1>
        </div>

        <!-- 2. Eenadu Info & Byline Strip -->
        <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 4px; margin-bottom: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; background-color: #fafbfc;">
          
          <!-- Left: Reporter / Source Info -->
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #475569;">
            <span style="color: #b91c1c; font-weight: 900;">By NS News Network</span>
            <span>•</span>
            <span>📍 {article.location_town || 'ముత్తారం'}</span>
            <span>•</span>
            <span style="color: #64748b;">
              {article.created_at ? new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
            <span style="background-color: #f1f5f9; color: #475569; padding: 1px 6px; border-radius: 4px; font-size: 10px;">
              ⏱️ {readingTime} min read
            </span>
          </div>

          <!-- Right: Font Size Toggler & WhatsApp Quick Icon -->
          <div style="display: flex; align-items: center; gap: 10px;">
            
            <!-- Font Size Buttons (A- A A+) -->
            <div class="no-print" style="display: flex; align-items: center; gap: 2px; background-color: #e2e8f0; padding: 2px; border-radius: 6px;">
              {#each fontSizes as fs, idx}
                <button
                  type="button"
                  on:click={() => fontSizeIndex = idx}
                  style="padding: 1px 7px; border-radius: 4px; font-weight: 800; font-size: 11px; border: none; cursor: pointer; background-color: {fontSizeIndex === idx ? '#0f172a' : 'transparent'}; color: {fontSizeIndex === idx ? '#ffffff' : '#475569'};"
                >
                  {fs.label}
                </button>
              {/each}
            </div>

            <!-- WhatsApp Icon -->
            <button
              type="button"
              on:click={shareWhatsApp}
              style="background-color: #25d366; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);"
              title="WhatsApp లో షేర్ చేయండి"
            >
              📲
            </button>

          </div>

        </div>

        <!-- 3. English News Audio Reader (Clear & Slowed Voice) -->
        {#if isEnglishArticle}
          <div class="no-print" style="margin-bottom: 16px; background: linear-gradient(to right, #f0fdf4, #ecfdf5); border: 1px solid #a7f3d0; padding: 10px 14px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🎙️</span>
              <div>
                <span style="font-size: 12px; font-weight: 800; color: #065f46; display: block;">English Audio Reader</span>
                <span style="font-size: 10px; color: #047857;">Clarity voice with natural speed</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button
                type="button"
                on:click={toggleSpeech}
                style="background-color: #059669; color: #ffffff; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 8px; border: none; cursor: pointer; transition: all 0.2s;"
              >
                {isSpeaking ? (isPaused ? '▶️ Resume' : '⏸️ Pause') : '🔊 Listen to News'}
              </button>
              {#if isSpeaking}
                <button
                  type="button"
                  on:click={stopSpeech}
                  style="background-color: #dc2626; color: #ffffff; font-size: 11px; font-weight: 800; padding: 5px 8px; border-radius: 8px; border: none; cursor: pointer;"
                >
                  ⏹️ Stop
                </button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- 4. Photo 1 (Face Cut Problem Completely Solved) -->
        {#if article.image_url}
          <div style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #f8fafc; text-align: center;">
            <img
              src={article.image_url}
              alt={article.headline || 'News Image'}
              crossorigin="anonymous"
              style="width: 100%; height: auto; max-height: 520px; object-fit: contain; display: block; margin: 0 auto; background-color: #f8fafc;"
            />
            {#if article.image_caption_1}
              <p style="font-size: 11px; color: #64748b; padding: 6px 12px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; margin: 0; font-weight: 600;">
                📸 {article.image_caption_1}
              </p>
            {/if}
          </div>
        {/if}

        <!-- 5. News Body Content (Eenadu Clean Typography) -->
        <div style="margin-bottom: 18px;">
          <p style="font-size: 13.5px; font-weight: 900; color: #b91c1c; margin: 0 0 8px 0;">
            {article.location_town || 'ముత్తారం'} (NS News) :
          </p>

          <div style="color: #1e293b; {fontSizes[fontSizeIndex].style} white-space: pre-line; text-align: justify; font-family: 'Noto Sans Telugu', sans-serif;">
            {article.content}
          </div>
        </div>

        <!-- 6. Photo 2 (If available - No Face Cut) -->
        {#if article.image_url_2}
          <div style="margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #f8fafc; text-align: center;">
            <img
              src={article.image_url_2}
              alt="News Additional Photo"
              crossorigin="anonymous"
              style="width: 100%; height: auto; max-height: 480px; object-fit: contain; display: block; margin: 0 auto;"
            />
            {#if article.image_caption_2}
              <p style="font-size: 11px; color: #64748b; padding: 6px 12px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; margin: 0; font-weight: 600;">
                📸 {article.image_caption_2}
              </p>
            {/if}
          </div>
        {/if}

        <!-- 7. Eenadu Style Topic Tags Bar -->
        {#if articleTags.length > 0}
          <div style="margin-bottom: 18px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
            <span style="font-size: 11px; font-weight: 800; color: #64748b; margin-right: 4px;">టాపిక్స్ / Tags:</span>
            {#each articleTags as tag}
              <span style="background-color: #f1f5f9; color: #334155; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                #{tag}
              </span>
            {/each}
          </div>
        {/if}

        <!-- 8. Social Media Share Strip (Eenadu Style) -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; margin-bottom: 14px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="font-size: 11.5px; font-weight: 800; color: #334155;">
              📢 ఈ వార్తను మిత్రులతో పంచుకోండి:
            </span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button type="button" on:click={shareWhatsApp} style="background-color: #25d366; color: #ffffff; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; border: none; cursor: pointer;">
                WhatsApp
              </button>
              <button type="button" on:click={shareFacebook} style="background-color: #1877f2; color: #ffffff; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; border: none; cursor: pointer;">
                Facebook
              </button>
              <button type="button" on:click={shareTwitter} style="background-color: #000000; color: #ffffff; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; border: none; cursor: pointer;">
                X (Twitter)
              </button>
              <button type="button" on:click={shareTelegram} style="background-color: #229ed9; color: #ffffff; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; border: none; cursor: pointer;">
                Telegram
              </button>
              <button type="button" on:click={copyPageLink} style="background-color: #f1f5f9; color: #334155; padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; border: 1px solid #cbd5e1; cursor: pointer;">
                {copyFeedback ? '✓ కాపీడ్!' : '🔗 లింక్'}
              </button>
            </div>
          </div>
        </div>

        <!-- 9. Eenadu Disclaimer & Color Dots Footer -->
        <div style="border-top: 2px solid #0f172a; padding-top: 10px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; font-weight: 600; gap: 6px;">
          <div>
            <span>గమనిక: ఈ వెబ్‌సైట్‌లోని వార్తా సమాచారం A.S.V. Enterprises & NS News ప్రతినిధుల ద్వారా సేకరించబడినది.</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background-color: #0284c7; display: inline-block;"></span>
            <span style="width: 7px; height: 7px; border-radius: 50%; background-color: #e11d48; display: inline-block;"></span>
            <span style="width: 7px; height: 7px; border-radius: 50%; background-color: #eab308; display: inline-block;"></span>
            <span style="width: 7px; height: 7px; border-radius: 50%; background-color: #0f172a; display: inline-block;"></span>
          </div>
        </div>

      </article>

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
      border: 1px solid #64748b !important;
      box-shadow: none !important;
      padding: 8px 12px !important;
      margin: 0 auto !important;
      max-width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    img {
      max-height: 220px !important;
      width: auto !important;
      margin: 2px auto !important;
      display: block !important;
      object-fit: contain !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    h1 {
      font-size: 17px !important;
      line-height: 1.25 !important;
      margin-bottom: 4px !important;
    }
  }
</style>