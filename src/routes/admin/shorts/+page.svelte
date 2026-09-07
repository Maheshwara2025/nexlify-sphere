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
  });

  // ఫారమ్ ఫీల్డ్స్
  let title = '';
  let summary = '';
  let location = 'ముత్తారం';
  let language = 'te';
  let reporter_name = 'NS Reporter';
  let youtube_url = '';

  // ఫోటో 1 (ప్రధాన చిత్రం)
  let imageFile1 = null;
  let imagePreview1 = null;

  // ఫోటో 2 (అదనపు చిత్రం - ఐచ్ఛికం)
  let imageFile2 = null;
  let imagePreview2 = null;

  let isUploading = false;
  let statusMsg = '';
  let statusType = '';

  // గ్యాలరీ / కెమెరా ఎంపికతో ఇమేజ్ సెలెక్షన్
  function handleImageSelect(e, num) {
    const target = e.target;
    if (target && target.files && target.files[0]) {
      if (num === 1) {
        imageFile1 = target.files[0];
        imagePreview1 = URL.createObjectURL(imageFile1);
      } else {
        imageFile2 = target.files[0];
        imagePreview2 = URL.createObjectURL(imageFile2);
      }
    }
  }

  // సుపాబేస్ స్టోరేజ్‌లోకి ఇమేజ్ అప్‌లోడ్
  async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `shorts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;
    const filePath = `shorts-media/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('news-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('news-images').getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleSubmit() {
    if (!title.trim() || !summary.trim()) {
      statusMsg = 'దయచేసి హెడ్‌లైన్ మరియు వార్త సారాంశాన్ని నమోదు చేయండి.';
      statusType = 'error';
      return;
    }

    if (!imageFile1) {
      statusMsg = 'దయచేసి కనీసం ఒక ప్రధాన చిత్రాన్ని (ఫోటో 1) ఎంచుకోండి.';
      statusType = 'error';
      return;
    }

    isUploading = true;
    statusMsg = '';

    try {
      // ఫోటో 1 అప్‌లోడ్
      const imageUrl1 = await uploadImage(imageFile1);

      // ఫోటో 2 అప్‌లోడ్ (ఉంటే)
      let imageUrl2 = null;
      if (imageFile2) {
        imageUrl2 = await uploadImage(imageFile2);
      }

      // సుపాబేస్ లోకి ఇన్సర్ట్
      const { error } = await supabase.from('shorts').insert([
        {
          title: title.trim(),
          summary: summary.trim(),
          location: location.trim(),
          language,
          reporter_name: reporter_name.trim(),
          image_url: imageUrl1,
          image_url_2: imageUrl2,
          youtube_url: youtube_url.trim() || null
        }
      ]);

      if (error) throw error;

      statusMsg = 'షార్ట్ న్యూస్ విజయవంతంగా పబ్లిష్ అయ్యింది!';
      statusType = 'success';

      // రీసెట్ ఫారమ్
      title = '';
      summary = '';
      youtube_url = '';
      imageFile1 = null;
      imagePreview1 = null;
      imageFile2 = null;
      imagePreview2 = null;
    } catch (err) {
      console.error(err);
      statusMsg = `లోపం: ${err.message || 'మళ్లీ ప్రయత్నించండి'}`;
      statusType = 'error';
    } finally {
      isUploading = false;
    }
  }
</script>

<svelte:head>
  <title>NS Shorts Control Desk | Admin</title>
</svelte:head>

