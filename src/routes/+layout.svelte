<script>
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  let { children } = $props();

  // Ticker News State (Svelte 5 Runes)
  let globalTickerNews = $state([]);

  onMount(async () => {
    try {
      // 1. Fetch from 'news' table
      let { data } = await supabase
        .from('news')
        .select('*')
        .order('id', { ascending: false })
        .limit(10);

      // 2. Fallback to 'news_articles'
      if (!data || data.length === 0) {
        const res = await supabase
          .from('news_articles')
          .select('*')
          .order('id', { ascending: false })
          .limit(10);
        data = res.data;
      }

      globalTickerNews = (data || []).map(item => ({
        id: item.id,
        headline: item.headline || item.title || 'తాజా వార్త',
        location: item.location_town || item.location || item.place || 'ముత్తారం'
      }));
    } catch (e) {
      console.error('Ticker fetch error:', e);
    }
  });

  // Admin pages lo ticker raakunda hide cheyadam
  let isAdminPage = $derived($page.url.pathname.startsWith('/admin'));
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- ALL PUBLIC PAGES GLOBAL TICKER (100% SMOOTH SCROLLING) -->
{#if !isAdminPage && globalTickerNews.length > 0}
  <div class="bg-[#b91c1c] text-white flex items-center overflow-hidden py-1.5 px-3 shadow-md border-b border-red-800 z-50 sticky top-0">
    
    <!-- Left Black Badge -->
    <div class="bg-black text-white font-black text-xs px-2.5 py-1 rounded shrink-0 flex items-center gap-1.5 shadow mr-2 z-10">
      <span class="text-red-500 font-black text-sm leading-none">+</span>
      <span class="tracking-wide">లైవ్ న్యూస్</span>
    </div>

    <!-- Smooth Native Marquee -->
    <marquee 
      behavior="scroll" 
      direction="left" 
      scrollamount="6" 
      class="text-xs sm:text-[13px] font-bold tracking-wide"
    >
      {#each globalTickerNews as item}
        <a href="/news/{item.id}" class="hover:underline mx-4 text-white inline-flex items-center gap-1.5">
          <span class="text-yellow-300 font-black">[{item.location}]</span>
          <span class="text-white font-medium">{item.headline}</span>
        </a>
        <span class="text-yellow-400 font-bold mx-2">•</span>
      {/each}
    </marquee>

  </div>
{/if}

<!-- Render All Pages Content -->
{@render children()}