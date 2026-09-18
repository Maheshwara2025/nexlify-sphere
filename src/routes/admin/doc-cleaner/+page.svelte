<script>
  import { onMount } from 'svelte';

  let slots = [
    { id: 1, label: 'ముందు భాగం (Front Side)', originalImg: null, processedUrl: null, threshold: 140, contrast: 25, brightness: 15, mode: 'bw', rotation: 0 },
    { id: 2, label: 'వెనుక భాగం (Back Side)', originalImg: null, processedUrl: null, threshold: 140, contrast: 25, brightness: 15, mode: 'bw', rotation: 0 }
  ];
  let activeSlot = 0;

  // వాట్సాప్ వెబ్ నుండి డైరెక్ట్ Ctrl + V పేస్ట్ సదుపాయం
  onMount(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          loadImage(file, activeSlot);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  });

  function handleFileSelect(e, slotIndex) {
    const file = e.target.files[0];
    if (file) loadImage(file, slotIndex);
  }

  function loadImage(file, slotIndex) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        slots[slotIndex].originalImg = img;
        processImage(slotIndex);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // కాన్వాస్ పిక్సెల్ ప్రాసెసింగ్ (బ్లాక్ రిమూవర్ & కాంట్రాస్ట్ బూస్టర్)
  function processImage(slotIndex) {
    const slot = slots[slotIndex];
    if (!slot.originalImg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const isRotated = slot.rotation === 90 || slot.rotation === 270;
    canvas.width = isRotated ? slot.originalImg.height : slot.originalImg.width;
    canvas.height = isRotated ? slot.originalImg.width : slot.originalImg.height;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((slot.rotation * Math.PI) / 180);
    ctx.drawImage(slot.originalImg, -slot.originalImg.width / 2, -slot.originalImg.height / 2);
    ctx.restore();

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    const contrastFactor = (259 * (slot.contrast + 255)) / (255 * (259 - slot.contrast));

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // Brightness
      r += slot.brightness;
      g += slot.brightness;
      b += slot.brightness;

      // Contrast
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;

      if (slot.mode === 'bw') {
        // జెరాక్స్ మోడ్: డీప్ బ్లాక్ అక్షరాలు & ప్యూర్ వైట్ బ్యాక్‌గ్రౌండ్
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const val = gray > slot.threshold ? 255 : 0;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      } else if (slot.mode === 'color') {
        // కలర్ ఐడీ కార్డుల క్లారిటీ బూస్ట్
        d[i] = Math.min(255, Math.max(0, r));
        d[i + 1] = Math.min(255, Math.max(0, g));
        d[i + 2] = Math.min(255, Math.max(0, b));
      }
    }

    ctx.putImageData(imgData, 0, 0);
    slots[slotIndex].processedUrl = canvas.toDataURL('image/png');
    slots = [...slots];
  }

  function rotateSlot(slotIndex) {
    slots[slotIndex].rotation = (slots[slotIndex].rotation + 90) % 360;
    processImage(slotIndex);
  }

  function triggerPrint() {
    window.print();
  }

  function clearSlot(slotIndex) {
    slots[slotIndex].originalImg = null;
    slots[slotIndex].processedUrl = null;
    slots = [...slots];
  }
</script>

<svelte:head>
  <title>A.S.V. Document Scanner & Print Desk</title>
</svelte:head>

