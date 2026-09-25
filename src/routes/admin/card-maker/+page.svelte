<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  let authChecking = true;

  // 1. Published News Articles (For 1-Click Linking)
  let publishedArticles = [];
  let selectedArticleId = '';

  // 2. Aspect Ratios & Card Dimensions
  let selectedRatio = '1:1'; // '1:1', '4:5', '9:16', '16:9'
  const ratioConfigs = {
    '1:1': { width: 500, height: 500, label: '1:1 Square (WhatsApp / FB / X)' },
    '4:5': { width: 440, height: 550, label: '4:5 Portrait (Instagram Feed)' },
    '9:16': { width: 380, height: 640, label: '9:16 Vertical (Status / Reels)' },
    '16:9': { width: 580, height: 326, label: '16:9 Wide (YouTube / Web)' }
  };

  // 3. Brand Presets
  let selectedTemplate = 'jwala'; // 'jwala', 'ratna', 'darshini', 'vigyan', 'champion'

  // 4. Inbuilt Category Combo Box Options
  const categoryOptions = [
    'తాజా వార్త',
    'బ్రేకింగ్ న్యూస్',
    'రాజకీయం',
    'సంక్షేమ పథకాలు',
    'విద్య & ఉద్యోగాలు',
    'వ్యవసాయం / రైతు',
    'క్రైమ్ & అలర్ట్',
    'జిల్లా వార్తలు',
    'ఆధ్యాత్మికం',
    'క్రీడలు / సినిమా',
    'కస్టమ్ (Custom)'
  ];
  let selectedCategoryChoice = 'తాజా వార్త';
  let customCategoryText = '';
  $: badgeText = selectedCategoryChoice === 'కస్టమ్ (Custom)' ? (customCategoryText || 'వార్త') : selectedCategoryChoice;

  // 5. Inbuilt Location Options (Default: న్యూస్ డెస్క్)
  const locationOptions = [
    'న్యూస్ డెస్క్',
    'ముత్తారం',
    'పెద్దపల్లి',
    'కరీంనగర్',
    'హైదరాబాద్',
    'తెలంగాణ',
    'కస్టమ్ (Custom)'
  ];
  let selectedLocationChoice = 'న్యూస్ డెస్క్';
  let customLocationText = '';
  $: locationTag = selectedLocationChoice === 'కస్టమ్ (Custom)' ? (customLocationText || 'న్యూస్ డెస్క్') : selectedLocationChoice;

  // 6. Content State
  let headline = 'కొత్త పింఛన్లపై మరో గుడ్‌న్యూస్.. మళ్లీ గడువు పెంచిన ప్రభుత్వం!';
  let summary = `• అర్హులైన లబ్ధిదారులకు దరఖాస్తు చేసుకోవడానికి ప్రభుత్వం మరో అవకాశం కల్పించింది.
• గ్రామ పంచాయతీ మరియు మున్సిపల్ కార్యాలయాల్లో ప్రత్యేక హెల్ప్‌డెస్క్‌లు ఏర్పాటు.
• దరఖాస్తుదారులు ఆధార్, రేషన్ కార్డు మరియు బ్యాంక్ వివరాలతో సంప్రదించాలి.`;

  // 7. Typography Controls (Headline up to 36px, Body up to 26px)
  let selectedFont = "'Ramabhadra', sans-serif";
  let headlineFontSize = 30; // in px (default around 30-33px)
  let summaryFontSize = 20;  // in px (default up to 24px)
  let headlineColor = '#facc15';      // Bright Yellow
  let headlineBgColor = '#000000';    // Black
  let summaryColor = '#f8fafc';       // Slate Light
  let cardBgColor = '#090d16';        // Pitch Dark

  // 8. Image Controls (Focus & Photo Height Slider)
  let mainPhotoPreview = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80';
  let insetPhotoPreview = null;
  let showInsetCircle = false;
  let imagePosition = 'center'; // 'center', 'top', 'bottom'
  let photoHeightPercent = 46;  // 35% to 60%
  let isGenerating = false;

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
      return;
    }
    authChecking = false;
    await fetchPublishedArticles();
  });

  // Fetch Published News from Supabase
  async function fetchPublishedArticles() {
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
    }
  }

  // 1-Click Auto Fill from Main News Article
  function applyArticleToCard() {
    const art = publishedArticles.find(a => String(a.id) === String(selectedArticleId));
    if (!art) return;

    headline = art.headline || art.title || headline;
    if (art.location_town) {
      selectedLocationChoice = 'కస్టమ్ (Custom)';
      customLocationText = art.location_town;
    }
    if (art.image_url) {
      mainPhotoPreview = art.image_url;
    }

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

  // Mobile-Optimized High-Quality JPEG Download Engine
  async function downloadCardAsJpeg() {
    if (isGenerating) return;
    isGenerating = true;

    try {
      const node = document.getElementById('card-render-stage');
      if (!node) throw new Error('కార్డ్ ఎలిమెంట్ కనుగొనబడలేదు');

      const hti = await loadHtmlToImage();
      
      const dataUrl = await hti.toJpeg(node, {
        quality: 0.96,
        pixelRatio: 2.5,
        backgroundColor: cardBgColor || '#000000'
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `NS_News_Card_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Mobile Native Web Share API
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: headline,
          text: `${headline}\n\nతాజా వార్తల కోసం: https://www.nexlifynucleus.in`
        });
      } else {
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
    const text = `*${headline}*\n\n${summary}\n\n📍 ${locationTag} | NS News Network\n👉 https://www.nexlifynucleus.in\n\n_A.S.V. Enterprises & NS Media_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  function applyPresetStyle(style) {
    selectedTemplate = style;
    if (style === 'jwala') {
      headlineColor = '#facc15';
      headlineBgColor = '#000000';
      summaryColor = '#f8fafc';
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
      headlineBgColor = '#e2e8f0';
      summaryColor = '#0f172a';
      cardBgColor = '#ffffff';
    }
  }
</script>

<svelte:head>
  <title>NS News Picture Card Studio Pro</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Dhurjati&family=Gidugu&family=Mandali&family=Montserrat:wght@700;800;900&family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Oswald:wght@600;700&family=Peddana&family=Poppins:wght@700;800&family=Ramabhadra&family=Roboto:wght@700;900&family=Suranna&display=swap" rel="stylesheet">
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
            <p class="text-[10px] text-slate-400">అడ్వాన్స్‌డ్ టైపోగ్రఫీ ఎడిటర్ • హెచ్‌డీ JPEG మొబైల్ డౌన్‌లోడ్</p>
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
        
        <!-- 1. AUTO LINK FROM MAIN NEWS -->
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

        <!-- 4. ADVANCED TYPOGRAPHY & FONT SELECTION -->
        <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3.5 text-xs">
          <span class="font-black text-amber-400 block border-b border-slate-800 pb-1.5">
            🎨 ఫాంట్, సైజు & రంగుల కంట్రోల్స్ (Font & Sizing)
          </span>

          <!-- Telugu & English Font Family Selector -->
          <div>
            <label class="block font-bold text-slate-400 mb-1">ఫాంట్ ఎంపిక (Telugu & English Fonts)</label>
            <select
              bind:value={selectedFont}
              class="w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold p-2.5 rounded-xl"
            >
              <optgroup label="తెలుగు ఫాంట్లు (Telugu Fonts)">
                <option value="'Ramabhadra', sans-serif">రామభద్ర (Ramabhadra - ప్రముఖ బోల్డ్ న్యూస్ ఫాంట్)</option>
                <option value="'Noto Sans Telugu', sans-serif">నోటో సాన్స్ (Noto Sans - మోడ్రన్ & స్పష్టమైనది)</option>
                <option value="'Suranna', serif">సూరన్న (Suranna - క్లాసిక్ పత్రిక ఫాంట్)</option>
                <option value="'Gidugu', sans-serif">గిడుగు (Gidugu - స్టైలిష్ రౌండెడ్)</option>
                <option value="'Mandali', sans-serif">మండలి (Mandali - క్లీన్ రీడింగ్)</option>
                <option value="'Dhurjati', sans-serif">ధూర్జటి (Dhurjati - సాంప్రదాయక)</option>
                <option value="'Peddana', serif">పెద్దన (Peddana - అధికారిక లుక్)</option>
              </optgroup>
              <optgroup label="ఇంగ్లీష్ ఫాంట్లు (English & Display)">
                <option value="'Montserrat', sans-serif">Montserrat (Ultra Bold & Premium)</option>
                <option value="'Oswald', sans-serif">Oswald (Tall & Breaking News Style)</option>
                <option value="'Bebas Neue', sans-serif">Bebas Neue (Impact Headline)</option>
                <option value="'Poppins', sans-serif">Poppins (Modern Clean)</option>
                <option value="'Roboto', sans-serif">Roboto (Universal Clear)</option>
              </optgroup>
            </select>
          </div>

          <!-- Font Size Adjusters (Headline up to 36px, Body up to 26px) -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="flex justify-between text-slate-400 font-bold mb-1">
                <span>శీర్షిక సైజు</span>
                <span class="text-amber-400 font-mono font-black">{headlineFontSize}px</span>
              </div>
              <input type="range" min="18" max="36" bind:value={headlineFontSize} class="w-full accent-red-600 cursor-pointer" />
            </div>

            <div>
              <div class="flex justify-between text-slate-400 font-bold mb-1">
                <span>సారాంశం సైజు</span>
                <span class="text-blue-400 font-mono font-black">{summaryFontSize}px</span>
              </div>
              <input type="range" min="12" max="26" bind:value={summaryFontSize} class="w-full accent-blue-600 cursor-pointer" />
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

        <!-- 5. IMAGE CONTROLS (FOCUS & HEIGHT ADJUSTMENT) -->
        <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <span class="font-black text-amber-400 block border-b border-slate-800 pb-1.5">
            🖼️ ఫోటో ఫోకస్ & పరిమాణం (Image Adjustment)
          </span>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-400 mb-1">ఫోటో ఫోకస్ (Position)</label>
              <select bind:value={imagePosition} class="w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold p-2 rounded-xl">
                <option value="center">సెంటర్ (Center Focus)</option>
                <option value="top">పైభాగం (Top - ముఖాలు కట్ కాకుండా)</option>
                <option value="bottom">క్రింది భాగం (Bottom Focus)</option>
              </select>
            </div>

            <div>
              <div class="flex justify-between text-slate-400 font-bold mb-1">
                <span>ఫోటో ఎత్తు (%)</span>
                <span class="text-white font-mono">{photoHeightPercent}%</span>
              </div>
              <input type="range" min="35" max="60" bind:value={photoHeightPercent} class="w-full accent-amber-500 cursor-pointer" />
            </div>
          </div>

          <!-- Photo Pickers -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div class="border-2 border-dashed border-slate-700 bg-slate-950 p-3 rounded-2xl text-center">
              <input type="file" id="main-photo-in" accept="image/*" on:change={handleMainPhoto} class="hidden" />
              <label for="main-photo-in" class="cursor-pointer block">
                <span class="text-xl block">📷</span>
                <span class="text-xs font-bold text-slate-200 block">ప్రధాన ఫోటో మార్చండి</span>
              </label>
            </div>

            <div class="border-2 border-dashed border-slate-700 bg-slate-950 p-3 rounded-2xl text-center">
              <input type="file" id="inset-photo-in" accept="image/*" on:change={handleInsetPhoto} class="hidden" />
              <label for="inset-photo-in" class="cursor-pointer block">
                <span class="text-xl block">👤</span>
                <span class="text-xs font-bold text-slate-200 block">సర్కిల్ లీడర్ ఫోటో</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 6. INBUILT COMBO BOXES & TEXT INPUTS -->
        <div class="space-y-3 text-xs">
          
          <!-- Category Combo Box -->
          <div>
            <label class="block font-bold text-slate-400 mb-1">వార్త కేటగిరీ (Inbuilt Category Combo Box)</label>
            <select
              bind:value={selectedCategoryChoice}
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            >
              {#each categoryOptions as cat}
                <option value={cat}>{cat}</option>
              {/each}
            </select>
            {#if selectedCategoryChoice === 'కస్టమ్ (Custom)'}
              <input
                type="text"
                bind:value={customCategoryText}
                placeholder="మీ సొంత కేటగిరీ టైప్ చేయండి..."
                class="w-full mt-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold"
              />
            {/if}
          </div>

          <!-- Location Combo Box (Default: న్యూస్ డెస్క్) -->
          <div>
            <label class="block font-bold text-slate-400 mb-1">లొకేషన్ / విలేఖరి (Default: న్యూస్ డెస్క్)</label>
            <select
              bind:value={selectedLocationChoice}
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            >
              {#each locationOptions as loc}
                <option value={loc}>{loc}</option>
              {/each}
            </select>
            {#if selectedLocationChoice === 'కస్టమ్ (Custom)'}
              <input
                type="text"
                bind:value={customLocationText}
                placeholder="మీ ఊరు / లొకేషన్ టైప్ చేయండి..."
                class="w-full mt-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold"
              />
            {/if}
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
            <label class="block font-bold text-slate-400 mb-1">సారాంశం (Summary Points - కార్డ్ బాటమ్ వరకు వస్తుంది) *</label>
            <textarea
              bind:value={summary}
              rows="4"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs leading-relaxed"
            ></textarea>
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
          <span class="text-amber-400">JPEG మోడ్ • బాటమ్ ఫిల్ లేఅవుట్</span>
        </div>

        <!-- CARD RENDER CONTAINER (No Scanner, 100% Bottom Fit) -->
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

            <!-- 1. TOP PHOTO CONTAINER (Focused & Adjustable Height) -->
            <div
              class="relative w-full overflow-hidden bg-black flex-shrink-0"
              style="height: {photoHeightPercent}%;"
            >
              <img
                src={mainPhotoPreview}
                alt="News Feature"
                crossorigin="anonymous"
                style="width: 100%; height: 100%; object-fit: cover; object-position: {imagePosition};"
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

            <!-- 2. HEADLINE TITLE BAND (Font Size up to 33px+) -->
            <div
              class="px-4 py-2.5 shadow-md flex-shrink-0"
              style="background-color: {headlineBgColor};"
            >
              <h2
                class="font-black leading-snug tracking-tight m-0 text-center"
                style="
                  color: {headlineColor};
                  font-size: {headlineFontSize}px;
                  font-family: {selectedFont};
                "
              >
                {headline}
              </h2>
            </div>

            <!-- 3. SUMMARY BODY (Full Width & Expands to Bottom) -->
            <div
              class="flex-1 px-4 py-3 flex flex-col justify-between overflow-hidden"
              style="background-color: {cardBgColor};"
            >
              
              <!-- Full Summary Paragraph (No Scanner Blocking) -->
              <div
                class="leading-relaxed font-semibold whitespace-pre-line"
                style="
                  color: {summaryColor};
                  font-size: {summaryFontSize}px;
                  font-family: {selectedFont};
                  line-height: 1.45;
                "
              >
                {summary}
              </div>

              <!-- 4. BOTTOM BRANDING FOOTER (Anchored at very bottom) -->
              <div class="pt-2 mt-auto border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-400 flex-shrink-0">
                <span class="tracking-wide text-white font-mono">WWW.NEXLIFYNUCLEUS.IN</span>
                <span class="bg-red-600/30 text-red-300 border border-red-500/40 px-2.5 py-0.5 rounded text-[10px] font-semibold">
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