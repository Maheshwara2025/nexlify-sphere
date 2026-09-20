import { supabase } from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
  const { id } = params;

  if (!id) {
    throw error(404, 'News ID dorakaledu');
  }

  // 1. news_articles table check cheyadam
  let { data: article } = await supabase
    .from('news_articles')
    .select('*')
    .eq('id', id)
    .single();

  // 2. Ovela akkada lekapothe news table check cheyadam
  if (!article) {
    const res = await supabase
      .from('news')
      .select('*')
      .eq('id', id)
      .single();
    article = res.data;
  }

  if (!article) {
    throw error(404, 'Vartha kanipinchaledu');
  }

  return {
    article
  };
}