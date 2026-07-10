import fs from 'fs';
import path from 'path';

const XERONITE_BASE = 'https://xeronite.wtf';

function loadCookies() {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), 'cookies.txt'), 'utf-8');
    const cookies = content
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(line => {
        const p = line.split('\t');
        return p.length >= 7 ? `${p[5]}=${p[6]}` : null;
      })
      .filter(Boolean)
      .join('; ');
    return cookies;
  } catch (e) {
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, query, wildcard = false } = req.body;
  if (!type || !query) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const cookieHeader = loadCookies();
    if (!cookieHeader) return res.status(401).json({ error: 'No cookies' });

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': 'https://xeronite.wtf/dashboard/lookup',
      'Cookie': cookieHeader,
      'sec-ch-ua': '"Chromium";v="129", "Not;A=Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    };

    // Small delay to reduce rate limit chance
    await new Promise(r => setTimeout(r, 800));

    const [snusbaseRes, breachvipRes] = await Promise.all([
      fetch(`${XERONITE_BASE}/api/snusbase`, { method: 'POST', headers, body: JSON.stringify({ terms: [query], types: [type], wildcard }) }),
      fetch(`${XERONITE_BASE}/api/breachvip`, { method: 'POST', headers, body: JSON.stringify({ term: query, fields: [type], categories: [], wildcard, case_sensitive: false }) })
    ]);

    const result = {
      success: true,
      type,
      query,
      snusbase: snusbaseRes.ok ? await snusbaseRes.json() : { error: `HTTP ${snusbaseRes.status}` },
      breachvip: breachvipRes.ok ? await breachvipRes.json() : { error: `HTTP ${breachvipRes.status}` },
    };

    res.status(200).json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
