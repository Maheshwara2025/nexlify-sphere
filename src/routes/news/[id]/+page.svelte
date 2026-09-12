<script>
    export let data;

    // సర్వర్ / లోడర్ నుండి నేరుగా ఆర్టికల్ డేటా
    $: article = data?.article;
    $: loadError = data?.loadError;

    let fontSizeLevel = 1;

    const fontSizes = [
        'text-[15px] sm:text-[16px] leading-relaxed',
        'text-[17px] sm:text-[18px] leading-loose',
        'text-[19px] sm:text-[21px] leading-loose'
    ];

    function handlePrint() {
        window.print();
    }

    function shareWhatsApp() {
        if (!article) return;
        const text = `*${article.headline}*\n\n${article.subline_1 || ''}\n\nపూర్తి వివరాలు చదవండి:\nhttps://nexlifynucleus.in/news/${article.id}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
</script>

<svelte:head>
	<title>{article ? article.headline : 'వార్త'} | NS News</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
	<link href="https://fonts.googleapis.com/css2?family=Mandali&family=Ramabhadra&family=Noto+Sans+Telugu:wght@500;600;700;800;900&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<div class="min-h-screen bg-[#f3f4f6] text-slate-800 flex flex-col font-['Noto_Sans_Telugu',sans-serif] pb-20 sm:pb-8">
	
	<!-- Header -->
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

			<div class="flex items-center gap-3">
				<a
					href="/news"
					class="bg-slate-800 hover:bg-slate-700 text-xs px-3.5 py-2 rounded-xl border border-slate-700 font-bold text-slate-200 transition-all flex items-center gap-1.5"
				>
					<i class="fa-solid fa-arrow-left"></i> అన్ని వార్తలు
				</a>
			</div>
		</div>
	</header>

	<!-- 🔥 Clickable Smooth Live Ticker Strip 🔥 -->
	{#if tickerNews.length > 0}
		<div class="bg-[#b91c1c] text-white py-3 sm:py-3.5 flex items-center border-y-2 border-red-900 shadow-md relative z-30">
			<div class="bg-[#7f1d1d] px-4 sm:px-6 py-2 font-black text-xs sm:text-sm uppercase tracking-wider shrink-0 z-20 flex items-center gap-2 shadow-xl border-r border-red-500/50">
				<span class="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"></span>
				<i class="fa-solid fa-bolt text-yellow-300 text-sm"></i>
				<span class="font-['Ramabhadra'] text-white">లైవ్ న్యూస్</span>
			</div>
			
			<div class="overflow-hidden relative w-full flex items-center group">
				<div class="inline-block whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused]">
					{#each tickerNews as item}
						<button
							type="button"
							on:click={() => navigateToArticle(item.id)}
							class="inline-flex items-center mx-8 text-[15px] sm:text-[17px] font-bold text-white hover:text-yellow-200 transition-all tracking-wide cursor-pointer text-left focus:outline-none"
						>
							<span class="bg-black/40 text-yellow-300 border border-yellow-400/40 text-xs sm:text-sm px-2.5 py-0.5 rounded-md mr-2.5 font-bold">
								{item.location_town || item.category}
							</span>
							<span class="drop-shadow-xs">{item.headline}</span>
							<span class="mx-6 text-yellow-400 text-base font-black">✦</span>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- మెయిన్ కంటెంట్ -->
    <main class="max-w-4xl mx-auto px-4 py-6 sm:py-8 flex-grow w-full">
        {#if !article}
            <div class="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                <i class="fa-solid fa-triangle-exclamation text-4xl text-amber-500"></i>
                <h3 class="text-lg font-bold text-slate-800">వార్త అందుబాటులో లేదు లేదా తొలగించబడింది.</h3>
                {#if loadError}
                    <p class="text-xs text-rose-500">{loadError}</p>
                {/if}
                <a href="/news" class="inline-block bg-red-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-red-700 transition">
                    న్యూస్ హోమ్ పేజీకి వెళ్లండి
                </a>
            </div>
        {:else}

            <!-- టూల్‌బార్ (ఫాంట్ సైజ్ & ప్రింట్ బటన్లు) -->
            <div class="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs mb-4 print:hidden">
                <div class="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <span>అక్షరాల పరిమాణం:</span>
                    <button 
                        type="button" 
                        on:click={() => fontSizeLevel = 0} 
                        class="w-7 h-7 rounded-lg border flex items-center justify-center transition {fontSizeLevel === 0 ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'}">
                        A-
                    </button>
                    <button 
                        type="button" 
                        on:click={() => fontSizeLevel = 1} 
                        class="w-7 h-7 rounded-lg border flex items-center justify-center transition {fontSizeLevel === 1 ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'}">
                        A
                    </button>
                    <button 
                        type="button" 
                        on:click={() => fontSizeLevel = 2} 
                        class="w-7 h-7 rounded-lg border flex items-center justify-center transition {fontSizeLevel === 2 ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'}">
                        A+
                    </button>
                </div>

                <button
                    type="button"
                    on:click={handlePrint}
                    class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow transition active:scale-95"
                >
                    <i class="fa-solid fa-camera"></i>
                    <span>e-Paper క్లిప్పింగ్ డౌన్‌లోడ్</span>
                </button>
            </div>

            <!-- న్యూస్ పేపర్ స్టైల్ ఆర్టికల్ కార్డ్ -->
            <article class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 print:p-0 print:border-none print:shadow-none">
                
                <!-- పత్రిక మస్త్‌హెడ్ బ్యానర్ -->
                <div class="border-b-2 border-slate-900 pb-3 mb-5 flex items-end justify-between">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-black text-slate-950 font-['Ramabhadra'] tracking-tight">
                            NS NEWS
                        </h1>
                        <span class="text-[11px] text-slate-500 font-bold block">తెలుగు దినపత్రిక డిజిటల్ నెట్‌వర్క్</span>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-bold text-slate-900 block">{article.location_town || 'ముత్తారం'}</span>
                        <span class="text-[11px] text-slate-500 font-medium">
                            {new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                </div>

                <!-- ప్రధాన హెడ్‌లైన్ -->
                <h2 class="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 leading-snug tracking-tight mb-4 font-['Noto_Sans_Telugu']">
                    {article.headline}
                </h2>

                <!-- సబ్‌లైన్స్ (బుల్లెట్ పాయింట్లు) -->
                {#if article.subline_1}
                    <div class="bg-rose-50/60 border-l-4 border-red-600 p-3.5 rounded-r-xl mb-6 space-y-1.5">
                        <p class="text-sm sm:text-base font-bold text-red-950 flex items-start gap-2">
                            <span class="text-red-600">•</span> <span>{article.subline_1}</span>
                        </p>
                        {#if article.subline_2}
                            <p class="text-xs sm:text-sm font-semibold text-slate-700 flex items-start gap-2">
                                <span class="text-red-500">•</span> <span>{article.subline_2}</span>
                            </p>
                        {/if}
                        {#if article.subline_3}
                            <p class="text-xs sm:text-sm font-semibold text-slate-600 flex items-start gap-2">
                                <span class="text-red-500">•</span> <span>{article.subline_3}</span>
                            </p>
                        {/if}
                    </div>
                {/if}

                <!-- ఫోటో గ్యాలరీ సెక్షన్ (తలలు కట్ అవ్వకుండా స్పష్టమైన డిస్‌ప్లే) -->
                {#if article.image_url || article.image_url_2}
                    <div class="grid grid-cols-1 {article.image_url_2 ? 'md:grid-cols-2' : ''} gap-4 mb-6">
                        {#if article.image_url}
                            <div class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-xs flex items-center justify-center p-1">
                                <img
                                    src={article.image_url}
                                    alt={article.headline}
                                    class="w-full h-auto max-h-[460px] object-contain rounded-xl"
                                />
                                <div class="absolute bottom-3 right-3 bg-black/80 backdrop-blur text-white text-[10px] font-black px-2 py-0.5 rounded shadow uppercase">
                                    NS NEWS
                                </div>
                            </div>
                        {/if}

                        {#if article.image_url_2}
                            <div class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-xs flex items-center justify-center p-1">
                                <img
                                    src={article.image_url_2}
                                    alt={article.headline}
                                    class="w-full h-auto max-h-[460px] object-contain rounded-xl"
                                />
                                <div class="absolute bottom-3 right-3 bg-black/80 backdrop-blur text-white text-[10px] font-black px-2 py-0.5 rounded shadow uppercase">
                                    NS NEWS
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- లొకేషన్ & రిపోర్టర్ బైలైన్ -->
                <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 text-xs sm:text-sm font-bold text-slate-700">
                    <span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-md">
                        {article.location_town || 'ముత్తారం'} (NS News)
                    </span>
                    <span>:</span>
                    <span class="text-slate-500 font-medium">
                        {article.reporter_name ? `${article.reporter_name} ప్రతినిధి` : 'ముత్తారం ప్రతినిధి'}, {new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'long' })}
                    </span>
                </div>

                <!-- వార్త పూర్తి సమాచారం (బాడీ టెక్స్ట్) -->
                <div class="text-slate-900 font-normal whitespace-pre-line text-justify {fontSizes[fontSizeLevel]} font-['Noto_Sans_Telugu']">
                    {article.content || article.summary}
                </div>

                <!-- వార్త కింద సోషల్ షేరింగ్ బటన్ -->
                <div class="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between print:hidden">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-500">ఈ వార్తను షేర్ చేయండి:</span>
                        <button
                            type="button"
                            on:click={shareWhatsApp}
                            class="bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow transition active:scale-95"
                        >
                            <i class="fa-brands fa-whatsapp text-sm"></i> <span>WhatsApp</span>
                        </button>
                    </div>

                    <a href="/news" class="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
                        <span>ఇతర వార్తలు చూడండి</span> <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </a>
                </div>

            </article>
        {/if}
    </main>

	<!-- Mobile Floating WhatsApp Share Bar -->
	{#if article}
		<div class="sm:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-3 z-50 flex items-center justify-between gap-3 shadow-2xl">
			<span class="text-xs text-slate-300 font-bold truncate">వార్తను షేర్ చేయండి:</span>
			<a
				href={`https://api.whatsapp.com/send?text=${encodeURIComponent(article.headline + ' - NS News చదవండి: ' + (typeof window !== 'undefined' ? window.location.href : ''))}`}
				target="_blank"
				rel="noreferrer"
				class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow transition-all shrink-0"
			>
				<i class="fa-brands fa-whatsapp text-base"></i>
				<span>WhatsApp లో షేర్ చేయండి</span>
			</a>
		</div>
	{/if}

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
</style>