<script>
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let authChecking = true;
  let portals = [];
  let loading = true;
  let searchQuery = '';
  let selectedCategory = 'All';

  // Modal / Form States (Add & Edit)
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

  // Password Visibility Toggle per card (ID mapping)
  let visiblePasswords = {};

  // Copy Feedback state
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

  // Add Modal Open
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

  // Edit Modal Open
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

  // Save (Create or Update)
  async function handleSave() {
    if (!formName.trim() || !formUrl.trim()) {
      alert('దయచేసి పోర్టల్ పేరు మరియు వెబ్‌సైట్ URL నమోదు చేయండి!');
      return;
    }

    // URL కి https:// లేకపోతే ఆటోమేటిక్‌గా చేర్చడం
    let cleanUrl = formUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    formSaving = true;

    try {
      if (isEditing && editingId) {
        // Update
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
        // Insert
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
      alert('సేవ్ చేయడంలో లోపం: ' + err.message);
    } finally {
      formSaving = false;
    }
  }

  // Delete Portal
  async function handleDelete(id, name) {
    const confirmDelete = confirm(`"${name}" పోర్టల్‌ను ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('operator_portals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPortals();
    } catch (err) {
      alert('డిలీట్ చేయడంలో లోపం: ' + err.message);
    }
  }

  // 1-Click Clipboard Copy
  async function copyToClipboard(text, fieldKey) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copiedField = fieldKey;
      setTimeout(() => {
        copiedField = '';
      }, 1500);
    } catch (e) {
      alert('కాపీ కాలేదు. బ్రౌజర్ అనుమతి అవసరం.');
    }
  }

  // Toggle Password Masking
  function togglePassword(id) {
    visiblePasswords[id] = !visiblePasswords[id];
  }

  // Filter & Search Logic
  $: filteredPortals = portals.filter((p) => {
    const matchCategory = selectedCategory === 'అన్నీ' || selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });
</script>

<svelte:head>
  <title>ఆపరేటర్ పోర్టల్ లాంచర్ & వాల్ట్ | A.S.V. Enterprises</title>
</svelte:head>

<div class="min-h-screen bg-slate-900 text-slate-100 font-sans pb-16">

  <!-- టాప్ హెడర్ -->
  <header class="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 px-4 py-3">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <a href="/admin/news" class="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 font-bold transition">
          ← న్యూస్ డెస్క్
        </a>
        <div>
          <h1 class="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-2">
            <span>🔐</span>
            <span>ఆపరేటర్ పోర్టల్స్ & లాంచర్ వాల్ట్</span>
          </h1>
          <p class="text-[11px] text-slate-400">A.S.V. Enterprises • డిజిటల్ సేవా కేంద్రం క్విక్ యాక్సెస్</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          on:click={openAddModal}
          class="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
        >
          <span>➕ కొత్త పోర్టల్ జోడించండి</span>
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">

    <!-- సెర్చ్ & కేటగిరీ ఫిల్టర్ల బార్ -->
    <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <!-- సెర్చ్ ఇన్పుట్ -->
        <div class="relative flex-1">
          <span class="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="పోర్టల్ పేరు, యూజర్‌నేమ్ లేదా నోట్స్ ఆధారంగా వెతకండి..."
            class="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition placeholder:text-slate-500"
          />
        </div>

        <!-- కౌంట్ డిస్ప్లే -->
        <div class="text-right text-xs text-slate-400 font-bold shrink-0 self-center">
          మొత్తం పోర్టల్స్: <span class="text-red-400">{filteredPortals.length}</span> / {portals.length}
        </div>
      </div>

      <!-- కేటగిరీ ట్యాబ్‌లు -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-thin">
        {#each categories as cat}
          <button
            type="button"
            on:click={() => selectedCategory = cat}
            class="px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer {selectedCategory === cat ? 'bg-red-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'}"
          >
            {cat}
          </button>
        {/each}
      </div>
    </div>

    <!-- పోర్టల్ కార్డుల గ్రిడ్ (Portals Cards Grid) -->
    {#if loading}
      <div class="text-center py-20 text-slate-400 text-sm font-bold">పోర్టల్స్ లోడ్ అవుతున్నాయి...</div>
    {:else if filteredPortals.length === 0}
      <div class="text-center py-20 bg-slate-950 rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-3">
        <p class="text-base font-bold">ఎలాంటి వెబ్‌సైట్లు కనుగొనబడలేదు.</p>
        <button
          type="button"
          on:click={openAddModal}
          class="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
        >
          ➕ కొత్త వెబ్‌సైట్ చేర్చండి
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each filteredPortals as portal (portal.id)}
          <div class="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-md flex flex-col justify-between transition group">
            
            <div class="space-y-3">
              <!-- కార్డు హెడర్: పేరు & కేటగిరీ -->
              <div class="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div>
                  <span class="inline-block bg-slate-800 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 mb-1">
                    {portal.category || 'ఇతర సేవలు'}
                  </span>
                  <h3 class="text-sm sm:text-base font-black text-white group-hover:text-red-400 transition leading-snug">
                    {portal.name}
                  </h3>
                </div>

                <!-- ఎడిట్ / డిలీట్ బటన్లు -->
                <div class="flex items-center gap-1 shrink-0">
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

              <!-- క్రెడెన్షియల్స్ విభాగం (1-Click Copy) -->
              <div class="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800/80 space-y-2 text-xs">
                <!-- యూజర్ ID -->
                <div class="flex items-center justify-between gap-2">
                  <span class="text-slate-400 text-[11px] font-semibold shrink-0">User ID:</span>
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="font-mono text-slate-200 truncate select-all">{portal.username || '—'}</span>
                    {#if portal.username}
                      <button
                        type="button"
                        on:click={() => copyToClipboard(portal.username, `user_${portal.id}`)}
                        class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 transition"
                      >
                        {copiedField === `user_${portal.id}` ? '✓ కాపీడ్!' : 'కాపీ'}
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- పాస్‌వర్డ్ (మాస్కింగ్ & షో/హైడ్) -->
                <div class="flex items-center justify-between gap-2">
                  <span class="text-slate-400 text-[11px] font-semibold shrink-0">Password:</span>
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="font-mono text-slate-200 truncate select-all">
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
                        class="text-slate-400 hover:text-slate-200 text-xs px-1"
                        title={visiblePasswords[portal.id] ? 'పాస్‌వర్డ్ దాచండి' : 'పాస్‌వర్డ్ చూపించండి'}
                      >
                        {visiblePasswords[portal.id] ? '🙈' : '👁️'}
                      </button>
                      <button
                        type="button"
                        on:click={() => copyToClipboard(portal.password, `pass_${portal.id}`)}
                        class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 transition"
                      >
                        {copiedField === `pass_${portal.id}` ? '✓ కాపీడ్!' : 'కాపీ'}
                      </button>
                    {/if}
                  </div>
                </div>
              </div>

              <!-- నోట్స్ (Notes) -->
              {#if portal.notes}
                <p class="text-[11px] text-slate-400 italic bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/40">
                  📌 {portal.notes}
                </p>
              {/if}
            </div>

            <!-- లాంచ్ బటన్ (డైరెక్ట్ ఓపెన్ వెబ్‌సైట్) -->
            <div class="pt-3 mt-3 border-t border-slate-800">
              <a
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                class="w-full bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition shadow group-hover:bg-red-600 group-hover:text-white"
              >
                <span>వెబ్‌సైట్ ఓపెన్ చేయండి</span>
                <span class="text-sm">↗</span>
              </a>
            </div>

          </div>
        {/each}
      </div>
    {/if}

  </main>

  <!-- పోర్టల్ జోడించే / మార్చే మోడల్ విండో (Add/Edit Modal) -->
  {#if showModal}
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-slate-950 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
        
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 class="text-base font-black text-white flex items-center gap-2">
            <span>{isEditing ? '✏️ పోర్టల్ వివరాలు సవరించండి' : '➕ కొత్త పోర్టల్ జోడించండి'}</span>
          </h2>
          <button
            type="button"
            on:click={() => showModal = false}
            class="text-slate-400 hover:text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <!-- పేరు -->
          <div>
            <label class="block font-bold text-slate-300 mb-1">పోర్టల్ / వెబ్‌సైట్ పేరు *</label>
            <input
              type="text"
              bind:value={formName}
              placeholder="ఉదా: Fertilizer Booking, UDID, Udyam"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <!-- కేటగిరీ -->
          <div>
            <label class="block font-bold text-slate-300 mb-1">విభాగం (Category)</label>
            <select
              bind:value={formCategory}
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
            >
              {#each categories.filter(c => c !== 'అన్నీ' && c !== 'All') as cat}
                <option value={cat}>{cat}</option>
              {/each}
            </select>
          </div>

          <!-- వెబ్‌సైట్ URL -->
          <div>
            <label class="block font-bold text-slate-300 mb-1">వెబ్‌సైట్ లాగిన్ URL *</label>
            <input
              type="text"
              bind:value={formUrl}
              placeholder="https://..."
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <!-- యూజర్ ID -->
          <div>
            <label class="block font-bold text-slate-300 mb-1">User ID / Login ID</label>
            <input
              type="text"
              bind:value={formUsername}
              placeholder="ఆపరేటర్ లాగిన్ ఐడీ"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <!-- పాస్‌వర్డ్ -->
          <div>
            <label class="block font-bold text-slate-300 mb-1">Password</label>
            <input
              type="text"
              bind:value={formPassword}
              placeholder="లాగిన్ పాస్‌వర్డ్"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <!-- నోట్స్ -->
          <div>
            <label class="block font-bold text-slate-300 mb-1">గమనికలు (Notes / PIN / Security Hints)</label>
            <textarea
              bind:value={formNotes}
              rows="2"
              placeholder="ఉదా: సెక్యూరిటీ పిన్, ఆపరేటర్ కోడ్ లేదా పని వేళలు..."
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
            ></textarea>
          </div>
        </div>

        <!-- బటన్లు -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            on:click={() => showModal = false}
            class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            రద్దు
          </button>
          <button
            type="button"
            on:click={handleSave}
            disabled={formSaving}
            class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2 rounded-xl shadow transition"
          >
            {formSaving ? 'సేవ్ అవుతోంది...' : (isEditing ? 'అప్‌డేట్ చేయండి' : 'సేవ్ చేయండి')}
          </button>
        </div>

      </div>
    </div>
  {/if}

</div>