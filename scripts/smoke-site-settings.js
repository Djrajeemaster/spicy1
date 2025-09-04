#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

async function main() {
  // Use environment-aware URL
  const isLocal = process.env.NODE_ENV !== 'production';
  const baseUrl = isLocal ? 'http://localhost:3000' : '';
  const url = `${baseUrl}/api/site/settings/dev-write`;
  const payload = {
    enable_push_notifications: false,
    maintenance_mode: true,
    max_daily_posts_per_user: 3,
    auto_delete_expired_days: 2,
  };

  console.log('PUT', url, 'with payload', payload);

  // perform HTTP PUT
  try {
    const fetchFn = (typeof fetch !== 'undefined') ? fetch : (async (u, opts) => {
      const nf = require('node-fetch');
      return nf(u, opts);
    });

    const res = await fetchFn(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('Server responded:', res.status, res.statusText);
    let body = null;
    try { body = await res.json(); } catch (e) { body = await res.text(); }
    console.log('Response body:', body);
  } catch (err) {
    console.error('HTTP request failed:', err.message || err);
  }

  // read local site-settings.json
  try {
    const settingsPath = path.join(__dirname, '..', 'site-settings.json');
    if (!fs.existsSync(settingsPath)) {
      console.warn('site-settings.json not found at', settingsPath);
      return;
    }
    const txt = fs.readFileSync(settingsPath, 'utf8');
    const json = JSON.parse(txt);
    console.log('site-settings.json contents:');
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Failed to read site-settings.json:', err.message || err);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });