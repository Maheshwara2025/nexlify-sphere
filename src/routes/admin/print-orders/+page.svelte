<script>
  import { onMount } from 'svelte';

  // Mode Selection: 'single' (Application/Bills) or 'idcard' (Front + Back)
  let processMode = 'idcard'; // 'single' | 'idcard'
  let layoutMode = 'top_bottom'; // 'top_bottom' | 'side_by_side'
  let filterLevel = 'magic_white'; // 'magic_white' | 'high_contrast' | 'original'

  // Image Data Sources
  let singleImgSrc = null;
  let frontImgSrc = null;
  let backImgSrc = null;

  // Canvas Reference
  let a4Canvas;
  let isProcessing = false;

  // Handle File Input Picks
  function handleFilePick(e, target) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      if (target === 'single') singleImgSrc = result;
      if (target === 'front') frontImgSrc = result;
      if (target === 'back') backImgSrc = result;
      triggerCanvasRender();
    };
    reader.readAsDataURL(file);
  }

  // Load Image Object Helper
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Magic White Filter: Removes dark shadows and turns grey paper 100% white
  function applyMagicWhiteFilter(ctx, x, y, w, h) {
    if (filterLevel === 'original') return;

    const imgData = ctx.getImageData(x, y, w, h);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // Grayscale luminance
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      if (filterLevel === 'magic_white') {
        // High threshold whitening (shadow removal)
        if (gray > 135) {
          d[i] = 255;
          d[i + 1] = 255;
          d[i + 2] = 255;
        } else {
          // Darken text for sharp crisp black ink
          let darkFactor = 1.3;
          d[i] = Math.max(0, r * darkFactor - 45);
          d[i + 1] = Math.max(0, g * darkFactor - 45);
          d[i + 2] = Math.max(0, b * darkFactor - 45);
        }
      } else if (filterLevel === 'high_contrast') {
        // Pure B&W threshold
        let v = gray > 125 ? 255 : 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
      }
    }
    ctx.putImageData(imgData, x, y);
  }

  // Main Render to A4 Canvas (Standard A4 ratio 1:1.414, Canvas size: 1240 x 1754 px)
  async function triggerCanvasRender() {
    if (!a4Canvas) return;
    isProcessing = true;

    const ctx = a4Canvas.getContext('2d');
    const A4_W = 1240;
    const A4_H = 1754;

    a4Canvas.width = A4_W;
    a4Canvas.height = A4_H;

    // Fill Pure White Paper Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, A4_W, A4_H);

    try {
      if (processMode === 'single' && singleImgSrc) {
        const img = await loadImage(singleImgSrc);
        // Scale to fit A4 margins
        const margin = 60;
        const maxW = A4_W - margin * 2;
        const maxH = A4_H - margin * 2;
        let scale = Math.min(maxW / img.width, maxH / img.height);
        let drawW = img.width * scale;
        let drawH = img.height * scale;
        let drawX = (A4_W - drawW) / 2;
        let drawY = margin;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        applyMagicWhiteFilter(ctx, drawX, drawY, drawW, drawH);

      } else if (processMode === 'idcard') {
        // CR80 ID Card Standard Ratio (85.6mm x 54mm -> approx 540 x 340 px on this scale)
        const cardW = 540;
        const cardH = 340;

        if (layoutMode === 'top_bottom') {
          // Layout 1: Top & Bottom (Standard Xerox copy)
          if (frontImgSrc) {
            const front = await loadImage(frontImgSrc);
            let fX = (A4_W - cardW) / 2;
            let fY = 120;
            ctx.drawImage(front, fX, fY, cardW, cardH);
            applyMagicWhiteFilter(ctx, fX, fY, cardW, cardH);
            // Border outline
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.strokeRect(fX, fY, cardW, cardH);
          }

          if (backImgSrc) {
            const back = await loadImage(backImgSrc);
            let bX = (A4_W - cardW) / 2;
            let bY = 520;
            ctx.drawImage(back, bX, bY, cardW, cardH);
            applyMagicWhiteFilter(ctx, bX, bY, cardW, cardH);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.strokeRect(bX, bY, cardW, cardH);
          }

        } else if (layoutMode === 'side_by_side') {
          // Layout 2: Side by Side (Pouch/Lamination fold)
          const gap = 30;
          let startX = (A4_W - (cardW * 2 + gap)) / 2;
          let startY = 200;

          if (frontImgSrc) {
            const front = await loadImage(frontImgSrc);
            ctx.drawImage(front, startX, startY, cardW, cardH);
            applyMagicWhiteFilter(ctx, startX, startY, cardW, cardH);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, startY, cardW, cardH);
          }

          if (backImgSrc) {
            const back = await loadImage(backImgSrc);
            let bX = startX + cardW + gap;
            ctx.drawImage(back, bX, startY, cardW, cardH);
            applyMagicWhiteFilter(ctx, bX, startY, cardW, cardH);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.strokeRect(bX, startY, cardW, cardH);
          }
        }
      }
    } catch (err) {
      console.error('Render error:', err);
    } finally {
      isProcessing = false;
    }
  }

  // 1-Click Print Command
  function printA4Document() {
    if (!a4Canvas) return;
    const printWindow = window.open('', '_blank');
    const dataUrl = a4Canvas.toDataURL('image/jpeg', 0.98);
    printWindow.document.write(`
      <html>
        <head>
          <title>A.S.V. Doc Print</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; display: flex; justify-content: center; align-items: flex-start; background: #fff; }
            img { width: 100%; height: auto; max-width: 210mm; display: block; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <img src="${dataUrl}" />
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Download JPEG image
  function downloadA4Jpeg() {
    if (!a4Canvas) return;
    const link = document.createElement('a');
    link.download = `ASV_Clean_Print_${Date.now()}.jpg`;
    link.href = a4Canvas.toDataURL('image/jpeg', 0.98);
    link.click();
  }
</script>

<svelte:head>
  <title>A.S.V. Doc & ID Card Auto Cleaner | Printing Studio</title>
</svelte:head>

<div class="min-h-screen bg-slate-100 font-sans pb-20 text-slate-900">
  
  <!-- Header -->
  <header class="bg-slate-900 text-white px-4 py-3 sticky top-0 z-40 border-b-2 border-amber-500 shadow-md">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🖨️</span>
        <div>
          <h1 class="text-sm sm:text-base font-black">A.S.V. DOC & ID CARD AUTO CLEANER</h1>
          <p class="text-[10px] text-slate-400">Mobile Photos ni CamScanner la clean chesi A4 Printing Ready chese Tool</p>
        </div>
      </div>
      <a href="/admin/contractor" class="bg-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold border border-slate-700">
        ← Contractor Desk
      </a>
    </div>
  </header>

  <main class="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    
    <!-- LEFT CONTROLS PANEL (5 Columns) -->
    <section class="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5">
      
      <!-- 1. Mode Switcher -->
      <div>
        <label class="block text-xs font-black text-slate-700 uppercase mb-2">1. Document Type</label>
        <div class="grid grid-cols-2 gap-2 text-xs font-bold">
          <button
            type="button"
            on:click={() => { processMode = 'idcard'; triggerCanvasRender(); }}
            class="p-3 rounded-2xl border text-left transition {processMode === 'idcard' ? 'bg-amber-500 text-black border-amber-400 font-black shadow' : 'bg-slate-50 text-slate-600'}"
          >
            <span class="text-xl block mb-1">🪪</span>
            <span>ID Card (Front + Back)</span>
            <span class="text-[10px] block font-normal opacity-80">Aadhaar, Voter ID, DL</span>
          </button>

          <button
            type="button"
            on:click={() => { processMode = 'single'; triggerCanvasRender(); }}
            class="p-3 rounded-2xl border text-left transition {processMode === 'single' ? 'bg-amber-500 text-black border-amber-400 font-black shadow' : 'bg-slate-50 text-slate-600'}"
          >
            <span class="text-xl block mb-1">📄</span>
            <span>Single Page Doc</span>
            <span class="text-[10px] block font-normal opacity-80">Forms, Bills, Certificates</span>
          </button>
        </div>
      </div>

      <!-- 2. ID Card Layout (Top/Bottom or Side by Side) -->
      {#if processMode === 'idcard'}
        <div>
          <label class="block text-xs font-black text-slate-700 uppercase mb-2">2. ID Card A4 Alignment</label>
          <div class="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              type="button"
              on:click={() => { layoutMode = 'top_bottom'; triggerCanvasRender(); }}
              class="p-2.5 rounded-xl border text-center transition {layoutMode === 'top_bottom' ? 'bg-slate-900 text-white font-black shadow' : 'bg-slate-50 text-slate-700'}"
            >
              📑 Top & Bottom (Xerox)
            </button>
            <button
              type="button"
              on:click={() => { layoutMode = 'side_by_side'; triggerCanvasRender(); }}
              class="p-2.5 rounded-xl border text-center transition {layoutMode === 'side_by_side' ? 'bg-slate-900 text-white font-black shadow' : 'bg-slate-50 text-slate-700'}"
            >
              ↔️ Side by Side (Lamination)
            </button>
          </div>
        </div>
      {/if}

      <!-- 3. Upload Buttons (Mobile Camera / Gallery Pick) -->
      <div class="space-y-3">
        <label class="block text-xs font-black text-slate-700 uppercase">3. Upload Photos</label>

        {#if processMode === 'idcard'}
          <div class="grid grid-cols-2 gap-3 text-xs">
            <!-- Front Photo Pick -->
            <div class="border-2 border-dashed border-slate-300 bg-slate-50 p-3 rounded-2xl text-center">
              <input type="file" id="front-in" accept="image/*" capture="environment" on:change={(e) => handleFilePick(e, 'front')} class="hidden" />
              <label for="front-in" class="cursor-pointer block space-y-1">
                <span class="text-2xl block">📷</span>
                <span class="font-bold text-slate-800 block">Front Photo</span>
                <span class="text-[10px] text-slate-500 block">Click chesi theeyandi</span>
              </label>
              {#if frontImgSrc}
                <span class="text-[10px] font-bold text-emerald-600 block mt-1">✓ Front Loaded</span>
              {/if}
            </div>

            <!-- Back Photo Pick -->
            <div class="border-2 border-dashed border-slate-300 bg-slate-50 p-3 rounded-2xl text-center">
              <input type="file" id="back-in" accept="image/*" capture="environment" on:change={(e) => handleFilePick(e, 'back')} class="hidden" />
              <label for="back-in" class="cursor-pointer block space-y-1">
                <span class="text-2xl block">🔄</span>
                <span class="font-bold text-slate-800 block">Back Photo</span>
                <span class="text-[10px] text-slate-500 block">Click chesi theeyandi</span>
              </label>
              {#if backImgSrc}
                <span class="text-[10px] font-bold text-emerald-600 block mt-1">✓ Back Loaded</span>
              {/if}
            </div>
          </div>
        {:else}
          <!-- Single Doc Pick -->
          <div class="border-2 border-dashed border-slate-300 bg-slate-50 p-4 rounded-2xl text-center">
            <input type="file" id="single-in" accept="image/*" capture="environment" on:change={(e) => handleFilePick(e, 'single')} class="hidden" />
            <label for="single-in" class="cursor-pointer block space-y-1">
              <span class="text-3xl block">📄</span>
              <span class="font-bold text-slate-800 block">Document Photo Upload</span>
              <span class="text-[11px] text-slate-500 block">Mobile photo / WhatsApp image</span>
            </label>
            {#if singleImgSrc}
              <span class="text-xs font-bold text-emerald-600 block mt-1">✓ Document Loaded</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- 4. Clean Filter Options -->
      <div>
        <label class="block text-xs font-black text-slate-700 uppercase mb-2">4. Magic Cleaner Filter</label>
        <div class="grid grid-cols-3 gap-2 text-xs font-bold">
          <button
            type="button"
            on:click={() => { filterLevel = 'magic_white'; triggerCanvasRender(); }}
            class="p-2 rounded-xl border text-center transition {filterLevel === 'magic_white' ? 'bg-emerald-600 text-white font-black' : 'bg-slate-50 text-slate-700'}"
          >
            ✨ Magic White
          </button>
          <button
            type="button"
            on:click={() => { filterLevel = 'high_contrast'; triggerCanvasRender(); }}
            class="p-2 rounded-xl border text-center transition {filterLevel === 'high_contrast' ? 'bg-slate-900 text-white font-black' : 'bg-slate-50 text-slate-700'}"
          >
            🖤 Deep B&W
          </button>
          <button
            type="button"
            on:click={() => { filterLevel = 'original'; triggerCanvasRender(); }}
            class="p-2 rounded-xl border text-center transition {filterLevel === 'original' ? 'bg-slate-900 text-white font-black' : 'bg-slate-50 text-slate-700'}"
          >
            🎨 Original Color
          </button>
        </div>
      </div>

      <!-- 5. Actions: Print & Download -->
      <div class="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          on:click={printA4Document}
          class="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs"
        >
          <span>🖨️</span>
          <span>1-Click A4 Print</span>
        </button>

        <button
          type="button"
          on:click={downloadA4Jpeg}
          class="bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs"
        >
          <span>💾</span>
          <span>Download JPEG</span>
        </button>
      </div>

    </section>

    <!-- RIGHT A4 PREVIEW CANVAS (7 Columns) -->
    <section class="lg:col-span-7 flex flex-col items-center justify-center">
      <div class="w-full mb-2 flex items-center justify-between text-xs text-slate-500 font-bold px-2">
        <span>📄 Live A4 Sheet Preview (100% Print Ready)</span>
        <span>{isProcessing ? 'Processing Clean Filter...' : 'Ready'}</span>
      </div>

      <!-- Scaled Container for A4 Aspect Ratio -->
      <div class="w-full max-w-[440px] bg-white p-3 rounded-2xl shadow-xl border border-slate-300 flex items-center justify-center">
        <canvas
          bind:this={a4Canvas}
          class="w-full h-auto border border-slate-200 shadow-inner bg-white rounded"
        ></canvas>
      </div>
    </section>

  </main>
</div>