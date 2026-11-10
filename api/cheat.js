// MITM Navigo - Vercel Serverless Function Proxy for cheat.sh
// Zero AI / LLM - Keyless public query proxy with CORS and 5s timeout

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const query = req.query.q || req.query.topic;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  // Clean and sanitize query
  const cleanTopic = encodeURIComponent(query.trim().replace(/^[\/]+/, ''));
  const url = `https://cheat.sh/${cleanTopic}?T`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'curl/7.68.0'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream error: ${response.statusText}`,
        fallback: true
      });
    }

    const text = await response.text();
    // Cache for 24 hours at edge
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json({
      topic: query,
      code: text,
      source: 'cheat.sh'
    });
  } catch (err) {
    return res.status(504).json({
      error: 'Upstream request timed out or failed',
      fallback: true
    });
  }
}
