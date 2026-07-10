import fs from 'fs';
import path from 'path';

const XERONITE_BASE = 'https://xeronite.wtf';

function loadCookies() {
  try {
    const filePath = path.join(process.cwd(), 'cookies.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log('✅ Cookies file loaded');
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
    console.error('❌ Cookies load failed:', e.message);
    return '';
  }
}

export default async function handler(req, res) {
  console.log('📥 Request received:', req.body);

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
      return res.status(401).json({ error: 'No cookies in cookies.txt' });
    }

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': 'https://xeronite.wtf/dashboard/lookup',
      'Cookie': cookieHeader,
    };

    console.log('🔑 Using cookies:', cookieHeader.slice(0, 100) + '...');

    // Snusbase
    const snusbaseRes = await fetch(`${XERONITE_BASE}/api/snusbase`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ terms: [query], types: [type], wildcard }),
    });

    let snusbaseData;
    if (snusbaseRes.ok) {
      snusbaseData = await snusbaseRes.json();
    } else {
      snusbaseData = { error: `HTTP ${snusbaseRes.status}`, body: await snusbaseRes.text().catch(() => 'No body') };
    }

    // BreachVIP
    const breachvipRes = await fetch(`${XERONITE_BASE}/api/breachvip`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ term: query, fields: [type], categories: [], wildcard, case_sensitive: false }),
    });

    let breachvipData;
    if (breachvipRes.ok) {
      breachvipData = await breachvipRes.json();
    } else {
      breachvipData = { error: `HTTP ${breachvipRes.status}`, body: await breachvipRes.text().catch(() => 'No body') };
    }

    const final = {
      success: true,
      type,
      query,
      snusbase: snusbaseData,
      breachvip: breachvipData,
    };

    console.log('✅ Response sent');
    res.status(200).json(final);

  } catch (error) {
    console.error('💥 Server error:', error);
    res.status(500).json({ error: error.message });
  }
}
