<script>
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
    if (!fullText) {
      alert('దయచేసి ముందుగా పూర్తి వార్తను పేస్ట్ చేయండి.');
      return;
    }

    isAiGenerating = true;
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText, language })
      });

      const result = await response.json();
      if (result.summary) {
        summary = result.summary;
        if (result.suggestedTitle && !title) {
          title = result.suggestedTitle;
        }
      }
    } catch (err) {
      alert('AI సారాంశం పొందడంలో లోపం ఏర్పడింది.');
    } finally {
      isAiGenerating = false;
    }
  }

  async function handleSubmit() {
    if (!title || !summary || !imageFile) {
      alert('దయచేసి శీర్షిక, సారాంశం మరియు ఫోటోను అందించండి.');
      return;
    }

    isSubmitting = true;
    const formData = new FormData();
    formData.append('title', title);
    formData.append('summary', summary);
    formData.append('location', location);
    formData.append('reporterName', reporterName);
    formData.append('language', language);
    formData.append('image', imageFile);

    try {
      const res = await fetch('/api/shorts/create', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('షార్ట్ న్యూస్ విజయవంతంగా పబ్లిష్ అయింది!');
        title = '';
        fullText = '';
        summary = '';
        previewUrl = '';
        imageFile = null;
      } else {
        alert('ఎర్రర్: ' + (data.error || 'సేవ్ కాలేదు'));
      }
    } catch (e) {
      alert('నెట్‌వర్క్ లోపం ఏర్పడింది.');
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
        {isAiGenerating ? 'AI సారాంశం రాస్తోంది...' : 'AI సారాంశం చేయి'}
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