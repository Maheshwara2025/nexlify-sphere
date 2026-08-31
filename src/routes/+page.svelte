<script>
  import { supabase } from '$lib/supabaseClient';

  let name = '';
  let phone = '';
  let service_type = 'ఆధార్ & గుర్తింపు సేవలు';
  let message = '';
  let loading = false;
  let statusMessage = '';
  let isSuccess = false;

  const services = [
    { title: 'ఆధార్ & గుర్తింపు సేవలు', icon: '🆔', desc: 'అప్‌డేట్స్, డౌన్‌లోడ్ మరియు కరెక్షన్స్' },
    { title: 'రైతు సేవలు & వ్యవసాయం', icon: '🌾', desc: 'PM-కిసాన్, ఈ-క్రాప్, సబ్సిడీ అప్లికేషన్లు' },
    { title: 'భూభారతి & రెవెన్యూ', icon: '📜', desc: 'పహాణీ, 1B, రిజిస్ట్రేషన్ స్లాట్ బుకింగ్' },
    { title: 'విద్యార్థి & ప్రభుత్వ పథకాలు', icon: '🎓', desc: 'స్కాలర్‌షిప్‌లు, ప్రవేశ పరీక్షల దరఖాస్తులు' },
    { title: 'ఇన్సూరెన్స్ & హెల్త్ సేవలు', icon: '🛡️', desc: 'జీవిత, వాహన బీమా మరియు ఆయుష్మాన్ భారత్' },
    { title: 'డిజిటల్ పేమెంట్స్ & ప్రింటింగ్', icon: '🖨️', desc: 'జెరాక్స్, కలర్ ప్రింట్స్, బిల్ చెల్లింపులు' }
  ];

  async function handleSubmit() {
    if (!name || !phone) {
      statusMessage = 'దయచేసి పేరు మరియు ఫోన్ నంబర్ నమోదు చేయండి.';
      isSuccess = false;
      return;
    }

    loading = true;
    statusMessage = '';

    const { error } = await supabase.from('service_requests').insert([
      { name, phone, service_type, message }
    ]);

    loading = false;

    if (error) {
      statusMessage = 'సమస్య ఎదురైంది: ' + error.message;
      isSuccess = false;
    } else {
      statusMessage = 'మీ అభ్యర్థన విజయవంతంగా నమోదైంది! మేము త్వరలోనే సంప్రదిస్తాము.';
      isSuccess = true;
      name = '';
      phone = '';
      message = '';
    }
  }
</script>

<div class="min-h-screen bg-slate-50 text-slate-800">
  <!-- Header -->
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center text-xl shadow-md">
          N
        </div>
        <div>
          <h1 class="font-bold text-lg leading-none text-slate-900">Nexlify Nucleus</h1>
          <p class="text-xs text-slate-500 mt-0.5">డిజిటల్ సర్వీసెస్ పోర్టల్</p>
        </div>
      </div>
      <a 
        href="#apply-form" 
        class="bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm"
      >
        సర్వీస్ బుకింగ్
      </a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="max-w-4xl mx-auto px-4 py-12 text-center">
    <span class="bg-orange-100 text-orange-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
      గ్రామీణ & డిజిటల్ సేవలు
    </span>
    <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 leading-tight">
      మీ డిజిటల్ & ప్రభుత్వ సేవల అవసరాలు <br class="hidden sm:inline" />
      <span class="text-orange-600">అన్నీ ఒకే చోట</span>
    </h2>
    <p class="text-slate-600 mt-3 text-base sm:text-lg max-w-2xl mx-auto">
      అన్ని రకాల ప్రభుత్వ పథకాలు, పౌర మరియు ఆన్‌లైన్ దరఖాస్తు సేవలను సులభంగా పొందండి.
    </p>
  </section>

  <!-- Services Grid -->
  <section class="max-w-6xl mx-auto px-4 pb-12">
    <h3 class="text-xl font-bold text-slate-900 mb-6 text-center">అందుబాటులో ఉన్న సేవలు</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each services as service}
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div class="text-3xl mb-3">{service.icon}</div>
          <h4 class="font-bold text-lg text-slate-900">{service.title}</h4>
          <p class="text-sm text-slate-600 mt-1">{service.desc}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Application / Booking Form -->
  <section id="apply-form" class="max-w-xl mx-auto px-4 pb-16">
    <div class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
      <h3 class="text-xl font-bold text-slate-900 text-center mb-2">సేవ కోసం అభ్యర్థించండి</h3>
      <p class="text-sm text-slate-500 text-center mb-6">మీ వివరాలను ఇక్కడ నమోదు చేయండి</p>

      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1" for="name">పూర్తి పేరు</label>
          <input 
            id="name"
            type="text" 
            bind:value={name} 
            placeholder="మీ పేరు నమోదు చేయండి" 
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1" for="phone">మొబైల్ నంబర్</label>
          <input 
            id="phone"
            type="tel" 
            bind:value={phone} 
            placeholder="ఉదా: 9876543210" 
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1" for="service_type">కావలసిన సేవ</label>
          <select 
            id="service_type"
            bind:value={service_type} 
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            {#each services as service}
              <option value={service.title}>{service.title}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1" for="message">అదనపు వివరాలు (ఐచ్ఛికం)</label>
          <textarea 
            id="message"
            bind:value={message} 
            rows="3" 
            placeholder="మీకు అవసరమైన వివరాలు రాయండి..." 
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
          ></textarea>
        </div>

        {#if statusMessage}
          <div class={`p-3 rounded-lg text-sm text-center font-medium ${isSuccess ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {statusMessage}
          </div>
        {/if}

        <button 
          type="submit" 
          disabled={loading}
          class="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg shadow-sm transition disabled:opacity-50"
        >
          {loading ? 'సమర్పిస్తోంది...' : 'అభ్యర్థనను సమర్పించండి'}
        </button>
      </form>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-slate-900 text-slate-400 py-8 text-center text-sm border-t border-slate-800">
    <p>© {new Date().getFullYear()} Nexlify Nucleus. All rights reserved.</p>
  </footer>
</div>