<script>
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let article = null;
  let loading = true;
  let downloadingClip = false;

  // 1. హెడ్‌లైన్స్ కోసం 9 ట్రెండింగ్ రాయల్ కలర్స్
  const headlineColors = [
    '#dc2626', // 1. Crimson Red
    '#1d4ed8', // 2. Royal Blue
    '#047857', // 3. Emerald Green
    '#7c3aed', // 4. Deep Purple
    '#c2410c', // 5. Burnt Orange
    '#0f766e', // 6. Deep Teal
    '#be123c', // 7. Rose Cherry
    '#4338ca', // 8. Indigo Navy
    '#831843'  // 9. Wine Maroon
  ];

  // ఆర్టికల్ ID ఆధారంగా రంగు ఎంపిక
  $: currentHeadlineColor = article?.id ? headlineColors[article.id % headlineColors.length] : headlineColors[0];

  // 2. ఇంగ్లీష్ న్యూస్ డిటెక్షన్ (Detect if news is in English)
  $: isEnglishArticle = (() => {
    if (!article) return false;
    const sampleText = ((article.headline || '') + ' ' + (article.content || '')).substring(0, 150);
    // తెలుగు అక్షరాలు ఉంటే false, ఇంగ్లీష్ అక్షరాలు ఎక్కువ ఉంటే true
    const hasTelugu = /[\u0C00-\u0C7F]/.test(sampleText);
    const hasEnglish = /[a-zA-Z]{4,}/.test(sampleText);
    return hasEnglish && !hasTelugu;
  })();

  // 3. Text-to-Speech (SpeechSynthesis) కేవలం ఇంగ్లీష్ వార్తలకు మాత్రమే
  let isSpeaking = false;
  let isPaused = false;

  function toggleSpeech() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('ఈ బ్రౌజర్‌లో ఆడియో రీడర్ సపోర్ట్ లేదు.');
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

    const title = article.headline || article.title || '';
    const body = article.content || '';
    const textToRead = `${title}. ${body}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      isSpeaking = true;
      isPaused = false;
    };

    utterance.onend = () => {
      isSpeaking = false;
      isPaused = false;
    };

    utterance.onerror = () => {
      isSpeaking = false;
      isPaused = false;
    };

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

  // 4. ఫాంట్ సైజ్ కంట్రోలర్ (A-, A, A+, A++)
  let fontSizeIndex = 1;
  const fontSizes = [
    { label: 'A-', style: 'font-size: 13.5px; line-height: 1.6;' },
    { label: 'A',  style: 'font-size: 15.5px; line-height: 1.65;' },
    { label: 'A+', style: 'font-size: 18.5px; line-height: 1.7;' },
    { label: 'A++', style: 'font-size: 21.5px; line-height: 1.75;' }
  ];

  // 5. ఇమేజ్ అలైన్‌మెంట్ ఆప్షన్లు ('full' = బిగ్, 'side' = పేపర్ సైడ్-బై-టెక్స్ట్, 'grid' = పక్కపక్కనే)
  let imageLayout = 'full';
  let isRounded = true;
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

  // Modern HTML-to-Image loader
  async function loadHtmlToImage() {
    if (window.htmlToImage) return window.htmlToImage;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
      script.onload = () => resolve(window.htmlToImage);
      script.onerror = () => reject(new Error('html-to-image లోడ్ కాలేదు'));
      document.head.appendChild(script);
    });
  }

  // PNG పేపర్ క్లిప్పింగ్ డౌన్‌లోడ్
  async function downloadAsImage() {
    if (!article || downloadingClip) return;
    downloadingClip = true;

    try {
      const clipNode = document.getElementById('news-printable-area');
      if (!clipNode) return;

      const hti = await loadHtmlToImage();
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
      alert('PNG download ఎర్రర్: ' + err.message);
    } finally {
      downloadingClip = false;
    }
  }

  // సోషల్ మీడియా షేరింగ్ ఫంక్షన్లు
  function getShareData() {
    const title = article?.headline || article?.title || 'NS News';
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `*${title}*\n📍 ${article?.location_town || 'ముత్తారం'} | NS News Network\n\nపూర్తి వార్తా కథనం చదవండి:\n👉 ${url}\n\n_A.S.V. Enterprises & NS News_`;
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
      alert('లింక్ కాపీ కాలేదు');
    }
  }
</script>

<svelte:head>
  {#if article}
    <title>{article.headline || article.title} | NS News</title>
  {/if}
</svelte:head>

<div class="min-h-screen bg-[#f1f5f9] font-sans pb-16">
  
  <!-- స్క్రీన్ నావిగేషన్ హెడర్ (ప్రింట్‌లో రాదు) -->
  <header class="no-print bg-[#0b1120] text-white py-3 px-4 shadow-md sticky top-0 z-40 border-b border-slate-800">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <a href="/" class="flex items-center gap-2">
        <span class="bg-[#dc2626] text-white font-black text-xs px-2 py-0.5 rounded shadow">NS</span>
        <span class="font-black text-sm tracking-wide">NEWS PORTAL</span>
      </a>
      <div class="flex items-center gap-2">
        <a href="/" class="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 font-bold transition">
          🏠 హోమ్
        </a>
        <a href="/news" class="text-xs bg-[#dc2626] hover:bg-red-700 px-3 py-1.5 rounded-lg font-bold transition">
          అన్ని వార్తలు
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-3xl mx-auto p-3 sm:p-5 space-y-4">
    {#if loading}
      <div class="text-center py-24 text-slate-500 font-bold text-sm">వార్తా కథనం లోడ్ అవుతోంది...</div>
    {:else if !article}
      <div class="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
        వార్త కనుగొనబడలేదు. <br />
        <a href="/news" class="text-red-600 font-bold underline mt-2 inline-block">వార్తల పేజీకి వెళ్లండి</a>
      </div>
    {:else}

      <!-- 🛠️ రీడర్ & లేఅవుట్ కంట్రోల్స్ బార్ (ప్రింట్‌లో రాదు) -->
      <div class="no-print bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        
        <!-- ఇమేజ్ లేఅవుట్ మార్పులు -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="font-bold text-slate-600">ఫోటో డిజైన్:</span>
          <div class="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold">
            <button
              type="button"
              on:click={() => imageLayout = 'full'}
              class="px-2.5 py-1 rounded-lg transition {imageLayout === 'full' ? 'bg-[#0f172a] text-white shadow' : 'text-slate-600 hover:text-black'}"
            >
              విశాలమైనది (Full)
            </button>
            <button
              type="button"
              on:click={() => imageLayout = 'side'}
              class="px-2.5 py-1 rounded-lg transition {imageLayout === 'side' ? 'bg-[#0f172a] text-white shadow' : 'text-slate-600 hover:text-black'}"
            >
              పేపర్ సైడ్ (Side)
            </button>
            {#if article.image_url_2}
              <button
                type="button"
                on:click={() => imageLayout = 'grid'}
                class="px-2.5 py-1 rounded-lg transition {imageLayout === 'grid' ? 'bg-[#0f172a] text-white shadow' : 'text-slate-600 hover:text-black'}"
              >
                పక్కపక్కనే (Club)
              </button>
            {/if}
          </div>

          <button
            type="button"
            on:click={() => isRounded = !isRounded}
            class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 font-bold text-slate-700"
          >
            {isRounded ? 'గుండ్రటి అంచులు' : 'షార్ప్ అంచులు'}
          </button>
        </div>

        <!-- ప్రింట్ & క్లిప్ డౌన్‌లోడ్ -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            on:click={downloadAsImage}
            disabled={downloadingClip}
            class="bg-[#dc2626] hover:bg-red-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow transition flex items-center gap-1.5"
          >
            <span>📸</span>
            <span>{downloadingClip ? 'తయారవుతోంది...' : 'పేపర్ క్లిప్ (PNG)'}</span>
          </button>
          
          <button
            type="button"
            on:click={() => window.print()}
            class="bg-[#0f172a] hover:bg-black text-white font-bold px-3 py-1.5 rounded-xl shadow transition flex items-center gap-1.5"
          >
            <span>🖨️ ప్రింట్ / PDF</span>
          </button>
        </div>

      </div>

      <!-- 📰 అసలైన దినపత్రిక ఈ-పేపర్ కార్డ్ (Printable & PNG Area) -->
      <div 
        id="news-printable-area" 
        style="background-color: #ffffff; border: 3px double #0f172a; border-radius: 14px; padding: 22px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);"
      >
        
        <!-- 1. ప్రధాన సింగిల్ హెడ్‌లైన్ (9 రంగుల్లో ఒకటి ఆటోమేటిక్‌గా వస్తుంది) -->
        <div style="margin-bottom: 12px;">
          <h1 
            style="color: {currentHeadlineColor}; font-size: 24px; line-height: 1.35; font-weight: 900; margin: 0; font-family: 'Ramabhadra', 'Noto Sans Telugu', sans-serif; letter-spacing: -0.01em;"
          >
            {article.headline || article.title}
          </h1>
        </div>

        <!-- 2. హెడ్‌లైన్ కింద ఇన్ఫో బార్ (Left: NS News, Right: Town, Date, WhatsApp) -->
        <div style="border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1; padding: 6px 4px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; background-color: #f8fafc;">
          
          <!-- Left: Brand -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="background-color: #dc2626; color: #ffffff; font-weight: 900; font-size: 11px; padding: 2px 6px; border-radius: 4px;">NS</span>
            <div>
              <span style="font-weight: 900; font-size: 15px; color: #0f172a; font-family: 'Ramabhadra', sans-serif;">NS NEWS</span>
              <span style="font-size: 10px; color: #64748b; font-weight: 700; margin-left: 4px; display: inline-block;">(తెలుగు దినపత్రిక డిజిటల్ ఎడిషన్)</span>
            </div>
          </div>

          <!-- Right: Town, Date & WhatsApp -->
          <div style="display: flex; align-items: center; gap: 8px; text-align: right;">
            <div>
              <span style="color: {currentHeadlineColor}; font-size: 11px; font-weight: 800; display: block;">📍 {article.location_town || 'ముత్తారం'}</span>
              <span style="color: #64748b; font-size: 10px; font-weight: 600;">
                {article.created_at ? new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </span>
            </div>

            <button
              type="button"
              on:click={shareWhatsApp}
              style="background-color: #25d366; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; font-size: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"
              title="వాట్సాప్‌లో షేర్ చేయండి"
            >
              📲
            </button>
          </div>

        </div>

        <!-- 3. కేవలం ఇంగ్లీష్ వార్తలకు మాత్రమే ఆడియో రీడర్ (Listen to News) -->
        {#if isEnglishArticle}
          <div class="no-print" style="margin-bottom: 12px; background-color: #f0fdf4; border: 1px solid #86efac; padding: 8px 12px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">🎧</span>
              <span style="font-size: 12px; font-weight: 700; color: #166534;">English Audio Reader:</span>
            </div>
            <div style="display: flex; items-center; gap: 6px;">
              <button
                type="button"
                on:click={toggleSpeech}
                style="background-color: #15803d; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 8px; border: none; cursor: pointer;"
              >
                {isSpeaking ? (isPaused ? '▶️ Resume' : '⏸️ Pause') : '🔊 Listen to News'}
              </button>
              {#if isSpeaking}
                <button
                  type="button"
                  on:click={stopSpeech}
                  style="background-color: #dc2626; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 8px; border: none; cursor: pointer;"
                >
                  ⏹️ Stop
                </button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- 4. ఫాంట్ సైజ్ కంట్రోలర్ (A-, A, A+, A++) -->
        <div class="no-print" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; background-color: #f1f5f9; padding: 4px 10px; border-radius: 8px;">
          <span style="font-size: 11px; font-weight: 700; color: #475569;">అక్షరాల సైజు (Font Size):</span>
          <div style="display: flex; gap: 4px;">
            {#each fontSizes as fs, idx}
              <button
                type="button"
                on:click={() => fontSizeIndex = idx}
                style="padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 12px; border: 1px solid #cbd5e1; cursor: pointer; background-color: {fontSizeIndex === idx ? currentHeadlineColor : '#ffffff'}; color: {fontSizeIndex === idx ? '#ffffff' : '#334155'};"
              >
                {fs.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- 5. ఇమేజ్ మరియు వార్తా కథనం లేఅవుట్ (Layouts) -->
        {#if imageLayout === 'side' && article.image_url}
          <!-- 📰 పేపర్ సైడ్-బై-టెక్స్ట్ లేఅవుట్ (Left Side Image, Right Side Text) -->
          <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 14px;">
            
            <div style="flex: 1 1 280px; max-width: 320px;">
              <div style="border: 1px solid #cbd5e1; border-radius: {isRounded ? '10px' : '0px'}; overflow: hidden; background-color: #f8fafc;">
                <img
                  src={article.image_url}
                  alt="News Pic"
                  crossorigin="anonymous"
                  style="width: 100%; height: auto; object-fit: cover; display: block;"
                />
                {#if article.image_caption_1}
                  <p style="font-size: 10px; color: #64748b; text-align: center; padding: 4px; background-color: #f1f5f9; margin: 0; font-weight: 600;">
                    {article.image_caption_1}
                  </p>
                {/if}
              </div>

              {#if article.image_url_2}
                <div style="border: 1px solid #cbd5e1; border-radius: {isRounded ? '10px' : '0px'}; overflow: hidden; background-color: #f8fafc; margin-top: 10px;">
                  <img
                    src={article.image_url_2}
                    alt="News Pic 2"
                    crossorigin="anonymous"
                    style="width: 100%; height: auto; object-fit: cover; display: block;"
                  />
                  {#if article.image_caption_2}
                    <p style="font-size: 10px; color: #64748b; text-align: center; padding: 4px; background-color: #f1f5f9; margin: 0; font-weight: 600;">
                      {article.image_caption_2}
                    </p>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Content -->
            <div style="flex: 2 1 300px;">
              <p style="font-size: 13px; font-weight: 800; color: {currentHeadlineColor}; margin: 0 0 6px 0;">
                {article.location_town || 'ముత్తారం'} (NS News ప్రతినిధి) :
              </p>
              <div style="color: #0f172a; {fontSizes[fontSizeIndex].style} white-space: pre-line; text-align: justify; font-family: 'Noto Sans Telugu', sans-serif;">
                {article.content}
              </div>
            </div>

          </div>

        {:else if imageLayout === 'grid' && article.image_url && article.image_url_2}
          <!-- 🖼️ రెండు ఫోటోలు పక్కపక్కనే క్లబ్ అయిన లేఅవుట్ -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
            <div style="border: 1px solid #cbd5e1; border-radius: {isRounded ? '10px' : '0px'}; overflow: hidden; background-color: #f8fafc;">
              <img src={article.image_url} alt="Pic 1" crossorigin="anonymous" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
              {#if article.image_caption_1}
                <p style="font-size: 10px; color: #64748b; text-align: center; padding: 3px; margin: 0;">{article.image_caption_1}</p>
              {/if}
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: {isRounded ? '10px' : '0px'}; overflow: hidden; background-color: #f8fafc;">
              <img src={article.image_url_2} alt="Pic 2" crossorigin="anonymous" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
              {#if article.image_caption_2}
                <p style="font-size: 10px; color: #64748b; text-align: center; padding: 3px; margin: 0;">{article.image_caption_2}</p>
              {/if}
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <p style="font-size: 13px; font-weight: 800; color: {currentHeadlineColor}; margin: 0 0 6px 0;">
              {article.location_town || 'ముత్తారం'} (NS News ప్రతినిధి) :
            </p>
            <div style="color: #0f172a; {fontSizes[fontSizeIndex].style} white-space: pre-line; text-align: justify; font-family: 'Noto Sans Telugu', sans-serif;">
              {article.content}
            </div>
          </div>

        {:else}
          <!-- 🌟 బిగ్ / ఫుల్ స్టాండర్డ్ లేఅవుట్ -->
          {#if article.image_url}
            <div style="border: 1px solid #cbd5e1; border-radius: {isRounded ? '10px' : '0px'}; overflow: hidden; background-color: #f8fafc; margin-bottom: 14px;">
              <img
                src={article.image_url}
                alt="Main News Pic"
                crossorigin="anonymous"
                style="width: 100%; max-height: 360px; object-fit: cover; display: block; margin: 0 auto;"
              />
              {#if article.image_caption_1}
                <p style="font-size: 10px; color: #64748b; text-align: center; padding: 4px; background-color: #f1f5f9; margin: 0; font-weight: 600;">
                  {article.image_caption_1}
                </p>
              {/if}
            </div>
          {/if}

          <div style="margin-bottom: 14px;">
            <p style="font-size: 13px; font-weight: 800; color: {currentHeadlineColor}; margin: 0 0 6px 0;">
              {article.location_town || 'ముత్తారం'} (NS News ప్రతినిధి) :
            </p>
            <div style="color: #0f172a; {fontSizes[fontSizeIndex].style} white-space: pre-line; text-align: justify; font-family: 'Noto Sans Telugu', sans-serif;">
              {article.content}
            </div>
          </div>

          {#if article.image_url_2}
            <div style="border: 1px solid #cbd5e1; border-radius: {isRounded ? '10px' : '0px'}; overflow: hidden; background-color: #f8fafc; margin-bottom: 14px;">
              <img
                src={article.image_url_2}
                alt="News Pic 2"
                crossorigin="anonymous"
                style="width: 100%; max-height: 240px; object-fit: cover; display: block; margin: 0 auto;"
              />
              {#if article.image_caption_2}
                <p style="font-size: 10px; color: #64748b; text-align: center; padding: 4px; background-color: #f1f5f9; margin: 0; font-weight: 600;">
                  {article.image_caption_2}
                </p>
              {/if}
            </div>
          {/if}
        {/if}

        <!-- 6. సోషల్ మీడియా షేరింగ్ ఐకాన్ల బార్ -->
        <div style="border-top: 1px solid #cbd5e1; padding-top: 12px; margin-top: 14px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
            
            <span style="font-size: 11px; font-weight: 800; color: #475569; display: flex; align-items: center; gap: 4px;">
              <span>📢</span> ఈ వార్తను షేర్ చేయండి:
            </span>

            <div style="display: flex; align-items: center; gap: 6px;">
              <button
                type="button"
                on:click={shareWhatsApp}
                style="background-color: #25d366; color: #ffffff; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px;"
              >
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                on:click={shareFacebook}
                style="background-color: #1877f2; color: #ffffff; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; border: none; cursor: pointer;"
              >
                <span>Facebook</span>
              </button>

              <button
                type="button"
                on:click={shareTwitter}
                style="background-color: #000000; color: #ffffff; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; border: none; cursor: pointer;"
              >
                <span>X</span>
              </button>

              <button
                type="button"
                on:click={shareTelegram}
                style="background-color: #229ed9; color: #ffffff; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; border: none; cursor: pointer;"
              >
                <span>Telegram</span>
              </button>

              <button
                type="button"
                on:click={copyPageLink}
                style="background-color: #f1f5f9; color: #334155; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; border: 1px solid #cbd5e1; cursor: pointer;"
              >
                {copyFeedback ? '✓ కాపీడ్!' : '🔗 లింక్'}
              </button>
            </div>

          </div>
        </div>

        <!-- 7. కాపీరైట్ & దినపత్రిక CMYK కలర్ చుక్కల బార్ -->
        <div style="border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 14px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; font-weight: 700;">
          <div>
            <span>Copyright © 2026. A.S.V. Enterprises & NS News Network. All rights reserved.</span>
          </div>

          <!-- Color Dots (Cyan, Magenta, Yellow, Black) -->
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #0284c7; display: inline-block;"></span>
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #e11d48; display: inline-block;"></span>
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #eab308; display: inline-block;"></span>
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #0f172a; display: inline-block;"></span>
          </div>
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
      border: 1px solid #64748b !important;
      box-shadow: none !important;
      padding: 8px 12px !important;
      margin: 0 auto !important;
      max-width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    img {
      max-height: 160px !important;
      width: auto !important;
      margin: 2px auto !important;
      display: block !important;
      object-fit: contain !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    h1 {
      font-size: 16px !important;
      line-height: 1.25 !important;
      margin-bottom: 4px !important;
    }
  }
</style>