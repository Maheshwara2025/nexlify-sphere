<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  let authChecking = true;

  // 1. Published News Articles (For 1-Click Linking)
  let publishedArticles = [];
  let selectedArticleId = '';
  let loadingArticles = false;

  // 2. Aspect Ratios & Card Dimensions
  let selectedRatio = '1:1'; // '1:1', '4:5', '9:16', '16:9'
  const ratioConfigs = {
    '1:1': { width: 480, height: 480, label: '1:1 Square (WhatsApp / FB / X)' },
    '4:5': { width: 440, height: 550, label: '4:5 Portrait (Instagram Feed)' },
    '9:16': { width: 380, height: 640, label: '9:16 Vertical (Status / Reels)' },
    '16:9': { width: 560, height: 315, label: '16:9 Wide (YouTube / Web)' }
  };

  // 3. Brand Templates
  let selectedTemplate = 'jwala'; // 'jwala', 'ratna', 'darshini', 'vigyan', 'champion'

  // 4. Content State
  let badgeText = 'తాజా వార్త';
  let locationTag = 'ముత్తారం';
  let headline = 'కొత్త పింఛన్లపై మరో గుడ్‌న్యూస్.. మళ్లీ గడువు పెంచిన ప్రభుత్వం!';
  let summary = `• అర్హులైన లబ్ధిదారులకు దరఖాస్తు చేసుకోవడానికి ప్రభుత్వం మరో అవకాశం కల్పించింది.
• గ్రామ పంచాయతీ మరియు మున్సిపల్ కార్యాలయాల్లో ప్రత్యేక హెల్ప్‌డెస్క్‌లు ఏర్పాటు.
• దరఖాస్తుదారులు ఆధార్, రేషన్ కార్డు మరియు బ్యాంక్ వివరాలతో సంప్రదించాలి.`;
  let targetNewsUrl = 'https://www.nexlifynucleus.in';
  let showQrCode = true;

  // 5. Typography & Color Controls
  let selectedFont = "'Ramabhadra', sans-serif";
  let headlineFontSize = 18; // in px
  let summaryFontSize = 12;  // in px
  let headlineColor = '#facc15';      // Bright Yellow
  let headlineBgColor = '#000000';    // Black
  let summaryColor = '#f1f5f9';       // Slate Light
  let cardBgColor = '#090d16';        // Pitch Dark

  // 6. Photo Uploads
  let mainPhotoPreview = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80';
  let insetPhotoPreview = null;
  let showInsetCircle = false;
  let isGenerating = false;

  // Computed QR Code Image URL (Using high-reliability dynamic QR API)
  $: qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=${encodeURIComponent(targetNewsUrl)}`;

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
      return;
    }
    authChecking = false;
    await fetchPublishedArticles();
  });

  // Fetch News from Supabase for 1-Click Linking
  async function fetchPublishedArticles() {
    loadingArticles = true;
    try {
      let { data } = await supabase
        .from('news_articles')
        .select('id, headline, title, content, location_town, image_url')
        .order('id', { ascending: false })
        .limit(25);

      if (!data || data.length === 0) {
        const res = await supabase.from('news').select('id, title, headline, content, location_town, image_url').order('id', { ascending: false }).limit(25);
        data = res.data;
      }
      publishedArticles = data || [];
    } catch (e) {
      console.error('Fetch articles error:', e);
    } finally {
      loadingArticles = false;
    }
  }

  // 1-Click Auto Fill from Main News Article
  function applyArticleToCard() {
    const art = publishedArticles.find(a => String(a.id) === String(selectedArticleId));
    if (!art) return;

    headline = art.headline || art.title || headline;
    locationTag = art.location_town || locationTag;
    if (art.image_url) {
      mainPhotoPreview = art.image_url;
    }

    // Auto extract first 3 concise lines from content
    if (art.content) {
      const cleanLines = art.content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 15)
        .slice(0, 3)
        .map(l => l.startsWith('•') ? l : `• ${l}`);
      
      if (cleanLines.length > 0) {
        summary = cleanLines.join('\n');
      }
    }

    // Connect Smart QR code directly to this published news
    targetNewsUrl = `https://www.nexlifynucleus.in/news/${art.id}`;
    showQrCode = true;
  }

  function handleMainPhoto(e) {
    const input = e.target;
    if (input.files && input.files[0]) {
      mainPhotoPreview = URL.createObjectURL(input.files[0]);
    }
  }

  function handleInsetPhoto(e) {
    const input = e.target;
    if (input.files && input.files[0]) {
      insetPhotoPreview = URL.createObjectURL(input.files[0]);
      showInsetCircle = true;
    }
  }

  // Load html-to-image library
  async function loadHtmlToImage() {
    if (typeof window === 'undefined') return null;
    if (window.htmlToImage) return window.htmlToImage;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
      script.onload = () => resolve(window.htmlToImage);
      script.onerror = () => reject(new Error('html-to-image లోడ్ కాలేదు'));
      document.head.appendChild(script);
    });
  }

  // Mobile-Optimized High Quality JPEG Download Engine with Web Share API
  async function downloadCardAsJpeg() {
    if (isGenerating) return;
    isGenerating = true;

    try {
      const node = document.getElementById('card-render-stage');
      if (!node) throw new Error('కార్డ్ ఎలిమెంట్ కనుగొనబడలేదు');

      const hti = await loadHtmlToImage();
      
      // Generate clean, mobile-compatible JPEG with 95% quality and 2.5x pixel ratio
      const dataUrl = await hti.toJpeg(node, {
        quality: 0.95,
        pixelRatio: 2.5,
        backgroundColor: cardBgColor || '#000000'
      });

      // Convert dataUrl to Blob for robust mobile compatibility
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `NS_News_Card_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // If mobile supports native Web Share API with files, trigger native system sheet
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: headline,
          text: `${headline}\n\nపూర్తి కథనం: ${targetNewsUrl}`
        });
      } else {
        // Fallback: standard browser download
        const link = document.createElement('a');
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert('కార్డ్ డౌన్‌లోడ్ లోపం: ' + err.message);
    } finally {
      isGenerating = false;
    }
  }

  function shareDirectWhatsApp() {
    const text = `*${headline}*\n\n📍 ${locationTag} | NS News Network\n\nపూర్తి వివరాలు చదవండి:\n👉 ${targetNewsUrl}\n\n_A.S.V. Enterprises & NS Media_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  // Preset Template Styles Auto-Setter
  function applyPresetStyle(style) {
    selectedTemplate = style;
    if (style === 'jwala') {
      headlineColor = '#facc15';
      headlineBgColor = '#000000';
      summaryColor = '#f1f5f9';
      cardBgColor = '#090d16';
    } else if (style === 'ratna') {
      headlineColor = '#ffffff';
      headlineBgColor = '#dc2626';
      summaryColor = '#ffffff';
      cardBgColor = '#0f172a';
    } else if (style === 'darshini') {
      headlineColor = '#0f172a';
      headlineBgColor = '#facc15';
      summaryColor = '#ffffff';
      cardBgColor = '#1e3a8a';
    } else if (style === 'vigyan') {
      headlineColor = '#0f172a';
      headlineBgColor = '#f1f5f9';
      summaryColor = '#1e293b';
      cardBgColor = '#ffffff';
    }
  }
</script>

<svelte:head>
  <title>NS News Picture Card Studio | Advanced Pro Creator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Gidugu&family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Ramabhadra&family=Suranna&family=Tenali+Ramakrishna&display=swap" rel="stylesheet">
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    <div class="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <div class="min-h-screen bg-[#090d16] font-sans pb-28 text-slate-100">
    
    <!-- Top Header -->
    <header class="bg-[#050811] text-white px-4 py-3 sticky top-0 z-40 border-b-2 border-red-600 shadow-2xl">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <span class="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow">NS</span>
          <div>
            <h1 class="text-sm sm:text-base font-black tracking-wide text-white font-['Ramabhadra']">
              PICTURE NEWS CARD STUDIO PRO
            </h1>
            <p class="text-[10px] text-slate-400">స్మార్ట్ QR కోడ్ & అడ్వాన్స్‌డ్ టైపోగ్రఫీ ఎడిటర్ • JPEG మొబైల్ డౌన్‌లోడ్</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a href="/admin/news" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-xl font-bold border border-slate-700 transition">
            ← న్యూస్ డెస్క్
          </a>
          <a href="/admin/contractor" class="bg-amber-600 hover:bg-amber-700 text-slate-950 text-xs px-3 py-1.5 rounded-xl font-black transition shadow">
            🏗️ కాంట్రాక్టర్ డెస్క్
          </a>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- LEFT SIDE: CONTROLS & STUDIO PANEL (5 Columns) -->
      <section class="lg:col-span-5 bg-[#131b2e] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5">
        
        <!-- 1. AUTO LINK FROM PUBLISHED MAIN NEWS -->
        <div class="bg-slate-900/90 border border-amber-500/40 p-3.5 rounded-2xl space-y-2">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
              <span>🔗</span> <span>మెయిన్ న్యూస్‌తో లింక్ చేయండి (1-Click Auto Fill)</span>
            </label>
            <span class="text-[10px] text-slate-400">{publishedArticles.length} వార్తలు</span>
          </div>

          <div class="flex items-center gap-2">
            <select
              bind:value={selectedArticleId}
              class="w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold p-2 rounded-xl focus:outline-none"
            >
              <option value="">-- వెబ్‌సైట్ వార్తను ఎంచుకోండి --</option>
              {#each publishedArticles as a}
                <option value={a.id}>#{a.id} • {a.headline || a.title}</option>
              {/each}
            </select>

            <button
              type="button"
              on:click={applyArticleToCard}
              disabled={!selectedArticleId}
              class="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow shrink-0 cursor-pointer"
            >
              ఆటో-ఫిల్
            </button>
          </div>
        </div>

        <!-- 2. CARD RATIO / SIZE SELECTION -->
        <div>
          <label class="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
            కార్డ్ సైజు / నిష్పత్తి (Card Size)
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
            {#each Object.keys(ratioConfigs) as ratioKey}
              <button
                type="button"
                on:click={() => selectedRatio = ratioKey}
                class="p-2 rounded-xl border text-center transition {selectedRatio === ratioKey ? 'bg-red-600 text-white border-red-500 font-black shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-700'}"
              >
                {ratioKey}
              </button>
            {/each}
          </div>
        </div>

        <!-- 3. BRAND PRESET TEMPLATES -->
        <div>
          <label class="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
            టెంప్లేట్ స్టైల్ (Brand Preset)
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
            <button
              type="button"
              on:click={() => applyPresetStyle('jwala')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'jwala' ? 'bg-amber-500 text-black border-amber-400 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-700'}"
            >
              🔥 NS జ్వాల
            </button>
            <button
              type="button"
              on:click={() => applyPresetStyle('ratna')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'ratna' ? 'bg-red-600 text-white border-red-500 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-700'}"
            >
              💎 NS రత్న
            </button>
            <button
              type="button"
              on:click={() => applyPresetStyle('darshini')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'darshini' ? 'bg-blue-600 text-white border-blue-400 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-700'}"
            >
              🌟 NS దర్శిని
            </button>
            <button
              type="button"
              on:click={() => applyPresetStyle('vigyan')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'vigyan' ? 'bg-emerald-600 text-white border-emerald-400 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-700'}"
            >
              🏛️ NS విజ్ఞాన్
            </button>
          </div>
        </div>

        <!-- 4. ADVANCED TYPOGRAPHY & COLOR PICKER CONTROLS -->
        <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3.5 text-xs">
          <span class="font-black text-amber-400 block border-b border-slate-800 pb-1.5">
            🎨 ఫాంట్, సైజు & రంగుల కంట్రోల్స్ (Custom Typography)
          </span>

          <!-- Telugu Font Family Selector -->
          <div>
            <label class="block font-bold text-slate-400 mb-1">తెలుగు ఫాంట్ శైలి (Font Selection)</label>
            <select
              bind:value={selectedFont}
              class="w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold p-2 rounded-xl"
            >
              <option value="'Ramabhadra', sans-serif">రామభద్ర (Ramabhadra - ముదురు హెడ్‌లైన్లకు బెస్ట్)</option>
              <option value="'Noto Sans Telugu', sans-serif">నోటో సాన్స్ తెలుగు (Noto Sans - క్లియర్ & మోడ్రన్)</option>
              <option value="'Suranna', serif">సూరన్న (Suranna - క్లాసిక్ పత్రిక ఫాంట్)</option>
              <option value="'Gidugu', sans-serif">గిడుగు (Gidugu - రౌండెడ్ స్టైలిష్)</option>
              <option value="'Tenali Ramakrishna', sans-serif">తెనాలి రామకృష్ణ (Tenali Ramakrishna)</option>
            </select>
          </div>

          <!-- Font Size Adjusters -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="flex justify-between text-slate-400 font-bold mb-1">
                <span>శీర్షిక సైజు</span>
                <span class="text-white font-mono">{headlineFontSize}px</span>
              </div>
              <input type="range" min="14" max="28" bind:value={headlineFontSize} class="w-full accent-red-600 cursor-pointer" />
            </div>

            <div>
              <div class="flex justify-between text-slate-400 font-bold mb-1">
                <span>సారాంశం సైజు</span>
                <span class="text-white font-mono">{summaryFontSize}px</span>
              </div>
              <input type="range" min="9" max="18" bind:value={summaryFontSize} class="w-full accent-blue-600 cursor-pointer" />
            </div>
          </div>

          <!-- Color Pickers Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-bold text-[11px]">
            <div>
              <label class="block text-slate-400 mb-1">హెడ్‌లైన్ రంగు</label>
              <div class="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-700">
                <input type="color" bind:value={headlineColor} class="w-6 h-6 border-0 rounded cursor-pointer bg-transparent" />
                <span class="font-mono text-[10px] uppercase text-white truncate">{headlineColor}</span>
              </div>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">హెడ్‌లైన్ Bg</label>
              <div class="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-700">
                <input type="color" bind:value={headlineBgColor} class="w-6 h-6 border-0 rounded cursor-pointer bg-transparent" />
                <span class="font-mono text-[10px] uppercase text-white truncate">{headlineBgColor}</span>
              </div>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">సారాంశం రంగు</label>
              <div class="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-700">
                <input type="color" bind:value={summaryColor} class="w-6 h-6 border-0 rounded cursor-pointer bg-transparent" />
                <span class="font-mono text-[10px] uppercase text-white truncate">{summaryColor}</span>
              </div>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">కార్డ్ బ్యాక్‌గ్రౌండ్</label>
              <div class="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-700">
                <input type="color" bind:value={cardBgColor} class="w-6 h-6 border-0 rounded cursor-pointer bg-transparent" />
                <span class="font-mono text-[10px] uppercase text-white truncate">{cardBgColor}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. PHOTO UPLOADS -->
        <div class="grid grid-cols-2 gap-3">
          <div class="border-2 border-dashed border-slate-700 bg-slate-900/60 p-3 rounded-2xl text-center">
            <input type="file" id="main-photo-in" accept="image/*" on:change={handleMainPhoto} class="hidden" />
            <label for="main-photo-in" class="cursor-pointer block">
              <span class="text-xl block">📷</span>
              <span class="text-xs font-bold text-slate-200 block">ప్రధాన ఫోటో మార్చండి</span>
            </label>
          </div>

          <div class="border-2 border-dashed border-slate-700 bg-slate-900/60 p-3 rounded-2xl text-center">
            <input type="file" id="inset-photo-in" accept="image/*" on:change={handleInsetPhoto} class="hidden" />
            <label for="inset-photo-in" class="cursor-pointer block">
              <span class="text-xl block">👤</span>
              <span class="text-xs font-bold text-slate-200 block">సర్కిల్ లీడర్ ఫోటో</span>
            </label>
          </div>
        </div>

        <!-- 6. TEXT INPUTS & SMART QR TOGGLE -->
        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-400 mb-1">కేటగిరీ బ్యాడ్జ్</label>
              <input type="text" bind:value={badgeText} class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold" />
            </div>
            <div>
              <label class="block font-bold text-slate-400 mb-1">ఊరు / లొకేషన్</label>
              <input type="text" bind:value={locationTag} class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-400 mb-1">బోల్డ్ శీర్షిక (Headline) *</label>
            <textarea
              bind:value={headline}
              rows="2"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-black text-sm"
              style="font-family: {selectedFont};"
            ></textarea>
          </div>

          <div>
            <label class="block font-bold text-slate-400 mb-1">సారాంశం (Summary Points) *</label>
            <textarea
              bind:value={summary}
              rows="3"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs leading-relaxed"
            ></textarea>
          </div>

          <!-- Smart QR Code Config -->
          <div class="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
                <input type="checkbox" bind:checked={showQrCode} class="w-4 h-4 text-red-600 rounded" />
                <span>🏁 స్మార్ట్ QR కోడ్ ఆన్ చేయండి (Scan for Full News)</span>
              </label>
            </div>
            {#if showQrCode}
              <div>
                <label class="block text-[10px] text-slate-400 mb-1">QR కోడ్ స్కాన్ చేయగానే ఓపెన్ అయ్యే వెబ్‌సైట్ లింక్:</label>
                <input
                  type="text"
                  bind:value={targetNewsUrl}
                  placeholder="https://www.nexlifynucleus.in/news/..."
                  class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs font-mono"
                />
              </div>
            {/if}
          </div>
        </div>

        <!-- 7. MOBILE OPTIMIZED JPEG DOWNLOAD & SHARE BUTTONS -->
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            on:click={downloadCardAsJpeg}
            disabled={isGenerating}
            class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>🖼️</span>
            <span>{isGenerating ? 'సిద్ధమవుతోంది...' : 'HD JPEG డౌన్‌లోడ్'}</span>
          </button>

          <button
            type="button"
            on:click={shareDirectWhatsApp}
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>📲 WhatsApp షేర్</span>
          </button>
        </div>

      </section>

      <!-- RIGHT SIDE: LIVE INTERACTIVE PREVIEW STAGE (7 Columns) -->
      <section class="lg:col-span-7 flex flex-col items-center justify-center">
        
        <div class="w-full mb-3 flex items-center justify-between text-xs text-slate-400 px-2 font-bold">
          <span>🔍 లైవ్ కార్డు ప్రివ్యూ ({ratioConfigs[selectedRatio].label})</span>
          <span class="text-amber-400">JPEG మోడ్ • 100% ఆటో-ఫిట్</span>
        </div>

        <!-- CARD RENDER CONTAINER -->
        <div class="overflow-hidden p-2 flex items-center justify-center w-full">
          
          <div
            id="card-render-stage"
            class="relative overflow-hidden shadow-2xl flex flex-col justify-between select-none"
            style="
              width: {ratioConfigs[selectedRatio].width}px;
              height: {ratioConfigs[selectedRatio].height}px;
              background-color: {cardBgColor};
              font-family: {selectedFont};
            "
          >

            <!-- 1. TOP PHOTO CONTAINER -->
            <div class="relative w-full overflow-hidden bg-black flex-shrink-0" style="height: {selectedRatio === '1:1' ? '50%' : selectedRatio === '4:5' ? '46%' : selectedRatio === '9:16' ? '42%' : '52%'};">
              <img
                src={mainPhotoPreview}
                alt="News Feature"
                crossorigin="anonymous"
                class="w-full h-full object-cover"
              />

              <!-- Top Branding Strip -->
              <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                <div class="flex items-center gap-1.5 bg-black/85 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-red-600/80 shadow-lg">
                  <span class="bg-red-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow">NS</span>
                  <span class="font-black text-xs text-white font-['Ramabhadra'] tracking-wide">NS NEWS</span>
                </div>

                <span class="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                  {badgeText}
                </span>
              </div>

              <!-- Leader Face Inset Circle -->
              {#if showInsetCircle && insetPhotoPreview}
                <div class="absolute bottom-2.5 right-2.5 w-16 h-16 rounded-full border-2 border-white overflow-hidden shadow-2xl bg-white z-10">
                  <img src={insetPhotoPreview} alt="Leader" class="w-full h-full object-cover" />
                </div>
              {/if}
            </div>

            <!-- 2. HEADLINE TITLE BAND -->
            <div
              class="px-3.5 py-2.5 shadow-md flex-shrink-0"
              style="background-color: {headlineBgColor};"
            >
              <h2
                class="font-black leading-snug tracking-tight m-0 text-center"
                style="color: {headlineColor}; font-size: {headlineFontSize}px; font-family: {selectedFont};"
              >
                {headline}
              </h2>
            </div>

            <!-- 3. SUMMARY BODY & SMART QR SECTION -->
            <div class="flex-1 p-3.5 flex flex-col justify-between overflow-hidden" style="background-color: {cardBgColor};">
              
              <div class="flex items-start gap-3">
                <!-- Summary Text -->
                <div
                  class="flex-1 leading-relaxed font-medium whitespace-pre-line line-clamp-4"
                  style="color: {summaryColor}; font-size: {summaryFontSize}px; font-family: 'Noto Sans Telugu', sans-serif;"
                >
                  {summary}
                </div>

                <!-- SMART QR CODE (Scan for Full News) -->
                {#if showQrCode}
                  <div class="flex-shrink-0 bg-white p-1.5 rounded-xl border border-slate-200 text-center shadow-md">
                    <img
                      src={qrImageUrl}
                      alt="Scan QR"
                      crossorigin="anonymous"
                      class="w-16 h-16 object-contain block mx-auto"
                    />
                    <span class="text-[8px] font-black text-slate-900 block mt-0.5 tracking-tighter">
                      స్కాన్ చేయండి
                    </span>
                  </div>
                {/if}
              </div>

              <!-- 4. BOTTOM BRANDING FOOTER -->
              <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span class="tracking-wide text-white font-mono">WWW.NEXLIFYNUCLEUS.IN</span>
                <span class="bg-red-600/30 text-red-300 border border-red-500/40 px-2 py-0.5 rounded text-[9px]">
                  📍 {locationTag} • @nexlifynews
                </span>
              </div>

            </div>

          </div>

        </div>

      </section>

    </main>
  </div>
{/if}