import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const APPS = [
  { name: 'web', url: 'http://localhost:3000', needsLogin: false },
  { name: 'admin', url: 'http://localhost:3001', needsLogin: true },
  { name: 'it', url: 'http://localhost:3002', needsLogin: true },
  { name: 'store', url: 'http://localhost:3003', needsLogin: true }
];

for (const app of APPS) {
  test(`Deep Crawl ${app.name}`, async ({ page }) => {
    test.setTimeout(120 * 60_000);
    const visited = new Set<string>();
    const toVisit = [app.url];
    const errors: string[] = [];

    // Attempt login if it's admin/it/store
    if (app.needsLogin) {
      await page.goto(`${app.url}/login`);
      try {
        const emailLoc = page.locator('input[type="email"], input[name="email"]');
        if (await emailLoc.count() > 0) {
          await emailLoc.fill('admin@example.com');
          await page.locator('input[type="password"], input[name="password"]').fill('password');
          await page.locator('button[type="submit"]').click();
          await page.waitForTimeout(2000);
        }
      } catch (e) {
      }
    }

    page.on('pageerror', err => errors.push(`JS Error on ${page.url()}: ${err.message}`));
    page.on('response', resp => {
      if (resp.status() >= 400 && resp.url().startsWith('http://localhost')) {
        errors.push(`Network Error ${resp.status()} on ${resp.url()}`);
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Hydration') || text.includes('Minified React error')) {
          errors.push(`Hydration/React Error on ${page.url()}: ${text.split('\n')[0]}`);
        } else if (!text.includes('favicon') && !text.includes('HMR')) {
          errors.push(`Console Error on ${page.url()}: ${text.split('\n')[0]}`);
        }
      }
    });

    while (toVisit.length > 0) {
      const current = toVisit.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);

      try {
        await page.goto(current, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        // Optional: Run AxeBuilder (if we have time, but let's stick to console/hydration first since Axe can be noisy)
        // const results = await new AxeBuilder({ page }).analyze();
        // if (results.violations.length > 0) errors.push(`A11y violations on ${current}`);

        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href);
        });

        for (const link of links) {
          if (link.startsWith(app.url) && !visited.has(link) && !toVisit.includes(link)) {
            toVisit.push(link);
          }
        }
      } catch (e: any) {
        errors.push(`Navigation failed for ${current}: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      console.error(`Found errors in ${app.name}:`, errors.slice(0, 10).join('\n'));
    }
    expect(errors.length).toBe(0);
  });
}
