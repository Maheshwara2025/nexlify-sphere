/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
  const imageUrl = url.searchParams.get('url');
  if (!imageUrl) {
    return new Response('Image URL ledu', { status: 400 });
  }

  try {
    const res = await fetch(imageUrl);
    const blob = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new Response(blob, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err) {
    return new Response('Image fetch failed: ' + err.message, { status: 500 });
  }
}