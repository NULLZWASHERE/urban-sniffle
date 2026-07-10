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
        if (parts.length >= 7) return `${parts[5]}=${parts[6]}`;
        return null;
      })
      .filter(Boolean)
      .join('; ');
    return cookies;
  } catch (e) {
    console.error('Cookies load error:', e);
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, query, wildcard = false } = req.body;
    if (!type || !query) return res.status(400).json({ error: 'Missing type or query' });

    const cookieHeader = loadCookies();
    if (!cookieHeader) return res.status(401).json({ error: 'No cookies loaded' });

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': 'https://xeronite.wtf/dashboard/lookup',
      'Cookie': cookieHeader,
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'cors',
    };

    // Try Snusbase
    const snusbaseRes = await fetch(`${XERONITE_BASE}/api/snusbase`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ terms: [query], types: [type], wildcard }),
    });

    // Try BreachVIP
    const breachvipRes = await fetch(`${XERONITE_BASE}/api/breachvip`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ term: query, fields: [type], categories: [], wildcard, case_sensitive: false }),
    });

    const result = {
      success: true,
      type,
      query,
      snusbase: snusbaseRes.ok ? await snusbaseRes.json() : { error: 'Failed' },
      breachvip: breachvipRes.ok ? await breachvipRes.json() : { error: 'Failed' },
    };

    res.status(200).json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal error', message: error.message });
  }
}
