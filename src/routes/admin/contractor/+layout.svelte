<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { createContractorAccessGuard } from '$lib/verifiedAccess';
  let { children } = $props();
  /** @type {import('$lib/verifiedAccess').AccessState} */
  let accessState = $state('checking');
  const sections=[['','డాష్‌బోర్డ్'],['materials','మెటీరియల్స్ & బిల్లులు'],['daily-work','సైట్ డైరీ'],['labour','లేబర్ DBMS'],['piecework','పీస్ వర్క్'],['mbook','M-Book'],['party','Party 360°'],['ledger','లెడ్జర్'],['loans','అప్పులు & బాకీలు']];
  onMount(() => {
    let active=true;
    const stop=createContractorAccessGuard(supabase,{
      onStateChange(state){accessState=state;},
      onSignedOut(){void goto('/admin/login',{replaceState:true}).catch(()=>{if(active)accessState='unavailable';});}
    });
    return ()=>{active=false;stop();};
  });
</script>
{#if accessState === 'allowed'}
  <aside class="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 print:hidden" role="status">
    Stage 3 భద్రమైన అటామిక్ నమోదులు అందుబాటులో ఉన్నాయి. పాత లావాదేవీల తొలగింపు, రివర్సల్ మరియు పరిశీలించని మార్పులు ఇంకా నిలిపివేయబడ్డాయి.
  </aside>
  <nav aria-label="కాంట్రాక్టర్ విభాగాలు" class="flex flex-wrap gap-3 border-b border-slate-200 bg-white px-4 py-3 text-xs font-bold print:hidden">
    {#each sections as [route,label]}<a class="text-slate-700 hover:underline" href={'/admin/contractor'+(route?'/'+route:'')}>{label}</a>{/each}
  </nav>
  {@render children()}
{:else}
  <main class="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <div class="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm" role="status" aria-live="polite">
      {#if accessState === 'denied'}
        <h1 class="text-lg font-bold text-slate-900">నిర్వాహక అనుమతి లేదు</h1><p class="mt-3 text-sm text-slate-600">ఈ విభాగం అనుమతి పొందిన నిర్వాహకులకు మాత్రమే అందుబాటులో ఉంటుంది.</p>
      {:else if accessState === 'unavailable'}
        <h1 class="text-lg font-bold text-slate-900">అనుమతి నిర్ధారించలేకపోయాం</h1><p class="mt-3 text-sm text-slate-600">దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి లేదా నిర్వాహకుడిని సంప్రదించండి.</p>
      {:else}<p class="text-lg font-semibold text-slate-700">లాగిన్ మరియు నిర్వాహక అనుమతి పరిశీలిస్తున్నాం...</p>{/if}
      {#if accessState === 'denied' || accessState === 'unavailable'}<a class="mt-5 inline-block font-semibold text-amber-700 underline" href="/admin/login">లాగిన్ పేజీకి వెళ్లండి</a>{/if}
    </div>
  </main>
{/if}
