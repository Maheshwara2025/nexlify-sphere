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
  let currentBlessingIndex = 0;

  // 4 భాషల్లో దివ్య ఆశీర్వచనాలు (VIP Blessings)
  const divineBlessings = [
    {
      sa: "॥ सर्वविघ्नहरो देवः सर्वसिद्धिप्रदायकः ॥",
      te: "శ్రీ సిద్ధి బుద్ధి సమేత గణపతి కటాక్షంతో మీ ఇంట ఆయురారోగ్య ఐశ్వర్యములు వర్ధిల్లుగాక!",
      hi: "भगवान श्री गणेश आपके जीवन के सभी विघ्नों को हरकर सुख-समृद्धि प्रदान करें।",
      en: "May Lord Vigneshwara eliminate all hurdles and bestow infinite success, health and peace!"
    },
    {
      sa: "॥ ॐ गं गणपतये नमः ॥",
      te: "శ్రీ వినాయకుని దివ్య ఆశీస్సులతో మీరు చేపట్టిన ప్రతి కార్యం నిర్విఘ్నంగా విజయవంతమగుగాక!",
      hi: "गणपति बप्पा की असीम कृपा से आपके हर कार्य में सफलता और कीर्ति प्राप्त हो।",
      en: "May the divine grace of Lord Ganesha illuminate your path with wisdom and prosperity."
    },
    {
      sa: "॥ एकदन्ताय विद्महे वक्रतुण्डाय धीमहि ॥",
      te: "కొబ్బరి పువ్వు సాక్షిగా గణనాథుని దివ్య అనుగ్రహం మీ కుటుంబంపై ఎల్లవేళలా ఉండుగాక!",
      hi: "श्री गणेश जी का पावन आशीर्वाद आपके परिवार पर सदैव बना रहे।",
      en: "Blessed with the auspicious Coconut Flower! Wishing your family endless bliss & harmony."
    }
  ];

  $: targetName = senderName.trim() || 'శ్రీనివాస్';
  $: shareUrl = `https://nexlifynucleus.in/ganesh?from=${encodeURIComponent(targetName)}`;
  
  // పవర్ ఫుల్ మల్టీ-లాంగ్వేజ్ VIP వాట్సాప్ మెసేజ్ (సంస్కృతం + తెలుగు + హిందీ + ఇంగ్లీష్)
  $: whatsappLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `🔱 *॥ ॐ श्री गणेशाय नमः ॥* 🔱\n` +
    `*वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।*\n` +
    `*निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥*\n\n` +
    `✨ *శ్రీ వినాయక చవితి మహోత్సవ శుభాకాంక్షలు!* ✨\n` +
    `🌺 *गणेश चतुर्थी की हार्दिक शुभकामनाएं!* 🌺\n` +
    `🌟 *HAPPY GANESH CHATURTHI 2026* 🌟\n\n` +
    `మీకు మరియు మీ కుటుంబ సభ్యులకు *${targetName}* పంపిన ప్రత్యేక దివ్య దర్శనం, పంచ హారతి, కొబ్బరి పువ్వు ఆశీస్సులను క్రింది లింక్ ద్వారా వెంటనే దర్శించుకోండి:\n\n` +
    `👇 *DIVINE LIVE DARSHAN LINK:* 👇\n` +
    `${shareUrl}\n\n` +
    `🚩 _A.S.V. Enterprises & NS News Network, ముత్తారం_`
  )}`;

  const patralu = [
    { t: 'మాచీపత్రం', s: 'Om Sumukhaya Namah', color: 'from-amber-500/20 to-rose-500/20' },
    { t: 'బృహతీపత్రం (వాకుడు)', s: 'Om Ganadhipaya Namah', color: 'from-purple-500/20 to-blue-500/20' },
    { t: 'బిల్వపత్రం (మారేడు)', s: 'Om Umaputraya Namah', color: 'from-emerald-500/20 to-teal-500/20' },
    { t: 'దూర్వాయుగ్మం (గరిక)', s: 'Om Gajanana Namah', color: 'from-lime-500/20 to-green-500/20' },
    { t: 'దత్తూరపత్రం (ఉమ్మెత్త)', s: 'Om Harasūnave Namah', color: 'from-amber-500/20 to-orange-500/20' },
    { t: 'బదరీపత్రం (రేగు)', s: 'Om Lambodaraya Namah', color: 'from-rose-500/20 to-red-500/20' },
    { t: 'అపామార్గపత్రం (ఉత్తరేణి)', s: 'Om Guhagrajaya Namah', color: 'from-indigo-500/20 to-violet-500/20' },
    { t: 'తులసీపత్రం', s: 'Om Ekadantaya Namah', color: 'from-emerald-500/20 to-cyan-500/20' },
    { t: 'చూతపత్రం (మామిడి)', s: 'Om Vighnarajaya Namah', color: 'from-yellow-500/20 to-amber-500/20' },
    { t: 'కరవీరపత్రం (గన్నేరు)', s: 'Om Vikataya Namah', color: 'from-pink-500/20 to-rose-500/20' },
    { t: 'మరువకపత్రం', s: 'Om Kapilaya Namah', color: 'from-teal-500/20 to-emerald-500/20' },
    { t: 'సింధువారపత్రం (వావిలి)', s: 'Om Gajakarnakaya Namah', color: 'from-sky-500/20 to-blue-500/20' },
    { t: 'జాజీపత్రం', s: 'Om Dhumraketave Namah', color: 'from-violet-500/20 to-fuchsia-500/20' },
    { t: 'గండకీపత్రం', s: 'Om Ganadhyakshaya Namah', color: 'from-amber-500/20 to-yellow-500/20' },
    { t: 'శమీపత్రం (జమ్మి)', s: 'Om Bhalachandraya Namah', color: 'from-emerald-500/20 to-green-500/20' },
    { t: 'అశ్వత్థపత్రం (రావి)', s: 'Om Vakratundaya Namah', color: 'from-lime-500/20 to-teal-500/20' },
    { t: 'అర్జునపత్రం (మద్ది)', s: 'Om Shurpakarnaya Namah', color: 'from-orange-500/20 to-red-500/20' },
    { t: 'అర్కపత్రం (జిల్లేడు)', s: 'Om Herambaya Namah', color: 'from-purple-500/20 to-pink-500/20' },
    { t: 'విష్ణుక్రాంతపత్రం', s: 'Om Skandapurvajaya Namah', color: 'from-blue-500/20 to-indigo-500/20' },
    { t: 'దాడిమీపత్రం (దానిమ్మ)', s: 'Om Siddhivinayakaya Namah', color: 'from-red-500/20 to-rose-500/20' },
    { t: 'దేవదారుపత్రం', s: 'Om Sarvasiddhipradayaka Namah', color: 'from-amber-500/20 to-lime-500/20' }
  ];

  onMount(() => {
    fromParam = $page.url.searchParams.get('from') || '';
    if (fromParam) {
      triggerFlowerShower();
    }
  });

  // పూల వర్షం (రంగురంగుల దివ్య పుష్పాలు)
  function triggerFlowerShower() {
    const icons = ['🌺', '🌸', '🌼', '💐', '🏵️', '🌷', '✨', '🍃'];
    const items = [];
    for (let i = 0; i < 55; i++) {
      items.push({
        id: Math.random(),
        icon: icons[Math.floor(Math.random() * icons.length)],
        left: Math.random() * 95,
        duration: 2.2 + Math.random() * 2.8,
        size: 24 + Math.random() * 26
      });
    }
    flowers = items;
    setTimeout(() => { flowers = []; }, 5500);
  }

  // 🔔 100% గ్యారెంటీడ్ డీప్ టెంపుల్ బ్రాస్ బెల్ (జీరో నెట్‌వర్క్ ఫెయిల్యూర్ సింథసైజర్)
  function ringTempleBell() {
    isBellRinging = true;
    if (navigator.vibrate) navigator.vibrate([180, 80, 180]);

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      
      // భారీ కంచు ఆలయ గంట శబ్దం (Acoustic harmonics)
      const partials = [
        { f: 432, g: 0.6, d: 3.5 },
        { f: 864, g: 0.4, d: 2.8 },
        { f: 1296, g: 0.25, d: 2.2 },
        { f: 1728, g: 0.15, d: 1.6 },
        { f: 2160, g: 0.08, d: 1.0 }
      ];

      partials.forEach(p => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.f, ctx.currentTime);
        gain.gain.setValueAtTime(p.g, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + p.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + p.d);
      });
    } catch (e) {}

    setTimeout(() => { isBellRinging = false; }, 2200);
  }

  // 🥥 కొబ్బరికాయ కొట్టడం -> రెండు చెక్కలుగా విడిపోవడం + పవిత్ర కొబ్బరి పువ్వు దర్శనం
  function handleBreakCoconut() {
    isCoconutBroken = true;
    currentBlessingIndex = (currentBlessingIndex + 1) % divineBlessings.length;
    if (navigator.vibrate) navigator.vibrate([200, 100, 300]);

    // టెంకాయ పగిలే స్పష్టమైన శబ్దం (Synthesized Impact Crack)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.9, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}

    triggerFlowerShower();
    ringTempleBell();
  }

  // 🪔 పంచ హారతి తాంబూల ప్రదక్షిణ + సినిమాటిక్ మంత్ర బ్యానర్
  function startAarti() {
    isHarathiActive = true;
    ringTempleBell();
    triggerFlowerShower();

    setTimeout(() => {
      isHarathiActive = false;
    }, 10000);
  }

  function copyShareLink() {
    navigator.clipboard.writeText(shareUrl);
    showCopied = true;
    setTimeout(() => showCopied = false, 2500);
  }
</script>

<svelte:head>
  <title>{fromParam ? `${decodeURIComponent(fromParam)} గారి వినాయక చవితి దివ్య దర్శనం` : 'శ్రీ వినాయక చవితి మహోత్సవం 2026 | Grand Divine Darshan'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Ramabhadra&family=Noto+Sans+Telugu:wght@400;600;700;800;900&family=Rozha+One&family=Tiro+Devanagari+Sanskrit&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<!-- పూల వర్షం ఓవర్‌లే -->
{#if flowers.length > 0}
  <div class="fixed inset-0 pointer-events-none z-50 overflow-hidden">
    {#each flowers as fl (fl.id)}
      <div
        class="absolute flower-item select-none"
        style="left: {fl.left}%; font-size: {fl.size}px; animation-duration: {fl.duration}s;"
      >
        {fl.icon}
      </div>
    {/each}
  </div>
{/if}

<div class="min-h-screen bg-gradient-to-b from-[#120208] via-[#090104] to-[#040002] text-rose-50 flex flex-col font-['Noto_Sans_Telugu',sans-serif] selection:bg-rose-600 selection:text-white">
  
  <!-- హెడర్ (రాయల్ టెంపుల్ బ్యాడ్జ్) -->
  <header class="bg-black/90 backdrop-blur border-b border-rose-800/50 sticky top-0 z-40 px-4 py-3 shadow-2xl">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <a href="/" class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-tr from-amber-400 via-rose-600 to-purple-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg border border-amber-300/40">
          卐
        </div>
        <div>
          <span class="font-['Ramabhadra'] text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-amber-200 block leading-tight">
            NS భక్తి వేదిక
          </span>
          <span class="text-[9px] font-['Cinzel'] text-rose-300 font-bold tracking-widest block uppercase">
            A.S.V. Enterprises • ముత్తారం
          </span>
        </div>
      </a>
      <a href="/" class="text-xs bg-gradient-to-r from-purple-900 to-rose-950 hover:from-purple-800 hover:to-rose-900 text-amber-300 border border-amber-400/40 px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shadow-lg">
        <span>🏠 హోమ్ పేజీ</span>
      </a>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-4 py-6 sm:py-8 flex-grow w-full space-y-8">

    <!-- ప్రత్యేక విషెస్ కార్డ్ (వేరే వారు పంపిన లింక్ ద్వారా వస్తే) -->
    {#if fromParam}
      <div class="bg-gradient-to-r from-rose-950 via-purple-950 to-amber-950 p-6 rounded-3xl text-center shadow-[0_0_35px_rgba(244,63,94,0.3)] border-2 border-amber-400 animate-pulse">
        <span class="text-amber-300 text-xs font-black uppercase tracking-widest block mb-1 font-['Cinzel']">
          DIVINE FESTIVAL GREETING
        </span>
        <h2 class="text-2xl sm:text-3xl font-black text-white font-['Ramabhadra']">
          మీకు మరియు మీ కుటుంబ సభ్యులకు <br class="sm:hidden" />
          <span class="text-amber-300 underline underline-offset-4 decoration-rose-500">
            {decodeURIComponent(fromParam)}
          </span> గారి నుండి
        </h2>
        <p class="text-rose-100 text-xs sm:text-sm font-semibold mt-2">
          శ్రీ వినాయక చవితి శుభాకాంక్షలు! గణపతి ఆశీస్సులతో మీకు సకల కార్యసిద్ధి కలగాలని మనసారా కోరుకుంటున్నారు.
        </p>
      </div>
    {/if}

    <!-- 1. ఆలయ గర్భగుడి దివ్య దర్శనం (సినిమాటిక్ లుక్) -->
    <section class="bg-gradient-to-b from-[#24040c] via-[#120106] to-[#080003] rounded-3xl p-6 sm:p-10 border-2 border-rose-600/60 shadow-[0_0_60px_rgba(225,29,72,0.25)] text-center relative overflow-hidden">
      
      <!-- శాంక్టమ్ బ్యాక్‌గ్రౌండ్ గ్లో -->
      <div class="absolute inset-0 bg-radial-gradient from-rose-600/20 via-transparent to-transparent pointer-events-none"></div>

      <!-- సంస్కృత దేవనాగరి హెడర్ -->
      <div class="inline-flex items-center gap-2 bg-gradient-to-r from-rose-950 via-purple-900 to-rose-950 border border-amber-400/80 px-5 py-1.5 rounded-full text-xs sm:text-sm font-black text-amber-300 mb-3 shadow-lg font-['Tiro_Devanagari_Sanskrit']">
        <span>॥ ॐ गं गणपतये नमः ॥</span>
      </div>

      <h1 class="text-2xl sm:text-4xl font-black text-white font-['Ramabhadra'] tracking-wide">
        శ్రీ సిద్ధి బుద్ధి సమేత గణపతి దివ్య దర్శనం
      </h1>
      <p class="text-xs sm:text-sm text-rose-200/90 mt-1 max-w-lg mx-auto">
        ఆలయ కంచు గంట మోగించండి • పంచ హారతి సమర్పించండి • కొబ్బరి కొట్టి ప్రసాదం పొందండి!
      </p>

      <!-- విగ్రహం & సాంప్రదాయక హారతి తాంబూలం ఏరియా -->
      <div class="relative w-72 h-72 sm:w-96 sm:h-96 mx-auto my-6 flex items-center justify-center">
        
        <!-- తిరిగే దివ్య ప్రభామండలం -->
        <div class="absolute inset-0 border-2 border-dashed border-amber-400/40 rounded-full animate-spin pointer-events-none" style="animation-duration: 45s;"></div>

        <!-- స్వర్ణ వినాయక రూపం (హై-వోల్టేజ్ డిటైలింగ్) -->
        <div class="relative z-10 w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 border-amber-400 p-3 shadow-2xl bg-gradient-to-br from-[#380613] via-[#1a0208] to-black flex items-center justify-center overflow-hidden">
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

            <circle cx="100" cy="95" r="85" fill="#4c0519" opacity="0.8" />
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

            <!-- మోదకం & దంతం -->
            <circle cx="135" cy="146" r="8" fill="#FBBF24" stroke="#D97706" stroke-width="1.5" />
            <polygon points="82,106 74,116 86,111" fill="#ffffff" />
          </svg>
        </div>

        <!-- 🪔 స్వామివారి పాదాల వద్ద సహజంగా తిరిగే పంచ హారతి తాంబూలం (Realistic Natural Aarti) -->
        {#if isHarathiActive}
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div class="natural-aarti-motion">
              <div class="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 border-4 border-yellow-200 shadow-[0_0_50px_rgba(251,191,36,1)] flex items-center justify-center relative">
                <!-- పంచ హారతి జ్యోతులు (5 Flaming Diyas) -->
                <span class="text-3xl sm:text-4xl drop-shadow-[0_0_12px_#ff0000] animate-pulse">🪔</span>
                <span class="absolute top-1 text-xs text-rose-900 font-bold">✨</span>
                <span class="absolute bottom-1 text-xs text-rose-900 font-bold">✨</span>
                <span class="absolute left-1 text-xs text-rose-900 font-bold">✨</span>
                <span class="absolute right-1 text-xs text-rose-900 font-bold">✨</span>
              </div>
            </div>
          </div>
        {/if}

      </div>

      <!-- 🌟 సినిమాటిక్ మంత్ర బ్యానర్ (హారతి నొక్కినప్పుడు విజువల్ గూస్‌బంప్స్ శ్లోకం) -->
      {#if isHarathiActive}
        <div class="mb-5 bg-gradient-to-r from-rose-950 via-purple-950 to-amber-950 border-2 border-amber-400 p-5 rounded-3xl max-w-xl mx-auto shadow-[0_0_40px_rgba(251,191,36,0.4)] animate-bounce-short space-y-2">
          <div class="text-amber-300 font-black text-sm sm:text-lg tracking-wide font-['Tiro_Devanagari_Sanskrit'] leading-relaxed">
            वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। <br />
            निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥
          </div>
          <div class="text-rose-200 font-extrabold text-xs sm:text-sm font-['Ramabhadra']">
            శుక్లాంబరధరం విష్ణుం శశివర్ణం చతుర్భుజం | ప్రసన్నవదనం ధ్యాయేత్ సర్వవిఘ్నోపశాంతయే ||
          </div>
          <p class="text-[11px] text-amber-200/80 italic font-serif">
            "O Lord of curved trunk & immense body, shining with the brilliance of a crore suns, remove all obstacles from our path forever."
          </p>
        </div>
      {/if}

      <!-- పూజా ద్రవ్యాల బటన్లు (Vibrant Multi-Color Royale Theme) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
        
        <!-- ఆలయ గంట (Amber-Gold) -->
        <button
          type="button"
          on:click={ringTempleBell}
          class="bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 text-slate-950 font-black text-xs sm:text-sm py-4 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-95 transition border-2 border-amber-300"
        >
          <span class="text-3xl {isBellRinging ? 'animate-bounce' : ''}">🔔</span>
          <span>ఆలయ కంచు గంట</span>
          <span class="text-[9px] font-['Cinzel'] text-slate-900 font-extrabold">BRASS BELL</span>
        </button>

        <!-- పంచ హారతి (Crimson-Rose) -->
        <button
          type="button"
          on:click={startAarti}
          class="bg-gradient-to-b from-rose-600 via-red-700 to-rose-900 hover:from-rose-500 text-white font-black text-xs sm:text-sm py-4 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-95 transition border-2 border-amber-300 {isHarathiActive ? 'ring-4 ring-yellow-400' : ''}"
        >
          <span class="text-3xl animate-pulse">🪔</span>
          <span>పంచ హారతి</span>
          <span class="text-[9px] font-['Cinzel'] text-amber-200 font-extrabold">MAHA AARTI</span>
        </button>

        <!-- కొబ్బరికాయ కొట్టడం (Royal Bronze-Copper) -->
        <button
          type="button"
          on:click={handleBreakCoconut}
          class="bg-gradient-to-b from-amber-800 via-orange-900 to-stone-900 hover:from-amber-700 text-amber-200 font-black text-xs sm:text-sm py-4 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-95 transition border-2 border-amber-500/80"
        >
          <span class="text-3xl">🥥</span>
          <span>కొబ్బరి సమర్పణ</span>
          <span class="text-[9px] font-['Cinzel'] text-amber-300 font-extrabold">BREAK COCONUT</span>
        </button>

        <!-- పూల వర్షం (Emerald-Teal) -->
        <button
          type="button"
          on:click={triggerFlowerShower}
          class="bg-gradient-to-b from-emerald-600 via-teal-700 to-emerald-900 hover:from-emerald-500 text-white font-black text-xs sm:text-sm py-4 px-2 rounded-2xl shadow-xl flex flex-col items-center gap-1 active:scale-95 transition border-2 border-emerald-300"
        >
          <span class="text-3xl">🌺</span>
          <span>పూల వర్షం</span>
          <span class="text-[9px] font-['Cinzel'] text-emerald-200 font-extrabold">FLOWER SHOWER</span>
        </button>

      </div>

    </section>

    <!-- 2. రియలిస్టిక్ కొబ్బరికాయ విడిపోవడం & కొబ్బరి పువ్వు దర్శనం (Sacred Sprout) -->
    {#if isCoconutBroken}
      <section class="bg-gradient-to-r from-rose-950 via-purple-950 to-amber-950 rounded-3xl p-6 sm:p-8 border-2 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.35)] text-center space-y-4 animate-fade-in">
        <span class="bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest font-['Cinzel'] shadow">
          SACRED COCONUT FLOWER PRASADAM
        </span>
        
        <!-- కొబ్బరి కాయ 2 ముక్కలుగా పక్కకు జరగడం + మధ్యలో తేలియాడే కొబ్బరి పువ్వు -->
        <div class="flex items-center justify-center gap-4 py-3 select-none">
          <!-- ఎడమ చెక్క -->
          <div class="text-4xl sm:text-5xl transform -rotate-25 animate-pulse">🥥</div>
          
          <!-- మధ్యలో వికసించిన పవిత్ర కొబ్బరి పువ్వు -->
          <div class="flex flex-col items-center p-4 rounded-3xl bg-gradient-to-b from-amber-400/20 to-rose-500/20 border-2 border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.7)]">
            <span class="text-5xl sm:text-6xl animate-bounce">🌸</span>
            <span class="text-xs font-black text-amber-300 tracking-wider mt-1 font-['Ramabhadra']">దివ్య కొబ్బరి పువ్వు!</span>
          </div>

          <!-- కుడి చెక్క -->
          <div class="text-4xl sm:text-5xl transform rotate-25 animate-pulse">🥥</div>
        </div>

        <!-- బహుభాషా దివ్య ఆశీర్వచనం -->
        <div class="bg-black/70 border border-amber-400/50 p-5 rounded-2xl max-w-xl mx-auto space-y-2 text-left">
          <span class="text-amber-400 font-bold text-xs uppercase tracking-wider block border-b border-amber-500/30 pb-1">
            గణపతి దివ్య అనుగ్రహం (Divine Blessings):
          </span>
          <div class="font-['Tiro_Devanagari_Sanskrit'] text-sm font-bold text-amber-300">
            {divineBlessings[currentBlessingIndex].sa}
          </div>
          <p class="text-white font-extrabold text-sm sm:text-base leading-relaxed">
            "{divineBlessings[currentBlessingIndex].te}"
          </p>
          <p class="text-rose-200 text-xs leading-relaxed font-medium">
            "{divineBlessings[currentBlessingIndex].hi}"
          </p>
          <p class="text-amber-200/90 text-xs italic font-serif">
            "{divineBlessings[currentBlessingIndex].en}"
          </p>
        </div>
      </section>
    {/if}

    <!-- 3. అల్ట్రా ప్రీమియం వైరల్ వాట్సాప్ గ్రీటింగ్ కార్డ్ మేకర్ (VIP Styling) -->
    <section class="bg-gradient-to-r from-rose-950 via-[#18030b] to-purple-950 rounded-3xl p-6 sm:p-8 border-2 border-amber-500/70 shadow-2xl space-y-4">
      <div class="text-center space-y-1">
        <span class="bg-gradient-to-r from-rose-600 to-purple-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider font-['Cinzel'] shadow">
          VIP VIRAL GREETINGS DESK
        </span>
        <h3 class="text-xl sm:text-2xl font-black text-amber-300 font-['Ramabhadra']">
          మీ పేరుతో ప్రత్యేక శుభాకాంక్షల దర్శనం పంపండి
        </h3>
        <p class="text-xs text-rose-200">
          మీ పేరు నమోదు చేసి క్రింది ఆకుపచ్చ బటన్ నొక్కగానే సంస్కృతం, తెలుగు & ఇంగ్లీష్‌లతో కూడిన గ్రాండ్ వాట్సాప్ మెసేజ్ వెళ్తుంది!
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
          class="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-base py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 active:scale-95 transition tracking-wide"
        >
          <i class="fa-brands fa-whatsapp text-2xl"></i>
          <span>Share on WhatsApp (వాట్సాప్‌లో పంపండి)</span>
        </a>

        <div class="flex items-center gap-2 pt-1">
          <input
            type="text"
            readonly
            value={shareUrl}
            class="w-full px-3 py-2.5 bg-black/70 text-amber-300 text-xs rounded-xl font-mono border border-amber-500/40 select-all"
          />
          <button
            type="button"
            on:click={copyShareLink}
            class="bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 text-xs px-4 py-2.5 rounded-xl font-black shrink-0 shadow transition"
          >
            {showCopied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </section>

    <!-- 4. ఏకవింశతి పత్ర పూజ (మల్టీ కలర్ బ్యాడ్జ్ లేఅవుట్) -->
    <section class="bg-[#120207] rounded-3xl p-6 sm:p-7 border border-rose-900/60 shadow-md space-y-3">
      <div class="border-b border-rose-900/50 pb-2 flex items-center justify-between">
        <div>
          <h3 class="text-base sm:text-lg font-black text-amber-300 font-['Ramabhadra']">
            🌿 ఏకవింశతి పత్ర పూజ (21 Sacred Leaves)
          </h3>
          <p class="text-[11px] text-rose-300">పూజ సమయంలో పఠించడానికి పవిత్ర నామాలు:</p>
        </div>
        <span class="text-2xl">🕉️</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
        {#each patralu as p, idx}
          <div class="bg-gradient-to-r {p.color} border border-rose-900/40 p-2.5 rounded-xl flex items-center justify-between gap-2 hover:border-amber-400 transition">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-5 h-5 rounded-full bg-rose-950 text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-amber-500/30">
                {idx + 1}
              </span>
              <span class="truncate font-semibold text-rose-100">{p.t}</span>
            </div>
            <span class="text-[9px] font-mono text-amber-300/80 truncate">{p.s}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- 5. మండపాల ప్రత్యేక సేవలు -->
    <section class="bg-gradient-to-br from-black via-[#1a0208] to-purple-950 rounded-3xl p-6 sm:p-8 border-2 border-rose-600 shadow-2xl text-center space-y-3">
      <span class="bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider font-['Cinzel']">
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
          <i class="fa-solid fa-phone text-rose-400"></i> 9949122402
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
  @keyframes fall {
    0% { transform: translateY(-40px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
  }
  .flower-item {
    animation: fall linear forwards;
  }

  /* సహజ హారతి తాంబూల ప్రదక్షిణ (Natural Clockwise Aarti Motion right in front of Deity) */
  @keyframes naturalAarti {
    0% {
      transform: translateY(40px) rotate(0deg) scale(0.95);
    }
    25% {
      transform: translateY(10px) translateX(-35px) rotate(-8deg) scale(1.05);
    }
    50% {
      transform: translateY(-20px) translateX(0px) rotate(0deg) scale(1.1);
    }
    75% {
      transform: translateY(10px) translateX(35px) rotate(8deg) scale(1.05);
    }
    100% {
      transform: translateY(40px) rotate(0deg) scale(0.95);
    }
  }

  .natural-aarti-motion {
    animation: naturalAarti 3.2s ease-in-out infinite;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }

  @keyframes bounceShort {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  .animate-bounce-short {
    animation: bounceShort 2s ease-in-out infinite;
  }
</style>