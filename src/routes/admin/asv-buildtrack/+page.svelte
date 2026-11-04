<script>
  const modules = [
    { icon: '🏗️', title: 'ప్రాజెక్టులు' },
    { icon: '💰', title: 'ఆర్థిక లెక్కలు' },
    { icon: '👷', title: 'కూలీలు & మేస్త్రీలు' },
    { icon: '🧱', title: 'మెటీరియల్స్ & స్టాక్' },
    { icon: '🚜', title: 'రవాణా & అద్దెలు' },
    { icon: '📐', title: 'M-Book & కొలతలు' },
    { icon: '📸', title: 'రోజువారీ సైట్ పనులు' },
    { icon: '📊', title: 'నివేదికలు' }
  ];
</script>

<svelte:head>
  <title>A.S.V. BuildTrack ERP</title>
</svelte:head>

<main class="min-h-screen bg-slate-100 p-4 md:p-8">
  <div class="mx-auto max-w-6xl">

    <header class="rounded-2xl bg-slate-950 p-6 text-white">
      <h1 class="text-2xl font-bold">
        🏗️ A.S.V. BuildTrack ERP
      </h1>
      <p class="mt-2 text-sm text-slate-300">
        సంపూర్ణ నిర్మాణ పనుల నిర్వహణ వ్యవస్థ
      </p>
    </header>

    <section class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each modules as item}
        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="text-3xl">{item.icon}</div>
          <h2 class="mt-3 font-bold text-slate-900">
            {item.title}
          </h2>
          <p class="mt-2 text-xs text-amber-700">
            అభివృద్ధి చేయాల్సిన మాడ్యూల్
          </p>
        </article>
      {/each}
    </section>

  </div>
</main>
