import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  const { text, language } = await request.json();

  const langNames = { te: 'Telugu', en: 'English', hi: 'Hindi' };
  const targetLang = langNames[language] || 'Telugu';

  const systemPrompt = `You are a professional local news editor for a mobile short-news app like Way2News.
Summarize the provided text strictly into:
1. A punchy headline (maximum 10-12 words).
2. A concise news summary in bullet points or short paragraph (strictly 50 to 70 words) written in clear, journalistic ${targetLang}.
Respond strictly in valid JSON format:
{
  "suggestedTitle": "...",
  "summary": "..."
}`;

  try {
    // Gemini API లేదా Cloudflare AI Workers కాల్
    const apiKey = process.env.GEMINI_API_KEY; 
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nOriginal News Content:\n${text}` }]
        }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(resultText);

    return json(parsed);
  } catch (error) {
    return json({ error: 'AI processing failed' }, { status: 500 });
  }
}