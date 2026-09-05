<script>
  import { supabase } from '$lib/supabaseClient';

  let rawNewsText = '';
  let title = '';
  let summary = '';
  let location = 'మంథని';
  let reporterName = 'NS Reporter';
  let language = 'te';
  let imageFile = null;
  let previewUrl = '';
  let isSubmitting = false;

  function handleImageCapture(event) {
    const file = event.target.files[0];
    if (file) {
      imageFile = file;
      previewUrl = URL.createObjectURL(file);
    }
  }

  // మొదటి లైన్‌ను హెడ్‌లైన్‌గా, మిగిలినదాన్ని బాడీగా మార్చే ఫంక్షన్
  function processNewsText() {
    if (!rawNewsText.trim()) {
      alert('దయచేసి వార్తను బాక్స్‌లో పేస్ట్ చేయండి.');
      return;
    }

    const lines = rawNewsText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length > 0) {
      title = lines[0].replace(/^[•\-\*#\s]+/, '').trim();
      
      if (lines.length > 1) {
        summary = lines.slice(1).join('\n\n').trim();
      } else {
        summary = lines[0];
      }
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !summary.trim() || !imageFile) {
      alert('దయచేసి శీర్షిక, వార్త వివరణ మరియు ఫోటోను అందించండి.');
      return;
    }

    isSubmitting = true;
    try {
      const fileExt = imageFile.name ? imageFile.name.split('.').pop() : 'jpg';
      const filePath = `shorts/${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('news-images')
        .upload(filePath, imageFile, { upsert: true });

      let imageUrl = '';
      if (!uploadErr) {
        const { data } = supabase.storage.from('news-images').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      } else {
        const buffer = await imageFile.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        imageUrl = `data:${imageFile.type};base64,${base64}`;
      }

      const { error: insertErr } = await supabase.from('shorts').insert([{
        title: title.trim(),
        summary: summary.trim(),
        image_url: imageUrl,
        reporter_name: reporterName,
        location,
        language
      }]);

      if (!insertErr) {
        alert('షార్ట్ న్యూస్ కార్డు విజయవంతంగా పబ్లిష్ అయింది!');
        rawNewsText = '';
        title = '';
        summary = '';
        previewUrl = '';
        imageFile = null;
      } else {
        alert('సేవ్ కాలేదు: ' + insertErr.message);
      }
    } catch (err) {
      alert('నెట్‌వర్క్ ఎర్రర్ ఏర్పడింది.');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto p-5 bg-white rounded-xl shadow-lg border border-slate-200 my-6">
  <div class="flex justify-between items-center border-b pb-3 mb-4">
    <h1 class="text-xl font-black text-slate-900 flex items-center gap-1.5">
      <span class="bg-red-600 text-white px-2 py-0.5 rounded text-sm tracking-wide">NS</span> షార్ట్స్ క్రియేటర్
    </h1>
    <a href="/shorts" class="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100">
      లైవ్ షార్ట్స్ చూడండి →
    </a>
  </div>

  <div class="mb-4">
    <span class="block text-xs font-bold uppercase text-slate-600 mb-2">వార్త ఫోటో (కెమెరా / గ్యాలరీ)</span>
    <div class="flex items-center gap-4">
      <label class="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-bold shadow flex items-center gap-2 text-sm transition">
        📷 ఫోటో ఎంచుకోండి
        <input type="file" accept="image/*" capture="environment" on:change={handleImageCapture} class="hidden" />
      </label>
      {#if previewUrl}
        <img src={previewUrl} alt="Preview" class="h-16 w-24 object-cover rounded-lg border shadow-sm" />
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3 mb-4">
    <div>
      <label for="lang" class="block text-xs font-bold text-slate-600 mb-1">భాష</label>
      <select id="lang" bind:value={language} class="w-full border rounded-lg p-2 text-sm bg-slate-50 font-medium">
        <option value="te">తెలుగు</option>
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
      </select>
    </div>
    <div>
      <label for="loc" class="block text-xs font-bold text-slate-600 mb-1">ప్రాంతం</label>
      <input id="loc" type="text" bind:value={location} class="w-full border rounded-lg p-2 text-sm font-medium" placeholder="మంథని, ముత్తారం" />
    </div>
  </div>

  <!-- వార్త పేస్ట్ చేసే ప్రధాన బాక్స్ -->
  <div class="mb-5 bg-amber-50/70 p-4 rounded-xl border border-amber-200">
    <div class="flex justify-between items-center mb-2">
      <span class="text-xs font-black text-amber-900">📝 పూర్తి వార్త పేస్ట్ చేయండి (150 - 360 పదాలు)</span>
      <button 
        type="button" 
        on:click={processNewsText}
        class="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg font-bold shadow transition">
        ⚡ మొదటి లైన్ హెడ్‌లైన్‌గా మార్చు
      </button>
    </div>
    <textarea 
      bind:value={rawNewsText} 
      rows="6" 
      class="w-full border border-amber-300 rounded-lg p-2.5 text-xs bg-white focus:ring-2 focus:ring-amber-500" 
      placeholder="మొదటి లైన్ శీర్షికగా వ్రాయండి. ఆ తర్వాత ఎంటర్‌ కొట్టి పూర్తి వార్త వివరణను పేస్ట్ చేయండి..."></textarea>
    <p class="text-[11px] text-amber-800 mt-1">పై బటన్ క్లిక్ చేయగానే మొదటి లైన్ ఆటోమేటిక్‌గా హెడ్‌లైన్‌గా క్రింది బాక్స్‌లోకి వెళ్తుంది.</p>
  </div>

  <div class="mb-4">
    <label for="title" class="block text-xs font-bold text-slate-700 mb-1">హెడ్‌లైన్ (ప్రధాన శీర్షిక)</label>
    <input 
      id="title"
      type="text" 
      bind:value={title} 
      class="w-full border rounded-lg p-2.5 text-sm font-bold text-slate-900 border-slate-300 focus:ring-2 focus:ring-red-500" 
      placeholder="వార్త ముఖ్యాంశం..." />
  </div>

  <div class="mb-5">
    <div class="flex justify-between items-center mb-1">
      <label for="summary" class="block text-xs font-bold text-slate-700">వార్త సారాంశం (వివరణ)</label>
      <span class="text-[11px] font-semibold text-slate-500">{summary.length} అక్షరాలు</span>
    </div>
    <textarea 
      id="summary"
      bind:value={summary} 
      rows="5" 
      class="w-full border rounded-lg p-2.5 text-sm text-slate-800 leading-relaxed border-slate-300 focus:ring-2 focus:ring-red-500 font-medium" 
      placeholder="కార్డులో కనిపించే పూర్తి వివరణ..."></textarea>
  </div>

  <button 
    type="button" 
    on:click={handleSubmit} 
    disabled={isSubmitting} 
    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl shadow-md transition disabled:opacity-50 text-sm">
    {isSubmitting ? 'పబ్లిష్ అవుతోంది...' : '🚀 సింగిల్ షార్ట్ కార్డును లైవ్ చేయండి'}
  </button>
</div>