<script>
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let { children } = $props();

  // Svelte 5 State for Ticker News
  let globalTickerNews = $state([]);

  onMount(async () => {
    try {
      let { data } = await supabase
        .from('news_articles')
        .select('id, headline, title')
        .order('id', { ascending: false })
        .limit(8);

      if (!data || data.length === 0) {
        const res = await supabase
          .from('news')
          .select('id, headline, title')
          .order('id', { ascending: false })
          .limit(8);
        data = res.data;
      }
      globalTickerNews = data || [];
    } catch (e) {
      console.error('Global ticker load error:', e);
    }
  });

  // Admin pages lo ticker hide avvadaniki condition
  let isAdminPage = $derived($page.url.pathname.startsWith('/admin'));
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- All Public Pages Global Breaking News Ticker -->
{#if !isAdminPage && globalTickerNews.length > 0}
  <div class="bg-slate-950 border-b border-red-600 text-white flex items-center overflow-hidden py-1.5 px-3 shadow-inner z-50 sticky top-0">
    <div class="bg-red-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-md shrink-0 flex items-center gap-1.5 shadow mr-2">
      <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
      <span class="tracking-wide">తాజా వార్తలు</span>
    </div>

    <marquee 
      behavior="scroll" 
      direction="left" 
      scrollamount="6" 
      class="text-xs sm:text-[13px] font-bold tracking-wide"
    >
      {#each globalTickerNews as item}
        <a href="/news/{item.id}" class="hover:underline mx-4 text-slate-100 hover:text-amber-300">
          🔴 {item.headline || item.title}
        </a>
        <span class="text-amber-400 mx-2">•</span>
      {/each}
    </marquee>
  </div>
{/if}

<!-- Render All Pages Content -->
{@render children()}