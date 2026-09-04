import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';

// మీ .env లోని Supabase వివరాలు (లేదా మీరు ఇప్పటికే వాడుతున్న supabaseClient ని ఇంపోర్ట్ చేసుకోవచ్చు)
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST({ request }) {
  try {
    const formData = await request.formData();

    const title = formData.get('title');
    const summary = formData.get('summary');
    const location = formData.get('location');
    const reporterName = formData.get('reporterName') || 'NS Reporter';
    const language = formData.get('language') || 'te';
    const imageFile = formData.get('image');

    if (!title || !summary || !imageFile) {
      return json({ error: 'శీర్షిక, వివరణ మరియు ఫోటో తప్పనిసరి' }, { status: 400 });
    }

    // 1. ఫోటోను Supabase Storage బకెట్‌లోకి అప్‌లోడ్ చేయడం
    const fileExt = imageFile.name.split('.').pop() || 'jpg';
    const fileName = `shorts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `shorts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('news-images') // మీ బకెట్ పేరు ఇక్కడ సరిచూసుకోండి
      .upload(filePath, imageFile, {
        contentType: imageFile.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return json({ error: 'ఫోటో అప్‌లోడ్ కాలేదు' }, { status: 500 });
    }

    // 2. అప్‌లోడ్ అయిన ఫోటో పబ్లిక్ URL పొందడం
    const { data: { publicUrl } } = supabase.storage
      .from('news-images')
      .getPublicUrl(filePath);

    // 3. Supabase 'shorts' టేబుల్‌లోకి డేటా ఇన్సర్ట్ చేయడం
    const { data, error: insertError } = await supabase
      .from('shorts')
      .insert([
        {
          title,
          summary,
          image_url: publicUrl,
          reporter_name: reporterName,
          location,
          language
        }
      ])
      .select();

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      return json({ error: 'డేటాబేస్‌లో సేవ్ కాలేదు' }, { status: 500 });
    }

    return json({ success: true, item: data[0] });
  } catch (err) {
    console.error('API Error:', err);
    return json({ error: 'సర్వర్ లోపం ఏర్పడింది' }, { status: 500 });
  }
}