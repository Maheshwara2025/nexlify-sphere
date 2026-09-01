<script>
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	/** @type {any[]} */
	let articles = [];
	let loading = true;
	let selectedCategory = 'అన్నీ';
	let searchQuery = '';

	// Live Weather & Utility States
	let liveTemp = '29°C';
	let weatherDesc = 'పాక్షిక మేఘావృతం';
	let todayTeluguDate = '';

	const categories = [
		'అన్నీ',
		'రాజకీయాలు',
		'వ్యాపారం & ఫైనాన్స్',
		'టెక్నాలజీ',
		'ఆరోగ్యం',
		'వాతావరణం & పర్యావరణం',
		'విద్య & ఉద్యోగాలు',
		'సైన్స్ & పరిశోధనలు',
		'క్రీడలు & గేమ్స్',
		'సంస్కృతి & సమాజం',
		'ప్రపంచ వార్తలు'
	];

	const digitalServices = [
		{ name: 'ఆధార్ సేవలు', icon: 'fa-id-card', desc: 'అప్‌డేట్, ప్రింట్ & లింకింగ్' },
		{ name: 'రైతు సేవలు', icon: 'fa-tractor', desc: 'రైతు భరోసా, PM కిసాన్' },
		{ name: 'భూభారతి / ధరణి', icon: 'fa-map-location-dot', desc: 'పట్టాదారు పాస్‌బుక్, ROR-1B' },
		{ name: 'ఓటర్ సేవలు', icon: 'fa-check-to-slot', desc: 'కొత్త కార్డు, కరెక్షన్స్' },
		{ name: 'విద్యార్థి సేవలు', icon: 'fa-graduation-cap', desc: 'స్కాలర్‌షిప్స్, TSPSC ఫారమ్స్' },
		{ name: 'విద్యుత్ & బిల్లులు', icon: 'fa-bolt', desc: 'కరెంట్ బిల్లులు, రీఛార్జ్‌లు' },
		{ name: 'ఆరోగ్య / ఇన్సూరెన్స్', icon: 'fa-heart-pulse', desc: 'ఆయుష్మాన్ భారత్, బీమా' },
		{ name: 'గ్రామ పంచాయతీ', icon: 'fa-landmark-dome', desc: 'eGramSwaraj, పన్ను రసీదులు' }
	];

	const emergencyHelplines = [
		{ title: 'పోలీస్ కంట్రోల్', number: '112', icon: 'fa-shield-halved', color: 'text-blue-600 bg-blue-50 border-blue-200' },
		{ title: 'అంబులెన్స్ సర్వీస్', number: '108', icon: 'fa-truck-medical', color: 'text-rose-600 bg-rose-50 border-rose-200' },
		{ title: 'విద్యుత్ సమస్యలు', number: '1912', icon: 'fa-bolt', color: 'text-amber-600 bg-amber-50 border-amber-200' },
		{ title: 'సైబర్ క్రైమ్ హెల్ప్‌లైన్', number: '1930', icon: 'fa-user-secret', color: 'text-purple-600 bg-purple-50 border-purple-200' }
	];

	async function fetchLiveWeather() {
		try {
			const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=18.61&longitude=79.38&current=temperature_2m,weather_code&timezone=Asia%2FKolkata');
			if (res.ok) {
				const data = await res.json();
				if (data.current) {
					liveTemp = `${Math.round(data.current.temperature_2m)}°C`;
					const code = data.current.weather_code;
					if (code === 0) weatherDesc = 'నిర్మలమైన ఆకాశం ☀️';
					else if (code <= 3) weatherDesc = 'పాక్షిక మేఘావృతం ⛅';
					else if (code >= 51 && code <= 67) weatherDesc = 'వర్షం / జల్లులు 🌧️';
					else if (code >= 95) weatherDesc = 'ఉరుముల వర్షం ⛈️';
					else weatherDesc = 'చల్లని వాతావరణం 🌤️';
				}
			}
		} catch (e) {
			console.log('Weather fallback active');
		}
	}

	async function fetchNews() {
		loading = true;
		try {
			const { data, error } = await supabase
				.from('news_articles')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) throw error;
			articles = data || [];
		} catch (err) {
			console.error('Error fetching articles:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		todayTeluguDate = new Date().toLocaleDateString('te-IN', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
		fetchNews();
		fetchLiveWeather();
	});

	$: filteredArticles = articles.filter(a => {
		const matchCategory = selectedCategory === 'అన్నీ' || a.category === selectedCategory;
		const query = searchQuery.toLowerCase().trim();
		const matchSearch = !query || 
			(a.headline && a.headline.toLowerCase().includes(query)) ||
			(a.content && a.content.toLowerCase().includes(query)) ||
			(a.location_town && a.location_town.toLowerCase().includes(query)) ||
			(a.subline_1 && a.subline_1.toLowerCase().includes(query));
		return matchCategory && matchSearch;
	});

	$: tickerNews = articles.filter(a => a.show_in_ticker);
	$: breakingNews = articles.filter(a => a.alert_type === 'breaking' || a.alert_type === 'flash');
