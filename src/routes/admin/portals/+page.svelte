<script>
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let authChecking = true;
  let portals = [];
  let loading = true;
  let searchQuery = '';
  let selectedCategory = 'అన్నీ';

  // Modal States
  let showModal = false;
  let isEditing = false;
  let editingId = null;

  let formName = '';
  let formCategory = 'రైతు సేవలు';
  let formUrl = '';
  let formUsername = '';
  let formPassword = '';
  let formNotes = '';
  let formSaving = false;

  // Password Visibility Toggle per card
  let visiblePasswords = {};

  // Copy Feedback
  let copiedField = '';

  const categories = [
    'అన్నీ',
    'రైతు సేవలు',
    'వ్యాపారం & MSME',
    'దివ్యాంగుల సేవలు',
    'రిజిస్ట్రేషన్ & రెవెన్యూ',
    'ఆధార్ & పౌర సేవలు',
    'విద్య & ఉద్యోగాలు',
    'బ్యాంకింగ్ & ఫైనాన్స్',
    'ఇతర సేవలు'
  ];

  // Category Theme Styler
  function getCategoryTheme(cat) {
    switch (cat) {
      case 'రైతు సేవలు':
        return {
          border: 'border-t-emerald-500',
          badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50',
          glow: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
          btn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white',
          icon: '🌾'
        };
      case 'వ్యాపారం & MSME':
        return {
          border: 'border-t-violet-500',
          badgeBg: 'bg-violet-950/80 text-violet-300 border-violet-700/50',
          glow: 'hover:border-violet-500/50 hover:shadow-violet-500/10',
          btn: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white',
          icon: '🏢'
        };
      case 'దివ్యాంగుల సేవలు':
        return {
          border: 'border-t-amber-500',
          badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-700/50',
          glow: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
          btn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white',
          icon: '♿'
        };
      case 'రిజిస్ట్రేషన్ & రెవెన్యూ':
        return {
          border: 'border-t-blue-500',
          badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-700/50',
          glow: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
          btn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white',
          icon: '🏛️'
        };
      case 'ఆధార్ & పౌర సేవలు':
        return {
          border: 'border-t-rose-500',
          badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-700/50',
          glow: 'hover:border-rose-500/50 hover:shadow-rose-500/10',
          btn: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white',
          icon: '🪪'
        };
      case 'విద్య & ఉద్యోగాలు':
        return {
          border: 'border-t-sky-500',
          badgeBg: 'bg-sky-950/80 text-sky-300 border-sky-700/50',
          glow: 'hover:border-sky-500/50 hover:shadow-sky-500/10',
          btn: 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white',
          icon: '🎓'
        };
      case 'బ్యాంకింగ్ & ఫైనాన్స్':
        return {
          border: 'border-t-teal-500',
          badgeBg: 'bg-teal-950/80 text-teal-300 border-teal-700/50',
          glow: 'hover:border-teal-500/50 hover:shadow-teal-500/10',
          btn: 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white',
          icon: '🏦'
        };
      default:
        return {
          border: 'border-t-slate-500',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
          glow: 'hover:border-slate-500/50',
          btn: 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white',
          icon: '🌐'
        };
    }
  }

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/admin/login');
      return;
    }
    authChecking = false;
    await fetchPortals();
  });

  async function fetchPortals() {
    loading = true;
    try {
      const { data, error } = await supabase
        .from('operator_portals')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      portals = data || [];
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      loading = false;
    }
  }

  function openAddModal() {
    isEditing = false;
    editingId = null;
    formName = '';
    formCategory = 'రైతు సేవలు';
    formUrl = '';
    formUsername = '';
    formPassword = '';
    formNotes = '';
    showModal = true;
  }

  function openEditModal(portal) {
    isEditing = true;
    editingId = portal.id;
    formName = portal.name;
    formCategory = portal.category || 'ఇతర సేవలు';
    formUrl = portal.url;
    formUsername = portal.username || '';
    formPassword = portal.password || '';
    formNotes = portal.notes || '';
    showModal = true;
  }

  async function handleSave() {
    if (!formName.trim() || !formUrl.trim()) {
      alert('Dayachesi portal peru mariyu URL ni enter cheyandi!');
      return;
    }

    let cleanUrl = formUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    formSaving = true;

    try {
      if (isEditing && editingId) {
        const { error } = await supabase
          .from('operator_portals')
          .update({
            name: formName.trim(),
            category: formCategory,
            url: cleanUrl,
            username: formUsername.trim(),
            password: formPassword.trim(),
            notes: formNotes.trim()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('operator_portals')
          .insert([{
            name: formName.trim(),
            category: formCategory,
            url: cleanUrl,
            username: formUsername.trim(),
            password: formPassword.trim(),
            notes: formNotes.trim()
          }]);

        if (error) throw error;
      }

      showModal = false;
      await fetchPortals();
    } catch (err) {
      alert('Save cheyadamlo error: ' + err.message);
    } finally {
      formSaving = false;
    }
  }

  async function handleDelete(id, name) {
    const confirmDelete = confirm(`"${name}" portal ni delete cheyali anukuntunnara?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('operator_portals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPortals();
    } catch (err) {
      alert('Delete cheyadamlo error: ' + err.message);
    }
  }

  async function copyToClipboard(text, fieldKey) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copiedField = fieldKey;
      setTimeout(() => {
        copiedField = '';
      }, 1500);
    } catch (e) {
      alert('Copy cheyadam kudaraledu');
    }
  }

  function togglePassword(id) {
    visiblePasswords[id] = !visiblePasswords[id];
  }

  $: filteredPortals = portals.filter((p) => {
    const matchCategory = selectedCategory === 'అన్నీ' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });
</script>

<svelte:head>
  <title>ఆపరేటర్ పోర్టల్ లాంచర్ & వాల్ట్ | A.S.V. Enterprises</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-20">

  <!-- Top Header -->
  <header class="bg-[#0b1120]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-4 py-3">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <a 
          href="/admin/news" 
          class="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700/60 font-bold transition flex items-center gap-1"
        >
          <span>←</span>
          <span>న్యూస్ డెస్క్</span>
        </a>
        <div>
          <h1 class="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-2">
            <span class="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">🔐</span>
            <span>ఆపరేటర్ పోర్టల్స్ & లాంచర్ వాల్ట్</span>
          </h1>
          <p class="text-[11px] text-slate-400">A.S.V. Enterprises • డిజిటల్ సేవా కేంద్రం ఆపరేటర్ డెస్క్</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          on:click={openAddModal}
          class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-red-900/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <span>➕</span>
          <span>కొత్త పోర్టల్ జోడించండి</span>
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">

    <!-- Search & Filter Bar -->
    <div class="bg-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3.5">
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <!-- Search Input -->
        <div class="relative flex-1">
          <span class="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="పోర్టల్ పేరు, యూజర్‌నేమ్ లేదా నోట్స్ ఆధారంగా వెతకండి..."
            class="w-full bg-[#090d16] border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition placeholder:text-slate-500"
          />
        </div>

        <!-- Total Count -->
        <div class="text-xs text-slate-400 font-bold shrink-0 self-center bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          మొత్తం పోర్టల్స్: <span class="text-red-400 font-mono text-sm">{filteredPortals.length}</span> / {portals.length}
        </div>
      </div>

      <!-- Categories Badges Strip -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-thin">
        {#each categories as cat}
          <button
            type="button"
            on:click={() => selectedCategory = cat}
            class="px-3.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer {selectedCategory === cat ? 'bg-red-600 text-white shadow-md shadow-red-900/40' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'}"
          >
            {cat}
          </button>
        {/each}
      </div>
    </div>

    <!-- Cards Grid -->
    {#if loading}
      <div class="text-center py-20 text-slate-400 text-sm font-bold flex flex-col items-center gap-2">
        <span class="text-2xl animate-spin">⏳</span>
        <span>పోర్టల్స్ లోడ్ అవుతున్నాయి...</span>
      </div>
    {:else if filteredPortals.length === 0}
      <div class="text-center py-20 bg-[#0f172a] rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-3">
        <p class="text-base font-bold">ఎలాంటి వెబ్‌సైట్లు కనుగొనబడలేదు.</p>
        <button
          type="button"
          on:click={openAddModal}
          class="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
        >
          ➕ కొత్త వెబ్‌సైట్ చేర్చండి
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {#each filteredPortals as portal (portal.id)}
          {@const theme = getCategoryTheme(portal.category)}
          
          <div class="bg-[#0e1626] border border-slate-800/90 border-t-4 {theme.border} rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1 {theme.glow}">
            
            <div class="space-y-4">
              <!-- Card Top: Category Badge, Icon & Action Buttons -->
              <div class="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border {theme.badgeBg} mb-1.5 shadow-sm">
                    <span>{theme.icon}</span>
                    <span>{portal.category || 'ఇతర సేవలు'}</span>
                  </div>
                  <h3 class="text-base font-black text-white group-hover:text-amber-300 transition leading-snug">
                    {portal.name}
                  </h3>
                </div>

                <!-- Edit / Delete Tools -->
                <div class="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    on:click={() => openEditModal(portal)}
                    class="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                    title="సవరించండి (Edit)"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    on:click={() => handleDelete(portal.id, portal.name)}
                    class="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition"
                    title="తొలగించండి (Delete)"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <!-- Credentials Desk Box -->
              <div class="bg-[#070c16] rounded-xl p-3 border border-slate-800/80 space-y-2.5 text-xs shadow-inner">
                
                <!-- User ID Row -->
                <div class="flex items-center justify-between gap-2">
                  <span class="text-slate-400 text-[11px] font-bold flex items-center gap-1 shrink-0">
                    <span class="text-slate-500">👤</span> User ID:
                  </span>
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="font-mono text-slate-200 truncate select-all font-semibold">{portal.username || '—'}</span>
                    {#if portal.username}
                      <button
                        type="button"
                        on:click={() => copyToClipboard(portal.username, `user_${portal.id}`)}
                        class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-slate-700 transition active:scale-95"
                      >
                        {copiedField === `user_${portal.id}` ? '✓ కాపీడ్!' : 'కాపీ'}
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- Password Row -->
                <div class="flex items-center justify-between gap-2 border-t border-slate-800/60 pt-2">
                  <span class="text-slate-400 text-[11px] font-bold flex items-center gap-1 shrink-0">
                    <span class="text-slate-500">🔑</span> Password:
                  </span>
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="font-mono text-slate-200 truncate select-all font-semibold">
                      {#if visiblePasswords[portal.id]}
                        {portal.password || '—'}
                      {:else}
                        ••••••••
                      {/if}
                    </span>
                    {#if portal.password}
                      <button
                        type="button"
                        on:click={() => togglePassword(portal.id)}
                        class="text-slate-400 hover:text-slate-200 text-xs px-1 transition"
                        title={visiblePasswords[portal.id] ? 'పాస్‌వర్డ్ దాచండి' : 'పాస్‌వర్డ్ చూపించండి'}
                      >
                        {visiblePasswords[portal.id] ? '🙈' : '👁️'}
                      </button>
                      <button
                        type="button"
                        on:click={() => copyToClipboard(portal.password, `pass_${portal.id}`)}
                        class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-slate-700 transition active:scale-95"
                      >
                        {copiedField === `pass_${portal.id}` ? '✓ కాపీడ్!' : 'కాపీ'}
                      </button>
                    {/if}
                  </div>
                </div>

              </div>

              <!-- Notes -->
              {#if portal.notes}
                <div class="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/70 flex items-start gap-1.5">
                  <span class="text-amber-400">📌</span>
                  <span class="leading-snug">{portal.notes}</span>
                </div>
              {/if}
            </div>

            <!-- Launch Button (Colored Gradient per Category) -->
            <div class="pt-4 mt-4 border-t border-slate-800/80">
              <a
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                class="w-full {theme.btn} font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-md active:scale-98"
              >
                <span>వెబ్‌సైట్ ఓపెన్ చేయండి</span>
                <span class="text-base leading-none">↗</span>
              </a>
            </div>

          </div>
        {/each}
      </div>
    {/if}

  </main>

  <!-- Add / Edit Modal -->
  {#if showModal}
    <div class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-[#0f172a] border border-slate-700/80 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
        
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 class="text-base font-black text-white flex items-center gap-2">
            <span>{isEditing ? '✏️ పోర్టల్ వివరాలు సవరించండి' : '➕ కొత్త పోర్టల్ జోడించండి'}</span>
          </h2>
          <button
            type="button"
            on:click={() => showModal = false}
            class="text-slate-400 hover:text-white text-xl font-bold px-2 py-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-300 mb-1">పోర్టల్ / వెబ్‌సైట్ పేరు *</label>
            <input
              type="text"
              bind:value={formName}
              placeholder="ఉదా: Fertilizer Booking, UDID, Udyam"
              class="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-300 mb-1">విభాగం (Category)</label>
            <select
              bind:value={formCategory}
              class="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-red-500"
            >
              {#each categories.filter(c => c !== 'అన్నీ') as cat}
                <option value={cat}>{cat}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-300 mb-1">వెబ్‌సైట్ లాగిన్ URL *</label>
            <input
              type="text"
              bind:value={formUrl}
              placeholder="https://..."
              class="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-300 mb-1">User ID / Login ID</label>
            <input
              type="text"
              bind:value={formUsername}
              placeholder="ఆపరేటర్ లాగిన్ ఐడీ"
              class="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-300 mb-1">Password</label>
            <input
              type="text"
              bind:value={formPassword}
              placeholder="లాగిన్ పాస్‌వర్డ్"
              class="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-300 mb-1">గమనికలు (Notes / PIN / Hints)</label>
            <textarea
              bind:value={formNotes}
              rows="2"
              placeholder="ఉదా: సెక్యూరిటీ పిన్, ఆపరేటర్ కోడ్ లేదా పని వేళలు..."
              class="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
            ></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            on:click={() => showModal = false}
            class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition"
          >
            రద్దు
          </button>
          <button
            type="button"
            on:click={handleSave}
            disabled={formSaving}
            class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg transition"
          >
            {formSaving ? 'సేవ్ అవుతోంది...' : (isEditing ? 'అప్‌డేట్ చేయండి' : 'సేవ్ చేయండి')}
          </button>
        </div>

      </div>
    </div>
  {/if}

</div>