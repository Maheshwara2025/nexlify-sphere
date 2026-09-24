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

    const headlineColors = [
        '#dc2626', '#1d4ed8', '#047857', '#7c3aed', 
        '#c2410c', '#0f766e', '#be123c', '#4338ca', '#831843'
    ];

    let rawNewsInput = '';

    // Form Fields
    let location_town = 'ముత్తారం';
    let custom_town = '';
    let headline = '';
    let alert_type = 'none';
    let category = 'రాజకీయాలు';
    let content = '';
    let youtube_url = '';
    let show_in_ticker = true;

    // Photo Layout Options
    let image_layout = 'full'; 
    let is_rounded = true;

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
        'ముత్తారం', 'పెద్దపల్లి', 'కరీంనగర్', 'మంథని', 'సుల్తానాబాద్',
        'గోదావరిఖని', 'రామగుండం', 'హైదరాబాద్', 'తెలంగాణ', 'జాతీయం',
        'ఇతర ఊరు (Type Below)'
    ];

    const categories = [
        'రాజకీయాలు', 'వ్యాపారం & ఫైనాన్స్', 'టెక్నాలజీ', 'ఆరోగ్యం',
        'వాతావరణం & పర్యావరణం', 'విద్య & ఉద్యోగాలు', 'సైన్స్ & పరిశోధనలు',
        'క్రీడలు & గేమ్స్', 'సంస్కృతి & సమాజం', 'ప్రపంచ వార్తలు'
    ];

    function autoParseNews() {
        if (!rawNewsInput || !rawNewsInput.trim()) {
            alert('Dayachesi mundhuga vartha text nu box lo paste cheyandi!');
            return;
        }

        let lines = rawNewsInput
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        if (lines.length === 0) return;

        headline = lines[0]
            .replace(/^[*#•■✦\d+.\-\)]+\s*/, '')
            .replace(/\s+/g, ' ')
            .trim();

        let fullBody = lines.slice(1).join('\n\n').trim();

        if (lines.length === 1 && lines[0].length > 80) {
            const sentences = lines[0].split(/(?<=[।!?.\n])\s+/);
            if (sentences.length > 1) {
                headline = sentences[0].replace(/^[*#•■✦-]+\s*/, '').trim();
                fullBody = sentences.slice(1).join('\n\n').trim();
            } else {
                headline = lines[0].substring(0, 80).trim();
                fullBody = lines[0];
            }
        }

        const townMatch = fullBody.match(/^([\u0C00-\u0C7F\w\s\(\)]+)\s*[:：\-–]\s*(.*)/s);
        if (townMatch && townMatch[1] && townMatch[1].length < 35) {
            const rawTown = townMatch[1].replace(/\(.*?\)/g, '').trim();
            if (towns.includes(rawTown)) {
                location_town = rawTown;
            } else if (rawTown) {
                location_town = 'ఇతర ఊరు (Type Below)';
                custom_town = rawTown;
            }
            fullBody = townMatch[2].trim();
        }

        content = fullBody || headline;

        const fullText = rawNewsInput;
        for (const t of towns) {
            if (t !== 'ఇతర ఊరు (Type Below)' && fullText.includes(t)) {
                location_town = t;
                break;
            }
        }

        if (fullText.includes('పాఠశాల') || fullText.includes('విద్యార్థు') || fullText.includes('School') || fullText.includes('College')) {
            category = 'విద్య & ఉద్యోగాలు';
        } else if (fullText.includes('మంత్రి') || fullText.includes('ఎమ్మెల్యే') || fullText.includes('MLA') || fullText.includes('MP')) {
            category = 'రాజకీయాలు';
        } else if (fullText.includes('రైతు') || fullText.includes('వ్యవసాయ') || fullText.includes('Farmer')) {
            category = 'వాతావరణం & పర్యావరణం';
        } else if (fullText.includes('Ganesh') || fullText.includes('నవరాత్రి') || fullText.includes('ఉత్సవ') || fullText.includes('Temple')) {
            category = 'సంస్కృతి & సమాజం';
        }
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
                if (image_layout === 'full') {
                    image_layout = 'grid';
                }
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
            statusMsg = 'Dayachesi headline mariyu content vivaralu enter cheyandi.';
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

            // Layout code safe format
            const layoutStyleCode = `${image_layout}|${is_rounded ? 'rounded' : 'sharp'}`;

            const { error } = await supabase.from('news_articles').insert([
                {
                    location_town: finalLocation,
                    headline,
                    // subline_1 lo layoutStyleCode save avuthundi (Constraint errors raavu)
                    subline_1: layoutStyleCode,
                    subline_2: '',
                    subline_3: '',
                    // news_tone ki eppatilaage 'soft' pampadam valla constraint error raadu
                    news_tone: 'soft',
                    alert_type,
                    category,
                    content,
                    image_url: imageUrl1,
                    image_caption_1: image_caption_1 || '',
                    image_url_2: imageUrl2,
                    image_caption_2: image_caption_2 || '',
                    youtube_url: youtube_url || null,
                    show_in_ticker
                }
            ]);

            if (error) throw error;

            statusMsg = 'వార్త విజయవంతంగా పబ్లిష్ అయ్యింది!';
            statusType = 'success';

            rawNewsInput = '';
            headline = '';
            content = '';
            imageFile1 = null;
            imagePreview1 = null;
            image_caption_1 = '';
            imageFile2 = null;
            imagePreview2 = null;
            image_caption_2 = '';
            youtube_url = '';
            custom_town = '';
            image_layout = 'full';
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
    <div class="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 font-sans">
        <div class="max-w-5xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            
            <div class="bg-slate-950 px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-white border-b-2 border-red-600">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-black text-xl shadow">
                        NS
                    </div>
                    <div>
                        <h1 class="text-base sm:text-lg font-black tracking-wide">NS News Smart Control Desk</h1>
                        <p class="text-[11px] text-slate-400">తెలుగు దినపత్రిక డిజిటల్ నెట్‌వర్క్ • A.S.V Enterprises</p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <a href="/admin/shorts" class="bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow">
                        ⚡ Shorts
                    </a>
                    <a href="/admin/contractor"
  class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs px-3 py-1.5 rounded-xl font-black transition-all shadow flex items-center gap-1.5"
>
  <span>🏗️</span>
  <span>Contractor 360°</span>
</a>
<a href="/admin/card-maker"
  class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs px-3 py-1.5 rounded-xl font-black transition shadow flex items-center gap-1.5"
>
  <span>🎨</span>
  <span>Card Studio</span>
</a>
                    <a href="/admin/digital-express" class="bg-amber-500 text-slate-950 text-xs px-3 py-1.5 rounded-xl font-black shadow">
                        🚀 Express
                    </a>
                    <a href="/admin/portals" class="bg-slate-800 text-amber-300 text-xs px-3 py-1.5 rounded-xl font-bold border border-slate-700">
                        🔐 పోర్టల్స్
                    </a>
                    <a href="/admin/print-orders" class="bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow">
                        🖨️ ప్రింట్ ఆర్డర్స్
                    </a>
                    <a href="/admin/clips" class="bg-slate-800 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700">
                        📰 క్లిప్స్
                    </a>
                    <a href="/news" target="_blank" rel="noreferrer" class="bg-slate-800 text-xs px-2.5 py-1.5 rounded-xl font-bold border border-slate-700">
                        పోర్టల్ ↗
                    </a>
                    <button type="button" on:click={handleLogout} class="bg-rose-950 text-rose-300 text-xs px-2.5 py-1.5 rounded-xl font-bold border border-rose-900 cursor-pointer">
                        లాగౌట్
                    </button>
                </div>
            </div>

            <div class="p-5 sm:p-8 space-y-6">
                {#if statusMsg}
                    <div class="p-4 rounded-2xl text-sm font-bold {statusType === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}">
                        {statusMsg}
                    </div>
                {/if}

                <!-- Smart Parser Box -->
                <div class="bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 p-5 rounded-2xl border-2 border-red-200 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <label for="magic-box" class="text-xs font-black text-red-950 uppercase tracking-wider flex items-center gap-1.5">
                            <span>⚡ స్మార్ట్ సింగిల్-హెడ్‌లైన్ బాక్స్ (మొత్తం వార్త ఇక్కడ పేస్ట్ చేయండి)</span>
                        </label>
                        <button
                            type="button"
                            on:click={autoParseNews}
                            class="bg-red-600 hover:bg-red-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow transition active:scale-95 cursor-pointer"
                        >
                            ✨ ఆటో ఫార్మాట్ చేయండి
                        </button>
                    </div>
                    <textarea
                        id="magic-box"
                        bind:value={rawNewsInput}
                        rows="4"
                        placeholder="పూర్తి వార్తను ఇక్కడ పేస్ట్ చేయండి... మొదటి లైన్ ఆటోమేటిక్‌గా సింగిల్ బోల్డ్ హెడ్‌లైన్ అవుతుంది, మిగిలినది కథనం అవుతుంది!"
                        class="w-full px-4 py-3 rounded-xl border border-red-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-red-500 focus:outline-none leading-relaxed"
                    ></textarea>
                </div>

                <form on:submit|preventDefault={handleSubmit} class="space-y-6">
                    
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
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
                                    placeholder="ఊరి పేరు టైప్ చేయండి (ఉదా: కాళేశ్వరం)"
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
                            <span class="block text-xs font-bold text-slate-700 mb-1">న్యూస్ అలర్ట్ రకం</span>
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

                    <!-- Single Headline Box -->
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div class="flex items-center justify-between">
                            <label for="headline" class="block text-xs sm:text-sm font-black text-slate-900">
                                ప్రధాన హెడ్‌లైన్ (Single Bold Headline) *
                            </label>
                            <div class="flex items-center gap-1" title="9 రంగుల్లో ఒకటి పోర్టల్‌లో ఆటోమేటిక్‌గా వస్తుంది">
                                <span class="text-[10px] text-slate-500 font-bold mr-1">రంగులు:</span>
                                {#each headlineColors as c}
                                    <span style="background-color: {c}; width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span>
                                {/each}
                            </div>
                        </div>

                        <input
                            id="headline"
                            type="text"
                            bind:value={headline}
                            placeholder="వార్త ప్రధాన ముఖ్యాంశం"
                            class="w-full px-4 py-3 rounded-xl border border-slate-300 font-black text-base text-red-950 focus:ring-2 focus:ring-red-500 focus:outline-none"
                            required
                        />
                    </div>

                    <!-- Photos Upload -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div class="space-y-2">
                            <label for="photo1" class="block text-xs font-bold text-slate-900">ఫోటో 1 (ప్రధాన చిత్రం)</label>
                            <input
                                id="photo1"
                                type="file"
                                accept="image/*"
                                on:change={(e) => handleImageSelect(e, 1)}
                                class="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-100 file:text-red-700"
                            />
                            {#if imagePreview1}
                                <img src={imagePreview1} alt="Preview 1" class="h-28 w-full object-contain rounded-xl border border-slate-300 bg-white" />
                            {/if}
                            <input
                                type="text"
                                bind:value={image_caption_1}
                                placeholder="ఫోటో 1 వివరణ / క్యాప్షన్"
                                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div class="space-y-2">
                            <label for="photo2" class="block text-xs font-bold text-slate-900">ఫోటో 2 (రెండవ చిత్రం - ఐచ్ఛికం)</label>
                            <input
                                id="photo2"
                                type="file"
                                accept="image/*"
                                on:change={(e) => handleImageSelect(e, 2)}
                                class="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700"
                            />
                            {#if imagePreview2}
                                <img src={imagePreview2} alt="Preview 2" class="h-28 w-full object-contain rounded-xl border border-slate-300 bg-white" />
                            {/if}
                            <input
                                type="text"
                                bind:value={image_caption_2}
                                placeholder="ఫోటో 2 వివరణ / క్యాప్షన్"
                                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    </div>

                    <!-- Photo Design Selection -->
                    <div class="bg-gradient-to-r from-red-50/50 via-slate-50 to-amber-50/50 p-4 rounded-2xl border-2 border-red-200 space-y-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h3 class="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                                    <span>🖼️</span>
                                    <span>ఫోటో డిజైన్ & అమరిక (పేపర్‌లో ఎలా కనిపించాలి?)</span>
                                </h3>
                                <p class="text-[11px] text-slate-500">పోర్టల్‌లో వార్త ఏ స్టైల్‌లో కనిపించాలో ఇక్కడే నిర్ణయించండి</p>
                            </div>
                            <button
                                type="button"
                                on:click={() => is_rounded = !is_rounded}
                                class="text-xs px-3 py-1 rounded-xl font-bold border transition {is_rounded ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}"
                            >
                                {is_rounded ? '✓ గుండ్రటి అంచులు (Rounded)' : 'షార్ప్ అంచులు (Sharp)'}
                            </button>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                            <button
                                type="button"
                                on:click={() => image_layout = 'full'}
                                class="p-3 rounded-xl border text-left transition {image_layout === 'full' ? 'bg-white border-red-600 text-red-950 ring-2 ring-red-500 shadow' : 'bg-white/80 border-slate-200 text-slate-600 hover:border-slate-300'}"
                            >
                                <div class="flex items-center justify-between mb-1">
                                    <span>విశాలమైనది (Full Width)</span>
                                    <span class="text-base">📱</span>
                                </div>
                                <p class="text-[10px] text-slate-500 font-normal">ఫోటో పెద్దదిగా పైన ఉండి, కింద కథనం వస్తుంది</p>
                            </button>

                            <button
                                type="button"
                                on:click={() => image_layout = 'side'}
                                class="p-3 rounded-xl border text-left transition {image_layout === 'side' ? 'bg-white border-red-600 text-red-950 ring-2 ring-red-500 shadow' : 'bg-white/80 border-slate-200 text-slate-600 hover:border-slate-300'}"
                            >
                                <div class="flex items-center justify-between mb-1">
                                    <span>న్యూస్‌పేపర్ సైడ్ (Side)</span>
                                    <span class="text-base">📰</span>
                                </div>
                                <p class="text-[10px] text-slate-500 font-normal">నేటి దర్శిని స్టైల్: ఫోటో ఎడమవైపు, పక్కనే కథనం</p>
                            </button>

                            <button
                                type="button"
                                on:click={() => image_layout = 'grid'}
                                class="p-3 rounded-xl border text-left transition {image_layout === 'grid' ? 'bg-white border-red-600 text-red-950 ring-2 ring-red-500 shadow' : 'bg-white/80 border-slate-200 text-slate-600 hover:border-slate-300'}"
                            >
                                <div class="flex items-center justify-between mb-1">
                                    <span>పక్కపక్కనే క్లబ్ (Club)</span>
                                    <span class="text-base">🖼️</span>
                                </div>
                                <p class="text-[10px] text-slate-500 font-normal">రెండు ఫోటోలు సమానంగా పక్కపక్కనే వస్తాయి</p>
                            </button>
                        </div>
                    </div>

                    <!-- News Content -->
                    <div>
                        <label for="content" class="block text-xs sm:text-sm font-bold text-slate-900 mb-1">వార్త పూర్తి కథనం (Content) *</label>
                        <textarea
                            id="content"
                            bind:value={content}
                            rows="7"
                            placeholder="వార్త పూర్తి సమాచారం పేరాగ్రాఫ్‌ల రూపంలో..."
                            class="w-full px-4 py-3 rounded-2xl border border-slate-300 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-red-500 focus:outline-none"
                            required
                        ></textarea>
                    </div>

                    <!-- Ticker Check & YouTube -->
                    <div class="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div class="flex items-center gap-2">
                            <input
                                id="ticker-check"
                                type="checkbox"
                                bind:checked={show_in_ticker}
                                class="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
                            />
                            <label for="ticker-check" class="text-xs font-bold text-slate-700 cursor-pointer">లైవ్ న్యూస్ టిక్కర్‌లో చూపించు</label>
                        </div>

                        <div class="flex-1 max-w-xs">
                            <input
                                type="url"
                                bind:value={youtube_url}
                                placeholder="యూట్యూబ్ వీడియో లింక్ (ఐచ్ఛికం)"
                                class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isUploading}
                        class="w-full bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl transition shadow-lg text-sm sm:text-base cursor-pointer"
                    >
                        {isUploading ? 'వార్త అప్‌లోడ్ అవుతోంది... దయచేసి వేచి ఉండండి' : '🚀 వార్తను పబ్లిష్ చేయండి'}
                    </button>
                </form>
            </div>
        </div>
    </div>
{/if}