{#if authChecking}
  <div class="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
    <div class="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <div class="min-h-screen bg-slate-100 py-6 px-4 font-sans">
    <div class="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      <!-- హెడర్ -->
      <div class="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b-2 border-red-600">
        <div class="flex items-center gap-2.5">
          <span class="bg-red-600 px-2 py-0.5 rounded font-black text-sm">NS</span>
          <h1 class="text-base font-bold">షార్ట్ న్యూస్ అడ్మిన్ డెస్క్</h1>
        </div>
        <div class="flex items-center gap-2">
          <a href="/shorts" target="_blank" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg font-bold border border-slate-700">
            షార్ట్స్ చూడండి ↗
          </a>
          <a href="/admin/news" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg font-bold border border-slate-700">
            న్యూస్ డెస్క్
          </a>
        </div>
      </div>

      <div class="p-6 space-y-5">
        {#if statusMsg}
          <div class="p-3.5 rounded-xl text-xs font-bold {statusType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
            {statusMsg}
          </div>
        {/if}

        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          
          <!-- భాష, లొకేషన్, రిపోర్టర్ -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label for="lang-select" class="block text-xs font-bold text-slate-700 mb-1">భాష</label>
              <select id="lang-select" bind:value={language} class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white">
                <option value="te">తెలుగు</option>
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
            </div>
            <div>
              <label for="loc-input" class="block text-xs font-bold text-slate-700 mb-1">లొకేషన్</label>
              <input id="loc-input" type="text" bind:value={location} class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold" placeholder="ఉదా: ముత్తారం" />
            </div>
            <div>
              <label for="rep-input" class="block text-xs font-bold text-slate-700 mb-1">రిపోర్టర్ పేరు</label>
              <input id="rep-input" type="text" bind:value={reporter_name} class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold" />
            </div>
          </div>

          <!-- హెడ్‌లైన్ -->
          <div>
            <label for="headline-input" class="block text-xs font-bold text-slate-800 mb-1">హెడ్‌లైన్ (7-10 పదాలు) *</label>
            <input 
              id="headline-input"
              type="text" 
              bind:value={title} 
              placeholder="వార్త ముఖ్యాంశం..." 
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              required 
            />
          </div>

          <!-- సారాంశం (బాడీ) & వర్డ్ కౌంటర్ -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <label for="summary-input" class="block text-xs font-bold text-slate-800">వార్త బాడీ (60 - 90 పదాలు) *</label>
              {#if summary.trim()}
                {@const words = summary.trim().split(/\s+/).length}
                <span class="text-[11px] font-bold {words >= 50 && words <= 95 ? 'text-emerald-600' : 'text-amber-600'}">
                  {words} పదాలు
                </span>
              {/if}
            </div>
            <textarea 
              id="summary-input"
              bind:value={summary} 
              rows="4" 
              placeholder="వార్త సంక్షిప్త సమాచారం 60 నుండి 90 పదాలలో..." 
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-red-500 focus:outline-none"
              required
            ></textarea>
          </div>

          <!-- ఇమేజ్ అప్‌లోడ్స్ (కెమెరా & గ్యాలరీ సపోర్ట్) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <!-- ఇమేజ్ 1 -->
            <div class="space-y-2">
              <label for="img1-input" class="block text-xs font-bold text-slate-800">ఫోటో 1 (ప్రధాన చిత్రం) *</label>
              <!-- capture ఆట్రిబ్యూట్ లేకుండా కేవలం accept వాడటం వల్ల మొబైల్‌లో కెమెరా మరియు గ్యాలరీ రెండూ ఓపెన్ అవుతాయి -->
              <input 
                id="img1-input"
                type="file" 
                accept="image/*" 
                on:change={(e) => handleImageSelect(e, 1)} 
                class="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-100 file:text-red-700"
              />
              {#if imagePreview1}
                <img src={imagePreview1} alt="Preview 1" class="h-28 w-full object-contain bg-slate-900 rounded-lg border border-slate-300" />
              {/if}
            </div>

            <!-- ఇమేజ్ 2 -->
            <div class="space-y-2">
              <label for="img2-input" class="block text-xs font-bold text-slate-700">ఫోటో 2 (అదనపు చిత్రం - ఐచ్ఛికం)</label>
              <input 
                id="img2-input"
                type="file" 
                accept="image/*" 
                on:change={(e) => handleImageSelect(e, 2)} 
                class="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700"
              />
              {#if imagePreview2}
                <img src={imagePreview2} alt="Preview 2" class="h-28 w-full object-contain bg-slate-900 rounded-lg border border-slate-300" />
              {/if}
            </div>
          </div>

          <!-- యూట్యూబ్ / వీడియో లింక్ -->
          <div>
            <label for="yt-input" class="block text-xs font-bold text-slate-700 mb-1">యూట్యూబ్ వీడియో / షార్ట్స్ లింక్ (ఐచ్ఛికం)</label>
            <input 
              id="yt-input"
              type="url" 
              bind:value={youtube_url} 
              placeholder="https://youtube.com/shorts/... లేదా https://youtu.be/..." 
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none" 
            />
          </div>

          <button 
            type="submit" 
            disabled={isUploading}
            class="w-full bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white font-black py-3 rounded-xl transition shadow text-sm"
          >
            {isUploading ? 'అప్‌లోడ్ అవుతోంది...' : '⚡ షార్ట్ న్యూస్ పబ్లిష్ చేయండి'}
          </button>

        </form>
      </div>

    </div>
  </div>
{/if}