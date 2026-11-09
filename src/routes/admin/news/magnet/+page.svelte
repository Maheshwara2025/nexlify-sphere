<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { createContractorAccessGuard } from '$lib/verifiedAccess';
  import { checkNewsFile, newNewsObjectPath } from '$lib/newsMedia';
  import MagnetArticle from '$lib/components/MagnetArticle.svelte';
  import { MAGNET_THEMES, MAGNET_DEFAULT_ENDING, parseMagnetNews, validateMagnetNews, magnetShareText, newsWordCount, magnetTheme } from '$lib/magnetNews.js';
  import { toPng } from 'html-to-image';

  let access = 'checking';
  let rawInput = '';
  /** @type {{headline:string,points:Array<{title:string,description:string}>,body:string,ending_line:string}} */
  let draft = {headline:'',points:[],body:'',ending_line:MAGNET_DEFAULT_ENDING};
  let locationTown = 'తెలంగాణ';
  let category = 'స్థానిక వార్తలు';
  let themeKey = 'auto';
  /** @type {File|null} */
  let file = null;
  let previewUrl = '';
  let savedUrl = '';
  /** @type {string|null} */
  let savedId = null;
  let savedSlug = '';
  let previewTab = 'article';
  let status = '';
  let saving = false;
  /** @type {HTMLDivElement|undefined} */
  let cardNode;
  let clipboardState = '';
  const categories = ['స్థానిక వార్తలు','రాజకీయాలు','వ్యాపారం & ఫైనాన్స్','టెక్నాలజీ','ఆరోగ్యం','వాతావరణం & పర్యావరణం','విద్య & ఉద్యోగాలు','సంస్కృతి & సమాజం','ప్రపంచ వార్తలు'];

  $: effectiveTheme = themeKey === 'auto' ? magnetTheme('',draft.headline).key : themeKey;
  $: previewArticle = {...draft,location_town:locationTown,category,theme_key:effectiveTheme,preview_url:previewUrl,image_url:savedUrl || previewUrl};
  $: issues = validateMagnetNews(draft,!!(file || savedUrl));
  $: totalWords = newsWordCount(draft.body);
  $: publishedUrl = savedSlug ? 'https://www.nexlifynucleus.in/news/magnet/'+savedSlug : '';

  onMount(() => {
    const stop = createContractorAccessGuard(supabase,{
      onStateChange(state) { access = state; },
      onSignedOut(){ void goto('/admin/login'); }
    });
    return () => { stop(); if(previewUrl) URL.revokeObjectURL(previewUrl); };
  });
  function autoFormat() {
    const result = parseMagnetNews(rawInput);
    draft = {headline:result.headline, points:result.points, body:result.body, ending_line:result.ending_line};
    status = result.warnings.length
      ? result.warnings.join(' | ')
      : result.recognitionMode === 'paragraphs' || result.recognitionMode === 'lines'
        ? '✅ 6 రంగుల Impact Points ఆటోమేటిక్‌గా గుర్తించాం! విభజనను Previewలో పరిశీలించండి.'
        : '✅ 6 రంగుల Impact Points సిద్ధమయ్యాయి. Preview పరిశీలించండి.';
    savedId = null; savedSlug = ''; savedUrl = '';
    previewTab='article';
  }
  /** @param {Event} e */
  function onFile(e) {
    const input = /** @type {HTMLInputElement} */ (e.currentTarget);
    const selected=input.files?.[0];
    if(!selected) return;
    try {
      checkNewsFile(selected,'image');
      if(previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl=URL.createObjectURL(selected);
      file=selected; savedUrl='';
      status='ఫొటో ఎంపికైంది.';
    } catch(err) {
      input.value='';
      status=err instanceof Error ? err.message : 'ఫొటో చెల్లదు.';
    }
  }
  /** @param {boolean} publish */
  async function saveNews(publish) {
    if (saving || access!=='allowed') return;
    const errors = validateMagnetNews(draft,!!(file||savedUrl));
    if (errors.length) { status=errors.join(' | '); return; }
    saving=true;
    status='సేవ్ చేస్తున్నాం…';
    let uploadedPath='';
    try {
      let url=savedUrl;
      if(file) {
        uploadedPath=newNewsObjectPath('news-images','photos',file);
        const {error:uploadError}=await supabase.storage.from('news-images').upload(uploadedPath,file,{
          contentType:file.type,cacheControl:'3600',upsert:false
        });
        if(uploadError) throw uploadError;
        url=supabase.storage.from('news-images').getPublicUrl(uploadedPath).data.publicUrl;
      }
      const slug=savedSlug || 'ns-'+Date.now().toString(36)+'-'+crypto.randomUUID().slice(0,8);
      const payload={
        raw_input:rawInput,headline:draft.headline.trim(),points:draft.points,
        body:draft.body.trim(),ending_line:draft.ending_line.trim() || MAGNET_DEFAULT_ENDING,
        image_url:url,theme_key:effectiveTheme,location_town:locationTown.trim() || 'తెలంగాణ',
        category,slug,status:publish?'published':'draft',
        ...(publish?{published_at:new Date().toISOString()}:{})
      };
      const query=savedId
        ? supabase.from('ns_magnet_articles').update(payload).eq('id',savedId)
        : supabase.from('ns_magnet_articles').insert(payload);
      const {data,error}=await query.select('id,slug').single();
      if(error) throw error;
      savedId=data.id;savedSlug=data.slug;savedUrl=url;file=null;
      status=publish?'వార్త విజయవంతంగా ప్రచురించబడింది.':'Draft విజయవంతంగా సేవ్ అయింది.';
    } catch(err) {
      status='Save Error: '+(err instanceof Error ? err.message : 'Unknown error');
      // If upload succeeded but record failed, remove the orphaned object where permitted.
      if(uploadedPath) await supabase.storage.from('news-images').remove([uploadedPath]).catch(()=>{});
    } finally { saving=false; }
  }
  async function imageDataUrl() {
    if(!cardNode) throw new Error('Share Card ఇంకా సిద్ధం కాలేదు.');
    await document.fonts.ready;
    const img = cardNode.querySelector('img');
    if(img && !img.complete) await new Promise((resolve)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});});
    return toPng(cardNode,{pixelRatio:2,cacheBust:true,backgroundColor:'#fff'});
  }
  async function downloadPng() {
    try {
      const url=await imageDataUrl();
      const a=document.createElement('a');a.href=url;a.download=(savedSlug || 'ns-magnet-news')+'.png';a.click();
      status='WhatsApp Card PNG సిద్ధమైంది.';
    } catch(err) {status='Card Export Error: '+(err instanceof Error ? err.message : 'Export failed');}
  }
  async function shareCard() {
    try {
      const url=await imageDataUrl();
      const blob=await (await fetch(url)).blob();
      const f=new File([blob],(savedSlug || 'ns-magnet')+'.png',{type:'image/png'});
      if(navigator.canShare?.({files:[f]})) {
        await navigator.share({files:[f],title:draft.headline,text:'NS NEWS'});
      } else {await downloadPng(); status='PNG Download అయ్యింది. WhatsAppలో ఫొటోగా జతచేయండి.';}
    } catch(err) { status='Sharing unavailable: '+(err instanceof Error ? err.message : 'Download PNG instead.'); }
  }
  async function copyText() {
    try {await navigator.clipboard.writeText(magnetShareText(previewArticle,publishedUrl)); clipboardState='కాపీ అయింది';}
    catch {clipboardState='Copy చేయడం సాధ్యం కాలేదు.';}
  }
