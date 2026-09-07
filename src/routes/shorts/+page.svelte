<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabaseClient';

  let shorts = [];
  let loading = true;
  let activeLang = 'all';
  let currentIndex = 0;
  let activeMediaIndex = 1;

  let isGeneratingPoster = false;
  let showShareModal = false;
  let copySuccess = false;

  onMount(async () => {
    try {
      const { data, error } = await supabase
        .from('shorts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        shorts = data;
      }
    } catch (e) {
      console.error('Fetch shorts error:', e);
    } finally {
      loading = false;
    }
  });

  $: filteredShorts = (shorts || []).filter(s => activeLang === 'all' || s.language === activeLang);
  $: currentItem = filteredShorts.length > 0 && currentIndex < filteredShorts.length ? filteredShorts[currentIndex] : null;

  $: if (currentItem) {
    activeMediaIndex = 1;
  }

  function nextNews() {
    if (currentIndex < filteredShorts.length - 1) {
      currentIndex++;
    }
  }

  function prevNews() {
    if (currentIndex > 0) {
      currentIndex--;
    }
  }

  function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('shorts/')) {
      videoId = url.split('shorts/')[1]?.split('?')[0];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  // క్రిస్ప్ HD కాన్వాస్ పోస్టర్ జెనరేటర్ (డల్ కలర్స్ లేకుండా ఒరిజినల్ డార్క్ బ్లాక్ టెక్స్ట్)
  async function downloadCardPoster() {
    if (!browser || !currentItem) return;
    isGeneratingPoster = true;

    try {
      // ఫాంట్లు పూర్తిగా లోడ్ అయ్యేలా చూడటం
      if (document.fonts) {
        await document.fonts.ready;
      }

      const targetImgUrl = (activeMediaIndex === 2 && currentItem.image_url_2) ? currentItem.image_url_2 : currentItem.image_url;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 1080;
      const height = 1440; // పర్ఫెక్ట్ 3:4 వర్టికల్ పోస్టర్ సైజ్

      canvas.width = width;
      canvas.height = height;

      // బ్యాక్‌గ్రౌండ్ - ప్యూర్ వైట్
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // టాప్ బ్రాండింగ్ బార్
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, 96);

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(40, 24, 70, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px sans-serif';
      ctx.fillText('NS', 56, 58);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 32px sans-serif';
      ctx.fillText('NEXLIFY SHORTS', 130, 58);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('⚡ SPEED NEWS', 860, 58);

      // ఇమేజ్ డ్రాయింగ్
      const bannerHeight = 620;
      if (targetImgUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            img.src = targetImgUrl;
          });
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, 0, 96, width, bannerHeight);
          }
        } catch (imgErr) {
          console.log('Poster image bypass');
        }
      }

      // లొకేషన్ బ్యాడ్జ్
      ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
      ctx.fillRect(40, 96 + bannerHeight - 74, 380, 54);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`📍 ${currentItem.location || 'తెలంగాణ'} • ${currentItem.reporter_name || 'NS Reporter'}`, 55, 96 + bannerHeight - 38);

      // శీర్షిక (హై-కాంట్రాస్ట్ జెట్ బ్లాక్)
      ctx.fillStyle = '#050811';
      ctx.font = "bold 46px 'Mandali', 'Noto Sans Telugu', sans-serif";
      
      const titleWords = (currentItem.title || '').split(' ');
      let line = '';
      let textY = 96 + bannerHeight + 70;

      for (let n = 0; n < titleWords.length; n++) {
        const testLine = line + titleWords[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 980 && n > 0) {
          ctx.fillText(line, 48, textY);
          line = titleWords[n] + ' ';
          textY += 60;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 48, textY);

      // డివైడర్ లైన్
      textY += 24;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(48, textY);
      ctx.lineTo(1032, textY);
      ctx.stroke();

      // వార్త బాడీ (క్రిస్ప్ డార్క్ చార్‌కోల్ బ్లాక్ - నో డల్ కలర్)
      textY += 56;
      ctx.fillStyle = '#111827';
      ctx.font = "600 32px 'Mandali', 'Noto Sans Telugu', sans-serif";

      const summaryWords = (currentItem.summary || '').split(' ');
      let sumLine = '';
      for (let n = 0; n < summaryWords.length; n++) {
        const testLine = sumLine + summaryWords[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 980 && n > 0) {
          ctx.fillText(sumLine, 48, textY);
          sumLine = summaryWords[n] + ' ';
          textY += 48;
        } else {
          sumLine = testLine;
        }
      }
      ctx.fillText(sumLine, 48, textY);

      // ఫుటర్ బ్యానర్
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, height - 90, width, 90);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(currentItem.created_at ? new Date(currentItem.created_at).toLocaleDateString('te-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '', 48, height - 38);

      ctx.fillStyle = '#dc2626';
      ctx.font = '800 24px sans-serif';
      ctx.fillText('⚡ పూర్తి వార్తలు: nexlifynucleus.in/shorts', 520, height - 38);

      // మొబైల్ అయితే నేరుగా షేర్ లేదా గ్యాలరీ డౌన్‌లోడ్
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `NS_Poster_${Date.now()}.jpg`, { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: currentItem.title,
              text: `${currentItem.title}\nhttps://nexlifynucleus.in/shorts`
            });
            return;
          } catch (e) {
            console.log('Fallback to file download');
          }
        }

        const a = document.createElement('a');
        a.download = `NS_Poster_${Date.now()}.jpg`;
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/jpeg', 0.98);

    } catch (e) {
      console.error('Poster generation error', e);
      alert('పోస్టర్ డౌన్‌లోడ్ చేయడంలో సమస్య వచ్చింది.');
    } finally {
      isGeneratingPoster = false;
    }
  }

  // వాట్సాప్ షేర్
  async function shareWhatsApp(item) {
    if (!item) return;
    const shareText = `*${item.title || ''}*\n\n${item.summary || ''}\n\n📍 *${item.location || 'తెలంగాణ'}* | NS LIVE\nపూర్తి వివరాలు: https://nexlifynucleus.in/shorts`;
    const targetUrl = item.image_url;

    if (browser && navigator.share && targetUrl) {
      try {
        const response = await fetch(targetUrl);
        const blob = await response.blob();
        const file = new File([blob], 'NS_News.jpg', { type: blob.type || 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            text: shareText
          });
          return;
        }
      } catch (err) {
        console.log('Fallback');
      }
    }
    if (browser) {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  }

  // X (Twitter) షేర్
  function shareTwitter(item) {
    if (!browser || !item) return;
    const tweet = `${item.title}\n\nపూర్తి వివరాలు చూడండి:\nhttps://nexlifynucleus.in/shorts`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank');
  }

  // Facebook
  function shareFacebook() {
    if (!browser) return;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://nexlifynucleus.in/shorts')}`, '_blank');
  }

  // కాపీ లింక్
  function copyLink(item) {
    if (!browser || !item) return;
    const textToCopy = `${item.title}\nhttps://nexlifynucleus.in/shorts`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      copySuccess = true;
      setTimeout(() => copySuccess = false, 2500);
    });
  }
