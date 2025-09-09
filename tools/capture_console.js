const { chromium } = require('playwright');

const url = process.argv[2] || 'http://localhost:8081/edit-deal?id=9a9daf42-f843-4b71-a836-99e3178d053d';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    try {
      console.log(`CONSOLE [${msg.type()}] ${msg.text()}`);
    } catch (e) { console.log('CONSOLE ERROR', e); }
  });

  page.on('pageerror', err => {
    console.log('PAGEERROR', err && err.stack ? err.stack : String(err));
  });

  console.log('Navigating to', url);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.error('Navigation error:', e && e.message ? e.message : e);
  }

  // Wait a bit for runtime errors to surface
  await page.waitForTimeout(5000);

  console.log('Done - closing browser');
  await browser.close();
})();
