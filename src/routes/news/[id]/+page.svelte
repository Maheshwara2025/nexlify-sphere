<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import html2canvas from 'html2canvas';

	/** @type {any} */
	let article = null;
	/** @type {any[]} */
	let tickerNews = [];
	let loading = true;
	let isClipping = false;
	let fontSizeLevel = 1; // 0: Small, 1: Normal, 2: Large

	/** @type {HTMLElement} */
	let articleElement;

	const fontSizes = ['text-base leading-relaxed', 'text-lg leading-loose', 'text-xl leading-loose'];

	// Reactive auto-fetch when news ticker item is clicked
	$: if ($page.params.id) {
		loadArticleData($page.params.id);
	}

	async function loadArticleData(id) {
		loading = true;
		try {
			const { data: artData, error: artError } = await supabase
				.from('news_articles')
				.select('*')
				.eq('id', id)
				.single();

			if (artError) throw artError;
			article = artData;
		} catch (err) {
			console.error('Error loading article:', err);
		} finally {
			loading = false;
		}
	}

	async function fetchTickerNews() {
		try {
			const { data: tickData } = await supabase
				.from('news_articles')
				.select('id, headline, category, location_town, show_in_ticker')
				.eq('show_in_ticker', true)
				.order('created_at', { ascending: false });

			tickerNews = tickData || [];
		} catch (err) {
			console.error('Error fetching ticker:', err);
		}
	}

	onMount(() => {
		fetchTickerNews();
	});

	function navigateToArticle(id) {
		goto(`/news/${id}`);
	}

	async function downloadEpaperClipping() {
		if (!articleElement) return;
		isClipping = true;

		try {
			const canvas = await html2canvas(articleElement, {
				scale: 2,
				useCORS: true,
				allowTaint: true,
				backgroundColor: '#fefefe'
			});

			const image = canvas.toDataURL('image/png');
			const link = document.createElement('a');
			link.href = image;
			link.download = `NS_News_${article.location_town || 'Clipping'}_${Date.now()}.png`;
			link.click();
		} catch (error) {
			console.error('Clipping error:', error);
			alert('క్లిప్పింగ్ డౌన్‌లోడ్ చేయడంలో సమస్య వచ్చింది. మళ్లీ ప్రయత్నించండి.');
		} finally {
			isClipping = false;
		}
	}

	$: contentParagraphs = article && article.content ? article.content.split('\n\n').filter(p => p.trim()) : [];
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

	<main class="max-w-4xl mx-auto px-4 py-8 flex-grow w-full">
		{#if loading}
			<div class="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
				<i class="fa-solid fa-circle-notch fa-spin text-4xl text-red-600 mb-3"></i>
				<p class="text-base text-slate-600 font-bold">వార్త లోడ్ అవుతోంది...</p>
			</div>
		{:else if !article}
			<div class="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
				<i class="fa-regular fa-newspaper text-5xl text-slate-300"></i>
				<h3 class="text-xl font-bold text-slate-800">వార్త లభించలేదు</h3>
				<a href="/news" class="inline-block bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl">
					← న్యూస్ హోమ్‌కి వెళ్లండి
				</a>
			</div>
		{:else}
			
			<!-- Controls Bar (Font Zoom + e-Paper Clipping) -->
			<div class="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
				<div class="flex items-center gap-3">
					<span class="text-xs font-bold text-slate-500">అక్షరాల పరిమాణం:</span>
					<div class="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
						<button
							type="button"
							on:click={() => fontSizeLevel = 0}
							class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all {fontSizeLevel === 0 ? 'bg-white shadow text-red-600' : 'text-slate-600 hover:text-black'}"
							title="చిన్న అక్షరాలు"
						>A-</button>
						<button
							type="button"
							on:click={() => fontSizeLevel = 1}
							class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all {fontSizeLevel === 1 ? 'bg-white shadow text-red-600' : 'text-slate-600 hover:text-black'}"
							title="సాధారణ సైజు"
						>A</button>
						<button
							type="button"
							on:click={() => fontSizeLevel = 2}
							class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all {fontSizeLevel === 2 ? 'bg-white shadow text-red-600' : 'text-slate-600 hover:text-black'}"
							title="పెద్ద అక్షరాలు"
						>A+</button>
					</div>
				</div>

				<button
					type="button"
					on:click={downloadEpaperClipping}
					disabled={isClipping}
					class="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95"
				>
					<i class="fa-solid {isClipping ? 'fa-circle-notch fa-spin' : 'fa-camera'}"></i>
					<span>{isClipping ? 'తయారవుతోంది...' : 'e-Paper క్లిప్పింగ్ డౌన్‌లోడ్'}</span>
				</button>
			</div>

			<!-- 📰 Authentic Newspaper Canvas 📰 -->
			<div
				bind:this={articleElement}
				class="bg-[#fffdfa] rounded-2xl border-2 border-red-950/20 p-6 sm:p-10 shadow-lg space-y-6 text-[#111827]"
			>
				<!-- Newspaper Header Banner -->
				<div class="border-b-4 border-double border-red-950 pb-3 flex items-center justify-between">
					<div>
						<h1 class="text-2xl sm:text-3xl font-black font-['Ramabhadra'] text-red-950 tracking-tight leading-none">
							NS NEWS
						</h1>
						<p class="text-[11px] font-bold text-slate-600 uppercase tracking-widest mt-1">తెలుగు దినపత్రిక డిజిటల్ నెట్‌వర్క్</p>
					</div>
					<div class="text-right text-xs font-bold text-slate-700">
						<span class="block text-red-700">{article.location_town || 'తెలంగాణ'}</span>
						<span>{new Date(article.created_at).toLocaleDateString('te-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
					</div>
				</div>

				<!-- Headline -->
				<h2 class="text-2xl sm:text-3xl lg:text-4xl font-black text-[#881337] leading-snug tracking-tight font-['Ramabhadra']">
					{article.headline}
				</h2>

				<!-- Sublines -->
				{#if article.subline_1}
					<div class="bg-rose-50/70 border-l-4 border-rose-600 p-4 rounded-r-xl space-y-1">
						<p class="text-sm sm:text-base font-bold text-rose-950 flex items-start gap-2">
							<span class="text-rose-600 font-black">•</span> {article.subline_1}
						</p>
						{#if article.subline_2}
							<p class="text-xs sm:text-sm font-semibold text-rose-900 flex items-start gap-2 pl-4">
								<span class="text-rose-400">•</span> {article.subline_2}
							</p>
						{/if}
						{#if article.subline_3}
							<p class="text-xs sm:text-sm font-semibold text-rose-900 flex items-start gap-2 pl-4">
								<span class="text-rose-400">•</span> {article.subline_3}
							</p>
						{/if}
					</div>
				{/if}

				<!-- Dual Images -->
				{#if article.image_url || article.image_url_2}
					<div class="grid grid-cols-1 {article.image_url && article.image_url_2 ? 'sm:grid-cols-2' : ''} gap-4 pt-2">
						{#if article.image_url}
							<div class="space-y-1.5">
								<div class="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
									<img src={article.image_url} alt="News 1" class="w-full h-56 sm:h-64 object-cover" />
									<span class="absolute bottom-2 right-2 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow">NS NEWS</span>
								</div>
								{#if article.image_caption_1}
									<p class="text-xs text-slate-600 font-semibold bg-slate-100 p-2 rounded-lg border border-slate-200">
										📷 <strong>చిత్రం:</strong> {article.image_caption_1}
									</p>
								{/if}
							</div>
						{/if}

						{#if article.image_url_2}
							<div class="space-y-1.5">
								<div class="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
									<img src={article.image_url_2} alt="News 2" class="w-full h-56 sm:h-64 object-cover" />
									<span class="absolute bottom-2 right-2 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow">NS NEWS</span>
								</div>
								{#if article.image_caption_2}
									<p class="text-xs text-slate-600 font-semibold bg-slate-100 p-2 rounded-lg border border-slate-200">
										📷 <strong>చిత్రం:</strong> {article.image_caption_2}
									</p>
								{/if}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Main News Body with In-Article Ad Box -->
				<div class="pt-2 {fontSizes[fontSizeLevel]} text-slate-900 font-medium space-y-4 whitespace-pre-line text-justify">
					{#if contentParagraphs.length > 0}
						<p>
							{#if article.location_town}
								<span class="bg-red-50 text-red-800 border border-red-300 font-black px-2.5 py-1 rounded-md text-sm mr-2 inline-block shadow-2xs">
									{article.location_town} (NS News):
								</span>
							{/if}
							{contentParagraphs[0]}
						</p>

						<!-- In-Article Sponsor Ad -->
						<div class="my-6 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-2 border-orange-400 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm not-prose">
							<div class="flex items-center gap-3.5">
								<div class="w-11 h-11 bg-orange-600 text-white rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow">
									<i class="fa-solid fa-bullhorn"></i>
								</div>
								<div>
									<span class="text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-200/80 px-2 py-0.5 rounded">
										ప్రకటన / Local Sponsor
									</span>
									<h4 class="text-sm sm:text-base font-black text-slate-900 mt-0.5">మీ వ్యాపార ప్రకటన ఇక్కడ ఇవ్వండి!</h4>
									<p class="text-xs text-slate-600">అతి తక్కువ ధరకు వేలాది మంది పాఠకులకు మీ షాప్ లేదా సర్వీస్ ప్రచారం చేసుకోండి.</p>
								</div>
							</div>
							<a
								href="https://wa.me/919502336495?text=Hello,%20I%20want%20to%20place%20an%20Ad%20in%20NS%20News"
								target="_blank"
								rel="noreferrer"
								class="shrink-0 bg-slate-950 hover:bg-black text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all active:scale-95"
							>
								<i class="fa-brands fa-whatsapp text-emerald-400 text-base"></i>
								<span>WhatsApp బుకింగ్</span>
							</a>
						</div>

						{#each contentParagraphs.slice(1) as para}
							<p>{para}</p>
						{/each}
					{:else}
						<p>{article.content}</p>
					{/if}
				</div>

				<!-- Newspaper Clip Footer Credit -->
				<div class="border-t-2 border-slate-300 pt-3 flex items-center justify-between text-[11px] font-bold text-slate-500">
					<span>A.S.V Enterprises Digital Media Network</span>
					<span>www.nexlify-sphere.pages.dev</span>
				</div>
			</div>

			<!-- Bottom Sponsor Ad Box -->
			<div class="mt-6 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
				<div class="space-y-1 text-center sm:text-left">
					<span class="text-[10px] font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded inline-block">
						వాణిజ్య ప్రకటన / Sponsor Ad
					</span>
					<h4 class="text-base sm:text-lg font-black">మీ వ్యాపార ప్రకటనల కోసం సంప్రదించండి</h4>
					<p class="text-xs text-orange-100">అతి తక్కువ ధరలో స్థానిక ప్రజలకు మీ వ్యాపారాన్ని చేరవేయండి.</p>
				</div>
				<a
					href="https://wa.me/919502336495?text=Hello,%20I%20want%20to%20place%20an%20Advertisement%20in%20NS%20News"
					target="_blank"
					rel="noreferrer"
					class="shrink-0 bg-slate-950 hover:bg-black text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all active:scale-95"
				>
					<i class="fa-brands fa-whatsapp text-emerald-400 text-base"></i>
					<span>WhatsApp లో బుక్ చేయండి</span>
				</a>
			</div>
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