</script>

<svelte:head>
	<title>NS News | నిజమైన వార్తల వేదిక | A.S.V Enterprises</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
	<link href="https://fonts.googleapis.com/css2?family=Mandali&family=Ramabhadra&family=Noto+Sans+Telugu:wght@500;600;700;800;900&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<div class="min-h-screen bg-[#f3f4f6] text-slate-800 flex flex-col font-['Noto_Sans_Telugu',sans-serif]">
	
	<!-- Header Bar -->
	<header class="bg-slate-950 text-white sticky top-0 z-50 border-b-2 border-red-600 shadow-md">
		<div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
			<div class="flex items-center gap-3 sm:gap-5">
				<a
					href="/"
					class="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 border border-orange-400/30"
				>
					<i class="fa-solid fa-house-chimney text-yellow-200"></i>
					<span>డిజిటల్ సేవలు (హోమ్)</span>
				</a>

				<span class="text-slate-700 hidden sm:inline">|</span>

				<div class="flex items-center gap-2">
					<div class="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-black text-base shadow-sm font-['Ramabhadra']">
						NS
					</div>
					<div>
						<a href="/news" class="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-none font-['Ramabhadra']">
							NS NEWS
						</a>
						<span class="text-[10px] text-red-400 font-semibold block uppercase tracking-wider">A.S.V Digital Network</span>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-2 sm:gap-3">
				<a
					href="/admin/news"
					class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-xl border border-slate-700 font-bold text-slate-200 transition-all hidden sm:inline-flex items-center gap-1.5"
				>
					<i class="fa-solid fa-lock text-red-400"></i> అడ్మిన్ డెస్క్
				</a>
				<a
					href="https://wa.me/919502336495"
					target="_blank"
					rel="noreferrer"
					class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all"
					aria-label="WhatsApp లో న్యూస్ పంపండి"
				>
					<i class="fa-brands fa-whatsapp text-base"></i> <span>వార్త పంపండి</span>
				</a>
			</div>
		</div>
	</header>

	<!-- Live Ticker Strip -->
	{#if tickerNews.length > 0}
		<div class="bg-[#b91c1c] text-white py-3 sm:py-3.5 flex items-center border-y-2 border-red-900 shadow-md relative z-30">
			<div class="bg-[#7f1d1d] px-4 sm:px-6 py-2 font-black text-xs sm:text-sm uppercase tracking-wider shrink-0 z-20 flex items-center gap-2 shadow-xl border-r border-red-500/50">
				<span class="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"></span>
				<i class="fa-solid fa-bolt text-yellow-300 text-sm"></i>
				<span class="font-['Ramabhadra'] text-white">లైవ్ న్యూస్</span>
			</div>
			
			<div class="overflow-hidden relative w-full flex items-center">
				<div class="inline-block whitespace-nowrap animate-marquee">
					{#each tickerNews as item}
						<a 
							href={`/news/${item.id}`} 
							class="inline-flex items-center mx-8 text-[15px] sm:text-[17px] font-bold text-white hover:text-yellow-200 transition-colors tracking-wide"
						>
							<span class="bg-black/35 text-yellow-300 border border-yellow-400/40 text-xs sm:text-sm px-2.5 py-0.5 rounded-md mr-2.5 font-bold">
								{item.location_town || item.category}
							</span>
							<span class="drop-shadow-xs">{item.headline}</span>
							<span class="mx-6 text-yellow-400 text-base font-black">✦</span>
						</a>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Breaking News Alert -->
	{#if breakingNews.length > 0}
		<div class="max-w-7xl mx-auto px-4 pt-4 w-full">
			<div class="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-red-500">
				<div class="flex items-start gap-3.5">
					<div class="w-11 h-11 rounded-xl bg-white text-red-600 flex items-center justify-center font-black text-xl shrink-0 shadow">
						<i class="fa-solid fa-fire"></i>
					</div>
					<div>
						<span class="inline-block bg-yellow-400 text-slate-950 font-black text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded mb-1">
							{breakingNews[0].alert_type === 'breaking' ? 'బ్రేకింగ్ న్యూస్' : 'ఫ్లాష్ న్యూస్'}
						</span>
						<h2 class="text-lg sm:text-xl font-bold leading-snug">
							{breakingNews[0].headline}
						</h2>
						<p class="text-xs sm:text-sm text-red-100 mt-0.5 font-medium">{breakingNews[0].subline_1}</p>
					</div>
				</div>
				<a
					href={`/news/${breakingNews[0].id}`}
					class="shrink-0 bg-slate-950 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow"
				>
					పూర్తి వివరాలు <i class="fa-solid fa-arrow-right ml-1"></i>
				</a>
			</div>
		</div>
	{/if}

	<!-- Categories & Search Bar -->
	<div class="bg-white border-b border-slate-200 sticky top-[57px] z-20 shadow-xs">
		<div class="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
			<div class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar py-0.5">
				{#each categories as cat}
					<button
						type="button"
						on:click={() => selectedCategory = cat}
						class="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all {selectedCategory === cat ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
					>
						{cat}
					</button>
				{/each}
			</div>

			<div class="relative w-full md:w-72 shrink-0">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="వార్త లేదా ఊరి పేరు శోధించండి..."
					class="w-full pl-9 pr-8 py-1.5 bg-slate-100 hover:bg-slate-50 focus:bg-white text-xs font-semibold rounded-full border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all placeholder:text-slate-400"
				/>
				<i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
				{#if searchQuery}
					<button
						type="button"
						on:click={() => searchQuery = ''}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
					>
						<i class="fa-solid fa-circle-xmark"></i>
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Main Feed & Sidebars -->
	<main class="max-w-7xl mx-auto px-4 py-8 flex-grow w-full">
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
			
			<!-- News Feed (Left - 8 Cols) -->
			<div class="lg:col-span-8 space-y-6">
				<div class="flex items-center justify-between border-b border-slate-200 pb-2">
					<h3 class="text-xl font-black text-slate-900 flex items-center gap-2">
						<span class="w-2.5 h-6 bg-red-600 rounded-full"></span>
						{#if searchQuery}
							<span>శోధన ఫలితాలు: "{searchQuery}"</span>
						{:else}
							<span>{selectedCategory === 'అన్నీ' ? 'తాజా ప్రధాన వార్తలు' : selectedCategory}</span>
						{/if}
					</h3>
					<span class="text-xs text-slate-500 font-bold">{filteredArticles.length} కథనాలు</span>
				</div>

				{#if loading}
					<div class="text-center py-16 bg-white rounded-2xl border border-slate-200">
						<i class="fa-solid fa-circle-notch fa-spin text-3xl text-red-600 mb-2"></i>
						<p class="text-sm text-slate-500 font-medium">వార్తలు లోడ్ అవుతున్నాయి...</p>
					</div>
				{:else if filteredArticles.length === 0}
					<div class="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-2">
						<i class="fa-regular fa-newspaper text-4xl text-slate-300"></i>
						<p class="text-slate-700 font-bold text-base">ఎలాంటి వార్తలు లభించలేదు.</p>
						<p class="text-xs text-slate-400">శోధన పదాన్ని మార్చి లేదా వేరే కేటగిరీని ఎంచుకోండి.</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						{#each filteredArticles as news}
							<article class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
								<div>
									{#if news.image_url}
										<a href={`/news/${news.id}`} class="block aspect-video overflow-hidden bg-slate-100 relative">
											<img
												src={news.image_url}
												alt={news.headline}
												class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
											/>
											{#if news.alert_type !== 'none'}
												<span class="absolute top-3 left-3 {news.alert_type === 'breaking' ? 'bg-red-600' : 'bg-amber-500'} text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow">
													{news.alert_type === 'breaking' ? 'బ్రేకింగ్' : 'ఫ్లాష్'}
												</span>
											{/if}
										</a>
									{/if}

									<div class="p-5">
										<div class="flex items-center gap-2 mb-2">
											{#if news.location_town}
												<span class="text-xs font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
													{news.location_town}
												</span>
											{/if}
											<span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
												{news.category}
											</span>
										</div>

										<h4 class="text-base sm:text-lg font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-snug line-clamp-2 mb-2">
											<a href={`/news/${news.id}`}>{news.headline}</a>
										</h4>

										{#if news.subline_1}
											<ul class="space-y-1 text-xs text-slate-600 border-l-2 border-red-500 pl-2.5 mb-3 font-medium">
												<li>{news.subline_1}</li>
												{#if news.subline_2}
													<li class="text-slate-500">{news.subline_2}</li>
												{/if}
											</ul>
										{/if}
									</div>
								</div>

								<div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
									<span>{new Date(news.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
									<a href={`/news/${news.id}`} class="font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
										పూర్తి కథనం <i class="fa-solid fa-arrow-right text-[10px]"></i>
									</a>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Sidebar (Right - 4 Cols) -->
			<div class="lg:col-span-4 space-y-6">
				
				<!-- 1. Digital Seva Kendra Services -->
				<div class="bg-white rounded-2xl border-2 border-orange-500/80 shadow-md p-5 space-y-4 relative overflow-hidden">
					<div class="bg-gradient-to-r from-orange-500 to-amber-600 -mx-5 -mt-5 p-4 text-white flex items-center justify-between">
						<div>
							<span class="text-[10px] font-black uppercase tracking-widest bg-black/30 px-2 py-0.5 rounded">డిజిటల్ సేవా కేంద్రం</span>
							<h4 class="text-base font-black mt-1">ముఖ్యమైన పౌర & రైతు సేవలు</h4>
						</div>
						<i class="fa-solid fa-laptop-code text-2xl text-yellow-200"></i>
					</div>

					<div class="grid grid-cols-2 gap-2.5 pt-1">
						{#each digitalServices as s}
							<a
								href="/"
								class="bg-orange-50/70 hover:bg-orange-100/80 border border-orange-200 rounded-xl p-2.5 flex flex-col justify-between group transition-all"
							>
								<div class="flex items-center gap-2 mb-1">
									<i class={`fa-solid ${s.icon} text-orange-600 text-sm group-hover:scale-110 transition-transform`}></i>
									<span class="text-xs font-bold text-slate-900 leading-tight">{s.name}</span>
								</div>
								<span class="text-[10px] text-slate-500 font-medium leading-tight">{s.desc}</span>
							</a>
						{/each}
					</div>

					<a
						href="/"
						class="w-full bg-slate-950 hover:bg-black text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow transition-all active:scale-95"
					>
						<span>అన్ని డిజిటల్ సేవలు చూడండి</span>
						<i class="fa-solid fa-arrow-right text-orange-400"></i>
					</a>
				</div>

				<!-- 2. High Impact Advertisement Box -->
				<div class="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-[10px] uppercase font-black tracking-widest bg-black/30 px-2 py-0.5 rounded">
							వాణిజ్య ప్రకటన / Sponsor Ad
						</span>
						<i class="fa-solid fa-bullhorn text-yellow-200"></i>
					</div>

					<h4 class="text-lg font-black leading-tight">
						మీ వ్యాపార ప్రకటన ఇక్కడ ఇవ్వండి!
					</h4>
					<p class="text-xs text-orange-100 leading-relaxed font-medium">
						వేలాది మంది పాఠకులకు మీ షాప్, వ్యాపారం, విద్యాసంస్థలు మరియు శుభకార్యాల ప్రకటనలు అతి తక్కువ ధరలో ప్రచారం చేసుకోండి.
					</p>

					<div class="pt-1">
						<a
							href="https://wa.me/919502336495?text=Hello,%20I%20want%20to%20place%20an%20Advertisement%20in%20NS%20News"
							target="_blank"
							rel="noreferrer"
							class="w-full bg-slate-950 hover:bg-black text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all active:scale-95"
						>
							<i class="fa-brands fa-whatsapp text-emerald-400 text-sm"></i>
							<span>యాడ్ బుకింగ్ కోసం WhatsApp చేయండి</span>
						</a>
					</div>
				</div>

				<!-- 3. Emergency Helplines & Live Weather Widget (Replaced Gold Rates) -->
				<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
					<div class="flex items-center justify-between border-b border-slate-100 pb-2">
						<span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
							<i class="fa-solid fa-phone-volume text-rose-600"></i> అత్యవసర హెల్ప్‌లైన్ నంబర్లు
						</span>
						<span class="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold">24x7 సేవలు</span>
					</div>

					<!-- Helpline Fast Dial Grid -->
					<div class="grid grid-cols-2 gap-2.5">
						{#each emergencyHelplines as h}
							<a
								href={`tel:${h.number}`}
								class="p-2.5 rounded-xl border flex items-center justify-between {h.color} hover:shadow-xs transition-all"
							>
								<div>
									<span class="text-[10px] font-bold block leading-none">{h.title}</span>
									<span class="text-sm font-black font-mono tracking-wider block mt-1">{h.number}</span>
								</div>
								<i class="fa-solid {h.icon} text-base opacity-75"></i>
							</a>
						{/each}
					</div>

					<!-- Live Weather Box -->
					<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center justify-between text-xs">
						<div class="flex items-center gap-2.5">
							<i class="fa-solid fa-cloud-sun text-2xl text-sky-600"></i>
							<div>
								<span class="font-bold text-slate-800 block">స్థానిక వాతావరణం</span>
								<span class="text-[10px] text-slate-500 font-medium">పెద్దపల్లి & ముత్తారం</span>
							</div>
						</div>
						<div class="text-right">
							<span class="text-sm font-black text-sky-800 font-mono block">{liveTemp}</span>
							<span class="text-[10px] text-sky-700 font-bold">{weatherDesc}</span>
						</div>
					</div>
				</div>

				<!-- 4. Parent Organization Contact Card -->
				<div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
					<div class="flex items-center gap-3 border-b border-slate-100 pb-3">
						<div class="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg">
							A
						</div>
						<div>
							<h5 class="font-bold text-slate-900 leading-none">A.S.V Enterprises</h5>
							<p class="text-xs text-slate-500 mt-1">Parent Organization & Digital Hub</p>
						</div>
					</div>

					<div class="space-y-2 text-xs text-slate-600">
						<p class="flex items-center gap-2">
							<i class="fa-solid fa-location-dot text-slate-400 w-4"></i>
							<span>ముత్తారం, పెద్దపల్లి జిల్లా, తెలంగాణ</span>
						</p>
						<p class="flex items-center gap-2">
							<i class="fa-solid fa-phone text-slate-400 w-4"></i>
							<span>+91 9502336495 / +91 9949122402</span>
						</p>
					</div>

					<div class="pt-2 border-t border-slate-100 flex items-center justify-between">
						<span class="text-xs font-bold text-slate-700">మమ్మల్ని కలవండి:</span>
						<div class="flex gap-2">
							<a href="https://wa.me/919502336495" target="_blank" rel="noreferrer" class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all" aria-label="WhatsApp">
								<i class="fa-brands fa-whatsapp text-sm"></i>
							</a>
							<a href="https://youtube.com" target="_blank" rel="noreferrer" class="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all" aria-label="YouTube">
								<i class="fa-brands fa-youtube text-sm"></i>
							</a>
						</div>
					</div>
				</div>

			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="bg-slate-950 text-slate-400 border-t border-slate-800 py-8 mt-auto text-xs">
		<div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
			<div>
				<p class="text-slate-300 font-bold">NS News — Powered by A.S.V Enterprises</p>
				<p class="mt-1 text-slate-500">© 2026 A.S.V Enterprises. All rights reserved.</p>
			</div>
			<div class="flex gap-4 font-semibold">
				<a href="/" class="text-orange-400 hover:underline">🏠 డిజిటల్ సేవలు (హోమ్)</a>
				<a href="/news" class="hover:text-white">న్యూస్ పోర్టల్</a>
				<a href="/admin/news" class="hover:text-white">అడ్మిన్ కంట్రోల్</a>
			</div>
		</div>
	</footer>
</div>

<style>
	@keyframes marquee {
		0% { transform: translateX(100%); }
		100% { transform: translateX(-100%); }
	}
	.animate-marquee {
		display: inline-block;
		white-space: nowrap;
		animation: marquee 35s linear infinite;
	}
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>