</script>

<svelte:head>
  <title>{currentItem ? `${currentItem.title} - NS Shorts` : 'NS Shorts - స్పీడ్ న్యూస్'}</title>
  
  <!-- X (Twitter) & Open Graph Social Media Cards -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={currentItem?.title || 'NS Shorts'} />
  <meta name="twitter:description" content={currentItem?.summary || 'తాజా వార్తలు మరియు ముఖ్యాంశాలు'} />
  <meta name="twitter:image" content={currentItem?.image_url || 'https://nexlifynucleus.in/favicon.png'} />

  <meta property="og:type" content="article" />
  <meta property="og:title" content={currentItem?.title || 'NS Shorts'} />
  <meta property="og:description" content={currentItem?.summary || 'తాజా వార్తలు మరియు ముఖ్యాంశాలు'} />
  <meta property="og:image" content={currentItem?.image_url || 'https://nexlifynucleus.in/favicon.png'} />
  <meta property="og:url" content="https://nexlifynucleus.in/shorts" />
</svelte:head>

<div class="w-full min-h-screen bg-slate-900 flex justify-center items-center py-0 sm:py-6 px-0 sm:px-4 font-sans">
  
  <div class="w-full max-w-[480px] bg-slate-100 min-h-screen sm:min-h-0 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700/50">
    
    <!-- హెడర్ -->
    <header class="bg-slate-950 px-4 py-3 flex items-center justify-between shrink-0 text-white border-b border-slate-800">
      <div class="flex items-center gap-2">
        <span class="bg-red-600 text-white font-black text-xs px-2 py-0.5 rounded shadow">NS</span>
        <span class="text-sm font-black tracking-wider text-white">SHORTS</span>
      </div>
      
      <div class="flex items-center gap-2">
        <div class="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-bold">
          <button type="button" on:click={() => { activeLang = 'all'; currentIndex = 0; }} class="px-2 py-0.5 rounded {activeLang === 'all' ? 'bg-red-600 text-white' : 'text-slate-400'}">అన్నీ</button>
          <button type="button" on:click={() => { activeLang = 'te'; currentIndex = 0; }} class="px-2 py-0.5 rounded {activeLang === 'te' ? 'bg-red-600 text-white' : 'text-slate-400'}">తెలుగు</button>
          <button type="button" on:click={() => { activeLang = 'en'; currentIndex = 0; }} class="px-2 py-0.5 rounded {activeLang === 'en' ? 'bg-red-600 text-white' : 'text-slate-400'}">EN</button>
        </div>
        <span class="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full font-bold border border-slate-700">
          {filteredShorts.length > 0 ? `${currentIndex + 1}/${filteredShorts.length}` : '0'}
        </span>
      </div>
    </header>

    <!-- కార్డ్ ఏరియా -->
    <main class="flex-1 flex flex-col p-3 justify-center">
      {#if loading}
        <div class="py-32 flex flex-col items-center justify-center space-y-3">
          <div class="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-slate-500 font-bold">వార్త లోడ్ అవుతోంది...</p>
        </div>
      {:else if !currentItem}
        <div class="py-32 text-center text-slate-500 text-sm font-bold bg-white rounded-2xl shadow-sm border border-slate-200">
          వార్తలు అందుబాటులో లేవు.
        </div>
      {:else}
        
        <article class="w-full bg-white rounded-2xl overflow-hidden shadow-md border border-slate-200 flex flex-col">
          
          <!-- మీడియా సెక్షన్ -->
          {#if currentItem.youtube_url && getYouTubeEmbedUrl(currentItem.youtube_url)}
            <div class="relative w-full aspect-video bg-black shrink-0">
              <iframe 
                src={getYouTubeEmbedUrl(currentItem.youtube_url)} 
                title={currentItem.title || 'Video'}
                class="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
              ></iframe>
            </div>
          {:else}
            <div class="relative w-full h-[240px] sm:h-[280px] bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center">
              <img 
                src={activeMediaIndex === 2 && currentItem.image_url_2 ? currentItem.image_url_2 : currentItem.image_url} 
                alt={currentItem.title || 'News'} 
                class="w-full h-full object-contain bg-slate-950" 
              />
              
              <div class="absolute top-3 left-3 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow">
                NS LIVE
              </div>

              {#if currentItem.image_url_2}
                <div class="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2 py-1 rounded-full">
                  <button 
                    type="button"
                    on:click={() => activeMediaIndex = 1} 
                    class="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition {activeMediaIndex === 1 ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}">
                    1
                  </button>
                  <button 
                    type="button"
                    on:click={() => activeMediaIndex = 2} 
                    class="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition {activeMediaIndex === 2 ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}">
                    2
                  </button>
                </div>
              {/if}

              <div class="absolute bottom-2.5 left-3 bg-black/75 backdrop-blur text-white px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 shadow">
                <span class="text-amber-400 font-bold">📍 {currentItem.location || 'తెలంగాణ'}</span>
                <span>•</span>
                <span>{currentItem.reporter_name || 'NS Reporter'}</span>
              </div>
            </div>
          {/if}

          <!-- శీర్షిక -->
          <div class="px-4 pt-3.5 pb-2 border-b border-slate-100">
            <h2 class="text-base sm:text-[17px] font-black text-slate-900 leading-snug tracking-tight">
              {currentItem.title || ''}
            </h2>
          </div>

          <!-- వార్త బాడీ -->
          <div class="px-4 py-3">
            <p class="text-[13.5px] sm:text-[14.5px] text-slate-800 leading-relaxed font-normal whitespace-pre-line text-justify">
              {currentItem.summary || ''}
            </p>
          </div>

          <!-- ఫుటర్ వాటర్‌మార్క్ -->
          <div class="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
            <span>{currentItem.created_at ? new Date(currentItem.created_at).toLocaleDateString('te-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
            <span class="text-red-600 font-bold">⚡ Nexlify Sphere News</span>
          </div>

        </article>

        <!-- యాక్షన్ బటన్లు -->
        <div class="mt-2.5 bg-white rounded-xl p-2 shadow-sm border border-slate-200 flex items-center justify-between gap-1.5">
          <button 
            type="button"
            on:click={downloadCardPoster}
            disabled={isGeneratingPoster}
            class="flex-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 px-2.5 rounded-lg transition disabled:opacity-50 border border-slate-200">
            <span>🖼️</span>
            <span>{isGeneratingPoster ? 'పోస్టర్ రెడీ...' : 'కార్డ్ పోస్టర్'}</span>
          </button>

          <button 
            type="button"
            on:click={() => shareWhatsApp(currentItem)}
            class="flex items-center justify-center gap-1 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black py-2 px-3.5 rounded-lg shadow-sm transition active:scale-95">
            <span>📲</span>
            <span>వాట్సాప్</span>
          </button>

          <button 
            type="button"
            on:click={() => showShareModal = !showShareModal}
            class="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-2.5 rounded-lg transition">
            <span>🔗</span>
            <span>ఇతర</span>
          </button>
        </div>

        {#if showShareModal}
          <div class="mt-2 bg-slate-900 text-white p-3 rounded-xl shadow-xl flex items-center justify-around gap-2 text-xs font-bold">
            <button type="button" on:click={() => shareTwitter(currentItem)} class="hover:text-sky-400 flex flex-col items-center gap-1">
              <span class="text-base">𝕏</span>
              <span class="text-[10px]">Twitter</span>
            </button>
            <button type="button" on:click={shareFacebook} class="hover:text-blue-400 flex flex-col items-center gap-1">
              <span class="text-base">📘</span>
              <span class="text-[10px]">Facebook</span>
            </button>
            <button type="button" on:click={() => copyLink(currentItem)} class="hover:text-amber-400 flex flex-col items-center gap-1">
              <span class="text-base">📋</span>
              <span class="text-[10px]">{copySuccess ? 'కాపీ అయ్యింది!' : 'లింక్ కాపీ'}</span>
            </button>
            <button type="button" on:click={() => showShareModal = false} class="text-slate-400 hover:text-white text-xs ml-2">
              ✕
            </button>
          </div>
        {/if}

      {/if}
    </main>

    <!-- నావిగేషన్ -->
    <footer class="bg-white border-t border-slate-200 p-2.5 flex items-center justify-between shrink-0 shadow-sm">
      <button 
        type="button"
        on:click={prevNews} 
        disabled={currentIndex === 0}
        class="flex-1 mr-2 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 border border-slate-300">
        <span>⬅ మునుపటి వార్త</span>
      </button>
      <button 
        type="button"
        on:click={nextNews} 
        disabled={currentIndex >= filteredShorts.length - 1}
        class="flex-1 ml-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 shadow">
        <span>తర్వాతి వార్త ➡</span>
      </button>
    </footer>

  </div>
</div>