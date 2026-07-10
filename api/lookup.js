import fs from 'fs';
import path from 'path';

const XERONITE_BASE = 'https://xeronite.wtf';

function loadCookies() {
  try {
    const filePath = path.join(process.cwd(), 'cookies.txt');
    const content = fs.readFileSync(filePath, 'utf-8');

    const cookies = content
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => {
        const parts = line.trim().split('\t');
        if (parts.length >= 7) {
          const name = parts[5];
          const value = parts[6];
          return `${name}=${value}`;
        }
        return null;
      })
      .filter(Boolean)
      .join('; ');

    return cookies;
  } catch (error) {
    console.error('Failed to load cookies.txt:', error);
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, query, wildcard = false } = req.body;

    if (!type || !query) {
      return res.status(400).json({ error: 'Missing type or query' });
    }

    const cookieHeader = loadCookies();

    if (!cookieHeader) {
      return res.status(401).json({ error: 'No cookies found in cookies.txt' });
    }

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Referer': `${XERONITE_BASE}/dashboard/lookup`,
      'Cookie': cookieHeader,
    };

    const results = { snusbase: null, breachvip: null };

    // Snusbase
    const snusbaseRes = await fetch(`${XERONITE_BASE}/api/snusbase`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        terms: [query],
        types: [type],
        wildcard,
      }),
    });

    results.snusbase = snusbaseRes.ok 
      ? await snusbaseRes.json() 
      : { error: await snusbaseRes.text() };

    // BreachVIP
    const breachvipRes = await fetch(`${XERONITE_BASE}/api/breachvip`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        term: query,
        fields: [type],
        categories: [],
        wildcard,
        case_sensitive: false,
      }),
    });

    results.breachvip = breachvipRes.ok 
      ? await breachvipRes.json() 
      : { error: await breachvipRes.text() };

    res.status(200).json({
      success: true,
      type,
      query,
      ...results
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
