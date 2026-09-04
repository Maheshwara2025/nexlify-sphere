<script>
  import { supabase } from '$lib/supabaseClient';

  let title = '';
  let fullText = '';
  let summary = '';
  let location = 'మంథని';
  let reporterName = 'NS Reporter';
  let language = 'te';
  let imageFile = null;
  let previewUrl = '';
  let isAiGenerating = false;
  let isSubmitting = false;

  function handleImageCapture(event) {
    const file = event.target.files[0];
    if (file) {
      imageFile = file;
      previewUrl = URL.createObjectURL(file);
    }
  }

  // AI సారాంశం (బ్రౌజర్ క్లయింట్ నుంచే నేరుగా)
  async function generateAiSummary() {
    if (!fullText) {
      alert('దయచేసి ముందుగా పూర్తి వార్తను పేస్ట్ చేయండి.');
      return;
    }

    isAiGenerating = true;
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        // API కీ లేకపోతే బేసిక్ సారాంశం
        summary = fullText.slice(0, 250) + '...';
        if (!title) title = fullText.slice(0, 40) + '...';
        return;
      }

      const langMap = { te: 'Telugu', en: 'English', hi: 'Hindi' };
      const prompt = `You are a mobile news editor for an app like Way2News. Summarize the following news text strictly into:
1. A catchy headline (max 10-12 words).
2. A crisp news summary strictly 50 to 70 words in ${langMap[language] || 'Telugu'}.
Respond strictly in JSON format: {"suggestedTitle": "...", "summary": "..."}

News content:
${fullText}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await res.json();
      const result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (result.summary) {
        summary = result.summary;
        if (result.suggestedTitle && !title) title = result.suggestedTitle;
      }
    } catch (e) {
      alert('AI తో సారాంశం చేయడంలో లోపం వచ్చింది.');
    } finally {
      isAiGenerating = false;
    }
  }

  // నేరుగా Supabase లోకి సేవ్ చేయడం
  async function handleSubmit() {
    if (!title || !summary || !imageFile) {
      alert('దయచేసి శీర్షిక, సారాంశం మరియు ఫోటోను అందించండి.');
      return;
    }

    isSubmitting = true;
    try {
      // 1. Supabase Storage కి ఇమేజ్ అప్‌లోడ్
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
        // బకెట్ లేకపోతే Base64 ఫాల్‌బ్యాక్
        const buffer = await imageFile.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        imageUrl = `data:${imageFile.type};base64,${base64}`;
      }

      // 2. Supabase టేబుల్‌లోకి ఇన్సర్ట్
      const { error: insertErr } = await supabase.from('shorts').insert([{
        title,
        summary,
        image_url: imageUrl,
        reporter_name: reporterName,
        location,
        language
      }]);

      if (!insertErr) {
        alert('షార్ట్ న్యూస్ విజయవంతంగా పోస్ట్ అయింది!');
        title = '';
        fullText = '';
        summary = '';
        previewUrl = '';
        imageFile = null;
      } else {
        alert('సేవ్ కాలేదు: ' + insertErr.message);
      }
    } catch (err) {
      alert('ఎర్రర్ వచ్చింది.');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow mt-4">
  <div class="flex justify-between items-center border-b pb-3 mb-4">
    <h1 class="text-xl font-bold text-gray-800">NS Shorts - క్విక్ న్యూస్ అడ్మిన్</h1>
    <a href="/admin/news" class="text-sm text-blue-600 font-semibold">← మెయిన్ అడ్మిన్</a>
  </div>

  <div class="mb-4">
    <label class="block text-sm font-semibold text-gray-700 mb-2">వార్త ఫోటో (మొబైల్ కెమెరా / గ్యాలరీ)</label>
    <div class="flex items-center gap-3">
      <label class="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium shadow flex items-center gap-2 text-sm">
        📷 ఫోటో తీయండి / అప్‌లోడ్
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          on:change={handleImageCapture} 
          class="hidden" 
        />
      </label>
      {#if previewUrl}
        <img src={previewUrl} alt="Preview" class="h-16 w-16 object-cover rounded-lg border border-gray-300" />
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3 mb-4">
    <div>
      <label class="block text-xs font-semibold text-gray-600 mb-1">భాష</label>
      <select bind:value={language} class="w-full border rounded p-2 text-sm bg-gray-50">
        <option value="te">తెలుగు</option>
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
      </select>
    </div>
    <div>
      <label class="block text-xs font-semibold text-gray-600 mb-1">ప్రాంతం / నియోజకవర్గం</label>
      <input type="text" bind:value={location} class="w-full border rounded p-2 text-sm" placeholder="మంథని, ముత్తారం" />
    </div>
  </div>

  <div class="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
    <div class="flex justify-between items-center mb-1">
      <span class="text-xs font-bold text-indigo-700">✨ AI న్యూస్ షార్ట్‌నర్</span>
      <button 
        type="button" 
        on:click={generateAiSummary} 
        disabled={isAiGenerating} 
        class="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50">
        {isAiGenerating ? 'AI రాస్తోంది...' : 'AI సారాంశం చేయి'}
      </button>
    </div>
    <textarea 
      bind:value={fullText} 
      rows="3" 
      class="w-full border rounded p-2 text-xs" 
      placeholder="పెద్ద వార్తను ఇక్కడ పేస్ట్ చేసి 'AI సారాంశం చేయి' క్లిక్ చేయండి..."></textarea>
  </div>

  <div class="mb-4">
    <label class="block text-sm font-semibold text-gray-700 mb-1">హెడ్‌లైన్ (Bold శీర్షిక)</label>
    <input type="text" bind:value={title} class="w-full border rounded p-2 font-semibold text-sm" placeholder="వార్త ముఖ్యాంశం..." />
  </div>

  <div class="mb-4">
    <div class="flex justify-between items-center mb-1">
      <label class="block text-sm font-semibold text-gray-700">షార్ట్ న్యూస్ వివరణ</label>
      <span class="text-xs text-gray-500">{summary.length} అక్షరాలు</span>
    </div>
    <textarea 
      bind:value={summary} 
      rows="5" 
      maxlength="450" 
      class="w-full border rounded p-2 text-sm leading-relaxed" 
      placeholder="Way2News మోడల్‌లో 60-70 పదాల సారాంశం..."></textarea>
  </div>

  <button 
    type="button" 
    on:click={handleSubmit} 
    disabled={isSubmitting} 
    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow transition disabled:opacity-50 text-sm">
    {isSubmitting ? 'పబ్లిష్ అవుతోంది...' : '🚀 షార్ట్ న్యూస్ లైవ్ పబ్లిష్ చేయండి'}
  </button>
</div>