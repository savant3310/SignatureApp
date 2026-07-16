const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  await page.goto('http://localhost:8123/index.html');
  await page.waitForTimeout(3500); // let intro animation finish and hold
  await page.screenshot({ path: process.argv[2] || 'screenshot.png', fullPage: true });
  await browser.close();
})();
