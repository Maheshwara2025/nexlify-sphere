import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

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

    const fileExt = imageFile.name ? imageFile.name.split('.').pop() : 'jpg';
    const fileName = `shorts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `shorts/${fileName}`;

    // Supabase Storage కు అప్‌లోడ్
    const { error: uploadError } = await supabase.storage
      .from('news-images')
      .upload(filePath, imageFile, {
        contentType: imageFile.type,
        upsert: true
      });

    let imageUrl = '';
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('news-images')
        .getPublicUrl(filePath);
      imageUrl = publicUrl;
    } else {
      // స్టోరేజ్ బకెట్ లేకపోతే Base64 ఫాల్‌బ్యాక్
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      imageUrl = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
    }

    // టేబుల్‌లోకి ఇన్సర్ట్
    const { data, error: insertError } = await supabase
      .from('shorts')
      .insert([
        {
          title,
          summary,
          image_url: imageUrl,
          reporter_name: reporterName,
          location,
          language
        }
      ])
      .select();

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      return json({ error: insertError.message }, { status: 500 });
    }

    return json({ success: true, item: data[0] });
  } catch (err) {
    console.error('API Server Error:', err);
    return json({ error: 'సర్వర్ లోపం ఏర్పడింది' }, { status: 500 });
  }
}