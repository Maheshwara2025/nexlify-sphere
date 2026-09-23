<script>
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let article = null;
  let loading = true;
  let downloadingClip = false;

  // 1. హెడ్‌లైన్స్ & కలర్ థీమ్స్ కోసం 9 రాయల్ రంగులు
  const headlineColors = [
    '#b91c1c', // 1. Deep Crimson Red
    '#1d4ed8', // 2. Royal Blue
    '#047857', // 3. Emerald Green
    '#7c3aed', // 4. Royal Purple
    '#c2410c', // 5. Burnt Orange
    '#0f766e', // 6. Deep Teal
    '#be123c', // 7. Cherry Rose
    '#1e293b', // 8. Dark Slate
    '#831843'  // 9. Wine Maroon
  ];

  $: currentHeadlineColor = article?.id ? headlineColors[article.id % headlineColors.length] : headlineColors[0];

  // 2. కలర్ టెక్స్ట్ & ముఖ్యాంశాల స్మార్ట్ ఫార్మాటర్
  function formatNewsContent(rawText, themeColor) {
    if (!rawText) return '';

    // పేరాగ్రాఫ్‌ల వారీగా విభజించడం
    const paragraphs = rawText.split(/\n\s*\n/);

    return paragraphs.map((para, pIdx) => {
      let lines = para.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return '';

      // A. బుల్లెట్ పాయింట్లు ఉంటే Eenadu మోడల్ "ముఖ్యాంశాలు" కలర్ బాక్స్
      const isBulletList = lines.every(l => /^([•\-\*■✦]|\d+[\.\)])\s*/.test(l));
      if (isBulletList) {
        const itemsHtml = lines.map(l => {
          const clean = l.replace(/^([•\-\*■✦]|\d+[\.\)])\s*/, '');
          const formatted = applyInlineColors(clean, themeColor);
          return `<li style="margin-bottom: 6px; display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: ${themeColor}; font-weight: 900; font-size: 13px; line-height: 1.3;">✦</span>
            <span>${formatted}</span>
          </li>`;
        }).join('');

        return `<div style="background-color: #fff9f5; border-left: 4px solid ${themeColor}; border-radius: 0 12px 12px 0; padding: 12px 16px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size: 12px; font-weight: 900; color: ${themeColor}; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px;">
            <span>📌</span> <span>ముఖ్యాంశాలు (Key Highlights):</span>
          </div>
          <ul style="list-style: none; padding: 0; margin: 0; font-weight: 600; color: #1e293b; line-height: 1.6;">
            ${itemsHtml}
          </ul>
        </div>`;
      }

      // B. చిన్న సింగిల్ లైన్ ఉంటే ఆటోమేటిక్ అంతర శీర్షిక (Colored Subheading)
      if (lines.length === 1 && lines[0].length < 65 && !lines[0].endsWith('.') && (lines[0].endsWith(':') || lines[0].endsWith('?') || !lines[0].includes('.'))) {
        return `<h3 style="color: ${themeColor}; font-size: 17.5px; font-weight: 900; margin: 22px 0 10px 0; font-family: 'Ramabhadra', sans-serif; display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 5px; height: 18px; background-color: ${themeColor}; border-radius: 3px;"></span>
          <span>${applyInlineColors(lines[0], themeColor)}</span>
        </h3>`;
      }

      // C. సాధారణ పేరాగ్రాఫ్ (ఇన్‌లైన్ రంగులతో)
      const paraText = lines.join(' ');
      const formattedPara = applyInlineColors(paraText, themeColor);

      if (pIdx === 0) {
        // మొదటి లీడ్ పేరా కాస్త ముదురు రంగులో
        return `<p style="margin-bottom: 14px; color: #0f172a; font-weight: 600; text-align: justify; line-height: 1.75;">${formattedPara}</p>`;
      }

      return `<p style="margin-bottom: 14px; color: #1e293b; text-align: justify; line-height: 1.75;">${formattedPara}</p>`;
    }).join('');
  }

  // ఇన్‌లైన్ కలర్ ట్యాగ్స్ ప్రాసెసింగ్ ([red], [blue], *పదం*)
  function applyInlineColors(text, themeColor) {
    return text
      .replace(/\[red\](.*?)\[\/red\]/gi, `<span style="color: #dc2626; font-weight: 800;">$1</span>`)
      .replace(/\[blue\](.*?)\[\/blue\]/gi, `<span style="color: #1d4ed8; font-weight: 800;">$1</span>`)
      .replace(/\[green\](.*?)\[\/green\]/gi, `<span style="color: #047857; font-weight: 800;">$1</span>`)
      .replace(/\[orange\](.*?)\[\/orange\]/gi, `<span style="color: #ea580c; font-weight: 800;">$1</span>`)
      .replace(/\[purple\](.*?)\[\/purple\]/gi, `<span style="color: #7c3aed; font-weight: 800;">$1</span>`)
      .replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${themeColor}; font-weight: 800;">$1</strong>`)
      .replace(/\*([^*\n]+)\*/g, `<strong style="color: ${themeColor}; font-weight: 800;">$1</strong>`);
  }

  // 3. ఇంగ్లీష్ వార్త అయితే ఆటో-డిటెక్షన్
  $: isEnglishArticle = (() => {
    if (!article) return false;
    const sampleText = ((article.headline || '') + ' ' + (article.content || '')).substring(0, 200);
    const hasTelugu = /[\u0C00-\u0C7F]/.test(sampleText);
    const hasEnglish = /[a-zA-Z]{4,}/.test(sampleText);
    return hasEnglish && !hasTelugu;
  })();

  // 4. స్పష్టమైన & నిదానమైన ఇంగ్లీష్ ఆడియో రీడర్ (Slow & Clear Voice)
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
    const textToRead = `${article.headline || ''}. ${article.content || ''}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);

    utterance.rate = 0.84; // ప్రశాంతంగా, స్పష్టంగా చదివే వేగం
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

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

  // 5. ఫాంట్ సైజ్ కంట్రోలర్ (A- A A+)
  let fontSizeIndex = 1;
  const fontSizes = [
    { label: 'A-', style: 'font-size: 14.5px;' },
    { label: 'A',  style: 'font-size: 16.5px;' },
    { label: 'A+', style: 'font-size: 19.5px;' }
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

  $: readingTime = (() => {
    if (!article?.content) return 1;
    const words = article.content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 150));
  })();

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
      script.onerror = () => reject(new Error('html-to-image లోడ్ కాలేదు'));
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
      alert('PNG download ఎర్రర్: ' + err.message);
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
      alert('లింక్ కాపీ కాలేదు');
    }
  }
</script>

<svelte:head>
  {#if article}
    <title>{article.headline || article.title} | NS News</title>
  {/if}
</svelte:head>

<div class="min-h-screen bg-[#f4f6f9] font-sans pb-16 text-slate-900">
  
  <!-- హెడర్ -->
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

      <!-- బ్రెడ్‌క్రంబ్స్ & పేపర్ క్లిప్ బటన్లు -->
      <div class="no-print flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center gap-1.5 text-slate-500 font-medium">
          <a href="/" class="hover:text-red-600 transition">హోమ్</a>
          <span>›</span>
          <a href="/news" class="hover:text-red-600 transition">వార్తలు</a>
          <span>›</span>
          <span class="text-red-700 font-bold">{article.location_town || 'తెలంగాణ'}</span>
        </div>

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

      <!-- 📰 ఈనాడు పోర్టల్ మోడల్ కార్డ్ -->
      <article 
        id="news-printable-area" 
        style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.05);"
      >
        
        <!-- 1. ప్రధాన శీర్షిక (Headline) -->
        <div style="margin-bottom: 14px;">
          <h1 
            style="color: {currentHeadlineColor}; font-size: 26px; line-height: 1.35; font-weight: 900; margin: 0; font-family: 'Ramabhadra', 'Noto Sans Telugu', sans-serif; letter-spacing: -0.01em;"
          >
            {article.headline || article.title}
          </h1>
        </div>

        <!-- 2. ఇన్ఫో & బైలైన్ స్ట్రిప్ -->
        <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 4px; margin-bottom: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; background-color: #fafbfc;">
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

          <!-- ఫాంట్ సైజ్ & వాట్సాప్ ఐకాన్ -->
          <div style="display: flex; align-items: center; gap: 10px;">
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

        <!-- 3. ఇంగ్లీష్ ఆడియో రీడర్ (Slow & Clear) -->
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

        <!-- 4. ప్రధాన ఫోటో (Face Cut లేకుండా పూర్తి ఫోటో) -->
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

        <!-- 5. వార్తా కథనం (కలర్ టెక్స్ట్, ముఖ్యాంశాల బాక్స్ & అంతర శీర్షికలతో) -->
        <div style="margin-bottom: 18px;">
          <!-- రిపోర్టర్ & లొకేషన్ బ్యాడ్జ్ -->
          <div style="display: inline-block; background-color: #fef2f2; border-left: 3px solid #b91c1c; padding: 3px 8px; border-radius: 0 6px 6px 0; margin-bottom: 10px;">
            <span style="font-size: 13px; font-weight: 900; color: #b91c1c;">
              {article.location_town || 'ముత్తారం'} (NS News ప్రతినిధి) :
            </span>
          </div>

          <!-- డైనమిక్ ఫార్మాటెడ్ కలర్ టెక్స్ట్ -->
          <div style="{fontSizes[fontSizeIndex].style} font-family: 'Noto Sans Telugu', sans-serif;">
            {@html formatNewsContent(article.content, currentHeadlineColor)}
          </div>
        </div>

        <!-- 6. రెండవ ఫోటో (ఉంటే) -->
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

        <!-- 7. టాపిక్స్ / Tags -->
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

        <!-- 8. సోషల్ మీడియా షేరింగ్ బార్ -->
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

        <!-- 9. కాపీరైట్ & కలర్ డాట్స్ ఫుటర్ -->
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