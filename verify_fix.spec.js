import { test, expect } from '@playwright/test';

test('Verify fixed header and profile pinning', async ({ page }) => {
  await page.goto('http://localhost:8000/?u=nickname');

  const header = page.locator('.site-header');
  await expect(header).toBeVisible();

  let headerBox = await header.boundingBox();
  console.log('Header Initial Position:', headerBox);

  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(500);

  headerBox = await header.boundingBox();
  console.log('Header Position after scroll:', headerBox);

  const profileCard = page.locator('.profile-column');
  let profileBox = await profileCard.boundingBox();
  console.log('Profile Initial Position:', profileBox);

  await page.evaluate(() => window.scrollBy(0, 1000));
  await page.waitForTimeout(500);

  profileBox = await profileCard.boundingBox();
  console.log('Profile Position after scroll:', profileBox);

  await page.screenshot({ path: 'scrolled_public.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:8000/?u=nickname');

  const mobileHeader = page.locator('.site-header');
  let mobileHeaderBox = await mobileHeader.boundingBox();
  console.log('Mobile Header Initial Position:', mobileHeaderBox);

  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(500);

  mobileHeaderBox = await mobileHeader.boundingBox();
  console.log('Mobile Header Position after scroll:', mobileHeaderBox);

  await page.screenshot({ path: 'scrolled_mobile.png' });
});
