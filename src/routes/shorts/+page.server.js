import { supabase } from '$lib/supabaseClient';

export async function load({ url }) {
  const id = url.searchParams.get('id');

  let query = supabase.from('shorts').select('*');
  if (id) {
    query = query.eq('id', id);
  } else {
    query = query.order('created_at', { ascending: false }).limit(1);
  }

  const { data } = await query;
  const currentShort = data && data.length > 0 ? data[0] : null;

  return {
    metaItem: currentShort
  };
}