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

  // 3. Layout Arrangements
  let layoutArrangement = 'top_img_bottom_text';

  // 4. Trending Brand Presets
  let selectedTemplate = 'jwala';

  // 5. Inbuilt Category Options
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

  // 6. Inbuilt Location Options
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

  // 7. Single Unified News Box (Smart Parser)
  let rawNewsInput = `కొత్త పింఛన్లపై మరో గుడ్‌న్యూస్.. మళ్లీ గడువు పెంచిన ప్రభుత్వం!
• అర్హులైన లబ్ధిదారులకు దరఖాస్తు చేసుకోవడానికి ప్రభుత్వం మరో అవకాశం కల్పించింది.
• గ్రామ పంచాయతీ మరియు మున్సిపల్ కార్యాలయాల్లో ప్రత్యేక హెల్ప్‌డెస్క్‌లు ఏర్పాటు.
• దరఖాస్తుదారులు అవసరమైన ధ్రువీకరణ పత్రాలతో సంప్రదించాలి.`;

  let headline = '';
  let summary = '';

  $: {
    if (rawNewsInput) {
      const lines = rawNewsInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        headline = lines[0];
        summary = lines.slice(1).join('\n');
      } else {
        headline = 'తాజా వార్త శీర్షిక...';
        summary = '';
      }
    } else {
      headline = '';
      summary = '';
    }
  }

  // 8. Typography & Styles
  let selectedFont = "'Ramabhadra', sans-serif";
  let headlineFontSize = 26;
  let summaryFontSize = 16;
  let headlineColor = '#facc15';
  let headlineBgColor = '#000000';
  let summaryColor = '#f8fafc';
  let cardBgColor = '#090d16';

  let isBold = true;
  let isItalic = false;
  let isUppercase = false;
  let textAlign = 'center';

  // 9. Photos
  let mainPhotoPreview = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80';
  let secondaryPhotoPreview = 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80';
  let insetPhotoPreview = null;
  let showInsetCircle = false;
  let imagePosition = 'center';
  let photoHeightPercent = 46;

  // 10. Mobile Modal & Download
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

  function applyArticleToCard() {
    const art = publishedArticles.find(a => String(a.id) === String(selectedArticleId));
    if (!art) return;

    let headText = art.headline || art.title || '';
    let bodyText = '';

    if (art.content) {
      const cleanLines = art.content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 15)
        .slice(0, 3)
        .map(l => l.startsWith('•') ? l : `• ${l}`);
      
      bodyText = cleanLines.join('\n');
    }

    rawNewsInput = `${headText}\n${bodyText}`;

    if (art.location_town || art.location) {
      selectedLocationChoice = 'కస్టమ్ (Custom)';
      customLocationText = art.location_town || art.location;
    }
    if (art.image_url) {
      mainPhotoPreview = art.image_url;
    }
  }

  function handleMainPhoto(e) {
    const input = e.target;
    if (input.files && input.files[0]) {
      mainPhotoPreview = URL.createObjectURL(input.files[0]);
    }
  }

  function handleSecondaryPhoto(e) {
    const input = e.target;
    if (input.files && input.files[0]) {
      secondaryPhotoPreview = URL.createObjectURL(input.files[0]);
    }
  }

  function handleInsetPhoto(e) {
    const input = e.target;
    if (input.files && input.files[0]) {
      insetPhotoPreview = URL.createObjectURL(input.files[0]);
      showInsetCircle = true;
    }
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
      headlineColor = '#fef08a';
      headlineBgColor = '#1e3a8a';
      summaryColor = '#ffffff';
      cardBgColor = '#0a192f';
    } else if (style === 'vigyan') {
      headlineColor = '#0f172a';
      headlineBgColor = '#e2e8f0';
      summaryColor = '#0f172a';
      cardBgColor = '#ffffff';
    } else if (style === 'neon') {
      headlineColor = '#22d3ee';
      headlineBgColor = '#1e1b4b';
      summaryColor = '#f472b6';
      cardBgColor = '#020617';
    } else if (style === 'patrika') {
      headlineColor = '#991b1b';
      headlineBgColor = '#fef3c7';
      summaryColor = '#1f2937';
      cardBgColor = '#fffbeb';
    }
  }

  // Load html2canvas-pro with OKLCH Color Parser Support
  async function loadHtml2CanvasPro() {
    if (typeof window === 'undefined') return null;
    if (window.__html2canvas_pro_ready && window.html2canvas) {
      return window.html2canvas;
    }
    return new Promise((resolve, reject) => {
      // Remove any previously loaded standard html2canvas scripts
      const oldScripts = document.querySelectorAll('script[src*="html2canvas"]');
      oldScripts.forEach(s => s.remove());

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas-pro@2.0.2/dist/html2canvas-pro.min.js';
      script.onload = () => {
        window.__html2canvas_pro_ready = true;
        resolve(window.html2canvas);
      };
      script.onerror = () => reject(new Error('html2canvas-pro లైబ్రరీ లోడ్ కాలేదు'));
      document.head.appendChild(script);
    });
  }

  // Mobile Bulletproof High-Quality JPEG Engine
  async function downloadCardAsJpeg() {
    if (isGenerating) return;
    isGenerating = true;

    try {
      const node = document.getElementById('card-render-stage');
      if (!node) throw new Error('కార్డ్ ఎలిమెంట్ కనుగొనబడలేదు');

      const h2c = await loadHtml2CanvasPro();
      
      const canvas = await h2c(node, {
        scale: 2.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: cardBgColor || '#000000',
        logging: false,
        imageTimeout: 15000
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      generatedCardImage = dataUrl;

      // 1. Trigger browser direct download
      const fileName = `NS_News_Card_${Date.now()}.jpg`;
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Open Mobile Save Modal
      showImageModal = true;

    } catch (err) {
      console.error('Download error:', err);
      const errMsg = err?.message || (typeof err === 'string' ? err : 'మొబైల్ బ్రౌజర్ ఎర్రర్');
      alert('కార్డ్ ప్రాసెస్ లోపం: ' + errMsg);
    } finally {
      isGenerating = false;
    }
  }

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
  <title>NS News Card Studio Pro | White Edition</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Dhurjati&family=Gidugu&family=Mandali&family=Montserrat:wght@600;700;800;900&family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Oswald:wght@600;700&family=Peddana&family=Poppins:wght@600;700;800&family=Ramabhadra&family=Roboto:wght@700;900&family=Suranna&display=swap" rel="stylesheet">
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-slate-100 flex items-center justify-center text-slate-800">
    <div class="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <!-- CLEAN WHITE THEME -->
  <div class="min-h-screen bg-[#f8fafc] font-sans pb-28 text-slate-900">
    
    <!-- NAVBAR WITH HOME & DESK LINKS -->
    <header class="bg-white text-slate-900 px-3 sm:px-6 py-3 sticky top-0 z-40 border-b-2 border-red-600 shadow-sm">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        <div class="flex items-center gap-2.5">
          <span class="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow">NS</span>
          <div>
            <h1 class="text-sm sm:text-base font-black tracking-wide text-slate-900 font-['Ramabhadra']">
              PICTURE NEWS CARD STUDIO PRO
            </h1>
            <p class="text-[10.5px] text-slate-500 font-medium">స్మార్ట్ సింగిల్ న్యూస్ బాక్స్ • మల్టీ-లేఅవుట్ స్టూడియో</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <a href="/" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition shadow flex items-center gap-1">
            <span>🏠</span> <span>హోమ్ పేజీ</span>
          </a>
          <a href="/admin/news" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold border border-slate-200 transition">
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

      <!-- LEFT SIDE: CONTROLS PANEL (WHITE THEME) -->
      <section class="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        
        <!-- 1. AUTO LINK FROM MAIN NEWS -->
        <div class="bg-slate-50 border border-amber-300 p-3 rounded-2xl space-y-2">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>🔗</span> <span>వెబ్‌సైట్ న్యూస్‌తో లింక్ చేయండి (1-Click Fill)</span>
            </label>
            <span class="text-[10px] text-slate-500 font-mono">{publishedArticles.length} వార్తలు</span>
          </div>

          <div class="flex items-center gap-2">
            <select
              bind:value={selectedArticleId}
              class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold p-2 rounded-xl focus:outline-none"
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

        <!-- 2. LAYOUT ARRANGEMENTS -->
        <div>
          <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
            కార్డ్ డిజైన్ లేఅవుట్ (Layout Arrangement)
          </label>
          <div class="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              type="button"
              on:click={() => layoutArrangement = 'top_img_bottom_text'}
              class="p-2.5 rounded-2xl border text-left transition {layoutArrangement === 'top_img_bottom_text' ? 'bg-red-600 text-white border-red-500 shadow' : 'bg-slate-50 text-slate-700 border-slate-200'}"
            >
              <span class="text-sm block">🖼️⬇️</span>
              <span class="block font-black mt-0.5">ఫోటో పైన – టెక్స్ట్ కింద</span>
              <span class="text-[9.5px] block font-normal opacity-80">సాధారణ క్లాసిక్ స్టైల్</span>
            </button>

            <button
              type="button"
              on:click={() => layoutArrangement = 'top_text_bottom_img'}
              class="p-2.5 rounded-2xl border text-left transition {layoutArrangement === 'top_text_bottom_img' ? 'bg-red-600 text-white border-red-500 shadow' : 'bg-slate-50 text-slate-700 border-slate-200'}"
            >
              <span class="text-sm block">✍️⬇️</span>
              <span class="block font-black mt-0.5">టెక్స్ట్ పైన – ఫోటో కింద</span>
              <span class="text-[9.5px] block font-normal opacity-80">శీర్షిక ముందుగా హైలైట్</span>
            </button>

            <button
              type="button"
              on:click={() => layoutArrangement = 'text_middle_dual_img'}
              class="p-2.5 rounded-2xl border text-left transition {layoutArrangement === 'text_middle_dual_img' ? 'bg-red-600 text-white border-red-500 shadow' : 'bg-slate-50 text-slate-700 border-slate-200'}"
            >
              <span class="text-sm block">🥪</span>
              <span class="block font-black mt-0.5">మధ్యలో టెక్స్ట్ – 2 ఫోటోలు</span>
              <span class="text-[9.5px] block font-normal opacity-80">పైన & కింద పిక్చర్స్</span>
            </button>

            <button
              type="button"
              on:click={() => layoutArrangement = 'full_overlay'}
              class="p-2.5 rounded-2xl border text-left transition {layoutArrangement === 'full_overlay' ? 'bg-red-600 text-white border-red-500 shadow' : 'bg-slate-50 text-slate-700 border-slate-200'}"
            >
              <span class="text-sm block">🎬</span>
              <span class="block font-black mt-0.5">ఫుల్ ఫోటో ఓవర్‌లే</span>
              <span class="text-[9.5px] block font-normal opacity-80">వైరల్ రీల్స్ & స్టేటస్</span>
            </button>
          </div>
        </div>

        <!-- 3. RATIO & TEMPLATES -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label class="block font-black text-slate-700 uppercase mb-1">కార్డ్ సైజు (Ratio)</label>
            <div class="grid grid-cols-2 gap-1.5 font-bold">
              {#each Object.keys(ratioConfigs) as ratioKey}
                <button
                  type="button"
                  on:click={() => selectedRatio = ratioKey}
                  class="py-1.5 px-2 rounded-xl border text-center transition {selectedRatio === ratioKey ? 'bg-slate-900 text-white font-black shadow' : 'bg-slate-50 text-slate-600 border-slate-200'}"
                >
                  {ratioKey}
                </button>
              {/each}
            </div>
          </div>

          <div>
            <label class="block font-black text-slate-700 uppercase mb-1">కలర్ టెంప్లేట్</label>
            <select
              bind:value={selectedTemplate}
              on:change={() => applyPresetStyle(selectedTemplate)}
              class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold p-2 rounded-xl"
            >
              <option value="jwala">🔥 NS జ్వాల (Black & Gold)</option>
              <option value="ratna">💎 NS రత్న (Crimson Red)</option>
              <option value="darshini">🌟 NS దర్శిని (Royal Navy)</option>
              <option value="vigyan">🏛️ విజ్ఞాన్ (Pure White/Slate)</option>
              <option value="neon">⚡ నియాన్ గ్లో (Cyan Glow)</option>
              <option value="patrika">📰 క్లాసిక్ పత్రిక (Ivory News)</option>
            </select>
          </div>
        </div>

        <!-- 4. SINGLE SMART NEWS INPUT BOX -->
        <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-black text-slate-800">
              📝 వార్తా పాఠం (Single Smart Box) *
            </label>
            <span class="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full">
              ఆటో-స్ప్లిట్ యాక్టివ్
            </span>
          </div>

          <textarea
            bind:value={rawNewsInput}
            rows="5"
            placeholder="మొదటి లైన్‌లో శీర్షిక (Headline) టైప్ చేయండి...&#10;తర్వాత లైన్లలో సారాంశం (Summary Points) టైప్ చేయండి లేదా పేస్ట్ చేయండి."
            class="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
          ></textarea>
        </div>

        <!-- 5. TYPOGRAPHY, STYLES & ALIGNMENT -->
        <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-600 mb-1">స్టైల్ బటన్లు</label>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  on:click={() => isBold = !isBold}
                  class="flex-1 py-1.5 rounded-lg border font-black {isBold ? 'bg-red-600 text-white border-red-500' : 'bg-white text-slate-700 border-slate-300'}"
                >
                  B
                </button>
                <button
                  type="button"
                  on:click={() => isItalic = !isItalic}
                  class="flex-1 py-1.5 rounded-lg border italic font-serif {isItalic ? 'bg-red-600 text-white border-red-500' : 'bg-white text-slate-700 border-slate-300'}"
                >
                  I
                </button>
                <button
                  type="button"
                  on:click={() => isUppercase = !isUppercase}
                  class="flex-1 py-1.5 rounded-lg border uppercase text-[10px] font-bold {isUppercase ? 'bg-red-600 text-white border-red-500' : 'bg-white text-slate-700 border-slate-300'}"
                >
                  AA
                </button>
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-600 mb-1">అలైన్‌మెంట్</label>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  on:click={() => textAlign = 'left'}
                  class="flex-1 py-1.5 rounded-lg border text-xs {textAlign === 'left' ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-700 border-slate-300'}"
                >
                  లెఫ్ట్
                </button>
                <button
                  type="button"
                  on:click={() => textAlign = 'center'}
                  class="flex-1 py-1.5 rounded-lg border text-xs {textAlign === 'center' ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-700 border-slate-300'}"
                >
                  సెంటర్
                </button>
                <button
                  type="button"
                  on:click={() => textAlign = 'right'}
                  class="flex-1 py-1.5 rounded-lg border text-xs {textAlign === 'right' ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-700 border-slate-300'}"
                >
                  రైట్
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 pt-1">
            <div class="col-span-3">
              <label class="block font-bold text-slate-600 mb-1">ఫాంట్ ఎంపిక</label>
              <select
                bind:value={selectedFont}
                class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold p-2 rounded-xl"
              >
                <option value="'Ramabhadra', sans-serif">రామభద్ర (బోల్డ్ న్యూస్)</option>
                <option value="'Noto Sans Telugu', sans-serif">నోటో సాన్స్ (మోడ్రన్)</option>
                <option value="'Suranna', serif">సూరన్న (క్లాసిక్ పత్రిక)</option>
                <option value="'Gidugu', sans-serif">గిడుగు (రౌండెడ్)</option>
                <option value="'Montserrat', sans-serif">Montserrat (Display)</option>
                <option value="'Bebas Neue', sans-serif">Bebas Neue (Viral)</option>
              </select>
            </div>

            <div class="col-span-1.5">
              <div class="flex justify-between text-slate-600 font-bold mb-1">
                <span>శీర్షిక సైజు</span>
                <span class="text-red-600 font-mono">{headlineFontSize}px</span>
              </div>
              <input type="range" min="18" max="36" bind:value={headlineFontSize} class="w-full accent-red-600 cursor-pointer" />
            </div>

            <div class="col-span-1.5">
              <div class="flex justify-between text-slate-600 font-bold mb-1">
                <span>సారాంశం సైజు</span>
                <span class="text-blue-600 font-mono">{summaryFontSize}px</span>
              </div>
              <input type="range" min="12" max="24" bind:value={summaryFontSize} class="w-full accent-blue-600 cursor-pointer" />
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2 pt-1 font-bold text-[10.5px]">
            <div>
              <label class="block text-slate-600 mb-1">శీర్షిక రంగు</label>
              <input type="color" bind:value={headlineColor} class="w-full h-7 rounded border border-slate-300 bg-white cursor-pointer" />
            </div>
            <div>
              <label class="block text-slate-600 mb-1">హెడ్‌లైన్ Bg</label>
              <input type="color" bind:value={headlineBgColor} class="w-full h-7 rounded border border-slate-300 bg-white cursor-pointer" />
            </div>
            <div>
              <label class="block text-slate-600 mb-1">బాడీ రంగు</label>
              <input type="color" bind:value={summaryColor} class="w-full h-7 rounded border border-slate-300 bg-white cursor-pointer" />
            </div>
            <div>
              <label class="block text-slate-600 mb-1">కార్డ్ Bg</label>
              <input type="color" bind:value={cardBgColor} class="w-full h-7 rounded border border-slate-300 bg-white cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- 6. PHOTO CONTROLS -->
        <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-600 mb-1">ఫోటో ఫోకస్</label>
              <select bind:value={imagePosition} class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold p-2 rounded-xl">
                <option value="center">సెంటర్ (Center Focus)</option>
                <option value="top">పైభాగం (Top Focus)</option>
                <option value="bottom">క్రింది భాగం (Bottom Focus)</option>
              </select>
            </div>

            <div>
              <div class="flex justify-between text-slate-600 font-bold mb-1">
                <span>ఫోటో ఎత్తు</span>
                <span class="text-slate-900 font-mono">{photoHeightPercent}%</span>
              </div>
              <input type="range" min="30" max="60" bind:value={photoHeightPercent} class="w-full accent-amber-500 cursor-pointer" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="border-2 border-dashed border-slate-300 bg-white p-2.5 rounded-xl text-center">
              <input type="file" id="main-p-in" accept="image/*" on:change={handleMainPhoto} class="hidden" />
              <label for="main-p-in" class="cursor-pointer block">
                <span class="text-lg block">📷</span>
                <span class="text-[11px] font-bold text-slate-800">ప్రధాన ఫోటో మార్చండి</span>
              </label>
            </div>

            {#if layoutArrangement === 'text_middle_dual_img'}
              <div class="border-2 border-dashed border-amber-300 bg-amber-50/50 p-2.5 rounded-xl text-center">
                <input type="file" id="sec-p-in" accept="image/*" on:change={handleSecondaryPhoto} class="hidden" />
                <label for="sec-p-in" class="cursor-pointer block">
                  <span class="text-lg block">📸</span>
                  <span class="text-[11px] font-bold text-amber-900">కింది 2వ ఫోటో</span>
                </label>
              </div>
            {:else}
              <div class="border-2 border-dashed border-slate-300 bg-white p-2.5 rounded-xl text-center">
                <input type="file" id="inset-p-in" accept="image/*" on:change={handleInsetPhoto} class="hidden" />
                <label for="inset-p-in" class="cursor-pointer block">
                  <span class="text-lg block">👤</span>
                  <span class="text-[11px] font-bold text-slate-800">సర్కిల్ లీడర్ ఫోటో</span>
                </label>
              </div>
            {/if}
          </div>
        </div>

        <!-- 7. CATEGORY & LOCATION -->
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label class="block font-bold text-slate-600 mb-1">వార్త కేటగిరీ</label>
            <select bind:value={selectedCategoryChoice} class="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 font-bold">
              {#each categoryOptions as cat}
                <option value={cat}>{cat}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-600 mb-1">లొకేషన్</label>
            <select bind:value={selectedLocationChoice} class="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 font-bold">
              {#each locationOptions as loc}
                <option value={loc}>{loc}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- 8. DOWNLOAD & SHARE BUTTONS -->
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            on:click={downloadCardAsJpeg}
            disabled={isGenerating}
            class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs"
          >
            <span>🖼️</span>
            <span>{isGenerating ? 'సిద్ధమవుతోంది...' : 'HD JPEG డౌన్‌లోడ్'}</span>
          </button>

          <button
            type="button"
            on:click={shareMobileNative}
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs"
          >
            <span>📲 WhatsApp షేర్</span>
          </button>
        </div>

      </section>

      <!-- RIGHT SIDE: LIVE PREVIEW STAGE (IMMUNE TO OKLCH CRASH) -->
      <section class="lg:col-span-7 flex flex-col items-center justify-center">
        
        <div class="w-full mb-2.5 flex items-center justify-between text-xs text-slate-500 px-2 font-bold">
          <span>🔍 లైవ్ ప్రివ్యూ ({ratioConfigs[selectedRatio].label})</span>
          <span class="text-red-600">లేఅవుట్: {layoutArrangement.toUpperCase()}</span>
        </div>

        <!-- CARD RENDER CONTAINER (ALL EXPLICIT INLINE COLORS, ZERO OKLCH) -->
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

            <!-- LAYOUT 1: TOP IMAGE - BOTTOM TEXT -->
            {#if layoutArrangement === 'top_img_bottom_text'}
              
              <div style="position: relative; width: 100%; height: {photoHeightPercent}%; overflow: hidden; background-color: #000000; flex-shrink: 0;">
                <img src={mainPhotoPreview} alt="News" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover; object-position: {imagePosition};" />

                <!-- Badges -->
                <div style="position: absolute; top: 10px; left: 10px; right: 10px; display: flex; align-items: center; justify-content: space-between; z-index: 10;">
                  <div style="display: flex; align-items: center; gap: 6px; background-color: rgba(0,0,0,0.85); padding: 4px 10px; border-radius: 8px; border: 1px solid #dc2626; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                    <span style="background-color: #dc2626; color: #ffffff; font-weight: 900; font-size: 10px; padding: 2px 6px; border-radius: 4px;">NS</span>
                    <span style="font-weight: 900; font-size: 12px; color: #ffffff; font-family: 'Ramabhadra', sans-serif;">NS NEWS</span>
                  </div>
                  <span style="background-color: #f59e0b; color: #020617; font-weight: 900; font-size: 10px; padding: 2px 10px; border-radius: 9999px; text-transform: uppercase;">
                    {badgeText}
                  </span>
                </div>

                {#if showInsetCircle && insetPhotoPreview}
                  <div style="position: absolute; bottom: 10px; right: 10px; width: 64px; height: 64px; border-radius: 9999px; border: 2px solid #ffffff; overflow: hidden; background-color: #ffffff; z-index: 10; box-shadow: 0 8px 16px rgba(0,0,0,0.4);">
                    <img src={insetPhotoPreview} alt="Leader" style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                {/if}
              </div>

              <div style="padding: 10px 16px; background-color: {headlineBgColor}; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                <h2
                  style="
                    margin: 0;
                    line-height: 1.35;
                    letter-spacing: -0.01em;
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

              <div style="flex: 1; padding: 12px 16px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; background-color: {cardBgColor};">
                <div
                  style="
                    white-space: pre-line;
                    line-height: 1.45;
                    color: {summaryColor};
                    font-size: {summaryFontSize}px;
                    font-weight: {isBold ? '600' : '400'};
                    font-style: {isItalic ? 'italic' : 'normal'};
                    text-align: {textAlign};
                  "
                >
                  {summary}
                </div>

                <div style="padding-top: 8px; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: bold; color: #94a3b8;">
                  <span style="color: #ffffff; font-family: monospace;">WWW.NEXLIFYNUCLEUS.IN</span>
                  <span style="background-color: rgba(220, 38, 38, 0.3); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); padding: 2px 8px; border-radius: 4px; font-size: 10px;">
                    📍 {locationTag} • @nexlifynews
                  </span>
                </div>
              </div>

            <!-- LAYOUT 2: TOP TEXT - BOTTOM IMAGE -->
            {:else if layoutArrangement === 'top_text_bottom_img'}

              <div style="padding: 12px 12px 6px 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); background-color: {cardBgColor};">
                <div style="display: flex; align-items: center; gap: 6px; background-color: rgba(0,0,0,0.85); padding: 4px 10px; border-radius: 8px; border: 1px solid #dc2626;">
                  <span style="background-color: #dc2626; color: #ffffff; font-weight: 900; font-size: 10px; padding: 2px 6px; border-radius: 4px;">NS</span>
                  <span style="font-weight: 900; font-size: 12px; color: #ffffff; font-family: 'Ramabhadra', sans-serif;">NS NEWS</span>
                </div>
                <span style="background-color: #f59e0b; color: #020617; font-weight: 900; font-size: 10px; padding: 2px 10px; border-radius: 9999px; text-transform: uppercase;">
                  {badgeText}
                </span>
              </div>

              <div style="padding: 10px 16px; background-color: {headlineBgColor}; flex-shrink: 0;">
                <h2
                  style="
                    margin: 0;
                    line-height: 1.35;
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

              <div style="padding: 10px 16px; overflow: hidden; flex-shrink: 0; background-color: {cardBgColor};">
                <div
                  style="
                    white-space: pre-line;
                    line-height: 1.4;
                    color: {summaryColor};
                    font-size: {summaryFontSize}px;
                    font-weight: {isBold ? '600' : '400'};
                    font-style: {isItalic ? 'italic' : 'normal'};
                    text-align: {textAlign};
                  "
                >
                  {summary}
                </div>
              </div>

              <div style="position: relative; width: 100%; flex: 1; overflow: hidden; background-color: #000000;">
                <img src={mainPhotoPreview} alt="News" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover; object-position: {imagePosition};" />
                
                <div style="position: absolute; bottom: 8px; left: 8px; right: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: bold; color: #ffffff; background-color: rgba(0,0,0,0.75); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                  <span style="font-family: monospace; color: #fde047;">WWW.NEXLIFYNUCLEUS.IN</span>
                  <span style="background-color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 9px;">📍 {locationTag}</span>
                </div>
              </div>

            <!-- LAYOUT 3: TEXT MIDDLE - DUAL IMAGE -->
            {:else if layoutArrangement === 'text_middle_dual_img'}

              <div style="position: relative; width: 100%; height: 32%; overflow: hidden; background-color: #000000; flex-shrink: 0;">
                <img src={mainPhotoPreview} alt="Top" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover; object-position: {imagePosition};" />
                <div style="position: absolute; top: 8px; left: 8px; display: flex; align-items: center; gap: 4px; background-color: rgba(0,0,0,0.85); padding: 2px 8px; border-radius: 4px; border: 1px solid #dc2626;">
                  <span style="background-color: #dc2626; color: #ffffff; font-weight: 900; font-size: 9px; padding: 1px 4px; border-radius: 2px;">NS</span>
                  <span style="font-weight: 900; font-size: 11px; color: #ffffff;">NS NEWS</span>
                </div>
                <span style="position: absolute; top: 8px; right: 8px; background-color: #f59e0b; color: #020617; font-weight: 900; font-size: 9px; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">
                  {badgeText}
                </span>
              </div>

              <div style="flex: 1; padding: 8px 14px; display: flex; flex-direction: column; justify-content: center; background-color: {headlineBgColor};">
                <h2
                  style="
                    margin: 0;
                    line-height: 1.3;
                    color: {headlineColor};
                    font-size: {headlineFontSize - 2}px;
                    font-weight: {isBold ? '900' : '400'};
                    font-style: {isItalic ? 'italic' : 'normal'};
                    text-transform: {isUppercase ? 'uppercase' : 'none'};
                    text-align: {textAlign};
                  "
                >
                  {headline}
                </h2>
                
                <p
                  style="
                    margin-top: 4px;
                    line-height: 1.35;
                    color: {summaryColor};
                    font-size: {summaryFontSize - 2}px;
                    text-align: {textAlign};
                  "
                >
                  {summary}
                </p>
              </div>

              <div style="position: relative; width: 100%; height: 32%; overflow: hidden; background-color: #000000; flex-shrink: 0;">
                <img src={secondaryPhotoPreview} alt="Bottom" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;" />
                
                <div style="position: absolute; bottom: 8px; left: 8px; right: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: bold; color: #ffffff; background-color: rgba(0,0,0,0.8); padding: 3px 8px; border-radius: 6px;">
                  <span style="font-family: monospace; color: #fde047;">WWW.NEXLIFYNUCLEUS.IN</span>
                  <span style="background-color: #dc2626; padding: 1px 6px; border-radius: 3px; font-size: 9px;">📍 {locationTag}</span>
                </div>
              </div>

            <!-- LAYOUT 4: FULL PHOTO OVERLAY -->
            {:else}

              <img
                src={mainPhotoPreview}
                alt="News Background"
                crossorigin="anonymous"
                style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: {imagePosition};"
              />

              <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.1) 100%);"></div>

              <div style="position: relative; z-index: 10; padding: 12px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 6px; background-color: rgba(0,0,0,0.8); padding: 4px 10px; border-radius: 8px; border: 1px solid #dc2626;">
                  <span style="background-color: #dc2626; color: #ffffff; font-weight: 900; font-size: 10px; padding: 2px 6px; border-radius: 4px;">NS</span>
                  <span style="font-weight: 900; font-size: 12px; color: #ffffff; font-family: 'Ramabhadra', sans-serif;">NS NEWS</span>
                </div>
                <span style="background-color: #f59e0b; color: #020617; font-weight: 900; font-size: 10px; padding: 2px 10px; border-radius: 9999px; text-transform: uppercase;">
                  {badgeText}
                </span>
              </div>

              <div style="position: relative; z-index: 10; padding: 16px; margin-top: auto;">
                <h2
                  style="
                    margin: 0;
                    line-height: 1.35;
                    color: {headlineColor};
                    font-size: {headlineFontSize}px;
                    font-weight: {isBold ? '900' : '400'};
                    font-style: {isItalic ? 'italic' : 'normal'};
                    text-transform: {isUppercase ? 'uppercase' : 'none'};
                    text-align: {textAlign};
                    text-shadow: 0 2px 8px rgba(0,0,0,0.9);
                  "
                >
                  {headline}
                </h2>

                <p
                  style="
                    margin-top: 6px;
                    line-height: 1.4;
                    color: {summaryColor};
                    font-size: {summaryFontSize}px;
                    text-align: {textAlign};
                    text-shadow: 0 1px 6px rgba(0,0,0,0.8);
                  "
                >
                  {summary}
                </p>

                <div style="padding-top: 8px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: bold; color: #e2e8f0;">
                  <span style="color: #fde047; font-family: monospace;">WWW.NEXLIFYNUCLEUS.IN</span>
                  <span style="background-color: rgba(220,38,38,0.7); color: #ffffff; padding: 2px 8px; border-radius: 4px; font-size: 10px;">
                    📍 {locationTag} • @nexlifynews
                  </span>
                </div>
              </div>

            {/if}

          </div>

        </div>

      </section>

    </main>

    <!-- MOBILE GUARANTEED DOWNLOAD POPUP MODAL -->
    {#if showImageModal && generatedCardImage}
      <div class="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-3 sm:p-5">
        <div class="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-4 space-y-3 text-center shadow-2xl">
          
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <span class="text-xs font-black text-emerald-600 flex items-center gap-1.5">
              <span>✓</span> <span>కార్డ్ సిద్ధమైంది (HD Ready)!</span>
            </span>
            <button
              type="button"
              on:click={() => showImageModal = false}
              class="text-slate-400 hover:text-slate-700 font-bold text-sm bg-slate-100 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 max-h-[58vh] flex items-center justify-center">
            <img src={generatedCardImage} alt="Generated HD Card" class="w-full h-auto object-contain" />
          </div>

          <div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 text-left">
            💡 <strong>మొబైల్ సూచన:</strong> పైన ఉన్న ఫోటోపై 2 సెకన్లు వేలితో నొక్కి పట్టుకొని (Long Press) <strong>"Download image"</strong> లేదా <strong>"Save image"</strong> నొక్కండి; నేరుగా ఫోన్ గ్యాలరీలోకి సేవ్ అవుతుంది!
          </div>

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