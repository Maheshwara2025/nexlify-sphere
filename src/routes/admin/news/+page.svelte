<script>
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let authChecking = true;

	onMount(async () => {
		const { data: { session } } = await supabase.auth.getSession();
		if (!session) {
			goto('/admin/login');
		} else {
			authChecking = false;
		}

		const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
			if (!session) {
				goto('/admin/login');
			}
		});

		return () => {
			authListener.subscription.unsubscribe();
		};
	});

	async function handleLogout() {
		await supabase.auth.signOut();
		goto('/admin/login');
	}

	// Smart Input Box
	let rawNewsInput = '';

	// Form Fields
	let location_town = 'ముత్తారం';
	let custom_town = '';
	let headline = '';
	let subline_1 = '';
	let subline_2 = '';
	let subline_3 = '';
	let news_tone = 'soft';
	let alert_type = 'none';
	let category = 'రాజకీయాలు';
	let content = '';
	let youtube_url = '';
	let show_in_ticker = true;

	// Media 1
	/** @type {File | null} */
	let imageFile1 = null;
	/** @type {string | null} */
	let imagePreview1 = null;
	let image_caption_1 = '';

	// Media 2
	/** @type {File | null} */
	let imageFile2 = null;
	/** @type {string | null} */
	let imagePreview2 = null;
	let image_caption_2 = '';

	let isUploading = false;
	let statusMsg = '';
	let statusType = '';

	const towns = [
		'ముత్తారం',
		'పెద్దపల్లి',
		'కరీంనగర్',
		'మంథని',
		'సుల్తానాబాద్',
		'గోదావరిఖని',
		'రామగుండం',
		'హైదరాబాద్',
		'తెలంగాణ',
		'జాతీయం',
		'ఇతర ఊరు (Type Below)'
	];

	const categories = [
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

	function autoParseNews() {
		if (!rawNewsInput.trim()) return;

		const lines = rawNewsInput
			.split('\n')
			.map(l => l.trim())
			.filter(l => l.length > 0);

		if (lines.length === 0) return;

		headline = lines[0];

		let sublines = [];
		let bodyStartIndex = 1;

		for (let i = 1; i < Math.min(lines.length, 5); i++) {
			const line = lines[i];
			const isBullet = /^([•\-\*■✦]|\d+[\.\)])\s*/.test(line);
			const isShortLine = line.length < 110 && !line.includes(':') && !line.includes('వివరాల్లోకి వెళ్తే');

			if (isBullet || isShortLine) {
				const cleanedLine = line.replace(/^([•\-\*■✦]|\d+[\.\)])\s*/, '').trim();
				if (cleanedLine) {
					sublines.push(cleanedLine);
					bodyStartIndex = i + 1;
				}
			} else {
				break;
			}
		}

		subline_1 = sublines[0] || '';
		subline_2 = sublines[1] || '';
		subline_3 = sublines[2] || '';

		let remaining = lines.slice(bodyStartIndex);
		let fullBody = remaining.join('\n\n');

		const townMatch = fullBody.match(/^([\u0C00-\u0C7F\w\s]+)\s*[:：\-–]\s*(.*)/s);
		if (townMatch && townMatch[1] && townMatch[1].length < 25) {
			const detectedTown = townMatch[1].trim();
			if (towns.includes(detectedTown)) {
				location_town = detectedTown;
			} else {
				location_town = 'ఇతర ఊరు (Type Below)';
				custom_town = detectedTown;
			}
			fullBody = townMatch[2].trim();
		}

		content = fullBody;
	}

	/**
	 * @param {Event} e
	 * @param {number} num
	 */
	function handleImageSelect(e, num) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		if (target && target.files && target.files[0]) {
			if (num === 1) {
				imageFile1 = target.files[0];
				imagePreview1 = URL.createObjectURL(imageFile1);
			} else {
				imageFile2 = target.files[0];
				imagePreview2 = URL.createObjectURL(imageFile2);
			}
		}
	}

	/**
	 * @param {File} file
	 */
	async function uploadSingleImage(file) {
		const fileExt = file.name.split('.').pop();
		const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
		const filePath = `articles/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('news-images')
			.upload(filePath, file, { cacheControl: '3600', upsert: true });

		if (uploadError) throw uploadError;

		const { data } = supabase.storage.from('news-images').getPublicUrl(filePath);
		return data.publicUrl;
	}

	async function handleSubmit() {
		if (!headline || !content) {
			statusMsg = 'దయచేసి హెడ్‌లైన్ మరియు వార్త వివరాలను నమోదు చేయండి.';
			statusType = 'error';
			return;
		}

		isUploading = true;
		statusMsg = '';

		const finalLocation = location_town === 'ఇతర ఊరు (Type Below)' 
			? (custom_town.trim() || 'తెలంగాణ') 
			: location_town;

		try {
			let imageUrl1 = null;
			let imageUrl2 = null;

			if (imageFile1) {
				imageUrl1 = await uploadSingleImage(imageFile1);
			}
			if (imageFile2) {
				imageUrl2 = await uploadSingleImage(imageFile2);
			}

			const { error } = await supabase.from('news_articles').insert([
				{
					location_town: finalLocation,
					headline,
					subline_1: subline_1 || null,
					subline_2: subline_2 || null,
					subline_3: subline_3 || null,
					news_tone,
					alert_type,
					category,
					content,
					image_url: imageUrl1,
					image_caption_1: image_caption_1 || null,
					image_url_2: imageUrl2,
					image_caption_2: image_caption_2 || null,
					youtube_url: youtube_url || null,
					show_in_ticker
				}
			]);

			if (error) throw error;

			statusMsg = 'వార్త విజయవంతంగా పబ్లిష్ అయ్యింది!';
			statusType = 'success';

			rawNewsInput = '';
			headline = '';
			subline_1 = '';
			subline_2 = '';
			subline_3 = '';
			content = '';
			imageFile1 = null;
			imagePreview1 = null;
			image_caption_1 = '';
			imageFile2 = null;
			imagePreview2 = null;
			image_caption_2 = '';
			youtube_url = '';
			custom_town = '';
		} catch (/** @type {any} */ err) {
			console.error('Submit Error:', err);
			statusMsg = `లోపం: ${err.message || 'మళ్లీ ప్రయత్నించండి'}`;
			statusType = 'error';
		} finally {
			isUploading = false;
		}
	}
</script>

<svelte:head>
	<title>NS News Smart Control Desk | A.S.V Enterprises</title>
</svelte:head>

{#if authChecking}
	<div class="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
		<div class="text-center space-y-3">
			<div class="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
			<p class="text-xs text-slate-400 font-medium">సెక్యూరిటీ చెక్ అవుతోంది...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 font-sans">
		<div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
			<!-- Master Header with Logout -->
			<!-- Master Header with Logout & Shorts -->
            <div class="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b-2 border-red-600">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-black text-xl shadow">
                        NS
                    </div>
                    <div>
                        <h1 class="text-lg font-bold">NS News Smart Control Desk</h1>
                        <p class="text-xs text-slate-400">తెలుగు దినపత్రిక డిజిటల్ నెట్‌వర్క్ • A.S.V Enterprises</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <!-- ⚡ NS Shorts అడ్మిన్ బటన్ -->
                    <a
                        href="/admin/shorts"
                        class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs px-3 py-2 rounded-xl font-extrabold transition-all shadow flex items-center gap-1.5"
                    >
                        <span class="text-amber-300 animate-pulse">⚡</span>
                        <span>NS Shorts</span>
                    </a>

                    <a
                        href="/news"
                        target="_blank"
                        class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-xl font-bold transition-all border border-slate-700"
                    >
                        పోర్టల్
                    </a>
                    <button
                        type="button"
                        on:click={handleLogout}
                        class="bg-slate-800 hover:bg-red-600 text-xs px-3 py-2 rounded-xl font-bold transition-all border border-slate-700 hover:border-red-600"
                    >
                        లాగౌట్
                    </button>
                </div>
            </div>
			<div class="p-6 sm:p-8 space-y-6">
				{#if statusMsg}
					<div class="p-4 rounded-xl text-sm font-semibold {statusType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
						{statusMsg}
					</div>
				{/if}

				<!-- Smart Auto-Parser Magic Box -->
				<div class="bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 p-5 rounded-2xl border-2 border-red-200 space-y-3">
					<div class="flex items-center justify-between">
						<label for="magic-box" class="text-xs font-black text-red-950 uppercase tracking-wider flex items-center gap-1.5">
							⚡ స్మార్ట్ ఆటో-ఫార్మాట్ బాక్స్ (మొత్తం వార్త ఇక్కడ పేస్ట్ చేయండి)
						</label>
						<button
							type="button"
							on:click={autoParseNews}
							class="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all active:scale-95"
						>
							✨ ఆటో ఫార్మాట్ చేయండి
						</button>
					</div>
					<textarea
						id="magic-box"
						bind:value={rawNewsInput}
						rows="4"
						placeholder="మీ వద్ద ఉన్న పూర్తి వార్తను (హెడ్‌లైన్ + బుల్లెట్లు + కథనం) ఇక్కడ పేస్ట్ చేసి 'ఆటో ఫార్మాట్ చేయండి' బటన్ నొక్కండి..."
						class="w-full px-4 py-3 rounded-xl border border-red-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-none leading-relaxed"
					></textarea>
				</div>

				<form on:submit|preventDefault={handleSubmit} class="space-y-6">
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
						<div>
							<label for="town-select" class="block text-xs font-bold text-slate-700 mb-1">లొకేషన్ / ఊరు *</label>
							<select
								id="town-select"
								bind:value={location_town}
								class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-red-500"
							>
								{#each towns as t}
									<option value={t}>{t}</option>
								{/each}
							</select>
							{#if location_town === 'ఇతర ఊరు (Type Below)'}
								<input
									type="text"
									bind:value={custom_town}
									placeholder="ఊరి పేరు టైప్ చేయండి (ఉదా: మంథని)"
									class="mt-2 w-full px-3 py-1.5 rounded-lg border border-red-300 text-xs font-semibold focus:ring-2 focus:ring-red-500"
									required
								/>
							{/if}
						</div>

						<div>
							<label for="news-cat" class="block text-xs font-bold text-slate-700 mb-1">కేటగిరీ *</label>
							<select
								id="news-cat"
								bind:value={category}
								class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-red-500"
							>
								{#each categories as cat}
									<option value={cat}>{cat}</option>
								{/each}
							</select>
						</div>

						<div>
							<span class="block text-xs font-bold text-slate-700 mb-1">న్యూస్ అలర్ట్</span>
							<div class="flex gap-1">
								<label class="flex-1 cursor-pointer">
									<input type="radio" bind:group={alert_type} value="none" class="sr-only peer" />
									<div class="text-center py-2 text-xs font-bold rounded-lg border border-slate-300 peer-checked:bg-slate-900 peer-checked:text-white">సాధారణం</div>
								</label>
								<label class="flex-1 cursor-pointer">
									<input type="radio" bind:group={alert_type} value="breaking" class="sr-only peer" />
									<div class="text-center py-2 text-xs font-bold rounded-lg border border-red-300 peer-checked:bg-red-600 peer-checked:text-white text-red-700">బ్రేకింగ్</div>
								</label>
								<label class="flex-1 cursor-pointer">
									<input type="radio" bind:group={alert_type} value="flash" class="sr-only peer" />
									<div class="text-center py-2 text-xs font-bold rounded-lg border border-amber-300 peer-checked:bg-amber-500 peer-checked:text-white text-amber-700">ఫ్లాష్</div>
								</label>
							</div>
						</div>
					</div>

					<div class="space-y-3">
						<div>
							<label for="headline" class="block text-sm font-bold text-slate-900 mb-1">ప్రధాన హెడ్‌లైన్ *</label>
							<input
								id="headline"
								type="text"
								bind:value={headline}
								placeholder="వార్త ప్రధాన ముఖ్యాంశం"
								class="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-base text-red-950 focus:ring-2 focus:ring-red-500 focus:outline-none"
								required
							/>
						</div>

						<div>
							<label for="sub1" class="block text-xs font-bold text-slate-700 mb-1">సబ్‌లైన్ 1 (ముఖ్యమైన పాయింట్)</label>
							<input
								id="sub1"
								type="text"
								bind:value={subline_1}
								placeholder="సబ్‌లైన్ 1"
								class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
							/>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label for="sub2" class="block text-xs font-medium text-slate-600 mb-1">సబ్‌లైన్ 2 (ఐచ్ఛికం)</label>
								<input
									id="sub2"
									type="text"
									bind:value={subline_2}
									placeholder="సబ్‌లైన్ 2"
									class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
								/>
							</div>
							<div>
								<label for="sub3" class="block text-xs font-medium text-slate-600 mb-1">సబ్‌లైన్ 3 (ఐచ్ఛికం)</label>
								<input
									id="sub3"
									type="text"
									bind:value={subline_3}
									placeholder="సబ్‌లైన్ 3"
									class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
								/>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
						<div class="space-y-2">
							<label for="photo1" class="block text-xs font-bold text-slate-900">ఫోటో 1 (ప్రధాన చిత్రం)</label>
							<input
								id="photo1"
								type="file"
								accept="image/*"
								on:change={(e) => handleImageSelect(e, 1)}
								class="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-100 file:text-red-700"
							/>
							{#if imagePreview1}
								<img src={imagePreview1} alt="Preview 1" class="h-28 w-full object-contain rounded-lg border border-slate-300 bg-white" />
							{/if}
							<input
								type="text"
								bind:value={image_caption_1}
								placeholder="ఫోటో 1 క్యాప్షన్ (చిత్రంలో ఎవరెవరు ఉన్నారు)"
								class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-red-500"
							/>
						</div>

						<div class="space-y-2">
							<label for="photo2" class="block text-xs font-bold text-slate-900">ఫోటో 2 (రెండవ చిత్రం - ఐచ్ఛికం)</label>
							<input
								id="photo2"
								type="file"
								accept="image/*"
								on:change={(e) => handleImageSelect(e, 2)}
								class="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700"
							/>
							{#if imagePreview2}
								<img src={imagePreview2} alt="Preview 2" class="h-28 w-full object-contain rounded-lg border border-slate-300 bg-white" />
							{/if}
							<input
								type="text"
								bind:value={image_caption_2}
								placeholder="ఫోటో 2 క్యాప్షన్"
								class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-red-500"
							/>
						</div>
					</div>

					<div>
						<label for="content" class="block text-sm font-bold text-slate-900 mb-1">వార్త పూర్తి కథనం (Content) *</label>
						<textarea
							id="content"
							bind:value={content}
							rows="7"
							placeholder="వార్త పూర్తి సమాచారం పేరాగ్రాఫ్‌ల రూపంలో..."
							class="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm leading-relaxed focus:ring-2 focus:ring-red-500 focus:outline-none"
							required
						></textarea>
					</div>

					<div class="flex flex-wrap items-center justify-between gap-4">
						<div class="flex items-center gap-2">
							<input
								id="ticker-check"
								type="checkbox"
								bind:checked={show_in_ticker}
								class="w-4 h-4 text-red-600 rounded border-slate-300"
							/>
							<label for="ticker-check" class="text-xs font-bold text-slate-700 cursor-pointer">లైవ్ న్యూస్ టిక్కర్‌లో చూపించు</label>
						</div>

						<div class="flex-1 max-w-xs">
							<input
								type="url"
								bind:value={youtube_url}
								placeholder="యూట్యూబ్ వీడియో లింక్ (ఐచ్ఛికం)"
								class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-red-500"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={isUploading}
						class="w-full bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-base"
					>
						{isUploading ? 'అప్‌లోడ్ అవుతోంది...' : 'వార్తను పబ్లిష్ చేయండి'}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}