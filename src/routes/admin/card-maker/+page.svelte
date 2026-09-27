<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  let authChecking = true;

  // 1. Published News Articles (1-Click Auto Connector)
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

  // 3. News Card Format / Layout Types
  let layoutFormat = 'standard'; // 'standard', 'short', 'very_short', 'overlay'

  // 4. Trending Brand Presets
  let selectedTemplate = 'jwala'; // 'jwala', 'ratna', 'darshini', 'vigyan', 'neon', 'cinema', 'patrika'

  // 5. Inbuilt Category Combo Box
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

  // 6. Inbuilt Location Options (Default: న్యూస్ డెస్క్)
  const locationOptions = [
    'న్యూస్ డెస్క్',
    'ముత్తారం',
    'పెద్దపల్లి',
    'మంథని',
    'కరీంనగర్',
    'హైదరాబాద్',
    'తెలంగాణ',
    'కస్టమ్ (Custom)'
  ];
  let selectedLocationChoice = 'న్యూస్ డెస్క్';
  let customLocationText = '';
  $: locationTag = selectedLocationChoice === 'కస్టమ్ (Custom)' ? (customLocationText || 'న్యూస్ డెస్క్') : selectedLocationChoice;

  // 7. Content State
  let headline = 'కొత్త పింఛన్లపై మరో గుడ్‌న్యూస్.. మళ్లీ గడువు పెంచిన ప్రభుత్వం!';
  let summary = `• అర్హులైన లబ్ధిదారులకు దరఖాస్తు చేసుకోవడానికి ప్రభుత్వం మరో అవకాశం కల్పించింది.
• గ్రామ పంచాయతీ మరియు మున్సిపల్ కార్యాలయాల్లో ప్రత్యేక హెల్ప్‌డెస్క్‌లు ఏర్పాటు.
• దరఖాస్తుదారులు ఆధార్, రేషన్ కార్డు మరియు బ్యాంక్ వివరాలతో సంప్రదించాలి.`;

  // 8. Typography, Font & Styling Controls
  let selectedFont = "'Ramabhadra', sans-serif";
  let headlineFontSize = 30; // 18px to 38px
  let summaryFontSize = 18;  // 12px to 26px
  let headlineColor = '#facc15';
  let headlineBgColor = '#000000';
  let summaryColor = '#f8fafc';
  let cardBgColor = '#090d16';

  // Text Style Toggles
  let isBold = true;
  let isItalic = false;
  let isUppercase = false;
  let textAlign = 'center'; // 'left', 'center', 'right'
  let contentPlacement = 'bottom'; // 'bottom', 'middle', 'top'

  // 9. Photo Upload & Position
  let mainPhotoPreview = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80';
  let insetPhotoPreview = null;
  let showInsetCircle = false;
  let imagePosition = 'center'; // 'center', 'top', 'bottom'
  let photoHeightPercent = 46;  // 30% to 65%

  // 10. Mobile Download & Modal State
  let isGenerating = false;
  let generatedCardImage = null;
  let showImageModal = false;

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
      return;
    }
    authChecking = false;
    await fetchPublishedArticles();
  });

  // Fetch Published News from Supabase for 1-Click Fill
  async function fetchPublishedArticles() {
    try {
      let { data } = await supabase
        .from('news_articles')
        .select('*')
        .order('id', { ascending: false })
        .limit(30);

      if (!data || data.length === 0) {
        const res = await supabase.from('news').select('*').order('id', { ascending: false }).limit(30);
        data = res.data;
      }
      publishedArticles = data || [];
    } catch (e) {
      console.error('Fetch articles error:', e);
    }
  }

  // 1-Click Auto Fill
  function applyArticleToCard() {
    const art = publishedArticles.find(a => String(a.id) === String(selectedArticleId));
    if (!art) return;

    headline = art.headline || art.title || headline;
    if (art.location_town || art.location) {
      selectedLocationChoice = 'కస్టమ్ (Custom)';
      customLocationText = art.location_town || art.location;
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

  // Preset Template Styles Auto-Setter (7 Trending Designs)
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
      headlineColor = '#fef08a';
      headlineBgColor = '#1e3a8a';
      summaryColor = '#ffffff';
      cardBgColor = '#0a192f';
    } else if (style === 'vigyan') {
      headlineColor = '#0f172a';
      headlineBgColor = '#e2e8f0';
      summaryColor = '#0f172a';
      cardBgColor = '#f8fafc';
    } else if (style === 'neon') {
      headlineColor = '#22d3ee';
      headlineBgColor = '#1e1b4b';
      summaryColor = '#f472b6';
      cardBgColor = '#020617';
    } else if (style === 'cinema') {
      headlineColor = '#ffffff';
      headlineBgColor = 'transparent';
      summaryColor = '#e2e8f0';
      cardBgColor = '#000000';
      layoutFormat = 'overlay';
    } else if (style === 'patrika') {
      headlineColor = '#991b1b';
      headlineBgColor = '#fef3c7';
      summaryColor = '#1f2937';
      cardBgColor = '#fffbeb';
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
      script.onerror = () => reject(new Error('html-to-image load kaaledu'));
      document.head.appendChild(script);
    });
  }

  // Mobile Bulletproof High-Quality JPEG Engine
  async function downloadCardAsJpeg() {
    if (isGenerating) return;
    isGenerating = true;

    try {
      const node = document.getElementById('card-render-stage');
      if (!node) throw new Error('Card element dorakaledu');

      const hti = await loadHtmlToImage();
      
      const dataUrl = await hti.toJpeg(node, {
        quality: 0.96,
        pixelRatio: 2.2,
        backgroundColor: cardBgColor || '#000000',
        cacheBust: true
      });

      generatedCardImage = dataUrl;

      // 1. Browser Direct Download
      const fileName = `NS_News_Card_${Date.now()}.jpg`;
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Mobile User Safe Modal (Always open for 100% Android & iPhone compatibility)
      showImageModal = true;

    } catch (err) {
      alert('Card generation error: ' + err.message);
    } finally {
      isGenerating = false;
    }
  }

  // Web Share API for Mobile Direct WhatsApp / Instagram
  async function shareMobileNative() {
    if (!generatedCardImage) {
      await downloadCardAsJpeg();
    }
    try {
      const res = await fetch(generatedCardImage);
      const blob = await res.blob();
      const file = new File([blob], `NS_News_${Date.now()}.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: headline,
          text: `${headline}\n\n📍 ${locationTag} | NS News\n👉 https://www.nexlifynucleus.in`
        });
      } else {
        shareDirectWhatsApp();
      }
    } catch (e) {
      shareDirectWhatsApp();
    }
  }

  function shareDirectWhatsApp() {
    const text = `*${headline}*\n\n${summary}\n\n📍 ${locationTag} | NS News Network\n👉 https://www.nexlifynucleus.in\n\n_A.S.V. Enterprises & NS Media_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }
</script>

<svelte:head>
  <title>NS News Card Studio Pro | Advanced Creator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Dhurjati&family=Gidugu&family=Mandali&family=Montserrat:wght@600;700;800;900&family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Oswald:wght@600;700&family=Peddana&family=Poppins:wght@600;700;800&family=Ramabhadra&family=Roboto:wght@700;900&family=Suranna&display=swap" rel="stylesheet">
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    <div class="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <div class="min-h-screen bg-[#070b14] font-sans pb-28 text-slate-100">
    
    <!-- TOP EXECUTIVE HEADER WITH HOME PAGE & DESK LINKS -->
    <header class="bg-[#030712] text-white px-3 sm:px-5 py-3 sticky top-0 z-40 border-b-2 border-red-600 shadow-2xl">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        <div class="flex items-center gap-2.5">
          <span class="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow">NS</span>
          <div>
            <h1 class="text-sm sm:text-base font-black tracking-wide text-white font-['Ramabhadra']">
              PICTURE NEWS CARD STUDIO PRO
            </h1>
            <p class="text-[10px] text-amber-400">ట్రెండింగ్ టెంప్లేట్లు • టెక్స్ట్ స్టైల్స్ • మొబైల్ HD JPEG డౌన్‌లోడ్</p>
          </div>
        </div>

        <!-- Navigation Buttons including Home Page Link -->
        <div class="flex flex-wrap items-center gap-2">
          <a href="/" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition shadow flex items-center gap-1">
            <span>🏠</span> <span>హోమ్ పేజీ</span>
          </a>
          <a href="/admin/news" class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl font-bold border border-slate-700 transition">
            📰 న్యూస్ డెస్క్
          </a>
          <a href="/admin/contractor" class="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs px-3 py-1.5 rounded-xl font-black transition shadow">
            🏗️ కాంట్రాక్టర్ డెస్క్
          </a>
          <a href="/admin/doc-cleaner" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition shadow">
            🖨️ డాక్ క్లీనర్
          </a>
        </div>

      </div>
    </header>

    <main class="max-w-7xl mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- LEFT SIDE: STUDIO CONTROLS (5 Columns) -->
      <section class="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
        
        <!-- 1. AUTO LINK FROM MAIN NEWS -->
        <div class="bg-slate-950/80 border border-amber-500/40 p-3 rounded-2xl space-y-2">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
              <span>🔗</span> <span>వెబ్‌సైట్ న్యూస్‌తో లింక్ చేయండి (1-Click Fill)</span>
            </label>
            <span class="text-[10px] text-slate-400 font-mono">{publishedArticles.length} వార్తలు</span>
          </div>

          <div class="flex items-center gap-2">
            <select
              bind:value={selectedArticleId}
              class="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold p-2 rounded-xl focus:outline-none"
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

        <!-- 2. CARD SIZE & NEWS FORMAT SELECTION -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label class="block font-black text-slate-300 uppercase mb-1">కార్డ్ నిష్పత్తి (Ratio)</label>
            <div class="grid grid-cols-2 gap-1.5 font-bold">
              {#each Object.keys(ratioConfigs) as ratioKey}
                <button
                  type="button"
                  on:click={() => selectedRatio = ratioKey}
                  class="py-1.5 px-2 rounded-xl border text-center transition {selectedRatio === ratioKey ? 'bg-red-600 text-white border-red-500 font-black shadow' : 'bg-slate-900 text-slate-400 border-slate-800'}"
                >
                  {ratioKey}
                </button>
              {/each}
            </div>
          </div>

          <div>
            <label class="block font-black text-slate-300 uppercase mb-1">వార్త ఫార్మాట్ (Format)</label>
            <select
              bind:value={layoutFormat}
              class="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold p-2 rounded-xl"
            >
              <option value="standard">సాధారణ (Standard Full)</option>
              <option value="short">షార్ట్ న్యూస్ (Short 2-Points)</option>
              <option value="very_short">వెరీ షార్ట్ (1-Line Impact Flash)</option>
              <option value="overlay">ఫోటో ఓవర్‌లే (Viral Status/Reel)</option>
            </select>
          </div>
        </div>

        <!-- 3. TRENDING TEMPLATES (7 PRESETS) -->
        <div>
          <label class="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
            ట్రెండింగ్ టెంప్లేట్ (Trending Preset)
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-bold">
            <button
              type="button"
              on:click={() => applyPresetStyle('jwala')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'jwala' ? 'bg-amber-500 text-black border-amber-400 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-800'}"
            >
              🔥 NS జ్వాల
            </button>
            <button
              type="button"
              on:click={() => applyPresetStyle('ratna')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'ratna' ? 'bg-red-600 text-white border-red-500 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-800'}"
            >
              💎 NS రత్న
            </button>
            <button
              type="button"
              on:click={() => applyPresetStyle('darshini')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'darshini' ? 'bg-blue-600 text-white border-blue-400 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-800'}"
            >
              🌟 NS దర్శిని
            </button>
            <button
              type="button"
              on:click={() => applyPresetStyle('vigyan')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'vigyan' ? 'bg-slate-100 text-slate-900 border-slate-300 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-800'}"
            >
              🏛️ విజ్ఞాన్
            </button>
            <button
              type="button"
              on:click={() => applyPresetStyle('neon')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'neon' ? 'bg-purple-600 text-white border-purple-400 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-800'}"
            >
              ⚡ నియాన్ గ్లో
            </button>
            <button
              type="button"
              on:click={() => applyPresetStyle('cinema')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'cinema' ? 'bg-black text-amber-300 border-amber-400 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-800'}"
            >
              🎬 డార్క్ సినిమా
            </button>
            <button
              type="button"
              on:click={() => applyPresetStyle('patrika')}
              class="p-2 rounded-xl border text-center transition {selectedTemplate === 'patrika' ? 'bg-amber-100 text-red-900 border-red-400 font-black shadow' : 'bg-slate-900 text-slate-300 border-slate-800'}"
            >
              📰 పత్రిక
            </button>
          </div>
        </div>

        <!-- 4. TEXT STYLES (BOLD, ITALIC, ALIGNMENT, PLACEMENT) -->
        <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <span class="font-black text-amber-400 block border-b border-slate-800 pb-1">
            ✍️ టెక్స్ట్ స్టైల్స్ & అమరిక (Text Styling & Alignment)
          </span>

          <!-- Style Toggles & Align -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-400 mb-1">స్టైల్ టోగుల్స్</label>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  on:click={() => isBold = !isBold}
                  class="flex-1 py-1.5 rounded-lg border font-black {isBold ? 'bg-red-600 text-white border-red-500' : 'bg-slate-900 text-slate-400 border-slate-700'}"
                >
                  B (బోల్డ్)
                </button>
                <button
                  type="button"
                  on:click={() => isItalic = !isItalic}
                  class="flex-1 py-1.5 rounded-lg border italic font-serif {isItalic ? 'bg-red-600 text-white border-red-500' : 'bg-slate-900 text-slate-400 border-slate-700'}"
                >
                  I (ఇటాలిక్)
                </button>
                <button
                  type="button"
                  on:click={() => isUppercase = !isUppercase}
                  class="flex-1 py-1.5 rounded-lg border uppercase text-[10px] font-bold {isUppercase ? 'bg-red-600 text-white border-red-500' : 'bg-slate-900 text-slate-400 border-slate-700'}"
                >
                  AA
                </button>
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-400 mb-1">టెక్స్ట్ అలైన్‌మెంట్</label>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  on:click={() => textAlign = 'left'}
                  class="flex-1 py-1.5 rounded-lg border {textAlign === 'left' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-700'}"
                >
                  లెఫ్ట్
                </button>
                <button
                  type="button"
                  on:click={() => textAlign = 'center'}
                  class="flex-1 py-1.5 rounded-lg border {textAlign === 'center' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-700'}"
                >
                  సెంటర్
                </button>
                <button
                  type="button"
                  on:click={() => textAlign = 'right'}
                  class="flex-1 py-1.5 rounded-lg border {textAlign === 'right' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-700'}"
                >
                  రైట్
                </button>
              </div>
            </div>
          </div>

          <!-- Placement (Bottom / Middle / Top) -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label class="block font-bold text-slate-400 mb-1">కంటెంట్ ప్లేస్‌మెంట్</label>
              <select
                bind:value={contentPlacement}
                class="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold p-2 rounded-xl"
              >
                <option value="bottom">బాటమ్ (Bottom Text)</option>
                <option value="middle">మిడిల్ (Centered Text)</option>
                <option value="top">టాప్ (Top Headline)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-400 mb-1">ఫాంట్ ఎంపిక</label>
              <select
                bind:value={selectedFont}
                class="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold p-2 rounded-xl"
              >
                <option value="'Ramabhadra', sans-serif">రామభద్ర (బోల్డ్ న్యూస్)</option>
                <option value="'Noto Sans Telugu', sans-serif">నోటో సాన్స్ (మోడ్రన్)</option>
                <option value="'Suranna', serif">సూరన్న (క్లాసిక్ పత్రిక)</option>
                <option value="'Gidugu', sans-serif">గిడుగు (రౌండెడ్)</option>
                <option value="'Montserrat', sans-serif">Montserrat (English/Display)</option>
                <option value="'Bebas Neue', sans-serif">Bebas Neue (Viral Headline)</option>
              </select>
            </div>
          </div>

          <!-- Size Sliders -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div class="flex justify-between text-slate-400 font-bold mb-1">
                <span>శీర్షిక సైజు</span>
                <span class="text-amber-400 font-mono">{headlineFontSize}px</span>
              </div>
              <input type="range" min="18" max="38" bind:value={headlineFontSize} class="w-full accent-red-600 cursor-pointer" />
            </div>

            <div>
              <div class="flex justify-between text-slate-400 font-bold mb-1">
                <span>సారాంశం సైజు</span>
                <span class="text-blue-400 font-mono">{summaryFontSize}px</span>
              </div>
              <input type="range" min="12" max="26" bind:value={summaryFontSize} class="w-full accent-blue-600 cursor-pointer" />
            </div>
          </div>

          <!-- Color Pickers -->
          <div class="grid grid-cols-4 gap-2 pt-1 font-bold text-[10.5px]">
            <div>
              <label class="block text-slate-400 mb-1">హెడ్‌లైన్ రంగు</label>
              <input type="color" bind:value={headlineColor} class="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer" />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">హెడ్‌లైన్ Bg</label>
              <input type="color" bind:value={headlineBgColor} class="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer" />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">బాడీ రంగు</label>
              <input type="color" bind:value={summaryColor} class="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer" />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">కార్డ్ Bg</label>
              <input type="color" bind:value={cardBgColor} class="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- 5. IMAGE POSITION & HEIGHT CONTROLS -->
        <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-400 mb-1">ఫోటో ఫోకస్</label>
              <select bind:value={imagePosition} class="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold p-2 rounded-xl">
                <option value="center">సెంటర్ (Center Focus)</option>
                <option value="top">పైభాగం (Top Focus)</option>
                <option value="bottom">క్రింది భాగం (Bottom Focus)</option>
              </select>
            </div>

            <div>
              <div class="flex justify-between text-slate-400 font-bold mb-1">
                <span>ఫోటో ఎత్తు (%)</span>
                <span class="text-white font-mono">{photoHeightPercent}%</span>
              </div>
              <input type="range" min="30" max="65" bind:value={photoHeightPercent} class="w-full accent-amber-500 cursor-pointer" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="border border-dashed border-slate-700 bg-slate-900 p-2.5 rounded-xl text-center">
              <input type="file" id="main-p-in" accept="image/*" on:change={handleMainPhoto} class="hidden" />
              <label for="main-p-in" class="cursor-pointer block">
                <span class="text-lg block">📷</span>
                <span class="text-[11px] font-bold text-slate-200">ప్రధాన ఫోటో మార్చండి</span>
              </label>
            </div>

            <div class="border border-dashed border-slate-700 bg-slate-900 p-2.5 rounded-xl text-center">
              <input type="file" id="inset-p-in" accept="image/*" on:change={handleInsetPhoto} class="hidden" />
              <label for="inset-p-in" class="cursor-pointer block">
                <span class="text-lg block">👤</span>
                <span class="text-[11px] font-bold text-slate-200">సర్కిల్ లీడర్ ఫోటో</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 6. CATEGORY, LOCATION & TEXT INPUTS -->
        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-400 mb-1">వార్త కేటగిరీ</label>
              <select bind:value={selectedCategoryChoice} class="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold">
                {#each categoryOptions as cat}
                  <option value={cat}>{cat}</option>
                {/each}
              </select>
              {#if selectedCategoryChoice === 'కస్టమ్ (Custom)'}
                <input type="text" bind:value={customCategoryText} placeholder="సొంత కేటగిరీ..." class="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white" />
              {/if}
            </div>

            <div>
              <label class="block font-bold text-slate-400 mb-1">లొకేషన్</label>
              <select bind:value={selectedLocationChoice} class="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-bold">
                {#each locationOptions as loc}
                  <option value={loc}>{loc}</option>
                {/each}
              </select>
              {#if selectedLocationChoice === 'కస్టమ్ (Custom)'}
                <input type="text" bind:value={customLocationText} placeholder="సొంత లొకేషన్..." class="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white" />
              {/if}
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

          {#if layoutFormat !== 'very_short'}
            <div>
              <label class="block font-bold text-slate-400 mb-1">సారాంశం (Summary Points) *</label>
              <textarea
                bind:value={summary}
                rows={layoutFormat === 'short' ? 2 : 4}
                class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs leading-relaxed"
              ></textarea>
            </div>
          {/if}
        </div>

        <!-- 7. DOWNLOAD & MOBILE SHARE BUTTONS -->
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
            on:click={shareMobileNative}
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>📲 WhatsApp షేర్</span>
          </button>
        </div>

      </section>

      <!-- RIGHT SIDE: LIVE INTERACTIVE PREVIEW STAGE (7 Columns) -->
      <section class="lg:col-span-7 flex flex-col items-center justify-center">
        
        <div class="w-full mb-2.5 flex items-center justify-between text-xs text-slate-400 px-2 font-bold">
          <span>🔍 లైవ్ కార్డు ప్రివ్యూ ({ratioConfigs[selectedRatio].label})</span>
          <span class="text-amber-400">ఫార్మాట్: {layoutFormat.toUpperCase()}</span>
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

            <!-- A. OVERLAY MODE (VIRAL FULL BACKGROUND PHOTO) -->
            {#if layoutFormat === 'overlay'}
              
              <!-- Full Screen Background Image -->
              <img
                src={mainPhotoPreview}
                alt="News Background"
                crossorigin="anonymous"
                class="absolute inset-0 w-full h-full object-cover"
                style="object-position: {imagePosition};"
              />

              <!-- Dark Vignette Gradient -->
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

              <!-- Top Branding -->
              <div class="relative z-10 p-3 flex items-center justify-between">
                <div class="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-red-600 shadow">
                  <span class="bg-red-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded">NS</span>
                  <span class="font-black text-xs text-white font-['Ramabhadra']">NS NEWS</span>
                </div>
                <span class="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow uppercase">
                  {badgeText}
                </span>
              </div>

              <!-- Text Content Placement in Overlay -->
              <div class="relative z-10 p-4 mt-auto space-y-2.5 {contentPlacement === 'middle' ? 'my-auto' : ''}">
                <h2
                  class="leading-snug tracking-tight m-0"
                  style="
                    color: {headlineColor};
                    font-size: {headlineFontSize}px;
                    font-weight: {isBold ? '900' : '400'};
                    font-style: {isItalic ? 'italic' : 'normal'};
                    text-transform: {isUppercase ? 'uppercase' : 'none'};
                    text-align: {textAlign};
                    text-shadow: 0 2px 10px rgba(0,0,0,0.9);
                  "
                >
                  {headline}
                </h2>

                <p
                  class="leading-relaxed font-semibold whitespace-pre-line"
                  style="
                    color: {summaryColor};
                    font-size: {summaryFontSize}px;
                    text-align: {textAlign};
                    text-shadow: 0 1px 6px rgba(0,0,0,0.8);
                  "
                >
                  {summary}
                </p>

                <div class="pt-2 border-t border-white/20 flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span class="tracking-wider text-amber-300 font-mono">WWW.NEXLIFYNUCLEUS.IN</span>
                  <span class="bg-red-600/60 text-white px-2.5 py-0.5 rounded text-[10px]">
                    📍 {locationTag} • @nexlifynews
                  </span>
                </div>
              </div>

            <!-- B. STANDARD, SHORT & VERY SHORT MODES -->
            {:else}

              <!-- Top/Bottom Placement Logic -->
              {#if contentPlacement === 'top'}
                <!-- Headline at Top -->
                <div class="px-4 py-3 shadow-md flex-shrink-0" style="background-color: {headlineBgColor};">
                  <h2
                    class="leading-snug tracking-tight m-0"
                    style="
                      color: {headlineColor};
                      font-size: {headlineFontSize}px;
                      font-weight: {isBold ? '900' : '400'};
                      font-style: {isItalic ? 'italic' : 'normal'};
                      text-transform: {isUppercase ? 'uppercase' : 'none'};
                      text-align: {textAlign};
                    "
                  >
                    {headline}
                  </h2>
                </div>
              {/if}

              <!-- Image Box -->
              <div
                class="relative w-full overflow-hidden bg-black flex-shrink-0"
                style="height: {layoutFormat === 'very_short' ? '60%' : layoutFormat === 'short' ? (photoHeightPercent - 6) + '%' : photoHeightPercent + '%'};"
              >
                <img
                  src={mainPhotoPreview}
                  alt="News Feature"
                  crossorigin="anonymous"
                  style="width: 100%; height: 100%; object-fit: cover; object-position: {imagePosition};"
                />

                <!-- Top Badges -->
                <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                  <div class="flex items-center gap-1.5 bg-black/85 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-red-600/80 shadow-lg">
                    <span class="bg-red-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow">NS</span>
                    <span class="font-black text-xs text-white font-['Ramabhadra'] tracking-wide">NS NEWS</span>
                  </div>

                  <span class="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                    {badgeText}
                  </span>
                </div>

                <!-- Leader Inset Circle -->
                {#if showInsetCircle && insetPhotoPreview}
                  <div class="absolute bottom-2.5 right-2.5 w-16 h-16 rounded-full border-2 border-white overflow-hidden shadow-2xl bg-white z-10">
                    <img src={insetPhotoPreview} alt="Leader" class="w-full h-full object-cover" />
                  </div>
                {/if}
              </div>

              {#if contentPlacement !== 'top'}
                <!-- Headline Below Photo -->
                <div class="px-4 py-2.5 shadow-md flex-shrink-0" style="background-color: {headlineBgColor};">
                  <h2
                    class="leading-snug tracking-tight m-0"
                    style="
                      color: {headlineColor};
                      font-size: {headlineFontSize}px;
                      font-weight: {isBold ? '900' : '400'};
                      font-style: {isItalic ? 'italic' : 'normal'};
                      text-transform: {isUppercase ? 'uppercase' : 'none'};
                      text-align: {textAlign};
                    "
                  >
                    {headline}
                  </h2>
                </div>
              {/if}

              <!-- Bottom Content Area -->
              <div class="flex-1 px-4 py-3 flex flex-col justify-between overflow-hidden" style="background-color: {cardBgColor};">
                
                {#if layoutFormat !== 'very_short'}
                  <div
                    class="leading-relaxed whitespace-pre-line {layoutFormat === 'short' ? 'line-clamp-2' : ''}"
                    style="
                      color: {summaryColor};
                      font-size: {summaryFontSize}px;
                      font-weight: {isBold ? '600' : '400'};
                      font-style: {isItalic ? 'italic' : 'normal'};
                      text-align: {textAlign};
                      line-height: 1.45;
                    "
                  >
                    {summary}
                  </div>
                {:else}
                  <!-- Very Short Mode Punchline -->
                  <div class="my-auto text-center font-bold text-amber-400 text-sm italic">
                    ✦ పూర్తి వివరాల కోసం వెబ్‌సైట్ చూడండి ✦
                  </div>
                {/if}

                <!-- Bottom Footer -->
                <div class="pt-2 mt-auto border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-400 flex-shrink-0">
                  <span class="tracking-wide text-white font-mono">WWW.NEXLIFYNUCLEUS.IN</span>
                  <span class="bg-red-600/30 text-red-300 border border-red-500/40 px-2.5 py-0.5 rounded text-[10px] font-semibold">
                    📍 {locationTag} • @nexlifynews
                  </span>
                </div>

              </div>

            {/if}

          </div>

        </div>

      </section>

    </main>

    <!-- MOBILE GUARANTEED DOWNLOAD MODAL (100% RELIABLE FOR ANDROID & IPHONE) -->
    {#if showImageModal && generatedCardImage}
      <div class="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-3 sm:p-5">
        <div class="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-sm w-full p-4 space-y-3 text-center shadow-2xl">
          
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <span class="text-xs font-black text-amber-400 flex items-center gap-1.5">
              <span>✓</span> <span>కార్డ్ సిద్ధమైంది (Ready)!</span>
            </span>
            <button
              type="button"
              on:click={() => showImageModal = false}
              class="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Generated Card Image Preview -->
          <div class="overflow-hidden rounded-2xl border border-slate-700 bg-black max-h-[58vh] flex items-center justify-center">
            <img src={generatedCardImage} alt="Generated HD Card" class="w-full h-auto object-contain" />
          </div>

          <!-- Mobile Direct Save Instruction -->
          <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-200 text-left">
            💡 <strong>మొబైల్ సూచన:</strong> పైన ఉన్న ఫోటోపై 2 సెకన్లు వేలితో నొక్కి పట్టుకొని (Long Press) <strong>"Download image"</strong> లేదా <strong>"Save image"</strong> నొక్కండి; నేరుగా గ్యాలరీలోకి సేవ్ అవుతుంది!
          </div>

          <!-- Modal Action Buttons -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <a
              href={generatedCardImage}
              download="NS_News_Card.jpg"
              class="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow"
            >
              📥 డౌన్‌లోడ్
            </a>

            <button
              type="button"
              on:click={shareMobileNative}
              class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow cursor-pointer"
            >
              📲 WhatsApp షేర్
            </button>
          </div>

        </div>
      </div>
    {/if}

  </div>
{/if}