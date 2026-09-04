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

      const prompt = `You are a chief news editor at a top digital news agency (like Eenadu / Way2News).
Your task is to craft a professional, hard-hitting news card in ${selectedLang} from the raw text provided.

STRICT EDITORIAL RULES:
1. "suggestedTitle": Max 8-12 words. Highly engaging, bold, punchy, active voice. Do NOT end the title with a period.
2. "summary": Strictly 50 to 75 words.
3. INVERTED PYRAMID: Start with the biggest fact (Who, What, Where, When), followed by essential context.
4. ABSOLUTE COMPLETION: Every sentence MUST end with a proper full stop (లేదా పూర్ణవిరామం). Under NO circumstances should the last sentence be cut off or incomplete.
5. NO fillers, no fluff. Journalistic tone only.

Return ONLY a valid JSON object:
{
  "suggestedTitle": "...",
  "summary": "..."
}

News text to summarize:
${fullText}`;

      let result = null;

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
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        result = JSON.parse(rawJson);
      }

      if (result?.summary) {
        summary = result.summary.trim();
        if (result.suggestedTitle) title = result.suggestedTitle.trim();
      } else {
        // Fallback: sentence boundary preservation
        const sentences = fullText.split(/([.!?।\n]+)/).filter(s => s.trim().length > 10);
        title = fullText.slice(0, 45).trim();
        summary = sentences.slice(0, 3).join('. ') + '.';
      }
    } catch (e) {
      alert('AI సారాంశం పొందడంలో లోపం వచ్చింది. దయచేసి మాన్యువల్‌గా ఎడిట్ చేయండి.');
    } finally {
      isAiGenerating = false;
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !summary.trim() || !imageFile) {
      alert('దయచేసి శీర్షిక, పూర్తి సారాంశం మరియు ఫోటోను అందించండి.');
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
      alert('నెట్‌వర్క్ ఎర్రర్ వచ్చింది.');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto p-4 bg-white rounded-xl shadow-lg border border-slate-100 my-6">
  <div class="flex justify-between items-center border-b pb-3 mb-4">
    <div>
      <h1 class="text-xl font-black text-slate-900 flex items-center gap-1.5">
        <span class="bg-red-600 text-white px-2 py-0.5 rounded text-sm tracking-wider">NS</span> SHORTS అడ్మిన్
      </h1>
      <p class="text-xs text-slate-500 mt-0.5">మొబైల్ ఫోటో & AI ఆధారిత డిజిటల్ న్యూస్ కార్డ్స్</p>
    </div>
    <a href="/admin/news" class="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
      ← మెయిన్ అడ్మిన్
    </a>
  </div>

  <div class="mb-4">
    <span class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">వార్త ఫోటో (కెమెరా / గ్యాలరీ)</span>
    <div class="flex items-center gap-4">
      <label class="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-bold shadow flex items-center gap-2 text-sm transition">
        📷 ఫోటో తీయండి / ఎంచుకోండి
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          on:change={handleImageCapture} 
          class="hidden" 
        />
      </label>
      {#if previewUrl}
        <img src={previewUrl} alt="Preview" class="h-16 w-24 object-cover rounded-lg border-2 border-red-500 shadow-sm" />
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-2 gap-3 mb-4">
    <div>
      <label for="lang-select" class="block text-xs font-bold text-slate-600 mb-1">భాష</label>
      <select id="lang-select" bind:value={language} class="w-full border rounded-lg p-2 text-sm bg-slate-50 font-medium">
        <option value="te">తెలుగు</option>
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
      </select>
    </div>
    <div>
      <label for="loc-input" class="block text-xs font-bold text-slate-600 mb-1">ప్రాంతం / నియోజకవర్గం</label>
      <input id="loc-input" type="text" bind:value={location} class="w-full border rounded-lg p-2 text-sm font-medium" placeholder="మంథని, ముత్తారం" />
    </div>
  </div>

  <div class="mb-4 bg-gradient-to-br from-indigo-50/70 to-purple-50/70 p-3.5 rounded-xl border border-indigo-100">
    <div class="flex justify-between items-center mb-2">
      <span class="text-xs font-black text-indigo-900 flex items-center gap-1">
        ✨ AI జర్నలిస్టిక్ షార్ట్‌నర్
      </span>
      <button 
        type="button" 
        on:click={generateAiSummary} 
        disabled={isAiGenerating} 
        class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg font-bold shadow-sm transition disabled:opacity-50">
        {isAiGenerating ? 'నియమాల ప్రకారం రచిస్తోంది...' : 'AI తో సారాంశం చేయి'}
      </button>
    </div>
    <textarea 
      bind:value={fullText} 
      rows="4" 
      class="w-full border border-indigo-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-400 bg-white" 
      placeholder="పత్రికా ప్రకటన లేదా పూర్తి వార్తను ఇక్కడ పేస్ట్ చేయండి..."></textarea>
  </div>

  <div class="mb-4">
    <label for="title-input" class="block text-xs font-bold text-slate-700 mb-1">హెడ్‌లైన్ (బోల్డ్ ప్రధాన శీర్షిక)</label>
    <input 
      id="title-input"
      type="text" 
      bind:value={title} 
      class="w-full border rounded-lg p-2.5 text-sm font-bold text-slate-900 border-slate-300 focus:ring-2 focus:ring-red-400" 
      placeholder="ఉదా: శ్రీవాణి స్కూల్‌లో ఘనంగా కృష్ణాష్టమి వేడుకలు" />
  </div>

  <div class="mb-5">
    <div class="flex justify-between items-center mb-1">
      <label for="summary-input" class="block text-xs font-bold text-slate-700">షార్ట్ న్యూస్ సమగ్ర వివరణ</label>
      <span class="text-[11px] font-semibold text-slate-500">{summary.length} అక్షరాలు</span>
    </div>
    <textarea 
      id="summary-input"
      bind:value={summary} 
      rows="5" 
      class="w-full border rounded-lg p-2.5 text-sm text-slate-800 leading-relaxed border-slate-300 focus:ring-2 focus:ring-red-400 font-medium" 
      placeholder="పూర్తి వాక్యాలతో 50-70 పదాల సారాంశం..."></textarea>
  </div>

  <button 
    type="button" 
    on:click={handleSubmit} 
    disabled={isSubmitting} 
    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl shadow-md transition disabled:opacity-50 text-sm tracking-wide">
    {isSubmitting ? 'పబ్లిష్ అవుతోంది...' : '🚀 డిజిటల్ కార్డు లైవ్ పబ్లిష్ చేయండి'}
  </button>
</div>