<!-- స్క్రీన్ వ్యూ (ప్రింటింగ్ సమయంలో ఇది కనిపించదు) -->
<div class="no-print min-h-screen bg-slate-100 p-4 sm:p-6 font-sans">
  <div class="max-w-6xl mx-auto space-y-6">
    
    <!-- హెడర్ -->
    <div class="bg-white p-5 rounded-2xl shadow-sm border flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-black text-slate-900">🖨️ A.S.V. డాక్యుమెంట్ క్లీనర్ & ప్రింట్ డెస్క్</h1>
        <p class="text-xs text-slate-500 mt-0.5">
          వాట్సాప్ నుంచి ఇమేజ్ కాపీ చేసి నేరుగా ఇక్కడ <b>Ctrl + V</b> నొక్కండి లేదా ఫైల్ సెలెక్ట్ చేయండి.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <a href="/" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold">
          🏠 హోమ్
        </a>
        <button
          on:click={triggerPrint}
          class="bg-red-600 hover:bg-red-700 text-white font-black text-sm px-6 py-2.5 rounded-xl shadow flex items-center gap-2"
        >
          <span>🖨️ A4 ప్రింట్ తీయండి (Print)</span>
        </button>
      </div>
    </div>

    <!-- స్లాట్స్ గ్రిడ్ (Front & Back) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each slots as slot, idx}
        <div
          class="bg-white rounded-2xl p-5 border shadow-sm space-y-4 {activeSlot === idx ? 'ring-2 ring-red-500' : ''}"
          on:click={() => activeSlot = idx}
        >
          <div class="flex items-center justify-between border-b pb-2">
            <span class="font-bold text-sm text-slate-800">{slot.label}</span>
            <div class="flex items-center gap-2">
              {#if slot.processedUrl}
                <button
                  on:click|stopPropagation={() => rotateSlot(idx)}
                  class="text-xs bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-bold"
                >
                  🔄 90° తిప్పండి
                </button>
                <button
                  on:click|stopPropagation={() => clearSlot(idx)}
                  class="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg font-bold"
                >
                  తొలగించు
                </button>
              {/if}
            </div>
          </div>

          <!-- ప్రివ్యూ / అప్‌లోడ్ ఏరియా -->
          <div class="border-2 border-dashed rounded-xl h-64 flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {#if slot.processedUrl}
              <img src={slot.processedUrl} alt="Processed" class="max-h-full max-w-full object-contain" />
            {:else}
              <label class="flex flex-col items-center cursor-pointer p-4 text-center">
                <span class="text-3xl mb-1">📄</span>
                <span class="text-xs font-bold text-slate-700">ఇమేజ్ ఎంచుకోండి లేదా Ctrl+V నొక్కండి</span>
                <span class="text-[10px] text-slate-400 mt-1">ఆధార్, రేషన్ కార్డు, ఓటర్ కార్డు మొదలైనవి</span>
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  on:change={(e) => handleFileSelect(e, idx)}
                />
              </label>
            {/if}
          </div>

          <!-- కంట్రోల్స్ (బ్లాక్ రిమూవర్ & బ్రైట్‌నెస్) -->
          {#if slot.processedUrl}
            <div class="space-y-3 pt-2 bg-slate-50 p-3 rounded-xl border text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-700">మోడ్ ఎంచుకోండి:</span>
                <div class="flex gap-2">
                  <button
                    type="button"
                    on:click={() => { slot.mode = 'bw'; processImage(idx); }}
                    class="px-2.5 py-1 rounded-lg font-bold {slot.mode === 'bw' ? 'bg-slate-900 text-white' : 'bg-white border'}"
                  >
                    జెరాక్స్ B&W (క్లీన్)
                  </button>
                  <button
                    type="button"
                    on:click={() => { slot.mode = 'color'; processImage(idx); }}
                    class="px-2.5 py-1 rounded-lg font-bold {slot.mode === 'color' ? 'bg-slate-900 text-white' : 'bg-white border'}"
                  >
                    కలర్ కార్డు
                  </button>
                </div>
              </div>

              {#if slot.mode === 'bw'}
                <div>
                  <div class="flex justify-between text-slate-600 mb-1">
                    <span>నలుపు రిమూవర్ (Threshold):</span>
                    <span class="font-bold">{slot.threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="220"
                    bind:value={slot.threshold}
                    on:input={() => processImage(idx)}
                    class="w-full accent-red-600"
                  />
                </div>
              {/if}

              <div>
                <div class="flex justify-between text-slate-600 mb-1">
                  <span>కాంట్రాస్ట్ & షార్ప్‌నెస్:</span>
                  <span class="font-bold">{slot.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="100"
                  bind:value={slot.contrast}
                  on:input={() => processImage(idx)}
                  class="w-full accent-red-600"
                />
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- A4 షీట్ డెస్క్‌టాప్ ప్రివ్యూ -->
    <div class="bg-white p-6 rounded-2xl border shadow-sm space-y-3">
      <h2 class="text-sm font-bold text-slate-800">A4 పేపర్ ప్రింట్ లేఅవుట్ ముందస్తు వీక్షణ:</h2>
      <div class="w-full max-w-sm mx-auto aspect-[1/1.414] bg-white border-2 border-slate-300 shadow-md p-4 flex flex-col justify-around items-center rounded">
        {#if slots[0].processedUrl}
          <img src={slots[0].processedUrl} alt="Front" class="max-h-[42%] max-w-full object-contain border border-dashed border-slate-200" />
        {:else}
          <div class="h-[42%] w-full border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300">
            ముందు భాగం ఇక్కడ ప్రింట్ అవుతుంది
          </div>
        {/if}

        {#if slots[1].processedUrl}
          <img src={slots[1].processedUrl} alt="Back" class="max-h-[42%] max-w-full object-contain border border-dashed border-slate-200" />
        {:else}
          <div class="h-[42%] w-full border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300">
            వెనుక భాగం ఇక్కడ ప్రింట్ అవుతుంది
          </div>
        {/if}
      </div>
    </div>

  </div>
</div>

<!-- అసలైన A4 ప్రింటింగ్ పేజీ (ఇది మాత్రమే ప్రింటర్‌లోకి వెళ్తుంది) -->
<div class="print-only">
  <div class="a4-page">
    {#if slots[0].processedUrl}
      <div class="doc-container">
        <img src={slots[0].processedUrl} alt="Document Front" class="doc-img" />
      </div>
    {/if}

    {#if slots[1].processedUrl}
      <div class="doc-container">
        <img src={slots[1].processedUrl} alt="Document Back" class="doc-img" />
      </div>
    {/if}
  </div>
</div>

<style>
  /* ప్రింటింగ్ లేఅవుట్ స్టైల్స్ */
  .print-only {
    display: none;
  }

  @media print {
    :global(body) {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .no-print {
      display: none !important;
    }

    .print-only {
      display: block !important;
      width: 100vw;
      height: 100vh;
    }

    .a4-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 15mm 20mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 20mm;
      box-sizing: border-box;
    }

    .doc-container {
      width: 100%;
      max-width: 130mm;
      display: flex;
      justify-content: center;
    }

    .doc-img {
      max-width: 100%;
      max-height: 105mm;
      object-contain: contain;
      filter: contrast(1.1);
    }
  }
</style>