<script>
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let authChecking = true;
  let searchQuery = '';
  let activeTab = 'all';

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
    } else {
      authChecking = false;
    }
  });

  // కేటగిరీల వారీగా సర్వీస్ లింకులు
  const services = [
    // 1. ప్రధాన సిటిజన్ & గుర్తింపు సేవలు
    {
      name: 'CSC Digital Seva',
      category: 'citizen',
      desc: 'డిజిటల్ సేవా కనెక్ట్ & అధికారిక CSC పోర్టల్',
      url: 'https://digitalseva.csc.gov.in/',
      icon: '🏛️',
      color: 'from-blue-600 to-indigo-700',
      badge: 'Core CSC'
    },
    {
      name: 'ఆధార్ పోర్టల్ (UIDAI)',
      category: 'citizen',
      desc: 'డౌన్‌లోడ్, PVC ఆర్డర్, అడ్రస్ అప్‌డేట్ & స్టేటస్',
      url: 'https://myaadhaar.uidai.gov.in/',
      icon: '🆔',
      color: 'from-amber-600 to-orange-600',
      badge: 'Aadhaar'
    },
    {
      name: 'పాన్ కార్డ్ (UTIITSL / NSDL)',
      category: 'citizen',
      desc: 'కొత్త పాన్ దరఖాస్తు, కరెక్షన్లు & రీప్రింట్',
      url: 'https://www.pan.utiitsl.com/',
      icon: '💳',
      color: 'from-cyan-600 to-blue-600',
      badge: 'PAN'
    },
    {
      name: 'ఈ-శ్రమ్ (e-Shram)',
      category: 'citizen',
      desc: 'అసంఘటిత కార్మికుల రిజిస్ట్రేషన్ & డౌన్‌లోడ్',
      url: 'https://eshram.gov.in/',
      icon: '👷',
      color: 'from-emerald-600 to-teal-700',
      badge: 'Labour'
    },
    {
      name: 'ఆయుష్మాన్ భారత్ (PM-JAY)',
      category: 'citizen',
      desc: 'ఆయుష్మాన్ కార్డ్ డౌన్‌లోడ్, కేవైసీ & వెరిఫికేషన్',
      url: 'https://beneficiary.nha.gov.in/',
      icon: '🏥',
      color: 'from-green-600 to-emerald-700',
      badge: 'Health'
    },
    {
      name: 'ఓటర్ సర్వీసెస్ (ECI)',
      category: 'citizen',
      desc: 'ఓటర్ కార్డ్ డౌన్‌లోడ్, కొత్త ఎపిక్ & మార్పులు',
      url: 'https://voters.eci.gov.in/',
      icon: '🗳️',
      color: 'from-indigo-600 to-purple-600',
      badge: 'Election'
    },

    // 2. తెలంగాణ రెవెన్యూ & భూ రికార్డులు
    {
      name: 'ధరణి / భూభారతి',
      category: 'land',
      desc: 'పట్టాదారు పాస్‌బుక్, ROR 1B, పహాణీ & స్లాట్ బుకింగ్',
      url: 'https://dharani.telangana.gov.in/',
      icon: '🌾',
      color: 'from-emerald-700 to-green-800',
      badge: 'Land TG'
    },
    {
      name: 'స్టాంప్స్ & రిజిస్ట్రేషన్ (TG)',
      category: 'land',
      desc: 'ఈసీ (EC), మార్కెట్ వ్యాల్యూ సెర్చ్, సర్టిఫైడ్ కాపీలు',
      url: 'https://registration.telangana.gov.in/',
      icon: '📜',
      color: 'from-amber-700 to-yellow-800',
      badge: 'Stamps'
    },
    {
      name: 'తెలంగాణ ఇసుక బుకింగ్ (SSMMS)',
      category: 'land',
      desc: 'ఆన్‌లైన్ ఇసుక ఆర్డర్, వెహికల్ ట్రాకింగ్ & రసీదులు',
      url: 'https://sand.telangana.gov.in/',
      icon: '🚚',
      color: 'from-amber-600 to-stone-600',
      badge: 'Sand'
    },
    {
      name: 'పీఎం కిసాన్ (PM-Kisan)',
      category: 'land',
      desc: 'రైతు సమ్మాన్ నిధి, e-KYC & బెనిఫిషియరీ లిస్ట్',
      url: 'https://pmkisan.gov.in/',
      icon: '🚜',
      color: 'from-lime-600 to-green-700',
      badge: 'Farmer'
    },

    // 3. బిజినెస్, టాక్స్ & లీగల్
    {
      name: 'GST పోర్టల్',
      category: 'business',
      desc: 'జీఎస్టీ రిజిస్ట్రేషన్, రిటర్న్స్ ఫైలింగ్ & పేమెంట్లు',
      url: 'https://www.gst.gov.in/',
      icon: '📊',
      color: 'from-slate-800 to-blue-900',
      badge: 'GST'
    },
    {
      name: 'ఇన్‌కమ్ టాక్స్ e-Filing',
      category: 'business',
      desc: 'ITR ఫైలింగ్, AIS / 26AS స్టేట్‌మెంట్స్ & పాన్ లింకింగ్',
      url: 'https://www.incometax.gov.in/',
      icon: '💰',
      color: 'from-blue-700 to-slate-900',
      badge: 'ITR'
    },
    {
      name: 'ఉద్యమ్ ఆధార్ (MSME)',
      category: 'business',
      desc: 'చిన్న వ్యాపారాల రిజిస్ట్రేషన్ & ఉద్యమ్ సర్టిఫికెట్',
      url: 'https://udyamregistration.gov.in/',
      icon: '🏢',
      color: 'from-teal-600 to-cyan-700',
      badge: 'MSME'
    },
    {
      name: 'కార్పొరేట్ అఫైర్స్ (MCA)',
      category: 'business',
      desc: 'కంపెనీ డేటా, డైరెక్టర్ DIN & ఫైలింగ్ సర్వీసెస్',
      url: 'https://www.mca.gov.in/',
      icon: '⚖️',
      color: 'from-neutral-700 to-stone-900',
      badge: 'MCA'
    },

    // 4. రిక్రూట్‌మెంట్ & ఫలితాలు
    {
      name: 'TGPSC పోర్టల్',
      category: 'jobs',
      desc: 'తెలంగాణ పబ్లిక్ సర్వీస్ కమిషన్ దరఖాస్తులు & హాల్ టికెట్లు',
      url: 'https://www.tspsc.gov.in/',
      icon: '🎯',
      color: 'from-rose-600 to-red-700',
      badge: 'Jobs TG'
    },
    {
      name: 'తెలంగాణ ePass',
      category: 'jobs',
      desc: 'పోస్ట్ మెట్రిక్ / ప్రీ మెట్రిక్ స్కాలర్‌షిప్‌లు & ఫీజు రీయింబర్స్‌మెంట్',
      url: 'https://telanganaepass.cgg.gov.in/',
      icon: '🎓',
      color: 'from-violet-600 to-purple-700',
      badge: 'Scholarship'
    },
    {
      name: 'పోలీస్ రిక్రూట్‌మెంట్ (TGPB)',
      category: 'jobs',
      desc: 'తెలంగాణ కానిస్టేబుల్, ఎస్ఐ నోటిఫికేషన్లు & లాగిన్',
      url: 'https://www.tgprb.co.in/',
      icon: '👮‍♂️',
      color: 'from-blue-800 to-slate-900',
      badge: 'Police'
    },

    // 5. ట్రావెల్, ఆర్టీఏ & యుటిలిటీస్
    {
      name: 'CSC సఫర్ (IRCTC)',
      category: 'travel',
      desc: 'ట్రైన్ టికెట్ బుకింగ్ & తత్కాల్ ఏజెంట్ లాగిన్',
      url: 'https://trains.csccloud.in/',
      icon: '🚆',
      color: 'from-orange-600 to-red-600',
      badge: 'Tickets'
    },
    {
      name: 'పరివాహన్ సారథి (RTA)',
      category: 'travel',
      desc: 'లెర్నింగ్ లైసెన్స్, డ్రైవింగ్ లైసెన్స్ రెన్యూవల్ & స్లాట్స్',
      url: 'https://sarathi.parivahan.gov.in/',
      icon: '🪪',
      color: 'from-sky-600 to-blue-700',
      badge: 'RTA'
    },
    {
      name: 'TGSPDCL / TSNPDCL',
      category: 'travel',
      desc: 'కరెంట్ బిల్లుల చెల్లింపు & నూతన సర్వీస్ కనెక్షన్లు',
      url: 'https://www.tssouthernpower.com/',
      icon: '⚡',
      color: 'from-amber-500 to-yellow-600',
      badge: 'Electricity'
    }
  ];

  $: filteredServices = services.filter(s => {
    const matchCategory = activeTab === 'all' || s.category === activeTab;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.badge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });
</script>

<svelte:head>
  <title>Nexlify Sphere Digital Express | Business Control Hub</title>
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">
    <div class="text-center space-y-3">
      <div class="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-400">పోర్టల్ సిద్ధమవుతోంది...</p>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
    
    <!-- Top Master Header -->
    <header class="bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-30 shadow-md">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center font-black text-white text-lg shadow-lg">
            NS
          </div>
          <div>
            <h1 class="text-base sm:text-lg font-black tracking-wide text-white">
              NEXLIFY SPHERE <span class="text-amber-400">DIGITAL EXPRESS</span>
            </h1>
            <p class="text-[11px] text-slate-400">CSC, MeeSeva & Government Service Desk</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <a href="/admin/shorts" class="text-xs font-bold bg-red-600/90 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition">
            ⚡ NS Shorts
          </a>
          <a href="/admin/news" class="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition">
            ← న్యూస్ డెస్క్
          </a>
        </div>

      </div>
    </header>

    <!-- Sub-bar: Search & Filter Tabs -->
    <div class="bg-slate-950/60 border-b border-slate-800/80 px-4 sm:px-8 py-3 backdrop-blur sticky top-[73px] z-20">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        
        <!-- Category Filter Tabs -->
        <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-bold scrollbar-none">
          <button 
            on:click={() => activeTab = 'all'} 
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap {activeTab === 'all' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
            అన్నీ ({services.length})
          </button>
          <button 
            on:click={() => activeTab = 'citizen'} 
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap {activeTab === 'citizen' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
            🆔 సిటిజన్ & CSC
          </button>
          <button 
            on:click={() => activeTab = 'land'} 
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap {activeTab === 'land' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
            🌾 భూమి & రైతులు
          </button>
          <button 
            on:click={() => activeTab = 'business'} 
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap {activeTab === 'business' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
            📊 GST & ITR
          </button>
          <button 
            on:click={() => activeTab = 'jobs'} 
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap {activeTab === 'jobs' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
            🎯 ఉద్యోగాలు & విద్య
          </button>
          <button 
            on:click={() => activeTab = 'travel'} 
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap {activeTab === 'travel' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
            🚆 ట్రావెల్ & RTA
          </button>
        </div>

        <!-- Live Search Box -->
        <div class="relative w-full sm:w-72">
          <input 
            type="text" 
            bind:value={searchQuery}
            placeholder="సర్వీస్ వెతకండి (ఉదా: ధరణి, PAN, GST)..." 
            class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {#if searchQuery}
            <button on:click={() => searchQuery = ''} class="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-white">✕</button>
          {/if}
        </div>

      </div>
    </div>

    <!-- Main Service Cards Grid -->
    <main class="max-w-7xl mx-auto p-4 sm:p-8 flex-1 w-full">
      {#if filteredServices.length === 0}
        <div class="py-24 text-center text-slate-400 text-sm">
          మీరు వెతికిన వివరాలతో ఏ సేవలు లభించలేదు.
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {#each filteredServices as item}
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              class="group relative bg-slate-950 border border-slate-800 hover:border-amber-500/80 rounded-2xl p-4 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                <div class="flex items-start justify-between gap-2 mb-3">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br {item.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition duration-200">
                    {item.icon}
                  </div>
                  <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                </div>

                <h2 class="text-sm font-black text-white group-hover:text-amber-400 transition mb-1">
                  {item.name}
                </h2>
                <p class="text-xs text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-amber-400/90 group-hover:text-amber-300">
                <span>పోర్టల్ ఓపెన్ చేయండి</span>
                <span class="transform group-hover:translate-x-1 transition">↗</span>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </main>

  </div>
{/if}