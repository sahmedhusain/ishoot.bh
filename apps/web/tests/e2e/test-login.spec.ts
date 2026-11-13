import { test, expect } from '@playwright/test';

test('test login', async ({ page }) => {
  await page.goto('http://localhost:3001/login');
  await page.locator('input[type="email"]').fill('admin@example.com');
  await page.locator('input[type="password"]').fill('Admin12345678!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/en');
  console.log('Login successful');
});
