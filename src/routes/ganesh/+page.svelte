<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let senderName = '';
  let fromParam = '';
  let flowers = [];
  let isHarathiActive = false;
  let isBellRinging = false;
  let isCoconutCracking = false;
  let showCopied = false;
  let mantraPlaying = false;
  let currentChantText = '';

  let shankhAudio;
  let coconutAudio;

  // వాట్సాప్ షేరింగ్ లింక్ జనరేటర్
  $: targetName = senderName.trim() || 'శ్రీనివాస్';
  $: shareUrl = `https://nexlifynucleus.in/ganesh?from=${encodeURIComponent(targetName)}`;
  $: whatsappLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `*🕉️ శ్రీ వినాయక చవితి మహోత్సవ శుభాకాంక్షలు!* 🐘🪔\n\nమీకు మరియు మీ కుటుంబ సభ్యులకు *${targetName}* పంపిన ప్రత్యేక దివ్య దర్శనం, వేద మంత్రోచ్ఛారణ & మహా హారతిని ఇక్కడ దర్శించుకోండి:\n👇 వెంటనే క్లిక్ చేసి గణపతి ఆశీస్సులు పొందండి:\n${shareUrl}\n\n_A.S.V. Enterprises, ముత్తారం (CSC ID: 514542450010)_`
  )}`;

  const patralu = [
    'మాచీపత్రం', 'బృహతీపత్రం (వాకుడు)', 'బిల్వపత్రం (మారేడు)', 'దూర్వాయుగ్మం (గరిక)',
    'దత్తూరపత్రం (ఉమ్మెత్త)', 'బదరీపత్రం (రేగు)', 'అపామార్గపత్రం (ఉత్తరేణి)', 'తులసీపత్రం',
    'చూతపత్రం (మామిడి)', 'కరవీరపత్రం (గన్నేరు)', 'మరువకపత్రం (మరువం)', 'సింధువారపత్రం (వావిలి)',
    'జాజీపత్రం', 'గండకీపత్రం', 'శమీపత్రం (జమ్మి)', 'అశ్వత్థపత్రం (రావి)',
    'అర్జునపత్రం (మద్ది)', 'అర్కపత్రం (జిల్లేడు)', 'విష్ణుక్రాంతపత్రం', 'దాడిమీపత్రం (దానిమ్మ)',
    'దేవదారుపత్రం'
  ];

  onMount(() => {
    fromParam = $page.url.searchParams.get('from') || '';
    if (fromParam) {
      triggerFlowerShower();
    }
  });

  // పూల వర్షం (3D Confetti Flowers)
  function triggerFlowerShower() {
    const icons = ['🌺', '🌸', '🌼', '💐', '🍃', '✨', '🏵️'];
    const items = [];
    for (let i = 0; i < 45; i++) {
      items.push({
        id: Math.random(),
        icon: icons[Math.floor(Math.random() * icons.length)],
        left: Math.random() * 95,
        duration: 2.2 + Math.random() * 2.8,
        size: 22 + Math.random() * 24
      });
    }
    flowers = items;
    setTimeout(() => { flowers = []; }, 5000);
  }

  // 🔔 నిజమైన ఆలయ కంచు గంట (Web Audio API డీప్ బ్రాస్ ఎకో)
  function ringTempleBell() {
    isBellRinging = true;
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();

      // కంచు గంట ఫ్రీక్వెన్సీలు (Harmonics)
      const freqs = [587.33, 880, 1174.66, 1760]; // D5, A5, D6, A6 నోట్స్
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.4 / (idx + 1), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 2.5);
      });
    } catch (e) {
      console.log('AudioContext not supported');
    }

    setTimeout(() => { isBellRinging = false; }, 2000);
  }

  // 🥥 కొబ్బరికాయ కొట్టడం
  function breakCoconut() {
    isCoconutCracking = true;
    if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
    if (coconutAudio) {
      coconutAudio.currentTime = 0;
      coconutAudio.play().catch(() => {});
    }
    triggerFlowerShower();
    setTimeout(() => { isCoconutCracking = false; }, 3500);
  }

  // 🪔 మహా హారతి + పవిత్ర శ్లోక పఠనం (Mantra Chanting)
  function startMahaHarathi() {
    isHarathiActive = true;
    mantraPlaying = true;
    currentChantText = 'శుక్లాంబరధరం విష్ణుం శశివర్ణం చతుర్భుజం | ప్రసన్నవదనం ధ్యాయేత్ సర్వవిఘ్నోపశాంతయే ||';

    if (navigator.vibrate) navigator.vibrate([80, 50, 80, 50, 200]);
    
    // ఆలయ గంట మోగించడం
    ringTempleBell();
    triggerFlowerShower();

    // శంఖ నాదం
    if (shankhAudio) {
      shankhAudio.currentTime = 0;
      shankhAudio.play().catch(() => {});
    }

    // వాయిస్ ఇంజిన్ ద్వారా శ్లోక పఠనం
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // పాతది ఉంటే ఆపడం
      const chant = new SpeechSynthesisUtterance("శుక్లాంబరధరం విష్ణుం, శశివర్ణం చతుర్భుజం. ప్రసన్నవదనం ధ్యాయేత్, సర్వవిఘ్నోపశాంతయే. ఓం శ్రీ మహాగణాధిపతయే నమః, కర్పూర నీరాజనం సమర్పయామి.");
      chant.lang = 'te-IN';
      chant.rate = 0.85; // గంభీరమైన వేద శైలి స్పీడ్
      chant.pitch = 0.95;

      chant.onend = () => {
        mantraPlaying = false;
        isHarathiActive = false;
      };

      window.speechSynthesis.speak(chant);
    } else {
      setTimeout(() => {
        mantraPlaying = false;
        isHarathiActive = false;
      }, 7000);
    }
  }

  function stopMantra() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    mantraPlaying = false;
    isHarathiActive = false;
  }

  function copyShareLink() {
    navigator.clipboard.writeText(shareUrl);
    showCopied = true;
    setTimeout(() => showCopied = false, 2500);
  }
</script>

<svelte:head>
  <title>{fromParam ? `${decodeURIComponent(fromParam)} గారి వినాయక చవితి శుభాకాంక్షలు` : 'శ్రీ వినాయక చవితి మహోత్సవం 2026 | దివ్య దర్శనం & మహా హారతి'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Ramabhadra&family=Noto+Sans+Telugu:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<!-- ఆడియో ఎలిమెంట్స్ -->
<audio bind:this={shankhAudio} src="https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3" preload="auto"></audio>
<audio bind:this={coconutAudio} src="https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3" preload="auto"></audio>

<!-- పూల వర్షం ఓవర్‌లే -->
{#if flowers.length > 0}
  <div class="fixed inset-0 pointer-events-none z-50 overflow-hidden">
    {#each flowers as fl (fl.id)}
      <div
        class="absolute flower-item"
        style="left: {fl.left}%; font-size: {fl.size}px; animation-duration: {fl.duration}s;"
      >
        {fl.icon}
      </div>
    {/each}
  </div>
{/if}

<div class="min-h-screen bg-[#0d0301] text-amber-100 flex flex-col font-['Noto_Sans_Telugu',sans-serif] selection:bg-amber-500 selection:text-black">
  
  <!-- హెడర్ -->
  <header class="bg-black/90 backdrop-blur border-b-2 border-amber-600/50 sticky top-0 z-40 px-4 py-3 shadow-2xl">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <a href="/" class="flex items-center gap-2">
        <div class="w-9 h-9 bg-gradient-to-tr from-amber-500 to-red-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg">
          卐
        </div>
        <div>
          <span class="font-['Ramabhadra'] text-lg text-amber-300 block leading-none">NS భక్తి డెస్క్</span>
          <span class="text-[9px] text-amber-400/80 font-bold uppercase tracking-wider">A.S.V. ENTERPRISES</span>
        </div>
      </a>
      <a href="/" class="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3.5 py-1.5 rounded-xl font-bold transition">
        🏠 హోమ్ పేజీ
      </a>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-4 py-6 sm:py-8 flex-grow w-full space-y-8">

    <!-- ప్రత్యేక విషెస్ కార్డ్ (వేరే వారు పంపిన లింక్ ద్వారా వస్తే) -->
    {#if fromParam}
      <div class="bg-gradient-to-r from-red-950 via-amber-800 to-red-950 p-6 rounded-3xl text-center shadow-2xl border-2 border-yellow-400 animate-pulse">
        <span class="text-yellow-200 text-xs font-black uppercase tracking-widest block mb-1">ప్రత్యేక పండుగ సందేశం</span>
        <h2 class="text-2xl sm:text-3xl font-black text-white font-['Ramabhadra']">
          మీకు మరియు మీ కుటుంబ సభ్యులకు <br class="sm:hidden" />
          <span class="text-yellow-300 underline underline-offset-4 decoration-amber-300">
            {decodeURIComponent(fromParam)}
          </span> గారి నుండి
        </h2>
        <p class="text-amber-100 text-sm font-bold mt-2">
          శ్రీ వినాయక చవితి శుభాకాంక్షలు! విఘ్నేశ్వరుని కృపాకటాక్షాలతో మీకు సకల కార్యసిద్ధి కలగాలని మనసారా కోరుకుంటున్నారు.
        </p>
      </div>
    {/if}

    <!-- 1. ప్రధాన గర్భగుడి దివ్య దర్శనం -->
    <section class="bg-gradient-to-b from-[#240a03] via-[#150401] to-[#0a0201] rounded-3xl p-6 sm:p-10 border-2 border-amber-500/60 shadow-2xl text-center relative overflow-hidden">
      
      <div class="inline-block bg-amber-500/20 border border-amber-400/50 px-4 py-1.5 rounded-full text-xs font-black text-amber-300 mb-3 shadow">
        🕉️ సర్వవిఘ్నహరాయ నమః 🕉️
      </div>

      <h1 class="text-2xl sm:text-4xl font-black text-amber-400 font-['Ramabhadra'] tracking-wide">
        శ్రీ సిద్ధి బుద్ధి సమేత గణపతి దివ్య దర్శనం
      </h1>
      <p class="text-xs sm:text-sm text-amber-200/90 mt-1 max-w-lg mx-auto">
        ఆలయ కంచు గంట మోగించండి, పవిత్ర వేద శ్లోకంతో మహా హారతి సమర్పించండి!
      </p>

      <!-- విగ్రహం & యానిమేటెడ్ ప్రభామండలం -->
      <div class="relative w-72 h-72 sm:w-88 sm:h-88 mx-auto my-6 flex items-center justify-center">
        
        <div class="absolute inset-0 border-2 border-dashed border-amber-400/40 rounded-full animate-spin pointer-events-none" style="animation-duration: 40s;"></div>

        <!-- మహా హారతి జ్యోతి ప్రదక్షిణ -->
        {#if isHarathiActive}
          <div class="absolute -inset-4 border-4 border-amber-400/80 rounded-full animate-spin pointer-events-none shadow-[0_0_50px_rgba(245,158,11,0.8)]" style="animation-duration: 3.5s;">
            <div class="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl drop-shadow-[0_0_15px_#f59e0b]">🪔</div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-3xl drop-shadow-[0_0_15px_#f59e0b]">🪔</div>
            <div class="absolute top-1/2 -left-5 -translate-y-1/2 text-3xl drop-shadow-[0_0_15px_#f59e0b]">🪔</div>
            <div class="absolute top-1/2 -right-5 -translate-y-1/2 text-3xl drop-shadow-[0_0_15px_#f59e0b]">🪔</div>
          </div>
        {/if}

        <!-- స్వర్ణ వినాయక రూపం -->
        <div class="relative z-10 w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 border-amber-400/90 p-3 shadow-2xl bg-gradient-to-br from-[#380e04] via-[#1a0400] to-black flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 200 200" class="w-full h-full drop-shadow-[0_10px_25px_rgba(245,158,11,0.6)]">
            <defs>
              <linearGradient id="divineGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFF275" />
                <stop offset="35%" stop-color="#FFD700" />
                <stop offset="70%" stop-color="#FFA500" />
                <stop offset="100%" stop-color="#FF8C00" />
              </linearGradient>
              <linearGradient id="crownShine" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF" />
                <stop offset="50%" stop-color="#FFD700" />
                <stop offset="100%" stop-color="#D4AF37" />
              </linearGradient>
            </defs>

            <circle cx="100" cy="95" r="85" fill="#4d1000" opacity="0.7" />
            <circle cx="100" cy="95" r="80" fill="none" stroke="url(#divineGold)" stroke-width="2.5" stroke-dasharray="8,4" />

            <polygon points="100,15 75,55 125,55" fill="url(#crownShine)" stroke="#8B4513" stroke-width="1.5" />
            <circle cx="100" cy="35" r="5" fill="#DC2626" />
            <polygon points="100,5 93,18 107,18" fill="#FFF275" />

            <path d="M 65,75 C 25,60 20,110 58,120 C 65,120 68,112 70,105 Z" fill="url(#divineGold)" opacity="0.95" stroke="#8B4513" stroke-width="1" />
            <path d="M 135,75 C 175,60 180,110 142,120 C 135,120 132,112 130,105 Z" fill="url(#divineGold)" opacity="0.95" stroke="#8B4513" stroke-width="1" />

            <path d="M 75,68 Q 100,55 125,68 Q 128,105 116,130 Q 105,152 126,156 Q 133,155 135,145 Q 122,138 123,122 Q 112,85 100,74" 
                  fill="none" stroke="url(#divineGold)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
            
            <line x1="88" y1="64" x2="112" y2="64" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <line x1="90" y1="69" x2="110" y2="69" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="100" cy="66" r="3" fill="#DC2626" />

            <ellipse cx="86" cy="76" rx="2.5" ry="3.5" fill="#ffffff" />
            <circle cx="86" cy="76" r="1.3" fill="#000000" />

            <circle cx="135" cy="146" r="8" fill="#FBBF24" stroke="#D97706" stroke-width="1.5" />
            <circle cx="135" cy="144" r="2" fill="#DC2626" />

            <polygon points="82,106 74,116 86,111" fill="#ffffff" />
          </svg>
        </div>

      </div>

      <!-- లైవ్ శ్లోక టెక్స్ట్ బ్యాడ్జ్ -->
      {#if mantraPlaying}
        <div class="mb-4 bg-amber-500/20 border border-amber-400 p-3 rounded-2xl max-w-xl mx-auto animate-pulse">
          <span class="text-amber-300 font-bold text-xs sm:text-sm block leading-relaxed">
            {currentChantText}
          </span>
          <button type="button" on:click={stopMantra} class="text-[11px] text-red-400 underline font-bold mt-1">
            మంత్రం ఆపండి (Stop)
          </button>
        </div>
      {/if}

      <!-- పూజా కంట్రోల్స్ -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
        
        <!-- ఆలయ గంట -->
        <button
          type="button"
          on:click={ringTempleBell}
          class="bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 text-slate-950 font-black text-xs sm:text-sm py-3.5 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-90 transition border border-amber-300"
        >
          <span class="text-3xl {isBellRinging ? 'animate-bounce' : ''}">🔔</span>
          <span>ఆలయ గంట</span>
        </button>

        <!-- మహా హారతి & శ్లోకం -->
        <button
          type="button"
          on:click={startMahaHarathi}
          class="bg-gradient-to-b from-red-600 via-rose-700 to-red-800 hover:from-red-500 text-white font-black text-xs sm:text-sm py-3.5 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-90 transition border border-yellow-300 {isHarathiActive ? 'ring-4 ring-yellow-400 animate-pulse' : ''}"
        >
          <span class="text-3xl animate-spin" style="animation-duration: 4s;">🪔</span>
          <span>మహా హారతి & శ్లోకం</span>
        </button>

        <!-- కొబ్బరికాయ -->
        <button
          type="button"
          on:click={breakCoconut}
          class="bg-gradient-to-b from-[#5a2a18] to-[#2d1107] hover:from-[#6d341e] text-amber-200 font-black text-xs sm:text-sm py-3.5 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-90 transition border border-amber-600/40"
        >
          <span class="text-3xl">{isCoconutCracking ? '🥥💦' : '🥥'}</span>
          <span>{isCoconutCracking ? 'సమర్పించబడింది!' : 'కొబ్బరికాయ సమర్పణ'}</span>
        </button>

        <!-- పూల వర్షం -->
        <button
          type="button"
          on:click={triggerFlowerShower}
          class="bg-gradient-to-b from-emerald-600 to-teal-800 hover:from-emerald-500 text-white font-black text-xs sm:text-sm py-3.5 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-90 transition border border-emerald-400"
        >
          <span class="text-3xl">🌺</span>
          <span>పూల వర్షం</span>
        </button>

      </div>

    </section>

    <!-- 2. వైరల్ వాట్సాప్ గ్రీటింగ్ కార్డు మేకర్ -->
    <section class="bg-gradient-to-r from-red-950 via-[#2b0c05] to-amber-950 rounded-3xl p-6 sm:p-8 border-2 border-amber-500/50 shadow-2xl space-y-4">
      <div class="text-center space-y-1">
        <span class="bg-red-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow">వైరల్ షేరింగ్ విడ్జెట్</span>
        <h3 class="text-xl sm:text-2xl font-black text-amber-300 font-['Ramabhadra']">
          మీ పేరుతో ప్రత్యేక శుభాకాంక్షల దర్శనం పంపండి
        </h3>
        <p class="text-xs text-amber-200/90">
          మీ పేరు టైప్ చేసి క్రింది ఆకుపచ్చ బటన్ నొక్కగానే మీ పేరుతో వాట్సాప్ మెసేజ్ వెళ్తుంది!
        </p>
      </div>

      <div class="max-w-md mx-auto space-y-3 pt-2">
        <div>
          <label for="uname" class="block text-xs font-bold text-amber-300 mb-1.5">మీ పేరు లేదా కుటుంబ పేరు:</label>
          <input
            id="uname"
            type="text"
            bind:value={senderName}
            placeholder="ఉదా: శ్రీనివాస్ మరియు కుటుంబ సభ్యులు"
            class="w-full px-4 py-3.5 rounded-2xl bg-white text-slate-950 font-bold text-sm focus:ring-4 focus:ring-amber-400 focus:outline-none placeholder:font-normal placeholder:text-slate-400 shadow-inner"
          />
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          class="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-base py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition tracking-wide"
        >
          <i class="fa-brands fa-whatsapp text-2xl"></i>
          <span>వాట్సాప్‌లో పంపండి (Share on WhatsApp)</span>
        </a>

        <div class="flex items-center gap-2 pt-1">
          <input
            type="text"
            readonly
            value={shareUrl}
            class="w-full px-3 py-2.5 bg-black/60 text-amber-300 text-xs rounded-xl font-mono border border-amber-500/40 select-all"
          />
          <button
            type="button"
            on:click={copyShareLink}
            class="bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs px-4 py-2.5 rounded-xl font-black shrink-0 shadow transition"
          >
            {showCopied ? 'కాపీ అయింది!' : 'కాపీ'}
          </button>
        </div>
      </div>
    </section>

    <!-- 3. ఏకవింశతి పత్ర పూజ (21 పవిత్ర పత్రాలు) -->
    <section class="bg-[#1a0803] rounded-3xl p-6 sm:p-7 border border-amber-600/30 shadow-md space-y-3">
      <div class="border-b border-amber-700/40 pb-2 flex items-center justify-between">
        <div>
          <h3 class="text-base sm:text-lg font-black text-amber-300 font-['Ramabhadra']">
            🌿 వినాయకుడి ఏకవింశతి పత్ర పూజ (21 పవిత్ర ఆకులు)
          </h3>
          <p class="text-[11px] text-amber-200/70">పూజ సమయంలో భక్తితో పఠించండి:</p>
        </div>
        <span class="text-lg">🕉️</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-amber-100">
        {#each patralu as p, idx}
          <div class="bg-black/50 border border-amber-600/20 p-2.5 rounded-xl flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <span class="truncate font-medium">{p}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- 4. మండపాల కోసం వ్యాపార సేవలు -->
    <section class="bg-gradient-to-br from-slate-950 via-[#1d0502] to-black rounded-3xl p-6 sm:p-8 border-2 border-red-600 shadow-2xl text-center space-y-3">
      <span class="bg-amber-400 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">మండపాల ప్రత్యేక సేవలు</span>
      <h3 class="text-xl sm:text-2xl font-black text-white font-['Ramabhadra']">
        A.S.V. ENTERPRISES — ముత్తారం బస్ స్టాండ్
      </h3>
      <p class="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl mx-auto font-medium">
        గణేష్ మండపాల చందా రసీదు పుస్తకాలు, లడ్డు వేలం కూపన్లు, ఫ్లెక్సీ బ్యానర్లు, మరియు పోలీస్ / విద్యుత్ డిపార్ట్‌మెంట్ ఆన్‌లైన్ పర్మిషన్ల దరఖాస్తు కోసం మా కేంద్రాన్ని సంప్రదించండి.
      </p>
      <div class="pt-2 text-xs sm:text-sm font-bold text-amber-300 flex flex-wrap justify-center gap-3">
        <a href="tel:9949122402" class="hover:underline flex items-center gap-1">
          <i class="fa-solid fa-phone"></i> 9949122402
        </a>
        <span>•</span>
        <span>CSC ID: 514542450010</span>
        <span>•</span>
        <span>ముత్తారం బస్ స్టాండ్ వద్ద</span>
      </div>
    </section>

  </main>

  <footer class="bg-black text-slate-500 py-6 border-t border-amber-900/50 text-xs text-center">
    <p>© 2026 A.S.V. Enterprises & NS News. సర్వేజనా సుఖినోభవంతు.</p>
  </footer>

</div>

<style>
  @keyframes fall {
    0% {
      transform: translateY(-40px) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(105vh) rotate(360deg);
      opacity: 0;
    }
  }

  .flower-item {
    animation: fall linear forwards;
  }
</style>