import { supabase } from '$lib/supabaseClient';

export const ssr = false;
export const prerender = false;

export async function load({ params }) {
    const { id } = params;

    const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    return {
        article: data || null,
        loadError: error ? error.message : null
    };
}