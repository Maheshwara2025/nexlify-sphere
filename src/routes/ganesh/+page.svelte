<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let senderName = '';
  let fromParam = '';
  let flowers = [];
  let isHarathiActive = false;
  let isBellRinging = false;
  let isCoconutBroken = false;
  let showCopied = false;
  let mantraPlaying = false;
  let currentBlessing = '';

  let bellAudio;
  let mantraAudio;
  let breakAudio;

  const divineBlessings = [
    { te: 'ఆయురారోగ్య ఐశ్వర్య సిద్ధిరస్తు! సర్వకార్య విఘ్న నివారణమస్తు!', en: 'May Lord Ganesha remove all obstacles and bless you with infinite joy & prosperity!' },
    { te: 'శ్రీ సిద్ధి బుద్ధి సమేత గణపతి కటాక్షంతో మీ ఇంట సకల శుభములు వర్ధిల్లుగాక!', en: 'Wishing you abundant wisdom, wealth, good health and eternal peace.' },
    { te: 'విజయ సిద్ధిరస్తు! శ్రీ గణనాథుని ఆశీస్సులతో చేపట్టిన పనులన్నీ సఫలమగుగాక!', en: 'May the divine presence of Vigneshwara guide every step of your journey.' },
    { te: 'విద్య, వ్యాపార, ఉద్యోగ రంగములలో అనంతమైన విజయ కీర్తి ప్రతిష్టలు లభించుగాక!', en: 'May your life be filled with success, good fortune and divine happiness.' }
  ];

  $: targetName = senderName.trim() || 'శ్రీనివాస్';
  $: shareUrl = `https://nexlifynucleus.in/ganesh?from=${encodeURIComponent(targetName)}`;
  
  // పవర్ ఫుల్ మల్టీ-లాంగ్వేజ్ వాట్సాప్ మెసేజ్ (సంస్కృతం, తెలుగు & ఇంగ్లీష్)
  $: whatsappLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `🔱 *॥ ॐ गं गणपतये नमः ॥* 🔱\n` +
    `*वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।*\n` +
    `*निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥*\n\n` +
    `✨ *శ్రీ వినాయక చవితి మహోత్సవ దివ్య శుభాకాంక్షలు!* ✨\n` +
    `🌺 *HAPPY GANESH CHATURTHI 2026* 🌺\n\n` +
    `మీకు మరియు మీ కుటుంబ సభ్యులకు *${targetName}* పంపిన ప్రత్యేక దివ్య దర్శనం, వేద మంత్రం, హారతి & కొబ్బరి పువ్వు ఆశీస్సులను క్రింది లింక్ ద్వారా దర్శించుకోండి:\n\n` +
    `👇 *LIVE DARSHAN LINK:* 👇\n` +
    `${shareUrl}\n\n` +
    `🚩 _A.S.V. Enterprises & NS News Network, ముత్తారం_`
  )}`;

  const patralu = [
    { t: 'మాచీపత్రం', s: 'Om Sumukhaya Namah' },
    { t: 'బృహతీపత్రం (వాకుడు)', s: 'Om Ganadhipaya Namah' },
    { t: 'బిల్వపత్రం (మారేడు)', s: 'Om Umaputraya Namah' },
    { t: 'దూర్వాయుగ్మం (గరిక)', s: 'Om Gajanana Namah' },
    { t: 'దత్తూరపత్రం (ఉమ్మెత్త)', s: 'Om Harasūnave Namah' },
    { t: 'బదరీపత్రం (రేగు)', s: 'Om Lambodaraya Namah' },
    { t: 'అపామార్గపత్రం (ఉత్తరేణి)', s: 'Om Guhagrajaya Namah' },
    { t: 'తులసీపత్రం', s: 'Om Ekadantaya Namah' },
    { t: 'చూతపత్రం (మామిడి)', s: 'Om Vighnarajaya Namah' },
    { t: 'కరవీరపత్రం (గన్నేరు)', s: 'Om Vikataya Namah' },
    { t: 'మరువకపత్రం', s: 'Om Kapilaya Namah' },
    { t: 'సింధువారపత్రం (వావిలి)', s: 'Om Gajakarnakaya Namah' },
    { t: 'జాజీపత్రం', s: 'Om Dhumraketave Namah' },
    { t: 'గండకీపత్రం', s: 'Om Ganadhyakshaya Namah' },
    { t: 'శమీపత్రం (జమ్మి)', s: 'Om Bhalachandraya Namah' },
    { t: 'అశ్వత్థపత్రం (రావి)', s: 'Om Vakratundaya Namah' },
    { t: 'అర్జునపత్రం (మద్ది)', s: 'Om Shurpakarnaya Namah' },
    { t: 'అర్కపత్రం (జిల్లేడు)', s: 'Om Herambaya Namah' },
    { t: 'విష్ణుక్రాంతపత్రం', s: 'Om Skandapurvajaya Namah' },
    { t: 'దాడిమీపత్రం (దానిమ్మ)', s: 'Om Siddhivinayakaya Namah' },
    { t: 'దేవదారుపత్రం', s: 'Om Sarvasiddhipradayaka Namah' }
  ];

  onMount(() => {
    fromParam = $page.url.searchParams.get('from') || '';
    if (fromParam) {
      triggerFlowerShower();
    }
  });

  function triggerFlowerShower() {
    const icons = ['🌺', '🌸', '🌼', '💐', '🍃', '✨', '🏵️', '🌷'];
    const items = [];
    for (let i = 0; i < 50; i++) {
      items.push({
        id: Math.random(),
        icon: icons[Math.floor(Math.random() * icons.length)],
        left: Math.random() * 95,
        duration: 2.5 + Math.random() * 2.5,
        size: 24 + Math.random() * 24
      });
    }
    flowers = items;
    setTimeout(() => { flowers = []; }, 5500);
  }

  // 🔔 ఆలయ కంచు గంట
  function ringTempleBell() {
    isBellRinging = true;
    if (navigator.vibrate) navigator.vibrate([180, 80, 200]);
    if (bellAudio) {
      bellAudio.currentTime = 0;
      bellAudio.play().catch(() => {});
    }
    setTimeout(() => { isBellRinging = false; }, 2200);
  }

  // 🥥 కొబ్బరికాయ కొట్టడం + ఆశీస్సులు
  function handleBreakCoconut() {
    isCoconutBroken = true;
    currentBlessing = divineBlessings[Math.floor(Math.random() * divineBlessings.length)];
    if (navigator.vibrate) navigator.vibrate([200, 100, 300]);

    if (breakAudio) {
      breakAudio.currentTime = 0;
      breakAudio.play().catch(() => {});
    }
    triggerFlowerShower();
    ringTempleBell();
  }

  // 🪔 హారతి పళ్లెం + నిజమైన వేద శ్లోకం ఆడియో
  function startAartiWithShlokam() {
    isHarathiActive = true;
    mantraPlaying = true;
    ringTempleBell();
    triggerFlowerShower();

    if (mantraAudio) {
      mantraAudio.currentTime = 0;
      mantraAudio.play().catch(() => {});
    }

    setTimeout(() => {
      isHarathiActive = false;
    }, 9000);
  }

  function stopMantra() {
    if (mantraAudio) mantraAudio.pause();
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
  <title>{fromParam ? `${decodeURIComponent(fromParam)}'s Ganesh Chaturthi Blessings` : 'శ్రీ వినాయక చవితి మహోత్సవం 2026 | Grand Divine Darshan'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Ramabhadra&family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Tiro+Devanagari+Sanskrit&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<!-- ఆడియో ట్రాక్స్ -->
