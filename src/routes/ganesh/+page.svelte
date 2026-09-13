<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let senderName = '';
  let generatedUrl = '';
  let fromParam = '';
  let flowers = [];
  let isHarathiActive = false;
  let bellRinging = false;
  let showCopied = false;

  // 21 పత్రాల జాబితా
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

  // పూల వర్షం యానిమేషన్
  function triggerFlowerShower() {
    const flowerIcons = ['🌺', '🌸', '🌼', '💐', '✨', '🍃'];
    const newFlowers = [];
    for (let i = 0; i < 35; i++) {
      newFlowers.push({
        id: Math.random(),
        icon: flowerIcons[Math.floor(Math.random() * flowerIcons.length)],
        left: Math.random() * 95,
        animationDuration: 2.5 + Math.random() * 2.5,
        size: 18 + Math.random() * 18
      });
    }
    flowers = newFlowers;
    setTimeout(() => {
      flowers = [];
    }, 5000);
  }

  // గంట నాదం (Web Audio API తో సహజ గంట ధ్వని)
  function ringBell() {
    bellRinging = true;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.log('Audio not allowed');
    }
    setTimeout(() => {
      bellRinging = false;
    }, 1200);
  }

  // హారతి వెలిగించడం
  function giveHarathi() {
    isHarathiActive = true;
    triggerFlowerShower();
    setTimeout(() => {
      isHarathiActive = false;
    }, 4000);
  }

  // పర్సనలైజ్డ్ లింక్ తయారీ & షేర్
  function generateGreeting() {
    if (!senderName.trim()) {
      alert('దయచేసి మీ పేరు నమోదు చేయండి');
      return;
    }
    const cleanName = encodeURIComponent(senderName.trim());
    generatedUrl = `https://nexlifynucleus.in/ganesh?from=${cleanName}`;

    const shareText = `*శ్రీ వినాయక చవితి శుభాకాంక్షలు!* 🐘🪔\n\nమీకు మరియు మీ కుటుంబ సభ్యులకు *${senderName.trim()}* పంపిన ప్రత్యేక డిజిటల్ పూజా ఆశీస్సులు చూడండి:\n👇 క్లిక్ చేయండి:\n${generatedUrl}\n\n_A.S.V. Enterprises & NS News, ముత్తారం_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  }

  function copyLink() {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    showCopied = true;
    setTimeout(() => showCopied = false, 2500);
  }
</script>

<svelte:head>
  <title>శ్రీ వినాయక చవితి మహోత్సవం 2026 | ప్రత్యేక డిజిటల్ దర్శనం & శుభాకాంక్షలు</title>
  <meta name="description" content="A.S.V. Enterprises & NS News ముత్తారం వారి వినాయక చవితి ప్రత్యేక డిజిటల్ పూజ, పూల వర్షం, మరియు పర్సనలైజ్డ్ వాట్సాప్ గ్రీటింగ్స్." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mandali&family=Ramabhadra&family=Noto+Sans+Telugu:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<!-- పూల వర్షం కంటైనర్ -->
{#if flowers.length > 0}
  <div class="fixed inset-0 pointer-events-none z-50 overflow-hidden">
    {#each flowers as fl (fl.id)}
      <div
        class="absolute flower-fall"
        style="left: {fl.left}%; font-size: {fl.size}px; animation-duration: {fl.animationDuration}s;"
      >
        {fl.icon}
      </div>
    {/each}
  </div>
{/if}

<div class="min-h-screen bg-gradient-to-b from-amber-950 via-slate-950 to-slate-900 text-slate-100 flex flex-col font-['Noto_Sans_Telugu',sans-serif]">
  
  <!-- హెడర్ -->
  <header class="bg-black/60 backdrop-blur border-b border-amber-500/30 sticky top-0 z-40 py-3 px-4">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <a href="/" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gradient-to-tr from-amber-500 to-red-600 rounded-lg flex items-center justify-center font-black text-white text-sm shadow">
          卐
        </div>
        <span class="font-['Ramabhadra'] text-lg text-amber-300">NS భక్తి డెస్క్</span>
      </a>
      <a href="/" class="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3.5 py-1.5 rounded-xl font-bold transition">
        🏠 హోమ్ పేజీ
      </a>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 py-8 flex-grow w-full space-y-10">

    <!-- పర్సనలైజ్డ్ విషెస్ బ్యానర్ (లింక్ ద్వారా వచ్చిన వారికి) -->
    {#if fromParam}
      <div class="bg-gradient-to-r from-red-600 via-amber-600 to-red-700 p-5 rounded-3xl text-center shadow-2xl border-2 border-yellow-300/80 animate-pulse">
        <span class="text-yellow-200 text-xs font-bold uppercase tracking-widest block mb-1">ప్రత్యేక పండుగ సందేశం</span>
        <h2 class="text-xl sm:text-2xl font-black text-white font-['Ramabhadra']">
          మీకు మరియు మీ కుటుంబ సభ్యులకు <br class="sm:hidden" />
          <span class="text-yellow-300 underline underline-offset-4 decoration-white">
            {decodeURIComponent(fromParam)}
          </span> గారి నుండి
        </h2>
        <p class="text-amber-100 text-sm font-bold mt-1">
          శ్రీ వినాయక చవితి శుభాకాంక్షలు! గణపతి కృపతో మీకు సకల విజయాలు చేకూరాలని కోరుకుంటున్నారు.
        </p>
      </div>
    {/if}

    <!-- 1. ఇంటరాక్టివ్ వినాయక దర్శన మండపం -->
    <section class="bg-gradient-to-b from-amber-900/40 to-slate-900/90 rounded-3xl p-6 sm:p-10 border-2 border-amber-500/50 shadow-2xl text-center relative overflow-hidden">
      
      <div class="max-w-lg mx-auto space-y-4">
        <div class="inline-block bg-amber-500/20 border border-amber-400/40 px-4 py-1 rounded-full text-xs font-bold text-amber-300">
          🕉️ వక్రతుండ మహాకాయ సూర్యకోటి సమప్రభ 🕉️
        </div>

        <h1 class="text-2xl sm:text-4xl font-black text-amber-400 font-['Ramabhadra'] tracking-wide">
          శ్రీ వినాయక చవితి మహోత్సవం 2026
        </h1>
        <p class="text-xs sm:text-sm text-slate-300">
          విఘ్నాలను తొలగించి, సకల శుభాలను చేకూర్చే బొజ్జ గణపయ్యను భక్తితో సేవించుకుందాం!
        </p>

        <!-- గణపతి విగ్రహం & యానిమేషన్స్ -->
        <div class="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto my-6 flex items-center justify-center">
          <div class="absolute inset-0 bg-amber-500/20 rounded-full blur-3xl"></div>
          
          <!-- హారతి వెలుగు ఎఫెక్ట్ -->
          {#if isHarathiActive}
            <div class="absolute inset-0 rounded-full border-4 border-amber-400 animate-ping pointer-events-none"></div>
            <div class="absolute -top-4 text-3xl animate-bounce">🪔</div>
          {/if}

          <!-- సెంటర్ విగ్రహం -->
          <div class="relative z-10 w-56 h-56 sm:w-72 sm:h-72 rounded-full border-4 border-amber-400/80 p-2 shadow-2xl bg-gradient-to-b from-amber-950 to-slate-950 flex items-center justify-center overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1567591414240-e54fa57422f2?auto=format&fit=crop&w=600&q=80"
              alt="Lord Ganesha"
              class="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>

        <!-- ఇంటరాక్టివ్ భక్తి బటన్లు (టచ్ & శబ్దం) -->
        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          
          <button
            type="button"
            on:click={ringBell}
            class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 active:scale-90 transition {bellRinging ? 'scale-105 ring-4 ring-amber-300' : ''}"
          >
            <span class="text-base {bellRinging ? 'animate-bounce' : ''}">🔔</span>
            <span>గంట మోగించండి</span>
          </button>

          <button
            type="button"
            on:click={giveHarathi}
            class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 text-white font-black text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 active:scale-90 transition {isHarathiActive ? 'ring-4 ring-red-400' : ''}"
          >
            <span class="text-base">🪔</span>
            <span>హారతి సమర్పించండి</span>
          </button>

          <button
            type="button"
            on:click={triggerFlowerShower}
            class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 active:scale-90 transition"
          >
            <span class="text-base">🌺</span>
            <span>పూల వర్షం కురిపించండి</span>
          </button>

        </div>

      </div>
    </section>

    <!-- 2. వైరల్ పర్సనలైజ్డ్ వాట్సాప్ గ్రీటింగ్ కార్డ్ మేకర్ -->
    <section class="bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-xl space-y-4">
      <div class="text-center max-w-lg mx-auto space-y-2">
        <span class="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">వైరల్ విడ్జెట్</span>
        <h3 class="text-xl sm:text-2xl font-black text-amber-300 font-['Ramabhadra']">
          మీ పేరుతో ప్రత్యేక శుభాకాంక్షల కార్డ్ తయారుచేయండి
        </h3>
        <p class="text-xs text-slate-300">
          మీ పేరు నమోదు చేసి బటన్ నొక్కగానే మీ పేరుతో కూడిన ప్రత్యేక దర్శన లింక్ వాట్సాప్‌లో షేర్ అవుతుంది!
        </p>
      </div>

      <div class="max-w-md mx-auto space-y-3 pt-2">
        <input
          type="text"
          bind:value={senderName}
          placeholder="ఉదా: శ్రీనివాస్ మరియు కుటుంబ సభ్యులు"
          class="w-full px-4 py-3 rounded-2xl bg-white text-slate-950 font-bold text-sm focus:ring-4 focus:ring-amber-400 focus:outline-none placeholder:font-normal placeholder:text-slate-400 shadow"
        />

        <button
          type="button"
          on:click={generateGreeting}
          class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <i class="fa-brands fa-whatsapp text-lg"></i>
          <span>వాట్సాప్‌లో స్నేహితులకు & గ్రూపులకు పంపండి</span>
        </button>

        {#if generatedUrl}
          <div class="pt-2 flex items-center gap-2">
            <input
              type="text"
              readonly
              value={generatedUrl}
              class="w-full px-3 py-2 bg-slate-800 text-amber-200 text-xs rounded-xl font-mono border border-slate-700 select-all"
            />
            <button
              type="button"
              on:click={copyLink}
              class="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-xl font-bold shrink-0"
            >
              {showCopied ? 'కాపీ అయ్యింది!' : 'కాపీ'}
            </button>
          </div>
        {/if}
      </div>
    </section>

    <!-- 3. "మా ఊరి వినాయకుడు" - క్రౌడ్ సోర్స్ మండప ప్రదర్శన కాల్ -->
    <section class="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-lg grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      <div class="md:col-span-8 space-y-3">
        <span class="text-amber-400 text-xs font-bold uppercase tracking-wider block">గణేష్ ఉత్సవ కమిటీలకు ఆహ్వానం</span>
        <h3 class="text-xl sm:text-2xl font-black text-white font-['Ramabhadra']">
          మీ ఊరి / గల్లీ గణపతి ఫోటో NS News లో ఉచితంగా ప్రచురించండి!
        </h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          ముత్తారం, పెద్దపల్లి, మంథని మండలాల్లో మీరు ప్రతిష్టించిన గణపతి విగ్రహం ఫోటో, మండపం పేరు, యూత్ కమిటీ వివరాలను మా వాట్సాప్‌కు పంపండి. మేము ప్రత్యేక న్యూస్ కథనంలో ప్రదర్శిస్తాము.
        </p>
      </div>

      <div class="md:col-span-4 text-center md:text-right">
        <a
          href="https://wa.me/919949122402?text=నమస్తే%20NS%20News,%20ఇది%20మా%20మండపం%20గణపతి%20ఫోటో%20మరియు%20వివరాలు:"
          target="_blank"
          class="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 text-white font-black text-xs sm:text-sm px-5 py-3.5 rounded-2xl shadow-md transition active:scale-95"
        >
          <i class="fa-brands fa-whatsapp text-base"></i>
          <span>ఫోటోలు పంపండి 📲</span>
        </a>
      </div>
    </section>

    <!-- 4. ఏకవింశతి పత్ర పూజ (21 రకాల పత్రాల వివరాలు) -->
    <section class="bg-slate-900/60 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-sm space-y-4">
      <div class="border-b border-slate-800 pb-3">
        <h3 class="text-lg sm:text-xl font-black text-amber-300 font-['Ramabhadra']">
          🌿 వినాయకుడి ఏకవింశతి పత్ర పూజ (21 రకాల ఆకులు)
        </h3>
        <p class="text-xs text-slate-400 mt-0.5">పూజలో స్వామికి సమర్పించాల్సిన పవిత్ర పత్రాల పేర్లు:</p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs text-slate-200">
        {#each patralu as p, idx}
          <div class="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <span class="font-medium truncate">{p}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- 5. ఫెస్టివల్ బిజినెస్ డెస్క్: A.S.V. Enterprises సేవల కాల్అవుట్ -->
    <section class="bg-gradient-to-br from-slate-950 via-slate-900 to-black rounded-3xl p-6 sm:p-8 border-2 border-red-600 shadow-xl text-center space-y-4">
      <div class="max-w-2xl mx-auto space-y-2">
        <span class="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">మండపాల ప్రత్యేక సేవలు</span>
        <h3 class="text-xl sm:text-2xl font-black text-white font-['Ramabhadra']">
          A.S.V. ENTERPRISES — ముత్తారం బస్ స్టాండ్
        </h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          గణేష్ మండపాల చందా రసీదు పుస్తకాలు, లడ్డు వేలం కూపన్లు, ఫ్లెక్సీ బ్యానర్లు, మరియు పోలీస్ / విద్యుత్ డిపార్ట్‌మెంట్ ఆన్‌లైన్ పర్మిషన్ల కోసం తక్షణమే సంప్రదించండి.
        </p>
        <div class="pt-2 text-xs font-bold text-amber-300 flex flex-wrap justify-center gap-4">
          <span>📞 9949122402</span>
          <span>•</span>
          <span>CSC ID: 514542450010</span>
          <span>•</span>
          <span>ముత్తారం, పెద్దపల్లి</span>
        </div>
      </div>
    </section>

  </main>

  <!-- ఫుటర్ -->
  <footer class="bg-black text-slate-500 py-6 border-t border-slate-800 text-xs text-center">
    <p>© 2026 A.S.V. Enterprises & NS News. సర్వేజనా సుఖినోభవంతు.</p>
  </footer>

</div>

<style>
  @keyframes fall {
    0% {
      transform: translateY(-50px) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(105vh) rotate(360deg);
      opacity: 0;
    }
  }

  .flower-fall {
    animation: fall linear forwards;
  }
</style>