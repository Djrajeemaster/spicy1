// Lightweight extractor that fetches rendered HTML from /api/headless-fetch
// and extracts basic metadata using cheerio. This avoids needing a compiled
// TypeScript build of the project's urlService.
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');

function findPriceCandidates($) {
  const text = $('body').text();
  const priceRegex = /\$\s?[0-9.,]{1,10}/g;
  const matches = text.match(priceRegex) || [];
  // return unique first 5
  return Array.from(new Set(matches)).slice(0,5);
}

async function run(url) {
  try {
    console.log('Fetching via headless endpoint:', url);
    const base = 'http://localhost:3000';
    const r = await axios.get(`${base}/api/headless-fetch?url=${encodeURIComponent(url)}`, { timeout: 60000 });
    const html = r.data;
    // Save HTML for debugging
    const safeName = url.replace(/[^a-z0-9]/gi, '_').slice(0,200);
    const outPath = path.join(__dirname, `${safeName}.html`);
    fs.writeFileSync(outPath, html, 'utf8');
    console.log('Saved rendered HTML to', outPath);

    const $ = cheerio.load(html);
    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || $('meta[name="twitter:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || $('meta[name="twitter:description"]').attr('content') || $('p').first().text().trim() || '';
    const images = [];
    $('meta[property="og:image"]').each((i, el) => { const v = $(el).attr('content'); if (v) images.push(v); });
    $('img').each((i, el) => { const src = $(el).attr('src') || $(el).attr('data-src'); if (src && /^(https?:)?\//i.test(src)) images.push(src.startsWith('http') ? src : (new URL(url)).origin + src); });
    const uniqueImages = Array.from(new Set(images)).slice(0,10);

    const priceCandidates = findPriceCandidates($);

    const result = {
      url,
      title: title.trim(),
      description: description.trim().substring(0,500),
      images: uniqueImages,
      priceCandidates
    };

    console.log('Extraction result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error during extraction run:', err && err.message ? err.message : err);
  }
}

if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node run-extract.js <url>');
    process.exit(2);
  }
  run(url);
}