<audio bind:this={bellAudio} src="https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3" preload="auto"></audio>
<audio bind:this={breakAudio} src="https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3" preload="auto"></audio>
<!-- నిజమైన స్టూడియో వేద శ్లోకం ఆడియో (శంఖ నాదం + సంస్కృత గణేశ మంత్రం) -->
<audio bind:this={mantraAudio} src="https://ia801503.us.archive.org/15/items/GaneshMantraChanting108Times/01%20Vakratunda%20Mahakaya.mp3" preload="auto"></audio>

<!-- పూల వర్షం -->
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

<div class="min-h-screen bg-[#0a0203] text-rose-50 flex flex-col font-['Noto_Sans_Telugu',sans-serif] selection:bg-rose-600 selection:text-white">
  
  <!-- హెడర్ -->
  <header class="bg-black/90 backdrop-blur border-b border-rose-900/60 sticky top-0 z-40 px-4 py-3 shadow-2xl">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5">
        <div class="w-10 h-10 bg-gradient-to-tr from-amber-500 via-rose-600 to-red-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg border border-amber-300/40">
          卐
        </div>
        <div>
          <span class="font-['Ramabhadra'] text-lg text-amber-400 block leading-tight">NS భక్తి డెస్క్</span>
          <span class="text-[9px] font-['Cinzel'] text-rose-300 font-bold tracking-widest block uppercase">A.S.V. Enterprises</span>
        </div>
      </a>
      <a href="/" class="text-xs bg-rose-950 hover:bg-rose-900 text-amber-300 border border-amber-500/40 px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shadow">
        <span>🏠 Home</span>
      </a>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-4 py-6 sm:py-8 flex-grow w-full space-y-8">

    <!-- ప్రత్యేక విషెస్ కార్డ్ -->
    {#if fromParam}
      <div class="bg-gradient-to-r from-red-950 via-rose-900 to-amber-950 p-6 rounded-3xl text-center shadow-2xl border-2 border-amber-400 animate-pulse">
        <span class="text-amber-300 text-xs font-black uppercase tracking-widest block mb-1">DIVINE FESTIVAL GREETING</span>
        <h2 class="text-2xl sm:text-3xl font-black text-white font-['Ramabhadra']">
          మీకు మరియు మీ కుటుంబ సభ్యులకు <br class="sm:hidden" />
          <span class="text-amber-300 underline underline-offset-4 decoration-amber-200">
            {decodeURIComponent(fromParam)}
          </span> గారి నుండి
        </h2>
        <p class="text-rose-100 text-xs sm:text-sm font-semibold mt-2">
          శ్రీ వినాయక చవితి శుభాకాంక్షలు! గణపతి ఆశీస్సులతో మీకు సకల కార్యసిద్ధి కలగాలని మనసారా కోరుకుంటున్నారు.
        </p>
      </div>
    {/if}

    <!-- 1. ఆలయ గర్భగుడి దివ్య దర్శనం -->
    <section class="bg-gradient-to-b from-[#1c0407] via-[#120205] to-[#080102] rounded-3xl p-6 sm:p-10 border-2 border-amber-500/60 shadow-[0_0_50px_rgba(225,29,72,0.2)] text-center relative overflow-hidden">
      
      <!-- శాంక్టమ్ బ్యాక్‌గ్రౌండ్ గ్లో -->
      <div class="absolute inset-0 bg-radial-gradient from-rose-600/15 via-transparent to-transparent pointer-events-none"></div>

      <div class="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-400/60 px-5 py-1.5 rounded-full text-xs sm:text-sm font-black text-amber-300 mb-3 shadow font-['Tiro_Devanagari_Sanskrit']">
        <span>॥ ॐ गं गणपतये नमः ॥</span>
      </div>

      <h1 class="text-2xl sm:text-4xl font-black text-white font-['Ramabhadra'] tracking-wide">
        శ్రీ సిద్ధి బుద్ధి సమేత గణపతి దివ్య దర్శనం
      </h1>
      <p class="text-xs sm:text-sm text-rose-200 mt-1 max-w-lg mx-auto">
        క్రింది పూజా ద్రవ్యాలను తాకండి — ఆలయ గంట మోగించండి, హారతి సమర్పించి కొబ్బరి కొట్టండి!
      </p>

      <!-- విగ్రహం & సాంప్రదాయక హారతి పళ్లెం ఏరియా -->
      <div class="relative w-72 h-72 sm:w-96 sm:h-96 mx-auto my-6 flex items-center justify-center">
        
        <!-- తిరిగే దివ్య ప్రభామండలం -->
        <div class="absolute inset-0 border-2 border-dashed border-amber-400/40 rounded-full animate-spin pointer-events-none" style="animation-duration: 45s;"></div>

        <!-- స్వర్ణ వినాయక రూపం -->
        <div class="relative z-10 w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 border-amber-400 p-3 shadow-2xl bg-gradient-to-br from-[#2b040a] via-[#150104] to-black flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 200 200" class="w-full h-full drop-shadow-[0_12px_30px_rgba(245,158,11,0.6)]">
            <defs>
              <linearGradient id="divineGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFF275" />
                <stop offset="30%" stop-color="#FFD700" />
                <stop offset="70%" stop-color="#FF8C00" />
                <stop offset="100%" stop-color="#E11D48" />
              </linearGradient>
              <linearGradient id="crownGold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF" />
                <stop offset="50%" stop-color="#FFD700" />
                <stop offset="100%" stop-color="#B45309" />
              </linearGradient>
            </defs>

            <circle cx="100" cy="95" r="85" fill="#38060e" opacity="0.8" />
            <circle cx="100" cy="95" r="80" fill="none" stroke="url(#divineGold)" stroke-width="2.5" stroke-dasharray="8,4" />

            <!-- కిరీటం -->
            <polygon points="100,14 74,54 126,54" fill="url(#crownGold)" stroke="#78350f" stroke-width="1.5" />
            <circle cx="100" cy="34" r="5" fill="#E11D48" />
            <polygon points="100,4 93,16 107,16" fill="#FFF275" />

            <!-- కర్ణాలు -->
            <path d="M 64,74 C 24,58 20,110 58,120 C 65,120 68,112 70,105 Z" fill="url(#divineGold)" opacity="0.95" stroke="#78350f" stroke-width="1" />
            <path d="M 136,74 C 176,58 180,110 142,120 C 135,120 132,112 130,105 Z" fill="url(#divineGold)" opacity="0.95" stroke="#78350f" stroke-width="1" />

            <!-- వక్రతుండం -->
            <path d="M 75,68 Q 100,55 125,68 Q 128,105 116,130 Q 105,152 126,156 Q 133,155 135,145 Q 122,138 123,122 Q 112,85 100,74" 
                  fill="none" stroke="url(#divineGold)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
            
            <!-- పవిత్ర తిలకం -->
            <line x1="88" y1="64" x2="112" y2="64" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <line x1="90" y1="69" x2="110" y2="69" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="100" cy="66" r="3" fill="#E11D48" />

            <!-- నేత్రం -->
            <ellipse cx="86" cy="76" rx="2.5" ry="3.5" fill="#ffffff" />
            <circle cx="86" cy="76" r="1.3" fill="#000000" />

            <!-- లడ్డు & దంతం -->
            <circle cx="135" cy="146" r="8" fill="#FBBF24" stroke="#D97706" stroke-width="1.5" />
            <polygon points="82,106 74,116 86,111" fill="#ffffff" />
          </svg>
        </div>

        <!-- 🪔 పూజారి చేత్తో తిప్పే సహజ హారతి తాంబూలం (Aarti Thali Natural Orbit) -->
        {#if isHarathiActive}
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div class="thali-natural-rotation">
              <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 border-4 border-amber-200 shadow-[0_0_50px_rgba(251,191,36,1)] flex items-center justify-center relative transform hover:scale-105">
                <!-- పంచ హారతి దీపాలు -->
                <span class="text-3xl sm:text-4xl filter drop-shadow-[0_0_12px_#ff0000] animate-bounce">🪔</span>
                <span class="absolute top-1 text-sm">✨</span>
                <span class="absolute bottom-1 text-sm">✨</span>
                <span class="absolute left-1 text-sm">✨</span>
                <span class="absolute right-1 text-sm">✨</span>
              </div>
            </div>
          </div>
        {/if}

      </div>

      <!-- శ్లోక పఠనం లైవ్ డిస్ప్లే -->
      {#if mantraPlaying}
        <div class="mb-5 bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-2 border-amber-400 p-4 rounded-2xl max-w-xl mx-auto shadow-2xl animate-pulse">
          <span class="text-amber-300 font-bold text-sm sm:text-base block leading-relaxed font-['Tiro_Devanagari_Sanskrit']">
            वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥
          </span>
          <span class="text-rose-100 text-xs mt-1 block">
            శుక్లాంబరధరం విష్ణుం శశివర్ణం చతుర్భుజం | ప్రసన్నవదనం ధ్యాయేత్ సర్వవిఘ్నోపశాంతయే ||
          </span>
          <button type="button" on:click={stopMantra} class="text-xs text-amber-400 underline font-bold mt-2">
            Mute Chant (ఆపండి)
          </button>
        </div>
      {/if}

      <!-- పూజా ద్రవ్యాల బటన్లు -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
        
        <!-- ఆలయ గంట -->
        <button
          type="button"
          on:click={ringTempleBell}
          class="bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 text-slate-950 font-black text-xs sm:text-sm py-4 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-95 transition border-2 border-amber-300"
        >
          <span class="text-3xl {isBellRinging ? 'animate-bounce' : ''}">🔔</span>
          <span>ఆలయ గంట</span>
          <span class="text-[9px] font-mono uppercase text-slate-900 font-bold">Ring Bell</span>
        </button>

        <!-- హారతి పళ్లెం & మంత్రం -->
        <button
          type="button"
          on:click={startAartiWithShlokam}
          class="bg-gradient-to-b from-rose-600 via-red-700 to-rose-800 hover:from-rose-500 text-white font-black text-xs sm:text-sm py-4 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-95 transition border-2 border-amber-300 {isHarathiActive ? 'ring-4 ring-yellow-400' : ''}"
        >
          <span class="text-3xl animate-pulse">🪔</span>
          <span>హారతి & శ్లోకం</span>
          <span class="text-[9px] font-mono uppercase text-amber-200 font-bold">Maha Aarti</span>
        </button>

        <!-- కొబ్బరికాయ కొట్టడం -->
        <button
          type="button"
          on:click={handleBreakCoconut}
          class="bg-gradient-to-b from-amber-900 via-stone-800 to-amber-950 hover:from-amber-800 text-amber-200 font-black text-xs sm:text-sm py-4 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-95 transition border-2 border-amber-700/60"
        >
          <span class="text-3xl">🥥</span>
          <span>కొబ్బరికాయ కొట్టండి</span>
          <span class="text-[9px] font-mono uppercase text-amber-300 font-bold">Break Coconut</span>
        </button>

        <!-- పూల వర్షం -->
        <button
          type="button"
          on:click={triggerFlowerShower}
          class="bg-gradient-to-b from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-500 text-white font-black text-xs sm:text-sm py-4 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-95 transition border-2 border-emerald-400"
        >
          <span class="text-3xl">🌺</span>
          <span>పూల వర్షం</span>
          <span class="text-[9px] font-mono uppercase text-emerald-200 font-bold">Flower Shower</span>
        </button>

      </div>

    </section>

    <!-- 2. రియలిస్టిక్ కొబ్బరికాయ పగిలి కొబ్బరి పువ్వు దర్శనం -->
    {#if isCoconutBroken}
      <section class="bg-gradient-to-r from-rose-950 via-[#26050b] to-amber-950 rounded-3xl p-6 sm:p-8 border-2 border-amber-400 shadow-2xl text-center space-y-4 animate-fade-in">
        <span class="bg-amber-400 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider font-['Cinzel']">
          DIVINE PRASADAM & BLESSINGS
        </span>
        
        <!-- రెండుగా చీలి పక్కకు జరిగిన టెంకాయ + మధ్యలో కొబ్బరి పువ్వు -->
        <div class="flex items-center justify-center gap-4 py-2 select-none">
          <div class="text-4xl sm:text-5xl transform -rotate-12 animate-pulse">🥥</div>
          <div class="flex flex-col items-center p-3 rounded-full bg-amber-500/20 border-2 border-amber-400/80 shadow-[0_0_30px_rgba(251,191,36,0.6)]">
            <span class="text-5xl sm:text-6xl animate-bounce">🌸</span>
            <span class="text-[11px] font-black text-amber-300 tracking-widest mt-1">కొబ్బరి పువ్వు!</span>
          </div>
          <div class="text-4xl sm:text-5xl transform rotate-12 animate-pulse">🥥</div>
        </div>

        <div class="bg-black/60 border border-amber-400/40 p-5 rounded-2xl max-w-xl mx-auto space-y-2">
          <span class="text-amber-400 font-bold text-xs uppercase tracking-wider block">గణపతి దివ్య ఆశీర్వచనం:</span>
          <p class="text-white font-extrabold text-sm sm:text-base leading-relaxed">
            "{currentBlessing.te}"
          </p>
          <p class="text-rose-200 text-xs italic font-serif">
            "{currentBlessing.en}"
          </p>
        </div>
      </section>
    {/if}

    <!-- 3. అల్ట్రా ప్రీమియం వైరల్ వాట్సాప్ గ్రీటింగ్ కార్డ్ మేకర్ -->
    <section class="bg-gradient-to-r from-red-950 via-[#1f0308] to-rose-950 rounded-3xl p-6 sm:p-8 border-2 border-amber-500/60 shadow-2xl space-y-4">
      <div class="text-center space-y-1">
        <span class="bg-rose-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider font-['Cinzel']">
          VIRAL SHARE DESK
        </span>
        <h3 class="text-xl sm:text-2xl font-black text-amber-300 font-['Ramabhadra']">
          మీ పేరుతో ప్రత్యేక శుభాకాంక్షల దర్శనం పంపండి
        </h3>
        <p class="text-xs text-rose-200">
          మీ పేరు నమోదు చేసి క్రింది ఆకుపచ్చ బటన్ నొక్కగానే పవర్-ప్యాక్డ్ వాట్సాప్ మెసేజ్ వెళ్తుంది!
        </p>
      </div>

      <div class="max-w-md mx-auto space-y-3 pt-2">
        <div>
          <label for="uname" class="block text-xs font-bold text-amber-300 mb-1.5">మీ పేరు లేదా కుటుంబ పేరు (Enter Your Name):</label>
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
          class="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-base py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 active:scale-95 transition tracking-wide"
        >
          <i class="fa-brands fa-whatsapp text-2xl"></i>
          <span>Share on WhatsApp (వాట్సాప్‌లో పంపండి)</span>
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
            {showCopied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </section>

    <!-- 4. ఏకవింశతి పత్ర పూజ (మల్టీ కలర్ బ్యాడ్జ్ లేఅవుట్) -->
    <section class="bg-[#140205] rounded-3xl p-6 sm:p-7 border border-rose-900/60 shadow-md space-y-3">
      <div class="border-b border-rose-900/50 pb-2 flex items-center justify-between">
        <div>
          <h3 class="text-base sm:text-lg font-black text-amber-300 font-['Ramabhadra']">
            🌿 ఏకవింశతి పత్ర పూజ (21 Sacred Leaves)
          </h3>
          <p class="text-[11px] text-rose-300">పూజ సమయంలో చదువుకోవడానికి పవిత్ర పత్రాలు & మంత్రాలు:</p>
        </div>
        <span class="text-xl">🕉️</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
        {#each patralu as p, idx}
          <div class="bg-black/50 border border-rose-900/40 p-2.5 rounded-xl flex items-center justify-between gap-2 hover:border-amber-400 transition">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-5 h-5 rounded-full bg-rose-900 text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span class="truncate font-semibold text-rose-100">{p.t}</span>
            </div>
            <span class="text-[9px] font-mono text-amber-400/80 truncate">{p.s}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- 5. మండపాల ప్రత్యేక సేవలు -->
    <section class="bg-gradient-to-br from-black via-[#1f0308] to-black rounded-3xl p-6 sm:p-8 border-2 border-rose-600 shadow-2xl text-center space-y-3">
      <span class="bg-amber-400 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider font-['Cinzel']">
        FESTIVAL SERVICES DESK
      </span>
      <h3 class="text-xl sm:text-2xl font-black text-white font-['Ramabhadra']">
        A.S.V. ENTERPRISES — ముత్తారం బస్ స్టాండ్
      </h3>
      <p class="text-xs sm:text-sm text-rose-200 leading-relaxed max-w-xl mx-auto font-medium">
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

  <footer class="bg-black text-rose-300/60 py-6 border-t border-rose-950 text-xs text-center font-['Cinzel']">
    <p>© 2026 A.S.V. ENTERPRISES & NS NEWS. SARVEJANA SUKHINO BHAVANTU.</p>
  </footer>

</div>

<style>
  /* పూల వర్షం */
  @keyframes fall {
    0% { transform: translateY(-40px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
  }
  .flower-item {
    animation: fall linear forwards;
  }

  /* సహజమైన హారతి తాంబూల ప్రదక్షిణ (Natural Aarti Thali Orbit around Deity) */
  @keyframes thaliCircle {
    0% {
      transform: rotate(0deg) translate(85px) rotate(0deg);
    }
    100% {
      transform: rotate(360deg) translate(85px) rotate(-360deg);
    }
  }

  .thali-natural-rotation {
    animation: thaliCircle 3.5s linear infinite;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
</style>