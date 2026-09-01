<script>
	import { supabase } from '$lib/supabaseClient';

	let name = '';
	let phone = '';
	let service_type = 'ఆధార్ & గుర్తింపు సేవలు';
	let message = '';
	let statusMsg = '';
	let isSubmitting = false;

	// NS News Updates List
	const newsUpdates = [
		{ id: 1, tag: 'తాజా వార్త', title: 'రైతు భరోసా నిధుల జమ ప్రారంభం - స్టేటస్ చెక్ చేసుకోండి', date: 'ఆగస్టు 2026' },
		{ id: 2, tag: 'విద్యార్థి అప్‌డేట్', title: 'పోస్ట్ మెట్రిక్ స్కాలర్‌షిప్ దరఖాస్తు గడువు పొడిగింపు', date: 'ఆగస్టు 2026' },
		{ id: 3, tag: 'ప్రభుత్వ సేవ', title: 'ఆధార్ - రేషన్ కార్డు ఈ-కేవైసీ (e-KYC) ఉచిత అప్‌డేట్ అందుబాటులో ఉంది', date: 'ఆగస్టు 2026' },
		{ id: 4, tag: 'ఉద్యోగ సమాచారం', title: 'కొత్త ఉద్యోగ నోటిఫికేషన్ల ఆన్‌లైన్ అప్లికేషన్లు ప్రారంభం', date: 'ఆగస్టు 2026' }
	];

	// Available Services Data
	const services = [
		{
			icon: 'fa-id-card',
			iconBg: 'bg-indigo-100 text-indigo-700',
			title: 'ఆధార్ & గుర్తింపు సేవలు',
			desc: 'అప్‌డేట్స్, డౌన్‌లోడ్ మరియు కరెక్షన్స్'
		},
		{
			icon: 'fa-wheat-awn',
			iconBg: 'bg-emerald-100 text-emerald-700',
			title: 'రైతు సేవలు & వ్యవసాయం',
			desc: 'PM-కిసాన్, ఈ-క్రాప్, సబ్సిడీ అప్లికేషన్లు'
		},
		{
			icon: 'fa-scroll',
			iconBg: 'bg-amber-100 text-amber-700',
			title: 'భూభారతి & రెవెన్యూ',
			desc: 'పహణీ, 1B, రిజిస్ట్రేషన్ స్లాట్ బుకింగ్'
		},
		{
			icon: 'fa-graduation-cap',
			iconBg: 'bg-blue-100 text-blue-700',
			title: 'విద్యార్థి & ప్రభుత్వ పథకాలు',
			desc: 'స్కాలర్‌షిప్‌లు, ప్రవేశ పరీక్షల దరఖాస్తులు'
		},
		{
			icon: 'fa-shield-halved',
			iconBg: 'bg-rose-100 text-rose-700',
			title: 'ఇన్సూరెన్స్ & హెల్త్ సేవలు',
			desc: 'జీవిత, వాహన బీమా మరియు ఆయుష్మాన్ భారత్'
		},
		{
			icon: 'fa-print',
			iconBg: 'bg-teal-100 text-teal-700',
			title: 'డిజిటల్ పేమెంట్స్ & ప్రింటింగ్',
			desc: 'జెరాక్స్, కలర్ ప్రింట్స్, బిల్ చెల్లింపులు'
		}
	];

	async function handleSubmit() {
		if (!name || !phone) {
			statusMsg = 'దయచేసి పేరు మరియు మొబైల్ నంబర్ నమోదు చేయండి.';
			return;
		}

		isSubmitting = true;
		statusMsg = '';

		try {
			const { data, error } = await supabase
				.from('service_requests')
				.insert([{ name, phone, service_type, message }]);

			if (error) {
				console.error('Supabase error:', error);
				statusMsg = 'లోపం జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.';
			} else {
				statusMsg = 'మీ అభ్యర్థన విజయవంతంగా నమోదైంది! మేము త్వరలోనే సంప్రదిస్తాము.';
				name = '';
				phone = '';
				message = '';
			}
		} catch (err) {
			console.error('Submit error:', err);
			statusMsg = 'సర్వర్ ఎర్రర్ ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Nexlify Sphere Digital Express | డిజిటల్ సర్వీసెస్ పోర్టల్</title>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans">
	<!-- Top Navigation -->
	<header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
		<div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="w-11 h-11 bg-orange-600 text-white rounded-xl flex items-center justify-center font-bold text-2xl shadow-md shadow-orange-200">
					N
				</div>
				<div>
					<h1 class="text-xl font-bold text-slate-900 tracking-tight leading-none">
						Nexlify Sphere
					</h1>
					<p class="text-xs font-semibold text-orange-600 mt-1">Digital Express</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<a
					href="#booking-form"
					class="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95"
				>
					సర్వీస్ బుకింగ్
				</a>
			</div>
		</div>
	</header>

	<!-- NS News Ticker & Wing -->
	<section class="bg-slate-900 text-white py-2.5 border-b border-slate-800">
		<div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center gap-3">
			<div class="flex items-center gap-2 bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shrink-0">
				<i class="fa-solid fa-bolt animate-pulse"></i>
				<span>NS News</span>
			</div>
			<div class="overflow-x-auto whitespace-nowrap text-sm text-slate-300 w-full flex items-center gap-6 no-scrollbar">
				{#each newsUpdates as news}
					<div class="flex items-center gap-2 shrink-0">
						<span class="bg-slate-800 text-orange-400 text-xs px-2 py-0.5 rounded font-medium">{news.tag}</span>
						<span>{news.title}</span>
						<span class="text-slate-600">•</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Main Content Area -->
	<main class="max-w-6xl mx-auto px-4 py-10 flex-grow w-full">
		<!-- Hero Section -->
		<div class="text-center max-w-3xl mx-auto mb-12">
			<span class="inline-block bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold px-3 py-1 rounded-full mb-4">
				గ్రామీణ & డిజిటల్ సేవలు
			</span>
			<h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">
				మీ డిజిటల్ & ప్రభుత్వ సేవల అవసరాలు <br />
				<span class="text-orange-600">అన్నీ ఒకే చోట</span>
			</h2>
			<p class="text-slate-600 text-base sm:text-lg">
				అన్ని రకాల ప్రభుత్వ పథకాలు, పౌర మరియు ఆన్‌లైన్ దరఖాస్తు సేవలను సులభంగా పొందండి.
			</p>
		</div>
        <!-- Main NS News Hero Banner -->
<section class="max-w-6xl mx-auto px-4 pt-6 pb-2">
    <a 
        href="/news" 
        class="block relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-700 via-rose-600 to-orange-600 p-6 sm:p-10 text-white shadow-xl hover:shadow-2xl transition-all group border border-red-500/30"
    >
        <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="text-center md:text-left space-y-2">
                <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-satellite-dish animate-pulse text-yellow-300"></i>
                    లైవ్ డిజిటల్ మీడియా వింగ్
                </div>
                <h2 class="text-3xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center md:justify-start gap-3">
                    NS NEWS <span class="text-yellow-300 text-2xl sm:text-3xl font-bold">ఎక్స్‌ప్రెస్</span>
                </h2>
                <p class="text-red-100 text-sm sm:text-base max-w-xl">
                    రాష్ట్ర, జాతీయ, అంతర్జాతీయ తాజా వార్తలు, పథకాల సమాచారం, నోటిఫికేషన్ల సమగ్ర విశ్లేషణ.
                </p>
            </div>
            <div class="shrink-0">
                <span class="inline-flex items-center gap-3 bg-white text-red-700 font-bold px-6 py-3.5 rounded-2xl shadow-lg group-hover:scale-105 transition-all">
                    న్యూస్ పోర్టల్ ఓపెన్ చేయండి
                    <i class="fa-solid fa-arrow-right"></i>
                </span>
            </div>
        </div>
    </a>
</section>

		<!-- NS News Cards Section -->
		<div class="mb-14">
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-2">
					<div class="w-2.5 h-6 bg-orange-600 rounded-full"></div>
					<h3 class="text-xl font-bold text-slate-900">NS News & తాజా అప్‌డేట్స్</h3>
				</div>
				<span class="text-xs text-slate-500 font-medium">లైవ్ సమాచారం</span>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each newsUpdates as item}
					<div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
						<div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 text-lg">
							<i class="fa-solid fa-newspaper"></i>
						</div>
						<div class="flex-grow">
							<div class="flex items-center justify-between mb-1">
								<span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{item.tag}</span>
								<span class="text-xs text-slate-400">{item.date}</span>
							</div>
							<p class="text-slate-800 font-medium text-sm sm:text-base leading-snug">{item.title}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
<!-- 📢 Main Home Page Advertisement & News Promotion Banner 📢 -->
<div class="max-w-7xl mx-auto px-4 my-8">
	<div class="bg-gradient-to-r from-orange-600 via-amber-500 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-orange-400/40">
		<div class="space-y-2 text-center md:text-left">
			<span class="text-[11px] font-black uppercase tracking-widest bg-black/30 px-3 py-1 rounded-full inline-block">
				📢 లోకల్ అడ్వర్టైజింగ్ & ప్రమోషన్స్
			</span>
			<h3 class="text-xl sm:text-2xl font-black">మీ వ్యాపార ప్రకటనలు వేలాది మందికి చేరవేయండి!</h3>
			<p class="text-xs sm:text-sm text-orange-100 max-w-xl">
				షాపులు, రియల్ ఎస్టేట్, విద్యాసంస్థలు మరియు శుభకార్యాల ప్రకటనలు NS News మరియు డిజిటల్ నెట్‌వర్క్‌లో ప్రచారం చేసుకోండి.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-3 shrink-0">
			<a
				href="/news"
				class="bg-white hover:bg-slate-100 text-slate-900 font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow transition-all active:scale-95 flex items-center gap-2"
			>
				<i class="fa-solid fa-newspaper text-red-600"></i>
				<span>NS News పోర్టల్</span>
			</a>
			<a
				href="https://wa.me/919502336495?text=Hello,%20I%20want%20to%20give%20an%20Ad%20in%20NS%20News%20Portal"
				target="_blank"
				rel="noreferrer"
				class="bg-slate-950 hover:bg-black text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow transition-all active:scale-95 flex items-center gap-2"
			>
				<i class="fa-brands fa-whatsapp text-emerald-400 text-base"></i>
				<span>యాడ్ బుకింగ్ (WhatsApp)</span>
			</a>
		</div>
	</div>
</div>









		<!-- Services Grid -->
		<div class="mb-16">
			<div class="text-center mb-8">
				<h3 class="text-2xl font-bold text-slate-900">అందుబాటులో ఉన్న సేవలు</h3>
				<p class="text-sm text-slate-500 mt-1">మీకు కావాల్సిన సేవను ఎంచుకోండి</p>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each services as s}
					<div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
						<div class="w-12 h-12 rounded-xl {s.iconBg} flex items-center justify-center text-xl mb-4 group-hover:scale-105 transition-transform">
							<i class="fa-solid {s.icon}"></i>
						</div>
						<h4 class="text-lg font-bold text-slate-900 mb-1">{s.title}</h4>
						<p class="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Service Request / Booking Form -->
		<div id="booking-form" class="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
			<div class="text-center mb-6">
				<h3 class="text-2xl font-bold text-slate-900">సేవ కోసం అభ్యర్థించండి</h3>
				<p class="text-sm text-slate-500 mt-1">మీ వివరాలను ఇక్కడ నమోదు చేయండి</p>
			</div>

			<form on:submit|preventDefault={handleSubmit} class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-semibold text-slate-700 mb-1">పూర్తి పేరు</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder="మీ పేరు నమోదు చేయండి"
						class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
						required
					/>
				</div>

				<div>
					<label for="phone" class="block text-sm font-semibold text-slate-700 mb-1">మొబైల్ నంబర్</label>
					<input
						id="phone"
						type="tel"
						bind:value={phone}
						placeholder="ఉదా: 9876543210"
						class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
						required
					/>
				</div>

				<div>
					<label for="service" class="block text-sm font-semibold text-slate-700 mb-1">కావలసిన సేవ</label>
					<select
						id="service"
						bind:value={service_type}
						class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
					>
						<option value="ఆధార్ & గుర్తింపు సేవలు">ఆధార్ & గుర్తింపు సేవలు</option>
						<option value="రైతు సేవలు & వ్యవసాయం">రైతు సేవలు & వ్యవసాయం</option>
						<option value="భూభారతి & రెవెన్యూ">భూభారతి & రెవెన్యూ</option>
						<option value="విద్యార్థి & ప్రభుత్వ పథకాలు">విద్యార్థి & ప్రభుత్వ పథకాలు</option>
						<option value="ఇన్సూరెన్స్ & హెల్త్ సేవలు">ఇన్సూరెన్స్ & హెల్త్ సేవలు</option>
						<option value="డిజిటల్ పేమెంట్స్ & ప్రింటింగ్">డిజిటల్ పేమెంట్స్ & ప్రింటింగ్</option>
						<option value="ఇతర సేవలు">ఇతర సేవలు</option>
					</select>
				</div>
				

				<div>
					<label for="message" class="block text-sm font-semibold text-slate-700 mb-1">అదనపు వివరాలు (ఐచ్ఛికం)</label>
					<textarea
						id="message"
						bind:value={message}
						rows="3"
						placeholder="మీకు అవసరమైన వివరాలు రాయండి..."
						class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
					></textarea>
				</div>

				{#if statusMsg}
					<div class="p-3 rounded-xl text-sm font-medium text-center {statusMsg.includes('విజయవంతంగా') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
						{statusMsg}
					</div>
				{/if}

				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-orange-200"
				>
					{isSubmitting ? 'నమోదు అవుతోంది...' : 'అభ్యర్థనను సమర్పించండి'}
				</button>
			</form>
		</div>
	</main>

	<!-- Footer with Social Media Links and A.S.V Enterprises Copyright -->
	<footer class="bg-white border-t border-slate-200 mt-16 py-8 text-slate-600">
		<div class="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
			<!-- Brand Info -->
			<div class="text-center md:text-left">
				<div class="flex items-center justify-center md:justify-start gap-2 mb-1">
					<div class="w-6 h-6 bg-orange-600 text-white rounded-md flex items-center justify-center font-bold text-xs">
						N
					</div>
					<span class="font-bold text-slate-900">Nexlify Sphere</span>
				</div>
				<p class="text-xs text-slate-500">Digital Express Services Portal</p>
			</div>

			<!-- Social Media Links -->
			<div class="flex items-center gap-4">
				<a
					href="https://wa.me/919949122402"
					target="_blank"
					rel="noreferrer"
					class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-sm"
					title="WhatsApp"
				>
					<i class="fa-brands fa-whatsapp text-lg"></i>
				</a>
				<a
					href="https://t.me"
					target="_blank"
					rel="noreferrer"
					class="w-10 h-10 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white flex items-center justify-center transition-all shadow-sm"
					title="Telegram"
				>
					<i class="fa-brands fa-telegram text-lg"></i>
				</a>
				<a
					href="https://youtube.com"
					target="_blank"
					rel="noreferrer"
					class="w-10 h-10 rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all shadow-sm"
					title="YouTube"
				>
					<i class="fa-brands fa-youtube text-lg"></i>
				</a>
				<a
					href="https://instagram.com"
					target="_blank"
					rel="noreferrer"
					class="w-10 h-10 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-all shadow-sm"
					title="Instagram"
				>
					<i class="fa-brands fa-instagram text-lg"></i>
				</a>
			</div>

			<!-- Copyright Info -->
			<div class="text-center md:text-right text-xs text-slate-500">
				<p>© 2026 A.S.V Enterprises. All rights reserved.</p>
				<p class="mt-0.5 text-slate-400">Powered by Nexlify Sphere Digital Express</p>
			</div>
		</div>
	</footer>

	<!-- Floating WhatsApp Quick Button -->
	<a
		href="https://wa.me/919949122402"
		target="_blank"
		rel="noreferrer"
		class="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-50 hover:scale-110 active:scale-95"
		title="WhatsApp లో చాట్ చేయండి"
	>
		<i class="fa-brands fa-whatsapp text-3xl"></i>
	</a>
</div>

<style>
	/* Hide horizontal scrollbar for news ticker */
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>