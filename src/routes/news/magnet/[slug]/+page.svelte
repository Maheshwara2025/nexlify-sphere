<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import MagnetArticle from '$lib/components/MagnetArticle.svelte';
  import { magnetShareText } from '$lib/magnetNews.js';
  import { toPng } from 'html-to-image';
  /** @type {any|null} */
  let article=null;
  let loading=true;
  let message='';
  /** @type {HTMLDivElement|undefined} */
  let cardNode;
  let actionStatus='';
  $: pageUrl='https://www.nexlifynucleus.in/news/magnet/'+$page.params.slug;
  $: text=article?magnetShareText(article,pageUrl):'';
  onMount(async()=>{
    const {data,error}=await supabase.from('ns_magnet_articles').select('*').eq('slug',$page.params.slug).eq('status','published').maybeSingle();
    if(error) message='వార్తను లోడ్ చేయలేకపోయాం.';
    else if(!data) message='ఈ వార్త అందుబాటులో లేదు.';
    article=data||null;loading=false;
  });
  async function generatePng(){
    if(!cardNode) throw new Error('Card లేదు');
    await document.fonts.ready;
    const img=cardNode.querySelector('img');
    if(img&&!img.complete) await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});});
    return await toPng(cardNode,{pixelRatio:2,cacheBust:true,backgroundColor:'#fff'});
  }
  async function downloadCard(){
    try{
      const dataUrl=await generatePng();
      const a=document.createElement('a');a.href=dataUrl;a.download='ns-magnet-'+$page.params.slug+'.png';a.click();
      actionStatus='PNG సేవ్ అయింది.';
    }catch(err){actionStatus=err instanceof Error ? err.message : 'PNG Export విఫలమైంది.';}
  }
  async function shareCard(){
    try{
      const dataUrl=await generatePng();
      const blob=await(await fetch(dataUrl)).blob();
      const f=new File([blob],'ns-magnet.png',{type:'image/png'});
      if(navigator.canShare?.({files:[f]})) await navigator.share({files:[f],title:article.headline,text});
      else {await downloadCard();actionStatus='PNG డౌన్‌లోడ్ అయ్యింది. WhatsAppలో ఫొటో జతచేయండి.';}
    }catch(err){ actionStatus='Share సాధ్యం కాలేదు: '+(err instanceof Error ? err.message : '');}
  }
  async function copyText(){
    try{await navigator.clipboard.writeText(text);actionStatus='వార్త టెక్స్ట్ కాపీ అయింది.';}
    catch{actionStatus='టెక్స్ట్ కాపీ చేయలేకపోయాం.';}
  }
</script>
<svelte:head>
  <title>{article?.headline || 'NS మ్యాగ్నెట్ న్యూస్'} | NS NEWS</title>
  <meta name="description" content={article?.headline || 'తెలుగు మ్యాగ్నెట్ వార్తలు'} />
  <meta property="og:title" content={article?.headline || 'NS NEWS'} />
  <meta property="og:image" content={article?.image_url || ''} />
  <meta property="og:type" content="article" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
</svelte:head>
<div class="min-h-screen bg-slate-100 pb-16">
  <header class="bg-[#0b1120] text-white border-b-4 border-red-600 p-4">
    <div class="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-3">
      <a href="/news/magnet" class="text-sm font-bold">← మ్యాగ్నెట్ న్యూస్</a>
      <span class="font-black"><b class="bg-red-600 px-2 py-1 rounded">NS</b> NEWS</span>
      <a href="/news" class="text-sm">News Home</a>
    </div>
  </header>
  <main class="max-w-4xl mx-auto p-3 md:p-6">
    {#if loading}
      <div class="p-8 bg-white rounded-xl text-center">వార్త లోడ్ అవుతోంది…</div>
    {:else if message}
      <div class="p-8 bg-white rounded-xl text-center" role="alert">{message}</div>
    {:else if article}
      <MagnetArticle {article}/>
      <div class="bg-white rounded-2xl border p-4 mt-5 flex flex-wrap gap-3">
        <button type="button" on:click={shareCard} class="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold">📲 WhatsApp Image Card</button>
        <button type="button" on:click={downloadCard} class="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold">⬇ Download PNG</button>
        <button type="button" on:click={copyText} class="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold">Copy News Text</button>
        <a href={'https://api.whatsapp.com/send?text='+encodeURIComponent(text)} target="_blank" rel="noopener noreferrer" class="bg-emerald-100 text-emerald-900 px-4 py-2 rounded-xl font-bold">WhatsApp Text ↗</a>
      </div>
      {#if actionStatus}<p class="my-3 text-sm" role="status">{actionStatus}</p>{/if}
      <div style="position:fixed;left:-10000px;top:0;pointer-events:none" aria-hidden="true">
        <div bind:this={cardNode}><MagnetArticle {article} card={true}/></div>
      </div>
    {/if}
  </main>
</div>