</script>

<svelte:head>
  <title>NS Magnet News Studio | NS NEWS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen bg-slate-100 font-sans text-slate-900">
  <header class="bg-[#090f20] px-4 py-4 text-white border-b-4 border-red-600">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
      <a href="/admin/news" class="flex items-center gap-3 font-bold"><span class="bg-red-600 rounded-lg px-2 py-1 text-xl">NS</span><span>MAGNET NEWS STUDIO <small class="block text-slate-400 font-normal">Single Box Auto Formatting</small></span></a>
      <nav class="flex flex-wrap gap-2 text-sm">
        <a href="/news/magnet" class="rounded-lg bg-slate-700 px-3 py-2">Public Preview</a>
        <a href="/admin/news" class="rounded-lg bg-slate-700 px-3 py-2">Back to News Desk</a>
      </nav>
    </div>
  </header>

  {#if access!=='allowed'}
    <div class="max-w-xl mx-auto mt-12 bg-white rounded-2xl p-8 border text-center">
      {access==='checking' ? 'అధికార అనుమతి పరిశీలిస్తున్నాం…' : access==='denied' ? 'ఈ పేజీకి Admin అనుమతి లేదు.' : 'Login అవసరం లేదా Access Verification అందుబాటులో లేదు.'}
      <a href="/admin/login" class="block mt-3 text-red-700 underline">Admin Login</a>
    </div>
  {:else}
    <main class="max-w-7xl mx-auto grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)] p-4 lg:p-6 items-start">
      <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 lg:sticky lg:top-4">
        <div><h1 class="text-xl font-black">వార్తను ఒకే బాక్స్‌లో Paste చేయండి</h1><p class="text-sm text-slate-500 mt-1">Headline + 6 Points + Body అన్నీ ఇక్కడే. Photo విడిగా Upload చేయండి.</p></div>
        <label class="block text-sm font-bold" for="raw-news">మొత్తం వార్త *</label>
        <textarea id="raw-news" bind:value={rawInput} rows="12" class="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm leading-7 focus:ring-2 focus:ring-red-500" placeholder="వార్త ప్రధాన శీర్షిక&#10;&#10;మొదటి ముఖ్యాంశం వివరాలు...&#10;&#10;రెండో ముఖ్యాంశం వివరాలు...&#10;&#10;ఇలా మొత్తం ఆరు ముఖ్యాంశాలు...&#10;&#10;తర్వాత పూర్తి వార్తా కథనం (150 పదాల లోపు)..."></textarea>
        <label class="block text-sm font-bold" for="magnet-photo">ఫొటో *</label>
        <input id="magnet-photo" type="file" accept="image/jpeg,image/png,image/webp" on:change={onFile} class="block w-full text-sm text-slate-700 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-white" />
        <button type="button" on:click={autoFormat} class="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700">✨ ఆటో ఫార్మాట్ + Preview</button>
        <div class="grid grid-cols-2 gap-3">
          <label class="text-xs font-semibold">ప్రాంతం<input bind:value={locationTown} class="mt-1 w-full border rounded-lg p-2" /></label>
          <label class="text-xs font-semibold">వార్తా విభాగం<select bind:value={category} class="mt-1 w-full border rounded-lg p-2">{#each categories as c}<option>{c}</option>{/each}</select></label>
          <label class="text-xs font-semibold col-span-2">News-wise Colour Theme<select bind:value={themeKey} class="mt-1 w-full border rounded-lg p-2"><option value="auto">Auto — Headline ఆధారంగా</option>{#each MAGNET_THEMES as t}<option value={t.key}>{t.name}</option>{/each}</select></label>
        </div>
        {#if draft.headline}
          <div class="rounded-xl bg-slate-50 p-3 text-xs leading-6">
            <strong>{draft.points.length}/6 Impact Points</strong> • Body: <strong class:text-red-600={totalWords>150}>{totalWords}/150</strong> పదాలు
            <details class="mt-2">
              <summary class="cursor-pointer font-bold">Previewలో ఏదైనా తప్పుంటే ఇక్కడ సవరించండి</summary>
              <label class="block mt-2">Headline<input bind:value={draft.headline} class="w-full border rounded-md p-2 mt-1" /></label>
              {#each draft.points as p,i}
                <label class="block mt-2">Point {i+1} Title<input bind:value={p.title} class="w-full border rounded-md p-2 mt-1" /></label>
                <textarea bind:value={p.description} rows="2" class="w-full border rounded-md p-2 mt-1"></textarea>
              {/each}
              <label class="block mt-2">Body<textarea bind:value={draft.body} rows="6" class="w-full border rounded-md p-2 mt-1"></textarea></label>
              <label class="block mt-2">Closing Line<input bind:value={draft.ending_line} class="w-full border rounded-md p-2 mt-1" /></label>
            </details>
          </div>
        {/if}
        {#if status}<p role="status" class="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs leading-6">{status}</p>{/if}
        {#if issues.length}
          <p class="text-xs text-red-700 leading-6">{issues.join(' | ')}</p>
        {/if}
        <div class="grid grid-cols-2 gap-2">
          <button type="button" disabled={saving||issues.length>0} on:click={()=>saveNews(false)} class="rounded-xl bg-slate-900 text-white font-bold p-3 disabled:opacity-40">Save Draft</button>
          <button type="button" disabled={saving||issues.length>0} on:click={()=>saveNews(true)} class="rounded-xl bg-emerald-700 text-white font-bold p-3 disabled:opacity-40">Publish</button>
        </div>
        {#if publishedUrl}
          <a href={publishedUrl} target="_blank" rel="noopener noreferrer" class="block text-sm text-blue-700 underline break-all">View Published News → {publishedUrl}</a>
        {/if}
      </section>

      <section class="min-w-0">
        <div class="bg-white rounded-2xl border p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
          <div class="flex gap-1">
            <button type="button" class:bg-slate-900={previewTab==='article'} class:text-white={previewTab==='article'} class="rounded-lg p-2 text-sm" on:click={()=>previewTab='article'}>Full News</button>
            <button type="button" class:bg-slate-900={previewTab==='card'} class:text-white={previewTab==='card'} class="rounded-lg p-2 text-sm" on:click={()=>previewTab='card'}>WhatsApp Card</button>
            <button type="button" class:bg-slate-900={previewTab==='text'} class:text-white={previewTab==='text'} class="rounded-lg p-2 text-sm" on:click={()=>previewTab='text'}>Share Text</button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" on:click={downloadPng} class="rounded-lg bg-slate-200 px-3 py-2 text-xs font-bold">PNG Download</button>
            <button type="button" on:click={shareCard} class="rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white font-bold">Share Card</button>
            <button type="button" on:click={copyText} class="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white font-bold">Copy Text</button>
          </div>
        </div>
        {#if clipboardState}<p class="text-sm mb-2">{clipboardState}</p>{/if}
        {#if previewTab==='article'}
          <MagnetArticle article={previewArticle}/>
        {:else if previewTab==='card'}
          <div class="overflow-x-auto rounded-xl bg-slate-200 p-3"><MagnetArticle article={previewArticle} card={true}/></div>
        {:else}
          <pre class="bg-white border rounded-xl p-5 text-sm leading-7 whitespace-pre-wrap break-words font-sans">{magnetShareText(previewArticle,publishedUrl)}</pre>
        {/if}
        <!-- Keep export capture mounted even when another preview tab is active. -->
        <div style="position:fixed;left:-10000px;top:0;pointer-events:none" aria-hidden="true">
          <div bind:this={cardNode}><MagnetArticle article={previewArticle} card={true}/></div>
        </div>
        <p class="text-xs text-slate-500 mt-4">ఈ Editorలో Save / Publish చేసిన తర్వాత మాత్రమే Databaseలో వార్త చేరుతుంది. Previewలో మార్పులు నిజాలను ధ్రువీకరించవు.</p>
      </section>
    </main>
  {/if}
</div>