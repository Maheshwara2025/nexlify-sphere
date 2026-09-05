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

  async function generateAiSummary() {
    if (!fullText.trim()) {
      alert('దయచేసి ముందుగా పూర్తి వార్తను పేస్ట్ చేయండి.');
      return;
    }

    isAiGenerating = true;
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const langMap = { te: 'Telugu', en: 'English', hi: 'Hindi' };
      const selectedLang = langMap[language] || 'Telugu';

      const prompt = `You are an expert digital news sub-editor for Telugu journalism.
Task: Create an editorial news card from the following story.

CRITICAL HEADLINE RULES:
- DO NOT copy the first line or introductory phrase (e.g. avoid phrases like "ఈ సందర్భంగా", "సమాచారం మేరకు", "పురస్కరించుకుని").
- Extract the CORE EVENT/ACTION and craft a hard-hitting, crisp headline (max 7-10 words) in journalistic ${selectedLang}.
- Example Bad Headline: "శ్రీకృష్ణ జన్మాష్టమి పర్వదినాన్ని పురస్కరించుకుని"
- Example Good Headline: "జమ్మికుంటలో ఘనంగా శ్రీకృష్ణ జన్మాష్టమి వేడుకలు"

CRITICAL SUMMARY RULES:
- Exactly 50 to 65 words in ${selectedLang}.
- Must state: What happened, Who was involved, Location, and Significance.
- End with a clean, complete sentence terminating with a full stop. Never truncate mid-sentence.

Return strictly in JSON format:
{
  "suggestedTitle": "...",
  "summary": "..."
}

Story:
${fullText}`;

      if (apiKey) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        const data = await res.json();
        const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
        if (parsed.suggestedTitle) title = parsed.suggestedTitle.replace(/[.*:]+$/, '').trim();
        if (parsed.summary) summary = parsed.summary.trim();
      } else {
        // Fallback
        title = "ముఖ్య వార్తా విశేషాలు";
        summary = fullText.slice(0, 200).trim() + "...";
      }
    } catch (e) {
      alert('AI తో సారాంశం చేయడంలో లోపం ఏర్పడింది.');
    } finally {
      isAiGenerating = false;
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !summary.trim() || !imageFile) {
      alert('దయచేసి శీర్షిక, వివరణ మరియు ఫోటోను అందించండి.');
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
        alert('వార్త విజయవంతంగా పబ్లిష్ అయింది!');
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

<div class="max-w-2xl mx-auto p-5 bg-white rounded-xl shadow border border-gray-100 my-6">
  <div class="flex justify-between items-center border-b pb-3 mb-4">
    <h1 class="text-xl font-bold text-gray-900 flex items-center gap-1.5">
      <span class="bg-red-600 text-white px-2 py-0.5 rounded text-sm font-black">NS</span> SHORTS అడ్మిన్
    </h1>
    <a href="/shorts" class="text-xs font-semibold text-blue-600 hover:underline">లైవ్ షార్ట్స్ చూడండి →</a>
  </div>

  <div class="mb-4">
    <span class="block text-xs font-bold uppercase text-gray-600 mb-2">వార్త చిత్రం (కెమెరా / గ్యాలరీ)</span>
    <div class="flex items-center gap-4">
      <label class="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-bold shadow flex items-center gap-2 text-sm transition">
        📷 ఫోటో తీయండి / అప్‌లోడ్
        <input type="file" accept="image/*" capture="environment" on:change={handleImageCapture} class="hidden" />
      </label>
      {#if previewUrl}
        <img src={previewUrl} alt="Preview" class="h-16 w-24 object-cover rounded-lg border shadow-sm" />
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3 mb-4">
    <div>
      <label for="lang-select" class="block text-xs font-bold text-gray-600 mb-1">భాష</label>
      <select id="lang-select" bind:value={language} class="w-full border rounded-lg p-2 text-sm bg-gray-50">
        <option value="te">తెలుగు</option>
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
      </select>
    </div>
    <div>
      <label for="loc-input" class="block text-xs font-bold text-gray-600 mb-1">ప్రాంతం / నియోజకవర్గం</label>
      <input id="loc-input" type="text" bind:value={location} class="w-full border rounded-lg p-2 text-sm" placeholder="మంథని, ముత్తారం" />
    </div>
  </div>

  <div class="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
    <div class="flex justify-between items-center mb-2">
      <span class="text-xs font-bold text-indigo-800">✨ AI న్యూస్ ఎడిటర్ (హెడ్‌లైన్ + పూర్తి సారాంశం)</span>
      <button 
        type="button" 
        on:click={generateAiSummary} 
        disabled={isAiGenerating} 
        class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg font-bold transition disabled:opacity-50">
        {isAiGenerating ? 'సారాంశం రాస్తోంది...' : 'AI ఎడిటింగ్ చేయి'}
      </button>
    </div>
    <textarea 
      bind:value={fullText} 
      rows="4" 
      class="w-full border rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-indigo-500" 
      placeholder="పత్రికా ప్రకటన లేదా పూర్తి సమాచారాన్ని ఇక్కడ పేస్ట్ చేయండి..."></textarea>
  </div>

  <div class="mb-4">
    <label for="title-input" class="block text-xs font-bold text-gray-700 mb-1">హెడ్‌లైన్ (ప్రధాన శీర్షిక)</label>
    <input 
      id="title-input"
      type="text" 
      bind:value={title} 
      class="w-full border rounded-lg p-2.5 text-sm font-bold text-gray-900 border-gray-300 focus:ring-2 focus:ring-red-400" 
      placeholder="వార్తా సారాంశం ఆధారంగా శీర్షిక..." />
  </div>

  <div class="mb-5">
    <div class="flex justify-between items-center mb-1">
      <label for="summary-input" class="block text-xs font-bold text-gray-700">షార్ట్ న్యూస్ సమగ్ర వివరణ</label>
      <span class="text-[11px] font-semibold text-gray-500">{summary.length} అక్షరాలు</span>
    </div>
    <textarea 
      id="summary-input"
      bind:value={summary} 
      rows="5" 
      class="w-full border rounded-lg p-2.5 text-sm text-gray-800 leading-relaxed border-gray-300 focus:ring-2 focus:ring-red-400" 
      placeholder="పూర్తి వాక్యాలతో 50-65 పదాల సారాంశం..."></textarea>
  </div>

  <button 
    type="button" 
    on:click={handleSubmit} 
    disabled={isSubmitting} 
    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow transition disabled:opacity-50 text-sm">
    {isSubmitting ? 'పబ్లిష్ అవుతోంది...' : '🚀 కార్డ్ లైవ్ పబ్లిష్ చేయండి'}
  </button>
</div>