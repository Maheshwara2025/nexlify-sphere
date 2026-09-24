<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  let authChecking = true;

  // 1. Template & Ratio State
  let selectedTemplate = 'jwala'; // 'jwala', 'ratna', 'darshini', 'vigyan', 'champion'
  let selectedRatio = '1:1';     // '1:1' (Square - WhatsApp/FB/X), '9:16' (Story/Reels/Status)

  // 2. Content Inputs
  let badgeText = 'తాజా వార్త';
  let locationTag = 'ముత్తారం';
  let headline = 'కొత్త పింఛన్లపై మరో గుడ్‌న్యూస్.. మళ్లీ గడువు పెంచిన ప్రభుత్వం!';
  let summary = `• అర్హులైన లబ్ధిదారులకు దరఖాస్తు చేసుకోవడానికి ప్రభుత్వం మరో అవకాశం కల్పించింది.
• గ్రామ పంచాయతీ మరియు మున్సిపల్ కార్యాలయాల్లో ప్రత్యేక హెల్ప్‌డెస్క్‌లు ఏర్పాటు.
• దరఖాస్తుదారులు ఆధార్, రేషన్ కార్డు మరియు బ్యాంక్ వివరాలతో సంప్రదించాలి.`;
  let highlightNumber = '₹50,000';
  let highlightLabel = 'ఫిక్స్‌డ్ డిపాజిట్ సహాయం';
  let websiteUrl = 'www.nexlifynucleus.in';

  // 3. Photo Uploads
  let mainPhotoPreview = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80';
  let insetPhotoPreview = null;
  let showInsetCircle = false;
  let isGenerating = false;

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
      return;
    }
    authChecking = false;
  });

  // Handle Main Photo Pick
  function handleMainPhoto(e) {
    const input = e.target;
    if (input.files && input.files[0]) {
      mainPhotoPreview = URL.createObjectURL(input.files[0]);
    }
  }

  // Handle Inset Circle Photo Pick (Leader Face)
  function handleInsetPhoto(e) {
    const input = e.target;
    if (input.files && input.files[0]) {
      insetPhotoPreview = URL.createObjectURL(input.files[0]);
      showInsetCircle = true;
    }
  }

  // Load html-to-image library dynamically
  async function loadHtmlToImage() {
    if (typeof window === 'undefined') return null;
    if (window.htmlToImage) return window.htmlToImage;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
      script.onload = () => resolve(window.htmlToImage);
      script.onerror = () => reject(new Error('html-to-image library load avaledu'));
      document.head.appendChild(script);
    });
  }

  // 1-Click HD PNG Download
  async function downloadCardAsPng() {
    if (isGenerating) return;
    isGenerating = true;

    try {
      const node = document.getElementById('card-render-stage');
      if (!node) throw new Error('Card element kanipinchaledu');

      const hti = await loadHtmlToImage();
      const dataUrl = await hti.toPng(node, {
        quality: 1.0,
        pixelRatio: 3.0, // High Definition (HD) Ultra Clarity
        backgroundColor: '#000000'
      });

      const link = document.createElement('a');
      const cleanTitle = headline.substring(0, 15).replace(/[^a-zA-Z0-9\u0C00-\u0C7F]/g, '_');
      link.download = `NS_News_Card_${cleanTitle}_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Card download error: ' + err.message);
    } finally {
      isGenerating = false;
    }
  }

  // 1-Click WhatsApp Share
  function shareOnWhatsApp() {
    const text = `*${headline}*\n\n📍 ${locationTag} | NS News Network\n\nతాజా పూర్తి వివరాలు చదవండి:\n👉 https://${websiteUrl}\n\n_NS News & A.S.V. Digital Express_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }
</script>

<svelte:head>
  <title>NS News Picture Card Studio | Viral Social Media Creator</title>
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">
    <div class="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <div class="min-h-screen bg-[#0f172a] font-sans pb-24 text-slate-100">
    
    <!-- Top Header -->
    <header class="bg-[#090d16] text-white px-4 py-3 sticky top-0 z-40 border-b-2 border-red-600 shadow-xl">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <span class="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow">NS</span>
          <div>
            <h1 class="text-sm sm:text-base font-black tracking-wide text-white font-['Ramabhadra']">
              PICTURE NEWS CARD STUDIO
            </h1>
            <p class="text-[10px] text-slate-400">వైరల్ సోషల్ మీడియా న్యూస్ కార్డ్స్ మేకర్ • NS News Network</p>
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

      <!-- LEFT SIDE: INPUT CONTROLS PANEL (5 Columns) -->
      <section class="lg:col-span-5 bg-[#1e293b] border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        
        <!-- 1. Template Selector (5 Brand Styles) -->
        <div>
          <label class="block text-xs font-black text-amber-400 uppercase tracking-wider mb-2">
            1. టెంప్లేట్ ఎంపిక (Brand Style)
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold">
            <button
              type="button"
              on:click={() => selectedTemplate = 'jwala'}
              class="p-2.5 rounded-xl border text-left transition {selectedTemplate === 'jwala' ? 'bg-amber-500 text-black border-amber-400 font-black shadow-lg scale-102' : 'bg-slate-800 text-slate-300 border-slate-700'}"
            >
              <span class="block text-base">🔥</span>
              <span>NS జ్వాల</span>
              <p class="text-[9px] opacity-75 font-normal">TV9 డార్క్ & ఎల్లో</p>
            </button>

            <button
              type="button"
              on:click={() => selectedTemplate = 'ratna'}
              class="p-2.5 rounded-xl border text-left transition {selectedTemplate === 'ratna' ? 'bg-red-600 text-white border-red-500 font-black shadow-lg scale-102' : 'bg-slate-800 text-slate-300 border-slate-700'}"
            >
              <span class="block text-base">💎</span>
              <span>NS రత్న</span>
              <p class="text-[9px] opacity-75 font-normal">ఈనాడు రెడ్ & నేవీ</p>
            </button>

            <button
              type="button"
              on:click={() => selectedTemplate = 'darshini'}
              class="p-2.5 rounded-xl border text-left transition {selectedTemplate === 'darshini' ? 'bg-blue-600 text-white border-blue-400 font-black shadow-lg scale-102' : 'bg-slate-800 text-slate-300 border-slate-700'}"
            >
              <span class="block text-base">🌟</span>
              <span>NS దర్శిని</span>
              <p class="text-[9px] opacity-75 font-normal">ETV ఎల్లో & రాయల్ బ్లూ</p>
            </button>

            <button
              type="button"
              on:click={() => selectedTemplate = 'vigyan'}
              class="p-2.5 rounded-xl border text-left transition {selectedTemplate === 'vigyan' ? 'bg-emerald-600 text-white border-emerald-400 font-black shadow-lg scale-102' : 'bg-slate-800 text-slate-300 border-slate-700'}"
            >
              <span class="block text-base">🏛️</span>
              <span>NS విజ్ఞాన్</span>
              <p class="text-[9px] opacity-75 font-normal">Govt / ఇన్ఫోగ్రాఫిక్</p>
            </button>

            <button
              type="button"
              on:click={() => selectedTemplate = 'champion'}
              class="p-2.5 rounded-xl border text-left transition {selectedTemplate === 'champion' ? 'bg-purple-600 text-white border-purple-400 font-black shadow-lg scale-102' : 'bg-slate-800 text-slate-300 border-slate-700'}"
            >
              <span class="block text-base">🏆</span>
              <span>NS ఛాంపియన్</span>
              <p class="text-[9px] opacity-75 font-normal">స్పోర్ట్స్ / బిగ్ నంబర్స్</p>
            </button>
          </div>
        </div>

        <!-- 2. Aspect Ratio Selector -->
        <div>
          <label class="block text-xs font-black text-amber-400 uppercase tracking-wider mb-2">
            2. కార్డ్ సైజు / నిష్పత్తి (Aspect Ratio)
          </label>
          <div class="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              type="button"
              on:click={() => selectedRatio = '1:1'}
              class="p-2 rounded-xl border transition flex items-center justify-center gap-2 {selectedRatio === '1:1' ? 'bg-white text-black border-white shadow' : 'bg-slate-800 text-slate-300 border-slate-700'}"
            >
              <span>⬛ 1:1 స్క్వేర్ (WhatsApp / FB / X)</span>
            </button>

            <button
              type="button"
              on:click={() => selectedRatio = '9:16'}
              class="p-2 rounded-xl border transition flex items-center justify-center gap-2 {selectedRatio === '9:16' ? 'bg-white text-black border-white shadow' : 'bg-slate-800 text-slate-300 border-slate-700'}"
            >
              <span>📱 9:16 వర్టికల్ (Status / Reels)</span>
            </button>
          </div>
        </div>

        <!-- 3. Photo Uploads -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="border-2 border-dashed border-slate-700 bg-slate-900/60 p-3 rounded-2xl text-center space-y-1">
            <input type="file" id="main-pic" accept="image/*" on:change={handleMainPhoto} class="hidden" />
            <label for="main-pic" class="cursor-pointer block">
              <span class="text-xl block">📷</span>
              <span class="text-xs font-bold text-slate-200 block">ప్రధాన ఫోటో మార్చండి</span>
              <span class="text-[9px] text-slate-400">క్లిక్ చేసి ఫోటో ఎంచుకోండి</span>
            </label>
          </div>

          <div class="border-2 border-dashed border-slate-700 bg-slate-900/60 p-3 rounded-2xl text-center space-y-1">
            <input type="file" id="inset-pic" accept="image/*" on:change={handleInsetPhoto} class="hidden" />
            <label for="inset-pic" class="cursor-pointer block">
              <span class="text-xl block">👤</span>
              <span class="text-xs font-bold text-slate-200 block">సర్కిల్ ఫోటో (లీడర్ ఫేస్)</span>
              <span class="text-[9px] text-slate-400">ఈనాడు మోడల్ ఇన్‌సెట్</span>
            </label>
          </div>
        </div>

        <!-- 4. Text Information Form -->
        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-400 mb-1">కేటగిరీ బ్యాడ్జ్</label>
              <input type="text" bind:value={badgeText} class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold" />
            </div>
            <div>
              <label class="block font-bold text-slate-400 mb-1">లొకేషన్ / ఊరు</label>
              <input type="text" bind:value={locationTag} class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-400 mb-1">ప్రధాన బోల్డ్ హెడ్‌లైన్ (Catchy Punch Title) *</label>
            <textarea
              bind:value={headline}
              rows="2"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-black text-sm font-['Ramabhadra']"
            ></textarea>
          </div>

          <div>
            <label class="block font-bold text-slate-400 mb-1">సారాంశం (3-4 ముఖ్యమైన లైన్లు) *</label>
            <textarea
              bind:value={summary}
              rows="4"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs leading-relaxed"
            ></textarea>
          </div>

          {#if selectedTemplate === 'champion'}
            <div class="grid grid-cols-2 gap-2 bg-slate-900 p-3 rounded-xl border border-slate-700">
              <div>
                <label class="block font-bold text-amber-400 mb-1">బిగ్ నంబర్ (అంకెలు)</label>
                <input type="text" bind:value={highlightNumber} class="w-full bg-slate-800 border border-slate-600 rounded-lg p-1.5 text-amber-300 font-mono font-black" />
              </div>
              <div>
                <label class="block font-bold text-slate-400 mb-1">నంబర్ వివరణ</label>
                <input type="text" bind:value={highlightLabel} class="w-full bg-slate-800 border border-slate-600 rounded-lg p-1.5 text-white" />
              </div>
            </div>
          {/if}
        </div>

        <!-- Action Export Buttons -->
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            on:click={downloadCardAsPng}
            disabled={isGenerating}
            class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white font-black py-3 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>📸</span>
            <span>{isGenerating ? 'సిద్ధమవుతోంది...' : 'HD PNG డౌన్‌లోడ్'}</span>
          </button>

          <button
            type="button"
            on:click={shareOnWhatsApp}
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>📲 WhatsApp షేర్</span>
          </button>
        </div>

      </section>

      <!-- RIGHT SIDE: LIVE INTERACTIVE PREVIEW CANVAS (7 Columns) -->
      <section class="lg:col-span-7 flex flex-col items-center justify-center">
        <div class="w-full mb-2 flex items-center justify-between text-xs text-slate-400 px-2 font-bold">
          <span>🔍 లైవ్ కార్డు ప్రివ్యూ ({selectedRatio})</span>
          <span class="text-amber-400">స్టైల్: {selectedTemplate.toUpperCase()}</span>
        </div>

        <!-- RENDER STAGE (Captured by html-to-image) -->
        <div class="overflow-hidden p-2 flex items-center justify-center">
          
          <div
            id="card-render-stage"
            class="relative overflow-hidden shadow-2xl flex flex-col justify-between font-sans select-none"
            style="width: {selectedRatio === '1:1' ? '460px' : '380px'}; height: {selectedRatio === '1:1' ? '460px' : '620px'}; font-family: 'Noto Sans Telugu', sans-serif;"
          >

            <!-- ========================================================= -->
            <!-- STYLE 1: NS JWALA (TV9 DARK, FIRE YELLOW & RED FOOTER) -->
            <!-- ========================================================= -->
            {#if selectedTemplate === 'jwala'}
              <div class="w-full h-full bg-[#0a0a0c] flex flex-col justify-between text-white border border-slate-800">
                
                <!-- Top Image Half -->
                <div class="relative w-full {selectedRatio === '1:1' ? 'h-[50%]' : 'h-[52%]'} overflow-hidden bg-black">
                  <img src={mainPhotoPreview} alt="News" class="w-full h-full object-cover" />
                  
                  <!-- Top Bar: Logo & Badge -->
                  <div class="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <div class="flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-red-600">
                      <span class="bg-red-600 text-white font-black text-[10px] px-1.5 py-0.2 rounded shadow">NS</span>
                      <span class="font-black text-xs text-white font-['Ramabhadra'] tracking-wide">NS NEWS</span>
                    </div>
                    <span class="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded shadow uppercase">
                      {badgeText}
                    </span>
                  </div>

                  {#if showInsetCircle && insetPhotoPreview}
                    <div class="absolute bottom-2 right-2 w-16 h-16 rounded-full border-2 border-amber-400 overflow-hidden shadow-2xl bg-black">
                      <img src={insetPhotoPreview} alt="Leader" class="w-full h-full object-cover" />
                    </div>
                  {/if}
                </div>

                <!-- Bottom Content: Black with Yellow Headline & White Text -->
                <div class="flex-1 p-3.5 flex flex-col justify-between bg-gradient-to-b from-[#0e0e11] to-[#050507]">
                  <div>
                    <h2 class="text-amber-400 font-black text-base sm:text-[17px] leading-snug font-['Ramabhadra'] tracking-tight mb-2">
                      {headline}
                    </h2>
                    <div class="text-slate-200 text-[11.5px] leading-relaxed line-clamp-4 font-medium whitespace-pre-line">
                      {summary}
                    </div>
                  </div>

                  <!-- TV9 Style Bottom Red Bar -->
                  <div class="bg-red-600 text-white py-1.5 px-3 -mx-3.5 -mb-3.5 flex items-center justify-between font-black text-[10.5px]">
                    <span class="tracking-wide">WWW.NEXLIFYNUCLEUS.IN</span>
                    <span class="bg-black/30 px-2 py-0.5 rounded text-[9.5px]">📍 {locationTag}</span>
                  </div>
                </div>

              </div>

            <!-- ========================================================= -->
            <!-- STYLE 2: NS RATNA (EENADU RED TITLE BAND & NAVY BLUE BODY) -->
            <!-- ========================================================= -->
            {:else if selectedTemplate === 'ratna'}
              <div class="w-full h-full bg-[#1e293b] flex flex-col justify-between text-white border border-slate-700">
                
                <!-- Top Image -->
                <div class="relative w-full {selectedRatio === '1:1' ? 'h-[48%]' : 'h-[50%]'} overflow-hidden bg-black">
                  <img src={mainPhotoPreview} alt="News" class="w-full h-full object-cover" />
                  
                  <!-- Top Logo -->
                  <div class="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 px-2.5 py-1 rounded-md border border-red-500">
                    <span class="bg-red-600 text-white font-black text-[10px] px-1.5 rounded">NS</span>
                    <span class="font-black text-xs text-white font-['Ramabhadra']">NS NEWS</span>
                  </div>

                  {#if showInsetCircle && insetPhotoPreview}
                    <div class="absolute bottom-2 right-2 w-16 h-16 rounded-full border-2 border-white overflow-hidden shadow-2xl bg-white">
                      <img src={insetPhotoPreview} alt="Leader" class="w-full h-full object-cover" />
                    </div>
                  {/if}
                </div>

                <!-- Red Title Band (Eenadu Signature) -->
                <div class="bg-[#dc2626] text-white px-3 py-2 text-center shadow-md">
                  <h2 class="font-black text-sm sm:text-base leading-tight font-['Ramabhadra']">
                    {headline}
                  </h2>
                </div>

                <!-- Navy Blue Content Area -->
                <div class="flex-1 bg-[#0f172a] p-3 text-slate-100 text-xs leading-relaxed flex flex-col justify-between">
                  <div class="whitespace-pre-line text-[11px] leading-relaxed line-clamp-4">
                    {summary}
                  </div>

                  <!-- Footer -->
                  <div class="border-t border-slate-800 pt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>{websiteUrl}</span>
                    <span>📍 {locationTag} • Follow: @nexlifynews</span>
                  </div>
                </div>

              </div>

            <!-- ========================================================= -->
            <!-- STYLE 3: NS DARSHINI (ETV YELLOW BANNER & ROYAL BLUE BODY) -->
            <!-- ========================================================= -->
            {:else if selectedTemplate === 'darshini'}
              <div class="w-full h-full bg-[#172554] flex flex-col justify-between text-white border border-slate-700">
                
                <!-- Top Image Area -->
                <div class="relative w-full {selectedRatio === '1:1' ? 'h-[46%]' : 'h-[48%]'} overflow-hidden bg-black">
                  <img src={mainPhotoPreview} alt="News" class="w-full h-full object-cover" />
                  
                  <div class="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded-md border border-amber-400 flex items-center gap-1">
                    <span class="bg-amber-400 text-black font-black text-[10px] px-1 rounded">ETV</span>
                    <span class="text-white font-black text-[10px]">NS TELANGANA</span>
                  </div>
                </div>

                <!-- Middle Bright Yellow Band (ETV Signature) -->
                <div class="bg-[#facc15] text-slate-950 px-3 py-2 text-center shadow">
                  <h2 class="font-black text-sm sm:text-base leading-tight font-['Ramabhadra']">
                    {headline}
                  </h2>
                </div>

                <!-- Deep Royal Blue Body -->
                <div class="flex-1 bg-[#1e40af] p-3 text-white text-xs leading-relaxed flex flex-col justify-between">
                  <div class="whitespace-pre-line text-[11px] leading-relaxed line-clamp-4 font-medium">
                    {summary}
                  </div>

                  <div class="bg-[#172554] py-1 px-3 -mx-3 -mb-3 flex items-center justify-between text-[9.5px] font-bold text-slate-300">
                    <span>Follow Us: YouTube • FB • Insta</span>
                    <span>@nexlifynews</span>
                  </div>
                </div>

              </div>

            <!-- ========================================================= -->
            <!-- STYLE 4: NS VIGYAN (GOVT / INFOGRAPHIC PASTEL STYLE) -->
            <!-- ========================================================= -->
            {:else if selectedTemplate === 'vigyan'}
              <div class="w-full h-full bg-[#f8fafc] text-slate-900 flex flex-col justify-between border-2 border-slate-300 p-3">
                
                <!-- Top Official Bar -->
                <div class="flex items-center justify-between border-b pb-2 border-slate-300">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">🏛️</span>
                    <div>
                      <span class="text-[10px] font-bold text-slate-500 block">TELANGANA SPOTLIGHT</span>
                      <span class="text-xs font-black text-slate-900 font-['Ramabhadra']">NS NEWS BULLETIN</span>
                    </div>
                  </div>
                  <span class="bg-emerald-100 text-emerald-900 font-black text-[9px] px-2 py-0.5 rounded-full border border-emerald-300">
                    {locationTag}
                  </span>
                </div>

                <!-- Headline -->
                <div class="py-1">
                  <h2 class="text-slate-950 font-black text-sm sm:text-base font-['Ramabhadra'] leading-tight">
                    {headline}
                  </h2>
                </div>

                <!-- 3 Highlights Cards -->
                <div class="grid grid-cols-3 gap-1.5 my-1 text-[10px]">
                  <div class="bg-blue-50 border border-blue-200 p-1.5 rounded-xl text-center">
                    <span class="block text-blue-900 font-bold">స్థానం</span>
                    <span class="font-black text-blue-950 truncate block">{locationTag}</span>
                  </div>
                  <div class="bg-emerald-50 border border-emerald-200 p-1.5 rounded-xl text-center">
                    <span class="block text-emerald-900 font-bold">కేటగిరీ</span>
                    <span class="font-black text-emerald-950 truncate block">{badgeText}</span>
                  </div>
                  <div class="bg-amber-50 border border-amber-200 p-1.5 rounded-xl text-center">
                    <span class="block text-amber-900 font-bold">పరిశీలన</span>
                    <span class="font-black text-amber-950 block">వెరిఫైడ్ ✓</span>
                  </div>
                </div>

                <!-- Photo Half -->
                <div class="relative w-full h-[36%] rounded-xl overflow-hidden border border-slate-300">
                  <img src={mainPhotoPreview} alt="News" class="w-full h-full object-cover" />
                </div>

                <!-- Summary Bullets -->
                <div class="bg-white p-2 rounded-xl border border-slate-200 text-[10.5px] leading-tight text-slate-800 line-clamp-3 font-medium">
                  {summary}
                </div>

                <!-- Footer -->
                <div class="border-t border-slate-200 pt-1 flex justify-between text-[9px] text-slate-500 font-bold">
                  <span>A.S.V. Enterprises & NS Media</span>
                  <span>{websiteUrl}</span>
                </div>

              </div>

            <!-- ========================================================= -->
            <!-- STYLE 5: NS CHAMPION (SPORTS & BIG NUMBERS GRADIENT) -->
            <!-- ========================================================= -->
            {:else if selectedTemplate === 'champion'}
              <div class="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col justify-between text-white border border-slate-800">
                
                <!-- Background Full Cover Image -->
                <img src={mainPhotoPreview} alt="News" class="absolute inset-0 w-full h-full object-cover" />
                
                <!-- Dark Gradient Overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-black/40"></div>

                <!-- Top Bar -->
                <div class="relative z-10 p-3 flex justify-between items-center">
                  <span class="bg-red-600 text-white font-black text-xs px-2.5 py-0.5 rounded shadow">NS CHAMPION</span>
                  <span class="bg-black/60 backdrop-blur text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400">
                    #{locationTag}
                  </span>
                </div>

                <!-- Center Big Highlight Number -->
                <div class="relative z-10 p-4 text-center my-auto">
                  <h2 class="text-amber-300 font-black text-4xl sm:text-5xl font-mono tracking-tight drop-shadow-md">
                    {highlightNumber}
                  </h2>
                  <p class="text-xs font-bold text-slate-200 tracking-wider uppercase mt-1">
                    {highlightLabel}
                  </p>
                </div>

                <!-- Bottom Headline & Summary -->
                <div class="relative z-10 p-3.5 bg-black/70 backdrop-blur-sm border-t border-slate-800 space-y-1">
                  <h3 class="font-black text-sm text-white font-['Ramabhadra'] leading-tight">
                    {headline}
                  </h3>
                  <p class="text-[10.5px] text-slate-300 line-clamp-2 leading-relaxed">
                    {summary}
                  </p>
                  <div class="pt-1 flex justify-between text-[9.5px] text-slate-400 font-bold border-t border-slate-700/60">
                    <span>{websiteUrl}</span>
                    <span>@nexlifynews</span>
                  </div>
                </div>

              </div>
            {/if}

          </div>

        </div>
      </section>

    </main>
  </div>
{/if}