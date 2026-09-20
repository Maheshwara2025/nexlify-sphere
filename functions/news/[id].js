export async function onRequest(context) {
  const { request, params, next } = context;
  const userAgent = request.headers.get('user-agent') || '';
  
  // WhatsApp, Facebook, Twitter తదితర బోట్లను గుర్తించడం
  const isBot = /facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot/i.test(userAgent);

  // సాధారణ వ్యక్తులు బ్రౌజ్ చేస్తుంటే నేరుగా సైట్ ఓపెన్ అవుతుంది
  if (!isBot) {
    return next();
  }

  const id = params.id;
  
  // మీ Supabase వివరాలు (మీ src/lib/supabaseClient.js లో ఉన్నవే ఇక్కడ ఇవ్వండి)
  const SUPABASE_URL = 'https://pxdavbhvpvkrxetctymo.supabase.co'; // <-- మీ Supabase ప్రాజెక్ట్ URL
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4ZGF2Ymh2cHZrcnhldGN0eW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzM0NDAsImV4cCI6MjEwMzc0OTQ0MH0.A77XfiDrjLJvTsK7Q06VopIG1nlF3fQhm2GhZmZ1BMc";
              // <-- మీ Supabase Anon Key

  try {
    // 1. news_articles టేబుల్ నుండి డేటా తెచ్చుకోవడం
    let res = await fetch(`${SUPABASE_URL}/rest/v1/news_articles?id=eq.${id}&select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    let data = await res.json();
    let article = data && data[0];

    // ఒకవేళ news_articles లో లేకపోతే news టేబుల్ చెక్ చేయడం
    if (!article) {
      const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/news?id=eq.${id}&select=*`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      const fallbackData = await fallbackRes.json();
      article = fallbackData && fallbackData[0];
    }

    if (!article) {
      return next();
    }

    const title = article.headline || article.title || 'NS News ముత్తారం';
    const desc = (article.subline_1 || article.content || '').substring(0, 130).replace(/[\r\n]+/g, ' ');
    const imgUrl = article.image_url || 'https://www.nexlifynucleus.in/default-banner.jpg';

    // WhatsApp బోట్ కోసం పక్కాగా మెటా ట్యాగ్స్ ఉన్న HTML పేజీ
    const html = `<!DOCTYPE html>
<html lang="te">
<head>
  <meta charset="utf-8">
  <title>${title} | NS News</title>
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="NS News Network" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}..." />
  <meta property="og:image" content="${imgUrl}" />
  <meta property="og:image:secure_url" content="${imgUrl}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="https://www.nexlifynucleus.in/news/${id}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}..." />
  <meta name="twitter:image" content="${imgUrl}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${desc}</p>
  <img src="${imgUrl}" alt="${title}" />
</body>
</html>`;

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8'
      }
    });

  } catch (err) {
    return next();
  }
}