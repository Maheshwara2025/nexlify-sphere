<script>
  import { supabase } from '$lib/supabaseClient';

  let title = '';
  let newspaperName = 'ప్రజా ప్రతిభ';
  let clipDate = new Date().toISOString().split('T')[0];
  let pageNumber = 'Page 4';
  let fileInput;
  let uploading = false;
  let uploadedClips = [];
  let successMsg = '';

  async function loadClips() {
    const { data } = await supabase
      .from('paper_clips')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) uploadedClips = data;
  }

  loadClips();

  async function handleUpload() {
    if (!title || !fileInput.files[0]) {
      alert('Title mariyu Photo select cheyandi');
      return;
    }

    uploading = true;
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `clips/${Date.now()}.${fileExt}`;

    // Supabase Storage loki upload
    const { error: uploadError } = await supabase.storage
      .from('news-images')
      .upload(filePath, file);

    if (uploadError) {
      alert('Upload fail ayindi: ' + uploadError.message);
      uploading = false;
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('news-images')
      .getPublicUrl(filePath);

    // Database lo record save cheyadam
    const { error: dbError } = await supabase.from('paper_clips').insert([{
      title,
      newspaper_name: newspaperName,
      clip_date: clipDate,
      page_number: pageNumber,
      image_url: publicUrlData.publicUrl
    }]);

    uploading = false;

    if (!dbError) {
      successMsg = 'Paper clip vijayavantamga upload ayindi!';
      title = '';
      fileInput.value = '';
      loadClips();
      setTimeout(() => successMsg = '', 4000);
    }
  }
</script>

<div class="max-w-4xl mx-auto p-6 space-y-8 font-sans">
  <div class="border-b pb-4">
    <h1 class="text-2xl font-black text-slate-800">📰 E-Paper Clips Upload Desk</h1>
    <p class="text-xs text-slate-500">Local paper cuttings upload chesi direct viral share links generate cheyandi</p>
  </div>

  {#if successMsg}
    <div class="bg-emerald-100 text-emerald-800 p-3 rounded-xl text-sm font-bold">
      {successMsg}
    </div>
  {/if}

  <form on:submit|preventDefault={handleUpload} class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
    <div>
      <label class="block text-xs font-bold text-slate-700 mb-1">వార్త శీర్షిక (Title):</label>
      <input type="text" bind:value={title} placeholder="ఉదా: ముత్తారంలో ఘనంగా విశ్వకర్మ జయంతి వేడుకలు" class="w-full border rounded-xl p-3 text-sm" required />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">దినపత్రిక పేరు:</label>
        <input type="text" bind:value={newspaperName} class="w-full border rounded-xl p-2.5 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">తేదీ:</label>
        <input type="date" bind:value={clipDate} class="w-full border rounded-xl p-2.5 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">పేజీ నంబర్:</label>
        <input type="text" bind:value={pageNumber} placeholder="Page 4" class="w-full border rounded-xl p-2.5 text-sm" />
      </div>
    </div>

    <div>
      <label class="block text-xs font-bold text-slate-700 mb-1">పేపర్ కటింగ్ ఇమేజ్:</label>
      <input type="file" bind:this={fileInput} accept="image/*" class="w-full border rounded-xl p-2 text-sm" required />
    </div>

    <button type="submit" disabled={uploading} class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow transition">
      {uploading ? 'Uploading...' : 'Paper Clip Upload & Publish Cheyandi'}
    </button>
  </form>

  <!-- Upload chesina clips list -->
  <div class="space-y-3">
    <h2 class="text-base font-bold text-slate-800">ఇటీవల అప్‌లోడ్ చేసిన క్లిప్పింగ్స్:</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each uploadedClips as item}
        <div class="border rounded-2xl p-4 bg-slate-50 flex gap-3 items-center">
          <img src={item.image_url} alt={item.title} class="w-20 h-20 object-cover rounded-lg border shrink-0" />
          <div class="min-w-0 flex-grow space-y-1">
            <h3 class="text-xs font-bold truncate text-slate-900">{item.title}</h3>
            <p class="text-[11px] text-slate-500">{item.newspaper_name} • {item.page_number}</p>
            <a href="/clip/{item.id}" target="_blank" class="inline-block text-[11px] font-bold text-red-600 hover:underline">
              View & Share Page ➡
            </a>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>