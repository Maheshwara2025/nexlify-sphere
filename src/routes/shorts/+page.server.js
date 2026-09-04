import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function load() {
  const { data: shorts, error } = await supabase
    .from('shorts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shorts:', error);
    return { shorts: [] };
  }

  return { shorts };
}